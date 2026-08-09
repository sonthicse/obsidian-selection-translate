import type { RawSelection, SelectionSource } from './SelectionSource';
import { isTextEntryElement } from '../core/ContextDetector';
import { makeRect, type Rect } from '../types';

/**
 * Reads a selection out of an `<input>` or `<textarea>`.
 *
 * `window.getSelection()` reports a collapsed selection for these elements: the
 * text lives in an internal shadow tree the Selection API refuses to expose. In
 * Obsidian that means property *names* and every search box would be silently
 * untranslatable. The values come from `selectionStart/selectionEnd` instead,
 * and the geometry from the mirror-div technique below.
 */
export class InputSelectionSource implements SelectionSource {
	readonly id = 'input' as const;

	capture(win: Window): RawSelection | null {
		const active = win.document.activeElement;
		if (!isTextEntryElement(active)) return null;

		const start = active.selectionStart;
		const end = active.selectionEnd;
		if (start == null || end == null || start === end) return null;

		const from = Math.min(start, end);
		const to = Math.max(start, end);

		const text = active.value.slice(from, to);
		if (text.length === 0) return null;

		return {
			text,
			rects: measureInputSelection(active, from, to),
			// The element and the two offsets are all the mirror technique needs,
			// so re-measuring is simply running it again against current layout.
			getLiveRects: () => remeasure(active, from, to),
			referenceNode: active,
			sourceId: this.id,
		};
	}
}

/** Re-runs the mirror measurement, or null once the element has been detached. */
function remeasure(el: HTMLInputElement | HTMLTextAreaElement, start: number, end: number): Rect[] | null {
	try {
		if (!el.isConnected || el.value.length < end) return null;

		const rects = measureInputSelection(el, start, end);
		return rects.length > 0 ? rects : null;
	} catch {
		return null;
	}
}

/**
 * Font and box properties that decide where a character lands.
 *
 * Copied from the real element onto the mirror so the two lay text out
 * identically. Anything not affecting glyph positions is left out.
 */
const MIRRORED_PROPERTIES = [
	'box-sizing',
	'width',
	'border-left-width',
	'border-right-width',
	'border-top-width',
	'border-bottom-width',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'font-family',
	'font-size',
	'font-weight',
	'font-style',
	'font-variant',
	'font-stretch',
	'letter-spacing',
	'word-spacing',
	'line-height',
	'text-indent',
	'text-transform',
	'text-rendering',
	'tab-size',
	'direction',
];

/**
 * Computes viewport rects for a range inside a text-entry element.
 *
 * The trick: build an off-screen `<div>` that lays out the same text with the
 * same metrics, split into before / selected / after, and measure the middle
 * span. Its offset within the mirror equals the selection's offset within the
 * real element, so translating by the two elements' origins (minus the input's
 * own scroll) yields correct viewport coordinates.
 *
 * The mirror's positioning and hiding live in styles.css as `.st-input-mirror`;
 * only the copied metrics — which are dynamic by definition — are set here.
 */
function measureInputSelection(
	el: HTMLInputElement | HTMLTextAreaElement,
	start: number,
	end: number
): Rect[] {
	const doc = el.ownerDocument;
	const win = doc.defaultView;
	if (win == null) return [];

	const computed = win.getComputedStyle(el);
	// Built through Obsidian's helper and attached straight away: the mirror is
	// hidden by `.st-input-mirror`, so being in the document early costs nothing
	// and it has to be there before anything can be measured.
	const mirror = doc.body.createDiv({ cls: 'st-input-mirror' });

	for (const property of MIRRORED_PROPERTIES) {
		mirror.style.setProperty(property, computed.getPropertyValue(property));
	}

	// A single-line input never wraps however long its value is; a textarea
	// wraps exactly like a pre-wrap block.
	const singleLine = el.tagName === 'INPUT';
	mirror.style.setProperty('white-space', singleLine ? 'pre' : 'pre-wrap');
	mirror.style.setProperty('overflow-wrap', singleLine ? 'normal' : 'break-word');
	if (!singleLine) {
		mirror.style.setProperty('height', computed.getPropertyValue('height'));
	}

	// Appended in reading order, because each helper adds to the end: the text
	// before the selection, the measurable span, then the text after. The
	// trailing text matters — without it the last line's box collapses and a
	// selection ending at the value's end measures short.
	const value = el.value;
	mirror.appendChild(doc.createTextNode(value.slice(0, start)));
	const marker = mirror.createSpan({ text: value.slice(start, end) });
	mirror.appendChild(doc.createTextNode(value.slice(end)));

	let rects: Rect[] = [];
	try {
		const mirrorRect = mirror.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const offsetX = elRect.left - mirrorRect.left - el.scrollLeft;
		const offsetY = elRect.top - mirrorRect.top - el.scrollTop;

		const markerRects = marker.getClientRects();
		for (let i = 0; i < markerRects.length; i++) {
			const rect = markerRects[i];
			if (rect == null || rect.width <= 0 || rect.height <= 0) continue;

			const translated = makeRect(rect.left + offsetX, rect.top + offsetY, rect.width, rect.height);
			// Clip to the visible part of the element: text scrolled out of a
			// narrow input would otherwise anchor the icon off in space.
			const clipped = intersect(translated, elRect);
			if (clipped != null) rects.push(clipped);
		}

		if (rects.length === 0) {
			// Fully scrolled out of view — fall back to the element itself so the
			// icon still appears somewhere sensible.
			rects = [makeRect(elRect.left, elRect.top, elRect.width, elRect.height)];
		}
	} finally {
		mirror.remove();
	}

	return rects;
}

/** Overlap of two rects, or null when they do not touch. */
function intersect(a: Rect, b: DOMRect): Rect | null {
	const left = Math.max(a.left, b.left);
	const top = Math.max(a.top, b.top);
	const right = Math.min(a.right, b.right);
	const bottom = Math.min(a.bottom, b.bottom);

	if (right <= left || bottom <= top) return null;
	return makeRect(left, top, right - left, bottom - top);
}
