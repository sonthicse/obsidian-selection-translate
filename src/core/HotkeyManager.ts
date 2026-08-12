import { Platform, Scope, type App } from 'obsidian';
import type { HotkeyBinding, SelectionContext } from '../types';
import { debug } from '../utils/log';
import { isEditableContext } from './ContextDetector';

/**
 * The local trigger key: pressed while the button is showing, instead of
 * clicking it.
 *
 * Separate from Obsidian's own hotkey system, and deliberately so. An Obsidian
 * command works everywhere and is bound in Obsidian's settings; this one only
 * exists for the few seconds the button is on screen, which is exactly what
 * makes "select, then press one key" feel quick.
 *
 * This file is the whole answer to "what decides whether the trigger key
 * fires": the matching rules below, consulted from the one Scope that
 * {@link TriggerKeyScope} pushes while the button is up. Every rule is a pure
 * function, so it can be tested without a keyboard.
 */

/** Modifiers a binding can require, in the order they are displayed. */
const MODIFIER_ORDER: ReadonlyArray<HotkeyBinding['modifiers'][number]> = [
	'Mod',
	'Ctrl',
	'Meta',
	'Alt',
	'Shift',
];

/** Keys that are never a binding on their own. */
const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS', 'AltGraph']);

/**
 * Builds a binding from a key press, or null if there is nothing to record.
 *
 * Escape is excluded because it already closes the popup, and a binding on it
 * would be unreachable.
 */
export function bindingFromEvent(event: KeyboardEvent): HotkeyBinding | null {
	if (MODIFIER_KEYS.has(event.key)) return null;
	if (event.key === 'Escape') return null;

	const modifiers: HotkeyBinding['modifiers'] = [];
	if (event.ctrlKey) modifiers.push('Ctrl');
	if (event.metaKey) modifiers.push('Meta');
	if (event.altKey) modifiers.push('Alt');
	if (event.shiftKey) modifiers.push('Shift');

	return { modifiers, key: normalizeKey(event.key) };
}

/**
 * Whether a key press matches a binding.
 *
 * Compares every modifier in both directions: requiring Alt and also requiring
 * that Ctrl is *not* held. Without the negative half, Ctrl+Alt+T would fire a
 * binding recorded as Alt+T and steal a combination the user meant for
 * something else.
 */
export function matchesBinding(event: KeyboardEvent, binding: HotkeyBinding | null): boolean {
	if (binding == null) return false;
	if (normalizeKey(event.key) !== binding.key) return false;

	const wants = (modifier: HotkeyBinding['modifiers'][number]): boolean =>
		binding.modifiers.includes(modifier);

	// 'Mod' is Obsidian's platform-neutral modifier: Cmd on macOS, Ctrl elsewhere.
	const wantsCtrl = wants('Ctrl') || (wants('Mod') && !Platform.isMacOS);
	const wantsMeta = wants('Meta') || (wants('Mod') && Platform.isMacOS);

	return (
		event.ctrlKey === wantsCtrl &&
		event.metaKey === wantsMeta &&
		event.altKey === wants('Alt') &&
		event.shiftKey === wants('Shift')
	);
}

/**
 * Whether a binding is safe to use on a given surface.
 *
 * A bare printable key in an editable context would insert that character into
 * the note instead of translating — silent data corruption in the user's own
 * writing, and the one failure this design must not allow. Reading view and
 * PDFs have no such risk, so a bare key is permitted there.
 */
export function isBindingSafeFor(binding: HotkeyBinding | null, context: SelectionContext): boolean {
	if (binding == null) return false;
	if (binding.modifiers.length > 0) return true;
	if (!isEditableContext(context)) return true;

	return !isPrintableKey(binding.key);
}

/** Whether a binding would type a character anywhere it is used. */
export function isBindingRisky(binding: HotkeyBinding | null): boolean {
	if (binding == null) return false;
	return binding.modifiers.length === 0 && isPrintableKey(binding.key);
}

/** Human-readable form, e.g. "Alt + T". */
export function formatBinding(binding: HotkeyBinding | null, noneLabel: string): string {
	if (binding == null) return noneLabel;

	const parts = MODIFIER_ORDER.filter((modifier) => binding.modifiers.includes(modifier)).map(
		(modifier) => displayModifier(modifier)
	);
	parts.push(binding.key);
	return parts.join(' + ');
}

