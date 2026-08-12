import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings/settings';

describe('normalizeSettings', () => {
	it('returns the defaults when nothing has been stored yet', () => {
		expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
	});

	it('ignores a stored value that is not an object', () => {
		expect(normalizeSettings('corrupted')).toEqual(DEFAULT_SETTINGS);
	});

	it('keeps stored values and fills in settings added after they were saved', () => {
		const stored = { provider: 'deepl', targetLang: 'en' };
		const result = normalizeSettings(stored);

		expect(result.provider).toBe('deepl');
		expect(result.targetLang).toBe('en');
		// Present in the defaults but absent from the stored payload.
		expect(result.cacheSize).toBe(DEFAULT_SETTINGS.cacheSize);
	});

	it('clamps out-of-range numbers a hand-edited data.json could contain', () => {
		const result = normalizeSettings({
			fontSize: 99,
			iconOffset: -5,
			ttsRate: 12,
			cacheSize: 999999,
		});

		expect(result.fontSize).toBe(22);
		expect(result.iconOffset).toBe(0);
		expect(result.ttsRate).toBe(2);
		expect(result.cacheSize).toBe(2000);
	});

	it('falls back to defaults when a numeric setting is not a number at all', () => {
		const result = normalizeSettings({ fontSize: 'big', ttsRate: null });

		expect(result.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
		expect(result.ttsRate).toBe(DEFAULT_SETTINGS.ttsRate);
	});

	it('repairs an inverted length range instead of rejecting every selection', () => {
		const result = normalizeSettings({ minSelectionLength: 90, maxSelectionLength: 120 });
		expect(result.minSelectionLength).toBeLessThanOrEqual(result.maxSelectionLength);

		// 5000 > 100, so both ends are individually valid but ordered wrongly.
		const inverted = normalizeSettings({ minSelectionLength: 100, maxSelectionLength: 100 });
		expect(inverted.minSelectionLength).toBeLessThanOrEqual(inverted.maxSelectionLength);
	});

	it('drops the trigger key left behind by an older version', () => {
		// The plugin no longer has a key of its own, and a field nothing reads
		// should not keep being written back into the user's data.
		const migrated = normalizeSettings({ triggerHotkey: { modifiers: ['Alt'], key: 'T' } });
		expect(migrated).not.toHaveProperty('triggerHotkey');
	});
});
