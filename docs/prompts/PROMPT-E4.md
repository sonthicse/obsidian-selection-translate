# Prompt cho E4 — giao diện 8 locale + RTL

> Dán nguyên khối dưới đây vào một phiên Claude Code mới, ở thư mục gốc của repo.

---

Đọc `docs/DEV-PLAN.md` trong repo này. Đó là đặc tả và kế hoạch phát triển đã được chốt cho plugin Selection Translate. Đọc **toàn bộ** trước khi làm bất cứ việc gì — E4 đứng trên registry mà **E3 vừa dựng xong**, và phần lớn công sức của E4 là dịch: sai hình dạng ở đầu thì phải sửa ở tám nơi thay vì một.

Đọc thêm, theo thứ tự:

- `CLAUDE.md` ở root — bản đồ tầng, lệnh, quy ước, **mười bốn** cạm bẫy. Viết ở E8, cập nhật ở E1, E2 và E3.
- Mục **Kết quả thực hiện (E3)** trong `docs/DEV-PLAN.md` — hình dạng cuối cùng của `src/languages.ts`, kết quả kiểm chứng bảng mã ngôn ngữ, và những gì E3 cố ý không làm.
- Mục **E4** trong `docs/DEV-PLAN.md` — E4-T1 → E4-T4, AC, và chuẩn chất lượng bản dịch ở E4-T2.
- **Quyết định 3** và **lưu ý về `zh-Hans`** ở đầu `docs/DEV-PLAN.md`. Hai mục ngắn, và là phần dễ làm sai nhất của cả epic.
- Mục **E6** trong `docs/DEV-PLAN.md` — không phải để làm, mà để biết `LanguageDescriptor.phonetic` đã có sẵn và E4 **không** được chạm vào nó.

Nhiệm vụ lần này: **thực hiện E4 — giao diện 8 locale + RTL**, milestone `0.4.0`, cùng lần phát hành với E3. Chỉ E4. Không làm E5/E6, kể cả khi thấy lỗi rõ ràng thuộc epic đó — ghi vào phần *Phát hiện ra nhưng cố ý không làm* của E4 rồi để đấy.

---

## Ràng buộc bắt buộc

**Không tự ý lệch kế hoạch (R3).** Nếu trong lúc làm phát hiện cần làm khác với `docs/DEV-PLAN.md` — đổi cách tiếp cận, mở rộng hoặc thu hẹp phạm vi, đổi cấu trúc thư mục, hoặc thấy kế hoạch sai — thì **dừng lại, trình bày vấn đề, chờ tôi đồng ý**. Áp dụng cả với thay đổi trông nhỏ và hiển nhiên đúng.

Có một điểm ở E4 **gần như chắc chắn** sẽ chạm ngưỡng đó, nên nói trước: **`resolveLocale()` đọc `localStorage.language`, và ESLint đang cảnh báo đúng chỗ đó** (`obsidianmd/prefer-get-language`, một trong 5 warning cố ý ở `CLAUDE.md` §6.8). E4-T3 viết lại chính hàm này. Nếu bạn thấy nên chuyển sang `getLanguage()` của Obsidian nhân dịp đó — **hỏi trước**, đừng tự đổi: ngưỡng `minAppVersion: 1.5.0` là lý do bốn warning kia còn treo, và API đó mới hơn thế. Kiểm bằng dữ kiện (giải nén asar, xem §6.12 để biết cách) rồi báo lại, đừng đoán.

**`0.4.0` bắt buộc có ít nhất một vòng beta qua BRAT trước khi phát hành.** Lý do kế hoạch ghi thẳng: *"lỗi migration làm mất setting là không hồi phục được"* — và E3 vừa thêm `schemaVersion` + `migrate()` vào `data.json` thật của người dùng. **E4 là mảnh cuối cùng trước vòng beta đó.** Cách làm beta ở mục **Beta** cuối `docs/DEV-PLAN.md` (`manifest.version` dạng `0.4.0-beta.1`, tag tương ứng).

**Đừng tự bump version, đừng tự phát hành.** Việc bump/tag/release là việc của tôi.

