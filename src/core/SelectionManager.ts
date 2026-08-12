import {
	DOUBLE_CLICK_GUARD_MS,
	IGNORED_SELECTORS,
	RESIZE_DEBOUNCE_MS,
	SELECTION_CHANGE_DEBOUNCE_MS,
	SIDEBAR_SELECTORS,
} from '../constants';
import { detectContext, type ContextInfo } from './ContextDetector';
import { isDeliberateRequest, isSamePosition, judge, type RejectionReason } from './SelectionRules';
import { DomSelectionSource } from '../selection/DomSelectionSource';
import { InputSelectionSource } from '../selection/InputSelectionSource';
import { PdfSelectionSource } from '../selection/PdfSelectionSource';
import type { RawSelection } from '../selection/SelectionSource';
import type { SelectionSnapshot } from '../types';
import type { SelectionTranslateSettings } from '../settings/settings';
import { collectScrollableAncestors, isInsideOwnUi, last, toElement, unionRects } from '../utils/dom';
import { AMBIENT_TIMERS, debounce, type TimerHost } from '../utils/debounce';
import { debug } from '../utils/log';

/** What prompted a selection to be evaluated. */
export type SelectionCause = 'mouse' | 'keyboard' | 'selectionchange' | 'double-click' | 'command';

/** Why a previously reported selection is no longer valid. */
export type ClearReason = RejectionReason;

export interface SelectionManagerHandlers {
	/** A usable selection exists. The snapshot is already detached from the DOM. */
	onSelection(snapshot: SelectionSnapshot, cause: SelectionCause): void;
	/** No usable selection remains. */
	onClear(reason: ClearReason): void;
	/** Pointer went down somewhere outside the plugin's own UI. */
	onPointerDownOutside(event: PointerEvent): void;
	/** The viewport moved under the selection. */
	onViewportChange(kind: 'scroll' | 'resize'): void;
	/** Escape was pressed outside the plugin's own UI. */
	onEscape(): void;
}

/** Outcome of trying to read a selection out of a window. */
type CaptureResult =
	| { kind: 'snapshot'; snapshot: SelectionSnapshot }
	| {
			kind: 'none';
			reason: ClearReason;
			/**
			 * Hide the floating UI but keep the snapshot.
			 *
			 * Set when the selection was lost to Obsidian's own chrome taking
			 * focus rather than to the user selecting something else.
			 */
			retain?: boolean;
	  }
	// Selection is inside the plugin's own popup: neither a new request nor a
	// reason to tear down what is on screen.
	| { kind: 'ignore' };

/**
 * Watches every window for selections and turns them into snapshots.
 *
 * Owns all DOM event wiring. Two invariants are worth stating outright:
 *
 * 1. **Snapshot early.** Geometry and text are copied the moment a selection is
 *    detected, never re-read later. Pressing the mouse on the trigger icon
 *    collapses the live selection before any click handler runs, so anything
 *    read at click time is already gone.
 * 2. **Every window, not just the first.** Obsidian popouts have their own
 *    `Document`, and a listener bound to the main one never fires there.
 */
export class SelectionManager {
	private readonly domSource = new DomSelectionSource();
	private readonly inputSource = new InputSelectionSource();
	private readonly pdfSource = new PdfSelectionSource();

	private readonly teardowns = new Map<Window, Array<() => void>>();
	/**
	 * Deferred evaluations, keyed by timer id and remembering their window.
	 *
	 * The window has to be carried along: timer ids are scoped to the window
	 * that created them, so cancelling one requires calling `clearTimeout` on
	 * that same window rather than on whichever global happens to be in scope.
	 */
	private readonly pendingTimers = new Map<number, Window>();

	private current: SelectionSnapshot | null = null;
	private snapshotSeq = 0;

	/**
	 * Timestamp until which `mouseup` is ignored.
	 *
	 * A double click fires `mouseup` twice and then `dblclick`; without this the
	 * trailing `mouseup` would re-evaluate the same selection and pop a second
	 * icon on top of the popup the double click just opened.
	 */
	private doubleClickGuardUntil = 0;

	/**
	 * Whether a mouse button is currently held.
	 *
	 * `selectionchange` fires on every character as a drag grows, so without
	 * this the plugin reports "Domai" and then "Domain" as two separate
	 * selections mid-gesture. With auto-popup enabled that is two wasted API
	 * calls for one user action. The drag's real result arrives on `mouseup`.
	 */
	private pointerIsDown = false;

	/** Last pointer position, for the cursor-following icon placement. */
	private lastCursor: { x: number; y: number } | null = null;

