import { Plugin } from 'obsidian';
import { applyCssVariables, clearCssVariables } from './utils/dom';
import { debug, resetWarnings, setDebugLogging } from './utils/log';
import { normalizeSettings, type SelectionTranslateSettings } from './settings/settings';
import { SelectionTranslateSettingTab } from './settings/SettingTab';

export default class SelectionTranslatePlugin extends Plugin {
	// `override` because Obsidian's Plugin declares `settings?: unknown` as the
	// conventional home for loaded data; this narrows it to our shape.
	override settings!: SelectionTranslateSettings;

	/**
	 * Every window the plugin has touched, main plus popouts.
	 *
	 * Tracked explicitly because CSS custom properties are written per-document:
	 * a popout window opened after load has its own `<body>` that never saw the
	 * user's font settings otherwise.
	 */
	private readonly attachedWindows = new Set<Window>();

	override async onload(): Promise<void> {
		await this.loadSettings();

		this.attachWindow(window);
		this.registerEvent(
			this.app.workspace.on('window-open', (_leaf, win) => this.attachWindow(win))
		);
		this.registerEvent(
			this.app.workspace.on('window-close', (_leaf, win) => this.detachWindow(win))
		);

		this.addSettingTab(new SelectionTranslateSettingTab(this.app, this));

		debug('loaded', { provider: this.settings.provider, target: this.settings.targetLang });
	}

	override onunload(): void {
		for (const win of this.attachedWindows) {
			clearCssVariables(win.document);
		}
		this.attachedWindows.clear();
		resetWarnings();
		// DOM and workspace listeners registered through registerDomEvent /
		// registerEvent are removed by Obsidian itself.
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		setDebugLogging(this.settings.debugLog);
	}

	/**
	 * Persists settings and re-applies everything that derives from them.
	 *
	 * Called by the settings tab after each change, which is what makes settings
	 * take effect without a reload.
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		setDebugLogging(this.settings.debugLog);
		this.refreshCssVariables();
	}

	private attachWindow(win: Window): void {
		if (this.attachedWindows.has(win)) return;
		this.attachedWindows.add(win);
		applyCssVariables(win.document, this.settings);
		debug('attached window', this.attachedWindows.size);
	}

	private detachWindow(win: Window): void {
		if (!this.attachedWindows.has(win)) return;
		clearCssVariables(win.document);
		this.attachedWindows.delete(win);
	}

	private refreshCssVariables(): void {
		for (const win of this.attachedWindows) {
			applyCssVariables(win.document, this.settings);
		}
	}
}
