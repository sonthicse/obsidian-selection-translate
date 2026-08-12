import type { App } from 'obsidian';
import {
	ICON_SIZE,
	OCCLUSION_SELECTORS,
	OWN_UI_SELECTOR,
	SCROLLER_SELECTORS,
	VIEWPORT_MARGIN,
	WHEEL_LINE_HEIGHT_FALLBACK,
} from '../constants';
import { StateMachine, type MachineContext } from '../core/StateMachine';
import { TriggerKeyScope } from '../core/HotkeyManager';
import type { SelectionCause } from '../core/SelectionManager';
import type { SelectionTranslateSettings } from '../settings/settings';
import {
	makeRect,
	type Rect,
	type SelectionSnapshot,
	type TranslationResult,
	type UiErrorInfo,
} from '../types';
import { last, scrollDelta, toElement, unionRects } from '../utils/dom';
import { debug } from '../utils/log';
import {
	canScrollBy,
	findScrollTarget,
	normalizeWheelDelta,
	type ScrollMetrics,
} from '../utils/scroll';
import { TriggerIcon } from './TriggerIcon';
import { TranslatePopup } from './TranslatePopup';
import { FloatingLayer } from './FloatingLayer';
import {
	DEFAULT_PLACEMENT_ORDER,
	computeCandidate,
	insetRect,
	intersectRects,
	offsetRect,
	place,
	type Placement,
	type PlacementRequest,
	type Size,
} from './Positioner';

/** Where the selection is right now, as opposed to where it was snapshotted. */
interface AnchorGeometry {
	bbox: Rect;
	anchorRect: Rect;
	/** How far the selection has moved since the snapshot, for the cursor placement. */
	dx: number;
	dy: number;
}

export interface UiControllerOptions {
	app: App;
	getSettings: () => SelectionTranslateSettings;
	/** Invoked when the user asks for a translation. Wired to the orchestrator. */
	onTranslateRequested: (snapshot: SelectionSnapshot) => void;
	/** Opens the engine dropdown, offered when the current engine cannot help. */
	onChangeProvider: () => void;
	/** Starts or stops reading the source text aloud. */
	onSpeak: (win: Window, text: string, lang: string) => void;
	/** Consulted so the read button can show its stop state. */
	tts: { isSpeaking(): boolean; subscribe(listener: (speaking: boolean) => void): () => void };
}

const OCCLUSION_QUERY = OCCLUSION_SELECTORS.join(', ');

/**
 * Drives the floating UI from selection events.
 *
 * The one place in the plugin that both touches the DOM and decides what should
 * be on screen. Everything geometric it needs — where the icon fits, whether
 * something is in the way — is delegated to the pure functions in Positioner;
 * this class only supplies the measurements.
 */
export class UiController {
	readonly machine = new StateMachine();
	/** The two floating elements and every geometric question about them. */
	private readonly layer: FloatingLayer;
	/** The local trigger key, live only while the button is. */
	private readonly triggerKey: TriggerKeyScope;

	/**
	 * The candidate the full placement search settled on, reused while scrolling.
	 *
	 * Without this the icon would re-run the search on every frame and flip from
	 * below the selection to above it halfway down a scroll — correct by the
	 * rules, and deeply distracting to watch. The search runs again only when the
	 * geometry genuinely changes underneath it: a new selection, a resize, or the
	 * popup growing to fit its result.
	 */
	private iconPlacement: Placement | null = null;
	private popupPlacement: Placement | null = null;

	/**
	 * The frame scheduled to re-anchor the UI, and the window that owns it.
	 *
	 * Scroll fires hundreds of times per gesture; collapsing them into at most
	 * one pending frame is the difference between following the text and
	 * stuttering behind it. The window is carried because frame handles belong
	 * to the window that issued them, and a selection may live in a popout.
	 */
	private pendingFrame: number | null = null;
	private pendingFrameWin: Window | null = null;

