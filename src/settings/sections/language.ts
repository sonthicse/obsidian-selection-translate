import { Setting } from 'obsidian';
import { t } from '../../i18n';
import { getLanguage, SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../../languages';
import type { UiLanguage } from '../settings';
import type { SectionContext } from './context';

/**
 * The dropdown label for a language.
 *
 * Languages name themselves: someone looking for Japanese scans for 日本語, not
 * for whatever the current interface language calls it. Only `auto` needs a
 * translation, because "detect automatically" is an instruction rather than the
 * name of a language.
 */
function languageLabel(code: string): string {
	return getLanguage(code)?.nativeName ?? t(`lang.${code}`);
}

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
			for (const code of SOURCE_LANGUAGES) dropdown.addOption(code, languageLabel(code));
			dropdown
				.setValue(ctx.settings.sourceLang)
				.onChange(async (value) => ctx.save('sourceLang', value as never));
		});

	new Setting(containerEl)
		.setName(t('settings.targetLang'))
		.setDesc(t('settings.targetLangDesc'))
		.addDropdown((dropdown) => {
			for (const code of TARGET_LANGUAGES) dropdown.addOption(code, languageLabel(code));
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
