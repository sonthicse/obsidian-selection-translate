import { describe, expect, it, vi } from 'vitest';
import { makeRect, type Rect } from '../src/types';
import {
	DEFAULT_PLACEMENT_ORDER,
	clampToBoundary,
	fitsInside,
	insetRect,
	intersectRects,
	place,
	type PlacementRequest,
} from '../src/ui/Positioner';

/** A 1000x800 viewport with a selection sitting comfortably in the middle. */
function request(overrides: Partial<PlacementRequest> = {}): PlacementRequest {
	const bbox = makeRect(400, 300, 200, 20);
	return {
		bbox,
		anchorRect: bbox,
		size: { width: 24, height: 24 },
		boundary: makeRect(0, 0, 1000, 800),
		offset: 8,
		order: DEFAULT_PLACEMENT_ORDER,
		cursor: null,
		...overrides,
	};
}

describe('place', () => {
	it('puts the icon below and centred by default', () => {
		const result = place(request());

		expect(result.placement).toBe('below-center');
		expect(result.clamped).toBe(false);
		// Centred on the selection: 400 + 200/2 - 24/2 = 488.
		expect(result.rect.left).toBe(488);
		// One offset below the selection's bottom edge: 320 + 8.
		expect(result.rect.top).toBe(328);
	});

	it('flips above when the selection sits at the bottom edge', () => {
		// Selection bottom is 795; below-centre would end at 827, past the
		// boundary, so the search moves on.
		const result = place(
			request({ bbox: makeRect(400, 775, 200, 20), anchorRect: makeRect(400, 775, 200, 20) })
		);

		expect(result.placement).toBe('above-center');
		expect(result.clamped).toBe(false);
		// 775 - 8 - 24.
		expect(result.rect.top).toBe(743);
	});

	it('keeps the icon inside the boundary at the right edge', () => {
		const result = place(
			request({ bbox: makeRect(900, 300, 100, 20), anchorRect: makeRect(900, 300, 100, 20) })
		);

		expect(fitsInside(result.rect, request().boundary)).toBe(true);
		expect(result.rect.right).toBeLessThanOrEqual(1000);
	});

	it('skips a placement that something is sitting on top of', () => {
		// Stands in for a PDF toolbar occupying the strip below the selection.
		const isOccluded = (rect: Rect): boolean => rect.top > 320 && rect.top < 400;
		const result = place(request(), isOccluded);

		expect(result.placement).toBe('above-center');
		expect(result.clamped).toBe(false);
	});

	it('walks the whole candidate list before giving up', () => {
		const seen: number[] = [];
		const isOccluded = (rect: Rect): boolean => {
			seen.push(rect.top);
			return true; // everything is blocked
		};

		const result = place(request(), isOccluded);

		// One probe per candidate, none of which was usable.
		expect(seen).toHaveLength(DEFAULT_PLACEMENT_ORDER.length);
		expect(result.clamped).toBe(true);
		expect(result.placement).toBe('below-center');
	});

	it('clamps into the boundary when no candidate fits at all', () => {
		// A boundary barely larger than the icon leaves nowhere to place it
		// cleanly, but an icon squeezed against an edge still beats no icon.
		const boundary = makeRect(0, 0, 40, 40);
		const result = place(request({ boundary }));

		expect(result.clamped).toBe(true);
		expect(fitsInside(result.rect, boundary)).toBe(true);
	});

	it('honours a caller-supplied preference order', () => {
		const result = place(request({ order: ['above-center', 'below-center'] }));
		expect(result.placement).toBe('above-center');
	});

	it('anchors to the end of a multi-line selection for end placements', () => {
		// bbox spans three wrapped lines; anchorRect is the last one.
		const bbox = makeRect(40, 300, 500, 60);
		const anchorRect = makeRect(40, 340, 120, 20);
		const result = place(request({ bbox, anchorRect, order: ['below-end'] }));

		// Centred on the end of the last line: 160 - 12.
		expect(result.rect.left).toBe(148);
		expect(result.rect.top).toBe(368);
	});

	it('follows the pointer when asked, and falls through when there is none', () => {
		const withCursor = place(request({ order: ['cursor'], cursor: { x: 100, y: 200 } }));
		expect(withCursor.placement).toBe('cursor');
		expect(withCursor.rect.left).toBe(108);
		expect(withCursor.rect.top).toBe(208);

		// A keyboard-made selection has no pointer position; the placement must
		// be skipped rather than producing coordinates at the origin.
		const keyboardMade = place(request({ order: ['cursor', 'below-center'], cursor: null }));
		expect(keyboardMade.placement).toBe('below-center');
	});

	it('never consults the hit test for a candidate that does not fit', () => {
		// elementsFromPoint is comparatively expensive and meaningless outside
		// the viewport, so geometry is checked first.
		const boundary = makeRect(0, 0, 1000, 330);
		const isOccluded = vi.fn((_rect: Rect) => false);
		place(request({ boundary }), isOccluded);

		for (const [probed] of isOccluded.mock.calls) {
			expect(fitsInside(probed, boundary)).toBe(true);
		}
	});
});

