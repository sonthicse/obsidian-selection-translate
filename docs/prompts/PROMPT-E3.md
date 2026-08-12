Đọc `docs/DEV-PLAN.md` trong repo này. Đó là đặc tả và kế hoạch phát triển đã được chốt cho plugin Selection Translate. Đọc **toàn bộ** trước khi làm bất cứ việc gì — E3 là **nút thắt** của cả nửa sau kế hoạch: E4 (8 locale + RTL), E5 (3 provider mới) và E6 (phiên âm có điều kiện) đều đứng trên registry mà E3 dựng. Làm E3 sai hình dạng thì ba epic sau phải sửa lại, nên phải biết trước cả những mục không thuộc phạm vi lần này.

Đọc thêm, theo thứ tự:

- `CLAUDE.md` ở root — bản đồ tầng, lệnh, quy ước, **mười ba** cạm bẫy. Viết ở E8, cập nhật ở E1 và E2.
- Mục **Kết quả thực hiện (E2)** trong `docs/DEV-PLAN.md` — E2 vừa đổi gì, hình dạng thật của `app.hotkeyManager`, và những gì nó cố ý không làm.
- Mục **E3** trong `docs/DEV-PLAN.md` — vấn đề hiện tại, E3-T1 → E3-T5, AC.
- Mục **E4**, **E5**, **E6** trong `docs/DEV-PLAN.md` — không phải để làm, mà để biết registry phải trả lời được những câu hỏi gì. `LanguageDescriptor` có trường `phonetic` là vì E6; có trường `ui` là vì E4; `dir` là vì RTL của E4-T4.

Nhiệm vụ lần này: **thực hiện E3 — refactor mô hình ngôn ngữ (language registry)**, milestone `0.4.0`. Chỉ E3. Không làm E4/E5/E6, kể cả khi thấy lỗi rõ ràng thuộc epic đó — ghi lại vào phần *Phát hiện ra nhưng cố ý không làm* của E3 rồi để đấy.

---

## Ràng buộc bắt buộc

**Không tự ý lệch kế hoạch (R3).** Nếu trong lúc làm phát hiện cần làm khác với `docs/DEV-PLAN.md` — đổi cách tiếp cận, mở rộng hoặc thu hẹp phạm vi, đổi cấu trúc thư mục, hoặc thấy kế hoạch sai — thì **dừng lại, trình bày vấn đề, chờ tôi đồng ý**. Áp dụng cả với thay đổi trông nhỏ và hiển nhiên đúng.

Kế hoạch đã ghi sẵn **một điểm thuộc loại này, và nó là điểm số 2 trong danh sách "phải hỏi trước khi tự quyết" ở cuối tài liệu**:

> *"Bảng mã ngôn ngữ ở E3-T2 là điểm khởi đầu dựng từ tài liệu API. Nếu thực tế khác (đặc biệt phần `zh` của DeepL và Youdao), báo lại trước khi sửa bảng."*

Nói rõ hơn: bảng trong E3-T2 được viết từ tài liệu API **tại thời điểm lập kế hoạch**, không phải từ quan sát. **Kiểm chứng lại tại thời điểm làm** — đặc biệt hai ô này:

- **DeepL**: kế hoạch ghi `ZH` làm source cho cả giản thể lẫn phồn thể, và `ZH-HANS` / `ZH-HANT` làm target. Đây đúng là hình dạng mà cạm bẫy §6.2 mô tả (source và target là hai cột khác nhau), nhưng hai mã target đó là bổ sung tương đối mới của DeepL — kiểm lại xem chúng còn đúng tên không.
- **Youdao**: `zh-CHS` / `zh-CHT` là mã của riêng Youdao, không giống ai. Youdao thuộc **E5**, nên ở E3 bạn chỉ cần chỗ trống cho nó trong cấu trúc, **không** cần mã đúng — nhưng nếu tiện kiểm được thì ghi lại.

Nếu thực tế khác bảng: **báo lại trước khi sửa bảng**, đừng tự chọn.

**E3 là thay đổi phá vỡ tương thích** — gỡ tiếng Nga khỏi danh sách ngôn ngữ nguồn, đổi schema settings. Nhưng ở giai đoạn `0.x` thì SemVer §4 cho phép **dồn vào MINOR**: `0.4.0`, **không phải `1.0.0`**. Ghi `BREAKING CHANGE:` trong footer commit và mục `Removed` + phần Breaking trong CHANGELOG là đủ.

