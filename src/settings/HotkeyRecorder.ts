import { Setting, type App } from 'obsidian';
import {
	bindingFromEvent,
	findHotkeyConflicts,
	formatBinding,
	isBindingRisky,
	readObsidianHotkeys,
} from '../core/HotkeyManager';
import { t } from '../i18n';
import type { HotkeyBinding } from '../types';

/**
 * Captures a key combination for the local trigger key.
 *
 * Recording rather than typing a name: users know a shortcut by pressing it,
 * and any text field asking for "Alt+T" invites a dozen spellings that all have
 * to be parsed.
 *
 * While recording, the field swallows every key press on the capture phase.
 * That is the point — the combination being recorded may well be one Obsidian
 * would otherwise act on, and firing a command in the middle of assigning a
 * shortcut is the classic bug in this kind of control.
 */
export function addHotkeyRecorder(
	container: HTMLElement,
	options: {
		app: App;
		getBinding: () => HotkeyBinding | null;
		setBinding: (binding: HotkeyBinding | null) => Promise<void>;
	}
): void {
	const setting = new Setting(container)
		.setName(t('settings.triggerHotkey'))
		.setDesc(t('settings.triggerHotkeyDesc'));

	const warning = container.createDiv({ cls: 'st-setting-warning' });
	warning.setText(t('settings.hotkeyUnsafe'));

	// A second box rather than one that swaps its text: the two warnings are
	// about different things and can both be true of the same combination.
	const conflict = container.createDiv({ cls: 'st-setting-warning' });

	let render = (): void => {};

	setting.addButton((button) => {
		render = (): void => {
			const binding = options.getBinding();
			button.setButtonText(formatBinding(binding, t('settings.noHotkey')));
			button.buttonEl.removeClass('mod-cta');

			// A bare printable key types into the note when the editor has focus.
			// It stays allowed, because it is genuinely convenient in reading
			// view, but never without saying so.
			if (isBindingRisky(binding)) {
				warning.show();
			} else {
				warning.hide();
			}

			// A collision is reported, not refused: the two keys live in different
			// scopes, so the same combination really can mean one thing while the
			// button is up and another the rest of the time.
			const conflicts = findHotkeyConflicts(binding, readObsidianHotkeys(options.app));
			if (conflicts.length > 0) {
				conflict.setText(t('settings.hotkeyConflict', { commands: conflicts.join(', ') }));
				conflict.show();
			} else {
				conflict.hide();
			}
		};
		render();

		button.onClick(() => {
			button.setButtonText(t('settings.recordingHotkey'));
			button.buttonEl.addClass('mod-cta');

			const doc = button.buttonEl.ownerDocument;

			const listener = (event: KeyboardEvent): void => {
				event.preventDefault();
				event.stopPropagation();

				// Modifiers held on their own are not a combination yet.
				const binding = bindingFromEvent(event);
				if (binding == null) return;

				doc.removeEventListener('keydown', listener, true);
				void options.setBinding(binding).then(render);
			};

			doc.addEventListener('keydown', listener, true);
		});
	});

	setting.addExtraButton((button) => {
		button
			.setIcon('x')
			.setTooltip(t('settings.clearHotkey'))
			.onClick(() => {
				void options.setBinding(null).then(render);
			});
	});

	// Next to the control the conflict is about, so checking what Obsidian
	// already uses does not mean hunting for the right settings pane first.
	setting.addExtraButton((button) => {
		button
			.setIcon('keyboard')
			.setTooltip(t('settings.openHotkeys'))
			.onClick(() => openObsidianHotkeys(options.app));
	});
}

/**
 * Opens Obsidian's own hotkeys pane.
 *
 * `App.setting` is real and stable but missing from the published types, so it
 * is reached through a narrow structural cast rather than `any` — the same way
 * the plugin opens its own tab in `main.ts`. Doing nothing is the right failure:
 * the button is a shortcut to a pane the user can still reach by hand.
 */
function openObsidianHotkeys(app: App): void {
	const host = app as unknown as {
		setting?: { open(): void; openTabById(id: string): void };
	};
	if (host.setting == null) return;

	host.setting.open();
	host.setting.openTabById('hotkeys');
}
