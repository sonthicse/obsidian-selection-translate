import { Setting } from 'obsidian';
import { t } from '../../i18n';
import { addHotkeyRecorder } from '../HotkeyRecorder';
import { SETTING_LIMITS, type IconPlacement } from '../settings';
import type { SectionContext } from './context';

/** What makes the button appear, and where it appears. */
export function addActivationSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl).setName(t('settings.activationHeading')).setHeading();

	new Setting(containerEl)
		.setName(t('settings.autoPopup'))
		.setDesc(t('settings.autoPopupDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(ctx.settings.autoPopupOnSelection)
				.onChange(async (value) => ctx.save('autoPopupOnSelection', value))
		);

	new Setting(containerEl)
		.setName(t('settings.translateOnDoubleClick'))
		.setDesc(t('settings.translateOnDoubleClickDesc'))
		.addToggle((toggle) =>
			toggle
				.setValue(ctx.settings.translateOnDoubleClick)
				.onChange(async (value) => ctx.save('translateOnDoubleClick', value))
		);

	addHotkeyRecorder(containerEl, {
		getBinding: () => ctx.settings.triggerHotkey,
		setBinding: (binding) => ctx.save('triggerHotkey', binding),
	});

	new Setting(containerEl)
		.setName(t('settings.minLength'))
		.setDesc(t('settings.minLengthDesc'))
		.addSlider((slider) =>
			slider
				.setLimits(SETTING_LIMITS.minSelectionLength.min, 20, 1)
				.setValue(ctx.settings.minSelectionLength)
				.onChange(async (value) => ctx.save('minSelectionLength', value))
		);

	new Setting(containerEl)
		.setName(t('settings.maxLength'))
		.setDesc(t('settings.maxLengthDesc'))
		.addText((text) => {
			text.inputEl.type = 'number';
			text.setValue(String(ctx.settings.maxSelectionLength)).onChange(async (value) => {
				const parsed = Number.parseInt(value, 10);
				if (!Number.isFinite(parsed)) return;
				await ctx.save('maxSelectionLength', parsed);
			});
		});

	new Setting(containerEl)
		.setName(t('settings.iconPlacement'))
		.setDesc(t('settings.iconPlacementDesc'))
		.addDropdown((dropdown) => {
			for (const placement of ['below-center', 'above-center', 'cursor'] as const) {
				dropdown.addOption(placement, t(`placement.${placement}`));
			}
			dropdown
				.setValue(ctx.settings.iconPlacement)
				.onChange(async (value) => ctx.save('iconPlacement', value as IconPlacement));
		});

	new Setting(containerEl)
		.setName(t('settings.iconOffset'))
		.setDesc(t('settings.iconOffsetDesc'))
		.addSlider((slider) =>
			slider
				.setLimits(SETTING_LIMITS.iconOffset.min, SETTING_LIMITS.iconOffset.max, 1)
				.setValue(ctx.settings.iconOffset)
				.onChange(async (value) => ctx.save('iconOffset', value))
		);
}
