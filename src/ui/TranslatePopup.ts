import { Notice, Scope, type App } from 'obsidian';
import { CLS, POPUP_LOADING_HEIGHT, POPUP_MIN_WIDTH, POPUP_RESIZE_MS } from '../constants';
import { t } from '../i18n';
import type { SelectionTranslateSettings } from '../settings/settings';
import type { Rect, SelectionSnapshot, TranslationResult, UiErrorInfo } from '../types';
import { debug, logError } from '../utils/log';
import { ICON, applyIcon, type IconName } from './icons';
import type { Size } from './Positioner';

export interface PopupHandlers {
	/** Asks the controller where a popup of this size should sit. */
	place(size: Size): Rect;
	onClose(): void;
	onRetry(): void;
	onOpenSettings(): void;
	onChangeProvider(): void;
	/** Supplied from Phase 6 onward; the read-aloud button is omitted without it. */
	onSpeak?: (text: string, lang: string) => void;
}

/**
 * Minimal view of Obsidian's settings host.
 *
 * `App.setting` is real and stable but absent from the published types, so it
 * is reached through a narrow structural cast rather than through `any`, which
 * would switch off checking for the whole expression.
 */
interface SettingsHost {
	setting?: {
		open(): void;
		openTabById(id: string): void;
	};
}

/**
 * The result popup.
 *
 * Renders whatever the state machine currently holds and nothing else. Every
 * node is built through Obsidian's element helpers — no markup is ever parsed,
 * which is both a plugin guideline and the only safe way to display text that
 * arrived from a translation service.
 */
export class TranslatePopup {
	private el: HTMLElement | null = null;
	private ownerWin: Window | null = null;
	private scope: Scope | null = null;

	private pendingFrame: number | null = null;
	private resizeTimer: number | null = null;

	/** Focused element from before the popup opened, restored on close. */
	private previousFocus: Element | null = null;
	/** Whether focus was ever moved into the popup, so it is only restored if taken. */
	private tookFocus = false;

	constructor(
		private readonly app: App,
		private readonly getSettings: () => SelectionTranslateSettings,
		private readonly handlers: PopupHandlers
	) {}

	isOpen(): boolean {
		return this.el != null;
	}

	/** Contains a node, used to tell clicks inside the popup from clicks outside. */
	contains(node: Node | null): boolean {
		return node != null && this.el != null && this.el.contains(node);
	}

	/**
	 * Opens the small loading popup.
	 *
	 * Fixed-size on purpose: the finished answer could be two lines or twenty,
	 * and guessing wrong means the popup jumps when the result lands. Starting
	 * small and growing to a measured size is what makes that transition
	 * smooth.
	 */
	showLoading(snapshot: SelectionSnapshot): void {
		const el = this.ensureElement(snapshot.win);
		this.previousFocus = snapshot.activeElement;

		el.addClass('is-loading');
		el.empty();

		const body = el.createDiv({ cls: 'st-popup-loading' });
		body.setAttribute('role', 'status');
		body.setAttribute('aria-label', t('popup.loading'));

		const dots = body.createDiv({ cls: 'st-dots' });
		for (let i = 0; i < 3; i++) dots.createSpan({ cls: 'st-dot' });

		this.applySize(el, { width: POPUP_MIN_WIDTH, height: POPUP_LOADING_HEIGHT });
		this.moveTo(this.handlers.place({ width: POPUP_MIN_WIDTH, height: POPUP_LOADING_HEIGHT }));
	}

	/** Replaces the loading state with a finished translation. */
	showResult(result: TranslationResult): void {
		this.swapContent((parent) => this.buildResult(parent, result));
	}

	/** Replaces the loading state with a failure and its one useful action. */
	showError(error: UiErrorInfo): void {
		this.swapContent((parent) => this.buildError(parent, error));
	}

	moveTo(rect: Rect): void {
		if (this.el == null) return;
		// Runtime-computed geometry, the one thing this plugin sets inline.
		this.el.style.left = `${Math.round(rect.left)}px`;
		this.el.style.top = `${Math.round(rect.top)}px`;
	}

