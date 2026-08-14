# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Tài liệu này viết bằng tiếng Việt vì bộ tài liệu phát triển của dự án (`docs/DEV-PLAN.md`, `docs/CONTRIBUTING.md`, `docs/SUBMISSION.md`) dùng tiếng Việt. **Mã nguồn, comment trong code, chuỗi UI tiếng Anh, CHANGELOG và README vẫn viết bằng tiếng Anh** — đừng dịch chúng.
>
> Trạng thái khi viết: sau **E3** (chưa phát hành; E3 + E4 cùng đi trong `0.4.0`, và `0.4.0` **bắt buộc qua beta BRAT** trước khi phát hành). **53 file TS** trong `src/` (7 934 LOC), **17 file test**, **332 test**, **122 chuỗi UI**, `npm run lint` = **0 error / 5 warning**.
>
> Số chuỗi UI 127 → **122** ở E3: xoá 6 key `lang.<code>` (dropdown ngôn ngữ nay hiển thị `nativeName` lấy từ registry, không qua catalogue), thêm 1 key `notice.russianRemoved`. `lang.auto` **giữ lại** — "tự nhận diện" là một chỉ dẫn, không phải tên một ngôn ngữ. **E4 phải lập kế hoạch trên 8 × 122 = 976 chuỗi**, không phải con số cũ.

---

## 1. Plugin làm gì, cho ai

Selection Translate dịch đoạn văn bản người dùng bôi đen ngay tại chỗ trong Obsidian: một icon nhỏ hiện cạnh vùng chọn, bấm vào thì popup hiện bản dịch kèm phiên âm, từ loại và các nghĩa thay thế. Nó phục vụ người đọc/ghi chú song ngữ — cặp Anh ↔ Việt vẫn là đối tượng chính, nhưng từ E3 thì **10 ngôn ngữ đều dùng được ở cả hai vai** — làm việc trong note Markdown (cả Live Preview lẫn Reading), trong PDF, trong ô properties và trong popout window. Bốn engine dịch nằm sau một giao diện chung (`google-free` mặc định vì không cần khoá, `google-cloud`, `deepl`, cộng hai nguồn từ điển), nên đổi engine là đổi một dropdown chứ không phải đổi cách dùng.

Kế hoạch phát triển đã chốt nằm ở [`docs/DEV-PLAN.md`](docs/DEV-PLAN.md) — **đọc nó trước khi làm bất kỳ epic nào**.

---

## 2. Bản đồ tầng

Chiều phụ thuộc: `selection/` → `core/` → `providers/`, và `ui/` treo trên `core/`.