**Đừng tự bump version, đừng tự phát hành.** `0.4.0` gồm cả E3 lẫn E4, và **bắt buộc có ít nhất một vòng beta qua BRAT** trước khi phát hành chính thức — kế hoạch nói thẳng lý do: *"lỗi migration làm mất setting là không hồi phục được"*. Cách làm beta ghi ở mục **Beta** cuối `docs/DEV-PLAN.md` (`manifest.version` dạng `0.4.0-beta.1`, tag tương ứng). Việc bump/tag/release là việc của tôi, không phải của bạn.

**Kiểm trước: `0.3.0` đã phát hành chưa?** E1 + E2 đi chung `0.3.0` và cổng ra là ma trận test thủ công của E2. Nếu `git tag` chưa có `0.3.0`, **hỏi tôi trước khi bắt đầu E3** — làm E3 chồng lên một bản chưa phát hành sẽ trộn hai milestone vào một lần release.

**Trước mỗi commit:** `npm run verify` phải xanh — hiện là **341 test, 0 error / 5 warning** (số warning là 5, xem `CLAUDE.md` §6.8, **đừng dọn chúng**). Chia nhỏ thành nhiều commit theo task (`refactor(lang):` / `feat(lang):` / `fix(lang):`), mỗi commit tự đứng được.

**Không bịa.** Mọi số dòng trong prompt này đúng ở HEAD sau E2, nhưng **code sẽ dịch chuyển ngay sau commit đầu tiên của chính bạn** — mở file ra đọc, đừng tin số dòng một cách mù quáng.

---

## Trạng thái khi bạn bắt đầu

E0, E8, E1, E2 đã xong. Không thừa hưởng việc nợ nào về code. Bản build đang nằm trong vault thật tại `.obsidian/plugins/selection-translate` (`C:\Users\SONTHI\OneDrive\Documents\Obsidian`); chép `main.js` + `manifest.json` + `styles.css` đè lên đó rồi tắt/bật plugin là cách chạy thử nhanh nhất. Phiên làm việc chạy trong WSL nên **không thao tác được GUI Obsidian** — mọi thứ phải nhìn bằng mắt đều do tôi chạy.

---

## Bối cảnh vừa học được ở E2 — đọc kỹ

### 1. Có thể đọc thẳng mã nguồn Obsidian, và điều đó đã trả công ở E2

`AppData/Roaming/obsidian/obsidian-<version>.asar` là file asar chuẩn: 4 byte offset ở vị trí 12 cho kích thước header JSON, header bắt đầu ở byte 16, dữ liệu ngay sau đó. Giải nén `app.js` rồi grep là cách E2 xác minh hình dạng `app.hotkeyManager` thay vì đoán, và nó **lật ngược ba giả định** về `Scope` mà không tài liệu nào nói (`CLAUDE.md` §6.11–6.13).

E3 gần như không chạm API nội bộ, nên có lẽ không cần tới. Nhưng nếu gặp câu hỏi kiểu *"Obsidian lưu `localStorage.language` những giá trị nào"* — đó là **E4-T3**, không phải E3 — thì đây là cách trả lời bằng dữ kiện. Ghi lại vì nó không có trong kế hoạch gốc.

### 2. "Một cổng duy nhất" là chuẩn mà E0, E1, E2 đều kết thúc bằng

E0 gom clip; E1 gom vị trí + clip + visibility vào `FloatingLayer.applyGeometry()`; E2 gom toàn bộ chuyện trigger key vào `core/HotkeyManager.ts` — sau E2 câu hỏi *"chỗ nào quyết định trigger key có bắn hay không?"* có **một** câu trả lời.

E3 phải kết thúc bằng câu trả lời tương tự cho ngôn ngữ: *"thêm một ngôn ngữ mới thì sửa ở đâu?"* → **một file** (`languages.ts`) cộng một dòng mỗi provider map. Đó chính là mục AC đầu tiên của E3. Nếu cuối E3 câu trả lời vẫn là "bốn chỗ", thì E3 chưa xong dù test có xanh.

### 3. Điểm chạm hiện tại của mã ngôn ngữ — đủ chi tiết để khỏi phải đi tìm

