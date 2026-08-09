import { ENDPOINTS } from '../constants';
import type { SourceLangCode, TargetLangCode } from '../types';
import { toDeepLSource, toDeepLTarget } from './langMap';
import { parseJsonBody, requestWithRetry } from './http';
import { toNfc } from '../utils/text';
import {
	ProviderError,
	type ProviderResponse,
	type TranslateRequest,
	type TranslationProvider,
	type ValidationResult,
} from './TranslationProvider';

/**
 * Translation through DeepL's official API.
 *
 * Documented, supported and generally the best output of the three, at the cost
 * of an account and a key. It returns no phonetics, parts of speech or
 * alternative meanings — hence `supportsDictionary: false` and the separate
 * dictionary layer that fills those in from elsewhere.
 */
export class DeepLProvider implements TranslationProvider {
	readonly id = 'deepl' as const;
	readonly supportsDictionary = false;
	readonly requiresApiKey = true;

	constructor(private readonly getApiKey: () => string) {}

	supports(source: SourceLangCode, target: TargetLangCode): boolean {
		return toDeepLTarget(target) != null && (source === 'auto' || toDeepLSource(source) != null);
	}

	async translate(request: TranslateRequest): Promise<ProviderResponse> {
		const key = this.requireKey();

		const targetLang = toDeepLTarget(request.target);
		if (targetLang == null) throw new ProviderError('unsupported-pair');

		const body: Record<string, unknown> = { text: [request.text], target_lang: targetLang };
		// Omitting source_lang is what asks DeepL to detect it.
		const sourceLang = toDeepLSource(request.source);
		if (sourceLang != null) body.source_lang = sourceLang;

		const response = await requestWithRetry({
			url: `${endpointFor(key)}/translate`,
			method: 'POST',
			contentType: 'application/json',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `DeepL-Auth-Key ${key}`,
			},
			body: JSON.stringify(body),
		});

		if (response.status !== 200) throw mapStatus(response.status);

		const parsed = parseDeepL(parseJsonBody(response));
		if (parsed == null) throw new ProviderError('bad-response', { httpStatus: response.status });

		return parsed;
	}

	/**
	 * Checks the key against the usage endpoint.
	 *
	 * Usage rather than translate: it costs no characters, so testing a key
	 * repeatedly never eats into the free tier.
	 */
	async validate(): Promise<ValidationResult> {
		const key = this.getApiKey().trim();
		if (key.length === 0) return { ok: false, i18nKey: 'settings.testMissingKey' };

		try {
			const response = await requestWithRetry({
				url: `${endpointFor(key)}/usage`,
				method: 'GET',
				headers: { Authorization: `DeepL-Auth-Key ${key}` },
			});

			if (response.status === 403 || response.status === 401) {
				return { ok: false, i18nKey: 'settings.testInvalidKey' };
			}
			if (response.status !== 200) return { ok: false, i18nKey: 'settings.testFailed' };

			const usage = parseUsage(parseJsonBody(response));
			if (usage == null) return { ok: true, i18nKey: 'settings.testOk' };

			return {
				ok: true,
				i18nKey: 'settings.testOkWithQuota',
				vars: { used: usage.used, limit: usage.limit },
			};
		} catch {
			return { ok: false, i18nKey: 'settings.testFailed' };
		}
	}

	private requireKey(): string {
		const key = this.getApiKey().trim();
		if (key.length === 0) throw new ProviderError('missing-key');
		return key;
	}
}

/**
 * Picks the Free or Pro host from the key itself.
 *
 * DeepL issues Free keys with a `:fx` suffix and serves them from a different
 * host. Sending a Free key to the Pro host returns 403 "Wrong endpoint", which
 * is indistinguishable from an invalid key to anyone reading the error and is
 * reportedly the single most common DeepL integration mistake. Detecting it
 * from the suffix removes the failure mode entirely, rather than adding a
 * setting the user can get wrong.
 */
export function endpointFor(key: string): string {
	return key.trim().endsWith(':fx') ? ENDPOINTS.deeplFree : ENDPOINTS.deeplPro;
}

/** Translates a DeepL status into the plugin's failure vocabulary. */
export function mapStatus(status: number): ProviderError {
	switch (status) {
		case 401:
		case 403:
			// Wrong key, or the right key against the wrong host. The suffix
			// detection above should make the second impossible.
			return new ProviderError('invalid-key', { httpStatus: status });
		case 404:
			return new ProviderError('unknown', { httpStatus: status });
		case 413:
		case 414:
			return new ProviderError('payload-too-large', { httpStatus: status });
		case 429:
			return new ProviderError('rate-limited', { httpStatus: status });
		case 456:
			// Quota for the billing period is gone. Retrying cannot help, and
			// switching engines is the only way forward this month.
			return new ProviderError('quota-exceeded', { httpStatus: status });
		case 400:
			return new ProviderError('unsupported-pair', { httpStatus: status });
		default:
			if (status >= 500) return new ProviderError('server-busy', { httpStatus: status });
			return new ProviderError('unknown', { httpStatus: status });
	}
}

/** Reads `{ translations: [{ detected_source_language, text }] }`. */
export function parseDeepL(raw: unknown): ProviderResponse | null {
	if (raw == null || typeof raw !== 'object') return null;

	const translations = (raw as { translations?: unknown }).translations;
	if (!Array.isArray(translations) || translations.length === 0) return null;

	// Only one string is ever sent, so only the first translation is expected.
	// Annotated `unknown` because `Array.isArray` narrows an `unknown` to `any[]`,
	// which would make every read off this element an unchecked `any`.
	const first: unknown = translations[0];
	if (first == null || typeof first !== 'object') return null;

	const text = (first as { text?: unknown }).text;
	if (typeof text !== 'string' || text.length === 0) return null;

	const detected = (first as { detected_source_language?: unknown }).detected_source_language;

	return {
		translated: toNfc(text),
		detectedSourceLang: typeof detected === 'string' ? detected.toLowerCase() : '',
	};
}

/** Reads `{ character_count, character_limit }` from the usage endpoint. */
export function parseUsage(raw: unknown): { used: number; limit: number } | null {
	if (raw == null || typeof raw !== 'object') return null;

	const used = (raw as { character_count?: unknown }).character_count;
	const limit = (raw as { character_limit?: unknown }).character_limit;
	if (typeof used !== 'number' || typeof limit !== 'number') return null;

	return { used, limit };
}
