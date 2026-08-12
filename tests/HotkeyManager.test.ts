import { describe, expect, it } from 'vitest';
import type { App } from 'obsidian';
import {
	bindingFromEvent,
	findHotkeyConflicts,
	formatBinding,
	isBindingRisky,
	isBindingSafeFor,
	matchesBinding,
	readObsidianHotkeys,
	type RegisteredHotkey,
} from '../src/core/HotkeyManager';
import type { HotkeyBinding } from '../src/types';

/** Minimal stand-in for a KeyboardEvent; only the modifier flags are read. */
function keyEvent(
	key: string,
	modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } = {}
): KeyboardEvent {
	return {
		key,
		ctrlKey: modifiers.ctrl ?? false,
		altKey: modifiers.alt ?? false,
		shiftKey: modifiers.shift ?? false,
		metaKey: modifiers.meta ?? false,
	} as KeyboardEvent;
}

describe('bindingFromEvent', () => {
	it('records the key with the modifiers held', () => {
		expect(bindingFromEvent(keyEvent('t', { alt: true }))).toEqual({
			modifiers: ['Alt'],
			key: 'T',
		});
	});

	it('upper-cases letters so case does not matter', () => {
		expect(bindingFromEvent(keyEvent('t'))?.key).toBe('T');
		expect(bindingFromEvent(keyEvent('T'))?.key).toBe('T');
	});

	it('leaves named keys alone', () => {
		expect(bindingFromEvent(keyEvent('Enter'))?.key).toBe('Enter');
		expect(bindingFromEvent(keyEvent('F5'))?.key).toBe('F5');
		expect(bindingFromEvent(keyEvent('ArrowRight'))?.key).toBe('ArrowRight');
	});

	it('ignores a modifier pressed on its own', () => {
		// Holding Alt is not a combination yet; the recorder keeps waiting.
		for (const key of ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph']) {
			expect(bindingFromEvent(keyEvent(key, { alt: true }))).toBeNull();
		}
	});

	it('refuses Escape, which already closes the popup', () => {
		expect(bindingFromEvent(keyEvent('Escape'))).toBeNull();
	});

	it('records several modifiers together', () => {
		const binding = bindingFromEvent(keyEvent('k', { ctrl: true, shift: true }));
		expect(binding?.modifiers).toEqual(['Ctrl', 'Shift']);
	});
});

describe('matchesBinding', () => {
	const altT: HotkeyBinding = { modifiers: ['Alt'], key: 'T' };

	it('matches the recorded combination', () => {
		expect(matchesBinding(keyEvent('t', { alt: true }), altT)).toBe(true);
		expect(matchesBinding(keyEvent('T', { alt: true }), altT)).toBe(true);
	});

	it('rejects a different key', () => {
		expect(matchesBinding(keyEvent('y', { alt: true }), altT)).toBe(false);
	});

	it('rejects the right key without its modifier', () => {
		expect(matchesBinding(keyEvent('t'), altT)).toBe(false);
	});

	it('rejects extra modifiers the binding did not ask for', () => {
		// Without this, Ctrl+Alt+T would fire an Alt+T binding and steal a
		// combination the user meant for something else entirely.
		expect(matchesBinding(keyEvent('t', { alt: true, ctrl: true }), altT)).toBe(false);
		expect(matchesBinding(keyEvent('t', { alt: true, shift: true }), altT)).toBe(false);
		expect(matchesBinding(keyEvent('t', { alt: true, meta: true }), altT)).toBe(false);
	});

	it('never matches when no binding is set', () => {
		expect(matchesBinding(keyEvent('t', { alt: true }), null)).toBe(false);
	});

	it('matches a bare key when the binding has no modifiers', () => {
		const bare: HotkeyBinding = { modifiers: [], key: 'T' };
		expect(matchesBinding(keyEvent('t'), bare)).toBe(true);
		expect(matchesBinding(keyEvent('t', { shift: true }), bare)).toBe(false);
	});
});

