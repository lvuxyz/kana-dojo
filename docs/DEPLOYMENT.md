# Kana Dōjō — Hướng dẫn triển khai Production

> **Tạm thời không áp dụng.** Chỉ dịch vụ `web` còn được dựng và triển khai; các phần về backend, PostgreSQL, JWT, CORS, Google OAuth và sao lưu CSDL mô tả bản có máy chủ, hiện đã tắt. Web đang ở chế độ cá nhân, không có server — xem [LOCAL_MODE.md](LOCAL_MODE.md).

## Tổng quan kiến trúc production

```
Internet
   │  HTTPS
   ▼
[Nginx]  TLS, security headers ──► localhost:3000
   │
   ▼
┌─────────────── docker compose (mạng nội bộ) ───────────────┐
│ [web  :3000]  Next.js standalone                            │
│    │  /api/v1/*  → rewrite  ─┐                              │
│    │  /api/auth/* → BFF fetch┤                              │
│    ▼                         ▼                              │
│ [backend :8080] Spring Boot (profile prod) ← không mở cổng  │
│    │                                                        │
│ [db :5432] PostgreSQL 16 (volume pgdata)   ← không mở cổng  │
└─────────────────────────────────────────────────────────────┘
```

Trình duyệt chỉ nói chuyện với một origin (web). Next.js phục vụ giao diện, các BFF route handler `/api/auth/*`
(giữ refresh token trong cookie httpOnly) và rewrite mọi `/api/v1/*` sang backend trong mạng nội bộ.

> Rewrite chuyển tiếp nguyên header `Origin` của trình duyệt, nên `CORS_ORIGINS` của backend **vẫn phải** chứa domain công khai
> (vd. `https://kanadojo.app`) dù trình duyệt không gọi thẳng backend. Thiếu → mọi request POST/PATCH trả 403.
> `docker-compose.yml` tự đặt `CORS_ORIGINS = SITE_URL`.

---

## Chạy bằng Docker Compose

Repo có sẵn `docker-compose.yml`, `backend/Dockerfile`, `web/Dockerfile` và `.env.example`.

```bash
cp .env.example .env        # điền SITE_URL, DB_PASSWORD, JWT_SECRET, GOOGLE_CLIENT_ID
docker compose up -d --build --wait
bash scripts/smoke-test.sh "$SITE_URL"   # hoặc http://localhost:3000 khi thử trên máy
```

`--wait` chỉ trả về khi cả ba dịch vụ đã **healthy**: `db` (`pg_isready`) → `backend` (`/actuator/health` = UP,
sau khi Flyway và `KanaSeeder` chạy xong) → `web` (trang đăng nhập trả 200). Lần đầu khởi động backend mất ~20–40 giây.

### Biến trong `.env`

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `SITE_URL` | ✓ | URL công khai (vd. `https://kanadojo.app`, không có `/` cuối). Dùng làm `CORS_ORIGINS` và **được nhúng vào bundle web lúc build** |
| `DB_PASSWORD` | ✓ | Mật khẩu PostgreSQL |
| `JWT_SECRET` | ✓ | Khoá ký JWT, base64 ≥ 256 bit: `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID` | ✓ | Profile `prod` bắt buộc (`ProdSecretsValidator`). Chưa dùng Google thì đặt tạm chuỗi bất kỳ — nút Google sẽ không hoạt động |
| `DB_USER` | | Mặc định `kanadojo` |
| `WEB_PORT` | | Cổng web mở ra máy chủ, mặc định `3000` |
| `SRS_NEW_CARDS_PER_DAY` | | Mặc định `10` |

Compose báo lỗi ngay (trước khi build) nếu thiếu biến bắt buộc.

### Giá trị nào chốt lúc build, giá trị nào đọc lúc chạy

| Giá trị | Khi nào | Hệ quả |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | build (build-arg) | Nhúng vào JS gửi cho trình duyệt |
| `BACKEND_URL` cho rewrite `/api/v1/*` | **build** (build-arg) | Next ghi đích rewrite vào `routes-manifest` lúc build; đặt `BACKEND_URL` lúc chạy **không** đổi được đích này |
| `BACKEND_URL` cho BFF `/api/auth/*` | chạy | Route handler đọc `process.env` mỗi request |
| Mọi biến của backend | chạy | Đổi `.env` rồi `docker compose up -d` là đủ |

