/*
 * The one place a language is described.
 *
 * Before this file the same language was spelled out in four places — a union
 * in types.ts, a row in a shared provider table, an ordered array for each
 * dropdown, and a `lang.*` string in every catalogue — and adding one meant
 * finding all four. Everything about a language now lives in one row here, and
 * each provider keeps only its own spelling of it.
 *
 * Deliberately free of imports: this is the bottom of the dependency graph, so
 * the provider layer, the settings layer and the UI can all read it without any
 * of them learning about each other.
 */

/** Writing direction, for the RTL work in E4. */
export type LanguageDir = 'ltr' | 'rtl';

/**
 * What kind of pronunciation, if any, makes sense for a language.
 *
 * Read in E6 to decide how the popup renders it: IPA belongs in slashes, a
 * romanisation does not, and `none` means render no pronunciation block at all
 * rather than an empty one.
 */
export type PhoneticKind = 'ipa' | 'romanization' | 'none';

export interface LanguageDescriptor {
	/** Internal BCP-47 tag. Chinese keeps its script subtag; see the note below. */
	code: string;
	/** Shown in the language dropdowns — someone picking Japanese looks for 日本語. */
	nativeName: string;
	englishName: string;
	dir: LanguageDir;
	phonetic: PhoneticKind;
	asSource: boolean;
	asTarget: boolean;
	/** Whether a UI catalogue exists for it. Turning this on without writing one
	 *  is a compile error; see the CATALOGUES table in `src/i18n/index.ts`. */
	ui: boolean;
}

/*
 * The languages the plugin offers, in the order the dropdowns list them.
 *
 * `as const satisfies` rather than a plain annotation: the literal types survive,
 * which is what lets SourceLangCode and TargetLangCode below be derived from the
 * `asSource` / `asTarget` flags instead of being maintained alongside them.
 *
 * Chinese is two entries, not one with a variant flag. Simplified and
 * traditional differ in vocabulary and not only in script — 軟體/软件, 網路/网络,
 * 設定/设置 — so they are as separate here as any other pair of languages.
 */
export const LANGUAGES = [
	{
		code: 'en',
		nativeName: 'English',
		englishName: 'English',
		dir: 'ltr',
		phonetic: 'ipa',
		asSource: true,
		asTarget: true,
		ui: true,
	},
	{
		code: 'vi',
		nativeName: 'Tiếng Việt',
		englishName: 'Vietnamese',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: true,
		ui: true,
	},
	{
		code: 'zh-Hant',
		nativeName: '繁體中文',
		englishName: 'Chinese (Traditional)',
		dir: 'ltr',
		phonetic: 'romanization',
		asSource: true,
		asTarget: true,
		ui: true,
	},
	{
		code: 'zh-Hans',
		nativeName: '简体中文',
		englishName: 'Chinese (Simplified)',
		dir: 'ltr',
		phonetic: 'romanization',
		asSource: true,
		asTarget: true,
		ui: true,
	},
	{
		code: 'es',
		nativeName: 'Español',
		englishName: 'Spanish',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: true,
		ui: false,
	},
	{
		code: 'ja',
		nativeName: '日本語',
		englishName: 'Japanese',
		dir: 'ltr',
		phonetic: 'romanization',
		asSource: true,
		asTarget: true,
		ui: true,
	},
	{
		code: 'it',
		nativeName: 'Italiano',
		englishName: 'Italian',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: true,
		ui: false,
	},
	{
		code: 'ar',
		nativeName: 'العربية',
		englishName: 'Arabic',
		dir: 'rtl',
		phonetic: 'romanization',
		asSource: true,
		asTarget: true,
		ui: false,
	},
	{
		code: 'fr',
		nativeName: 'Français',
		englishName: 'French',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: true,
		ui: false,
	},
	{
		code: 'de',
		nativeName: 'Deutsch',
		englishName: 'German',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: true,
		ui: false,
	},
] as const satisfies readonly LanguageDescriptor[];

/** Any language in the registry. Never includes the `auto` pseudo-value. */
export type LangCode = (typeof LANGUAGES)[number]['code'];

/**
 * A translation source, including the request to detect one.
 *
 * `auto` is not a language and has no row above: it has no native name, no
 * direction and no pronunciation. It stays a separate member of this union so
 * the type system keeps reminding every caller to handle it.
 */
export type SourceLangCode = 'auto' | Extract<(typeof LANGUAGES)[number], { asSource: true }>['code'];

/** A translation target. `auto` makes no sense here. */
export type TargetLangCode = Extract<(typeof LANGUAGES)[number], { asTarget: true }>['code'];

/**
 * A language the plugin's own interface is available in.
 *
 * Derived from the same flag the dropdown reads, which is what makes the three
 * places that used to spell out the locale list — this type, `Locale` in the
 * i18n layer and `UiLanguage` in the settings — one fact with three names.
 */
export type UiLangCode = Extract<(typeof LANGUAGES)[number], { ui: true }>['code'];

const BY_CODE = new Map<string, LanguageDescriptor>(LANGUAGES.map((lang) => [lang.code, lang]));

/** The descriptor for a code, or undefined for `auto` and anything unknown. */
export function getLanguage(code: string): LanguageDescriptor | undefined {
	return BY_CODE.get(code);
}

