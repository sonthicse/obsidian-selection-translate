import { ENDPOINTS, GTX_POST_THRESHOLD } from '../constants';
import type { SourceLangCode, TargetLangCode } from '../languages';
import type { Definition, DictionaryEntry } from '../types';
import { warnOnce } from '../utils/log';
import { toNfc } from '../utils/text';
import { toGoogleCode } from './googleLangCodes';
import { parseJsonBody, requestWithRetry } from './http';
import {
	ProviderError,
	supportsPair,
	type ProviderResponse,
	type TranslateRequest,
	type TranslationProvider,
	type ValidationResult,
} from './TranslationProvider';

/*
 * Which `dt` fields to ask for. Each adds a section to the response:
 *   t  — the translation itself
 *   bd — dictionary: parts of speech, meanings, back-translations
 *   rm — romanisation and phonetics
 *   md — definitions
 *   at — alternative translations
 *
 * `ss` (synonyms) and `ex` (examples) are deliberately not requested: the popup
 * renders neither, and the examples section is the one place in this response
 * that carries HTML markup, so not asking for it removes a whole category of
 * escaping mistake.
 */
const DT_FIELDS = ['t', 'bd', 'rm', 'md', 'at'];

/**
 * Translation through the endpoint the Google Translate browser extension uses.
 *
 * The only engine here that needs no account, no key and no billing, and the
 * only one that returns dictionary data, which is why it is the default. It is
 * also undocumented and unsupported: Google publishes no contract for it and
 * can change or withdraw it without notice.
 *
 * That shapes the whole parser. Every field is treated as optional, nothing is
 * indexed without checking, and a response that no longer looks like what we
 * expect degrades to "translation only" rather than throwing. The two official
 * engines exist precisely so that a user who needs a guarantee has one.
 */
export class GoogleFreeProvider implements TranslationProvider {
	readonly id = 'google-free' as const;
	readonly supportsDictionary = true;
	readonly requiresApiKey = false;

	supports(source: SourceLangCode, target: TargetLangCode): boolean {
		return supportsPair(toGoogleCode, source, target);
	}

	async translate(request: TranslateRequest): Promise<ProviderResponse> {
		const response = await this.call(request.text, request.source, request.target);

		if (response.status !== 200) {
			throw mapStatus(response.status);
		}

		const parsed = parseGtx(parseJsonBody(response));
		if (parsed == null) {
			// A 200 whose body we cannot read means the endpoint changed. Say so
			// once, so the user reading the console knows why the dictionary
			// stopped appearing, without repeating it on every lookup.
			warnAboutShapeChange();
			throw new ProviderError('bad-response', { httpStatus: response.status });
		}
		return parsed;
	}

	async validate(): Promise<ValidationResult> {
		try {
			const response = await this.call('hello', 'en', 'vi');
			if (response.status !== 200) return { ok: false, i18nKey: 'settings.testFailed' };

			const parsed = parseGtx(parseJsonBody(response));
			return parsed == null
				? { ok: false, i18nKey: 'settings.testBadResponse' }
				: { ok: true, i18nKey: 'settings.testOk' };
		} catch {
			return { ok: false, i18nKey: 'settings.testFailed' };
		}
	}

	/**
	 * Issues the request, switching to POST for long text.
	 *
	 * The text rides in the query string on a GET, and long URLs are truncated
	 * somewhere between the client and Google with no error to distinguish that
	 * from a short translation. POST puts it in the body where length is not a
	 * concern.
	 */
	private async call(
		text: string,
		source: SourceLangCode,
		target: TargetLangCode
	): Promise<Awaited<ReturnType<typeof requestWithRetry>>> {
		const params = new URLSearchParams();
		params.set('client', 'gtx');
		// 'auto' is the endpoint's own word for "detect", so it is passed through
		// rather than looked up.
		params.set('sl', source === 'auto' ? 'auto' : (toGoogleCode(source, 'source') ?? 'auto'));
		const targetCode = toGoogleCode(target, 'target');
		if (targetCode == null) throw new ProviderError('unsupported-pair');
		params.set('tl', targetCode);
		// Which language the dictionary's own labels come back in.
		params.set('hl', targetCode);
		for (const field of DT_FIELDS) params.append('dt', field);
		params.set('ie', 'UTF-8');
		params.set('oe', 'UTF-8');

		if (text.length > GTX_POST_THRESHOLD) {
			const body = new URLSearchParams(params);
			body.set('q', text);
			return requestWithRetry({
				url: ENDPOINTS.googleFree,
				method: 'POST',
				contentType: 'application/x-www-form-urlencoded',
				body: body.toString(),
			});
		}

		params.set('q', text);
		return requestWithRetry({ url: `${ENDPOINTS.googleFree}?${params.toString()}`, method: 'GET' });
	}
}

function mapStatus(status: number): ProviderError {
	if (status === 429) return new ProviderError('rate-limited', { httpStatus: status });
	if (status === 413) return new ProviderError('payload-too-large', { httpStatus: status });
	if (status >= 500) return new ProviderError('server-busy', { httpStatus: status });
	return new ProviderError('unknown', { httpStatus: status });
}

/* ── Parsing ──────────────────────────────────────────────────────────────── */

