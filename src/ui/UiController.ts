import type { App } from 'obsidian';
import { ICON_SIZE, OCCLUSION_SELECTORS, OWN_UI_SELECTOR, VIEWPORT_MARGIN } from '../constants';
import { StateMachine, type MachineContext } from '../core/StateMachine';
import type { SelectionCause } from '../core/SelectionManager';
import type { SelectionTranslateSettings } from '../settings/settings';
import {
	makeRect,
	type Rect,
	type SelectionSnapshot,
	type TranslationResult,
	type UiErrorInfo,
} from '../types';
import { last, scrollDelta, unionRects } from '../utils/dom';
import { debug } from '../utils/log';
import { TriggerIcon } from './TriggerIcon';
import { TranslatePopup } from './TranslatePopup';
import {
	DEFAULT_PLACEMENT_ORDER,
	computeCandidate,
	insetRect,
	intersectRects,
	isAnchorVisible,
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
	private readonly icon: TriggerIcon;
	private readonly popup: TranslatePopup;

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
		this.icon = new TriggerIcon(
			() => this.handleIconTrigger(),
			() => this.options.getSettings().popupTheme === 'follow'
		);

		this.popup = new TranslatePopup(options.app, options.getSettings, {
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
			isSpeaking: () => this.options.tts.isSpeaking(),
			subscribeSpeaking: (listener) => this.options.tts.subscribe(listener),
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
		switch (context.state) {
			case 'idle':
				this.icon.hide();
				this.popup.close();
				return;
			case 'icon':
				this.popup.close();
				return;
			case 'loading':
				if (context.snapshot != null) this.popup.showLoading(context.snapshot);
				return;
			case 'result':
				if (context.result != null) this.popup.showResult(context.result);
				return;
			case 'error':
				if (context.error != null) this.popup.showError(context.error);
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
	 * Where a popup of a given size should sit.
	 *
	 * Uses the same candidate search as the icon, which gives the flip-above
	 * behaviour for free: a tall result near the bottom of the screen simply
	 * fails the below-centre fit test and lands above the selection instead.
	 */
	private placePopup(size: Size): Rect {
		const snapshot = this.machine.getSnapshot();

		if (snapshot == null) {
			return makeRect(VIEWPORT_MARGIN, VIEWPORT_MARGIN, size.width, size.height);
		}

		// No occlusion test for the popup: it is the thing the user just asked
		// for, so covering a toolbar with it is correct, and probing six
		// candidates on every resize frame would not be free.
		const result = place(this.request(snapshot, this.anchorGeometry(snapshot), size));

		// Remembered so the scroll path can reproduce this decision instead of
		// making a fresh one every frame.
		this.popupPlacement = result.placement;
		return result.rect;
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

	/** True when the icon is showing and the local trigger key should apply. */
	isIconActive(): boolean {
		return this.machine.getState() === 'icon' && this.icon.isVisible();
	}

	/** Triggers the icon from the keyboard, as the local hotkey does. */
	triggerFromHotkey(): boolean {
		if (!this.isIconActive()) return false;
		this.handleIconTrigger();
		return true;
	}

	destroy(): void {
		this.cancelPendingFrame();
		this.icon.destroy();
		this.popup.destroy();
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
	 */
	private reanchor(): void {
		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) return;

		const geometry = this.anchorGeometry(snapshot);
		const visible = isAnchorVisible(geometry.bbox, this.visibleBounds(snapshot));
		const showingIcon = this.machine.getState() === 'icon';

		if (showingIcon) {
			this.icon.setAnchorHidden(!visible);
		} else {
			this.popup.setAnchorHidden(!visible);
		}
		// Off screen: the coordinates are irrelevant and computing them is waste.
		if (!visible) return;

		if (showingIcon) {
			const rect = this.stickyRect(snapshot, geometry, this.iconPlacement, {
				width: ICON_SIZE,
				height: ICON_SIZE,
			});
			if (rect != null) this.icon.moveTo(rect);
			return;
		}

		const size = this.popup.getSize();
		if (size == null) return;

		const rect = this.stickyRect(snapshot, geometry, this.popupPlacement, size);
		if (rect != null) this.popup.moveTo(rect);
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
		this.popup.replace();
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

	/** The visible part of the leaf: the region an anchor has to reach into. */
	private visibleBounds(snapshot: SelectionSnapshot): Rect | null {
		const win = snapshot.win;
		const viewport = makeRect(0, 0, win.innerWidth, win.innerHeight);
		const container = snapshot.containerEl.getBoundingClientRect();

		return intersectRects(
			viewport,
			makeRect(container.left, container.top, container.width, container.height)
		);
	}

	/* ── Internals ────────────────────────────────────────────────────────── */

	private handleIconTrigger(): void {
		const snapshot = this.machine.getSnapshot();
		if (snapshot == null) {
			// An icon on screen with no selection behind it should not be
			// reachable. Clear it rather than leaving a button that silently
			// does nothing when pressed.
			debug('icon triggered with no snapshot; clearing it');
			this.icon.hide();
			return;
		}
		this.requestTranslate(snapshot);
	}

	private requestTranslate(snapshot: SelectionSnapshot): void {
		if (!this.machine.transition({ to: 'loading', snapshot })) return;

		this.icon.hide();
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

		this.icon.hide();
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

		this.icon.show(snapshot.win, result.rect);
		// Matters on the resize path, where the selection may already have been
		// scrolled out of its leaf before the window changed size.
		this.icon.setAnchorHidden(!isAnchorVisible(geometry.bbox, this.visibleBounds(snapshot)));
	}

	/**
	 * The region the icon must stay inside: the leaf, clipped to the viewport.
	 *
	 * Using the leaf rather than the whole window is what keeps the icon off the
	 * PDF toolbar and the tab header — a selection on the first line of a
	 * document has no room below inside its own leaf, so the placement search
	 * moves on to a candidate above it.
	 */
	private computeBoundary(snapshot: SelectionSnapshot): Rect {
		const win = snapshot.win;
		const viewport = insetRect(
			makeRect(0, 0, win.innerWidth, win.innerHeight),
			VIEWPORT_MARGIN
		);

		const container = snapshot.containerEl.getBoundingClientRect();
		const containerRect = makeRect(container.left, container.top, container.width, container.height);

		// A leaf scrolled entirely out of view yields no overlap; the viewport is
		// then the only sensible boundary left.
		return intersectRects(viewport, containerRect) ?? viewport;
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