	private readonly onSelectionChangeDebounced: ((win: Window) => void) & { cancel: () => void };
	private readonly onResizeDebounced: (() => void) & { cancel: () => void };

	/**
	 * @param timers Window whose timers the debounces run on. Defaults to the
	 * ambient globals so the unit tests, which have no window, still work; the
	 * plugin passes the real one, because a popout's timers die with it.
	 */
	constructor(
		private readonly getSettings: () => SelectionTranslateSettings,
		private readonly handlers: SelectionManagerHandlers,
		timers: TimerHost = AMBIENT_TIMERS
	) {
		this.onSelectionChangeDebounced = debounce(
			(win: Window) => {
				this.evaluate(win, 'selectionchange');
			},
			SELECTION_CHANGE_DEBOUNCE_MS,
			timers
		);

		this.onResizeDebounced = debounce(
			() => {
				this.handlers.onViewportChange('resize');
			},
			RESIZE_DEBOUNCE_MS,
			timers
		);
	}

	/** The most recent usable selection, or null. Backs the Obsidian command. */
	getCurrentSnapshot(): SelectionSnapshot | null {
		return this.current;
	}

	/** Forgets the current selection without notifying handlers. */
	reset(): void {
		this.current = null;
	}

	/**
	 * Binds listeners to one window.
	 *
	 * Listeners are added directly and their removers tracked, rather than going
	 * through `registerDomEvent`. The reason is `detach`: Obsidian only releases
	 * `registerDomEvent` handlers when the whole plugin unloads, so a session
	 * that opens and closes popouts repeatedly would accumulate registrations
	 * against dead documents. The plugin registers {@link destroy} with its own
	 * component, so unload cleanup is still automatic.
	 */
	attach(win: Window): void {
		if (this.teardowns.has(win)) return;

		const doc = win.document;
		const teardowns: Array<() => void> = [];

		const onDoc = <K extends keyof DocumentEventMap>(
			type: K,
			handler: (event: DocumentEventMap[K]) => void,
			options?: AddEventListenerOptions
		): void => {
			const listener = handler as EventListener;
			doc.addEventListener(type, listener, options);
			teardowns.push(() => doc.removeEventListener(type, listener, options));
		};

		onDoc('mouseup', (event) => this.handleMouseUp(event, win));
		onDoc('keyup', (event) => this.handleKeyUp(event, win));
		onDoc('keydown', (event) => this.handleKeyDown(event));
		onDoc('dblclick', (event) => this.handleDoubleClick(event, win));
		// `selectionchange` is the only signal touch devices reliably emit, and it
		// also catches selections made by other plugins or by the app itself.
		onDoc('selectionchange', () => {
			if (this.pointerIsDown) return;
			this.onSelectionChangeDebounced(win);
		});
		// Capture phase: the click that dismisses the popup must be seen even if
		// the element under the pointer stops propagation.
		onDoc('pointerdown', (event) => this.handlePointerDown(event), { capture: true });
		onDoc('pointerup', (event) => this.handlePointerUp(event), { capture: true });
		// A pointer released outside the window never emits `pointerup` there,
		// which would otherwise leave the drag flag stuck on.
		onDoc('pointercancel', () => {
			this.pointerIsDown = false;
		});
		// Scroll does not bubble, so it is only observable from the capture phase
		// on the document. Passive because this handler never prevents default.
		onDoc('scroll', (event) => this.handleScroll(event), {
			capture: true,
			passive: true,
		});

		const resizeListener = (): void => this.onResizeDebounced();
		win.addEventListener('resize', resizeListener);
		teardowns.push(() => win.removeEventListener('resize', resizeListener));

		this.teardowns.set(win, teardowns);
		debug('selection listeners attached', { windows: this.teardowns.size });
	}

	/** Unbinds everything bound to one window. Safe to call for unknown windows. */
	detach(win: Window): void {
		const teardowns = this.teardowns.get(win);
		if (teardowns == null) return;

		for (const teardown of teardowns) teardown();
		this.teardowns.delete(win);
		// A queued evaluation would run against a document that no longer exists.
		this.cancelPendingFor(win);

		// A snapshot taken in a window that just closed can never be translated.
		if (this.current?.win === win) this.current = null;
	}

	/** Full teardown. Registered with the plugin so unload calls it. */
	destroy(): void {
		for (const win of Array.from(this.teardowns.keys())) this.detach(win);
		for (const [timer, win] of this.pendingTimers) win.clearTimeout(timer);
		this.pendingTimers.clear();
		this.onSelectionChangeDebounced.cancel();
		this.onResizeDebounced.cancel();
		this.current = null;
	}

