# Cài đặt

Bốn cách, xếp từ dễ nhất đến khó nhất.

---

## 1. Từ community store

*Cách này chỉ dùng được sau khi plugin đã được Obsidian duyệt.*

1. Mở **Settings** (`Ctrl+,` hoặc `Cmd+,`).
2. **Community plugins** → nếu đang bật **Restricted mode**, bấm **Turn on community plugins**.
3. Bấm **Browse**.
4. Tìm **Selection Translate**.
5. **Install** → **Enable**.

Cập nhật về sau diễn ra tự động qua Obsidian.

---

## 2. Thủ công, từ một bản Release

Dùng khi plugin chưa lên store, hoặc bạn muốn ghim một phiên bản cụ thể.

1. Mở [trang Releases](https://github.com/sonthicse/osidian-selection-translate/releases/latest).
2. Ở mục **Assets**, tải đúng **ba tệp**:
   - `main.js`
   - `manifest.json`
   - `styles.css`
3. Tìm thư mục vault của bạn, rồi tạo thư mục:

   ```
   <vault>/.obsidian/plugins/selection-translate/
   ```

   > `.obsidian` là thư mục ẩn. Trên Windows bật *Hiện các mục ẩn* trong File Explorer; trên macOS bấm `Cmd+Shift+.` trong Finder.

4. Chép ba tệp vừa tải vào thư mục đó. Kết quả phải là:

   ```
   <vault>/.obsidian/plugins/selection-translate/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

5. Trong Obsidian: **Settings → Community plugins** → tắt **Restricted mode** → bấm nút tải lại (biểu tượng xoay) cạnh *Installed plugins* → bật **Selection Translate**.

> Nếu plugin không xuất hiện, gần như chắc chắn là do lồng thêm một cấp thư mục — kiểm tra xem `main.js` có nằm **trực tiếp** trong `selection-translate/` không, chứ không phải trong `selection-translate/selection-translate/`.

Cập nhật thủ công: tải lại ba tệp, ghi đè, rồi tắt/bật plugin.

---

## 3. Bản beta qua BRAT

BRAT theo dõi repo GitHub và tự cập nhật bản beta cho bạn.

1. Cài **BRAT** từ community store (tên đầy đủ: *Obsidian42 - BRAT*).
2. Bật BRAT.
3. Mở command palette (`Ctrl+P`) → chạy **BRAT: Add a beta plugin for testing**.
4. Nhập:

   ```
   sonthicse/osidian-selection-translate
   ```

5. Bấm **Add Plugin**. BRAT tải bản release mới nhất và bật plugin.

Để cập nhật: chạy **BRAT: Check for updates to all beta plugins**.

Để gỡ: **Settings → BRAT** → xoá khỏi danh sách, rồi tắt plugin ở *Community plugins*.

---

## 4. Build từ mã nguồn

Dùng khi bạn muốn sửa mã, hoặc muốn tự kiểm chứng thứ mình chạy.

### Yêu cầu

- **Node.js 18 trở lên** (khuyến nghị 20). Kiểm tra bằng `node -v`.
- **git**.

### Các bước

```bash
git clone https://github.com/sonthicse/osidian-selection-translate.git
cd osidian-selection-translate

npm install
npm run build
```

Lệnh trên sinh ra `main.js` ở thư mục gốc. Chép `main.js`, `manifest.json` và `styles.css` vào `<vault>/.obsidian/plugins/selection-translate/` như cách 2.

### Phát triển liên tục

Cách gọn nhất là clone **thẳng vào** thư mục plugin của một vault dùng để thử nghiệm:

```bash
cd <vault>/.obsidian/plugins

# Chú ý tham số cuối: thư mục phải đặt tên theo plugin `id`, không theo tên repo.
git clone https://github.com/sonthicse/osidian-selection-translate.git selection-translate
cd selection-translate

npm install
npm run dev      # build lại mỗi khi sửa file
```

> Repo tên `osidian-selection-translate` nhưng plugin `id` là `selection-translate`.
> `git clone` mặc định đặt tên thư mục theo repo, và Obsidian trông đợi thư mục
> trùng với `id` — nên phải chỉ định tên thư mục ở cuối lệnh. Bỏ qua chỗ này thì
> plugin vẫn có thể nạp được, nhưng sẽ lệch với bản cài từ store hoặc từ BRAT.

Sau mỗi lần build lại, tắt rồi bật plugin trong Obsidian để nạp mã mới. Plugin [Hot Reload](https://github.com/pjeby/hot-reload) làm việc này tự động.

> Đừng dùng vault chính của bạn để phát triển. Một plugin đang sửa dở có thể làm Obsidian treo.

### Kiểm tra trước khi gửi thay đổi

```bash
npm run verify
```

Lệnh này chạy lần lượt: kiểm kiểu TypeScript, toàn bộ unit test, ESLint, và bộ kiểm tra guideline của Obsidian. Cả bốn phải xanh.

---

## Gỡ cài đặt

1. **Settings → Community plugins** → tắt **Selection Translate** → bấm biểu tượng thùng rác.
2. Nếu muốn xoá sạch cả cài đặt (**bao gồm khoá API**), xoá thư mục:

   ```
   <vault>/.obsidian/plugins/selection-translate/
   ```

Plugin không ghi gì ra ngoài thư mục đó. Không có tệp tạm, không có cache trên đĩa, không có mục nào trong dữ liệu vault của bạn.
