import { SURFACE_SELECTORS } from '../constants';
import { makeRect, type Rect, type SelectionSnapshot } from '../types';
import type { TriggerIcon } from './TriggerIcon';
import type { TranslatePopup } from './TranslatePopup';
import { clipInsets, intersectRects, isRectVisible, trimTop, type ClipInsets } from './Positioner';

/**
 * What the layer needs of a floating element. Both the icon and the popup
 * supply it, which is what lets one method serve either.
 */
export interface Clippable {
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
 * The important consequence is {@link applyVisibility}. Deciding whether to
 * draw and deciding how much to clip are two halves of one answer, and they
 * used to be spelled out at three separate call sites; a fourth branch that
 * set a position without repeating both is exactly how the overhang bug comes
 * back. Here there is one place to add to.
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
	 * Hides an element that has left its leaf, and clips whatever still hangs out.
	 *
	 * Both halves are applied together, always. Hiding without clipping draws
	 * over the tab header; clipping without hiding leaves a sliver behind when
	 * the leaf goes away entirely.
	 */
	applyVisibility(target: Clippable, rect: Rect, snapshot: SelectionSnapshot): void {
		const bounds = this.visibleBounds(snapshot);
		target.setAnchorHidden(!isRectVisible(rect, bounds));
		target.setClip(clipInsets(rect, bounds));
	}

	destroy(): void {
		this.icon.destroy();
		this.popup.destroy();
	}
}
