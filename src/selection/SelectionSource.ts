import type { Rect } from '../types';

/**
 * The raw reading of a selection, before scope rules or length limits apply.
 *
 * Three unrelated mechanisms can produce one — a DOM Selection, an `<input>`'s
 * `selectionStart/End`, or PDF.js's highlighted spans — so each is wrapped in a
 * {@link SelectionSource} and they all hand back this same shape.
 */
export interface RawSelection {
	text: string;
	/** Viewport-space rects, already detached from live layout. */
	rects: Rect[];
	/**
	 * A node inside the selection, used to work out which surface it came from.
	 * For `<input>` this is the element itself, which has no child text nodes.
	 */
	referenceNode: Node | null;
	/** Which source produced this, for debug logging. */
	sourceId: SelectionSourceId;
}

export type SelectionSourceId = 'dom' | 'input' | 'pdf-fallback';

/**
 * Reads a selection out of one window.
 *
 * Returning `null` means "not my case, try the next source" rather than "no
 * selection" — the manager distinguishes the two.
 */
export interface SelectionSource {
	readonly id: SelectionSourceId;
	capture(win: Window): RawSelection | null;
}
