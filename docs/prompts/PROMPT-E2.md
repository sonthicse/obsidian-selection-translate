Đọc `docs/DEV-PLAN.md` trong repo này. Đó là đặc tả và kế hoạch phát triển đã được chốt cho plugin Selection Translate. Đọc **toàn bộ** trước khi làm bất cứ việc gì — E2 chạm vào cách plugin gắn phím vào nền tảng, và E4 (8 locale) sẽ đứng trên quyết định "tên command giữ nguyên tiếng Anh" mà E2-T5 thực hiện, nên phải biết trước cả những mục không thuộc phạm vi lần này.

Đọc thêm, theo thứ tự:

- `CLAUDE.md` ở root — bản đồ tầng, lệnh, quy ước, **mười** cạm bẫy. Viết ở E8, cập nhật ở E1.
- Mục **Kết quả thực hiện (E1)** trong `docs/DEV-PLAN.md` — E1 vừa đổi gì, và những gì nó cố ý không làm.
- Mục **E2** trong `docs/DEV-PLAN.md` — hiện trạng hai hệ thống phím, phương án B đã chốt, E2-T1 → E2-T5, AC.

Nhiệm vụ lần này: **thực hiện E2 — đồng bộ trigger key với Hotkeys của Obsidian**, milestone `0.3.0`. Chỉ E2. Không làm E3/E4/E5, kể cả khi thấy lỗi rõ ràng thuộc epic đó — ghi lại vào phần *Phát hiện ra nhưng cố ý không làm* của E2 rồi để đấy.

---

## Ràng buộc bắt buộc

**Không tự ý lệch kế hoạch (R3).** Nếu trong lúc làm phát hiện cần làm khác với `docs/DEV-PLAN.md` — đổi cách tiếp cận, mở rộng hoặc thu hẹp phạm vi, đổi cấu trúc thư mục, hoặc thấy kế hoạch sai — thì **dừng lại, trình bày vấn đề, chờ tôi đồng ý**. Áp dụng cả với thay đổi trông nhỏ và hiển nhiên đúng. Kế hoạch đã ghi sẵn một điểm thuộc loại này: *"`app.hotkeyManager` ở E2-T2 là API không công khai. Nếu hình dạng của nó khác dự kiến hoặc không truy cập được, báo lại thay vì tự tìm đường vòng."*

**E2 CÓ đổi hành vi người dùng.** Là **MINOR**. Nhưng **đừng tự bump version**: E1 và E2 cùng đi trong một lần phát hành `0.3.0`, nên việc bump + tag + release là việc làm **sau khi E2 xong** — và là việc phải hỏi tôi, không tự làm.

**Trước mỗi commit:** `npm run verify` phải xanh — hiện là **327 test, 0 error / 5 warning**. Chia nhỏ thành nhiều commit theo task (`feat(hotkey):` / `refactor(hotkey):` / `fix(hotkey):`), mỗi commit tự đứng được.

**Không bịa.** Mọi số dòng trong prompt này đúng ở HEAD sau E1, nhưng **code sẽ dịch chuyển ngay sau commit đầu tiên của chính bạn** — mở file ra đọc, đừng tin số dòng một cách mù quáng.

**Không "dọn dẹp" ngoài phạm vi.** Đặc biệt: `HotkeyManager.ts` là **logic thuần đã viết tốt và đã có 21 test** (`tests/HotkeyManager.test.ts`, 5 nhóm `describe`). Kế hoạch nói thẳng: giữ nguyên `matchesBinding`, `isBindingSafeFor`, `isBindingRisky` và test của chúng — **chỉ đổi cách gắn vào nền tảng**.

---

## Trạng thái E1 khi bạn bắt đầu

E1 đã **xong trọn vẹn**: bốn task code, cộng ma trận test thủ công do chủ dự án chạy trên vault thật — ổn hết, không hồi quy nào. Nghĩa là bạn không thừa hưởng việc nợ nào, và cổng ra còn lại của `0.3.0` là ma trận test thủ công của chính E2.

