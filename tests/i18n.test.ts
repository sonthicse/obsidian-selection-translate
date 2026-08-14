import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import { applyLocale, resolveLocale, setMessages, t, type Locale } from '../src/i18n';
import { en, type Messages } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';
import { zhHant } from '../src/i18n/zh-Hant';
import { zhHans } from '../src/i18n/zh-Hans';
import { ja } from '../src/i18n/ja';
import { es } from '../src/i18n/es';
import { it as itCatalogue } from '../src/i18n/it';
import { UI_LANGUAGES } from '../src/languages';
import { resetWarnings } from '../src/utils/log';
import { ProviderError, type ProviderErrorCode } from '../src/providers/TranslationProvider';

/** Every catalogue the plugin ships, keyed the way the i18n layer keys them. */
const CATALOGUES: Record<Locale, Messages> = { en, vi, 'zh-Hant': zhHant, 'zh-Hans': zhHans, ja, es, it: itCatalogue };

/** A window whose localStorage reports whatever Obsidian would have written. */
function windowWithLanguage(language: string | null): Window {
	return {
		localStorage: { getItem: (key: string) => (key === 'language' ? language : null) },
	} as unknown as Window;
}

afterEach(() => {
	setMessages(en);
	resetWarnings();
});

describe('t', () => {
	it('returns the message for a known key', () => {
		expect(t('popup.close')).toBe(en['popup.close']);
	});

	it('substitutes named placeholders', () => {
		expect(t('error.tooLong', { length: 7200, max: 5000 })).toBe(
			'The selection is 7200 characters. The limit is 5000.'
		);
	});

	it('leaves a placeholder in place when no value was supplied', () => {
		// Better a visible {max} than a sentence that silently reads wrong.
		expect(t('error.tooLong', { length: 10 })).toContain('{max}');
	});

	it('returns the key itself for a message no catalogue has', () => {
		// Obviously wrong on screen and reported to the console, both of which
		// beat rendering an empty popup.
		expect(t('error.doesNotExist')).toBe('error.doesNotExist');
	});

	it('handles a message with no placeholders even when vars are passed', () => {
		expect(t('popup.close', { unused: 1 })).toBe(en['popup.close']);
	});

	it('falls back to English for a key the active catalogue lacks', () => {
		// The compiler keeps the shipped catalogues complete, so the gap has to be
		// simulated. What matters is the shape of the answer: a sentence somebody
		// can read, not the identifier `popup.close`.
		const warn = vitest.spyOn(console, 'warn').mockImplementation(() => undefined);
		const incomplete: Messages = { ...vi };
		delete (incomplete as Record<string, unknown>)['popup.close'];

		setMessages(incomplete);

		expect(t('popup.close')).toBe(en['popup.close']);
		// Still reported, or a permanently missing translation would be invisible.
		expect(warn).toHaveBeenCalledOnce();
		warn.mockRestore();
	});

	it('substitutes into the English fallback too', () => {
		const warn = vitest.spyOn(console, 'warn').mockImplementation(() => undefined);
		const incomplete: Messages = { ...vi };
		delete (incomplete as Record<string, unknown>)['error.tooLong'];

		setMessages(incomplete);

		expect(t('error.tooLong', { length: 12, max: 10 })).toBe(
			'The selection is 12 characters. The limit is 10.'
		);
		warn.mockRestore();
	});

	it('warns once per key, however often the string is asked for', () => {
		const warn = vitest.spyOn(console, 'warn').mockImplementation(() => undefined);

		t('error.doesNotExist');
		t('error.doesNotExist');
		t('error.doesNotExist');

		expect(warn).toHaveBeenCalledOnce();
		warn.mockRestore();
	});
});

