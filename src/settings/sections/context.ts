import type { App } from 'obsidian';
import type { ProviderId } from '../../types';
import type { ValidationResult } from '../../providers/TranslationProvider';
import type { SelectionTranslateSettings } from '../settings';

/**
 * What a section needs of the tab it is drawn into.
 *
 * Sections take this rather than the plugin so they cannot reach past it: the
 * only ways to change anything are `save` for one field and `replaceAll` for
 * the reset button, and both go through the tab's own persistence path.
 */
export interface SectionContext {
	/**
	 * The app, for the two things a control legitimately needs from it: reading
	 * what Obsidian has already bound, and opening one of Obsidian's own panes.
	 * Not a way around `save` — settings still only change through it.
	 */
	readonly app: App;

	/** Live settings. Read at draw time, so a redraw sees the latest values. */
	readonly settings: SelectionTranslateSettings;

	/** Saves one field and re-applies everything derived from it. */
	save<K extends keyof SelectionTranslateSettings>(
		key: K,
		value: SelectionTranslateSettings[K]
	): Promise<void>;

	/**
	 * Redraws the whole tab.
	 *
	 * Needed by the choices that decide which fields exist at all — picking
	 * DeepL has to bring its key field with it — and by the UI language, which
	 * changes every label on the page.
	 */
	redisplay(): void;

	/** Replaces every setting at once. Only the reset button needs this. */
	replaceAll(next: SelectionTranslateSettings): Promise<void>;

	/** Checks one engine's credentials. Backs the test button. */
	testProvider(id: ProviderId): Promise<ValidationResult>;
}

/** The settings whose value is a boolean, i.e. the ones a toggle can drive. */
export type BooleanSettingKey = {
	[K in keyof SelectionTranslateSettings]: SelectionTranslateSettings[K] extends boolean ? K : never;
}[keyof SelectionTranslateSettings];
