# Kiến trúc

Tài liệu này giải thích các khối ghép với nhau ra sao và **vì sao** lại chia như vậy. Phần "vì sao" mới là phần đáng đọc — cách chia này là kết quả của một số ràng buộc cụ thể, không phải sở thích.

## Nguyên tắc xuyên suốt

> **UI không biết provider nào trả lời. Provider không bao giờ thấy một node DOM.**

Mọi thứ đi qua ranh giới đó đều là object thuần khai báo trong [`src/types.ts`](../src/types.ts). Đây không phải kiến trúc cho đẹp: nó là lý do khiến `parseGtx`, `Positioner`, `StateMachine` và `TextNormalizer` unit-test được dưới Node thuần, không cần Electron, không cần mạng.

## Sơ đồ khối

```
                    ┌──────────────────────────────┐
                    │        main.ts (Plugin)      │
                    │  vòng đời, command, settings │
                    └──────────────┬───────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼─────────┐      ┌─────────▼─────────┐      ┌─────────▼────────┐
│ SelectionManager│      │   UiController    │      │   Orchestrator   │
│  (mỗi window)   │─────▶│  StateMachine     │─────▶│  token, cache    │
│  7 loại event   │ snap │  TriggerIcon      │ snap │  normalizer      │
└───────┬─────────┘      │  TranslatePopup   │      └────────┬─────────┘
        │                │  Positioner       │               │
┌───────▼─────────┐      └───────────────────┘      ┌────────▼─────────┐
│ ContextDetector │                                 │ ProviderRegistry │
│ 3 SelectionSource│                                └────────┬─────────┘
└─────────────────┘                                          │
                                       ┌─────────────────────┼──────────────┐
                                  ┌────▼─────┐   ┌───────────▼──┐   ┌───────▼────┐
                                  │GoogleFree│   │ GoogleCloud  │   │   DeepL    │
                                  └──────────┘   └──────────────┘   └────────────┘
                                       │
                                  ┌────▼──────────────────┐
                                  │ DictionaryProvider ×2 │
                                  └───────────────────────┘
```

`TtsService` (với `WebSpeechEngine` và `GoogleTtsEngine`) treo bên cạnh `UiController` và không liên quan đến đường dịch.

## Máy trạng thái

```
                     selection hợp lệ
       ┌─────────────────────────────────────┐
       │                                     ▼
   ┌────────┐                        ┌──────────────┐
   │  IDLE  │◀───esc / click ngoài───│     ICON     │
   └────────┘                        └──────┬───────┘
       ▲  ▲                                 │ click icon | phím tắt
       │  │                                 ▼
       │  │                          ┌──────────────┐
       │  └────esc / click ngoài─────│   LOADING    │
       │                             └──┬────────┬──┘
       │                        thành công│      │lỗi
       │                                 ▼      ▼
       │                          ┌──────────┐ ┌────────┐
       └───esc / click ngoài──────│  RESULT  │ │ ERROR  │──thử lại──▶ LOADING
                                  └──────────┘ └────────┘

   nháy đúp (nếu bật) : IDLE ──────────────▶ LOADING  (bỏ qua ICON)
   dịch ngay khi chọn : IDLE ──────────────▶ LOADING
```

Ba điều về [`StateMachine.ts`](../src/core/StateMachine.ts) đáng nêu:

1. **Payload gắn liền transition**, không phải setter riêng. Không có cách nào ở `result` mà không có result, hay để lại snapshot cũ trên đường về `idle`.
2. **Nước đi bất hợp lệ bị từ chối tại chỗ.** Đặc biệt `idle → result` là bất hợp lệ. Đây chính là thứ chặn một phản hồi mạng về muộn làm sống lại UI mà người dùng đã đóng — và điều này **đã thực sự xảy ra** trong test tay.
3. **UI render từ máy trạng thái**, qua `subscribe`. Có đúng một chỗ quyết định thứ gì trên màn hình.

## Vòng đời

