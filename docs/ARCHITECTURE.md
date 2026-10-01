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
- Các trang nội dung công khai (`bang-chu-cai`, `luyen-viet`, `tu-vung`, `quiz`) có metadata + canonical và nằm trong `sitemap.xml`;
  ba trang chỉ hiện tiến độ cá nhân bị `noindex` và `Disallow` trong `robots.txt`.

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

### FSRS là module thuần hàm

Không React, không I/O, không side effect → unit test hoàn toàn trong Node (`fsrs.test.ts`).
