# Kana Dōjō — trang luyện viết Hiragana & Katakana (v1, lưu trữ)

> **Đây là bản lưu trữ.** Dự án chính đã chuyển sang nền tảng đầy đủ (tài
> khoản, SRS, gamification) tại gốc repo — xem [README gốc](../../README.md).
> Thư mục này giữ nguyên bản offline một-file cũ để ai cần bản zero-dependency,
> không tài khoản, không server vẫn dùng được. `node build.mjs` trong thư mục
> này vẫn chạy như trước, độc lập với `backend/`/`web/` ở gốc repo.

Web app tập viết Kana tương tác: lưới giấy ô vuông kiểu Nhật, hoạt ảnh hướng dẫn
thứ tự nét, đồ theo nét mẫu hoặc tự viết, chấm điểm từng nét theo thời gian thực.

* **208 ký tự** — Hiragana + Katakana, đủ gojūon, dakuten/handakuten và yōon
* **Zero dependency** — HTML/CSS/JS thuần, không framework, không CDN runtime
* **Một file chạy được ngay** — `dist/kana-dojo.html` mở bằng trình duyệt là chạy, kể cả offline

---

## 1. Phân tích & thiết kế UI/UX

### 1.1 Ý tưởng hình ảnh: 原稿用紙 (genkō yōshi)

Thay vì dùng bảng màu "Nhật Bản" chung chung, toàn bộ hệ thống màu lấy từ **giấy
ô vuông tập viết** thật của Nhật — thứ mà người học viết lên hằng ngày:

| Vai trò | Màu | Dùng ở đâu |
|---|---|---|
| Giấy | `#F6F6F2` — trung tính lệch nhẹ về xanh rêu, không phải xám thuần | nền trang |
| Mực in lưới 原稿用紙 | `#3E7154` xanh rêu | khung ô, đường kẻ chữ thập/chéo, nhãn hàng, trạng thái đúng |
| Mực viết 墨 | `#1A1F1C` | nét người dùng viết, chữ, nút chính |
| Chu sa 朱 | `#C33C2B` | nét đang tới lượt, lời phê khi sai, con dấu 済, thanh tiến độ |

Ba màu này không tùy tiện: trong lớp học Nhật, học sinh viết **mực đen** trên
**lưới in xanh**, thầy cô phê và đóng dấu bằng **mực đỏ**. Người dùng đọc được
ngữ nghĩa màu mà không cần chú giải.

Về mặt kỹ thuật: mọi màu khai báo dưới dạng CSS custom property ở `:root`, rồi
định nghĩa lại cho `@media (prefers-color-scheme: dark)` và `[data-theme="dark"]`,
nên cả ba trạng thái (sáng / tối / theo hệ thống) đều đúng.

### 1.2 Typography

* **Zen Old Mincho** — chữ Kana lớn, tên hàng (あ行), tiêu đề. Mincho là kiểu chữ có chân của Nhật, gợi đúng cảm giác sách giáo khoa.
* **Zen Kaku Gothic New** — toàn bộ giao diện, nhãn, nút.

Cả hai đều do nhà thiết kế Nhật vẽ, tải từ Google Fonts (Google Fonts dùng
`unicode-range` nên chỉ tải đúng phần chữ trang cần). Fallback stack đầy đủ về
Hiragino / Yu Gothic / Yu Mincho / Noto — nếu font không tải được, trang vẫn
hiển thị đúng bằng font hệ thống.

### 1.3 Bố cục

```
┌── Header (sticky) ─────────────────────────────────────────┐
│ 仮 Kana Dōjō   [ひらがな|カタカナ]   38/104 ▬▬▭▭   ☾       │
├── Toolbar ─────────────────────────────────────────────────┤
│ (Tất cả) (Cơ bản) (Biến âm) (Âm ghép)  [Bắt đầu] [Ngẫu nhiên]│
├── Bảng ngũ thập âm ─────────────────────────────────────────┤
│ あ行 │ あ  い  う  え  お                                    │
│ か行 │ か  き  く  け  こ                                    │
│  …   │ (や行, わ行 chừa đúng ô trống như bảng gốc)          │
└────────────────────────────────────────────────────────────┘
```