`SourceLangCode` / `TargetLangCode` là union hard-code trong `src/types.ts` (`:44` và `:47` ở HEAD sau E2). Mười ba file nhắc tới chúng:

`src/types.ts` · `src/settings/settings.ts` · `src/settings/sections/language.ts` · `src/providers/langMap.ts` · `src/providers/TranslationProvider.ts` · `src/providers/DeepLProvider.ts` · `src/providers/GoogleCloudProvider.ts` · `src/providers/GoogleFreeProvider.ts` · `src/providers/DictionaryProvider.ts` · `src/core/TranslationOrchestrator.ts` · `src/ui/PopupContent.ts` · `src/i18n/en.ts` · `src/i18n/vi.ts` · `src/main.ts`

Trong `langMap.ts`: `TABLE` (3 cột `google` / `deeplSource` / `deeplTarget`), `SOURCE_LANGUAGES` (`:29`), `TARGET_LANGUAGES` (`:39`), `normalizeDetectedLang()` (`:75`).

### 4. Cache LRU dùng cặp ngôn ngữ làm một phần khoá

`TranslationOrchestrator` dựng khoá bằng `cacheKey({...})` từ `src/utils/hash.ts`. Đổi mã ngôn ngữ = đổi khoá. Kế hoạch đã tính tới: **invalidate cache khi `schemaVersion` tăng**, không lọc từng entry. Cache chỉ nằm trong bộ nhớ nên "invalidate" ở đây thực chất là không làm gì — nhưng phải xác nhận điều đó chứ đừng giả định, và nếu đúng thì ghi lại một câu, đừng viết code cho một vấn đề không tồn tại.

### 5. `CLAUDE.md` đã ghi sẵn rằng E3 sẽ làm nó lỗi thời ở hai chỗ

Cả hai đều nằm trong Definition of Done của E3, không phải việc tuỳ chọn:

- **Playbook 5.1 (*thêm một ngôn ngữ mới*)** có sẵn dòng cảnh báo: *"E3 sẽ thay nó bằng registry (`languages.ts`) — sau E3 phải viết lại mục này (quy tắc R1)."* Viết lại **toàn bộ** mục, không vá.
- **Cạm bẫy §6.4** (`normalizeDetectedLang` cắt script subtag của `zh`) chính là **E3-T3**. Sau E3 nó không còn là cạm bẫy đang tồn tại nữa — phải viết lại thành *"đây là luật, đừng phá"*, kèm lý do vì sao `zh` phải giữ script subtag trong khi mọi ngôn ngữ khác vẫn cắt region.

---

## Việc cụ thể

### E3-T1. Thay union bằng registry mô tả ngôn ngữ

Hình dạng đã chốt trong kế hoạch:

```ts
interface LanguageDescriptor {
  code: string;          // BCP-47 nội bộ: 'zh-Hans', 'zh-Hant', 'ja', 'ar', ...
  nativeName: string;    // '繁體中文', '日本語', 'العربية' — hiển thị trong dropdown
  englishName: string;
  dir: 'ltr' | 'rtl';
  phonetic: 'ipa' | 'romanization' | 'none';   // dùng cho E6
  asSource: boolean;
  asTarget: boolean;
  ui: boolean;           // có catalogue giao diện không (E4)
}
```

Ba điều phải đúng:

1. **Dropdown hiển thị `nativeName`.** Người chọn tiếng Nhật cần thấy 日本語, không phải "Japanese". Hệ quả: `lang.<code>` trong catalogue i18n **có thể không còn cần thiết** — nhưng đừng xoá vội, hãy quyết định rõ và ghi lý do, vì E4 sẽ nhân mọi key còn lại lên 8 locale.
2. **`ui: true` phải khớp với thực tế**, tức chỉ `en` và `vi` ở thời điểm E3. E4 mới bật 6 cái còn lại. Đặt `true` sẵn cho ngôn ngữ chưa có catalogue là dựng một cái bẫy cho E4.
3. **Ma trận ngôn ngữ chốt nằm ở đầu `docs/DEV-PLAN.md`** — 10 nguồn (+ `auto`), 10 đích, 8 locale giao diện. Registry phải khớp bảng đó, kể cả cột "có sẵn / thêm / gỡ bỏ".

