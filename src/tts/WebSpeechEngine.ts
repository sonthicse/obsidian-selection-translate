import { debug } from '../utils/log';

export class SpeechUnavailableError extends Error {
	constructor(readonly reasonKey: string) {
		super(reasonKey);
		this.name = 'SpeechUnavailableError';
	}
}

/**
 * The speech constructors, which the DOM lib declares globally but does not put
 * on the Window interface. Reached through the owning window rather than the
 * global one so a popout uses its own.
 */
interface SpeechWindow {
	SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
}

/**
 * Reading aloud through the browser's own speech synthesiser.
 *
 * The default, because it needs no network and therefore no disclosure: the
 * selected text never leaves the machine. The catch is that voices come from
 * the operating system, and a bare Linux install frequently has none — which
 * this reports as a clear message rather than silently doing nothing.
 */
export class WebSpeechEngine {
	constructor(private readonly win: Window) {}

	isAvailable(): boolean {
		return 'speechSynthesis' in this.win;
	}

	async speak(text: string, lang: string, rate: number): Promise<void> {
		const synthesis = this.win.speechSynthesis;
		if (synthesis == null) throw new SpeechUnavailableError('tts.noVoice');

		this.stop();

		const voices = await this.loadVoices(synthesis);
		const Utterance = (this.win as unknown as SpeechWindow).SpeechSynthesisUtterance;
		const utterance = new Utterance(text);
		utterance.rate = rate;
		if (lang.length > 0) utterance.lang = lang;

		const voice = pickVoice(voices, lang);
		if (voice != null) utterance.voice = voice;
		// No matching voice but some voices exist: the default one will read it,
		// badly accented but audible, which beats refusing.
		else if (voices.length === 0) throw new SpeechUnavailableError('tts.noVoice');

		await new Promise<void>((resolve, reject) => {
			utterance.onend = () => resolve();
			utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
				// Cancelling counts as an error here, but it is what the user asked
				// for and must not surface as a failure.
				if (event.error === 'canceled' || event.error === 'interrupted') {
					resolve();
					return;
				}
				debug('speech synthesis failed', event.error);
				reject(new SpeechUnavailableError('tts.failed'));
			};
			synthesis.speak(utterance);
		});
	}

	stop(): void {
		this.win.speechSynthesis?.cancel();
	}

	/**
	 * Waits for the voice list to be populated.
	 *
	 * `getVoices()` returns an empty array on the first call in Chromium and
	 * fills in asynchronously, so reading it once would conclude there are no
	 * voices on a machine that has plenty. The timeout stops the wait becoming a
	 * hang on platforms that never fire the event.
	 */
	private loadVoices(synthesis: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
		const immediate = synthesis.getVoices();
		if (immediate.length > 0) return Promise.resolve(immediate);

		return new Promise((resolve) => {
			const timer = this.win.setTimeout(() => {
				synthesis.removeEventListener('voiceschanged', onChanged);
				resolve(synthesis.getVoices());
			}, 1000);

			const onChanged = (): void => {
				this.win.clearTimeout(timer);
				synthesis.removeEventListener('voiceschanged', onChanged);
				resolve(synthesis.getVoices());
			};

			synthesis.addEventListener('voiceschanged', onChanged);
		});
	}
}

/**
 * Picks the closest voice for a language.
 *
 * Prefers an exact region match, then any voice for the base language, so a
 * request for "en" is happy with "en-GB" and a request for "en-US" prefers
 * "en-US" but settles for "en-GB".
 */
export function pickVoice(
	voices: readonly SpeechSynthesisVoice[],
	lang: string
): SpeechSynthesisVoice | null {
	if (lang.length === 0) return null;

	const wanted = lang.toLowerCase();
	const base = wanted.split(/[-_]/)[0] ?? wanted;

	return (
		voices.find((voice) => voice.lang.toLowerCase() === wanted) ??
		voices.find((voice) => voice.lang.toLowerCase().startsWith(`${base}-`)) ??
		voices.find((voice) => voice.lang.toLowerCase() === base) ??
		null
	);
}