Bản build đang nằm trong vault thật tại `.obsidian/plugins/selection-translate`; chép `main.js` + `manifest.json` + `styles.css` đè lên đó rồi tắt/bật plugin là cách chạy thử nhanh nhất.

---

## Bối cảnh vừa học được ở E1 — đọc kỹ

### 1. Đã có sẵn một `Scope` trong repo, đọc nó trước khi viết cái thứ hai

`TranslatePopup` **đã** dùng đúng cơ chế mà E2-T1 định dùng: `claimScope()` tạo `new Scope()`, đăng ký Escape + Tab, rồi `this.app.keymap.pushScope(scope)` (`src/ui/TranslatePopup.ts:239`); `releaseScope()` gọi `popScope` (`:250`) và được gọi từ `close()`. Đó là **bản mẫu trong nhà** cho E2-T1 — cùng vòng đời (đẩy khi UI hiện, gỡ khi UI đóng), cùng lớp API. Đừng phát minh lại kiểu khác.

Hai điều đáng chú ý ở bản mẫu đó, vì E2 phải khớp với chúng:

- `Scope.register([], 'Escape', …)` **trả `false`** để chặn không cho phím rơi xuống editor. Callback trả `true` nghĩa là "để nó đi tiếp".
- Popup đã chiếm Escape rồi. Trigger key chỉ sống lúc **icon** đang hiện, tức trạng thái `icon` — chưa có popup. Hai scope **không** chồng nhau, nhưng phải tự tay khẳng định điều đó chứ đừng giả định.

> Đây là **phát hiện ở E1, không có trong kế hoạch gốc**.

### 2. Đường đi hiện tại của trigger key, đủ chi tiết để khỏi phải đi tìm

| Chỗ | Việc |
|---|---|
| `src/main.ts:81` | `onKeyDown: (event) => this.handleTriggerKey(event)` — một callback truyền vào `SelectionManager` |
| `src/core/SelectionManager.ts:179` | `onDoc('keydown', …)` — listener thật, tự `addEventListener`, tự track teardown |
| `src/main.ts:192-209` | `handleTriggerKey`: kiểm `isIconActive()` → `matchesBinding()` → `getCurrentSnapshot()` → `isBindingSafeFor()` → `preventDefault` + `stopPropagation` → `ui.triggerFromHotkey()` |
| `src/ui/UiController.ts:361` | `isIconActive()` — máy trạng thái ở `icon` **và** icon không bị ẩn theo anchor |

**Cạm bẫy 6.6 trong `CLAUDE.md` vẫn nguyên giá trị:** `SelectionManager` **cố ý** không dùng `registerDomEvent`, vì Obsidian chỉ giải phóng chúng khi toàn plugin unload và một phiên mở/đóng popout nhiều lần sẽ tích luỹ đăng ký trên document đã chết. Nếu E2-T1 gỡ được lời gọi `onKeyDown` này thì tốt; nhưng **đừng đụng vào cơ chế listener của `SelectionManager`** vì lý do nào khác.

### 3. Popout window là ca phải nghĩ tới ngay từ đầu

`app.keymap` là **của app**, không của cửa sổ. Listener `keydown` hiện tại thì gắn trên `document` của từng cửa sổ. Chuyển sang `Scope` nghĩa là đổi từ mô hình "mỗi document một listener" sang "một stack toàn app" — **phải tự kiểm bằng tay** rằng trigger key vẫn chạy khi vùng chọn nằm trong popout. Nếu hoá ra không chạy, đó là phát hiện phải **báo lại** chứ không phải tự chữa bằng cách giữ song song cả hai đường.

### 4. Một chuẩn về "cổng duy nhất" mà E0 và E1 đã dựng — E2 nên theo