	constructor(private readonly options: UiControllerOptions) {
		const icon = new TriggerIcon(
			() => this.handleIconTrigger(),
			() => this.options.getSettings().popupTheme === 'follow',
			(event) => this.handleWheel(event)
		);

		const popup = new TranslatePopup(options.app, options.getSettings, {
			place: (size) => this.placePopup(size),
			onClose: () => this.dismiss(),
			onRetry: () => this.retry(),
			onOpenSettings: () => this.dismiss(),
			onChangeProvider: () => {
				this.dismiss();
				this.options.onChangeProvider();
			},
			onSpeak: (text, lang) => {
				const win = this.machine.getSnapshot()?.win;
				if (win != null) this.options.onSpeak(win, text, lang);
			},
			onWheel: (event) => this.handleWheel(event),
			isSpeaking: () => this.options.tts.isSpeaking(),
			subscribeSpeaking: (listener) => this.options.tts.subscribe(listener),
		});

		this.layer = new FloatingLayer(icon, popup);

		this.triggerKey = new TriggerKeyScope({
			app: options.app,
			getBinding: () => this.options.getSettings().triggerHotkey,
			getContext: () => this.machine.getSnapshot()?.context ?? null,
			isActive: () => this.isIconActive(),
			fire: () => this.handleIconTrigger(),
		});

		/*
		 * The popup renders from the machine rather than from its callers. That
		 * is the whole point of routing every change through one transition:
		 * there is exactly one place that decides what is on screen, so a state
		 * reached by an unusual path still renders correctly.
		 */
		this.machine.subscribe((context) => this.render(context));
	}

	/** Draws whatever the machine currently holds. */
	private render(context: MachineContext): void {
		// The trigger key belongs to the button, so it is claimed and released
		// from the same place the button is drawn from. Hanging it off the state
		// rather than off each call site is what makes the unusual exits — a
		// dismiss, a change of leaf, the plugin unloading — release it too.
		if (context.state === 'icon') {
			this.triggerKey.claim();
		} else {
			this.triggerKey.release();
		}

		switch (context.state) {
			case 'idle':
				this.layer.icon.hide();
				this.layer.popup.close();
				return;
			case 'icon':
				this.layer.popup.close();
				return;
			case 'loading':
				if (context.snapshot != null) this.layer.popup.showLoading(context.snapshot);
				return;
			case 'result':
				if (context.result != null) this.layer.popup.showResult(context.result);
				return;
			case 'error':
				if (context.error != null) this.layer.popup.showError(context.error);
				return;
		}
	}

	/** Repeats the request that failed. */
	private retry(): void {
		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) return;

