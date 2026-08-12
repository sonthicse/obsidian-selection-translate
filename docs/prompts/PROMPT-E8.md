Đọc `docs/DEV-PLAN.md` trong repo này. Đó là đặc tả và kế hoạch phát triển đã được chốt cho plugin Selection Translate. Đọc **toàn bộ** trước khi làm bất cứ việc gì, kể cả các mục không thuộc phạm vi lần này — vì `CLAUDE.md` phải mô tả đúng cả những ràng buộc mà E1–E7 sẽ dựa vào.

Đọc thêm hai tài liệu do E0 sinh ra, vì phần lớn nội dung `CLAUDE.md` lấy từ đó:

- `docs/REVIEW-FINDINGS.md` — kết luận về nguyên nhân thất bại automated check
- `docs/CODE-REVIEW.md` — 5 trục review và quyết định phạm vi tái cấu trúc

Nhiệm vụ lần này: **thực hiện E8 — viết `CLAUDE.md`**. Chỉ E8. Không làm E1, E2 hay bất kỳ epic nào khác, kể cả khi thấy lỗi rõ ràng thuộc epic đó — ghi lại vào `docs/CODE-REVIEW.md` rồi để đấy.

---

## Ràng buộc bắt buộc

**Không tự ý lệch kế hoạch (R3).** Nếu trong lúc làm phát hiện cần làm khác với `docs/DEV-PLAN.md` — đổi cách tiếp cận, mở rộng hoặc thu hẹp phạm vi, đổi cấu trúc thư mục, hoặc thấy kế hoạch sai — thì **dừng lại, trình bày vấn đề, chờ tôi đồng ý**. Áp dụng cả với thay đổi trông nhỏ và hiển nhiên đúng.

**E8 không đụng vào `src/`.** Đây là task tài liệu. Nếu trong lúc viết playbook mà phát hiện code cần sửa, ghi lại, đừng sửa.

**Trước mỗi commit:** `npm run verify` phải xanh.

**Không bịa.** Mọi đường dẫn file, tên hàm, số dòng, tên lệnh viết vào `CLAUDE.md` phải được mở ra kiểm chứng trước khi viết. Một `CLAUDE.md` sai còn tệ hơn không có — đó chính là lý do tồn tại của quy tắc R1.

---

## Bối cảnh từ E0 — đọc kỹ, đây là thứ phải viết vào `CLAUDE.md`

E0 vừa xong ở version `0.2.3`. Bốn thứ dưới đây **mới**, không có trong bản đặc tả gốc của E8, và đều phải phản ánh vào `CLAUDE.md`.

### 1. Cấu trúc thư mục đã đổi

Bốn file lớn đã được tách. Bản đồ tầng trong `CLAUDE.md` phải mô tả **trạng thái sau tái cấu trúc**, không phải trạng thái trong đặc tả gốc:

```
src/ui/
  UiController.ts     (687)  điều phối: state machine, placement search, dismiss
  FloatingLayer.ts    (70)   ⟵ MỚI. Sở hữu icon + popup; mọi câu hỏi hình học
  TranslatePopup.ts   (367)  vòng đời element, đo kích thước, animation grow
  PopupContent.ts     (239)  ⟵ MỚI. Dựng nội dung kết quả/lỗi
  TriggerIcon.ts, Positioner.ts, icons.ts

src/core/
  SelectionManager.ts (479)  sự kiện DOM, snapshot, nguồn selection
  SelectionRules.ts   (117)  ⟵ MỚI. Bộ luật thuần, có 17 test
  ContextDetector.ts, StateMachine.ts, TranslationOrchestrator.ts, LruCache.ts, TextNormalizer.ts, HotkeyManager.ts

src/settings/
  SettingTab.ts       (95)   chỉ còn: thứ tự section + điểm ghi settings duy nhất
  sections/           ⟵ MỚI. context.ts, language.ts, provider.ts, activation.ts,
                              scope.ts, appearance.ts, advanced.ts, speech.ts
  settings.ts, HotkeyRecorder.ts
```

