# Selection Translate

Bôi đen bất kỳ đoạn văn bản nào trong Obsidian rồi dịch tại chỗ — trong note, trong PDF, trong thuộc tính, ở chế độ đọc lẫn khi soạn thảo. Từ đơn còn kèm phiên âm, loại từ và các nghĩa khác.

*[English](README.md)*

![Minh hoạ: bôi đen một từ và xem bản dịch](docs/images/demo.gif)

> **Ảnh mẫu.** Thay `docs/images/demo.gif` bằng bản ghi màn hình thật trước khi phát hành, cùng với `docs/images/popup-word.png` và `docs/images/popup-sentence.png`.

## Tính năng

- **Chạy ở mọi nơi có chữ.** Chế độ đọc, Live Preview, Source mode, trang PDF, thuộc tính (cả tên lẫn giá trị), bảng, callout, code block, liên kết và cửa sổ popout.
- **Một nút bấm, không phải một thứ chen ngang.** Bôi đen thì hiện một nút nhỏ bên cạnh. Nút tự né menu, tooltip và thanh công cụ PDF thay vì che chúng.
- **Chi tiết từ điển cho từ đơn.** Phiên âm, loại từ và các nghĩa khác, không chỉ một dòng dịch.
- **Ba công cụ dịch.** Google không cần khoá, Google Cloud Translation, hoặc DeepL. Máy chủ đúng cho khoá DeepL được chọn từ chính khoá đó.
- **Đọc thành tiếng.** Bằng giọng hệ thống (ngoại tuyến) hoặc bằng Google.
- **Đọc Markdown như người đọc.** Bôi đen `**Domain** [information](https://example.com)` thì gửi đi `Domain information`, không gửi cú pháp và URL.
- **Giao diện Việt và Anh**, mặc định theo ngôn ngữ của chính Obsidian.
- **Không lưu gì, không theo dõi gì.** Không telemetry dưới bất kỳ hình thức nào, và bản dịch không bao giờ được ghi ra đĩa.

## Cài đặt

### Từ danh sách community plugins

Settings → Community plugins → Browse → tìm **Selection Translate** → Install → Enable.

### Từ một bản release

