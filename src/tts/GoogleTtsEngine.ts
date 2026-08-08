import { requestUrl } from 'obsidian';
import { ENDPOINTS, TTS_CHUNK_SIZE } from '../constants';
import { debug } from '../utils/log';
import { SpeechUnavailableError } from './WebSpeechEngine';

/** `Audio` is a global constructor the Window interface does not declare. */
interface AudioWindow {
	Audio: typeof Audio;
}

/**
 * Reading aloud through Google's undocumented text-to-speech endpoint.
 *
 * Optional, and off by default, because unlike the system voice it sends the
 * selected text to Google — a network use the README has to disclose and the
 * user has to opt into.
 *
 * Two things about this endpoint force the shape of the code. It rejects
 * anything much over 200 characters, so text is split and played in sequence.
 * And it returns 403 to a plain `new Audio(url)` because of the referrer the
 * page sends, so the audio is fetched through `requestUrl` — which runs below
 * the browser layer and sends no referrer — and handed to the player as a blob.
 */
export class GoogleTtsEngine {
	private audio: HTMLAudioElement | null = null;
	private objectUrls: string[] = [];
	private cancelled = false;

	constructor(private readonly win: Window) {}

	async speak(text: string, lang: string, rate: number): Promise<void> {
		this.stop();
		this.cancelled = false;

		const chunks = splitForSpeech(text, TTS_CHUNK_SIZE);
		const language = lang.length > 0 ? lang : 'en';

		for (let index = 0; index < chunks.length; index++) {
			if (this.cancelled) return;

			const chunk = chunks[index];
			if (chunk == null) continue;

			await this.playChunk(chunk, language, rate, index, chunks.length);
		}
	}

	stop(): void {
		this.cancelled = true;

		if (this.audio != null) {
			/*
			 * Handlers come off before the source is cleared. Assigning an empty
			 * src fires an `error` event on the element, which would otherwise
			 * be reported as a playback failure the user never caused — they
			 * pressed stop, and being told the reading failed for it is wrong.
			 */
			this.audio.onended = null;
			this.audio.onerror = null;
			this.audio.pause();
			this.audio.src = '';
			this.audio = null;
		}
		this.revokeAll();
	}

	private async playChunk(
		chunk: string,
		lang: string,
		rate: number,
		index: number,
		total: number
	): Promise<void> {
		const params = new URLSearchParams({
			ie: 'UTF-8',
			// The value a browser extension sends; the endpoint rejects others.
			client: 'tw-ob',
			tl: lang,
			total: String(total),
			idx: String(index),
			textlen: String(chunk.length),
			q: chunk,
		});

		let objectUrl: string;
		// Hoisted so the playback handler below can report it on failure.
		let byteLength = 0;
		try {
			const response = await requestUrl({
				url: `${ENDPOINTS.googleTts}?${params.toString()}`,
				method: 'GET',
				throw: false,
			});
			if (response.status !== 200) {
				debug('google tts refused the request', { status: response.status });
				throw new SpeechUnavailableError('tts.failed');
			}

			/*
			 * A 200 is not proof of audio. This endpoint answers a rejected
			 * request with a short HTML page and a success status, which becomes
			 * a blob the player refuses with an unhelpful error. Checking the
			 * size turns that into a diagnosable failure: real speech for even
			 * one word is several kilobytes.
			 */
			byteLength = response.arrayBuffer.byteLength;
			if (byteLength < 512) {
				debug('google tts returned a body too small to be audio', {
					status: response.status,
					byteLength,
					contentType: response.headers?.['content-type'],
				});
				throw new SpeechUnavailableError('tts.failed');
			}

			const blob = new Blob([response.arrayBuffer], { type: 'audio/mpeg' });
			objectUrl = URL.createObjectURL(blob);
			this.objectUrls.push(objectUrl);
		} catch (cause) {
			if (cause instanceof SpeechUnavailableError) throw cause;
			debug('google tts request failed', cause);
			throw new SpeechUnavailableError('tts.failed');
		}

		await new Promise<void>((resolve, reject) => {
			const AudioCtor = (this.win as unknown as AudioWindow).Audio;
			const audio = new AudioCtor(objectUrl);
			audio.playbackRate = rate;
			this.audio = audio;

			audio.onended = () => resolve();
			audio.onerror = () => {
				debug('google tts playback failed', { code: audio.error?.code, byteLength });
				reject(new SpeechUnavailableError('tts.failed'));
			};

			void audio.play().catch((cause: unknown) => {
				debug('google tts could not start playback', cause);
				reject(new SpeechUnavailableError('tts.failed'));
			});
		}).finally(() => {
			// Released as soon as the chunk has played. Holding every blob until
			// the end would keep a whole page of audio in memory.
			URL.revokeObjectURL(objectUrl);
			this.objectUrls = this.objectUrls.filter((url) => url !== objectUrl);
		});
	}

	private revokeAll(): void {
		for (const url of this.objectUrls) URL.revokeObjectURL(url);
		this.objectUrls = [];
	}
}

/**
 * Splits text into speakable chunks, preferring sentence then word boundaries.
 *
 * Cutting mid-word produces audibly wrong speech, so the split walks back to
 * the last sentence end, then to the last space, and only cuts blindly when a
 * single run of characters is longer than the limit on its own.
 */
export function splitForSpeech(text: string, limit: number): string[] {
	const trimmed = text.trim();
	if (trimmed.length === 0) return [];
	if (trimmed.length <= limit) return [trimmed];

	const chunks: string[] = [];
	let rest = trimmed;

	while (rest.length > limit) {
		const window = rest.slice(0, limit);

		const sentenceEnd = Math.max(
			window.lastIndexOf('. '),
			window.lastIndexOf('! '),
			window.lastIndexOf('? '),
			window.lastIndexOf('\n')
		);
		const wordEnd = window.lastIndexOf(' ');

		// +1 keeps the punctuation with the chunk it belongs to.
		const cut = sentenceEnd > limit * 0.5 ? sentenceEnd + 1 : wordEnd > 0 ? wordEnd : limit;

		chunks.push(rest.slice(0, cut).trim());
		rest = rest.slice(cut).trim();
	}

	if (rest.length > 0) chunks.push(rest);
	return chunks.filter((chunk) => chunk.length > 0);
}