Hai epic trước đều kết thúc bằng việc gom một trách nhiệm về **một** nơi: E0 gom clip, E1 gom cả vị trí + clip + visibility vào `FloatingLayer.applyGeometry()`. Nếu E2 làm đúng tinh thần đó thì sau E2 phải trả lời được gọn một câu: *"chỗ nào quyết định trigger key có bắn hay không?"* — và câu trả lời là **một** chỗ, không phải hai.

---

## Việc cụ thể

### E2-T1. Chuyển `HotkeyManager` sang `Scope` của Obsidian

`pushScope` khi icon hiện, `popScope` khi ẩn. Giữ nguyên toàn bộ logic thuần và test của nó.

Ba điều phải đúng, không thương lượng:

1. **Vòng đời khớp với vòng đời icon.** Đẩy khi vào trạng thái `icon`, gỡ khi rời khỏi nó — kể cả rời bằng đường bất thường (dismiss, đổi leaf, plugin unload). Rò một scope là làm hỏng bàn phím của người dùng ở mọi chỗ khác.
2. **Gỡ plugin không để lại scope nào trong stack** — đây là một mục AC riêng, kiểm trong `onunload` (`src/main.ts:113`).
3. **Không đăng ký scope khi `triggerHotkey` là `null`.** Mặc định của plugin là chưa đặt phím; đẩy một scope rỗng vào stack toàn app là trả giá không lý do.

### E2-T2. Phát hiện xung đột trong `HotkeyRecorder`

Khi người dùng ghi xong một tổ hợp, đối chiếu với hotkey Obsidian đang dùng; trùng thì hiện cảnh báo **ngay dưới ô ghi**, nêu **tên command bị trùng**. **Cảnh báo, không chặn** — hai phím sống ở hai scope khác nhau nên người dùng có thể cố ý.

Ràng buộc kế hoạch đã ghi sẵn, nhắc lại vì nó là mục dễ làm ẩu nhất: **`app.hotkeyManager` là API không công khai**, không có trong `obsidian.d.ts`, có thể vỡ ở bản Obsidian bất kỳ. Bắt buộc:

- Bọc **toàn bộ** phần đọc trong `try/catch`.
- Hỏng thì **chỉ mất tính năng cảnh báo**, tuyệt đối không ảnh hưởng tới việc trigger key hoạt động, cũng không được làm hỏng việc dựng pane tuỳ chọn.
- Truy cập qua **cast cấu trúc hẹp**, không phải `any` (`no-explicit-any` ở mức error). Có sẵn tiền lệ đúng trong repo: `App.setting` được với tới bằng cast hẹp ở cuối `src/main.ts` — đọc chỗ đó và làm y hệt.
- Có **test cho ca API không tồn tại**: đó là một dòng trong AC (*"Giả lập `app.hotkeyManager` không tồn tại → trigger key vẫn hoạt động bình thường, chỉ mất cảnh báo"*), nên phải tách được phần "so khớp binding với danh sách hotkey" thành hàm thuần nhận dữ liệu vào, để test được dưới Node.

Ô ghi phím hiện ở `src/settings/HotkeyRecorder.ts` (80 dòng), gọi từ `src/settings/sections/activation.ts:29`. Nó **đã có sẵn** một khối cảnh báo — `container.createDiv({ cls: 'st-setting-warning' })` cho ca phím trơn nguy hiểm — nên khối cảnh báo trùng phím nên dùng đúng cơ chế `show()`/`hide()` đó chứ không dựng kiểu thứ hai.

### E2-T3. Nút deep-link sang trang Hotkeys của Obsidian

Đặt cạnh ô ghi trigger key. Cách mở đúng cũng đi qua `App.setting` — cùng chỗ cast hẹp nói trên. Chuỗi UI mới phải theo playbook 5.3 trong `CLAUDE.md`: `en.ts` **trước**, rồi `vi.ts`, sentence case.

### E2-T4. Giữ nguyên quy tắc an toàn về phím trơn

