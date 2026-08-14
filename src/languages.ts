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

/** Writing direction. */
export type LanguageDir = 'ltr' | 'rtl';

/**
 * What kind of pronunciation, if any, makes sense for a language.
 *
 * Recorded per language so the popup can eventually tell them apart: IPA
 * belongs in slashes, a romanisation does not, and `none` means render no
 * pronunciation block at all rather than an empty one.
 */
export type PhoneticKind = 'ipa' | 'romanization' | 'none';

export interface LanguageDescriptor {
	/** Internal BCP-47 tag. */
	code: string;
	/** Shown in the language dropdowns — someone picking Japanese looks for 日本語. */
	nativeName: string;
	englishName: string;
	dir: LanguageDir;
	phonetic: PhoneticKind;
	asSource: boolean;
	asTarget: boolean;
	/** Whether a UI catalogue exists for it. Only `en` and `vi` so far. */
	ui: boolean;
}

/*
 * The languages the plugin offers, in the order the dropdowns list them.
 *
 * `as const satisfies` rather than a plain annotation: the literal types survive,
 * which is what lets SourceLangCode and TargetLangCode below be derived from the
 * `asSource` / `asTarget` flags instead of being maintained alongside them.
 *
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
		code: 'es',
		nativeName: 'Español',
		englishName: 'Spanish',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: false,
		ui: false,
	},
	{
		code: 'fr',
		nativeName: 'Français',
		englishName: 'French',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: false,
		ui: false,
	},
	{
		code: 'de',
		nativeName: 'Deutsch',
		englishName: 'German',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: false,
		ui: false,
	},
	{
		code: 'ru',
		nativeName: 'Русский',
		englishName: 'Russian',
		dir: 'ltr',
		phonetic: 'none',
		asSource: true,
		asTarget: false,
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

/** Locales with a UI catalogue. */
export const UI_LANGUAGES: readonly LangCode[] = LANGUAGES.filter(
	(lang): lang is UiLanguageEntry => lang.ui
).map((lang) => lang.code);

export function isSourceLang(value: unknown): value is SourceLangCode {
	if (value === 'auto') return true;
	return typeof value === 'string' && (getLanguage(value)?.asSource ?? false);
}

export function isTargetLang(value: unknown): value is TargetLangCode {
	return typeof value === 'string' && (getLanguage(value)?.asTarget ?? false);
}

/**
 * Maps a code a provider or the host app reported onto one of ours.
 *
 * Detected languages arrive in whatever form the service prefers — "EN-GB" from
 * DeepL, "zh-CN" from Google — so the region is dropped before matching. Returns
 * null for a language the plugin does not list, which the UI shows verbatim
 * rather than pretending to recognise.
 */
export function normalizeDetectedLang(reported: string | undefined | null): SourceLangCode | null {
	if (reported == null) return null;

	const subtags = reported.trim().toLowerCase().split(/[-_]/).filter((part) => part.length > 0);
	const base = subtags[0];
	if (base == null) return null;

	for (const lang of LANGUAGES) {
		if (lang.asSource && lang.code === base) return lang.code;
	}
	return null;
}
