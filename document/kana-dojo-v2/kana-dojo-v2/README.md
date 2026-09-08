# Kana Dōjō — nền tảng học viết tiếng Nhật

Monorepo. Frontend Next.js 15 + backend Spring Boot 3.2.5 + PostgreSQL 16.

```
kana-dojo-v2/
├── docs/
│   ├── SPEC.md          ĐẶC TẢ — nguồn sự thật cho cả BE và FE. Đọc file này trước.
│   └── kana-data.json   208 ký tự · 148 glyph, trích từ KanjiVG
├── backend/             Spring Boot: JWT + Google OAuth, FSRS-6, gamification, 28 bảng
│   ├── src/main/java/com/japanese/learning/
│   │   ├── srs/FsrsEngine.java        ← thuật toán lõi, thuần hàm, unit test được
│   │   ├── domain/ repository/ service/ controller/ dto/ security/ config/
│   │   └── seed/KanaSeeder.java
│   └── src/main/resources/db/migration/   Flyway V1__init.sql, V2__seed_reference.sql
└── web/                 Next.js 15 App Router, TypeScript, Tailwind v4
    └── src/
        ├── components/kana/StrokeStage.tsx   ← engine tập viết SVG + Canvas
        ├── lib/stroke-match.ts               ← bộ chấm điểm nét, thuần hàm
        └── app/                              23 route
```

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

mvn compile        # ← CHẠY LỆNH NÀY TRƯỚC TIÊN, xem mục Lưu ý bên dưới
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

## Lưu ý quan trọng khi bàn giao

**Backend chưa qua `mvn compile`.** Môi trường dựng ra mã nguồn này bị chặn truy cập Maven Central
nên không tải được thư viện. 115 file Java mới chỉ được kiểm tra cú pháp bằng `javac`, và
`FsrsEngine` được kiểm chứng riêng bằng 15.086 assertion chạy qua trình biên dịch Java độc lập.
Hãy chạy `mvn compile` trên máy bạn trước tiên — nhiều khả năng còn vài lỗi vặt về import hoặc
chữ ký phương thức cần sửa.

**Frontend đã kiểm chứng đầy đủ:** `next build` sạch (23 route), engine chấm nét đã được kiểm thử
bằng trình duyệt thật (nét đúng 95–96đ, nét vẽ ngược 0đ kèm thông báo đúng), trang SEO trả về HTML
đầy đủ, không tràn ngang trên màn 390px.

**Chưa làm (cố ý):** màn hình làm bài quiz (API máy chủ đã xong), cổng thanh toán
(lược đồ `subscriptions` + `plan_features` đã sẵn sàng).

## Giấy phép

Dữ liệu thứ tự nét trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — share-alike, cho phép dùng
thương mại. Nếu phát hành lại `kana-data.json` hoặc bản dẫn xuất, phải ghi công KanjiVG và giữ
nguyên giấy phép đó cho phần dữ liệu.