**Trước mỗi commit:** `npm run verify` phải xanh — hiện là **332 test, 0 error / 5 warning** (số warning là 5, xem `CLAUDE.md` §6.8, **đừng dọn chúng**). Chia nhỏ thành nhiều commit theo task (`feat(i18n):` / `docs(i18n):` / `feat(ui):`), mỗi commit tự đứng được. Tám catalogue là tám khối lớn — **đừng nhồi cả tám vào một commit**.

**Không bịa.** Mọi con số trong prompt này đúng ở HEAD sau E3, nhưng code sẽ dịch chuyển ngay sau commit đầu tiên của chính bạn — mở file ra đọc, đừng tin số dòng một cách mù quáng.

---

## Khối lượng thật, đếm lại sau E3

**122 key × 8 locale = 976 chuỗi.** Kế hoạch gốc ghi "134 key × 8 = 1.072" — con số của trước E0, và đã sai suốt từ đó. Đếm lại bất cứ lúc nào bằng `npm run check`, nó in thẳng số chuỗi UI ở dòng cuối.

Phân bố key, để lượng sức và để biết chỗ nào cần soát kỹ:

| Nhóm | Số key | Ghi chú |
|---|---|---|
| `settings.*` | **73** | Hơn một nửa. Nhãn phải **ngắn** — đây là chỗ chuỗi vượt khung (E4-T2 mục 3) |
| `error.*` | 12 | Mỗi câu phải nói người dùng **làm gì tiếp theo** |
| `popup.*` | 10 | Vừa có nhãn điều khiển vừa có câu Notice; §quy ước cấm nhãn kết thúc bằng dấu chấm |
| `dict.*`, `tts.*` | 4 + 4 | |
| `uiLang.*`, `provider.*`, `placement.*`, `notice.*` | 3 mỗi nhóm | `uiLang.*` sẽ **mọc thêm 6 key** ở E4-T3 |
| `theme.*` | 2 | |
| `lang.auto`, `icon.*` | 1 + 1 | `lang.auto` là key ngôn ngữ **duy nhất** còn lại sau E3 |

**Bảy placeholder** trong toàn bộ catalogue: `{ms}`, `{length}`, `{max}`, `{source}`, `{target}`, `{used}`, `{limit}`. Tên phải **trùng khít** ở cả tám catalogue — `npm run check` fail nếu lệch, và `tests/i18n.test.ts` cũng kiểm.

Lưu ý một điều E3 đã dọn sẵn và đừng làm hỏng: **`lang.<code>` không còn tồn tại.** Dropdown ngôn ngữ nguồn/đích hiển thị `nativeName` lấy thẳng từ registry, nên **không** nhân tên ngôn ngữ lên 8 locale. Chỉ `lang.auto` đi qua i18n. Nếu bạn thấy mình đang thêm `lang.ja` vào một catalogue thì đã đi sai đường — xem `languageLabel()` trong `src/settings/sections/language.ts`.

---

## Trạng thái khi bạn bắt đầu

E0, E8, E1, E2, E3 đã xong. Không thừa hưởng việc nợ nào về code. Bản build đang nằm trong vault thật tại `.obsidian/plugins/selection-translate` (`C:\Users\SONTHI\OneDrive\Documents\Obsidian`); chép `main.js` + `manifest.json` + `styles.css` đè lên đó rồi tắt/bật plugin là cách chạy thử nhanh nhất. Phiên làm việc chạy trong WSL nên **không thao tác được GUI Obsidian** — mọi thứ phải nhìn bằng mắt đều do tôi chạy.

---

## Bối cảnh vừa học được ở E3 — đọc kỹ

### 1. Hình dạng cuối cùng của registry, và ba trường E4 phải cắm vào

`src/languages.ts` là **một file, không import gì**, đáy đồ thị phụ thuộc. Mỗi ngôn ngữ là một hàng `LanguageDescriptor` với 8 trường. Ba trường thuộc về E4:

