import type { Messages } from './en';

/**
 * Spanish UI strings.
 *
 * Terminology follows Obsidian's own es catalogue — Opciones, Atajos de
 * teclado, Vista de lectura, Vista de edición, Propiedades, Apariencia,
 * Fuente, Caché, Bóveda — including its "usted" register, which is what the
 * surrounding app speaks.
 *
 * Spanish runs 20–30% longer than English, so the setting labels are shortened
 * rather than translated word for word: a label that wraps is a bug, not a
 * detail. The dictionary source is "Origen del diccionario" and not "Fuente
 * del diccionario" for a related reason — "Fuente" is already the font label
 * two sections below, and one word cannot mean both in the same pane.
 */
export const es = {
	'icon.label': 'Traducir el texto seleccionado',
	'popup.loading': 'Traduciendo',
	'popup.speak': 'Leer en voz alta',
	'popup.stopSpeaking': 'Detener la lectura',
	'popup.copy': 'Copiar la traducción',
	'popup.copied': 'Traducción copiada',
	'popup.copyFailed': 'No se pudo copiar al portapapeles.',
	'popup.settings': 'Abrir las opciones del complemento',
	'popup.close': 'Cerrar',
	'popup.fromCache': 'en caché',
	'popup.elapsed': '{ms} ms',

	'action.retry': 'Reintentar',
	'action.openSettings': 'Abrir opciones',
	'action.changeProvider': 'Cambiar de motor',

	'error.missingKey': 'El motor seleccionado no tiene ninguna clave de API configurada.',
	'error.invalidKey': 'La clave de API fue rechazada. Compruebe que la pegó completa.',
	'error.quotaExceeded': 'A este motor no le queda cuota en el periodo actual.',
	'error.rateLimited': 'Demasiadas solicitudes seguidas. Espere un momento y reinténtelo.',
	'error.serverBusy': 'El servicio de traducción está ocupado.',
	'error.tooLong': 'La selección tiene {length} caracteres. El límite es {max}.',
	'error.unsupportedPair': 'Este motor no traduce de {source} a {target}.',
	'error.timeout': 'El servicio de traducción no respondió a tiempo.',
	'error.network': 'No se pudo contactar con el servicio de traducción. Compruebe su conexión.',
	'error.badResponse': 'El servicio de traducción devolvió algo ilegible.',
	'error.unknown': 'La traducción falló.',
	'error.emptySelection': 'La selección no contiene texto que traducir.',

	'settings.testOk': 'La conexión funciona.',
	'settings.testOkWithQuota': 'La conexión funciona. {used} de {limit} caracteres usados.',
	'settings.testFailed': 'La conexión falló.',
	'settings.testInvalidKey': 'La clave de API fue rechazada.',
	'settings.testMissingKey': 'Introduzca primero una clave de API.',
	'settings.testBadResponse': 'Conectado, pero no se pudo leer la respuesta.',
	'settings.testing': 'Comprobando…',
	'settings.testConnection': 'Probar la conexión',

	'settings.sourceLang': 'Idioma de origen',
	'settings.sourceLangDesc': 'El idioma del que se traduce. La detección sirve para casi todo el texto.',
	'settings.targetLang': 'Idioma de destino',
	'settings.targetLangDesc': 'El idioma en que se muestran las traducciones.',
	'settings.uiLanguage': 'Idioma de la interfaz',
	'settings.uiLanguageDesc': 'Idioma de las etiquetas y los mensajes de este complemento.',

	'settings.engineHeading': 'Motor de traducción',
	'settings.provider': 'Motor',
	'settings.providerDesc': 'El servicio que realiza la traducción.',
	'settings.deeplKey': 'Clave de API de DeepL',
	'settings.deeplKeyDesc':
		'Las claves gratuitas acaban en :fx y el servidor correspondiente se elige solo. Se guarda como texto sin cifrar en esta bóveda.',
	'settings.googleCloudKey': 'Clave de API de Google Cloud',
	'settings.googleCloudKeyDesc':
		'Requiere un proyecto de Cloud con facturación y la Translation API activada. Se guarda como texto sin cifrar en esta bóveda.',
	'settings.dictionaryEnrichment': 'Buscar palabras sueltas',
	'settings.dictionaryEnrichmentDesc':
		'Añade pronunciación, categoría gramatical y otros significados al seleccionar una sola palabra.',
	'settings.dictionarySource': 'Origen del diccionario',
	'settings.dictionarySourceDesc':
		'Automático combina ambos: Google para todos los idiomas y Free Dictionary API para la pronunciación en inglés.',
	'settings.freeEndpointWarning':
		'Google (sin clave) usa un punto de acceso que Google no documenta ni admite. Puede cambiar o dejar de funcionar sin aviso. Elija DeepL o Google Cloud si necesita un servicio con soporte.',

	'settings.activationHeading': 'Activación',
	'settings.autoPopup': 'Traducir al seleccionar texto',
	'settings.autoPopupDesc':
		'Omite el botón. Cada selección genera una solicitud y consume la cuota más deprisa.',
	'settings.translateOnDoubleClick': 'Traducir al hacer doble clic',
	'settings.translateOnDoubleClickDesc': 'Hacer doble clic en una palabra la traduce al momento.',
	'settings.hotkeyPointer': 'Atajo de teclado',
	'settings.hotkeyPointerDesc':
		'Asigne una tecla al comando «Translate selection» en Obsidian, junto a los demás atajos.',
	'settings.openHotkeys': 'Abrir los atajos de Obsidian',
	'settings.minLength': 'Selección más corta',
	'settings.minLengthDesc': 'Las selecciones más cortas se ignoran.',
	'settings.maxLength': 'Selección más larga',
	'settings.maxLengthDesc': 'Las selecciones más largas dan error en lugar de enviarse.',
	'settings.iconPlacement': 'Posición del botón',
	'settings.iconPlacementDesc': 'Dónde aparece el botón. Se aparta si algo se lo impide.',
	'settings.iconOffset': 'Distancia del botón',
	'settings.iconOffsetDesc': 'Separación entre la selección y el botón, en píxeles.',

	'settings.scopeHeading': 'Dónde funciona',
	'settings.enableInReading': 'Vista de lectura',
	'settings.enableInEditing': 'Vista de edición',
	'settings.enableInProperties': 'Propiedades',
	'settings.enableInPdf': 'Archivos PDF',
	'settings.pdfFallback': 'Recuperar selecciones en PDF',
	'settings.pdfFallbackDesc':
		'Lee directamente la capa de texto resaltada cuando Obsidian informa de una selección vacía en un PDF. Desactívelo si causa problemas.',

	'settings.appearanceHeading': 'Apariencia',
	'settings.fontSize': 'Tamaño de fuente',
	'settings.fontSizeDesc': 'Tamaño del texto dentro de la ventana emergente, en píxeles.',
	'settings.fontFamily': 'Fuente',
	'settings.fontFamilyDesc': 'Déjelo vacío para usar la misma fuente que el resto de la interfaz.',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': 'Colores de la ventana emergente',
	'settings.popupThemeDesc': 'El blanco mantiene la ventana legible con cualquier tema.',

	'settings.speechHeading': 'Lectura en voz alta',
	'settings.ttsEngine': 'Voz',
	'settings.ttsEngineDesc':
		'La voz del sistema funciona sin conexión. Google envía el texto seleccionado a Google y necesita conexión.',
	'settings.ttsRate': 'Velocidad',
	'settings.ttsRateDesc': 'A qué velocidad se lee el texto.',

	'settings.advancedHeading': 'Avanzado',
	'settings.cacheSize': 'Traducciones recordadas',
	'settings.cacheSizeDesc':
		'Las consultas repetidas se responden sin solicitud. Solo en memoria; nunca se escriben en disco. Ponga 0 para desactivarlo.',
	'settings.stripMarkdown': 'Quitar el Markdown antes de traducir',
	'settings.stripMarkdownDesc':
		'Elimina la sintaxis como ** y los enlaces, para que el motor vea el texto igual que un lector.',
	'settings.debugLog': 'Registro de depuración',
	'settings.debugLogDesc':
		'Escribe mensajes de diagnóstico en la consola de desarrollo, que solo los muestra en el nivel verbose. Manténgalo desactivado salvo para informar de un fallo.',
	'settings.reset': 'Restaurar los valores por defecto',
	'settings.resetDesc': 'Devuelve todas las opciones anteriores a su valor inicial. Las claves de API se conservan.',
	'settings.resetButton': 'Restaurar',
	'settings.resetDone': 'Opciones restauradas a los valores por defecto',

	'lang.auto': 'Detectar automáticamente',
	'uiLang.auto': 'Igual que Obsidian',
	'provider.google-free': 'Google (sin clave)',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': 'Automático',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API (inglés)',
	'dict.off': 'Desactivado',
	'placement.below-center': 'Debajo de la selección',
	'placement.above-center': 'Encima de la selección',
	'placement.cursor': 'En el puntero',
	'theme.light': 'Fondo blanco',
	'theme.follow': 'Igual que Obsidian',
	'tts.webspeech': 'Voz del sistema',
	'tts.google': 'Google',

	'notice.autoPopupOn': 'Se traducirá en cuanto se seleccione texto',
	'notice.autoPopupOff': 'Se mostrará el botón en lugar de traducir al momento',
	'notice.russianRemoved':
		'Selection Translate ya no admite el ruso como idioma de origen. El idioma de origen ha pasado a detección automática, que sigue traduciendo texto en ruso.',
	'tts.noVoice': 'No hay ninguna voz del sistema instalada para este idioma.',
	'tts.failed': 'No se pudo leer el texto en voz alta.',
} satisfies Messages;
