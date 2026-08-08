import { describe, expect, it } from 'vitest';
import {
	bindingFromEvent,
	formatBinding,
	isBindingRisky,
	isBindingSafeFor,
	matchesBinding,
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
