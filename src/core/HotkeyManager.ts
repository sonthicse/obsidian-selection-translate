import { Platform } from 'obsidian';
import type { HotkeyBinding, SelectionContext } from '../types';
import { isEditableContext } from './ContextDetector';

/**
 * The local trigger key: pressed while the button is showing, instead of
 * clicking it.
 *
 * Separate from Obsidian's own hotkey system, and deliberately so. An Obsidian
 * command works everywhere and is bound in Obsidian's settings; this one only
 * exists for the few seconds the button is on screen, which is exactly what
 * makes "select, then press one key" feel quick. Every function here is pure so
 * the matching rules can be tested without a keyboard.
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
