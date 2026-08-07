import { beforeEach, describe, expect, it } from 'vitest';
import { makeResponse, requestUrlMock } from './mocks/obsidian';
import {
	DeepLProvider,
	endpointFor,
	mapStatus,
	parseDeepL,
	parseUsage,
} from '../src/providers/DeepLProvider';
import { ProviderError } from '../src/providers/TranslationProvider';

import deeplOk from './fixtures/deepl-ok.json';
import deepl403 from './fixtures/deepl-403.json';
import deepl456 from './fixtures/deepl-456.json';
import deeplUsage from './fixtures/deepl-usage.json';

/** A key shaped like a real Free key. Not a real key; nothing here is live. */
const FREE_KEY = '00000000-0000-0000-0000-000000000000:fx';
const PRO_KEY = '00000000-0000-0000-0000-000000000000';

function provider(key = FREE_KEY): DeepLProvider {
	return new DeepLProvider(() => key);
}

const request = { text: 'information', source: 'en', target: 'vi', wantDictionary: false } as const;

describe('endpointFor', () => {
	it('routes a Free key to the free host', () => {
		// DeepL serves Free and Pro keys from different hosts and answers a
		// mismatch with 403 "Wrong endpoint", which reads exactly like a bad
		// key. Deriving the host from the key's suffix removes the failure mode
		// rather than adding a setting to get wrong.
		expect(endpointFor(FREE_KEY)).toBe('https://api-free.deepl.com/v2');
	});

	it('routes a Pro key to the pro host', () => {
		expect(endpointFor(PRO_KEY)).toBe('https://api.deepl.com/v2');
	});

	it('ignores whitespace around a pasted key', () => {
		expect(endpointFor(`  ${FREE_KEY}\n`)).toBe('https://api-free.deepl.com/v2');
	});
});

describe('mapStatus', () => {
	const cases: Array<[number, string]> = [
		[401, 'invalid-key'],
		[403, 'invalid-key'],
		[400, 'unsupported-pair'],
		[404, 'unknown'],
		[413, 'payload-too-large'],
		[414, 'payload-too-large'],
		[429, 'rate-limited'],
		[456, 'quota-exceeded'],
		[500, 'server-busy'],
		[503, 'server-busy'],
		[529, 'server-busy'],
		[418, 'unknown'],
	];

	for (const [status, code] of cases) {
		it(`maps HTTP ${status} to ${code}`, () => {
			expect(mapStatus(status).code).toBe(code);
		});
	}

	it('offers an action for every failure it can produce', () => {
		// An error with nothing the user can do about it is a dead end.
		for (const [status] of cases) {
			expect(mapStatus(status).action).toBeTruthy();
		}
	});

	it('sends the user to settings for a bad key and to another engine when out of quota', () => {
		expect(mapStatus(403).action).toBe('open-settings');
		// Quota resets next billing period; retrying today cannot help.
		expect(mapStatus(456).action).toBe('change-provider');
		expect(mapStatus(529).action).toBe('retry');
	});

	it('never puts the API key in the error message', () => {
		const error = mapStatus(403);
		expect(error.message).not.toContain(FREE_KEY);
		expect(error.message).not.toContain('fx');
	});
});

describe('parseDeepL', () => {
	it('reads the translation and the detected language', () => {
		const parsed = parseDeepL(deeplOk);
		expect(parsed?.translated).toContain('Thông tin tên miền');
		// Lower-cased so every provider reports languages the same way.
		expect(parsed?.detectedSourceLang).toBe('en');
	});

	it('returns null for anything that is not a translation payload', () => {
		for (const input of [null, undefined, 'text', 42, {}, { translations: [] }, { translations: null }]) {
			expect(parseDeepL(input)).toBeNull();
		}
	});

	it('returns null when the translation text is empty or missing', () => {
		expect(parseDeepL({ translations: [{ text: '' }] })).toBeNull();
		expect(parseDeepL({ translations: [{ detected_source_language: 'EN' }] })).toBeNull();
	});

	it('reports an empty language rather than failing when it is absent', () => {
		expect(parseDeepL({ translations: [{ text: 'xin chào' }] })?.detectedSourceLang).toBe('');
	});
});

describe('parseUsage', () => {
	it('reads the character counters', () => {
		expect(parseUsage(deeplUsage)).toEqual({ used: 12480, limit: 500000 });
	});

	it('returns null for a body without both counters', () => {
		expect(parseUsage({ character_count: 10 })).toBeNull();
		expect(parseUsage({ character_count: '10', character_limit: 20 })).toBeNull();
		expect(parseUsage(null)).toBeNull();
	});
});