	/** Closes the popup and hands focus back if it was taken. */
	close(): void {
		if (this.el == null) return;

		this.cancelPending();
		this.releaseScope();

		this.el.remove();
		this.el = null;
		this.ownerWin = null;

		if (this.tookFocus && this.previousFocus instanceof HTMLElement) {
			this.previousFocus.focus();
		}
		this.tookFocus = false;
		this.previousFocus = null;
	}

	destroy(): void {
		this.close();
	}

	/* ── Element lifecycle ────────────────────────────────────────────────── */

	private ensureElement(win: Window): HTMLElement {
		if (this.el != null && this.ownerWin === win) return this.el;

		this.close();
		this.ownerWin = win;

		const el = win.document.body.createDiv({ cls: CLS.popup });
		el.setAttribute('role', 'dialog');
		el.setAttribute('aria-label', t('icon.label'));
		el.toggleClass('mod-follow-theme', this.getSettings().popupTheme === 'follow');

		this.el = el;
		this.claimScope();
		return el;
	}

	/**
	 * Captures Escape, and Tab as the way into the popup.
	 *
	 * A Scope is what stops Escape from falling through to the editor, where it
	 * would exit a mode or close something else entirely.
	 *
	 * Focus is deliberately *not* taken when the popup opens: doing so collapses
	 * the selection, and seeing which words were translated is most of the value
	 * of the highlight staying put. Instead the first Tab press moves focus in,
	 * so the buttons are reachable by keyboard without penalising everyone who
	 * used the mouse.
	 */
	private claimScope(): void {
		const scope = new Scope();

		scope.register([], 'Escape', (event) => {
			event.preventDefault();
			this.handlers.onClose();
			return false;
		});

		scope.register([], 'Tab', (event) => {
			if (this.el == null || this.el.contains(this.el.ownerDocument.activeElement)) {
				// Focus is already inside; let the browser cycle normally.
				return true;
			}
			const first = this.el.querySelector<HTMLElement>('button');
			if (first == null) return true;

			event.preventDefault();
			this.tookFocus = true;
			first.focus();
			return false;
		});

		this.app.keymap.pushScope(scope);
		this.scope = scope;
	}

	private releaseScope(): void {
		if (this.scope == null) return;
		this.app.keymap.popScope(this.scope);
		this.scope = null;
	}

	/* ── Growing to fit the content ───────────────────────────────────────── */

	/**
	 * Swaps in new content and animates the popup to the size it needs.
	 *
	 * The content is built once, into an off-screen twin carrying the same
	 * classes and the same max-width, so measuring it gives the size it will
	 * actually occupy. The nodes are then moved — not rebuilt — into the real
	 * popup, so any listener attached while building survives.
	 */
	private swapContent(build: (parent: HTMLElement) => void): void {
		const el = this.el;
		const win = this.ownerWin;
		if (el == null || win == null) return;

		this.cancelPending();

		const measured = this.measure(win, build);

		// Pin the current size so the transition has somewhere to start.
		const current = el.getBoundingClientRect();
		this.applySize(el, { width: current.width, height: current.height });

		el.removeClass('is-loading');
		el.empty();
		for (const node of measured.nodes) el.appendChild(node);

		this.pendingFrame = win.requestAnimationFrame(() => {
			this.pendingFrame = null;
			this.applySize(el, measured.size);
			this.moveTo(this.handlers.place(measured.size));
			this.afterResize(el, win);
		});
	}

	/**
	 * Builds the content off-screen and returns its size and its nodes.
	 *
	 * The twin is a real `.st-popup`, so it inherits the same font, padding and
	 * max-width; measuring anything less faithful would give a size the popup
	 * then has to correct visibly.
	 */
	private measure(win: Window, build: (parent: HTMLElement) => void): { size: Size; nodes: Node[] } {
		const twin = win.document.body.createDiv({ cls: `${CLS.popup} ${CLS.measure}` });
		twin.toggleClass('mod-follow-theme', this.getSettings().popupTheme === 'follow');

		try {
			build(twin);
			const rect = twin.getBoundingClientRect();
			return {
				size: { width: Math.ceil(rect.width), height: Math.ceil(rect.height) },
				nodes: Array.from(twin.childNodes),
			};
		} finally {
			twin.remove();
		}
	}

