import { describe, expect, it } from 'vitest';
import { parseGtx } from '../src/providers/GoogleFreeProvider';

import wordFixture from './fixtures/gtx-word-en-vi.json';
import sentenceFixture from './fixtures/gtx-sentence-en-vi.json';
import autoFixture from './fixtures/gtx-auto-de-vi.json';
import malformedFixture from './fixtures/gtx-malformed.json';

/*
 * The three JSON fixtures beginning `gtx-` are verbatim captures of real
 * responses from translate.googleapis.com. That matters more here than
 * anywhere else in the suite: the endpoint is undocumented, so the only
 * specification of its shape is what it actually sends, and a hand-written
 * fixture would only prove the parser agrees with my assumptions.
 *
 * gtx-malformed.json is hand-written, and says so, because the point of it is
 * to be a shape the endpoint has never sent.
 */

describe('parseGtx: single word with dictionary data', () => {
	const parsed = parseGtx(wordFixture);

	it('extracts the translation', () => {
		expect(parsed?.translated).toBe('thông tin');
	});

	it('reports the detected source language', () => {
		expect(parsed?.detectedSourceLang).toBe('en');
	});

	it('finds the phonetic transcription in the row that has no text', () => {
		// The row is [null, null, null, "ˌinfərˈmāSH(ə)n"]; cell 3 is the
		// source-language pronunciation, which is the one the popup shows.
		expect(parsed?.phonetic).toBe('ˌinfərˈmāSH(ə)n');
	});

	it('groups meanings under their part of speech', () => {
		expect(parsed?.entries).toHaveLength(1);
		expect(parsed?.entries?.[0]?.partOfSpeech).toBe('danh từ');
		expect(parsed?.entries?.[0]?.meanings).toEqual([
			'học thức',
			'hỏi thăm',
			'sự điều tra',
			'sự hiểu biết',
			'tin tức',
		]);
	});

	it('flattens back-translations and removes duplicates', () => {
		// "information" is listed under all five senses in the real response.
		const backTranslations = parsed?.entries?.[0]?.backTranslations ?? [];
		expect(backTranslations).toContain('knowledge');
		expect(backTranslations).toContain('news');
		expect(backTranslations.filter((word) => word === 'information')).toHaveLength(1);
	});

	it('extracts definitions with their examples', () => {
		const definitions = parsed?.definitions ?? [];
		expect(definitions.length).toBeGreaterThan(0);
		expect(definitions[0]?.partOfSpeech).toBe('danh từ');
		expect(definitions[0]?.text).toBe('facts provided or learned about something or someone.');
		expect(definitions[0]?.example).toBe('a vital piece of information');
	});
});

describe('parseGtx: sentence with no dictionary section', () => {
	const parsed = parseGtx(sentenceFixture);

	it('extracts the translation', () => {
		expect(parsed?.translated).toContain('Thông tin tên miền');
	});

	it('reports the detected source language', () => {
		expect(parsed?.detectedSourceLang).toBe('en');
	});

	it('omits every dictionary field rather than returning empty ones', () => {
		// This response is 9 elements long instead of 14, and its data[1] is
		// null. The popup tests for presence, so absent must mean absent.
		expect(parsed?.entries).toBeUndefined();
		expect(parsed?.definitions).toBeUndefined();
		expect(parsed?.phonetic).toBeUndefined();
	});
});

describe('parseGtx: auto-detected source', () => {
	const parsed = parseGtx(autoFixture);

	it('translates and reports the language it detected', () => {
		expect(parsed?.translated).toBe('Chào buổi sáng');
		expect(parsed?.detectedSourceLang).toBe('de');
	});
});

describe('parseGtx: degrading instead of crashing', () => {
	it('returns null for a response that is not an array at all', () => {
		expect(parseGtx(malformedFixture)).toBeNull();
	});

	it('returns null rather than throwing for every kind of junk', () => {
		for (const input of [null, undefined, 0, '', 'text', {}, [], [null], [[]], [[[]]]]) {
			expect(parseGtx(input)).toBeNull();
		}
	});

	it('keeps the translation when the dictionary section is corrupt', () => {
		// The single most valuable degradation: the endpoint changed how it
		// reports dictionaries, but the translation is still right there.
		const parsed = parseGtx([[['thông tin', 'information', null, null, 10]], 'not-an-array', 'en']);

		expect(parsed?.translated).toBe('thông tin');
		expect(parsed?.entries).toBeUndefined();
	});

	it('skips dictionary groups that are missing a part of speech or meanings', () => {
		const parsed = parseGtx([
			[['x', 'y', null, null, 10]],
			[
				[null, ['meaning']], // no part of speech
				['danh từ', []], // no meanings
				['danh từ', ['tin tức']], // usable
			],
			'en',
		]);

		expect(parsed?.entries).toHaveLength(1);
		expect(parsed?.entries?.[0]?.meanings).toEqual(['tin tức']);
	});

	it('joins multi-chunk translations of long text in order', () => {
		const parsed = parseGtx([
			[
				['Phần một. ', 'Part one. ', null, null, 10],
				['Phần hai.', 'Part two.', null, null, 10],
			],
			null,
			'en',
		]);

		expect(parsed?.translated).toBe('Phần một. Phần hai.');
	});

	it('falls back to the confidence block for the detected language', () => {
		// data[2] is missing here, but data[8] still names the language.
		const parsed = parseGtx([
			[['xin chào', 'hello', null, null, 10]],
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			[['en'], null, [1], ['en']],
		]);

		expect(parsed?.detectedSourceLang).toBe('en');
	});

	it('reports an empty language rather than inventing one', () => {
		const parsed = parseGtx([[['xin chào', 'hello', null, null, 10]]]);
		expect(parsed?.detectedSourceLang).toBe('');
	});

	it('returns null when there is a shape but no actual translation', () => {
		expect(parseGtx([[[null, 'hello', null, null, 10]], null, 'en'])).toBeNull();
		expect(parseGtx([[['   ', 'hello']], null, 'en'])).toBeNull();
	});

	it('uses the target romanisation only when no source phonetic is present', () => {
		const withBoth = parseGtx([
			[
				['thông tin', 'information', null, null, 10],
				[null, null, 'target-romanisation', 'source-phonetic'],
			],
			null,
			'en',
		]);
		expect(withBoth?.phonetic).toBe('source-phonetic');

		const withOnlyTarget = parseGtx([
			[
				['thông tin', 'information', null, null, 10],
				[null, null, 'target-romanisation', null],
			],
			null,
			'en',
		]);
		expect(withOnlyTarget?.phonetic).toBe('target-romanisation');
	});
});
