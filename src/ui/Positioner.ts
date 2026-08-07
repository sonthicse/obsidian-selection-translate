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

/** Geometry for one placement, or null when its inputs are unavailable. */
function computeCandidate(placement: Placement, request: PlacementRequest): Rect | null {
	const { bbox, anchorRect, size, offset } = request;
	const centerX = bbox.left + bbox.width / 2 - size.width / 2;
	const endX = anchorRect.right - size.width / 2;

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
			return makeRect(
				anchorRect.right + offset,
				anchorRect.top + anchorRect.height / 2 - size.height / 2,
				size.width,
				size.height
			);
		case 'left-of-start':
			return makeRect(
				bbox.left - offset - size.width,
				bbox.top + anchorRect.height / 2 - size.height / 2,
				size.width,
				size.height
			);
		case 'cursor': {
			const cursor = request.cursor;
			if (cursor == null) return null;
			return makeRect(cursor.x + offset, cursor.y + offset, size.width, size.height);
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

/** Shrinks a rect by a uniform margin, never past zero size. */
export function insetRect(rect: Rect, margin: number): Rect {
	const width = Math.max(0, rect.width - margin * 2);
	const height = Math.max(0, rect.height - margin * 2);
	return makeRect(rect.left + margin, rect.top + margin, width, height);
}