### E3-T2. Tách bảng mã theo provider

Mỗi provider tự khai `toProviderCode(code, role)` thay vì một bảng chung. Xem lại ràng buộc kiểm chứng bảng ở đầu prompt này — đây là mục phải hỏi trước khi tự quyết.

Giữ nguyên cạm bẫy §6.2: **DeepL `EN` là source, `EN-US` là target.** Việc tách theo provider làm chỗ này *dễ* hơn, không phải mất đi — mỗi provider tự biết vai nào cần mã nào. Đừng nhân dịp tái cấu trúc mà gộp hai vai làm một.

### E3-T3. Sửa `normalizeDetectedLang()` — bug chặn tính năng tiếng Trung

Hiện tại cắt tại `-`/`_` nên `zh-TW` và `zh-CN` cùng ra `zh`, giản thể và phồn thể không phân biệt được. Yêu cầu:

- `zh-CN` / `zh-Hans` / `zh-SG` / `zh` → `zh-Hans`
- `zh-TW` / `zh-HK` / `zh-MO` / `zh-Hant` → `zh-Hant`
- Ngôn ngữ khác: **giữ nguyên** hành vi cắt region hiện tại.

Chú ý `zh` trần → `zh-Hans`. Đây là quy ước của Obsidian (E4-T3 ghi rõ *"Obsidian dùng `zh` trần cho giản thể"*) và nó **ngược** với quy tắc "khi không chắc thì nghiêng về phồn thể" áp dụng cho các biến thể `zh-*` không nhận ra. Hai luật khác nhau cho hai ca khác nhau — đừng gộp.

### E3-T4. Ma trận hỗ trợ provider × cặp ngôn ngữ

`TranslationProvider.supports()` phải trả lời **đúng** để UI hiện lỗi `unsupported-pair` **trước khi** gọi mạng. Hiện `supports()` của `GoogleFreeProvider` và `GoogleCloudProvider` trả `true` vô điều kiện (tham số còn đặt tên `_source`, `_target`). Sau E3 nó phải hỏi registry.

Đây là chỗ E5 sẽ dựa vào: Papago không có tiếng Ả Rập, và một lời gọi mạng để nhận về lỗi là trải nghiệm tệ hơn hẳn một câu trả lời tức thì.

### E3-T5. Gỡ tiếng Nga + migration settings

**Đây là phần rủi ro nhất của cả epic.** Kế hoạch yêu cầu xử lý tử tế chứ không xoá lặng lẽ:

- `sourceLang: 'ru'` → migration chuyển về `'auto'` (**không** phải `'en'`: `auto` vẫn dịch được văn bản tiếng Nga, chỉ mất khả năng ép cứng ngôn ngữ nguồn).
- `Notice` **một lần duy nhất** khi migration chạy, giải thích ngắn gọn. Không lặp lại ở lần khởi động sau — nghĩa là phải có chỗ ghi nhớ rằng nó đã chạy, và chỗ đó chính là `schemaVersion`.
- CHANGELOG mục `Removed`, nêu rõ trong phần Breaking.
- Thêm `schemaVersion` + hàm `migrate()` vào `src/settings/settings.ts`. Mọi giá trị cũ map sang code mới **không mất mát**; giá trị không nhận ra rơi về mặc định chứ **không** làm hỏng việc load settings.

Cạm bẫy có thật ở đây: `normalizeSettings()` hiện đã làm một phần việc của migration (clamp số, rơi về mặc định). Quyết định rõ ranh giới giữa `migrate()` và `normalizeSettings()` rồi ghi vào comment — nếu không, epic sau sẽ thêm luật vào nhầm chỗ.

---

## AC

Không tick mục nào mà chưa thực sự thử.

