import type { SelectionSnapshot, TranslationResult, UiErrorInfo } from '../types';
import { debug } from '../utils/log';

export type UiState = 'idle' | 'icon' | 'loading' | 'result' | 'error';

/**
 * A requested move, with the payload that state requires.
 *
 * Modelling the payload as part of the transition rather than as separate
 * setters is what keeps the two from drifting: there is no way to be in
 * `result` without a result, or to leave a stale snapshot behind on the way to
 * `idle`. The UI renders from the state alone, with nothing implicit stashed in
 * the DOM.
 */
export type Transition =
	| { to: 'idle' }
	| { to: 'icon'; snapshot: SelectionSnapshot }
	| { to: 'loading'; snapshot: SelectionSnapshot }
	| { to: 'result'; snapshot: SelectionSnapshot; result: TranslationResult }
	| { to: 'error'; snapshot: SelectionSnapshot; error: UiErrorInfo };

/** Everything the UI needs to render, derived entirely from the last transition. */
export interface MachineContext {
	state: UiState;
	snapshot: SelectionSnapshot | null;
	result: TranslationResult | null;
	error: UiErrorInfo | null;
}

export type StateListener = (context: MachineContext, previous: UiState) => void;

/**
 * Which moves are legal from each state.
 *
 * Self-transitions are allowed exactly where they are meaningful: a fresh
 * selection replaces the one the icon is pointing at, and a retry restarts a
 * load. `idle → result` is absent on purpose — a result can only follow a load,
 * even a cache hit, so the UI never flashes an answer with no request behind it.
 */
const ALLOWED: Record<UiState, readonly UiState[]> = {
	idle: ['icon', 'loading'],
	icon: ['idle', 'icon', 'loading'],
	loading: ['idle', 'loading', 'result', 'error'],
	result: ['idle', 'icon', 'loading'],
	error: ['idle', 'icon', 'loading'],
};

/**
 * The single place UI state changes.
 *
 * Funnelling every move through one method buys two things: illegal sequences
 * are rejected where they happen rather than producing a confusing render three
 * layers away, and turning on debug logging yields a complete trace of what the
 * UI did and why.
 */
export class StateMachine {
	private context: MachineContext = {
		state: 'idle',
		snapshot: null,
		result: null,
		error: null,
	};

	private readonly listeners = new Set<StateListener>();

	getState(): UiState {
		return this.context.state;
	}

	getContext(): MachineContext {
		return this.context;
	}

	getSnapshot(): SelectionSnapshot | null {
		return this.context.snapshot;
	}

	/** Subscribes to changes. Returns an unsubscribe function. */
	subscribe(listener: StateListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/**
	 * Attempts a move.
	 *
	 * Returns false and changes nothing when the move is not legal from the
	 * current state, so a late-arriving event (a network reply after the user
	 * pressed Escape) cannot resurrect dismissed UI.
	 */
	transition(transition: Transition): boolean {
		const previous = this.context.state;
		const next = transition.to;

		if (!ALLOWED[previous].includes(next)) {
			debug('transition rejected', { from: previous, to: next });
			return false;
		}

		this.context = buildContext(transition);
		debug('transition', { from: previous, to: next });

		for (const listener of Array.from(this.listeners)) {
			listener(this.context, previous);
		}
		return true;
	}

	/** Whether a move would be accepted, without performing it. */
	canTransition(to: UiState): boolean {
		return ALLOWED[this.context.state].includes(to);
	}

	/** Drops every listener. Called when the plugin unloads. */
	destroy(): void {
		this.listeners.clear();
		this.context = { state: 'idle', snapshot: null, result: null, error: null };
	}
}

/** Derives the full context from a transition, clearing what no longer applies. */
function buildContext(transition: Transition): MachineContext {
	switch (transition.to) {
		case 'idle':
			return { state: 'idle', snapshot: null, result: null, error: null };
		case 'icon':
			return { state: 'icon', snapshot: transition.snapshot, result: null, error: null };
		case 'loading':
			return { state: 'loading', snapshot: transition.snapshot, result: null, error: null };
		case 'result':
			return {
				state: 'result',
				snapshot: transition.snapshot,
				result: transition.result,
				error: null,
			};
		case 'error':
			return {
				state: 'error',
				snapshot: transition.snapshot,
				result: null,
				error: transition.error,
			};
	}
}
