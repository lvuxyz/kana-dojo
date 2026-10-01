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
curl "http://localhost:8080/api/v1/kana?script=HIRAGANA"
curl http://localhost:8080/actuator/health        # {"status":"UP"}
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

### Chế độ độc lập: chạy web không cần backend/PostgreSQL

Khi chỉ cần xem/sửa giao diện hoặc chưa dựng được backend, bật chế độ độc lập — **không phải dịch vụ nào ngoài `next dev`**:

```bash
cd web
echo NEXT_PUBLIC_STANDALONE=true >> .env.local   # sau đó khởi động lại `npm run dev`
```

Mọi lời gọi `/api/v1/*` và `/api/auth/*` được xử lý ngay trong trình duyệt bởi `web/src/lib/local/`, giữ nguyên hợp đồng
của `docs/SPEC.md` §5 (cùng đường dẫn, DTO, lỗi RFC 7807) nên **không trang nào phải sửa** và mọi chức năng vẫn chạy:
đăng ký/đăng nhập, luyện viết, ôn tập FSRS-6, XP/streak/huy hiệu, quiz, từ vựng, bảng xếp hạng, hồ sơ và hạn mức gói.

| | Chế độ độc lập | Có backend |
|---|---|---|
| Nội dung (kana, từ vựng, quiz, huy hiệu, hạn mức gói) | `src/data/*.json`, trích từ `V2`/`V3` migration | PostgreSQL |
| Tiến độ và tài khoản | `localStorage` (khoá `kanadojo.local.v1`) của **trình duyệt đó** | PostgreSQL |
| Bảng xếp hạng | chỉ gồm các tài khoản đã đăng ký trên trình duyệt này | toàn hệ thống |
| Đăng nhập Google | tắt (cần máy chủ) | có |
| Bảo mật mật khẩu | chỉ băm có muối, **không phải bảo mật thật** | BCrypt + JWT |

Xoá toàn bộ dữ liệu cục bộ: `localStorage.removeItem("kanadojo.local.v1")` trong DevTools. Dữ liệu hỏng được sao lưu sang
`kanadojo.local.v1.corrupt` thay vì bị ghi đè. Khi tắt cờ này, mã của chế độ độc lập bị loại khỏi bundle.

> **Giữ hai bản đồng bộ:** `lib/local/fsrs.ts` là bản port của `FsrsEngine.java` (test `fsrs.test.ts` port từ `FsrsEngineTest`),
> còn XP, streak, huy hiệu, hàng đợi, quiz… port từ các `*Service.java`. Đổi luật ở backend thì phải đổi cả `lib/local/`.
> `web/src/data/content.json` sinh từ migration `V2`/`V3` bằng `node scripts/gen-local-content.mjs` — thêm từ vựng/quiz ở migration
> thì chạy lại lệnh này (script kiểm tra số lượng theo SPEC §2.6 và dừng nếu lệch).
> Một khác biệt có chủ ý: `GET /progress/kana` trả `level` thang 0–2 (đúng với `types.ts`/`KanaGrid`); backend trả 0–5 nên ô đã thuộc chắc không được tô.

---

## Cấu trúc `.env.local` đầy đủ

```bash
# URL backend — server-side only, KHÔNG expose ra trình duyệt
BACKEND_URL=http://localhost:8080

# URL công khai của site — dùng cho Open Graph, sitemap, v.v.
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# Google OAuth (tùy chọn — bỏ trống nếu không cần đăng nhập Google)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Chạy không cần backend/PostgreSQL (xem "Chế độ độc lập"); mặc định false
NEXT_PUBLIC_STANDALONE=false
```

---

## Chạy kiểm thử

### Backend

```bash
cd backend

# Chạy tất cả test (unit + integration)
mvn test

# Chỉ một lớp / một nhóm
mvn test -Dtest=FsrsEngineTest
mvn test -Dtest='com.japanese.learning.it.*'

# Build + test + đóng gói
mvn package
```

**35 test**, chia hai loại:

| Loại | Lớp | Cần gì |
|---|---|---|
| Unit | `srs/FsrsEngineTest` (11) — công thức FSRS-6, bước học, ngưỡng điểm nét → grade | Chỉ JDK |
| Integration | `it/AuthFlowTest` (6) — đăng ký, refresh xoay vòng, tái sử dụng token thu hồi cả họ, đăng xuất, 401/409 | Docker |
| | `it/WritingAttemptFlowTest` (5) — `POST /writing/attempts` ghi đủ 5 bước, XP lần đầu/lần sau, nét hỏng, 404, validation | Docker |
| | `it/WritingAttemptAtomicityTest` (1) — lỗi ở bước cuối rollback cả 4 bước trước | Docker |
| | `it/QuizFlowTest` (5) — quiz seed V3, đề không lộ đáp án, chấm điểm, nộp một lần | Docker |
| | `it/ReviewQueueFlowTest` (5) — hình dạng JSON hàng đợi, thẻ từ vựng, hạn mức thẻ mới, chấm thẻ | Docker |
| | `it/HealthEndpointTest` (2) — `/actuator/health` công khai, không lộ chi tiết; actuator khác bị đóng | Docker |