- [ ] Thêm một ngôn ngữ mới = sửa **1 file** (`languages.ts`) + 1 dòng mỗi provider map. **Chứng minh bằng cách làm thật**: thêm một ngôn ngữ, đếm số file phải sửa, rồi hoàn tác.
- [ ] Test: mọi ngôn ngữ `asSource` có mã hợp lệ ở **≥ 1** provider.
- [ ] Test: mọi cặp mà `supports()` trả `true` đều có mã ở **cả hai** đầu.
- [ ] Test: `normalizeDetectedLang('zh-TW')` → `'zh-Hant'`, `normalizeDetectedLang('zh-CN')` → `'zh-Hans'`, `normalizeDetectedLang('zh')` → `'zh-Hans'`.
- [ ] Test migration: load `data.json` phiên bản 0.2.2 → **không mất setting nào**.
- [ ] Test migration: `sourceLang: 'ru'` → `'auto'`, và `Notice` chỉ hiện một lần (lần load thứ hai không hiện).
- [ ] Test: `data.json` chứa giá trị rác ở mọi trường → settings vẫn load được, rơi về mặc định.
- [ ] Chọn cặp ngôn ngữ mà provider không hỗ trợ → lỗi `unsupported-pair`, **không gọi mạng**.
- [ ] `npm run verify` xanh: 0 error, đúng **5** warning.
- [ ] CHANGELOG có mục `Removed` (tiếng Nga) và phần Breaking, mô tả **theo cách người dùng nhìn thấy**.

### Ma trận test thủ công

Nhẹ, nhưng bắt buộc, và phải ghi kết quả vào phần *Kết quả thực hiện* của E3:

1. **Vault đang đặt `sourceLang: 'ru'`** → mở Obsidian → thấy `Notice` một lần, setting về `Tự nhận diện`, không mất setting nào khác. Khởi động lại → **không** thấy `Notice` nữa.
2. **Vault của người dùng 0.2.2 bình thường** (`sourceLang: 'en'`, `targetLang: 'vi'`) → mở lên, mọi setting nguyên vẹn, dịch vẫn chạy.
3. **Dropdown ngôn ngữ** hiển thị `nativeName` đúng, không ô vuông (chữ Nhật/Trung/Ả Rập cần phông — nếu ra ô vuông thì đó là việc của **E4**, ghi lại chứ đừng sửa).

Chép `data.json` ra chỗ khác trước khi thử, để còn khôi phục.

---

## Bước cuối — cập nhật `docs/DEV-PLAN.md` và `CLAUDE.md`

Bắt buộc, không phải tuỳ chọn.

**A. `CLAUDE.md` (quy tắc R1).** E3 làm lỗi thời ít nhất năm chỗ — **mở ra đối chiếu, đừng đoán**:

- Dòng trạng thái đầu file: số file TS, LOC, số test, số chuỗi UI.
- §2 bản đồ tầng: `languages.ts` là file mới, phải xuất hiện; LOC của `langMap.ts`, `types.ts`, `settings.ts` sẽ đổi.
- **Playbook 5.1 — viết lại toàn bộ.** Đây là mục có giá trị nhất của cả tài liệu sau E3.
- **Cạm bẫy §6.4 — viết lại**, từ "bug đang tồn tại" thành "luật, đừng phá". §6.2 (DeepL hai cột) phải kiểm lại xem còn mô tả đúng `langMap.ts` sau khi tách theo provider không.
- Playbook 5.2 (*thêm một provider mới*): bước 4 hiện ghi *"`src/providers/langMap.ts` — cột mã ngôn ngữ của provider mới"*. Sau E3-T2 đường đi này đổi hẳn — **E5 sẽ đi theo đúng mục này**, nên viết sai là làm hỏng E5.

**B. `docs/DEV-PLAN.md`.** Thêm vào cuối mục E3 một phần `### Kết quả thực hiện (E3)` gồm: trạng thái từng task E3-T1 → E3-T5, **kết quả kiểm chứng bảng mã ngôn ngữ** (khớp hay không khớp tài liệu API, và nguồn bạn đã tra — đây là dữ kiện quý, không ai chép lại được), kết quả ma trận test thủ công, danh sách commit, và những gì phát hiện ra nhưng cố ý không làm. Cập nhật bảng *Tiến độ* (E3 xong, tiếp theo là E4) và mục *Việc tiếp theo*.

**C. Rà lại mọi trích dẫn `file:dòng` trong `docs/DEV-PLAN.md` và `CLAUDE.md`.** E3 chạm `src/` rất rộng. Số dòng trong `docs/CODE-REVIEW.md` và `docs/REVIEW-FINDINGS.md` là ảnh chụp `0.2.2` — **giữ nguyên**.

