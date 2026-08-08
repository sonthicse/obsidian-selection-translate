import { requestUrl, type RequestUrlParam, type RequestUrlResponse } from 'obsidian';
import { REQUEST_TIMEOUT_MS, RETRYABLE_STATUSES, RETRY_DELAYS_MS } from '../constants';
import { sleep } from '../utils/debounce';
import { debug } from '../utils/log';
import { ProviderError } from './TranslationProvider';

/**
 * Every network call the plugin makes goes through here.
 *
 * `requestUrl` rather than `fetch` is mandatory, not a preference. Obsidian's
 * renderer is Chromium with an `app://obsidian.md` origin, and DeepL sends no
 * CORS headers for it, so `fetch` fails before the request leaves the machine.
 * `requestUrl` performs the request below the browser layer, which also makes
 * it work identically on mobile.
 *
 * `throw: false` is always set so a 403 arrives as a status to interpret rather
 * than an exception to guess at — the difference between "your key is wrong"
 * and "something went wrong".
 */
export async function requestWithRetry(param: RequestUrlParam): Promise<RequestUrlResponse> {
	let lastResponse: RequestUrlResponse | null = null;

	// One initial attempt plus one per backoff delay.
	for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
		if (attempt > 0) {
			const delay = RETRY_DELAYS_MS[attempt - 1] ?? 0;
			debug('retrying request', { attempt, delay, status: lastResponse?.status });
			await sleep(delay);
		}

		let response: RequestUrlResponse;
		try {
			response = await withTimeout(requestUrl({ ...param, throw: false }));
		} catch (cause) {
			// A timeout is already a ProviderError and carries its own message.
			if (cause instanceof ProviderError) throw cause;

			// requestUrl still rejects when the request cannot be made at all:
			// no network, DNS failure, TLS refusal.
			debug('request failed before reaching the server', cause);
			throw new ProviderError('network');
		}

		/*
		 * Only these statuses are worth repeating. A 403 means the key or the
		 * endpoint is wrong and will be wrong again in two seconds; retrying it
		 * would just delay a message the user needs to see now, and against a
		 * metered API it would spend quota to learn nothing.
		 */
		if (!RETRYABLE_STATUSES.has(response.status)) return response;

		lastResponse = response;
	}

	// Out of attempts. Hand back the last response so the caller maps the
	// status into its own vocabulary.
	return lastResponse as RequestUrlResponse;
}

/**
 * Stops waiting on a request that is taking unreasonably long.
 *
 * Not a cancellation: `requestUrl` exposes no AbortController, so the request
 * carries on somewhere below and its eventual answer is simply never read. What
 * this buys is a bounded wait, so a hung endpoint surfaces as an error with a
 * retry button instead of a popup that spins until the user gives up.
 *
 * A timeout is not retried. Three attempts at fifteen seconds each is a
 * three-quarter-minute stare at a spinner, which is worse than failing once and
 * offering the button.
 */
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			debug('request timed out', REQUEST_TIMEOUT_MS);
			reject(new ProviderError('timeout'));
		}, REQUEST_TIMEOUT_MS);
	});

	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

/**
 * Parses a response body, returning null instead of throwing.
 *
 * The `json` property on a requestUrl response throws when the body is not
 * JSON, and an upstream service having a bad day answers with an HTML error
 * page often enough that this matters. A null here becomes a clean
 * "bad response" the user can retry.
 */
export function parseJsonBody(response: RequestUrlResponse): unknown {
	try {
		if (typeof response.text !== 'string' || response.text.length === 0) return null;
		return JSON.parse(response.text);
	} catch {
		return null;
	}
}

/**
 * Decodes the handful of HTML entities Google's translation APIs emit.
 *
 * Cloud v2 escapes apostrophes and ampersands in `translatedText` even with
 * `format: "text"`, so a translation of "it's" comes back as "it&#39;s".
 * The usual trick of letting the DOM decode them means handing an untrusted
 * markup string to an element and reading the text back, which the plugin
 * guidelines forbid and which is an injection footgun besides. The five named
 * entities and both numeric forms are handled explicitly instead.
 */
export function decodeHtmlEntities(input: string): string {
	if (!input.includes('&')) return input;

	return input
		.replace(/&#(\d+);/g, (_match, code: string) => safeFromCodePoint(Number.parseInt(code, 10)))
		.replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => safeFromCodePoint(Number.parseInt(code, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		// Ampersand last, so "&amp;lt;" decodes to "&lt;" and not to "<".
		.replace(/&amp;/g, '&');
}

function safeFromCodePoint(code: number): string {
	if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
	return String.fromCodePoint(code);
}
