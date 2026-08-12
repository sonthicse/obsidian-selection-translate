# Selection Translate — Đặc tả yêu cầu & kế hoạch phát triển

Trạng thái repo tại thời điểm phân tích: `main` @ `97ea9f3`, version `0.2.2`, 24 commit, tag `0.1.1 → 0.2.2`, 41 file TS trong `src/` (~7.3k LOC), 18 file test (vitest), có sẵn `scripts/check-guidelines.mjs` và workflow release.

> **Cập nhật sau E0 (2026-08-12, version `0.2.3`).** Con số ở trên là ảnh chụp lúc lập kế hoạch và được giữ nguyên làm mốc lịch sử. Trạng thái hiện tại: **53 file TS** (7 609 LOC), **17 file test**, **314 test**, 132 chuỗi UI. Mọi trích dẫn `file:dòng` trong tài liệu này đã được rà lại sau tái cấu trúc — xem [Kết quả thực hiện](#kết-quả-thực-hiện-e0) ở cuối mục E0.
>
> Hai con số trong bản gốc cũng sai ngay từ đầu, sửa luôn ở đây: repo có **16** file test chứ không phải 18, và **42** file TS chứ không phải 41.

Tài liệu này **chỉ đặc tả** — không thực hiện.

---

## Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Endpoint Google free không chính thức | **Giữ.** Kèm chiến lược giảm thiểu rủi ro review (mục E0-T5) |
| 2 | Phạm vi ngôn ngữ | Thêm **6 ngôn ngữ** ở **cả 3 vai**: nguồn, đích, giao diện |
| 3 | Ai dịch | **Claude viết/dịch**, tự nhiên như người bản ngữ viết. Tiếng Trung có **cả hai** catalogue giao diện; `zh-Hant` là bản chuẩn, `zh-Hans` phái sinh từ nó |
| 4 | Tái cấu trúc | Nếu review kết luận là cần thì **làm ngay ở E0**. Review dùng lệnh `/code-review` |
| 5 | `CLAUDE.md` | Viết **ngay sau E0**, rất chi tiết, kèm 3 quy tắc bắt buộc (mục E8) |
| 6 | Vấn đề mới | Trigger key **chưa đồng bộ** với Hotkeys của Obsidian → epic riêng **E2**, chọn **phương án B** (`Scope` API + phát hiện xung đột) |
| 7 | Quản lý phiên bản | Theo chuẩn công nghiệp: SemVer + Conventional Commits + luồng hotfix (mục cuối) |
| 8 | Tiếng Nga | **Bỏ.** `ru` bị gỡ khỏi danh sách ngôn ngữ nguồn — đây là thay đổi phá vỡ tương thích, xử lý ở E3-T5 |
| 9 | Tên command | **Giữ nguyên tiếng Anh**, đăng ký một lần (mục E2-T5) |
| 10 | Phạm vi dịch tài liệu | Chỉ **README, INSTALL, API-SETUP** |

### Ma trận ngôn ngữ chốt

| Ngôn ngữ | Mã nội bộ | Nguồn | Đích | Giao diện |
|---|---|---|---|---|
| Tiếng Anh | `en` | có | có | **có** (chuẩn) |
| Tiếng Việt | `vi` | có | có | có |
| Trung phồn thể | `zh-Hant` | **thêm** | **thêm** | **thêm** (bản Trung chuẩn) |
| Trung giản thể | `zh-Hans` | **thêm** | **thêm** | **thêm** |
| Tây Ban Nha | `es` | có sẵn | **thêm** | **thêm** |
| Tiếng Nhật | `ja` | **thêm** | **thêm** | **thêm** |
| Tiếng Ý | `it` | **thêm** | **thêm** | **thêm** |
| Tiếng Ả Rập | `ar` | **thêm** | **thêm** | **thêm** (RTL) |
| Tiếng Pháp | `fr` | có sẵn | **thêm** | không |
| Tiếng Đức | `de` | có sẵn | **thêm** | không |
| ~~Tiếng Nga~~ | ~~`ru`~~ | **gỡ bỏ** | không | không |

Tổng: **10 ngôn ngữ nguồn** (+ `auto`), **10 ngôn ngữ đích**, **8 locale giao diện**.

**Tổng khối lượng giao diện:** 8 locale × 132 key = **1.056 chuỗi**.

> Số key giảm từ 134 xuống 132 ở E0: `popup.otherMeanings` và `settings.recordHotkey` là key mồ côi, không code nào tra tới, nên đã xoá trước khi E4 nhân chúng lên 8 locale.

> **Lưu ý về `zh-Hans` (quan trọng, dễ làm sai):** bản giản thể **không phải** là bản phồn thể đổi bộ chữ. Từ vựng tin học khác nhau thật sự — 軟體/软件, 網路/网络, 螢幕/屏幕, 設定/设置, 檔案/文件. Chuyển đổi tự động kiểu OpenCC rồi dùng luôn sẽ cho ra thứ tiếng Trung mà người đại lục đọc là "bản Đài Loan chuyển máy". Quy trình đúng: dịch `zh-Hant` trước như bản chuẩn, chuyển bộ chữ, rồi **rà lại toàn bộ thuật ngữ** theo bản địa hoá chính thức của Obsidian tiếng Trung giản thể.

---

## Tổng quan phân nhóm

| Epic | Tên | Phụ thuộc | Milestone |
|---|---|---|---|
| **E0** | Audit: `/code-review` + điều tra automated check + tái cấu trúc (nếu cần) | — | `0.2.3` |
| **E8** | `CLAUDE.md` | E0 | `0.2.3` |
| **E1** | Sửa lỗi popup/icon lòi ra ở mép trên | E0 | `0.3.0` |
| **E2** | Đồng bộ trigger key với Hotkeys của Obsidian | E0 | `0.3.0` |
| **E3** | Refactor mô hình ngôn ngữ (language registry) | E0 | `0.4.0` |
| **E4** | Giao diện 8 locale + RTL | E3 | `0.4.0` |
| **E5** | 3 provider mới: Baidu / Youdao / Papago | E3 | `0.5.0` |
| **E6** | Phiên âm hiển thị có điều kiện | E3, E5 | `0.5.0` |
| **E7** | Viết lại & dịch bộ tài liệu | E1–E6 | `0.6.0` |

**Lý do xếp thứ tự:**

- **E0 trước tất cả.** Quyết định 4 nói tái cấu trúc làm ngay ở E0 — nghĩa là mọi epic sau đều xây trên nền đã ổn định, không phải sửa hai lần.
- **E8 ngay sau E0**, trước cả sửa bug, để mọi phiên làm việc từ đó trở đi đều có ngữ cảnh.
- **E1 và E2 độc lập nhau và độc lập với phần ngôn ngữ** → ship sớm ở `0.3.0`, người dùng hiện tại được lợi ngay.
- **E3 là nút thắt.** `SourceLangCode`/`TargetLangCode` là union hard-code trong `types.ts`, `langMap.ts` là bảng 3 cột. Nếu thêm ngôn ngữ (E4) trước rồi mới thêm provider (E5), bảng đó phải mở rộng hai lần theo hai chiều. Làm E3 trước = mở rộng một lần.
- **E7 cuối cùng**, vì tài liệu phải mô tả code đã ổn định — nhưng có ngoại lệ bắt buộc: README/PRIVACY phải cập nhật **cùng PR** với E5 (thêm host mạng mới), nếu không sẽ trượt review.

---

## E0 — Audit, review code, tái cấu trúc

### E0-T1. Thu thập bằng chứng thất bại automated check

Yêu cầu "tìm hiểu vì sao thất bại" chưa đủ dữ kiện để kết luận. Cụ thể hóa:

- Lưu **nguyên văn** output của bot/portal vào `docs/REVIEW-FINDINGS.md`, kèm ngày submit, version submit, link release, link ticket trên portal.
- Mỗi finding một dòng: `finding | rule của Obsidian | file:dòng | cách sửa | trạng thái`.

**AC:** mỗi finding map được về một file cụ thể trong repo hoặc một mục trong `docs/SUBMISSION.md`.

### E0-T2. Danh sách giả thuyết + cách kiểm chứng

Xếp theo xác suất, dựa trên đọc code:

| # | Giả thuyết | Bằng chứng trong repo | Cách kiểm chứng |
|---|---|---|---|
| H1 | `eslint-plugin-obsidianmd` pin `^0.4.1`, bot chạy ruleset mới hơn | `package.json` | Nâng bản mới nhất, chạy `npm run lint`, so số finding |
| H2 | **Gán style trực tiếp trong JS** — 17 vị trí `.style.*` | `TriggerIcon.ts:64-65,77-78`, `TranslatePopup.ts:127-128,377-378`, `InputSelectionSource.ts:116-125` (số dòng của bản `0.2.2`) | Phần positioning là động và hợp lệ → chuyển sang CSS custom property (mẫu `--st-clip-top` đã làm đúng), rồi lint lại → **đã loại trừ, xem `docs/REVIEW-FINDINGS.md` §3** |
| H3 | Release thiếu asset / tag lệch manifest | `release.yml` tự ghi nhận bản `0.1.1` từng release rỗng | `gh release view <tag> --json assets`; kiểm `main.js`, `manifest.json`, `styles.css` là file rời, không phải zip |
| H4 | Endpoint Google không chính thức | `GoogleFreeProvider.ts`, `constants.ts:ENDPOINTS.googleFree` | Đây là rủi ro **review thủ công**, không phải automated. Xử lý ở E0-T5 |
| H5 | Checklist `docs/SUBMISSION.md` còn nhiều mục chưa tick | chính file đó | Rà từng dòng, đặc biệt: README *Network use* đủ host, ảnh demo thật, test đa nền tảng |
| H6 | `addEventListener` không qua `registerDomEvent` | 11 chỗ `addEventListener` vs 10 chỗ `register*` | Đối chiếu từng chỗ, xác định chỗ lệch có được gỡ trong `onunload` không |

**AC:** mỗi giả thuyết có kết luận **xác nhận / loại trừ** kèm bằng chứng. Không để mục nào ở trạng thái "có thể".

### E0-T3. Code review bằng `/code-review`

Chạy `/code-review` trên toàn bộ `src/`, sau đó phân loại kết quả theo 5 trục dưới đây. Lệnh này sinh ra danh sách thô; việc phân loại và quyết định phạm vi là phần người làm.

1. **Đồng bộ:** quy ước đặt tên, xử lý lỗi (`ProviderError` có nhất quán ở cả 3 provider?), logging (`utils/log.ts` là cổng duy nhất), cách khai báo settings.
2. **Ranh giới tầng:** `types.ts` tuyên bố "UI không biết provider nào trả lời, provider không thấy DOM". Kiểm chứng bằng grep import chéo. Đề xuất thêm ESLint `no-restricted-imports` để CI giữ ranh giới, thay vì dựa vào kỷ luật.
3. **File quá lớn / trách nhiệm chồng:**

| File | LOC trước | LOC sau | Vấn đề | Đã làm |
|---|---|---|---|---|
| `ui/UiController.ts` | 707 | **687** | Ôm cả: glue state machine, placement, clip, occlusion, anchored-scroll, dismiss | ✅ Tách `ui/FloatingLayer.ts` (70) |
| `ui/TranslatePopup.ts` | 569 | **367** | Dựng DOM + đo kích thước + render nội dung | ✅ Tách `ui/PopupContent.ts` (239) |
| `core/SelectionManager.ts` | 504 | **479** | Lắng nghe sự kiện + chụp snapshot + lọc surface | ✅ Tách `core/SelectionRules.ts` (117) + 17 test |
| `settings/SettingTab.ts` | 460 | **95** | Sẽ phình mạnh ở E5 (3 provider × ~3 field) và E4 (8 locale) | ✅ Tách `settings/sections/` (7 file, 464 dòng) |

> `UiController` chỉ giảm 20 dòng vì phần tách ra là logic, không phải khối lượng — 3 cặp lệnh `setAnchorHidden`/`setClip` lặp lại trở thành 1 lời gọi `applyVisibility`. Giá trị nằm ở chỗ **chỉ còn một cổng** để E1-T2 gộp `moveTo` vào, không nằm ở số dòng.

4. **Tính năng cũ / dead code:** commit `9a17017` đã gỡ "Show original". Rà tiếp: setting nào không còn UI đọc tới, key i18n mồ côi, hằng số không tham chiếu. Kiểm cụ thể `stripMarkdown`, `pdfSelectionFallback`, `popupTheme`, `dictionarySource: 'gtx' | 'dictionaryapi'` — mỗi cái có đường dẫn UI và có test không.
5. **Khả năng sửa lỗi:** hiện **không có test** cho `UiController`, `SelectionManager`, `TranslatePopup`, `SettingTab` — tức 2.240 dòng nặng nhất không được cover. Sau khi tách (mục 3), phần logic thuần phải có test; phần chạm DOM thì không ép.

   > **Sau E0:** `core/SelectionRules.ts` đã có `tests/SelectionRules.test.ts` (17 test). Ba file còn lại vẫn không có test trực tiếp — phần tách ra khỏi chúng (`FloatingLayer`, `PopupContent`, `sections/`) vẫn chạm DOM, nên đúng theo quy tắc "không ép" ở trên. Tổng test: 297 → **314**.

**Quyết định phải ra được — trả lời rõ 3 câu:**
- Có cần tái cấu trúc không? → Có/Không kèm phạm vi tối thiểu.
- Tái cấu trúc bao nhiêu là đủ để E1–E6 không phải làm lại? → danh sách file.
- Cái gì để nguyên? → ghi rõ, để tránh refactor tràn lan.

**AC:** `docs/CODE-REVIEW.md` với ≤ 30 issue, mỗi issue gắn nhãn `must-fix-in-E0` / `nice-to-have` / `wontfix` + lý do một câu.

### E0-T4. Bổ sung cổng CI

Thêm vào `npm run verify`: kiểm tra ranh giới import, key-parity i18n (mở rộng `tests/i18n.test.ts`), link chết trong `docs/`, đối chiếu danh sách host trong README với host thực sự gọi trong `src/`.

### E0-T5. Chiến lược giữ `google-free` (theo quyết định 1)

Giữ endpoint không chính thức là lựa chọn có ý thức, nên phải có phương án phòng thủ chứ không bỏ mặc:

- **Minh bạch tuyệt đối trong README và PRIVACY:** ghi rõ đây là endpoint nội bộ của Google Translate, không có tài liệu công khai, không có cam kết ổn định, có thể ngừng hoạt động bất cứ lúc nào, và người dùng tự chịu trách nhiệm về điều khoản sử dụng.
- **Giữ vai trò mặc định** nhưng thêm một dòng ghi chú ngay trong settings tab cạnh lựa chọn provider (không phải Notice, không làm phiền).
- **Có đường lùi:** khi có đủ 6 provider sau E5, việc đổi mặc định sang một provider chính thức chỉ là đổi một hằng số trong `DEFAULT_SETTINGS`. Ghi sẵn phương án này vào `docs/REVIEW-FINDINGS.md` để nếu reviewer phản đối thì xử lý trong vài giờ thay vì vài ngày.
- **Không quảng bá nó ở tiêu đề README.** Mô tả plugin nên nhấn vào "nhiều nhà cung cấp" chứ không phải "dịch miễn phí không cần key".

---

### Kết quả thực hiện (E0)

Thực hiện ngày **2026-08-12**, phát hành thành version **`0.2.3`**.

#### Trạng thái từng task

| Task | Trạng thái | Ghi chú |
|---|---|---|
| **E0-T1** — bằng chứng automated check | **Xong một phần** | Chủ dự án xác nhận **không còn** nguyên văn output của bot/portal. `docs/REVIEW-FINDINGS.md` ghi thẳng điều đó thay vì dựng bảng finding từ suy đoán, rồi chuyển toàn bộ trọng lượng kết luận sang E0-T2 và sang bằng chứng thứ cấp trong git. |
| **E0-T2** — kiểm chứng H1–H6 | **Xong** | Cả 6 giả thuyết đều có kết luận dứt khoát kèm bằng chứng. Không mục nào ở trạng thái "có thể". |
| **E0-T3** — `/code-review` + phân loại | **Xong** | `docs/CODE-REVIEW.md`, 11 issue. Xem lưu ý về hạn chế của lệnh ở dưới. |
| **E0-T4** — cổng CI | **Xong** | 4 cổng mới, mỗi cổng đã được kiểm bằng cách cố tình vi phạm. |
| **E0-T5** — chiến lược `google-free` | **Xong** | 4/4 gạch đầu dòng; 2 gạch vốn đã có sẵn từ trước. |

#### Kết luận cuối cùng của E0-T2

**Giả thuyết được xác nhận: H3 — release thiếu asset.**

Release `0.1.1` có **0 asset** (xác nhận qua GitHub REST API), trong khi cổng submit bắt buộc `main.js` + `manifest.json` dưới dạng asset rời. Một submit lúc đó trượt ngay tại bước này, trước mọi câu hỏi về lint. Song song, `npm run lint` khi ấy **không** chạy `eslint-plugin-obsidianmd` (chưa cài) và dùng preset không type-aware, nên một batch finding lọt qua CI của repo — nguyên văn lý do nằm trong thân commit `13047cc`.

Hai vấn đề độc lập, và **cả hai đã được sửa xong trước khi E0 bắt đầu** (`4477168` sửa workflow, `13047cc` + `5d82b3c` sửa CI và finding).

**H1, H2, H4, H5, H6 đều bị loại trừ.** Đáng chú ý:

- **H1** loại trừ vì `eslint-plugin-obsidianmd@0.4.1` **đã là bản mới nhất** trên npm (publish 2026-07-02). Không có bản nào để nâng, nên bước "nâng trong một commit riêng" là **rỗng chứ không bị bỏ qua**. Số finding trước = sau = **8 warning / 0 error**.
- **H2** loại trừ vì rule `no-static-styles-assignment` chỉ bắt giá trị **literal**; cả 17 vị trí `.style.*` đều là giá trị động. Việc kế hoạch đề xuất — chuyển positioning sang custom property — **không cần làm**.

#### Phạm vi tái cấu trúc: dự kiến vs thực tế

Audit ở E0-T3 đề nghị **3 file** (bỏ `SelectionManager.ts`, vì nó không chặn epic nào). **Chủ dự án duyệt đủ 4 file như kế hoạch gốc**, và duyệt thêm việc sửa issue #1 ngay trong E0. Kết quả: **thực tế = dự kiến**, cộng một sửa lỗi nhỏ ngoài dự kiến.

#### Danh sách commit

Từ `97ea9f3` (mốc `0.2.2`) đến `e0c0d2a` (tag `0.2.3`):

| Commit | Nội dung |
|---|---|
| `777e281` | `docs:` kế hoạch phát triển + `REVIEW-FINDINGS.md` (E0-T1, E0-T2) |
| `d357f6a` | `docs:` `CODE-REVIEW.md` (E0-T3) |
| `25c24f7` | `refactor:` xoá 4 phương thức không ai gọi + 2 key i18n mồ côi |
| `ca024b6` | `fix(ui):` wheel ngang ở chế độ page đo theo chiều rộng cửa sổ |
| `bf53788` | `refactor(ui):` tách `FloatingLayer` khỏi `UiController` |
| `af38d3f` | `refactor(ui):` tách `PopupContent` khỏi `TranslatePopup` |
| `2bca155` | `refactor(settings):` tách `SettingTab` thành `sections/` |
| `4891977` | `refactor(core):` tách `SelectionRules` khỏi `SelectionManager` (+17 test) |
| `fb0830e` | `build(ci):` 4 cổng CI mới (E0-T4) |
| `53f7b57` | `docs:` minh bạch endpoint `google-free` (E0-T5) |
| `ff50ba7` | `docs(changelog):` entry `0.2.3` |
| `e0c0d2a` | `chore(release):` bump `0.2.3` |

`npm run verify` xanh sau **mỗi** commit.

#### Phát hiện ra nhưng cố ý không làm

| Việc | Vì sao không làm |
|---|---|
| Sửa `t()` trả về key thay vì fallback về `en` (`i18n/index.ts:63-66`) | Là **E4-T1**, đã có yêu cầu và AC riêng ở đó. Làm sớm là lấn epic. |
| Sửa `normalizeDetectedLang()` cắt script subtag (`providers/langMap.ts:78`) | Là **E3-T3**, điều kiện chặn của tính năng tiếng Trung. Ở E0 chưa có ngôn ngữ nào để kiểm chứng. |
| Tách `SelectionManager.capture()` sâu hơn (phần đọc DOM) | Phần còn lại thực sự cần DOM; tách thêm chỉ tạo lớp trung gian không test được. |
| Test đa nền tảng (Windows/macOS/Linux/Mobile) | Không phải thay đổi code. Vẫn là mục còn hở trước khi submit lại. |
| Thêm 4 topic GitHub còn thiếu; sửa description repo trên GitHub (`Vide coding with Claude 😊`) | Nằm ở cài đặt repo trên GitHub, không phải file trong repo. **Cần chủ dự án tự làm.** |
| Xoá `docs/DEV-PLAN.md:Zone.Identifier` (file rác WSL, chưa track) | Ngoài phạm vi được duyệt. Nên thêm `*:Zone.Identifier` vào `.gitignore` ở một task khác. |

#### Một lưu ý về `/code-review`

Lệnh này review **diff**, không review toàn bộ cây thư mục. Vì `main` sạch, nó đã chọn commit `97ea9f3` làm phạm vi và phủ đúng một commit chứ không phải 42 file. Nó tìm được **1 issue thật** (bug đơn vị wheel, đã sửa ở `ca024b6`). Toàn bộ 5 trục phân loại được làm bằng audit thủ công trên tay — đúng như kế hoạch đã lường trước: *"Lệnh này sinh ra danh sách thô; việc phân loại và quyết định phạm vi là phần người làm."*

**Với các epic sau: đừng trông đợi `/code-review` phủ hết một thư mục.** Nếu cần review rộng, phải chỉ định phạm vi rõ hoặc tự đọc.

---

## E8 — `CLAUDE.md` (làm ngay sau E0)

### Nội dung bắt buộc

Chạy `/init` để sinh khung, sau đó bổ sung thủ công những phần `/init` không tự suy ra được:

1. **Plugin làm gì, cho ai** — 3 câu.
2. **Bản đồ tầng:** `selection/` → `core/` → `providers/` → `ui/`, kèm quy tắc bất biến: UI không biết provider nào trả lời, provider không thấy DOM. Ghi rõ file nào thuộc tầng nào.
3. **Lệnh:** `npm run dev | build | test | lint | check | verify`. Nhấn mạnh `verify` là cổng bắt buộc trước mọi commit.
4. **Quy ước code:** tab thay space; comment giải thích **tại sao** chứ không phải cái gì (phong cách hiện tại của repo rất nhất quán ở điểm này — phải giữ, đây là tài sản của dự án); sentence case cho chuỗi UI; cấm `innerHTML`/`outerHTML`/`insertAdjacentHTML`; bắt buộc `requestUrl` thay `fetch`; không gán style trong JS, dùng CSS custom property.
5. **Playbook — phần giá trị nhất:**
   - *Thêm một ngôn ngữ mới:* đúng danh sách file phải sửa, theo thứ tự.
   - *Thêm một provider mới:* đúng danh sách file, kèm bộ fixture tối thiểu phải có.
   - *Thêm một chuỗi UI mới:* thêm vào `en.ts` trước, rồi 6 catalogue còn lại, chạy test parity.
6. **Cạm bẫy đã biết:** selection snapshot phải chụp trước khi click (lý do đã ghi trong `types.ts`); DeepL `EN` là source còn `EN-US` là target; clip insets phải đi kèm **mọi** lần set vị trí; `normalizeDetectedLang` không được cắt script subtag của `zh`.
7. **File không sửa tay:** `versions.json`, trường `version` trong `manifest.json` (đi qua `version-bump.mjs`), `package-lock.json`.
8. **Quy trình release + checklist submit.**

### Ba quy tắc vận hành bắt buộc ghi vào `CLAUDE.md`

> **R1 — Tự kiểm sau mỗi task.** Kết thúc một task, phải đọc lại `CLAUDE.md` và đối chiếu với trạng thái thực tế của dự án. Nếu có mục nào đã lỗi thời (đường dẫn file đổi, quy ước đổi, playbook thiếu bước), sửa ngay trong cùng task đó. `CLAUDE.md` sai còn tệ hơn `CLAUDE.md` không có.

> **R2 — Tài liệu đi cùng code.** Kết thúc một task, rà `README.md` và `docs/**` xem còn mô tả đúng dự án không. Cụ thể phải kiểm: danh sách host mạng, danh sách provider, danh sách ngôn ngữ, danh sách setting, ảnh chụp màn hình. Không để tài liệu trôi khỏi code rồi dồn vào E7.

> **R3 — Không tự ý lệch kế hoạch.** Trong quá trình thực hiện, nếu phát hiện cần làm khác với tài liệu này — đổi cách tiếp cận, thêm/bớt phạm vi, đổi thư viện, đổi cấu trúc thư mục, phát hiện kế hoạch sai — thì **dừng lại và hỏi trước**. Chỉ làm sau khi được đồng ý. Áp dụng cả với thay đổi trông có vẻ nhỏ và hiển nhiên đúng.

**AC:** `CLAUDE.md` tồn tại ở root, chứa đủ 8 mục + 3 quy tắc; cập nhật `CLAUDE.md` là một phần Definition of Done của mọi epic sau.

---

### Kết quả thực hiện (E8)

Thực hiện ngày **2026-08-12**, ngay sau E0, trên version `0.2.3`. Thuần tài liệu — **không chạm `src/`**, nên không bump version.

#### Trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| 8 mục nội dung | **Xong** | Đủ 8, theo đúng thứ tự kế hoạch liệt kê |
| 3 quy tắc R1–R3 | **Xong** | Chép nguyên văn từ mục trên, không diễn giải lại |
| Kiểm chứng trích dẫn | **Xong** | Mọi `file:dòng`, tên hàm, tên lệnh trong `CLAUDE.md` đều được mở ra đối chiếu trước khi viết |
| `npm run verify` | **Xanh** | 314 test, 0 error / 5 warning, 53 file nguồn, 132 chuỗi UI |

Ngôn ngữ: `CLAUDE.md` viết tiếng Việt cho khớp `DEV-PLAN` / `CONTRIBUTING` / `SUBMISSION`, và ghi rõ ngay đầu file rằng code, comment, chuỗi UI tiếng Anh, CHANGELOG và README vẫn là tiếng Anh.

#### `/init` suy ra được gì, và phải viết lại gì

`/init` **không sinh ra file khung**. Nó nạp một bộ chỉ dẫn phân tích repo rồi để người viết ra `CLAUDE.md`, nên toàn bộ nội dung là viết tay. Đáng ghi lại là **bộ chỉ dẫn mặc định của `/init` mâu thuẫn trực tiếp với ba yêu cầu của E8**:

| Chỉ dẫn mặc định của `/init` | Vì sao E8 phải làm ngược lại |
|---|---|
| *"Avoid listing every component or file structure"* | Mục 2 của E8 yêu cầu **bản đồ tầng có tên file**, vì đó chính là thứ E1–E7 tra khi mở phiên mới |
| *"Do not make up… Common Development Tasks"* | Mục 5 (playbook) là *"phần giá trị nhất"* theo kế hoạch — nhưng nó không phải bịa: mỗi bước được kiểm bằng cách mở đúng file đó |
| Chỉ nhắm vào "commands + high-level architecture" | Bốn mục 6, 7, 8 và ba quy tắc R1–R3 nằm ngoài phạm vi `/init` hoàn toàn, và cả bốn cạm bẫy mới đều là kết luận của E0 chứ không đọc ra được từ code |

Ba thứ `/init` **không thể** suy ra, dù đọc hết `src/`, và đều là phần đắt nhất của tài liệu: *ý định* đằng sau 5 warning lint còn lại (nhìn từ code chúng chỉ là nợ kỹ thuật), lý do `SelectionManager` cố ý không dùng `registerDomEvent`, và bài học về cổng submit đọc `manifest.json` ở nhánh mặc định nhưng đọc file build ở release.

#### Rà lại trích dẫn `file:dòng` (bước B)

E8 không chạm `src/`, nhưng vẫn mở lại từng chỗ kế hoạch trích dẫn. **Không tìm thấy trích dẫn nào còn sai** — E0 đã cập nhật hết. Đã kiểm:

`ContextDetector.ts:16` · `FloatingLayer.ts:42, :60` · `UiController.ts:196, 428, 429, 433, 434, 572, 583` · `TranslatePopup.ts:350-351` · `PopupContent.ts:68-70` · `styles.css:107, 192` · `langMap.ts:78` · `i18n/index.ts:63-66` · `main.ts:158, 160, 172` · `settings/sections/activation.ts:29` · `SelectionManager.ts:154-159` · `constants.ts:140-147`.

Số dòng trong `docs/CODE-REVIEW.md` và `docs/REVIEW-FINDINGS.md` **cố ý** là số của `0.2.2` và được giữ nguyên — cả hai file đã nói rõ điều đó ở đầu.

#### Commit

| Commit | Nội dung |
|---|---|
| `7ee352a` | `docs:` `CLAUDE.md` — 8 mục + 3 quy tắc |
| *(commit này)* | `docs:` kết quả E8, bảng tiến độ, `docs/prompts/PROMPT-E1.md` |

#### Phát hiện ra nhưng cố ý không làm

| Việc | Vì sao không làm |
|---|---|
| `docs/CONTRIBUTING.md` mục *Lệnh* thiếu 4 cổng CI mới của E0, và câu *"Trong TypeScript chỉ được đặt toạ độ tính lúc chạy"* nay cần kèm cảnh báo rằng rule lint chỉ bắt literal | Tài liệu người dùng/người đóng góp thuộc **E7**; và R2 chỉ yêu cầu rà *host / provider / ngôn ngữ / setting / ảnh*, không mục nào lệch. Ghi lại ở đây để E7 không phải tìm lại. |
| `docs/ARCHITECTURE.md` sơ đồ khối chưa có `FloatingLayer`, `PopupContent`, `SelectionRules`, `settings/sections/` | Kế hoạch **E7-T1** đã ghi thẳng *"Vẽ lại sau E0 + E3"*. Vẽ bây giờ là vẽ hai lần. |
| Không mở rộng `tests/i18n.test.ts` hay thêm test nào | E8 thuần tài liệu. |
| Xoá `docs/DEV-PLAN.md:Zone.Identifier` (file rác WSL) | Vẫn ngoài phạm vi, như đã ghi ở E0. |

#### Một điều E8 làm lộ ra, đáng biết trước khi vào E1

Playbook 5.4 (*thêm một setting mới*) hoá ra là mục **không có trong đặc tả gốc của E8** nhưng lại cần nhất, vì đường đi đã đổi hẳn ở E0: `settings.ts` → `sections/<đúng section>.ts` → `en.ts` + `vi.ts`, và `SettingTab.ts` **không** phải sửa. Bảng "section nào giữ setting nào" trong `CLAUDE.md` được dựng bằng cách grep `ctx.save(` trong cả 8 file `sections/` — **E5 sẽ cần đúng bảng đó** khi thêm ba cặp credential mới, và giả định trong E5 (*"`SettingTab.ts` phải tách trước khi thêm"*) vẫn đúng, chỉ là việc đó nay đã xong.

Không phát hiện gì buộc một epic sau phải đổi cách làm.

---

## E1 — Lỗi UI/UX: popup và icon lòi ra ở mép trên

### Mô tả lỗi (theo ảnh chụp)

Khi người dùng cuộn xuống, selection đi lên khỏi vùng nội dung. Popup lẽ ra phải bị cắt dần và biến mất, nhưng thực tế phần trong khung đỏ vẫn hiển thị — nó **vẽ đè lên hàng view-header** (hàng chứa nút back/forward và biểu tượng bút chì), ngay dưới thanh tab.

Đây là điểm cần nhấn: **không phải popup "hơi tràn"** — mà là nó tiếp tục được vẽ trong một vùng thuộc về chrome của Obsidian, nơi nó không bao giờ được phép xuất hiện.

### Nguyên nhân gốc (đã xác định trong code)

```ts
// src/core/ContextDetector.ts:29 (sau E1; là :16 ở 0.2.3)
const CONTAINER_SELECTORS = '.workspace-leaf-content, .workspace-leaf, .markdown-embed, .popover';
```

`containerEl` được resolve tới **`.workspace-leaf-content`**, mà phần tử này **bao gồm cả `.view-header`**, không chỉ `.view-content`.

Chuỗi hệ quả:

1. `FloatingLayer.visibleBounds()` (`src/ui/FloatingLayer.ts:42` ở `0.2.3`; nay `:74`) = giao của viewport và `containerEl.getBoundingClientRect()` → biên trên nằm ở **đỉnh `.workspace-leaf-content`**, tức phía trên view-header.
2. `Positioner.clipInsets()` tính phần thừa so với biên đó → popup nằm trong vùng view-header **không bị coi là thừa**, `--st-clip-top` = 0 ở vùng đó.
3. `styles.css:107,192` (nay `:107,196`) `clip-path: inset(...)` không cắt gì → popup hiển thị đè lên header. Đúng như ảnh.
4. Thêm một tầng nữa: `OCCLUSION_SELECTORS` **có** chứa `.view-header` và `.workspace-tab-header-container`, nhưng phép thử occlusion chỉ chạy ở lần đặt vị trí đầu tiên trong `place()`. Đường cập nhật khi cuộn dùng `computeCandidate()`, vốn **cố ý bỏ qua occlusion** vì lý do hiệu năng (`elementsFromPoint` 60 lần/giây). Nên khi cuộn, không có gì chặn cả.

Nói cách khác: cơ chế clip đã đúng, **biên được đo sai**.

### Yêu cầu cụ thể

**E1-T1. Tách hai khái niệm đang bị gộp làm một.**

| Khái niệm | Dùng để | Phần tử |
|---|---|---|
| `leafEl` | Nhận diện leaf, gắn sự kiện, thu thập scroll anchor | `.workspace-leaf-content` (giữ nguyên) |
| `contentEl` | **Biên đặt vị trí và biên cắt** | `.view-content` — và với PDF là `.view-content` trừ chiều cao `.pdf-toolbar` |

Bổ sung `contentEl` vào `ContextInfo` và `SelectionSnapshot`. `FloatingLayer.visibleBounds()` và `UiController.computeBoundary()` (`src/ui/UiController.ts:583` ở `0.2.3`; nay `:578`) chuyển sang dùng `contentEl`.

Với `.markdown-embed` và `.popover` (hover preview) thì phần tử nội dung tương ứng là `.markdown-embed-content` / `.hover-popover` — cần bảng map riêng, không dùng chung một selector.

**E1-T2. Một cổng duy nhất cho hình học.**

> **E0 đã làm trước một nửa việc này.** Ba lời gọi `setClip` rải rác (`UiController.ts:197, 439, 592` trong bản `0.2.2`) nay đã gộp thành **`FloatingLayer.applyVisibility(target, rect, snapshot)`** (`src/ui/FloatingLayer.ts:60`), được gọi từ đúng 4 chỗ trong `UiController.ts` — dòng **196** (`placePopup`), **428** và **433** (`reanchor`, nhánh icon và nhánh popup), **572** (`showIcon`). Một chỗ nhiều hơn bản cũ vì nhánh icon và nhánh popup của `reanchor` giờ tách biệt.

Việc còn lại của E1-T2: đổi `applyVisibility` thành **`applyGeometry(rect)`** làm cả **ba** việc — set vị trí, set clip, set visibility — bằng cách kéo nốt `moveTo()` vào trong nó. Hiện `moveTo` vẫn được gọi riêng ngay sau `applyVisibility` ở `UiController.ts:429` và `:434`. Sau khi gộp, không nơi nào được set vị trí trực tiếp nữa.

Đặc biệt chú ý nhánh popup đổi kích thước theo nội dung (`TranslatePopup.applySize`, `src/ui/TranslatePopup.ts:350-351` ở `0.2.3`; nay `:359-360`) — rect đổi thì clip cũ lập tức sai.

**E1-T3. Xử lý `visibleBounds == null`.** Khi leaf cuộn hết khỏi màn hình, `intersectRects` trả `null`, `clipInsets` trả `{0,0}` → **không cắt gì cả**. Phải ẩn hẳn thay vì rơi về 0.

**E1-T4. Cắt cả trái/phải.** Hiện chỉ cắt trên/dưới. Cần cho split dọc và cho RTL ở E4.

### AC

- Tái hiện đúng kịch bản trong ảnh: chọn một từ, cuộn xuống cho tới khi selection ra khỏi vùng nội dung → popup **biến mất hoàn toàn**, không còn một pixel nào trong vùng view-header hay thanh tab.
- Cuộn ngược lại → popup hiện lại nguyên vẹn, cùng nội dung, không phải request mới (state machine vẫn ở `result`).
- Ma trận test thủ công: {Live Preview, Reading, PDF, input/properties, popout, hover preview} × {tab đơn, split ngang, split dọc} × {zoom 100%, 150%}.
- Unit test mới cho `clipInsets` với `visibleBounds.top > 0` và với `visibleBounds = null`.
- Test hồi quy: cuộn từng pixel qua mép không gây nhấp nháy (vấn đề này đã được xử lý trong `overlaps()`, không được làm hỏng).

### Kết quả thực hiện (E1)

Thực hiện ngày **2026-08-12**, trên nhánh sau `0.2.3`. **Chưa phát hành** — E1 và E2 cùng đi trong `0.3.0`, nên việc bump version làm sau khi E2 xong.

> Mọi số dòng trong phần mô tả E1 ở trên là ảnh chụp `0.2.3` và được giữ nguyên làm căn cứ; chỗ nào đã trôi thì có ghi số hiện hành ngay cạnh.

#### Trạng thái từng task

| Task | Trạng thái | Ghi chú |
|---|---|---|
| **E1-T1** — tách `leafEl` / `contentEl` | **Xong** | `ContextInfo` và `SelectionSnapshot` mọc thêm `contentEl`. Bảng map là hằng `CONTENT_SELECTORS` trong `ContextDetector.ts`, giải bằng `el.closest()` từ vùng chọn đi lên nên **bề mặt trong cùng thắng** — note nhúng trong note lấy đúng hộp nội dung của chính nó. 8 test mới. |
| **E1-T2** — một cổng hình học | **Xong** | `applyVisibility` → `applyGeometry(target, rect, snapshot)`, làm cả ba việc. Hai chỗ nữa phải đổi để lời hứa đó thành thật, và đó là phần kế hoạch chưa lường: `TriggerIcon.show()` **bỏ tham số rect**, `PopupHandlers.place()` **trả `void`** thay vì trả rect. |
| **E1-T3** — `visibleBounds == null` | **Xong** | Đúng như prompt E1 dự đoán: `isRectVisible` đã ẩn sẵn. Phần thêm là `clipInsets(rect, null)` nay cắt sạch thay vì trả `{0,0}`, để hai nửa không còn che cho nhau. |
| **E1-T4** — cắt trái/phải | **Xong** | Đủ 5 điểm chạm mà prompt liệt kê. |
| **Ma trận test thủ công** | **Chưa chạy** | Xem mục riêng bên dưới — đây là mục còn hở duy nhất của E1. |

#### Nguyên nhân gốc: xác nhận đúng như kế hoạch mô tả

Không phát sinh nghi vấn mới. `.workspace-leaf-content` bao cả `.view-header`, nên biên trên nằm phía trên header, nên phần popup vẽ trong vùng header không bị coi là thừa, nên `--st-clip-top` = 0 ở đúng vùng đáng lẽ phải cắt. Cơ chế clip đã đúng; biên được đo sai. Sửa biên là sửa gốc.

Một điều kế hoạch **không** nói và hoá ra quan trọng: `.pdf-toolbar` là **con** của `.view-content`, không phải anh em của nó. Nên với PDF, đo `.view-content` thôi vẫn chưa đủ — vùng nội dung còn thò lên dưới thanh công cụ. `FloatingLayer.contentRect()` cắt phần đó bằng `trimTop()` (hàm thuần, có test), và chỉ chạy khi `snapshot.context === 'pdf'` để không trả giá một `querySelector` mỗi khung hình cuộn ở mọi note.

#### Ma trận test thủ công — **chưa chạy, cần chủ dự án**

Phiên làm việc này chạy trong WSL và không có cách nào thao tác GUI Obsidian (bôi đen, cuộn, đổi zoom, chụp màn hình). Ba mươi sáu ô của ma trận — {Live Preview, Reading, PDF, input/properties, popout, hover preview} × {tab đơn, split ngang, split dọc} × {zoom 100%, 150%} — vì thế **chưa có ô nào được thử**, và không ô nào được tick.

Vault thật nằm ở `C:\Users\SONTHI\OneDrive\Documents\Obsidian`, plugin đã cài sẵn tại `.obsidian/plugins/selection-translate`. Cách chạy: `npm run build`, chép `main.js` + `manifest.json` + `styles.css` vào thư mục đó, rồi tắt/bật plugin trong Obsidian.

Bốn ô đáng ngờ nhất, theo thứ tự nên thử, kèm **điều cụ thể phải nhìn** ở mỗi ô:

| Ô | Phải nhìn cái gì |
|---|---|
| **PDF** | Popup trượt xuống **dưới** thanh công cụ PDF, không đè lên nó. Đây là ca duy nhất `contentRect()` phải trừ thêm, và cũng là ca dễ sai nếu bản Obsidian đổi cấu trúc DOM của trình xem PDF. |
| **Split dọc** | Popup rộng hơn nửa của nó bị **cắt ở mép trong**, không tràn sang note bên cạnh. Đây là ca T4 tồn tại vì nó. |
| **Popout** | Cửa sổ riêng: `snapshot.win` khác cửa sổ chính. Kiểm cả việc cuộn trong popout vẫn cắt đúng. |
| **Hover preview** | Đi đường map riêng (`.popover` → `.hover-popover`). Nếu Obsidian không đặt hai class đó trên cùng một phần tử, `findContentEl` sẽ rơi về container — vẫn an toàn, nhưng biên rộng hơn mong muốn. |

Ngoài ra, hai kịch bản của AC phải thử ở **ít nhất** Live Preview và Reading: cuộn cho selection rời vùng nội dung → popup biến mất hoàn toàn; cuộn ngược lại → popup hiện lại **cùng nội dung** (không có request mới — nếu thấy chấm loading thì state machine đã rơi khỏi `result` và đó là hồi quy).

#### Danh sách commit

| Commit | Nội dung |
|---|---|
| `fec1928` | `fix(ui):` đo biên từ nội dung của leaf (E1-T1) |
| `a2d0f03` | `refactor(ui):` một cổng cho vị trí, clip, visibility (E1-T2) |
| `4765798` | `fix(ui):` cắt sạch khi leaf rời màn hình (E1-T3) |
| `3354dfc` | `fix(ui):` cắt cả hai cạnh ngang (E1-T4) |
| *(commit này)* | `docs:` CHANGELOG, kết quả E1, `CLAUDE.md`, `docs/prompts/PROMPT-E2.md` |

`npm run verify` xanh sau **mỗi** commit: 327 test (từ 314), 0 error / 5 warning.

#### Phát hiện ra nhưng cố ý không làm

| Việc | Vì sao không làm |
|---|---|
| Bật phép thử occlusion cho đường cuộn | Prompt E1 cấm thẳng, và lý do vẫn đúng: `elementsFromPoint` 60 lần/giây quá đắt. Sau E1 nó cũng không cần nữa — biên đúng thì không còn gì để tránh. |
| `DEFAULT_PLACEMENT_ORDER` chưa soi gương cho RTL | Là **E4-T4**, đã có AC riêng. T4 của E1 dọn sẵn nửa đường cho nó: hai inset ngang nay đã tồn tại, E4 chỉ còn phải đảo `anchorRect.right` ↔ `left`. |
| Comment ở `UiController.computeBoundary()` nói *"selection ở dòng đầu không còn chỗ **bên dưới**"* — nghe ngược | Chỉ là chữ nghĩa, không phải hành vi; sửa nó là chạm vào comment không thuộc phạm vi. Ghi lại để E7 xử lý cùng lượt rà tài liệu. |
| `docs/ARCHITECTURE.md` vẫn chưa có `FloatingLayer` / `PopupContent` / `SelectionRules` | **E7-T1** đã ghi *"vẽ lại sau E0 + E3"*. Vẫn đúng. |
| Xoá `docs/DEV-PLAN.md:Zone.Identifier` | Vẫn ngoài phạm vi, như đã ghi ở E0 và E8. |

#### Có gì buộc một epic sau phải đổi cách làm không?

**Không.** Trái lại, E1 làm E4-T4 rẻ đi: trục ngang đã tồn tại trong cả `ClipInsets`, hai `setClip` và hai dòng `clip-path`, nên phần RTL của E4 chỉ còn là chuyện chọn **cạnh nào** chứ không phải dựng thêm cạnh. Giả định của E4 về `dir` không va vào `contentEl`: `contentEl` chỉ trả lời *vùng nào*, không trả lời *bên nào*.


---

## E2 — Đồng bộ trigger key với Hotkeys của Obsidian

### Hiện trạng: hai hệ thống phím song song, không biết nhau

| | Trigger key của plugin | Command của Obsidian |
|---|---|---|
| Nơi cấu hình | Settings của plugin (`HotkeyRecorder.ts`, gọi từ `settings/sections/activation.ts:29` — E1 không chạm file này) | Settings → Hotkeys của Obsidian |
| Lưu ở | `data.json`, trường `triggerHotkey` | `.obsidian/hotkeys.json` |
| Phạm vi | Chỉ vài giây khi icon đang hiện | Toàn cục |
| Xử lý | `HotkeyManager.matchesBinding()`, tự bắt `keydown` | `addCommand` trong `main.ts:158` |

Comment trong `HotkeyManager.ts` ghi rõ đây là thiết kế có chủ ý. Thiết kế đó hợp lý về UX, nhưng **cách hiện thực thì chưa đồng bộ**, gây ra các vấn đề thực tế:

1. **Không phát hiện xung đột.** Người dùng đặt `Alt+T` cho trigger key trong plugin, trong khi `Alt+T` đã được Obsidian hoặc plugin khác chiếm. Không có cảnh báo nào; kết quả là một trong hai không chạy, và người dùng không biết tại sao.
2. **Người dùng tìm nhầm chỗ.** Trang Hotkeys của Obsidian là nơi ai cũng vào để xem phím tắt. Trigger key không xuất hiện ở đó.
3. **Bỏ qua `Scope` API của Obsidian.** Obsidian có sẵn cơ chế `Scope` cho phím tạm thời trong lúc một UI đang hiện — đúng bài toán này. Việc tự `addEventListener('keydown')` là đi ngược nền tảng và có nguy cơ bị bot review bắt.
4. **Tên command bị đóng băng theo ngôn ngữ.** `main.ts:160` gọi `t('command.translateSelection')` **tại thời điểm đăng ký**. Đổi `uiLanguage` trong settings không đổi tên command trong trang Hotkeys cho tới khi reload. Sau E4 với 8 locale thì lỗi này lộ rõ.

### Phương án đã chốt: **B**

| | A. Bỏ hẳn trigger key riêng | **B. Giữ, dùng `Scope` + phát hiện xung đột** | C. Giữ nguyên, chỉ thêm cảnh báo |
|---|---|---|---|
| Cách làm | Xoá `triggerHotkey`, chỉ còn command của Obsidian | Đăng ký `Scope` khi icon hiện, `popScope` khi ẩn; đọc hotkey đã đăng ký của Obsidian để cảnh báo trùng | Giữ `keydown` thủ công, thêm nhãn cảnh báo |
| Ưu | Ít code nhất | Giữ UX "chọn rồi bấm một phím", đúng nền tảng | Rẻ nhất |
| Nhược | Mất UX bare-key — điểm hay của plugin | Đọc hotkey Obsidian qua API không công khai | Không giải quyết gốc vấn đề |

**Ràng buộc kèm theo quyết định B:** phần đọc hotkey của Obsidian (`app.hotkeyManager`) là API **không công khai**, có thể vỡ khi Obsidian cập nhật. Bắt buộc bọc trong try/catch, và khi hỏng thì **chỉ mất tính năng cảnh báo trùng**, không được ảnh hưởng tới việc trigger key hoạt động. Ghi rõ ràng buộc này vào `CLAUDE.md` mục "cạm bẫy đã biết".

### Việc cụ thể

**E2-T1.** Chuyển `HotkeyManager` sang dùng `Scope` của Obsidian: `pushScope` khi icon/popup hiện, `popScope` khi ẩn. Giữ nguyên toàn bộ logic thuần (`matchesBinding`, `isBindingSafeFor`, `isBindingRisky`) và các test của nó — đây là phần đã viết tốt, chỉ đổi cách gắn vào nền tảng.

**E2-T2.** Kiểm xung đột trong `HotkeyRecorder`: khi người dùng ghi một tổ hợp, đối chiếu với hotkey Obsidian đang dùng; nếu trùng thì hiện cảnh báo ngay dưới ô ghi, nêu tên command bị trùng. **Cảnh báo, không chặn** — người dùng có thể cố ý, vì hai phím sống ở hai scope khác nhau.

**E2-T3.** Nút deep-link "Mở cài đặt phím tắt của Obsidian" trong settings tab, đặt cạnh ô ghi trigger key.

**E2-T4.** Giữ nguyên quy tắc an toàn hiện có: phím trơn (không modifier) bị cấm trong ngữ cảnh soạn thảo, vì nó sẽ chèn ký tự vào note. Đây là ràng buộc quan trọng nhất của module, **không được nới lỏng** kể cả khi chuyển sang `Scope`.

**E2-T5. Tên command giữ nguyên tiếng Anh** (theo quyết định 9).

Gỡ lời gọi `t()` ở `main.ts:160` và `:172`, thay bằng chuỗi tiếng Anh cố định. Xoá hai key `command.translateSelection` và `command.toggleAutoPopup` khỏi mọi catalogue.

Lý do chọn cách này thay vì hai cách còn lại:

| | Tên command tiếng Anh cố định | Đăng ký lại lúc runtime | Yêu cầu reload |
|---|---|---|---|
| Thao tác của người dùng | không | không | phải reload thủ công |
| Công sức code | **âm** (xoá code) | vừa, và là hành vi không chuẩn của Obsidian | ít, nhưng phải thêm chuỗi hướng dẫn vào 8 catalogue |
| Rủi ro | không | có, phụ thuộc hành vi nội bộ của `addCommand` | không |
| Đánh đổi | tên command không theo ngôn ngữ giao diện | — | — |

Đánh đổi duy nhất là tên command trong trang Hotkeys không dịch. Chấp nhận được: trang Hotkeys của Obsidian nhóm command theo tên plugin nên vẫn tìm thấy dễ, và phần lớn plugin cộng đồng cũng để tên command tiếng Anh. Bù lại nó **xoá hẳn** một class bug thay vì quản lý nó.

### AC

- Đặt trigger key trùng với một hotkey Obsidian đang dùng → hiện cảnh báo nêu rõ tên command bị trùng.
- Giả lập `app.hotkeyManager` không tồn tại → trigger key vẫn hoạt động bình thường, chỉ mất cảnh báo.
- Trigger key chỉ hoạt động khi icon/popup đang hiện; mọi lúc khác phím đó thuộc về Obsidian.
- Phím trơn trong Live Preview → vẫn bị chặn, không chèn ký tự vào note.
- Đổi ngôn ngữ giao diện → không cần reload cho bất kỳ chức năng nào liên quan tới command.
- Toàn bộ test hiện có của `HotkeyManager` vẫn xanh.
- Gỡ plugin → không còn scope nào bị đẩy vào stack của Obsidian (kiểm tra trong `onunload`).

---

## E3 — Refactor mô hình ngôn ngữ (nền tảng cho E4–E6)

### Vấn đề hiện tại

```ts
// types.ts
export type SourceLangCode = 'auto' | 'en' | 'es' | 'fr' | 'de' | 'ru' | 'vi';
export type TargetLangCode = 'vi' | 'en';   // chỉ 2 ngôn ngữ đích
```

`langMap.ts` là `Record<SourceLangCode, { google, deeplSource, deeplTarget }>`. Sau khi làm xong sẽ là 12 ngôn ngữ × 6 provider — bảng viết tay 12×7 thì sai sót gần như chắc chắn.

### E3-T1. Thay union bằng registry mô tả ngôn ngữ

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

Dropdown ngôn ngữ hiển thị `nativeName` — người chọn tiếng Nhật cần thấy 日本語, không phải "Japanese".

### E3-T2. Tách bảng mã theo provider

Mỗi provider tự khai `toProviderCode(code, role)` thay vì một bảng chung. Khác biệt giữa các dịch vụ lớn hơn nhiều so với giả định trong comment hiện tại:

| Ngôn ngữ | Google | DeepL (src / tgt) | Baidu | Youdao | Papago |
|---|---|---|---|---|---|
| Trung giản thể | `zh-CN` | `ZH` / `ZH-HANS` | `zh` | `zh-CHS` | `zh-CN` |
| Trung phồn thể | `zh-TW` | `ZH` / `ZH-HANT` | `cht` | `zh-CHT` | `zh-TW` |
| Nhật | `ja` | `JA` | `jp` | `ja` | `ja` |
| Ả Rập | `ar` | `AR` | `ara` | `ar` | *(không hỗ trợ)* |
| Ý | `it` | `IT` | `it` | `it` | `it` |
| Tây Ban Nha | `es` | `ES` | `spa` | `es` | `es` |
| Việt | `vi` | `VI` | `vie` | `vi` | `vi` |

> Bảng này là điểm khởi đầu, phải kiểm chứng lại với tài liệu API tại thời điểm làm.

### E3-T3. Sửa `normalizeDetectedLang()` — bug chặn tính năng tiếng Trung

```ts
// langMap.ts — hiện tại
const base = reported.trim().toLowerCase().split(/[-_]/)[0];  // 'zh-TW' → 'zh'
```

Cắt bỏ subtag khiến **giản thể và phồn thể không phân biệt được**. Đây là điều kiện chặn: không sửa cái này thì tính năng tiếng Trung không thể đúng.

Yêu cầu: giữ script subtag cho nhóm `zh`. Map `zh-CN` / `zh-Hans` / `zh-SG` / `zh` → `zh-Hans`; `zh-TW` / `zh-HK` / `zh-MO` / `zh-Hant` → `zh-Hant`. Với các ngôn ngữ khác giữ nguyên hành vi cắt region hiện tại.

### E3-T4. Ma trận hỗ trợ provider × cặp ngôn ngữ

`TranslationProvider.supports()` phải trả lời **đúng** để UI hiện lỗi `unsupported-pair` **trước khi** gọi mạng — ví dụ Papago không có tiếng Ả Rập. Hiện `supports()` chỉ kiểm sơ sài.

### E3-T5. Gỡ tiếng Nga + migration settings

**Gỡ `ru`** (quyết định 8) khỏi `SourceLangCode`, `langMap.ts` và dropdown ngôn ngữ nguồn. Đây là **thay đổi phá vỡ tương thích duy nhất mà người dùng nhìn thấy trực tiếp** trong toàn bộ kế hoạch, nên phải xử lý tử tế chứ không xoá lặng lẽ:

- Người dùng đang đặt `sourceLang: 'ru'` → migration chuyển về `'auto'`. Chọn `auto` chứ không phải `en` vì `auto` vẫn dịch được văn bản tiếng Nga; chỉ là mất khả năng ép cứng ngôn ngữ nguồn.
- Hiển thị một `Notice` **một lần duy nhất** khi migration chạy, giải thích ngắn gọn. Không lặp lại ở lần khởi động sau.
- Ghi vào CHANGELOG mục `Removed`, và nêu rõ trong phần Breaking.
- Cache LRU có thể chứa entry với key chứa `ru` → invalidate cache khi `schemaVersion` tăng, thay vì lọc từng entry.

**Migration chung.** `data.json` của người dùng 0.2.2 chứa `sourceLang: 'en'`, `targetLang: 'vi'`. Thêm trường `schemaVersion` và hàm `migrate()`. Mọi giá trị cũ phải map sang code mới không mất mát; giá trị không nhận ra thì rơi về mặc định chứ không làm hỏng việc load settings.

### AC
- Thêm một ngôn ngữ mới = sửa **1 file** (`languages.ts`) + 1 dòng mỗi provider map.
- Test: mọi ngôn ngữ `asSource` có mã hợp lệ ở ≥ 1 provider; mọi cặp mà `supports()` trả `true` đều có mã ở cả hai đầu.
- Test: `normalizeDetectedLang('zh-TW')` → `'zh-Hant'`, `normalizeDetectedLang('zh-CN')` → `'zh-Hans'`.
- Test migration: load `data.json` phiên bản 0.2.2 → không mất setting nào.

---

## E4 — Giao diện 8 locale + RTL

### E4-T1. Mở rộng catalogue

`Locale = 'en' | 'vi'` → `'en' | 'vi' | 'zh-Hant' | 'zh-Hans' | 'es' | 'ja' | 'it' | 'ar'`. 134 key × 8 = **1.072 chuỗi**.

Thứ tự làm: `en` (chuẩn) → `zh-Hant` → `zh-Hans` (phái sinh từ `zh-Hant`, xem lưu ý ở đầu tài liệu) → còn lại. Hai catalogue Trung làm liền nhau để thuật ngữ nhất quán giữa chúng.

- English là nguồn chân lý. Mỗi catalogue khác phải có **đúng** tập key của `en` — không thừa, không thiếu.
- Chuỗi thiếu → fallback về `en`. Hiện `t()` đang `return key`, tức hiện `error.somethingNew` ra màn hình. Sửa thành fallback, giữ `warnOnce` để vẫn phát hiện được.
- Placeholder `{name}` phải khớp giữa mọi catalogue (test tự động parse bằng regex).

### E4-T2. Chuẩn chất lượng bản dịch (theo quyết định 3)

Đây là yêu cầu chất lượng, không phải yêu cầu chức năng, nên phải viết ra thành tiêu chí kiểm được:

1. **Bám thuật ngữ chính thức của Obsidian trong từng ngôn ngữ.** Các khái niệm dùng chung với Obsidian — "settings", "hotkeys", "reading view", "live preview", "command palette" — phải dùng **đúng từ mà bản địa hoá chính thức của Obsidian đang dùng** ở ngôn ngữ đó. Người dùng đang ở trong Obsidian; plugin dùng từ khác sẽ đọc như ghép từ hai phần mềm.
2. **Dịch ý, không dịch chữ.** Cấm dịch bám cấu trúc câu tiếng Anh. Ví dụ tiếng Nhật không viết câu bị động dài như tiếng Anh; tiếng Việt không cần chủ ngữ "bạn" ở mọi câu.
3. **Đúng độ dài cho vị trí hiển thị.** Nhãn setting phải ngắn. Tiếng Đức/Tây Ban Nha dài hơn tiếng Anh 20–30%; tiếng Nhật/Trung ngắn hơn nhiều. Chuỗi vượt khung là lỗi, không phải chuyện nhỏ.
4. **Bảng thuật ngữ khoá cứng.** Trước khi dịch, lập `docs/GLOSSARY.md`: mỗi thuật ngữ cốt lõi (selection, provider, phonetic, part of speech, dictionary, trigger, popup, cache) có **một** bản dịch cố định cho mỗi ngôn ngữ. Không được dịch cùng một từ hai cách ở hai chỗ.
5. **Ngữ điệu nhất quán:** trung tính, ngắn, hướng dẫn trực tiếp. Không cảm thán, không emoji, không "Hãy…" thừa. Câu lỗi phải nói người dùng làm gì tiếp theo.
6. **Kiểm tra "có mùi máy dịch" không:** đọc to từng chuỗi. Dấu hiệu cần sửa: lặp cấu trúc "Cho phép bạn…", dịch nguyên xi thành ngữ tiếng Anh, thừa liên từ, dùng đại từ ngôi hai ở nơi ngôn ngữ đó thường lược bỏ.
7. **Chữ số và ngày tháng qua `Intl`**, không tự nối chuỗi.

**AC:** mỗi locale có một lượt đọc soát riêng, ghi lại trong PR là đã soát; `docs/GLOSSARY.md` tồn tại và bản dịch không mâu thuẫn với nó.

### E4-T3. `resolveLocale()` phải map được locale của Obsidian

Hiện chỉ kiểm `startsWith('vi')`. Obsidian lưu trong `localStorage.language` các giá trị như `zh`, `zh-TW`, `ja`, `es`, `it`, `ar`, `vi`. Cần bảng map rõ ràng + thứ tự fallback: khớp chính xác → khớp theo ngôn ngữ gốc → `en`.

**Map cho tiếng Trung** (nay đã có cả hai catalogue):

| Giá trị Obsidian | Locale plugin |
|---|---|
| `zh` | `zh-Hans` — Obsidian dùng `zh` trần cho **giản thể** |
| `zh-TW` | `zh-Hant` |
| `zh-HK`, `zh-MO`, `zh-Hant`, biến thể `zh-*` không nhận ra | `zh-Hant` |

Dòng cuối là chỗ quyết định 1 phát huy tác dụng: khi không chắc, nghiêng về **phồn thể** vì đó là bản Trung chuẩn của dự án.

Setting `uiLanguage` do người dùng chọn tay luôn thắng phép tự động này. Dropdown phải liệt kê **cả hai** biến thể Trung riêng biệt (`繁體中文` và `简体中文`), không gộp thành một mục "Chinese".

### E4-T4. RTL

Yêu cầu "hỗ trợ RTL mặc định của Obsidian" tách thành 3 việc khác nhau, dễ nhầm là một:

1. **Chrome của plugin theo UI locale.** UI là `ar` → popup và settings phải RTL. Obsidian đặt class `mod-rtl` trên `body`; bám theo đó. `styles.css` chuyển sang **logical properties**: `padding-inline-start`, `inset-inline-start`, `margin-inline-end` thay cho `left`/`right`.
2. **Nội dung theo ngôn ngữ của chính đoạn text.** Phần dễ bỏ sót nhất: UI tiếng Anh nhưng dịch **sang** tiếng Ả Rập → khối kết quả phải `dir="rtl"` trong khi nhãn và footer vẫn LTR. Đặt `dir` trên **từng khối nội dung**, không đặt trên cả popup.
3. **Placement phải soi gương.** `DEFAULT_PLACEMENT_ORDER` chứa `right-of-end` và `left-of-start`; trong RTL, "end" của selection nằm bên trái. `computeCandidate()` phải nhận `dir` và đảo `anchorRect.right` ↔ `anchorRect.left`.

Thêm: `--st-font-family` cần fallback cho chữ Ả Rập, CJK và Kana, nếu không sẽ ra ô vuông trên một số hệ.

### AC
- Test parity 8 catalogue (key set + placeholder set).
- Test `resolveLocale` với ≥ 12 giá trị đầu vào, gồm cả giá trị rác.
- Test `computeCandidate` với `dir: 'rtl'`: `right-of-end` cho ra rect nằm bên trái.
- Kiểm thủ công: bật giao diện tiếng Ả Rập của Obsidian → không phần tử nào của plugin bị lệch hoặc tràn.
- Kiểm thủ công: giao diện tiếng Anh, dịch en → ar, khối kết quả căn phải, nhãn vẫn căn trái.

---

## E5 — Thêm Baidu Fanyi, Youdao, Papago

### Ràng buộc kỹ thuật (phần khó nhất)

| | Baidu Fanyi | Youdao | Papago (NAVER Cloud) |
|---|---|---|---|
| Host | `fanyi-api.baidu.com` | `openapi.youdao.com` | `naveropenapi.apigw.ntruss.com` |
| Credential | `appid` + `secret` | `appKey` + `appSecret` | `client_id` + `client_secret` |
| Ký request | `MD5(appid + q + salt + secret)` | `SHA256(appKey + truncate(q) + salt + curtime + appSecret)` | không ký; header `X-NCP-APIGW-API-KEY-ID` / `-KEY` |
| Báo lỗi | **HTTP 200 + `error_code` trong body** | HTTP 200 + `errorCode` | HTTP status chuẩn |
| Giới hạn | ~6000 byte | ~5000 ký tự | 5000 ký tự |

**Hai điểm dễ bị đánh giá thấp công sức:**

1. **MD5 cho Baidu.** `crypto.subtle` của trình duyệt **không có MD5**, và plugin đặt `isDesktopOnly: false` nên không được dùng module Node. → phải viết MD5 thuần TS (~100 dòng) trong `src/utils/`, kèm test vector chuẩn RFC 1321.
2. **Quy tắc `truncate` của Youdao:** nếu `q` dài hơn 20 ký tự thì lấy `10 ký tự đầu + độ dài + 10 ký tự cuối`, ngược lại lấy nguyên chuỗi. Sai quy tắc này thì **luôn** lỗi chữ ký, và thông báo lỗi trả về không nói rõ nguyên nhân. Bắt buộc có unit test riêng cho hàm này.

### Yêu cầu cụ thể khác

- Tất cả đi qua `providers/http.ts` (`requestUrl`) — hiện đã đúng, giữ nguyên vì lý do CORS và mobile.
- Mở rộng mapping `ProviderErrorCode`: hiện map theo HTTP status; Baidu/Youdao phải map theo **mã lỗi trong body** (`52001` timeout, `54003` rate limit, `54004` hết số dư, `58001` cặp ngôn ngữ không hỗ trợ…).
- `ProviderRegistry` hiện khởi tạo eager `Record<ProviderId, …>` 3 phần tử → mở lên 6, đồng thời bổ sung metadata: `requiresApiKey`, `supportsDictionary`, `supportsPhonetic`, `maxChars`.
- `SettingTab.ts` phải tách **trước** khi thêm (E0-T3).
- **Bắt buộc cập nhật cùng PR** (theo quy tắc R2, và nếu không sẽ trượt review): README mục *Network use* thêm 3 host; `docs/PRIVACY.md` nêu rõ 3 cặp credential mới lưu plaintext ở `.obsidian/plugins/selection-translate/data.json`; `docs/API-SETUP.md` thêm hướng dẫn lấy key.
- Key/secret **không bao giờ** xuất hiện trong `ProviderError.message`, log, hay `ValidationResult.vars` — quy tắc đã ghi trong `TranslationProvider.ts`, phải giữ cho provider mới.

### AC
- Mỗi provider có: fixture response OK, fixture lỗi auth, fixture lỗi quota, fixture body dị dạng — giống bộ fixture đang có cho DeepL/Google.
- Nút "test connection" hoạt động cho cả 6 provider.
- Test chữ ký với vector cố định (input, salt, curtime đã biết) → chuỗi sign khớp giá trị kỳ vọng.
- Chọn cặp ngôn ngữ mà provider không hỗ trợ → hiện lỗi `unsupported-pair` **không gọi mạng**.

---

## E6 — Phiên âm hiển thị có điều kiện

### Hiện trạng
`src/ui/PopupContent.ts:68-70` (tách khỏi `TranslatePopup` ở E0; E1 không chạm file này) render bất cứ khi nào `result.phonetic != null`, và **luôn** bọc trong dấu gạch chéo `/…/`. Điều đó sai với romanization: pinyin và romaji không phải IPA, bọc trong `/…/` là sai quy ước ngôn ngữ học.

### Yêu cầu cụ thể
- Thêm `phoneticKind: 'ipa' | 'romanization' | 'none'` vào `ProviderResponse` và `TranslationResult`.
- Quyết định `kind` theo **ngôn ngữ nguồn đã phát hiện**, lấy từ `LanguageDescriptor.phonetic` (E3), không theo provider.
- Bảng chốt: `en` → ipa (từ dictionaryapi.dev) · `ja` → romanization (romaji) · `zh-Hans` / `zh-Hant` → romanization (pinyin) · `ar` → romanization (chuyển tự) · `vi`, `es`, `it`, `fr`, `de` → none. (`ru` đã gỡ ở E3-T5.)
- Hiển thị: `ipa` → `/phonetic/`; `romanization` → hiển thị trần hoặc trong ngoặc đơn, class CSS riêng; `none` → **không render khối phiên âm, và không để lại khoảng trắng thừa** trong layout.
- Chuỗi rỗng hoặc chỉ khoảng trắng cũng coi như `none`.
- Liên quan: nút TTS nên **tắt** (không phải ẩn) với ngôn ngữ mà engine đang chọn không đọc được — bấm rồi im lặng là trải nghiệm tệ hơn nút mờ.

### AC
- Response `gtx` cho `ja→vi` có trường `rm` → popup hiện romaji, không có dấu `/`.
- `vi→en` không hiện khối phiên âm; layout không có node rỗng.
- `en→vi` vẫn hiện IPA như hiện tại (không hồi quy).
- `zh-Hant→vi` hiện pinyin.

---

## E7 — Tài liệu

### E7-T1. Sửa nội dung cho đúng dự án

| File | Việc cụ thể |
|---|---|
| `README.md` | Mục *Network use* liệt kê **đủ 9 host** sau E5. Ghi rõ endpoint Google free là không chính thức (theo E0-T5). Ghi rõ key lưu plaintext ở `data.json`. Thay ảnh placeholder bằng ảnh thật. |
| `docs/API-SETUP.md` | Thêm 3 nhà cung cấp, ảnh chụp nơi lấy key, hạn mức miễn phí của từng bên |
| `docs/ARCHITECTURE.md` | Vẽ lại sau E0 + E3 — sơ đồ tầng hiện tại sẽ lỗi thời |
| `docs/CONTRIBUTING.md` | Rà lại: lệnh build/test, quy ước commit, playbook thêm provider/ngôn ngữ (đồng bộ với `CLAUDE.md`) |
| `docs/INSTALL.md` | Bổ sung đường cài qua BRAT cho bản beta |
| `docs/PRIVACY.md` | Liệt kê chính xác dữ liệu gửi đi cho **từng** provider (văn bản chọn, cặp ngôn ngữ, credential), nơi lưu, cách xoá |

### E7-T2. Cấu trúc bản dịch

- Bố cục: `docs/i18n/<locale>/<FILE>.md`; giữ `README.md` ở root cho GitHub, có bảng link ngôn ngữ ngay đầu file.
- **English là nguồn chân lý.** Bản dịch không được chứa thông tin mà bản English không có.
- Mỗi file dịch có front-matter `source-commit: <sha>`. CI **cảnh báo** (không fail) khi bản English đổi mà bản dịch chưa cập nhật.
- Áp dụng đúng chuẩn chất lượng ở E4-T2 — tài liệu cũng phải đọc như người bản ngữ viết, không phải bản dịch.

### E7-T3. Phạm vi dịch

Theo quyết định 10:

| Nhóm | File | Dịch cho |
|---|---|---|
| **Dịch** | `README.md`, `docs/INSTALL.md`, `docs/API-SETUP.md` | 7 locale ngoài English |
| Chỉ English | `docs/PRIVACY.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `docs/SUBMISSION.md` | — |

Khối lượng: **21 file dịch** (3 × 7).

Lựa chọn này hợp lý về đối tượng đọc: README và INSTALL là thứ người dùng gặp đầu tiên, API-SETUP là thứ họ phải làm theo từng bước — ba file mà đọc sai ngôn ngữ sẽ chặn người dùng ngay. ARCHITECTURE và CONTRIBUTING phục vụ lập trình viên, vốn quen đọc tiếng Anh.

> **Một lưu ý về `PRIVACY.md`:** đây là file duy nhất trong nhóm "chỉ English" mà người dùng cuối có lý do chính đáng để đọc — nó nói dữ liệu của họ đi đâu. Đề xuất bù lại bằng cách đưa một đoạn tóm tắt quyền riêng tư **3–4 câu ngay trong README** (phần này thì có dịch), rồi link sang bản đầy đủ tiếng Anh. Cách này giữ đúng phạm vi đã chốt mà không để người dùng không đọc được tiếng Anh mù thông tin về dữ liệu của chính họ.

### AC
- Không link chết (CI check).
- Danh sách host trong README khớp **chính xác** với host thực sự được gọi trong `src/providers/**` và `src/tts/**` — có test grep đối chiếu. Đây là mục reviewer hay bắt nhất.
- Mỗi file dịch có `source-commit` trỏ đúng commit của bản English tương ứng.

---

## Quản lý phiên bản

### Ràng buộc từ Obsidian (không thương lượng được)

- Tag = đúng `manifest.version`, **không có tiền tố `v`** (`release.yml` đã ép đúng).
- Release phải đính **file rời** `main.js`, `manifest.json`, `styles.css` — không zip.
- `versions.json` chỉ thêm entry khi `minAppVersion` đổi; mọi version phải có mặt.
- Mỗi lần bị từ chối review = tốn một version mới → **không submit khi checklist chưa xanh hết**.

### SemVer — quy tắc quyết định `X.Y.Z`

| Loại thay đổi | Bump | Ví dụ trong dự án này |
|---|---|---|
| Sửa lỗi, không đổi hành vi công khai | **PATCH** (`0.2.2 → 0.2.3`) | E0 (sửa lint, tái cấu trúc nội bộ), E1 nếu không đổi setting |
| Thêm tính năng, tương thích ngược | **MINOR** (`0.3.0 → 0.4.0`) | E2, E5, E6 |
| Thay đổi phá vỡ tương thích | **MAJOR** — nhưng ở giai đoạn `0.x` thì **dồn vào MINOR** (SemVer §4) | E3 (đổi schema settings) → `0.4.0`, không phải `1.0.0` |
| Lên `1.0.0` | khi được duyệt vào community store | — |

Từ `1.0.0` trở đi, mọi thay đổi phá vỡ tương thích mới bump MAJOR. Trước đó, nêu rõ "Breaking" trong CHANGELOG là đủ.

**Tái cấu trúc thuần tuý là PATCH.** Nếu E0 chỉ dời file và tách class mà không đổi hành vi thì đó là `0.2.3`, dù số dòng thay đổi rất lớn. SemVer đo giao diện công khai, không đo công sức.

### Conventional Commits

Repo đã dùng đúng (`feat:`, `fix:`, `docs:`, `chore(release):`). Chuẩn hoá đầy đủ:

| Type | Dùng khi | Ảnh hưởng version |
|---|---|---|
| `feat` | thêm tính năng người dùng thấy được | MINOR |
| `fix` | sửa lỗi | PATCH |
| `refactor` | đổi cấu trúc, không đổi hành vi | PATCH |
| `perf` | cải thiện hiệu năng | PATCH |
| `docs` | chỉ tài liệu | không |
| `test` | chỉ test | không |
| `build` / `ci` | toolchain, workflow | không |
| `style` | định dạng code | không |
| `chore` | việc vặt còn lại | không |
| `revert` | hoàn tác | tuỳ commit bị hoàn tác |

Footer `BREAKING CHANGE:` cho mọi thay đổi phá vỡ tương thích, kể cả ở `0.x`.

**Scope bắt buộc theo epic:** `fix(ui):`, `feat(hotkey):`, `refactor(lang):`, `feat(provider):`, `feat(i18n):`, `docs(i18n):`.

### Nhánh

- `main` được bảo vệ, không push trực tiếp. Merge qua PR với CI xanh (`npm run verify`).
- Nhánh ngắn hạn theo task: `refactor/e0-split-uicontroller`, `fix/e1-content-boundary`, `feat/e2-hotkey-scope`. Sống ≤ 1 tuần, **squash merge** để lịch sử `main` là một commit một thay đổi.
- **Không** duy trì nhánh dài hạn song song. Repo một người; nhánh dài hạn chỉ tạo xung đột.
- Nếu một epic chưa xong mà cần release epic khác: dùng **feature flag** trong settings (ví dụ `experimentalProviders: false`) chứ không phải nhánh riêng.

### Hotfix

Khi có lỗi nghiêm trọng trên bản đã phát hành trong lúc `main` đang dở dang một epic:

1. Tạo `hotfix/0.3.1` **từ tag `0.3.0`**, không từ `main`.
2. Sửa tối thiểu, chỉ đúng lỗi đó.
3. Bump PATCH, tag `0.3.1`, release.
4. Merge ngược `hotfix/0.3.1` vào `main` (hoặc cherry-pick nếu đã xung đột nặng).

Bước 4 là bước hay bị quên, và hậu quả là lỗi tái xuất hiện ở bản kế tiếp.

### Lộ trình phát hành

| Version | Nội dung | Cổng ra |
|---|---|---|
| `0.2.3` | E0 (audit + tái cấu trúc + sửa finding lint) + E8 (`CLAUDE.md`) | `verify` xanh với `eslint-plugin-obsidianmd` mới nhất; không đổi hành vi người dùng |
| `0.3.0` | E1 (sửa lòi popup) + E2 (đồng bộ trigger key) | Ma trận test thủ công đầy đủ; kịch bản trong ảnh không tái hiện |
| `0.4.0` | E3 + E4 (registry ngôn ngữ, 8 locale, RTL). **Breaking**: schema settings + gỡ tiếng Nga | Test migration từ 0.3.0 (gồm ca `sourceLang: 'ru'`); beta ≥ 1 vòng qua BRAT |
| `0.5.0` | E5 + E6 (3 provider mới, phiên âm có điều kiện) | Test chữ ký; fixture đủ 6 provider; README/PRIVACY đã cập nhật |
| `0.6.0` | E7 (tài liệu + bản dịch) | Không link chết; danh sách host khớp code |
| `1.0.0` | Submit community store | 100% `docs/SUBMISSION.md` |

### Beta

- Dùng **BRAT**: đặt `manifest.version` dạng `0.4.0-beta.1`, tag tương ứng. Obsidian updater bỏ qua tag prerelease, BRAT vẫn cài được → thử nghiệm mà không ảnh hưởng người dùng chính thức.
- Với `0.4.0` (đổi schema): beta là **bắt buộc**, ít nhất một vòng. Lỗi migration làm mất setting là không hồi phục được.

### CHANGELOG

Theo **Keep a Changelog**: nhóm `Added` / `Changed` / `Fixed` / `Removed` / `Security`. Sinh nháp từ Conventional Commits, nhưng phần `Changed` mang tính phá vỡ tương thích thì **viết tay** — người đọc CHANGELOG cần biết họ phải làm gì, không cần biết tên commit.

### Definition of Done (áp dụng cho mọi PR)

`npm run verify` xanh · có test cho logic mới · không tăng LOC của 4 file lớn nhất trừ khi có lý do ghi trong PR · tài liệu liên quan cập nhật **cùng PR** (quy tắc R2) · `CLAUDE.md` đã được rà và cập nhật nếu cần (quy tắc R1) · CHANGELOG có entry · mọi thay đổi lệch khỏi tài liệu này đã được hỏi và đồng ý trước (quy tắc R3).

---

## Trạng thái kế hoạch

**Kế hoạch đã chốt.** Toàn bộ 10 câu hỏi mở đã có quyết định (bảng đầu tài liệu).

### Tiến độ

| Epic | Milestone | Trạng thái |
|---|---|---|
| **E0** — Audit, review, tái cấu trúc | `0.2.3` | ✅ **Xong** (2026-08-12) — xem [Kết quả thực hiện](#kết-quả-thực-hiện-e0) |
| **E8** — `CLAUDE.md` | `0.2.3` | ✅ **Xong** (2026-08-12) — xem [Kết quả thực hiện](#kết-quả-thực-hiện-e8) |
| **E1** — Popup lòi ra mép trên | `0.3.0` | ✅ **Xong** (2026-08-12), trừ ma trận test thủ công — xem [Kết quả thực hiện](#kết-quả-thực-hiện-e1) |
| **E2** — Đồng bộ trigger key | `0.3.0` | ⏭️ **Tiếp theo** |
| E3 — Registry ngôn ngữ | `0.4.0` | Chưa bắt đầu |
| E4 — 8 locale + RTL | `0.4.0` | Chưa bắt đầu |
| E5 — 3 provider mới | `0.5.0` | Chưa bắt đầu |
| E6 — Phiên âm có điều kiện | `0.5.0` | Chưa bắt đầu |
| E7 — Tài liệu | `0.6.0` | Chưa bắt đầu |

Ba điểm sẽ chỉ lộ ra trong lúc làm và **phải hỏi trước khi tự quyết** (quy tắc R3):

1. ~~**Kết quả `/code-review` ở E0** có thể cho thấy phạm vi tái cấu trúc lớn hơn 4 file đã liệt kê.~~ **Đã giải quyết ở E0:** phạm vi thực tế hoá ra *nhỏ hơn* dự kiến chứ không lớn hơn — audit đề nghị 3 file, chủ dự án duyệt giữ đủ 4.
2. **Bảng mã ngôn ngữ ở E3-T2** là điểm khởi đầu dựng từ tài liệu API. Nếu thực tế khác (đặc biệt phần `zh` của DeepL và Youdao), báo lại trước khi sửa bảng.
3. **`app.hotkeyManager` ở E2-T2** là API không công khai. Nếu hình dạng của nó khác dự kiến hoặc không truy cập được, báo lại thay vì tự tìm đường vòng.

### Việc tiếp theo

**Hai việc, theo thứ tự này.**

1. **Chạy ma trận test thủ công của E1** — mục còn hở duy nhất của epic vừa xong, và là cổng ra của `0.3.0`. Danh sách ô, cách dựng bản build vào vault, và *điều cụ thể phải nhìn* ở bốn ô đáng ngờ nhất nằm ở [Kết quả thực hiện (E1)](#kết-quả-thực-hiện-e1). Việc này cần người ngồi trước Obsidian; không phiên nào tự làm thay được.
2. **E2 — đồng bộ trigger key với Hotkeys của Obsidian** (`0.3.0`). Prompt chi tiết soạn sẵn tại [`docs/prompts/PROMPT-E2.md`](prompts/PROMPT-E2.md), mang theo ngữ cảnh vừa học ở E1.

Khác với E0 và E8: E1 và E2 **đều** đổi hành vi người dùng, nên là **MINOR** (`0.3.0`), không phải PATCH. Cả hai đi chung một lần phát hành, nên **bump version là việc làm sau khi E2 xong**, không phải bây giờ.

Sau E1 là **E2** (cùng milestone `0.3.0`).

> `CLAUDE.md` ở root là tài liệu bắt buộc đọc khi mở phiên mới, và cập nhật nó là một phần Definition of Done của mọi epic từ đây trở đi (quy tắc R1).