→ Đổi `SITE_URL` hoặc `GOOGLE_CLIENT_ID` thì phải `docker compose up -d --build` để build lại web.

### Image

| Image | Nền | Ghi chú |
|---|---|---|
| `backend` | `maven:3.9-eclipse-temurin-17` → `eclipse-temurin:17-jre-alpine` | Chạy user `app` (không root), `SPRING_PROFILES_ACTIVE=prod`, `JAVA_OPTS=-XX:MaxRAMPercentage=75`. Test **không** chạy khi build image (đã chạy ở CI) |
| `web` | `node:22-alpine` (deps → build → runner) | `output: "standalone"`, chạy `node server.js` bằng user `nextjs`. `.env*` bị `.dockerignore` loại nên không lọt vào image |

Cả hai có `HEALTHCHECK` riêng; compose dùng chúng cho `depends_on: condition: service_healthy`.

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` chạy trên mỗi pull request và mỗi lần push lên `master`:

| Job | Làm gì |
|---|---|
| `backend` | `mvn -B verify` — 11 unit + integration test trên PostgreSQL 16 thật (runner có Docker nên Testcontainers luôn chạy) |
| `web` | `npm ci` → `lint` → `typecheck` → `test` → `build` |
| `docker` | Sau khi hai job trên xanh: tạo `.env` ngẫu nhiên, `docker compose up --build --wait`, chạy `scripts/smoke-test.sh`, in log nếu lỗi |

`scripts/smoke-test.sh` có hai chế độ (biến `SMOKE_MODE`):

- `server` — đi đúng đường của trình duyệt: trang chủ → rewrite `/api/v1` → đăng ký qua BFF (kiểm tra refresh token
  không lộ ra JS, cookie `kd_rt` được đặt) → POST có header `Origin` (bắt lỗi CORS) → refresh bằng cookie. Dùng được cho
  bản triển khai thật sau mỗi lần deploy.
- `local` (**mặc định hiện nay**) — web ở chế độ cá nhân, không có backend ([LOCAL_MODE.md](LOCAL_MODE.md)): kiểm tra trang chủ, bảng
  chữ cái dựng tĩnh, SEO, lối vào ứng dụng và việc không còn đường nào tới backend.

Khi bật lại máy chủ, đặt `SMOKE_MODE: server` cho bước smoke test của job `docker` trong `.github/workflows/ci.yml`.

---

## Biến môi trường backend (tham chiếu)

Khi không dùng compose (chạy JAR trực tiếp, Kubernetes…):

| Biến | Bắt buộc ở prod | Mặc định | Mô tả |
|---|---|---|---|
| `DB_URL` | ✓ | | `jdbc:postgresql://<host>:5432/kanadojo` |
| `DB_USER` / `DB_PASSWORD` | ✓ | | Tài khoản PostgreSQL (lần migrate đầu cần quyền tạo extension `citext`) |
| `JWT_SECRET` | ✓ | | ≥ 32 byte |
| `CORS_ORIGINS` | ✓ | | Gồm domain công khai của frontend |
| `GOOGLE_CLIENT_ID` | ✓ | | Google OAuth client ID |
| `SERVER_PORT` | | `8080` | Cổng HTTP (healthcheck của image đọc cùng biến này) |
| `DB_POOL_SIZE` | | `20` | Pool Hikari |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | | `15m` / `30d` | Kiểu Duration (`15m`, `900s`); số trần không đơn vị bị hiểu là **mili giây** |
| `SRS_NEW_CARDS_PER_DAY` | | `10` | Số thẻ mới tối đa mỗi ngày |
| `SPRING_PROFILES_ACTIVE` | | *(image đặt sẵn `prod`)* | `prod` kích hoạt `application-prod.yml` |

Frontend (khi build ngoài Docker): `BACKEND_URL` (cả lúc build lẫn lúc chạy), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (lúc build).

---

## Cấu hình Nginx

