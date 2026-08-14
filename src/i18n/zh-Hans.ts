import type { Messages } from './en';

/**
 * Simplified Chinese UI strings.
 *
 * Written from `zh-Hant.ts`, then reviewed term by term against Obsidian's own
 * zh catalogue — which is the part a script conversion cannot do. The two
 * Chineses differ in vocabulary and not only in characters: 快取/缓存,
 * 金鑰/密钥, 外掛程式/插件, 快速鍵/快捷键, 閱讀檢視模式/阅读视图. Converting
 * the traditional file and shipping the result produces Chinese a mainland
 * reader identifies at a glance as a converted Taiwan build.
 *
 * The full pair list is in `docs/GLOSSARY.md` §4.
 */
export const zhHans = {
	'icon.label': '翻译选中的文字',
	'popup.loading': '翻译中',
	'popup.speak': '朗读',
	'popup.stopSpeaking': '停止朗读',
	'popup.copy': '复制译文',
	'popup.copied': '已复制译文',
	'popup.copyFailed': '无法复制到剪贴板。',
	'popup.settings': '打开插件选项',
	'popup.close': '关闭',
	'popup.fromCache': '缓存',
	'popup.elapsed': '{ms} 毫秒',

	'action.retry': '重试',
	'action.openSettings': '打开选项',
	'action.changeProvider': '更换引擎',

	'error.missingKey': '当前选用的翻译引擎尚未设置 API 密钥。',
	'error.invalidKey': 'API 密钥被拒绝。请确认是否完整粘贴。',
	'error.quotaExceeded': '此引擎本期配额已用完。',
	'error.rateLimited': '短时间内请求过多。请稍候再试。',
	'error.serverBusy': '翻译服务正忙。',
	'error.tooLong': '选中的文字有 {length} 个字符，上限为 {max}。',
	'error.unsupportedPair': '此引擎不支持从 {source} 翻译成 {target}。',
	'error.timeout': '翻译服务未在超时前响应。',
	'error.network': '无法连接到翻译服务。请检查网络连接。',
	'error.badResponse': '翻译服务返回了无法解析的内容。',
	'error.unknown': '翻译失败。',
	'error.emptySelection': '选中的范围没有可翻译的文字。',

	'settings.testOk': '连接正常。',
	'settings.testOkWithQuota': '连接正常。已使用 {used} / {limit} 个字符。',
	'settings.testFailed': '连接失败。',
	'settings.testInvalidKey': 'API 密钥被拒绝。',
	'settings.testMissingKey': '请先输入 API 密钥。',
	'settings.testBadResponse': '已连接，但无法解析响应内容。',
	'settings.testing': '检查中…',
	'settings.testConnection': '测试连接',

	'settings.sourceLang': '源语言',
	'settings.sourceLangDesc': '待翻译文字所使用的语言。大多数文字用自动检测即可。',
	'settings.targetLang': '目标语言',
	'settings.targetLangDesc': '译文显示所使用的语言。',
	'settings.uiLanguage': '界面语言',
	'settings.uiLanguageDesc': '此插件自身的标签与提示所使用的语言。',

	'settings.engineHeading': '翻译引擎',
	'settings.provider': '引擎',
	'settings.providerDesc': '实际执行翻译的服务。',
	'settings.deeplKey': 'DeepL API 密钥',
	'settings.deeplKeyDesc': '免费密钥以 :fx 结尾，系统会自动选用对应的服务器。以纯文本形式保存在此仓库中。',
	'settings.googleCloudKey': 'Google Cloud API 密钥',
	'settings.googleCloudKeyDesc':
		'需要已启用结算并开通 Translation API 的 Cloud 项目。以纯文本形式保存在此仓库中。',
	'settings.dictionaryEnrichment': '查询单词',
	'settings.dictionaryEnrichmentDesc': '选中单个词时，额外显示发音、词性和其他释义。',
	'settings.dictionarySource': '词典来源',
	'settings.dictionarySourceDesc':
		'自动模式会同时使用两者：Google 负责所有语言，Free Dictionary API 负责英文发音。',
	'settings.freeEndpointWarning':
		'Google（免密钥）使用的端点并未由 Google 提供文档或支持，随时可能变更或停止工作。若需要有支持的服务，请选择 DeepL 或 Google Cloud。',

	'settings.activationHeading': '触发方式',
	'settings.autoPopup': '选中文字后立即翻译',
	'settings.autoPopupDesc': '跳过按钮。每次选中都会发出一次请求，配额消耗更快。',
	'settings.translateOnDoubleClick': '双击即翻译',
	'settings.translateOnDoubleClickDesc': '双击某个词就直接翻译。',
	'settings.hotkeyPointer': '快捷键',
	'settings.hotkeyPointerDesc': '在 Obsidian 中为“Translate selection”命令指定按键，与其他快捷键设置在同一处。',
	'settings.openHotkeys': '打开 Obsidian 快捷键设置',
	'settings.minLength': '最短选中长度',
	'settings.minLengthDesc': '短于此长度的选中内容会被忽略。',
	'settings.maxLength': '最长选中长度',
	'settings.maxLengthDesc': '长于此长度的选中内容会提示错误，不会发送。',
	'settings.iconPlacement': '按钮位置',
	'settings.iconPlacementDesc': '按钮出现的位置。若该处有其他内容遮挡，按钮会自动避开。',
	'settings.iconOffset': '按钮距离',
	'settings.iconOffsetDesc': '选中的文字与按钮之间的间距，单位为像素。',

	'settings.scopeHeading': '生效范围',
	'settings.enableInReading': '阅读视图',
	'settings.enableInEditing': '编辑视图',
	'settings.enableInProperties': '笔记属性',
	'settings.enableInPdf': 'PDF 文件',
	'settings.pdfFallback': '找回 PDF 中的选中内容',
	'settings.pdfFallbackDesc': '当 Obsidian 报告 PDF 选中内容为空时，直接读取高亮的文本图层。若出现异常请关闭。',

	'settings.appearanceHeading': '外观',
	'settings.fontSize': '字体大小',
	'settings.fontSizeDesc': '弹出窗口内的文字大小，单位为像素。',
	'settings.fontFamily': '字体',
	'settings.fontFamilyDesc': '留空则沿用界面其余部分的字体。',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': '弹出窗口配色',
	'settings.popupThemeDesc': '白底能让弹出窗口在任何主题下都清晰易读。',

	'settings.speechHeading': '朗读',
	'settings.ttsEngine': '语音',
	'settings.ttsEngineDesc': '系统语音可离线使用。Google 会将选中的文字发送至 Google，且需要网络连接。',
	'settings.ttsRate': '语速',
	'settings.ttsRateDesc': '朗读文字的速度。',

	'settings.advancedHeading': '高级',
	'settings.cacheSize': '记住的译文数量',
	'settings.cacheSizeDesc': '重复查询同一段文字时不再发出请求。仅保留在内存中，绝不写入磁盘。设为 0 即停用。',
	'settings.stripMarkdown': '翻译前移除 Markdown 语法',
	'settings.stripMarkdownDesc': '去掉 ** 和链接之类的语法，让翻译引擎看到的内容与读者所见一致。',
	'settings.debugLog': '调试日志',
	'settings.debugLogDesc': '将诊断信息写入开发者控制台。除非要反馈问题，否则请保持关闭。',
	'settings.reset': '恢复默认',
	'settings.resetDesc': '将上方所有选项恢复为初始值。API 密钥会保留。',
	'settings.resetButton': '恢复',
	'settings.resetDone': '选项已恢复为默认值',

	'lang.auto': '自动检测',
	'uiLang.auto': '跟随 Obsidian',
	'provider.google-free': 'Google（免密钥）',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': '自动',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API（英文）',
	'dict.off': '关闭',
	'placement.below-center': '选中文字下方',
	'placement.above-center': '选中文字上方',
	'placement.cursor': '光标位置',
	'theme.light': '白色背景',
	'theme.follow': '跟随 Obsidian',
	'tts.webspeech': '系统语音',
	'tts.google': 'Google',

	'notice.autoPopupOn': '选中文字后将立即翻译',
	'notice.autoPopupOff': '将显示按钮，不再立即翻译',
	'notice.russianRemoved':
		'Selection Translate 已不再支持俄语作为源语言。源语言已改为自动检测，俄语文本仍可正常翻译。',
	'tts.noVoice': '系统未安装此语言的语音。',
	'tts.failed': '无法朗读这段文字。',
} satisfies Messages;
