# Kana Dōjō — Hướng dẫn phát triển

## Yêu cầu môi trường

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Java | 17 | Kiểm tra: `java -version` |
| Maven | 3.9 | Kiểm tra: `mvn -version` |
| Node.js | 20 LTS | Kiểm tra: `node -v` |
| npm | 10 | Đi kèm Node.js 20 |
| Docker | 24 | Để chạy PostgreSQL |
| PostgreSQL | 16 | Qua Docker hoặc cài thẳng |

---

## Thiết lập lần đầu

### 1. Clone và chuẩn bị

```bash
git clone <repo-url> kana-dojo
cd kana-dojo
```

### 2. Khởi động PostgreSQL

```bash
docker run -d --name kanadojo-db \
  -p 5432:5432 \
  -e POSTGRES_DB=kanadojo \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  --restart unless-stopped \
  postgres:16
```

Kiểm tra container đang chạy:
```bash
docker ps --filter name=kanadojo-db
```

### 3. Cấu hình và chạy backend

Ở profile dev, **mọi biến đều có giá trị mặc định** (DB `postgres/postgres` trên `localhost:5432`, khoá JWT dev,
CORS cho `localhost:3000` và `localhost:3001`) — với Postgres chạy như bước 2 thì chỉ cần `mvn spring-boot:run`.
Các lệnh dưới đây chỉ cần khi muốn ghi đè.

```bash
cd backend
```

**Windows (PowerShell):**
```powershell
$env:DB_URL       = "jdbc:postgresql://localhost:5432/kanadojo"
$env:DB_USER      = "postgres"
$env:DB_PASSWORD  = "postgres"
$env:JWT_SECRET   = (& openssl rand -base64 48)
$env:CORS_ORIGINS = "http://localhost:3001"

mvn spring-boot:run
```

**Windows (CMD):**
```cmd
set DB_URL=jdbc:postgresql://localhost:5432/kanadojo
set DB_USER=postgres
set DB_PASSWORD=postgres
set JWT_SECRET=<chuỗi base64 — xem bên dưới>
set CORS_ORIGINS=http://localhost:3001

mvn spring-boot:run
```

**macOS / Linux:**
```bash
export DB_URL=jdbc:postgresql://localhost:5432/kanadojo
export DB_USER=postgres
export DB_PASSWORD=postgres
export JWT_SECRET=$(openssl rand -base64 48)
export CORS_ORIGINS=http://localhost:3001

mvn spring-boot:run
```

Backend sẵn sàng khi log hiện:
```
Started KanaDojoApplication in X.XXX seconds
```

**Kiểm tra:**
```bash
curl http://localhost:8080/api/v1/content/kana/hiragana
```

### 4. Cấu hình và chạy frontend

```bash
cd web
cp .env.example .env.local    # macOS/Linux
copy .env.example .env.local  # Windows

npm install
npm run dev          # chạy ở cổng 3001 (xem "scripts" trong package.json)
```

Mở <http://localhost:3001>.

> **Cổng frontend:** dev dùng **3001** (`npm run dev`, `start-services.ps1`). Production (`next start`, Docker) dùng 3000.
> `CORS_ORIGINS` phải chứa đúng origin đang mở trình duyệt — xem mục *Sự cố đã gặp* bên dưới.

### Cách nhanh trên Windows: `start-services.bat`

`start-services.ps1` (và bản `.bat` bọc ngoài) bật lần lượt PostgreSQL → backend → frontend, bỏ qua dịch vụ nào đã chạy;
`stop-services.*` tắt chúng. Script giả định:

- PostgreSQL 16 bản portable ở `.tools\pgsql` (thư mục `.tools/` bị `.gitignore`, mỗi máy tự chuẩn bị) với cluster đã khởi tạo ở `.tools\pgsql\data`:
  ```powershell
  .tools\pgsql\bin\initdb.exe -D .tools\pgsql\data -U postgres -A trust -E UTF8
  .tools\pgsql\bin\pg_ctl.exe -D .tools\pgsql\data start
  .tools\pgsql\bin\psql.exe -U postgres -c "CREATE DATABASE kanadojo"
  ```
- JAR backend đã build sẵn: `mvn clean package -DskipTests` (script **không** tự build).
- Java: script tìm JDK 21 ở vài đường dẫn quen thuộc rồi mới dùng `java` trong `PATH`; JDK 17 trở lên đều chạy được.

---

## Cấu trúc `.env.local` đầy đủ

