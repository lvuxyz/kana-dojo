# Kana Dōjō — Nền tảng học viết tiếng Nhật

Ứng dụng web dạy viết Hiragana và Katakana đúng thứ tự nét, kết hợp thuật toán lặp lại ngắt quãng FSRS-6 để tối ưu hóa việc ghi nhớ lâu dài.

```
kana-dojo/
├── docs/
│   ├── SPEC.md            Đặc tả kỹ thuật — nguồn sự thật cho cả BE và FE
│   ├── ARCHITECTURE.md    Kiến trúc hệ thống, luồng dữ liệu, quyết định thiết kế
│   ├── TYPING.md          Nghiên cứu & thiết kế phòng luyện gõ tiếng Nhật
│   ├── DEVELOPMENT.md     Hướng dẫn thiết lập môi trường phát triển
│   ├── DEPLOYMENT.md      Hướng dẫn triển khai production
│   └── kana-data.json     208 ký tự · 148 glyph, trích từ KanjiVG (CC BY-SA 3.0)
├── backend/               Spring Boot 3.2.5 · Java 17 · PostgreSQL 16 (+ Dockerfile)
├── web/                   Next.js 15 App Router · TypeScript · Tailwind CSS v4 (+ Dockerfile)
├── docker-compose.yml     PostgreSQL + backend + web, chỉ mở cổng web
├── .github/workflows/     CI: test backend, lint/test/build web, smoke test qua Docker
├── scripts/smoke-test.sh  Kiểm tra nhanh một bản triển khai đang chạy
└── archive/legacy-v1/     Bản offline HTML/CSS/JS thuần — không server, không tài khoản
```

---

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **Tập viết có hướng dẫn** | Vẽ nét trên canvas, so khớp với dữ liệu KanjiVG, điểm 0–100 |
| **FSRS-6** | Lặp lại ngắt quãng thế hệ mới — điểm tập viết tự động xác định cấp độ |
| **Streak & XP** | Chuỗi ngày học, điểm kinh nghiệm, level, 9 huy hiệu thành tích |
| **Bảng xếp hạng** | Bảng tuần, snapshot mỗi thứ Hai 00:05 giờ Việt Nam |
| **Xác thực đầy đủ** | Email/mật khẩu + Google OAuth, JWT 15 phút, refresh token httpOnly |
| **Phân quyền gói** | FREE (60 lượt ôn/ngày, N5) và PRO (không giới hạn, N1–N5) |
| **Quiz** | 4 bài mẫu (trắc nghiệm + gõ romaji), đếm giờ, chấm và giải thích từng câu |
| **Luyện gõ tiếng Nhật** | Gõ theo câu mẫu: 3 cách nhập (romaji, kana JIS, bộ gõ IME/flick) × 6 loại văn bản (hiragana, katakana, hỗn hợp, kanji có furigana, kana ngẫu nhiên, chữ hay sai) × 3 chế độ (bài mẫu, đua giờ, sinh tử), thêm nghe chép; màn gõ chỉ có tiếng Nhật (không romaji gợi ý, dùng bàn phím thật) kèm gợi ý khi bị kẹt, ẩn furigana và luyện lại chữ hay sai; bấm giờ, chấm điểm KPM × chính xác³, xếp đai. Chạy hoàn toàn trên trình duyệt, kỷ lục lưu trên máy; mã đồng bộ lên máy chủ giữ sẵn dưới dạng comment — xem [docs/TYPING.md](docs/TYPING.md) |
| **Từ vựng JLPT** | 70 từ N5 + 10 từ N4 seed sẵn, nghĩa tiếng Việt, câu ví dụ; lược đồ hỗ trợ N1–N5 |
| **Swagger UI** | `http://localhost:8080/swagger-ui.html` |

---

## Khởi động nhanh (5 phút)

**Chỉ muốn chạy thử?** Có Docker là đủ:

```bash
cp .env.example .env     # điền DB_PASSWORD, JWT_SECRET, GOOGLE_CLIENT_ID (xem chú thích trong file)
docker compose up -d --build --wait
```

Mở <http://localhost:3000>. Chi tiết: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#chạy-bằng-docker-compose).
Các bước dưới đây dành cho **phát triển** (hot reload, chạy từng phần riêng).

### Yêu cầu hệ thống

- Java 17+
- Maven 3.9+
- Node.js 20+
- Docker (để chạy PostgreSQL)

### Bước 1 — Cơ sở dữ liệu

```bash
docker run -d --name kanadojo-db -p 5432:5432 \
  -e POSTGRES_DB=kanadojo \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16
```

Flyway tự tạo toàn bộ lược đồ (22 bảng) kèm dữ liệu khởi đầu (gói cước, huy hiệu, từ vựng, quiz mẫu), và `KanaSeeder` tự nạp 208 ký tự khi backend khởi động lần đầu — không cần chạy script SQL thủ công.

### Bước 2 — Backend

Ở môi trường dev mọi biến đều có mặc định khớp với container ở bước 1, nên chỉ cần:

