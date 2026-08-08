# Đưa plugin lên Obsidian community store

Quy trình đầy đủ, từ repo tới lúc được merge.

---

## Giai đoạn 1 — Chuẩn bị repo

### Checklist trước khi mở PR

Chạy `npm run verify` trước. Lệnh này tự kiểm phần lớn các mục có dấu 🤖 dưới đây.

**Mã nguồn**

- [ ] 🤖 `npm run build` không lỗi, không cảnh báo TypeScript
- [ ] 🤖 `npm test` xanh toàn bộ
- [ ] 🤖 `npm run lint` sạch
- [ ] 🤖 Không có `innerHTML` / `outerHTML` / `insertAdjacentHTML` trong `src/`
- [ ] 🤖 Không dùng biến toàn cục `app`, chỉ `this.app`
- [ ] 🤖 `console.log` chỉ nằm trong `src/utils/log.ts`
- [ ] 🤖 Không còn tên mẫu `MyPlugin`, `SampleSettingTab`, `Sample Plugin`
- [ ] 🤖 Không command nào đặt hotkey mặc định
- [ ] Đã xoá hết mã mẫu còn sót của `obsidian-sample-plugin`
- [ ] Heading trong settings dùng `Setting.setHeading()`, không dùng `<h1>`/`<h2>`
- [ ] Không có heading nào chứa chữ "settings" hay tên plugin
- [ ] Chuỗi hiển thị dùng **sentence case**
- [ ] Dọn sạch tài nguyên trong `onunload`

**manifest.json**

- [ ] 🤖 Nằm ở **thư mục gốc** repo
- [ ] 🤖 `description` ≤ 250 ký tự, bắt đầu bằng động từ, kết thúc bằng dấu chấm, không emoji
- [ ] 🤖 `name` không chứa chữ "Obsidian"
- [ ] 🤖 `version` khớp `package.json`, và `versions.json` có mục tương ứng
- [ ] `id` = `selection-translate`, **chưa trùng** trong `community-plugins.json`
- [ ] `minAppVersion` hợp lý (`1.5.0`)
- [ ] `isDesktopOnly: false` — đúng, plugin không dùng API Node/Electron
- [ ] `author` và `authorUrl` chính xác

**Kiểm tra id chưa trùng:**

```bash
curl -s https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json \
  | grep -c '"id": "selection-translate"'
```

Kết quả phải là `0`.

**Repo**

- [ ] Repo **public**
- [ ] Có `LICENSE` (MIT)
- [ ] 🤖 Đã commit `package-lock.json`
- [ ] `README.md` có mục **Network use** liệt kê **đủ 6 host**
- [ ] `README.md` nói rõ khoá API lưu plaintext ở đâu
- [ ] `README.md` nêu rõ endpoint Google là **không chính thức**
- [ ] Đã bật Issues, có issue template
- [ ] Đã thêm topic: `obsidian-plugin`, `obsidian-md`, `translation`, `deepl`, `google-translate`
- [ ] Ảnh/GIF demo đã thay bằng ảnh thật (không còn placeholder)

**Đã kiểm thử**

- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] Mobile (iOS / Android)

> Khai báo **trung thực** những nền tảng bạn đã test trong PR. Ghi "đã test trên Windows và Linux, chưa test mobile" thì tốt hơn nhiều so với việc tick bừa rồi để reviewer phát hiện.

---

## Giai đoạn 2 — Tạo release

Obsidian tìm plugin qua tag GitHub bằng đúng số phiên bản, **không có tiền tố `v`**.

```bash
# Tăng phiên bản: cập nhật đồng bộ package.json, manifest.json, versions.json
npm version patch      # hoặc minor / major

# Đẩy commit và tag
git push && git push --tags
```

`npm version` chạy `version-bump.mjs` để giữ ba tệp phiên bản khớp nhau, rồi tạo tag. Workflow [`release.yml`](../.github/workflows/release.yml) bắt tag đó, chạy `npm run verify`, đối chiếu tag với manifest, rồi tạo Release kèm ba asset **rời**.

### Kiểm tra release

- [ ] Tag đúng dạng `0.1.0` — **không** phải `v0.1.0`
- [ ] Tag khớp `version` trong `manifest.json`
- [ ] Release có đủ ba asset rời: `main.js`, `manifest.json`, `styles.css`
- [ ] **Không** đóng gói dưới dạng zip — Obsidian không đọc được zip
- [ ] Release **không** đánh dấu là draft hay pre-release