Phím không modifier vẫn **bị cấm trong ngữ cảnh soạn thảo**, vì nó sẽ chèn ký tự vào note của người dùng. `isBindingSafeFor()` là nơi luật đó sống, và `isEditableContext()` (`src/core/ContextDetector.ts`) là thứ nó hỏi.

**Đây là ràng buộc quan trọng nhất của cả module và không được nới lỏng, kể cả khi chuyển sang `Scope`.** Cụ thể phải cẩn thận: một `Scope` callback trả `false` sẽ chặn phím; trả `true` thả cho đi tiếp. Ca "phím trơn trong Live Preview" phải là **thả cho đi tiếp** — người dùng gõ chữ thì chữ phải xuất hiện — chứ không phải nuốt phím rồi im lặng. Nuốt phím ở đây tệ hơn cả không có tính năng.

### E2-T5. Tên command giữ nguyên tiếng Anh

Gỡ hai lời gọi `t()` ở `src/main.ts:160` và `:172`, thay bằng chuỗi tiếng Anh cố định — đúng chuỗi đang có trong `en.ts` để tên command không đổi với người dùng hiện tại:

| Command id | Tên |
|---|---|
| `translate-selection` | `Translate selection` |
| `toggle-auto-popup` | `Toggle translate on selection` |

Rồi **xoá hai key** `command.translateSelection` và `command.toggleAutoPopup` khỏi **mọi** catalogue: `src/i18n/en.ts:178-179` **và** `src/i18n/vi.ts:162-163`.

**Cổng key-parity trong `npm run check` sẽ bắt nếu xoá lệch giữa hai file** — xoá ở `en.ts` mà quên `vi.ts` (hoặc ngược lại) là fail ngay, không phải chờ ai review. Sau khi xoá, số chuỗi UI giảm **132 → 130**; con số đó xuất hiện trong đầu ra của `npm run check`, trong `CLAUDE.md` và trong `docs/DEV-PLAN.md` (mục *Tổng khối lượng giao diện*: `8 locale × 132 key`) — **cập nhật cả ba**, và tính lại `8 × 130 = 1.040` chuỗi cho E4.

Lý do chọn cách này thay vì đăng ký lại lúc runtime nằm ở bảng so sánh trong mục E2 của kế hoạch; đọc nó chứ đừng cân nhắc lại từ đầu.

---

## AC

Không tick mục nào mà chưa thực sự thử.

- [ ] Đặt trigger key trùng một hotkey Obsidian đang dùng → hiện cảnh báo **nêu rõ tên command bị trùng**.
- [ ] Giả lập `app.hotkeyManager` không tồn tại → trigger key vẫn hoạt động bình thường, chỉ mất cảnh báo. (Test tự động, không phải thử tay.)
- [ ] Trigger key **chỉ** hoạt động khi icon đang hiện; mọi lúc khác phím đó thuộc về Obsidian — kiểm bằng cách đặt trigger key trùng một command của Obsidian rồi bấm khi không có vùng chọn: command của Obsidian phải chạy.
- [ ] Phím trơn trong Live Preview → vẫn bị chặn, **và ký tự vẫn được gõ vào note bình thường** (không bị nuốt).
- [ ] Đổi ngôn ngữ giao diện → không cần reload cho bất kỳ chức năng nào liên quan tới command.
- [ ] Toàn bộ 21 test hiện có của `HotkeyManager` vẫn xanh, không sửa test nào để nó xanh.
- [ ] Gỡ plugin → không còn scope nào trong stack của Obsidian.
- [ ] Trigger key hoạt động trong **popout window** (xem mục 3 phần bối cảnh).
- [ ] `npm run verify` xanh: 0 error, đúng **5** warning (xem `CLAUDE.md` §6.8 — đừng dọn chúng).
- [ ] CHANGELOG có entry mô tả **theo cách người dùng nhìn thấy**, không theo tên hàm. Ít nhất hai nhóm: `Added` (cảnh báo trùng phím + nút mở trang Hotkeys) và `Changed` (tên command trong trang Hotkeys nay luôn tiếng Anh — đây là thứ người dùng tiếng Việt sẽ nhận ra ngay, phải nói thẳng).