> **Bất biến của dự án, tuyên bố ở [`src/types.ts:2-4`](src/types.ts#L2-L4):**
> **UI không bao giờ biết provider nào trả lời. Provider không bao giờ thấy một node DOM.**
> Mọi thứ đi qua ranh giới đó là object thuần khai báo trong `src/types.ts`.

**Bất biến này nay đã được CI ép, không còn dựa vào kỷ luật** — `no-restricted-imports` trong [`eslint.config.mjs:87-101`](eslint.config.mjs#L87-L101) (providers cấm import `ui|selection|core`) và [`:104-118`](eslint.config.mjs#L104-L118) (ui cấm import `providers`). Một import sai làm `npm run lint` đỏ ngay.

```
src/main.ts (247)          vòng đời plugin, command, ghép các khối, this.register() teardown
src/languages.ts    (279)  ⟵ mới ở E3. Registry ngôn ngữ: MỘT nơi mô tả một ngôn ngữ.
                           LANGUAGES + LanguageDescriptor + SourceLangCode/TargetLangCode
                           (suy ra từ cờ, không viết tay) + normalizeDetectedLang.
                           Không import gì — đáy đồ thị phụ thuộc, mọi tầng đọc được.

src/selection/             đọc vùng chọn từ từng bề mặt
  SelectionSource.ts       giao diện chung
  DomSelectionSource.ts · InputSelectionSource.ts · PdfSelectionSource.ts

src/core/                  logic không biết gì về hình dạng màn hình
  SelectionManager.ts (483)  sự kiện DOM, snapshot, chọn nguồn selection
  SelectionRules.ts   (117)  ⟵ tách ở E0. Bộ luật thuần, 17 test
  ContextDetector.ts         nhận diện bề mặt + containerEl (leaf) + contentEl (biên)
  StateMachine.ts            idle → icon → loading → result | error
  TranslationOrchestrator.ts token, cache, normalize
  LruCache.ts · TextNormalizer.ts

src/providers/             chỉ nhận/trả dữ liệu thuần, test được dưới Node
  TranslationProvider.ts     interface + ProviderError + toUiError
  GoogleFreeProvider.ts · GoogleCloudProvider.ts · DeepLProvider.ts
  DictionaryProvider.ts      gtx + dictionaryapi.dev
  ProviderRegistry.ts · http.ts
  googleLangCodes.ts  (30)   ⟵ tách ở E3. Mã ngôn ngữ của riêng Google (free + Cloud)
  deeplLangCodes.ts   (48)   ⟵ tách ở E3. Hai bảng: source và target (xem §6.2)

src/ui/                    tầng duy nhất được chạm DOM của popup/icon
  UiController.ts     (671)  điều phối: state machine, placement search, dismiss
  FloatingLayer.ts    (106)  ⟵ tách ở E0. Sở hữu icon + popup; mọi câu hỏi hình học.
                             applyGeometry() là cổng DUY NHẤT set vị trí/clip/visibility
  TranslatePopup.ts   (384)  vòng đời element, đo kích thước, animation grow
  PopupContent.ts     (239)  ⟵ tách ở E0. Dựng nội dung kết quả/lỗi
  TriggerIcon.ts · Positioner.ts (hình học thuần, có test) · icons.ts

src/settings/
  SettingTab.ts       (96)   chỉ còn: thứ tự section + điểm ghi settings duy nhất
  sections/                  ⟵ tách ở E0. context.ts (kiểu SectionContext),
                             language.ts, provider.ts, activation.ts, scope.ts,
                             appearance.ts, speech.ts, advanced.ts
  settings.ts        (258)   kiểu + DEFAULT_SETTINGS + SETTING_LIMITS +
                             normalizeSettings (bất biến mọi phiên bản) +
                             migrate (đổi ý nghĩa giữa các schemaVersion) — §6.13

src/i18n/                  en.ts (nguồn chân lý) · vi.ts · index.ts (t, resolveLocale)
src/tts/                   TtsService · WebSpeechEngine · GoogleTtsEngine
src/utils/                 log.ts (cổng console duy nhất) · dom.ts · scroll.ts ·
                           debounce.ts · hash.ts · text.ts
src/constants.ts · src/types.ts (170; KHÔNG còn mã ngôn ngữ — xem `languages.ts`)
```

Sơ đồ khối và máy trạng thái vẽ đầy đủ ở [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 3. Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Build lại mỗi khi sửa file, sourcemap inline |
| `npm run build` | `tsc --noEmit` rồi esbuild bản production |
| `npm test` | `vitest run` — một lượt |
| `npm run test:watch` | vitest watch |
| `npm run lint` | ESLint trên `src` và `tests` |
| `npm run check` | `scripts/check-guidelines.mjs` — guideline của Obsidian ở mức toàn repo |
| **`npm run verify`** | **build + test + lint + check. Cổng bắt buộc, phải xanh trước MỌI commit.** |

Chạy một file test: `npx vitest run tests/Positioner.test.ts` · một test: `npx vitest run -t 'clips the top edge'`.

**Bốn cổng thêm ở E0 — biết chúng tồn tại để không ngạc nhiên khi CI đỏ:**

1. **Ranh giới tầng** — `no-restricted-imports`, [`eslint.config.mjs:87-118`](eslint.config.mjs#L87-L118).
2. **i18n key-parity + placeholder-parity** — [`scripts/check-guidelines.mjs:158-187`](scripts/check-guidelines.mjs#L158-L187). Thiếu key là fail; `{ms}` viết sai ở một catalogue cũng là fail.
3. **Đối chiếu host README ↔ `src/`, hai chiều** — [`scripts/check-guidelines.mjs:198-221`](scripts/check-guidelines.mjs#L198-L221). Host mới trong code mà README chưa khai = fail; README khai host không ai gọi = cũng fail.
4. **Link chết trong `docs/`** — [`scripts/check-guidelines.mjs:225-240`](scripts/check-guidelines.mjs#L225-L240).

`npm run check` cũng chặn: `innerHTML`/`outerHTML`/`insertAdjacentHTML`, `window.app`, `console.log` ngoài `src/utils/log.ts`, hotkey mặc định cho command, màu literal ngoài khối token trong `styles.css`, và lệch version giữa `package.json` / `manifest.json` / `versions.json`.

---

## 4. Quy ước code

- **Thụt đầu dòng bằng tab** trong `.ts` (`.editorconfig`); JSON/YAML/Markdown dùng 2 space.
- **Comment giải thích *tại sao*, không giải thích *cái gì*.** Phần "cái gì" đã nằm trong code. Đây là **tài sản của dự án và là quy ước cứng**: khi dời code sang file khác, **comment đi cùng code — không viết lại, không rút gọn, không tóm tắt**. Bốn commit tái cấu trúc ở E0 đều làm đúng như vậy.
- **Chuỗi UI sentence case**, theo style guide của Obsidian. Heading trong settings không lặp tên plugin, không chứa từ "settings". Câu lỗi phải nói người dùng làm gì tiếp theo.
- **Không dựng DOM từ chuỗi markup.** `innerHTML` / `outerHTML` / `insertAdjacentHTML` bị cấm ở cả ESLint lẫn `npm run check`. Dùng `createDiv` / `createEl` / `setText`.
- **Mạng đi qua `requestWithRetry` ở [`src/providers/http.ts:20`](src/providers/http.ts#L20)** (dùng `requestUrl` của Obsidian). **Không bao giờ `fetch`** — CORS chặn DeepL, và mobile cần `requestUrl`.
- **Không gán style tĩnh trong JS.** Màu và khoảng cách nằm trong `styles.css` dưới dạng token `--st-*`; TypeScript chỉ đặt toạ độ/kích thước tính lúc chạy. Bốn custom property hình học — `--st-clip-top` / `--st-clip-right` / `--st-clip-bottom` / `--st-clip-left` — được ghi từ `setClip()` của icon và popup, và chỉ hai dòng `clip-path` trong `styles.css` đọc chúng ([`:109`](styles.css#L109), [`:198`](styles.css#L198)). Thêm cạnh thì phải sửa **cả hai** dòng. ⚠️ Xem cạm bẫy §6.5: rule lint chỉ bắt **literal**, nên "lint xanh" *không* chứng minh chỗ đó không gán style.
- **Log qua `src/utils/log.ts`** — cổng duy nhất, mặc định tắt, không bao giờ log nội dung note hay API key.
- `type` import tường minh (`consistent-type-imports`), `no-explicit-any` ở mức error.
- Commit theo Conventional Commits, scope theo epic: `fix(ui):`, `feat(hotkey):`, `refactor(lang):`, `feat(provider):`, `feat(i18n):`, `docs(i18n):`.

---

## 5. Playbook

Mỗi playbook là danh sách file **theo đúng thứ tự phải sửa**.

### 5.1. Thêm một ngôn ngữ mới

> Viết lại toàn bộ ở **E3**. Đường cũ đi qua bốn nơi (union trong `types.ts`, bảng chung `langMap.ts`, mảng dropdown, key `lang.<code>` trong mọi catalogue); nay chỉ còn **một hàng trong registry, cộng một dòng cho mỗi bảng mã provider**. Đã kiểm bằng cách thêm thật một ngôn ngữ rồi hoàn tác — xem *Kết quả thực hiện (E3)* trong `docs/DEV-PLAN.md`.

1. [`src/languages.ts`](src/languages.ts) — **một hàng** trong `LANGUAGES`. Đủ 8 trường; ba trường dễ điền sai:
   - `code`: thẻ **BCP-47**, không phải mã của provider nào. Có script subtag chỉ khi script mới là thứ phân biệt (`zh-Hant` / `zh-Hans`); ngoài ra dùng mã hai chữ cái trần.
   - `ui`: đặt `true` **chỉ khi** catalogue giao diện đã tồn tại trong `src/i18n/`. Đặt trước là dựng bẫy — dropdown ngôn ngữ giao diện sẽ mời một ngôn ngữ không có chuỗi nào phía sau.
   - `phonetic`: E6 đọc trường này để quyết định cách render (`ipa` bọc trong `/…/`, `romanization` thì không, `none` thì không render khối nào cả).

   Thứ tự trong mảng **chính là thứ tự dropdown**; `SOURCE_LANGUAGES` / `TARGET_LANGUAGES` / `UI_LANGUAGES` và cả kiểu `SourceLangCode` / `TargetLangCode` đều suy ra từ cờ, **không sửa tay**.

2. **Trình biên dịch sẽ tự liệt kê phần còn lại.** Mỗi bảng mã provider khai `Record<LangCode, string>`, nên thiếu một mã là lỗi biên dịch chỉ đúng file và đúng dòng. Chạy `npx tsc --noEmit` rồi điền:
   - [`src/providers/googleLangCodes.ts`](src/providers/googleLangCodes.ts) — **1 dòng** (free và Cloud dùng chung một bảng).
   - [`src/providers/deeplLangCodes.ts`](src/providers/deeplLangCodes.ts) — **2 dòng**, một cho `SOURCE_CODES` và một cho `TARGET_CODES`. Hai bảng riêng là cố ý, xem §6.2.

   Ngôn ngữ mà một provider **không** hỗ trợ: nếu bảng không thể để trống (kiểu `Record` bắt buộc đủ khoá), khai kiểu `Partial<Record<LangCode, string>>` cho provider đó — `supportsPair()` đọc `undefined` là "không hỗ trợ" và trả lời `unsupported-pair` **trước khi gọi mạng**.

3. `normalizeDetectedLang` trong cùng file — kiểm mã mà provider **báo về** có rơi đúng chỗ không. Mặc định là cắt region, và điều đó đủ cho hầu hết ngôn ngữ. Nhóm nào cần luật riêng thì làm như `zh` đã làm (§6.4).

4. **Không** thêm key `lang.<code>` vào catalogue. Dropdown hiển thị `nativeName` lấy thẳng từ registry — người chọn tiếng Nhật tìm 日本語, không tìm chữ "Japanese". Chỉ `lang.auto` còn đi qua i18n, vì "tự nhận diện" là chỉ dẫn chứ không phải tên ngôn ngữ. Xem `languageLabel()` ở [`src/settings/sections/language.ts`](src/settings/sections/language.ts).

5. `tests/languages.test.ts` — hai test cố ý **canh gác ma trận đã chốt** và sẽ đỏ khi thêm ngôn ngữ: `lists the agreed matrix` và `returns null for a language the plugin does not list`. Đỏ ở đó nghĩa là "ngôn ngữ này có nằm trong kế hoạch không?" — trả lời rồi mới sửa test, đừng sửa trước.

6. `README.md` + `README.vi.md` — dòng *Ten languages* trong mục Features (quy tắc R2).

7. `npm run verify`.

### 5.2. Thêm một provider mới

1. [`src/types.ts:150`](src/types.ts#L150) — thêm id vào `ProviderId`.
2. [`src/constants.ts:143-150`](src/constants.ts#L143-L150) — endpoint vào `ENDPOINTS`.
3. `src/providers/<Tên>Provider.ts` — implement `TranslationProvider` ([`src/providers/TranslationProvider.ts:135-144`](src/providers/TranslationProvider.ts#L135-L144)): `id`, `supportsDictionary`, `requiresApiKey`, `supports()`, `translate()`, `validate()`. Lỗi ném `ProviderError` với `ProviderErrorCode` — **map theo việc người dùng làm được gì, không theo HTTP status**. Mọi request qua `requestWithRetry`.
4. `src/providers/<tên>LangCodes.ts` — **file mã ngôn ngữ của riêng provider đó** (đường đi này đổi hẳn ở E3; không còn bảng chung). Mẫu ở [`googleLangCodes.ts`](src/providers/googleLangCodes.ts) (một bảng, hai vai dùng chung) và [`deeplLangCodes.ts`](src/providers/deeplLangCodes.ts) (hai bảng, một cho mỗi vai). Export một hàm khớp `LangCodeLookup` = `(code: LangCode, role: LangRole) => string | undefined`, rồi `supports()` chỉ còn một dòng: `return supportsPair(to<Tên>Code, source, target)`.
   - Provider **không phủ hết** registry — đây là ca bình thường ở E5, ví dụ Papago không có tiếng Ả Rập — thì khai `Partial<Record<LangCode, string>>` và bỏ trống hàng đó. `supportsPair` biến `undefined` thành `unsupported-pair` **không tốn một request nào**.
   - **Kiểm chứng bảng mã bằng tài liệu API tại thời điểm làm, đừng chép từ kế hoạch.** Bảng trong E3-T2 của `docs/DEV-PLAN.md` dựng từ tài liệu lúc lập kế hoạch; phần đã kiểm và phần chưa kiểm ghi trong *Kết quả thực hiện (E3)*.
5. [`src/providers/ProviderRegistry.ts:26-30`](src/providers/ProviderRegistry.ts#L26-L30) — thêm vào `this.translators`. Khoá API đọc qua **getter**, không truyền giá trị vào constructor, để đổi khoá có hiệu lực ngay.
6. `src/settings/settings.ts` — trường `<tên>ApiKey` trong `SelectionTranslateSettings` + `DEFAULT_SETTINGS`.
7. [`src/settings/sections/provider.ts:19`](src/settings/sections/provider.ts#L19) — thêm id vào mảng dropdown, rồi một khối `addApiKeyField(...)` như DeepL/Google Cloud.
8. `src/i18n/en.ts` rồi `vi.ts` — `provider.<id>`, `settings.<tên>Key`, `settings.<tên>KeyDesc`.
9. **Bộ fixture tối thiểu** trong `tests/fixtures/` + `tests/<Tên>Provider.test.ts`. Bốn fixture, đúng mẫu đang có cho DeepL (`deepl-ok.json`, `deepl-403.json`, `deepl-456.json`, `deepl-usage.json`) và cho gtx (`gtx-malformed.json`):
   - response thành công · lỗi xác thực · lỗi hết hạn mức/quota · body dị dạng.
   - Fixture cho endpoint không có tài liệu (kiểu gtx) phải là **bản chụp thật**, không viết tay.
   - Fixture **không bao giờ** chứa khoá thật; dùng khoá hình dạng giả như `tests/DeepLProvider.test.ts` đang làm.
10. **Cùng PR** (nếu không sẽ đỏ CI và trượt review): bảng *Network use* ở `README.md` **và** `README.vi.md`, `docs/PRIVACY.md`, `docs/API-SETUP.md`.
11. `npm run verify`.

### 5.3. Thêm một chuỗi UI mới

1. `src/i18n/en.ts` **trước** — đây là bản chuẩn; `vi.ts` khai `satisfies Messages` nên thiếu key là lỗi biên dịch.
2. `src/i18n/vi.ts` — đủ dấu tiếng Việt, không viết "cai dat".
3. Nơi dùng: `t('key')` hoặc `t('key', { vars })`. Placeholder dạng `{name}` phải **trùng tên** giữa mọi catalogue.
4. `npm test` (parity trong `tests/i18n.test.ts`) và `npm run check` (parity key + placeholder).

Chuỗi lỗi của provider đi bằng **key**, không đi bằng câu — tầng provider không được import catalogue.

### 5.4. Thêm một setting mới

> Mục này **không có trong đặc tả gốc của E8**; đường đi đã đổi ở E0 khi `SettingTab.ts` tách thành `sections/`.

1. [`src/settings/settings.ts`](src/settings/settings.ts) — trường trong `SelectionTranslateSettings` (nhóm theo comment `/* Languages */`, `/* Activation */`…) và giá trị trong `DEFAULT_SETTINGS`. Nếu là số: thêm `SETTING_LIMITS` + một lời gọi `clamp` trong `normalizeSettings()`.

   **Thêm một setting mới KHÔNG cần tăng `SETTINGS_SCHEMA_VERSION`.** Giá trị vắng mặt đã được lấp bằng `DEFAULT_SETTINGS` ở `normalizeSettings()`, không ai mất gì. Chỉ tăng khi một giá trị **đã lưu** đổi nghĩa hoặc bị gỡ — và khi ấy phải viết một nhánh `if (from < N)` trong `migrate()`. Ranh giới giữa hai hàm ở §6.13.
2. `src/settings/sections/<đúng section>.ts` — vẽ control. **Chỉ ghi qua `ctx.save(key, value)`**; không chạm `plugin.settings` trực tiếp. Cần vẽ lại cả tab (control này quyết định control khác có tồn tại không) thì gọi `ctx.redisplay()`. `ctx.app` có sẵn từ E2 cho hai việc chính đáng — đọc thứ Obsidian đã gắn, và mở một pane của chính Obsidian — **không** phải đường vòng để ghi settings.

   | Section | Giữ setting nào |
   |---|---|
   | `language.ts` | `sourceLang`, `targetLang`, `uiLanguage` |
   | `provider.ts` | `provider`, `deeplApiKey`, `googleCloudApiKey`, `dictionaryEnrichment`, `dictionarySource` |
   | `activation.ts` | `autoPopupOnSelection`, `translateOnDoubleClick`, `min/maxSelectionLength`, `iconPlacement`, `iconOffset` (cộng một dòng trỏ sang trang Hotkeys, không phải setting) |
   | `scope.ts` | `enableInReading/Editing/Properties/Pdf`, `pdfSelectionFallback` |
   | `appearance.ts` | `fontSize`, `fontFamily`, `popupTheme` |
   | `speech.ts` | `ttsEngine`, `ttsRate` |
   | `advanced.ts` | `cacheSize`, `stripMarkdown`, `debugLog`, nút reset |

3. `src/i18n/en.ts` + `src/i18n/vi.ts` — `settings.<tên>` và `settings.<tên>Desc`.
4. Nơi đọc setting (orchestrator / UI / provider). Nếu giá trị ảnh hưởng CSS thì đi qua `applyCssVariables` ở `src/utils/dom.ts`.
5. `tests/settings.test.ts` nếu có clamp hoặc migration.
6. `README.md` + `README.vi.md` nếu bảng setting có liệt kê (quy tắc R2), rồi `npm run verify`.

`SettingTab.ts` **không** phải sửa: nó chỉ quyết định thứ tự section và là điểm ghi settings duy nhất.

---

## 6. Cạm bẫy đã biết

### Bốn cái từ đặc tả gốc

**6.1. Selection snapshot phải chụp *trước* khi click.** Bấm vào icon làm collapse selection trước khi handler chạy, nên mọi thứ đọc từ `getSelection()` lúc click đã mất. Mọi consumer làm việc trên `SelectionSnapshot` — lý do ghi đầy đủ ở [`src/types.ts:49-57`](src/types.ts#L49-L57).

**6.2. DeepL: `EN` là source, `EN-US` là target — và `ZH` là source, `ZH-HANS`/`ZH-HANT` là target.** Mã mang subtag vùng **hoặc** subtag script được chấp nhận làm *target* nhưng bị từ chối làm *source*. Vì thế [`src/providers/deeplLangCodes.ts`](src/providers/deeplLangCodes.ts) có **hai bảng riêng**, `SOURCE_CODES` và `TARGET_CODES`, và `toDeepLCode(code, role)` chọn bảng theo vai. **Gộp một bảng là hỏng.**

Ở E3 việc tách bảng theo provider làm chỗ này *dễ* hơn chứ không mất đi: chỉ file của DeepL biết DeepL kỳ quặc, phần còn lại của code chỉ thấy một `LangCodeLookup` giống mọi provider khác. Tiếng Trung là ca thứ hai của cùng một luật, và là ca mới — cả hai mã target đã được kiểm chứng lại với tài liệu DeepL vào tháng 8/2026, khớp kế hoạch.

**6.3. Vị trí, clip và visibility là **một** câu trả lời, và đã gộp xong ở E1-T2.** Cổng duy nhất là [`FloatingLayer.applyGeometry(target, rect, snapshot)`](src/ui/FloatingLayer.ts#L94) — nó làm cả ba việc, theo đúng thứ tự đó. **Không nơi nào ngoài `FloatingLayer` được set vị trí, clip hay visibility của icon/popup.** Hai hệ quả cho người viết code sau:

- `TriggerIcon.show(win)` **không nhận rect** — nó chỉ dựng element và bắt đầu animation; controller gọi `applyGeometry` ngay sau đó.
- `PopupHandlers.place(size)` trả về **`void`**, không trả rect. Popup biết kích thước của nó, không bao giờ biết vị trí. Nhánh popup phình theo nội dung là nhánh dễ quên nhất: rect đổi thì clip cũ lập tức sai, nên mọi `applySize` phải kèm một lời gọi `place`.

**6.4. `normalizeDetectedLang` giữ script subtag của `zh`, và cắt region của mọi ngôn ngữ khác. Đây là luật, đừng phá.** Sửa xong ở **E3-T3**; trước đó nó cắt tại `-`/`_` nên `zh-TW` và `zh-CN` cùng ra `zh`, và đó là điều kiện chặn khiến tính năng tiếng Trung không thể đúng.

Vì sao `zh` khác mọi ngôn ngữ khác: với `en-GB` hay `it-IT`, phần bị cắt chỉ là biến thể vùng của **cùng một thứ chữ**, nên cắt đi không mất gì. Với `zh`, phần đuôi là **thứ duy nhất** phân biệt giản thể và phồn thể — hai bộ chữ và hai hệ thuật ngữ khác nhau (軟體/软件, 網路/网络, 設定/设置). Cắt nó đi là vứt bỏ chính thông tin cần dùng.

Luật hiện hành, trong [`src/languages.ts`](src/languages.ts) (`CHINESE_SCRIPTS`, `CHINESE_REGIONS`, `resolveChinese`):

| Đầu vào | Ra | Vì sao |
|---|---|---|
| `zh-Hans`, `zh-CN`, `zh-SG` | `zh-Hans` | script thắng region, rồi tới region |
| `zh-Hant`, `zh-TW`, `zh-HK`, `zh-MO` | `zh-Hant` | như trên |
| `zh` **trần** | `zh-Hans` | quy ước của **Obsidian** — nó dùng `zh` trần cho giản thể (E4-T3) |
| `zh-*` **không nhận ra** | `zh-Hant` | phồn thể là bản Trung chuẩn của dự án |

**Hai dòng cuối ngược nhau, và cố ý.** `zh` trần đi theo Obsidian vì mục đích là *đồng ý với ứng dụng đang chứa plugin*; `zh-XX` lạ đi theo mặc định của dự án. **Đừng gộp hai luật thành một** — chúng trả lời hai câu hỏi khác nhau. `zh-Hant-CN` ra `zh-Hant`: script quyết định thứ chữ được sinh ra, không phải region.

### Bốn cái mới — **phát hiện từ E0, không có trong kế hoạch gốc**

**6.5. `obsidianmd/no-static-styles-assignment` chỉ bắt giá trị *literal*.** `el.style.left = \`${x}px\`` (template literal có expression) **không** bị bắt; `el.style.height = 'auto'` thì bị. Hai hệ quả: (a) lint xanh **không** nghĩa là không có chỗ nào gán style; (b) **đừng** đi chuyển toạ độ runtime sang CSS custom property vì tưởng nó vi phạm — 21 vị trí `.style.*` hiện tại đều hợp lệ. Bằng chứng đầy đủ ở [`docs/REVIEW-FINDINGS.md` §H2](docs/REVIEW-FINDINGS.md).

**6.6. `registerDomEvent` không dùng được cho listener theo phiên.** Obsidian chỉ giải phóng chúng khi **toàn bộ plugin** unload, nên một phiên mở/đóng popout nhiều lần sẽ tích luỹ đăng ký trên document đã chết. `SelectionManager` **cố ý** tự `addEventListener`, tự track teardown, và gắn vào `this.register()` trong [`main.ts:92`](src/main.ts#L92) — lý do ghi tại [`src/core/SelectionManager.ts:152-158`](src/core/SelectionManager.ts#L152-L158). **Đừng "sửa" chỗ này.**

**6.7. `/code-review` review *diff*, không review thư mục.** Nhánh sạch thì nó lấy commit cuối làm phạm vi — ở E0 nó phủ đúng một commit thay vì 42 file. Muốn phủ rộng phải chỉ định phạm vi rõ ràng hoặc tự đọc code.

**6.8. 5 warning lint còn lại là cố ý.** Bốn nhóm, ghi ở [`docs/SUBMISSION.md`](docs/SUBMISSION.md) mục *TODO: những cảnh báo còn treo*. Ba nhóm là API mới hơn `minAppVersion: 1.5.0` (`prefer-setting-definitions` + `display` deprecated, `setWarning` deprecated, `prefer-get-language`); nhóm thứ tư là `no-global-this` trong `src/utils/debounce.ts:22`, có lý do kỹ thuật riêng (`globalThis` là mặc định của `TimerHost`, unit test chạy dưới `environment: 'node'`). **Đừng "dọn" chúng** — gọi `setDestructive()` ở 1.5.0 sẽ ném lỗi ngay lúc dựng pane tuỳ chọn. Ngưỡng đúng: `npm run lint` = **0 error**; số warning là **5**.

### Hai cái mới — **phát hiện từ E1, không có trong kế hoạch gốc**

**6.9. `containerEl` và `contentEl` là hai thứ khác nhau, đừng dùng lẫn.** `containerEl` = `.workspace-leaf-content`, dùng để **nhận diện leaf và tìm scroller**. `contentEl` = phần chứa nội dung, và là thứ **duy nhất** được dùng làm biên đặt vị trí + biên cắt. Bảng map ở [`src/core/ContextDetector.ts`](src/core/ContextDetector.ts) (`CONTENT_SELECTORS`): leaf → `.view-content`, note nhúng → `.markdown-embed-content`, hover preview → `.hover-popover`. Lý do tồn tại: `.workspace-leaf-content` **bao gồm cả `.view-header`**, nên đo biên từ nó thì popup vẽ đè lên hàng nút back/tiêu đề mà không bị coi là thừa — chính là lỗi E1 sửa. PDF là ca duy nhất phải trừ thêm: `.pdf-toolbar` nằm **bên trong** `.view-content`, nên [`FloatingLayer.contentRect()`](src/ui/FloatingLayer.ts#L55) cắt phần trên bằng `trimTop()`.

**6.10. `clipInsets(rect, null)` cắt sạch, không trả `{0,0}`.** Trước E1 nó trả 0 và chỉ an toàn nhờ `isRectVisible(rect, null)` luôn ẩn element trong cùng ca đó — hai nửa che cho nhau. Nay mỗi nửa tự đúng. Lưu ý kỹ thuật: nó trả `top = rect.height` và để `bottom = 0`, **cố ý không** cho hai inset chồng nhau, vì `inset()` với các cạnh chồng nhau không phải hình dạng mà mọi trình duyệt bắt buộc phải đồng ý với nhau.

### Hai cái mới — **phát hiện từ E2, không có trong kế hoạch gốc**

**6.11. Plugin KHÔNG có phím tắt của riêng nó nữa — và đừng thêm lại.** E2 thử phương án B của kế hoạch (giữ trigger key, chuyển sang `Scope`), chạy thử trên vault thật rồi **chủ dự án bác bỏ**: một phím chỉ sống vài giây vẫn là một phím giữ trên bàn phím của người đang soạn thảo, và phím trơn thì gõ chữ vào note. Kết luận cuối là **phương án A**: xoá hẳn. Đường duy nhất từ bàn phím là command `translate-selection` + trang Hotkeys của Obsidian. `core/HotkeyManager.ts`, `settings/HotkeyRecorder.ts` và trường `triggerHotkey` **đã bị xoá**; `normalizeSettings()` gỡ trường cũ khỏi dữ liệu người dùng. Mục *Cách kích hoạt* trong settings chỉ còn một dòng trỏ sang trang Hotkeys.

**6.12. `Scope` phải có cha, và callback phải trả `undefined` để nhả phím.** Hai luật này của Obsidian không có trong tài liệu, đọc ra từ `app.js` trong `obsidian-1.13.6.asar`, và **cả hai đã gây một bug thật**:

- `Scope.handleKey` dừng ngay khi handler khớp trả về **bất kỳ giá trị nào khác `undefined`**. Trả `true` để "cho phím đi tiếp" là nuốt phím y như `false`, chỉ khác là không `preventDefault`.
- `handleKey` chỉ lên **scope cha** khi không handler nào trả lời, và Obsidian đăng ký chính bộ hotkey của nó bằng `app.scope.register(null, null, …)`. Nên `new Scope()` **không cha** sẽ chặn mọi phím tắt của Obsidian trong lúc nó active.

Đó đúng là lý do command palette chết trong lúc popup mở. [`TranslatePopup.claimScope()`](src/ui/TranslatePopup.ts) nay dựng `new Scope(this.app.scope)` và trả `undefined` thay vì `true`. **Bất kỳ `Scope` nào thêm sau này phải làm y hệt.**

Ghi thêm, vì có ngày sẽ cần: `pushScope` đẩy vào stack riêng của `activeWindow` (`WeakMap<Window, …>`), nên popout có stack riêng và không cần xử lý đặc biệt. Và cách lấy dữ kiện: `AppData/Roaming/obsidian/obsidian-<version>.asar` là asar chuẩn — 4 byte ở offset 12 cho kích thước header JSON, header từ byte 16, dữ liệu ngay sau. Giải nén `app.js` rồi grep.

### Hai cái mới — **phát hiện từ E3, không có trong kế hoạch gốc**

**6.13. `migrate()` và `normalizeSettings()` chia việc theo một ranh giới cứng. Thêm luật vào nhầm bên là bug chỉ hiện ra trên vault của người khác.** Cả hai ở [`src/settings/settings.ts`](src/settings/settings.ts):

| | `normalizeSettings()` | `migrate()` |
|---|---|---|
| Trả lời | cái gì đúng với **mọi** phiên bản | cái gì **đổi nghĩa** giữa hai schema |
| Ví dụ | clamp số, giá trị lạ rơi về mặc định, ngôn ngữ không có trong registry rơi về mặc định | `sourceLang: 'ru'` → `'auto'` |
| Chạy khi nào | **mọi** lần load | một lần cho mỗi `schemaVersion` |
| Được nói với người dùng không | **không bao giờ** | **đây là nơi duy nhất** được sinh `Notice` |

Hệ quả thực hành: **giá trị rác không phải việc của `migrate()`.** Một `data.json` bị sửa tay chứa `sourceLang: 42` không cần một luật migration nào — `normalizeSettings` đã lo, im lặng, ở mọi phiên bản.

Và một điều **không được quên**: `migrate()` không tự lưu. `main.ts:loadSettings()` phải gọi `saveData` ngay khi `outcome.changed` — `schemaVersion` đã ghi xuống đĩa là **thứ duy nhất** ngăn migration, và cái `Notice` của nó, chạy lại ở lần khởi động sau.

Còn cache LRU thì **không cần invalidate**, dù khoá cache có chứa mã ngôn ngữ. Nó dựng mới trong constructor của `TranslationOrchestrator` ở mỗi lần `onload`, hoàn toàn trong bộ nhớ, không ghi đĩa — không khoá nào sống qua được lần đổi schema. Kế hoạch E3-T5 có nhắc "invalidate cache khi `schemaVersion` tăng"; đã kiểm và **không viết code cho vấn đề không tồn tại**.

**6.14. Bảng mã ngôn ngữ của provider phải khai `Record<LangCode, string>`, không phải `Partial<…>`, trừ khi provider thật sự thiếu ngôn ngữ.** Đây là thứ làm cho playbook 5.1 rẻ như hiện nay: thêm một hàng vào registry thì **trình biên dịch tự liệt kê** từng bảng còn thiếu mã, kèm đúng file và đúng dòng. Đổi sang `Partial` "cho tiện" là vứt bỏ đúng cái lưới an toàn đó, và ngôn ngữ mới sẽ lặng lẽ trở thành "không hỗ trợ" ở provider đó thay vì báo lỗi lúc build.

Chỉ dùng `Partial<Record<LangCode, string>>` khi provider **thật sự** không có ngôn ngữ nào đó — ca của E5, ví dụ Papago không có tiếng Ả Rập. Khi ấy thiếu mã là câu trả lời đúng, và `supportsPair()` biến nó thành `unsupported-pair` **trước khi gọi mạng**.

---

## 7. File không sửa tay

| File | Vì sao | Sửa thế nào |
|---|---|---|
| `versions.json` | `version-bump.mjs` ghi | `npm version <patch\|minor\|major>` |
| Trường `version` trong `manifest.json` | như trên; `npm run check` fail nếu lệch `package.json` | như trên |
| `package-lock.json` | npm quản lý | `npm install` |
| `main.js` ở root | Sản phẩm build | `npm run build` |

Script `version` trong `package.json` chạy `version-bump.mjs` rồi tự `git add manifest.json versions.json package.json`.

---

## 8. Quy trình release + checklist submit

Bản đầy đủ: [`docs/SUBMISSION.md`](docs/SUBMISSION.md). Tóm tắt phần phải nhớ:

**Phát hành**

```bash
npm run verify          # phải xanh trước
npm version patch       # đồng bộ package.json + manifest.json + versions.json
git push && git push --tags
```

`.github/workflows/release.yml` tự đối chiếu tag với `manifest.version`, build, và đính **ba asset rời** `main.js`, `manifest.json`, `styles.css`. Ràng buộc không thương lượng: tag **không có tiền tố `v`**; **không** zip; release **không** draft, **không** prerelease. Workflow chết thì chạy lại từ tab Actions với ô `tag` — nó nhận lấy release đã tồn tại và ghi đè asset bằng `--clobber`.

**SemVer trong dự án này:** sửa lỗi không đổi hành vi công khai → PATCH; thêm tính năng → MINOR; phá vỡ tương thích ở giai đoạn `0.x` → **dồn vào MINOR**. Tái cấu trúc thuần tuý là PATCH dù số dòng đổi rất lớn.

**Ba bài học từ điều tra E0 — đây là lý do lần submit trước trượt:**

1. **Nguyên nhân thật là H3: release `0.1.1` có 0 asset.** Cổng submit bắt buộc `main.js` + `manifest.json` dưới dạng asset rời; thiếu là **trượt ngay tại bước đó**, trước mọi câu hỏi về code. Kiểm asset của release trước khi nộp, đừng giả định workflow đã chạy xong.
2. **Nguyên nhân thứ hai, độc lập:** CI của repo khi đó chưa cài `eslint-plugin-obsidianmd` và dùng preset TypeScript không type-aware, nên một batch finding **lọt qua `npm run lint` sạch**. Cả hai đã sửa; đó là lý do `eslint.config.mjs` hôm nay dùng `recommendedTypeChecked` và nạp `obsidianmd.configs.recommended`. Đừng hạ hai thứ đó xuống.
3. **Cổng submit đọc hai nơi khác nhau:** `manifest.json` ở **HEAD của nhánh mặc định**, còn file build ở **release**. Tăng version mà quên tạo release — hoặc ngược lại — là trượt.

**Và:** mỗi vòng sửa sau khi bị báo lỗi là một **version mới**, không phải một push mới. Vì vậy `npm run verify` phải sạch **trước khi** nộp; đừng dùng cổng submit làm nơi kiểm bài.

**Còn hở trước lần submit tiếp theo** (đều nằm ngoài code, cần chủ dự án tự làm): test trên Windows / macOS / Linux / Mobile; thêm 4 topic GitHub còn thiếu; sửa description repo trên GitHub.

---

## Ba quy tắc vận hành

> **R1 — Tự kiểm sau mỗi task.** Kết thúc một task, phải đọc lại `CLAUDE.md` và đối chiếu với trạng thái thực tế của dự án. Nếu có mục nào đã lỗi thời (đường dẫn file đổi, quy ước đổi, playbook thiếu bước), sửa ngay trong cùng task đó. `CLAUDE.md` sai còn tệ hơn `CLAUDE.md` không có.

> **R2 — Tài liệu đi cùng code.** Kết thúc một task, rà `README.md` và `docs/**` xem còn mô tả đúng dự án không. Cụ thể phải kiểm: danh sách host mạng, danh sách provider, danh sách ngôn ngữ, danh sách setting, ảnh chụp màn hình. Không để tài liệu trôi khỏi code rồi dồn vào E7.

> **R3 — Không tự ý lệch kế hoạch.** Trong quá trình thực hiện, nếu phát hiện cần làm khác với tài liệu này — đổi cách tiếp cận, thêm/bớt phạm vi, đổi thư viện, đổi cấu trúc thư mục, phát hiện kế hoạch sai — thì **dừng lại và hỏi trước**. Chỉ làm sau khi được đồng ý. Áp dụng cả với thay đổi trông có vẻ nhỏ và hiển nhiên đúng.

Cập nhật `CLAUDE.md` là một phần **Definition of Done** của mọi epic. DoD đầy đủ ở cuối [`docs/DEV-PLAN.md`](docs/DEV-PLAN.md).
