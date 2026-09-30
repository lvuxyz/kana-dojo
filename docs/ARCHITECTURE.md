# Kana Dōjō — Kiến trúc hệ thống

## Tổng quan

Kana Dōjō là ứng dụng monorepo full-stack gồm ba lớp độc lập:

```
┌─────────────────────────────────────────────────────────────┐
│                    Trình duyệt người dùng                    │
│                                                             │
│   Next.js 15 (React 19)  ·  TypeScript  ·  Tailwind v4     │
│   TanStack Query v5       ·  Canvas API ·  SVG              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / JSON
                ┌────────▼────────┐
                │  Next.js BFF    │  ← /api/auth/* route handlers
                │  (server-side)  │     tách refresh token ra
                └────────┬────────┘     httpOnly cookie
                         │ HTTP / JSON
┌────────────────────────▼────────────────────────────────────┐
│               Spring Boot 3.2.5  (Java 17)                  │
│                                                             │
│   Spring Security · JJWT · springdoc-openapi · Bucket4j    │
│   Spring Data JPA · Flyway · Lombok · Google API Client    │
└────────────────────────┬────────────────────────────────────┘
                         │ JDBC / HikariCP
                ┌────────▼────────┐
                │  PostgreSQL 16  │  23 bảng, Flyway migration
                └─────────────────┘
```

---

## Mô hình BFF (Backend for Frontend)

Next.js đóng vai trò BFF — một lớp proxy mỏng giữa trình duyệt và Spring Boot, với mục đích duy nhất là bảo vệ refresh token.
Mọi lời gọi `/api/v1/*` khác đi qua **rewrite** trong `next.config.mjs` tới `BACKEND_URL`, nên trình duyệt chỉ nói chuyện với một origin.

```
Trình duyệt              Next.js BFF              Spring Boot
     │                        │                        │
     │  POST /api/auth/login  │                        │
     ├───────────────────────►│  POST /api/v1/auth/login
     │                        ├───────────────────────►│
     │                        │   { accessToken,       │
     │                        │     refreshToken }     │
     │                        │◄───────────────────────┤
     │  Set-Cookie: refresh=… │                        │
     │  { accessToken }       │  (tách refreshToken    │
     │◄───────────────────────┤   → httpOnly cookie,   │
     │                        │   chỉ trả accessToken) │
     │                        │                        │
     │  GET /api/v1/auth/me   │  rewrite (proxy thuần, │
     │  Authorization: Bearer │  không đọc/sửa body)   │
     ├───────────────────────►├───────────────────────►│
```

**Tại sao BFF?**
- `refreshToken` không bao giờ chạm vào JavaScript → không bị đánh cắp qua XSS
- `accessToken` tồn tại trong RAM (biến React state / closure) — mất khi tắt tab
- Cookie `kd_rt` với `HttpOnly; SameSite=Lax; Path=/` (thêm `Secure` khi `NODE_ENV=production`) → JS không đọc được, không đi kèm request POST cross-site

> **Lưu ý CORS:** rewrite chuyển tiếp nguyên header `Origin` của trình duyệt. Với request POST/PATCH, trình duyệt luôn gửi `Origin`,
> nên Spring vẫn kiểm tra CORS dù request đi qua proxy. `CORS_ORIGINS` **phải** chứa đúng origin mà người dùng mở trang
> (dev: `http://localhost:3001`), nếu không mọi thao tác ghi sẽ nhận **403**.

**Luồng refresh tự động (`web/src/lib/api.ts`):**
1. Gọi API → nhận HTTP 401
2. Gửi `POST /api/auth/refresh` (cookie refresh được đính kèm tự động)
3. Nhận `accessToken` mới, lưu vào RAM
4. Thực hiện lại request ban đầu

**Coalescing:** nếu có nhiều request đồng thời cùng nhận 401, chỉ một request refresh được gửi đi — các request còn lại đợi promise đó giải quyết. Điều này ngăn vô hiệu hóa token family do rotation phát hiện tái sử dụng đồng thời.

---

## Luồng xác thực

### Đăng ký / Đăng nhập email

