/**
 * English UI strings.
 *
 * This file is the shape every other locale must match: `vi.ts` declares
 * `satisfies typeof en`, so removing a key here or forgetting one there is a
 * compile error rather than a blank label somebody notices in production.
 *
 * Wording follows Obsidian's style guide: sentence case, active voice, and
 * error messages that say what happened and what to do next rather than
 * apologising.
 */
export const en = {
	/* Trigger icon and popup chrome */
	'icon.label': 'Translate selection',
	'popup.loading': 'Translating',
	'popup.speak': 'Read aloud',
	'popup.stopSpeaking': 'Stop reading',
	'popup.copy': 'Copy translation',
	'popup.copied': 'Translation copied',
	'popup.copyFailed': 'Could not copy to the clipboard.',
	'popup.settings': 'Open plugin options',
	'popup.close': 'Close',
	'popup.showSource': 'Show original',
	'popup.hideSource': 'Hide original',
	'popup.otherMeanings': 'Other meanings',
	'popup.fromCache': 'cached',
	'popup.elapsed': '{ms} ms',

	/* Error actions */
	'action.retry': 'Try again',
	'action.openSettings': 'Open options',
	'action.changeProvider': 'Change engine',

	/* Failures */
	'error.missingKey': 'No API key is set for the selected engine.',
	'error.invalidKey': 'The API key was rejected. Check that it was pasted in full.',
	'error.quotaExceeded': 'This engine has no quota left for the current period.',
	'error.rateLimited': 'Too many requests in a row. Wait a moment and try again.',
	'error.serverBusy': 'The translation service is busy.',
	'error.tooLong': 'The selection is {length} characters. The limit is {max}.',
	'error.unsupportedPair': 'This engine does not translate {source} into {target}.',
	'error.network': 'Could not reach the translation service. Check your connection.',
	'error.badResponse': 'The translation service returned something unreadable.',
	'error.unknown': 'The translation failed.',
	'error.emptySelection': 'The selection has no text to translate.',

	/* Connection test, shown beside the buttons in options */
	'settings.testOk': 'Connection works.',
	'settings.testOkWithQuota': 'Connection works. {used} of {limit} characters used.',
	'settings.testFailed': 'Connection failed.',
	'settings.testInvalidKey': 'The API key was rejected.',
	'settings.testMissingKey': 'Enter an API key first.',
	'settings.testBadResponse': 'Connected, but the response could not be read.',
};

export type Messages = typeof en;
export type MessageKey = keyof Messages;
