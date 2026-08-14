import { describe, expect, it } from 'vitest';
import {
	LANGUAGES,
	SOURCE_LANGUAGES,
	TARGET_LANGUAGES,
	UI_LANGUAGES,
	getLanguage,
	isSourceLang,
	isTargetLang,
	normalizeDetectedLang,
	normalizeUiLang,
	isUiLang,
} from '../src/languages';
import { toDeepLCode } from '../src/providers/deeplLangCodes';
import { toGoogleCode } from '../src/providers/googleLangCodes';
import { supportsPair, type LangCodeLookup } from '../src/providers/TranslationProvider';

/** Every provider's code table, so the checks below cannot forget a new one. */
const LOOKUPS: Record<string, LangCodeLookup> = {
	google: toGoogleCode,
	deepl: toDeepLCode,
};

describe('the language registry', () => {
	it('holds no duplicate codes', () => {
		const codes = LANGUAGES.map((lang) => lang.code);
		expect(new Set(codes).size).toBe(codes.length);
	});

	it('describes a language by its code', () => {
		expect(getLanguage('en')?.englishName).toBe('English');
		expect(getLanguage('klingon')).toBeUndefined();
	});

	it('offers automatic detection as a source but not as a target', () => {
		expect(SOURCE_LANGUAGES).toContain('auto');
		expect(TARGET_LANGUAGES).not.toContain('auto');
	});

	it('lists the agreed matrix: ten sources, ten targets', () => {
		// The matrix settled in the plan. A language quietly gaining or losing a
		// role is exactly the drift this test exists to catch.
		expect(SOURCE_LANGUAGES.filter((code) => code !== 'auto')).toHaveLength(10);
		expect(TARGET_LANGUAGES).toHaveLength(10);
	});

	it('no longer offers Russian', () => {
		expect(getLanguage('ru')).toBeUndefined();
		expect(isSourceLang('ru')).toBe(false);
	});

	it('claims a UI catalogue only where one exists', () => {
		// Setting `ui: true` before E4 writes the catalogue would let the
		// interface language dropdown offer a language with no strings behind it.
		expect([...UI_LANGUAGES].sort()).toEqual(['en', 'vi']);
	});

	it('keeps both Chinese variants apart, with the script in the code', () => {
		// Simplified is not traditional with the characters swapped, so the two
		// are separate entries with separate native names.
		expect(getLanguage('zh-Hant')?.nativeName).toBe('繁體中文');
		expect(getLanguage('zh-Hans')?.nativeName).toBe('简体中文');
		expect(getLanguage('zh')).toBeUndefined();
	});

	it('gives every language a native name and a direction', () => {
		for (const lang of LANGUAGES) {
			expect(lang.nativeName.length).toBeGreaterThan(0);
			expect(lang.englishName.length).toBeGreaterThan(0);
			expect(['ltr', 'rtl']).toContain(lang.dir);
		}
	});

	it('marks Arabic right-to-left, and nothing else', () => {
		const rtl = LANGUAGES.filter((lang) => lang.dir === 'rtl').map((lang) => lang.code);
		expect(rtl).toEqual(['ar']);
	});

	it('rejects a code that is not in the registry', () => {
		expect(isSourceLang('klingon')).toBe(false);
		expect(isTargetLang('auto')).toBe(false);
		expect(isSourceLang(42)).toBe(false);
	});
});

describe('provider code tables', () => {
	it('spells codes the way each service expects', () => {
		expect(toGoogleCode('vi', 'source')).toBe('vi');
		expect(toDeepLCode('en', 'source')).toBe('EN');
		expect(toDeepLCode('vi', 'target')).toBe('VI');
	});

	it('uses a regional variant for the English DeepL target only', () => {
		// DeepL accepts EN-US as a target and rejects it as a source.
		expect(toDeepLCode('en', 'target')).toBe('EN-US');
		expect(toDeepLCode('en', 'source')).toBe('EN');
	});

	it('sends Chinese to DeepL as one source but two targets', () => {
		// The same split as English, and the reason the roles are separate
		// columns: DeepL detects the script itself on the way in, and has to be
		// told which one to produce on the way out.
		expect(toDeepLCode('zh-Hans', 'source')).toBe('ZH');
		expect(toDeepLCode('zh-Hant', 'source')).toBe('ZH');
		expect(toDeepLCode('zh-Hans', 'target')).toBe('ZH-HANS');
		expect(toDeepLCode('zh-Hant', 'target')).toBe('ZH-HANT');
	});

	it('sends Chinese to Google by region rather than by script', () => {
		expect(toGoogleCode('zh-Hans', 'target')).toBe('zh-CN');
		expect(toGoogleCode('zh-Hant', 'target')).toBe('zh-TW');
	});

	it('gives every source language a code with at least one provider', () => {
		for (const code of SOURCE_LANGUAGES) {
			if (code === 'auto') continue;
			const spellings = Object.values(LOOKUPS).map((toCode) => toCode(code, 'source'));
			expect(spellings.some((spelling) => spelling != null)).toBe(true);
		}
	});

	it('gives every target language a code with at least one provider', () => {
		for (const code of TARGET_LANGUAGES) {
			const spellings = Object.values(LOOKUPS).map((toCode) => toCode(code, 'target'));
			expect(spellings.some((spelling) => spelling != null)).toBe(true);
		}
	});
});

