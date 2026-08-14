import type { LangCode, SourceLangCode, TargetLangCode } from '../languages';
import type { Definition, DictionaryEntry, ProviderId, UiErrorInfo } from '../types';

/**
 * Which end of a translation a code is for.
 *
 * Worth a type of its own because at least one service spells the same language
 * differently depending on the role — see `deeplLangCodes.ts` — and a boolean
 * argument at every call site would say nothing about which way round it is.
 */
export type LangRole = 'source' | 'target';

/** A provider's own spelling of a language, or undefined when it has none. */
export type LangCodeLookup = (code: LangCode, role: LangRole) => string | undefined;

/**
 * Whether a provider can handle a pair, decided purely from its code table.
 *
 * The point is to answer before any network call: a request that comes back
 * rejected costs a round trip to tell the user something the table already knew.
 * A missing code on either end is the definition of an unsupported pair, so
 * every provider gets this for free by handing over its own lookup.
 */
export function supportsPair(
	toCode: LangCodeLookup,
	source: SourceLangCode,
	target: TargetLangCode
): boolean {
	// 'auto' is a request to detect, not a language, so it needs no code.
	if (source !== 'auto' && toCode(source, 'source') == null) return false;
	return toCode(target, 'target') != null;
}

export interface TranslateRequest {
	/** Already normalised. Providers never see raw markdown. */
	text: string;
	source: SourceLangCode;
	target: TargetLangCode;
	/** Whether the caller would use dictionary data if the provider has any. */
	wantDictionary: boolean;
}

/** What a provider returns. Free of UI concerns and of provider identity. */
export interface ProviderResponse {
	translated: string;
	detectedSourceLang: string;
	phonetic?: string;
	entries?: DictionaryEntry[];
	definitions?: Definition[];
}

/**
 * Failure categories, chosen by what the user can do about them rather than by
 * HTTP status. Two providers returning different numbers for "your key is
 * wrong" should reach the popup as the same actionable message.
 */
export type ProviderErrorCode =
	| 'missing-key'
	| 'invalid-key'
	| 'quota-exceeded'
	| 'rate-limited'
	| 'server-busy'
	| 'payload-too-large'
	| 'unsupported-pair'
	| 'timeout'
	| 'network'
	| 'bad-response'
	| 'unknown';

/** Message key and offered action for each failure. */
const PRESENTATION: Record<ProviderErrorCode, { i18nKey: string; action: UiErrorInfo['action'] }> = {
	'missing-key': { i18nKey: 'error.missingKey', action: 'open-settings' },
	'invalid-key': { i18nKey: 'error.invalidKey', action: 'open-settings' },
	'quota-exceeded': { i18nKey: 'error.quotaExceeded', action: 'change-provider' },
	'rate-limited': { i18nKey: 'error.rateLimited', action: 'retry' },
	'server-busy': { i18nKey: 'error.serverBusy', action: 'retry' },
	'payload-too-large': { i18nKey: 'error.tooLong', action: 'none' },
	'unsupported-pair': { i18nKey: 'error.unsupportedPair', action: 'change-provider' },
	timeout: { i18nKey: 'error.timeout', action: 'retry' },
	network: { i18nKey: 'error.network', action: 'retry' },
	'bad-response': { i18nKey: 'error.badResponse', action: 'retry' },
	unknown: { i18nKey: 'error.unknown', action: 'retry' },
};

/**
 * A translation failure, carrying everything the popup needs to say something
 * useful and nothing it does not.
 *
 * The message is a key, not a sentence: the UI is localised and a provider has
 * no business knowing which language the user reads. The API key is never
 * included in any field — an error surfaces in the console and in screenshots
 * attached to bug reports, and a leaked key is not recoverable.
 */
export class ProviderError extends Error {
	readonly code: ProviderErrorCode;
	readonly httpStatus: number | null;
	readonly i18nKey: string;
	readonly action: UiErrorInfo['action'];
	readonly vars: Record<string, string | number> | undefined;

	constructor(
		code: ProviderErrorCode,
		options: { httpStatus?: number; vars?: Record<string, string | number> } = {}
	) {
		const presentation = PRESENTATION[code];
		super(`${code}${options.httpStatus == null ? '' : ` (HTTP ${options.httpStatus})`}`);
		this.name = 'ProviderError';
		this.code = code;
		this.httpStatus = options.httpStatus ?? null;
		this.i18nKey = presentation.i18nKey;
		this.action = presentation.action;
		this.vars = options.vars;
	}

	/** Shapes the failure for the popup. */
	toUiError(): UiErrorInfo {
		return { messageKey: this.i18nKey, action: this.action, vars: this.vars };
	}
}

/** Turns any thrown value into something the popup can render. */
export function toUiError(cause: unknown): UiErrorInfo {
	if (cause instanceof ProviderError) return cause.toUiError();
	return { messageKey: PRESENTATION.unknown.i18nKey, action: 'retry' };
}

export interface ValidationResult {
	ok: boolean;
	/** Message key describing the outcome, shown beside the test button. */
	i18nKey: string;
	/** Extra detail such as remaining quota. Never contains the API key. */
	vars?: Record<string, string | number>;
}

export interface TranslationProvider {
	readonly id: ProviderId;
	/** Whether translate() can also return phonetics and parts of speech. */
	readonly supportsDictionary: boolean;
	readonly requiresApiKey: boolean;
	supports(source: SourceLangCode, target: TargetLangCode): boolean;
	translate(request: TranslateRequest): Promise<ProviderResponse>;
	/** Backs the "test connection" button in settings. */
	validate(): Promise<ValidationResult>;
}
