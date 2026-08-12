import { Notice, type App } from 'obsidian';
import { PLUGIN_ID } from '../constants';
import { t } from '../i18n';
import type { SelectionTranslateSettings } from '../settings/settings';
import type { TranslationResult, UiErrorInfo } from '../types';
import { debug, logError } from '../utils/log';
import { ICON, applyIcon, type IconName } from './icons';

/** What building the content needs of the popup around it. */
export interface PopupContentHandlers {
	onClose(): void;
	onRetry(): void;
	onOpenSettings(): void;
	onChangeProvider(): void;
	/** Starts reading the source text, or stops if it is already reading. */
	onSpeak(text: string, lang: string): void;
	isSpeaking(): boolean;
	/** Notifies while the popup is open, so the button can flip to "stop". */
	subscribeSpeaking(listener: (speaking: boolean) => void): () => void;
}

/**
 * Minimal view of Obsidian's settings host.
 *
 * `App.setting` is real and stable but absent from the published types, so it
 * is reached through a narrow structural cast rather than through `any`, which
 * would switch off checking for the whole expression.
 */
interface SettingsHost {
	setting?: {
		open(): void;
		openTabById(id: string): void;
	};
}

/**
 * Builds what goes inside the popup.
 *
 * Split from {@link TranslatePopup} so that the question "what does a result
 * look like" is answerable without the element lifecycle, the off-screen
 * measurement and the grow animation in the way. It renders into whatever
 * parent it is handed, which is what lets the popup build content twice — once
 * into an off-screen twin to measure it, once for real.
 *
 * Every node is built through Obsidian's element helpers — no markup is ever
 * parsed, which is both a plugin guideline and the only safe way to display
 * text that arrived from a translation service.
 */
export class PopupContent {
	constructor(
		private readonly app: App,
		private readonly getSettings: () => SelectionTranslateSettings,
		private readonly handlers: PopupContentHandlers
	) {}

	/**
	 * Renders a finished translation.
	 *
	 * Returns the unsubscribe for the speak-state subscription, which the caller
	 * has to release when the content is replaced — the button it updates is
	 * gone by then.
	 */
	renderResult(parent: HTMLElement, result: TranslationResult): () => void {
		const unsubscribe = this.buildHeader(parent, result);

		const body = parent.createDiv({ cls: 'st-popup-body' });

		if (result.phonetic != null) {
			body.createDiv({ cls: 'st-phonetic', text: `/${stripSlashes(result.phonetic)}/` });
		}

		body.createDiv({ cls: 'st-translation', text: result.translated });

		// The dictionary block is omitted entirely rather than rendered empty,
		// so a sentence translation leaves no blank space behind.
		for (const entry of result.entries ?? []) {
			const entryEl = body.createDiv({ cls: 'st-entry' });
			entryEl.createDiv({ cls: 'st-pos', text: entry.partOfSpeech });
			entryEl.createDiv({ cls: 'st-meanings', text: entry.meanings.join(', ') });
		}

		this.buildFooter(parent, result);
		return unsubscribe;
	}

	/** Renders a failure and its one useful action. */
	renderError(parent: HTMLElement, error: UiErrorInfo): void {
		const header = parent.createDiv({ cls: 'st-popup-header' });
		header.createDiv({ cls: 'st-spacer' });
		this.button(header, ICON.close, t('popup.close'), () => this.handlers.onClose());

		const body = parent.createDiv({ cls: 'st-popup-body' });
		body.createDiv({ cls: 'st-error', text: t(error.messageKey, error.vars) });

		// Every failure offers a way forward; "something went wrong" with no
		// next step is the least useful thing a plugin can say.
		const action = this.errorAction(error);
		if (action != null) {
			const actions = body.createDiv({ cls: 'st-actions' });
			const button = actions.createEl('button', {
				cls: 'st-action',
				text: action.label,
				attr: { type: 'button' },
			});
			button.addEventListener('click', action.run);
		}
	}

