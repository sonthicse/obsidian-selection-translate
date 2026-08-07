import { setIcon } from 'obsidian';

/**
 * Semantic names for the icons the plugin draws.
 *
 * These map onto icons Obsidian already bundles from Lucide, which is why this
 * file contains no SVG markup at all. Two reasons that is the right call:
 * `setIcon` builds the DOM itself so nothing here goes near innerHTML, and the
 * glyphs then match the rest of the app, including under community themes that
 * restyle the icon set.
 */
export const ICON = {
	/** The trigger icon shown beside a selection. */
	translate: 'languages',
	speak: 'volume-2',
	stopSpeaking: 'square',
	copy: 'copy',
	settings: 'settings',
	close: 'x',
	retry: 'refresh-cw',
} as const;

export type IconName = (typeof ICON)[keyof typeof ICON];

/** Draws an icon into an element. */
export function applyIcon(el: HTMLElement, name: IconName): void {
	setIcon(el, name);
}
