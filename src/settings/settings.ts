import { isSourceLang, isTargetLang, type SourceLangCode, type TargetLangCode } from '../languages';
import type { DictionarySourceId, ProviderId, TtsEngineId } from '../types';

export type UiLanguage = 'auto' | 'vi' | 'en';
export type IconPlacement = 'below-center' | 'above-center' | 'cursor';
export type PopupTheme = 'light' | 'follow';

/**
 * Schema generation of the stored settings.
 *
 * Bumped only when a stored value has to be rewritten rather than merely
 * validated — see the note on `migrate()` for where that line falls. Data
 * written before this field existed is treated as generation 0.
 *
 *   1 — Russian dropped as a source language; language codes moved to BCP-47
 *       tags, which gave Chinese its script subtag (`zh-Hans` / `zh-Hant`).
 */
export const SETTINGS_SCHEMA_VERSION = 1;

export interface SelectionTranslateSettings {
	/** Which generation of the schema the stored data was written by. */
	schemaVersion: number;

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
	schemaVersion: SETTINGS_SCHEMA_VERSION,

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
 * Merges stored settings over the defaults and repairs invalid values.
 *
 * `loadData()` returns whatever was on disk, which may predate a setting that
 * now exists or may have been edited by hand. Spreading over DEFAULT_SETTINGS
 * covers the first case; the clamping below covers the second.
 *
 * The division of labour with `migrate()` is worth stating, because a rule
 * added to the wrong one of the two is a bug that only shows up on someone
 * else's vault:
 *
 *   - This function enforces what is true of *every* version of the settings:
 *     a number stays within its limits, an unknown value falls back to its
 *     default. It runs on every load, knows nothing about schema generations,
 *     and never tells the user anything.
 *   - `migrate()` rewrites values whose *meaning* changed between generations,
 *     runs once per generation, and is the only place allowed to raise a notice.
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

	// A language that is not in the registry — a hand-edited file, or one this
	// version stopped offering — would leave the dropdown blank and every
	// request rejected. Detection is the honest fallback for a source; the
	// default target is the only sensible answer for a target.
	if (!isSourceLang(merged.sourceLang)) merged.sourceLang = DEFAULT_SETTINGS.sourceLang;
	if (!isTargetLang(merged.targetLang)) merged.targetLang = DEFAULT_SETTINGS.targetLang;

	// The local trigger key was removed in favour of Obsidian's own hotkey for
	// the command. Dropped rather than left in place, so the next save does not
	// keep writing a field nothing reads back into the user's data.
	delete (merged as { triggerHotkey?: unknown }).triggerHotkey;

	return merged;
}

/**
 * What a migration did, so the caller can save and speak once.
 *
 * `notices` are message keys rather than sentences, for the same reason a
 * provider error carries one: this module has no business knowing which
 * language the user reads.
 */
export interface MigrationOutcome {
	settings: SelectionTranslateSettings;
	/** True when the stored data changed and has to be written back. */
	changed: boolean;
	/** Message keys to show the user, once, for changes made on their behalf. */
	notices: string[];
}

/**
 * Brings stored settings forward to the current schema generation.
 *
 * Runs before `normalizeSettings()` so the rules below see the values as they
 * were actually written. Anything it rewrites, it also reports: a setting that
 * silently changes meaning between two versions is the kind of thing a user
 * discovers weeks later and cannot explain.
 *
 * Saving the result is the caller's job, and it is not optional — the stored
 * `schemaVersion` is the only record that a migration already ran, so skipping
 * the save means repeating the notice on every launch.
 */
export function migrate(stored: unknown): MigrationOutcome {
	const raw: Record<string, unknown> =
		stored != null && typeof stored === 'object' ? { ...(stored as Record<string, unknown>) } : {};

	const from = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
	const notices: string[] = [];

	if (from < 1) {
		// Russian was dropped as a source language. 'auto' rather than a fixed
		// language: detection still translates Russian text perfectly well, so
		// the only thing actually lost is the ability to force the source.
		if (raw.sourceLang === 'ru') {
			raw.sourceLang = 'auto';
			notices.push('notice.russianRemoved');
		}
	}

	const settings = normalizeSettings(raw);
	settings.schemaVersion = SETTINGS_SCHEMA_VERSION;

	return { settings, changed: from < SETTINGS_SCHEMA_VERSION, notices };
}