Nếu workflow thất bại, xoá tag rồi làm lại:

```bash
git tag -d 0.1.0
git push --delete origin 0.1.0
```

---

## Giai đoạn 3 — Mở pull request

### 1. Fork

Fork <https://github.com/obsidianmd/obsidian-releases>.

### 2. Thêm entry vào **cuối** `community-plugins.json`

```json
  {
    "id": "selection-translate",
    "name": "Selection Translate",
    "author": "Thi Duong",
    "description": "Translate selected text in notes and PDFs with an inline popup showing pronunciation, part of speech, and alternative meanings.",
    "repo": "sonthicse/selection-translate"
  }
```

Lưu ý:

- Thêm vào **cuối mảng**, không chèn giữa.
- Nhớ dấu phẩy sau phần tử liền trước.
- `description` phải **khớp chính xác** với `manifest.json`.
- `repo` là `user/repo`, **không** phải URL đầy đủ.

### 3. Chỉ sửa duy nhất một tệp

⚠️ PR **chỉ được** thay đổi `community-plugins.json`. Đụng vào bất kỳ tệp nào khác sẽ bị từ chối ngay.

Kiểm tra trước khi đẩy:

```bash
git diff --name-only master
# Kết quả phải đúng một dòng: community-plugins.json
```

### 4. Mở PR

- Dùng template dành cho plugin.
- Tick đầy đủ checklist trong template.
- Ghi rõ những nền tảng đã kiểm thử.

### 5. Bot validate chạy

Bot tự động kiểm tra trong vài phút.

- **Error** → **chặn merge**. Phải sửa.
- **Warning** → không chặn nhưng nên sửa; reviewer sẽ hỏi.

Sửa xong thì push lên nhánh của PR, bot chạy lại.

### 6. Chờ reviewer

Người của Obsidian sẽ xem. Thời gian chờ thường tính bằng **tuần**, đôi khi hơn.

Những điều reviewer hay yêu cầu sửa:

| Vấn đề | Đã xử lý trong dự án này |
|---|---|
| Thiếu công bố network use | ✅ README có bảng đủ 6 host |
| Không nói rõ khoá API lưu ở đâu | ✅ README có mục riêng |
| Dùng `innerHTML` | ✅ `npm run check` chặn |
| Dùng biến `app` toàn cục | ✅ `npm run check` chặn |
| Log thừa ra console | ✅ Đi qua một cổng duy nhất, mặc định tắt |
| Đặt hotkey mặc định | ✅ `npm run check` chặn |
| Hardcode style trong TS | ✅ Chỉ toạ độ runtime; màu sắc nằm trong token CSS |
| Còn tên class mẫu | ✅ `npm run check` chặn |
| Dùng endpoint không chính thức | ⚠️ Có, nhưng **công bố rõ ràng**, có cảnh báo trong tuỳ chọn, và có hai lựa chọn chính thức thay thế |

> Điểm cuối là rủi ro lớn nhất của PR này. Hãy chủ động nêu nó trong phần mô tả PR: nói rõ rằng endpoint không chính thức là mặc định vì nó không cần tài khoản, rằng nó được công bố ở cả README lẫn trong tuỳ chọn, và rằng người dùng có hai đường chính thức. Nêu trước thì tốt hơn là để reviewer tự phát hiện.

**Chỉ team Obsidian mới merge được.** Đừng thúc giục.

### 7. Sau khi được merge

- Plugin xuất hiện trong community store trong vòng vài giờ.
- **Các bản cập nhật về sau không cần PR nữa.** Obsidian tự lấy release mới từ repo của bạn.
- Chỉ cần `npm version patch && git push --tags` cho mỗi lần phát hành.

---

## Sau khi phát hành

- Theo dõi Issues.
- Cập nhật `CHANGELOG.md` mỗi lần ra bản mới.
- Nếu đổi `minAppVersion`, cập nhật cả `versions.json` — `version-bump.mjs` làm việc đó tự động.
- Nếu endpoint Google miễn phí ngừng hoạt động, mở issue ghim để người dùng biết và hướng dẫn họ chuyển sang DeepL.
