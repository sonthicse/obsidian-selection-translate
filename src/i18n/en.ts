/**
 * English UI strings.
 *
 * This file is the shape every other locale must match: `vi.ts` declares
 * `satisfies Messages`, so removing a key here or forgetting one there is a
 * compile error rather than a blank label somebody notices in production.
 *
 * Wording follows Obsidian's style guide: sentence case, active voice, and
 * error messages that say what happened and what to do next rather than
 * apologising. Setting headings never repeat the plugin name and never contain
 * the word "settings".
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
	'error.timeout': 'The translation service did not respond in time.',
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
	'settings.testing': 'Checking…',
	'settings.testConnection': 'Test connection',

	/* Languages */
	'settings.sourceLang': 'Source language',
	'settings.sourceLangDesc': 'The language you are translating from. Detect works for most text.',
	'settings.targetLang': 'Target language',
	'settings.targetLangDesc': 'The language translations are shown in.',
	'settings.uiLanguage': 'Interface language',
	'settings.uiLanguageDesc': 'Language of this plugin’s own labels and messages.',

	/* Engine */
	'settings.engineHeading': 'Translation engine',
	'settings.provider': 'Engine',
	'settings.providerDesc': 'Which service performs the translation.',
	'settings.deeplKey': 'DeepL API key',
	'settings.deeplKeyDesc':
		'Free keys end in :fx and the matching server is selected automatically. Stored as plain text in this vault.',
	'settings.googleCloudKey': 'Google Cloud API key',
	'settings.googleCloudKeyDesc':
		'Needs a Cloud project with billing and the Translation API enabled. Stored as plain text in this vault.',
	'settings.dictionaryEnrichment': 'Look up single words',
	'settings.dictionaryEnrichmentDesc':
		'Adds pronunciation, part of speech and alternative meanings when one word is selected.',
	'settings.dictionarySource': 'Dictionary source',
	'settings.dictionarySourceDesc':
		'Automatic combines both: Google for every language, and the Free Dictionary API for English pronunciation.',
	'settings.freeEndpointWarning':
		'Google (no key) uses an endpoint Google does not document or support. It can change or stop working without notice. Choose DeepL or Google Cloud for a supported service.',

	/* Activation */
	'settings.activationHeading': 'Activation',
	'settings.autoPopup': 'Translate as soon as text is selected',
	'settings.autoPopupDesc':
		'Skips the button. Every selection becomes a request, which uses quota faster.',
	'settings.translateOnDoubleClick': 'Translate on double click',
	'settings.translateOnDoubleClickDesc': 'Double-clicking a word translates it straight away.',
	'settings.hotkeyPointer': 'Keyboard shortcut',
	'settings.hotkeyPointerDesc':
		'Bind a key to the Translate selection command in Obsidian, alongside every other shortcut.',
	'settings.openHotkeys': 'Open Obsidian hotkeys',
	'settings.minLength': 'Shortest selection',
	'settings.minLengthDesc': 'Selections shorter than this are ignored.',
	'settings.maxLength': 'Longest selection',
	'settings.maxLengthDesc': 'Selections longer than this report an error instead of being sent.',
	'settings.iconPlacement': 'Button position',
	'settings.iconPlacementDesc': 'Where the button appears. It moves aside if something is in the way.',
	'settings.iconOffset': 'Button distance',
	'settings.iconOffsetDesc': 'Gap between the selection and the button, in pixels.',

	/* Scope */
	'settings.scopeHeading': 'Where it works',
	'settings.enableInReading': 'Reading view',
	'settings.enableInEditing': 'Editing view',
	'settings.enableInProperties': 'Properties',
	'settings.enableInPdf': 'PDF files',
	'settings.pdfFallback': 'Recover PDF selections',
	'settings.pdfFallbackDesc':
		'Reads the highlighted text layer directly when Obsidian reports an empty PDF selection. Turn off if it misbehaves.',

	/* Appearance */
	'settings.appearanceHeading': 'Appearance',
	'settings.fontSize': 'Font size',
	'settings.fontSizeDesc': 'Text size inside the popup, in pixels.',
	'settings.fontFamily': 'Font',
	'settings.fontFamilyDesc': 'Leave empty to use the same font as the rest of the interface.',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': 'Popup colours',
	'settings.popupThemeDesc': 'White keeps the popup readable under any theme.',

	/* Speech */
	'settings.speechHeading': 'Reading aloud',
	'settings.ttsEngine': 'Voice',
	'settings.ttsEngineDesc':
		'The system voice works offline. Google sends the selected text to Google and needs a connection.',
	'settings.ttsRate': 'Speed',
	'settings.ttsRateDesc': 'How fast the text is read.',

	/* Advanced */
	'settings.advancedHeading': 'Advanced',
	'settings.cacheSize': 'Remembered translations',
	'settings.cacheSizeDesc':
		'Repeated lookups are answered without a request. Kept in memory only and never written to disk. Set to 0 to switch off.',
	'settings.stripMarkdown': 'Remove Markdown before translating',
	'settings.stripMarkdownDesc':
		'Strips syntax such as ** and links so the engine sees the text as a reader would.',
	'settings.debugLog': 'Debug logging',
	'settings.debugLogDesc':
		'Writes diagnostic messages to the developer console. Off unless you are reporting a bug.',
	'settings.reset': 'Restore defaults',
	'settings.resetDesc': 'Returns every option above to its original value. API keys are kept.',
	'settings.resetButton': 'Restore',
	'settings.resetDone': 'Options restored to defaults',

	/* Option labels */
	'lang.auto': 'Detect automatically',
	'uiLang.auto': 'Same as Obsidian',
	'uiLang.en': 'English',
	'uiLang.vi': 'Tiếng Việt',
	'provider.google-free': 'Google (no key)',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': 'Automatic',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API (English)',
	'dict.off': 'Off',
	'placement.below-center': 'Below the selection',
	'placement.above-center': 'Above the selection',
	'placement.cursor': 'At the pointer',
	'theme.light': 'White background',
	'theme.follow': 'Match Obsidian',
	'tts.webspeech': 'System voice',
	'tts.google': 'Google',

	/* Notices. Command names are not here: they are English literals in main.ts,
	   because a name is read once at registration and a translated one would
	   stay stale until the next reload. */
	'notice.autoPopupOn': 'Translating as soon as text is selected',
	'notice.autoPopupOff': 'Showing the button instead of translating immediately',
	'notice.russianRemoved':
		'Russian is no longer available as a translation source in Selection Translate. The source language is now set to detect automatically, which still translates Russian text.',
	'tts.noVoice': 'No system voice is installed for this language.',
	'tts.failed': 'Could not read the text aloud.',
};

export type Messages = typeof en;
export type MessageKey = keyof Messages;
