# Kana Dōjō — Hướng dẫn triển khai Production

## Tổng quan kiến trúc production

```
Internet
   │
   ▼
[Nginx / Reverse Proxy]
   │                │
   ▼                ▼
[Next.js :3000]  [Spring Boot :8080]  ← chỉ Nginx biết cổng này
                      │
                 [PostgreSQL :5432]   ← không expose ra ngoài
```

Next.js phục vụ frontend và các BFF route handler (`/api/auth/*`). Tất cả request đến `/api/v1/*` được rewrite đến Spring Boot (qua `next.config.mjs` hoặc Nginx proxy_pass).

> Rewrite chuyển tiếp nguyên header `Origin` của trình duyệt, nên `CORS_ORIGINS` của backend **vẫn phải** chứa domain công khai
> (vd. `https://kanadojo.app`) dù trình duyệt không gọi thẳng backend. Thiếu → mọi request POST/PATCH trả 403.

---

## Biến môi trường production

### Backend — bắt buộc

`ProdSecretsValidator` sẽ crash ứng dụng ngay khi khởi động nếu thiếu:

| Biến | Mô tả | Ví dụ |
|---|---|---|
| `JWT_SECRET` | Khóa ký JWT, base64, **ít nhất 256 bit** | `$(openssl rand -base64 48)` |
| `CORS_ORIGINS` | Danh sách origin được phép — phải gồm domain công khai của frontend | `https://kanadojo.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |

### Backend — cấu hình DB

| Biến | Mô tả |
|---|---|
| `DB_URL` | `jdbc:postgresql://db:5432/kanadojo` |
| `DB_USER` | Tên người dùng PostgreSQL |
| `DB_PASSWORD` | Mật khẩu PostgreSQL |

### Backend — tùy chọn

| Biến | Mặc định | Mô tả |
|---|---|---|
| `SERVER_PORT` | `8080` | Cổng HTTP |
| `DB_POOL_SIZE` | `20` (prod), `10` (dev) | Kích thước pool Hikari |
| `JWT_ACCESS_TTL` | `15m` | Thời gian sống access token — kiểu Duration của Spring (`15m`, `900s`…); số trần không đơn vị bị hiểu là **mili giây** |
| `JWT_REFRESH_TTL` | `30d` | Thời gian sống refresh token (Duration) |
| `SRS_NEW_CARDS_PER_DAY` | `10` | Số thẻ mới tối đa mỗi ngày cho một người học |
| `SPRING_PROFILES_ACTIVE` | *(không đặt)* | Đặt `prod` để kích hoạt `application-prod.yml` |

### Frontend

| Biến | Mô tả |
|---|---|
| `BACKEND_URL` | URL nội bộ của Spring Boot (không expose ra internet) |
| `NEXT_PUBLIC_SITE_URL` | URL công khai của site, ví dụ `https://kanadojo.app` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (cùng với backend) |

---

## Docker Compose

> **Trạng thái:** repo **chưa có** `docker-compose.yml`, `backend/Dockerfile`, `web/Dockerfile`. Các khối dưới đây là mẫu để tạo
> các file đó. Trước khi dùng mẫu Dockerfile frontend cần: bật `output: 'standalone'` trong `web/next.config.mjs`
> và tạo thư mục `web/public/` (hiện chưa có — hoặc bỏ dòng `COPY … /app/public`).

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: kanadojo
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d kanadojo"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_URL: jdbc:postgresql://db:5432/kanadojo
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGINS: ${CORS_ORIGINS}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      SERVER_PORT: 8080
    ports:
      - "8080:8080"   # Bỏ dòng này nếu Nginx proxy thẳng vào container network

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      BACKEND_URL: http://backend:8080
      NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

File `.env` cho Docker Compose:
```bash
DB_USER=kanadojo_user
DB_PASSWORD=<mật_khẩu_mạnh>
JWT_SECRET=<openssl rand -base64 48>
CORS_ORIGINS=https://kanadojo.app
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
NEXT_PUBLIC_SITE_URL=https://kanadojo.app
```

