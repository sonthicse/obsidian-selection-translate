/**
 * Fixed-size least-recently-used cache.
 *
 * Re-selecting the same word is extremely common — while reading, while
 * checking a translation, while comparing two sentences — and every repeat
 * would otherwise be a network round trip and, on a metered API, quota spent to
 * learn nothing.
 *
 * Deliberately in-memory only. Translations are never written to data.json:
 * that file syncs between devices and lives in the vault, and the plugin should
 * not quietly accumulate a record of everything the user has looked up.
 *
 * Recency is tracked using the insertion order that a Map already guarantees.
 * A read deletes and re-inserts the entry, which moves it to the end, so the
 * oldest entry is always the first one the iterator yields.
 */
export class LruCache<T> {
	private readonly entries = new Map<string, T>();

	constructor(private maxSize: number) {}

	get(key: string): T | undefined {
		const value = this.entries.get(key);
		if (value === undefined) return undefined;

		// Re-insert to mark as most recently used.
		this.entries.delete(key);
		this.entries.set(key, value);
		return value;
	}

	has(key: string): boolean {
		return this.entries.has(key);
	}

	set(key: string, value: T): void {
		if (this.maxSize <= 0) return;

		// Delete first so an update also counts as a use.
		this.entries.delete(key);
		this.entries.set(key, value);
		this.evict();
	}

	/** Applies a new size limit, evicting immediately if it shrank. */
	setMaxSize(maxSize: number): void {
		this.maxSize = maxSize;
		if (maxSize <= 0) {
			this.entries.clear();
			return;
		}
		this.evict();
	}

	get size(): number {
		return this.entries.size;
	}

	clear(): void {
		this.entries.clear();
	}

	private evict(): void {
		while (this.entries.size > this.maxSize) {
			const oldest = this.entries.keys().next();
			if (oldest.done === true) return;
			this.entries.delete(oldest.value);
		}
	}
}
