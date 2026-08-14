# Bảng thuật ngữ

Mỗi thuật ngữ cốt lõi có **một** bản dịch cố định cho mỗi ngôn ngữ. Dịch cùng một từ hai cách ở hai chỗ là lỗi không test nào bắt được, và sửa sau khi đã dịch xong tám thứ tiếng thì đắt gấp tám lần — nên bảng này được lập **trước** khi viết dòng dịch đầu tiên (yêu cầu E4-T2 mục 4).

> **Phạm vi:** bảng này ràng buộc `src/i18n/*.ts`. Nó **không** ràng buộc `README`/`docs` — E7 sẽ dùng lại nó khi dịch tài liệu.

---

## Nguồn của các cột "chính thức"

Những khái niệm dùng chung với Obsidian phải dùng **đúng từ mà bản địa hoá chính thức của Obsidian đang dùng**, không phải từ nghe hay hơn. Người dùng đang ở *trong* Obsidian; plugin dùng từ khác sẽ đọc như ghép từ hai phần mềm.

Các hàng đánh dấu **✓ Obsidian** được tra thẳng từ catalogue dịch chính thức trong `obsidian-1.13.7.asar`, không phải từ trí nhớ hay từ điển. Cách lấy:

```
AppData/Roaming/obsidian/obsidian-<version>.asar
  → i18n/mapping.txt   khoá, mỗi dòng một khoá
  → i18n/<locale>.txt  bản dịch, cùng số dòng
  → i18n.js            window.OBSIDIAN_DEFAULT_I18N — bản English
```

Đây là asar chuẩn: 4 byte ở offset 12 cho kích thước header JSON, header từ byte 16, dữ liệu ngay sau. Cùng kỹ thuật E2 đã dùng để đọc `Scope` (`CLAUDE.md` §6.12).

Hàng **không** có dấu ✓ là khái niệm Obsidian không có — plugin tự đặt, và bảng này là nơi chốt.

---

## 1. Khái niệm của riêng plugin

| Thuật ngữ | `vi` | `zh-Hant` | `zh-Hans` | `es` | `ja` | `it` | `ar` |
|---|---|---|---|---|---|---|---|
| **selection** (đoạn đã bôi đen) | vùng chọn | 選取的文字 | 选中的文字 | el texto seleccionado | 選択範囲 | il testo selezionato | النص المحدد |
| **engine** (từ hiển thị cho người dùng) | công cụ dịch | 翻譯引擎 | 翻译引擎 | motor de traducción | 翻訳エンジン | motore di traduzione | محرك الترجمة |
| **popup** | popup | 彈出視窗 | 弹出窗口 | ventana emergente | ポップアップ | finestra popup | النافذة المنبثقة |
| **button** (nút kích hoạt cạnh vùng chọn) | nút | 按鈕 | 按钮 | botón | ボタン | pulsante | الزر |
| **phonetic** / pronunciation | phiên âm | 發音 | 发音 | pronunciación | 発音 | pronuncia | النطق |
| **part of speech** | từ loại | 詞性 | 词性 | categoría gramatical | 品詞 | categoria grammaticale | نوع الكلمة |
| **dictionary** | từ điển | 詞典 | 词典 | diccionario | 辞書 | dizionario | القاموس |
| **source language** | ngôn ngữ nguồn | 來源語言 | 源语言 | idioma de origen | 翻訳元の言語 | lingua di origine | لغة المصدر |
| **target language** | ngôn ngữ đích | 目標語言 | 目标语言 | idioma de destino | 翻訳先の言語 | lingua di destinazione | لغة الهدف |
| **quota** | hạn mức | 額度 | 配额 | cuota | 利用上限 | quota | الحصة |
| **read aloud** (TTS) | đọc to | 朗讀 | 朗读 | leer en voz alta | 読み上げ | leggi ad alta voce | القراءة بصوت عالٍ |
| **API key** | khoá API | API 金鑰 | API 密钥 | clave de API | API キー | chiave API | مفتاح API |

### **provider** — từ này **không bao giờ** xuất hiện trong chuỗi UI

`provider` là thuật ngữ của **mã nguồn** (`TranslationProvider`, `ProviderRegistry`, `ProviderErrorCode`). Chuỗi UI tiếng Anh cố ý dùng **engine**, và mọi bản dịch phải bám theo *engine*, không dịch chữ "provider". Ai thấy mình đang dịch "nhà cung cấp" thì đã đi sai đường.

---

## 2. Khái niệm dùng chung với Obsidian

