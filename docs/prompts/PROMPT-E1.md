Đọc `docs/DEV-PLAN.md` trong repo này. Đó là đặc tả và kế hoạch phát triển đã được chốt cho plugin Selection Translate. Đọc **toàn bộ** trước khi làm bất cứ việc gì — E1 chạm vào đường đi hình học mà E4 (RTL) sẽ xây tiếp lên, nên phải biết trước cả những mục không thuộc phạm vi lần này.

Đọc thêm, theo thứ tự:

- `CLAUDE.md` ở root — bản đồ tầng, lệnh, quy ước, cạm bẫy. Viết ở E8, mô tả đúng trạng thái sau tái cấu trúc.
- `docs/CODE-REVIEW.md` mục *Trạng thái sau khi thực hiện* — E0 đã tách file nào, để nguyên file nào.
- Mục **E1** trong `docs/DEV-PLAN.md` — mô tả lỗi, nguyên nhân gốc, E1-T1 → E1-T4, AC.

Nhiệm vụ lần này: **thực hiện E1 — sửa lỗi popup/icon lòi ra ở mép trên**, milestone `0.3.0`. Chỉ E1. Không làm E2 (đồng bộ trigger key), không làm E3/E4, kể cả khi thấy lỗi rõ ràng thuộc epic đó — ghi lại vào `docs/CODE-REVIEW.md` rồi để đấy.

---

## Ràng buộc bắt buộc

**Không tự ý lệch kế hoạch (R3).** Nếu trong lúc làm phát hiện cần làm khác với `docs/DEV-PLAN.md` — đổi cách tiếp cận, mở rộng hoặc thu hẹp phạm vi, đổi cấu trúc thư mục, hoặc thấy kế hoạch sai — thì **dừng lại, trình bày vấn đề, chờ tôi đồng ý**. Áp dụng cả với thay đổi trông nhỏ và hiển nhiên đúng.

**E1 CÓ đổi hành vi người dùng — đó chính là mục đích.** Đây là khác biệt căn bản so với E0 và E8. Version là **`0.3.0` MINOR**, không phải PATCH. Đừng tự bump; việc phát hành làm sau khi E2 xong, vì cả hai cùng nằm trong `0.3.0` (xem *Lộ trình phát hành*).

**Trước mỗi commit:** `npm run verify` phải xanh. Chia nhỏ thành nhiều commit theo task (`fix(ui):` / `refactor(ui):`), mỗi commit tự đứng được.

**Không bịa.** Mọi số dòng trong prompt này đã đúng ở `0.2.3`, nhưng **code sẽ dịch chuyển ngay sau commit đầu tiên của chính bạn** — mở file ra đọc, đừng tin số dòng một cách mù quáng.

**Không "dọn dẹp" ngoài phạm vi.** Danh sách *"cái gì để nguyên"* ở `docs/CODE-REVIEW.md` vẫn có hiệu lực. Đặc biệt: `Positioner.ts` là logic thuần đã có test — **thêm** vào nó thì được, viết lại thì không.

---

## Bối cảnh vừa học được — đọc kỹ, nó rút ngắn E1 đáng kể

### 1. E1-T2 chỉ còn một nửa việc

E0 đã gom **3 lời gọi `setClip` rải rác** thành một cổng duy nhất: `FloatingLayer.applyVisibility(target, rect, snapshot)` — `src/ui/FloatingLayer.ts:60`. Nó làm **hai** trong ba việc: `setAnchorHidden` + `setClip`.

Bốn chỗ gọi hiện tại trong `src/ui/UiController.ts`:

| Dòng | Ngữ cảnh |
|---|---|
| **196** | `placePopup` |
| **428** | `reanchor`, nhánh icon |
| **433** | `reanchor`, nhánh popup |
| **572** | `showIcon` |

(Bốn chứ không phải ba như bản `0.2.2`, vì nhánh icon và nhánh popup của `reanchor` nay tách biệt.)

**Việc còn lại của E1-T2:** đổi `applyVisibility` thành **`applyGeometry(target, rect, snapshot)`** làm cả **ba** việc — vị trí, clip, visibility — bằng cách kéo nốt `moveTo()` vào trong nó. Hiện `moveTo` vẫn gọi riêng ngay sau `applyVisibility` ở đúng **hai** chỗ: `UiController.ts:429` (icon) và `:434` (popup). Hai chỗ còn lại (196, 572) đặt vị trí bằng đường khác — **kiểm lại chúng thật kỹ**, vì mục đích của T2 là *sau khi gộp, không nơi nào được set vị trí trực tiếp nữa*.

