import { CLS } from '../constants';
import { t } from '../i18n';
import type { Rect } from '../types';
import { ICON, applyIcon } from './icons';

/**
 * The small floating button shown beside a selection.
 *
 * Lives in `document.body` with `position: fixed`, never inside the surface it
 * annotates. Fixed positioning is not a stylistic choice: PDF pages carry a CSS
 * transform for zoom, and an absolutely positioned descendant of a transformed
 * element inherits that transform, so its coordinates would need manual
 * compensation that breaks again at the next zoom level. Viewport coordinates
 * from `getBoundingClientRect()` are correct in every container.
 */
export class TriggerIcon {
	private el: HTMLElement | null = null;
	private ownerWin: Window | null = null;

	/**
	 * Handle of the frame scheduled to reveal the icon.
	 *
	 * Tracked so it can be cancelled. Revealing on the next frame is what gives
	 * the opacity transition something to animate from, but it also opens a gap:
	 * anything that hides the icon inside that gap used to be undone by the
	 * frame firing afterwards, leaving a visible button with no state behind it
	 * — unclickable, and impossible to dismiss because the controller believed
	 * nothing was on screen. A selection collapsing mid-drag hits this gap
	 * routinely.
	 *
	 * Scrolling no longer lands here at all: the icon now follows its text
	 * instead of being dismissed, and moving it goes through {@link moveTo},
	 * which never touches the reveal frame.
	 */
	private pendingFrame: number | null = null;

	constructor(
		private readonly onTrigger: () => void,
		private readonly getFollowTheme: () => boolean
	) {}

	/** Places the icon at a viewport rect inside the given window. */
	show(win: Window, rect: Rect): void {
		this.cancelPendingFrame();
		const el = this.ensureElement(win);

		this.moveTo(rect);
		el.removeClass('is-anchor-hidden');
		el.toggleClass('mod-follow-theme', this.getFollowTheme());
		this.pendingFrame = win.requestAnimationFrame(() => {
			this.pendingFrame = null;
			el.addClass('is-visible');
		});
	}

	/** Moves an already-shown icon, without disturbing its reveal animation. */
	moveTo(rect: Rect): void {
		if (this.el == null) return;

		// The only inline styles the plugin writes: coordinates computed at
		// runtime, which no stylesheet could express.
		this.el.style.left = `${Math.round(rect.left)}px`;
		this.el.style.top = `${Math.round(rect.top)}px`;
	}

	/**
	 * Hides the icon while keeping it live.
	 *
	 * Used when the text it points at has scrolled out of the visible part of
	 * its leaf. The state machine is untouched, so scrolling back brings the
	 * same icon and the same pending selection back rather than starting over.
	 */
	setAnchorHidden(hidden: boolean): void {
		this.el?.toggleClass('is-anchor-hidden', hidden);
	}

	hide(): void {
		this.cancelPendingFrame();
		this.el?.removeClass('is-visible');
		this.el?.removeClass('is-anchor-hidden');
	}

	private cancelPendingFrame(): void {
		if (this.pendingFrame !== null) {
			this.ownerWin?.cancelAnimationFrame(this.pendingFrame);
			this.pendingFrame = null;
		}
	}

	/** True while the icon is on screen and can be triggered.
	 *
	 *  An anchor-hidden icon does not count: the hotkey must not fire at a button
	 *  the user cannot see. */
	isVisible(): boolean {
		if (this.el == null) return false;
		return this.el.hasClass('is-visible') && !this.el.hasClass('is-anchor-hidden');
	}

	getElement(): HTMLElement | null {
		return this.el;
	}

	destroy(): void {
		this.el?.remove();
		this.el = null;
		this.ownerWin = null;
	}

	/**
	 * Returns the icon element, rebuilding it if the window changed.
	 *
	 * A selection made in a popout window needs an icon in that window's
	 * document; reusing the main window's element would render it in the wrong
	 * place, or nowhere.
	 */
	private ensureElement(win: Window): HTMLElement {
		if (this.el != null && this.ownerWin === win) return this.el;

		this.destroy();
		this.ownerWin = win;

		/*
		 * No `aria-label` and no `title`. Obsidian hangs a tooltip handler off
		 * every element with an `aria-label`, and the icon sits directly under
		 * the pointer the moment it appears, so either attribute means a tooltip
		 * covering the text the user just selected. The name goes in a visually
		 * hidden span, which screen readers announce and hovering never reveals.
		 */
		const el = win.document.body.createEl('button', {
			cls: CLS.icon,
			attr: { type: 'button' },
		});
		applyIcon(el.createSpan({ cls: 'st-icon-glyph' }), ICON.translate);
		el.createSpan({ cls: 'st-sr-only', text: t('icon.label') });

		/*
		 * The critical line in this file.
		 *
		 * Pressing the mouse on an element outside the selection makes the
		 * browser collapse that selection, so by the time `click` fires there is
		 * nothing highlighted left to translate. Preventing the default on
		 * mousedown keeps the highlight visible while the button is pressed.
		 *
		 * It is a belt-and-braces measure: the text and geometry were already
		 * snapshotted when the selection was first detected, precisely so that
		 * this handler failing would not lose the request. Both defences are
		 * worth having — this one keeps the highlight on screen, which is what
		 * makes the interaction feel right.
		 */
		el.addEventListener('mousedown', (event) => {
			event.preventDefault();
			event.stopPropagation();
		});

		el.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.onTrigger();
		});

		this.el = el;
		return el;
	}
}
