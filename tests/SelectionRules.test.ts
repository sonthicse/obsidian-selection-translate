import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type SelectionTranslateSettings } from '../src/settings/settings';
import type { ContextInfo } from '../src/core/ContextDetector';
import {
	isDeliberateRequest,
	isSamePosition,
	judge,
	type Candidate,
} from '../src/core/SelectionRules';

/** A markdown reading-view context, the ordinary case. */
function context(overrides: Partial<ContextInfo> = {}): ContextInfo {
	return {
		context: 'md-read',
		inProperties: false,
		// The rules never touch it; only `isContextEnabled` sees this object.
		containerEl: null as unknown as HTMLElement,
		...overrides,
	};
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
	return {
		text: 'hello world',
		insideOwnUi: false,
		inIgnoredSurface: false,
		inSidebar: false,
		context: context(),
		...overrides,
	};
}

function settings(overrides: Partial<SelectionTranslateSettings> = {}): SelectionTranslateSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('judge', () => {
	it('accepts an ordinary selection in an enabled surface', () => {
		expect(judge(candidate(), settings())).toEqual({ kind: 'accept' });
	});

	it('ignores a selection inside the plugin’s own popup', () => {
		// Not a rejection: translating a translation would loop, and whatever is
		// already on screen must be left alone rather than torn down.
		expect(judge(candidate({ insideOwnUi: true }), settings())).toEqual({ kind: 'ignore' });
	});

	it('checks our own UI before anything else', () => {
		// Every other rule would also reject this; only `ignore` leaves the popup
		// standing, so the order has to hold.
		const hopeless = candidate({
			insideOwnUi: true,
			inIgnoredSurface: true,
			inSidebar: true,
			text: '',
			context: null,
		});
		expect(judge(hopeless, settings())).toEqual({ kind: 'ignore' });
	});

	it('rejects transient chrome and sidebars as the same reason', () => {
		expect(judge(candidate({ inIgnoredSurface: true }), settings())).toEqual({
			kind: 'reject',
			reason: 'ignored-surface',
		});
		expect(judge(candidate({ inSidebar: true }), settings())).toEqual({
			kind: 'reject',
			reason: 'ignored-surface',
		});
	});

	it('treats whitespace-only text as empty', () => {
		expect(judge(candidate({ text: '   \n\t ' }), settings())).toEqual({
			kind: 'reject',
			reason: 'empty',
		});
	});

	it('measures the minimum length against trimmed text', () => {
		const padded = candidate({ text: '  ab  ' });
		expect(judge(padded, settings({ minSelectionLength: 3 }))).toEqual({
			kind: 'reject',
			reason: 'too-short',
		});
		expect(judge(padded, settings({ minSelectionLength: 2 }))).toEqual({ kind: 'accept' });
	});

	it('applies the hard cap to the untrimmed text', () => {
		// The cap protects the request, and the request carries whatever was
		// selected — padding included.
		expect(judge(candidate({ text: 'x'.repeat(100_001) }), settings())).toEqual({
			kind: 'reject',
			reason: 'too-long',
		});
		expect(judge(candidate({ text: 'x'.repeat(100_000) }), settings())).toEqual({ kind: 'accept' });
	});

	it('rejects a surface it could not identify', () => {
		expect(judge(candidate({ context: null }), settings())).toEqual({
			kind: 'reject',
			reason: 'undetectable',
		});
	});

	it('rejects a surface the user switched off', () => {
		expect(judge(candidate(), settings({ enableInReading: false }))).toEqual({
			kind: 'reject',
			reason: 'disabled-context',
		});
	});

	it('checks the surface toggle after the length bounds', () => {
		// A one-character selection in a disabled surface reports the length,
		// because that is the rule the user can act on without hunting settings.
		const short = candidate({ text: 'a', context: context({ context: 'pdf' }) });
		expect(judge(short, settings({ minSelectionLength: 3, enableInPdf: false }))).toEqual({
			kind: 'reject',
			reason: 'too-short',
		});
	});

	it('routes a properties selection through its own toggle', () => {
		const inProps = candidate({ context: context({ inProperties: true }) });
		expect(judge(inProps, settings({ enableInProperties: false }))).toEqual({
			kind: 'reject',
			reason: 'disabled-context',
		});
		// The reading toggle must not decide this one.
		expect(judge(inProps, settings({ enableInReading: false }))).toEqual({ kind: 'accept' });
	});
});

describe('isSamePosition', () => {
	const at = (text: string, left: number, top: number) => ({ text, left, top });

	it('calls an identical selection the same', () => {
		expect(isSamePosition(at('word', 10, 20), at('word', 10, 20))).toBe(true);
	});

	it('tolerates sub-pixel movement', () => {
		// Fractional zoom reflows by fractions of a pixel; that is not a move.
		expect(isSamePosition(at('word', 10, 20), at('word', 10.4, 20.9))).toBe(true);
	});

	it('calls the same words elsewhere a different selection', () => {
		expect(isSamePosition(at('word', 10, 20), at('word', 10, 40))).toBe(false);
	});

	it('calls different words at the same spot a different selection', () => {
		expect(isSamePosition(at('word', 10, 20), at('other', 10, 20))).toBe(false);
	});
});

describe('isDeliberateRequest', () => {
	it('treats a double click and a command as instructions', () => {
		expect(isDeliberateRequest('double-click')).toBe(true);
		expect(isDeliberateRequest('command')).toBe(true);
	});

	it('treats everything else as an observation', () => {
		for (const cause of ['mouse', 'keyboard', 'selectionchange']) {
			expect(isDeliberateRequest(cause)).toBe(false);
		}
	});
});