```
Client                    Next.js BFF               Spring Boot
  │  POST /api/auth/login       │                        │
  │  { email, password }        │                        │
  ├────────────────────────────►│  POST /api/v1/auth/login
  │                             ├───────────────────────►│
  │                             │                        │ BCrypt.verify()
  │                             │  { accessToken,        │ → phát JWT + refresh
  │                             │    refreshToken,       │
  │                             │    user }              │
  │                             │◄───────────────────────┤
  │  Set-Cookie: kd_rt=…        │                        │
  │  { accessToken, user }      │                        │
  │◄────────────────────────────┤                        │
```

### Đăng nhập Google OAuth

```
Client                    Next.js BFF               Spring Boot        Google
  │                             │                        │               │
  │  (Google Sign-In JS SDK)    │                        │               │
  ├───────────────────────────────────────────────────────────────────►│
  │  { idToken }                │                        │               │
  │◄───────────────────────────────────────────────────────────────────┤
  │                             │                        │               │
  │  POST /api/auth/google      │                        │               │
  │  { idToken }                │                        │               │
  ├────────────────────────────►│  POST /api/v1/auth/google
  │                             ├───────────────────────►│
  │                             │                        │ GoogleTokenVerifier
  │                             │                        │ .verify(idToken)
  │                             │                        ├──────────────►│
  │                             │                        │ payload (sub, │
  │                             │                        │  email, name) │
  │                             │                        │◄──────────────┤
  │                             │  { accessToken,        │               │
  │                             │    refreshToken, user }│               │
  │◄────────────────────────────┤                        │               │
```

### Refresh token & rotation

- Mỗi refresh token chỉ dùng được một lần
- Khi dùng, token cũ bị thu hồi và token mới được phát
- Nếu phát hiện tái sử dụng token đã thu hồi → **thu hồi toàn bộ family** (dấu hiệu token bị đánh cắp)
- Chỉ lưu `SHA-256(token)` trong DB — token gốc chỉ tồn tại trong transit

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
└──────────────────────────────────────────────────┘
                           │
                           ▼ pointerUp
              stroke-match.ts: matchStroke()
                           │
          ┌────────────────┴────────────────┐
          │   Arc-length resampling         │
          │   → 24 điểm cách đều nhau       │
          │   (loại bỏ nhiễu tốc độ/       │
          │    mật độ điểm)                 │
          └────────────────┬────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │   So khớp chiều XUÔI ONLY       │
          │   (không min(xuôi, ngược) —     │
          │    vẽ ngược bị phạt, không      │
          │    được thưởng)                 │
          └────────────────┬────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │   Phạt độ dài: log ratio        │
          │   Kết quả: score 0–100          │
          │   + reason: REVERSED |          │
          │     TOO_SHORT | TOO_LONG |      │
          │     OFF_PATH                    │
          │   (backend còn nhận WRONG_ORDER,│
          │    frontend hiện chưa phát ra)  │
          └────────────────┬────────────────┘
                           │
                           ▼
              POST /api/v1/writing/attempts
              { kanaCharacterId, mode, strokeScores[],
                strokeErrors[{index, reason}], avgScore, durationMs }
```

### Chuyển điểm → grade FSRS

```
score < 48  hoặc  có nét FAILED  →  grade 1 (Again)
48 – 69                           →  grade 2 (Hard)
70 – 87                           →  grade 3 (Good)
≥ 88                              →  grade 4 (Easy)