* **Bảng đọc như bảng, không phải như lưới thẻ.** Cột rộng tối đa 124px và luôn
  thẳng hàng giữa các hàng; や行 và わ行 giữ nguyên **ô trống** ở vị trí các âm
  không tồn tại trong tiếng Nhật hiện đại — cấu trúc bảng tự nó truyền đạt
  thông tin, không phải trang trí.
* **Trạng thái mã hoá bằng hình, không chỉ bằng số:** viền xanh = đã luyện,
  con dấu 済 đỏ = đã thuộc, thanh nhỏ dưới ô = điểm tốt nhất. Nhìn lướt là biết
  còn chữ nào chưa động tới.
* **Khu tập viết** là modal: desktop chia 2 cột (khung viết | bảng điều khiển),
  dưới 800px chuyển thành xếp dọc toàn màn hình — ngón tay cần khung viết lớn
  nhất có thể.

### 1.4 Chi tiết dành cho cảm ứng

* `touch-action: none` trên khung viết → không bị cuộn trang khi đang viết.
* Pointer Events thống nhất chuột / cảm ứng / bút Apple Pencil–Wacom, có
  `setPointerCapture` nên nét không đứt khi tay vượt ra ngoài khung.
* Lọc nhiễu: bỏ qua điểm cách điểm trước < 0.6 đơn vị → nét mượt, không răng cưa
  do rung tay.
* Canvas nhân theo `devicePixelRatio` → nét sắc trên màn Retina.

---

## 2. Chức năng

| Nhóm | Chi tiết |
|---|---|
| Bảng chữ | Chuyển Hiragana ⇄ Katakana; lọc Cơ bản (46) / Biến âm (25) / Âm ghép (33) |
| Ký tự | Chữ mẫu, romaji, **gợi ý đọc bằng tiếng Việt**, số nét, phát âm ja-JP |
| Lưới viết | Ô vuông kiểu genkō: viền, đường chữ thập nét đứt, hai đường chéo |
| Hướng dẫn | Hoạt ảnh từng nét bằng `stroke-dasharray` + chấm bút chạy theo đầu nét, đúng thứ tự |
| Chế độ | **Đồ theo nét** (có nét mờ) và **Tự viết** (không gợi ý) |
| Chấm điểm | Điểm 0–100 cho từng nét; sai thì nói rõ *sai cái gì* |
| Tự động | Viết đúng → tự nhảy sang nét tiếp; sai 2 lần → tự phát lại hoạt ảnh nét đó |
| Đối chiếu | Sau khi xong, phủ đường tâm nét chuẩn màu xanh lên mực của bạn |
| Điều khiển | Xóa làm lại · Xem nét mẫu · Trước/Tiếp · So với nét chuẩn |
| Tiến độ | Lưu `localStorage` (có dự phòng RAM khi bị chặn); "thuộc" = ≥80đ ở chế độ Tự viết |
| Bàn phím | `R` xem mẫu · `C` xóa · `Space` nghe · `←/→` đổi chữ · `Esc` đóng |

---

## 3. Kiến trúc kỹ thuật

### 3.1 Chọn thư viện xử lý nét — so sánh

