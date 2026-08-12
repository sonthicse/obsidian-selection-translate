import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { ProviderError, type ProviderErrorCode } from '../src/providers/TranslationProvider';

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

	it('returns the key itself for an unknown message', () => {
		// Obviously wrong on screen and reported to the console, both of which
		// beat rendering an empty popup.
		expect(t('error.doesNotExist')).toBe('error.doesNotExist');
	});

	it('handles a message with no placeholders even when vars are passed', () => {
		expect(t('popup.close', { unused: 1 })).toBe(en['popup.close']);
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
