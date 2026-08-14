import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SETTINGS,
	SETTINGS_SCHEMA_VERSION,
	migrate,
	normalizeSettings,
} from '../src/settings/settings';

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

	it('falls back to defaults for a language it does not offer', () => {
		const result = normalizeSettings({ sourceLang: 'klingon', targetLang: 'ru' });

		expect(result.sourceLang).toBe(DEFAULT_SETTINGS.sourceLang);
		expect(result.targetLang).toBe(DEFAULT_SETTINGS.targetLang);
	});

	it('accepts the languages E3 added', () => {
		const result = normalizeSettings({ sourceLang: 'zh-Hant', targetLang: 'ja' });

		expect(result.sourceLang).toBe('zh-Hant');
		expect(result.targetLang).toBe('ja');
	});
});

/*
 * A settings file as 0.2.2 wrote it: no schemaVersion, the old two-language
 * target list, and the trigger key that version still had.
 */
const V0_2_2_DATA = {
	sourceLang: 'en',
	targetLang: 'vi',
	uiLanguage: 'auto',
	provider: 'deepl',
	deeplApiKey: 'fake-key-shaped-string',
	googleCloudApiKey: '',
	dictionaryEnrichment: true,
	dictionarySource: 'auto',
	autoPopupOnSelection: true,
	translateOnDoubleClick: true,
	minSelectionLength: 2,
	maxSelectionLength: 4000,
	iconPlacement: 'cursor',
	iconOffset: 12,
	triggerHotkey: { modifiers: ['Alt'], key: 'T' },
	enableInReading: true,
	enableInEditing: false,
	enableInProperties: true,
	enableInPdf: false,
	pdfSelectionFallback: false,
	fontSize: 16,
	fontFamily: 'Inter',
	popupTheme: 'follow',
	ttsEngine: 'google',
	ttsRate: 1.5,
	cacheSize: 500,
	stripMarkdown: false,
	debugLog: true,
};

describe('migrate', () => {
	it('loses nothing from a 0.2.2 data.json', () => {
		const { settings, notices } = migrate(V0_2_2_DATA);

		// Every field the old file set, still set to what it said.
		for (const [key, value] of Object.entries(V0_2_2_DATA)) {
			if (key === 'triggerHotkey') continue;
			expect(settings, key).toHaveProperty(key, value);
		}
		// A version with nothing to migrate should say nothing.
		expect(notices).toEqual([]);
	});

	it('stamps the schema version so it knows next time', () => {
		const { settings, changed } = migrate(V0_2_2_DATA);

		expect(settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
		expect(changed).toBe(true);
	});

	it('moves a Russian source to automatic detection, and says so once', () => {
		const first = migrate({ ...V0_2_2_DATA, sourceLang: 'ru' });

		// 'auto' rather than a fixed language: detection still translates
		// Russian, so only the ability to force the source is lost.
		expect(first.settings.sourceLang).toBe('auto');
		expect(first.notices).toEqual(['notice.russianRemoved']);

		// Second launch, loading what the first one saved.
		const second = migrate(first.settings);
		expect(second.notices).toEqual([]);
		expect(second.changed).toBe(false);
		expect(second.settings.sourceLang).toBe('auto');
	});

	it('leaves other languages alone while dropping Russian', () => {
		const { settings, notices } = migrate({ ...V0_2_2_DATA, sourceLang: 'de' });

		expect(settings.sourceLang).toBe('de');
		expect(notices).toEqual([]);
	});

	it('loads a data.json full of rubbish instead of failing', () => {
		// A hand-edited or corrupted file must still produce a usable plugin.
		const { settings } = migrate({
			schemaVersion: 'yesterday',
			sourceLang: 42,
			targetLang: { code: 'vi' },
			provider: 'not-a-provider',
			fontSize: 'huge',
			ttsRate: null,
			cacheSize: -1,
			minSelectionLength: 'two',
			enableInPdf: 'yes',
		});

		expect(settings.sourceLang).toBe(DEFAULT_SETTINGS.sourceLang);
		expect(settings.targetLang).toBe(DEFAULT_SETTINGS.targetLang);
		expect(settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
		expect(settings.ttsRate).toBe(DEFAULT_SETTINGS.ttsRate);
		expect(settings.cacheSize).toBe(0);
		expect(settings.minSelectionLength).toBe(DEFAULT_SETTINGS.minSelectionLength);
		expect(settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
	});

	it('treats a missing file as a fresh install', () => {
		expect(migrate(null).settings).toEqual(DEFAULT_SETTINGS);
		expect(migrate(undefined).notices).toEqual([]);
	});
});
