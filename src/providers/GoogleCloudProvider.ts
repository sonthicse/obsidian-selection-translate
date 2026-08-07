import { ENDPOINTS } from '../constants';
import type { SourceLangCode, TargetLangCode } from '../types';
import { toGoogleCloudSource, toGoogleCode } from './langMap';
import { decodeHtmlEntities, parseJsonBody, requestWithRetry } from './http';
import { toNfc } from '../utils/text';
import {
	ProviderError,
	type ProviderResponse,
	type TranslateRequest,
	type TranslationProvider,
	type ValidationResult,
} from './TranslationProvider';

/**
 * Translation through Google's official Cloud Translation API v2.
 *
 * The documented, terms-of-service-covered counterpart to the free endpoint.
 * It needs a Google Cloud project with billing enabled and returns no
 * dictionary data, so it exists mainly for users who need a supported service
 * but prefer Google's output to DeepL's.
 */
export class GoogleCloudProvider implements TranslationProvider {
	readonly id = 'google-cloud' as const;
	readonly supportsDictionary = false;
	readonly requiresApiKey = true;

	constructor(private readonly getApiKey: () => string) {}

	supports(_source: SourceLangCode, _target: TargetLangCode): boolean {
		return true;
	}

	async translate(request: TranslateRequest): Promise<ProviderResponse> {
		const key = this.requireKey();

		const body: Record<string, unknown> = {
			q: request.text,
			target: toGoogleCode(request.target),
			// Without this the API treats the input as HTML and escapes the
			// output as markup.
			format: 'text',
		};
		const source = toGoogleCloudSource(request.source);
		if (source != null) body.source = source;

		const response = await requestWithRetry({
			// The key travels as a query parameter because that is the only
			// authentication this API accepts for a plain API key.
			url: `${ENDPOINTS.googleCloud}?key=${encodeURIComponent(key)}`,
			method: 'POST',
			contentType: 'application/json',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		if (response.status !== 200) {
			throw mapStatus(response.status, parseJsonBody(response));
		}

		const parsed = parseGoogleCloud(parseJsonBody(response), request.source);
		if (parsed == null) throw new ProviderError('bad-response', { httpStatus: response.status });

		return parsed;
	}

	async validate(): Promise<ValidationResult> {
		const key = this.getApiKey().trim();
		if (key.length === 0) return { ok: false, i18nKey: 'settings.testMissingKey' };

		try {
			await this.translate({ text: 'hello', source: 'en', target: 'vi', wantDictionary: false });
			return { ok: true, i18nKey: 'settings.testOk' };
		} catch (cause) {
			if (cause instanceof ProviderError && cause.code === 'invalid-key') {
				return { ok: false, i18nKey: 'settings.testInvalidKey' };
			}
			return { ok: false, i18nKey: 'settings.testFailed' };
		}
	}

	private requireKey(): string {
		const key = this.getApiKey().trim();
		if (key.length === 0) throw new ProviderError('missing-key');
		return key;
	}
}

/**
 * Maps a Cloud Translation failure.
 *
 * Google answers a rejected key and an exhausted quota with the same 403, so
 * the body's `reason` field is what separates "fix your key" from "pay your
 * bill" — two errors with completely different next steps.
 */
export function mapStatus(status: number, body: unknown): ProviderError {
	const reason = readErrorReason(body);

	if (reason === 'keyInvalid' || reason === 'forbidden' || reason === 'API_KEY_INVALID') {
		return new ProviderError('invalid-key', { httpStatus: status });
	}
	if (reason === 'dailyLimitExceeded' || reason === 'quotaExceeded') {
		return new ProviderError('quota-exceeded', { httpStatus: status });
	}
	if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
		return new ProviderError('rate-limited', { httpStatus: status });
	}

	switch (status) {
		case 400:
		case 401:
			return new ProviderError('invalid-key', { httpStatus: status });
		case 403:
			// No usable reason in the body; an invalid key is the likelier of
			// the two and its message names the quota case as well.
			return new ProviderError('invalid-key', { httpStatus: status });
		case 413:
			return new ProviderError('payload-too-large', { httpStatus: status });
		case 429:
			return new ProviderError('rate-limited', { httpStatus: status });
		default:
			if (status >= 500) return new ProviderError('server-busy', { httpStatus: status });
			return new ProviderError('unknown', { httpStatus: status });
	}
}

function readErrorReason(body: unknown): string | null {
	if (body == null || typeof body !== 'object') return null;

	const error = (body as { error?: unknown }).error;
	if (error == null || typeof error !== 'object') return null;

	const status = (error as { status?: unknown }).status;
	if (typeof status === 'string' && status.length > 0) return status;

	const errors = (error as { errors?: unknown }).errors;
	if (!Array.isArray(errors) || errors[0] == null || typeof errors[0] !== 'object') return null;

	const reason = (errors[0] as { reason?: unknown }).reason;
	return typeof reason === 'string' ? reason : null;
}

/** Reads `{ data: { translations: [{ translatedText, detectedSourceLanguage }] } }`. */
export function parseGoogleCloud(raw: unknown, requestedSource: SourceLangCode): ProviderResponse | null {
	if (raw == null || typeof raw !== 'object') return null;

	const data = (raw as { data?: unknown }).data;
	if (data == null || typeof data !== 'object') return null;

	const translations = (data as { translations?: unknown }).translations;
	if (!Array.isArray(translations) || translations.length === 0) return null;

	const first = translations[0];
	if (first == null || typeof first !== 'object') return null;

	const text = (first as { translatedText?: unknown }).translatedText;
	if (typeof text !== 'string' || text.length === 0) return null;

	const detected = (first as { detectedSourceLanguage?: unknown }).detectedSourceLanguage;

	return {
		// Apostrophes and ampersands still arrive escaped despite format: "text".
		translated: toNfc(decodeHtmlEntities(text)),
		detectedSourceLang:
			typeof detected === 'string' ? detected : requestedSource === 'auto' ? '' : requestedSource,
	};
}