describe('supportsPair', () => {
	it('accepts a pair only when both ends have a code', () => {
		// The invariant behind the unsupported-pair error: a pair a provider
		// claims to support must be one it can actually spell.
		for (const [name, toCode] of Object.entries(LOOKUPS)) {
			for (const source of SOURCE_LANGUAGES) {
				for (const target of TARGET_LANGUAGES) {
					if (!supportsPair(toCode, source, target)) continue;

					expect(toCode(target, 'target'), `${name} ${target} target`).toBeTruthy();
					if (source !== 'auto') {
						expect(toCode(source, 'source'), `${name} ${source} source`).toBeTruthy();
					}
				}
			}
		}
	});

	it('needs no code for automatic detection', () => {
		// 'auto' is a request to detect, not a language, so a table that has no
		// row for it still supports it.
		const nothing: LangCodeLookup = (code) => (code === 'vi' ? 'vi' : undefined);
		expect(supportsPair(nothing, 'auto', 'vi')).toBe(true);
	});

	it('rejects a pair the provider cannot spell, before any request', () => {
		// The case E5 needs: Papago has no Arabic. Simulated here because every
		// current provider covers the whole registry.
		const noArabic: LangCodeLookup = (code) => (code === 'ar' ? undefined : String(code));
		expect(noArabic('ar', 'target')).toBeUndefined();
		expect(supportsPair(noArabic, 'en', 'ar')).toBe(false);
		expect(supportsPair(noArabic, 'ar', 'en')).toBe(false);
		expect(supportsPair(noArabic, 'en', 'vi')).toBe(true);
	});
});

describe('normalizeDetectedLang', () => {
	it('drops the region a service tacked on', () => {
		expect(normalizeDetectedLang('EN-GB')).toBe('en');
		expect(normalizeDetectedLang('en_US')).toBe('en');
		expect(normalizeDetectedLang('DE')).toBe('de');
	});

	it('keeps the script subtag for Chinese', () => {
		// The whole point of E3-T3: dropping it collapsed both variants onto one
		// code, which made a correct Chinese translation impossible to ask for.
		expect(normalizeDetectedLang('zh-TW')).toBe('zh-Hant');
		expect(normalizeDetectedLang('zh-CN')).toBe('zh-Hans');
		expect(normalizeDetectedLang('zh-HK')).toBe('zh-Hant');
		expect(normalizeDetectedLang('zh-MO')).toBe('zh-Hant');
		expect(normalizeDetectedLang('zh-SG')).toBe('zh-Hans');
		expect(normalizeDetectedLang('zh-Hans')).toBe('zh-Hans');
		expect(normalizeDetectedLang('zh-Hant')).toBe('zh-Hant');
	});

	it('reads a bare zh as simplified, following Obsidian', () => {
		expect(normalizeDetectedLang('zh')).toBe('zh-Hans');
		expect(normalizeDetectedLang('ZH')).toBe('zh-Hans');
	});

	it('leans traditional for a Chinese variant it does not know', () => {
		// The opposite default to a bare `zh`, and deliberately so: traditional
		// is this project's reference Chinese, but a bare `zh` is Obsidian's own
		// spelling of simplified and agreeing with the host app wins there.
		expect(normalizeDetectedLang('zh-YUE')).toBe('zh-Hant');
		expect(normalizeDetectedLang('zh-Latn')).toBe('zh-Hant');
	});

	it('lets the script outrank the region', () => {
		// `zh-Hant-CN` is traditional written in the mainland. The script is the
		// part that decides which characters we produce.
		expect(normalizeDetectedLang('zh-Hant-CN')).toBe('zh-Hant');
		expect(normalizeDetectedLang('zh-Hans-TW')).toBe('zh-Hans');
	});

	it('recognises the languages added in E3', () => {
		expect(normalizeDetectedLang('ja')).toBe('ja');
		expect(normalizeDetectedLang('ar')).toBe('ar');
		expect(normalizeDetectedLang('it-IT')).toBe('it');
	});

	it('returns null for a language the plugin does not list', () => {
		// Better to show what the service said than to claim a wrong match.
		expect(normalizeDetectedLang('ru')).toBeNull();
		expect(normalizeDetectedLang('ko')).toBeNull();
	});

	it('returns null for absent or empty input', () => {
		expect(normalizeDetectedLang(null)).toBeNull();
		expect(normalizeDetectedLang(undefined)).toBeNull();
		expect(normalizeDetectedLang('  ')).toBeNull();
		expect(normalizeDetectedLang('-')).toBeNull();
	});

	it('never resolves to the automatic pseudo-language', () => {
		expect(normalizeDetectedLang('auto')).toBeNull();
	});
});

describe('normalizeUiLang', () => {
	it('answers from the interface column, not the source one', () => {
		// The distinction the two wrappers exist for: every language here is a
		// translation source, and only some of them have strings of their own.
		expect(normalizeDetectedLang('fr')).toBe('fr');
		expect(normalizeUiLang('fr')).toBeNull();
		expect(isUiLang('fr')).toBe(false);
	});

	it('recognises the locales that do have a catalogue', () => {
		for (const code of UI_LANGUAGES) {
			expect(normalizeUiLang(code), code).toBe(code);
		}
	});

	it('shares the region-dropping rule with detected languages', () => {
		expect(normalizeUiLang('en-GB')).toBe('en');
		expect(normalizeUiLang('vi_VN')).toBe('vi');
		expect(normalizeUiLang('VI')).toBe('vi');
	});

	it('returns null for absent, empty or unknown input', () => {
		expect(normalizeUiLang(null)).toBeNull();
		expect(normalizeUiLang(undefined)).toBeNull();
		expect(normalizeUiLang('  ')).toBeNull();
		expect(normalizeUiLang('klingon')).toBeNull();
	});
});
