import { describe, expect, it } from 'vitest';
import { LruCache } from '../src/core/LruCache';

describe('LruCache', () => {
	it('stores and returns values', () => {
		const cache = new LruCache<string>(3);
		cache.set('a', 'alpha');

		expect(cache.get('a')).toBe('alpha');
		expect(cache.has('a')).toBe(true);
		expect(cache.size).toBe(1);
	});

	it('returns undefined for a key it never saw', () => {
		expect(new LruCache<string>(3).get('missing')).toBeUndefined();
	});

	it('evicts the least recently used entry when full', () => {
		const cache = new LruCache<string>(2);
		cache.set('a', 'alpha');
		cache.set('b', 'beta');
		cache.set('c', 'gamma');

		expect(cache.get('a')).toBeUndefined();
		expect(cache.get('b')).toBe('beta');
		expect(cache.get('c')).toBe('gamma');
		expect(cache.size).toBe(2);
	});

	it('counts a read as a use, so a hot entry survives', () => {
		const cache = new LruCache<string>(2);
		cache.set('a', 'alpha');
		cache.set('b', 'beta');

		// Reading 'a' makes 'b' the oldest instead.
		cache.get('a');
		cache.set('c', 'gamma');

		expect(cache.get('a')).toBe('alpha');
		expect(cache.get('b')).toBeUndefined();
	});

	it('counts an overwrite as a use and does not grow', () => {
		const cache = new LruCache<string>(2);
		cache.set('a', 'alpha');
		cache.set('b', 'beta');
		cache.set('a', 'ALPHA');

		expect(cache.size).toBe(2);
		expect(cache.get('a')).toBe('ALPHA');

		cache.set('c', 'gamma');
		expect(cache.get('b')).toBeUndefined();
		expect(cache.get('a')).toBe('ALPHA');
	});

	it('stores nothing when the size is zero, which is how caching is disabled', () => {
		const cache = new LruCache<string>(0);
		cache.set('a', 'alpha');

		expect(cache.get('a')).toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it('treats a negative size as disabled rather than crashing', () => {
		const cache = new LruCache<string>(-5);
		cache.set('a', 'alpha');
		expect(cache.size).toBe(0);
	});

	it('evicts immediately when the limit is lowered', () => {
		const cache = new LruCache<string>(5);
		for (const key of ['a', 'b', 'c', 'd', 'e']) cache.set(key, key);

		cache.setMaxSize(2);

		expect(cache.size).toBe(2);
		// The two most recently written survive.
		expect(cache.get('d')).toBe('d');
		expect(cache.get('e')).toBe('e');
		expect(cache.get('a')).toBeUndefined();
	});

	it('empties itself when caching is switched off at runtime', () => {
		const cache = new LruCache<string>(5);
		cache.set('a', 'alpha');

		cache.setMaxSize(0);

		expect(cache.size).toBe(0);
		cache.set('b', 'beta');
		expect(cache.size).toBe(0);
	});

	it('accepts entries again when the limit is raised', () => {
		const cache = new LruCache<string>(0);
		cache.setMaxSize(2);
		cache.set('a', 'alpha');

		expect(cache.get('a')).toBe('alpha');
	});

	it('clears everything on request', () => {
		const cache = new LruCache<string>(3);
		cache.set('a', 'alpha');
		cache.clear();

		expect(cache.size).toBe(0);
		expect(cache.get('a')).toBeUndefined();
	});

	it('stays at its limit under sustained writes', () => {
		const cache = new LruCache<number>(50);
		for (let i = 0; i < 1000; i++) cache.set(`key-${i}`, i);

		expect(cache.size).toBe(50);
		expect(cache.get('key-999')).toBe(999);
		expect(cache.get('key-0')).toBeUndefined();
	});
});
