import type { Messages } from './en';

/**
 * Japanese UI strings.
 *
 * Terminology follows Obsidian's own ja catalogue — オプション, ホットキー,
 * リーディングビュー, 編集ビュー, プロパティ, 外観, キャッシュ, 保管庫.
 *
 * Not translated clause by clause from English. Japanese setting labels are
 * short noun phrases rather than sentences, the second person is left out where
 * English needs "you", and the long passive constructions English favours are
 * turned back into plain statements.
 */
export const ja = {
	'icon.label': '選択範囲を翻訳',
	'popup.loading': '翻訳中',
	'popup.speak': '読み上げ',
	'popup.stopSpeaking': '読み上げを停止',
	'popup.copy': '訳文をコピー',
	'popup.copied': '訳文をコピーしました',
	'popup.copyFailed': 'クリップボードにコピーできませんでした。',
	'popup.settings': 'プラグインのオプションを開く',
	'popup.close': '閉じる',
	'popup.fromCache': 'キャッシュ',
	'popup.elapsed': '{ms} ミリ秒',

	'action.retry': '再試行',
	'action.openSettings': 'オプションを開く',
	'action.changeProvider': 'エンジンを変更',

	'error.missingKey': '選択中の翻訳エンジンに API キーが設定されていません。',
	'error.invalidKey': 'API キーが拒否されました。全文を貼り付けたか確認してください。',
	'error.quotaExceeded': 'このエンジンは今期の利用上限に達しました。',
	'error.rateLimited': 'リクエストが集中しています。少し待ってから再試行してください。',
	'error.serverBusy': '翻訳サービスが混雑しています。',
	'error.tooLong': '選択範囲は {length} 文字です。上限は {max} 文字です。',
	'error.unsupportedPair': 'このエンジンは {source} から {target} への翻訳に対応していません。',
	'error.timeout': '翻訳サービスから時間内に応答がありませんでした。',
	'error.network': '翻訳サービスに接続できません。ネットワーク接続を確認してください。',
	'error.badResponse': '翻訳サービスから解釈できない応答が返されました。',
	'error.unknown': '翻訳に失敗しました。',
	'error.emptySelection': '選択範囲に翻訳できるテキストがありません。',

	'settings.testOk': '接続できました。',
	'settings.testOkWithQuota': '接続できました。{limit} 文字中 {used} 文字を使用しています。',
	'settings.testFailed': '接続に失敗しました。',
	'settings.testInvalidKey': 'API キーが拒否されました。',
	'settings.testMissingKey': '先に API キーを入力してください。',
	'settings.testBadResponse': '接続できましたが、応答を解釈できませんでした。',
	'settings.testing': '確認中…',
	'settings.testConnection': '接続をテスト',

	'settings.sourceLang': '翻訳元の言語',
	'settings.sourceLangDesc': '翻訳したいテキストの言語。たいていは自動検出で足ります。',
	'settings.targetLang': '翻訳先の言語',
	'settings.targetLangDesc': '訳文を表示する言語。',
	'settings.uiLanguage': 'インターフェースの言語',
	'settings.uiLanguageDesc': 'このプラグイン自身のラベルやメッセージに使う言語。',

	'settings.engineHeading': '翻訳エンジン',
	'settings.provider': 'エンジン',
	'settings.providerDesc': '実際に翻訳を行うサービス。',
	'settings.deeplKey': 'DeepL API キー',
	'settings.deeplKeyDesc':
		'無料キーは :fx で終わり、対応するサーバーが自動的に選ばれます。この保管庫内にプレーンテキストで保存されます。',
	'settings.googleCloudKey': 'Google Cloud API キー',
	'settings.googleCloudKeyDesc':
		'課金を有効にし Translation API を有効化した Cloud プロジェクトが必要です。この保管庫内にプレーンテキストで保存されます。',
	'settings.dictionaryEnrichment': '単語を辞書で調べる',
	'settings.dictionaryEnrichmentDesc': '単語を 1 つだけ選択したとき、発音・品詞・別の意味も表示します。',
	'settings.dictionarySource': '辞書のソース',
	'settings.dictionarySourceDesc':
		'自動では両方を使います。すべての言語には Google を、英語の発音には Free Dictionary API を使います。',
	'settings.freeEndpointWarning':
		'Google（キー不要）は Google が文書化もサポートもしていないエンドポイントを使います。予告なく変更・停止される可能性があります。サポートのあるサービスが必要なら DeepL か Google Cloud を選んでください。',

	'settings.activationHeading': '起動方法',
	'settings.autoPopup': 'テキストを選択したらすぐ翻訳',
	'settings.autoPopupDesc': 'ボタンを省略します。選択のたびにリクエストが送られ、利用上限の消費が早くなります。',
	'settings.translateOnDoubleClick': 'ダブルクリックで翻訳',
	'settings.translateOnDoubleClickDesc': '単語をダブルクリックするとそのまま翻訳します。',
	'settings.hotkeyPointer': 'ホットキー',
	'settings.hotkeyPointerDesc':
		'Obsidian の「Translate selection」コマンドにキーを割り当てます。ほかのショートカットと同じ場所で設定できます。',
	'settings.openHotkeys': 'Obsidian のホットキー設定を開く',
	'settings.minLength': '選択範囲の最小文字数',
	'settings.minLengthDesc': 'これより短い選択範囲は無視します。',
	'settings.maxLength': '選択範囲の最大文字数',
	'settings.maxLengthDesc': 'これより長い選択範囲は送信せず、エラーを表示します。',
	'settings.iconPlacement': 'ボタンの位置',
	'settings.iconPlacementDesc': 'ボタンを表示する位置。ほかの要素が重なるときは自動的にずれます。',
	'settings.iconOffset': 'ボタンとの距離',
	'settings.iconOffsetDesc': '選択範囲とボタンの間隔（ピクセル）。',

	'settings.scopeHeading': '有効にする場所',
	'settings.enableInReading': 'リーディングビュー',
	'settings.enableInEditing': '編集ビュー',
	'settings.enableInProperties': 'プロパティ',
	'settings.enableInPdf': 'PDF ファイル',
	'settings.pdfFallback': 'PDF の選択範囲を復元',
	'settings.pdfFallbackDesc':
		'Obsidian が PDF の選択範囲を空と報告したとき、ハイライトされたテキストレイヤーを直接読み取ります。不具合があればオフにしてください。',

	'settings.appearanceHeading': '外観',
	'settings.fontSize': 'フォントサイズ',
	'settings.fontSizeDesc': 'ポップアップ内の文字サイズ（ピクセル）。',
	'settings.fontFamily': 'フォント',
	'settings.fontFamilyDesc': '空欄にするとインターフェースと同じフォントを使います。',
	'settings.fontFamilyPlaceholder': 'Inter, Segoe UI, sans-serif',
	'settings.popupTheme': 'ポップアップの配色',
	'settings.popupThemeDesc': '白背景ならどのテーマでもポップアップが読みやすくなります。',

	'settings.speechHeading': '読み上げ',
	'settings.ttsEngine': '音声',
	'settings.ttsEngineDesc':
		'システム音声はオフラインで動作します。Google は選択したテキストを Google に送信するため、接続が必要です。',
	'settings.ttsRate': '速度',
	'settings.ttsRateDesc': 'テキストを読み上げる速さ。',

	'settings.advancedHeading': '詳細設定',
	'settings.cacheSize': '記憶する訳文の数',
	'settings.cacheSizeDesc':
		'同じ箇所を引き直すときはリクエストを送りません。メモリー上にのみ保持し、ディスクには書き込みません。0 でオフになります。',
	'settings.stripMarkdown': '翻訳前に Markdown 記法を取り除く',
	'settings.stripMarkdownDesc':
		'** やリンクなどの記法を取り除き、読者が目にするとおりのテキストをエンジンに渡します。',
	'settings.debugLog': 'デバッグログ',
	'settings.debugLogDesc':
		'診断メッセージを開発者コンソールに書き出します。不具合を報告するとき以外はオフにしてください。',
	'settings.reset': 'デフォルトに戻す',
	'settings.resetDesc': '上のオプションをすべて初期値に戻します。API キーは保持されます。',
	'settings.resetButton': '元に戻す',
	'settings.resetDone': 'オプションをデフォルトに戻しました',

	'lang.auto': '自動検出',
	'uiLang.auto': 'Obsidian に合わせる',
	'provider.google-free': 'Google（キー不要）',
	'provider.google-cloud': 'Google Cloud',
	'provider.deepl': 'DeepL',
	'dict.auto': '自動',
	'dict.gtx': 'Google',
	'dict.dictionaryapi': 'Free Dictionary API（英語）',
	'dict.off': 'オフ',
	'placement.below-center': '選択範囲の下',
	'placement.above-center': '選択範囲の上',
	'placement.cursor': 'ポインターの位置',
	'theme.light': '白背景',
	'theme.follow': 'Obsidian に合わせる',
	'tts.webspeech': 'システム音声',
	'tts.google': 'Google',

	'notice.autoPopupOn': 'テキストを選択するとすぐ翻訳します',
	'notice.autoPopupOff': 'すぐに翻訳せず、ボタンを表示します',
	'notice.russianRemoved':
		'Selection Translate では翻訳元の言語としてロシア語を選べなくなりました。翻訳元は自動検出に変更されています。ロシア語のテキストはこれまでどおり翻訳できます。',
	'tts.noVoice': 'この言語のシステム音声がインストールされていません。',
	'tts.failed': 'テキストを読み上げられませんでした。',
} satisfies Messages;
