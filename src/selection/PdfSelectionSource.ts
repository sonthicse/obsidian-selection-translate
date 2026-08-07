import type { RawSelection, SelectionSource } from './SelectionSource';
import { SURFACE_SELECTORS } from '../constants';
import { freezeRect } from '../utils/dom';
import type { Rect } from '../types';

/**
 * Last-resort reader for PDF pages.
 *
 * Obsidian 1.9 ships a PDF.js build where a selection across the text layer can
 * leave `Selection.toString()` empty while the spans are visibly highlighted —
 * the same defect PDF++ works around. When that happens the highlighted spans
 * are still marked in the DOM, so their text and geometry can be read directly.
 *
 * Only consulted after {@link DomSelectionSource} comes back empty, and only
 * when the user leaves the `pdfSelectionFallback` setting on, because reading
 * the text layer is inherently tied to PDF.js internals that may change.
 */
export class PdfSelectionSource implements SelectionSource {
	readonly id = 'pdf-fallback' as const;

	capture(win: Window): RawSelection | null {
		const doc = win.document;
		const spans = doc.querySelectorAll<HTMLElement>(
			`${SURFACE_SELECTORS.pdfTextLayer} .selected, ${SURFACE_SELECTORS.pdfTextLayer} .highlight.selected`
		);
		if (spans.length === 0) return null;

		const pieces: string[] = [];
		const rects: Rect[] = [];
		let referenceNode: Node | null = null;

		spans.forEach((span) => {
			const text = span.textContent ?? '';
			if (text.length === 0) return;

			pieces.push(text);
			referenceNode ??= span;

			const rect = span.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) rects.push(freezeRect(rect));
		});

		// PDF.js emits one span per text run, and runs inside a line carry no
		// separator of their own. Joining on a space keeps words apart; the
		// normalizer collapses any run of whitespace this introduces.
		const text = pieces.join(' ').replace(/\s+/g, ' ').trim();
		if (text.length === 0 || rects.length === 0) return null;

		return { text, rects, referenceNode, sourceId: this.id };
	}
}