function displayModifier(modifier: HotkeyBinding['modifiers'][number]): string {
	if (modifier === 'Mod') return Platform.isMacOS ? 'Cmd' : 'Ctrl';
	if (modifier === 'Meta') return Platform.isMacOS ? 'Cmd' : 'Win';
	return modifier;
}

/**
 * A single printable character, which typing would insert.
 *
 * Named keys such as Enter, F5 and ArrowLeft arrive as multi-character strings,
 * so length is the whole test.
 */
function isPrintableKey(key: string): boolean {
	return Array.from(key).length === 1;
}

/** Upper-cases letters so "t" and "T" record as the same binding. */
function normalizeKey(key: string): string {
	return Array.from(key).length === 1 ? key.toUpperCase() : key;
}

/* ── Binding it to the platform ───────────────────────────────────────────── */

/** What the scope needs to know about the UI it belongs to. */
export interface TriggerKeyHost {
	app: App;
	/** The combination the user recorded, read live so a change takes effect at once. */
	getBinding(): HotkeyBinding | null;
	/** The surface the current selection sits on, or null if there is none. */
	getContext(): SelectionContext | null;
	/** Whether the button is on screen right now and can still be triggered. */
	isActive(): boolean;
	/** Runs the translation. Called only once every rule above has passed. */
	fire(): void;
}

/**
 * The trigger key, expressed as an Obsidian keymap scope.
 *
 * A Scope is the platform's own answer to "a key that only means something
 * while this UI is up": pushed when the button appears, popped when it goes.
 * The plugin used to listen on `document` instead, which worked but left the
 * key live in situations Obsidian knew nothing about, and put the plugin
 * outside the mechanism every other part of the app coordinates through.
 *
 * Two details of Obsidian's implementation shape everything here, and neither
 * is guessable from the type signatures:
 *
 * - The scope is created with `app.scope` as its **parent**. Obsidian walks the
 *   chain from the active scope upwards, and its own hotkeys are registered on
 *   `app.scope`; a parentless scope would therefore silence every Obsidian
 *   shortcut for as long as the button is showing.
 * - The handler returns `undefined` — not `true` — to decline a key. `undefined`
 *   is what makes Obsidian keep walking; any other value is taken as the
 *   answer and stops the search right there. Returning `true` to "let it
 *   through" would swallow the key just as thoroughly as returning `false`,
 *   only without the preventDefault.
 */
export class TriggerKeyScope {
	private scope: Scope | null = null;

	constructor(private readonly host: TriggerKeyHost) {}

	/**
	 * Claims the keyboard for the trigger key. Safe to call repeatedly.
	 *
	 * Does nothing when no combination is recorded: that is the shipped default,
	 * and an empty scope on an app-wide stack is a cost paid for nothing.
	 */
	claim(): void {
		if (this.scope != null) return;
		if (this.host.getBinding() == null) return;

		const scope = new Scope(this.host.app.scope);
		// Registered as a catch-all rather than for one key, so `matchesBinding`
		// stays the single place a combination is compared — including the
		// negative half of the test, which Obsidian's own matcher does not run
		// for a handler registered with `null` modifiers.
		scope.register(null, null, (event) => this.handleKey(event));

		this.host.app.keymap.pushScope(scope);
		this.scope = scope;
		debug('trigger key scope claimed');
	}

	/** Gives the keyboard back. Safe to call when nothing was claimed. */
	release(): void {
		if (this.scope == null) return;

		this.host.app.keymap.popScope(this.scope);
		this.scope = null;
		debug('trigger key scope released');
	}

	/**
	 * Decides one key press.
	 *
	 * The safety check is the important part. A binding with no modifier would
	 * insert its character into the note if the editor has focus, so it is
	 * refused there and left to work in reading view and PDFs, where nothing can
	 * be typed into. Declining is what lets the character through: swallowing the
	 * key silently would be worse than not having the feature.
	 */
	private handleKey(event: KeyboardEvent): false | undefined {
		const binding = this.host.getBinding();
		if (binding == null) return undefined;
		if (!this.host.isActive()) return undefined;
		if (!matchesBinding(event, binding)) return undefined;

		const context = this.host.getContext();
		if (context == null) return undefined;

		if (!isBindingSafeFor(binding, context)) {
			debug('trigger key refused: it would type into the note', context);
			return undefined;
		}

		this.host.fire();
		// `false` is how a scope says "handled"; Obsidian calls preventDefault and
		// stopPropagation itself, which is what keeps the character out of the note.
		return false;
	}
}

