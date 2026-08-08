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
import { debug } from '../utils/log';
import { TriggerIcon } from './TriggerIcon';
import { TranslatePopup } from './TranslatePopup';
import {
	DEFAULT_PLACEMENT_ORDER,
	insetRect,
	intersectRects,
	place,
	type Placement,
	type Size,
} from './Positioner';

export interface UiControllerOptions {
	app: App;
	getSettings: () => SelectionTranslateSettings;
	/** Invoked when the user asks for a translation. Wired to the orchestrator. */
	onTranslateRequested: (snapshot: SelectionSnapshot) => void;
	/** Opens the engine dropdown, offered when the current engine cannot help. */
	onChangeProvider: () => void;
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
		const settings = this.options.getSettings();

		if (snapshot == null) {
			return makeRect(VIEWPORT_MARGIN, VIEWPORT_MARGIN, size.width, size.height);
		}

		return place({
			bbox: snapshot.bbox,
			anchorRect: snapshot.anchorRect,
			size,
			boundary: this.computeBoundary(snapshot),
			offset: settings.iconOffset,
			order: DEFAULT_PLACEMENT_ORDER,
			cursor: null,
			// No occlusion test for the popup: it is the thing the user just
			// asked for, so covering a toolbar with it is correct, and probing
			// six candidates on every resize frame would not be free.
		}).rect;
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
	 * The viewport moved.
	 *
	 * Only the icon reacts. It is anchored to a specific run of text, so once
	 * that text has scrolled the icon is pointing at nothing and hiding it is
	 * more honest than chasing it every frame — and this fires hundreds of times
	 * per scroll gesture. An open popup is left alone: it holds a finished
	 * answer the user is still reading.
	 */
	handleViewportChange(kind: 'scroll' | 'resize'): void {
		if (this.machine.getState() !== 'icon') return;

		debug('hiding icon after viewport change', kind);
		this.dismiss();
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
		this.icon.destroy();
		this.popup.destroy();
		this.machine.destroy();
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
		this.icon.hide();
		if (this.machine.getState() === 'idle') return;

		this.machine.transition({ to: 'idle' });
	}

	/** Measures, places and shows the icon for a selection. */
	private showIcon(snapshot: SelectionSnapshot): void {
		const settings = this.options.getSettings();
		const result = place(
			{
				bbox: snapshot.bbox,
				anchorRect: snapshot.anchorRect,
				size: { width: ICON_SIZE, height: ICON_SIZE },
				boundary: this.computeBoundary(snapshot),
				offset: settings.iconOffset,
				order: placementOrder(settings),
				cursor: snapshot.cursor,
			},
			(rect) => this.isOccluded(snapshot.win, rect)
		);

		debug('icon placed', { placement: result.placement, clamped: result.clamped });
		this.icon.show(snapshot.win, result.rect);
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