	/**
	 * Releases the fixed height once the growth animation has finished.
	 *
	 * Leaving an explicit height behind would freeze the popup at the size it
	 * happened to need, so expanding the original text or a long list of
	 * meanings would be clipped instead of scrolled.
	 *
	 * A timer backs up `transitionend` because that event never fires when the
	 * size did not change, or when the reader has reduced motion enabled and the
	 * transition is switched off in CSS.
	 */
	private afterResize(el: HTMLElement, win: Window): void {
		let done = false;

		const finish = (): void => {
			if (done) return;
			done = true;

			el.removeEventListener('transitionend', onEnd);
			if (this.resizeTimer !== null) {
				win.clearTimeout(this.resizeTimer);
				this.resizeTimer = null;
			}

			el.style.height = 'auto';
			// The content may have reflowed into a different height, so the
			// placement is worth one more pass.
			const rect = el.getBoundingClientRect();
			this.moveTo(this.handlers.place({ width: rect.width, height: rect.height }));
		};

		const onEnd = (event: TransitionEvent): void => {
			if (event.target !== el || event.propertyName !== 'height') return;
			finish();
		};

		el.addEventListener('transitionend', onEnd);
		this.resizeTimer = win.setTimeout(finish, POPUP_RESIZE_MS + 60);
	}

	private applySize(el: HTMLElement, size: Size): void {
		el.style.width = `${Math.round(size.width)}px`;
		el.style.height = `${Math.round(size.height)}px`;
	}

	private cancelPending(): void {
		if (this.pendingFrame !== null) {
			this.ownerWin?.cancelAnimationFrame(this.pendingFrame);
			this.pendingFrame = null;
		}
		if (this.resizeTimer !== null) {
			this.ownerWin?.clearTimeout(this.resizeTimer);
			this.resizeTimer = null;
		}
	}

	/* ── Content ──────────────────────────────────────────────────────────── */

	private buildResult(parent: HTMLElement, result: TranslationResult): void {
		this.buildHeader(parent, result);

		const body = parent.createDiv({ cls: 'st-popup-body' });

		if (result.phonetic != null) {
			body.createDiv({ cls: 'st-phonetic', text: `/${stripSlashes(result.phonetic)}/` });
		}

		body.createDiv({ cls: 'st-translation', text: result.translated });

		// The dictionary block is omitted entirely rather than rendered empty,
		// so a sentence translation leaves no blank space behind.
		for (const entry of result.entries ?? []) {
			const entryEl = body.createDiv({ cls: 'st-entry' });
			entryEl.createDiv({ cls: 'st-pos', text: entry.partOfSpeech });
			entryEl.createDiv({ cls: 'st-meanings', text: entry.meanings.join(', ') });
		}

		this.buildSourceToggle(body, result.sourceText);
		this.buildFooter(parent, result);
	}

	private buildHeader(parent: HTMLElement, result: TranslationResult): void {
		const header = parent.createDiv({ cls: 'st-popup-header' });

		const speak = this.handlers.onSpeak;
		if (speak != null) {
			this.button(header, ICON.speak, t('popup.speak'), () => {
				speak(result.sourceText, result.detectedSourceLang);
			});
		}

		this.button(header, ICON.copy, t('popup.copy'), () => {
			void this.copy(result.translated);
		});

		header.createDiv({ cls: 'st-spacer' });

		this.button(header, ICON.settings, t('popup.settings'), () => this.openSettings());
		this.button(header, ICON.close, t('popup.close'), () => this.handlers.onClose());
	}

