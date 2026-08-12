import type { Messages } from './en';

/**
 * Vietnamese UI strings.
 *
 * `satisfies Messages` is what keeps this file honest: adding a key to en.ts
 * without adding it here fails the build, so a locale can never quietly fall
 * out of date. The annotation is `satisfies` rather than `:` on purpose, since
 * the literal type is what en.ts derives its own key union from.
 */
export const vi = {
	'icon.label': 'Dịch vùng chọn',
	'popup.loading': 'Đang dịch',
	'popup.speak': 'Đọc to',
	'popup.stopSpeaking': 'Dừng đọc',
	'popup.copy': 'Sao chép bản dịch',
	'popup.copied': 'Đã sao chép bản dịch',
	'popup.copyFailed': 'Không sao chép được vào bộ nhớ tạm.',
	'popup.settings': 'Mở tuỳ chọn plugin',
	'popup.close': 'Đóng',
	'popup.fromCache': 'đã lưu',
	'popup.elapsed': '{ms} ms',

	'action.retry': 'Thử lại',
	'action.openSettings': 'Mở tuỳ chọn',
	'action.changeProvider': 'Đổi công cụ dịch',

	'error.missingKey': 'Công cụ dịch đang chọn chưa có khoá API.',
	'error.invalidKey': 'Khoá API bị từ chối. Kiểm tra xem đã dán đủ chưa.',
	'error.quotaExceeded': 'Công cụ này đã hết hạn mức của kỳ hiện tại.',
	'error.rateLimited': 'Gửi quá nhiều yêu cầu liên tiếp. Chờ một lát rồi thử lại.',
	'error.serverBusy': 'Dịch vụ dịch đang bận.',
	'error.tooLong': 'Vùng chọn dài {length} ký tự. Giới hạn là {max}.',
	'error.unsupportedPair': 'Công cụ này không dịch {source} sang {target}.',
	'error.timeout': 'Dịch vụ dịch không phản hồi kịp.',
	'error.network': 'Không kết nối được tới dịch vụ dịch. Kiểm tra mạng.',
	'error.badResponse': 'Dịch vụ dịch trả về dữ liệu không đọc được.',
	'error.unknown': 'Dịch không thành công.',
	'error.emptySelection': 'Vùng chọn không có chữ nào để dịch.',

	'settings.testOk': 'Kết nối được.',
	'settings.testOkWithQuota': 'Kết nối được. Đã dùng {used} trên {limit} ký tự.',
	'settings.testFailed': 'Kết nối thất bại.',
	'settings.testInvalidKey': 'Khoá API bị từ chối.',
	'settings.testMissingKey': 'Nhập khoá API trước đã.',
	'settings.testBadResponse': 'Kết nối được nhưng không đọc được phản hồi.',
	'settings.testing': 'Đang kiểm tra…',
	'settings.testConnection': 'Kiểm tra kết nối',

	'settings.sourceLang': 'Ngôn ngữ nguồn',
	'settings.sourceLangDesc': 'Ngôn ngữ của văn bản cần dịch. Tự nhận diện dùng được cho hầu hết văn bản.',
	'settings.targetLang': 'Ngôn ngữ đích',
	'settings.targetLangDesc': 'Ngôn ngữ hiển thị bản dịch.',
	'settings.uiLanguage': 'Ngôn ngữ giao diện',
	'settings.uiLanguageDesc': 'Ngôn ngữ cho nhãn và thông báo của chính plugin này.',

	'settings.engineHeading': 'Công cụ dịch',
	'settings.provider': 'Công cụ',
	'settings.providerDesc': 'Dịch vụ thực hiện việc dịch.',
	'settings.deeplKey': 'Khoá API DeepL',
	'settings.deeplKeyDesc':
		'Khoá miễn phí kết thúc bằng :fx và máy chủ tương ứng được chọn tự động. Lưu dạng văn bản thuần trong vault này.',
	'settings.googleCloudKey': 'Khoá API Google Cloud',
	'settings.googleCloudKeyDesc':
		'Cần một project Cloud đã bật thanh toán và bật Translation API. Lưu dạng văn bản thuần trong vault này.',
	'settings.dictionaryEnrichment': 'Tra cứu từ đơn',
	'settings.dictionaryEnrichmentDesc':
		'Bổ sung phiên âm, loại từ và các nghĩa khác khi chỉ chọn một từ.',
	'settings.dictionarySource': 'Nguồn từ điển',
	'settings.dictionarySourceDesc':
		'Tự động kết hợp cả hai: Google cho mọi ngôn ngữ, và Free Dictionary API cho phiên âm tiếng Anh.',
	'settings.freeEndpointWarning':
		'Google (không cần khoá) dùng một endpoint mà Google không công bố cũng không hỗ trợ. Nó có thể thay đổi hoặc ngừng hoạt động bất cứ lúc nào. Chọn DeepL hoặc Google Cloud nếu cần một dịch vụ được hỗ trợ.',

	'settings.activationHeading': 'Cách kích hoạt',
	'settings.autoPopup': 'Dịch ngay khi bôi đen',
	'settings.autoPopupDesc': 'Bỏ qua nút bấm. Mỗi lần bôi đen là một yêu cầu, tiêu hạn mức nhanh hơn.',
	'settings.translateOnDoubleClick': 'Dịch khi nháy đúp',
	'settings.translateOnDoubleClickDesc': 'Nháy đúp vào một từ là dịch luôn.',
	'settings.triggerHotkey': 'Phím kích hoạt',
	'settings.triggerHotkeyDesc':
		'Bấm khi nút đang hiện, thay cho việc click. Alt+T là lựa chọn hợp lý.',
	'settings.recordingHotkey': 'Bấm tổ hợp phím…',
	'settings.clearHotkey': 'Xoá',
	'settings.noHotkey': 'Chưa đặt',
	'settings.hotkeyUnsafe':
		'Phím không kèm phím bổ trợ sẽ gõ chữ vào note khi đang soạn thảo. Thêm Ctrl, Alt hoặc Shift.',
	'settings.hotkeyConflict':
		'Obsidian đã dùng tổ hợp này cho {commands}. Cả hai vẫn chạy: phím này chỉ có tác dụng khi nút đang hiện.',
	'settings.openHotkeys': 'Mở phím tắt của Obsidian',
	'settings.minLength': 'Vùng chọn ngắn nhất',
	'settings.minLengthDesc': 'Vùng chọn ngắn hơn mức này sẽ bị bỏ qua.',
	'settings.maxLength': 'Vùng chọn dài nhất',
	'settings.maxLengthDesc': 'Vùng chọn dài hơn mức này sẽ báo lỗi thay vì được gửi đi.',
	'settings.iconPlacement': 'Vị trí nút',
	'settings.iconPlacementDesc': 'Nơi nút xuất hiện. Nút sẽ tự né nếu có thứ khác che.',
	'settings.iconOffset': 'Khoảng cách nút',
	'settings.iconOffsetDesc': 'Khoảng hở giữa vùng chọn và nút, tính bằng pixel.',

	'settings.scopeHeading': 'Nơi plugin hoạt động',
	'settings.enableInReading': 'Chế độ đọc',
	'settings.enableInEditing': 'Chế độ soạn thảo',
	'settings.enableInProperties': 'Thuộc tính',
	'settings.enableInPdf': 'Tệp PDF',
	'settings.pdfFallback': 'Khôi phục vùng chọn trong PDF',
	'settings.pdfFallbackDesc':
		'Đọc thẳng lớp văn bản được tô sáng khi Obsidian báo vùng chọn PDF rỗng. Tắt đi nếu gây trục trặc.',

	'settings.appearanceHeading': 'Hiển thị',
	'settings.fontSize': 'Cỡ chữ',
	'settings.fontSizeDesc': 'Cỡ chữ bên trong popup, tính bằng pixel.',
	'settings.fontFamily': 'Phông chữ',
	'settings.fontFamilyDesc': 'Để trống để dùng cùng phông với phần còn lại của giao diện.',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': 'Màu popup',
	'settings.popupThemeDesc': 'Nền trắng giúp popup dễ đọc dưới mọi giao diện.',

	'settings.speechHeading': 'Đọc thành tiếng',
	'settings.ttsEngine': 'Giọng đọc',
	'settings.ttsEngineDesc':
		'Giọng hệ thống chạy ngoại tuyến. Google gửi đoạn văn bản đã chọn tới Google và cần có mạng.',
	'settings.ttsRate': 'Tốc độ',
	'settings.ttsRateDesc': 'Tốc độ đọc văn bản.',

	'settings.advancedHeading': 'Nâng cao',
	'settings.cacheSize': 'Số bản dịch ghi nhớ',
	'settings.cacheSizeDesc':
		'Tra lại cùng một chỗ sẽ không gửi yêu cầu mới. Chỉ giữ trong bộ nhớ, không bao giờ ghi ra đĩa. Đặt 0 để tắt.',
	'settings.stripMarkdown': 'Bóc cú pháp Markdown trước khi dịch',
	'settings.stripMarkdownDesc':
		'Bỏ các ký hiệu như ** và liên kết, để công cụ dịch nhìn thấy văn bản giống người đọc.',
	'settings.debugLog': 'Ghi log gỡ lỗi',
	'settings.debugLogDesc':
		'Ghi thông tin chẩn đoán ra console của nhà phát triển. Chỉ bật khi cần báo lỗi.',
	'settings.reset': 'Khôi phục mặc định',
	'settings.resetDesc': 'Đưa mọi tuỳ chọn ở trên về giá trị ban đầu. Khoá API được giữ nguyên.',
	'settings.resetButton': 'Khôi phục',
	'settings.resetDone': 'Đã khôi phục tuỳ chọn về mặc định',

	'lang.auto': 'Tự nhận diện',
	'lang.en': 'Tiếng Anh',
	'lang.es': 'Tiếng Tây Ban Nha',
	'lang.fr': 'Tiếng Pháp',
	'lang.de': 'Tiếng Đức',
	'lang.ru': 'Tiếng Nga',
	'lang.vi': 'Tiếng Việt',
	'uiLang.auto': 'Theo Obsidian',
	'uiLang.en': 'English',
	'uiLang.vi': 'Tiếng Việt',
	'provider.google-free': 'Google (không cần khoá)',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': 'Tự động',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API (tiếng Anh)',
	'dict.off': 'Tắt',
	'placement.below-center': 'Dưới vùng chọn',
	'placement.above-center': 'Trên vùng chọn',
	'placement.cursor': 'Tại con trỏ',
	'theme.light': 'Nền trắng',
	'theme.follow': 'Theo giao diện Obsidian',
	'tts.webspeech': 'Giọng hệ thống',
	'tts.google': 'Google',

	'notice.autoPopupOn': 'Sẽ dịch ngay khi bôi đen',
	'notice.autoPopupOff': 'Sẽ hiện nút thay vì dịch ngay',
	'tts.noVoice': 'Hệ thống chưa cài giọng đọc cho ngôn ngữ này.',
	'tts.failed': 'Không đọc được văn bản.',
} satisfies Messages;
