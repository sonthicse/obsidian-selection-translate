import { PluginSettingTab, type App } from 'obsidian';
import { uiDir } from '../i18n';
import type { ProviderId } from '../types';
import type { ValidationResult } from '../providers/TranslationProvider';
import type SelectionTranslatePlugin from '../main';
import type { SelectionTranslateSettings } from './settings';
import type { SectionContext } from './sections/context';
import { addLanguageSection } from './sections/language';
import { addProviderSection } from './sections/provider';
import { addActivationSection } from './sections/activation';
import { addScopeSection } from './sections/scope';
import { addAppearanceSection } from './sections/appearance';
import { addSpeechSection } from './sections/speech';
import { addAdvancedSection } from './sections/advanced';

/**
 * The options tab.
 *
 * Deliberately thin. Every group of controls lives in `sections/`, and this
 * class does two things: decide the order they appear in, and be the one place
 * that writes a setting. That split is what keeps the file from growing a
 * section at a time — adding an engine at E5 or a locale at E4 touches one
 * section file, not this one.
 *
 * Follows Obsidian's guidelines throughout: headings come from
 * `Setting.setHeading()` rather than heading elements, no heading repeats the
 * plugin's name or contains the word "settings", and labels are sentence case.
 * The first group has no heading at all, since a heading above the very first
 * item is noise.
 *
 * Every control saves immediately. Nothing here needs an apply button, and a
 * setting that only takes effect after a reload is a setting people assume is
 * broken.
 */
export class SelectionTranslateSettingTab extends PluginSettingTab {
	private readonly plugin: SelectionTranslatePlugin;

	constructor(app: App, plugin: SelectionTranslatePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		/*
		 * The pane belongs to Obsidian, but the words in it are the plugin's, so
		 * it reads in the plugin's interface language. Those differ whenever
		 * someone runs Obsidian in one language and sets this plugin to another —
		 * and the pane is exactly where they do that, so it has to be right on the
		 * redraw that follows the change.
		 */
		containerEl.setAttribute('dir', uiDir());

		const ctx = this.context();

		addLanguageSection(containerEl, ctx);
		addProviderSection(containerEl, ctx);
		addActivationSection(containerEl, ctx);
		addScopeSection(containerEl, ctx);
		addAppearanceSection(containerEl, ctx);
		addSpeechSection(containerEl, ctx);
		addAdvancedSection(containerEl, ctx);
	}

	/**
	 * What the sections are handed.
	 *
	 * `settings` is a getter rather than a copy, so a section drawn after a save
	 * reads the value that was just written rather than the one from when the
	 * tab opened.
	 */
	private context(): SectionContext {
		const plugin = this.plugin;

		return {
			app: this.app,
			get settings(): SelectionTranslateSettings {
				return plugin.settings;
			},
			save: <K extends keyof SelectionTranslateSettings>(
				key: K,
				value: SelectionTranslateSettings[K]
			): Promise<void> => this.save(key, value),
			redisplay: (): void => this.display(),
			replaceAll: (next: SelectionTranslateSettings): Promise<void> => this.replaceAll(next),
			testProvider: (id: ProviderId): Promise<ValidationResult> => plugin.testProvider(id),
		};
	}

	/** Saves one field and re-applies everything derived from it. */
	private async save<K extends keyof SelectionTranslateSettings>(
		key: K,
		value: SelectionTranslateSettings[K]
	): Promise<void> {
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
	}

	/** Replaces every setting at once. Only the reset button needs this. */
	private async replaceAll(next: SelectionTranslateSettings): Promise<void> {
		this.plugin.settings = next;
		await this.plugin.saveSettings();
	}
}
