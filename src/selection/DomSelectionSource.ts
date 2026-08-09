import type { RawSelection, SelectionSource } from './SelectionSource';
import { freezeRect } from '../utils/dom';
import type { Rect } from '../types';

/**
 * The ordinary case: a `window.getSelection()` range.
 *
 * Covers reading view, Live Preview, Source mode, callouts, tables, code
 * blocks, property values and the PDF text layer, because all of them render
 * real text nodes into the document. This is why the plugin needs no
 * CodeMirror extension: CM6 puts genuine text in a contenteditable, and a
 * document-level Selection listener sees it exactly like any other markup.
 */
export class DomSelectionSource implements SelectionSource {
	readonly id = 'dom' as const;

	capture(win: Window): RawSelection | null {
		const selection = win.getSelection();
		if (selection == null || selection.rangeCount === 0 || selection.isCollapsed) {
			return null;
		}

		const range = selection.getRangeAt(0);
		const text = readText(selection, range);
		if (text.length === 0) return null;

		/*
		 * A private clone, because the live Range belongs to the Selection and
		 * collapses the moment the user clicks the trigger icon. The clone keeps
		 * pointing at the same nodes for as long as they exist, which is what
		 * lets the icon follow reflow exactly rather than by scroll arithmetic.
		 */
		const tracked = range.cloneRange();

		return {
			text,
			rects: collectRects(range),
			getLiveRects: () => measureAgain(tracked),
			referenceNode: range.commonAncestorContainer,
			sourceId: this.id,
		};
	}
}

/**
 * Re-measures a tracked range, or null once its nodes are gone.
 *
 * CM6 recycles the DOM for lines scrolled out of view, so this stops answering
 * after a screen or two — by design. Null is the signal to fall back to scroll
 * offsets, not an error.
 */
function measureAgain(range: Range): Rect[] | null {
	try {
		if (!range.startContainer.isConnected) return null;

		const rects = collectRects(range);
		return rects.length > 0 ? rects : null;
	} catch {
		return null;
	}
}

/**
 * Pulls text out of a selection, with two fallbacks.
 *
 * `Selection.toString()` normally suffices, but it returns empty for some
 * ranges spanning shadow roots or PDF.js text layers. Asking the Range
 * directly, and then cloning its contents, recovers the text in those cases
 * without reaching for the PDF-specific fallback.
 */
function readText(selection: Selection, range: Range): string {
	const direct = selection.toString();
	if (direct.trim().length > 0) return direct;

	const fromRange = range.toString();
	if (fromRange.trim().length > 0) return fromRange;

	const cloned = range.cloneContents().textContent ?? '';
	return cloned.trim().length > 0 ? cloned : '';
}

/**
 * Viewport rects for the range, one per visual line.
 *
 * Zero-area rects are dropped: ranges routinely report them at line boundaries
 * and for collapsed inline elements, and including them would inflate the union
 * box so the icon floats away from the visible highlight.
 */
function collectRects(range: Range): Rect[] {
	const rects: Rect[] = [];
	const clientRects = range.getClientRects();

	for (let i = 0; i < clientRects.length; i++) {
		const rect = clientRects[i];
		if (rect != null && rect.width > 0 && rect.height > 0) {
			rects.push(freezeRect(rect));
		}
	}

	if (rects.length === 0) {
		// A selection wholly inside one inline element can report no client
		// rects at all; its bounding rect is still meaningful.
		const bounding = range.getBoundingClientRect();
		if (bounding.width > 0 || bounding.height > 0) {
			rects.push(freezeRect(bounding));
		}
	}

	return rects;
}
