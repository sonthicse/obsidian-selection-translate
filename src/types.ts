/*
 * Shared data shapes. These are the contract that keeps the layers apart:
 * the UI never learns which provider answered, and no provider ever sees a DOM
 * node. Everything crossing that boundary is a plain object declared here.
 */

/** Languages offered as a translation source. */
export type SourceLangCode = 'auto' | 'en' | 'es' | 'fr' | 'de' | 'ru' | 'vi';

/** Languages offered as a translation target ('auto' makes no sense here). */
export type TargetLangCode = 'vi' | 'en';

export type LangCode = SourceLangCode | TargetLangCode;

/** Which surface the selection came from. Drives both scope settings and the
 *  hotkey guard: 'md-edit' and 'input' are editable, so a bare printable key
 *  would type into the note instead of triggering us. */
export type SelectionContext = 'md-edit' | 'md-read' | 'pdf' | 'input' | 'other';

/**
 * A frozen copy of what the user selected, taken the instant the selection is
 * detected.
 *
 * This is the single most important object in the plugin. Clicking the trigger
 * icon collapses the live selection before the click handler runs, so anything
 * read from `getSelection()` at click time is already gone. Every consumer
 * works from this snapshot instead.
 */
export interface SelectionSnapshot {
	/** Exactly what the user highlighted, verbatim and unprocessed. */
	text: string;
	/** Client rects of the range, empty ones filtered out. */
	rects: DOMRect[];
	/** Union of `rects` — the box the icon is anchored to. */
	bbox: DOMRect;
	/** Last rect, i.e. where the selection ends. Used by end-anchored placements. */
	anchorRect: DOMRect;
	context: SelectionContext;
	/** Owning window. Differs from the main one inside popout windows. */
	win: Window;
	/** Leaf content element, used as the positioning boundary. */
	containerEl: HTMLElement;
	/** Element focused when the selection was taken, so focus can be restored. */
	activeElement: Element | null;
	/** Monotonic id, for correlating a snapshot with the request it triggered. */
	id: number;
}

/** One part-of-speech grouping from a dictionary lookup. */
export interface DictionaryEntry {
	/** Already localised, e.g. "danh từ" or "noun". */
	partOfSpeech: string;
	meanings: string[];
	backTranslations?: string[];
}

export interface Definition {
	partOfSpeech: string;
	text: string;
	example?: string;
}

/** The finished result the popup renders. Provider-agnostic by design. */
export interface TranslationResult {
	translated: string;
	/** BCP-47-ish code the provider reported, or the requested source. */
	detectedSourceLang: string;
	/** IPA or romanisation. Absent for most sentence-level translations. */
	phonetic?: string;
	isSingleWord: boolean;
	entries?: DictionaryEntry[];
	definitions?: Definition[];
	/** Provider id that produced this, shown in the footer badge. */
	provider: string;
	fromCache: boolean;
	/** Wall-clock milliseconds the lookup took. Shown in the footer badge. */
	elapsedMs: number;
	/** Source text after normalisation — what was actually sent upstream. */
	sourceText: string;
}

/** Provider ids. Kept as a union so a typo cannot reach the registry. */
export type ProviderId = 'google-free' | 'google-cloud' | 'deepl';

export type DictionarySourceId = 'auto' | 'gtx' | 'dictionaryapi' | 'off';

export type TtsEngineId = 'webspeech' | 'google';

/** A key combination recorded by the settings tab for the local trigger key. */
export interface HotkeyBinding {
	/** Obsidian's modifier vocabulary; 'Mod' is Ctrl on Windows/Linux, Cmd on macOS. */
	modifiers: Array<'Mod' | 'Ctrl' | 'Alt' | 'Shift' | 'Meta'>;
	/** Single key, uppercased for letters (e.g. 'T', 'Enter'). */
	key: string;
}
