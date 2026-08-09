/*
 * Stand-in for the `obsidian` module, which only exists inside the Obsidian
 * runtime. vitest.config.ts aliases the import here.
 *
 * Only the surface the pure-logic units touch is implemented. `requestUrl` is
 * the important one: providers call it for every network round trip, so tests
 * replace `requestUrlMock` to drive them from fixtures without a network.
 */
import { vi } from 'vitest';

export interface RequestUrlParam {
	url: string;
	method?: string;
	headers?: Record<string, string>;
	body?: string | ArrayBuffer;
	contentType?: string;
	throw?: boolean;
}

export interface RequestUrlResponse {
	status: number;
	headers: Record<string, string>;
	text: string;
	json: unknown;
	arrayBuffer: ArrayBuffer;
}

/** Replace per-test with `requestUrlMock.mockResolvedValue(...)`. */
export const requestUrlMock = vi.fn<(param: RequestUrlParam) => Promise<RequestUrlResponse>>();

export function requestUrl(param: RequestUrlParam): Promise<RequestUrlResponse> {
	return requestUrlMock(param);
}

/** Builds a response object shaped like the real one from a JSON body. */
export function makeResponse(status: number, body: unknown, headers: Record<string, string> = {}): RequestUrlResponse {
	const text = typeof body === 'string' ? body : JSON.stringify(body);
	return {
		status,
		headers,
		text,
		// The real requestUrl throws on access when the body is not JSON; the
		// providers must never rely on that, so the stub just exposes null.
		get json(): unknown {
			try {
				return JSON.parse(text) as unknown;
			} catch {
				return null;
			}
		},
		arrayBuffer: new TextEncoder().encode(text).buffer,
	};
}

export class Notice {
	constructor(public message: string | DocumentFragment, public timeout?: number) {}
	hide(): void {}
	setMessage(message: string | DocumentFragment): this {
		this.message = message;
		return this;
	}
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Component {}
export class Scope {
	register(): void {}
}

/** Tests run as a non-macOS desktop, so 'Mod' resolves to Ctrl. */
export const Platform = {
	isMacOS: false,
	isDesktop: true,
	isMobile: false,
};
export function addIcon(_id: string, _svg: string): void {}