- **`ui: boolean`** — hiện `true` cho **đúng `en` và `vi`**. E4 bật 6 cái còn lại, và **mỗi lần bật một cái phải có catalogue thật đứng sau nó ngay trong cùng commit**. `UI_LANGUAGES` suy ra từ cờ này, nên dropdown ngôn ngữ giao diện tự dài ra — không có mảng nào phải sửa tay.
- **`nativeName: string`** — đã dùng cho dropdown ngôn ngữ nguồn/đích. Dropdown **ngôn ngữ giao diện** nên dùng cùng nguồn đó thay vì `uiLang.<code>`, nhưng đây là quyết định của bạn — cân nhắc rồi ghi lý do, vì `uiLang.auto` ("theo Obsidian") thì vẫn phải đi qua i18n.
- **`dir: 'ltr' | 'rtl'`** — hiện chỉ `ar` là `rtl`, và có test canh gác đúng điều đó (`marks Arabic right-to-left, and nothing else`). Cả ba việc của E4-T4 đọc trường này.

`SourceLangCode` / `TargetLangCode` / `SOURCE_LANGUAGES` / `TARGET_LANGUAGES` / `UI_LANGUAGES` đều **suy ra từ cờ bằng `Extract<>` và `filter` có type predicate** — không có mảng viết tay nào để quên cập nhật. Đừng thêm mảng mới; nếu cần một danh sách khác, suy ra nó y hệt.

### 2. `Locale` hiện là `'en' | 'vi'` và nó **không** phải `LangCode`

Đây là chỗ dễ nhầm nhất khi mở rộng. `src/i18n/index.ts` khai `Locale` riêng, `CATALOGUES: Record<Locale, Messages>` riêng, và `settings.ts` khai `UiLanguage = 'auto' | 'vi' | 'en'` **riêng lần nữa**. Sau E4 có ba nơi cùng nói về tám locale.

Cách rẻ nhất — và đúng tinh thần "một cổng duy nhất" mà E0/E1/E2/E3 đều kết thúc bằng — là suy `Locale` từ `ui: true` trong registry, đúng như `UI_LANGUAGES` đang làm, rồi `UiLanguage = 'auto' | Locale`. Nhưng `CATALOGUES` vẫn phải map từng locale sang một object thật, và **đó là chỗ trình biên dịch nên bắt bạn**: khai `Record<Locale, Messages>` thì bật `ui: true` mà quên catalogue là **lỗi biên dịch**, không phải bug lúc chạy. Đây chính là mẹo `Record<LangCode, string>` mà E3 dùng cho bảng mã provider (`CLAUDE.md` §6.14) — dùng lại nó.

### 3. `t()` hiện trả về **key** khi thiếu chuỗi, và E4-T1 phải sửa

`src/i18n/index.ts` — hàm `t()` trả `key` và `warnOnce`. Với 2 locale thì đó là quyết định hợp lý; với 8 thì nó nghĩa là một key sót ở tiếng Ý sẽ hiện `error.somethingNew` ra giữa popup. Kế hoạch yêu cầu **fallback về `en`**, giữ `warnOnce` để vẫn phát hiện được. Đây đã được ghi nợ từ E0 và nhắc lại ở E1, E2 — **E4 là nơi trả**.

### 4. `docs/GLOSSARY.md` phải tồn tại **trước** khi dịch, không phải sau

E4-T2 mục 4 nói rõ. Lý do rất thực tế: "provider" dịch hai cách ở hai chỗ trong cùng một catalogue là lỗi không ai phát hiện được bằng test, và sửa sau khi đã dịch xong tám thứ tiếng thì đắt gấp tám lần. Danh sách thuật ngữ cốt lõi kế hoạch liệt kê: *selection, provider, phonetic, part of speech, dictionary, trigger, popup, cache*.

Thêm vào đó, từ thực tế repo: **"engine"** (chuỗi UI đang dùng từ này chứ không dùng "provider"), **"source language" / "target language"**, **"reading view" / "live preview"**, **"properties"**, **"command palette"**, **"hotkeys"**. Sáu cái sau là khái niệm **dùng chung với Obsidian**, nên phải lấy **đúng từ mà bản địa hoá chính thức của Obsidian đang dùng** ở ngôn ngữ đó (E4-T2 mục 1) — không phải từ bạn thấy hay hơn.