1. Tải `main.js`, `manifest.json` và `styles.css` từ [release mới nhất](https://github.com/sonthicse/obsidian-selection-translate/releases/latest).
2. Đặt vào `<vault>/.obsidian/plugins/selection-translate/`.
3. Settings → Community plugins → tắt Restricted mode → bật **Selection Translate**.

### Bản beta qua BRAT

Cài [BRAT](https://github.com/TfTHacker/obsidian42-brat), rồi *Add beta plugin* với `sonthicse/obsidian-selection-translate`.

Hướng dẫn đầy đủ, gồm cả build từ mã nguồn, ở [docs/INSTALL.md](docs/INSTALL.md).

## Cách dùng

1. Bôi đen một đoạn. Một nút nhỏ hiện lên bên cạnh.
2. Bấm vào nút, hoặc bấm phím kích hoạt bạn đã đặt.
3. Popup hiện bản dịch, và nếu là từ đơn thì kèm phiên âm cùng các nghĩa.

Các cách khác:

- **Nháy đúp một từ** để dịch ngay (bật *Dịch khi nháy đúp*).
- **Dịch ngay khi bôi đen** bỏ qua hẳn nút bấm (bật *Dịch ngay khi bôi đen*).
- **Command palette** có *Selection Translate: Dịch vùng chọn*, bạn có thể gán phím tắt ở Settings → Hotkeys. Plugin không tự đặt phím tắt nào.

Đóng popup bằng Escape, bằng cách click ra ngoài, hoặc bằng nút đóng.

Không cần cấu hình gì để bắt đầu: công cụ dịch mặc định không cần tài khoản và không cần khoá.

## Dữ liệu gửi ra mạng

Plugin này liên hệ với các host dưới đây. **Không có gì được gửi đi trừ khi bạn chủ động bôi đen và yêu cầu dịch**, và thứ duy nhất được gửi là đoạn văn bản đã bôi đen.

| Host | Khi nào | Gửi gì | Để làm gì |
|---|---|---|---|
| `translate.googleapis.com` | Chỉ khi công cụ là **Google (không cần khoá)** — mặc định | Đoạn đã chọn, mã ngôn ngữ nguồn và đích | Dịch, và dữ liệu từ điển cho từ đơn |
| `api-free.deepl.com` | Chỉ khi công cụ là **DeepL** và khoá kết thúc bằng `:fx` | Đoạn đã chọn, mã ngôn ngữ, khoá API DeepL của bạn | Dịch |
| `api.deepl.com` | Chỉ khi công cụ là **DeepL** và khoá **không** kết thúc bằng `:fx` | Đoạn đã chọn, mã ngôn ngữ, khoá API DeepL của bạn | Dịch |
| `translation.googleapis.com` | Chỉ khi công cụ là **Google Cloud** | Đoạn đã chọn, mã ngôn ngữ, khoá API Google Cloud của bạn | Dịch |
| `api.dictionaryapi.dev` | Chỉ khi bật *Tra cứu từ đơn*, từ đó là tiếng Anh, và Google không trả về phiên âm | Đúng một từ đã chọn | Phiên âm và định nghĩa |
| `translate.google.com` | Chỉ khi bạn bấm đọc to **và** giọng đọc đặt là **Google** | Đoạn đã chọn | Âm thanh đọc |

Không bao giờ gửi: tên tệp, đường dẫn, nội dung vault ngoài đoạn đã chọn, metadata của note, cài đặt của bạn, hay bất kỳ định danh nào.

**Plugin này không có telemetry, analytics, báo cáo lỗi hay theo dõi sử dụng.**

Giọng hệ thống (mặc định khi đọc to) dùng bộ tổng hợp giọng nói của hệ điều hành và không gửi gì ra ngoài.

`translate.googleapis.com` và `translate.google.com` là **endpoint mà Google không công bố cũng không hỗ trợ**. Đây chính là những endpoint mà tiện ích mở rộng Google Translate dùng. Chúng có thể thay đổi hoặc ngừng hoạt động bất cứ lúc nào, và việc sử dụng chúng không được bảo hộ bởi bất kỳ điều khoản dịch vụ công bố nào. Chúng là mặc định vì không cần tài khoản; nếu bạn muốn dùng dịch vụ được hỗ trợ chính thức, hãy chọn **DeepL** hoặc **Google Cloud** trong tuỳ chọn — cả hai đều là API có tài liệu.

Chi tiết, và cách tắt từng thứ một, ở [docs/PRIVACY.md](docs/PRIVACY.md).

## Về khoá API của bạn

Khoá DeepL và Google Cloud được lưu **dạng văn bản thuần** tại:

```
<vault>/.obsidian/plugins/selection-translate/data.json
```

Đây là nơi Obsidian giữ cài đặt của plugin; không plugin nào có thể lưu bí mật tốt hơn thế. Hệ quả:

- **Đừng commit tệp đó** nếu vault của bạn nằm trong Git. Thêm `.obsidian/plugins/selection-translate/data.json` vào `.gitignore`.
- **Cân nhắc loại nó khỏi việc đồng bộ.** Obsidian Sync, Dropbox, iCloud và OneDrive sẽ sao chép khoá sang mọi thiết bị và lên máy chủ của nhà cung cấp.
- Ai truy cập được tệp vault của bạn thì có khoá của bạn. Hãy coi vault đã đồng bộ là một nơi có khoá nằm trong đó.

Khoá không bao giờ được ghi log, không bao giờ nằm trong thông báo lỗi, và không bao giờ được gửi đi đâu ngoài chính dịch vụ đã cấp nó. Ô nhập khoá được che nên nó không lộ ra trong ảnh chụp màn hình hay video quay màn hình.

Nếu khoá bị lộ, hãy thu hồi: [trang tài khoản DeepL](https://www.deepl.com/your-account/keys), [Google Cloud credentials](https://console.cloud.google.com/apis/credentials).

Hướng dẫn lấy khoá từng bước ở [docs/API-SETUP.md](docs/API-SETUP.md).

## Hạn chế đã biết

- **Công cụ Google miễn phí là không chính thức.** Nó có thể hỏng bất cứ lúc nào. Nếu phần từ điển ngừng xuất hiện thì thường là vì lý do này; bản dịch vẫn suy giảm êm và tiếp tục chạy. Đổi sang DeepL hoặc Google Cloud nếu cần dịch vụ được hỗ trợ.
- **DeepL không trả dữ liệu từ điển.** Không gói API nào của DeepL cung cấp phiên âm hay loại từ. Khi chọn DeepL, thông tin đó được lấy riêng, từ Google hoặc Free Dictionary API, nếu bật *Tra cứu từ đơn*.
- **Chọn text trong PDF dễ hỏng trên một số bản Obsidian.** Obsidian 1.9 có lỗi khiến vùng chọn trong PDF bị coi là rỗng. Plugin đọc thẳng lớp văn bản được tô sáng để khôi phục. Nếu việc đó gây trục trặc, tắt *Khôi phục vùng chọn trong PDF*.
- **Đọc to cần có giọng đã cài.** Giọng hệ thống phụ thuộc hệ điều hành, và nhiều bản Linux không có sẵn giọng nào. Bạn sẽ được báo rõ ràng thay vì chỉ nhận được sự im lặng. Giọng Google không cần cài gì nhưng gửi văn bản tới Google.
- **Đọc to bằng Google bị cắt khúc.** Endpoint của nó từ chối đoạn dài quá khoảng 200 ký tự, nên đoạn dài bị chia và phát tuần tự, có khoảng nghỉ ngắn giữa các phần.
- **Yêu cầu hết hạn sau 15 giây.** Request bên dưới không huỷ được, chỉ bỏ mặc được, nên dịch vụ chậm sẽ tạo ra lỗi kèm nút thử lại thay vì một vòng xoay không bao giờ dừng.
- **Popup không lấy focus** khi mở, để vùng bôi đen vẫn nhìn thấy được. Bấm Tab để chuyển focus vào nó.

## Đóng góp

Rất hoan nghênh báo lỗi và pull request. Xem [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) để biết cách thiết lập môi trường phát triển, và [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) để hiểu các phần ghép với nhau ra sao.

```bash
npm install
npm run dev      # build ở chế độ theo dõi
npm run verify   # kiểm kiểu, test, lint và các kiểm tra guideline của Obsidian
```

## Ghi công

- Xây dựng cho [Obsidian](https://obsidian.md).
- Biểu tượng từ [Lucide](https://lucide.dev), vốn được Obsidian đóng gói sẵn.
- Phiên âm và định nghĩa từ [Free Dictionary API](https://dictionaryapi.dev).
- Dịch bởi [DeepL](https://www.deepl.com/pro-api) và [Google Translate](https://cloud.google.com/translate).

Dự án này không liên kết, không được bảo trợ và không có quan hệ với Obsidian, DeepL hay Google.

## Giấy phép

[MIT](LICENSE) © Thi Duong
