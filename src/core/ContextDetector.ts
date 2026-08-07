import { SURFACE_SELECTORS } from '../constants';
import type { SelectionContext } from '../types';
import type { SelectionTranslateSettings } from '../settings/settings';
import { toElement } from '../utils/dom';

/** What the detector works out about where a selection lives. */
export interface ContextInfo {
	context: SelectionContext;
	/** Selection is in the properties / frontmatter editor. */
	inProperties: boolean;
	/** Leaf content element, used as the positioning boundary. */
	containerEl: HTMLElement;
}

/** Selectors that identify the leaf a surface belongs to, most specific first. */
const CONTAINER_SELECTORS = '.workspace-leaf-content, .workspace-leaf, .markdown-embed, .popover';

/** Everything that makes up the properties editor, key inputs included. */
const PROPERTIES_SELECTOR = '.metadata-container, .metadata-property, .metadata-properties';

/**
 * Tag-name test, deliberately not `instanceof`.
 *
 * Each browser window owns its own set of DOM classes, so an `<input>` living
 * in an Obsidian popout window is NOT an `instanceof` the main window's
 * `HTMLInputElement`. Comparing `tagName` is the only check that holds across
 * windows, and popout support is a requirement here.
 */
export function hasTagName(el: Element | null, ...names: string[]): boolean {
	if (el == null) return false;
	const tag = el.tagName;
	return names.some((name) => name === tag);
}

/** True for `<input>` and `<textarea>`, whose selection `getSelection()` cannot read. */
export function isTextEntryElement(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
	return hasTagName(el, 'INPUT', 'TEXTAREA');
}

/**
 * Works out which Obsidian surface a node belongs to.
 *
 * Order matters and is not arbitrary. `<input>` is checked first because a
 * property-key input sits inside the same containers as everything else but
 * needs a completely different selection reader. PDF comes next because a PDF
 * view can be embedded in a note, and the innermost surface wins. The editor
 * check precedes reading view because Live Preview nests a `.cm-content`
 * inside a markdown view.
 */
export function detectContext(node: Node | null, fallbackContainer: HTMLElement): ContextInfo | null {
	const el = toElement(node);
	if (el == null) return null;

	const containerEl = (el.closest(CONTAINER_SELECTORS) as HTMLElement | null) ?? fallbackContainer;
	const inProperties = el.closest(PROPERTIES_SELECTOR) != null;

	const context = detectSurface(el);
	return { context, inProperties, containerEl };
}

function detectSurface(el: Element): SelectionContext {
	if (isTextEntryElement(el) || el.closest(SURFACE_SELECTORS.propertyKey) != null) {
		return 'input';
	}
	if (el.closest(SURFACE_SELECTORS.pdf) != null) {
		return 'pdf';
	}
	// A property value is a contenteditable, so it behaves like the editor for
	// every purpose the context union describes: typing into it inserts text.
	if (el.closest(SURFACE_SELECTORS.propertyValue) != null) {
		return 'md-edit';
	}
	if (el.closest(SURFACE_SELECTORS.editor) != null) {
		return 'md-edit';
	}
	if (el.closest(SURFACE_SELECTORS.reading) != null) {
		return 'md-read';
	}
	return 'other';
}

/**
 * True where a bare printable keystroke would insert a character.
 *
 * Gates the local trigger key: binding an unmodified letter here would type
 * that letter into the user's note instead of translating, which is the kind of
 * data-loss bug people never forgive.
 */
export function isEditableContext(context: SelectionContext): boolean {
	return context === 'md-edit' || context === 'input';
}

/**
 * Applies the per-surface scope toggles.
 *
 * `other` (canvas text, hover editors, the outline pane) has no toggle of its
 * own and stays enabled: it is the catch-all, and users who disable a surface
 * disable a surface they can name.
 */
export function isContextEnabled(info: ContextInfo, settings: SelectionTranslateSettings): boolean {
	if (info.inProperties) return settings.enableInProperties;

	switch (info.context) {
		case 'pdf':
			return settings.enableInPdf;
		case 'md-edit':
		case 'input':
			return settings.enableInEditing;
		case 'md-read':
			return settings.enableInReading;
		case 'other':
			return true;
		default:
			return true;
	}
}
