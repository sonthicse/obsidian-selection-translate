/**
 * Trailing-edge debounce.
 *
 * Returns a wrapper that delays `fn` until `waitMs` has passed with no further
 * calls, plus a `cancel()` used on unload so a pending timer cannot fire into a
 * torn-down plugin.
 */
export function debounce<A extends unknown[]>(
	fn: (...args: A) => void,
	waitMs: number
): ((...args: A) => void) & { cancel: () => void } {
	let timer: ReturnType<typeof setTimeout> | null = null;

	const wrapped = (...args: A): void => {
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = null;
			fn(...args);
		}, waitMs);
	};

	wrapped.cancel = (): void => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};

	return wrapped;
}

/** Promise-based sleep, used by the provider retry backoff. */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