/*
 * The response is nested arrays with no field names, and its length varies with
 * what the query matched: 14 elements for a dictionary word, 9 for a sentence.
 * Positions actually observed:
 *
 *   [0]  rows. A row whose first cell is a string is a chunk of translated
 *        text; a row whose first cell is null carries phonetics, with the
 *        source-language pronunciation in cell 3.
 *   [1]  dictionary — [partOfSpeech, [meanings], [[meaning, [backTranslations]]]]
 *        Null for anything that is not a single dictionary word.
 *   [2]  detected source language.
 *   [8]  detected language with confidence, as a fallback for [2].
 *   [12] definitions — [partOfSpeech, [[text, id, example]], word]
 *
 * Exported separately from the provider so the whole thing can be tested
 * against captured fixtures with no network involved.
 */

/** Parses a gtx response, or returns null if there is no translation in it. */
export function parseGtx(raw: unknown): ProviderResponse | null {
	const root = asArray(raw);
	if (root.length === 0) return null;

	const { translated, phonetic } = parseRows(root[0]);
	if (translated.length === 0) return null;

	const entries = parseDictionary(root[1]);
	const definitions = parseDefinitions(root[12]);

	const result: ProviderResponse = {
		translated,
		detectedSourceLang: parseDetectedLang(root),
	};
	// Only attach optional sections that actually have content, so the popup can
	// test for presence rather than for emptiness.
	if (phonetic != null) result.phonetic = phonetic;
	if (entries.length > 0) result.entries = entries;
	if (definitions.length > 0) result.definitions = definitions;

	return result;
}

/** Joins the translated chunks and picks up the phonetic row along the way. */
function parseRows(raw: unknown): { translated: string; phonetic: string | undefined } {
	let translated = '';
	let phonetic: string | undefined;

	for (const row of asArray(raw)) {
		const cells = asArray(row);

		const chunk = asString(cells[0]);
		if (chunk != null) {
			translated += chunk;
			continue;
		}

		/*
		 * A row with no text in cell 0 is the romanisation row. Cell 3 holds the
		 * source-language pronunciation, which is the one the popup shows next
		 * to the original word; cell 2 holds the target-language romanisation
		 * and is only a fallback. Observed for "information": cell 3 is
		 * "ˌinfərˈmāSH(ə)n".
		 */
		if (phonetic == null) {
			phonetic = nonEmpty(asString(cells[3])) ?? nonEmpty(asString(cells[2]));
		}
	}

	return { translated: translated.trim(), phonetic };
}

/** Detected source language, from its usual slot or the confidence block. */
function parseDetectedLang(root: unknown[]): string {
	const direct = nonEmpty(asString(root[2]));
	if (direct != null) return direct;

	const confidence = asArray(root[8]);
	const fromConfidence = nonEmpty(asString(asArray(confidence[0])[0]));
	return fromConfidence ?? '';
}

/** Parts of speech with their meanings and back-translations. */
function parseDictionary(raw: unknown): DictionaryEntry[] {
	const entries: DictionaryEntry[] = [];

	for (const group of asArray(raw)) {
		const cells = asArray(group);

		const partOfSpeech = nonEmpty(asString(cells[0]));
		const meanings = asArray(cells[1]).map(asString).filter(isString);
		if (partOfSpeech == null || meanings.length === 0) continue;

		const entry: DictionaryEntry = { partOfSpeech, meanings };

		/*
		 * Back-translations live one level deeper, as
		 * [meaning, [word, word, ...]] pairs. They are flattened and
		 * de-duplicated because the popup shows them as one list, and the same
		 * word recurs across meanings ("information" appears under all five
		 * senses of the observed entry).
		 */
		const backTranslations = new Set<string>();
		for (const pair of asArray(cells[2])) {
			for (const word of asArray(asArray(pair)[1])) {
				const text = nonEmpty(asString(word));
				if (text != null) backTranslations.add(text);
			}
		}
		if (backTranslations.size > 0) entry.backTranslations = Array.from(backTranslations);

		entries.push(entry);
	}

	return entries;
}

/** Dictionary definitions, each with an optional usage example. */
function parseDefinitions(raw: unknown): Definition[] {
	const definitions: Definition[] = [];

	for (const group of asArray(raw)) {
		const cells = asArray(group);
		const partOfSpeech = nonEmpty(asString(cells[0])) ?? '';

		for (const item of asArray(cells[1])) {
			const fields = asArray(item);
			const text = nonEmpty(asString(fields[0]));
			if (text == null) continue;

			const definition: Definition = { partOfSpeech, text };
			// Cell 1 is an internal sense id; the example, when present, is cell 2.
			const example = nonEmpty(asString(fields[2]));
			if (example != null) definition.example = example;

			definitions.push(definition);
		}
	}

	return definitions;
}

/* ── Narrowing helpers ────────────────────────────────────────────────────── */

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

/**
 * Every string leaving this parser passes through here.
 *
 * The NFC pass is what makes it the single funnel: this endpoint returns
 * Vietnamese partly decomposed, and normalising at the boundary means nothing
 * downstream has to think about it. See utils/text.ts for why that matters.
 */
function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? toNfc(value) : undefined;
}

function isString(value: string | undefined): value is string {
	return value != null && value.length > 0;
}

function nonEmpty(value: string | undefined): string | undefined {
	if (value == null) return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/** Reports a shape change once per session rather than on every lookup. */
export function warnAboutShapeChange(): void {
	warnOnce(
		'gtx-shape',
		'The Google free endpoint returned an unfamiliar shape. Showing the translation ' +
			'without dictionary data. This endpoint is undocumented and may have changed.'
	);
}