describe('every locale', () => {
	it('has a catalogue for each language the registry offers as an interface', () => {
		// The compile-time check has a runtime twin here so the failure reads as a
		// missing catalogue rather than as a type error in an unrelated file.
		expect(Object.keys(CATALOGUES).sort()).toEqual([...UI_LANGUAGES].sort());
	});

	it('carries exactly English’s keys — none missing, none extra', () => {
		const expected = Object.keys(en).sort();

		for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
			expect(Object.keys(catalogue).sort(), locale).toEqual(expected);
		}
	});

	it('substitutes the same placeholders as English in every string', () => {
		// A catalogue can have every key and still be broken: `{ms}` misspelled in
		// one language renders the braces to the user.
		const names = (value: string): string[] =>
			[...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

		for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
			for (const [key, value] of Object.entries(en)) {
				const theirs = (catalogue as Record<string, string | undefined>)[key] ?? '';
				expect(names(theirs), `${locale} ${key}: "${theirs}"`).toEqual(names(value));
			}
		}
	});

	it('leaves no string empty', () => {
		for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
			for (const [key, value] of Object.entries(catalogue)) {
				expect(value.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
			}
		}
	});
});

describe('resolveLocale', () => {
	it('honours an explicit choice without consulting Obsidian', () => {
		// A window whose storage would answer differently, to prove it is not read.
		const win = windowWithLanguage('vi');

		expect(resolveLocale('en', win)).toBe('en');
		expect(resolveLocale('vi', windowWithLanguage('en'))).toBe('vi');
	});

	it('follows Obsidian’s interface language when set to auto', () => {
		expect(resolveLocale('auto', windowWithLanguage('vi'))).toBe('vi');
		expect(resolveLocale('auto', windowWithLanguage('en'))).toBe('en');
	});

	it('matches on the base language when Obsidian carries a region', () => {
		expect(resolveLocale('auto', windowWithLanguage('vi-VN'))).toBe('vi');
		expect(resolveLocale('auto', windowWithLanguage('en-GB'))).toBe('en');
	});

	it('falls back to English for a language Obsidian has and this plugin does not', () => {
		// Obsidian ships far more interface languages than the plugin does, so
		// this is the ordinary case rather than an edge one.
		expect(resolveLocale('auto', windowWithLanguage('fr'))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage('ko'))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage('ru'))).toBe('en');
	});

	it('falls back to English for absent or nonsense values', () => {
		expect(resolveLocale('auto', windowWithLanguage(null))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage(''))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage('   '))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage('-'))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage('klingon'))).toBe('en');
		expect(resolveLocale('auto', windowWithLanguage('{"lang":"vi"}'))).toBe('en');
	});

	it('ignores case and the underscore some hosts use', () => {
		expect(resolveLocale('auto', windowWithLanguage('VI'))).toBe('vi');
		expect(resolveLocale('auto', windowWithLanguage('vi_VN'))).toBe('vi');
	});

	it('reads Obsidian’s two Chineses as the two the plugin ships', () => {
		// Obsidian ships exactly `zh` and `zh-TW`, and a bare `zh` is its own
		// spelling of simplified. Agreeing with the host app is the whole point
		// here, which is why this leans the opposite way to the rule below.
		expect(resolveLocale('auto', windowWithLanguage('zh'))).toBe('zh-Hans');
		expect(resolveLocale('auto', windowWithLanguage('zh-TW'))).toBe('zh-Hant');
	});

	it('follows the script subtag rather than the region', () => {
		expect(resolveLocale('auto', windowWithLanguage('zh-CN'))).toBe('zh-Hans');
		expect(resolveLocale('auto', windowWithLanguage('zh-SG'))).toBe('zh-Hans');
		expect(resolveLocale('auto', windowWithLanguage('zh-Hant-CN'))).toBe('zh-Hant');
	});

	it('leans traditional for a Chinese variant nobody listed', () => {
		expect(resolveLocale('auto', windowWithLanguage('zh-HK'))).toBe('zh-Hant');
		expect(resolveLocale('auto', windowWithLanguage('zh-MO'))).toBe('zh-Hant');
		expect(resolveLocale('auto', windowWithLanguage('zh-Hant'))).toBe('zh-Hant');
		expect(resolveLocale('auto', windowWithLanguage('zh-YUE'))).toBe('zh-Hant');
	});

	it('falls back to English when storage itself is unavailable', () => {
		// Reading localStorage throws rather than returning null when the
		// embedder has blocked it, which would otherwise take the plugin down
		// before it drew anything.
		const win = {
			localStorage: {
				getItem: () => {
					throw new Error('storage disabled');
				},
			},
		} as unknown as Window;

		expect(resolveLocale('auto', win)).toBe('en');
	});
});