	/* ── Event handlers ───────────────────────────────────────────────────── */

	private handleMouseUp(event: MouseEvent, win: Window): void {
		// Still mid-drag: a button is down, so the selection is not final.
		if (event.buttons !== 0) return;
		if (this.isWithinDoubleClickGuard()) return;
		if (isInsideOwnUi(event.target as Node | null)) return;

		this.lastCursor = { x: event.clientX, y: event.clientY };

		// The selection is not yet settled when mouseup fires; deferring by one
		// task lets the browser finish updating it.
		this.deferEvaluate(win, 'mouse');
	}

	/**
	 * Watches for Escape, and nothing else.
	 *
	 * The trigger key used to be routed through here as well. It now lives in an
	 * Obsidian keymap scope that only exists while the button does, which is both
	 * the platform's own mechanism for a temporary key and one fewer document
	 * listener carrying a rule about when it applies.
	 */
	private handleKeyDown(event: KeyboardEvent): void {
		if (isInsideOwnUi(event.target as Node | null)) return;
		if (event.key !== 'Escape') return;

		this.handlers.onEscape();
	}

	/**
	 * Ignores scrolling that happens inside the plugin's own UI.
	 *
	 * A long result scrolls within the popup, and treating that as the viewport
	 * moving would dismiss the very thing the user is reading.
	 */
	private handleScroll(event: Event): void {
		if (isInsideOwnUi(event.target as Node | null)) return;
		this.handlers.onViewportChange('scroll');
	}

	private handleKeyUp(event: KeyboardEvent, win: Window): void {
		// Shift+arrows extend a selection; Ctrl/Cmd+A replaces it. Every other
		// key either does not change the selection or collapses it, and the
		// collapse is picked up by `selectionchange`.
		const isExtend = event.shiftKey;
		const isSelectAll = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a';
		if (!isExtend && !isSelectAll) return;

		this.deferEvaluate(win, 'keyboard');
	}

	private handleDoubleClick(event: MouseEvent, win: Window): void {
		if (isInsideOwnUi(event.target as Node | null)) return;

		this.doubleClickGuardUntil = Date.now() + DOUBLE_CLICK_GUARD_MS;
		this.deferEvaluate(win, 'double-click');
	}

	private handlePointerDown(event: PointerEvent): void {
		this.pointerIsDown = true;
		this.lastCursor = { x: event.clientX, y: event.clientY };

		if (isInsideOwnUi(event.target as Node | null)) return;
		this.handlers.onPointerDownOutside(event);
	}

	private handlePointerUp(event: PointerEvent): void {
		this.pointerIsDown = false;
		this.lastCursor = { x: event.clientX, y: event.clientY };
	}

	private isWithinDoubleClickGuard(): boolean {
		return Date.now() < this.doubleClickGuardUntil;
	}

	/** Runs an evaluation on the next task, tracking the timer for teardown. */
	private deferEvaluate(win: Window, cause: SelectionCause): void {
		const timer = win.setTimeout(() => {
			this.pendingTimers.delete(timer);
			this.evaluate(win, cause);
		}, 0);
		this.pendingTimers.set(timer, win);
	}

	/** Drops deferred evaluations belonging to one window. */
	private cancelPendingFor(win: Window): void {
		for (const [timer, owner] of Array.from(this.pendingTimers)) {
			if (owner !== win) continue;
			win.clearTimeout(timer);
			this.pendingTimers.delete(timer);
		}
	}

	/* ── Evaluation ───────────────────────────────────────────────────────── */

	/** Reads the current selection and notifies handlers of the outcome. */
	evaluate(win: Window, cause: SelectionCause): void {
		const result = this.capture(win);

		if (result.kind === 'ignore') return;

		if (result.kind === 'none') {
			/*
			 * Logged even when nothing was on screen to clear. Without this a
			 * rejected selection produces no trace at all, so "I selected text
			 * and nothing happened" cannot be told apart from "the plugin never
			 * saw it" — which is exactly the dead end this used to create for a
			 * selection above the length limit.
			 */
			// "empty" fires after every dismissal and says nothing useful; the
			// other reasons are the ones worth being able to find in a log.
			if (result.reason !== 'empty' || this.current !== null) {
				debug('selection rejected', result.reason);
			}

			if (this.current !== null) {
				if (result.retain !== true) this.current = null;
				this.handlers.onClear(result.reason);
			}
			return;
		}

		const snapshot = result.snapshot;

		/*
		 * One gesture reaches this method more than once: `selectionchange`
		 * fires as the drag settles and `mouseup` fires right after, both
		 * describing the same highlighted text. Re-reporting it would rebuild
		 * the icon (a visible flicker) and, with auto-popup on, spend a second
		 * API call on an identical request.
		 *
		 * Double clicks and commands are exempt because they are not
		 * observations of a selection but instructions to act on one, and the
		 * user may well repeat the same instruction on the same word.
		 */
		if (!isDeliberateRequest(cause) && this.isSameAsCurrent(snapshot)) return;

		this.current = snapshot;
		debug('selection', {
			cause,
			context: snapshot.context,
			inProperties: snapshot.inProperties,
			length: snapshot.text.length,
			text: snapshot.text.length > 80 ? `${snapshot.text.slice(0, 80)}…` : snapshot.text,
		});
		this.handlers.onSelection(snapshot, cause);
	}

