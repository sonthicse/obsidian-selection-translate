import { describe, expect, it } from 'vitest';
import { canScrollBy, findScrollTarget, normalizeWheelDelta, type ScrollMetrics } from '../src/utils/scroll';

/** A box that scrolls vertically, halfway down a document twice its height. */
function metrics(overrides: Partial<ScrollMetrics> = {}): ScrollMetrics {
	return {
		scrollTop: 500,
		scrollHeight: 2000,
		clientHeight: 1000,
		scrollLeft: 0,
		scrollWidth: 800,
		clientWidth: 800,
		overflowX: 'hidden',
		overflowY: 'auto',
		...overrides,
	};
}

interface Chain {
	inner: Element;
	middle: Element;
	outer: Element;
}

/*
 * The walk is exercised against plain objects rather than a DOM: `parentElement`
 * is the only member it touches, and building the chain by hand is what keeps
 * these tests running under the same plain-Node runner as the positioner's.
 */
function chain(): Chain {
	const outer = { name: 'outer', parentElement: null } as unknown as Element;
	const middle = { name: 'middle', parentElement: outer } as unknown as Element;
	const inner = { name: 'inner', parentElement: middle } as unknown as Element;
	return { inner, middle, outer };
}

describe('normalizeWheelDelta', () => {
	it('passes pixel deltas through untouched', () => {
		expect(normalizeWheelDelta(0, 120, 0, 16, 800)).toEqual({ dx: 0, dy: 120 });
	});

	it('converts line deltas using the line height', () => {
		// Three lines of a 16px line box, not three pixels.
		expect(normalizeWheelDelta(0, 3, 1, 16, 800)).toEqual({ dx: 0, dy: 48 });
		expect(normalizeWheelDelta(-2, 0, 1, 16, 800)).toEqual({ dx: -32, dy: 0 });
	});

	it('converts page deltas using the page height', () => {
		expect(normalizeWheelDelta(0, -1, 2, 16, 800)).toEqual({ dx: 0, dy: -800 });
	});
});

describe('canScrollBy', () => {
	it('accepts a box with room in the requested direction', () => {
		expect(canScrollBy(metrics(), 0, 100)).toBe(true);
		expect(canScrollBy(metrics(), 0, -100)).toBe(true);
	});

	it('refuses a box already at the end it is asked to move towards', () => {
		// At the bottom: 1000 + 1000 === 2000. The gesture has to chain outward.
		expect(canScrollBy(metrics({ scrollTop: 1000 }), 0, 100)).toBe(false);
		expect(canScrollBy(metrics({ scrollTop: 1000 }), 0, -100)).toBe(true);

		expect(canScrollBy(metrics({ scrollTop: 0 }), 0, -100)).toBe(false);
		expect(canScrollBy(metrics({ scrollTop: 0 }), 0, 100)).toBe(true);
	});

	it('treats a sub-pixel remainder at either end as no room left', () => {
		// Fractional zoom leaves a fraction of a pixel behind; reporting that as
		// room would hand the delta to a scroller that cannot move.
		expect(canScrollBy(metrics({ scrollTop: 999.6 }), 0, 100)).toBe(false);
		expect(canScrollBy(metrics({ scrollTop: 0.4 }), 0, -100)).toBe(false);
	});

	it('skips a box whose overflow is hidden, however scrollable its size', () => {
		expect(canScrollBy(metrics({ overflowY: 'hidden' }), 0, 100)).toBe(false);
		expect(canScrollBy(metrics({ overflowY: 'visible' }), 0, 100)).toBe(false);
		expect(canScrollBy(metrics({ overflowY: 'overlay' }), 0, 100)).toBe(true);
		expect(canScrollBy(metrics({ overflowY: 'scroll' }), 0, 100)).toBe(true);
	});

	it('answers per axis, so a horizontal container ignores a vertical wheel', () => {
		const sideways = metrics({
			overflowX: 'auto',
			overflowY: 'hidden',
			scrollLeft: 100,
			scrollWidth: 2000,
			clientWidth: 800,
		});

		expect(canScrollBy(sideways, 0, 100)).toBe(false);
		expect(canScrollBy(sideways, 100, 0)).toBe(true);
		// A shift-wheel carries both; either axis being able to move is enough.
		expect(canScrollBy(sideways, 100, 100)).toBe(true);
	});
});

describe('findScrollTarget', () => {
	it('returns the innermost ancestor with room, starting at the node itself', () => {
		const { inner, middle, outer } = chain();
		const read = (el: Element): ScrollMetrics =>
			el === outer ? metrics() : metrics({ overflowY: 'hidden' });

		expect(findScrollTarget(inner, 0, 100, read)).toBe(outer);
		expect(findScrollTarget(middle, 0, 100, read)).toBe(outer);
		expect(findScrollTarget(outer, 0, 100, read)).toBe(outer);
	});

	it('prefers the nearest scroller over an outer one', () => {
		const { inner, outer } = chain();
		const read = (el: Element): ScrollMetrics =>
			el === inner || el === outer ? metrics() : metrics({ overflowY: 'hidden' });

		expect(findScrollTarget(inner, 0, 100, read)).toBe(inner);
	});

	it('stops after testing stopAt rather than escaping the popup', () => {
		const { inner, middle, outer } = chain();
		const read = (el: Element): ScrollMetrics =>
			el === outer ? metrics() : metrics({ overflowY: 'hidden' });

		// `outer` could take it, but the walk was told not to look past `middle`.
		expect(findScrollTarget(inner, 0, 100, read, middle)).toBeNull();
		// The boundary itself is still offered the gesture.
		const readMiddle = (el: Element): ScrollMetrics =>
			el === middle ? metrics() : metrics({ overflowY: 'hidden' });
		expect(findScrollTarget(inner, 0, 100, readMiddle, middle)).toBe(middle);
	});

	it('returns null when nothing in the chain can move', () => {
		const { inner } = chain();
		const read = (): ScrollMetrics => metrics({ overflowY: 'hidden' });

		expect(findScrollTarget(inner, 0, 100, read)).toBeNull();
		expect(findScrollTarget(null, 0, 100, read)).toBeNull();
	});
});