describe('fitsInside', () => {
	const boundary = makeRect(0, 0, 100, 100);

	it('accepts a rect wholly within the boundary', () => {
		expect(fitsInside(makeRect(10, 10, 20, 20), boundary)).toBe(true);
	});

	it('accepts a rect flush against the edges', () => {
		expect(fitsInside(makeRect(0, 0, 100, 100), boundary)).toBe(true);
	});

	it('rejects a rect crossing any edge', () => {
		expect(fitsInside(makeRect(-1, 10, 20, 20), boundary)).toBe(false);
		expect(fitsInside(makeRect(90, 10, 20, 20), boundary)).toBe(false);
		expect(fitsInside(makeRect(10, -1, 20, 20), boundary)).toBe(false);
		expect(fitsInside(makeRect(10, 90, 20, 20), boundary)).toBe(false);
	});
});

describe('clampToBoundary', () => {
	const boundary = makeRect(0, 0, 100, 100);

	it('leaves a rect that already fits alone', () => {
		const rect = makeRect(10, 10, 20, 20);
		expect(clampToBoundary(rect, boundary)).toEqual(rect);
	});

	it('pushes an overflowing rect back inside without resizing it', () => {
		const clamped = clampToBoundary(makeRect(95, 95, 20, 20), boundary);
		expect(clamped).toEqual(makeRect(80, 80, 20, 20));
	});

	it('prefers the top-left edge when the rect is larger than the boundary', () => {
		const clamped = clampToBoundary(makeRect(50, 50, 200, 200), makeRect(0, 0, 100, 100));
		expect(clamped.left).toBe(0);
		expect(clamped.top).toBe(0);
	});
});

describe('intersectRects', () => {
	it('returns the overlapping region', () => {
		const overlap = intersectRects(makeRect(0, 0, 100, 100), makeRect(50, 50, 100, 100));
		expect(overlap).toEqual(makeRect(50, 50, 50, 50));
	});

	it('returns null for rects that do not overlap', () => {
		expect(intersectRects(makeRect(0, 0, 10, 10), makeRect(50, 50, 10, 10))).toBeNull();
	});

	it('returns null for rects that merely touch', () => {
		expect(intersectRects(makeRect(0, 0, 10, 10), makeRect(10, 0, 10, 10))).toBeNull();
	});
});

describe('insetRect', () => {
	it('shrinks by the margin on every side', () => {
		expect(insetRect(makeRect(0, 0, 100, 100), 8)).toEqual(makeRect(8, 8, 84, 84));
	});

	it('never produces a negative size', () => {
		const tiny = insetRect(makeRect(0, 0, 10, 10), 20);
		expect(tiny.width).toBe(0);
		expect(tiny.height).toBe(0);
	});
});