```bash
cd backend
mvn spring-boot:run
```

Muốn ghi đè (DB khác, khoá JWT riêng…) xem bảng [Biến môi trường](#biến-môi-trường) và [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
Backend sẵn sàng khi thấy log `Started KanaDojoApplication`.

### Bước 3 — Frontend

```bash
cd web
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS/Linux

npm install
npm run dev
```

Mở <http://localhost:3001> (script `dev` chạy ở cổng 3001).

> **Windows:** `start-services.bat` bật cả PostgreSQL portable, backend (JAR đã build) và frontend — điều kiện xem
> [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#cách-nhanh-trên-windows-start-servicesbat).

---

## Biến môi trường

### Backend — kết nối & bảo mật

Ở dev đều có mặc định; ở profile `prod` thì `DB_*`, `JWT_SECRET`, `CORS_ORIGINS`, `GOOGLE_CLIENT_ID` **bắt buộc**
(thiếu → `ProdSecretsValidator` dừng ứng dụng ngay khi khởi động).

| Biến | Mặc định dev | Mô tả |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/kanadojo` | JDBC URL PostgreSQL |
| `DB_USER` | `postgres` | Tên người dùng DB |
| `DB_PASSWORD` | `postgres` | Mật khẩu DB |
| `JWT_SECRET` | khoá dev dùng chung | Khóa ký JWT, base64 ≥ 256 bit (`openssl rand -base64 48`) |
| `CORS_ORIGINS` | `localhost:3000`, `localhost:3001` (+ `127.0.0.1`) | Origin được phép, cách nhau bằng dấu phẩy. Phải chứa origin người dùng mở trang — kể cả khi gọi qua rewrite của Next |
| `GOOGLE_CLIENT_ID` | *(trống — tắt đăng nhập Google)* | OAuth client ID |

### Backend — tinh chỉnh

| Biến | Mặc định | Mô tả |
|---|---|---|
| `SERVER_PORT` | `8080` | Cổng HTTP |
| `DB_POOL_SIZE` | `10` (dev) / `20` (prod) | Kích thước pool Hikari |
| `JWT_ACCESS_TTL` | `15m` | Thời gian sống access token — kiểu Duration (`15m`, `900s`); số trần bị hiểu là mili giây |
| `JWT_REFRESH_TTL` | `30d` | Thời gian sống refresh token (Duration) |
| `SRS_NEW_CARDS_PER_DAY` | `10` | Số thẻ mới tối đa mỗi ngày |

### Frontend (`.env.local`)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | URL backend (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | URL công khai của site |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | *(trống)* | Client ID Google OAuth |

---

## Cấu trúc thư mục chi tiết

```
backend/src/main/java/com/japanese/learning/
├── KanaDojoApplication.java
├── common/             ApiException, ErrorTypes, GlobalExceptionHandler
├── config/             AppProperties, SecurityConfig, WebConfig, OpenApiConfig
│                       SchedulingConfig, ProdSecretsValidator
├── domain/
│   ├── entity/         22 JPA entity (users, kana_characters, review_cards, …)
│   ├── enums/          CardState, ItemType, KanaGroup, Script, BadgeTier, …
│   └── StrokeError.java
├── repository/         Spring Data JPA repositories
├── security/           JwtService, JwtAuthenticationFilter, GoogleTokenVerifier
│                       RefreshTokenService, AuthRateLimitFilter
├── seed/               KanaSeeder — ApplicationRunner, idempotent
├── service/            AuthService, ReviewService, WritingService
│                       BadgeService, GamificationService, …
├── srs/                FsrsEngine.java — thuần hàm, không Spring, unit test được
└── web/
    ├── controller/     12 REST controller
    └── dto/            AuthDtos, ContentDtos, LearningDtos, GamificationDtos, …

web/src/
├── app/
│   ├── (app)/          Route group yêu cầu đăng nhập (layout.tsx có shell)
│   │   ├── bang-dieu-khien/    Dashboard
│   │   ├── luyen-viet/         Tập viết
│   │   ├── luyen-go/           Luyện gõ tiếng Nhật (chọn bài → gõ → kết quả)
│   │   ├── on-tap/             Ôn tập SRS
│   │   ├── bang-xep-hang/      Bảng xếp hạng
│   │   ├── ho-so/              Hồ sơ cá nhân
│   │   ├── quiz/               Danh sách quiz + màn làm bài quiz/[id]
│   │   └── tu-vung/            Từ vựng
│   ├── (auth)/         Route group xác thực (dang-nhap, dang-ky)
│   ├── bang-chu-cai/[script]/  Bảng chữ cái công khai
│   └── api/auth/       BFF route handlers (login, register, google, logout, refresh)
├── components/
│   ├── app/            Brand, Nav, ThemeToggle, GoogleButton
│   ├── kana/           StrokeStage, KanaGrid, PracticePanel, HeroDemo
│   ├── typing/         TypingSetup, TypingStage, TypingResult, PhraseView, useTypingGame
│   └── ui/index.tsx    Design system: Button, Card, Field, Chip, Progress, Stat, …
├── data/kana-data.json  Dữ liệu nét bundle sẵn vào JS (57 KB, ~20 KB gzip)
├── data/typing-texts.ts Kho câu mẫu luyện gõ, kanji viết {chữ|cách đọc}
└── lib/
    ├── api.ts           Fetch wrapper: auto-refresh token, coalesce 401
    ├── auth-context.tsx React context xác thực
    ├── auth-proxy.ts    Tách refresh token → httpOnly cookie
    ├── kana.ts          Truy cập dữ liệu nét đã bundle
    ├── providers.tsx    QueryClientProvider + AuthProvider
    ├── stroke-match.ts  Bộ chấm điểm nét — arc-length resampling, thuần hàm
    ├── typing/          Bộ máy luyện gõ: romaji.ts (bảng IME), kana-layout.ts (JIS), engine.ts, ime.ts, history.ts, score.ts
    └── types.ts         TypeScript types khớp với DTO backend / SPEC.md
```

---

## Kiểm thử

```bash
# Backend — 11 unit test + 24 integration test (PostgreSQL thật qua Testcontainers, cần Docker)
cd backend
mvn test

# Frontend — unit test (Vitest), lint, kiểm tra kiểu, build
cd web
npm test
npm run lint
npm run typecheck
npm run build
```

Không có Docker thì integration test tự bỏ qua. Chi tiết từng bộ test: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#chạy-kiểm-thử).
CI (GitHub Actions) chạy tất cả những lệnh trên cho mỗi pull request, rồi dựng cả stack bằng `docker compose` và chạy
`scripts/smoke-test.sh` — xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#ci-github-actions).

---

## Trạng thái build đã kiểm chứng

Kiểm chứng ngày 2026-09-30 (thêm phòng luyện gõ, chỉ đổi frontend):

- **Frontend:** `npm test` 229/229 · `npm run lint` sạch · `tsc --noEmit` · `next build` — thành công, 24 route
- **End-to-end:** `/luyen-go` với romaji (bài mẫu), kana JIS (đua giờ), IME + kanji, sinh tử + nghe chép; gợi ý khi bị kẹt hai bậc với kanji ẩn furigana, luyện lại câu có lỗi, bài "Chữ hay sai"; kỷ lục lưu theo tài khoản và đọc lại từ localStorage

Kiểm chứng ngày 2026-09-28:

- **Backend:** `mvn test` — 35/35 test qua (11 unit + 24 integration trên PostgreSQL 16 qua Testcontainers)
- **Frontend:** `npm test` 22/22 · `npm run lint` sạch · `tsc --noEmit` · `next build` — thành công, 23 route
- **End-to-end:** đăng ký → danh sách từ vựng → làm quiz và nộp bài → hàng đợi ôn tập, chạy qua rewrite của Next
- **Docker:** `docker compose up --build --wait` — ba dịch vụ healthy; `scripts/smoke-test.sh` qua 7/7 bước

Xem chi tiết các vấn đề đã phát hiện và sửa tại [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#sự-cố-đã-gặp-và-cách-xử-lý).

---

## Tính năng chưa hoàn thiện (cố ý)

| Tính năng | Trạng thái |
|---|---|
| Cổng thanh toán | Lược đồ DB (`subscriptions`, `plan_features`) sẵn sàng, tích hợp chưa làm |
| Quản trị nội dung | Chưa có trang admin — thêm từ vựng/quiz bằng migration Flyway mới |
| Thẻ từ vựng trong hàng đợi ôn | Hạn mức thẻ mới/ngày dùng chung và thẻ `KANA_*` được cấp trước, nên thẻ `VOCAB_*` chỉ xuất hiện sau khi đã mở hết 416 thẻ kana (trừ khi client gọi `/reviews/queue?types=VOCAB_MEANING`) |
| IP người dùng qua BFF | Route `/api/auth/*` gọi backend từ server Next mà không chuyển tiếp IP gốc, nên backend thấy IP của container web: rate limit đăng nhập/đăng ký (10/phút/IP) đang áp **chung cho cả site** và `refresh_tokens.ip` ghi sai. Cần sửa cùng lúc với việc chỉ tin `X-Forwarded-For` từ proxy tin cậy |

---

## Tài liệu liên quan

| Tài liệu | Mục đích |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Đặc tả kỹ thuật đầy đủ — lược đồ DB, API, thuật toán |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc hệ thống, luồng xác thực, quyết định thiết kế |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Thiết lập môi trường dev, gỡ lỗi, quy ước code |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Triển khai production với Docker và Nginx |
| [archive/legacy-v1/README.md](archive/legacy-v1/README.md) | Giải thích đầy đủ thuật toán chấm nét (arc-length, forward-only) |

---

## Giấy phép

Dữ liệu thứ tự nét trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — share-alike, cho phép dùng thương mại.
Nếu phát hành lại `kana-data.json` hoặc bản dẫn xuất, phải ghi công KanjiVG và giữ nguyên giấy phép đó cho phần dữ liệu.