`Clippable` (`FloatingLayer.ts:10-13`) sẽ phải mọc thêm `moveTo(rect)`. Cả `TriggerIcon.moveTo` (`TriggerIcon.ts:59`) lẫn `TranslatePopup.moveTo` (`TranslatePopup.ts:97`) đã có sẵn đúng chữ ký đó.

Chú ý nhánh popup đổi kích thước theo nội dung: `TranslatePopup.applySize` (`TranslatePopup.ts:349-351`) set `width`/`height` inline. **Rect đổi thì clip cũ lập tức sai** — đây là nhánh dễ quên nhất.

### 2. E1-T3 có thể đã gần xong — kiểm trước khi viết

`isRectVisible(rect, null)` trả `false` (`Positioner.ts:206-208`), nên `applyVisibility` **đã** gọi `setAnchorHidden(true)` khi `visibleBounds == null`. Cái còn lại là `clipInsets(rect, null)` trả `{ top: 0, bottom: 0 }` (`Positioner.ts:228-229`) — an toàn *chỉ vì* nó luôn đi kèm phần ẩn ở trên.

Nghĩa là T3 phần lớn là **chốt lại bằng test** chứ không phải viết lại logic: một test cho `visibleBounds = null` khẳng định element bị ẩn, và giữ cho `applyGeometry` không bao giờ tách hai nửa đó ra. Nếu bạn kết luận khác sau khi đọc code, nói ra trước khi sửa.

> Đây là **phát hiện ở E8, không có trong kế hoạch gốc**.

### 3. E1-T4 chạm nhiều chỗ hơn kế hoạch gợi ý

Trục ngang hiện **chưa tồn tại ở bất kỳ đâu** trong chuỗi. Cắt trái/phải nghĩa là sửa đủ năm chỗ:

1. `interface ClipInsets` — hiện chỉ có `top`/`bottom` (`Positioner.ts:210-214`).
2. `clipInsets()` (`Positioner.ts:228`) và `clampInset()` (`:239`). Docstring hiện ghi thẳng *"Horizontal edges are left alone: nothing sits beside a leaf that the popup could cover"* — **câu đó sắp thành sai, phải viết lại comment cho đúng lý do mới** (split dọc, và RTL ở E4).
3. `TriggerIcon.setClip` (`TriggerIcon.ts:74-79`) — thêm `--st-clip-left` / `--st-clip-right`.
4. `TranslatePopup.setClip` (`TranslatePopup.ts:118-123`) — như trên.
5. `styles.css:107` và `styles.css:192` — cả hai đang là `clip-path: inset(var(--st-clip-top, 0px) 0 var(--st-clip-bottom, 0px) 0)`. Hai dòng, đừng sửa một.

> Đây cũng là **phát hiện ở E8**. Kế hoạch chỉ ghi *"Hiện chỉ cắt trên/dưới"*, không liệt kê 5 điểm chạm.

### 4. Nguyên nhân gốc, đã xác định — đừng đi tìm lại

`CONTAINER_SELECTORS` (`src/core/ContextDetector.ts:16`) resolve `containerEl` tới `.workspace-leaf-content`, mà phần tử này **bao gồm cả `.view-header`**. `FloatingLayer.visibleBounds()` (`FloatingLayer.ts:42`) lấy biên từ đó → biên trên nằm phía trên view-header → `clipInsets` không thấy có gì thừa → popup vẽ đè lên chrome của Obsidian.

Cơ chế clip đã đúng. **Biên được đo sai.** `UiController.computeBoundary()` ở `UiController.ts:583` là chỗ còn lại dùng cùng biên đó.

Tầng phòng thủ thứ hai không cứu được: `OCCLUSION_SELECTORS` (`src/constants.ts:84`) **có** chứa `.view-header`, nhưng phép thử occlusion chỉ chạy ở lần đặt vị trí đầu tiên trong `place()`; đường cập nhật khi cuộn dùng `computeCandidate()` (`Positioner.ts:101`), vốn **cố ý** bỏ qua occlusion vì `elementsFromPoint` 60 lần/giây quá đắt. Đừng "sửa" bằng cách bật occlusion cho đường cuộn.

