import type { Messages } from './en';

/**
 * Italian UI strings.
 *
 * Terminology follows Obsidian's own it catalogue — Opzioni, Tasti di scelta
 * rapida, Lettura, Modifica, Anteprima dinamica, Proprietà, Aspetto, Carattere,
 * Cache, Vault — including its informal "tu" register.
 *
 * Italian runs long like Spanish, so labels are kept to the shortest phrase
 * that still says the whole thing. Obsidian's own pane is named "Tasti di
 * scelta rapida", so the button that opens it says exactly that, while the
 * setting above it uses the everyday singular "scorciatoia da tastiera".
 */
export const it = {
	'icon.label': 'Traduci il testo selezionato',
	'popup.loading': 'Traduzione in corso',
	'popup.speak': 'Leggi ad alta voce',
	'popup.stopSpeaking': 'Interrompi la lettura',
	'popup.copy': 'Copia la traduzione',
	'popup.copied': 'Traduzione copiata',
	'popup.copyFailed': 'Impossibile copiare negli appunti.',
	'popup.settings': 'Apri le opzioni del plugin',
	'popup.close': 'Chiudi',
	'popup.fromCache': 'in cache',
	'popup.elapsed': '{ms} ms',

	'action.retry': 'Riprova',
	'action.openSettings': 'Apri le opzioni',
	'action.changeProvider': 'Cambia motore',

	'error.missingKey': 'Il motore selezionato non ha una chiave API impostata.',
	'error.invalidKey': 'La chiave API è stata rifiutata. Controlla di averla incollata per intero.',
	'error.quotaExceeded': 'Questo motore ha esaurito la quota del periodo corrente.',
	'error.rateLimited': 'Troppe richieste di seguito. Aspetta un momento e riprova.',
	'error.serverBusy': 'Il servizio di traduzione è occupato.',
	'error.tooLong': 'La selezione è di {length} caratteri. Il limite è {max}.',
	'error.unsupportedPair': 'Questo motore non traduce da {source} a {target}.',
	'error.timeout': 'Il servizio di traduzione non ha risposto in tempo.',
	'error.network': 'Impossibile raggiungere il servizio di traduzione. Controlla la connessione.',
	'error.badResponse': 'Il servizio di traduzione ha restituito qualcosa di illeggibile.',
	'error.unknown': 'La traduzione non è riuscita.',
	'error.emptySelection': 'La selezione non contiene testo da tradurre.',

	'settings.testOk': 'La connessione funziona.',
	'settings.testOkWithQuota': 'La connessione funziona. {used} caratteri usati su {limit}.',
	'settings.testFailed': 'Connessione non riuscita.',
	'settings.testInvalidKey': 'La chiave API è stata rifiutata.',
	'settings.testMissingKey': 'Inserisci prima una chiave API.',
	'settings.testBadResponse': 'Connessione riuscita, ma la risposta non è leggibile.',
	'settings.testing': 'Verifica in corso…',
	'settings.testConnection': 'Prova la connessione',

	'settings.sourceLang': 'Lingua di origine',
	'settings.sourceLangDesc': 'La lingua da cui tradurre. Il rilevamento va bene per quasi tutti i testi.',
	'settings.targetLang': 'Lingua di destinazione',
	'settings.targetLangDesc': 'La lingua in cui vengono mostrate le traduzioni.',
	'settings.uiLanguage': 'Lingua dell’interfaccia',
	'settings.uiLanguageDesc': 'Lingua delle etichette e dei messaggi di questo plugin.',

	'settings.engineHeading': 'Motore di traduzione',
	'settings.provider': 'Motore',
	'settings.providerDesc': 'Il servizio che esegue la traduzione.',
	'settings.deeplKey': 'Chiave API DeepL',
	'settings.deeplKeyDesc':
		'Le chiavi gratuite finiscono con :fx e il server corrispondente viene scelto da solo. Salvata in chiaro in questo vault.',
	'settings.googleCloudKey': 'Chiave API Google Cloud',
	'settings.googleCloudKeyDesc':
		'Richiede un progetto Cloud con fatturazione attiva e la Translation API abilitata. Salvata in chiaro in questo vault.',
	'settings.dictionaryEnrichment': 'Cerca le singole parole',
	'settings.dictionaryEnrichmentDesc':
		'Aggiunge pronuncia, categoria grammaticale e altri significati quando selezioni una sola parola.',
	'settings.dictionarySource': 'Origine del dizionario',
	'settings.dictionarySourceDesc':
		'Automatico usa entrambi: Google per tutte le lingue e Free Dictionary API per la pronuncia inglese.',
	'settings.freeEndpointWarning':
		'Google (senza chiave) usa un endpoint che Google non documenta né supporta. Può cambiare o smettere di funzionare senza preavviso. Scegli DeepL o Google Cloud se ti serve un servizio supportato.',

	'settings.activationHeading': 'Attivazione',
	'settings.autoPopup': 'Traduci appena selezioni il testo',
	'settings.autoPopupDesc':
		'Salta il pulsante. Ogni selezione diventa una richiesta e consuma la quota più in fretta.',
	'settings.translateOnDoubleClick': 'Traduci con doppio clic',
	'settings.translateOnDoubleClickDesc': 'Il doppio clic su una parola la traduce subito.',
	'settings.hotkeyPointer': 'Scorciatoia da tastiera',
	'settings.hotkeyPointerDesc':
		'Assegna un tasto al comando «Translate selection» in Obsidian, insieme a tutte le altre scorciatoie.',
	'settings.openHotkeys': 'Apri i tasti di scelta rapida di Obsidian',
	'settings.minLength': 'Selezione più corta',
	'settings.minLengthDesc': 'Le selezioni più corte vengono ignorate.',
	'settings.maxLength': 'Selezione più lunga',
	'settings.maxLengthDesc': 'Le selezioni più lunghe danno errore invece di essere inviate.',
	'settings.iconPlacement': 'Posizione del pulsante',
	'settings.iconPlacementDesc': 'Dove compare il pulsante. Si sposta se qualcosa lo ostacola.',
	'settings.iconOffset': 'Distanza del pulsante',
	'settings.iconOffsetDesc': 'Spazio fra la selezione e il pulsante, in pixel.',

	'settings.scopeHeading': 'Dove funziona',
	'settings.enableInReading': 'Vista Lettura',
	'settings.enableInEditing': 'Vista Modifica',
	'settings.enableInProperties': 'Proprietà',
	'settings.enableInPdf': 'File PDF',
	'settings.pdfFallback': 'Recupera le selezioni nei PDF',
	'settings.pdfFallbackDesc':
		'Legge direttamente il livello di testo evidenziato quando Obsidian segnala una selezione PDF vuota. Disattivalo se dà problemi.',

	'settings.appearanceHeading': 'Aspetto',
	'settings.fontSize': 'Dimensione del carattere',
	'settings.fontSizeDesc': 'Dimensione del testo nella finestra popup, in pixel.',
	'settings.fontFamily': 'Carattere',
	'settings.fontFamilyDesc': 'Lascia vuoto per usare lo stesso carattere del resto dell’interfaccia.',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': 'Colori della finestra popup',
	'settings.popupThemeDesc': 'Il bianco mantiene la finestra leggibile con qualsiasi tema.',

	'settings.speechHeading': 'Lettura ad alta voce',
	'settings.ttsEngine': 'Voce',
	'settings.ttsEngineDesc':
		'La voce di sistema funziona offline. Google invia il testo selezionato a Google e richiede una connessione.',
	'settings.ttsRate': 'Velocità',
	'settings.ttsRateDesc': 'Quanto in fretta viene letto il testo.',

	'settings.advancedHeading': 'Avanzate',
	'settings.cacheSize': 'Traduzioni memorizzate',
	'settings.cacheSizeDesc':
		'Le ricerche ripetute non generano una nuova richiesta. Restano solo in memoria e non finiscono mai su disco. Imposta 0 per disattivare.',
	'settings.stripMarkdown': 'Rimuovi il Markdown prima di tradurre',
	'settings.stripMarkdownDesc':
		'Toglie la sintassi come ** e i collegamenti, così il motore vede il testo come lo vede chi legge.',
	'settings.debugLog': 'Log di debug',
	'settings.debugLogDesc':
		'Scrive messaggi diagnostici nella console per sviluppatori, che li mostra solo al livello verbose. Tienilo spento se non stai segnalando un problema.',
	'settings.reset': 'Ripristina i valori predefiniti',
	'settings.resetDesc': 'Riporta tutte le opzioni qui sopra al valore iniziale. Le chiavi API restano.',
	'settings.resetButton': 'Ripristina',
	'settings.resetDone': 'Opzioni riportate ai valori predefiniti',

	'lang.auto': 'Rileva automaticamente',
	'uiLang.auto': 'Come Obsidian',
	'provider.google-free': 'Google (senza chiave)',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': 'Automatico',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API (inglese)',
	'dict.off': 'Disattivato',
	'placement.below-center': 'Sotto la selezione',
	'placement.above-center': 'Sopra la selezione',
	'placement.cursor': 'Al puntatore',
	'theme.light': 'Sfondo bianco',
	'theme.follow': 'Come Obsidian',
	'tts.webspeech': 'Voce di sistema',
	'tts.google': 'Google',

	'notice.autoPopupOn': 'La traduzione partirà appena selezioni del testo',
	'notice.autoPopupOff': 'Verrà mostrato il pulsante invece di tradurre subito',
	'notice.russianRemoved':
		'Selection Translate non accetta più il russo come lingua di origine. La lingua di origine è passata al rilevamento automatico, che traduce comunque i testi in russo.',
	'tts.noVoice': 'Non è installata nessuna voce di sistema per questa lingua.',
	'tts.failed': 'Impossibile leggere il testo ad alta voce.',
} satisfies Messages;