```bash
# URL backend — server-side only, KHÔNG expose ra trình duyệt
BACKEND_URL=http://localhost:8080

# URL công khai của site — dùng cho Open Graph, sitemap, v.v.
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Google OAuth (tùy chọn — bỏ trống nếu không cần đăng nhập Google)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

---

## Chạy kiểm thử

### Backend

```bash
cd backend

# Chạy tất cả test
mvn test

# Chỉ chạy FsrsEngineTest
mvn test -Dtest=FsrsEngineTest

# Build + test + đóng gói
mvn package
```

Không cần PostgreSQL đang chạy: test hiện tại không khởi động Spring context. (H2 đã khai báo trong `pom.xml` cho integration test sau này,
nhưng H2 không có kiểu `citext` nên `V1__init.sql` sẽ không chạy trên H2 — integration test nên dùng Testcontainers + PostgreSQL.)

**11 test hiện tại**, tất cả trong `FsrsEngineTest`: khoá hành vi FSRS-6 (khoảng cách tăng khi nhớ, giảm khi quên,
biên của difficulty, bước học, ngưỡng quy điểm nét → grade).

### Frontend

```bash
cd web

# Kiểm tra kiểu TypeScript
npm run typecheck

# Build production (phát hiện lỗi build)
npm run build
```

> `npm run lint` **chưa dùng được**: dự án chưa cài `eslint` / `eslint-config-next` và chưa có file cấu hình
> (vì vậy `next.config.mjs` đặt `eslint.ignoreDuringBuilds: true`).

---

## Swagger UI

Khi backend đang chạy, truy cập: <http://localhost:8080/swagger-ui.html>

Để test các endpoint yêu cầu xác thực:
1. Gọi `POST /api/v1/auth/login` để lấy `accessToken`
2. Nhấn **Authorize** (biểu tượng ổ khóa) → nhập `Bearer <accessToken>`

---

## Cấu trúc package backend

```
com.japanese.learning/
├── KanaDojoApplication.java       Điểm vào Spring Boot
│
├── common/
│   ├── ApiException.java          RuntimeException có HTTP status và error code
│   ├── ErrorTypes.java            Hằng số error code (AUTH_*, CONTENT_*, SRS_*, …)
│   ├── GlobalExceptionHandler.java  @RestControllerAdvice → RFC 7807 Problem Details
│   ├── QuotaExceededException.java  429 khi vượt hạn mức gói
│   ├── PageResponse.java          {content, page, size, totalElements, totalPages}
│   └── LocalDay.java              Quy đổi "hôm nay" theo múi giờ người dùng
│
├── config/
│   ├── AppProperties.java         @ConfigurationProperties — tất cả config nghiệp vụ
│   ├── SecurityConfig.java        Cấu hình Spring Security, CORS, endpoints public
│   ├── WebConfig.java             Cấu hình Web MVC
│   ├── OpenApiConfig.java         springdoc, BearerAuth scheme
│   ├── SchedulingConfig.java      @EnableScheduling
│   └── ProdSecretsValidator.java  Fail-fast nếu thiếu secret trên production
│
├── domain/
│   ├── entity/                    22 JPA entity (+ BaseEntity) — một entity cho mỗi bảng
│   ├── enums/                     CardState, ItemType, KanaGroup, Script, BadgeTier, …
│   └── StrokeError.java           @Embeddable — lưu lỗi từng nét trong writing_attempts
│
├── repository/                    Spring Data JPA repositories (interface extends JpaRepository)
│
├── security/
│   ├── JwtService.java            Phát và xác thực JWT bằng JJWT 0.12.5
│   ├── JwtAuthenticationFilter.java  OncePerRequestFilter — trích và xác thực Bearer token
│   ├── GoogleTokenVerifier.java   Xác thực Google ID token qua google-api-client
│   ├── RefreshTokenService.java   Tạo, xoay vòng, thu hồi refresh token
│   ├── TokenHasher.java           SHA-256 cho refresh token
│   ├── AuthRateLimitFilter.java   Bucket4j 10 req/phút/IP cho login & register
│   ├── ClientIpResolver.java      Lấy IP thật sau proxy
│   └── ProblemDetail*Handler/EntryPoint  401/403 theo RFC 7807
│
├── seed/
│   └── KanaSeeder.java            ApplicationRunner — nạp kana-data.json, idempotent
│
├── service/                       Business logic
│   ├── AuthService.java           Đăng ký, đăng nhập, Google OAuth, refresh
│   ├── ReviewService.java         Lấy thẻ đến hạn, ghi kết quả ôn tập
│   ├── WritingService.java        Ghi lượt tập viết (transaction 5 bước)
│   ├── BadgeService.java          Kiểm tra và phát huy hiệu
│   ├── GamificationService.java   Cộng XP, cập nhật streak, tính level
│   └── …                          CurrentUserService, DeckService, EntitlementService, KanaService,
│                                  LeaderboardService, ProgressService, QuizService, VocabularyService
│
├── srs/
│   └── FsrsEngine.java            FSRS-6 — toàn bộ là static method, không có @Component
│
└── web/
    ├── controller/                12 @RestController với @RequestMapping("/api/v1/…")
    └── dto/                       Request/Response DTO (record hoặc class với Lombok)