### 5. Quyết định 3, và cái bẫy `zh-Hans`

**Claude viết/dịch, tự nhiên như người bản ngữ viết.** Không phải dịch máy rồi sửa.

Thứ tự làm: `en` (chuẩn) → **`zh-Hant`** → **`zh-Hans` (phái sinh từ `zh-Hant`)** → còn lại. Hai catalogue Trung làm liền nhau để thuật ngữ nhất quán giữa chúng.

**Cái bẫy, ghi ở đầu `docs/DEV-PLAN.md` và nhắc lại đây vì nó tốn cả một vòng làm lại nếu bỏ qua:** bản giản thể **không phải** bản phồn thể đổi bộ chữ. Từ vựng tin học khác nhau **thật sự** — 軟體/软件, 網路/网络, 螢幕/屏幕, 設定/设置, 檔案/文件. Chuyển đổi kiểu OpenCC rồi dùng luôn sẽ cho ra thứ tiếng Trung mà người đại lục đọc ra ngay là "bản Đài Loan chuyển máy". Quy trình đúng: dịch `zh-Hant` trước như bản chuẩn, chuyển bộ chữ, rồi **rà lại toàn bộ thuật ngữ** theo bản địa hoá chính thức của Obsidian tiếng Trung giản thể.

E3 đã dựng sẵn nền cho việc này: hai biến thể là **hai hàng riêng** trong registry với hai `nativeName` riêng (繁體中文 / 简体中文), và `normalizeDetectedLang` phân biệt được chúng. Đừng gộp lại.

### 6. E4-T4 là **ba việc khác nhau**, rất dễ tưởng là một

| # | Việc | Theo cái gì | Đặt ở đâu |
|---|---|---|---|
| 1 | **Chrome của plugin** — popup, settings | **UI locale** | Obsidian đặt class `mod-rtl` trên `body`; bám theo đó. `styles.css` chuyển sang logical properties: `padding-inline-start`, `inset-inline-start`, `margin-inline-end` |
| 2 | **Nội dung** — khối kết quả dịch | **ngôn ngữ của chính đoạn text** | `dir` trên **từng khối nội dung**, không đặt trên cả popup |
| 3 | **Placement** — icon và popup đặt ở đâu | **UI locale** (hướng đọc) | `computeCandidate()` nhận `dir` và đảo `anchorRect.right` ↔ `left` |

Việc 2 là phần dễ bỏ sót nhất: **UI tiếng Anh nhưng dịch sang tiếng Ả Rập** → khối kết quả phải `dir="rtl"` trong khi nhãn và footer vẫn LTR. `LanguageDescriptor.dir` của **ngôn ngữ đích** là thứ trả lời câu này.

**E1 đã dọn sẵn nửa đường cho việc 3.** Hai inset ngang đã tồn tại từ E1-T4 — trong `ClipInsets`, trong hai lời gọi `setClip`, và trong hai dòng `clip-path` của `styles.css`. Phần RTL chỉ còn là chuyện **chọn cạnh nào**, không phải dựng thêm cạnh. `DEFAULT_PLACEMENT_ORDER` chứa `right-of-end` và `left-of-start`; trong RTL, "end" của vùng chọn nằm bên **trái**.

Thêm: `--st-font-family` cần fallback cho chữ Ả Rập, CJK và Kana. **Nếu ở E3 dropdown đã hiện ô vuông thay vì 日本語 / العربية thì đó chính là việc này** — E3 cố ý không sửa, xem *Phát hiện ra nhưng cố ý không làm* của E3.

---

## Việc cụ thể

### E4-T1. Mở rộng catalogue

`Locale = 'en' | 'vi'` → `'en' | 'vi' | 'zh-Hant' | 'zh-Hans' | 'es' | 'ja' | 'it' | 'ar'`. **122 key × 8 = 976 chuỗi.**