	private buildHeader(parent: HTMLElement, result: TranslationResult): () => void {
		const header = parent.createDiv({ cls: 'st-popup-header' });

		/*
		 * One button for both reading and stopping. A separate stop control
		 * would sit dead most of the time, and pressing the same button again
		 * is what people try first anyway — which matters here, because a long
		 * passage takes a while and there has to be a way out of it.
		 */
		const speakButton = this.button(header, ICON.speak, t('popup.speak'), () => {
			this.handlers.onSpeak(result.sourceText, result.detectedSourceLang);
		});

		const renderSpeakState = (speaking: boolean): void => {
			const glyph = speakButton.querySelector<HTMLElement>('.st-icon-glyph');
			const name = speakButton.querySelector<HTMLElement>('.st-sr-only');
			if (glyph == null || name == null) return;

			applyIcon(glyph, speaking ? ICON.stopSpeaking : ICON.speak);
			name.textContent = t(speaking ? 'popup.stopSpeaking' : 'popup.speak');
		};

		renderSpeakState(this.handlers.isSpeaking());
		const unsubscribe = this.handlers.subscribeSpeaking(renderSpeakState);

		this.button(header, ICON.copy, t('popup.copy'), () => {
			void this.copy(result.translated);
		});

		header.createDiv({ cls: 'st-spacer' });

		this.button(header, ICON.settings, t('popup.settings'), () => this.openSettings());
		this.button(header, ICON.close, t('popup.close'), () => this.handlers.onClose());

		return unsubscribe;
	}

	private buildFooter(parent: HTMLElement, result: TranslationResult): void {
		const footer = parent.createDiv({ cls: 'st-popup-footer' });

		const parts = [providerLabel(result.provider)];
		const target = this.getSettings().targetLang;
		if (result.detectedSourceLang.length > 0) {
			parts.push(`${result.detectedSourceLang} → ${target}`);
		}
		parts.push(result.fromCache ? t('popup.fromCache') : t('popup.elapsed', { ms: result.elapsedMs }));

		footer.createDiv({ cls: 'st-provider-badge', text: parts.join(' · ') });
	}

	private errorAction(error: UiErrorInfo): { label: string; run: () => void } | null {
		switch (error.action) {
			case 'retry':
				return { label: t('action.retry'), run: () => this.handlers.onRetry() };
			case 'open-settings':
				return { label: t('action.openSettings'), run: () => this.openSettings() };
			case 'change-provider':
				return { label: t('action.changeProvider'), run: () => this.handlers.onChangeProvider() };
			case 'none':
				return null;
			default:
				return null;
		}
	}

	/**
	 * A header button, labelled for screen readers but silent on hover.
	 *
	 * Neither `title` nor `aria-label` is set: the first draws Chromium's own
	 * tooltip and the second makes Obsidian draw one of its own, so a button
	 * carrying both produced two overlapping tooltips. The name lives in a
	 * visually hidden span instead, which assistive technology reads and no
	 * pointer ever triggers.
	 *
	 * The glyph gets its own span because `setIcon` empties whatever element it
	 * draws into. Drawing straight onto the button would delete the hidden label
	 * every time {@link buildHeader} re-renders the speak state.
	 */
	private button(parent: HTMLElement, icon: IconName, label: string, onClick: () => void): HTMLElement {
		const button = parent.createEl('button', { cls: 'st-btn', attr: { type: 'button' } });

		applyIcon(button.createSpan({ cls: 'st-icon-glyph' }), icon);
		button.createSpan({ cls: 'st-sr-only', text: label });

		button.addEventListener('click', (event) => {
			event.preventDefault();
			onClick();
		});
		return button;
	}

	private async copy(text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			new Notice(t('popup.copied'));
		} catch (cause) {
			logError('clipboard write failed', cause);
			new Notice(t('popup.copyFailed'));
		}
	}

	private openSettings(): void {
		const host = this.app as unknown as SettingsHost;
		if (host.setting == null) {
			debug('settings host unavailable');
			return;
		}
		host.setting.open();
		host.setting.openTabById(PLUGIN_ID);
		this.handlers.onOpenSettings();
	}
}

/** Human-readable engine name for the footer badge. */
function providerLabel(id: string): string {
	switch (id) {
		case 'deepl':
			return 'DeepL';
		case 'google-cloud':
			return 'Google Cloud';
		case 'google-free':
			return 'Google';
		default:
			return id;
	}
}

/** Avoids rendering `//word//` when the source already supplied the slashes. */
function stripSlashes(phonetic: string): string {
	return phonetic.replace(/^\/+|\/+$/g, '');
}
