# Kết quả điều tra automated check — E0-T1 & E0-T2

Tài liệu này ghi lại **bằng chứng**, không ghi phỏng đoán. Mọi kết luận dưới đây đều kèm nguồn kiểm chứng được: lệnh đã chạy, file:dòng, hoặc phản hồi API của GitHub.

Ngày điều tra: **2026-08-12**. Trạng thái repo: `main` @ `97ea9f3`, version `0.2.2`.

---

## 1. Về bằng chứng trực tiếp (E0-T1)

**Không có bằng chứng trực tiếp.**

Chủ dự án — người duy nhất có quyền truy cập kết quả submit trên <https://community.obsidian.md> — xác nhận ngày 2026-08-12 rằng **không còn giữ nguyên văn output của bot/portal**: không có comment của bot, không có log, không có mã lỗi, không có link ticket trên portal.

Vì vậy **phần bảng finding theo định dạng `finding | rule của Obsidian | file:dòng | cách sửa | trạng thái` không thể lập từ nguồn gốc**. Lập một bảng như thế từ suy đoán sẽ là dữ liệu bịa, và một tài liệu điều tra chứa dữ liệu bịa còn tệ hơn một tài liệu ghi thẳng rằng nó thiếu dữ liệu.

Toàn bộ trọng lượng của kết luận vì thế chuyển sang **E0-T2** (mục 3) và sang **bằng chứng thứ cấp** (mục 2).

### Nếu về sau tìm lại được output gốc

Bổ sung vào đây theo đúng định dạng đã chốt, rồi đối chiếu với mục 3 xem giả thuyết nào bị bác:

| finding | rule của Obsidian | file:dòng | cách sửa | trạng thái |
|---|---|---|---|---|
| *(chưa có dữ liệu)* | | | | |

---

## 2. Bằng chứng thứ cấp có thật trong repo

Đây **không phải** output của bot. Đây là dấu vết mà chính chủ dự án đã ghi lại **tại thời điểm** xử lý phản hồi review, nằm trong lịch sử git — nên nó nói về đợt review đó với độ tin cậy cao hơn bất kỳ suy luận nào từ trạng thái code hiện tại.

### 2.1. Commit `5d82b3c` — "fix: clear the findings from Obsidian's automated plugin review"

Ngày 2026-08-09. Thân commit liệt kê **6 nhóm finding đã sửa**:

| # | Finding (theo mô tả trong commit) | Nơi đã sửa |
|---|---|---|
| 1 | `el.style.height = 'auto'` là **static style assignment** → đổi sang `removeProperty('height')` | `src/ui/TranslatePopup.ts` (nay ở dòng 360, kèm comment giải thích) |
| 2 | Phụ thuộc `builtin-modules` thừa → dùng `builtinModules` của `node:module` | `esbuild.config.mjs` |
| 3 | Timer toàn cục → đưa sau tham số `TimerHost` để runtime truyền window thật (popout cần window riêng) | `src/utils/debounce.ts` |
| 4 | `createElement` thủ công → dùng helper của Obsidian | `src/selection/InputSelectionSource.ts` |
| 5 | Cast thừa, `as never` cũ, và `any` do `Array.isArray` sinh ra khi narrow `unknown` | nhiều file provider |
| 6 | Tooltip trên slider → gỡ, vì giá trị đã hiện inline | `src/settings/SettingTab.ts` |

Commit cũng ghi rõ **`setWarning()` cố ý giữ lại**: `setDestructive()` chỉ có từ Obsidian 1.13.0, gọi nó ở `minAppVersion: 1.5.0` sẽ ném lỗi ngay lúc dựng pane tuỳ chọn.

### 2.2. Commit `13047cc` — "chore: run Obsidian's own lint rules in CI"

Ngày 2026-08-09, ngay sau commit trên. Thân commit nêu **nguyên nhân gốc, bằng lời của chính người đã nhận phản hồi**:

> The findings the plugin review sent back had all passed `npm run lint`, for two reasons: eslint-plugin-obsidianmd was not installed, and the TypeScript preset was the untyped `recommended`, which omits the type-aware unsafe-any rules entirely.

Nói cách khác: **CI của repo tại thời điểm submit không chạy bộ rule mà bên review chạy.** Cả hai lỗ hổng đã được vá trong chính commit đó — `eslint-plugin-obsidianmd` được cài, và preset đổi sang `recommendedTypeChecked` có type-aware.