---

## Việc cụ thể

### E1-T1. Tách hai khái niệm đang bị gộp làm một

| Khái niệm | Dùng để | Phần tử |
|---|---|---|
| `leafEl` | Nhận diện leaf, gắn sự kiện, thu thập scroll anchor | `.workspace-leaf-content` (giữ nguyên) |
| `contentEl` | **Biên đặt vị trí và biên cắt** | `.view-content` — với PDF là `.view-content` trừ chiều cao `.pdf-toolbar` |

- Bổ sung `contentEl` vào `ContextInfo` và `SelectionSnapshot` (`src/types.ts`, trường `containerEl` hiện ở `:89`).
- `FloatingLayer.visibleBounds()` và `UiController.computeBoundary()` chuyển sang dùng `contentEl`.
- `.markdown-embed` và `.popover` cần **bảng map riêng**, không dùng chung một selector: phần tử nội dung tương ứng là `.markdown-embed-content` / `.hover-popover`.
- `ContextDetector` đã có `tests/ContextDetector.test.ts` — mở rộng nó, đây là chỗ rẻ nhất để chốt bảng map.

### E1-T2. Một cổng duy nhất cho hình học

Xem mục 1 phần bối cảnh. Kết quả phải đạt: **không nơi nào ngoài `FloatingLayer` được set vị trí, clip hay visibility của icon/popup.**

### E1-T3. Xử lý `visibleBounds == null`

Xem mục 2 phần bối cảnh. Khi leaf cuộn hết khỏi màn hình phải **ẩn hẳn**, không được rơi về "không cắt gì".

### E1-T4. Cắt cả trái/phải

Xem mục 3 phần bối cảnh. Cần cho split dọc, và là điều kiện để E4 làm RTL.

---

## AC

Không tick mục nào mà chưa thực sự thử.

- [ ] Tái hiện đúng kịch bản trong ảnh: chọn một từ, cuộn xuống cho tới khi selection ra khỏi vùng nội dung → popup **biến mất hoàn toàn**, không còn một pixel nào trong vùng view-header hay thanh tab.
- [ ] Cuộn ngược lại → popup hiện lại **nguyên vẹn, cùng nội dung, không phải request mới** (state machine vẫn ở `result`).
- [ ] Unit test mới cho `clipInsets` với `visibleBounds.top > 0` và với `visibleBounds = null`.
- [ ] Unit test cho trục ngang (T4), và cho bảng map `contentEl` (T1).
- [ ] Test hồi quy: cuộn từng pixel qua mép **không gây nhấp nháy**. Vấn đề này đã được xử lý trong `overlaps()` — không được làm hỏng.
- [ ] `npm run verify` xanh: 0 error, đúng **5** warning (xem `CLAUDE.md` §6.8 — đừng dọn chúng).
- [ ] CHANGELOG có entry `Fixed` mô tả lỗi **theo cách người dùng nhìn thấy**, không theo tên hàm.

### Ma trận test thủ công

Bắt buộc, và phải ghi lại kết quả (bảng nào đã thử, phát hiện gì) vào phần *Kết quả thực hiện* của E1 trong `docs/DEV-PLAN.md`.

**{Live Preview, Reading, PDF, input/properties, popout, hover preview} × {tab đơn, split ngang, split dọc} × {zoom 100%, 150%}**

Bốn chỗ nhiều khả năng lộ lỗi nhất, thử trước:

1. **PDF** — `.view-content` còn chứa `.pdf-toolbar`, là ca duy nhất phải trừ chiều cao.
2. **Split dọc** — ca mà T4 tồn tại vì nó.
3. **Popout** — window riêng, `snapshot.win` khác window chính.
4. **Hover preview** — `.popover`, đi đường map riêng của T1.

---

## Bước cuối — cập nhật `docs/DEV-PLAN.md` và `CLAUDE.md`

Bắt buộc, không phải tuỳ chọn.

**A. `CLAUDE.md` (quy tắc R1).** E1 làm lỗi thời ít nhất ba chỗ trong đó — **mở ra đối chiếu, đừng đoán**:
- §2 bản đồ tầng: LOC của `UiController.ts` / `FloatingLayer.ts` sẽ đổi.
- §6.3 cạm bẫy *"clip insets phải đi kèm mọi lần set vị trí"*: sau T2 phải viết lại thành *đã gộp xong thành `applyGeometry`*, và bỏ câu nói `moveTo` còn gọi riêng ở `UiController.ts:429, :434`.
- §4 quy ước và §6.5: nếu T4 thêm custom property mới thì danh sách `--st-*` đổi theo.

