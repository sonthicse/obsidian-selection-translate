import { SURFACE_SELECTORS } from '../constants';
import { makeRect, type Rect, type SelectionSnapshot } from '../types';
import type { TriggerIcon } from './TriggerIcon';
import type { TranslatePopup } from './TranslatePopup';
import { clipInsets, intersectRects, isRectVisible, trimTop, type ClipInsets } from './Positioner';

/**
 * What the layer needs of a floating element. Both the icon and the popup
 * supply it, which is what lets one method serve either.
 *
 * All three are here because all three are one answer: where the element is,
 * how much of it may be painted, and whether it may be seen at all.
 */
export interface FloatingElement {
	moveTo(rect: Rect): void;
	setAnchorHidden(hidden: boolean): void;
	setClip(insets: ClipInsets): void;
}

/**
 * The two floating elements, and every geometric question about them.
 *
 * Split out of {@link UiController} because that class was answering six
 * different questions at once. This one owns exactly the part that is about
 * pixels on screen: which element exists, where the visible region is, and how
 * much of an element hangs out of it. What should be on screen — the state
 * machine, the placement search, the dismiss rules — stays with the controller.
 *
 * The important consequence is {@link applyGeometry}. Where an element goes,
 * whether it may be drawn and how much of it may be painted are three halves of
 * one answer, and they used to be spelled out at separate call sites; a branch
 * that set a position without repeating the rest is exactly how the overhang
 * bug comes back. Here there is one place to add to, and nothing outside this
 * class writes an element's position, clip or visibility.
 */
export class FloatingLayer {
	constructor(
		readonly icon: TriggerIcon,
		readonly popup: TranslatePopup
	) {}

	/**
	 * The content region of the leaf, in viewport coordinates.
	 *
	 * Measured from `contentEl` and not from the leaf: the leaf includes its
	 * view header, so its top edge sits above the row with the back button and
	 * the tab title — and a boundary that reaches up there declares a popup
	 * drawn over that row to be perfectly inside its leaf. Which is exactly the
	 * bug: nothing looked like overhang, so nothing was clipped.
	 *
	 * The PDF toolbar is subtracted for the same reason one level down. It is a
	 * child of `.view-content` rather than a sibling, so the content box alone
	 * still reaches under it.
	 */
	contentRect(snapshot: SelectionSnapshot): Rect {
		const box = snapshot.contentEl.getBoundingClientRect();
		const rect = makeRect(box.left, box.top, box.width, box.height);
		if (snapshot.context !== 'pdf') return rect;

		const toolbar = snapshot.contentEl.querySelector(SURFACE_SELECTORS.pdfToolbar);
		if (toolbar == null) return rect;

		return trimTop(rect, toolbar.getBoundingClientRect().bottom);
	}

	/**
	 * The visible part of that content region: what an anchor has to reach into.
	 *
	 * Null when the leaf has scrolled entirely off screen, which callers must
	 * handle rather than treat as "no clipping needed".
	 */
	visibleBounds(snapshot: SelectionSnapshot): Rect | null {
		const win = snapshot.win;
		const viewport = makeRect(0, 0, win.innerWidth, win.innerHeight);

		return intersectRects(viewport, this.contentRect(snapshot));
	}

	/**
	 * Puts an element at a rect, hides it if that rect has left its leaf, and
	 * clips whatever still hangs out.
	 *
	 * The three are applied together, always, and in that order. Moving without
	 * re-clipping paints the old shape at the new place — which is how a popup
	 * that grew to fit its result ends up over the tab header; hiding without
	 * clipping draws over the header the moment the element is shown again;
	 * clipping without hiding leaves a sliver behind when the leaf goes away
	 * entirely.
	 *
	 * A null snapshot means an element with no leaf behind it, which only the
	 * unanchored fallback placement produces. It is clipped against itself:
	 * placed, whole, and visible.
	 */
	applyGeometry(target: FloatingElement, rect: Rect, snapshot: SelectionSnapshot | null): void {
		const bounds = snapshot == null ? rect : this.visibleBounds(snapshot);

		target.moveTo(rect);
		target.setAnchorHidden(!isRectVisible(rect, bounds));
		target.setClip(clipInsets(rect, bounds));
	}

	destroy(): void {
		this.icon.destroy();
		this.popup.destroy();
	}
}