Chạy:
```bash
docker compose up -d
docker compose logs -f
```

---

## Dockerfile — Backend

```dockerfile
# backend/Dockerfile
# Image temurin thuần không có Maven → dùng image maven cho bước build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## Dockerfile — Frontend

```dockerfile
# web/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build args → env vars tại build time
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> **Lưu ý:** Next.js standalone output cần `output: 'standalone'` trong `next.config.mjs`:
> ```js
> const nextConfig = {
>   output: 'standalone',
>   // ...
> }
> ```

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

    # Frontend (Next.js)
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

    # Backend API — Next.js BFF route handlers đã xử lý /api/auth/*
    # /api/v1/* được rewrite bởi Next.js đến backend nội bộ
    # Không cần proxy_pass /api/v1 ở Nginx nếu dùng next.config.mjs rewrites
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

- [ ] Sinh `JWT_SECRET` mới bằng `openssl rand -base64 48` — không dùng lại secret từ dev
- [ ] Đặt `CORS_ORIGINS` đúng domain production (không có dấu `/` cuối)
- [ ] Xác nhận `GOOGLE_CLIENT_ID` hợp lệ và domain đã thêm vào Google Cloud Console
- [ ] Kiểm tra PostgreSQL version là 16 và extension `citext` sẵn sàng
- [ ] Backup DB nếu đang upgrade từ phiên bản cũ

### Sau khi deploy

- [ ] Truy cập `/api/v1/content/kana/hiragana` — phải trả về JSON danh sách kana
- [ ] Truy cập trang chủ, màn hình đăng ký, đăng nhập
- [ ] Thử đăng ký tài khoản mới và vào dashboard
- [ ] Kiểm tra `docker compose logs backend` không có ERROR
- [ ] Xác nhận `/swagger-ui.html` và `/v3/api-docs` trả 404 (profile `prod` đã tắt springdoc)
- [ ] Xác nhận `Set-Cookie: kd_rt=…` có `HttpOnly; Secure; SameSite=Lax; Path=/`
- [ ] Làm thử một bài quiz đến màn kết quả (kiểm tra luôn CORS cho request POST)

### Bảo mật production

- [ ] Backend không expose cổng ra ngoài internet (chỉ Nginx biết)
- [ ] PostgreSQL không expose cổng 5432 ra ngoài (chỉ backend biết)
- [ ] `application-prod.yml` đã được kích hoạt (`SPRING_PROFILES_ACTIVE=prod`)
- [ ] Rate limiting Bucket4j đang hoạt động (10 req/phút/IP trên auth endpoints)
- [ ] Swagger UI: đã tắt sẵn ở `application-prod.yml`; nếu muốn bật lại thì đặt sau Basic Auth

---

## Monitoring & Logs

### Spring Boot Actuator (tùy chọn)

Thêm vào `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Cấu hình `application-prod.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized
```

Endpoint: `GET /actuator/health`

### Xem logs

```bash
# Docker Compose
docker compose logs -f backend
docker compose logs -f web

# Lọc lỗi
docker compose logs backend 2>&1 | grep -i error
```

### Backup PostgreSQL

```bash
# Backup thủ công
docker exec kanadojo-db pg_dump -U postgres kanadojo > backup_$(date +%Y%m%d).sql

# Khôi phục
docker exec -i kanadojo-db psql -U postgres kanadojo < backup_20260901.sql
```

---

## Nâng cấp

### Nâng Next.js lên 16

Hiện tại đang dùng Next.js 15.5.25. Vẫn còn 1 lỗ hổng `postcss` mức **high** chỉ hết khi nâng lên Next.js 16. Khi nâng:

1. Đọc [Next.js 16 migration guide](https://nextjs.org/docs/upgrading)
2. Kiểm tra tất cả 23 route sau nâng cấp
3. Chú ý thay đổi App Router API nếu có

### Nâng Spring Boot lên 3.3+

Flyway 10 (đi kèm Spring Boot 3.3+) có module `flyway-database-postgresql` riêng — cần thêm lại vào `pom.xml` nếu nâng:
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```
