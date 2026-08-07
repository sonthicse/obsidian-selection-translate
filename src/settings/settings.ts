import type {
	DictionarySourceId,
	HotkeyBinding,
	ProviderId,
	SourceLangCode,
	TargetLangCode,
	TtsEngineId,
} from '../types';

export type UiLanguage = 'auto' | 'vi' | 'en';
export type IconPlacement = 'below-center' | 'above-center' | 'cursor';
export type PopupTheme = 'light' | 'follow';

export interface SelectionTranslateSettings {
	/* Languages */
	sourceLang: SourceLangCode;
	targetLang: TargetLangCode;
	uiLanguage: UiLanguage;

	/* Translation engine */
	provider: ProviderId;
	deeplApiKey: string;
	googleCloudApiKey: string;
	dictionaryEnrichment: boolean;
	dictionarySource: DictionarySourceId;

	/* Activation */
	autoPopupOnSelection: boolean;
	translateOnDoubleClick: boolean;
	triggerHotkey: HotkeyBinding | null;
	minSelectionLength: number;
	maxSelectionLength: number;
	iconPlacement: IconPlacement;
	iconOffset: number;

	/* Scope */
	enableInReading: boolean;
	enableInEditing: boolean;
	enableInProperties: boolean;
	enableInPdf: boolean;
	pdfSelectionFallback: boolean;

	/* Appearance */
	fontSize: number;
	fontFamily: string;
	popupTheme: PopupTheme;

	/* Speech */
	ttsEngine: TtsEngineId;
	ttsRate: number;

	/* Advanced */
	cacheSize: number;
	stripMarkdown: boolean;
	debugLog: boolean;
}

/*
 * Defaults are chosen so a fresh install works with no configuration at all:
 * the only provider that needs no API key is selected, and every surface is
 * enabled. Anything that sends data somewhere the user did not ask for
 * (Google TTS, the free-endpoint warning) stays off or behind a prompt.
 */
export const DEFAULT_SETTINGS: SelectionTranslateSettings = {
	sourceLang: 'auto',
	targetLang: 'vi',
	uiLanguage: 'auto',

	provider: 'google-free',
	deeplApiKey: '',
	googleCloudApiKey: '',
	dictionaryEnrichment: true,
	dictionarySource: 'auto',

	// Off by default: firing a network request on every drag-select would be
	// both surprising and quota-hungry. The user opts in.
	autoPopupOnSelection: false,
	translateOnDoubleClick: false,
	// No default hotkey, per Obsidian's guidelines. The settings tab suggests
	// Alt+T but never assigns it.
	triggerHotkey: null,
	minSelectionLength: 1,
	maxSelectionLength: 5000,
	iconPlacement: 'below-center',
	iconOffset: 8,

	enableInReading: true,
	enableInEditing: true,
	enableInProperties: true,
	enableInPdf: true,
	pdfSelectionFallback: true,

	fontSize: 14,
	fontFamily: '',
	popupTheme: 'light',

	ttsEngine: 'webspeech',
	ttsRate: 1,

	cacheSize: 200,
	stripMarkdown: true,
	debugLog: false,
};

/** Bounds enforced on load, so a hand-edited data.json cannot put the plugin
 *  into a state the settings UI can no longer express. */
export const SETTING_LIMITS = {
	fontSize: { min: 11, max: 22 },
	iconOffset: { min: 0, max: 24 },
	ttsRate: { min: 0.5, max: 2 },
	cacheSize: { min: 0, max: 2000 },
	minSelectionLength: { min: 1, max: 100 },
	maxSelectionLength: { min: 100, max: 20000 },
} as const;

function clamp(value: number, min: number, max: number, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, value));
}

/**
 * Merges stored settings over the defaults and repairs out-of-range values.
 *
 * `loadData()` returns whatever was on disk, which may predate a setting that
 * now exists or may have been edited by hand. Spreading over DEFAULT_SETTINGS
 * covers the first case; the clamping below covers the second.
 */
export function normalizeSettings(stored: unknown): SelectionTranslateSettings {
	const merged: SelectionTranslateSettings = {
		...DEFAULT_SETTINGS,
		...(stored && typeof stored === 'object' ? (stored as Partial<SelectionTranslateSettings>) : {}),
	};

	merged.fontSize = clamp(
		merged.fontSize,
		SETTING_LIMITS.fontSize.min,
		SETTING_LIMITS.fontSize.max,
		DEFAULT_SETTINGS.fontSize
	);
	merged.iconOffset = clamp(
		merged.iconOffset,
		SETTING_LIMITS.iconOffset.min,
		SETTING_LIMITS.iconOffset.max,
		DEFAULT_SETTINGS.iconOffset
	);
	merged.ttsRate = clamp(
		merged.ttsRate,
		SETTING_LIMITS.ttsRate.min,
		SETTING_LIMITS.ttsRate.max,
		DEFAULT_SETTINGS.ttsRate
	);
	merged.cacheSize = clamp(
		merged.cacheSize,
		SETTING_LIMITS.cacheSize.min,
		SETTING_LIMITS.cacheSize.max,
		DEFAULT_SETTINGS.cacheSize
	);
	merged.minSelectionLength = clamp(
		merged.minSelectionLength,
		SETTING_LIMITS.minSelectionLength.min,
		SETTING_LIMITS.minSelectionLength.max,
		DEFAULT_SETTINGS.minSelectionLength
	);
	merged.maxSelectionLength = clamp(
		merged.maxSelectionLength,
		SETTING_LIMITS.maxSelectionLength.min,
		SETTING_LIMITS.maxSelectionLength.max,
		DEFAULT_SETTINGS.maxSelectionLength
	);

	// An inverted range would reject every selection with no visible reason.
	if (merged.minSelectionLength > merged.maxSelectionLength) {
		merged.minSelectionLength = DEFAULT_SETTINGS.minSelectionLength;
		merged.maxSelectionLength = DEFAULT_SETTINGS.maxSelectionLength;
	}

	return merged;
}
