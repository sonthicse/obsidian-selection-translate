import { SINGLE_WORD_MAX_LENGTH } from '../constants';
import { toNfc } from '../utils/text';

/**
 * Turns selected text into what should actually be sent to a translator.
 *
 * Selecting a sentence in Source mode captures its markdown too, and asking any
 * engine to translate `**Domain** [information](https://example.com)` produces
 * either mangled output or a translation of the URL. Stripping the syntax first
 * is what makes the plugin behave the same in Source mode as in reading view.
 */
export function normalizeText(input: string, options: { stripMarkdown: boolean }): string {
	// Windows line endings first, so every later rule sees only \n.
	// NFC first, so a cache key built from this text matches one built from a
	// provider's answer regardless of how either side composes its accents.
	let text = toNfc(input).replace(/\r\n?/g, '\n');

	if (options.stripMarkdown) {
		text = stripMarkdown(text);
	}

	return collapseWhitespace(text);
}

function stripMarkdown(text: string): string {
	return (
		text
			// Embeds and images carry no prose: ![[note]], ![alt](url).
			.replace(/!\[\[[^\]]*\]\]/g, '')
			.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
			// Wikilinks: the alias is what the reader sees, so it is what gets
			// translated. Without an alias the target is the visible text.
			.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
			.replace(/\[\[([^\]]+)\]\]/g, '$1')
			// Inline links: keep the label, drop the URL. Translating a URL
			// produces nonsense and wastes characters against the quota.
			.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
			// Fenced code delimiters, including the language tag line.
			.replace(/^[ \t]*```[^\n]*$/gm, '')
			.replace(/^[ \t]*~~~[^\n]*$/gm, '')
			// Line-leading markers: heading hashes, blockquote arrows, list
			// bullets, ordered numbers, task checkboxes.
			.replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
			.replace(/^[ \t]*>[ \t]?/gm, '')
			.replace(/^[ \t]*[-*+][ \t]+\[[ xX]\][ \t]*/gm, '')
			.replace(/^[ \t]*[-*+][ \t]+/gm, '')
			.replace(/^[ \t]*\d+[.)][ \t]+/gm, '')
			// Horizontal rules leave nothing behind.
			.replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '')
			/*
			 * Paired emphasis markers. Only the doubled forms and backticks are
			 * removed. A lone underscore is left alone on purpose: it is far
			 * more likely to be part of snake_case in a code selection than to
			 * be emphasis, and eating it would silently corrupt the text the
			 * user asked about.
			 */
			.replace(/\*\*/g, '')
			.replace(/__/g, '')
			.replace(/==/g, '')
			.replace(/~~/g, '')
			.replace(/`/g, '')
			// A single asterisk only counts as emphasis when it wraps something
			// on the same line.
			.replace(/\*([^*\n]+)\*/g, '$1')
	);
}

/**
 * Reflows the text the way a reader sees it.
 *
 * Markdown wraps paragraphs across lines, so a single newline is a soft break
 * that means nothing and would otherwise be sent as a line break the engine
 * translates around. A blank line is a real paragraph boundary and survives,
 * because paragraph structure changes the translation.
 *
 * Splitting on paragraph boundaries before touching anything else is what keeps
 * the two rules from fighting: the soft-break rule then only ever sees newlines
 * that are genuinely soft.
 */
function collapseWhitespace(text: string): string {
	return text
		.split(/\n[ \t]*\n\s*/)
		.map((paragraph) =>
			paragraph
				.replace(/[ \t]*\n[ \t]*/g, ' ')
				.replace(/[ \t]{2,}/g, ' ')
				.trim()
		)
		.filter((paragraph) => paragraph.length > 0)
		.join('\n\n');
}

/**
 * Whether the selection is one word, and so worth a dictionary lookup.
 *
 * The length ceiling catches things that contain no spaces but are not words —
 * a URL, a hash, an identifier — for which a dictionary request would be a
 * guaranteed miss.
 */
export function isSingleWord(text: string): boolean {
	const trimmed = text.trim();
	if (trimmed.length === 0 || trimmed.length > SINGLE_WORD_MAX_LENGTH) return false;

	return trimmed.split(/\s+/).length === 1;
}