describe('DeepLProvider.translate', () => {
	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	it('refuses to make a request with no key configured', async () => {
		await expect(new DeepLProvider(() => '  ').translate(request)).rejects.toMatchObject({
			code: 'missing-key',
		});
		// Nothing should reach the network just to discover the key is blank.
		expect(requestUrlMock).not.toHaveBeenCalled();
	});

	it('sends the key as a header and the text as a JSON array', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, deeplOk));

		await provider().translate(request);

		const [param] = requestUrlMock.mock.calls[0] ?? [];
		expect(param?.url).toBe('https://api-free.deepl.com/v2/translate');
		expect(param?.headers?.Authorization).toBe(`DeepL-Auth-Key ${FREE_KEY}`);
		expect(JSON.parse(String(param?.body))).toEqual({
			text: ['information'],
			target_lang: 'VI',
			source_lang: 'EN',
		});
	});

	it('always disables requestUrl throwing so statuses can be interpreted', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, deeplOk));
		await provider().translate(request);

		expect(requestUrlMock.mock.calls[0]?.[0]?.throw).toBe(false);
	});

	it('omits source_lang when the source is set to automatic', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, deeplOk));

		await provider().translate({ ...request, source: 'auto' });

		const body = JSON.parse(String(requestUrlMock.mock.calls[0]?.[0]?.body));
		// Sending "auto" as a value is an error; the field must be absent.
		expect(body).not.toHaveProperty('source_lang');
	});

	it('uses the regional variant for an English target but not as a source', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, deeplOk));

		await provider().translate({ ...request, source: 'en', target: 'en' });

		const body = JSON.parse(String(requestUrlMock.mock.calls[0]?.[0]?.body));
		expect(body.target_lang).toBe('EN-US');
		// DeepL rejects EN-US as a source.
		expect(body.source_lang).toBe('EN');
	});

	it('reports an invalid key for 403 without retrying it', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(403, deepl403));

		await expect(provider().translate(request)).rejects.toMatchObject({ code: 'invalid-key' });
		// A wrong key stays wrong; retrying only delays the message.
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it('reports exhausted quota for 456 without retrying it', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(456, deepl456));

		await expect(provider().translate(request)).rejects.toMatchObject({
			code: 'quota-exceeded',
			action: 'change-provider',
		});
		expect(requestUrlMock).toHaveBeenCalledTimes(1);
	});

	it('retries a busy server and succeeds when it recovers', async () => {
		requestUrlMock
			.mockResolvedValueOnce(makeResponse(529, {}))
			.mockResolvedValueOnce(makeResponse(200, deeplOk));

		const result = await provider().translate(request);

		expect(result.translated).toContain('Thông tin tên miền');
		expect(requestUrlMock).toHaveBeenCalledTimes(2);
	});

	it('gives up after the configured backoff and reports the failure', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(503, {}));

		await expect(provider().translate(request)).rejects.toMatchObject({ code: 'server-busy' });
		// One initial attempt plus one per backoff delay.
		expect(requestUrlMock).toHaveBeenCalledTimes(4);
	});

	it('reports a network failure when the request cannot be made at all', async () => {
		requestUrlMock.mockRejectedValue(new Error('net::ERR_INTERNET_DISCONNECTED'));

		await expect(provider().translate(request)).rejects.toMatchObject({
			code: 'network',
			action: 'retry',
		});
	});

	it('reports a bad response when the body is not the expected shape', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, '<html>maintenance</html>'));

		await expect(provider().translate(request)).rejects.toMatchObject({ code: 'bad-response' });
	});
});

describe('DeepLProvider.validate', () => {
	beforeEach(() => {
		requestUrlMock.mockReset();
	});

	it('reports a missing key without calling out', async () => {
		const result = await new DeepLProvider(() => '').validate();

		expect(result.ok).toBe(false);
		expect(result.i18nKey).toBe('settings.testMissingKey');
		expect(requestUrlMock).not.toHaveBeenCalled();
	});

	it('checks the key against usage, which costs no characters', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, deeplUsage));

		const result = await provider().validate();

		expect(requestUrlMock.mock.calls[0]?.[0]?.url).toBe('https://api-free.deepl.com/v2/usage');
		expect(result.ok).toBe(true);
		expect(result.vars).toEqual({ used: 12480, limit: 500000 });
	});

	it('reports an invalid key distinctly from a general failure', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(403, deepl403));
		expect((await provider().validate()).i18nKey).toBe('settings.testInvalidKey');

		requestUrlMock.mockResolvedValue(makeResponse(404, {}));
		expect((await provider().validate()).i18nKey).toBe('settings.testFailed');
	});

	it('still reports success when the usage body cannot be read', async () => {
		requestUrlMock.mockResolvedValue(makeResponse(200, 'not json'));

		const result = await provider().validate();
		expect(result.ok).toBe(true);
		expect(result.i18nKey).toBe('settings.testOk');
	});
});

describe('ProviderError', () => {
	it('carries a message key and an action for the popup', () => {
		const error = new ProviderError('quota-exceeded', { httpStatus: 456 });

		expect(error.i18nKey).toBe('error.quotaExceeded');
		expect(error.action).toBe('change-provider');
		expect(error.httpStatus).toBe(456);
		expect(error.toUiError()).toEqual({
			messageKey: 'error.quotaExceeded',
			action: 'change-provider',
			vars: undefined,
		});
	});

	it('survives instanceof, which the catch paths depend on', () => {
		expect(new ProviderError('network')).toBeInstanceOf(ProviderError);
		expect(new ProviderError('network')).toBeInstanceOf(Error);
	});
});
