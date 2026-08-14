import type { LangCode } from '../languages';
import type { LangRole } from './TranslationProvider';

/*
 * How Google spells the plugin's languages.
 *
 * Shared by the free endpoint (`sl`/`tl`) and Cloud Translation v2
 * (`source`/`target`), which agree on every code, so the role is accepted for
 * the sake of a uniform signature and then ignored.
 */
const CODES: Record<LangCode, string> = {
	en: 'en',
	vi: 'vi',
	es: 'es',
	fr: 'fr',
	de: 'de',
	ru: 'ru',
};

/** Google's code for a language, or undefined when it has none. */
export function toGoogleCode(code: LangCode, _role: LangRole): string | undefined {
	return CODES[code];
}
