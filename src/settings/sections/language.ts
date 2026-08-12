import { Setting } from 'obsidian';
import { t } from '../../i18n';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../../providers/langMap';
import type { UiLanguage } from '../settings';
import type { SectionContext } from './context';

/**
 * Source, target and interface language.
 *
 * Drawn first and without a heading: a heading above the very first item is
 * noise, and these three are what a new user needs before anything else.
 */
export function addLanguageSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl)
		.setName(t('settings.sourceLang'))
		.setDesc(t('settings.sourceLangDesc'))
		.addDropdown((dropdown) => {
			for (const code of SOURCE_LANGUAGES) dropdown.addOption(code, t(`lang.${code}`));
			dropdown
				.setValue(ctx.settings.sourceLang)
				.onChange(async (value) => ctx.save('sourceLang', value as never));
		});

	new Setting(containerEl)
		.setName(t('settings.targetLang'))
		.setDesc(t('settings.targetLangDesc'))
		.addDropdown((dropdown) => {
			for (const code of TARGET_LANGUAGES) dropdown.addOption(code, t(`lang.${code}`));
			dropdown
				.setValue(ctx.settings.targetLang)
				.onChange(async (value) => ctx.save('targetLang', value as never));
		});

	new Setting(containerEl)
		.setName(t('settings.uiLanguage'))
		.setDesc(t('settings.uiLanguageDesc'))
		.addDropdown((dropdown) => {
			for (const value of ['auto', 'en', 'vi'] as const) {
				dropdown.addOption(value, t(`uiLang.${value}`));
			}
			dropdown.setValue(ctx.settings.uiLanguage).onChange(async (value) => {
				await ctx.save('uiLanguage', value as UiLanguage);
				// Redrawn immediately so the change is visible in the tab that
				// made it, rather than only after reopening it.
				ctx.redisplay();
			});
		});
}
