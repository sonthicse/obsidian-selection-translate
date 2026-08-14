import type { LangCode } from '../languages';
import type { LangRole } from './TranslationProvider';

/*
 * How DeepL spells the plugin's languages, per role.
 *
 * The two roles are separate columns for a reason its API docs state once and
 * which is easy to miss: a code carrying a regional or script subtag is accepted
 * as a *target* but rejected as a *source*. English is the long-standing case
 * (`EN` in, `EN-US` out) and Chinese is the newer one — `ZH` is the only source
 * code, while `ZH-HANS` and `ZH-HANT` exist only as targets. Splitting the
 * providers' tables apart made this easier to state, not harder: nothing else
 * has to know that DeepL is peculiar here.
 *
 * Verified against DeepL's supported-languages documentation in August 2026.
 */
const SOURCE_CODES: Record<LangCode, string> = {
	en: 'EN',
	vi: 'VI',
	// One source code for both variants: DeepL detects the script itself and
	// offers no way to insist on one.
	'zh-Hant': 'ZH',
	'zh-Hans': 'ZH',
	ja: 'JA',
	ar: 'AR',
	es: 'ES',
	it: 'IT',
	fr: 'FR',
	de: 'DE',
	ru: 'RU',
};

const TARGET_CODES: Record<LangCode, string> = {
	en: 'EN-US',
	vi: 'VI',
	'zh-Hant': 'ZH-HANT',
	'zh-Hans': 'ZH-HANS',
	ja: 'JA',
	ar: 'AR',
	es: 'ES',
	it: 'IT',
	fr: 'FR',
	de: 'DE',
	ru: 'RU',
};

/** DeepL's code for a language in that role, or undefined when it has none. */
export function toDeepLCode(code: LangCode, role: LangRole): string | undefined {
	return role === 'source' ? SOURCE_CODES[code] : TARGET_CODES[code];
}