| Phương án | Đánh giá |
|---|---|
| **Hanzi-Writer** | Thư viện tốt và chín, nhưng dữ liệu của nó (Make Me A Hanzi) sinh từ **font chữ Hán**, cần cả `strokes` (đa giác viền nét) lẫn `medians` (đường tâm). Bộ `hanzi-writer-data` không phủ Kana, và thứ tự nét Trung ≠ Nhật ở nhiều chữ. Muốn dùng cho Kana thì phải tự sinh lại dữ liệu — tức là vẫn quay về KanjiVG. |
| **KanjiVG + tự render** ✅ | Nguồn dữ liệu thứ tự nét chuẩn cho **tiếng Nhật**, còn được bảo trì. Mỗi nét là **một path đơn tuyến — chính là đường tâm nét**, đúng thứ hai thứ mà ta cần: vẽ hoạt ảnh và so khớp. Không phụ thuộc runtime. Đổi lại phải tự viết bộ chấm điểm (~120 dòng). |
| `svg-path-properties` | Chỉ cần khi phải tính độ dài / điểm trên path **ngoài DOM** (React Native, render phía server). Trên web thì `getTotalLength()` / `getPointAtLength()` của trình duyệt đã làm sẵn và nhanh hơn. |
| `perfect-freehand` | Không giải quyết chuyện nhận dạng, nhưng rất đáng thêm nếu muốn nét vẽ có **độ dày biến thiên theo tốc độ/lực bút** cho giống nét bút lông. |
| `$1` / `$P` recognizer | **Không nên dùng ở đây.** Các bộ nhận dạng cử chỉ này bất biến với phép xoay và tỉ lệ — trong khi tập viết chữ thì **vị trí trong ô và kích thước nét chính là thứ cần chấm**. |

**Kết luận: KanjiVG + SVG (hiển thị) + Canvas (mực người dùng).**

Vì sao lai hai công nghệ thay vì chọn một:

* **SVG** giữ lưới giấy, nét mẫu, hoạt ảnh và số thứ tự nét — nội dung tĩnh, sắc
  nét ở mọi độ phân giải, `stroke-dasharray` cho hoạt ảnh gần như miễn phí, và
  `getPointAtLength()` giải sẵn bài toán tham số hóa theo độ dài cung.
* **Canvas** nhận mực người dùng — hàng trăm điểm mỗi giây; nếu làm bằng SVG thì
  mỗi điểm là một thao tác DOM và sẽ giật.

Cả hai chồng khít nhau và **dùng chung hệ toạ độ 109×109 của KanjiVG**, nên
không cần quy đổi ở giữa:

```js
ctx.setTransform(canvas.width / (VB * glyphN), 0, 0, canvas.height / VB, 0, 0);
```

### 3.2 Đường đi của dữ liệu

```
KanjiVG (6763 file SVG)
   └─ build_data.py   lọc 148 glyph Kana · làm tròn toạ độ · gắn romaji + gợi ý đọc tiếng Việt
        └─ kana-data.json (58 KB) ─ { glyphs: { "あ": ["M31,33c…", …] }, chars: […] }
             └─ build.mjs  nhúng thẳng vào HTML
                  └─ dist/kana-dojo.html (111 KB, một file duy nhất)
```

Chỉ lưu **path `d`**, không lưu điểm mẫu: khi mở một chữ, trình duyệt tự lấy 32
điểm cách đều theo độ dài cung bằng `getPointAtLength()`. Nhờ vậy dữ liệu nhỏ
gọn mà độ chính xác lại cao hơn dữ liệu median dựng sẵn.

Ký tự ghép (きゃ) = 2 glyph, `viewBox` giãn thành `0 0 218 109` và mỗi glyph nằm
trong `<g transform="translate(109,0)">`. Lưu ý: `getPointAtLength()` **bỏ qua
transform của thẻ cha**, nên phải cộng `dx` thủ công — chỗ này rất dễ sai.

### 3.3 Thuật toán chấm điểm

```
nét người dùng ──┐
                 ├─→ lấy lại 24 điểm cách đều theo ĐỘ DÀI CUNG (arc-length resampling)
nét mẫu ─────────┘
                 ├─→ f = sai lệch trung bình khi ghép xuôi  (điểm i ↔ điểm i)
                 └─→ r = sai lệch trung bình khi ghép ngược (điểm i ↔ điểm n-1-i)

score = 100 − f × 4.2 − |ln(độ dài nét / độ dài mẫu)| × 15
đạt   ≥ 58 (Đồ theo nét) · ≥ 48 (Tự viết)
```

Vì sao lấy lại mẫu theo độ dài cung: hai người vẽ cùng một nét với tốc độ và số
điểm khác nhau hoàn toàn. Chuẩn hoá theo độ dài cung đưa cả hai về cùng một
tham số hoá, nên so từng cặp điểm là hợp lệ — rẻ hơn DTW rất nhiều mà kết quả
tương đương cho nét đơn.