	/**
	 * Reads a selection and applies every validity rule.
	 *
	 * Sources are tried in order of specificity: a focused `<input>` shadows the
	 * document selection entirely, and the PDF text-layer fallback only runs
	 * when the ordinary path found nothing.
	 */
	private capture(win: Window): CaptureResult {
		const settings = this.getSettings();

		let raw = this.inputSource.capture(win);
		if (raw == null) raw = this.domSource.capture(win);
		if (raw == null && settings.pdfSelectionFallback) raw = this.pdfSource.capture(win);

		if (raw == null) {
			/*
			 * Opening the command palette focuses its input, which collapses the
			 * selection. Forgetting the snapshot here would leave the "translate
			 * selection" command with nothing to act on — and that command exists
			 * precisely to act on what is selected, so it would never work.
			 *
			 * The floating UI is still dismissed; only the snapshot survives, and
			 * only while the chrome that stole the focus is open.
			 */
			const focusMovedToChrome =
				toElement(win.document.activeElement)?.closest(IGNORED_SELECTORS) != null;

			return { kind: 'none', reason: 'empty', retain: focusMovedToChrome };
		}

		// Every DOM question the rules need, answered here so they need none of
		// their own. The context is worked out up front rather than after the
		// cheap tests because `judge` decides the order, not this method.
		const referenceEl = toElement(raw.referenceNode);
		const info = detectContext(raw.referenceNode, win.document.body);

		const verdict = judge(
			{
				text: raw.text,
				insideOwnUi: isInsideOwnUi(raw.referenceNode),
				inIgnoredSurface: referenceEl?.closest(IGNORED_SELECTORS) != null,
				inSidebar: referenceEl?.closest(SIDEBAR_SELECTORS) != null,
				context: info,
			},
			settings
		);

		if (verdict.kind === 'ignore') return { kind: 'ignore' };
		if (verdict.kind === 'reject') return { kind: 'none', reason: verdict.reason };

		// `judge` returning accept is what guarantees this is non-null.
		if (info == null) return { kind: 'none', reason: 'undetectable' };

		return { kind: 'snapshot', snapshot: this.buildSnapshot(win, raw, info) };
	}

	private buildSnapshot(win: Window, raw: RawSelection, info: ContextInfo): SelectionSnapshot {
		const bbox = unionRects(raw.rects);
		const anchorRect = last(raw.rects) ?? bbox;

		return {
			text: raw.text,
			rects: raw.rects,
			bbox,
			anchorRect,
			context: info.context,
			inProperties: info.inProperties,
			win,
			containerEl: info.containerEl,
			contentEl: info.contentEl,
			// Remembered so focus can be handed back when the popup closes.
			activeElement: win.document.activeElement,
			cursor: this.lastCursor,
			// Wrapped, not passed by reference: the sources implement this as a
			// closure and detaching it from its object is a scoping hazard the
			// linter is right to flag.
			getLiveRects: () => raw.getLiveRects(),
			// Recorded here, not on first scroll: the offsets have to be the ones
			// in force when `rects` above was measured, or the two disagree by
			// however far the user scrolled in between.
			scrollAnchors: collectScrollableAncestors(toElement(raw.referenceNode), info.containerEl),
			id: ++this.snapshotSeq,
		};
	}

	/**
	 * Whether a freshly read selection is the one already on screen.
	 *
	 * The window comparison stays here rather than in the rules: a `Window` is
	 * the one thing in this test that cannot cross into a plain Node process.
	 */
	private isSameAsCurrent(snapshot: SelectionSnapshot): boolean {
		const current = this.current;
		if (current == null) return false;
		if (current.win !== snapshot.win) return false;

		return isSamePosition(
			{ text: current.text, left: current.bbox.left, top: current.bbox.top },
			{ text: snapshot.text, left: snapshot.bbox.left, top: snapshot.bbox.top }
		);
	}
}
