/*
 * The only place in the plugin allowed to call console.log.
 *
 * Obsidian's guidelines forbid console noise from a plugin running normally, so
 * every diagnostic goes through `debug()` and stays silent until the user turns
 * on the "debug logging" setting. Genuine failures still reach console.error
 * unconditionally, because swallowing those helps nobody.
 */

const PREFIX = '[selection-translate]';

let debugEnabled = false;

/** Mirrors the `debugLog` setting. Called on load and whenever it changes. */
export function setDebugLogging(enabled: boolean): void {
	debugEnabled = enabled;
}

export function isDebugLogging(): boolean {
	return debugEnabled;
}

/** Diagnostic trace. Silent unless the user opted in. */
export function debug(...args: unknown[]): void {
	if (!debugEnabled) return;
	console.log(PREFIX, ...args);
}

/** A real failure the user may need to act on. Always reported. */
export function logError(message: string, cause?: unknown): void {
	if (cause === undefined) {
		console.error(`${PREFIX} ${message}`);
	} else {
		console.error(`${PREFIX} ${message}`, cause);
	}
}

const warnedKeys = new Set<string>();

/*
 * Degradation warnings (a malformed upstream response, a missing voice) repeat
 * on every keystroke-triggered lookup, so they are deduplicated by key. Without
 * this, one broken endpoint floods the console for the whole session.
 */
export function warnOnce(key: string, message: string): void {
	if (warnedKeys.has(key)) return;
	warnedKeys.add(key);
	console.warn(`${PREFIX} ${message}`);
}

/** Lets `onunload` leave no state behind between plugin reloads. */
export function resetWarnings(): void {
	warnedKeys.clear();
}
