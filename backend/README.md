# Kana Dōjō — Backend

Backend Spring Boot cho ứng dụng học tiếng Nhật **Kana Dōjō**: bảng chữ kana kèm dữ liệu nét viết,
luyện viết có chấm điểm, lịch ôn tập theo **FSRS-6**, trò chơi hóa (XP / streak / huy hiệu / bảng xếp hạng)
và hạn mức theo gói cước.

| | |
|---|---|
| Ngôn ngữ | Java 17 |
| Khung | Spring Boot 3.2.5 (Maven) |
| CSDL | PostgreSQL 16 (bắt buộc extension `citext`) |
| Migration | Flyway (`spring.jpa.hibernate.ddl-auto=validate`) |
| Xác thực | JWT HS256 (JJWT 0.12.5) + Google ID token |
| Tài liệu API | springdoc-openapi 2.5.0 |
| Base path | `/api/v1` |

---

## 1. Chuẩn bị

```bash
# PostgreSQL 16 chạy nhanh bằng Docker
docker run -d --name kanadojo-db \
  -e POSTGRES_DB=kanadojo \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16
```

Extension `citext` được `V1__init.sql` tự tạo (`CREATE EXTENSION IF NOT EXISTS citext`),
nên tài khoản kết nối cần quyền tạo extension ở lần chạy migration đầu tiên.

## 2. Biến môi trường

| Biến | Bắt buộc | Mặc định (dev) | Ý nghĩa |
|---|---|---|---|
| `DB_URL` | prod | `jdbc:postgresql://localhost:5432/kanadojo` | JDBC URL |
| `DB_USER` | prod | `postgres` | Tài khoản CSDL |
| `DB_PASSWORD` | prod | `postgres` | Mật khẩu CSDL |
| `JWT_SECRET` | **prod** | khoá dev dùng chung | Khoá ký HS256, **tối thiểu 32 byte** |
| `GOOGLE_CLIENT_ID` | prod | rỗng (tắt đăng nhập Google) | OAuth client id để kiểm tra `aud` |
| `CORS_ORIGINS` | prod | `localhost` và `127.0.0.1`, cổng 3000 và 3001 | Danh sách origin, phân tách bằng dấu phẩy. Phải gồm origin của frontend kể cả khi gọi qua rewrite của Next (header `Origin` được chuyển tiếp) |
| `SERVER_PORT` | không | `8080` | Cổng HTTP |
| `DB_POOL_SIZE` | không | `10` (dev) / `20` (prod) | Kích thước pool Hikari |
| `JWT_ACCESS_TTL` | không | `15m` | Duration của Spring (`15m`, `900s`…); số trần không đơn vị = mili giây |
| `JWT_REFRESH_TTL` | không | `30d` | Duration |
| `SRS_NEW_CARDS_PER_DAY` | không | `10` | Hạn mức thẻ mới mỗi ngày |

Ở profile `prod`, thiếu `JWT_SECRET`, `CORS_ORIGINS` hoặc `GOOGLE_CLIENT_ID` sẽ khiến ứng dụng
**dừng ngay khi khởi động** (`ProdSecretsValidator`) thay vì chạy với cấu hình rỗng.

## 3. Chạy

```bash
# Dev (profile mặc định)
mvn spring-boot:run

# Production
export DB_URL=jdbc:postgresql://db-host:5432/kanadojo
export DB_USER=kanadojo
export DB_PASSWORD=...
export JWT_SECRET="$(openssl rand -base64 48)"
export GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
export CORS_ORIGINS=https://kanadojo.app
mvn clean package
java -jar target/kana-dojo-backend-1.0.0.jar --spring.profiles.active=prod
```

Lần khởi động đầu tiên, `KanaSeeder` nạp **148 glyph** và **208 ký tự kana** từ
`classpath:data/kana-data.json`. Seeder idempotent: mỗi bảng (`kana_glyphs`, `kana_characters`) chỉ được nạp khi còn rỗng —
seeder **không** cập nhật dữ liệu đã có; sửa dữ liệu kana trên CSDL đang chạy thì phải viết migration.

## 4. Migration

Flyway chạy tự động lúc khởi động. Các lệnh thủ công:

```bash
mvn flyway:info      -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD
mvn flyway:migrate   -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD
mvn flyway:validate  -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD
mvn flyway:repair    -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD
```

| File | Nội dung |
|---|---|
| `V1__init.sql` | Toàn bộ 22 bảng, chỉ mục và ràng buộc |
| `V2__seed_reference.sql` | Hạn mức `plan_features` và 9 huy hiệu |
| `V3__seed_content.sql` | 70 từ N5 + 10 từ N4, bộ thẻ "Từ vựng N5 cơ bản", 4 quiz đã xuất bản |

Không dùng `ddl-auto: update`. Hibernate chỉ được đặt ở chế độ `validate`, nên mọi thay đổi
lược đồ **phải** đi qua một file migration mới.

## 5. Tài liệu API

* Swagger UI: <http://localhost:8080/swagger-ui.html>
* OpenAPI JSON: <http://localhost:8080/v3/api-docs>

Ở profile `prod`, Swagger bị tắt.

Nhấn **Authorize** rồi dán access token lấy từ `POST /api/v1/auth/login`.

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"hoc@vien.vn","username":"hocvien","password":"matkhau123","displayName":"Học viên"}'
```

## 6. Kiểm thử

```bash
mvn test                          # toàn bộ
mvn test -Dtest=FsrsEngineTest    # riêng bộ lập lịch FSRS
```

`FsrsEngineTest` là bài kiểm thử quan trọng nhất: nó khoá hành vi của thuật toán lập lịch
(khoảng cách tăng dần khi trả lời đúng, giảm khi quên, biên của difficulty, ngưỡng quy điểm nét → grade).

## 7. Bản đồ mã nguồn

```
com.japanese.learning
├── srs/FsrsEngine            thuật toán FSRS-6, thuần hàm, không phụ thuộc Spring
├── domain/entity             entity JPA
├── domain/enums              enum dùng chung cho cả lược đồ và API
├── repository                Spring Data JPA
├── service                   nghiệp vụ (review, writing, gamification, badge, leaderboard, entitlement)
├── security                  JWT, refresh token xoay vòng, Google, rate limit
├── config                    security, CORS, OpenAPI, lịch chạy nền, cấu hình ứng dụng
├── seed/KanaSeeder           nạp dữ liệu kana lúc khởi động
├── web/controller            REST controller
├── web/dto                   record DTO
└── common                    Problem Details, phân trang, tiện ích ngày địa phương
```

## 8. Ghi chú vận hành

* **Múi giờ**: streak, mục tiêu XP ngày và hạn mức đều tính theo `users.timezone`, không phải UTC.
  Bảng xếp hạng thì ngược lại — dùng cố định `Asia/Ho_Chi_Minh` để mọi người so được với nhau.
* **Công việc định kỳ**: chốt bảng xếp hạng tuần trước lúc 00:05 thứ Hai và hồi thẻ băng streak
  lúc 00:00 thứ Hai (giờ Việt Nam). Nếu chạy nhiều bản sao, cần khoá phân tán để job chỉ chạy một lần.
* **Rate limit** `/auth/login` và `/auth/register` là 10 request/phút/IP, lưu trong bộ nhớ tiến trình.
  Chạy nhiều bản sao thì đổi Bucket4j sang backend dùng chung.
* **Lỗi** luôn trả về RFC 7807 (`application/problem+json`) với thông báo tiếng Việt.
  Vượt hạn mức gói cước trả **429** kèm `type: https://kanadojo.app/errors/quota-exceeded`.
