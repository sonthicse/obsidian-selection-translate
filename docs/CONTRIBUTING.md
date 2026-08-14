# Đóng góp

Cảm ơn bạn đã quan tâm. Tài liệu này nói cách chạy dự án và những gì được kỳ vọng ở một thay đổi.

## Thiết lập

```bash
git clone https://github.com/sonthicse/obsidian-selection-translate.git
cd obsidian-selection-translate
npm install
```

Yêu cầu Node 18 trở lên (khuyến nghị 20). Dự án có **zero runtime dependency** — mọi thứ trong `package.json` đều là devDependency, và điều đó là cố ý. Mỗi dependency thêm vào phải giải thích được trong PR.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Build lại mỗi khi sửa file, kèm sourcemap inline |
| `npm run build` | Kiểm kiểu rồi build bản production |
| `npm test` | Chạy unit test một lần |
| `npm run test:watch` | Test ở chế độ theo dõi |
| `npm run lint` | ESLint |
| `npm run check` | Bộ kiểm tra guideline của Obsidian |
| **`npm run verify`** | **Chạy cả bốn. Phải xanh trước khi mở pull request hoặc trước khi nộp plugin.** |

## Phát triển trên vault thật

Cách gọn nhất là clone thẳng vào thư mục plugin của một vault dùng để thử:

```bash
cd <vault-thu-nghiem>/.obsidian/plugins

# Thư mục đặt theo plugin `id`, không theo tên repo — Obsidian trông đợi vậy.
git clone https://github.com/sonthicse/obsidian-selection-translate.git selection-translate
cd selection-translate
npm install && npm run dev
```

Bật **Ghi log gỡ lỗi** trong tuỳ chọn của plugin, rồi mở console (`Ctrl+Shift+I`). Plugin [Hot Reload](https://github.com/pjeby/hot-reload) giúp khỏi phải tắt/bật thủ công.

> Đừng dùng vault chính của bạn. Một plugin đang sửa dở có thể làm Obsidian treo.

## Kiến trúc

Đọc [ARCHITECTURE.md](ARCHITECTURE.md) trước khi sửa gì nhiều hơn một dòng. Có một quy tắc bao trùm:

> **UI không biết provider nào trả lời. Provider không bao giờ thấy một node DOM.**

Đây là thứ giữ cho phần lõi test được dưới Node thuần. Nếu một thay đổi buộc bạn phải phá quy tắc đó, gần như chắc chắn có cách khác.

## Kỳ vọng đối với một thay đổi

### Test

- Logic thuần (parser, normalizer, cache, máy trạng thái, positioner) **phải có test**.
- Test đặt ở `tests/`, chạy dưới Node — không Electron, không mạng.
- Fixture đặt ở `tests/fixtures/`, và **tuyệt đối không được chứa khoá API**.

Nếu bạn thêm fixture cho endpoint gtx, hãy dùng **bản chụp thật** chứ đừng viết tay. Endpoint đó không có tài liệu; đặc tả duy nhất của nó là thứ nó thực sự gửi, và fixture bịa chỉ chứng minh parser đồng ý với giả định của bạn. Việc chụp fixture thật đã từng sửa được ba giả định sai trong chính dự án này.

### Ràng buộc bắt buộc

Đây là các quy tắc của Obsidian, và `npm run check` sẽ chặn nếu vi phạm:

- Dựng DOM bằng `createDiv` / `createEl` / `setText`. **Không bao giờ** gán chuỗi markup.
- Dùng `this.app`, không dùng biến toàn cục.
- Mọi log đi qua `src/utils/log.ts`. Lỗi thật thì `console.error` hoặc `new Notice()`.
- Không đặt hotkey mặc định cho command.
- Không đưa plugin id vào command id — Obsidian tự thêm tiền tố.
- Màu sắc và khoảng cách nằm trong `styles.css`. Trong TypeScript chỉ được đặt toạ độ tính lúc chạy (`top`/`left`/`width`/`height`).
- Mọi chuỗi hiển thị đi qua `t()`, và phải có mặt ở **cả tám** catalogue trong `src/i18n/`.
- Dọn sạch tài nguyên trong `onunload`.

### Mạng

- Mọi request đi qua `requestWithRetry` trong `src/providers/http.ts`. Không gọi `requestUrl` trực tiếp ở nơi khác, và **không bao giờ** dùng `fetch` — nó bị CORS chặn với DeepL.
- Chỉ gửi ra ngoài đúng đoạn văn bản người dùng chủ động chọn.
- Bất kỳ host mới nào cũng **phải** được thêm vào bảng Network use ở cả `README.md`, `README.vi.md` và `docs/PRIVACY.md`. Thiếu là bị Obsidian từ chối.
- Khoá API không được ghi log, không được nhúng vào thông báo lỗi.

### Đa ngôn ngữ

Plugin có **tám** ngôn ngữ giao diện: `en`, `vi`, `zh-Hant`, `zh-Hans`, `ja`, `es`, `it`, `ar`. `en.ts` là nguồn chân lý; bảy file còn lại khai `satisfies Messages`, nên quên một key là **lỗi biên dịch**, không phải một nhãn trống mà ai đó phát hiện sau khi phát hành.

Thêm một chuỗi mới thì thêm vào `en.ts` trước, rồi đủ bảy file kia — playbook đầy đủ ở mục 5.3 của [`CLAUDE.md`](../CLAUDE.md).

**Đọc [`GLOSSARY.md`](GLOSSARY.md) trước khi dịch.** Mỗi thuật ngữ cốt lõi có một bản dịch cố định cho mỗi ngôn ngữ, và những khái niệm dùng chung với Obsidian phải dùng đúng từ bản địa hoá chính thức của Obsidian đang dùng.

Chuỗi tiếng Việt phải **đủ dấu**. Không viết "cai dat" thay cho "cài đặt".

## Commit

Dùng [conventional commits](https://www.conventionalcommits.org/):

```
feat(popup): show alternative meanings for single words
fix(selection): keep the snapshot when the palette takes focus
docs(privacy): state exactly what debug logging records
```

Phần thân commit nên giải thích **vì sao**, không phải **cái gì** — phần "cái gì" đã nằm trong diff rồi. Nếu thay đổi sửa một lỗi, hãy mô tả lỗi đó biểu hiện ra sao với người dùng.

## Báo lỗi

Dùng [issue template](https://github.com/sonthicse/obsidian-selection-translate/issues/new/choose). Kèm log console (bật *Ghi log gỡ lỗi*) sẽ giúp ích rất nhiều.

⚠️ **Đọc lại log trước khi dán.** Log có chứa tối đa 80 ký tự đầu của đoạn bạn đã bôi đen. Log không bao giờ chứa khoá API.

## Giấy phép

Đóng góp vào dự án này được phát hành theo [giấy phép MIT](../LICENSE).
