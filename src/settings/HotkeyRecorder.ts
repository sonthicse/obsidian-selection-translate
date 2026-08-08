import { Setting } from 'obsidian';
import { bindingFromEvent, formatBinding, isBindingRisky } from '../core/HotkeyManager';
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
		getBinding: () => HotkeyBinding | null;
		setBinding: (binding: HotkeyBinding | null) => Promise<void>;
	}
): void {
	const setting = new Setting(container)
		.setName(t('settings.triggerHotkey'))
		.setDesc(t('settings.triggerHotkeyDesc'));

	const warning = container.createDiv({ cls: 'st-setting-warning' });
	warning.setText(t('settings.hotkeyUnsafe'));

	let render = (): void => {};

	setting.addButton((button) => {
		render = (): void => {
			button.setButtonText(formatBinding(options.getBinding(), t('settings.noHotkey')));
			button.buttonEl.removeClass('mod-cta');

			// A bare printable key types into the note when the editor has focus.
			// It stays allowed, because it is genuinely convenient in reading
			// view, but never without saying so.
			if (isBindingRisky(options.getBinding())) {
				warning.show();
			} else {
				warning.hide();
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
}