```nginx
# /etc/nginx/sites-available/kanadojo
server {
    listen 80;
    server_name kanadojo.app www.kanadojo.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kanadojo.app www.kanadojo.app;

    ssl_certificate     /etc/letsencrypt/live/kanadojo.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kanadojo.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Mọi thứ đi vào web (cổng WEB_PORT của compose); web tự rewrite /api/v1 sang backend nội bộ.
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets — cache lâu
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

---

## SSL với Let's Encrypt

```bash
# Cài Certbot
apt install certbot python3-certbot-nginx

# Cấp chứng chỉ
certbot --nginx -d kanadojo.app -d www.kanadojo.app

# Tự động gia hạn (đã có sẵn sau khi cài Certbot)
systemctl status certbot.timer
```

---

## Checklist triển khai

### Trước khi deploy

- [ ] CI xanh trên commit sẽ deploy (backend, web, docker smoke test)
- [ ] `.env` có `JWT_SECRET` mới (`openssl rand -base64 48`) — không dùng lại secret từ dev
- [ ] `SITE_URL` đúng domain production, không có `/` cuối
- [ ] `GOOGLE_CLIENT_ID` hợp lệ và domain đã thêm vào Google Cloud Console
- [ ] Backup DB nếu đang nâng cấp từ phiên bản cũ (xem bên dưới)

### Sau khi deploy

- [ ] `bash scripts/smoke-test.sh https://kanadojo.app` — tất cả ✓
- [ ] `docker compose ps` — ba dịch vụ đều `healthy`
- [ ] `docker compose logs backend` không có ERROR
- [ ] `/swagger-ui.html` và `/v3/api-docs` trả 404 (profile `prod` đã tắt springdoc)
- [ ] `Set-Cookie: kd_rt=…` có `HttpOnly; Secure; SameSite=Lax; Path=/`

### Bảo mật production

- [ ] Chỉ cổng web (`WEB_PORT`) mở ra máy chủ, và chỉ Nginx truy cập nó; backend và CSDL không có `ports:` trong compose
- [ ] `/actuator` chỉ mở `health` (không chi tiết); các endpoint actuator khác trả 404
- [ ] Rate limit Bucket4j 10 req/phút/IP trên `/auth/login` và `/auth/register` — **lưu ý:** hiện backend thấy IP của container web
  cho các request qua BFF, nên giới hạn đang áp chung cho mọi người dùng; xem mục "Việc còn tồn đọng" trong README
- [ ] Swagger UI đã tắt ở `application-prod.yml`; nếu muốn bật lại thì đặt sau Basic Auth

---

## Monitoring & Logs

### Health

`GET /actuator/health` → `{"status":"UP"}` (không lộ chi tiết thành phần). Chỉ truy cập được trong mạng compose; muốn
load balancer bên ngoài dùng thì mở qua Nginx một location riêng.

### Xem logs

```bash
docker compose logs -f backend
docker compose logs -f web

# Lọc lỗi
docker compose logs backend 2>&1 | grep -i error
```

### Backup PostgreSQL

```bash
# Backup
docker compose exec -T db pg_dump -U kanadojo kanadojo > backup_$(date +%Y%m%d).sql

# Khôi phục (vào CSDL rỗng)
docker compose exec -T db psql -U kanadojo kanadojo < backup_20260901.sql
```

Dữ liệu nằm trong volume `kana-dojo_pgdata`; `docker compose down` giữ volume, `down -v` **xoá** nó.

---

## Nâng cấp

### Nâng Next.js lên 16

Hiện tại đang dùng Next.js 15.5.25. Vẫn còn 1 lỗ hổng `postcss` mức **high** chỉ hết khi nâng lên Next.js 16. Khi nâng:

1. Đọc [Next.js 16 migration guide](https://nextjs.org/docs/upgrading)
2. Chạy lại toàn bộ CI (có smoke test qua Docker)
3. Chú ý thay đổi App Router API nếu có

### Nâng Spring Boot lên 3.3+

Flyway 10 (đi kèm Spring Boot 3.3+) có module `flyway-database-postgresql` riêng — cần thêm lại vào `pom.xml` nếu nâng:
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

`pom.xml` đang ghim `testcontainers.version` 1.21.4 vì bản đi kèm Spring Boot 3.2 quá cũ cho Docker Engine 29+.
Khi nâng Spring Boot, kiểm tra bản Testcontainers mới đi kèm; chỉ bỏ dòng ghim nếu bản đó không cũ hơn 1.21.4.
