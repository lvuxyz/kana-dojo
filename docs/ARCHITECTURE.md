# Kana Dōjō — Kiến trúc hệ thống

## Tổng quan

Kana Dōjō là một **site tĩnh**: không máy chủ ứng dụng, không cơ sở dữ liệu, không tài khoản. Mọi thứ chạy trong trình duyệt.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Trình duyệt người dùng                      │
│                                                                 │
│  React 19 · Next.js 15 (App Router, xuất bản tĩnh) · Tailwind   │
│                                                                 │
│  ┌────────────┐   ┌───────────────────────┐   ┌──────────────┐  │
│  │ Giao diện  │──►│ Bộ máy học (lib/*)    │──►│ localStorage │  │
│  │ (app/, …)  │◄──│ hàm thuần: FSRS, XP,  │◄──│ kd.progress  │  │
│  └────────────┘   │ streak, huy hiệu, quiz│   │ .v1 (JSON)   │  │
│                   └───────────────────────┘   └──────────────┘  │
│        ▲  nội dung tĩnh: kana-data.json, vocabulary, quizzes    │
└────────┼────────────────────────────────────────────────────────┘
         │ chỉ tải tệp tĩnh (HTML / JS / CSS / font)
┌────────┴────────┐
│  Máy chủ tĩnh   │  Nginx (Docker) · GitHub Pages · Netlify · Vercel · S3 …
│  thư mục out/   │
└─────────────────┘
```

Không có lời gọi API nào: trình duyệt chỉ tải tệp tĩnh (HTML/JS/CSS, bản prefetch các trang kế tiếp của Next, và font từ Google Fonts).
Site còn là **PWA**: cài được ra màn hình chính và, nhờ service worker tải sẵn toàn bộ tệp, chạy được khi không có mạng (xem [PWA và offline](#pwa-và-offline)).

**Vì sao bỏ máy chủ:** mọi thứ máy chủ từng làm hoặc là dữ liệu tĩnh (kana, từ vựng, quiz, huy hiệu), hoặc là tính toán thuần tuý trên
tiến độ của *một* người (FSRS, XP, streak, chấm quiz). Chỉ có bảng xếp hạng thực sự cần dữ liệu chung giữa nhiều người — và đó là tính năng bị bỏ.
Kết quả: không có gì để vận hành, bảo mật, sao lưu hay trả tiền thuê, và không có dữ liệu cá nhân nào rời khỏi máy người học.

---

## Xuất bản tĩnh

`next.config.mjs` đặt `output: "export"`: `next build` ghi toàn bộ site vào `web/out/`.

- Mọi trang là HTML dựng sẵn. Các trang cần dữ liệu cá nhân (`bang-dieu-khien`, `on-tap`, …) dựng sẵn *khung* và điền số liệu sau khi
  trình duyệt đọc `localStorage`.
- `bang-chu-cai/[script]` và `quiz/[id]` dùng `generateStaticParams` + `dynamicParams = false`: id lạ trả 404 thay vì cố dựng lúc chạy.
- `luyen-viet` dùng `useSearchParams` (để nhận `?c=あ`) nên được bọc `<Suspense>` — yêu cầu của xuất bản tĩnh.
- Các trang nội dung công khai (`bang-chu-cai`, `luyen-viet`, `luyen-go`, `tu-vung`, `quiz`) có metadata + canonical và nằm trong `sitemap.xml`;
  ba trang chỉ hiện tiến độ cá nhân bị `noindex` và `Disallow` trong `robots.txt`.
- `npm run build` = `next build` rồi `node scripts/build-sw.mjs`: bước sau sinh `out/sw.js` từ danh sách tệp thật của bản build. `app/manifest.ts` và `app/apple-icon.png`
  được Next xuất thành `manifest.webmanifest` và `apple-icon.png` (route metadata cần `export const dynamic = "force-static"`).

---

## Kho tiến độ (`lib/learning`)

### Một khối JSON duy nhất

Toàn bộ trạng thái học nằm trong một đối tượng `ProgressState` lưu ở khoá `kd.progress.v1` (hình dạng đầy đủ trong [SPEC.md](SPEC.md#2-mô-hình-dữ-liệu-tiến-độ)).
Chỉ có `store.ts` đụng tới `localStorage`; mọi logic còn lại là hàm thuần.

```
        gradeCard / recordWriting / submitQuiz          (reviews.ts, quiz.ts — thuần hàm)
 state ─────────────────────────────────────────►  { state', result }
   ▲                                                       │
   │          structuredClone → sửa bản nháp →             │
   │          recordActivity (XP, streak) → evaluateBadges │
   │                                                       ▼
 store.ts ◄───────────────────────────  commit: ghi localStorage → báo người nghe (React)
```

Mỗi thao tác học **sao chép trạng thái, sửa bản sao, rồi trả `{ state, result }`**. Hệ quả: nếu giữa chừng có lỗi thì trạng thái cũ chưa bị đụng tới —
"tất cả hoặc không gì cả" mà không cần transaction. (Bản có CSDL từng phải gói năm việc của một lần luyện viết vào một giao dịch để đạt đúng tính chất này.)

### React

`hooks.ts` dùng `useSyncExternalStore`:

- Phía máy chủ / lúc hydrate, snapshot là `SERVER_STATE` (trạng thái rỗng). Hook so sánh tham chiếu với hằng này để đặt `ready = false`,
  và trang hiện khung chờ thay vì nháy số 0 rồi nhảy sang số thật.
- Sau hydrate, snapshot là trạng thái thật đọc từ `localStorage`; mỗi `commit` báo cho mọi component đang nghe.

### Độ bền

| Tình huống | Cách xử lý |
|---|---|
| Hai tab cùng mở | Sự kiện `storage` → tab kia nạp lại bản mới nhất, nên không ghi đè lên nhau |
| Dữ liệu hỏng / sửa tay | Kiểm tra bằng zod khi nạp. Nếu sai: bản hỏng được **giữ lại** ở khoá `kd.progress.corrupt` rồi bắt đầu từ rỗng — không âm thầm xoá dữ liệu người học |
| Trình duyệt chặn / đầy `localStorage` | Vẫn học được trong bộ nhớ của tab; `isPersistent()` = false và khung ứng dụng hiện cảnh báo kèm đường dẫn tới nút sao lưu |
| Tệp nhập vào | Kiểm tra schema + phiên bản (từ chối tệp của phiên bản mới hơn); tệp sai không đụng tới tiến độ hiện có |
| Nâng cấp định dạng | `version` nằm trong khối dữ liệu; thêm hàm migrate khi cần đổi `STATE_VERSION` |

### Ngày và múi giờ

Mọi phép tính "ngày" (mục tiêu XP, streak, hạn mức thẻ mới, hồi thẻ băng, "cú đêm") dùng **múi giờ của thiết bị** qua `Intl.DateTimeFormat`
(`time.ts`). Người học ở Việt Nam kết thúc ngày lúc 00:00 giờ VN; người học ở nơi khác theo giờ của họ. Các hàm nhận một `Clock { now, zone }`
nên test đặt được giờ và múi giờ giả.

---

## Dữ liệu nằm ở đâu và khi nào mất

Tiến độ sống trong kho của **trình duyệt trên từng máy**, gắn với *origin* (giao thức + domain + cổng), không gắn với người dùng. Phần này ghi lại những gì đã nghiên cứu và đo được,
để quyết định về lưu trữ và mobile dựa trên số liệu chứ không phải phỏng đoán.

**Kích thước và chi phí** (đo trên kịch bản xấu nhất: học hết 576 thẻ có thể có + 5 năm hoạt động hằng ngày):

| Đại lượng | Giá trị |
|---|---|
| Kích thước khối JSON | ≈ 290 KB — khoảng 11% mức 5 MiB mà tài liệu nêu cho `localStorage` (tính 2 byte/ký tự) |
| Mỗi thẻ / mỗi ngày | ≈ 234 / 67 byte |
| `JSON.stringify` / nạp + kiểm tra zod | ≈ 5 ms / ≈ 15 ms |
| Một thao tác học đầy đủ (sao chép + FSRS + XP + huy hiệu) | ≈ 8 ms |

→ `localStorage` đủ dùng cả ở kịch bản xấu nhất; **chưa cần IndexedDB** (nó không giúp chống mất dữ liệu, chỉ thêm chỗ chứa). Lưu ý: trình duyệt nhúng trong app phát triển cho phép tới ≈ 100 MB
nên không đại diện — luôn thiết kế theo mốc 5 MiB.

**Khi nào mất dữ liệu** (nguồn: MDN, WebKit, Capacitor — xem cuối tài liệu):

| Tình huống | Chuyện gì xảy ra | Ứng dụng đang làm gì |
|---|---|---|
| Người dùng xoá dữ liệu trang web | Mất hết | Sao lưu/khôi phục bằng tệp JSON ở `/cai-dat` |
| Cửa sổ riêng tư / ẩn danh | Ghi vẫn được nhưng xoá khi đóng — **không phát hiện được** (banner chỉ báo khi *ghi thất bại*) | Chưa có cảnh báo riêng |
| **Safari (iPhone/Mac), tab thường** | Script-writable storage (`localStorage`, IndexedDB…) bị xoá sau **7 ngày không có click/chạm/gõ phím** trên site | Cài ra Màn hình chính — bản đã cài được miễn trừ |
| Máy sắp hết dung lượng | Dữ liệu "best-effort" bị xoá theo LRU; dữ liệu đã xin lưu bền (`navigator.storage.persist()`) thì được tha | **Chưa gọi `persist()`.** Chrome/Safari tự quyết theo mức tương tác (đo thực tế: origin mới bị từ chối), Firefox hỏi người dùng |
| Đổi domain, `http`↔`https`, `www`↔không `www`, đổi cổng | Mỗi origin có kho riêng → mở ra rỗng | Chỉ là quy ước triển khai: chốt một domain chính và redirect (xem [DEPLOYMENT.md](DEPLOYMENT.md)) |
| iOS: bản đã cài vs Safari | **Kho tách biệt hoàn toàn** (localStorage, IndexedDB, service worker, cache) → bản đã cài mở ra rỗng | Thẻ cài đặt ở `/cai-dat` cảnh báo và hướng dẫn tải về → khôi phục |
| Origin dùng chung (`<user>.github.io/<repo>`) | Mọi repo của cùng tài khoản chia sẻ một kho; một dự án khác có thể xoá `localStorage` | Khoá có tiền tố `kd.`; nên dùng domain riêng |

`navigator.storage` (và vì thế `persist()`/`estimate()`) chỉ có ở **ngữ cảnh an toàn** (HTTPS hoặc `localhost`). Bản triển khai thật phải là HTTPS — vừa để cài PWA, vừa để xin lưu bền.

**Việc có thể làm tiếp:** gọi `persist()` sau lần học đầu; hiện trạng "đã bảo vệ / chưa" và dung lượng đã dùng ở Cài đặt; nhắc sao lưu khi đã lâu chưa tải tệp (hữu ích nhất cho Safari 7 ngày).

---

## Engine tập viết

### Luồng dữ liệu trong `StrokeStage.tsx`

```
┌──────────────────────────────────────────────────┐
│                  StrokeStage                      │
│                                                  │
│  ┌─────────────────┐    ┌──────────────────────┐ │
│  │  SVG layer      │    │  Canvas layer        │ │
│  │                 │    │                      │ │
│  │  • Đường dẫn    │    │  • Vẽ ink người dùng │ │
│  │    hướng dẫn    │    │  • Ghi điểm (x,y)    │ │
│  │  • Animation    │    │    hàng trăm/giây    │ │
│  │  • Grid         │    │                      │ │
│  │  • Số thứ tự    │    │  (Canvas > SVG DOM   │ │
│  │    nét          │    │   vì perf: không      │ │
│  └─────────────────┘    │   trigger reflow)    │ │
│                         └──────────┬───────────┘ │
│         Cùng hệ tọa độ 109×109 KanjiVG           │
└──────────────────────────────────┬───────────────┘
                                   ▼ pointerUp
              stroke-match.ts: matchStroke()
                                   │
          ┌────────────────────────┴────────┐
          │   Arc-length resampling         │
          │   → 24 điểm cách đều nhau       │
          │   (loại bỏ nhiễu tốc độ/       │
          │    mật độ điểm)                 │
          └────────────────┬────────────────┘
          ┌────────────────┴────────────────┐
          │   So khớp chiều XUÔI ONLY       │
          │   (không min(xuôi, ngược) —     │
          │    vẽ ngược bị phạt, không      │
          │    được thưởng)                 │
          └────────────────┬────────────────┘
          ┌────────────────┴────────────────┐
          │   Phạt độ dài: log ratio        │
          │   Kết quả: score 0–100          │
          │   + reason: REVERSED |          │
          │     TOO_SHORT | TOO_LONG |      │
          │     OFF_PATH                    │
          └────────────────┬────────────────┘
                           ▼  khi đủ mọi nét
              recordWritingAttempt({ character, avgScore,
                                     strokeErrors, durationMs })
```

### Cổng con trỏ

Mọi sự kiện con trỏ của canvas đi qua `lib/pointer-gate.ts` trước khi tới `judge`: tại mỗi thời điểm chỉ một con trỏ được viết. Ngón thứ hai/lòng bàn tay chạm giữa nét bị bỏ qua, bút thắng cảm ứng đang viết dở,
và `pointercancel` **bỏ** nét dở thay vì chấm. Bảng quy tắc đầy đủ ở [SPEC.md §7](SPEC.md#7-nhập-liệu-bằng-con-trỏ). Công thức chấm điểm ở [SPEC.md §6](SPEC.md#6-chấm-điểm-nét-viết).

### Chuyển điểm → grade FSRS

```
score < 48  hoặc  có nét FAILED  →  grade 1 (Again)
48 – 69                           →  grade 2 (Hard)
70 – 87                           →  grade 3 (Good)
≥ 88                              →  grade 4 (Easy)

Ngưỡng chấp nhận một nét (PASS_THRESHOLD): TRACE = 58 · TEST = 48
Cả chữ được tính là "đạt" khi grade ≥ 3 (điểm ≥ 70, không nét hỏng)
```

---

## FSRS-6 (Spaced Repetition)

`lib/fsrs.ts` là module thuần hàm (không React, không I/O), mọi thứ là `export function`. Đặc điểm:

- **21 tham số** mặc định (W0–W20) — hằng số trong code
- **Stability (S):** thời gian (ngày) để độ nhớ rơi xuống 90%
- **Difficulty (D):** mức độ khó của thẻ, 1–10
- **Retention mục tiêu:** 90%
- **Vòng lặp học:**

```
NEW / LEARNING — đi qua các mốc [1, 10] phút
 │
 ├─ grade 4 (Easy) ─────────────► REVIEW ngay (bắt đầu tính FSRS)
 ├─ grade 3 (Good) ─► sang mốc kế; qua mốc cuối ─► REVIEW
 ├─ grade 2 (Hard) ─► ở lại mốc hiện tại
 └─ grade 1 (Again) ─► về mốc 0 (1 phút)

REVIEW
 │
 ├─ grade ≥ 2 ─► REVIEW (khoảng cách tính từ S và retention mục tiêu)
 │
 └─ grade 1 ─► RELEARNING (mốc [10] phút, stability giảm)
                      │
                      └─ qua mốc ─► REVIEW
```

**Điểm khác biệt quan trọng:** `grade` được đo tự động từ độ chính xác nét vẽ, không phải người dùng tự chấm — loại bỏ sai lệch chủ quan khi ôn tập.

Phần cài đặt này được port nguyên văn từ bản Java trước đây (cùng công thức, cùng tham số, cùng bộ test).

### Thẻ "ảo"

Thẻ mới **chưa tồn tại** trong trạng thái cho đến lần chấm đầu tiên. `buildQueue` chọn các mục chưa có thẻ theo thứ tự dạy học và trả
chúng với `state: "NEW"`; thẻ chỉ được tạo (khoá `"KANA_WRITING:あ"`, `"VOCAB_MEANING:12"`) khi người học chấm lần đầu. Nhờ vậy người mới không mang theo hàng trăm thẻ trống,
và không cần bước "cấp thẻ" riêng.

---

## Dữ liệu nét bundle vào frontend

Dữ liệu 208 ký tự (57 KB, ~20 KB gzip) được bundle thẳng vào JS tại `web/src/data/kana-data.json`, không fetch lúc runtime.

**Lý do:** dữ liệu này là tĩnh hoàn toàn, nhỏ, và cần ngay khi render trang. Bundle vào tránh một round-trip mạng và loại bỏ điểm thất bại cho nội dung tĩnh.
Từ vựng, quiz và huy hiệu (`data/*.ts`) cũng vậy.

Nguồn gốc dữ liệu nét (KanjiVG → `build_data.py` của bản v1, nay chỉ còn trong lịch sử git → `kana-data.json`), định dạng và cái bẫy `getPointAtLength` với ký tự ghép: xem [SPEC.md §1.1](SPEC.md#11-nguồn-gốc-dữ-liệu-nét).

---

## Gamification

```
Hành động                    XP
─────────────────────────────────────
Ôn tập đúng                  +10
Ôn tập sai                   +3
Viết đúng lần đầu            +25
Hoàn thành quiz               +20 + 5×(số đúng)
Đạt mục tiêu ngày             +50 (bonus)

Level = floor(sqrt(xp_tổng / 100)) + 1
```

**Streak:** đếm theo múi giờ thiết bị. Streak tăng khi đạt mục tiêu XP ngày (mặc định 50, chỉnh được 10–500 ở Cài đặt).

**Streak freeze:** tối đa 2 lần dự trữ, hồi đầy mỗi Thứ Hai (theo giờ thiết bị). Tính lười khi đọc/ghi: so khoá tuần của lần hồi gần nhất với tuần hiện tại,
nên không cần tác vụ nền.

---

## Phòng luyện gõ

Trang `/luyen-go` (chi tiết: [TYPING.md](TYPING.md)) gộp thêm vào sau khi site đã tĩnh, theo cùng nguyên tắc:

- **Bộ máy thuần hàm** ở `lib/typing/` (`romaji`, `kana-layout`, `engine`, `ime`, `phrases`, `score`, `history`) — không React, test trong Node như `lib/learning`.
- **Lưu riêng** ở `kd.typing.history.v1` (kỷ lục, 10 lượt gần nhất, chữ hay sai), cùng quy ước với `kd.progress.v1`: tiền tố `kd.`, dữ liệu hỏng được giữ lại ở `.corrupt`, bị chặn lưu trữ thì vẫn chơi được trong bộ nhớ. Một trình duyệt là một kỷ lục (không có tài khoản).
- **Không đi qua `ProgressState`**: không cộng XP/streak và chưa nằm trong tệp sao lưu, nên hợp đồng tệp sao lưu giữa web và mobile (SPEC §2) không đổi. "Xoá toàn bộ tiến độ" vẫn xoá nó. Hai quyết định mở (đưa vào sao lưu, cộng XP) ở TYPING.md §3.4.

---

## PWA và offline

Site cài được ra màn hình chính và chạy offline. Chi tiết quy tắc (manifest, precache, vòng đời) ở [SPEC.md §8](SPEC.md#8-pwa-và-chế-độ-offline); đây là lý do thiết kế.

**Precache toàn bộ thay vì cache theo yêu cầu.** Toàn site chỉ 77 tệp (≈ 2,5 MB chưa nén). Tải sẵn tất cả lúc cài service worker cho ba điều: (1) điều hướng phía client của Next tới một trang *chưa từng mở*
vẫn có đủ chunk JS khi offline; (2) HTML và JS của một phiên luôn cùng một bản build, không bao giờ lẫn bản cũ với bản mới; (3) logic service worker đơn giản — "có trong cache thì trả, không thì đi mạng".

**Không `skipWaiting()`.** Bản mới cài ở nền nhưng chỉ có hiệu lực khi mọi tab của bản cũ đã đóng. Nếu kích hoạt ngay, tab đang mở (HTML cũ) sẽ bị rút cache cũ giữa chừng và tải chunk của bản mới không khớp. Đổi lại,
người để ứng dụng mở nhiều ngày sẽ chậm nhận bản mới.

**Không liên quan tới tiến độ.** Cache chỉ chứa tệp tĩnh; tiến độ nằm trong `localStorage`. Xoá cache không mất dữ liệu học.

**Giới hạn đã biết:** lần mở đầu tiên phải có mạng; font Google không được cache (offline dùng font hệ thống); iOS tách kho dữ liệu của bản đã cài khỏi Safari (xem bảng ở trên). Vòng đời service worker chưa được kiểm trong
trình duyệt thật — môi trường phát triển (trình duyệt nhúng của app) không cho đăng ký service worker, kể cả một tệp một dòng; logic được kiểm bằng test Node, và smoke test trong CI kiểm mọi URL precache trả 200.

---

## Giao diện

Ý tưởng hình ảnh lấy từ **giấy ô vuông tập viết Nhật (原稿用紙, genkō yōshi)**: học sinh viết *mực đen* trên *lưới in xanh*, thầy cô phê và đóng dấu bằng *mực đỏ* — nên người dùng đọc được ngữ nghĩa màu mà không cần chú giải.

| Token (`globals.css`) | Giá trị sáng | Vai trò |
|---|---|---|
| `--paper` / `--paper-sunk` / `--surface` | `#faf8f5` / `#f2eee6` / `#ffffff` | Giấy, nền chìm, thẻ |
| `--sumi` (`-2`, `-3`) | `#151a17` (`#3f4a42`, `#6b776e`) | Mực viết 墨 — nét người dùng viết, chữ, nút chính |
| `--genko` (`-2`) | `#1b5e3b` (`#2d8254`) | Mực in lưới — khung ô, đường chữ thập/chéo, nhãn hàng, trạng thái đúng |
| `--shu` (`-2`) | `#cf2f1d` (`#aa2011`) | Chu sa 朱 — nét đang tới lượt, lời phê khi sai, con dấu 済, thanh tiến độ |
| `--gold` | `#b07d14` | Cấp độ, huy hiệu, chấm nhắc đến hạn ôn |
| `--rule` / `--rule-firm` | `#e6e3da` / `#cfcbc0` | Đường kẻ |

Mọi màu là CSS custom property ở `:root`, định nghĩa lại cho `@media (prefers-color-scheme: dark)` và `[data-theme="dark"]` nên cả ba trạng thái (sáng / tối / theo hệ thống) đều đúng. Lựa chọn của người dùng nằm ở
`kd.theme`; một script nội tuyến trong `<head>` đặt `data-theme` trước khi vẽ khung hình đầu tiên để không chớp sáng.

**Chữ:** `--font-sans` Plus Jakarta Sans → Zen Kaku Gothic New → Noto Sans JP (giao diện); `--font-mincho` Lora → Zen Old Mincho → Hiragino/Yu Mincho/Noto Serif JP (tiêu đề, chữ kana);
`--font-japanese` Zen Old Mincho. Tải từ Google Fonts (`display=swap`, Google dùng `unicode-range` nên chỉ tải đúng phần chữ trang cần), có đủ fallback — font không tải được thì trang vẫn đúng bằng font hệ thống.

**Nguyên tắc bố cục:**

- **Bảng chữ đọc như bảng, không phải lưới thẻ.** Cột thẳng hàng giữa các hàng; や行 và わ行 giữ nguyên **ô trống** ở vị trí các âm không tồn tại — cấu trúc bảng tự nó truyền đạt thông tin.
- **Trạng thái mã hoá bằng hình, không chỉ bằng số:** viền xanh = đang học, con dấu 済 đỏ = đã qua bước học, chấm vàng = đến hạn ôn, thanh nhỏ dưới ô = điểm tốt nhất. Nhìn lướt là biết còn chữ nào chưa động tới.
- **Khu tập viết là modal:** desktop chia 2 cột (khung viết | bảng điều khiển), dưới `lg` xếp dọc toàn màn hình — ngón tay cần khung viết lớn nhất có thể. Trên điện thoại thanh điều hướng nằm dưới cùng (6 mục, có Cài đặt vì đó là nơi sao lưu).
- Canvas nhân theo `devicePixelRatio` → nét sắc trên màn Retina; xử lý cảm ứng/bút xem [SPEC.md §7](SPEC.md#7-nhập-liệu-bằng-con-trỏ).

---

## Hướng mobile

*Định hướng, chưa triển khai.* Đã làm: PWA (cài được, offline) và sửa đa điểm chạm — cả hai có ích cho mọi phương án phía sau.

**Hợp đồng dùng chung giữa các nền tảng** là khối `ProgressState` v1 (SPEC §2): tệp sao lưu của web nhập thẳng được vào app mobile nếu app đọc/ghi đúng định dạng này — không cần cơ chế đồng bộ hay tài khoản.
Quy tắc: mọi thay đổi định dạng tăng `STATE_VERSION` ở cả hai phía và có migrate; mỗi nền tảng phải qua cùng bộ fixture "đầu vào → đầu ra" sinh từ test của web.

| Hướng | Tái dùng | Rủi ro chính |
|---|---|---|
| PWA (đã làm) | 100% | Chưa có mặt trên kho ứng dụng; iOS tách kho dữ liệu của bản đã cài |
| Capacitor (bọc bản static) | ~100% | `localStorage`/IndexedDB trong WebView **có thể bị hệ điều hành thu hồi** — phải chuyển sang Preferences/SQLite; Apple 4.2.2 loại app chỉ là "web clipping" nên cần tính năng native thật |
| Expo / React Native | Engine TS (≈ 1.100 dòng + ≈ 1.070 dòng test) dùng chung; UI viết lại (≈ 2.100 dòng) | Canvas viết nét và `getPointAtLength` ngoài DOM cần thư viện (`react-native-svg`, `svg-path-properties`) |
| Flutter | Port engine sang Dart + UI viết lại | Hai bản engine dễ lệch — bắt buộc có fixture chung. `path_drawing` có `parseSvgPathData` đọc thẳng path của `kana-data.json` |

Dữ kiện nền tảng: Android Auto Backup mặc định bật từ API 23, tối đa 25 MB, khôi phục khi cài lại (nên bản native bền hơn web); iOS dùng `UserDefaults` phải khai báo lý do trong Privacy Manifest, thiếu là bị từ chối;
build iOS cần macOS + Xcode (không build được trên Windows); tài khoản Google Play cá nhân tạo sau 13/11/2023 phải chạy closed test với 12 tester liên tục 14 ngày trước khi lên production;
mô hình không tài khoản khớp guideline 5.1.1(v) của Apple.

---

## Quyết định thiết kế quan trọng

### Không tài khoản, không CSDL

Đổi lại cho sự đơn giản và riêng tư tuyệt đối, tiến độ gắn với từng trình duyệt. Trang Cài đặt nói rõ điều này và có sao lưu/khôi phục bằng tệp JSON.
Không có đồng bộ nhiều thiết bị — nếu sau này cần, nên làm theo hướng người học tự mang theo tệp (hoặc mã chia sẻ), không phải thêm tài khoản.

### Đáp án quiz nằm trong bundle

Không có máy chủ để giấu đáp án, nên chấm điểm chạy ở client. Chấp nhận được cho quiz tự học; không dùng cho thi có tính điểm.

### SVG + Canvas, không phải chỉ SVG

Canvas được chọn cho lớp ink người dùng thay vì tạo SVG element động vì:
- Thêm hàng trăm điểm/giây vào SVG DOM tạo reflow liên tục → giật
- Canvas `lineTo` / `stroke` không trigger layout engine

SVG vẫn dùng cho lớp hướng dẫn vì nó là tĩnh và cần tương tác với path data của KanjiVG.

### Arc-length resampling, không phải time-based

Lấy mẫu theo thời gian → người vẽ chậm có nhiều điểm ở đầu nét, người vẽ nhanh có ít điểm → so khớp bị lệch. Arc-length resampling đặt 24 điểm cách đều theo chiều dài đường cong, loại bỏ ảnh hưởng của tốc độ vẽ.

### Forward-only scoring, không phải `min(xuôi, ngược)`

Lấy `min()` sẽ chấp nhận nét vẽ ngược chiều — điều này sai về mặt sư phạm (học viên phải học đúng thứ tự nét theo quy tắc kanji). Chỉ so khớp chiều xuôi đảm bảo nét ngược chiều bị phạt đúng mức.

### Một con trỏ mỗi lần viết

Khung viết từng nhận mọi `pointerdown` như thể chỉ có một ngón: ngón/lòng bàn tay thứ hai ghi đè nét đang viết, điểm của hai con trỏ bị trộn, `pointercancel` bị chấm như một nét hoàn chỉnh. Cổng con trỏ là một máy trạng thái
thuần (`pointer-gate.ts`) nên test được trong Node và dùng lại được cho mọi giao diện nhận con trỏ.

### Chọn KanjiVG + tự chấm điểm, không dùng thư viện nhận dạng

| Phương án | Đánh giá |
|---|---|
| **Hanzi-Writer** | Thư viện tốt, nhưng dữ liệu (Make Me A Hanzi) sinh từ **font chữ Hán**, không phủ Kana và thứ tự nét Trung ≠ Nhật ở nhiều chữ. Muốn dùng cho Kana phải tự sinh lại dữ liệu — tức là vẫn quay về KanjiVG |
| **KanjiVG + tự render** ✅ | Nguồn thứ tự nét chuẩn cho tiếng Nhật, còn được bảo trì; mỗi nét là một path đơn tuyến = đường tâm nét; không phụ thuộc runtime. Đổi lại phải tự viết bộ chấm (`stroke-match.ts`, ~100 dòng) |
| `svg-path-properties` | Chỉ cần khi tính độ dài / điểm trên path **ngoài DOM** (React Native, render phía server). Trên web `getTotalLength()` / `getPointAtLength()` của trình duyệt đã làm sẵn |
| `perfect-freehand` | Không giải quyết nhận dạng, nhưng đáng thêm nếu muốn nét vẽ có độ dày biến thiên theo tốc độ/lực bút |
| `$1` / `$P` | **Không nên dùng:** bất biến với phép xoay và tỉ lệ, trong khi tập viết thì vị trí và kích thước nét chính là thứ cần chấm |

### Precache toàn bộ, không cache theo yêu cầu

Xem [PWA và offline](#pwa-và-offline): site nhỏ, nên tải sẵn tất cả để HTML và JS luôn cùng một bản build và điều hướng offline không bao giờ thiếu chunk.

### FSRS là module thuần hàm

Không React, không I/O, không side effect → unit test hoàn toàn trong Node (`fsrs.test.ts`).

---

## Hướng mở rộng

- **Kanji:** engine không biết mình đang vẽ kana. Thêm mã Unicode chữ Hán vào bước sinh dữ liệu là chạy được với 6.763 chữ của KanjiVG (script `build_data.py` cũ lấy lại từ lịch sử git — xem [SPEC.md §1.1](SPEC.md#11-nguồn-gốc-dữ-liệu-nét)).
- **Nét bút lông:** thay phần vẽ mực bằng `perfect-freehand` để nét có độ dày biến thiên theo tốc độ.
- **Âm thanh thu sẵn:** hiện dùng giọng `ja-JP` của hệ điều hành (`speechSynthesis`); muốn đồng nhất trên mọi máy thì thay bằng tệp audio thu sẵn.
- **Lưu bền:** gọi `navigator.storage.persist()`, nhắc sao lưu định kỳ (xem [Dữ liệu nằm ở đâu và khi nào mất](#dữ-liệu-nằm-ở-đâu-và-khi-nào-mất)).

## Nguồn tham khảo

- [MDN — Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [WebKit — Tracking Prevention (7-day cap, Home Screen web apps)](https://webkit.org/tracking-prevention/)
- [Capacitor — Storage guide](https://capacitorjs.com/docs/guides/storage)
- [Android — Auto Backup](https://developer.android.com/identity/data/autobackup)
- [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