```

---

## Quy ước code

### Backend

- **DTO:** dùng Java `record` cho immutable response; Lombok `@Data` / `@Builder` cho request có validation
- **Validation:** `@Valid` + Bean Validation annotations trên request DTO; không validate trong service layer
- **Exception:** ném `ApiException(ErrorTypes.XXX, status)` từ service → `GlobalExceptionHandler` bắt và format RFC 7807
- **Không userId từ body:** `userId` luôn lấy từ `SecurityContextHolder` (principal) — không tin dữ liệu do client gửi
- **Transaction:** `@Transactional` trên service method, không trên controller
- **Test:** test `FsrsEngine` không cần Spring context (`@ExtendWith(MockitoExtension.class)` hoặc plain JUnit)

### Frontend

- **Type-safe API:** tất cả response shape định nghĩa trong `lib/types.ts`, khớp với SPEC.md
- **Server state:** TanStack Query cho tất cả data fetch — không dùng `useState` + `useEffect` để fetch
- **Auth state:** lấy từ `useAuth()` hook (AuthContext), không từ localStorage
- **Route protection:** middleware Next.js hoặc kiểm tra trong layout của `(app)` route group
- **Form validation:** Zod schema + React controlled component; không để validation logic rải rác
- **Naming:** component file = PascalCase, utility file = camelCase, route folder = tiếng Việt (theo codebase)

---

## Migration cơ sở dữ liệu

Flyway tự động chạy khi backend khởi động:

```
src/main/resources/db/migration/
├── V1__init.sql           Toàn bộ lược đồ 22 bảng
├── V2__seed_reference.sql plan_features + badges (dữ liệu seed tham chiếu)
└── V3__seed_content.sql   80 từ vựng (N5, N4), 1 bộ thẻ hệ thống, 4 quiz mẫu
```

**Thêm migration mới:**
1. Tạo file `V4__<mô_tả>.sql` trong thư mục trên (số phiên bản kế tiếp)
2. Đặt tên theo quy ước Flyway: `V{số}__{mô_tả_dấu_gạch_dưới}.sql`
3. Không bao giờ sửa file migration đã commit — tạo file mới để sửa

**Xem trạng thái migration:**
```bash
mvn flyway:info -Dflyway.url=jdbc:postgresql://localhost:5432/kanadojo \
  -Dflyway.user=postgres -Dflyway.password=postgres