Tổng: **53 file TS**, 7 609 LOC, **17 file test**, **314 test**, **132 chuỗi UI**.

### 2. Nguyên nhân thất bại automated check — đã có kết luận

Đây là câu hỏi mở suốt từ đầu dự án, nay đã đóng. `CLAUDE.md` mục "quy trình release + checklist submit" phải ghi lại **bài học**, không chỉ ghi kết quả:

- **Nguyên nhân là H3: release `0.1.1` có 0 asset.** Cổng submit bắt buộc `main.js` + `manifest.json` là asset rời; thiếu là trượt ngay, trước mọi câu hỏi về code.
- **Nguyên nhân thứ hai, độc lập:** CI của repo khi đó chưa cài `eslint-plugin-obsidianmd` và dùng preset TypeScript không type-aware, nên một batch finding lọt qua `npm run lint` sạch. Cả hai đã sửa xong.
- **Bài học cho `CLAUDE.md`:** cổng submit đọc `manifest.json` ở **nhánh mặc định** nhưng đọc file build ở **release** — hai nơi khác nhau. Và mỗi vòng sửa là một **version mới**, không phải một push mới.

### 3. Cạm bẫy mới phát hiện ở E0 — không có trong danh sách mục 6 của kế hoạch

Đưa cả bốn vào mục "cạm bẫy đã biết", ghi rõ đây là phát hiện từ E0:

- **`obsidianmd/no-static-styles-assignment` chỉ bắt giá trị literal.** `el.style.left = \`${x}px\`` (template literal có expression) **không** bị bắt; `el.style.height = 'auto'` thì bị. Đừng tưởng lint sạch nghĩa là không gán style — và cũng đừng đi chuyển toạ độ runtime sang custom property vì tưởng nó vi phạm.
- **`registerDomEvent` không dùng được cho listener theo phiên.** Obsidian chỉ giải phóng chúng khi **toàn bộ plugin** unload, nên một phiên mở/đóng popout nhiều lần sẽ tích luỹ đăng ký trên document đã chết. `SelectionManager` cố ý tự `addEventListener` và tự track teardown, gắn vào `this.register()` trong `main.ts` — lý do ghi ở `src/core/SelectionManager.ts:154-159`. **Đừng "sửa" chỗ này.**
- **`/code-review` review diff, không review thư mục.** Nếu nhánh sạch, nó chọn commit cuối làm phạm vi. Muốn phủ rộng phải chỉ định phạm vi rõ hoặc tự đọc.
- **5 warning lint còn lại là cố ý**, thuộc 4 nhóm đã ghi ở `docs/SUBMISSION.md`. Ba nhóm là API mới hơn `minAppVersion: 1.5.0`; nhóm thứ tư (`no-global-this` trong `utils/debounce.ts`) có lý do kỹ thuật riêng. Đừng "dọn" chúng — `setDestructive()` gọi ở 1.5.0 sẽ ném lỗi ngay lúc dựng pane tuỳ chọn. `npm run lint` phải là **0 error**; số warning là 5.

### 4. Cổng CI mới

`npm run verify` nay có thêm 4 cổng, phải mô tả trong mục "Lệnh":

- **Ranh giới tầng** qua `no-restricted-imports` trong `eslint.config.mjs`: `providers/**` cấm import `ui|selection|core`; `ui/**` cấm import `providers`.
- **Key-parity + placeholder-parity i18n** trong `scripts/check-guidelines.mjs`.
- **Đối chiếu host README ↔ `src/`**, hai chiều.
- **Link chết trong `docs/`**.

---

## Việc cụ thể

Chạy `/init` để sinh khung, sau đó bổ sung thủ công. `CLAUDE.md` phải có **đủ 8 mục** dưới đây và **3 quy tắc** ở cuối.

### 8 mục nội dung

1. **Plugin làm gì, cho ai** — 3 câu.

