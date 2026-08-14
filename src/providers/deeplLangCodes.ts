import type { LangCode } from '../languages';
import type { LangRole } from './TranslationProvider';

/*
 * How DeepL spells the plugin's languages, per role.
 *
 * The two roles are separate columns for a reason its API docs state once and
 * which is easy to miss: a code carrying a regional subtag is accepted as a
 * *target* but rejected as a *source*. English is the case that matters here —
 * `EN` in, `EN-US` out. Splitting the providers' tables apart made this easier
 * to state, not harder: nothing else has to know that DeepL is peculiar here.
 */
const SOURCE_CODES: Record<LangCode, string> = {
	en: 'EN',
	vi: 'VI',
	es: 'ES',
	fr: 'FR',
	de: 'DE',
	ru: 'RU',
};

const TARGET_CODES: Record<LangCode, string> = {
	en: 'EN-US',
	vi: 'VI',
	es: 'ES',
	fr: 'FR',
	de: 'DE',
	ru: 'RU',
};

/** DeepL's code for a language in that role, or undefined when it has none. */
export function toDeepLCode(code: LangCode, role: LangRole): string | undefined {
	return role === 'source' ? SOURCE_CODES[code] : TARGET_CODES[code];
}
