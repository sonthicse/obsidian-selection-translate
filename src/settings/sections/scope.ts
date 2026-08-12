import { Setting } from 'obsidian';
import { t } from '../../i18n';
import type { BooleanSettingKey, SectionContext } from './context';

/** Which Obsidian surfaces the plugin reacts on. */
export function addScopeSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl).setName(t('settings.scopeHeading')).setHeading();

	// Narrowed to the boolean-valued keys, which is what lets `save(key, value)`
	// type-check without an escape hatch: with the full key union the compiler
	// has to assume the setting might hold a string or a hotkey binding.
	const toggles: Array<[string, BooleanSettingKey]> = [
		['settings.enableInReading', 'enableInReading'],
		['settings.enableInEditing', 'enableInEditing'],
		['settings.enableInProperties', 'enableInProperties'],
		['settings.enableInPdf', 'enableInPdf'],
	];

	for (const [labelKey, key] of toggles) {
		new Setting(containerEl).setName(t(labelKey)).addToggle((toggle) =>
			toggle.setValue(ctx.settings[key]).onChange(async (value) => ctx.save(key, value))
		);
	}

	new Setting(containerEl)
		.setName(t('settings.pdfFallback'))
		.setDesc(t('settings.pdfFallbackDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(ctx.settings.pdfSelectionFallback)
				.onChange(async (value) => ctx.save('pdfSelectionFallback', value))
		);
}
