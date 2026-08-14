import type { LanguageDir } from '../languages';
import { makeRect, type Rect } from '../types';

export type Placement =
	| 'below-center'
	| 'above-center'
	| 'below-end'
	| 'above-end'
	| 'right-of-end'
	| 'left-of-start'
	| 'cursor';

/**
 * Candidate order from the design doc, most preferred first.
 *
 * Below-centre reads as "attached to what I just selected" and is what users
 * expect; the rest are escapes for when it does not fit or something is in the
 * way. `cursor` is never in the default order — it only appears when the user
 * explicitly asks for pointer-following placement.
 */
export const DEFAULT_PLACEMENT_ORDER: readonly Placement[] = [
	'below-center',
	'above-center',
	'below-end',
	'above-end',
	'right-of-end',
	'left-of-start',
];

export interface Size {
	width: number;
	height: number;
}

export interface PlacementRequest {
	/** Union box of the selection. */
	bbox: Rect;
	/** Rect of the selection's last line, for end-anchored placements. */
	anchorRect: Rect;
	size: Size;
	/** Region the element must stay inside: leaf content clipped to the viewport. */
	boundary: Rect;
	/** Gap between the selection and the element. */
	offset: number;
	order: readonly Placement[];
	/** Pointer position, required only by the `cursor` placement. */
	cursor?: { x: number; y: number } | null;
	/**
	 * Reading direction of the interface, which decides where "end" is.
	 *
	 * Required rather than defaulted, so the one place that builds a request has
	 * to state it. A silent `ltr` default would be right for seven locales out of
	 * eight and wrong in the only case this field exists for.
	 */
	dir: LanguageDir;
}

export interface PlacementResult {
	rect: Rect;
	placement: Placement;
	/** True when nothing fit and the result was forced inside the boundary. */
	clamped: boolean;
}

/** Returns true when something the user needs is already at that rect. */
export type HitTest = (rect: Rect) => boolean;

/**
 * Chooses where a floating element goes.
 *
 * Deliberately pure: it takes geometry and a hit-test callback and returns
 * geometry. All DOM contact — measuring the boundary, probing what is under a
 * point — happens in the caller, which is what makes every placement rule here
 * testable without a browser.
 *
 * Falling back to a clamped first candidate rather than giving up matters: an
 * icon squeezed against the viewport edge is still usable, while no icon at all
 * looks like the plugin is broken.
 */
export function place(request: PlacementRequest, isOccluded: HitTest = () => false): PlacementResult {
	for (const placement of request.order) {
		const rect = computeCandidate(placement, request);
		if (rect == null) continue;
		if (!fitsInside(rect, request.boundary)) continue;
		if (isOccluded(rect)) continue;

		return { rect, placement, clamped: false };
	}

	const preferred = request.order[0] ?? 'below-center';
	const fallback =
		computeCandidate(preferred, request) ?? computeCandidate('below-center', request) ?? request.bbox;

	return {
		rect: clampToBoundary(fallback, request.boundary),
		placement: preferred,
		clamped: true,
	};
}

/**
 * Geometry for one placement, or null when its inputs are unavailable.
 *
 * Exported for the scroll path, which re-runs a single already-chosen candidate
 * rather than the whole search. Deliberately without clamping or the occlusion
 * probe: clamping is what would pin the icon to the screen edge instead of
 * letting it drift off with the text it belongs to, and `elementsFromPoint` on
 * every animation frame is not something to pay for sixty times a second.
 *
 * Four of the seven candidates are named after a *physical* side and mean a
 * *logical* one. "End of the selection" is where reading stops, which is the
 * right edge in English and the left edge in Arabic; an icon pinned to the
 * right edge of Arabic text sits at the beginning of the passage, where the
 * reader is not looking. So every horizontal term below is mirrored for an
 * RTL interface, and the names are left alone — renaming them to
 * `after-end`/`before-start` would make the stylesheet, the settings dropdown
 * and the stored `iconPlacement` value all disagree with the code for no gain.
 */
export function computeCandidate(placement: Placement, request: PlacementRequest): Rect | null {
	const { bbox, anchorRect, size, offset, dir } = request;
	const rtl = dir === 'rtl';

	const centerX = bbox.left + bbox.width / 2 - size.width / 2;
	// Where the text ends, and where a box hung past that end begins.
	const endEdge = rtl ? anchorRect.left : anchorRect.right;
	const startEdge = rtl ? bbox.right : bbox.left;
	const endX = endEdge - size.width / 2;
	const beyondEnd = rtl ? endEdge - offset - size.width : endEdge + offset;
	const beforeStart = rtl ? startEdge + offset : startEdge - offset - size.width;
	const middleY = anchorRect.top + anchorRect.height / 2 - size.height / 2;

	switch (placement) {
		case 'below-center':
			return makeRect(centerX, bbox.bottom + offset, size.width, size.height);
		case 'above-center':
			return makeRect(centerX, bbox.top - offset - size.height, size.width, size.height);
		case 'below-end':
			return makeRect(endX, anchorRect.bottom + offset, size.width, size.height);
		case 'above-end':
			return makeRect(endX, anchorRect.top - offset - size.height, size.width, size.height);
		case 'right-of-end':
			return makeRect(beyondEnd, middleY, size.width, size.height);
		case 'left-of-start':
			return makeRect(beforeStart, bbox.top + anchorRect.height / 2 - size.height / 2, size.width, size.height);
		case 'cursor': {
			const cursor = request.cursor;
			if (cursor == null) return null;
			// The popup grows away from the pointer along the reading direction,
			// so it never covers the text the pointer is about to reach.
			const x = rtl ? cursor.x - offset - size.width : cursor.x + offset;
			return makeRect(x, cursor.y + offset, size.width, size.height);
		}
	}
}