**B. `docs/DEV-PLAN.md`.** Thêm vào cuối mục E1 một phần `### Kết quả thực hiện (E1)` gồm: trạng thái từng task E1-T1 → E1-T4, **kết quả ma trận test thủ công**, danh sách commit, và những gì phát hiện ra nhưng cố ý không làm. Cập nhật bảng *Tiến độ* (E1 xong, tiếp theo là E2) và mục *Việc tiếp theo*.

**C. Rà lại mọi trích dẫn `file:dòng` trong `docs/DEV-PLAN.md`.** E1 **có** chạm `src/`, nên khác E8: số dòng ở các mục E2, E3, E4, E6 rất có thể đã trôi. Mở từng file, xác nhận, sửa. Số dòng trong `docs/CODE-REVIEW.md` và `docs/REVIEW-FINDINGS.md` là ảnh chụp `0.2.2` — **giữ nguyên**, hai file đó đã nói rõ điều này.

**D. Nếu E1 làm lộ ra điều gì khiến một epic sau phải đổi cách làm** — ví dụ `contentEl` của T1 va vào giả định về `dir` trong E4-T4 (*placement phải soi gương*) — thì **báo cho tôi**, đừng tự sửa nội dung epic đó.

---

## Bước 9 — viết prompt cho epic tiếp theo

Epic tiếp theo là **E2 — đồng bộ trigger key với Hotkeys của Obsidian** (cùng milestone `0.3.0`).

Viết ra file `docs/prompts/PROMPT-E2.md` một prompt để tôi dán vào phiên sau. Prompt đó phải:

- Cùng cấu trúc và cùng giọng với prompt bạn đang đọc: nhắc đọc `docs/DEV-PLAN.md` và `CLAUDE.md` trước, nêu rõ phạm vi chỉ E2, nêu ràng buộc R3.
- Cụ thể hoá đủ **E2-T1 → E2-T5** và toàn bộ AC.
- Mang theo ngữ cảnh vừa học được ở E1, và nhắc hai ràng buộc mà kế hoạch đã ghi sẵn: **`app.hotkeyManager` là API không công khai** — bọc try/catch, hỏng thì chỉ mất tính năng cảnh báo trùng, không được ảnh hưởng trigger key; và **phím trơn vẫn bị cấm trong ngữ cảnh soạn thảo**, không được nới lỏng kể cả khi chuyển sang `Scope`.
- Nhắc rằng E2-T5 **xoá** hai key i18n (`command.translateSelection`, `command.toggleAutoPopup`) khỏi mọi catalogue — cổng key-parity trong `npm run check` sẽ bắt nếu xoá lệch giữa `en.ts` và `vi.ts`.
- Nhắc rằng E2 cũng là MINOR, cùng gói `0.3.0` với E1, nên **phát hành là việc làm sau khi E2 xong**.
- Có bước tự cập nhật `CLAUDE.md` + `docs/DEV-PLAN.md`, và bước viết `docs/prompts/PROMPT-E3.md`.

Nếu trong lúc làm E1 bạn phát hiện thêm quy ước, cạm bẫy, hay ràng buộc nào đáng đưa vào prompt E2 mà kế hoạch chưa liệt kê, đưa vào luôn — kèm ghi chú rằng đây là phát hiện mới, không có trong kế hoạch gốc.

---

## Đầu ra mong đợi

1. Code sửa xong E1-T1 → E1-T4, `npm run verify` xanh sau mỗi commit
2. Test mới cho `clipInsets` (hai trục + ca `null`) và cho bảng map `contentEl`
3. Ma trận test thủ công đã chạy, kết quả ghi vào `docs/DEV-PLAN.md`
4. `CLAUDE.md` đã rà và cập nhật (R1)
5. `docs/DEV-PLAN.md` đã cập nhật kết quả E1, bảng tiến độ, và mọi trích dẫn `file:dòng`
6. `docs/prompts/PROMPT-E2.md`
7. CHANGELOG có entry trong `## [Unreleased]`

Bắt đầu bằng việc đọc `docs/DEV-PLAN.md` và `CLAUDE.md`.