```

---

## Thêm kana / từ vựng / quiz

### Kana

Dữ liệu kana được nạp từ `src/main/resources/data/kana-data.json` qua `KanaSeeder`. Bản frontend (`web/src/data/kana-data.json`) là bản sao để bundle vào JS.
Ba file hiện giống hệt nhau.

Nếu cập nhật dữ liệu:
1. Sửa `docs/kana-data.json` (nguồn sự thật)
2. Copy vào `backend/src/main/resources/data/kana-data.json`
3. Copy vào `web/src/data/kana-data.json`
4. **`KanaSeeder` chỉ nạp khi bảng còn rỗng** (`kana_glyphs`, `kana_characters` kiểm tra riêng) — nó *không* upsert.
   Với CSDL đã có dữ liệu, phải cập nhật bằng một migration mới (hoặc ở dev: xoá DB rồi khởi động lại).

### Từ vựng và quiz

Chưa có trang quản trị. Thêm nội dung bằng migration mới (`V4__…sql`) theo mẫu `V3__seed_content.sql`;
quy ước giá trị `quiz_type` / `question_type` / `part_of_speech` xem [SPEC.md §2.5](SPEC.md).

---

## Sự cố đã gặp và cách xử lý

### `flyway-database-postgresql` không tìm thấy version

**Vấn đề:** `pom.xml` ban đầu khai báo `flyway-database-postgresql` nhưng không có `<version>`. Module này chỉ tồn tại từ Flyway 10, còn Spring Boot 3.2.5 quản lý Flyway 9.22.3.

**Xử lý:** Xóa dependency `flyway-database-postgresql` — Flyway 9 hỗ trợ PostgreSQL trực tiếp qua `flyway-core`.

### `next@15.1.6` có lỗ hổng RCE

**Vấn đề:** `npm audit` phát hiện lỗ hổng **critical** trong `next@15.1.6` — RCE qua React flight protocol.

**Xử lý:** Nâng lên `next@15.5.25` (cùng major 15, không đổi API).

**Còn tồn tại:** 1 lỗ hổng `postcss` mức **high** (đọc file `.map` tùy ý). Chỉ hết khi nâng lên Next.js 16 — là breaking change, cần đánh giá riêng.

### Thao tác ghi (POST/PATCH) bị 403 dù đã đăng nhập

**Vấn đề:** Đọc dữ liệu bình thường nhưng bắt đầu quiz, nộp bài viết, chấm thẻ… đều trả 403.

**Nguyên nhân:** rewrite `/api/v1/*` trong `next.config.mjs` chuyển tiếp nguyên header `Origin`. Trình duyệt luôn gửi `Origin`
cho request POST/PATCH, và Spring từ chối nếu origin đó không nằm trong `CORS_ORIGINS`. Tài liệu cũ hướng dẫn đặt
`CORS_ORIGINS=http://localhost:3000` trong khi `npm run dev` chạy ở cổng 3001 → dính đúng lỗi này.

**Xử lý:** không đặt `CORS_ORIGINS` ở dev (mặc định đã gồm 3000 và 3001), hoặc đặt đúng origin đang dùng.

### Trang Ôn tập / Quiz trống hoặc lỗi dù backend có dữ liệu

**Vấn đề (đã sửa):** frontend đọc `/reviews/queue` và `/quizzes` như mảng, trong khi backend trả object (`{content, …}`).
Khi thêm endpoint mới, khai báo kiểu trong `web/src/lib/types.ts` đúng theo DTO `record` ở `backend/.../web/dto/*.java`.

### Backend không nhận biến môi trường trên Windows CMD

**Vấn đề:** `set VAR=value` chỉ có tác dụng trong session CMD hiện tại; Maven spawn process con mới không kế thừa.

**Xử lý:** Đặt biến trong cùng một lệnh, hoặc dùng PowerShell `$env:VAR = "value"` và chạy `mvn` ngay sau.

---

## IDE Setup

### IntelliJ IDEA

1. **Import:** File → Open → chọn thư mục `backend/` (Maven project)
2. **SDK:** File → Project Structure → Project SDK → Java 17
3. **Lombok:** Cài plugin Lombok (`Settings → Plugins → Marketplace`)
4. **Annotation Processing:** `Settings → Build → Compiler → Annotation Processors` → Enable

### VS Code (Frontend)

Extensions được khuyến nghị:
- ESLint
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (nếu cần)
- Prettier (tùy chọn)

`.vscode/settings.json` được đề xuất:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

## Kiểm thử tính năng trong trình duyệt

### Quiz

1. Vào `/quiz` → chọn một trong 4 bài mẫu → **Bắt đầu làm bài**
2. Trắc nghiệm: bấm đáp án hoặc phím `1`–`4`; tự luận: gõ romaji. `Enter` sang câu kế / nộp ở câu cuối
3. Hết giờ bài tự nộp; màn kết quả hiện đáp án đúng và giải thích cho từng câu

### Tập viết

1. Đăng ký tài khoản tại `/dang-ky`
2. Vào `/luyen-viet`
3. Chọn script (Hiragana/Katakana), nhóm, chế độ (Trace/Test)
4. Click vào ký tự → màn hình tập viết mở ra
5. Vẽ nét theo hướng dẫn
6. Quan sát điểm và phản hồi lỗi (REVERSED, TOO_SHORT, v.v.)

### Ôn tập SRS

1. Sau khi tập viết một số ký tự, vào `/on-tap`
2. Thẻ đến hạn xuất hiện — ôn tập và quan sát lịch ôn tiếp theo

### Bảng xếp hạng

- Snapshot hàng tuần chạy thứ Hai 00:05 VN time
- Trong dev: có thể gọi thẳng `LeaderboardService.snapshotWeekly()` qua Swagger hoặc kiểm tra `scheduled_tasks` log