		if (!this.machine.transition({ to: 'loading', snapshot })) return;
		this.options.onTranslateRequested(snapshot);
	}

	/**
	 * Puts a popup of a given size where it belongs.
	 *
	 * Uses the same candidate search as the icon, which gives the flip-above
	 * behaviour for free: a tall result near the bottom of the screen simply
	 * fails the below-centre fit test and lands above the selection instead.
	 *
	 * Called on every size change as well as from the scroll path, so opening a
	 * popup, growing one and scrolling one all answer the question the same way:
	 * a popup placed for a selection that has already left the leaf must not
	 * draw over the tab header just because no scroll has happened yet.
	 */
	private placePopup(size: Size): void {
		const snapshot = this.machine.getSnapshot();

		if (snapshot == null) {
			const rect = makeRect(VIEWPORT_MARGIN, VIEWPORT_MARGIN, size.width, size.height);
			this.layer.applyGeometry(this.layer.popup, rect, null);
			return;
		}

		// No occlusion test for the popup: it is the thing the user just asked
		// for, so covering a toolbar with it is correct, and probing six
		// candidates on every resize frame would not be free.
		const result = place(this.request(snapshot, this.anchorGeometry(snapshot), size));

		// Remembered so the scroll path can reproduce this decision instead of
		// making a fresh one every frame.
		this.popupPlacement = result.placement;
		this.layer.applyGeometry(this.layer.popup, result.rect, snapshot);
	}

	/** A usable selection appeared. Decides between showing the icon and translating. */
	handleSelection(snapshot: SelectionSnapshot, cause: SelectionCause): void {
		const settings = this.options.getSettings();

		// Double click means "translate this word", so it skips the icon
		// entirely — the user has already expressed intent.
		if (cause === 'double-click' && settings.translateOnDoubleClick) {
			this.requestTranslate(snapshot);
			return;
		}

		if (settings.autoPopupOnSelection) {
			this.requestTranslate(snapshot);
			return;
		}

		if (!this.machine.transition({ to: 'icon', snapshot })) return;
		this.showIcon(snapshot);
	}

	/** The selection went away. */
	handleClear(): void {
		this.dismiss();
	}

	/** Escape, or a click somewhere else. */
	handleDismiss(): void {
		this.dismiss();
	}

	/**
	 * The viewport moved. Both the icon and the popup follow their text.
	 *
	 * They used to be dismissed instead, on the reasoning that scrolled-away text
	 * makes them meaningless — but the text is still selected, and losing the UI
	 * for nudging the wheel is worse than tracking it. Only Escape, a click
	 * outside, the selection going away, or a change of leaf, file or layout
	 * closes them now.
	 *
	 * Scroll and resize take different paths on purpose. A scroll moves the
	 * anchor and nothing else, so re-running one known-good candidate is both
	 * enough and cheap. A resize changes the boundary itself, which can make the
	 * chosen candidate genuinely wrong, so it earns the full search.
	 */
	handleViewportChange(kind: 'scroll' | 'resize'): void {
		if (this.machine.getState() === 'idle') return;

		if (kind === 'resize') {
			this.cancelPendingFrame();
			this.replaceFully();
			return;
		}
		this.scheduleReanchor();
	}

	/**
	 * The wheel turned over the floating UI. Hands the gesture to the note.
	 *
	 * The popup and the icon are children of `document.body` with fixed
	 * positioning — see {@link TriggerIcon} for why that is not negotiable — so
	 * the scroll chain Chromium walks for them is `.st-popup → body → html`, none
	 * of which scrolls in Obsidian. The scroller that should have moved is
	 * `.cm-scroller` or the PDF container, neither of which is an ancestor of the
	 * popup, so without this the wheel does nothing at all while the pointer sits
	 * over a result — and the popup is exactly where the pointer sits, because it
	 * opens under it.
	 *
	 * Nothing here stops propagation. The `scroll` event the forwarded gesture
	 * produces is fired at the real scroller, which is outside our own UI, so
	 * {@link SelectionManager.handleScroll} still reports it and the popup keeps
	 * tracking its text.
	 */
	handleWheel(event: WheelEvent): void {
		// Ctrl+wheel is the zoom gesture in both Obsidian and the PDF viewer.
		// Forwarding it as scroll would move the note out from under a zoom.
		if (event.ctrlKey) return;

		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) return;

		// Every line below touches DOM the plugin does not own, on a listener that
		// fires continuously; one throw here would break scrolling for the rest of
		// the session.
		try {
			const win = snapshot.win;
			const read = (el: Element): ScrollMetrics => readScrollMetrics(win, el);
			const { dx, dy } = normalizeWheelDelta(
				event.deltaX,
				event.deltaY,
				event.deltaMode,
				lineHeightOf(win),
				win.innerHeight,
				win.innerWidth
			);

			const start = toElement(event.target as Node | null);
			const ownRoot = start?.closest(OWN_UI_SELECTOR) ?? null;

			// Our own content gets first refusal, so a long result scrolls inside
			// the popup and only chains outward once it has reached its end. The
			// browser does that natively, hence leaving the event untouched.
			if (findScrollTarget(start, dx, dy, read, ownRoot) != null) return;

			const target = this.outerScroller(snapshot, dx, dy, read);
			if (target == null) return;

			target.scrollBy({ left: dx, top: dy });
			event.preventDefault();
		} catch (cause) {
			debug('wheel forwarding failed', cause);
		}
	}

	/**
	 * The surface behind the popup that should take a forwarded gesture.
	 *
	 * The snapshot's own anchors come first because they are the boxes the
	 * selection actually sits in, innermost first, and they already survive CM6
	 * recycling the text — but not the leaf being torn down, hence the connected
	 * check. The named scrollers are the fallback for a selection whose anchors
	 * are all at their end or were never scrollable, and the leaf itself is the
	 * last resort so the gesture is never simply swallowed.
	 */
	private outerScroller(
		snapshot: SelectionSnapshot,
		dx: number,
		dy: number,
		read: (el: Element) => ScrollMetrics
	): Element | null {
		for (const anchor of snapshot.scrollAnchors) {
			if (!anchor.el.isConnected) continue;
			if (canScrollBy(read(anchor.el), dx, dy)) return anchor.el;
		}

		return snapshot.containerEl.querySelector(SCROLLER_SELECTORS) ?? snapshot.containerEl;
	}

	/**
	 * A translation came back.
	 *
	 * The transition can legitimately be refused — the user may have pressed
	 * Escape while the request was in flight — and refusing it is the whole
	 * point: a late reply must not reopen dismissed UI.
	 */
	handleResult(snapshot: SelectionSnapshot, result: TranslationResult): void {
		this.machine.transition({ to: 'result', snapshot, result });
	}

	/** A translation failed. */
	handleError(snapshot: SelectionSnapshot, error: UiErrorInfo): void {
		this.machine.transition({ to: 'error', snapshot, error });
	}

	/** Translates the current selection, if there is one. Backs the command. */
	translateCurrent(snapshot: SelectionSnapshot): void {
		this.requestTranslate(snapshot);
	}

	/**
	 * True when the icon is showing and the local trigger key should apply.
	 *
	 * The visibility half matters: an icon scrolled out of its leaf is clipped
	 * away, and a key that translates something the user cannot see is a key
	 * that appears to do nothing.
	 */
	private isIconActive(): boolean {
		return this.machine.getState() === 'icon' && this.layer.icon.isVisible();
	}

	destroy(): void {
		this.cancelPendingFrame();
		// Unconditional, and before anything else: a scope left on Obsidian's
		// stack outlives the plugin and breaks the keyboard everywhere else.
		this.triggerKey.release();
		this.layer.destroy();
		this.machine.destroy();
	}

	/* ── Anchor tracking ──────────────────────────────────────────────────── */

	/** Queues a re-anchor, replacing any frame that has not run yet. */
	private scheduleReanchor(): void {
		const win = this.machine.getSnapshot()?.win;
		if (win == null) return;

		this.cancelPendingFrame();
		this.pendingFrameWin = win;
		this.pendingFrame = win.requestAnimationFrame(() => {
			this.pendingFrame = null;
			this.pendingFrameWin = null;
			this.reanchor();
		});
	}

	private cancelPendingFrame(): void {
		if (this.pendingFrame === null) return;

		this.pendingFrameWin?.cancelAnimationFrame(this.pendingFrame);
		this.pendingFrame = null;
		this.pendingFrameWin = null;
	}

	/**
	 * Moves whatever is on screen back onto its selection.
	 *
	 * Runs once per animation frame at most, so everything it does has to be
	 * cheap: two rect reads, one candidate computation, one class toggle. No
	 * clamping and no occlusion probe — see {@link computeCandidate}.
	 *
	 * The rect is computed before the visibility question is asked, because the
	 * answer is about the rect and not about the selection behind it. It is then
	 * applied even while hidden: moving an invisible element costs two style
	 * writes, and skipping them means scrolling back shows the popup at last
	 * frame's coordinates and only catches up on the frame after.
	 */
	private reanchor(): void {
		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) return;

		const geometry = this.anchorGeometry(snapshot);
		const showingIcon = this.machine.getState() === 'icon';

		const size = showingIcon ? { width: ICON_SIZE, height: ICON_SIZE } : this.layer.popup.getSize();
		if (size == null) return;

		const placement = showingIcon ? this.iconPlacement : this.popupPlacement;
		const rect = this.stickyRect(snapshot, geometry, placement, size);
		if (rect == null) return;

		this.layer.applyGeometry(showingIcon ? this.layer.icon : this.layer.popup, rect, snapshot);
	}

	/** The one remembered candidate, recomputed against the current anchor. */
	private stickyRect(
		snapshot: SelectionSnapshot,
		geometry: AnchorGeometry,
		placement: Placement | null,
		size: Size
	): Rect | null {
		return computeCandidate(placement ?? 'below-center', this.request(snapshot, geometry, size));
	}

	/** Re-runs the full placement search for whatever is currently on screen. */
	private replaceFully(): void {
		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) return;

		if (this.machine.getState() === 'icon') {
			this.showIcon(snapshot);
			return;
		}
		this.layer.popup.replace();
	}

	/**
	 * Where the selection is now, from the live measurement or from scroll offsets.
	 *
	 * Tier one is exact and survives reflow, but stops answering once CM6 has
	 * recycled the nodes. Tier two never asks the text anything — it shifts the
	 * frozen rect by how far the scrollers have travelled — so it keeps working
	 * through virtualization and on PDF pages, at the cost of ignoring any
	 * relayout that was not a scroll.
	 */
	private anchorGeometry(snapshot: SelectionSnapshot): AnchorGeometry {
		const live = readLiveRects(snapshot);

		if (live != null) {
			const bbox = unionRects(live);
			return {
				bbox,
				anchorRect: last(live) ?? bbox,
				dx: bbox.left - snapshot.bbox.left,
				dy: bbox.top - snapshot.bbox.top,
			};
		}

		const { dx, dy } = scrollDelta(snapshot.scrollAnchors);
		return {
			bbox: offsetRect(snapshot.bbox, dx, dy),
			anchorRect: offsetRect(snapshot.anchorRect, dx, dy),
			dx,
			dy,
		};
	}

	/** A placement request describing the selection where it currently sits. */
	private request(
		snapshot: SelectionSnapshot,
		geometry: AnchorGeometry,
		size: Size
	): PlacementRequest {
		const cursor = snapshot.cursor;

		return {
			bbox: geometry.bbox,
			anchorRect: geometry.anchorRect,
			size,
			boundary: this.computeBoundary(snapshot),
			offset: this.options.getSettings().iconOffset,
			order: DEFAULT_PLACEMENT_ORDER,
			// The pointer position is frozen in viewport space, so it has to travel
			// with the text; leaving it put would peg a cursor-placed icon to the
			// screen while everything it refers to scrolls away.
			cursor: cursor == null ? null : { x: cursor.x + geometry.dx, y: cursor.y + geometry.dy },
		};
	}

	/* ── Internals ────────────────────────────────────────────────────────── */

	private handleIconTrigger(): void {
		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) {
			// An icon on screen with no selection behind it should not be
			// reachable. Clear it rather than leaving a button that silently
			// does nothing when pressed.
			debug('icon triggered with no snapshot; clearing it');
			this.layer.icon.hide();
			return;
		}
		this.requestTranslate(snapshot);
	}

	private requestTranslate(snapshot: SelectionSnapshot): void {
		if (!this.machine.transition({ to: 'loading', snapshot })) return;

		this.layer.icon.hide();
		this.options.onTranslateRequested(snapshot);
	}

	/**
	 * Tears the floating UI down.
	 *
	 * Hiding is unconditional, and the state change is what gets skipped when
	 * there is nothing up. The order matters: clicks land outside the plugin
	 * constantly, and asking the machine to go from idle to idle each time would
	 * fill the debug log with rejected transitions, burying the ones that
	 * indicate a real bug — but skipping the hide as well would mean an icon
	 * that somehow outlived its state could never be cleared.
	 */
	private dismiss(): void {
		this.cancelPendingFrame();
		this.iconPlacement = null;
		this.popupPlacement = null;

		this.layer.icon.hide();
		if (this.machine.getState() === 'idle') return;

		this.machine.transition({ to: 'idle' });
	}

	/** Measures, places and shows the icon for a selection. */
	private showIcon(snapshot: SelectionSnapshot): void {
		const settings = this.options.getSettings();
		const geometry = this.anchorGeometry(snapshot);
		const size = { width: ICON_SIZE, height: ICON_SIZE };

		const result = place(
			{ ...this.request(snapshot, geometry, size), order: placementOrder(settings) },
			(rect) => this.isOccluded(snapshot.win, rect)
		);

		this.iconPlacement = result.placement;
		debug('icon placed', { placement: result.placement, clamped: result.clamped });

		this.layer.icon.show(snapshot.win);
		// Placed only once the element exists, and in one call — the clip matters
		// on the resize path too, where the icon may already have been scrolled
		// out of its leaf before the window changed size.
		this.layer.applyGeometry(this.layer.icon, result.rect, snapshot);
	}

	/**
	 * The region the icon must stay inside: the leaf's content, clipped to the
	 * viewport.
	 *
	 * Using the content box rather than the whole window is what keeps the icon
	 * off the PDF toolbar and the tab header — a selection on the first line of a
	 * document has no room below inside its own content box, so the placement
	 * search moves on to a candidate above it. The measurement itself belongs to
	 * {@link FloatingLayer}, which is the one place that knows what a leaf's
	 * content region is.
	 */
	private computeBoundary(snapshot: SelectionSnapshot): Rect {
		const win = snapshot.win;
		const viewport = insetRect(
			makeRect(0, 0, win.innerWidth, win.innerHeight),
			VIEWPORT_MARGIN
		);

		// A leaf scrolled entirely out of view yields no overlap; the viewport is
		// then the only sensible boundary left.
		return intersectRects(viewport, this.layer.contentRect(snapshot)) ?? viewport;
	}

	/**
	 * Whether something the user needs is already at that spot.
	 *
	 * Probes the centre of the candidate rect and looks at what is on top,
	 * ignoring the plugin's own floating UI. Only the topmost element counts:
	 * everything is stacked over *something*, and the question is what a click
	 * there would actually hit.
	 */
	private isOccluded(win: Window, rect: Rect): boolean {
		const doc = win.document;
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;

		const stack = doc.elementsFromPoint(x, y);
		for (const el of stack) {
			if (el.closest(OWN_UI_SELECTOR) != null) continue;
			return el.closest(OCCLUSION_QUERY) != null;
		}
		return false;
	}
}

