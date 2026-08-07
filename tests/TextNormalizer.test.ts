import { describe, expect, it } from 'vitest';
import { isSingleWord, normalizeText } from '../src/core/TextNormalizer';

const strip = (text: string): string => normalizeText(text, { stripMarkdown: true });
const keep = (text: string): string => normalizeText(text, { stripMarkdown: false });

describe('normalizeText: markdown syntax', () => {
	it('removes emphasis markers', () => {
		expect(strip('**Domain** information')).toBe('Domain information');
		expect(strip('__bold__ and ==highlight==')).toBe('bold and highlight');
		expect(strip('~~struck~~ through')).toBe('struck through');
		expect(strip('an `inline code` span')).toBe('an inline code span');
		expect(strip('*emphasised* word')).toBe('emphasised word');
	});

	it('leaves a lone underscore alone', () => {
		// snake_case in a code selection is far likelier than emphasis, and
		// silently rewriting the user's identifier would be worse than leaving
		// a stray character in.
		expect(strip('call user_name here')).toBe('call user_name here');
	});

	it('keeps the visible label of a wikilink', () => {
		expect(strip('see [[Note Title|the note]] now')).toBe('see the note now');
		expect(strip('see [[Note Title]] now')).toBe('see Note Title now');
	});

	it('keeps the label and drops the URL of an inline link', () => {
		// Translating a URL produces nonsense and spends quota on it.
		expect(strip('[OSINT: Corporate Recon](https://example.com/a/b?c=d)')).toBe(
			'OSINT: Corporate Recon'
		);
	});

	it('removes embeds and images entirely', () => {
		expect(strip('before ![[diagram.png]] after')).toBe('before after');
		expect(strip('before ![alt text](img.png) after')).toBe('before alt text after');
	});

	it('removes heading markers', () => {
		expect(strip('## Enumeration Principles')).toBe('Enumeration Principles');
		expect(strip('###### deep heading')).toBe('deep heading');
	});

	it('removes blockquote markers', () => {
		expect(strip('> quoted text')).toBe('quoted text');
		expect(strip('> line one\n> line two')).toBe('line one line two');
	});

	it('removes list bullets, numbers and task checkboxes', () => {
		expect(strip('- first\n- second')).toBe('first second');
		expect(strip('1. first\n2. second')).toBe('first second');
		expect(strip('- [ ] todo item')).toBe('todo item');
		expect(strip('- [x] done item')).toBe('done item');
	});

	it('removes code fence delimiters but keeps the code', () => {
		expect(strip('```bash\nnmap -sV target\n```')).toBe('nmap -sV target');
	});

	it('removes horizontal rules', () => {
		expect(strip('before\n\n---\n\nafter')).toBe('before\n\nafter');
	});

	it('leaves everything in place when stripping is switched off', () => {
		expect(keep('**Domain** [link](https://x.y)')).toBe('**Domain** [link](https://x.y)');
	});
});

describe('normalizeText: whitespace and line breaks', () => {
	it('joins soft line breaks into one line', () => {
		// Markdown wraps paragraphs across lines; a single newline is not a
		// break the reader sees, and sending it as one changes the translation.
		expect(strip('Domain information is\na core component')).toBe(
			'Domain information is a core component'
		);
	});

	it('keeps a blank line as a paragraph boundary', () => {
		expect(strip('First paragraph.\n\nSecond paragraph.')).toBe(
			'First paragraph.\n\nSecond paragraph.'
		);
	});

	it('collapses a run of blank lines into one boundary', () => {
		expect(strip('First.\n\n\n\nSecond.')).toBe('First.\n\nSecond.');
	});

	it('collapses runs of spaces and tabs', () => {
		expect(strip('too    many\t\tspaces')).toBe('too many spaces');
	});

	it('trims the result', () => {
		expect(strip('   padded   ')).toBe('padded');
		// Double-clicking a word selects its trailing space.
		expect(strip('information ')).toBe('information');
	});

	it('normalises Windows line endings', () => {
		expect(strip('one\r\ntwo')).toBe('one two');
		expect(strip('one\r\n\r\ntwo')).toBe('one\n\ntwo');
	});

	it('returns an empty string for whitespace-only input', () => {
		expect(strip('   \n\t  ')).toBe('');
		expect(strip('')).toBe('');
	});

	it('drops content that was nothing but syntax', () => {
		expect(strip('---')).toBe('');
		expect(strip('```')).toBe('');
	});
});

describe('normalizeText: Unicode normalisation', () => {
	it('composes decomposed Vietnamese accents', () => {
		// Google returns "Chào" as a + combining grave rather than as the
		// precomposed character. The two render identically and compare
		// unequal, which would split the cache and paste text that does not
		// match anything the user's keyboard produces.
		const decomposed = 'Chào buổi sáng';
		const composed = 'Chào buổi sáng';

		expect(decomposed).not.toBe(composed);
		expect(strip(decomposed)).toBe(composed);
	});

	it('leaves already-composed text unchanged', () => {
		expect(strip('Chào buổi sáng')).toBe('Chào buổi sáng');
	});
});

describe('normalizeText: realistic selections', () => {
	it('handles a wrapped sentence copied from Source mode', () => {
		const selected =
			'**Domain information** is a core component of any\n' +
			'[penetration test](https://example.com/pentest), and it is\n' +
			'not just about the `tools` we use.';

		expect(strip(selected)).toBe(
			'Domain information is a core component of any penetration test, and it is ' +
				'not just about the tools we use.'
		);
	});

	it('handles a callout', () => {
		expect(strip('> [!note] Title\n> Body text here.')).toBe('[!note] Title Body text here.');
	});

	it('handles a table row', () => {
		expect(strip('| Port | Service |')).toBe('| Port | Service |');
	});
});

describe('isSingleWord', () => {
	it('accepts one word', () => {
		expect(isSingleWord('information')).toBe(true);
		expect(isSingleWord('  information  ')).toBe(true);
	});

	it('rejects anything with a space in it', () => {
		expect(isSingleWord('domain information')).toBe(false);
	});

	it('rejects empty input', () => {
		expect(isSingleWord('')).toBe(false);
		expect(isSingleWord('   ')).toBe(false);
	});

	it('rejects long strings that merely lack spaces', () => {
		// A URL or a hash has no spaces but no dictionary entry either, and
		// looking one up is a guaranteed wasted request.
		expect(isSingleWord('https://example.com/a/very/long/path/that/goes/on')).toBe(false);
		expect(isSingleWord('a'.repeat(41))).toBe(false);
		expect(isSingleWord('a'.repeat(40))).toBe(true);
	});

	it('accepts a word with accents', () => {
		expect(isSingleWord('thông')).toBe(true);
	});
});