describe('applyLocale', () => {
	it('switches the strings t() answers with', () => {
		applyLocale('vi', windowWithLanguage(null));
		expect(t('popup.close')).toBe(vi['popup.close']);

		applyLocale('en', windowWithLanguage(null));
		expect(t('popup.close')).toBe(en['popup.close']);
	});

	it('returns the locale it settled on', () => {
		expect(applyLocale('auto', windowWithLanguage('vi'))).toBe('vi');
	});
});

describe('message catalogue coverage', () => {
	const codes: ProviderErrorCode[] = [
		'missing-key',
		'invalid-key',
		'quota-exceeded',
		'rate-limited',
		'server-busy',
		'payload-too-large',
		'unsupported-pair',
		'network',
		'bad-response',
		'unknown',
	];

	it('has a message for every failure a provider can raise', () => {
		// Providers carry a key, not a sentence, so nothing type-checks the two
		// against each other. This test is that check.
		for (const code of codes) {
			const error = new ProviderError(code);
			expect(Object.keys(en)).toContain(error.i18nKey);
		}
	});

	it('has a label for every error action', () => {
		for (const key of ['action.retry', 'action.openSettings', 'action.changeProvider']) {
			expect(Object.keys(en)).toContain(key);
		}
	});

	it('has a message for every connection-test outcome', () => {
		for (const key of [
			'settings.testOk',
			'settings.testOkWithQuota',
			'settings.testFailed',
			'settings.testInvalidKey',
			'settings.testMissingKey',
			'settings.testBadResponse',
		]) {
			expect(Object.keys(en)).toContain(key);
		}
	});

	/**
	 * Words that are capitalised because they are names, not because the string
	 * is in title case. Kept explicit rather than guessed at: a heuristic loose
	 * enough to accept "Google Cloud" would accept most title case too.
	 */
	const PROPER_NOUNS = [
		'DeepL',
		'Google',
		'Cloud',
		'API',
		'Obsidian',
		'Free',
		'Dictionary',
		'Markdown',
	];

	it('writes every string in sentence case, as the style guide requires', () => {
		for (const [key, value] of Object.entries(en)) {
			// Placeholders are example values, not prose. "Inter, Segoe UI,
			// sans-serif" is a list of typefaces and has no sentence case.
			if (key.endsWith('Placeholder')) continue;

			// A capitalised word after the first usually means title case.
			const words = value.split(' ').slice(1, 3);
			for (const word of words) {
				const looksLikeTitleCase = /^[A-Z][a-z]+$/.test(word) && !PROPER_NOUNS.includes(word);
				expect(looksLikeTitleCase, `${key}: "${value}"`).toBe(false);
			}
		}
	});

	it('never ends a control label with a full stop', () => {
		// Labels and messages both live under `popup.`, and only labels are
		// covered: a Notice such as popup.copyFailed is a sentence and should
		// end like one.
		const labels = [
			'icon.label',
			'action.retry',
			'action.openSettings',
			'action.changeProvider',
			'popup.speak',
			'popup.stopSpeaking',
			'popup.copy',
			'popup.settings',
			'popup.close',
		];

		for (const key of labels) {
			const value = (en as Record<string, string>)[key];
			expect(value, `${key} is missing`).toBeTruthy();
			expect(value?.endsWith('.'), `${key}: "${value ?? ''}"`).toBe(false);
		}
	});

	it('ends every failure message with a full stop, because they are sentences', () => {
		for (const [key, value] of Object.entries(en)) {
			if (!key.startsWith('error.')) continue;
			expect(value.endsWith('.'), `${key}: "${value}"`).toBe(true);
		}
	});
});
