/*
 * Every magic number and selector the plugin depends on, in one file.
 *
 * Two groups deserve attention when something breaks after an Obsidian update:
 * SURFACE_SELECTORS (how we recognise each editing surface) and
 * OCCLUSION_SELECTORS (what the trigger icon must not cover). Both are DOM
 * contracts Obsidian does not formally guarantee.
 */

export const PLUGIN_ID = 'selection-translate';

/* ── CSS class names. Prefixed `st-` so nothing collides with Obsidian or
 * another plugin, and so selection detection can cheaply recognise its own DOM. */
export const CLS = {
	icon: 'st-icon',
	popup: 'st-popup',
	measure: 'st-measure',
} as const;

/** Anything inside our own UI must never itself start a translation, or the
 *  plugin retriggers on the text it just rendered. */
export const OWN_UI_SELECTOR = `.${CLS.icon}, .${CLS.popup}, .${CLS.measure}`;

/* ── Surface detection ────────────────────────────────────────────────────── */

export const SURFACE_SELECTORS = {
	/** CodeMirror 6 content area — covers both Live Preview and Source mode. */
	editor: '.cm-editor .cm-content, .cm-content',
	reading: '.markdown-reading-view, .markdown-preview-view',
	pdf: '.pdf-viewer, .pdf-container, .pdf-toolbar',
	pdfTextLayer: '.textLayer',
	propertyValue: '.metadata-property-value',
	propertyKey: '.metadata-property-key-input',
} as const;

/** Surfaces where a selection must be ignored outright: transient UI whose text
 *  is chrome, not content.
 *
 *  The file-explorer entries are here because renaming turns a tree item into a
 *  contenteditable and highlights the whole name for you. That reads as a
 *  perfectly ordinary selection, so without these the trigger icon pops up over
 *  a rename box every single time. */
export const IGNORED_SELECTORS = [
	'.modal',
	'.suggestion-container',
	'.menu',
	'.prompt',
	'.setting-item',
	'.workspace-tab-header',
	'.status-bar',
	'.nav-files-container',
	'.nav-file-title',
	'.nav-folder-title',
	'.tree-item-inner',
	'.is-being-renamed',
	'.workspace-drawer',
	'.workspace-tab-header-inner-title',
	'.view-header-title',
	'.canvas-node-label',
	'.titlebar',
	'.vertical-tab-nav-item',
].join(', ');

/**
 * The two side panels, matched structurally rather than by what they contain.
 *
 * Every class name above is a DOM contract Obsidian never promised to keep, and
 * the rename box is exactly the kind of thing that gets restyled between
 * releases. The split containers are far more stable, and nothing a user means
 * to translate lives in a sidebar — so treating the whole region as chrome
 * survives the next time the nav tree is rewritten.
 */
export const SIDEBAR_SELECTORS = '.workspace-split.mod-left-split, .workspace-split.mod-right-split';

/* ── Positioning ──────────────────────────────────────────────────────────── */

/**
 * Elements the trigger icon must not be placed on top of. The positioner
 * hit-tests each candidate spot against this list and moves on when it hits.
 *
 * Deliberately broad and extensible: third-party plugins (PDF++, Hover Editor)
 * add their own floating menus, and covering one makes the plugin feel broken.
 */
export const OCCLUSION_SELECTORS = [
	'.menu',
	'.popover',
	'.hover-popover',
	'.suggestion-container',
	'.cm-tooltip',
	'.pdf-toolbar',
	'.pdf-findbar',
	'.workspace-tab-header-container',
	'.view-header',
	'.status-bar',
	'.modal',
	'.modal-bg',
	'.clickable-icon',
	'.workspace-ribbon',
	`.${CLS.popup}`,
];

/**
 * The scrollers a leaf is known to hold, innermost first.
 *
 * Consulted when a wheel gesture over the floating UI has to be handed to the
 * surface behind it and the snapshot's own scroll anchors cannot take it — a
 * selection made in a leaf that was not scrollable at the time, for instance.
 * Like SURFACE_SELECTORS, these are DOM contracts Obsidian does not guarantee.
 */
export const SCROLLER_SELECTORS = '.cm-scroller, .markdown-preview-view, .pdf-viewer-container';

/**
 * Pixels per line when a wheel reports its delta in lines and the document
 * refuses to say how tall a line is.
 *
 * Chromium always reports pixels, so this is only reached on the Linux and
 * driver combinations that still emit line deltas; being slightly out is far
 * better than treating "3 lines" as three pixels.
 */
export const WHEEL_LINE_HEIGHT_FALLBACK = 16;

export const ICON_SIZE = 24;
export const POPUP_MIN_WIDTH = 180;
export const POPUP_LOADING_HEIGHT = 64;
/** Gap kept between a floating element and the viewport/container edge. */
export const VIEWPORT_MARGIN = 8;

/* ── Timing ───────────────────────────────────────────────────────────────── */

/** `selectionchange` fires per character while dragging; this is the settle time. */
export const SELECTION_CHANGE_DEBOUNCE_MS = 200;
/** How long a `dblclick` suppresses the `mouseup` that follows it. */
export const DOUBLE_CLICK_GUARD_MS = 300;
export const RESIZE_DEBOUNCE_MS = 120;
/** Matches the width/height transition in styles.css; keep the two in step. */
export const POPUP_RESIZE_MS = 180;

/* ── Network ──────────────────────────────────────────────────────────────── */

export const ENDPOINTS = {
	deeplFree: 'https://api-free.deepl.com/v2',
	deeplPro: 'https://api.deepl.com/v2',
	googleCloud: 'https://translation.googleapis.com/language/translate/v2',
	googleFree: 'https://translate.googleapis.com/translate_a/single',
	dictionaryApi: 'https://api.dictionaryapi.dev/api/v2/entries/en',
	googleTts: 'https://translate.google.com/translate_tts',
} as const;

/** Retry delays in milliseconds. Only for 429/503/529 — a 403 will never
 *  succeed on retry and retrying it just burns the user's quota. */
export const RETRY_DELAYS_MS = [400, 900, 2000];

export const RETRYABLE_STATUSES = new Set([429, 503, 529]);

/**
 * How long to wait for one attempt before giving up on it.
 *
 * `requestUrl` accepts no timeout and cannot be aborted, so without this a
 * request that never completes leaves the popup spinning forever with nothing
 * the user can do but press Escape. Observed round trips to the free endpoint
 * reached 27 seconds under load, so the ceiling is set well above normal but
 * low enough that a hung request becomes a retryable error rather than a hang.
 *
 * Timing out only stops us waiting; the underlying request runs to completion
 * somewhere below and its answer is discarded.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Above this length the gtx endpoint is queried with POST, because the text
 *  rides in the URL otherwise and long URLs get truncated. */
export const GTX_POST_THRESHOLD = 1500;

/** Google's undocumented TTS endpoint rejects longer chunks outright. */
export const TTS_CHUNK_SIZE = 180;

/** A "single word" gets the dictionary treatment; anything longer does not. */
export const SINGLE_WORD_MAX_LENGTH = 40;

/**
 * Absolute ceiling on a selection, independent of the user's own limit.
 *
 * Exists only to stop Ctrl+A on a book-length note from being snapshotted and
 * normalised for no reason. The user-facing `maxSelectionLength` is enforced
 * later, by the orchestrator, so that exceeding it produces the explanation the
 * design doc promises rather than nothing at all: a selection that silently
 * does nothing is indistinguishable from a broken plugin.
 */
export const HARD_SELECTION_CAP = 100_000;