describe('isBindingSafeFor', () => {
	const bareT: HotkeyBinding = { modifiers: [], key: 'T' };
	const altT: HotkeyBinding = { modifiers: ['Alt'], key: 'T' };
	const bareEnter: HotkeyBinding = { modifiers: [], key: 'Enter' };

	it('refuses a bare printable key where typing inserts text', () => {
		// The failure this whole check exists to prevent: pressing T to
		// translate would write a "T" into the user's note instead.
		expect(isBindingSafeFor(bareT, 'md-edit')).toBe(false);
		expect(isBindingSafeFor(bareT, 'input')).toBe(false);
	});

	it('allows a bare printable key where nothing can be typed', () => {
		expect(isBindingSafeFor(bareT, 'md-read')).toBe(true);
		expect(isBindingSafeFor(bareT, 'pdf')).toBe(true);
		expect(isBindingSafeFor(bareT, 'other')).toBe(true);
	});

	it('allows any combination that carries a modifier', () => {
		for (const context of ['md-edit', 'md-read', 'pdf', 'input', 'other'] as const) {
			expect(isBindingSafeFor(altT, context)).toBe(true);
		}
	});

	it('allows a bare named key everywhere, since it types nothing', () => {
		expect(isBindingSafeFor(bareEnter, 'md-edit')).toBe(true);
	});

	it('is never satisfied by an unset binding', () => {
		expect(isBindingSafeFor(null, 'md-read')).toBe(false);
	});
});

describe('isBindingRisky', () => {
	it('flags exactly the bindings that would type a character', () => {
		expect(isBindingRisky({ modifiers: [], key: 'T' })).toBe(true);
		expect(isBindingRisky({ modifiers: ['Alt'], key: 'T' })).toBe(false);
		expect(isBindingRisky({ modifiers: [], key: 'Enter' })).toBe(false);
		expect(isBindingRisky(null)).toBe(false);
	});
});

describe('formatBinding', () => {
	it('joins the modifiers and the key', () => {
		expect(formatBinding({ modifiers: ['Alt'], key: 'T' }, 'none')).toBe('Alt + T');
	});

	it('orders modifiers consistently regardless of how they were recorded', () => {
		const shiftFirst = formatBinding({ modifiers: ['Shift', 'Ctrl'], key: 'K' }, 'none');
		const ctrlFirst = formatBinding({ modifiers: ['Ctrl', 'Shift'], key: 'K' }, 'none');
		expect(shiftFirst).toBe(ctrlFirst);
		expect(shiftFirst).toBe('Ctrl + Shift + K');
	});

	it('uses the caller-supplied label when nothing is bound', () => {
		expect(formatBinding(null, 'Not set')).toBe('Not set');
	});
});

describe('findHotkeyConflicts', () => {
	const hotkeys: RegisteredHotkey[] = [
		{
			commandId: 'editor:toggle-bold',
			commandName: 'Toggle bold',
			modifiers: ['Mod'],
			key: 'B',
		},
		{
			commandId: 'workspace:split-vertical',
			commandName: 'Split right',
			modifiers: ['Mod', 'Shift'],
			key: 'ArrowRight',
		},
		{
			commandId: 'some-plugin:do-thing',
			commandName: 'Some plugin: Do thing',
			modifiers: ['Alt'],
			key: 'T',
		},
	];

	it('names the command a binding collides with', () => {
		expect(findHotkeyConflicts({ modifiers: ['Alt'], key: 'T' }, hotkeys)).toEqual([
			'Some plugin: Do thing',
		]);
	});

	it('resolves Mod the way Obsidian does, so Ctrl+B collides on Windows', () => {
		expect(findHotkeyConflicts({ modifiers: ['Ctrl'], key: 'B' }, hotkeys)).toEqual([
			'Toggle bold',
		]);
	});

	it('ignores the order modifiers were recorded in', () => {
		const binding: HotkeyBinding = { modifiers: ['Shift', 'Mod'], key: 'ArrowRight' };
		expect(findHotkeyConflicts(binding, hotkeys)).toEqual(['Split right']);
	});

	it('does not report a partial modifier match', () => {
		expect(findHotkeyConflicts({ modifiers: ['Alt', 'Shift'], key: 'T' }, hotkeys)).toEqual([]);
		expect(findHotkeyConflicts({ modifiers: [], key: 'T' }, hotkeys)).toEqual([]);
	});

	it('matches keys regardless of case', () => {
		expect(findHotkeyConflicts({ modifiers: ['Alt'], key: 't' }, hotkeys)).toEqual([
			'Some plugin: Do thing',
		]);
	});

	it('names each command once even when it holds the binding twice', () => {
		const twice: RegisteredHotkey[] = [
			{ commandId: 'a', commandName: 'Command A', modifiers: ['Alt'], key: 'T' },
			{ commandId: 'a', commandName: 'Command A', modifiers: ['Alt'], key: 'T' },
		];
		expect(findHotkeyConflicts({ modifiers: ['Alt'], key: 'T' }, twice)).toEqual(['Command A']);
	});

	it('reports nothing for an unset binding', () => {
		expect(findHotkeyConflicts(null, hotkeys)).toEqual([]);
	});
});

