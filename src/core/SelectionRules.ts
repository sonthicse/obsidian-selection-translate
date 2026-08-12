import { HARD_SELECTION_CAP } from '../constants';
import type { SelectionTranslateSettings } from '../settings/settings';
import type { ContextInfo } from './ContextDetector';
import { isContextEnabled } from './ContextDetector';

/** Why a candidate selection was turned down. */
export type RejectionReason =
	| 'empty'
	| 'ignored-surface'
	| 'too-short'
	| 'too-long'
	| 'disabled-context'
	| 'undetectable';

/**
 * What the rules need to know about a candidate, with no DOM in sight.
 *
 * The surface tests arrive already answered — whether the node sits in our own
 * UI, in transient chrome, or in a sidebar — because those are `closest()`
 * calls and this file is the part that has to run under plain Node.
 */
export interface Candidate {
	/** Selected text, verbatim. Trimming is the rules' business, not the caller's. */
	text: string;
	/** Selection is inside the plugin's own popup. */
	insideOwnUi: boolean;
	/** Selection is in a modal, the command palette, a suggestion popup… */
	inIgnoredSurface: boolean;
	/** Selection is in one of the side panels. */
	inSidebar: boolean;
	/** Detected surface, or null when it could not be worked out. */
	context: ContextInfo | null;
}

/** What the rules decided. `ignore` means leave whatever is on screen alone. */
export type Verdict =
	| { kind: 'accept' }
	| { kind: 'reject'; reason: RejectionReason }
	| { kind: 'ignore' };

/**
 * Every rule that decides whether a selection is worth reacting to.
 *
 * Pulled out of {@link SelectionManager} so the rules can be read in one place
 * and tested without a browser. The manager still owns the events, the sources
 * and the snapshot; this only answers yes or no, and says why when the answer
 * is no.
 *
 * The order is not arbitrary and is the reason this reads as a list rather
 * than a boolean expression: our own UI is checked before anything else so a
 * translation of a translation cannot loop, and length is checked after
 * surface so that selecting a whole modal does not report "too long".
 */
export function judge(candidate: Candidate, settings: SelectionTranslateSettings): Verdict {
	// Rule 3: never react to text inside our own popup, or translating a
	// translation would loop indefinitely.
	if (candidate.insideOwnUi) return { kind: 'ignore' };

	// Rule 4: transient chrome — modals, the command palette, suggestion
	// popups — is UI text, not content the user means to translate.
	if (candidate.inIgnoredSurface) return { kind: 'reject', reason: 'ignored-surface' };

	// Rule 4b: the same judgement, made structurally. Rule 4 names the classes
	// Obsidian happens to use today; this one only needs the side panels to
	// still be side panels, so a rewritten nav tree cannot quietly reopen the
	// hole it closes.
	if (candidate.inSidebar) return { kind: 'reject', reason: 'ignored-surface' };

	/*
	 * Rules 1 and 2: length bounds, measured on trimmed text so a selection
	 * of pure whitespace counts as empty.
	 *
	 * Only the absolute cap is applied here. The user's own
	 * `maxSelectionLength` is checked later, by the orchestrator, so that
	 * exceeding it opens a popup saying by how much — rejecting it at this
	 * point would produce no icon, no message and no log, which is
	 * indistinguishable from the plugin being broken.
	 */
	const trimmed = candidate.text.trim();
	if (trimmed.length === 0) return { kind: 'reject', reason: 'empty' };
	if (trimmed.length < settings.minSelectionLength) return { kind: 'reject', reason: 'too-short' };
	if (candidate.text.length > HARD_SELECTION_CAP) return { kind: 'reject', reason: 'too-long' };

	if (candidate.context == null) return { kind: 'reject', reason: 'undetectable' };

	// Rule 5: the surface must be switched on in settings.
	if (!isContextEnabled(candidate.context, settings)) {
		return { kind: 'reject', reason: 'disabled-context' };
	}

	return { kind: 'accept' };
}

/**
 * Whether a selection reported now is the one already on screen.
 *
 * Compares text and anchor position rather than identity: the same words
 * selected in a different place are a different request. The one-pixel
 * tolerance is what keeps a sub-pixel reflow from reading as a move.
 */
export function isSamePosition(
	a: { text: string; left: number; top: number },
	b: { text: string; left: number; top: number }
): boolean {
	return a.text === b.text && Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1;
}

/**
 * Whether a cause is an instruction rather than an observation.
 *
 * Double clicks and commands are exempt from the duplicate check because they
 * are not observations of a selection but instructions to act on one, and the
 * user may well repeat the same instruction on the same word.
 */
export function isDeliberateRequest(cause: string): boolean {
	return cause === 'double-click' || cause === 'command';
}
