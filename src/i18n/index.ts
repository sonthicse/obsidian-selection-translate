import { en, type Messages } from './en';
import { vi } from './vi';
import { zhHant } from './zh-Hant';
import { zhHans } from './zh-Hans';
import { ja } from './ja';
import { es } from './es';
import { it } from './it';
import { ar } from './ar';
import { getLanguage, normalizeUiLang, type LanguageDir, type UiLangCode } from '../languages';
import { warnOnce } from '../utils/log';

/**
 * A language the interface is available in.
 *
 * An alias rather than a union of its own: the registry's `ui` flag is the one
 * record of which locales exist, and a second list here could disagree with it.
 */
export type Locale = UiLangCode;

/**
 * The catalogues, one per locale.
 *
 * `Record<Locale, Messages>` is the whole safety net for adding a language.
 * Setting `ui: true` in the registry widens `Locale`, and this table then fails
 * to compile until a catalogue is written and listed here — so a locale can
 * never reach the dropdown with nothing behind it. The same trick the provider
 * code tables use, for the same reason.
 */
const CATALOGUES: Record<Locale, Messages> = {
	en,
	vi,
	'zh-Hant': zhHant,
	'zh-Hans': zhHans,
	ja,
	es,
	it,
	ar,
};

/**
 * Lookup for every string the plugin shows.
 *
 * Deliberately tiny: a dictionary, a substitution pass, and no dependency. The
 * active catalogue is module state rather than an injected service because the
 * alternative is threading a translator through every UI constructor for no
 * benefit — there is exactly one UI language at a time.
 */
let active: Messages = en;
let activeDir: LanguageDir = 'ltr';

/**
 * Switches the catalogue, and with it the direction the interface reads in.
 *
 * The two travel together because they answer one question. Arabic strings laid
 * out left to right is the failure this signature exists to make awkward.
 */
export function setMessages(messages: Messages, dir: LanguageDir = 'ltr'): void {
	active = messages;
	activeDir = dir;
}

/**
 * Which way the plugin's own chrome reads.
 *
 * Deliberately *not* Obsidian's `mod-rtl` body class. That class follows
 * Obsidian's interface language, and this plugin has an interface language of
 * its own — someone reading Obsidian in English can still set the plugin to
 * Arabic, and the popup then has to lay itself out right to left inside a
 * left-to-right app. The two agree whenever the setting is "same as Obsidian",
 * which is the common case, and this is correct in the case where they differ.
 *
 * Only the chrome. Which way a *translation* reads is decided by the language
 * of that text, not by this — see {@link PopupContent}.
 */
export function uiDir(): LanguageDir {
	return activeDir;
}

/**
 * Works out which language to show, following Obsidian when asked to.
 *
 * Obsidian records its interface language in `localStorage` under `language`,
 * and leaves the key absent for English. Read from the given window rather than
 * a global one so a popout resolves the same way, and guarded because
 * localStorage throws rather than returning null when storage is unavailable.
 *
 * The tag itself is resolved by the registry, which already has to answer the
 * same question for the languages a provider reports — including the one case
 * where dropping the subtag would be wrong, `zh-TW` and a bare `zh` meaning two
 * different Chineses. Anything the plugin has no catalogue for lands on English,
 * which covers both a language Obsidian has and this plugin does not, and a
 * value nothing wrote.
 *
 * `getLanguage()` from the Obsidian API would say this more directly, and the
 * lint rule that suggests it is switched on. It is `@since 1.8.7` against this
 * plugin's `minAppVersion` of 1.5.0, so calling it would throw for anyone on an
 * older build — the same reason the other deprecation warnings in this repo are
 * left standing. Revisit when the minimum rises.
 */
export function resolveLocale(setting: 'auto' | Locale, win: Window): Locale {
	if (setting !== 'auto') return setting;

	try {
		return normalizeUiLang(win.localStorage.getItem('language')) ?? 'en';
	} catch {
		// Storage blocked. English is the safe default.
		return 'en';
	}
}

/** Switches the active catalogue. Call after loading or changing settings. */
export function applyLocale(setting: 'auto' | Locale, win: Window): Locale {
	const locale = resolveLocale(setting, win);
	setMessages(CATALOGUES[locale], getLanguage(locale)?.dir ?? 'ltr');
	return locale;
}

/**
 * Resolves a message, substituting `{name}` placeholders.
 *
 * Accepts a plain string rather than only a known key, because errors travel up
 * from the provider layer carrying a key, and that layer has no business
 * importing the message catalogue.
 *
 * A key the active catalogue lacks falls back to English rather than rendering
 * itself. With two locales kept in step by the compiler, showing `error.foo` was
 * a fair trade for making the gap obvious; with eight it means one missed key in
 * one language puts an identifier in front of a user instead of a sentence they
 * merely cannot read in their own language. The warning stays either way, so the
 * gap is still reported once to the console.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
	const template = messageIn(active, key);
	if (template != null) return substitute(template, vars);

	warnOnce(`i18n:${key}`, `Missing UI string for "${key}"; falling back to English.`);

	const english = messageIn(en, key);
	// Missing from English too, so there is nothing to fall back to. The key is
	// obviously wrong on screen, which beats a blank popup.
	return english == null ? key : substitute(english, vars);
}

function messageIn(catalogue: Messages, key: string): string | undefined {
	return (catalogue as Record<string, string | undefined>)[key];
}

function substitute(template: string, vars: Record<string, string | number> | undefined): string {
	if (vars == null) return template;

	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = vars[name];
		return value == null ? match : String(value);
	});
}