Integration test chạy **cả ứng dụng** trên PostgreSQL 16 thật do Testcontainers dựng (`postgres:16-alpine`, Flyway áp V1–V3,
`KanaSeeder` nạp kana), gọi API qua MockMvc. Lớp nền `it/IntegrationTest` giữ một container và một Spring context cho cả lượt chạy;
mỗi test tự đăng ký người dùng riêng nên không cần dọn dữ liệu. Không dùng H2: CSDL này không có kiểu `citext` mà `V1__init.sql` cần.

- **Không có Docker** (hoặc Docker Desktop chưa bật): các lớp `it/*` bị bỏ qua (Maven báo 0 test cho chúng), `mvn test` vẫn xanh với 11 unit test.
- Lần chạy đầu tải image `postgres:16-alpine` (~100 MB); các lần sau khởi động container trong vài giây.
- Testcontainers được ghim 1.21.x trong `pom.xml` vì bản 1.19 đi kèm Spring Boot 3.2 dùng Docker API quá cũ cho Docker Engine 29+.
- CI chạy `mvn -B verify` trên runner có Docker, nên ở pull request các integration test **luôn** chạy.

### Frontend

```bash
cd web

# Unit test (Vitest)
npm test              # chạy một lần
npm run test:watch    # chạy lại khi sửa file

# Lint (ESLint 9, cấu hình eslint.config.mjs = next/core-web-vitals + next/typescript)
npm run lint

# Kiểm tra kiểu TypeScript
npm run typecheck

# Build production (phát hiện lỗi build)
npm run build
```

- Unit test đặt cạnh mã nguồn, tên `*.test.ts`. Hiện có `src/lib/stroke-match.test.ts` (22 test): lấy mẫu theo độ dài cung,
  bất biến với tốc độ vẽ, phạt nét ngược chiều, chẩn đoán `TOO_SHORT`/`TOO_LONG`/`OFF_PATH`, và các mốc
  `gradeFromScore` — phải khớp tuyệt đối `FsrsEngine.gradeFromScore` bên backend.
- `next build` **không** chạy lint (`eslint.ignoreDuringBuilds`) vì lint đã có lệnh riêng; `next lint` đã bị khai tử từ Next 15.5.

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

### Dùng lại refresh token cũ không thu hồi được cả họ token

**Vấn đề (đã sửa, phát hiện nhờ `AuthFlowTest`):** khi phát hiện token đã bị thay thế được trình lại, `RefreshTokenService.rotate`
gọi `revokeFamily` rồi ném 401. Exception đó rollback transaction bao ngoài (`AuthService.refresh`) — kéo theo cả lệnh thu hồi,
nên token mới nhất (có thể nằm trong tay kẻ trộm) vẫn dùng được.

**Xử lý:** lệnh thu hồi chạy trong transaction riêng (`REQUIRES_NEW`) nên được commit trước khi 401 được ném ra.

### Đăng nhập xong tải lại trang (F5) ở `next dev` là bị đăng xuất

**Vấn đề (đã sửa):** `AuthProvider` khôi phục phiên bằng `POST /api/auth/refresh` trong `useEffect`. `reactStrictMode: true` khiến
effect chạy **hai lần** ở `next dev`, nên bắn hai refresh đồng thời với cùng một cookie. Lần đầu xoay vòng token; lần hai trình
token đã bị thay thế → `RefreshTokenService.rotate` coi là tái sử dụng và thu hồi cả họ token (kể cả token mới), người dùng bị
đăng xuất. Lỗi này từng bị che bởi lỗi rollback ở mục trên; sửa mục đó (commit thật việc thu hồi) làm nó lộ ra. Production không
chạy effect hai lần nên khó gặp, nhưng mở hai tab cùng lúc vẫn có thể đụng.

**Xử lý:** mọi lần làm mới phiên đi qua `refreshSession()` trong `web/src/lib/api.ts`, gộp các lời gọi đồng thời thành một request
(cả việc khôi phục phiên lúc tải trang lẫn vòng thử lại khi gặp 401). Test: `web/src/lib/api.test.ts`.
Quy tắc: **không gọi `/api/auth/refresh` trực tiếp từ component** — dùng `refreshSession()`.

### Ô "Đã rèn luyện" ở trang Luyện viết hiện 104/104 với tài khoản mới

**Vấn đề (đã sửa):** `GET /progress/kana` trả một dòng cho **mọi** ký tự, kể cả chưa học (`level 0`), còn trang đếm `states.size`.
**Xử lý:** `luyen-viet/page.tsx` bỏ qua dòng `level 0` khi dựng bản đồ trạng thái (ô trống vốn đã là mặc định của lưới).

### `npm install` báo `Cannot read properties of null (reading 'edgesOut')`

**Vấn đề:** lỗi của npm 10 khi giải peer dependency nhóm `@emnapi` / `@napi-rs` (đi kèm Tailwind oxide, Vite).

**Xử lý:** `npm ci` (cài theo lockfile) không bị ảnh hưởng. Khi cần *thêm/nâng* gói, chạy lệnh đó bằng npm 11:
`npx -y npm@11 install -D <gói>` — lockfile vẫn là v3, npm 10 đọc bình thường.

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