	/**
	 * A collapsed view of the text that was actually sent.
	 *
	 * Worth having because the normalizer rewrites the selection before it
	 * leaves — stripping markdown, joining wrapped lines — and a surprising
	 * translation is usually explained by seeing what went out.
	 */
	private buildSourceToggle(parent: HTMLElement, sourceText: string): void {
		const wrapper = parent.createDiv({ cls: 'st-source' });

		const toggle = wrapper.createEl('button', {
			cls: 'st-source-toggle',
			text: t('popup.showSource'),
			attr: { type: 'button' },
		});
		const content = wrapper.createDiv({ cls: 'st-source-text', text: sourceText });
		content.hide();

		toggle.addEventListener('click', () => {
			const showing = content.isShown();
			if (showing) {
				content.hide();
			} else {
				content.show();
			}
			toggle.setText(showing ? t('popup.showSource') : t('popup.hideSource'));
		});
	}

	private buildFooter(parent: HTMLElement, result: TranslationResult): void {
		const footer = parent.createDiv({ cls: 'st-popup-footer' });

		const parts = [providerLabel(result.provider)];
		const target = this.getSettings().targetLang;
		if (result.detectedSourceLang.length > 0) {
			parts.push(`${result.detectedSourceLang} → ${target}`);
		}
		parts.push(result.fromCache ? t('popup.fromCache') : t('popup.elapsed', { ms: result.elapsedMs }));

		footer.createDiv({ cls: 'st-provider-badge', text: parts.join(' · ') });
	}

	private buildError(parent: HTMLElement, error: UiErrorInfo): void {
		const header = parent.createDiv({ cls: 'st-popup-header' });
		header.createDiv({ cls: 'st-spacer' });
		this.button(header, ICON.close, t('popup.close'), () => this.handlers.onClose());

		const body = parent.createDiv({ cls: 'st-popup-body' });
		body.createDiv({ cls: 'st-error', text: t(error.messageKey, error.vars) });

		// Every failure offers a way forward; "something went wrong" with no
		// next step is the least useful thing a plugin can say.
		const action = this.errorAction(error);
		if (action != null) {
			const actions = body.createDiv({ cls: 'st-actions' });
			const button = actions.createEl('button', {
				cls: 'st-action',
				text: action.label,
				attr: { type: 'button' },
			});
			button.addEventListener('click', action.run);
		}
	}

	private errorAction(error: UiErrorInfo): { label: string; run: () => void } | null {
		switch (error.action) {
			case 'retry':
				return { label: t('action.retry'), run: () => this.handlers.onRetry() };
			case 'open-settings':
				return { label: t('action.openSettings'), run: () => this.openSettings() };
			case 'change-provider':
				return { label: t('action.changeProvider'), run: () => this.handlers.onChangeProvider() };
			case 'none':
				return null;
			default:
				return null;
		}
	}

	private button(parent: HTMLElement, icon: IconName, label: string, onClick: () => void): HTMLElement {
		const button = parent.createEl('button', {
			cls: 'st-btn',
			attr: { type: 'button', 'aria-label': label, title: label },
		});
		applyIcon(button, icon);
		button.addEventListener('click', (event) => {
			event.preventDefault();
			onClick();
		});
		return button;
	}

	private async copy(text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			new Notice(t('popup.copied'));
		} catch (cause) {
			logError('clipboard write failed', cause);
			new Notice(t('popup.copyFailed'));
		}
	}

	private openSettings(): void {
		const host = this.app as unknown as SettingsHost;
		if (host.setting == null) {
			debug('settings host unavailable');
			return;
		}
		host.setting.open();
		host.setting.openTabById('selection-translate');
		this.handlers.onOpenSettings();
	}
}

/** Human-readable engine name for the footer badge. */
function providerLabel(id: string): string {
	switch (id) {
		case 'deepl':
			return 'DeepL';
		case 'google-cloud':
			return 'Google Cloud';
		case 'google-free':
			return 'Google';
		default:
			return id;
	}
}

/** Avoids rendering `//word//` when the source already supplied the slashes. */
function stripSlashes(phonetic: string): string {
	return phonetic.replace(/^\/+|\/+$/g, '');
}