/** Whether a rect lies wholly within the boundary. */
export function fitsInside(rect: Rect, boundary: Rect): boolean {
	return (
		rect.left >= boundary.left &&
		rect.right <= boundary.right &&
		rect.top >= boundary.top &&
		rect.bottom <= boundary.bottom
	);
}

/**
 * Pushes a rect inside the boundary, preserving its size.
 *
 * When the boundary is smaller than the rect the top-left edges win, because a
 * partly visible element anchored to a readable corner beats one centred on
 * nothing.
 */
export function clampToBoundary(rect: Rect, boundary: Rect): Rect {
	const x = Math.max(boundary.left, Math.min(rect.left, boundary.right - rect.width));
	const y = Math.max(boundary.top, Math.min(rect.top, boundary.bottom - rect.height));
	return makeRect(x, y, rect.width, rect.height);
}

/** Overlap of two rects, or null when they do not overlap. */
export function intersectRects(a: Rect, b: Rect): Rect | null {
	const left = Math.max(a.left, b.left);
	const top = Math.max(a.top, b.top);
	const right = Math.min(a.right, b.right);
	const bottom = Math.min(a.bottom, b.bottom);

	if (right <= left || bottom <= top) return null;
	return makeRect(left, top, right - left, bottom - top);
}

/**
 * Pushes a rect's top edge down to `top`, never past its own bottom.
 *
 * For chrome that lives inside the content box instead of beside it — the PDF
 * toolbar being the one case. Shrinking rather than translating is the point:
 * the region loses the strip the toolbar covers and keeps the rest.
 */
export function trimTop(rect: Rect, top: number): Rect {
	if (top <= rect.top) return rect;

	const height = Math.max(0, rect.bottom - top);
	return makeRect(rect.left, Math.min(top, rect.bottom), rect.width, height);
}

/** Translates a rect, preserving its size. */
export function offsetRect(rect: Rect, dx: number, dy: number): Rect {
	return makeRect(rect.left + dx, rect.top + dy, rect.width, rect.height);
}

/**
 * Whether two rects touch at all, edge contact included.
 *
 * Distinct from {@link intersectRects}, which needs a region with area to
 * return and so calls a rect resting exactly on a boundary "outside". That is
 * the right answer when the question is how much overlap there is, and the
 * wrong one when the question is whether to draw something: at one-pixel scroll
 * steps the element would blink off for the single frame its edge lands on the
 * boundary.
 */
export function overlaps(a: Rect, b: Rect): boolean {
	return a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom;
}

/**
 * Whether a floating element should be drawn at all.
 *
 * The rect is the element's own, not its selection's. Measuring the selection
 * instead is what made the popup vanish mid-screen: the default placement puts
 * it a whole popup-height below the text, so scrolling down took the selection
 * past the top of the leaf while the popup was still fully visible — and the
 * asymmetry reversed under `above-center`, which is the tell that the wrong
 * rectangle was being measured rather than the top edge being special.
 *
 * So the element stays on screen as long as any part of *it* still reaches into
 * the visible part of the leaf, and leaves the top edge exactly the way it
 * leaves the bottom one. Hiding is purely a display decision: the state machine
 * stays in `icon` or `result` throughout, so scrolling back reveals the same UI
 * rather than a new one.
 */
export function isRectVisible(rect: Rect, visibleBounds: Rect | null): boolean {
	return visibleBounds != null && overlaps(rect, visibleBounds);
}

/** How much of a rect hangs off each edge of the visible region. */
export interface ClipInsets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/**
 * The part of a floating element that should not be painted.
 *
 * An element half out of its leaf now stays on screen — {@link isRectVisible} —
 * which without this would draw it over the tab header or the PDF toolbar, the
 * very chrome the placement search works to avoid. Clipping the overhang makes
 * it slide under the header instead.
 *
 * All four edges, not just the horizontal pair. Something does sit beside a
 * leaf: the other half of a vertical split, whose text a popup would otherwise
 * cover as its own leaf narrows. The same two insets are what a right-to-left
 * interface needs, where the side an element overflows is the mirror of this
 * one.
 *
 * Returned as plain numbers so the caller can hand them to CSS; deciding how
 * much to hide is geometry, and drawing is the stylesheet's business.
 */
export function clipInsets(rect: Rect, visibleBounds: Rect | null): ClipInsets {
	// A leaf that has left the screen entirely leaves nothing of the element
	// visible. Returning zero insets here — "clip nothing" — was safe only
	// because {@link isRectVisible} happens to hide the element in the same
	// case, which is precisely the pairing a future caller would separate.
	// One full-height inset empties the box on its own; insets that overlap each
	// other are a shape browsers are not required to agree about.
	if (visibleBounds == null) return { top: rect.height, right: 0, bottom: 0, left: 0 };

	return {
		top: clampInset(visibleBounds.top - rect.top, rect.height),
		right: clampInset(rect.right - visibleBounds.right, rect.width),
		bottom: clampInset(rect.bottom - visibleBounds.bottom, rect.height),
		left: clampInset(visibleBounds.left - rect.left, rect.width),
	};
}

/** An inset is never negative, and never eats more than the element it clips. */
function clampInset(overhang: number, extent: number): number {
	return Math.min(Math.max(overhang, 0), Math.max(extent, 0));
}

/** Shrinks a rect by a uniform margin, never past zero size. */
export function insetRect(rect: Rect, margin: number): Rect {
	const width = Math.max(0, rect.width - margin * 2);
	const height = Math.max(0, rect.height - margin * 2);
	return makeRect(rect.left + margin, rect.top + margin, width, height);
}
