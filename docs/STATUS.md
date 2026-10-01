# Kana Dōjō — Hiện trạng dự án

> Tài liệu này trả lời ba câu hỏi: **đã làm được gì**, **đang làm gì**, và **còn thiếu / đang sai chỗ nào**.
> Nó được viết sau khi đọc toàn bộ source ở `origin/master` (commit `ed8ff35`) và đối chiếu với tài liệu hiện có.
> Mỗi nhận định đều ghi file và số dòng để kiểm tra lại. Nó **không thay thế** [SPEC.md](SPEC.md) (hợp đồng kỹ thuật)
> hay [ARCHITECTURE.md](ARCHITECTURE.md) (thiết kế) — nó cho biết phần nào của chúng đã thật sự chạy.

- **Thời điểm ghi:** 2026-10-01
- **Phạm vi:** `backend/` (114 file Java, 3 migration), `web/` (39 file `.ts/.tsx`), hạ tầng (Docker, CI), cùng 4 nhánh/worktree đang phát triển song song
- **Ký hiệu:** ✅ chạy đúng · 🟡 chạy nhưng có lỗi hoặc thiếu sót · 🚧 đang làm, chưa vào `master` · ⬜ chưa làm

> **Cập nhật cùng ngày — bỏ server, web chạy trên từng máy.** Sau khi viết các mục bên dưới, dự án được chuyển sang chế độ cá nhân:
> **toàn bộ mã server (`backend/`, `db`/`backend` trong Docker Compose, job backend của CI, script khởi động PostgreSQL/Spring Boot) và mọi lời gọi từ web tới
> máy chủ được comment lại, giữ nguyên từng dòng**; dữ liệu học tập lưu trong trình duyệt từng máy — xem [LOCAL_MODE.md](LOCAL_MODE.md).
> Thay đổi nằm trong [PR #3](https://github.com/lvuxyz/kana-dojo/pull/3), chưa vào `master`. Các mục §1–§6 mô tả `master` (bản có máy chủ, **nay đã tắt**);
> §5 ghi rõ lỗi nào còn áp dụng ở chế độ cá nhân.

---

## 1. Tóm tắt

| Khu vực | Trạng thái | Ghi chú |
|---|---|---|
| Backend REST API (27 endpoint, 12 controller) | ✅ | Có Swagger ở dev, tắt ở prod |
| Lược đồ CSDL + dữ liệu khởi đầu (22 bảng, Flyway V1–V3) | ✅ | Kana nạp bằng `KanaSeeder`, không nằm trong migration |
| Đăng ký / đăng nhập email, JWT, refresh token xoay vòng | ✅ | Có phát hiện tái sử dụng token → thu hồi cả họ |
| Đăng xuất từ giao diện web | 🟡 | Xoá cookie nhưng **không thu hồi token ở server** (§5, lỗi A) — 🚧 đã có bản sửa chưa commit |
| Đăng nhập Google | 🟡 | Backend xong; **giao diện chưa nối** — nút dẫn tới route không tồn tại (§5, lỗi B) |
| Luyện viết có chấm nét + FSRS-6 | ✅ | Chấm ở client, một giao dịch 5 bước ở server |
| Hàng đợi ôn tập | 🟡 | Hoạt động; hạn mức thẻ mới/ngày có thể "rò" (§5, lỗi E); thẻ từ vựng gần như không bao giờ xuất hiện |
| XP, level, streak, huy hiệu, heatmap, bảng xếp hạng tuần | ✅ | Streak và hạn mức tính theo múi giờ người học |
| Lưới tiến độ kana (`/luyen-viet`) | 🟡 | Sai khớp kiểu `level` 0–5 ↔ 0–2 (§5, lỗi C, D) |
| Hạn mức gói FREE / PRO | 🟡 | Hạn mức chạy; **không có đường nào lên PRO** (chưa có thanh toán, chưa có admin) |
| Quiz (4 bài, 38 câu), Từ vựng (80 từ) | ✅ | Bài quiz làm lại được không giới hạn, mỗi lần đều cộng XP |
| Trang công khai (landing, bảng Hiragana/Katakana, SEO) | ✅ | Hai bảng chữ cái dựng tĩnh lúc build |
| Docker Compose, CI, smoke test | ✅ | CI chạy backend + web + dựng cả stack |
| Luyện gõ tiếng Nhật (`/luyen-go`) | 🚧 | Nhánh `claude/japanese-text-input-feature-df8fd6`, chạy hoàn toàn ở client |
| Route guard bằng middleware + sửa đăng xuất | 🚧 | Thay đổi chưa commit trong một worktree |
| Chống giả mạo IP client (rate limit) | 🚧 | Thay đổi chưa commit trong một worktree |
| Thanh toán, trang quản trị nội dung, quên mật khẩu | ⬜ | Xem §6 |

---

## 2. Cách kiểm chứng và giới hạn

| Việc | Kết quả |
|---|---|
| Đọc source | Toàn bộ backend (config, security, service, controller, DTO, repository, migration, test) và toàn bộ `web/src` (trừ phần nội dung tĩnh dài của landing) |
| `npm ci && npm test` (web, 2026-10-01) | 22/22 test qua |
| `npm run lint` · `npm run typecheck` | Sạch |
| `npm run build` | Thành công, Next.js 15.5.25 sinh 23 trang/route (gồm 5 route handler `/api/auth/*`) |
| Backend (`mvn test`) | **Chưa chạy lại** — máy đọc không có Maven và Docker daemon. README ghi 35/35 test ngày 2026-09-28; số phương thức `@Test` trong source khớp (11 unit + 24 integration) |
| Chạy ứng dụng thật, smoke test | **Chưa chạy** — cùng lý do. Các nhận định về hành vi runtime ở §5 đến từ đọc code, không phải từ chạy thử; chỗ nào suy luận thì ghi rõ |

---

## 3. Đã làm được (đã nằm trong `master`)

### 3.1 Lịch sử

| Ngày | Mốc | Commit chính |
|---|---|---|
| 2026-09-08 | Thay bản v1 offline một file bằng nền tảng full-stack v2 (Spring Boot + Next.js). Bản v1 được giữ ở `archive/legacy-v1/` | `332cc8e`, `acd6900` |
| 2026-09-11 | Hệ thống giao diện "Modern Zen Luxury", landing, bảng kana công khai, màn hình đăng nhập/dashboard/luyện viết, cấu hình CORS, script khởi động Windows, bộ tài liệu đầu tiên | `24365ce` … `6b35c50` |
| 2026-09-28 | Seed từ vựng + bộ thẻ + 4 quiz; màn làm quiz; đọc cấu hình từ biến môi trường; **sửa lỗi thu hồi họ refresh token**; 24 integration test (Testcontainers); Vitest + ESLint 9; endpoint health; Dockerfile + Compose; CI GitHub Actions + smoke test; đồng bộ tài liệu. Hợp nhất qua PR #1 | `573d24d` … `ed8ff35` |
| 2026-09-30 | Phòng luyện gõ tiếng Nhật (chưa merge, xem §4) | nhánh `japanese-text-input-feature` |

### 3.2 Kiến trúc đã chạy

```
Trình duyệt ──► Next.js 15 (React 19, Tailwind v4, TanStack Query)
                 ├─ /api/auth/*  BFF: giữ refresh token trong cookie httpOnly `kd_rt`
                 └─ /api/v1/*    rewrite thẳng tới backend (đích chốt lúc build)
                      │
                      ▼
               Spring Boot 3.2.5 / Java 17  ──►  PostgreSQL 16 (Flyway, ddl-auto=validate)
```

- Access token (15 phút) chỉ nằm trong RAM của tab; refresh token (30 ngày) chỉ nằm trong cookie httpOnly. `web/src/lib/api.ts` tự refresh khi gặp 401 và gom nhiều lần 401 đồng thời vào **một** lần refresh (nếu không, cơ chế phát hiện tái sử dụng sẽ tự thu hồi phiên của chính người dùng).
- Profile `prod` dừng ngay khi thiếu `JWT_SECRET` (hoặc ngắn hơn 32 byte), `CORS_ORIGINS`, `GOOGLE_CLIENT_ID` (`config/ProdSecretsValidator.java`); tắt Swagger; chỉ mở `/actuator/health` và không lộ chi tiết.
- Lỗi luôn theo RFC 7807 với thông báo tiếng Việt, kể cả 401/403 ở tầng filter và 429 của rate limit.

### 3.3 API (27 endpoint)

🔒 = cần access token. Mọi endpoint 🔒 lấy `userId` từ `SecurityContext`, không nhận từ body.

| Nhóm | Endpoint | Hành vi đã xác minh trong code |
|---|---|---|
| Auth | `POST /auth/register`, `/login`, `/google`, `/refresh` · `POST /auth/logout` 🔒 · `GET`/`PATCH /auth/me` 🔒 | Đăng nhập bằng email **hoặc** username, không phân biệt hoa thường. Cùng một thông báo cho mọi nguyên nhân sai. `PATCH /me` sửa `displayName`, `timezone`, `dailyGoalXp` (10–5000), `locale` |
| Kana | `GET /kana`, `/kana/{id}`, `/kana/strokes` | Công khai. `/strokes` trả 148 glyph, `Cache-Control: public, max-age=31536000, immutable` + ETag; hỗ trợ `If-None-Match` → 304. Tham số enum không phân biệt hoa thường |
| Từ vựng, bộ thẻ | `GET /vocabulary`, `GET /decks` | Công khai. Từ vựng lọc theo `q` (từ, cách đọc, romaji, nghĩa). Khách và gói FREE chỉ thấy N5. `/decks` chỉ trả tên và số phần tử |
| Học tập 🔒 | `GET /reviews/queue`, `POST /reviews/grade`, `POST /writing/attempts`, `GET /progress/kana`, `GET /progress/summary` | Xem §3.4 |
| Trò chơi hoá 🔒 | `GET /stats/me`, `/stats/heatmap`, `/badges`, `/leaderboard/weekly`, `/leaderboard/archive` | `/leaderboard/archive?weekStart=` **có trong code nhưng chưa có trong SPEC và chưa có giao diện** |
| Quiz 🔒 | `GET /quizzes`, `/quizzes/{id}`, `POST /quizzes/{id}/attempts`, `POST /quiz-attempts/{id}/submit` | Đề không bao giờ kèm đáp án. Mỗi lượt nộp một lần; câu không gửi tính sai; so khớp bỏ khoảng trắng, không phân biệt hoa thường |
| Gói cước 🔒 | `GET /me/entitlements` | Hạn mức + mức đã dùng hôm nay theo múi giờ người học |

### 3.4 Luồng học tập

**Chấm nét (client, `web/src/lib/stroke-match.ts` + `StrokeStage.tsx`).** Canvas nhận mực, SVG giữ lưới và nét mẫu, cùng hệ toạ độ 109×109 của KanjiVG. Mỗi nét được lấy lại 24 điểm cách đều theo độ dài cung, so **chỉ theo chiều xuôi** (nét vẽ ngược bị phạt và báo `REVERSED`). Báo thêm `TOO_SHORT`, `TOO_LONG`, `OFF_PATH`. Phát hiện được khi người học viết nhầm sang nét khác của cùng chữ (báo là `OFF_PATH`; client chưa bao giờ phát `WRONG_ORDER`). Ngưỡng qua **từng nét**: Trace 58, Test 48 — nét chưa qua thì người học phải vẽ lại, không sang nét kế.

**Ghi bài viết (`WritingService.recordAttempt`).** Một giao dịch duy nhất: kiểm tra hạn mức viết → lưu `writing_attempts` → đo grade → cập nhật thẻ FSRS → ghi `review_logs` (kèm điểm gốc) → cộng XP/streak/`daily_activity` → xét huy hiệu. Có test khẳng định lỗi ở bước cuối rollback cả bốn bước trước (`WritingAttemptAtomicityTest`).

| Điểm trung bình | Grade | Ý nghĩa |
|---|---|---|
| có bất kỳ `strokeErrors`, hoặc < 48 | 1 Again | |
| 48–69 | 2 Hard | |
| 70–87 | 3 Good | `passed = true` từ đây |
| ≥ 88 | 4 Easy | |

**FSRS-6 (`srs/FsrsEngine.java`).** Thuần hàm, 21 tham số mặc định, mức nhớ mục tiêu 0,90 (cấu hình được), bước học `[1, 10]` phút và học lại `[10]` phút. Khoảng cách tối đa 36.500 ngày. `FsrsEngineTest` khoá: khoảng cách tăng dần khi trả lời đúng, giảm khi quên, difficulty ∈ [1,10], ngưỡng 48/70/88, Hard < Good < Easy.

**Hàng đợi ôn (`ReviewService.queue`).** Thẻ đến hạn (trễ nhất trước), sau đó thẻ mới. Thẻ được tạo **lười**: chỉ vật chất hoá đúng số thẻ mới cần, không sinh sẵn hàng trăm dòng cho tài khoản mới. Thứ tự cấp thẻ mới theo `ItemType`: `KANA_WRITING` (208 thẻ) → `KANA_READING` (208) → `VOCAB_*`. Hạn mức mặc định 10 thẻ mới/ngày (`SRS_NEW_CARDS_PER_DAY`).

Ở giao diện `/on-tap`: thẻ `KANA_WRITING` mở khung viết chế độ Test (đi qua `/writing/attempts`); các loại còn lại là thẻ lật, **người học tự chấm** 1–4 qua `/reviews/grade`.

### 3.5 Trò chơi hoá

| Thành phần | Quy tắc đã xác minh |
|---|---|
| XP | Ôn đúng 10 · ôn sai 3 · viết đạt lần đầu một ký tự 25 · quiz 20 + 5×số câu đúng · đạt mục tiêu ngày +50 |
| Level | `floor(sqrt(xp/100)) + 1`; ngưỡng lên cấp L+1 là `100·L²` XP |
| Streak | Chỉ tăng khi **đạt mục tiêu XP ngày**, tính theo ngày địa phương của người học. Hở đúng một ngày và còn thẻ băng thì tiêu một thẻ; hở nhiều hơn thì về 1. Thẻ băng hồi về tối đa 2 lúc 00:00 thứ Hai (giờ VN) |
| Huy hiệu (9) | `FIRST_STROKE`, `HIRAGANA_MASTER`, `KATAKANA_MASTER`, `STREAK_7/30/100`, `PERFECT_10`, `NIGHT_OWL`, `REVIEW_1000`. Chỉ chạy các phép kiểm tra liên quan tới sự kiện vừa xảy ra; trao huy hiệu idempotent nhờ `UNIQUE(user_id, badge_id)` |
| Bảng xếp hạng | Tuần từ 00:00 thứ Hai **giờ VN cho mọi người**. Tuần hiện tại tính trực tiếp từ `daily_activity`; job 00:05 thứ Hai chốt tuần trước vào `leaderboard_snapshots`. Chỉ tài khoản `ACTIVE` |

"Thuộc chắc" có **hai định nghĩa khác nhau** trong code: huy hiệu `*_MASTER` coi là thuộc khi thẻ viết đã tốt nghiệp sang `REVIEW`; thống kê `kanaMastered` đòi thêm `stability ≥ 21 ngày`.

### 3.6 Hạn mức gói

Nguồn duy nhất là bảng `plan_features`, nên đổi hạn mức chỉ cần một câu `UPDATE`.

| Tính năng | FREE | PRO | Áp dụng ở |
|---|---|---|---|
| `srs.daily_reviews` | 60 | không giới hạn | `POST /reviews/grade` |
| `writing.daily_attempts` | 100 | không giới hạn | `POST /writing/attempts` |
| `content.jlpt_levels` | N5 | N1–N5 | `GET /vocabulary`, cấp thẻ từ vựng mới |
| `stats.history_days` | 30 | không giới hạn | `GET /stats/heatmap` |

Vượt hạn mức → 429 với `type: …/errors/quota-exceeded`, kèm `featureKey` và `limitValue`.

### 3.7 Dữ liệu khởi đầu

| Nội dung | Số lượng | Nguồn |
|---|---|---|
| Ký tự kana | 208 (mỗi bảng: 46 cơ bản + 25 biến âm + 33 âm ghép) · 148 glyph | `KanaSeeder` đọc `data/kana-data.json` (3 bản sao giống hệt: `docs/`, `backend/`, `web/`) |
| Từ vựng | 80 (70 N5 + 10 N4: 42 danh từ, 17 động từ, 10 tính từ -i, 5 tính từ -na…) | `V3__seed_content.sql` |
| Bộ thẻ hệ thống | 1 ("Từ vựng N5 cơ bản", 70 phần tử) | `V3` |
| Quiz | 4 bài, 38 câu (Hiragana đọc âm, Katakana đọc âm, Từ vựng N5, Gõ romaji) | `V3` |
| Huy hiệu · hạn mức gói | 9 · 8 dòng | `V2__seed_reference.sql` |

### 3.8 Giao diện web (23 route)

| Route | Đăng nhập | Chức năng | API dùng |
|---|---|---|---|
| `/` | không | Landing: hero có demo vẽ nét, so sánh, FAQ + JSON-LD | — |
| `/bang-chu-cai/{hiragana,katakana}` | không | Bảng 104 âm, dựng tĩnh lúc build (SEO) | — (dữ liệu bundle sẵn) |
| `/dang-nhap`, `/dang-ky` | không | Form email/mật khẩu; nút Google | `/api/auth/*` |
| `/bang-dieu-khien` | có | Streak, level, mục tiêu ngày, heatmap 16 tuần, huy hiệu, nút tới ôn tập | `/stats/me`, `/progress/summary`, `/stats/heatmap`, `/badges` |
| `/luyen-viet` | có | Lưới 104 ký tự, khung viết Trace/Test, phím tắt, nghe giọng `ja-JP` (Web Speech), so sánh nét chuẩn | `/kana`, `/progress/kana`, `/writing/attempts` |
| `/on-tap` | có | Hàng đợi FSRS (viết hoặc lật thẻ + tự chấm) | `/reviews/queue`, `/reviews/grade`, `/writing/attempts` |
| `/tu-vung` | có | Tra từ theo cấp N5–N1 và từ khoá | `/vocabulary` |
| `/quiz`, `/quiz/[id]` | có | Danh sách; làm bài có đếm giờ, phím 1–4 và Enter, tự nộp khi hết giờ, xem đáp án kèm giải thích | `/quizzes*`, `/quiz-attempts/*` |
| `/bang-xep-hang` | có | Top 50 tuần + hạng của mình | `/leaderboard/weekly` |
| `/ho-so` | có | Mục tiêu XP, múi giờ (VN / giờ máy), hạn mức gói, đăng xuất | `/auth/me`, `/me/entitlements`, `/stats/me` |
| `/robots.txt`, `/sitemap.xml`, `/icon.svg` | — | SEO | — |

Giao diện sáng/tối (lưu `localStorage` khóa `kd.theme`), bố cục responsive có thanh điều hướng dưới cho điện thoại. Route "cần đăng nhập" hiện được bảo vệ **chỉ ở client** bằng `(app)/layout.tsx` (không có `middleware.ts` ở `master`).

### 3.9 Kiểm thử, CI, triển khai

| Bộ | Số test | Nội dung |
|---|---|---|
| `FsrsEngineTest` | 11 | Công thức FSRS, bước học, ngưỡng điểm → grade |
| `AuthFlowTest` | 6 | Refresh xoay vòng, tái sử dụng → thu hồi cả họ, logout chỉ một thiết bị, chỉ lưu hash, 401/409 dạng Problem Details |
| `WritingAttemptFlowTest` / `…AtomicityTest` | 5 / 1 | Đủ 5 bước, XP lần đầu/lần sau, nét hỏng, 404, validation, rollback |
| `QuizFlowTest` | 5 | Danh sách phân trang, không lộ đáp án, chấm điểm, nộp một lần, chỉ chủ lượt mới nộp |
| `ReviewQueueFlowTest` | 5 | Hình dạng JSON, thẻ từ vựng, hạn mức 10 thẻ mới, chấm thẻ, không chấm thẻ người khác |
| `HealthEndpointTest` | 2 | Health công khai, không lộ chi tiết; actuator khác bị đóng |
| Web `stroke-match.test.ts` | 22 | Lấy mẫu theo độ dài cung, bất biến theo tốc độ, phạt ngược chiều, chẩn đoán lỗi, `gradeFromScore` khớp backend |

Integration test chạy cả ứng dụng trên PostgreSQL 16 thật qua Testcontainers (không có Docker thì tự bỏ qua). **Chưa có test** cho: streak và thẻ băng, bảng xếp hạng, heatmap, hạn mức gói FREE (429) và lọc từ vựng theo gói, đăng nhập Google, các huy hiệu ngoài `FIRST_STROKE`, và toàn bộ component React.

CI (`.github/workflows/ci.yml`): job `backend` (`mvn verify`), job `web` (lint → typecheck → test → build), job `docker` (dựng cả Compose rồi chạy `scripts/smoke-test.sh`: trang chủ → rewrite → đăng ký qua BFF, refresh token không lộ ra JS, cookie `kd_rt` → POST có `Origin` → refresh bằng cookie). Smoke test (chế độ `server`) **chưa kiểm tra đăng xuất**; script có thêm chế độ `local` mặc định cho web không backend (xem [LOCAL_MODE.md §6](LOCAL_MODE.md)).

---

## 4. Đang làm (chưa vào `master`)

Ảnh chụp ngày 2026-10-01. Các worktree dưới đây thuộc các phiên làm việc khác; tài liệu này chỉ đọc, không sửa chúng.

| Nhánh / nơi | Trạng thái | Nội dung |
|---|---|---|
| `claude/japanese-text-input-feature-df8fd6` | Đã push, sạch; hơn `origin/master` 7 commit | **Phòng luyện gõ tiếng Nhật** `/luyen-go` |
| `claude/typing-sessions-backend` | Chỉ có ở máy, 1 commit WIP (`b73497c`) | Bản trước của tính năng trên, **có** lưu phiên gõ ở backend |
| `claude/route-guard-middleware` (worktree `doc-project-read-4c7b0a`) | **Chưa commit** (14 file sửa + 5 file mới) | Middleware bảo vệ route + sửa đăng xuất |
| `claude/gracious-hertz-72d01e` (worktree `new-feature-screens-8c8573`) | **Chưa commit**; dựa trên `6b35c50` (cũ) | Chặn giả mạo IP client để rate limit không bị né |

### 4.1 Phòng luyện gõ tiếng Nhật (nhánh `japanese-text-input-feature`)

Chi tiết nghiên cứu và thiết kế nằm trong `docs/TYPING.md` **của nhánh đó** (chưa có ở `master`). Tóm tắt:

- **Ba trục độc lập:** 3 cách nhập (romaji, kana JIS, bộ gõ IME/flick) × 6 loại nội dung (hiragana, katakana, hỗn hợp, kanji có furigana, kana ngẫu nhiên, chữ hay sai) × 3 chế độ (bài mẫu, đua giờ, sinh tử), cộng "nghe chép".
- **Nguyên tắc "chỉ có tiếng Nhật":** không hiện romaji mẫu, không bàn phím ảo; có gợi ý khi bị kẹt (sai 3 lần), ẩn furigana đến khi gõ đúng, và vòng luyện lại chữ hay sai (giảm 15% mỗi lượt).
- **Bộ máy gõ** (`web/src/lib/typing/`): bảng romaji theo luật MS-IME/Google IME (ん, っ, âm ghép, katakana mở rộng), bố cục JIS đọc theo `KeyboardEvent.code`, xử lý Unikey/EVKey (Telex) làm méo phím. Điểm = `round(KPM × độ chính xác³)`; thang đai 白帯 → 名人.
- **Kho câu:** 137 câu (36 hiragana, 44 katakana, 25 hỗn hợp, 32 kanji).
- **Kiểm chứng ghi trong README của nhánh (2026-09-30):** `npm test` 229/229, lint sạch, build 24 route. Tôi **chưa chạy lại** nhánh này.
- **Quyết định sản phẩm đáng chú ý:** kỷ lục và lịch sử lưu ở `localStorage` theo tài khoản, **không cộng XP/streak**. Phần đồng bộ lên máy chủ (bảng `typing_sessions`, `POST /typing/sessions`, `GET /typing/stats`, server tự tính lại điểm và chặn > 1.500 phím/phút) đã viết và có test, nhưng được **giữ dưới dạng comment**: migration nằm ở `backend/src/main/resources/db/disabled/` nên Flyway không chạy. `TYPING.md` §3.4 có các lệnh bật lại.
- Nhánh `typing-sessions-backend` là bản WIP có bật sẵn backend (migration V4 nằm trong `db/migration`, `GamificationService` thêm XP luyện gõ `min(50, 5 + phím đúng/10)`, có `VirtualKeyboard.tsx`). Nhánh `japanese-text-input-feature` đã bỏ bàn phím ảo và tắt phần backend, nên coi hai nhánh là **hai hướng thay thế nhau**, không phải hai phần bổ sung.

### 4.2 Route guard + sửa đăng xuất (`claude/route-guard-middleware`, chưa commit)

- `web/src/middleware.ts` (mới): chưa có cookie `kd_rt` thì chuyển 307 về `/dang-nhap?next=…` ngay ở server, thay vì tải khung ứng dụng rồi mới redirect. Chỉ là kiểm tra **lạc quan** (cookie có tồn tại hay không); quyền thật vẫn do backend kiểm. Có test kiểm tra mỗi thư mục trong `(app)` đều nằm trong `matcher`.
- `web/src/lib/session.ts`, `use-next-path.ts` (mới): đích quay lại sau đăng nhập, chặn open redirect (`//evil.com`, `/\evil.com`, ký tự điều khiển).
- `/api/auth/refresh`: xoá cookie khi refresh trả 401, để middleware không cho phiên đã chết đi qua mãi.
- **Backend `SecurityConfig`:** thêm `/api/v1/auth/logout` vào danh sách công khai (token tự xác thực chính nó). **Đây chính là bản sửa cho lỗi A ở §5.**
- `smoke-test.sh` thêm hai bước: route cần đăng nhập trả 307, và refresh token cũ bị 401 sau khi đăng xuất. **Lưu ý khi gộp:** PR #3 chia script thành `smoke_local`/`smoke_server`; hai bước này thuộc `smoke_server` (ở chế độ cá nhân, `/bang-dieu-khien` không còn bị chặn nên không trả 307).

### 4.3 Chặn giả mạo IP client (`claude/gracious-hertz-72d01e`, chưa commit)

- `ClientIpResolver` không còn tự đọc `X-Forwarded-For`/`X-Real-IP`; chỉ dùng `request.getRemoteAddr()`.
- `server.forward-headers-strategy: native` — `RemoteIpValve` của Tomcat chỉ tin `X-Forwarded-For` khi kết nối đến từ proxy khớp `TRUSTED_PROXIES` (mặc định là các dải IP nội bộ). Bỏ `framework` ở profile prod.
- Thêm test: `ClientIpRateLimitTest`, `UntrustedProxyRateLimitTest`, `RateLimitTestApp` (Tomcat nhúng thật, không cần DB). Cập nhật `DEPLOYMENT.md` và `backend/README.md` (khuyến cáo bind `127.0.0.1:…`, thu hẹp `TRUSTED_PROXIES`).
- **Rủi ro khi gộp:** worktree này dựa trên `6b35c50`, còn `DEPLOYMENT.md` ở `master` đã được viết lại hoàn toàn cho Docker Compose — diff của nó nhiều khả năng xung đột. Bản sửa cũng **chưa giải quyết** việc BFF `/api/auth/*` không chuyển tiếp IP thật của người dùng (xem lỗi M).

### 4.4 Lưu ý về thư mục chính

Nhánh `master` cục bộ ở `D:\Code\kana-dojo` đang ở `6b35c50`, **tụt 13 commit** so với `origin/master` (thiếu seed nội dung, Docker, CI, test…). Cần `git pull` trước khi làm tiếp ở đó.

---

## 5. Lỗi và sai lệch phát hiện khi đọc source

Sắp theo mức độ ảnh hưởng. "Chưa tái hiện" nghĩa là suy ra từ code, chưa chạy thật. Các lỗi A, B, M chưa có trong mục "Việc còn tồn đọng" của README.

**Ở chế độ cá nhân của web** ([LOCAL_MODE.md](LOCAL_MODE.md)): A, B, F, G, M **không áp dụng** (không có tài khoản, đăng xuất, hạn mức gói hay máy chủ);
E được sửa ngay trong bản cục bộ (đếm thẻ mới theo ngày giới thiệu); J được sửa một phần (hồ sơ nạp lại sau khi lưu); K đổi thành múi giờ mặc định theo trình duyệt;
C, D, H, I, N **vẫn còn**. Mã backend chỉ bị comment (không sửa) nên các lỗi phía server vẫn đúng với bản có máy chủ khi bật lại.

| # | Mức | Vấn đề | Bằng chứng | Tình trạng |
|---|---|---|---|---|
| **A** | Cao | **Đăng xuất từ web không thu hồi refresh token ở server.** BFF gọi `POST /auth/logout` không kèm `Authorization`, còn backend bắt buộc đăng nhập cho endpoint này nên trả 401; lỗi bị `.catch(() => {})` nuốt vì chỉ bắt lỗi mạng, không bắt mã HTTP. Cookie bị xoá nhưng token vẫn dùng được đến 30 ngày. Test `AuthFlowTest` không thấy vì gọi logout kèm Bearer | `web/src/app/api/auth/logout/route.ts:13-19`; `SecurityConfig.java:95-99,110` | 🚧 bản sửa có ở §4.2 (chưa commit) |
| **B** | Cao | **Đăng nhập Google chưa dùng được từ giao diện.** Khi có `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, nút chuyển tới `/api/auth/google/start` — route này không tồn tại (404). Không có mã nạp Google Identity Services ở đâu trong `web/`; `loginWithGoogle` được định nghĩa nhưng không ai gọi. Backend (`GoogleTokenVerifier`) và route `POST /api/auth/google` đã xong. README ghi "Email/mật khẩu + Google OAuth" là tính năng hoàn chỉnh | `GoogleButton.tsx:15`; `auth-context.tsx:14,69` | Chưa có kế hoạch trong các nhánh đang mở |
| **M** | Cao–TB | **Rate limit đăng nhập/đăng ký có thể bị né và đang dùng chung toàn site.** `ClientIpResolver` tin phần tử đầu của `X-Forwarded-For`, client tự đặt được. Ngoài ra BFF `/api/auth/*` không chuyển IP/User-Agent, nên `refresh_tokens.ip` và `user_agent` ghi của tiến trình Next | `ClientIpResolver.java:12`; `AuthRateLimitFilter.java:65`; `auth-proxy.ts` | 🚧 phần giả mạo đã có bản sửa (§4.3); phần BFF chưa |
| **G** | TB | **Server tin hoàn toàn điểm và grade do client gửi.** `avgScore`, `strokeScores`, `grade` không được kiểm lại nên có thể cày XP/bảng xếp hạng qua API; gói PRO không giới hạn lượt; quiz làm lại vô hạn, lần nào cũng cộng XP | `WritingService.java:56-58`; `GradeRequest`; `QuizService.submit` | Chưa xử lý. Phòng luyện gõ (nhánh đang mở) chọn hướng ngược lại: server tự tính lại điểm |
| **C** | TB | **Lưới kana sai khi thẻ chín.** Backend trả `level` thang 0–5 (`masteryLevel`), frontend khai báo và xử lý thang 0–2. Con dấu 済 và màu "thuộc" chỉ hiện ở `level === 2` (thẻ `REVIEW` có stability < 7 ngày); khi thẻ chín hơn (level 3–5) ô lại trông như chưa thuộc. Số "Đã tinh thông" cũng đếm `level === 2` nên **giảm** khi người học nhớ tốt hơn. Nhãn ghi "Đạt từ 80đ ở chế độ Tự viết" không tồn tại trong backend | `ProgressService.java:92-112`; `KanaGrid.tsx:6,64,77`; `luyen-viet/page.tsx:82`; `types.ts:44` | Chưa xử lý |
| **D** | Thấp | "Đã rèn luyện" luôn bằng tổng số ký tự: backend trả một ô cho **mọi** ký tự (kể cả chưa học, level 0), frontend đếm `states.size` | `ProgressService.java:42`; `luyen-viet/page.tsx:81` | Chưa xử lý |
| **E** | Thấp–TB | **Hạn mức thẻ mới/ngày "rò".** Số thẻ đã giới thiệu hôm nay được đếm bằng các thẻ có `reps = 1`. Khi một thẻ được chấm lần thứ hai (bước học 1 → 10 phút) nó rời khỏi tập đếm, trả lại một suất. *Suy ra từ code; test hiện có chỉ kiểm hai lần gọi queue liên tiếp, chưa tái hiện* | `ReviewCardRepository.java:77`; `ReviewService.java:187` | Chưa xử lý |
| **H** | TB (hành vi) | **Một lần vẽ hỏng ở bất kỳ nét nào khiến cả ký tự bị chấm grade 1 và `passed = false`**, dù người học vẽ lại đúng và đạt điểm cao. Client ghi lỗi vào `strokeErrors` ở mọi lần thất bại, server coi "có lỗi" là "quên". Có chủ đích (comment trong `FsrsEngine`) nhưng rất khắc nghiệt và chưa được nêu ở màn hình nào. Lần thất bại không có lý do chẩn đoán thì **không** được ghi | `StrokeStage.tsx:331,348`; `WritingService.java:57-58` | Quyết định sản phẩm cần xác nhận |
| **N** | Thấp | Nộp bài viết thất bại (429 hết hạn mức, mất mạng) không hiện lỗi: `PracticePanel.handleComplete` không có `catch`; trang `/on-tap` không có `onError`, thẻ đứng yên. | `PracticePanel.tsx:67`; `on-tap/page.tsx:148` | Chưa xử lý |
| **O** | Thấp | Thẻ từ vựng gần như không bao giờ vào hàng đợi: cấp sau 416 thẻ kana, với 10 thẻ/ngày là hơn 40 ngày. Trang Từ vựng vẫn ghi "cũng đi vào cùng một hàng đợi ôn tập FSRS" và không có nút thêm từ | `ReviewService.java:232`; `tu-vung/page.tsx:24` | README đã ghi nhận hạn chế |
| **I** | Thấp | Heatmap dựng khoá ngày bằng `toISOString()` (UTC) nhưng backend trả ngày theo múi giờ hồ sơ; từ 00:00–07:00 giờ VN ô "hôm nay" lệch một ngày | `bang-dieu-khien/page.tsx:180` | Chưa xử lý |
| **J** | Thấp | Hồ sơ: sau `PATCH /auth/me` không cập nhật `user` trong `AuthContext`, nên đổi múi giờ không hiện ngay đến khi tải lại trang; nhãn mục múi giờ ghi nhầm là "Giao diện"; lỗi lưu không hiển thị | `ho-so/page.tsx:33,77` | Chưa xử lý |
| **K** | Thấp | Đăng ký không gửi múi giờ trình duyệt, mọi tài khoản mới mặc định `Asia/Ho_Chi_Minh` — người ở múi giờ khác mất/ăn streak lệch giờ cho đến khi tự đổi trong Hồ sơ | `auth-context.tsx` (`RegisterInput`); `AuthService.java` | Chưa xử lý |
| **F** | Thấp | Mỗi lượt viết cũng ghi `review_logs` và được tính vào hạn mức `srs.daily_reviews` (60/ngày cho FREE), nhưng `POST /writing/attempts` chỉ kiểm hạn mức viết (100). Người dùng FREE đã viết 60 lượt sẽ bị chặn chấm thẻ lật mà vẫn viết tiếp được | `EntitlementService.java:62,81`; `WritingService.java:57` | Cần quyết định hạn mức có nên gộp hay tách |

### Mã không được dùng

- `RefreshTokenRepository.deleteExpired` không được gọi ở đâu (không có job dọn dẹp) → bảng `refresh_tokens` chỉ tăng. `revokeAllForUser` cũng không có nơi gọi (chưa có "đăng xuất mọi thiết bị" hay đổi mật khẩu).
- `review_cards.suspended` được lọc ở mọi truy vấn nhưng không có chỗ nào đặt thành `true`.
- `Role.ADMIN` và `@EnableMethodSecurity` có mặt, nhưng không có endpoint nào yêu cầu quyền admin.
- Bảng `subscriptions` có entity và repository nhưng không có mã nào ghi vào nó hay đổi `users.plan`: **tài khoản chỉ lên PRO được bằng SQL trực tiếp.**
- Bộ thẻ (`decks`) chỉ liệt kê được; không có endpoint xem phần tử, và hàng đợi ôn không dùng bộ thẻ.
- `zod` nằm trong `web/package.json` nhưng không file nào import. `users.locale` được lưu nhưng giao diện không dùng.

### Sai lệch giữa tài liệu hiện có và code

| Tài liệu | Nói | Thực tế |
|---|---|---|
| `DEVELOPMENT.md:453` | Gọi `LeaderboardService.snapshotWeekly()` qua Swagger | Không có phương thức đó; chỉ có `snapshotPreviousWeek()`/`snapshotWeek()`, không endpoint nào gọi — chỉ chạy theo lịch |
| `DEVELOPMENT.md:296` | Validate form bằng Zod | Không dùng Zod; chỉ có thuộc tính HTML và kiểm độ dài mật khẩu trong `dang-ky/page.tsx` |
| `DEVELOPMENT.md:295` | Bảo vệ route bằng middleware hoặc layout | Chỉ layout phía client (middleware mới nằm trong §4.2) |
| `ARCHITECTURE.md:102` | Luồng Google dùng Google Sign-In JS SDK | SDK chưa được nạp (lỗi B) |
| `ARCHITECTURE.md:194` | "Ngưỡng pass: TRACE = 58, TEST = 48" nằm dưới mục chuyển điểm → grade | Đó là ngưỡng qua **từng nét** ở client. Ngưỡng `passed` của cả ký tự ở server là grade ≥ 3, tức điểm ≥ 70 và không có lỗi nét |
| `DEVELOPMENT.md` (mục quy ước backend) | Request có validation dùng Lombok `@Data`/`@Builder`; test `FsrsEngine` dùng Mockito | Mọi DTO đều là `record` kể cả request; `FsrsEngineTest` là JUnit thuần |
| `SPEC.md` §5 | Chỉ có `/leaderboard/weekly` | Có thêm `/leaderboard/archive` |
| `README.md:31` | "Xác thực đầy đủ: … Google OAuth"; "Phân quyền gói: FREE và PRO" | Google chưa nối giao diện (B); chưa có cách lên PRO |
| Landing (`web/src/app/page.tsx`) | "Miễn phí 100% / trọn đời"; "tiến độ đồng bộ theo thời gian thực" | Gói FREE có hạn mức ngày (60 lượt ôn, 100 lượt viết); tiến độ đồng bộ qua request thường, không phải thời gian thực |

---

## 6. Chưa làm

| Hạng mục | Hiện trạng trong code |
|---|---|
| Thanh toán và nâng cấp PRO | Có bảng `subscriptions` và `plan_features`, chưa có tích hợp hay endpoint |
| Trang quản trị nội dung | Thêm từ vựng/quiz bằng migration Flyway (`V4__…sql`); quiz có cờ `is_published` nhưng không có giao diện bật/tắt |
| Quên mật khẩu, xác minh email, đổi mật khẩu, xoá tài khoản | Không có endpoint. `users.email_verified` chỉ được bật khi đăng nhập Google |
| Đổi tên hiển thị, ảnh đại diện trong giao diện | API `PATCH /auth/me` hỗ trợ `displayName`; giao diện Hồ sơ chưa có ô sửa |
| Xem lịch sử bảng xếp hạng | API đã có (`/leaderboard/archive`), chưa có giao diện |
| Tối ưu tham số FSRS theo từng người | Dữ liệu đã được ghi đầy đủ vào `review_logs` (kèm điểm gốc) cho mục đích này; `W` là hằng số |
| Chạy nhiều bản sao backend | Rate limit Bucket4j trong bộ nhớ, job định kỳ không có khoá phân tán |
| Đa ngôn ngữ | Giao diện cố định tiếng Việt |
| Kanji, ngữ pháp, nghe | Ngoài phạm vi hiện tại; từ vựng mới dừng ở N5 + 10 từ N4 |
| Nâng Next.js 16 | `postcss` mức high còn lại chỉ hết khi nâng (xem `DEVELOPMENT.md`) |

---

## 7. Đề xuất thứ tự việc tiếp theo

Mục 1–3 chỉ có tác dụng khi web dùng lại máy chủ; ở chế độ cá nhân hiện tại chúng chưa chặn gì.

1. **Hoàn tất và merge bản sửa đăng xuất (§4.2).** Đây là lỗi bảo mật duy nhất có bản sửa gần xong; `smoke-test.sh` mới đã có bước khoá hồi quy.
2. **Quyết định cho đăng nhập Google:** nối giao diện (nạp Google Identity Services, gọi `loginWithGoogle`) hoặc gỡ nút và sửa README/ARCHITECTURE cho đúng. Hiện nút quảng cáo một thứ không chạy.
3. **Rebase `claude/gracious-hertz-72d01e` lên `origin/master`** rồi merge bản chặn giả mạo IP (§4.3); xử lý luôn việc BFF chuyển tiếp IP/User-Agent.
4. **Sửa hợp đồng `level` 0–5 ↔ 0–2 (lỗi C, D)** — sửa ở frontend (`types.ts`, `KanaGrid.tsx`, `luyen-viet/page.tsx`), không cần đổi backend; thêm test cho `ProgressService`.
5. **Chốt hướng cho luyện gõ:** hai nhánh (`typing-sessions-backend` và `japanese-text-input-feature`) loại trừ nhau. Nếu chọn server tự chấm thì cũng là dịp xét lại lỗi G (server tin điểm do client gửi).
6. Bổ sung test cho phần chưa có (streak/freeze, huy hiệu, bảng xếp hạng, hạn mức gói) — đây là logic nhiều nhánh rẽ nhất và hiện gần như không được kiểm.
7. `git pull` ở thư mục chính `D:\Code\kana-dojo` (§4.4).
