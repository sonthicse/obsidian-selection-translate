import { beforeEach, describe, expect, it } from 'vitest';
import { makeResponse, requestUrlMock } from './mocks/obsidian';
import {
	GoogleCloudProvider,
	mapStatus,
	parseGoogleCloud,
} from '../src/providers/GoogleCloudProvider';
import { decodeHtmlEntities } from '../src/providers/http';

import cloudOk from './fixtures/google-cloud-ok.json';
import cloud403 from './fixtures/google-cloud-403.json';
import cloudQuota from './fixtures/google-cloud-quota.json';

const KEY = 'AIza0000000000000000000000000000000000';
const request = { text: 'information', source: 'en', target: 'vi', wantDictionary: false } as const;

function provider(key = KEY): GoogleCloudProvider {
	return new GoogleCloudProvider(() => key);
}

describe('mapStatus', () => {
	it('separates a rejected key from an exhausted quota, both of which are 403', () => {
		// Same status, opposite next steps: fix your key, or switch engine.
		expect(mapStatus(403, cloud403).code).toBe('invalid-key');
		expect(mapStatus(403, cloudQuota).code).toBe('quota-exceeded');
	});

	it('sends each to the action that helps', () => {
		expect(mapStatus(403, cloud403).action).toBe('open-settings');
		expect(mapStatus(403, cloudQuota).action).toBe('change-provider');
	});

	it('falls back to the status when the body carries no reason', () => {
		expect(mapStatus(403, null).code).toBe('invalid-key');
		expect(mapStatus(429, null).code).toBe('rate-limited');
		expect(mapStatus(413, null).code).toBe('payload-too-large');
		expect(mapStatus(500, null).code).toBe('server-busy');
		expect(mapStatus(503, null).code).toBe('server-busy');
		expect(mapStatus(418, null).code).toBe('unknown');
	});

	it('reads a reason from either place Google puts it', () => {
		expect(mapStatus(400, { error: { status: 'API_KEY_INVALID' } }).code).toBe('invalid-key');
		expect(mapStatus(429, { error: { errors: [{ reason: 'rateLimitExceeded' }] } }).code).toBe(
			'rate-limited'
		);
	});

	it('does not choke on a malformed error body', () => {
		for (const body of [undefined, 'text', 42, { error: 'text' }, { error: { errors: 'x' } }]) {
			expect(() => mapStatus(403, body)).not.toThrow();
		}
	});
});

describe('parseGoogleCloud', () => {
	it('reads the translation and the detected language', () => {
		const parsed = parseGoogleCloud(cloudOk, 'auto');
		expect(parsed?.detectedSourceLang).toBe('en');
	});

	it('decodes the entities the API emits despite format: text', () => {
		// Real behaviour: apostrophes and ampersands come back escaped.
		const parsed = parseGoogleCloud(cloudOk, 'auto');
		expect(parsed?.translated).toContain('&');
		expect(parsed?.translated).toContain("'");
		expect(parsed?.translated).not.toContain('&amp;');
		expect(parsed?.translated).not.toContain('&#39;');
	});

	it('falls back to the requested language when none was detected', () => {
		const body = { data: { translations: [{ translatedText: 'xin chào' }] } };
		expect(parseGoogleCloud(body, 'en')?.detectedSourceLang).toBe('en');
		expect(parseGoogleCloud(body, 'auto')?.detectedSourceLang).toBe('');
	});

	it('returns null for anything that is not a translation payload', () => {
		for (const input of [null, 'text', {}, { data: {} }, { data: { translations: [] } }]) {
			expect(parseGoogleCloud(input, 'auto')).toBeNull();
		}
	});
});

describe('decodeHtmlEntities', () => {
	it('decodes named entities', () => {
		expect(decodeHtmlEntities('a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;')).toBe(
			'a & b <c> "d" \'e\''
		);
	});

	it('decodes numeric entities in both bases', () => {
		expect(decodeHtmlEntities('it&#39;s')).toBe("it's");
		expect(decodeHtmlEntities('it&#x27;s')).toBe("it's");
	});

	it('decodes the ampersand last, so double-escaped text survives', () => {
		// "&amp;lt;" is an escaped "&lt;", not an escaped "<".
		expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;');
	});

	it('leaves text with no entities untouched and allocates nothing', () => {
		const plain = 'no entities here';
		expect(decodeHtmlEntities(plain)).toBe(plain);
	});

	it('drops an out-of-range code point rather than throwing', () => {
		expect(() => decodeHtmlEntities('&#99999999;')).not.toThrow();
	});
});

describe('GoogleCloudProvider.translate', () => {
	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	it('refuses to make a request with no key configured', async () => {
		await expect(provider('').translate(request)).rejects.toMatchObject({ code: 'missing-key' });
		expect(requestUrlMock).not.toHaveBeenCalled();
	});

	it('sends the key in the query string and asks for plain text', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, cloudOk));

		await provider().translate(request);

		const [param] = requestUrlMock.mock.calls[0] ?? [];
		expect(param?.url).toContain(`key=${KEY}`);
		expect(sentBody()).toEqual({
			q: 'information',
			target: 'vi',
			source: 'en',
			// Without this the API treats the input as HTML.
			format: 'text',
		});
	});

	it('omits the source when set to automatic', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, cloudOk));

		await provider().translate({ ...request, source: 'auto' });

		expect(sentBody()).not.toHaveProperty('source');
	});

	it('reports a rejected key and an exhausted quota differently', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(403, cloud403));
		await expect(provider().translate(request)).rejects.toMatchObject({ code: 'invalid-key' });

		requestUrlMock.mockResolvedValue(makeResponse(403, cloudQuota));
		await expect(provider().translate(request)).rejects.toMatchObject({ code: 'quota-exceeded' });
	});

	it('reports a bad response when the body is not JSON', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, '<html>error</html>'));
		await expect(provider().translate(request)).rejects.toMatchObject({ code: 'bad-response' });
	});
});

describe('GoogleCloudProvider.validate', () => {
	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	it('reports a missing key without calling out', async () => {
		const result = await provider('').validate();

		expect(result.ok).toBe(false);
		expect(result.i18nKey).toBe('settings.testMissingKey');
		expect(requestUrlMock).not.toHaveBeenCalled();
	});

	it('reports success for a working key', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, cloudOk));
		expect((await provider().validate()).ok).toBe(true);
	});

	it('names an invalid key rather than reporting a generic failure', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(403, cloud403));

		const result = await provider().validate();
		expect(result.ok).toBe(false);
		expect(result.i18nKey).toBe('settings.testInvalidKey');
	});
});

/**
 * The JSON body of a recorded request.
 *
 * Worth a helper rather than `String(...)` at each call site: `body` is typed
 * `string | ArrayBuffer`, and stringifying the buffer arm would quietly produce
 * "[object ArrayBuffer]" and a test that passes for the wrong reason.
 */
function sentBody(call = 0): Record<string, unknown> {
	const body = requestUrlMock.mock.calls[call]?.[0]?.body;
	if (typeof body !== 'string') throw new Error('expected a string request body');

	return JSON.parse(body) as Record<string, unknown>;
}
