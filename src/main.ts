import { Notice, Plugin } from 'obsidian';
import { PLUGIN_ID } from './constants';
import { applyLocale, t } from './i18n';
import { applyCssVariables, clearCssVariables } from './utils/dom';
import { debug, resetWarnings, setDebugLogging } from './utils/log';
import { migrate, type SelectionTranslateSettings } from './settings/settings';
import { SelectionTranslateSettingTab } from './settings/SettingTab';
import { SelectionManager } from './core/SelectionManager';
import { TranslationOrchestrator } from './core/TranslationOrchestrator';
import { ProviderRegistry } from './providers/ProviderRegistry';
import type { ValidationResult } from './providers/TranslationProvider';
import type { ProviderId } from './types';
import { TtsService } from './tts/TtsService';
import { UiController } from './ui/UiController';

/**
 * How long a migration notice stays up.
 *
 * Longer than the default, because it explains a setting that changed without
 * the user asking and there is nowhere else to read it afterwards.
 */
const MIGRATION_NOTICE_MS = 12_000;

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

	private selectionManager!: SelectionManager;
	private ui!: UiController;
	private registry!: ProviderRegistry;
	private orchestrator!: TranslationOrchestrator;
	private tts!: TtsService;

	override async onload(): Promise<void> {
		const migrationNotices = await this.loadSettings();
		applyLocale(this.settings.uiLanguage, window);
		for (const key of migrationNotices) new Notice(t(key), MIGRATION_NOTICE_MS);

		this.registry = new ProviderRegistry(() => this.settings);
		this.tts = new TtsService(() => this.settings);
		this.register(() => this.tts.destroy());

		this.orchestrator = new TranslationOrchestrator(() => this.settings, this.registry, {
			onResult: (snapshot, result) => {
				debug('result', {
					provider: result.provider,
					fromCache: result.fromCache,
					elapsedMs: result.elapsedMs,
					entries: result.entries?.length ?? 0,
					// The translation itself is not logged: it is the user's own
					// note content, and a debug flag is not consent to spill it
					// into a console log that ends up attached to bug reports.
				});
				this.ui.handleResult(snapshot, result);
			},
			onError: (snapshot, error) => {
				debug('error', error.messageKey);
				this.ui.handleError(snapshot, error);
			},
		});
		this.register(() => this.orchestrator.destroy());

		this.ui = new UiController({
			app: this.app,
			getSettings: () => this.settings,
			onTranslateRequested: (snapshot) => this.orchestrator.translate(snapshot),
			onChangeProvider: () => this.openPluginSettings(),
			onSpeak: (win, text, lang) => void this.tts.toggle(win, text, lang),
			tts: this.tts,
		});
		this.register(() => this.ui.destroy());

		this.selectionManager = new SelectionManager(() => this.settings, {
			onSelection: (snapshot, cause) => this.ui.handleSelection(snapshot, cause),
			onClear: () => this.ui.handleClear(),
			onPointerDownOutside: () => this.ui.handleDismiss(),
			onViewportChange: (kind) => this.ui.handleViewportChange(kind),
			onEscape: () => this.ui.handleDismiss(),
		}, window);
		// Ties teardown to the plugin's own lifecycle, so unload releases every
		// listener even though they are not individually registerDomEvent'd.
		this.register(() => this.selectionManager.destroy());

		this.addCommands();

		// Changing note, file or layout leaves the floating UI pointing at text
		// that is no longer on screen. Registered one by one because
		// `workspace.on` is overloaded per event name and cannot take a union.
		const dismiss = (): void => {
			this.selectionManager.reset();
			this.ui.handleDismiss();
		};
		this.registerEvent(this.app.workspace.on('active-leaf-change', dismiss));
		this.registerEvent(this.app.workspace.on('file-open', dismiss));
		this.registerEvent(this.app.workspace.on('layout-change', dismiss));

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

	/**
	 * Loads settings, bringing an older `data.json` forward if needed.
	 *
	 * Returns the message keys for anything the migration changed on the user's
	 * behalf rather than showing them here: the notices have to wait until the
	 * interface language has been applied, or they would be phrased in whatever
	 * language happened to be loaded first.
	 */
	async loadSettings(): Promise<string[]> {
		const outcome = migrate(await this.loadData());
		this.settings = outcome.settings;
		setDebugLogging(this.settings.debugLog);

		// Written back immediately: the stored schemaVersion is what stops the
		// migration, and its notices, from running again on the next launch.
		if (outcome.changed) await this.saveData(this.settings);

		return outcome.notices;
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
		applyLocale(this.settings.uiLanguage, window);
		this.refreshCssVariables();
		this.orchestrator.applySettings();
	}

	/** Checks one engine's credentials. Backs the test button in options. */
	testProvider(id: ProviderId): Promise<ValidationResult> {
		return this.registry.getTranslatorById(id).validate();
	}

	/* ── Commands ─────────────────────────────────────────────────────────── */

	/**
	 * Registers the commands.
	 *
	 * No default hotkeys, per Obsidian's guidelines: the plugin has no way of
	 * knowing what a given user has already bound, and quietly claiming a
	 * combination is how plugins break each other. The command ids carry no
	 * plugin prefix either, since Obsidian adds one.
	 *
	 * The names are English literals rather than translated strings. A name is
	 * read once, when the command is registered, so a translated one froze at
	 * whatever the interface language was at load time and only caught up after
	 * a reload — a bug that would have grown a locale at a time. Obsidian groups
	 * commands by plugin name in its hotkeys pane, so they stay easy to find.
	 */
	private addCommands(): void {
		this.addCommand({
			id: 'translate-selection',
			name: 'Translate selection',
			checkCallback: (checking) => {
				const snapshot = this.selectionManager.getCurrentSnapshot();
				if (snapshot == null) return false;

				if (!checking) this.ui.translateCurrent(snapshot);
				return true;
			},
		});

		this.addCommand({
			id: 'toggle-auto-popup',
			name: 'Toggle translate on selection',
			callback: async () => {
				this.settings.autoPopupOnSelection = !this.settings.autoPopupOnSelection;
				await this.saveSettings();
				new Notice(
					t(this.settings.autoPopupOnSelection ? 'notice.autoPopupOn' : 'notice.autoPopupOff')
				);
			},
		});
	}

	/**
	 * Opens this plugin's own options tab.
	 *
	 * `App.setting` is real and stable but missing from the published types, so
	 * it is reached through a narrow structural cast rather than `any`.
	 */
	private openPluginSettings(): void {
		const host = this.app as unknown as {
			setting?: { open(): void; openTabById(id: string): void };
		};
		if (host.setting == null) return;

		host.setting.open();
		host.setting.openTabById(PLUGIN_ID);
	}

	private attachWindow(win: Window): void {
		if (this.attachedWindows.has(win)) return;
		this.attachedWindows.add(win);
		applyCssVariables(win.document, this.settings);
		this.selectionManager.attach(win);
		debug('attached window', this.attachedWindows.size);
	}

	private detachWindow(win: Window): void {
		if (!this.attachedWindows.has(win)) return;
		this.selectionManager.detach(win);
		clearCssVariables(win.document);
		this.attachedWindows.delete(win);
	}

	private refreshCssVariables(): void {
		for (const win of this.attachedWindows) {
			applyCssVariables(win.document, this.settings);
		}
	}
}