### 2.3. `docs/SUBMISSION.md` — nhóm cảnh báo hoãn có chủ ý

Mục "TODO: những cảnh báo còn treo, chờ nâng `minAppVersion`" (dòng 207–218) ghi 4 nhóm cảnh báo **cố ý** để lại, cả 4 đều vì cùng một lý do: API mới hơn sàn `minAppVersion: 1.5.0` hiện tại. Đây là quyết định đánh đổi đã có văn bản, không phải sót.

### 2.4. Giới hạn của bằng chứng thứ cấp

Phải nói rõ để không đọc quá lên: các commit trên cho biết **những finding nào đã được sửa**, nhưng **không cho biết** bot có báo lỗi khiến submit bị chặn hay không, cũng không cho biết đợt submit rơi vào version nào. Mục 3.3 (H3) mới là chỗ trả lời câu hỏi đó.

---

## 3. Kiểm chứng 6 giả thuyết (E0-T2)

Mỗi giả thuyết có kết luận dứt khoát. Không mục nào để ở trạng thái "có thể".

### Bảng tổng hợp

| # | Giả thuyết | Kết luận | Bằng chứng cốt lõi |
|---|---|---|---|
| H1 | `eslint-plugin-obsidianmd` pin `^0.4.1`, bot chạy ruleset mới hơn | **LOẠI TRỪ** | `0.4.1` **là** bản mới nhất trên npm |
| H2 | Gán style trực tiếp trong JS — 17 vị trí `.style.*` | **LOẠI TRỪ** | Rule chỉ bắt giá trị literal; cả 17 vị trí đều động |
| H3 | Release thiếu asset / tag lệch manifest | **XÁC NHẬN** (với release `0.1.1`) | GitHub API: release `0.1.1` có **0 asset** |
| H4 | Endpoint Google không chính thức | **LOẠI TRỪ** khỏi automated; **còn nguyên** là rủi ro review thủ công | Không có rule tự động nào kiểm host; README đã công bố đủ 6 host |
| H5 | Checklist `docs/SUBMISSION.md` còn nhiều mục chưa tick | **LOẠI TRỪ** khỏi automated | Automated chỉ kiểm 6 điều; các mục chưa tick nằm ngoài 6 điều đó |
| H6 | `addEventListener` không qua `registerDomEvent` | **LOẠI TRỪ** | 11/11 listener đều có teardown; lý do không dùng `registerDomEvent` đã ghi trong code |

---

### H1 — nâng `eslint-plugin-obsidianmd` → **LOẠI TRỪ**

**Cách kiểm chứng đã chạy** (đúng như kế hoạch yêu cầu): tra bản mới nhất, nâng, chạy `npm run lint`, so số finding.

```
$ npm view eslint-plugin-obsidianmd version
0.4.1
$ npm view eslint-plugin-obsidianmd time.modified
2026-07-02T16:55:40.550Z
$ npm ls eslint-plugin-obsidianmd
└── eslint-plugin-obsidianmd@0.4.1
```

`^0.4.1` trong `package.json` **đã resolve tới đúng bản mới nhất** mà registry có. Danh sách version đầy đủ kết thúc ở `0.4.1`; `dist-tags.latest` cũng là `0.4.1`.

**Không có bản nào mới hơn để nâng lên**, nên không có commit nâng phiên bản riêng — bước đó rỗng chứ không bị bỏ qua.

| | Số finding |
|---|---|
| Trước (`0.4.1`) | **8 warning / 0 error** |
| Sau (không có bản mới hơn — vẫn `0.4.1`) | **8 warning / 0 error** |

Toàn bộ 8 warning nằm đúng trong 4 nhóm đã ghi là hoãn có chủ ý ở `docs/SUBMISSION.md:207-218`:

```
src/i18n/index.ts:35        obsidianmd/prefer-get-language              (cần 1.8.7)
src/settings/SettingTab.ts  prefer-setting-definitions + 4× no-deprecated (cần 1.13.0)
src/settings/SettingTab.ts:446  setWarning deprecated                   (cần 1.13.0)
src/utils/debounce.ts:22    obsidianmd/no-global-this                   (có lý do kỹ thuật)
```

**0 error.** Giả thuyết "bot chạy ruleset mới hơn nên bắt được thứ CI không bắt" không còn chỗ đứng: CI đang chạy đúng ruleset mới nhất hiện có.

