# Kana Dōjō — Nền tảng học viết tiếng Nhật

Ứng dụng web dạy viết Hiragana và Katakana đúng thứ tự nét, kết hợp thuật toán lặp lại ngắt quãng FSRS-6 để tối ưu hóa việc ghi nhớ lâu dài.

```
kana-dojo/
├── docs/
│   ├── SPEC.md            Đặc tả kỹ thuật — nguồn sự thật cho cả BE và FE
│   ├── ARCHITECTURE.md    Kiến trúc hệ thống, luồng dữ liệu, quyết định thiết kế
│   ├── DEVELOPMENT.md     Hướng dẫn thiết lập môi trường phát triển
│   ├── DEPLOYMENT.md      Hướng dẫn triển khai production
│   └── kana-data.json     208 ký tự · 148 glyph, trích từ KanjiVG (CC BY-SA 3.0)
├── backend/               Spring Boot 3.2.5 · Java 17 · PostgreSQL 16
├── web/                   Next.js 15 App Router · TypeScript · Tailwind CSS v4
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
| **Quiz** | Nhiều loại câu hỏi, ghi nhận kết quả đầy đủ |
| **Từ vựng JLPT** | N1–N5, nghĩa tiếng Việt, câu ví dụ |
| **Swagger UI** | `http://localhost:8080/swagger-ui.html` |

---

## Khởi động nhanh (5 phút)

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

Flyway tự tạo toàn bộ lược đồ (28 bảng) và `KanaSeeder` tự nạp 208 ký tự khi backend khởi động lần đầu — không cần chạy script SQL thủ công.

### Bước 2 — Backend

```bash
cd backend

# Windows
set DB_URL=jdbc:postgresql://localhost:5432/kanadojo
set DB_USER=postgres
set DB_PASSWORD=postgres
set JWT_SECRET=<chuỗi base64, ít nhất 256 bit — xem bên dưới>
set CORS_ORIGINS=http://localhost:3000

mvn spring-boot:run
```

```bash
# macOS / Linux
export DB_URL=jdbc:postgresql://localhost:5432/kanadojo
export DB_USER=postgres
export DB_PASSWORD=postgres
export JWT_SECRET=<chuỗi base64>
export CORS_ORIGINS=http://localhost:3000

mvn spring-boot:run
```

Sinh `JWT_SECRET`:
```bash
openssl rand -base64 48
```

Backend sẵn sàng khi thấy log `Started KanaDojoApplication`.

### Bước 3 — Frontend

```bash
cd web
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS/Linux

npm install
npm run dev
```

Mở <http://localhost:3000>.

---

## Biến môi trường

### Backend (bắt buộc)

| Biến | Ví dụ | Mô tả |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/kanadojo` | JDBC URL PostgreSQL |
| `DB_USER` | `postgres` | Tên người dùng DB |
| `DB_PASSWORD` | `postgres` | Mật khẩu DB |
| `JWT_SECRET` | *(base64, ≥256 bit)* | Khóa ký JWT — **bắt buộc trên production** |
| `CORS_ORIGINS` | `http://localhost:3000` | Origin được phép, cách nhau bằng dấu phẩy |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Chỉ bắt buộc nếu dùng đăng nhập Google |

### Backend (tùy chọn, có giá trị mặc định)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `SERVER_PORT` | `8080` | Cổng HTTP |
| `DB_POOL_SIZE` | `10` | Kích thước pool Hikari |
| `JWT_ACCESS_TTL` | `900` | Thời gian sống access token (giây) |
| `JWT_REFRESH_TTL` | `2592000` | Thời gian sống refresh token (giây) |
| `SRS_NEW_CARDS_PER_DAY` | `10` | Số thẻ mới tối đa mỗi ngày |

### Frontend (`.env.local`)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `BACKEND_URL` | `http://localhost:8080` | URL backend (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | URL công khai của site |
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
│   ├── entity/         28 JPA entity (users, kana_chars, srs_cards, …)
│   ├── enums/          CardState, ItemType, KanaGroup, Script, BadgeTier, …
│   └── StrokeError.java
├── repository/         Spring Data JPA repositories
├── security/           JwtService, JwtAuthFilter, GoogleTokenVerifier
│                       RefreshTokenService
├── seed/               KanaSeeder — ApplicationRunner, idempotent
├── service/            AuthService, ReviewService, WritingService
│                       BadgeService, GamificationService, …
├── srs/                FsrsEngine.java — thuần hàm, không Spring, unit test được
└── web/
    ├── controller/     14 REST controller
    └── dto/            AuthDtos, ContentDtos, LearningDtos, GamificationDtos, …

web/src/
├── app/
│   ├── (app)/          Route group yêu cầu đăng nhập (layout.tsx có shell)
│   │   ├── bang-dieu-khien/    Dashboard
│   │   ├── luyen-viet/         Tập viết
│   │   ├── on-tap/             Ôn tập SRS
│   │   ├── bang-xep-hang/      Bảng xếp hạng
│   │   ├── ho-so/              Hồ sơ cá nhân
│   │   ├── quiz/               Quiz
│   │   └── tu-vung/            Từ vựng
│   ├── (auth)/         Route group xác thực (dang-nhap, dang-ky)
│   ├── bang-chu-cai/[script]/  Bảng chữ cái công khai
│   └── api/auth/       BFF route handlers (login, register, google, logout, refresh)
├── components/
│   ├── app/            Brand, Nav, ThemeToggle, GoogleButton
│   ├── kana/           StrokeStage, KanaGrid, PracticePanel, HeroDemo
│   └── ui/index.tsx    Design system: Button, Card, Field, Chip, Progress, Stat, …
├── data/kana-data.json  Dữ liệu nét bundle sẵn vào JS (57 KB, ~20 KB gzip)
└── lib/
    ├── api.ts           Fetch wrapper: auto-refresh token, coalesce 401
    ├── auth-context.tsx React context xác thực
    ├── auth-proxy.ts    Tách refresh token → httpOnly cookie
    ├── stroke-match.ts  Bộ chấm điểm nét — arc-length resampling, thuần hàm
    └── types.ts         TypeScript types khớp với SPEC.md
```

---

## Kiểm thử

```bash
# Backend — 11 test, bao gồm hàng nghìn assertion cho FsrsEngine
cd backend
mvn test

# Frontend — kiểm tra kiểu
cd web
npm run typecheck

# Frontend — build production
cd web
npm run build
```

---

## Trạng thái build đã kiểm chứng

- **Backend:** `mvn compile` · `mvn test` (11 test) · `mvn package` — BUILD SUCCESS
- **Frontend:** `tsc --noEmit` · `next build` — thành công, 23 route

Xem chi tiết các vấn đề đã phát hiện và sửa tại [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#sự-cố-đã-gặp-và-cách-xử-lý).

---

## Tính năng chưa hoàn thiện (cố ý)

| Tính năng | Trạng thái |
|---|---|
| Màn hình làm bài quiz | API backend xong, UI chưa làm |
| Cổng thanh toán | Lược đồ DB (`subscriptions`, `plan_features`) sẵn sàng, tích hợp chưa làm |

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
