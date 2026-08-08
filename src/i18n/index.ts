import { en, type Messages } from './en';
import { vi } from './vi';
import { warnOnce } from '../utils/log';

export type Locale = 'en' | 'vi';

const CATALOGUES: Record<Locale, Messages> = { en, vi };

/**
 * Lookup for every string the plugin shows.
 *
 * Deliberately tiny: a dictionary, a substitution pass, and no dependency. The
 * active catalogue is module state rather than an injected service because the
 * alternative is threading a translator through every UI constructor for no
 * benefit — there is exactly one UI language at a time.
 */
let active: Messages = en;

export function setMessages(messages: Messages): void {
	active = messages;
}

/**
 * Works out which language to show, following Obsidian when asked to.
 *
 * Obsidian records its interface language in `localStorage` under `language`,
 * and leaves the key absent for English. Read from the given window rather than
 * a global one so a popout resolves the same way, and guarded because
 * localStorage throws rather than returning null when storage is unavailable.
 */
export function resolveLocale(setting: 'auto' | Locale, win: Window): Locale {
	if (setting !== 'auto') return setting;

	try {
		const obsidianLanguage = win.localStorage.getItem('language');
		if (obsidianLanguage != null && obsidianLanguage.toLowerCase().startsWith('vi')) return 'vi';
	} catch {
		// Storage blocked. English is the safe default.
	}

	return 'en';
}

/** Switches the active catalogue. Call after loading or changing settings. */
export function applyLocale(setting: 'auto' | Locale, win: Window): Locale {
	const locale = resolveLocale(setting, win);
	setMessages(CATALOGUES[locale]);
	return locale;
}

/**
 * Resolves a message, substituting `{name}` placeholders.
 *
 * Accepts a plain string rather than only a known key, because errors travel up
 * from the provider layer carrying a key, and that layer has no business
 * importing the message catalogue. An unknown key returns itself, so a missing
 * translation shows as `error.somethingNew` — ugly, obviously wrong, and
 * reported once to the console, which all beat a blank popup.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
	const template = (active as Record<string, string | undefined>)[key];

	if (template == null) {
		warnOnce(`i18n:${key}`, `Missing UI string for "${key}".`);
		return key;
	}

	if (vars == null) return template;

	return template.replace(/\{(\w+)\}/g, (match, name: string) => {
		const value = vars[name];
		return value == null ? match : String(value);
	});
}