> Cần phân biệt hai thời điểm. Giả thuyết H1 **đúng cho lần submit trong quá khứ** — nhưng nguyên nhân khi đó không phải "pin bản cũ", mà là **plugin chưa được cài chút nào** (xem 2.2). Lỗ hổng đó đã đóng ở `13047cc`. Ở trạng thái hiện tại, H1 loại trừ.

---

### H2 — gán style trực tiếp trong JS → **LOẠI TRỪ**

Repo có đúng **17 vị trí** `.style.*`, khớp con số trong kế hoạch:

| File | Dòng | Dạng |
|---|---|---|
| `src/selection/InputSelectionSource.ts` | 116, 122, 123, 125 | `setProperty` với giá trị đọc từ `getComputedStyle` |
| `src/utils/dom.ts` | 28, 29 | `removeProperty` của custom property `--st-*` |
| `src/ui/TriggerIcon.ts` | 64, 65 | `style.left/top` = template literal có expression |
| `src/ui/TriggerIcon.ts` | 77, 78 | `setProperty('--st-clip-*', …)` — mẫu custom property |
| `src/ui/TranslatePopup.ts` | 127, 128 | `style.left/top` = template literal có expression |
| `src/ui/TranslatePopup.ts` | 148, 149 | `setProperty('--st-clip-*', …)` — mẫu custom property |
| `src/ui/TranslatePopup.ts` | 360 | `removeProperty('height')` |
| `src/ui/TranslatePopup.ts` | 377, 378 | `style.width/height` = template literal có expression |

**Bằng chứng quyết định** — rule `obsidianmd/no-static-styles-assignment` **đang bật ở mức `error`** trong preset `recommended` (kiểm bằng cách in ra config đã resolve), và `npm run lint` cho **0 error**. Lý do nằm ngay trong mã nguồn của rule:

```js
// node_modules/eslint-plugin-obsidianmd/dist/lib/rules/noStaticStylesAssignment.js:41-43
AssignmentExpression(node) {
    // We only care about static assignments (literals)
    if (node.right.type !== TSESTree.AST_NODE_TYPES.Literal) {
        return;
    }
```

Và comment đầu file nói thẳng rule **không** bắt cái gì (dòng 10–13):

```js
// This rule will not flag:
//   - element.style.width = myWidth; (assignment from a variable)
//   - element.style.transform = `translateX(${offset}px)`; (assignment from a template literal with expressions)
```

Cả 17 vị trí đều là giá trị **động**: template literal có expression, hoặc giá trị đọc từ `getComputedStyle`, hoặc `removeProperty`. Với `setProperty`, rule chỉ báo khi **đối số thứ hai là literal** — ở đây đều là template literal có expression.

Cách kiểm chứng mà kế hoạch đề xuất — "chuyển phần positioning sang CSS custom property rồi lint lại" — **không cần thực hiện**: phần positioning đã hợp lệ với rule, và chuyển nó sang custom property sẽ là thay đổi không mang lại lợi ích nào mà lại vi phạm ràng buộc "E0 không đổi hành vi".

> Vẫn còn một finding **thật** đã từng bị bắt trong nhóm này: `el.style.height = 'auto'` — đúng dạng literal mà rule bắt. Nó đã được sửa ở `5d82b3c` và nay là `removeProperty('height')` tại `TranslatePopup.ts:360`, có comment ghi rõ lý do. Đây là bằng chứng cho thấy H2 **từng đúng**, và đã được xử lý xong.

---

### H3 — release thiếu asset / tag lệch manifest → **XÁC NHẬN**

Đây là giả thuyết duy nhất được xác nhận, và nó là **nguyên nhân có sức giải thích cao nhất**.

Không có `gh` CLI trong môi trường; dùng GitHub REST API công khai thay thế:

| Tag | draft | prerelease | Asset |
|---|---|---|---|
| `0.1.1` | false | false | **(KHÔNG CÓ ASSET NÀO)** |
| `0.2.0` | false | false | `main.js` (86 961 B), `manifest.json` (363 B), `styles.css` (12 366 B) |
| `0.2.1` | false | false | `main.js` (86 962 B), `manifest.json` (363 B), `styles.css` (12 366 B) |
| `0.2.2` | false | false | `main.js` (89 489 B), `manifest.json` (363 B), `styles.css` (13 162 B) |

**Release `0.1.1` có 0 asset.** Trong khi đó cổng submit kiểm bắt buộc:

