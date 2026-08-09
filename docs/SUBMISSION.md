# Đưa plugin lên Obsidian community store

Quy trình đầy đủ, từ repo tới lúc plugin xuất hiện trong store.

> **Quy trình đã thay đổi.** Trước đây phải fork `obsidianmd/obsidian-releases`, thêm một entry vào `community-plugins.json` rồi mở pull request. **Cách đó không còn dùng nữa.** Hiện nay submit qua cổng cộng đồng tại <https://community.obsidian.md>.
>
> Tài liệu chính thức: <https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin>
>
> `community-plugins.json` vẫn tồn tại, nhưng giờ chỉ là **danh sách đã publish** — dùng để tra cứu, không phải nơi nộp.

---

## Giai đoạn 1 — Chuẩn bị repo

### Checklist trước khi submit

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
- [ ] 🤖 `id` **không chứa** chữ "obsidian" — cổng submit từ chối id như vậy
- [ ] `id` = `selection-translate`, **chưa bị plugin khác chiếm**
- [ ] `minAppVersion` hợp lý (`1.5.0`)
- [ ] `isDesktopOnly: false` — đúng, plugin không dùng API Node/Electron
- [ ] `author` và `authorUrl` chính xác

**Kiểm tra id chưa bị chiếm.** `community-plugins.json` không còn là nơi nộp, nhưng vẫn là danh sách chính thức các plugin đã publish, nên vẫn là chỗ đúng để tra:

```bash
curl -s https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const id="selection-translate";
      const all=JSON.parse(s);
      console.log(all.some(p=>p.id===id) ? `ĐÃ BỊ CHIẾM: ${id}` : `còn trống: ${id} (trong ${all.length} plugin)`);
    })'
```

> Dùng `node` chứ không dùng `grep` vì khoảng trắng trong JSON có thể khác nhau, và một `grep` không khớp trông y hệt như "id còn trống" — kiểu âm tính giả tệ nhất trong một checklist.
>
> Tính đến lần kiểm gần nhất, `selection-translate` **còn trống**. Có tồn tại các plugin tên gần giống (`google-selection-translate`, `deepl-translate-selection`, `translate-inline`); id khác nhau nên không xung đột, nhưng nên xem qua để biết mình khác họ ở đâu.

**Repo**

- [ ] Repo **public**
- [x] **Tên repo khớp với mọi URL trong dự án.** Repo đã đổi tên thành `obsidian-selection-translate` (trước đó thiếu chữ `b`). `package.json`, banner trong `esbuild.config.mjs`, README và tài liệu đã được cập nhật theo tên mới, nên mọi liên kết đều hoạt động.
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

> `isDesktopOnly: false` là một lời khẳng định rằng plugin chạy được trên di động. Ở đây khẳng định đó đúng — plugin không dùng API nào của Node hay Electron — nhưng "chạy được về mặt kỹ thuật" khác với "đã thử". Nếu bạn chưa test được trên di động, hãy ghi rõ điều đó trong README thay vì để người dùng tự phát hiện.

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

Nếu workflow thất bại, **không cần xoá tag**. Vào tab Actions → *Release* → *Run workflow*, nhập tag vào ô `tag`. Workflow chạy lại trên đúng commit của tag đó, nhận lấy release đã tồn tại thay vì báo lỗi vì nó đã tồn tại, và ghi đè asset bằng `--clobber`.

> Đây chính là chỗ `0.1.1` đã trượt. Tag đúng, workflow có chạy, nhưng job chết sau ba giây mà chưa kịp lấy runner nào — không có log, không có bước nào chạy. Release `0.1.1` sau đó được tạo tay trên giao diện web, nên nó tồn tại mà không có asset nào; và ở phiên bản workflow cũ, chạy lại cũng vô ích vì `gh release create` báo lỗi ngay khi release đã có sẵn.

Muốn vá một release cũ đang thiếu asset:

```bash
npm run build
gh release upload 0.1.1 main.js manifest.json styles.css --clobber
```

---

## Giai đoạn 3 — Nộp qua cổng cộng đồng

Không fork, không sửa JSON, không pull request. Toàn bộ diễn ra trên web.

### 1. Đăng nhập

Mở <https://community.obsidian.md> và đăng nhập bằng **tài khoản Obsidian** của bạn (cùng tài khoản dùng cho Obsidian Sync/Publish; tạo miễn phí nếu chưa có).

### 2. Liên kết tài khoản GitHub

Trong phần hồ sơ, liên kết GitHub. Bước này bắt buộc: cổng cần chứng minh bạn sở hữu repo sắp nộp.

Repo phải thuộc chính tài khoản GitHub vừa liên kết — ở đây là `sonthicse`.

### 3. Nộp plugin

Vào mục **Plugins** rồi chọn nút thêm plugin mới — tài liệu chính thức gọi là **"Add your plugin"**, giao diện có thể hiển thị là *New plugin*. Nhập URL repo:

```
https://github.com/sonthicse/obsidian-selection-translate
```

### 4. Hệ thống tự kiểm tra

Việc kiểm diễn ra ngay, không phải chờ người:

| Kiểm cái gì | Ở đâu |
|---|---|
| `manifest.json` tồn tại và hợp lệ | **HEAD của nhánh mặc định** trong repo |
| `id` là duy nhất trên toàn store | So với danh sách đã publish |
| `id` **không chứa** chữ "obsidian" | `manifest.json` |
| Có ít nhất một GitHub Release với **tag khớp `version`** | Trang Releases của repo |
| Release có đính `main.js` và `manifest.json` (và `styles.css` nếu có) dưới dạng **asset rời** | Assets của release |
| Repo gốc có `README.md` và `LICENSE` | Nhánh mặc định |

> ⚠️ Cổng đọc `manifest.json` ở **nhánh mặc định**, còn đọc file build ở **release**. Hai nơi khác nhau. Nếu bạn tăng version rồi quên tạo release — hoặc ngược lại — thì kiểm tra sẽ trượt. Workflow [`release.yml`](../.github/workflows/release.yml) đã tự đối chiếu tag với manifest chính vì lý do này.

### 5. Sửa lỗi nếu bị báo

Nếu có lỗi, cách sửa **không phải** là nộp lại form. Cách đúng là:

1. Sửa trong repo.
2. **Tăng version** và tạo một **release mới**.
3. Cổng đọc lại từ repo.

Nói cách khác: mỗi vòng sửa là một phiên bản mới. Đây là điểm khác căn bản so với quy trình PR cũ — trước đây bạn push lên nhánh của PR rồi bot chạy lại; giờ nguồn sự thật là chính các release của bạn.

Vì vậy nên chạy `npm run verify` cho sạch **trước khi** nộp, thay vì dùng cổng làm nơi kiểm bài.

### 6. Chờ duyệt

Sau khi qua phần kiểm tự động, plugin vào hàng chờ người của Obsidian xem. Thời gian thường tính bằng **tuần**. Khi mọi lỗi đã được xử lý, plugin trở nên cài được từ trong Obsidian.

Những điều thường bị yêu cầu sửa:

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

> Điểm cuối là rủi ro lớn nhất của lần nộp này. Vì quy trình mới không có ô mô tả kiểu pull request, chỗ để nói trước chính là **README**: mục *Network use* đã ghi thẳng rằng `translate.googleapis.com` và `translate.google.com` là endpoint Google không công bố và không hỗ trợ, rằng chúng là mặc định vì không cần tài khoản, và rằng có hai đường chính thức thay thế cách đó một dropdown. Tuỳ chọn trong plugin cũng hiện cảnh báo tương ứng.
>
> Nếu reviewer liên hệ, hãy nêu ba điểm đó thay vì giải thích lại từ đầu.

### 7. Sau khi được duyệt

- Plugin xuất hiện trong community store.
- **Các bản cập nhật về sau không cần nộp lại.** Obsidian tự lấy release mới từ repo của bạn; người dùng nhận cập nhật ngay trong app.
- Mỗi lần phát hành chỉ cần:

  ```bash
  npm version patch      # đồng bộ package.json + manifest.json + versions.json
  git push && git push --tags
  ```

  Workflow lo phần còn lại.

---

## TODO: những cảnh báo còn treo, chờ nâng `minAppVersion`

`npm run lint` chạy cả `eslint-plugin-obsidianmd`, và bốn nhóm cảnh báo dưới đây **cố ý** còn đó. Cả bốn đều chỉ về một phía: API mới hơn sàn `minAppVersion` hiện tại là `1.5.0`. Sửa chúng bây giờ nghĩa là nâng sàn, và nâng sàn nghĩa là cắt mất người dùng bản cũ — cái giá đó lớn hơn giá trị của việc dọn sạch cảnh báo.

| Cảnh báo | Cần bản nào | Ghi chú |
|---|---|---|
| `settings-tab/prefer-setting-definitions`, `display` deprecated | 1.13.0 | Chuyển `display()` → `getSettingDefinitions()`. Đây là việc lớn nhất trong nhóm: viết lại toàn bộ `SettingTab.ts` theo API khai báo, đổi lại là tuỳ chọn của plugin xuất hiện trong ô tìm kiếm settings của Obsidian |
| `setWarning` deprecated | 1.13.0 | Đổi sang `setDestructive()`. Gọi nó ở 1.5.0 là gọi một method không tồn tại — hỏng ngay lúc dựng pane tuỳ chọn |
| `prefer-get-language` | 1.8.7 | Đổi `localStorage.getItem('language')` sang `getLanguage()` |
| `no-global-this` trong `utils/debounce.ts` | — | Không liên quan phiên bản. `globalThis` là *mặc định* cho `TimerHost`; runtime Obsidian luôn truyền window thật xuống, còn unit test chạy dưới `environment: 'node'` nơi không có `window` nào để truyền |

Khi nào quyết định nâng sàn: nâng `minAppVersion` trong `manifest.json`, thêm entry tương ứng vào `versions.json`, rồi xử lý ba hàng đầu cùng một lượt.

## Sau khi phát hành

- Theo dõi Issues.
- Cập nhật `CHANGELOG.md` mỗi lần ra bản mới.
- Nếu đổi `minAppVersion`, cập nhật cả `versions.json` — `version-bump.mjs` làm việc đó tự động.
- Nếu endpoint Google miễn phí ngừng hoạt động, mở issue ghim để người dùng biết và hướng dẫn họ chuyển sang DeepL.