/*
 * The three role lists, derived rather than written out.
 *
 * Each filter narrows the element type as well as the array, so the lists stay
 * correctly typed however the flags above are edited. A plain predicate would
 * type them as "any language" and need a cast at every use — and a cast is
 * exactly what stops the compiler noticing that a language changed roles.
 */
type SourceLanguage = Extract<(typeof LANGUAGES)[number], { asSource: true }>;
type TargetLanguage = Extract<(typeof LANGUAGES)[number], { asTarget: true }>;
type UiLanguageEntry = Extract<(typeof LANGUAGES)[number], { ui: true }>;

/** Source languages in dropdown order, detection first. */
export const SOURCE_LANGUAGES: readonly SourceLangCode[] = [
	'auto',
	...LANGUAGES.filter((lang): lang is SourceLanguage => lang.asSource).map((lang) => lang.code),
];

/** Target languages in dropdown order. */
export const TARGET_LANGUAGES: readonly TargetLangCode[] = LANGUAGES.filter(
	(lang): lang is TargetLanguage => lang.asTarget
).map((lang) => lang.code);

/** Locales with a UI catalogue, in dropdown order. */
export const UI_LANGUAGES: readonly UiLangCode[] = LANGUAGES.filter(
	(lang): lang is UiLanguageEntry => lang.ui
).map((lang) => lang.code);

export function isSourceLang(value: unknown): value is SourceLangCode {
	if (value === 'auto') return true;
	return typeof value === 'string' && (getLanguage(value)?.asSource ?? false);
}

export function isTargetLang(value: unknown): value is TargetLangCode {
	return typeof value === 'string' && (getLanguage(value)?.asTarget ?? false);
}

export function isUiLang(value: unknown): value is UiLangCode {
	return typeof value === 'string' && (getLanguage(value)?.ui ?? false);
}

/*
 * Chinese variants, resolved from whatever a service or Obsidian reports.
 *
 * The rest of the world drops the region from a tag and matches on the base
 * language; Chinese cannot, because `zh-CN` and `zh-TW` are the only thing
 * distinguishing simplified from traditional and both would collapse to `zh`.
 * Two rules apply here and they point opposite ways on purpose:
 *
 *   - A bare `zh` means *simplified*. That is Obsidian's own convention for its
 *     interface language, and following it is what makes the plugin agree with
 *     the app it lives in.
 *   - An unrecognised `zh-*` variant means *traditional*, because traditional is
 *     this project's reference Chinese and the one its other catalogue derives
 *     from.
 */
const CHINESE_SCRIPTS: Record<string, LangCode> = {
	hans: 'zh-Hans',
	hant: 'zh-Hant',
};

const CHINESE_REGIONS: Record<string, LangCode> = {
	cn: 'zh-Hans',
	sg: 'zh-Hans',
	tw: 'zh-Hant',
	hk: 'zh-Hant',
	mo: 'zh-Hant',
};

function resolveChinese(subtags: readonly string[]): LangCode {
	// Script wins over region: `zh-Hant-CN` is traditional written in the
	// mainland, and the script is the part that decides which text we produce.
	for (const subtag of subtags) {
		const byScript = CHINESE_SCRIPTS[subtag];
		if (byScript != null) return byScript;
	}
	for (const subtag of subtags) {
		const byRegion = CHINESE_REGIONS[subtag];
		if (byRegion != null) return byRegion;
	}
	// A bare `zh` is simplified; anything else unrecognised leans traditional.
	return subtags.length === 0 ? 'zh-Hans' : 'zh-Hant';
}

/**
 * Maps a language tag from anywhere outside the plugin onto one of ours.
 *
 * Tags arrive in whatever form the source prefers — "EN-GB" from DeepL, "zh-CN"
 * from Google, "zh-TW" from Obsidian's own interface setting — so the region is
 * dropped before matching, with Chinese as the documented exception above.
 *
 * One rule rather than one per caller. A translated language and an interface
 * language are asked about by different parts of the plugin and answered from
 * different columns of the registry, but "which of our languages is this tag" is
 * the same question both times, and the Chinese rule in particular is the kind
 * of thing that goes wrong the moment it exists in two copies. Which column
 * applies is left to the two exported wrappers below.
 */
function normalizeTag(reported: string | undefined | null): LangCode | null {
	if (reported == null) return null;

	const subtags = reported.trim().toLowerCase().split(/[-_]/).filter((part) => part.length > 0);
	const base = subtags[0];
	if (base == null) return null;

	if (base === 'zh') return resolveChinese(subtags.slice(1));

	for (const lang of LANGUAGES) {
		if (lang.code === base) return lang.code;
	}
	return null;
}

/**
 * The source language a provider says it detected.
 *
 * Returns null for a language the plugin does not list, which the UI shows
 * verbatim rather than pretending to recognise.
 */
export function normalizeDetectedLang(reported: string | undefined | null): SourceLangCode | null {
	const code = normalizeTag(reported);
	return code != null && isSourceLang(code) ? code : null;
}

/**
 * The interface locale Obsidian's own language setting asks for.
 *
 * Null rather than a near-miss when the plugin has no catalogue for it: Obsidian
 * ships far more interface languages than this plugin does, so `fr` resolves to
 * a real registry entry and still has no strings behind it. The caller falls
 * back to English, which is the only locale guaranteed to be complete.
 */
export function normalizeUiLang(reported: string | undefined | null): UiLangCode | null {
	const code = normalizeTag(reported);
	return code != null && isUiLang(code) ? code : null;
}