**D. Nếu E3 làm lộ ra điều gì khiến một epic sau phải đổi cách làm** — ví dụ registry không đủ chỗ cho thứ E5 cần, hoặc `phonetic` hoá ra không quyết định được từ ngôn ngữ nguồn như E6 giả định — thì **báo cho tôi**, đừng tự sửa nội dung epic đó.

**E. Sau khi E3 xong: nhắc tôi rằng `0.4.0` chưa được phát hành** cho tới khi E4 xong **và** đã qua **ít nhất một vòng beta BRAT**. Nhắc luôn ba bài học ở `CLAUDE.md` §8, đặc biệt: kiểm asset của release sau khi workflow chạy — thiếu `main.js` + `manifest.json` dưới dạng file rời là trượt cổng submit ngay tại bước đó.

---

## Bước 9 — viết prompt cho epic tiếp theo

Epic tiếp theo là **E4 — giao diện 8 locale + RTL**, milestone `0.4.0`, cùng lần phát hành với E3.

Viết ra file `docs/prompts/PROMPT-E4.md` một prompt để tôi dán vào phiên sau. Prompt đó phải:

- Cùng cấu trúc và cùng giọng với prompt bạn đang đọc: nhắc đọc `docs/DEV-PLAN.md` và `CLAUDE.md` trước, nêu rõ phạm vi chỉ E4, nêu ràng buộc R3.
- Cụ thể hoá đủ **E4-T1 → E4-T4** và toàn bộ AC.
- Mang theo ngữ cảnh vừa học được ở E3 — nhất là hình dạng cuối cùng của registry và những chỗ E4 phải cắm vào (`ui: true`, `dir`, `nativeName`).
- Nêu rõ **khối lượng thật** của E4 tính theo số key ×  8 locale **tại thời điểm E3 kết thúc** (con số trong kế hoạch đã cũ từ E0; tự đếm lại bằng `npm run check`).
- Nhắc **quyết định 3**: Claude viết/dịch, tự nhiên như người bản ngữ viết; `zh-Hant` là bản chuẩn, `zh-Hans` phái sinh từ nó — và nhắc lưu ý ở đầu kế hoạch rằng giản thể **không phải** phồn thể đổi bộ chữ (軟體/软件, 網路/网络, 設定/设置).
- Nhắc rằng **`docs/GLOSSARY.md` phải tồn tại trước khi dịch**, không phải sau (E4-T2 mục 4).
- Nhắc rằng E4-T4 (RTL) là **ba việc khác nhau dễ nhầm là một**: chrome theo UI locale, nội dung theo ngôn ngữ của chính đoạn text, và placement phải soi gương. E1 đã dọn sẵn nửa đường cho việc thứ ba — hai inset ngang đã tồn tại, chỉ còn phải đảo `anchorRect.right` ↔ `left`.
- Nhắc rằng `0.4.0` **bắt buộc có ít nhất một vòng beta qua BRAT** trước khi phát hành, và E4 là mảnh cuối trước vòng beta đó.
- Có bước tự cập nhật `CLAUDE.md` + `docs/DEV-PLAN.md`, và bước viết `docs/prompts/PROMPT-E5.md`.

Nếu trong lúc làm E3 bạn phát hiện thêm quy ước, cạm bẫy, hay ràng buộc nào đáng đưa vào prompt E4 mà kế hoạch chưa liệt kê, đưa vào luôn — kèm ghi chú rằng đây là phát hiện mới, không có trong kế hoạch gốc.

---

## Đầu ra mong đợi

1. Code sửa xong E3-T1 → E3-T5, `npm run verify` xanh sau mỗi commit
2. Test mới cho registry, `normalizeDetectedLang` nhóm `zh`, `supports()`, và migration (gồm ca `sourceLang: 'ru'` và ca `data.json` rác)
3. Ma trận test thủ công đã chạy, kết quả ghi vào `docs/DEV-PLAN.md`
4. `CLAUDE.md` đã rà và cập nhật (R1) — **playbook 5.1 viết lại toàn bộ**, cạm bẫy §6.4 viết lại, playbook 5.2 bước 4 sửa theo
5. `docs/DEV-PLAN.md` đã cập nhật kết quả E3, bảng tiến độ, và mọi trích dẫn `file:dòng`
6. `docs/prompts/PROMPT-E4.md`
7. CHANGELOG có entry trong `## [Unreleased]`, gồm mục `Removed` và phần Breaking
