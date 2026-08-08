import { en, type Messages } from './en';
import { warnOnce } from '../utils/log';

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
