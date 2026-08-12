/*
 * Scroll chaining, worked out without touching the DOM.
 *
 * The floating UI lives in `document.body` with `position: fixed` — see
 * {@link TriggerIcon} for why that is not negotiable — which means the browser
 * resolves its scroll chain through `.st-popup → body → html`. None of those
 * scroll in Obsidian, and the real scrollers (`.cm-scroller`, the reading view,
 * the PDF container) are not ancestors of the popup, so a wheel event over the
 * popup simply dies. The plugin has to pick the target itself.
 *
 * Everything here takes measurements rather than elements, so the rules are
 * testable under plain Node exactly like the positioner is.
 */

/** The parts of a box that decide whether it can absorb a wheel gesture. */
export interface ScrollMetrics {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
	scrollLeft: number;
	scrollWidth: number;
	clientWidth: number;
	overflowX: string;
	overflowY: string;
}

/** How a box's computed overflow is read. */
export type ReadMetrics = (el: Element) => ScrollMetrics;

/** `WheelEvent.DOM_DELTA_LINE`, spelled out so no window object is needed. */
const DELTA_LINE = 1;
/** `WheelEvent.DOM_DELTA_PAGE`. */
const DELTA_PAGE = 2;

/**
 * Overflow values that make a box a scroll container.
 *
 * `overlay` is deprecated and aliased to `auto` in current Chromium, but themes
 * still ship it and a box declaring it does scroll, so it counts.
 */
const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/**
 * Sub-pixel slack when asking whether a box has room left.
 *
 * Fractional zoom and fractional line heights leave `scrollTop + clientHeight`
 * a hair short of `scrollHeight` at the very bottom of a note. Without the
 * tolerance that reads as "room remaining", so the delta is handed to a
 * scroller that cannot move and never chains outward.
 */
const EDGE_TOLERANCE = 1;

/**
 * Wheel deltas in pixels, whatever unit the device reported them in.
 *
 * Only Chromium's pixel mode is common, but a mouse driver or a Linux desktop
 * can still emit line or page deltas, and forwarding "3" as three pixels turns
 * a full wheel notch into an imperceptible nudge.
 *
 * Page mode is the one place the two axes disagree. "A page" horizontally is
 * the viewport's width, not its height, so scaling both by the same number
 * over-scrolls sideways on any window that is not square. Line mode does use
 * one number for both: a line height is a text metric, and there is no
 * "line width" a horizontal notch could mean.
 */
export function normalizeWheelDelta(
	deltaX: number,
	deltaY: number,
	deltaMode: number,
	lineHeight: number,
	pageHeight: number,
	pageWidth: number
): { dx: number; dy: number } {
	if (deltaMode === DELTA_LINE) {
		return { dx: deltaX * lineHeight, dy: deltaY * lineHeight };
	}
	if (deltaMode === DELTA_PAGE) {
		return { dx: deltaX * pageWidth, dy: deltaY * pageHeight };
	}
	return { dx: deltaX, dy: deltaY };
}

/**
 * Whether a box would actually move if given this delta.
 *
 * Both halves matter. Being a scroll container is not enough — a note scrolled
 * to its end must let the gesture chain past it — and having overflow is not
 * enough either, since `overflow: hidden` boxes carry a scrollable size while
 * refusing to scroll.
 */
export function canScrollBy(metrics: ScrollMetrics, dx: number, dy: number): boolean {
	return hasRoom(
		metrics.overflowY,
		dy,
		metrics.scrollTop,
		metrics.scrollHeight,
		metrics.clientHeight
	) || hasRoom(
		metrics.overflowX,
		dx,
		metrics.scrollLeft,
		metrics.scrollWidth,
		metrics.clientWidth
	);
}

/** One axis of {@link canScrollBy}. */
function hasRoom(
	overflow: string,
	delta: number,
	offset: number,
	scrollSize: number,
	clientSize: number
): boolean {
	if (delta === 0) return false;
	if (!SCROLLABLE_OVERFLOW.has(overflow)) return false;

	if (delta > 0) return offset + clientSize < scrollSize - EDGE_TOLERANCE;
	return offset > EDGE_TOLERANCE;
}

/**
 * Nearest ancestor that can take the delta, `start` included.
 *
 * Walks outward the way the browser's own chaining would, which is what keeps
 * a long result scrolling inside the popup until it hits its end and only then
 * moving the note underneath.
 *
 * `read` is injected rather than calling `getComputedStyle` here: that is the
 * one piece of DOM contact the rule needs, and holding it at arm's length is
 * what lets the walk be tested without a browser. `stopAt` is tested and then
 * the walk ends, so the popup root itself still gets a chance to scroll.
 */
export function findScrollTarget(
	start: Element | null,
	dx: number,
	dy: number,
	read: ReadMetrics,
	stopAt?: Element | null
): Element | null {
	let node: Element | null = start;

	while (node != null) {
		if (canScrollBy(read(node), dx, dy)) return node;
		if (node === stopAt) return null;
		node = node.parentElement;
	}

	return null;
}