```
onload()
 ├─ loadSettings()          hợp nhất với DEFAULT_SETTINGS + kẹp khoảng giá trị
 ├─ applyLocale()           theo Obsidian nếu đặt 'auto'
 ├─ ProviderRegistry        dựng một lần, đọc khoá qua getter
 ├─ TtsService
 ├─ TranslationOrchestrator
 ├─ UiController            đăng ký render vào StateMachine
 ├─ SelectionManager        attach(window) + hook window-open/window-close
 ├─ addCommand ×2           KHÔNG có hotkey mặc định
 ├─ workspace.on(active-leaf-change / file-open / layout-change) → đóng UI
 └─ addSettingTab

onunload()
 └─ mọi thứ đã đăng ký qua this.register() / registerEvent() tự chạy:
    ├─ selectionManager.destroy()   gỡ listener mọi window, huỷ timer
    ├─ ui.destroy()                 gỡ icon + popup khỏi DOM, popScope
    ├─ orchestrator.destroy()       tăng token, xoá cache
    ├─ tts.destroy()                dừng audio, revoke objectURL
    └─ clearCssVariables()          mọi window
```

## Từng module

### `core/SelectionManager.ts`

Sở hữu **toàn bộ** việc gắn sự kiện DOM. Bảy loại: `mouseup`, `keyup`, `keydown`, `dblclick`, `selectionchange`, `pointerdown/up/cancel`, `scroll`, `resize`.

Ba quyết định không hiển nhiên:

- **Chụp snapshot ngay lập tức.** Nhấn chuột lên nút dịch sẽ thu gọn vùng chọn *trước khi* handler click chạy. Bất cứ thứ gì đọc từ `getSelection()` lúc click đều đã mất. Có `preventDefault()` trên `mousedown` như lớp thứ hai, nhưng snapshot mới là thứ giữ cho request đúng.
- **Rect được đóng băng** thành `Rect` thuần. `DOMRect` từ `getClientRects()` phản chiếu layout sống — giữ nguyên nó nghĩa là hình học đã lưu **tự đổi khi người dùng cuộn**. Rect đóng băng là *điểm mốc*, không phải toạ độ cuối cùng: xem phần bám theo vùng chọn bên dưới.
- **Không dùng `registerDomEvent`.** Obsidian chỉ giải phóng chúng lúc unload; một phiên mở/đóng popout nhiều lần sẽ tích luỹ đăng ký trỏ vào document đã chết. Thay bằng listener có teardown theo dõi, và `plugin.register(() => destroy())` để dọn dẹp lúc unload **vẫn tự động**.

Có một trường hợp tinh tế: khi command palette lấy focus, vùng chọn bị thu gọn. Manager phân biệt "mất selection vì chrome Obsidian" với "người dùng chọn thứ khác" và **giữ lại snapshot** ở trường hợp đầu — nếu không, command *Dịch vùng chọn* sẽ không bao giờ có gì để dịch.

### `core/ContextDetector.ts`

Node → bề mặt. Thứ tự kiểm tra không tuỳ tiện: `<input>` trước (cần bộ đọc selection khác hẳn), rồi PDF (view PDF có thể nhúng trong note, bề mặt trong cùng thắng), rồi editor trước reading view (Live Preview lồng `.cm-content` bên trong markdown view).

Nhận diện bằng `tagName`, **tuyệt đối không `instanceof`**: mỗi browser window sở hữu bộ class DOM riêng, nên `<input>` trong popout **không phải** `instanceof HTMLInputElement` của window chính.

`inProperties` là cờ riêng chứ không phải một giá trị context. Hai câu hỏi khác nhau: `context` trả lời "gõ phím có chèn chữ không" (quyết định phím tắt cục bộ), còn `inProperties` phục vụ toggle phạm vi độc lập. Giá trị property là contenteditable, tên property là `<input>` — không cái nào có context riêng.

### `selection/` — ba nguồn