Ngưỡng pass: TRACE mode = 58 · TEST mode = 48
```

---

## FSRS-6 (Spaced Repetition)

`FsrsEngine.java` là lớp thuần hàm (không phụ thuộc Spring), toàn bộ logic là các phương thức `static`. Đặc điểm:

- **21 tham số** mặc định (W0–W20) — hằng số trong code, chưa override được qua cấu hình
- **Stability (S):** thời gian (ngày) để độ nhớ rơi xuống 90%
- **Difficulty (D):** mức độ khó của thẻ, 1–10
- **Retention mục tiêu:** 90% (`app.srs.desired-retention`)
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

---

## Giao dịch nguyên tử khi ghi lượt tập

`POST /writing/attempts` thực hiện 5 việc trong **một transaction duy nhất** để tránh trạng thái không nhất quán:

1. Ghi `writing_attempts` (user, ký tự, điểm từng nét, lỗi từng nét, điểm trung bình, passed)
2. Tính grade từ điểm
3. Cập nhật thẻ SRS (`review_cards`: stability, difficulty, due_at, state)
4. Ghi `review_logs`
5. Cộng XP → cập nhật streak/`daily_activity` → kiểm tra huy hiệu

Nếu bất kỳ bước nào thất bại → rollback toàn bộ — không có trạng thái nửa chừng.

---

## Dữ liệu nét bundle vào frontend

Dữ liệu 208 ký tự (57 KB, ~20 KB gzip) được bundle thẳng vào JS bundle của Next.js tại `web/src/data/kana-data.json`, không fetch lúc runtime.

**Lý do:** dữ liệu này là tĩnh hoàn toàn (không bao giờ thay đổi theo user), nhỏ, và cần ngay khi render trang. Bundle vào tránh một round-trip mạng và loại bỏ điểm thất bại cho nội dung tĩnh.

**Đánh đổi:** bundle size tăng ~20 KB gzip. Chấp nhận được với loại nội dung này.

---

## Rate limiting

Bucket4j giới hạn `10 request / phút / IP` trên `/api/v1/auth/login` và `/api/v1/auth/register`. Chạy in-memory (không cần Redis), phù hợp cho triển khai single-instance.

Khi vượt giới hạn → HTTP 429, header `Retry-After: 60`.

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

**Streak:** đếm theo timezone của người dùng (`users.timezone`), mặc định `Asia/Ho_Chi_Minh`. Streak tăng khi đạt `daily_goal_xp` (mặc định 50 XP) trong một ngày địa phương.

**Streak freeze:** tối đa 2 lần dự trữ, nạp lại mỗi thứ Hai.

**Bảng xếp hạng:** snapshot XP tuần vào thứ Hai 00:05 VN time qua `@Scheduled`.

---

## Phân quyền gói (Entitlement)

Quota được lưu trong bảng `plan_features`, tra cứu tại request time:

| plan | feature_key | limit_value |
|---|---|---|
| FREE | srs.daily_reviews | 60 |
| FREE | writing.daily_attempts | 100 |
| FREE | content.jlpt_levels | 5 (chỉ N5) |
| FREE | stats.history_days | 30 |
| PRO | srs.daily_reviews | NULL (không giới hạn) |
| PRO | writing.daily_attempts | NULL |
| PRO | content.jlpt_levels | 1 (N1–N5) |
| PRO | stats.history_days | NULL |

Vượt quota → HTTP 429 với RFC 7807 Problem Details (không phải lỗi rate-limit mạng, là lỗi nghiệp vụ).

---

## Quyết định thiết kế quan trọng

### SVG + Canvas, không phải chỉ SVG

Canvas được chọn cho lớp ink người dùng thay vì tạo SVG element động vì:
- Thêm hàng trăm điểm/giây vào SVG DOM tạo reflow liên tục → giật
- Canvas `lineTo` / `stroke` không trigger layout engine

SVG vẫn dùng cho lớp hướng dẫn vì nó là tĩnh và cần tương tác với path data của KanjiVG.

### Arc-length resampling, không phải time-based

Lấy mẫu theo thời gian → người vẽ chậm có nhiều điểm ở đầu nét, người vẽ nhanh có ít điểm → so khớp bị lệch. Arc-length resampling đặt 24 điểm cách đều theo chiều dài đường cong, loại bỏ ảnh hưởng của tốc độ vẽ.

### Forward-only scoring, không phải `min(xuôi, ngược)`

Lấy `min()` sẽ chấp nhận nét vẽ ngược chiều — điều này sai về mặt sư phạm (học viên phải học đúng thứ tự nét theo quy tắc kanji). Chỉ so khớp chiều xuôi đảm bảo nét ngược chiều bị phạt đúng mức.

### `FsrsEngine` là lớp thuần hàm

Không có `@Component`, không inject, không side effect → có thể unit test hoàn toàn mà không cần Spring context hay DB. `FsrsEngineTest.java` (11 test) chạy chỉ với JUnit 5, không khởi động Spring và không cần CSDL.
