import type { Messages } from './en';

/**
 * Arabic UI strings.
 *
 * Terminology follows Obsidian's own ar catalogue — الخيارات, مفاتيح الاختصار,
 * عرض القراءة, وضع التحرير, الخصائص, المظهر, الخط, الخزنة.
 *
 * The only right-to-left locale the plugin ships. Nothing about the direction
 * is encoded here: these are plain strings, and which way they run is decided
 * by `LanguageDescriptor.dir` and the stylesheet's logical properties. Latin
 * product names (Obsidian, DeepL, Google, Markdown, PDF) stay in Latin script
 * and the bidi algorithm places them, which is what an Arabic reader expects
 * of a product name.
 */
export const ar = {
	'icon.label': 'ترجمة النص المحدد',
	'popup.loading': 'جارٍ الترجمة',
	'popup.speak': 'قراءة بصوت عالٍ',
	'popup.stopSpeaking': 'إيقاف القراءة',
	'popup.copy': 'نسخ الترجمة',
	'popup.copied': 'تم نسخ الترجمة',
	'popup.copyFailed': 'تعذّر النسخ إلى الحافظة.',
	'popup.settings': 'فتح خيارات الإضافة',
	'popup.close': 'إغلاق',
	'popup.fromCache': 'مخزّنة مؤقتًا',
	'popup.elapsed': '{ms} مللي ثانية',

	'action.retry': 'إعادة المحاولة',
	'action.openSettings': 'فتح الخيارات',
	'action.changeProvider': 'تغيير المحرك',

	'error.missingKey': 'لم يُضبط أي مفتاح API للمحرك المحدد.',
	'error.invalidKey': 'تم رفض مفتاح API. تحقق من لصقه كاملًا.',
	'error.quotaExceeded': 'لم تتبقَّ لهذا المحرك أي حصة في الفترة الحالية.',
	'error.rateLimited': 'طلبات كثيرة متتالية. انتظر لحظة ثم أعد المحاولة.',
	'error.serverBusy': 'خدمة الترجمة مشغولة.',
	'error.tooLong': 'يبلغ طول النص المحدد {length} حرفًا، والحد الأقصى {max}.',
	'error.unsupportedPair': 'هذا المحرك لا يترجم من {source} إلى {target}.',
	'error.timeout': 'لم تستجب خدمة الترجمة في الوقت المحدد.',
	'error.network': 'تعذّر الوصول إلى خدمة الترجمة. تحقق من اتصالك.',
	'error.badResponse': 'أعادت خدمة الترجمة استجابة غير مفهومة.',
	'error.unknown': 'فشلت الترجمة.',
	'error.emptySelection': 'لا يحتوي النص المحدد على ما يمكن ترجمته.',

	'settings.testOk': 'الاتصال يعمل.',
	'settings.testOkWithQuota': 'الاتصال يعمل. تم استخدام {used} من {limit} حرف.',
	'settings.testFailed': 'فشل الاتصال.',
	'settings.testInvalidKey': 'تم رفض مفتاح API.',
	'settings.testMissingKey': 'أدخل مفتاح API أولًا.',
	'settings.testBadResponse': 'تم الاتصال، لكن تعذّرت قراءة الاستجابة.',
	'settings.testing': 'جارٍ التحقق…',
	'settings.testConnection': 'اختبار الاتصال',

	'settings.sourceLang': 'لغة المصدر',
	'settings.sourceLangDesc': 'اللغة التي تترجم منها. الكشف التلقائي يكفي لمعظم النصوص.',
	'settings.targetLang': 'لغة الهدف',
	'settings.targetLangDesc': 'اللغة التي تظهر بها الترجمات.',
	'settings.uiLanguage': 'لغة الواجهة',
	'settings.uiLanguageDesc': 'لغة تسميات هذه الإضافة ورسائلها.',

	'settings.engineHeading': 'محرك الترجمة',
	'settings.provider': 'المحرك',
	'settings.providerDesc': 'الخدمة التي تنفّذ الترجمة.',
	'settings.deeplKey': 'مفتاح DeepL API',
	'settings.deeplKeyDesc':
		'تنتهي المفاتيح المجانية بـ :fx ويُختار الخادم المناسب تلقائيًا. يُحفظ كنص عادي في هذه الخزنة.',
	'settings.googleCloudKey': 'مفتاح Google Cloud API',
	'settings.googleCloudKeyDesc':
		'يتطلب مشروع Cloud مفعّل الفوترة ومفعّلًا فيه Translation API. يُحفظ كنص عادي في هذه الخزنة.',
	'settings.dictionaryEnrichment': 'البحث عن الكلمات المفردة',
	'settings.dictionaryEnrichmentDesc': 'يضيف النطق ونوع الكلمة والمعاني الأخرى عند تحديد كلمة واحدة.',
	'settings.dictionarySource': 'مصدر القاموس',
	'settings.dictionarySourceDesc':
		'الوضع التلقائي يجمع بين الاثنين: Google لكل اللغات، وFree Dictionary API لنطق الإنجليزية.',
	'settings.freeEndpointWarning':
		'يستخدم Google (بدون مفتاح) نقطة وصول لا توثّقها Google ولا تدعمها، وقد تتغير أو تتوقف عن العمل دون إشعار. اختر DeepL أو Google Cloud إن كنت بحاجة إلى خدمة مدعومة.',

	'settings.activationHeading': 'التفعيل',
	'settings.autoPopup': 'الترجمة فور تحديد النص',
	'settings.autoPopupDesc': 'يتخطى الزر. كل تحديد يصبح طلبًا، وهو ما يستهلك الحصة أسرع.',
	'settings.translateOnDoubleClick': 'الترجمة بالنقر المزدوج',
	'settings.translateOnDoubleClickDesc': 'النقر المزدوج على كلمة يترجمها مباشرة.',
	'settings.hotkeyPointer': 'اختصار لوحة المفاتيح',
	'settings.hotkeyPointerDesc':
		'اربط مفتاحًا بأمر «Translate selection» في Obsidian، إلى جانب بقية الاختصارات.',
	'settings.openHotkeys': 'فتح مفاتيح اختصار Obsidian',
	'settings.minLength': 'أقصر تحديد',
	'settings.minLengthDesc': 'يُتجاهل أي تحديد أقصر من ذلك.',
	'settings.maxLength': 'أطول تحديد',
	'settings.maxLengthDesc': 'أي تحديد أطول من ذلك يظهر خطأ بدل أن يُرسل.',
	'settings.iconPlacement': 'موضع الزر',
	'settings.iconPlacementDesc': 'المكان الذي يظهر فيه الزر. ينزاح جانبًا إذا اعترضه شيء.',
	'settings.iconOffset': 'مسافة الزر',
	'settings.iconOffsetDesc': 'الفراغ بين النص المحدد والزر، بالبكسل.',

	'settings.scopeHeading': 'أين يعمل',
	'settings.enableInReading': 'عرض القراءة',
	'settings.enableInEditing': 'وضع التحرير',
	'settings.enableInProperties': 'الخصائص',
	'settings.enableInPdf': 'ملفات PDF',
	'settings.pdfFallback': 'استعادة التحديد في ملفات PDF',
	'settings.pdfFallbackDesc':
		'يقرأ طبقة النص المميّزة مباشرة عندما يبلّغ Obsidian عن تحديد فارغ في PDF. أوقفه إذا تسبب في مشكلات.',

	'settings.appearanceHeading': 'المظهر',
	'settings.fontSize': 'حجم الخط',
	'settings.fontSizeDesc': 'حجم النص داخل النافذة المنبثقة، بالبكسل.',
	'settings.fontFamily': 'الخط',
	'settings.fontFamilyDesc': 'اتركه فارغًا لاستخدام الخط نفسه المستخدم في بقية الواجهة.',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': 'ألوان النافذة المنبثقة',
	'settings.popupThemeDesc': 'الخلفية البيضاء تُبقي النافذة واضحة مع أي سمة.',

	'settings.speechHeading': 'القراءة بصوت عالٍ',
	'settings.ttsEngine': 'الصوت',
	'settings.ttsEngineDesc':
		'صوت النظام يعمل دون اتصال. أما Google فيرسل النص المحدد إلى Google ويحتاج إلى اتصال.',
	'settings.ttsRate': 'السرعة',
	'settings.ttsRateDesc': 'سرعة قراءة النص.',

	'settings.advancedHeading': 'متقدم',
	'settings.cacheSize': 'الترجمات المحفوظة',
	'settings.cacheSizeDesc':
		'تُجاب عمليات البحث المتكررة دون طلب جديد. تبقى في الذاكرة فقط ولا تُكتب على القرص أبدًا. اضبطه على 0 لإيقافه.',
	'settings.stripMarkdown': 'إزالة Markdown قبل الترجمة',
	'settings.stripMarkdownDesc': 'يزيل الصيغ مثل ** والروابط، ليرى المحرك النص كما يراه القارئ.',
	'settings.debugLog': 'سجل التصحيح',
	'settings.debugLogDesc':
		'يكتب رسائل تشخيصية في وحدة تحكم المطوّر. أبقه متوقفًا ما لم تكن تبلّغ عن خلل.',
	'settings.reset': 'استعادة الإعدادات الافتراضية',
	'settings.resetDesc': 'يعيد كل الخيارات أعلاه إلى قيمها الأصلية. تبقى مفاتيح API كما هي.',
	'settings.resetButton': 'استعادة',
	'settings.resetDone': 'تمت استعادة الخيارات إلى الإعدادات الافتراضية',

	'lang.auto': 'الكشف تلقائيًا',
	'uiLang.auto': 'مثل Obsidian',
	'provider.google-free': 'Google (بدون مفتاح)',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': 'تلقائي',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API (الإنجليزية)',
	'dict.off': 'إيقاف',
	'placement.below-center': 'أسفل النص المحدد',
	'placement.above-center': 'أعلى النص المحدد',
	'placement.cursor': 'عند المؤشر',
	'theme.light': 'خلفية بيضاء',
	'theme.follow': 'مثل Obsidian',
	'tts.webspeech': 'صوت النظام',
	'tts.google': 'Google',

	'notice.autoPopupOn': 'ستبدأ الترجمة فور تحديد النص',
	'notice.autoPopupOff': 'سيظهر الزر بدلًا من الترجمة الفورية',
	'notice.russianRemoved':
		'لم تعد Selection Translate تقبل الروسية كلغة مصدر. تم ضبط لغة المصدر على الكشف التلقائي، وهو ما يزال يترجم النصوص الروسية.',
	'tts.noVoice': 'لا يوجد صوت نظام مثبّت لهذه اللغة.',
	'tts.failed': 'تعذّرت قراءة النص بصوت عالٍ.',
} satisfies Messages;