- English là nguồn chân lý. Mỗi catalogue khác phải có **đúng** tập key của `en` — không thừa, không thiếu. `vi.ts` đang làm đúng bằng `satisfies Messages`; bảy catalogue mới phải làm y hệt, để thiếu key là **lỗi biên dịch** chứ không phải lỗi lúc chạy.
- Sửa `t()`: chuỗi thiếu → **fallback về `en`**, giữ `warnOnce`.
- Placeholder khớp giữa mọi catalogue.
- Bật `ui: true` trong `src/languages.ts` cho từng ngôn ngữ, **cùng commit với catalogue của nó**.

### E4-T2. Chuẩn chất lượng bản dịch

Bảy tiêu chí ở `docs/DEV-PLAN.md`, đọc nguyên văn. Ba cái đắt nhất, nhắc lại:

1. **Bám thuật ngữ chính thức của Obsidian** trong từng ngôn ngữ. Người dùng đang ở *trong* Obsidian; plugin dùng từ khác sẽ đọc như ghép từ hai phần mềm.
2. **Dịch ý, không dịch chữ.** Tiếng Nhật không viết câu bị động dài như tiếng Anh; tiếng Việt không cần chủ ngữ "bạn" ở mọi câu.
3. **Đúng độ dài cho vị trí hiển thị.** Tiếng Đức/Tây Ban Nha dài hơn tiếng Anh 20–30%; tiếng Nhật/Trung ngắn hơn nhiều. Chuỗi vượt khung là **lỗi**, không phải chuyện nhỏ — và 73 trong 122 key là nhãn setting.

**`docs/GLOSSARY.md` trước khi dịch dòng đầu tiên.** AC: mỗi locale có một lượt đọc soát riêng, ghi lại là đã soát; bản dịch không mâu thuẫn với glossary.

### E4-T3. `resolveLocale()` map được locale của Obsidian

Hiện chỉ kiểm `startsWith('vi')`. Cần bảng map rõ ràng + thứ tự fallback: **khớp chính xác → khớp theo ngôn ngữ gốc → `en`**.

Map cho tiếng Trung:

| Giá trị Obsidian | Locale plugin |
|---|---|
| `zh` | `zh-Hans` — Obsidian dùng `zh` trần cho **giản thể** |
| `zh-TW` | `zh-Hant` |
| `zh-HK`, `zh-MO`, `zh-Hant`, biến thể `zh-*` không nhận ra | `zh-Hant` |

**Bảng này đã tồn tại trong code.** `normalizeDetectedLang()` ở `src/languages.ts` cài đúng hai luật đó ở E3-T3, kèm lý do vì sao chúng ngược nhau (`CLAUDE.md` §6.4). Cân nhắc dùng lại thay vì viết bảng thứ hai — nhưng chú ý hai hàm trả về **hai thứ khác nhau**: một trả `SourceLangCode`, một trả `Locale`, và tập hợp của chúng không trùng nhau (`fr` là ngôn ngữ nguồn nhưng **không** là locale giao diện). Nếu dùng lại thì phải xử lý đúng ca đó; nếu viết riêng thì phải ghi rõ vì sao có hai bảng.

Setting `uiLanguage` do người dùng chọn tay luôn **thắng** phép tự động. Dropdown phải liệt kê **cả hai** biến thể Trung riêng biệt (`繁體中文` và `简体中文`), không gộp thành "Chinese".

### E4-T4. RTL

Ba việc ở bảng mục 6 phía trên. Đọc lại bảng đó trước khi viết dòng code đầu tiên — làm gộp ba việc thành một là cách chắc chắn nhất để nội dung tiếng Ả Rập căn phải trong khi nhãn cũng căn phải theo, ở một giao diện tiếng Anh.

---

## AC

Không tick mục nào mà chưa thực sự thử.

