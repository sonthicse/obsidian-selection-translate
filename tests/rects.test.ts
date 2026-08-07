import { describe, expect, it } from 'vitest';
import { makeRect } from '../src/types';
import { last, unionRects } from '../src/utils/dom';

describe('makeRect', () => {
	it('derives the edges from position and size', () => {
		const rect = makeRect(10, 20, 30, 40);
		expect(rect).toEqual({
			x: 10,
			y: 20,
			width: 30,
			height: 40,
			left: 10,
			top: 20,
			right: 40,
			bottom: 60,
		});
	});
});

describe('unionRects', () => {
	it('returns an empty rect for no input', () => {
		expect(unionRects([])).toEqual(makeRect(0, 0, 0, 0));
	});

	it('returns the rect itself for a single-line selection', () => {
		const rect = makeRect(100, 200, 50, 18);
		expect(unionRects([rect])).toEqual(rect);
	});

	it('spans every line of a multi-line selection', () => {
		// A wrapped selection reports one rect per visual line; the icon anchors
		// to the box containing all of them.
		const union = unionRects([
			makeRect(100, 200, 200, 18),
			makeRect(40, 218, 260, 18),
			makeRect(40, 236, 90, 18),
		]);

		expect(union.left).toBe(40);
		expect(union.top).toBe(200);
		expect(union.right).toBe(300);
		expect(union.bottom).toBe(254);
		expect(union.width).toBe(260);
		expect(union.height).toBe(54);
	});

	it('handles rects given out of visual order', () => {
		const union = unionRects([makeRect(50, 300, 10, 10), makeRect(10, 100, 10, 10)]);
		expect(union.left).toBe(10);
		expect(union.top).toBe(100);
		expect(union.bottom).toBe(310);
	});
});

describe('last', () => {
	it('returns the final element, standing in for Array.prototype.at(-1)', () => {
		// `.at()` is ES2022; esbuild downlevels syntax but never polyfills
		// methods, so using it would compile and then throw at runtime.
		expect(last([1, 2, 3])).toBe(3);
	});

	it('returns undefined for an empty array', () => {
		expect(last([])).toBeUndefined();
	});
});
