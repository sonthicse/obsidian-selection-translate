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
 *  is chrome, not content. */
export const IGNORED_SELECTORS = [
	'.modal',
	'.suggestion-container',
	'.menu',
	'.prompt',
	'.setting-item',
	'.workspace-tab-header',
	'.status-bar',
].join(', ');

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

/** Above this length the gtx endpoint is queried with POST, because the text
 *  rides in the URL otherwise and long URLs get truncated. */
export const GTX_POST_THRESHOLD = 1500;

/** Google's undocumented TTS endpoint rejects longer chunks outright. */
export const TTS_CHUNK_SIZE = 180;

/** A "single word" gets the dictionary treatment; anything longer does not. */
export const SINGLE_WORD_MAX_LENGTH = 40;