**Điểm luôn tính theo chiều xuôi `f`, tuyệt đối không lấy `min(f, r)`** — lấy min
là vô tình thưởng điểm cho nét vẽ ngược chiều. `r` chỉ dùng để *chẩn đoán*: nếu
`r < f − 1.2` thì hình đúng nhưng viết ngược, và app nói thẳng nét đó phải đi
theo hướng nào.

Khi nét bị đánh trượt, app so tiếp với **các nét khác của cùng chữ**; nếu khớp
một nét khác trên 55 điểm thì báo *"Nét đó là nét số 6 — hãy viết nét số 2
trước"*. Đây là lỗi phổ biến nhất của người mới, và biết mình sai ở đâu quan
trọng hơn con điểm.

Đơn vị của `f` là đơn vị ô 109×109, nên `f = 3` ≈ lệch 2.8% cạnh ô. Muốn siết
hay nới độ khó chỉ cần chỉnh hằng số `4.2` và hai ngưỡng.

### 3.4 Cấu trúc mã nguồn

```
src/
  index.html      khung trang, ngữ nghĩa HTML, ARIA
  styles.css      design tokens → base → bảng chữ → khu tập viết → responsive
  kana-data.js    dữ liệu nét sinh tự động — không sửa tay
  js/             9 module thuần, nạp tuần tự bằng <script> thường (không
                  module bundler), mỗi file gắn phần export của mình vào một
                  namespace toàn cục duy nhất KD.* — thứ tự nạp = thứ tự phụ
                  thuộc, khớp giữa src/index.html và JS_MODULES trong build.mjs:
                    core.js         KD.$, KD.DATA, KD.VB, KD.SVGNS
                    store.js        KD.Store    localStorage có dự phòng RAM
                    speech.js       KD.Speech   Web Speech API ja-JP
                    geometry.js     KD.Geometry resample / compare / mô tả hướng nét
                    kana-index.js   KD.KanaIndex  chỉ mục dữ liệu ký tự
                    state.js        KD.State    trạng thái ứng dụng
                    sheet.js        KD.Sheet    bảng ngũ thập âm
                    engine.js       KD.Engine   engine tập viết (SVG + Canvas)
                    main.js         khu tập viết: mở/đóng, điều hướng, sự
                                    kiện UI, bàn phím, theme, khởi động
build.mjs         gộp kana-data.js + toàn bộ js/*.js thành 1 <script>
dist/             kana-dojo.html (bản chạy độc lập)
```

### 3.5 Chạy & build

```bash
# Chạy: mở thẳng dist/kana-dojo.html — không cần server
# Sửa mã nguồn: sửa trong src/ rồi build lại
node build.mjs

# Phát triển với src/ tách file thì cần http server (vì file:// chặn font/CORS)
npx serve src
```

### 3.6 Hướng mở rộng

* **Lặp lại ngắt quãng (SRS):** `Store` đã lưu `{lv, best}` cho từng chữ — thêm
  `due` (timestamp) và một hàm SM-2 là có ngay chế độ ôn tập theo lịch.
* **Kanji:** engine không hề biết mình đang vẽ Kana. Thêm mã Unicode chữ Hán vào
  `build_data.py` là chạy được ngay với 6763 chữ của KanjiVG.
* **Nét bút lông:** thay `strokePath()` bằng `perfect-freehand` để nét có độ dày
  biến thiên theo tốc độ.
* **Audio thu sẵn:** hiện dùng giọng ja-JP của hệ điều hành. Muốn chắc chắn đồng
  nhất trên mọi máy thì thay `Speech.say()` bằng file audio thu sẵn.

---

## 4. Giấy phép

Mã nguồn: dùng tự do.

**Dữ liệu thứ tự nét** trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
giấy phép [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
Đây là giấy phép **share-alike**: nếu bạn phát hành lại `kana-data.json` hoặc bản
dẫn xuất của nó, bạn phải ghi công KanjiVG và giữ nguyên giấy phép CC BY-SA 3.0
cho phần dữ liệu đó. Giấy phép này **cho phép dùng cho mục đích thương mại**.