### Ma trận test thủ công

Nhẹ hơn E1 nhiều, nhưng vẫn bắt buộc và vẫn phải ghi kết quả vào phần *Kết quả thực hiện* của E2 trong `docs/DEV-PLAN.md`:

**{Live Preview, Reading, PDF, popout} × {phím có modifier, phím trơn}**

Bốn điều dễ lộ lỗi nhất:

1. **Popout** — `app.keymap` là của app, listener cũ là của từng document.
2. **Phím trơn trong Live Preview** — phải gõ được chữ đó vào note.
3. **Phím trơn trong Reading view** — vẫn phải kích hoạt dịch, vì ở đó không gõ được vào đâu.
4. **Bấm trigger key khi không có icon** — phím phải trả về cho Obsidian nguyên vẹn.

---

## Bước cuối — cập nhật `docs/DEV-PLAN.md` và `CLAUDE.md`

Bắt buộc, không phải tuỳ chọn.

**A. `CLAUDE.md` (quy tắc R1).** E2 làm lỗi thời ít nhất bốn chỗ — **mở ra đối chiếu, đừng đoán**:

- Dòng trạng thái đầu file: số file TS, LOC, số test, và **số chuỗi UI 132 → 130**.
- §2 bản đồ tầng: LOC của `main.ts` và của `core/HotkeyManager.ts` sẽ đổi; nếu có file mới thì phải xuất hiện trong sơ đồ.
- §6 cạm bẫy: thêm một mục cho **`app.hotkeyManager` là API không công khai** — kế hoạch yêu cầu thẳng việc này ở phần *Ràng buộc kèm theo quyết định B*. Ghi rõ: bọc try/catch, hỏng thì chỉ mất cảnh báo.
- Playbook 5.3 (*thêm một chuỗi UI mới*) và 5.4 (*thêm một setting mới*): nếu E2-T3 thêm một control kiểu mới vào `activation.ts` thì bảng "section nào giữ setting nào" phải khớp.

**B. `docs/DEV-PLAN.md`.** Thêm vào cuối mục E2 một phần `### Kết quả thực hiện (E2)` gồm: trạng thái từng task E2-T1 → E2-T5, **kết quả ma trận test thủ công**, hình dạng thực tế của `app.hotkeyManager` mà bạn quan sát được (đây là dữ kiện quý — không ai chép được từ tài liệu), danh sách commit, và những gì phát hiện ra nhưng cố ý không làm. Cập nhật bảng *Tiến độ* (E2 xong, tiếp theo là E3) và mục *Việc tiếp theo*.

**C. Rà lại mọi trích dẫn `file:dòng` trong `docs/DEV-PLAN.md`.** E2 **có** chạm `src/`, đặc biệt `main.ts` — mà `main.ts:158/160/172` được trích ở đúng mục E2, và `main.ts:85` được trích trong `CLAUDE.md`. Mở từng file, xác nhận, sửa. Số dòng trong `docs/CODE-REVIEW.md` và `docs/REVIEW-FINDINGS.md` là ảnh chụp `0.2.2` — **giữ nguyên**.

**D. Nếu E2 làm lộ ra điều gì khiến một epic sau phải đổi cách làm** — ví dụ việc xoá hai key i18n làm đổi con số mà E4 đang lập kế hoạch dựa trên — thì **báo cho tôi**, đừng tự sửa nội dung epic đó.

