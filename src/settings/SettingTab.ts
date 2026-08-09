import { Notice, PluginSettingTab, Setting, type App } from 'obsidian';
import { t } from '../i18n';
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../providers/langMap';
import type { ProviderId } from '../types';
import type SelectionTranslatePlugin from '../main';
import { addHotkeyRecorder } from './HotkeyRecorder';
import {
	DEFAULT_SETTINGS,
	SETTING_LIMITS,
	type IconPlacement,
	type PopupTheme,
	type SelectionTranslateSettings,
	type UiLanguage,
} from './settings';

/** The settings whose value is a boolean, i.e. the ones a toggle can drive. */
type BooleanSettingKey = {
	[K in keyof SelectionTranslateSettings]: SelectionTranslateSettings[K] extends boolean ? K : never;
}[keyof SelectionTranslateSettings];

/**
 * The options tab.
 *
 * Follows Obsidian's guidelines throughout: headings come from
 * `Setting.setHeading()` rather than heading elements, no heading repeats the
 * plugin's name or contains the word "settings", and labels are sentence case.
 * The first group has no heading at all, since a heading above the very first
 * item is noise.
 *
 * Every control saves immediately. Nothing here needs an apply button, and a
 * setting that only takes effect after a reload is a setting people assume is
 * broken.
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

		this.addLanguages(containerEl);
		this.addEngine(containerEl);
		this.addActivation(containerEl);
		this.addScope(containerEl);
		this.addAppearance(containerEl);
		this.addSpeech(containerEl);
		this.addAdvanced(containerEl);
	}

	/** Saves one field and re-applies everything derived from it. */
	private async save<K extends keyof SelectionTranslateSettings>(
		key: K,
		value: SelectionTranslateSettings[K]
	): Promise<void> {
		this.plugin.settings[key] = value;
		await this.plugin.saveSettings();
	}

	/* ── Languages ────────────────────────────────────────────────────────── */

	private addLanguages(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName(t('settings.sourceLang'))
			.setDesc(t('settings.sourceLangDesc'))
			.addDropdown((dropdown) => {
				for (const code of SOURCE_LANGUAGES) dropdown.addOption(code, t(`lang.${code}`));
				dropdown
					.setValue(this.plugin.settings.sourceLang)
					.onChange(async (value) => this.save('sourceLang', value as never));
			});

		new Setting(containerEl)
			.setName(t('settings.targetLang'))
			.setDesc(t('settings.targetLangDesc'))
			.addDropdown((dropdown) => {
				for (const code of TARGET_LANGUAGES) dropdown.addOption(code, t(`lang.${code}`));
				dropdown
					.setValue(this.plugin.settings.targetLang)
					.onChange(async (value) => this.save('targetLang', value as never));
			});

		new Setting(containerEl)
			.setName(t('settings.uiLanguage'))
			.setDesc(t('settings.uiLanguageDesc'))
			.addDropdown((dropdown) => {
				for (const value of ['auto', 'en', 'vi'] as const) {
					dropdown.addOption(value, t(`uiLang.${value}`));
				}
				dropdown.setValue(this.plugin.settings.uiLanguage).onChange(async (value) => {
					await this.save('uiLanguage', value as UiLanguage);
					// Redrawn immediately so the change is visible in the tab that
					// made it, rather than only after reopening it.
					this.display();
				});
			});
	}

	/* ── Engine ───────────────────────────────────────────────────────────── */

	private addEngine(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.engineHeading')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.provider'))
			.setDesc(t('settings.providerDesc'))
			.addDropdown((dropdown) => {
				for (const id of ['google-free', 'google-cloud', 'deepl'] as const) {
					dropdown.addOption(id, t(`provider.${id}`));
				}
				dropdown.setValue(this.plugin.settings.provider).onChange(async (value) => {
					await this.save('provider', value as ProviderId);
					// The warning and the relevant key field depend on this.
					this.display();
				});
			});

		if (this.plugin.settings.provider === 'google-free') {
			// A plain paragraph rather than a Setting: this is a caveat about the
			// choice just made, not another thing to configure.
			containerEl.createDiv({
				cls: 'st-setting-warning',
				text: t('settings.freeEndpointWarning'),
			});
		}

		if (this.plugin.settings.provider === 'deepl') {
			this.addApiKeyField(containerEl, {
				name: t('settings.deeplKey'),
				desc: t('settings.deeplKeyDesc'),
				get: () => this.plugin.settings.deeplApiKey,
				set: (value) => this.save('deeplApiKey', value),
				providerId: 'deepl',
			});
		}

		if (this.plugin.settings.provider === 'google-cloud') {
			this.addApiKeyField(containerEl, {
				name: t('settings.googleCloudKey'),
				desc: t('settings.googleCloudKeyDesc'),
				get: () => this.plugin.settings.googleCloudApiKey,
				set: (value) => this.save('googleCloudApiKey', value),
				providerId: 'google-cloud',
			});
		}

		new Setting(containerEl)
			.setName(t('settings.dictionaryEnrichment'))
			.setDesc(t('settings.dictionaryEnrichmentDesc'))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.dictionaryEnrichment).onChange(async (value) => {
					await this.save('dictionaryEnrichment', value);
					this.display();
				})
			);

		if (this.plugin.settings.dictionaryEnrichment) {
			new Setting(containerEl)
				.setName(t('settings.dictionarySource'))
				.setDesc(t('settings.dictionarySourceDesc'))
				.addDropdown((dropdown) => {
					for (const source of ['auto', 'gtx', 'dictionaryapi', 'off'] as const) {
						dropdown.addOption(source, t(`dict.${source}`));
					}
					dropdown
						.setValue(this.plugin.settings.dictionarySource)
						.onChange(async (value) => this.save('dictionarySource', value as never));
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
	private addApiKeyField(
		containerEl: HTMLElement,
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

				const result = await this.plugin.testProvider(options.providerId);

				status.setText(t(result.i18nKey, result.vars));
				status.addClass(result.ok ? 'is-ok' : 'is-error');
				button.setDisabled(false);
			});
		});
	}

	/* ── Activation ───────────────────────────────────────────────────────── */

	private addActivation(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.activationHeading')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.autoPopup'))
			.setDesc(t('settings.autoPopupDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoPopupOnSelection)
					.onChange(async (value) => this.save('autoPopupOnSelection', value))
			);

		new Setting(containerEl)
			.setName(t('settings.translateOnDoubleClick'))
			.setDesc(t('settings.translateOnDoubleClickDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.translateOnDoubleClick)
					.onChange(async (value) => this.save('translateOnDoubleClick', value))
			);

		addHotkeyRecorder(containerEl, {
			getBinding: () => this.plugin.settings.triggerHotkey,
			setBinding: (binding) => this.save('triggerHotkey', binding),
		});

		new Setting(containerEl)
			.setName(t('settings.minLength'))
			.setDesc(t('settings.minLengthDesc'))
			.addSlider((slider) =>
				slider
					.setLimits(SETTING_LIMITS.minSelectionLength.min, 20, 1)
					.setValue(this.plugin.settings.minSelectionLength)
					.onChange(async (value) => this.save('minSelectionLength', value))
			);

		new Setting(containerEl)
			.setName(t('settings.maxLength'))
			.setDesc(t('settings.maxLengthDesc'))
			.addText((text) => {
				text.inputEl.type = 'number';
				text
					.setValue(String(this.plugin.settings.maxSelectionLength))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						if (!Number.isFinite(parsed)) return;
						await this.save('maxSelectionLength', parsed);
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
					.setValue(this.plugin.settings.iconPlacement)
					.onChange(async (value) => this.save('iconPlacement', value as IconPlacement));
			});

		new Setting(containerEl)
			.setName(t('settings.iconOffset'))
			.setDesc(t('settings.iconOffsetDesc'))
			.addSlider((slider) =>
				slider
					.setLimits(SETTING_LIMITS.iconOffset.min, SETTING_LIMITS.iconOffset.max, 1)
					.setValue(this.plugin.settings.iconOffset)
					.onChange(async (value) => this.save('iconOffset', value))
			);
	}

	/* ── Scope ────────────────────────────────────────────────────────────── */

	private addScope(containerEl: HTMLElement): void {
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
				toggle
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => this.save(key, value))
			);
		}

		new Setting(containerEl)
			.setName(t('settings.pdfFallback'))
			.setDesc(t('settings.pdfFallbackDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.pdfSelectionFallback)
					.onChange(async (value) => this.save('pdfSelectionFallback', value))
			);
	}

	/* ── Appearance ───────────────────────────────────────────────────────── */

	private addAppearance(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.appearanceHeading')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.fontSize'))
			.setDesc(t('settings.fontSizeDesc'))
			.addSlider((slider) =>
				slider
					.setLimits(SETTING_LIMITS.fontSize.min, SETTING_LIMITS.fontSize.max, 1)
					.setValue(this.plugin.settings.fontSize)
					.onChange(async (value) => this.save('fontSize', value))
			);

		new Setting(containerEl)
			.setName(t('settings.fontFamily'))
			.setDesc(t('settings.fontFamilyDesc'))
			.addText((text) =>
				text
					.setPlaceholder(t('settings.fontFamilyPlaceholder'))
					.setValue(this.plugin.settings.fontFamily)
					.onChange(async (value) => this.save('fontFamily', value))
			);

		new Setting(containerEl)
			.setName(t('settings.popupTheme'))
			.setDesc(t('settings.popupThemeDesc'))
			.addDropdown((dropdown) => {
				for (const theme of ['light', 'follow'] as const) {
					dropdown.addOption(theme, t(`theme.${theme}`));
				}
				dropdown
					.setValue(this.plugin.settings.popupTheme)
					.onChange(async (value) => this.save('popupTheme', value as PopupTheme));
			});
	}

	/* ── Speech ───────────────────────────────────────────────────────────── */

	private addSpeech(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.speechHeading')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.ttsEngine'))
			.setDesc(t('settings.ttsEngineDesc'))
			.addDropdown((dropdown) => {
				for (const engine of ['webspeech', 'google'] as const) {
					dropdown.addOption(engine, t(`tts.${engine}`));
				}
				dropdown
					.setValue(this.plugin.settings.ttsEngine)
					.onChange(async (value) => this.save('ttsEngine', value as never));
			});

		new Setting(containerEl)
			.setName(t('settings.ttsRate'))
			.setDesc(t('settings.ttsRateDesc'))
			.addSlider((slider) =>
				slider
					.setLimits(SETTING_LIMITS.ttsRate.min, SETTING_LIMITS.ttsRate.max, 0.1)
					.setValue(this.plugin.settings.ttsRate)
					.onChange(async (value) => this.save('ttsRate', value))
			);
	}

	/* ── Advanced ─────────────────────────────────────────────────────────── */

	private addAdvanced(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(t('settings.advancedHeading')).setHeading();

		new Setting(containerEl)
			.setName(t('settings.cacheSize'))
			.setDesc(t('settings.cacheSizeDesc'))
			.addText((text) => {
				text.inputEl.type = 'number';
				text.setValue(String(this.plugin.settings.cacheSize)).onChange(async (value) => {
					const parsed = Number.parseInt(value, 10);
					if (!Number.isFinite(parsed)) return;
					await this.save('cacheSize', parsed);
				});
			});

		new Setting(containerEl)
			.setName(t('settings.stripMarkdown'))
			.setDesc(t('settings.stripMarkdownDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stripMarkdown)
					.onChange(async (value) => this.save('stripMarkdown', value))
			);

		new Setting(containerEl)
			.setName(t('settings.debugLog'))
			.setDesc(t('settings.debugLogDesc'))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.debugLog)
					.onChange(async (value) => this.save('debugLog', value))
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
						const { deeplApiKey, googleCloudApiKey } = this.plugin.settings;
						this.plugin.settings = { ...DEFAULT_SETTINGS, deeplApiKey, googleCloudApiKey };

						await this.plugin.saveSettings();
						new Notice(t('settings.resetDone'));
						this.display();
					})
			);
	}
}
