import { Setting, type App } from 'obsidian';
import { t } from '../../i18n';
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

	// Not a setting: a signpost. The plugin used to record its own trigger key,
	// which meant two keyboard systems that did not know about each other and a
	// bare key that typed into the note. The command does the same job, and
	// Obsidian is where a user expects to bind one.
	new Setting(containerEl)
		.setName(t('settings.hotkeyPointer'))
		.setDesc(t('settings.hotkeyPointerDesc'))
		.addButton((button) =>
			button.setButtonText(t('settings.openHotkeys')).onClick(() => openObsidianHotkeys(ctx.app))
		);

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

/**
 * Opens Obsidian's own hotkeys pane.
 *
 * `App.setting` is real and stable but missing from the published types, so it
 * is reached through a narrow structural cast rather than `any` — the same way
 * the plugin opens its own tab in `main.ts`. Doing nothing is the right failure:
 * the button is a shortcut to a pane the user can still reach by hand.
 */
function openObsidianHotkeys(app: App): void {
	const host = app as unknown as {
		setting?: { open(): void; openTabById(id: string): void };
	};
	if (host.setting == null) return;

	host.setting.open();
	host.setting.openTabById('hotkeys');
}