> Release có đính `main.js` và `manifest.json` (và `styles.css` nếu có) dưới dạng **asset rời**
> — `docs/SUBMISSION.md:153`

Một submit thực hiện khi `0.1.1` là release mới nhất sẽ **trượt automated check ngay ở bước đó**, không cần tới bất kỳ vấn đề lint nào.

Nguyên nhân của release rỗng đã được ghi lại tại `docs/SUBMISSION.md:110`: workflow chạy nhưng job chết sau ba giây trước khi nhận runner, release `0.1.1` sau đó được tạo tay trên giao diện web nên không có asset; phiên bản workflow cũ chạy lại cũng vô ích vì `gh release create` báo lỗi khi release đã tồn tại.

**Đã được sửa.** Commit `4477168` ("chore(release): make the release workflow idempotent and verifiable") làm workflow nhận lấy release đã tồn tại thay vì báo lỗi, và ghi đè asset bằng `--clobber`. Kết quả nhìn thấy được: cả `0.2.0`, `0.2.1`, `0.2.2` đều có đủ 3 asset rời.

**Các điều kiện còn lại của cổng submit, kiểm ở trạng thái hiện tại — tất cả đều đạt:**

| Điều kiện | Kết quả |
|---|---|
| Repo public | ✅ `private: false` |
| Có `README.md` và `LICENSE` ở nhánh mặc định | ✅ license `MIT` |
| `manifest.json` hợp lệ ở HEAD nhánh mặc định (`main`) | ✅ version `0.2.2` |
| Có release với tag khớp `version` | ✅ tag `0.2.2` tồn tại, đủ asset |
| Tag không có tiền tố `v` | ✅ `0.1.1`, `0.2.0`, `0.2.1`, `0.2.2` |
| Không draft, không prerelease | ✅ cả 4 release |
| `id` là duy nhất trên store | ✅ `selection-translate` còn trống (tra 6 580 plugin đã publish) |
| `id` không chứa chữ "obsidian" | ✅ |

---

### H4 — endpoint Google không chính thức → **LOẠI TRỪ khỏi automated; giữ nguyên là rủi ro thủ công**

Đúng như kế hoạch đã dự đoán. Bằng chứng:

1. **Không có rule tự động nào kiểm host mạng.** Toàn bộ 41 rule của `eslint-plugin-obsidianmd` đã được liệt kê; không rule nào đọc URL hay tên host. Danh sách 6 kiểm tra của cổng submit (`docs/SUBMISSION.md:147-154`) cũng không có mục nào về endpoint.
2. **Việc công bố đã đầy đủ.** 6 host trong `src/constants.ts:140-147` khớp **chính xác** 6 host trong bảng *Network use* của `README.md:66-73`:

| Host | `constants.ts` | README |
|---|---|---|
| `api-free.deepl.com` | :141 | ✅ |
| `api.deepl.com` | :142 | ✅ |
| `translation.googleapis.com` | :143 | ✅ |
| `translate.googleapis.com` | :144 | ✅ |
| `api.dictionaryapi.dev` | :145 | ✅ |
| `translate.google.com` | :146 | ✅ |

`README.md:81` đã ghi thẳng rằng hai host `translate.googleapis.com` và `translate.google.com` là endpoint Google **không công bố và không hỗ trợ**.

Rủi ro còn lại là **người** đọc, không phải máy. Phương án phòng thủ ở mục 4.

---

### H5 — checklist `docs/SUBMISSION.md` chưa tick hết → **LOẠI TRỪ khỏi automated**

Checklist còn rất nhiều ô `[ ]`, nhưng đó **không phải** nguyên nhân automated fail — automated check chỉ kiểm 6 điều đã liệt ở H3, và **không điều nào** trong đó nằm trong phần checklist chưa tick.

Rà từng dòng, đặc biệt ba mục kế hoạch chỉ đích danh:

| Mục | Trạng thái thực tế | Bằng chứng |
|---|---|---|
| README *Network use* đủ host | ✅ **Thực chất đã xong**, chỉ chưa tick | 6/6 host khớp `constants.ts` (bảng ở H4) |
| Ảnh demo thật, không placeholder | ✅ **Thực chất đã xong**, chỉ chưa tick | `docs/images/` có `demo.gif` (182 KB), `popup-word.png`, `popup-sentence.png`, `deepl-key.png`, `google-cloud-key.png` — đều là ảnh thật, đều được README/API-SETUP tham chiếu |
| Test đa nền tảng | ❌ **Thực sự chưa làm** | Không có bằng chứng nào trong repo cho Windows / macOS / Linux / Mobile |

