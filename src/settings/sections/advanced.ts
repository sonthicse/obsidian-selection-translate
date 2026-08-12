import { Notice, Setting } from 'obsidian';
import { t } from '../../i18n';
import { DEFAULT_SETTINGS } from '../settings';
import type { SectionContext } from './context';

/** Cache, text handling, diagnostics, and the way back to defaults. */
export function addAdvancedSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl).setName(t('settings.advancedHeading')).setHeading();

	new Setting(containerEl)
		.setName(t('settings.cacheSize'))
		.setDesc(t('settings.cacheSizeDesc'))
		.addText((text) => {
			text.inputEl.type = 'number';
			text.setValue(String(ctx.settings.cacheSize)).onChange(async (value) => {
				const parsed = Number.parseInt(value, 10);
				if (!Number.isFinite(parsed)) return;
				await ctx.save('cacheSize', parsed);
			});
		});

	new Setting(containerEl)
		.setName(t('settings.stripMarkdown'))
		.setDesc(t('settings.stripMarkdownDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(ctx.settings.stripMarkdown)
				.onChange(async (value) => ctx.save('stripMarkdown', value))
		);

	new Setting(containerEl)
		.setName(t('settings.debugLog'))
		.setDesc(t('settings.debugLogDesc'))
		.addToggle((toggle) =>
			toggle.setValue(ctx.settings.debugLog).onChange(async (value) => ctx.save('debugLog', value))
		);

	new Setting(containerEl)
		.setName(t('settings.reset'))
		.setDesc(t('settings.resetDesc'))
		.addButton((button) =>
			button
				.setButtonText(t('settings.resetButton'))
				/*
				 * `setDestructive()` is the modern spelling and this should use
				 * it — but it landed in 1.13.0 and this plugin supports 1.5.0,
				 * where the method is simply absent and calling it would throw
				 * while the options pane is being built. The deprecated call is
				 * the one that works on every version we claim to support, and
				 * it moves when minAppVersion does.
				 */
				.setWarning()
				.onClick(async () => {
					// API keys survive a reset. They are the one setting that
					// costs real effort to obtain, and losing them to a button
					// meant for layout preferences would be indefensible.
					const { deeplApiKey, googleCloudApiKey } = ctx.settings;
					await ctx.replaceAll({ ...DEFAULT_SETTINGS, deeplApiKey, googleCloudApiKey });

					new Notice(t('settings.resetDone'));
					ctx.redisplay();
				})
		);
}
