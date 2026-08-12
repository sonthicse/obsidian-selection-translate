import { Setting } from 'obsidian';
import { t } from '../../i18n';
import { SETTING_LIMITS } from '../settings';
import type { SectionContext } from './context';

/** Which voice reads the source text aloud, and how fast. */
export function addSpeechSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl).setName(t('settings.speechHeading')).setHeading();

	new Setting(containerEl)
		.setName(t('settings.ttsEngine'))
		.setDesc(t('settings.ttsEngineDesc'))
		.addDropdown((dropdown) => {
			for (const engine of ['webspeech', 'google'] as const) {
				dropdown.addOption(engine, t(`tts.${engine}`));
			}
			dropdown
				.setValue(ctx.settings.ttsEngine)
				.onChange(async (value) => ctx.save('ttsEngine', value as never));
		});

	new Setting(containerEl)
		.setName(t('settings.ttsRate'))
		.setDesc(t('settings.ttsRateDesc'))
		.addSlider((slider) =>
			slider
				.setLimits(SETTING_LIMITS.ttsRate.min, SETTING_LIMITS.ttsRate.max, 0.1)
				.setValue(ctx.settings.ttsRate)
				.onChange(async (value) => ctx.save('ttsRate', value))
		);
}
