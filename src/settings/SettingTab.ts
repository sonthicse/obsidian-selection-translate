import { PluginSettingTab, Setting, type App } from 'obsidian';
import type SelectionTranslatePlugin from '../main';

/**
 * Settings UI.
 *
 * Phase 1 wires up only the debug toggle; the full tab described in the plan
 * (languages, engine, activation, scope, appearance, speech, advanced) is built
 * out in Phase 6. Headings use `Setting.setHeading()` rather than heading
 * elements, per Obsidian's guidelines, and no heading repeats the plugin name
 * or the word "settings".
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

		new Setting(containerEl).setName('Advanced').setHeading();

		new Setting(containerEl)
			.setName('Debug logging')
			.setDesc('Write diagnostic messages to the developer console. Off unless you are reporting a bug.')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.debugLog).onChange(async (value) => {
					this.plugin.settings.debugLog = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
