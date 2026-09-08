# Kana Dōjō — nền tảng học viết tiếng Nhật

Monorepo. Frontend Next.js 15 + backend Spring Boot 3.2.5 + PostgreSQL 16.

Bản offline một-file trước đây (v1) được giữ nguyên trong [`archive/legacy-v1/`](archive/legacy-v1/README.md) —
xem thư mục đó nếu chỉ cần một trang HTML chạy ngay, không tài khoản, không server.

```
kana-dojo/
├── docs/
│   ├── SPEC.md          ĐẶC TẢ — nguồn sự thật cho cả BE và FE. Đọc file này trước.
│   └── kana-data.json   208 ký tự · 148 glyph, trích từ KanjiVG
├── backend/             Spring Boot: JWT + Google OAuth, FSRS-6, gamification, 28 bảng
│   ├── src/main/java/com/japanese/learning/
│   │   ├── srs/FsrsEngine.java        ← thuật toán lõi, thuần hàm, unit test được
│   │   ├── domain/ repository/ service/ controller/ dto/ security/ config/
│   │   └── seed/KanaSeeder.java
│   └── src/main/resources/db/migration/   Flyway V1__init.sql, V2__seed_reference.sql
├── web/                 Next.js 15 App Router, TypeScript, Tailwind v4
│   └── src/
│       ├── components/kana/StrokeStage.tsx   ← engine tập viết SVG + Canvas
│       ├── lib/stroke-match.ts               ← bộ chấm điểm nét, thuần hàm
│       └── app/                              23 route
└── archive/legacy-v1/   Bản HTML/CSS/JS thuần trước đây — zero dependency, 1 file, offline
```

## Nguồn gốc thuật toán chấm nét

Engine chấm nét của `web/src/lib/stroke-match.ts` (và bản Java song song trong
`FsrsEngine.gradeFromScore`) dùng **đúng thuật toán** đã thiết kế ở v1: lấy lại
điểm theo độ dài cung (arc-length resampling, 24 điểm), so khớp theo chiều xuôi
(không lấy `min(xuôi, ngược)` vì sẽ thưởng nhầm nét vẽ ngược chiều), phạt theo
tỉ lệ độ dài bằng logarit. Điểm khác biệt ở bản này: lỗi được trả về như **dữ
liệu có cấu trúc** (`reason: REVERSED | TOO_SHORT | TOO_LONG | OFF_PATH`) thay
vì chỉ suy ra một chuỗi thông báo — nhờ vậy `POST /writing/attempts` có thể ghi
lỗi từng nét vào `writing_attempts.stroke_errors` để tính `grade` cho FSRS và
dùng cho gamification. Xem [archive/legacy-v1/README.md](archive/legacy-v1/README.md#33-thuật-toán-chấm-điểm)
để đọc phần lý giải đầy đủ (vì sao arc-length, vì sao không lấy min, đơn vị của
sai lệch nghĩa là gì).

## Chạy lần đầu

### 1. Cơ sở dữ liệu

```bash
docker run -d --name kanadojo-db -p 5432:5432 \
  -e POSTGRES_DB=kanadojo -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  postgres:16
```

### 2. Backend

```bash
cd backend
set DB_URL=jdbc:postgresql://localhost:5432/kanadojo
set DB_USER=postgres
set DB_PASSWORD=postgres
set JWT_SECRET=<chuỗi base64 ít nhất 256 bit>
set CORS_ORIGINS=http://localhost:3000

mvn spring-boot:run
```

Flyway tự tạo lược đồ, `KanaSeeder` tự nạp 208 ký tự ở lần khởi động đầu.
Swagger: <http://localhost:8080/swagger-ui.html>

Sinh `JWT_SECRET`:
```bash
openssl rand -base64 48
```

### 3. Frontend

```bash
cd web
copy .env.example .env.local     # sửa BACKEND_URL nếu backend không ở cổng 8080
npm install
npm run dev                      # http://localhost:3000
```

## Trạng thái đã kiểm chứng

Khác với bản gốc README của v2 (môi trường dựng ra nó bị chặn Maven Central nên
chưa từng `mvn compile`), bản trong repo này **đã build và test thật**:

* **Backend:** `mvn compile`, `mvn test` (11 test, bao gồm `FsrsEngineTest` với
  hàng nghìn assertion cho công thức FSRS-6) và `mvn package` đều **BUILD
  SUCCESS**. Đã sửa 1 lỗi thật trong `pom.xml`: `flyway-database-postgresql`
  khai báo thiếu version — module này chỉ tồn tại từ Flyway 10 trở lên, còn
  Spring Boot 3.2.5 quản lý Flyway 9.22.3 (đã có sẵn hỗ trợ PostgreSQL trong
  `flyway-core`, không cần module riêng) → đã xóa dependency thừa đó.
* **Frontend:** `npm install`, `tsc --noEmit`, `next build` sạch, đủ 23 route
  như README gốc mô tả. `npm audit` phát hiện 3 lỗ hổng ở `next@15.1.6` (1
  **critical** — RCE qua React flight protocol) → đã nâng lên `next@15.5.25`
  (cùng major, không đổi API) để vá các lỗ hổng nghiêm trọng. Còn 1 lỗ hổng
  `postcss` mức **high** (đọc file `.map` tùy ý qua `sourceMappingURL`) chỉ hết
  hẳn nếu nâng lên Next 16 — đây là **breaking change** nên chưa áp dụng tự
  động, cần đánh giá và test riêng.
* **Chưa làm (kế thừa từ v2, cố ý):** màn hình làm bài quiz (API máy chủ đã
  xong), cổng thanh toán (lược đồ `subscriptions` + `plan_features` đã sẵn
  sàng).

## Giấy phép

Dữ liệu thứ tự nét trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — share-alike, cho phép dùng
thương mại. Nếu phát hành lại `kana-data.json` hoặc bản dẫn xuất, phải ghi công KanjiVG và giữ
nguyên giấy phép đó cho phần dữ liệu.
