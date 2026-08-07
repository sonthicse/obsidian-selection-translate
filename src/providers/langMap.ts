import type { SourceLangCode, TargetLangCode } from '../types';

/**
 * Language codes as each service spells them.
 *
 * Kept in one table because the differences are small enough to be easy to get
 * wrong in three places. The DeepL columns are split for a reason given in its
 * API docs and easy to miss: regional variants such as EN-US are accepted as a
 * *target* but rejected as a *source*, so one column cannot serve both.
 */
interface LangRow {
	/** `sl`/`tl` on the free endpoint, and `source`/`target` on Cloud v2. */
	google: string;
	deeplSource: string | null;
	deeplTarget: string | null;
}

const TABLE: Record<SourceLangCode, LangRow> = {
	auto: { google: 'auto', deeplSource: null, deeplTarget: null },
	en: { google: 'en', deeplSource: 'EN', deeplTarget: 'EN-US' },
	es: { google: 'es', deeplSource: 'ES', deeplTarget: 'ES' },
	fr: { google: 'fr', deeplSource: 'FR', deeplTarget: 'FR' },
	de: { google: 'de', deeplSource: 'DE', deeplTarget: 'DE' },
	ru: { google: 'ru', deeplSource: 'RU', deeplTarget: 'RU' },
	vi: { google: 'vi', deeplSource: 'VI', deeplTarget: 'VI' },
};

/** Every language offered as a source, in the order the settings tab lists them. */
export const SOURCE_LANGUAGES: readonly SourceLangCode[] = [
	'auto',
	'en',
	'es',
	'fr',
	'de',
	'ru',
	'vi',
];

export const TARGET_LANGUAGES: readonly TargetLangCode[] = ['vi', 'en'];

/** Code for the free endpoint's `sl`/`tl` parameters. */
export function toGoogleCode(code: SourceLangCode | TargetLangCode): string {
	return TABLE[code]?.google ?? 'auto';
}

/**
 * Code for Cloud v2's `source`, or undefined to omit it.
 *
 * Omitting `source` is what asks Google to detect the language; sending
 * "auto" as a value is an error there.
 */
export function toGoogleCloudSource(code: SourceLangCode): string | undefined {
	if (code === 'auto') return undefined;
	return TABLE[code]?.google;
}

/** Code for DeepL's `source_lang`, or undefined to let DeepL detect. */
export function toDeepLSource(code: SourceLangCode): string | undefined {
	return TABLE[code]?.deeplSource ?? undefined;
}

/** Code for DeepL's `target_lang`. */
export function toDeepLTarget(code: TargetLangCode): string | undefined {
	return TABLE[code]?.deeplTarget ?? undefined;
}

/**
 * Maps a code a provider reported back onto one of ours.
 *
 * Detected languages arrive in whatever form the service prefers — "EN-GB"
 * from DeepL, "zh-CN" from Google — so the region is dropped before matching.
 * Returns null for a language the plugin does not list, which the UI shows
 * verbatim rather than pretending to recognise.
 */
export function normalizeDetectedLang(reported: string | undefined | null): SourceLangCode | null {
	if (reported == null) return null;

	const base = reported.trim().toLowerCase().split(/[-_]/)[0];
	if (base == null || base.length === 0) return null;

	for (const code of SOURCE_LANGUAGES) {
		if (code !== 'auto' && code === base) return code;
	}
	return null;
}
