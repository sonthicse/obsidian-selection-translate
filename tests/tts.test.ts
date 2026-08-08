import { describe, expect, it } from 'vitest';
import { splitForSpeech } from '../src/tts/GoogleTtsEngine';
import { pickVoice } from '../src/tts/WebSpeechEngine';
import { TTS_CHUNK_SIZE } from '../src/constants';

/** Minimal stand-in for a SpeechSynthesisVoice; only `lang` is read. */
function voice(lang: string): SpeechSynthesisVoice {
	return { lang, name: lang, default: false, localService: true, voiceURI: lang };
}

describe('splitForSpeech', () => {
	it('leaves short text in one piece', () => {
		expect(splitForSpeech('Hello there', TTS_CHUNK_SIZE)).toEqual(['Hello there']);
	});

	it('returns nothing for empty input', () => {
		expect(splitForSpeech('', 100)).toEqual([]);
		expect(splitForSpeech('   ', 100)).toEqual([]);
	});

	it('keeps every chunk within the limit', () => {
		// Google's endpoint rejects anything much over 200 characters, so this
		// is a hard requirement rather than a preference.
		const text = 'The quick brown fox jumps over the lazy dog. '.repeat(30);
		for (const chunk of splitForSpeech(text, TTS_CHUNK_SIZE)) {
			expect(chunk.length).toBeLessThanOrEqual(TTS_CHUNK_SIZE);
		}
	});

	it('prefers to break at the end of a sentence', () => {
		const text = `${'a'.repeat(60)}. ${'b'.repeat(60)}. ${'c'.repeat(60)}.`;
		const chunks = splitForSpeech(text, 100);

		expect(chunks[0]?.endsWith('.')).toBe(true);
	});

	it('breaks at a space rather than mid-word', () => {
		const text = `${'word '.repeat(40)}`.trim();
		for (const chunk of splitForSpeech(text, 50)) {
			expect(chunk.startsWith('word')).toBe(true);
			expect(chunk.endsWith('word')).toBe(true);
		}
	});

	it('cuts a single unbroken run that exceeds the limit on its own', () => {
		// No space to break at; splitting bluntly beats never terminating.
		const chunks = splitForSpeech('x'.repeat(250), 100);
		expect(chunks.length).toBeGreaterThan(1);
		for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(100);
	});

	it('loses no words when reassembled', () => {
		const text = 'Domain information is a core component of any penetration test. '.repeat(8);
		const rejoined = splitForSpeech(text, 60).join(' ');

		expect(rejoined.split(/\s+/).filter(Boolean)).toEqual(
			text.trim().split(/\s+/).filter(Boolean)
		);
	});

	it('produces no empty chunks', () => {
		for (const chunk of splitForSpeech('a. '.repeat(200), 40)) {
			expect(chunk.length).toBeGreaterThan(0);
		}
	});
});

describe('pickVoice', () => {
	const voices = [voice('en-GB'), voice('en-US'), voice('vi-VN'), voice('de')];

	it('prefers an exact match', () => {
		expect(pickVoice(voices, 'en-US')?.lang).toBe('en-US');
	});

	it('accepts a regional voice for a base language', () => {
		expect(pickVoice(voices, 'vi')?.lang).toBe('vi-VN');
	});

	it('matches a base-language voice when there is no regional one', () => {
		expect(pickVoice(voices, 'de')?.lang).toBe('de');
	});

	it('ignores case, since providers disagree on it', () => {
		expect(pickVoice(voices, 'EN-GB')?.lang).toBe('en-GB');
	});

	it('returns null when nothing matches, rather than a wrong-language voice', () => {
		// A Vietnamese voice reading Japanese is worse than the system default.
		expect(pickVoice(voices, 'ja')).toBeNull();
	});

	it('returns null when the language is unknown', () => {
		expect(pickVoice(voices, '')).toBeNull();
	});

	it('returns null when no voices are installed', () => {
		expect(pickVoice([], 'en')).toBeNull();
	});
});
