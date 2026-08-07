import { OWN_UI_SELECTOR } from '../constants';
import { makeRect, type Rect } from '../types';
import type { SelectionTranslateSettings } from '../settings/settings';

/**
 * Pushes user-configurable typography into CSS custom properties.
 *
 * Obsidian's guidelines forbid hardcoding style in TypeScript, but font size
 * and family are user settings that cannot live in a static stylesheet. Writing
 * them as custom properties on `<body>` keeps every actual style declaration in
 * styles.css, which reads them via `var(--st-font-size, 14px)`.
 *
 * Takes a Document rather than reading a global one: popout windows each have
 * their own, and a popup opened there would otherwise fall back to defaults.
 */
export function applyCssVariables(doc: Document, settings: SelectionTranslateSettings): void {
	const style = doc.body.style;
	style.setProperty('--st-font-size', `${settings.fontSize}px`);
	if (settings.fontFamily.trim().length > 0) {
		style.setProperty('--st-font-family', settings.fontFamily.trim());
	} else {
		style.removeProperty('--st-font-family');
	}
}

/** Undoes {@link applyCssVariables}, so unloading the plugin leaves no trace. */
export function clearCssVariables(doc: Document): void {
	doc.body.style.removeProperty('--st-font-size');
	doc.body.style.removeProperty('--st-font-family');
}

/**
 * True when the node lives inside the plugin's own floating UI.
 *
 * Without this guard, selecting text inside the result popup would be detected
 * as a new selection, which shows an icon over the popup, which on click
 * translates the translation — an easy infinite loop to fall into.
 */
export function isInsideOwnUi(node: Node | null): boolean {
	const el = toElement(node);
	return el?.closest(OWN_UI_SELECTOR) != null;
}

/** `Node.ELEMENT_NODE`, spelled out.
 *
 *  Referencing the global `Node` would tie this to one window's class objects
 *  and would break under the plain-Node test runner; the numeric value is fixed
 *  by the DOM specification. */
const ELEMENT_NODE = 1;

/** Nearest Element for any node, since text nodes have no `closest()`. */
export function toElement(node: Node | null): Element | null {
	if (node == null) return null;
	if (node.nodeType === ELEMENT_NODE) return node as Element;
	return node.parentElement;
}

/**
 * Smallest rect containing all of `rects`.
 *
 * A multi-line selection reports one rect per line; the icon anchors to their
 * union rather than to any single line.
 */
export function unionRects(rects: Rect[]): Rect {
	if (rects.length === 0) return makeRect(0, 0, 0, 0);

	let left = Number.POSITIVE_INFINITY;
	let top = Number.POSITIVE_INFINITY;
	let right = Number.NEGATIVE_INFINITY;
	let bottom = Number.NEGATIVE_INFINITY;

	for (const rect of rects) {
		left = Math.min(left, rect.left);
		top = Math.min(top, rect.top);
		right = Math.max(right, rect.right);
		bottom = Math.max(bottom, rect.bottom);
	}

	return makeRect(left, top, right - left, bottom - top);
}

/** Copies a live DOMRect into a detached plain {@link Rect}.
 *
 *  Necessary because a DOMRectReadOnly from `getClientRects()` reflects live
 *  layout: keeping the original in a snapshot means the geometry silently
 *  changes when the user scrolls. */
export function freezeRect(rect: DOMRectReadOnly): Rect {
	return makeRect(rect.left, rect.top, rect.width, rect.height);
}

/**
 * Last element of an array, typed as possibly absent.
 *
 * Stands in for `Array.prototype.at(-1)`, which is ES2022: esbuild downlevels
 * syntax but never polyfills runtime methods, so `.at()` would compile cleanly
 * and then throw on older runtimes. tsconfig caps `lib` at ES2020 to make that
 * mistake a compile error rather than a field report.
 */
export function last<T>(items: readonly T[]): T | undefined {
	return items.length > 0 ? items[items.length - 1] : undefined;
}
