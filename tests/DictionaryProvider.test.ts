import { beforeEach, describe, expect, it } from 'vitest';
import { makeResponse, requestUrlMock } from './mocks/obsidian';
import { FreeDictionaryProvider, parseFreeDictionary } from '../src/providers/DictionaryProvider';
import dictionaryFixture from './fixtures/dictionaryapi-information.json';

describe('parseFreeDictionary', () => {
	const parsed = parseFreeDictionary(dictionaryFixture);

	it('extracts the IPA transcription', () => {
		// The reason this source exists: the free Google endpoint returns no
		// romanisation for English to Vietnamese, the plugin's commonest pair.
		expect(parsed?.phonetic).toBe('/ˌɪnfəˈmeɪʃən/');
	});

	it('groups definitions under their part of speech', () => {
		expect(parsed?.entries?.[0]?.partOfSpeech).toBe('noun');
		expect((parsed?.entries?.[0]?.meanings.length ?? 0) > 0).toBe(true);
	});

	it('keeps usage examples where the entry has them', () => {
		const withExample = parsed?.definitions?.find((definition) => definition.example != null);
		expect(withExample?.example).toBeTruthy();
	});

	it('falls back to the phonetics array when the top-level field is missing', () => {
		const parsedWithoutDirect = parseFreeDictionary([
			{ phonetics: [{ text: '' }, { text: '/test/' }] },
		]);
		expect(parsedWithoutDirect?.phonetic).toBe('/test/');
	});

	it('returns null rather than throwing for every kind of junk', () => {
		for (const input of [null, undefined, {}, [], 'text', 42, [null], [{}]]) {
			expect(parseFreeDictionary(input)).toBeNull();
		}
	});

	it('skips meanings with no part of speech or no definitions', () => {
		const parsed2 = parseFreeDictionary([
			{
				phonetic: '/x/',
				meanings: [
					{ definitions: [{ definition: 'orphan' }] },
					{ partOfSpeech: 'noun', definitions: [] },
					{ partOfSpeech: 'verb', definitions: [{ definition: 'usable' }] },
				],
			},
		]);

		expect(parsed2?.entries).toHaveLength(1);
		expect(parsed2?.entries?.[0]?.partOfSpeech).toBe('verb');
	});
});

describe('FreeDictionaryProvider', () => {
	const provider = new FreeDictionaryProvider();

	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	it('only claims to support English', () => {
		expect(provider.supports('en')).toBe(true);
		expect(provider.supports('en-GB')).toBe(true);
		expect(provider.supports('vi')).toBe(false);
		expect(provider.supports('')).toBe(false);
	});

	it('does not call out for a language it cannot serve', async () => {
		expect(await provider.lookup('thông tin', 'vi')).toBeNull();
		expect(requestUrlMock).not.toHaveBeenCalled();
	});

	it('lower-cases and URL-encodes the word', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, dictionaryFixture));

		await provider.lookup('Information', 'en');

		expect(requestUrlMock.mock.calls[0]?.[0]?.url).toBe(
			'https://api.dictionaryapi.dev/api/v2/entries/en/information'
		);
	});

	it('treats an unknown word as a null result, not a failure', async () => {
		// 404 here means "not in the dictionary", which is entirely normal.
		requestUrlMock.mockResolvedValue(makeResponse(404, { title: 'No Definitions Found' }));
		expect(await provider.lookup('asdfgh', 'en')).toBeNull();
	});

	it('swallows a network failure, because enrichment is a bonus', async () => {
		// A dictionary being down must never sink a translation that worked.
		requestUrlMock.mockRejectedValue(new Error('offline'));
		expect(await provider.lookup('information', 'en')).toBeNull();
	});
});
