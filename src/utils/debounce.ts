/**
 * The timer pair, taken from one specific window.
 *
 * Obsidian's guidelines want `window.setTimeout` rather than the bare global,
 * because a popout window is a different window and its timers stop with it.
 * The plugin cannot simply write `window.` though: the unit tests run under
 * `environment: 'node'`, where no such global exists, so the host is a
 * parameter and the ambient globals are only the default.
 */
export interface TimerHost {
	setTimeout(handler: () => void, timeout: number): number;
	clearTimeout(id: number): void;
}

/**
 * The ambient timers, for callers with no window to hand.
 *
 * A structural cast rather than `any`, and safe in both runtimes because the
 * handle is never inspected — it is only ever passed straight back to
 * `clearTimeout`, which accepts Node's Timeout object just as happily.
 */
export const AMBIENT_TIMERS = globalThis as unknown as TimerHost;

/**
 * Trailing-edge debounce.
 *
 * Returns a wrapper that delays `fn` until `waitMs` has passed with no further
 * calls, plus a `cancel()` used on unload so a pending timer cannot fire into a
 * torn-down plugin.
 */
export function debounce<A extends unknown[]>(
	fn: (...args: A) => void,
	waitMs: number,
	timers: TimerHost = AMBIENT_TIMERS
): ((...args: A) => void) & { cancel: () => void } {
	let timer: number | null = null;

	const wrapped = (...args: A): void => {
		if (timer !== null) timers.clearTimeout(timer);
		timer = timers.setTimeout(() => {
			timer = null;
			fn(...args);
		}, waitMs);
	};

	wrapped.cancel = (): void => {
		if (timer !== null) {
			timers.clearTimeout(timer);
			timer = null;
		}
	};

	return wrapped;
}

/** Promise-based sleep, used by the provider retry backoff. */
export function sleep(ms: number, timers: TimerHost = AMBIENT_TIMERS): Promise<void> {
	return new Promise((resolve) => timers.setTimeout(resolve, ms));
}