2. **Bản đồ tầng:** `selection/` → `core/` → `providers/` → `ui/`, kèm quy tắc bất biến: **UI không biết provider nào trả lời, provider không thấy DOM**. Ghi rõ file nào thuộc tầng nào — dùng cấu trúc ở mục 1 phần bối cảnh trên. Nêu rõ bất biến này **nay đã được CI ép**, không còn dựa vào kỷ luật.

3. **Lệnh:** `npm run dev | build | test | lint | check | verify`. Nhấn mạnh `verify` là cổng bắt buộc trước mọi commit, và liệt kê 4 cổng mới ở mục 4 phần bối cảnh.

4. **Quy ước code:** tab thay space; comment giải thích **tại sao** chứ không phải cái gì — *phong cách này là tài sản của dự án, khi dời code thì comment đi cùng code, không viết lại, không rút gọn*; sentence case cho chuỗi UI; cấm `innerHTML`/`outerHTML`/`insertAdjacentHTML`; bắt buộc `requestUrl` thay `fetch`; không gán style tĩnh trong JS, dùng CSS custom property (kèm cảnh báo ở cạm bẫy 1 rằng rule chỉ bắt literal).

5. **Playbook — phần giá trị nhất.** Mỗi playbook là danh sách file **theo thứ tự phải sửa**, kiểm chứng bằng cách mở từng file:
   - *Thêm một ngôn ngữ mới*
   - *Thêm một provider mới* — kèm bộ fixture tối thiểu phải có
   - *Thêm một chuỗi UI mới* — `en.ts` trước, rồi các catalogue còn lại, chạy test parity
   - *Thêm một setting mới* — **mới, không có trong kế hoạch gốc**: sau khi tách `sections/`, luồng là `settings.ts` (kiểu + mặc định) → `sections/<đúng section>.ts` → `en.ts` + `vi.ts`. Đáng viết ra vì đường đi đã đổi ở E0.

6. **Cạm bẫy đã biết.** Bốn cái trong kế hoạch gốc:
   - selection snapshot phải chụp **trước** khi click (lý do ghi trong `types.ts`)
   - DeepL `EN` là source còn `EN-US` là target
   - clip insets phải đi kèm **mọi** lần set vị trí
   - `normalizeDetectedLang` không được cắt script subtag của `zh`

   Cộng bốn cái mới từ E0 ở mục 3 phần bối cảnh. Đánh dấu rõ nhóm sau là **phát hiện từ E0, không có trong kế hoạch gốc**.

7. **File không sửa tay:** `versions.json`, trường `version` trong `manifest.json` (đi qua `version-bump.mjs`), `package-lock.json`.

8. **Quy trình release + checklist submit.** Tóm tắt `docs/SUBMISSION.md`, cộng bài học ở mục 2 phần bối cảnh.

### 3 quy tắc vận hành — chép nguyên văn từ `docs/DEV-PLAN.md` mục E8

> **R1 — Tự kiểm sau mỗi task.** Kết thúc một task, phải đọc lại `CLAUDE.md` và đối chiếu với trạng thái thực tế của dự án. Nếu có mục nào đã lỗi thời (đường dẫn file đổi, quy ước đổi, playbook thiếu bước), sửa ngay trong cùng task đó. `CLAUDE.md` sai còn tệ hơn `CLAUDE.md` không có.

> **R2 — Tài liệu đi cùng code.** Kết thúc một task, rà `README.md` và `docs/**` xem còn mô tả đúng dự án không. Cụ thể phải kiểm: danh sách host mạng, danh sách provider, danh sách ngôn ngữ, danh sách setting, ảnh chụp màn hình. Không để tài liệu trôi khỏi code rồi dồn vào E7.

> **R3 — Không tự ý lệch kế hoạch.** Trong quá trình thực hiện, nếu phát hiện cần làm khác với tài liệu này — đổi cách tiếp cận, thêm/bớt phạm vi, đổi thư viện, đổi cấu trúc thư mục, phát hiện kế hoạch sai — thì **dừng lại và hỏi trước**. Chỉ làm sau khi được đồng ý. Áp dụng cả với thay đổi trông có vẻ nhỏ và hiển nhiên đúng.