**Hai mục thực sự còn hở** (đều nằm ngoài automated check, đều là việc trên GitHub chứ không phải trong code):

1. **Test đa nền tảng chưa làm.** `manifest.json` khai `isDesktopOnly: false`, tức khẳng định plugin chạy được trên di động. Khẳng định đó đúng về kỹ thuật — không dùng API Node/Electron nào — nhưng chưa được thử.
2. **Topic GitHub thiếu 4/5.** Repo hiện chỉ có `obsidian-plugin`; checklist yêu cầu thêm `obsidian-md`, `translation`, `deepl`, `google-translate`.

**Một phát hiện ngoài checklist, đáng sửa trước khi submit:** description của repo trên GitHub hiện là

> `An Obsidian plugin for translating selected text. Vide coding with Claude 😊`

Nó khác hẳn `description` trong `manifest.json`, chứa lỗi chính tả (`Vide` → `Vibe`), và có emoji. Đây là thứ **người** reviewer đọc đầu tiên. Sửa ở phần cài đặt repo trên GitHub, không phải trong file nào — nên nằm ngoài phạm vi commit của E0.

---

### H6 — `addEventListener` không qua `registerDomEvent` → **LOẠI TRỪ**

Repo có **11** lời gọi `addEventListener`, khớp con số trong kế hoạch. Đối chiếu từng chỗ:

| # | file:dòng | Sự kiện | Được gỡ ở đâu |
|---|---|---|---|
| 1 | `settings/HotkeyRecorder.ts:68` | `keydown` | `removeEventListener` tại `:64`, cùng một cặp đóng/mở |
| 2 | `tts/WebSpeechEngine.ts:96` | `voiceschanged` | `removeEventListener` tại `:86` và `:92` |
| 3 | `ui/TranslatePopup.ts:210` | `wheel` | Element bị `remove()` trong `close()` (`:168`) |
| 4 | `ui/TranslatePopup.ts:372` | `transitionend` | `removeEventListener` tại `:350` trong `finish()` |
| 5 | `ui/TranslatePopup.ts:482` | `click` (nút hành động lỗi) | Element bị `remove()` trong `close()` |
| 6 | `ui/TranslatePopup.ts:520` | `click` (nút header) | Element bị `remove()` trong `close()` |
| 7 | `ui/TriggerIcon.ts:165` | `mousedown` | Element bị `remove()` trong `destroy()` (`:119`) |
| 8 | `ui/TriggerIcon.ts:170` | `click` | như trên |
| 9 | `ui/TriggerIcon.ts:182` | `wheel` | như trên |
| 10 | `core/SelectionManager.ts:179` | 8 sự kiện document | mỗi cái push một teardown tại `:180`, chạy trong `detach()`/`destroy()` |
| 11 | `core/SelectionManager.ts:210` | `resize` | teardown push tại `:211` |

**Chuỗi tới `onunload` là liên tục:**

```
main.ts:43  this.register(() => this.tts.destroy());
main.ts:63  this.register(() => this.orchestrator.destroy());
main.ts:73  this.register(() => this.ui.destroy());   → icon.destroy() + popup.destroy()
main.ts:85  this.register(() => this.selectionManager.destroy());
```

`this.register()` là cơ chế chính thức của Obsidian: mọi callback đã đăng ký được chạy khi plugin unload. Không listener nào sống sót qua `onunload`.

**Việc không dùng `registerDomEvent` là quyết định có chủ ý, có lý do kỹ thuật đúng**, ghi tại `src/core/SelectionManager.ts:159-165`:

> Listeners are added directly and their removers tracked, rather than going through `registerDomEvent`. The reason is `detach`: Obsidian only releases `registerDomEvent` handlers when the whole plugin unloads, so a session that opens and closes popouts repeatedly would accumulate registrations against dead documents.

Đây chính xác là lý do `registerDomEvent` **không** dùng được cho bài toán này: plugin hỗ trợ popout window, và mỗi popout mở/đóng cần gỡ listener theo phiên chứ không đợi tới lúc unload. Không có rule nào của `eslint-plugin-obsidianmd` bắt lỗi mẫu này, và `npm run lint` cho 0 error.