- [ ] Test parity 8 catalogue (key set **và** placeholder set).
- [ ] Test `resolveLocale` với **≥ 12** giá trị đầu vào, gồm cả giá trị rác.
- [ ] Test `computeCandidate` với `dir: 'rtl'`: `right-of-end` cho ra rect nằm **bên trái**.
- [ ] Test: bật `ui: true` cho một ngôn ngữ không có catalogue → **lỗi biên dịch**, không phải lỗi lúc chạy.
- [ ] `t()` với key chỉ có trong `en` → trả **chuỗi tiếng Anh**, không trả key, và vẫn `warnOnce`.
- [ ] `docs/GLOSSARY.md` tồn tại, và mỗi locale đã được soát một lượt riêng (ghi lại trong `docs/DEV-PLAN.md`).
- [ ] `npm run verify` xanh: 0 error, đúng **5** warning.
- [ ] CHANGELOG có entry trong `## [Unreleased]` — mục `Added` cho 6 giao diện mới và cho RTL.

### Ma trận test thủ công

Bắt buộc, và phải ghi kết quả vào phần *Kết quả thực hiện* của E4:

1. **Bật giao diện tiếng Ả Rập của Obsidian** → không phần tử nào của plugin bị lệch hoặc tràn; icon và popup đặt đúng bên.
2. **Giao diện tiếng Anh, dịch en → ar** → khối kết quả căn phải, nhãn và footer vẫn căn trái.
3. **Đổi `uiLanguage` bằng tay** sang từng locale trong tám locale → settings tab vẽ lại ngay, không chuỗi nào tràn khung, không chuỗi nào còn tiếng Anh.
4. **Obsidian đặt `zh`** → plugin phải ra **giản thể**; đặt `zh-TW` → **phồn thể**.
5. **Chữ Nhật / Trung / Ả Rập không ra ô vuông** trong dropdown ngôn ngữ. Đây là việc `--st-font-family` fallback của chính E4-T4.

Chép `data.json` ra chỗ khác trước khi thử.

---

## Bước cuối — cập nhật `docs/DEV-PLAN.md` và `CLAUDE.md`

Bắt buộc, không phải tuỳ chọn.

**A. `CLAUDE.md` (quy tắc R1).** E4 làm lỗi thời ít nhất bốn chỗ — **mở ra đối chiếu, đừng đoán**:

- Dòng trạng thái đầu file: số file TS, LOC, số test, số chuỗi UI. **Con số "8 × 122 = 976" ở đó là dự báo cho chính E4** — sau E4 nó phải thành số thực tế.
- §2 bản đồ tầng: bảy file catalogue mới trong `src/i18n/`.
- **Playbook 5.3 (*thêm một chuỗi UI mới*) — viết lại.** Hiện nó nói "`en.ts` trước, rồi `vi.ts`". Sau E4 là **tám** catalogue, và đó là mục có giá trị nhất của cả tài liệu sau E4.
- §6.8 (5 warning cố ý) — nếu `prefer-get-language` được xử lý thì con số 5 đổi, và phải sửa **mọi** chỗ nhắc tới nó, gồm cả `docs/SUBMISSION.md`.

**B. `docs/DEV-PLAN.md`.** Thêm vào cuối mục E4 một phần `### Kết quả thực hiện (E4)` gồm: trạng thái từng task E4-T1 → E4-T4, **ghi chép về chất lượng bản dịch** (mỗi locale đã soát chưa, thuật ngữ Obsidian tra ở đâu — đây là dữ kiện quý, không ai chép lại được), kết quả ma trận test thủ công, danh sách commit, và những gì phát hiện ra nhưng cố ý không làm. Cập nhật bảng *Tiến độ* (E4 xong, tiếp theo là E5) và mục *Việc tiếp theo*.

**C. Rà lại mọi trích dẫn `file:dòng`** trong `docs/DEV-PLAN.md` và `CLAUDE.md`. Số dòng trong `docs/CODE-REVIEW.md` và `docs/REVIEW-FINDINGS.md` là ảnh chụp `0.2.2` — **giữ nguyên**.

**D. Nếu E4 làm lộ ra điều gì khiến một epic sau phải đổi cách làm** — ví dụ RTL va vào `FloatingLayer`, hoặc `phonetic` hoá ra không đủ cho E6 — thì **báo cho tôi**, đừng tự sửa nội dung epic đó.

