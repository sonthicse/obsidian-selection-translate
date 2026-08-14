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

	it('claims a UI catalogue only where one exists', () => {
		// Claiming one a language does not have would let the interface language
		// dropdown offer a language with no strings behind it.
		expect([...UI_LANGUAGES].sort()).toEqual(['en', 'vi']);
	});

	it('separates the two roles', () => {
		// Spanish, French and German translate *from* but not *into*, which is
		// what the two flags are for.
		expect(SOURCE_LANGUAGES).toContain('de');
		expect(TARGET_LANGUAGES).not.toContain('de');
	});

	it('gives every language a native name and a direction', () => {
		for (const lang of LANGUAGES) {
			expect(lang.nativeName.length).toBeGreaterThan(0);
			expect(lang.englishName.length).toBeGreaterThan(0);
			expect(['ltr', 'rtl']).toContain(lang.dir);
		}
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
		// Simulated, because every current provider covers the whole registry.
		// This is the answer the popup turns into an unsupported-pair error
		// without spending a request to find out.
		const noGerman: LangCodeLookup = (code) => (code === 'de' ? undefined : String(code));
		expect(supportsPair(noGerman, 'de', 'en')).toBe(false);
		expect(supportsPair(noGerman, 'fr', 'en')).toBe(true);
	});
});

describe('normalizeDetectedLang', () => {
	it('drops the region a service tacked on', () => {
		expect(normalizeDetectedLang('EN-GB')).toBe('en');
		expect(normalizeDetectedLang('en_US')).toBe('en');
		expect(normalizeDetectedLang('DE')).toBe('de');
	});

	it('returns null for a language the plugin does not list', () => {
		// Better to show what the service said than to claim a wrong match.
		expect(normalizeDetectedLang('ja')).toBeNull();
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
