import { ENDPOINTS } from '../constants';
import type { Definition, DictionaryEntry } from '../types';
import { parseJsonBody, requestWithRetry } from './http';
import { GoogleFreeProvider } from './GoogleFreeProvider';
import { normalizeDetectedLang } from './langMap';

/** The extras a dictionary lookup can contribute to a translation. */
export interface DictionaryLookup {
	phonetic?: string;
	entries?: DictionaryEntry[];
	definitions?: Definition[];
}

/**
 * Fills in what a translation engine cannot say.
 *
 * DeepL and Cloud Translation return a translation and nothing else, but the
 * popup promises pronunciation, part of speech and alternative meanings for
 * single words. Keeping this behind its own interface is what lets those
 * engines be used without giving up the dictionary panel.
 */
export interface DictionaryProvider {
	readonly id: 'gtx' | 'dictionaryapi';
	/** Whether this source has anything for that language. */
	supports(lang: string): boolean;
	/** Returns null when the word is unknown, rather than throwing. */
	lookup(word: string, lang: string): Promise<DictionaryLookup | null>;
}

/**
 * Dictionary data from the same free Google endpoint used for translation.
 *
 * Works for every language pair the plugin offers and, when the free engine is
 * already the translator, the data arrives with the translation at no extra
 * cost. It is queried separately only when the user picked DeepL or Cloud.
 */
export class GtxDictionaryProvider implements DictionaryProvider {
	readonly id = 'gtx' as const;
	private readonly translator = new GoogleFreeProvider();

	supports(_lang: string): boolean {
		return true;
	}

	async lookup(word: string, lang: string): Promise<DictionaryLookup | null> {
		try {
			const response = await this.translator.translate({
				// A language the plugin does not list falls back to detection.
				source: normalizeDetectedLang(lang) ?? 'auto',
				text: word,
				// The target only decides which language the meanings are
				// listed in; the phonetics come from the source word.
				target: 'vi',
				wantDictionary: true,
			});

			const lookup: DictionaryLookup = {};
			if (response.phonetic != null) lookup.phonetic = response.phonetic;
			if (response.entries != null) lookup.entries = response.entries;
			if (response.definitions != null) lookup.definitions = response.definitions;

			return hasContent(lookup) ? lookup : null;
		} catch {
			// Enrichment is a bonus. Its failure must never sink a translation
			// that already succeeded.
			return null;
		}
	}
}

/**
 * Pronunciation and definitions from the Free Dictionary API.
 *
 * English only, no key, no account. It exists because the free Google endpoint
 * routinely returns no romanisation for English-to-Vietnamese, which is exactly
 * the pair this plugin is most used for, and IPA is the single most requested
 * thing in the popup.
 */
export class FreeDictionaryProvider implements DictionaryProvider {
	readonly id = 'dictionaryapi' as const;

	supports(lang: string): boolean {
		return lang.toLowerCase().startsWith('en');
	}

	async lookup(word: string, lang: string): Promise<DictionaryLookup | null> {
		if (!this.supports(lang)) return null;

		try {
			const response = await requestWithRetry({
				url: `${ENDPOINTS.dictionaryApi}/${encodeURIComponent(word.toLowerCase())}`,
				method: 'GET',
			});

			// 404 simply means the word is not in the dictionary, which is a
			// normal outcome and not a failure worth reporting.
			if (response.status !== 200) return null;

			return parseFreeDictionary(parseJsonBody(response));
		} catch {
			return null;
		}
	}
}

/**
 * Reads the Free Dictionary API response.
 *
 * Shape: `[{ phonetic, phonetics: [{ text, audio }], meanings: [{ partOfSpeech,
 * definitions: [{ definition, example }] }] }]`. Parsed as defensively as the
 * gtx response despite being a documented API, because the plugin should
 * degrade rather than break when any upstream changes.
 */
export function parseFreeDictionary(raw: unknown): DictionaryLookup | null {
	if (!Array.isArray(raw) || raw.length === 0) return null;

	// See DeepLProvider: `Array.isArray` narrows `unknown` to `any[]`, so the
	// element needs an explicit `unknown` to stay checked.
	const first: unknown = raw[0];
	if (first == null || typeof first !== 'object') return null;

	const lookup: DictionaryLookup = {};

	const phonetic = pickPhonetic(first);
	if (phonetic != null) lookup.phonetic = phonetic;

	const entries: DictionaryEntry[] = [];
	const definitions: Definition[] = [];

	const meanings = (first as { meanings?: unknown }).meanings;
	for (const meaning of Array.isArray(meanings) ? meanings : []) {
		if (meaning == null || typeof meaning !== 'object') continue;

		const partOfSpeech = (meaning as { partOfSpeech?: unknown }).partOfSpeech;
		if (typeof partOfSpeech !== 'string' || partOfSpeech.length === 0) continue;

		const rawDefinitions = (meaning as { definitions?: unknown }).definitions;
		const texts: string[] = [];

		for (const item of Array.isArray(rawDefinitions) ? rawDefinitions : []) {
			if (item == null || typeof item !== 'object') continue;

			const text = (item as { definition?: unknown }).definition;
			if (typeof text !== 'string' || text.length === 0) continue;

			texts.push(text);

			const definition: Definition = { partOfSpeech, text };
			const example = (item as { example?: unknown }).example;
			if (typeof example === 'string' && example.length > 0) definition.example = example;
			definitions.push(definition);
		}

		if (texts.length > 0) entries.push({ partOfSpeech, meanings: texts });
	}

	if (entries.length > 0) lookup.entries = entries;
	if (definitions.length > 0) lookup.definitions = definitions;

	return hasContent(lookup) ? lookup : null;
}

/**
 * Picks the best available pronunciation.
 *
 * `phonetics` is an array of variants, some with an empty `text`, and the
 * top-level `phonetic` is a convenience copy that is sometimes missing. The
 * first non-empty of either will do.
 */
function pickPhonetic(entry: object): string | undefined {
	const direct = (entry as { phonetic?: unknown }).phonetic;
	if (typeof direct === 'string' && direct.trim().length > 0) return direct.trim();

	const variants = (entry as { phonetics?: unknown }).phonetics;
	for (const variant of Array.isArray(variants) ? variants : []) {
		if (variant == null || typeof variant !== 'object') continue;

		const text = (variant as { text?: unknown }).text;
		if (typeof text === 'string' && text.trim().length > 0) return text.trim();
	}

	return undefined;
}

function hasContent(lookup: DictionaryLookup): boolean {
	return lookup.phonetic != null || lookup.entries != null || lookup.definitions != null;
}
