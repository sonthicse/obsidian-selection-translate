import { describe, expect, it } from 'vitest';
import { cacheKey, fnv1a } from '../src/utils/hash';

describe('fnv1a', () => {
	it('is stable for the same input', () => {
		expect(fnv1a('information')).toBe(fnv1a('information'));
	});

	it('separates inputs that differ by one character', () => {
		expect(fnv1a('information')).not.toBe(fnv1a('informatiom'));
	});

	it('always produces eight hex characters', () => {
		for (const input of ['', 'a', 'thông tin', 'x'.repeat(5000)]) {
			expect(fnv1a(input)).toMatch(/^[0-9a-f]{8}$/);
		}
	});
});

describe('cacheKey', () => {
	const base = {
		provider: 'deepl',
		sourceLang: 'en',
		targetLang: 'vi',
		text: 'information',
		withDictionary: true,
	};

	it('treats every input as significant', () => {
		const key = cacheKey(base);

		// Same text through a different engine is a different answer, not a hit.
		expect(cacheKey({ ...base, provider: 'google-free' })).not.toBe(key);
		expect(cacheKey({ ...base, sourceLang: 'de' })).not.toBe(key);
		expect(cacheKey({ ...base, targetLang: 'en' })).not.toBe(key);
		expect(cacheKey({ ...base, text: 'informative' })).not.toBe(key);
		expect(cacheKey({ ...base, withDictionary: false })).not.toBe(key);
	});

	it('returns the same key for identical requests', () => {
		expect(cacheKey(base)).toBe(cacheKey({ ...base }));
	});
});
