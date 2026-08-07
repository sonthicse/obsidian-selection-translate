import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StateMachine, type UiState } from '../src/core/StateMachine';
import type { SelectionSnapshot, TranslationResult, UiErrorInfo } from '../src/types';
import { makeRect } from '../src/types';

function snapshot(id = 1): SelectionSnapshot {
	const bbox = makeRect(0, 0, 10, 10);
	return {
		text: 'information',
		rects: [bbox],
		bbox,
		anchorRect: bbox,
		context: 'md-read',
		inProperties: false,
		win: {} as Window,
		containerEl: {} as HTMLElement,
		activeElement: null,
		cursor: null,
		id,
	};
}

const result: TranslationResult = {
	translated: 'thông tin',
	detectedSourceLang: 'en',
	isSingleWord: true,
	provider: 'google-free',
	fromCache: false,
	elapsedMs: 12,
	sourceText: 'information',
};

const error: UiErrorInfo = { messageKey: 'error.invalidKey', action: 'open-settings' };

describe('StateMachine', () => {
	let machine: StateMachine;

	beforeEach(() => {
		machine = new StateMachine();
	});

	it('starts idle with nothing held', () => {
		expect(machine.getState()).toBe('idle');
		expect(machine.getContext()).toEqual({
			state: 'idle',
			snapshot: null,
			result: null,
			error: null,
		});
	});

	it('walks the main path: idle to icon to loading to result', () => {
		const snap = snapshot();

		expect(machine.transition({ to: 'icon', snapshot: snap })).toBe(true);
		expect(machine.getState()).toBe('icon');

		expect(machine.transition({ to: 'loading', snapshot: snap })).toBe(true);
		expect(machine.getState()).toBe('loading');

		expect(machine.transition({ to: 'result', snapshot: snap, result })).toBe(true);
		expect(machine.getContext().result).toBe(result);
	});

	it('goes straight to loading, as a double click or command does', () => {
		expect(machine.transition({ to: 'loading', snapshot: snapshot() })).toBe(true);
		expect(machine.getState()).toBe('loading');
	});

	it('refuses a result that no request preceded', () => {
		// Guards against a stale reply painting an answer over dismissed UI.
		expect(machine.transition({ to: 'result', snapshot: snapshot(), result })).toBe(false);
		expect(machine.getState()).toBe('idle');
	});

	it('refuses an error from idle', () => {
		expect(machine.transition({ to: 'error', snapshot: snapshot(), error })).toBe(false);
		expect(machine.getState()).toBe('idle');
	});

	it('drops a reply that arrives after the user dismissed the popup', () => {
		const snap = snapshot();
		machine.transition({ to: 'loading', snapshot: snap });
		machine.transition({ to: 'idle' });

		// The network reply lands now. It must not resurrect the popup.
		expect(machine.transition({ to: 'result', snapshot: snap, result })).toBe(false);
		expect(machine.getState()).toBe('idle');
	});

	it('lets a new selection replace the one the icon points at', () => {
		machine.transition({ to: 'icon', snapshot: snapshot(1) });
		expect(machine.transition({ to: 'icon', snapshot: snapshot(2) })).toBe(true);
		expect(machine.getSnapshot()?.id).toBe(2);
	});

	it('allows retrying from the error state', () => {
		const snap = snapshot();
		machine.transition({ to: 'loading', snapshot: snap });
		machine.transition({ to: 'error', snapshot: snap, error });

		expect(machine.transition({ to: 'loading', snapshot: snap })).toBe(true);
		expect(machine.getContext().error).toBeNull();
	});

	it('clears everything on the way to idle', () => {
		const snap = snapshot();
		machine.transition({ to: 'loading', snapshot: snap });
		machine.transition({ to: 'result', snapshot: snap, result });
		machine.transition({ to: 'idle' });

		expect(machine.getContext()).toEqual({
			state: 'idle',
			snapshot: null,
			result: null,
			error: null,
		});
	});

	it('never carries a result into a state that has no result', () => {
		const snap = snapshot();
		machine.transition({ to: 'loading', snapshot: snap });
		machine.transition({ to: 'result', snapshot: snap, result });
		machine.transition({ to: 'loading', snapshot: snap });

		expect(machine.getContext().result).toBeNull();
	});

	it('notifies listeners with the new context and the previous state', () => {
		const listener = vi.fn();
		machine.subscribe(listener);

		const snap = snapshot();
		machine.transition({ to: 'icon', snapshot: snap });

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener.mock.calls[0]?.[0]).toMatchObject({ state: 'icon', snapshot: snap });
		expect(listener.mock.calls[0]?.[1]).toBe('idle');
	});

	it('does not notify listeners about a rejected transition', () => {
		const listener = vi.fn();
		machine.subscribe(listener);

		machine.transition({ to: 'result', snapshot: snapshot(), result });
		expect(listener).not.toHaveBeenCalled();
	});

	it('stops notifying after unsubscribe', () => {
		const listener = vi.fn();
		const unsubscribe = machine.subscribe(listener);
		unsubscribe();

		machine.transition({ to: 'icon', snapshot: snapshot() });
		expect(listener).not.toHaveBeenCalled();
	});

	it('reports whether a move would be accepted without performing it', () => {
		expect(machine.canTransition('result')).toBe(false);
		expect(machine.canTransition('icon')).toBe(true);
		expect(machine.getState()).toBe('idle');
	});

	it('can always return to idle from any state', () => {
		const snap = snapshot();
		const reachable: Array<[UiState, () => void]> = [
			['icon', () => machine.transition({ to: 'icon', snapshot: snap })],
			['loading', () => machine.transition({ to: 'loading', snapshot: snap })],
			[
				'result',
				() => {
					machine.transition({ to: 'loading', snapshot: snap });
					machine.transition({ to: 'result', snapshot: snap, result });
				},
			],
			[
				'error',
				() => {
					machine.transition({ to: 'loading', snapshot: snap });
					machine.transition({ to: 'error', snapshot: snap, error });
				},
			],
		];

		for (const [expected, enter] of reachable) {
			machine.transition({ to: 'idle' });
			enter();
			expect(machine.getState()).toBe(expected);
			// Escape and click-outside must work from everywhere.
			expect(machine.transition({ to: 'idle' })).toBe(true);
		}
	});

	it('resets and drops listeners when destroyed', () => {
		const listener = vi.fn();
		machine.subscribe(listener);
		machine.transition({ to: 'icon', snapshot: snapshot() });
		listener.mockClear();

		machine.destroy();

		expect(machine.getState()).toBe('idle');
		machine.transition({ to: 'icon', snapshot: snapshot() });
		expect(listener).not.toHaveBeenCalled();
	});
});