**E. Sau khi E4 xong: nhắc tôi mở vòng beta BRAT.** `0.4.0` **không được phát hành chính thức** cho tới khi qua ít nhất một vòng beta, vì E3 đổi schema `data.json`. Nhắc luôn ba bài học ở `CLAUDE.md` §8, đặc biệt: kiểm asset của release sau khi workflow chạy — thiếu `main.js` + `manifest.json` dưới dạng file rời là trượt cổng submit ngay tại bước đó.

---

## Bước cuối cùng — viết prompt cho epic tiếp theo

Epic tiếp theo là **E5 — 3 provider mới: Baidu / Youdao / Papago**, milestone `0.5.0`.

Viết ra file `docs/prompts/PROMPT-E5.md` một prompt để tôi dán vào phiên sau. Prompt đó phải:

- Cùng cấu trúc và cùng giọng với prompt bạn đang đọc: nhắc đọc `docs/DEV-PLAN.md` và `CLAUDE.md` trước, nêu rõ phạm vi chỉ E5, nêu ràng buộc R3.
- Cụ thể hoá đủ ràng buộc kỹ thuật của E5 và toàn bộ AC.
- Mang theo ngữ cảnh vừa học ở E3 và E4 — nhất là **playbook 5.2 của `CLAUDE.md` đã được viết lại ở E3**, và E5 phải đi theo đúng nó: mỗi provider một file `<tên>LangCodes.ts`, `supports()` gọi `supportsPair()`, và `Partial<Record<LangCode, string>>` khi provider thiếu ngôn ngữ.
- Nhắc rằng **bảng mã ngôn ngữ của Baidu, Youdao và Papago chưa được kiểm chứng**. E3 chỉ kiểm được Google và DeepL; phần Youdao xác nhận `zh-CHS` nhưng **không** xác nhận được `zh-CHT`, và một nguồn còn gợi ý Youdao gộp phồn thể vào `zh-CHS`. Chi tiết ở *Kết quả thực hiện (E3)*. **Kiểm chứng lại bằng tài liệu API tại thời điểm làm, báo lại nếu khác bảng.**
- Nhắc hai điểm dễ bị đánh giá thấp công sức: **MD5 thuần TS cho Baidu** (`crypto.subtle` không có MD5, và `isDesktopOnly: false` nên không được dùng module Node), và **quy tắc `truncate` của Youdao** (sai là **luôn** lỗi chữ ký, và thông báo lỗi không nói rõ nguyên nhân).
- Nhắc rằng README *Network use* + `docs/PRIVACY.md` + `docs/API-SETUP.md` phải cập nhật **cùng PR** — `npm run check` đối chiếu host hai chiều nên thiếu là **CI đỏ ngay**, không phải chuyện để sau.
- Có bước tự cập nhật `CLAUDE.md` + `docs/DEV-PLAN.md`, và bước viết `docs/prompts/PROMPT-E6.md`.

Nếu trong lúc làm E4 bạn phát hiện thêm quy ước, cạm bẫy, hay ràng buộc nào đáng đưa vào prompt E5 mà kế hoạch chưa liệt kê, đưa vào luôn — kèm ghi chú rằng đây là phát hiện mới, không có trong kế hoạch gốc.

---

## Đầu ra mong đợi

1. Code sửa xong E4-T1 → E4-T4, `npm run verify` xanh sau mỗi commit
2. Bảy catalogue mới, mỗi cái đã soát một lượt riêng
3. `docs/GLOSSARY.md`, viết **trước** khi dịch
4. Test mới cho parity 8 catalogue, `resolveLocale`, `computeCandidate` với `dir: 'rtl'`, và fallback của `t()`
5. Ma trận test thủ công đã chạy, kết quả ghi vào `docs/DEV-PLAN.md`
6. `CLAUDE.md` đã rà và cập nhật (R1) — **playbook 5.3 viết lại**
7. `docs/DEV-PLAN.md` đã cập nhật kết quả E4, bảng tiến độ, và mọi trích dẫn `file:dòng`
8. `docs/prompts/PROMPT-E5.md`
9. CHANGELOG có entry trong `## [Unreleased]`
