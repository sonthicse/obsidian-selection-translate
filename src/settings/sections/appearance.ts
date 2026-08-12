import { Setting } from 'obsidian';
import { t } from '../../i18n';
import { SETTING_LIMITS, type PopupTheme } from '../settings';
import type { SectionContext } from './context';

/** How the popup looks: type size, typeface, and whether it follows the theme. */
export function addAppearanceSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl).setName(t('settings.appearanceHeading')).setHeading();

	new Setting(containerEl)
		.setName(t('settings.fontSize'))
		.setDesc(t('settings.fontSizeDesc'))
		.addSlider((slider) =>
			slider
				.setLimits(SETTING_LIMITS.fontSize.min, SETTING_LIMITS.fontSize.max, 1)
				.setValue(ctx.settings.fontSize)
				.onChange(async (value) => ctx.save('fontSize', value))
		);

	new Setting(containerEl)
		.setName(t('settings.fontFamily'))
		.setDesc(t('settings.fontFamilyDesc'))
		.addText((text) =>
			text
				.setPlaceholder(t('settings.fontFamilyPlaceholder'))
				.setValue(ctx.settings.fontFamily)
				.onChange(async (value) => ctx.save('fontFamily', value))
		);

	new Setting(containerEl)
		.setName(t('settings.popupTheme'))
		.setDesc(t('settings.popupThemeDesc'))
		.addDropdown((dropdown) => {
			for (const theme of ['light', 'follow'] as const) {
				dropdown.addOption(theme, t(`theme.${theme}`));
			}
			dropdown
				.setValue(ctx.settings.popupTheme)
				.onChange(async (value) => ctx.save('popupTheme', value as PopupTheme));
		});
}