---

## 4. Kết luận cuối cùng của E0-T2

**Giả thuyết được xác nhận là nguyên nhân: H3 — release thiếu asset.**

Chuỗi nhân quả có bằng chứng đầy đủ:

1. Release `0.1.1` được tạo tay sau khi workflow chết sớm → **0 asset** (xác nhận qua GitHub API, và đã ghi tại `docs/SUBMISSION.md:110`).
2. Cổng submit kiểm bắt buộc "release có `main.js` + `manifest.json` dưới dạng asset rời" → **trượt ngay tại bước này**.
3. Song song, `npm run lint` khi đó **không** chạy `eslint-plugin-obsidianmd` (chưa cài) và dùng preset không type-aware, nên một batch finding lọt qua CI của repo và được phía review trả về (`13047cc`, nguyên văn ở mục 2.2).

Hai vấn đề độc lập nhau, và **cả hai đều đã được xử lý trước khi E0 bắt đầu**: `4477168` sửa workflow release, `13047cc` + `5d82b3c` sửa CI và các finding.

**H1, H2, H4, H5, H6 đều bị loại trừ** ở trạng thái hiện tại, mỗi cái với bằng chứng riêng ở trên.

**Điều đó có nghĩa gì cho E0:** không còn finding automated nào tồn đọng để sửa. `npm run verify` xanh với 0 error trên đúng ruleset mới nhất mà bên review dùng. Phần giá trị còn lại của E0 nằm ở **E0-T3** (chất lượng code và tái cấu trúc chuẩn bị cho E1–E6) và **E0-T4** (thêm cổng CI để những lớp lỗi này không quay lại), chứ không phải ở việc dọn finding.

**Việc còn hở, nằm ngoài phạm vi code của E0** — cần làm trước khi submit lại:

| Việc | Ở đâu | Vì sao ngoài phạm vi E0 |
|---|---|---|
| Test trên Windows / macOS / Linux / Mobile | thủ công | Không phải thay đổi code |
| Thêm 4 topic GitHub còn thiếu | cài đặt repo GitHub | Không phải file trong repo |
| Sửa description repo trên GitHub (`Vide coding with Claude 😊`) | cài đặt repo GitHub | Không phải file trong repo |

---

## 5. Đường lùi cho `google-free` (E0-T5)

Ghi sẵn ở đây để nếu reviewer phản đối endpoint không chính thức thì xử lý trong **vài giờ** thay vì vài ngày.

**Phương án:** đổi provider mặc định sang một provider chính thức. Đây là **đổi đúng một hằng số**:

```ts
// src/settings/settings.ts — DEFAULT_SETTINGS
provider: 'google-free',   →   provider: 'deepl',
```

**Điều kiện áp dụng:** sau E5 sẽ có 6 provider, trong đó `deepl`, `google-cloud`, `baidu`, `youdao`, `papago` đều là API có tài liệu công khai. Trước E5, hai lựa chọn chính thức đã sẵn sàng là `deepl` và `google-cloud`.

**Cái giá phải trả, để cân nhắc có ý thức:** cả hai lựa chọn chính thức đều **cần API key**. Đổi mặc định nghĩa là người cài mới không dùng được ngay sau khi bật plugin, mà phải qua một bước lấy key. Đó là lý do `google-free` đang là mặc định, và cũng là lý do chỉ nên đổi khi reviewer thực sự yêu cầu — chứ không đổi phòng xa.

**Nếu phải đổi, làm đủ 4 việc trong cùng một PR:**

1. Đổi hằng số trong `DEFAULT_SETTINGS`.
2. Thêm migration: người dùng cũ đang ở `google-free` **giữ nguyên** lựa chọn của họ; chỉ mặc định cho cài đặt mới đổi.
3. Cập nhật README: câu mô tả "no configuration is needed to start" (`README.md:60`) sẽ không còn đúng.
4. Cập nhật `docs/INSTALL.md` và `docs/API-SETUP.md`: bước lấy key trở thành bước bắt buộc chứ không còn là tuỳ chọn.

**Nếu reviewer chỉ hỏi chứ không yêu cầu đổi**, ba điểm cần nêu (theo `docs/SUBMISSION.md:188`) là: endpoint đã được công bố rõ trong README, tuỳ chọn trong plugin đã hiện cảnh báo tương ứng, và có hai đường chính thức thay thế cách đó đúng một dropdown.