describe('readObsidianHotkeys', () => {
	/** Builds something app-shaped without pulling in the real App type. */
	function fakeApp(shape: unknown): App {
		return shape as App;
	}

	it('reads the user overrides and the defaults together', () => {
		const app = fakeApp({
			hotkeyManager: {
				customKeys: { 'plugin:one': [{ modifiers: ['Alt'], key: 'T' }] },
				defaultKeys: { 'editor:toggle-bold': [{ modifiers: ['Mod'], key: 'B' }] },
			},
			commands: {
				commands: {
					'plugin:one': { name: 'Plugin: One' },
					'editor:toggle-bold': { name: 'Toggle bold' },
				},
			},
		});

		expect(readObsidianHotkeys(app)).toEqual([
			{ commandId: 'plugin:one', commandName: 'Plugin: One', modifiers: ['Alt'], key: 'T' },
			{
				commandId: 'editor:toggle-bold',
				commandName: 'Toggle bold',
				modifiers: ['Mod'],
				key: 'B',
			},
		]);
	});

	it('lets an override replace the default entirely', () => {
		const app = fakeApp({
			hotkeyManager: {
				customKeys: { 'editor:toggle-bold': [{ modifiers: ['Alt'], key: 'B' }] },
				defaultKeys: { 'editor:toggle-bold': [{ modifiers: ['Mod'], key: 'B' }] },
			},
			commands: { commands: {} },
		});

		const found = readObsidianHotkeys(app);
		expect(found).toHaveLength(1);
		expect(found[0]?.modifiers).toEqual(['Alt']);
	});

	it('clearing a hotkey removes it, because an empty override still overrides', () => {
		const app = fakeApp({
			hotkeyManager: {
				customKeys: { 'editor:toggle-bold': [] },
				defaultKeys: { 'editor:toggle-bold': [{ modifiers: ['Mod'], key: 'B' }] },
			},
		});

		expect(readObsidianHotkeys(app)).toEqual([]);
	});

	it('falls back to the command id when the name is not available', () => {
		const app = fakeApp({
			hotkeyManager: { customKeys: { 'plugin:one': [{ modifiers: [], key: 'F6' }] } },
		});

		expect(readObsidianHotkeys(app)[0]?.commandName).toBe('plugin:one');
	});

	it('skips entries with no usable key', () => {
		const app = fakeApp({
			hotkeyManager: { customKeys: { 'plugin:one': [{ modifiers: ['Alt'] }, null, { key: '' }] } },
		});

		expect(readObsidianHotkeys(app)).toEqual([]);
	});

	/*
	 * The reason every read above is wrapped: `app.hotkeyManager` is not part of
	 * the plugin API and may be gone or reshaped in any Obsidian release. Losing
	 * it must cost the conflict warning and nothing else.
	 */
	it('returns nothing when app.hotkeyManager does not exist', () => {
		expect(readObsidianHotkeys(fakeApp({}))).toEqual([]);
		expect(readObsidianHotkeys(fakeApp({ hotkeyManager: undefined }))).toEqual([]);
	});

	it('returns nothing when reading the tables throws', () => {
		const app = fakeApp({
			get hotkeyManager(): never {
				throw new Error('shape changed');
			},
		});

		expect(readObsidianHotkeys(app)).toEqual([]);
	});
});