| Nguồn | Khi nào | Vì sao cần |
|---|---|---|
| `DomSelectionSource` | Mặc định | CM6 render text node thật, nên một listener ở mức document phủ cả reading view, Live Preview, Source mode và lớp text PDF. Không cần CodeMirror extension. |
| `InputSelectionSource` | `<input>`/`<textarea>` đang focus | `getSelection()` trả về rỗng cho các phần tử này; text nằm trong shadow tree. Hình học tính bằng kỹ thuật **mirror div**. |
| `PdfSelectionSource` | Chỉ khi hai nguồn trên rỗng | Obsidian 1.9 có lỗi khiến `Selection.toString()` rỗng dù các span đang được tô sáng. |

### `ui/Positioner.ts`

Hàm **thuần**: nhận hình học + callback `hitTest`, trả hình học. Mọi tiếp xúc DOM ở trong `UiController`. Đó là thứ khiến mọi luật đặt vị trí test được không cần browser, kể cả hành vi né vật cản.

Fallback khi không candidate nào vừa là **kẹp** candidate ưu tiên vào biên, không phải bỏ cuộc: icon ép sát mép vẫn dùng được, còn không có icon thì trông như plugin hỏng.

Icon và popup đều `position: fixed`. Không phải lựa chọn thẩm mỹ: trang PDF mang CSS transform để zoom, và phần tử `absolute` là hậu duệ của phần tử có transform sẽ thừa hưởng transform đó, phải bù trừ thủ công và hỏng lại ở mức zoom tiếp theo.

### Bám theo vùng chọn khi cuộn

Icon và popup neo vào vùng bôi đen chứ không vào một toạ độ màn hình. Cuộn thì chúng trôi theo; cuộn hẳn ra ngoài thì chúng ẩn đi rồi hiện lại khi cuộn về. Chỉ Escape, click ra ngoài, mất vùng chọn, hoặc đổi leaf/file/layout mới thực sự đóng chúng.

Nguồn toạ độ có **hai tầng**, và tầng hai không phải để cho chắc — nó là bắt buộc:

| Tầng | Cách đo | Vì sao cần |
|---|---|---|
| 1. `snapshot.getLiveRects()` | Đo lại `Range`/`<input>`/span PDF đã theo dõi | Chính xác tuyệt đối, đúng cả khi layout reflow chứ không riêng khi cuộn |
| 2. `scrollDelta(snapshot.scrollAnchors)` | Dời rect đóng băng đi đúng quãng các scroller đã chạy | CM6 **virtualize**: cuộn xa vài màn hình là text node bị huỷ, `Range` chết hẳn và tầng 1 trả `null` từ đó trở đi |

Ba chi tiết quyết định việc này trông mượt hay giật:

- **Một `requestAnimationFrame` tại một thời điểm.** Một cử chỉ cuộn bắn hàng trăm event; gộp lại thành tối đa một frame là khác biệt giữa "bám theo" và "chạy đuổi".
- **Placement dính.** Lần đặt đầu tiên chạy `place()` đầy đủ rồi **ghi nhớ** candidate thắng cuộc; nhánh cuộn chỉ tính lại đúng candidate đó. Chạy lại cả cuộc tìm mỗi frame là đúng luật nhưng khiến icon lật từ dưới lên trên giữa chừng.
- **Nhánh cuộn không kẹp biên và không dò vật cản.** Kẹp biên chính là thứ ghim icon vào mép màn hình trong khi chữ của nó đã trôi đi mất, còn `elementsFromPoint` sáu lần mỗi frame thì không rẻ. Thay vào đó là một cổng hiển thị: bbox không giao với phần leaf đang thấy được thì gắn class `is-anchor-hidden`. Máy trạng thái **không đổi** trong suốt quá trình — đây thuần tuý là chuyện vẽ.

Resize đi đường khác: nó đổi chính cái boundary, nên candidate đã chọn có thể sai thật, và nó xứng đáng với một lượt `place()` đầy đủ.

### `ui/TranslatePopup.ts`

Dựng DOM hoàn toàn bằng helper của Obsidian — **không bao giờ phân tích chuỗi markup**. Vừa là guideline, vừa là cách duy nhất an toàn để hiển thị text đến từ dịch vụ dịch.

Cơ chế giãn theo nội dung:

1. Dựng nội dung **một lần**, vào một bản sao ẩn mang cùng class và cùng `max-width` → đo được kích thước nó sẽ thực sự chiếm.
2. Ghim kích thước hiện tại lên popup thật (để transition có điểm bắt đầu).
3. **Di chuyển** node sang popup thật — không dựng lại — nên listener gắn lúc dựng vẫn sống.
4. rAF → gán kích thước đích → transition 180 ms.
5. `transitionend` (có timer dự phòng) → `height: auto` → chạy lại Positioner.

Bước 5 cần timer dự phòng vì `transitionend` **không bắn** khi kích thước không đổi, hoặc khi người dùng bật `prefers-reduced-motion` và transition bị tắt trong CSS.

Popup **không lấy focus** khi mở: làm vậy sẽ thu gọn vùng chọn, mà nhìn thấy chữ nào vừa được dịch chính là phần lớn giá trị của việc giữ highlight. Bù lại, phím Tab đầu tiên chuyển focus vào trong.

### `core/TranslationOrchestrator.ts`

Nơi duy nhất khởi tạo request mạng.

**Request token.** `requestUrl` không có `AbortController`, nên request đang bay **không huỷ được — chỉ bỏ qua được**. Mỗi request mang theo một số đếm lúc đi và kiểm lại lúc về; phản hồi có token cũ thuộc về vùng chọn người dùng đã bỏ qua.

**Cache ghi trước khi kiểm token.** Công đã tốn rồi; người dùng bỏ dở lượt tra đó rất có thể sẽ tra lại. Cache chỉ nằm trong bộ nhớ và **không bao giờ** ghi vào `data.json` — tệp đó đồng bộ giữa các thiết bị, và một plugin không nên âm thầm tích luỹ hồ sơ mọi thứ người dùng đã tra.

**Bổ sung từ điển chạy qua `allSettled`.** Đây thuần tuý là phần thưởng thêm: một từ điển chậm, sập, hay đơn giản là không biết từ đó, tuyệt đối không được làm chậm hay làm hỏng một bản dịch đã thành công.

### `providers/`

`parseGtx` là phần phòng thủ nhất trong toàn bộ mã nguồn, vì endpoint đó **không có tài liệu**: đặc tả duy nhất của nó là thứ nó thực sự gửi. Fixture trong `tests/fixtures/gtx-*.json` là **bản chụp nguyên văn** từ endpoint thật, không phải viết tay — fixture bịa chỉ chứng minh parser đồng ý với giả định của người viết.

Chụp fixture thật đã sửa được ba điều đoán sai: phiên âm nguồn nằm ở **cell 3** của hàng không có text; phản hồi cho câu dài **9 phần tử** với `data[1]` là `null` chứ không phải 14; và mục ví dụ (`dt=ex`) là chỗ duy nhất mang thẻ HTML — nên nó không còn được yêu cầu nữa.

Chuẩn hoá **NFC** ở cả hai chiều: Google trả tiếng Việt ở dạng phân tách (`a` + dấu huyền rời thay vì `à`), trông y hệt nhưng so sánh không bằng. Nếu không chuẩn hoá thì cache tách đôi, nút sao chép dán ra text mà bàn phím tiếng Việt không bao giờ tạo ra, và tìm kiếm của Obsidian không khớp.

Host DeepL suy ra từ hậu tố `:fx` của khoá. Gửi khoá Free vào host Pro trả `403 "Wrong endpoint"`, nhìn y hệt khoá sai; suy ra tự động **xoá bỏ hẳn** failure mode thay vì thêm một setting để người dùng chọn sai.

Chỉ retry `429`, `503`, `529`. Một `403` hai giây nữa vẫn là `403`, và trên API tính tiền thì retry nó là đốt quota để không học được gì.

## Chạy kiểm tra

```bash
npm run verify   # build + test + lint + kiểm tra guideline
```

`npm run check` chạy riêng [`scripts/check-guidelines.mjs`](../scripts/check-guidelines.mjs), biến các tiêu chí mà submission Obsidian **bị từ chối vì vi phạm** thành thứ chạy được.