**AC:** `CLAUDE.md` tồn tại ở root, chứa đủ 8 mục + 3 quy tắc; cập nhật `CLAUDE.md` là một phần Definition of Done của mọi epic sau.

---

## Bước cuối — cập nhật `docs/DEV-PLAN.md`

Bắt buộc, không phải tuỳ chọn.

**A. Ghi lại kết quả.** Thêm vào cuối mục E8 một phần `### Kết quả thực hiện` gồm: trạng thái task, những mục nào của `/init` phải viết lại thủ công vì `/init` suy ra sai, commit chính, và những gì phát hiện ra nhưng cố ý không làm.

**B. Sửa mọi thông tin đã lỗi thời.** E8 không đụng `src/` nên trích dẫn `file:dòng` sẽ không đổi — nhưng vẫn phải **rà lại** vì E0 vừa sửa một loạt và có thể còn sót. Với mỗi trích dẫn, mở file, xác nhận dòng đó vẫn đúng như kế hoạch mô tả.

**C. Cập nhật bảng "Tiến độ"** trong mục *Trạng thái kế hoạch*: E8 đã xong, việc tiếp theo là E1.

**D. Nếu E8 làm lộ ra điều gì khiến một epic sau phải đổi cách làm** — ví dụ viết playbook "thêm provider mới" mà phát hiện đường đi thực tế khác giả định ở E5 — thì **báo cho tôi**, đừng tự sửa nội dung epic đó.

---

## Bước 9 — viết prompt cho epic tiếp theo

Epic tiếp theo là **E1 — sửa lỗi popup/icon lòi ra ở mép trên** (milestone `0.3.0`).

Viết ra file `docs/prompts/PROMPT-E1.md` một prompt để tôi dán vào phiên sau. Prompt đó phải:

- Cùng cấu trúc và cùng giọng với prompt bạn đang đọc: nhắc đọc `docs/DEV-PLAN.md` trước, nêu rõ phạm vi chỉ E1, nêu ràng buộc R3.
- Cụ thể hoá đủ **E1-T1 → E1-T4** và toàn bộ AC, gồm cả ma trận test thủ công.
- **Mang theo ngữ cảnh vừa học được:** đặc biệt là `FloatingLayer.applyVisibility()` đã gom 3 lời gọi `setClip` rải rác thành một cổng, nên **E1-T2 chỉ còn một nửa việc** — kéo `moveTo` vào để thành `applyGeometry`. Nêu rõ 4 chỗ gọi hiện tại trong `UiController.ts` (dòng 196, 428, 433, 572) và 2 chỗ `moveTo` còn gọi riêng (dòng 429, 434).
- Nhắc rằng E1 **có** đổi hành vi người dùng (đó là mục đích), nên là `0.3.0` MINOR chứ không phải PATCH — khác hẳn ràng buộc của E0.
- Có bước tự cập nhật `docs/DEV-PLAN.md` sau khi xong, và bước viết `docs/prompts/PROMPT-E2.md` cho epic kế tiếp.

Nếu trong lúc làm E8 bạn phát hiện thêm quy ước, cạm bẫy, hay ràng buộc nào đáng đưa vào prompt E1 mà kế hoạch chưa liệt kê, đưa vào luôn — kèm ghi chú rằng đây là phát hiện mới, không có trong kế hoạch gốc.

---

## Đầu ra mong đợi

1. `CLAUDE.md` ở root — đủ 8 mục + 3 quy tắc, mọi trích dẫn đã kiểm chứng
2. `docs/DEV-PLAN.md` đã cập nhật kết quả E8 và bảng tiến độ
3. `docs/prompts/PROMPT-E1.md`
4. CHANGELOG có entry nếu bạn cho là cần (E8 thuần tài liệu, `docs:` không bump version)

Bắt đầu bằng việc đọc kế hoạch và hai tài liệu E0.
