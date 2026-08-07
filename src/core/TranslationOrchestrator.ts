import type { SelectionSnapshot, TranslationResult, UiErrorInfo } from '../types';
import type { SelectionTranslateSettings } from '../settings/settings';
import type { ProviderRegistry } from '../providers/ProviderRegistry';
import type { DictionaryLookup } from '../providers/DictionaryProvider';
import { ProviderError, toUiError, type ProviderResponse } from '../providers/TranslationProvider';
import { normalizeDetectedLang } from '../providers/langMap';
import { LruCache } from './LruCache';
import { isSingleWord, normalizeText } from './TextNormalizer';
import { cacheKey } from '../utils/hash';
import { debug } from '../utils/log';

export interface OrchestratorHandlers {
	onResult(snapshot: SelectionSnapshot, result: TranslationResult): void;
	onError(snapshot: SelectionSnapshot, error: UiErrorInfo): void;
}

/**
 * Runs a translation from a selection to a finished result.
 *
 * The one component that knows about both the settings and the providers, and
 * the only one that starts network requests. It exists to keep two concerns out
 * of the UI: which engine answers, and what to do when the user changes their
 * mind mid-request.
 */
export class TranslationOrchestrator {
	private readonly cache: LruCache<TranslationResult>;

	/**
	 * Monotonic id of the newest request.
	 *
	 * `requestUrl` has no AbortController, so an in-flight request cannot be
	 * cancelled — it can only be ignored. Every request captures this counter
	 * on the way out and checks it on the way back; a reply whose token is no
	 * longer current belongs to a selection the user has already moved on from,
	 * and rendering it would replace the answer they are actually waiting for.
	 */
	private requestSeq = 0;

	constructor(
		private readonly getSettings: () => SelectionTranslateSettings,
		private readonly registry: ProviderRegistry,
		private readonly handlers: OrchestratorHandlers
	) {
		this.cache = new LruCache<TranslationResult>(this.getSettings().cacheSize);
	}

	/**
	 * Starts a translation. Returns immediately; results arrive via handlers.
	 *
	 * A cache hit is delivered synchronously, which is what makes re-selecting
	 * a word you just looked up feel instant instead of flashing a spinner.
	 */
	translate(snapshot: SelectionSnapshot): void {
		const settings = this.getSettings();
		const text = normalizeText(snapshot.text, { stripMarkdown: settings.stripMarkdown });

		if (text.length === 0) {
			this.handlers.onError(snapshot, { messageKey: 'error.emptySelection', action: 'none' });
			return;
		}
		if (text.length > settings.maxSelectionLength) {
			this.handlers.onError(snapshot, {
				messageKey: 'error.tooLong',
				action: 'none',
				vars: { length: text.length, max: settings.maxSelectionLength },
			});
			return;
		}

		const provider = this.registry.getTranslator();
		if (!provider.supports(settings.sourceLang, settings.targetLang)) {
			this.handlers.onError(snapshot, {
				messageKey: 'error.unsupportedPair',
				action: 'change-provider',
				vars: { source: settings.sourceLang, target: settings.targetLang },
			});
			return;
		}

		const singleWord = isSingleWord(text);
		const wantDictionary = settings.dictionaryEnrichment && singleWord;
		const key = cacheKey({
			provider: provider.id,
			sourceLang: settings.sourceLang,
			targetLang: settings.targetLang,
			text,
			withDictionary: wantDictionary,
		});

		const cached = this.cache.get(key);
		if (cached != null) {
			debug('cache hit', { provider: provider.id, length: text.length });
			// Still advances the token, so a slower in-flight request for an
			// earlier selection cannot land on top of this answer.
			this.requestSeq++;
			this.handlers.onResult(snapshot, { ...cached, fromCache: true, elapsedMs: 0 });
			return;
		}

		const token = ++this.requestSeq;
		void this.run(snapshot, token, key, text, singleWord, wantDictionary);
	}