**E. Sau khi E2 xong: nhắc tôi về việc phát hành `0.3.0`.** Đừng tự làm. Trình tự đúng ghi ở `CLAUDE.md` §8, và điều kiện tiên quyết còn lại là ma trận test thủ công của **E2** đã chạy xong (của E1 đã xong rồi). Nhắc luôn ba bài học ở đó, đặc biệt: kiểm asset của release sau khi workflow chạy — thiếu `main.js` + `manifest.json` dưới dạng file rời là trượt cổng submit ngay tại bước đó.

---

## Bước 9 — viết prompt cho epic tiếp theo

Epic tiếp theo là **E3 — refactor mô hình ngôn ngữ (language registry)**, milestone `0.4.0`. Nó là **nút thắt** của cả nửa sau kế hoạch: E4, E5, E6 đều đứng trên nó.

Viết ra file `docs/prompts/PROMPT-E3.md` một prompt để tôi dán vào phiên sau. Prompt đó phải:

- Cùng cấu trúc và cùng giọng với prompt bạn đang đọc: nhắc đọc `docs/DEV-PLAN.md` và `CLAUDE.md` trước, nêu rõ phạm vi chỉ E3, nêu ràng buộc R3.
- Cụ thể hoá đủ **E3-T1 → E3-T5** và toàn bộ AC.
- Mang theo ngữ cảnh vừa học được ở E2.
- Nhắc rằng E3 là **thay đổi phá vỡ tương thích** (gỡ tiếng Nga, đổi schema settings) nhưng ở giai đoạn `0.x` thì **dồn vào MINOR** — `0.4.0`, không phải `1.0.0`.
- Nhắc rằng `0.4.0` **bắt buộc có ít nhất một vòng beta qua BRAT** trước khi phát hành, vì lỗi migration làm mất setting là không hồi phục được.
- Nhắc rằng bảng mã ngôn ngữ ở E3-T2 là **điểm khởi đầu dựng từ tài liệu API**, phải kiểm chứng lại tại thời điểm làm; nếu thực tế khác — đặc biệt phần `zh` của DeepL và Youdao — thì **báo lại trước khi sửa bảng** (đây là điểm số 2 trong danh sách "phải hỏi trước khi tự quyết" ở cuối kế hoạch).
- Nhắc rằng **cạm bẫy 6.4** (`normalizeDetectedLang` cắt script subtag của `zh`) chính là **E3-T3**, và là điều kiện chặn của toàn bộ tính năng tiếng Trung — sau E3 thì mục cạm bẫy đó trong `CLAUDE.md` phải viết lại, và **playbook 5.1** (*thêm một ngôn ngữ mới*) phải viết lại **toàn bộ**, vì `CLAUDE.md` đã ghi sẵn rằng E3 sẽ thay đường đi đó bằng registry.
- Có bước tự cập nhật `CLAUDE.md` + `docs/DEV-PLAN.md`, và bước viết `docs/prompts/PROMPT-E4.md`.

Nếu trong lúc làm E2 bạn phát hiện thêm quy ước, cạm bẫy, hay ràng buộc nào đáng đưa vào prompt E3 mà kế hoạch chưa liệt kê, đưa vào luôn — kèm ghi chú rằng đây là phát hiện mới, không có trong kế hoạch gốc.

---

## Đầu ra mong đợi

1. Code sửa xong E2-T1 → E2-T5, `npm run verify` xanh sau mỗi commit
2. Test mới cho phần so khớp xung đột hotkey, gồm ca `app.hotkeyManager` không tồn tại
3. Ma trận test thủ công đã chạy, kết quả ghi vào `docs/DEV-PLAN.md`
4. `CLAUDE.md` đã rà và cập nhật (R1), gồm cạm bẫy mới về API không công khai
5. `docs/DEV-PLAN.md` đã cập nhật kết quả E2, bảng tiến độ, và mọi trích dẫn `file:dòng`
6. `docs/prompts/PROMPT-E3.md`
7. CHANGELOG có entry trong `## [Unreleased]`, cùng chỗ với entry của E1

Bắt đầu bằng việc đọc `docs/DEV-PLAN.md` và `CLAUDE.md`.