/**
 * Tier one of the anchor, with a net under it.
 *
 * Each source already guards its own re-measurement, but this runs on every
 * scroll frame against DOM the plugin does not own; one unhandled throw here
 * would break scrolling for the rest of the session. Failing to null simply
 * hands the frame to the scroll-offset tier.
 */
function readLiveRects(snapshot: SelectionSnapshot): Rect[] | null {
	try {
		const rects = snapshot.getLiveRects();
		return rects != null && rects.length > 0 ? rects : null;
	} catch {
		return null;
	}
}

/** Live measurements of one box, in the shape the scroll rules expect. */
function readScrollMetrics(win: Window, el: Element): ScrollMetrics {
	const style = win.getComputedStyle(el);

	return {
		scrollTop: el.scrollTop,
		scrollHeight: el.scrollHeight,
		clientHeight: el.clientHeight,
		scrollLeft: el.scrollLeft,
		scrollWidth: el.scrollWidth,
		clientWidth: el.clientWidth,
		overflowX: style.overflowX,
		overflowY: style.overflowY,
	};
}

/**
 * How tall one line is in this window, for wheels that report lines.
 *
 * Read from the document rather than assumed, because the user's font size is
 * what a line delta is supposed to mean. `line-height: normal` computes to the
 * keyword rather than a length, which is the case the fallback covers.
 */
function lineHeightOf(win: Window): number {
	const style = win.getComputedStyle(win.document.body);
	const lineHeight = Number.parseFloat(style.lineHeight);
	if (Number.isFinite(lineHeight) && lineHeight > 0) return lineHeight;

	const fontSize = Number.parseFloat(style.fontSize);
	if (Number.isFinite(fontSize) && fontSize > 0) return fontSize * 1.2;

	return WHEEL_LINE_HEIGHT_FALLBACK;
}

/**
 * Candidate order for the user's chosen placement.
 *
 * The preference is moved to the front rather than used alone, so a spot that
 * does not fit still degrades through the remaining candidates instead of
 * landing clamped against an edge.
 */
function placementOrder(settings: SelectionTranslateSettings): readonly Placement[] {
	const preferred: Placement =
		settings.iconPlacement === 'cursor'
			? 'cursor'
			: settings.iconPlacement === 'above-center'
				? 'above-center'
				: 'below-center';

	return [preferred, ...DEFAULT_PLACEMENT_ORDER.filter((item) => item !== preferred)];
}
