import { makeRect, type Rect, type SelectionSnapshot } from '../types';
import type { TriggerIcon } from './TriggerIcon';
import type { TranslatePopup } from './TranslatePopup';
import { clipInsets, intersectRects, isRectVisible, type ClipInsets } from './Positioner';

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
	 * The visible part of the leaf: the region an anchor has to reach into.
	 *
	 * Null when the leaf has scrolled entirely off screen, which callers must
	 * handle rather than treat as "no clipping needed".
	 */
	visibleBounds(snapshot: SelectionSnapshot): Rect | null {
		const win = snapshot.win;
		const viewport = makeRect(0, 0, win.innerWidth, win.innerHeight);
		const container = snapshot.containerEl.getBoundingClientRect();

		return intersectRects(
			viewport,
			makeRect(container.left, container.top, container.width, container.height)
		);
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