	/** Abandons any in-flight request without reporting it. */
	reset(): void {
		this.requestSeq++;
	}

	/** Applies a changed cache size, and clears the cache when it is disabled. */
	applySettings(): void {
		this.cache.setMaxSize(this.getSettings().cacheSize);
	}

	clearCache(): void {
		this.cache.clear();
	}

	destroy(): void {
		this.reset();
		this.cache.clear();
	}

	private async run(
		snapshot: SelectionSnapshot,
		token: number,
		key: string,
		text: string,
		singleWord: boolean,
		wantDictionary: boolean
	): Promise<void> {
		const settings = this.getSettings();
		const provider = this.registry.getTranslator();
		const startedAt = Date.now();

		try {
			const response = await provider.translate({
				text,
				source: settings.sourceLang,
				target: settings.targetLang,
				wantDictionary,
			});

			const enriched = wantDictionary ? await this.enrich(response, text, settings) : response;

			const result: TranslationResult = {
				translated: enriched.translated,
				detectedSourceLang: enriched.detectedSourceLang,
				isSingleWord: singleWord,
				provider: provider.id,
				fromCache: false,
				elapsedMs: Date.now() - startedAt,
				sourceText: text,
			};
			if (enriched.phonetic != null) result.phonetic = enriched.phonetic;
			if (enriched.entries != null) result.entries = enriched.entries;
			if (enriched.definitions != null) result.definitions = enriched.definitions;

			// Cached before the staleness check: the work is already paid for,
			// and the user who abandoned this lookup may well repeat it.
			this.cache.set(key, result);

			if (token !== this.requestSeq) {
				debug('dropping stale result', { token, current: this.requestSeq });
				return;
			}
			this.handlers.onResult(snapshot, result);
		} catch (cause) {
			if (token !== this.requestSeq) {
				debug('dropping stale error', { token, current: this.requestSeq });
				return;
			}
			if (cause instanceof ProviderError) {
				debug('provider failed', { code: cause.code, status: cause.httpStatus });
			}
			this.handlers.onError(snapshot, toUiError(cause));
		}
	}

	/**
	 * Adds pronunciation and parts of speech to a bare translation.
	 *
	 * Sources are consulted in parallel through `allSettled`, because this is
	 * strictly a bonus: a dictionary that is slow, down or simply does not know
	 * the word must never delay or fail a translation that already succeeded.
	 * Each field is filled from the first source that has it, so the free Google
	 * endpoint's parts of speech and the Free Dictionary API's IPA combine into
	 * one entry rather than competing.
	 */
	private async enrich(
		response: ProviderResponse,
		text: string,
		settings: SelectionTranslateSettings
	): Promise<ProviderResponse> {
		const needsPhonetic = response.phonetic == null;
		const needsEntries = response.entries == null || response.entries.length === 0;
		if (!needsPhonetic && !needsEntries) return response;

		const lang =
			normalizeDetectedLang(response.detectedSourceLang) ??
			(settings.sourceLang === 'auto' ? '' : settings.sourceLang);

		const sources = this.registry.getDictionaries(lang);
		if (sources.length === 0) return response;

		const settled = await Promise.allSettled(sources.map((source) => source.lookup(text, lang)));

		const merged: ProviderResponse = { ...response };
		for (const outcome of settled) {
			if (outcome.status !== 'fulfilled' || outcome.value == null) continue;

			const lookup: DictionaryLookup = outcome.value;
			if (merged.phonetic == null && lookup.phonetic != null) merged.phonetic = lookup.phonetic;
			if ((merged.entries == null || merged.entries.length === 0) && lookup.entries != null) {
				merged.entries = lookup.entries;
			}
			if (
				(merged.definitions == null || merged.definitions.length === 0) &&
				lookup.definitions != null
			) {
				merged.definitions = lookup.definitions;
			}
		}

		return merged;
	}
}
