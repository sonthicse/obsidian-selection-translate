/**
 * Normalises text to Unicode NFC.
 *
 * Not cosmetic. Google's translation endpoints return Vietnamese in a partly
 * decomposed form: "Chào" arrives as `a` followed by a combining grave accent
 * rather than as the single precomposed character. It renders identically and
 * compares unequal, which breaks three things at once —
 *
 *   - cache keys, so the same word looked up twice misses and costs a second
 *     request;
 *   - the copy button, which would paste text that differs from anything the
 *     user's own keyboard produces;
 *   - Obsidian's search, which would not match the pasted text against the
 *     rest of the note.
 *
 * NFC is the composed form, what Vietnamese input methods emit, and what the
 * W3C recommends for interchange. Applied to text arriving from the network and
 * to text on its way out to a provider, so both sides of the cache key agree.
 */
export function toNfc(value: string): string {
	return value.normalize('NFC');
}