/* ── Conflicts with Obsidian's own hotkeys ────────────────────────────────── */

/** One combination Obsidian has bound, flattened out of its per-command tables. */
export interface RegisteredHotkey {
	commandId: string;
	/** Display name, already carrying the plugin prefix Obsidian adds. */
	commandName: string;
	modifiers: readonly string[];
	key: string;
}

/**
 * Names of the commands a binding would collide with.
 *
 * A warning, never a refusal: the two live in different scopes, so the same
 * combination genuinely can mean one thing while the button is up and another
 * the rest of the time. The user only has to know they chose that.
 */
export function findHotkeyConflicts(
	binding: HotkeyBinding | null,
	registered: readonly RegisteredHotkey[]
): string[] {
	if (binding == null) return [];

	const wanted = compileModifiers(binding.modifiers);
	const names: string[] = [];

	for (const hotkey of registered) {
		if (compileModifiers(hotkey.modifiers) !== wanted) continue;
		if (hotkey.key.toLowerCase() !== binding.key.toLowerCase()) continue;
		if (!names.includes(hotkey.commandName)) names.push(hotkey.commandName);
	}
	return names;
}

/**
 * Every hotkey Obsidian currently has bound.
 *
 * `app.hotkeyManager` is not in the published types and not part of the plugin
 * API, so this is the one place allowed to know its shape, it reads through a
 * narrow structural cast rather than `any`, and it fails to an empty list. A
 * broken read costs the conflict warning and nothing else — the trigger key
 * itself never asks this question.
 *
 * The tables are two: a command's own default, and the user's override. An
 * override replaces the default entirely, which is why a default is only
 * counted for a command the user has not touched — the same rule Obsidian's own
 * dispatcher applies when it bakes its lookup table.
 */
export function readObsidianHotkeys(app: App): RegisteredHotkey[] {
	try {
		const host = app as unknown as {
			hotkeyManager?: {
				customKeys?: Record<string, HotkeyEntry[] | undefined>;
				defaultKeys?: Record<string, HotkeyEntry[] | undefined>;
			};
			commands?: { commands?: Record<string, { name?: string } | undefined> };
		};

		const manager = host.hotkeyManager;
		if (manager == null) return [];

		const custom = manager.customKeys ?? {};
		const defaults = manager.defaultKeys ?? {};
		const commands = host.commands?.commands ?? {};

		const found: RegisteredHotkey[] = [];
		const collect = (commandId: string, entries: HotkeyEntry[] | undefined): void => {
			for (const entry of entries ?? []) {
				if (typeof entry?.key !== 'string' || entry.key.length === 0) continue;
				found.push({
					commandId,
					// Falling back to the id keeps an unnamed command visible in the
					// warning rather than dropping the conflict silently.
					commandName: commands[commandId]?.name ?? commandId,
					modifiers: Array.isArray(entry.modifiers) ? entry.modifiers : [],
					key: entry.key,
				});
			}
		};

		for (const commandId of Object.keys(custom)) collect(commandId, custom[commandId]);
		for (const commandId of Object.keys(defaults)) {
			if (Object.prototype.hasOwnProperty.call(custom, commandId)) continue;
			collect(commandId, defaults[commandId]);
		}
		return found;
	} catch (cause) {
		debug('could not read Obsidian hotkeys', cause);
		return [];
	}
}

/** One row of Obsidian's hotkey tables, as loosely as it is safe to assume. */
interface HotkeyEntry {
	modifiers?: string[];
	key?: string;
}

/**
 * Modifiers in the canonical form Obsidian compares them in.
 *
 * Resolving 'Mod' and sorting is what makes Ctrl+Alt+T and Alt+Ctrl+T the same
 * combination, and it has to match Obsidian's own rule or the comparison would
 * report conflicts that are not there.
 */
function compileModifiers(modifiers: readonly string[]): string {
	return modifiers
		.map((modifier) =>
			modifier === 'Mod' ? (Platform.isMacOS ? 'Meta' : 'Ctrl') : modifier
		)
		.slice()
		.sort()
		.join(',');
}
