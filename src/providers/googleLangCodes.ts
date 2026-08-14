import type { LangCode } from '../languages';
import type { LangRole } from './TranslationProvider';

/*
 * How Google spells the plugin's languages.
 *
 * Shared by the free endpoint (`sl`/`tl`) and Cloud Translation v2
 * (`source`/`target`), which agree on every code, so the role is accepted for
 * the sake of a uniform signature and then ignored. Verified against Cloud
 * Translation's language support page in August 2026: Chinese is the only
 * language whose code differs from its plain ISO-639-1 form, and it carries a
 * region rather than a script — `zh-CN` and `zh-TW`, not `zh-Hans`/`zh-Hant`.
 */
const CODES: Record<LangCode, string> = {
	en: 'en',
	vi: 'vi',
	'zh-Hant': 'zh-TW',
	'zh-Hans': 'zh-CN',
	ja: 'ja',
	ar: 'ar',
	es: 'es',
	it: 'it',
	fr: 'fr',
	de: 'de',
};

/** Google's code for a language, or undefined when it has none. */
export function toGoogleCode(code: LangCode, _role: LangRole): string | undefined {
	return CODES[code];
}
