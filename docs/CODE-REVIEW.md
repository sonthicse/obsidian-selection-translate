# Code review — E0-T3

Ngày: **2026-08-12**. Trạng thái: `main` @ `777e281`, version `0.2.2`, 42 file TS trong `src/` (7 331 LOC), 16 file test, 296 test xanh, `npm run lint` **0 error / 8 warning**.

---

## Cách review này được thực hiện

Hai lớp, vì một mình lệnh `/code-review` không phủ được yêu cầu của kế hoạch.

**Lớp 1 — `/code-review src/ high`.** Cần nói thẳng một hạn chế: lệnh này review **diff**, không review toàn bộ cây thư mục. Vì nhánh `main` sạch và không có thay đổi chưa release nào trong `src/`, nó đã chọn commit `97ea9f3` — thay đổi `src/` gần nhất — làm phạm vi. Kết quả vì thế phủ đúng một commit, không phủ 42 file. Nó tìm được **1 issue thật** (mục #1 bên dưới), và loại trừ tường minh 4 nghi vấn khác trong cùng vùng code.

**Lớp 2 — audit thủ công toàn bộ `src/`.** Đây chính là phần kế hoạch mô tả: *"Lệnh này sinh ra danh sách thô; việc phân loại và quyết định phạm vi là phần người làm."* Toàn bộ 5 trục dưới đây được kiểm bằng đọc mã và bằng lệnh kiểm chứng được, không dựa vào đầu ra của lệnh.

---

## Trục 1 — Đồng bộ

| Hạng mục | Kết luận |
|---|---|
| Quy ước đặt tên | **Nhất quán.** Class `PascalCase`, hàm thuần `camelCase`, hằng số `SCREAMING_SNAKE`. File đặt theo thứ nó export. |
| `ProviderError` ở cả 3 provider | **Nhất quán.** Cả ba ném `ProviderError` với `code` + `httpStatus`; `toUiError()` là điểm chuyển duy nhất sang `UiErrorInfo`. |
| Logging qua `utils/log.ts` | **Là cổng duy nhất, có kiểm tự động.** `scripts/check-guidelines.mjs` fail nếu `console.log` xuất hiện ngoài `src/utils/log.ts`, và `eslint.config.mjs` tắt rule đúng một chỗ qua config chứ không qua `eslint-disable` inline — có lý do ghi trong comment: Obsidian từ chối submission tự tắt rule từ trong mã nguồn. |
| Khai báo settings | **Nhất quán.** Mọi field đi qua `SelectionTranslateSettings` → `DEFAULT_SETTINGS` → `normalizeSettings()`. `SettingTab.save()` là điểm ghi duy nhất. |

**Không có issue nào ở trục này.**

## Trục 2 — Ranh giới tầng

Bất biến tuyên bố ở `src/types.ts:2-4`: *"the UI never learns which provider answered, and no provider ever sees a DOM node."*

Kiểm bằng grep import chéo — **cả hai chiều đều đang được giữ đúng**:

```
providers/ → ui|selection|core :  0 import   ✅ provider không thấy DOM
ui/        → providers/        :  0 import   ✅ UI không biết provider nào trả lời
```

Chiều phụ thuộc thực tế: `core → providers` (4, orchestrator — đúng vai trò), `ui → core|settings|utils`, `providers → utils|settings` (chỉ type).

**Vấn đề:** ranh giới này hiện chỉ được giữ bằng **kỷ luật**. Không có gì trong CI ngăn một import sai. Kế hoạch đã chỉ đúng cách xử lý — ESLint `no-restricted-imports` — và đó là mục **E0-T4**, không phải một issue riêng.

## Trục 3 — File quá lớn / trách nhiệm chồng

Bảng LOC hiện tại **khớp chính xác** kế hoạch:

| File | LOC | Đánh giá độc lập |
|---|---|---|
| `ui/UiController.ts` | 707 | Xác nhận. Ôm 6 trách nhiệm: render từ state machine, đặt vị trí, clip, occlusion, anchored-scroll, chuyển tiếp wheel. |
| `ui/TranslatePopup.ts` | 569 | Xác nhận. Ba nhóm rõ rệt: vòng đời element, đo–grow–resize, dựng nội dung. Ranh giới đã có sẵn dưới dạng comment chia mục. |
| `core/SelectionManager.ts` | 504 | Xác nhận, nhưng **cấu trúc tốt hơn hai file trên**: `capture()` đã là một hàm gần thuần, chỉ thiếu một bước tách để test được. |
| `settings/SettingTab.ts` | 460 | Xác nhận. Đã **có sẵn ranh giới**: 7 method `addLanguages/addEngine/addActivation/addScope/addAppearance/addSpeech/addAdvanced`. Tách ra file là việc cơ học. |

## Trục 4 — Tính năng cũ / dead code

**Bốn setting mà kế hoạch yêu cầu kiểm cụ thể — tất cả đều còn sống, có UI và có đường đọc thật:**

| Setting | UI | Nơi đọc | Test |
|---|---|---|---|
| `stripMarkdown` | `SettingTab.ts:415` | `TranslationOrchestrator.ts:55` → `TextNormalizer.ts:18` | ✅ `TextNormalizer.test.ts` |
| `pdfSelectionFallback` | `SettingTab.ts:322` | `SelectionManager.ts:398` | ❌ |
| `popupTheme` | `SettingTab.ts:357` | `TranslatePopup.ts:202,318`, `UiController.ts:107` | ❌ |
| `dictionarySource` | `SettingTab.ts:163` | `ProviderRegistry.ts:56,59` | ✅ gián tiếp |

**Hằng số không tham chiếu:** không có. Mọi `export const` trong `constants.ts` đều có nơi dùng.

**Dead code thực sự tìm được** — 4 phương thức public không nơi nào gọi và 2 key i18n mồ côi (chi tiết ở issue #2, #3).

## Trục 5 — Khả năng sửa lỗi

Kế hoạch nói *"2 240 dòng nặng nhất không được cover"*. **Xác nhận:** không có `tests/UiController.test.ts`, `SelectionManager.test.ts`, `TranslatePopup.test.ts`, `SettingTab.test.ts`.

Nhưng bức tranh không xấu như con số gợi ý — phần **logic thuần** đã được tách sẵn và **đã có test**:

| Đã tách, đã test | Test |
|---|---|
| `ui/Positioner.ts` (247) — toàn bộ hình học | `Positioner.test.ts` |
| `utils/scroll.ts` (138) — luật cuộn | `scroll.test.ts` |
| `core/StateMachine.ts` (145) | `StateMachine.test.ts` |
| `core/TextNormalizer.ts`, `LruCache.ts`, `utils/hash.ts`, `HotkeyManager.ts` | đủ cả |

Nói cách khác, 2 240 dòng chưa cover là phần **chạm DOM** — mà kế hoạch cũng nói rõ *"phần chạm DOM thì không ép"*. Việc còn lại là kéo nốt phần logic thuần **còn sót** ra khỏi lớp DOM: bộ luật lọc trong `SelectionManager.capture()`, và bảng tra label trong `TranslatePopup`.

---

## Quyết định — trả lời 3 câu của kế hoạch

### 1. Có cần tái cấu trúc không?

**Có**, nhưng **hẹp hơn** ấn tượng ban đầu, và không vì lý do chất lượng.

Cần nói rõ điều này để tránh hiểu sai: code hiện tại **không tệ**. Nó vượt xa mức trung bình của plugin cộng đồng — ranh giới tầng được giữ, logic hình học đã thuần và đã test, comment giải thích *tại sao* rất dày và rất đúng chỗ, mọi listener đều có teardown, mọi lỗi đều có đường đi tiếp cho người dùng. Nếu không có E1–E6 phía trước thì lý do hợp lý để tái cấu trúc gần như bằng không.

Lý do thật sự để làm bây giờ là **chi phí sửa hai lần**: E1 phải sửa đúng đường đi hình học trong `UiController`, E5 phải thêm 3 provider vào `SettingTab`, E6 phải sửa đúng khối render phiên âm trong `TranslatePopup`. Tách trước = mỗi epic đó chạm vào một file nhỏ có ranh giới rõ, thay vì chen thêm vào một file 700 dòng.

**Phạm vi tối thiểu: 3 file.** Đúng ba file mà kế hoạch đánh dấu "bắt buộc trước E1/E5/E6".

### 2. Bao nhiêu là đủ để E1–E6 không phải làm lại?

| File | Việc | Chặn epic nào |
|---|---|---|
| `ui/UiController.ts` | Tách `FloatingLayer` (show/hide/clip/geometry) khỏi phần điều phối | **E1** |
| `ui/TranslatePopup.ts` | Tách `PopupContent` (dựng nội dung kết quả/lỗi) | **E6** |
| `settings/SettingTab.ts` | Tách `sections/*.ts` | **E5** |

Cộng thêm hai việc nhỏ **không phải tách file** nhưng thuộc cùng phạm vi: dọn dead code (#2, #3) và thêm cổng CI (E0-T4).

### 3. Cái gì để nguyên?

Ghi rõ để tránh refactor tràn lan — **không động vào**:

- **`ui/Positioner.ts`** — đã thuần, đã test, đã là đúng thứ mà việc tách hướng tới. Chạm vào là đi lùi.
- **`core/StateMachine.ts`** — 145 dòng, một trách nhiệm, test đầy đủ.
- **`core/HotkeyManager.ts`** — kế hoạch E2 nói thẳng *"đây là phần đã viết tốt, chỉ đổi cách gắn vào nền tảng"*. Để nguyên cho E2.
- **`providers/**`** — ranh giới đúng, fixture đủ, `ProviderError` nhất quán. E5 sẽ **thêm** file, không sửa file cũ.
- **`core/SelectionManager.ts`** — kế hoạch xếp "cân nhắc, không bắt buộc", và audit này đồng ý: nó lớn nhưng có cấu trúc, và không epic nào sắp tới chặn ở đây. **Không tách trong E0.**
- **`utils/**`, `tts/**`, `selection/**`, `i18n/**`** — không có vấn đề nào tìm được.
- **Toàn bộ comment giải thích *tại sao*** — tài sản của repo. Khi dời code, comment đi cùng code, không viết lại, không rút gọn.

---

## Danh sách issue

11 issue. Không issue nào là lỗi nghiêm trọng; phần lớn là chuẩn bị cho các epic sau.

| # | Issue | Vị trí | Nhãn | Lý do (một câu) |
|---|---|---|---|---|
| 1 | `normalizeWheelDelta` nhân `deltaX` với **chiều cao** trang thay vì chiều rộng ở chế độ `DOM_DELTA_PAGE` | `utils/scroll.ts:60-69` | `nice-to-have` | Lỗi đơn vị thật nhưng chỉ chạm tới ở ca cực hiếm (wheel ngang, chế độ page), và sửa nó là **đổi hành vi** — thứ bản PATCH này không được làm mà không hỏi. |
| 2 | 4 phương thức public không nơi nào gọi: `TriggerIcon.getElement()`, `TranslatePopup.isOpen()`, `TranslatePopup.contains()`, `TranslationOrchestrator.clearCache()` | `TriggerIcon.ts:114`, `TranslatePopup.ts:78,83`, `TranslationOrchestrator.ts:114` | `must-fix-in-E0` | Dead code không đổi hành vi khi xoá, và mỗi cái là một API giả mà epic sau có thể tưởng là đường đi có sẵn. |
| 3 | 2 key i18n mồ côi: `popup.otherMeanings`, `settings.recordHotkey` | `i18n/en.ts:24,94` · `i18n/vi.ts:21,84` | `must-fix-in-E0` | E4 nhân mỗi key lên 8 locale, nên 2 key chết bây giờ là 16 chuỗi dịch vô ích sau này. |
| 4 | `UiController` ôm 6 trách nhiệm; `setClip` gọi ở 3 nhánh độc lập | `UiController.ts:197,439,592` | `must-fix-in-E0` | E1 phải gộp ba nhánh này thành một cổng hình học, và làm việc đó trong một file 707 dòng là cách chắc chắn để bỏ sót nhánh thứ tư. |
| 5 | `TranslatePopup` trộn vòng đời element, đo–resize, và dựng nội dung | `TranslatePopup.ts:394-546` | `must-fix-in-E0` | E6 sửa đúng khối render phiên âm (`:399-400`), và khối đó phải tách được để test mà không cần DOM. |
| 6 | `SettingTab` sẽ phình mạnh ở E5 (3 provider) và E4 (8 locale) | `SettingTab.ts` toàn file | `must-fix-in-E0` | Kế hoạch E5 ghi thẳng *"`SettingTab.ts` phải tách **trước** khi thêm"*. |
| 7 | Ranh giới tầng chỉ được giữ bằng kỷ luật, không có cổng CI | `eslint.config.mjs` | `must-fix-in-E0` | Chính là E0-T4; một import sai từ `ui/` sang `providers/` hiện đi qua CI không ai biết. |
| 8 | Không có cổng CI cho link chết trong `docs/` và cho danh sách host README vs `src/` | `scripts/check-guidelines.mjs` | `must-fix-in-E0` | Cũng là E0-T4, và AC của E7 gọi mục host là *"mục reviewer hay bắt nhất"*. |
| 9 | `SelectionManager.capture()` trộn bộ luật lọc với việc đọc DOM | `SelectionManager.ts:393-457` | `nice-to-have` | Bộ luật đáng được test riêng, nhưng không epic nào sắp tới chặn ở đây và kế hoạch xếp nó là "không bắt buộc". |
| 10 | `t()` trả về chính key khi thiếu chuỗi, thay vì fallback về `en` | `i18n/index.ts:63-66` | `wontfix` | Đây là **E4-T1**, đã có yêu cầu và AC riêng ở đó; sửa sớm là lấn epic. |
| 11 | `normalizeDetectedLang()` cắt script subtag, làm `zh-Hans`/`zh-Hant` không phân biệt được | `providers/langMap.ts:78` | `wontfix` | Đây là **E3-T3**, được ghi là điều kiện chặn của tính năng tiếng Trung; sửa ở E0 là lấn epic và không có ngôn ngữ nào để kiểm chứng. |

### Ghi chú về những gì `/code-review` đã loại trừ

Ghi lại để lần sau không phải nghi lại: unconditional `preventDefault()` sau khi `outerScroller` trả về leaf (chuỗi cuộn native đã chết sẵn, không mất gì); `overlaps`/`isRectVisible` đo rect của chính element (đúng chủ ý, và đối xứng trên/dưới); `clipInsets`/`clampInset` (kẹp đúng, xấu nhất là clip hết một element vốn đã ẩn); `reanchor` tính và di chuyển cả khi đang ẩn (cố ý, có ghi trong docstring).

---

## Phạm vi đề nghị cho bước tái cấu trúc

**Đúng 3 file kế hoạch đã liệt kê, không mở rộng.** Kế hoạch liệt 4 file; `SelectionManager.ts` được **bỏ ra**, vì nó nằm trong nhóm "cân nhắc, không bắt buộc" và không chặn epic nào.

| Commit dự kiến | Nội dung | Issue |
|---|---|---|
| `refactor(ui): tách FloatingLayer khỏi UiController` | Gom show/hide/clip/moveTo/visibility của icon và popup sau một lớp | #4 |
| `refactor(ui): tách PopupContent khỏi TranslatePopup` | Đưa `buildResult`/`buildHeader`/`buildFooter`/`buildError` ra file riêng | #5 |
| `refactor(settings): tách SettingTab thành sections` | 7 method sẵn có → `settings/sections/*.ts` | #6 |
| `refactor: xoá dead code` | 4 phương thức + 2 key i18n | #2, #3 |
| `build(ci): thêm cổng ranh giới import, link docs, host README` | E0-T4 | #7, #8 |

Sau mỗi commit: `npm run verify` xanh. Hành vi người dùng không đổi ở bất kỳ commit nào.
