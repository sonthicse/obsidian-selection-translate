# Quyền riêng tư

Tài liệu này nói chính xác dữ liệu nào rời khỏi máy bạn, đi đâu, khi nào, và cách tắt từng thứ.

## Tóm tắt

- Thứ duy nhất được gửi ra ngoài là **đoạn văn bản bạn chủ động bôi đen**.
- Không có gì được gửi cho tới khi bạn **chủ động yêu cầu dịch**.
- **Không có telemetry, analytics, báo cáo lỗi hay theo dõi sử dụng.** Không có mã nào trong plugin làm việc đó.
- Bản dịch **không bao giờ được ghi ra đĩa**.
- Plugin có thể chạy **hoàn toàn không gửi gì** nếu bạn tắt hết (xem cuối tài liệu).

---

## Dữ liệu nào rời khỏi máy

### Luôn luôn được gửi khi bạn yêu cầu dịch

| Dữ liệu | Ghi chú |
|---|---|
| Đoạn văn bản đã bôi đen | Sau khi bóc cú pháp Markdown, nếu bật tuỳ chọn đó. Bấm **Xem bản gốc** trong popup để thấy chính xác thứ đã gửi. |
| Mã ngôn ngữ nguồn và đích | Ví dụ `en`, `vi`, `auto`. |
| Khoá API của bạn | **Chỉ** khi dùng DeepL hoặc Google Cloud, và **chỉ** gửi tới chính dịch vụ đã cấp khoá đó. |

### Không bao giờ được gửi

- Tên tệp, đường dẫn tệp, tên vault
- Nội dung note ngoài đoạn bạn bôi đen
- Frontmatter, tag, liên kết, metadata
- Cài đặt của bạn
- Định danh máy, định danh người dùng, hay bất kỳ mã định danh nào
- Thống kê sử dụng dưới bất kỳ dạng nào

---

## Đi đâu, khi nào

| Host | Điều kiện kích hoạt | Tắt bằng cách |
|---|---|---|
| `translate.googleapis.com` | Công cụ dịch = **Google (không cần khoá)** — mặc định | Đổi công cụ sang DeepL hoặc Google Cloud |
| `api-free.deepl.com` | Công cụ = **DeepL**, khoá kết thúc `:fx` | Đổi công cụ |
| `api.deepl.com` | Công cụ = **DeepL**, khoá không kết thúc `:fx` | Đổi công cụ |
| `translation.googleapis.com` | Công cụ = **Google Cloud** | Đổi công cụ |
| `api.dictionaryapi.dev` | Bật *Tra cứu từ đơn*, từ đó là tiếng Anh, **và** công cụ dịch không trả phiên âm | Đặt *Nguồn từ điển* = **Google** hoặc **Tắt** |
| `translate.google.com` | Bấm nút đọc to **và** *Giọng đọc* = **Google** | Đặt *Giọng đọc* = **Giọng hệ thống** (mặc định) |

**Giọng hệ thống** (mặc định khi đọc to) dùng bộ tổng hợp giọng nói của hệ điều hành. Không gửi gì ra mạng.

## Hai endpoint không chính thức

`translate.googleapis.com` và `translate.google.com` là **endpoint nội bộ của Google, không có tài liệu công khai và không được hỗ trợ**. Đây là những endpoint mà tiện ích Google Translate của trình duyệt dùng.

Hệ quả bạn cần biết:

- Không có điều khoản dịch vụ công bố nào cho phép sử dụng chúng.
- Google không cam kết gì về việc họ xử lý dữ liệu gửi tới đó ra sao.
- Chúng có thể ngừng hoạt động bất cứ lúc nào.

Nếu bạn làm việc với tài liệu nhạy cảm, hoặc trong môi trường có yêu cầu tuân thủ, **hãy chuyển sang DeepL hoặc Google Cloud** — cả hai đều là API có tài liệu, có điều khoản, và có chính sách xử lý dữ liệu công khai:

- [Chính sách bảo mật DeepL](https://www.deepl.com/privacy)
- [Điều khoản Google Cloud](https://cloud.google.com/terms) · [Xử lý dữ liệu](https://cloud.google.com/terms/data-processing-addendum)

Free Dictionary API là dịch vụ cộng đồng miễn phí; xem <https://dictionaryapi.dev>.

---

## Khoá API lưu ở đâu

Dạng **văn bản thuần**, tại:

```
<vault>/.obsidian/plugins/selection-translate/data.json
```

Đây là nơi Obsidian giữ cài đặt plugin. Obsidian không cung cấp kho lưu bí mật cho plugin, nên **không plugin nào có thể làm tốt hơn**. Đừng tin bất kỳ plugin Obsidian nào nói rằng nó "mã hoá" khoá API của bạn — khoá dùng để giải mã cũng phải nằm ngay đó.

Điều plugin này **có** làm:

- Ô nhập khoá dùng `type="password"`, nên khoá không lộ trong ảnh chụp màn hình hay video quay màn hình.
- Khoá **không bao giờ** được ghi vào log, kể cả khi bật *Ghi log gỡ lỗi*.
- Khoá **không bao giờ** nằm trong thông báo lỗi.
- Khoá **chỉ** được gửi tới chính dịch vụ đã cấp nó.
- Nút *Khôi phục mặc định* **giữ lại** khoá, để bạn không mất chúng vì một nút dành cho tuỳ chọn hiển thị.

Điều bạn nên làm:

1. **Nếu vault nằm trong Git**, thêm vào `.gitignore`:

   ```gitignore
   .obsidian/plugins/selection-translate/data.json
   ```

2. **Nếu vault được đồng bộ** (Obsidian Sync, Dropbox, iCloud, OneDrive, Syncthing), hiểu rằng khoá sẽ được sao chép sang mọi thiết bị và lên máy chủ của dịch vụ đồng bộ. Nếu điều đó không chấp nhận được, loại trừ tệp trên khỏi việc đồng bộ.

3. **Nếu khoá bị lộ**, thu hồi ngay:
   - DeepL: <https://www.deepl.com/your-account/keys>
   - Google Cloud: <https://console.cloud.google.com/apis/credentials>

---

## Bộ nhớ đệm

Plugin ghi nhớ các bản dịch gần đây để tra lại không tốn request.

- **Chỉ nằm trong bộ nhớ (RAM).** Không bao giờ ghi ra `data.json` hay bất kỳ tệp nào.
- **Mất sạch khi đóng Obsidian** hoặc khi tắt plugin.
- Mặc định giữ **200** mục. Đặt **Số bản dịch ghi nhớ** = `0` trong mục *Nâng cao* để tắt hẳn.

Việc này là cố ý. `data.json` đồng bộ giữa các thiết bị, và một plugin không nên âm thầm tích luỹ hồ sơ mọi thứ bạn đã tra cứu — nhất là khi hồ sơ đó theo bạn sang mọi máy và lên máy chủ đồng bộ.

---

## Ghi log gỡ lỗi

Tắt theo mặc định. Khi bật, plugin ghi thông tin chẩn đoán ra console của nhà phát triển.

Log **có** chứa:

- Loại sự kiện và bước chuyển trạng thái
- Tên bề mặt (`md-read`, `md-edit`, `pdf`, `input`, `other`)
- **Độ dài** vùng chọn, và **tối đa 80 ký tự đầu** của đoạn đã bôi đen
- Tên công cụ dịch, thời gian phản hồi, có phải lấy từ bộ nhớ đệm không
- Mã lỗi và mã trạng thái HTTP

Log **không** chứa:

- **Khoá API** — không bao giờ, ở bất kỳ nhánh nào
- **Nội dung bản dịch** — chỉ ghi số lượng mục từ điển, không ghi chữ

Bản dịch bị loại khỏi log một cách có chủ đích: đó là nội dung note của chính bạn, và việc bật một cờ gỡ lỗi không phải là sự đồng ý để nó tràn vào một log rồi được đính kèm vào báo cáo lỗi công khai.

⚠️ **80 ký tự đầu của vùng chọn thì vẫn được ghi**, vì nếu không thì hầu hết báo lỗi về việc phát hiện selection không thể chẩn đoán được. Đây là sự đánh đổi có ý thức, không phải sơ suất. **Hãy đọc lại log trước khi dán vào một issue công khai**, và tắt tuỳ chọn này khi bạn làm việc với nội dung nhạy cảm.

---

## Cách chạy plugin mà không gửi gì ra ngoài

Không thể — dịch máy cần một dịch vụ dịch. Nhưng bạn có thể **giảm xuống đúng một host duy nhất**:

1. **Công cụ dịch** = DeepL (hoặc Google Cloud) → chỉ còn một host, có điều khoản rõ ràng.
2. **Tra cứu từ đơn** = tắt → không gọi `api.dictionaryapi.dev`.
3. **Giọng đọc** = Giọng hệ thống → không gọi `translate.google.com`.
4. **Dịch ngay khi bôi đen** = tắt (mặc định) → không có request nào tự phát sinh; mỗi request đều do bạn bấm.

Với cấu hình trên, plugin liên hệ **đúng một host**, **chỉ khi bạn bấm nút**, và **chỉ gửi đoạn văn bản bạn đã bôi đen**.

---

## Kiểm chứng những điều trên

Đừng tin lời tài liệu — tự kiểm:

1. Mở DevTools: `Ctrl+Shift+I` (hoặc `Cmd+Option+I` trên macOS).
2. Sang tab **Network**.
3. Bôi đen một đoạn và bấm dịch.
4. Xem request được gửi: kiểm tra host, và mở phần **Payload** để xem chính xác thân request.

Toàn bộ mã nguồn ở trong repo này. Nơi duy nhất khởi tạo request mạng là [`src/providers/http.ts`](../src/providers/http.ts); mọi provider đều đi qua đó.
