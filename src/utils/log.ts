/*
 * The only place in the plugin allowed to write to the console.
 *
 * Obsidian's guidelines forbid console noise from a plugin running normally, so
 * every diagnostic goes through `debug()` and stays silent until the user turns
 * on the "debug logging" setting. Genuine failures still reach console.error
 * unconditionally, because swallowing those helps nobody.
 *
 * Three channels, and the choice between them is not stylistic: `console.debug`,
 * `console.warn` and `console.error` are the three `eslint-plugin-obsidianmd`
 * permits, and the general logging channel is not among them. That is the
 * ecosystem saying a plugin's routine chatter belongs at verbose level, which is
 * also where a reader would expect to find it.
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

/**
 * Diagnostic trace. Silent unless the user opted in.
 *
 * Two gates, not one. The `debugEnabled` check is the plugin's own: nothing
 * reaches the console unless the user switched the `debugLog` setting on, which
 * they only do to collect information for a bug report. The verbose channel is
 * the browser's: DevTools hides it until the log level is raised, so even an
 * opted-in user does not have this in the way of everything else.
 *
 * The second gate has a cost worth stating, because it surprises people:
 * switching the setting on and seeing nothing looks like a broken plugin rather
 * than a filtered console. That is why the setting's own description says where
 * to look, in all eight languages.
 */
export function debug(...args: unknown[]): void {
	if (!debugEnabled) return;
	console.debug(PREFIX, ...args);
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
