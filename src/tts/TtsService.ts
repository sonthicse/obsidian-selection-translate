import { Notice } from 'obsidian';
import { t } from '../i18n';
import type { SelectionTranslateSettings } from '../settings/settings';
import { debug } from '../utils/log';
import { GoogleTtsEngine } from './GoogleTtsEngine';
import { SpeechUnavailableError, WebSpeechEngine } from './WebSpeechEngine';

/**
 * Reads selected text aloud, through whichever engine the user chose.
 *
 * Owns the "am I speaking" state so the popup's button can flip between read
 * and stop, and makes sure only one thing is ever speaking: starting a second
 * reading cancels the first rather than layering two voices.
 */
export class TtsService {
	private webSpeech: WebSpeechEngine | null = null;
	private google: GoogleTtsEngine | null = null;
	private speakingIn: Window | null = null;

	private readonly listeners = new Set<(speaking: boolean) => void>();

	constructor(private readonly getSettings: () => SelectionTranslateSettings) {}

	isSpeaking(): boolean {
		return this.speakingIn != null;
	}

	/** Notifies when speech starts or stops, so the button can change. */
	subscribe(listener: (speaking: boolean) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/**
	 * Speaks, or stops if already speaking.
	 *
	 * Pressing the button again to stop is what people expect, and it also gives
	 * a way out of a long passage without waiting for it to finish.
	 */
	async toggle(win: Window, text: string, lang: string): Promise<void> {
		if (this.isSpeaking()) {
			this.stop();
			return;
		}
		await this.speak(win, text, lang);
	}

	async speak(win: Window, text: string, lang: string): Promise<void> {
		const settings = this.getSettings();
		const trimmed = text.trim();
		if (trimmed.length === 0) return;

		this.stop();
		this.setSpeaking(win);

		try {
			if (settings.ttsEngine === 'google') {
				this.google ??= new GoogleTtsEngine(win);
				await this.google.speak(trimmed, lang, settings.ttsRate);
			} else {
				this.webSpeech ??= new WebSpeechEngine(win);
				await this.webSpeech.speak(trimmed, lang, settings.ttsRate);
			}
		} catch (cause) {
			// A voice that is missing or a service that refused is worth telling
			// the user about plainly; it is not an error worth a console trace.
			const key = cause instanceof SpeechUnavailableError ? cause.reasonKey : 'tts.failed';
			debug('speech failed', key);
			new Notice(t(key));
		} finally {
			this.setSpeaking(null);
		}
	}

	stop(): void {
		this.webSpeech?.stop();
		this.google?.stop();
		this.setSpeaking(null);
	}

	/** Stops any audio and releases every engine. Called on unload. */
	destroy(): void {
		this.stop();
		this.webSpeech = null;
		this.google = null;
		this.listeners.clear();
	}

	private setSpeaking(win: Window | null): void {
		if (this.speakingIn === win) return;

		this.speakingIn = win;
		for (const listener of Array.from(this.listeners)) listener(win != null);
	}
}