| Thuật ngữ | `vi` | `zh-Hant` | `zh-Hans` | `es` | `ja` | `it` | `ar` |
|---|---|---|---|---|---|---|---|
| **Options** ✓ Obsidian | Tùy chọn | 選項 | 选项 | Opciones | オプション | Opzioni | الخيارات |
| **Hotkeys** ✓ Obsidian | Phím tắt | 快速鍵 | 快捷键 | Atajos de teclado | ホットキー | Tasti di scelta rapida | مفاتيح الاختصار |
| **Command palette** ✓ Obsidian | Khay lệnh | 命令面板 | 命令面板 | Paleta de comandos | コマンドパレット | Riquadro comandi | لوحة الأوامر |
| **Reading view** ✓ Obsidian | Chế độ đọc | 閱讀檢視模式 | 阅读视图 | Vista de lectura | リーディングビュー | Lettura | عرض القراءة |
| **Editing view** ✓ Obsidian | Chế độ chỉnh sửa | 編輯檢視模式 | 编辑视图 | Vista de edición | 編集ビュー | Modifica | وضع التحرير |
| **Live Preview** ✓ Obsidian | Xem trước trực tiếp | 實際預覽 | 实时预览 | Vista previa | ライブプレビュー | Anteprima dinamica | المعاينة المباشرة |
| **Properties** ✓ Obsidian | Thuộc tính | 屬性 | 笔记属性 | Propiedades | プロパティ | Proprietà | الخصائص |
| **Appearance** ✓ Obsidian | Giao diện | 外觀 | 外观 | Apariencia | 外観 | Aspetto | المظهر |
| **Font** ✓ Obsidian | Phông chữ | 字型 | 字体 | Fuente | フォント | Carattere | الخط |
| **Language** ✓ Obsidian | Ngôn ngữ | 語言 | 语言 | Idioma | 言語 | Lingua | اللغة |
| **Cache** ✓ Obsidian | Bộ nhớ đệm | 快取 | 缓存 | Caché | キャッシュ | Cache | ذاكرة التخزين المؤقت |
| **Vault** ✓ Obsidian | Kho | 儲存庫 | 仓库 | Bóveda | 保管庫 | Vault | الخزنة |
| **Plugin** ✓ Obsidian | Plugin | 外掛程式 | 插件 | Complemento | プラグイン | Plugin | إضافة |
| **Copy** ✓ Obsidian | Sao chép | 複製 | 复制 | Copiar | コピー | Copia | نسخ |
| **Close** ✓ Obsidian | Đóng | 關閉 | 关闭 | Cerrar | 閉じる | Chiudi | إغلاق |
| **Restore default** ✓ Obsidian | Khôi phục mặc định | 還原至預設值 | 恢复默认 | Restaurar los valores por defecto | デフォルトに戻す | Ripristina predefinito | استعادة الافتراضي |

> **Về `vi`:** Obsidian viết *"Tùy chọn"*, `vi.ts` có sẵn từ trước viết *"tuỳ chọn"*. Cả hai đều đúng chính tả tiếng Việt (`ù + y` so với `u + ỳ`); đã **giữ nguyên `vi.ts`** thay vì sửa 120 chuỗi cho một khác biệt không ai đọc ra. Ghi lại để lần sau không ai "sửa" qua lại.

---

## 3. Không dịch

Giữ nguyên trong **mọi** ngôn ngữ, kể cả tiếng Ả Rập và tiếng Nhật:

`Markdown` · `PDF` · `YAML` · `API` · `Obsidian` · `DeepL` · `Google` · `Google Cloud` · `Free Dictionary API` · `IPA` · `ms` (đơn vị mili giây trong `popup.elapsed`) · `verbose`

> **`verbose` giữ nguyên là cố ý.** Nó là nhãn thật trong ô chọn mức log của DevTools, và ô đó hầu như luôn hiển thị tiếng Anh. Dịch ra thì câu đọc mượt hơn nhưng người dùng không tìm thấy thứ cần bấm.

Tên ngôn ngữ **không** nằm trong catalogue: dropdown lấy `nativeName` thẳng từ `src/languages.ts`, nên 日本語 hiện là 日本語 ở mọi giao diện. Chỉ `lang.auto` ("tự nhận diện") và `uiLang.auto` ("theo Obsidian") đi qua i18n, vì cả hai là **chỉ dẫn** chứ không phải tên một ngôn ngữ.

---

## 4. Cặp phồn thể / giản thể — chỗ dễ sai nhất

`zh-Hans` **không phải** `zh-Hant` đổi bộ chữ. Bảng dưới là những cặp có thật trong bảng trên, và là bằng chứng cụ thể cho lý do hai catalogue phải soát riêng:

| Khái niệm | `zh-Hant` | `zh-Hans` | Ghi chú |
|---|---|---|---|
| cache | 快取 | 缓存 | Không phải biến thể chữ — hai từ khác nhau |
| API key | API 金鑰 | API 密钥 | như trên |
| font | 字型 | 字体 | như trên |
| plugin | 外掛程式 | 插件 | như trên |
| vault | 儲存庫 | 仓库 | như trên |
| properties | 屬性 | 笔记属性 | Obsidian giản thể thêm 笔记 vào |
| source language | 來源語言 | 源语言 | |

Một bản OpenCC chuyển máy từ cột trái sẽ cho 快取 → 快取, 金鑰 → 金钥, 外掛程式 → 外挂程式 — đều **sai** với người đại lục, và đọc ra ngay là "bản Đài Loan chuyển máy". Quy trình bắt buộc: dịch `zh-Hant` trước như bản chuẩn, chuyển bộ chữ, rồi **rà lại toàn bộ thuật ngữ** theo cột `zh` của Obsidian.

---

## 5. Ngữ điệu, áp dụng cho mọi ngôn ngữ

- Trung tính, ngắn, hướng dẫn trực tiếp. Không cảm thán, không emoji, không "Hãy…" thừa.
- **Nhãn setting phải ngắn** — 73 trên 120 khoá là nhãn, và đó là chỗ chuỗi vượt khung. Tiếng Tây Ban Nha và tiếng Ý dài hơn tiếng Anh 20–30%; rút ý chứ đừng cắt cụt.
- **Câu lỗi phải nói người dùng làm gì tiếp theo.** "Dịch không thành công" mà không có bước kế tiếp là câu vô dụng nhất một plugin có thể nói.
- **Dịch ý, không dịch chữ.** Tiếng Nhật không viết câu bị động dài như tiếng Anh; tiếng Việt, tiếng Nhật và tiếng Ý đều lược chủ ngữ ngôi hai ở chỗ tiếng Anh phải có "you".
- **Nhãn điều khiển không kết thúc bằng dấu chấm**; câu thông báo và câu lỗi thì có. `tests/i18n.test.ts` canh gác điều này cho bản English.
