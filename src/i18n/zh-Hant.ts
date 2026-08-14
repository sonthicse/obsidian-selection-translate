import type { Messages } from './en';

/**
 * Traditional Chinese UI strings.
 *
 * The reference Chinese for this project: `zh-Hans.ts` is written from this
 * file, not the other way round. Terminology follows Obsidian's own zh-TW
 * catalogue — 選項, 快速鍵, 閱讀檢視模式, 快取, 字型 — because a plugin that
 * picks its own words for the app's concepts reads like two products bolted
 * together. See `docs/GLOSSARY.md`.
 */
export const zhHant = {
	'icon.label': '翻譯選取的文字',
	'popup.loading': '翻譯中',
	'popup.speak': '朗讀',
	'popup.stopSpeaking': '停止朗讀',
	'popup.copy': '複製譯文',
	'popup.copied': '已複製譯文',
	'popup.copyFailed': '無法複製到剪貼簿。',
	'popup.settings': '開啟外掛程式選項',
	'popup.close': '關閉',
	'popup.fromCache': '快取',
	'popup.elapsed': '{ms} 毫秒',

	'action.retry': '重試',
	'action.openSettings': '開啟選項',
	'action.changeProvider': '更換引擎',

	'error.missingKey': '目前選用的翻譯引擎尚未設定 API 金鑰。',
	'error.invalidKey': 'API 金鑰遭拒。請確認是否完整貼上。',
	'error.quotaExceeded': '此引擎本期額度已用完。',
	'error.rateLimited': '短時間內請求過多。請稍候再試。',
	'error.serverBusy': '翻譯服務忙碌中。',
	'error.tooLong': '選取的文字有 {length} 個字元，上限為 {max}。',
	'error.unsupportedPair': '此引擎不支援從 {source} 翻譯成 {target}。',
	'error.timeout': '翻譯服務未在時限內回應。',
	'error.network': '無法連線至翻譯服務。請檢查網路連線。',
	'error.badResponse': '翻譯服務回傳了無法解讀的內容。',
	'error.unknown': '翻譯失敗。',
	'error.emptySelection': '選取的範圍沒有可翻譯的文字。',

	'settings.testOk': '連線正常。',
	'settings.testOkWithQuota': '連線正常。已使用 {used} / {limit} 個字元。',
	'settings.testFailed': '連線失敗。',
	'settings.testInvalidKey': 'API 金鑰遭拒。',
	'settings.testMissingKey': '請先輸入 API 金鑰。',
	'settings.testBadResponse': '已連線，但無法解讀回應內容。',
	'settings.testing': '檢查中…',
	'settings.testConnection': '測試連線',

	'settings.sourceLang': '來源語言',
	'settings.sourceLangDesc': '要翻譯的文字所使用的語言。多數文字用自動偵測即可。',
	'settings.targetLang': '目標語言',
	'settings.targetLangDesc': '譯文顯示所使用的語言。',
	'settings.uiLanguage': '介面語言',
	'settings.uiLanguageDesc': '此外掛程式本身的標籤與訊息所使用的語言。',

	'settings.engineHeading': '翻譯引擎',
	'settings.provider': '引擎',
	'settings.providerDesc': '實際執行翻譯的服務。',
	'settings.deeplKey': 'DeepL API 金鑰',
	'settings.deeplKeyDesc': '免費金鑰以 :fx 結尾，系統會自動選用對應的伺服器。以純文字形式儲存於此儲存庫。',
	'settings.googleCloudKey': 'Google Cloud API 金鑰',
	'settings.googleCloudKeyDesc':
		'需要已啟用計費並開通 Translation API 的 Cloud 專案。以純文字形式儲存於此儲存庫。',
	'settings.dictionaryEnrichment': '查詢單字',
	'settings.dictionaryEnrichmentDesc': '選取單一字詞時，額外顯示發音、詞性與其他釋義。',
	'settings.dictionarySource': '詞典來源',
	'settings.dictionarySourceDesc':
		'自動模式會同時使用兩者：Google 負責所有語言，Free Dictionary API 負責英文發音。',
	'settings.freeEndpointWarning':
		'Google（免金鑰）使用的端點並未由 Google 提供文件或支援，隨時可能變更或停止運作。若需要有支援的服務，請選擇 DeepL 或 Google Cloud。',

	'settings.activationHeading': '觸發方式',
	'settings.autoPopup': '選取文字後立即翻譯',
	'settings.autoPopupDesc': '略過按鈕。每次選取都會送出一次請求，額度消耗較快。',
	'settings.translateOnDoubleClick': '按兩下即翻譯',
	'settings.translateOnDoubleClickDesc': '在字詞上按兩下就直接翻譯。',
	'settings.hotkeyPointer': '快速鍵',
	'settings.hotkeyPointerDesc': '在 Obsidian 中為「Translate selection」命令指定按鍵，與其他快速鍵設定在同一處。',
	'settings.openHotkeys': '開啟 Obsidian 快速鍵設定',
	'settings.minLength': '最短選取長度',
	'settings.minLengthDesc': '短於此長度的選取會被忽略。',
	'settings.maxLength': '最長選取長度',
	'settings.maxLengthDesc': '長於此長度的選取會顯示錯誤，不會送出。',
	'settings.iconPlacement': '按鈕位置',
	'settings.iconPlacementDesc': '按鈕出現的位置。若該處有其他內容擋住，按鈕會自動避開。',
	'settings.iconOffset': '按鈕距離',
	'settings.iconOffsetDesc': '選取的文字與按鈕之間的間距，單位為像素。',

	'settings.scopeHeading': '生效範圍',
	'settings.enableInReading': '閱讀檢視模式',
	'settings.enableInEditing': '編輯檢視模式',
	'settings.enableInProperties': '屬性',
	'settings.enableInPdf': 'PDF 檔案',
	'settings.pdfFallback': '救回 PDF 的選取內容',
	'settings.pdfFallbackDesc':
		'當 Obsidian 回報 PDF 選取為空時，直接讀取已標示的文字圖層。若造成異常請關閉。',

	'settings.appearanceHeading': '外觀',
	'settings.fontSize': '字型大小',
	'settings.fontSizeDesc': '彈出視窗內的文字大小，單位為像素。',
	'settings.fontFamily': '字型',
	'settings.fontFamilyDesc': '留空則沿用介面其他部分的字型。',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': '彈出視窗配色',
	'settings.popupThemeDesc': '白底能讓彈出視窗在任何佈景主題下都清楚易讀。',

	'settings.speechHeading': '朗讀',
	'settings.ttsEngine': '語音',
	'settings.ttsEngineDesc': '系統語音可離線使用。Google 會將選取的文字傳送至 Google，且需要網路連線。',
	'settings.ttsRate': '語速',
	'settings.ttsRateDesc': '朗讀文字的速度。',

	'settings.advancedHeading': '進階',
	'settings.cacheSize': '記住的譯文數量',
	'settings.cacheSizeDesc':
		'重複查詢同一段文字時不再送出請求。僅保留在記憶體中，絕不寫入磁碟。設為 0 即停用。',
	'settings.stripMarkdown': '翻譯前移除 Markdown 語法',
	'settings.stripMarkdownDesc': '去除 ** 與連結之類的語法，讓翻譯引擎看到的內容與讀者所見一致。',
	'settings.debugLog': '偵錯記錄',
	'settings.debugLogDesc': '將診斷訊息寫入開發人員主控台，主控台只在 verbose 層級顯示這些訊息。除非要回報問題，否則請保持關閉。',
	'settings.reset': '還原至預設值',
	'settings.resetDesc': '將上方所有選項還原為初始值。API 金鑰會保留。',
	'settings.resetButton': '還原',
	'settings.resetDone': '選項已還原至預設值',

	'lang.auto': '自動偵測',
	'uiLang.auto': '跟隨 Obsidian',
	'provider.google-free': 'Google（免金鑰）',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': '自動',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API（英文）',
	'dict.off': '關閉',
	'placement.below-center': '選取文字下方',
	'placement.above-center': '選取文字上方',
	'placement.cursor': '游標位置',
	'theme.light': '白色背景',
	'theme.follow': '跟隨 Obsidian',
	'tts.webspeech': '系統語音',
	'tts.google': 'Google',

	'notice.autoPopupOn': '選取文字後將立即翻譯',
	'notice.autoPopupOff': '將顯示按鈕，不再立即翻譯',
	'notice.russianRemoved':
		'Selection Translate 已不再支援俄文作為來源語言。來源語言已改為自動偵測，俄文文字仍可正常翻譯。',
	'tts.noVoice': '系統未安裝此語言的語音。',
	'tts.failed': '無法朗讀這段文字。',
} satisfies Messages;
