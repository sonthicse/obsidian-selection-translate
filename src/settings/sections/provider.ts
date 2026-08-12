import { Setting } from 'obsidian';
import { t } from '../../i18n';
import type { ProviderId } from '../../types';
import type { SectionContext } from './context';

/**
 * Which engine translates, its credentials, and the dictionary sources.
 *
 * The key field is drawn only for the engine that needs it, which is why every
 * change here redraws the tab.
 */
export function addProviderSection(containerEl: HTMLElement, ctx: SectionContext): void {
	new Setting(containerEl).setName(t('settings.engineHeading')).setHeading();

	new Setting(containerEl)
		.setName(t('settings.provider'))
		.setDesc(t('settings.providerDesc'))
		.addDropdown((dropdown) => {
			for (const id of ['google-free', 'google-cloud', 'deepl'] as const) {
				dropdown.addOption(id, t(`provider.${id}`));
			}
			dropdown.setValue(ctx.settings.provider).onChange(async (value) => {
				await ctx.save('provider', value as ProviderId);
				// The warning and the relevant key field depend on this.
				ctx.redisplay();
			});
		});

	if (ctx.settings.provider === 'google-free') {
		// A plain paragraph rather than a Setting: this is a caveat about the
		// choice just made, not another thing to configure.
		containerEl.createDiv({
			cls: 'st-setting-warning',
			text: t('settings.freeEndpointWarning'),
		});
	}

	if (ctx.settings.provider === 'deepl') {
		addApiKeyField(containerEl, ctx, {
			name: t('settings.deeplKey'),
			desc: t('settings.deeplKeyDesc'),
			get: () => ctx.settings.deeplApiKey,
			set: (value) => ctx.save('deeplApiKey', value),
			providerId: 'deepl',
		});
	}

	if (ctx.settings.provider === 'google-cloud') {
		addApiKeyField(containerEl, ctx, {
			name: t('settings.googleCloudKey'),
			desc: t('settings.googleCloudKeyDesc'),
			get: () => ctx.settings.googleCloudApiKey,
			set: (value) => ctx.save('googleCloudApiKey', value),
			providerId: 'google-cloud',
		});
	}

	new Setting(containerEl)
		.setName(t('settings.dictionaryEnrichment'))
		.setDesc(t('settings.dictionaryEnrichmentDesc'))
		.addToggle((toggle) =>
			toggle.setValue(ctx.settings.dictionaryEnrichment).onChange(async (value) => {
				await ctx.save('dictionaryEnrichment', value);
				ctx.redisplay();
			})
		);

	if (ctx.settings.dictionaryEnrichment) {
		new Setting(containerEl)
			.setName(t('settings.dictionarySource'))
			.setDesc(t('settings.dictionarySourceDesc'))
			.addDropdown((dropdown) => {
				for (const source of ['auto', 'gtx', 'dictionaryapi', 'off'] as const) {
					dropdown.addOption(source, t(`dict.${source}`));
				}
				dropdown
					.setValue(ctx.settings.dictionarySource)
					.onChange(async (value) => ctx.save('dictionarySource', value as never));
			});
	}
}

/**
 * An API key field and its test button.
 *
 * The input is `type="password"` so the key is not readable over a shoulder
 * or in a screen recording — which people attach to bug reports without
 * thinking about what is on screen.
 */
function addApiKeyField(
	containerEl: HTMLElement,
	ctx: SectionContext,
	options: {
		name: string;
		desc: string;
		get: () => string;
		set: (value: string) => Promise<void>;
		providerId: ProviderId;
	}
): void {
	const setting = new Setting(containerEl).setName(options.name).setDesc(options.desc);
	const status = containerEl.createDiv({ cls: 'st-setting-status' });
	status.hide();

	setting.addText((text) => {
		text.inputEl.type = 'password';
		text.inputEl.autocomplete = 'off';
		text.inputEl.spellcheck = false;
		text.setValue(options.get()).onChange(async (value) => {
			await options.set(value.trim());
			status.hide();
		});
	});

	setting.addButton((button) => {
		button.setButtonText(t('settings.testConnection')).onClick(async () => {
			button.setDisabled(true);
			status.removeClass('is-ok', 'is-error');
			status.setText(t('settings.testing'));
			status.show();

			const result = await ctx.testProvider(options.providerId);

			status.setText(t(result.i18nKey, result.vars));
			status.addClass(result.ok ? 'is-ok' : 'is-error');
			button.setDisabled(false);
		});
	});
}
