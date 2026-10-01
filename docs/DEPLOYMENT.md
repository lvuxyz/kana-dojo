# Kana Dōjō — Hướng dẫn triển khai

Kana Dōjō là **site tĩnh**: `next build` xuất ra thư mục `web/out/` gồm HTML/JS/CSS thuần. Không có tiến trình máy chủ, không cơ sở dữ liệu,
không biến bí mật, không gì cần sao lưu phía máy chủ. Triển khai = đặt thư mục đó lên một máy chủ tệp tĩnh bất kỳ.

```
Internet
   │  HTTPS
   ▼
[Nginx / CDN]  TLS, HSTS  ──►  [container web :8080]  Nginx phục vụ out/
```

Đây chỉ là một ví dụ; mọi máy chủ tĩnh đều dùng được (xem [Lên máy chủ tĩnh khác](#lên-máy-chủ-tĩnh-khác)).

---

## Chạy bằng Docker Compose

Repo có sẵn `docker-compose.yml`, `web/Dockerfile`, `web/nginx.conf` và `.env.example`.

```bash
cp .env.example .env        # đặt SITE_URL (và WEB_PORT nếu cần)
docker compose up -d --build --wait
bash scripts/smoke-test.sh "$SITE_URL"   # hoặc http://localhost:3000 khi thử trên máy
```

`--wait` chỉ trả về khi container `web` đã **healthy** (`wget` trang chủ trả 200).

### Biến trong `.env`

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `SITE_URL` | ✓ | URL công khai (vd. `https://kanadojo.app`, không có `/` cuối). **Được nhúng vào trang lúc build** (canonical, sitemap, Open Graph) |
| `WEB_PORT` | | Cổng web mở ra máy chủ, mặc định `3000` |

Compose báo lỗi ngay (trước khi build) nếu thiếu `SITE_URL`.

> Đổi `SITE_URL` thì phải `docker compose up -d --build` để build lại — giá trị này là hằng số trong HTML đã sinh, không đọc lúc chạy.

### Image

| Tầng | Nền | Ghi chú |
|---|---|---|
| deps → build | `node:22-alpine` | `npm ci` theo lockfile rồi `npm run build` → `out/`. `.env*` bị `.dockerignore` loại nên không lọt vào image |
| runner | `nginxinc/nginx-unprivileged:1.27-alpine` | Chỉ chứa `out/` và `nginx.conf`. Không có Node. Chạy bằng user không phải root, lắng nghe cổng 8080; compose đặt `read_only` + `tmpfs /tmp` |

### `web/nginx.conf` làm gì

- `try_files $uri $uri.html $uri/ =404` — Next xuất `/luyen-viet` thành `luyen-viet.html`, `/quiz/1` thành `quiz/1.html`.
- HTML: `Cache-Control: no-cache` (luôn hỏi lại, trả 304 nếu không đổi) để bản deploy mới có hiệu lực ngay.
- `/_next/static/*`: cache 1 năm — tên tệp chứa mã băm nội dung nên an toàn.
- `/sw.js`: **không** cache lâu (`no-cache`) — trình duyệt phải thấy bản mới ngay sau mỗi lần deploy thì mới cập nhật được cache offline. Nằm dưới `location /` nên mặc định đã đúng; khai báo riêng để ý đồ không bị vô tình sửa mất.
- `/manifest.webmanifest`: `Content-Type: application/manifest+json` (đặt `default_type` phòng khi `mime.types` của bản Nginx chưa có đuôi này) và `no-cache`.
- 404 dùng trang `404.html` của site (`app/not-found.tsx`).
- Header an toàn: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. **Không** đặt HSTS ở đây (container chỉ nói HTTP) — để Nginx/CDN phía trước đặt.

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` chạy trên mỗi pull request và mỗi lần push lên `master`:

| Job | Làm gì |
|---|---|
| `web` | `npm ci` → `lint` → `typecheck` → `test` → `build` |
| `docker` | Sau khi `web` xanh: `docker compose up --build --wait`, chạy `scripts/smoke-test.sh`, in log nếu lỗi |

`scripts/smoke-test.sh` (chỉ cần `bash` và `curl`) kiểm tra: mọi trang chính trả 200 và có nội dung thật trong HTML; `robots.txt` và `sitemap.xml`;
**PWA** — `manifest.webmanifest` hợp lệ, bốn icon tải được, `sw.js` được sinh đúng, và **mọi URL trong danh sách precache của `sw.js` đều trả 200** (chỉ cần một URL sai là service worker không cài được);
đường dẫn lạ và `/quiz/999` trả **404** thật; các đường dẫn của bản cũ (`/dang-nhap`, `/api/v1/…`…) đã biến mất; và — nhắm vào `nginx.conf` —
`nosniff`, cache dài hạn cho tệp có mã băm, `sw.js` là `no-cache`, manifest đúng `Content-Type`. Dùng được cho bản triển khai thật sau mỗi lần deploy.

---

## Nginx + TLS phía trước (ví dụ)

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

    # HSTS chỉ đặt ở đây — nơi kết thúc TLS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:3000;       # WEB_PORT của compose
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Cấp chứng chỉ Let's Encrypt:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d kanadojo.app -d www.kanadojo.app
systemctl status certbot.timer        # tự gia hạn
```

---

## PWA: HTTPS, domain và cập nhật

Site cài được ra màn hình chính và chạy offline (xem [ARCHITECTURE.md](ARCHITECTURE.md#pwa-và-offline) và [SPEC.md §8](SPEC.md#8-pwa-và-chế-độ-offline)). Những điều ảnh hưởng tới cách triển khai:

- **HTTPS là bắt buộc** (trừ `localhost`): trình duyệt chỉ đăng ký service worker, cho cài đặt và cung cấp `navigator.storage` trong ngữ cảnh an toàn. Trên `http://` thường site vẫn chạy bình thường nhưng không có offline hay cài đặt.
- **Chốt một domain chính và redirect mọi biến thể về nó** (`http`→`https`, `www`↔không `www`). Tiến độ học của người dùng nằm trong `localStorage` gắn với *origin*; mỗi biến thể là một kho riêng, và **đổi domain nghĩa là mọi người mở ra với tiến độ trống**.
  Nếu buộc phải đổi domain, hãy thông báo trước để người dùng *Tải tiến độ về máy*, và để domain cũ redirect (không xoá) đủ lâu.
- **Đừng đặt site ở origin dùng chung** như `<user>.github.io/<repo>`: mọi repo của cùng tài khoản chia sẻ một `localStorage` và một phạm vi service worker. Dùng domain riêng. Nếu vẫn phải dùng đường dẫn con, cần `basePath` và sửa lại `start_url`, `scope`, các đường dẫn icon trong `app/manifest.ts` cùng `register("/sw.js")`.
- **Không cache `sw.js` và `manifest.webmanifest` ở CDN/Nginx phía trước** (đặt `no-cache`/`max-age=0`). Nếu CDN giữ `sw.js` cũ, người dùng sẽ không nhận được bản mới.
- **Cập nhật mềm:** sau mỗi lần deploy, trình duyệt thấy `sw.js` đổi byte và cài bản mới ở nền, nhưng bản mới chỉ có hiệu lực khi mọi tab của bản cũ đã đóng. Không có thông báo "có bản mới".
- **iOS:** bản "Thêm vào Màn hình chính" có kho dữ liệu riêng, tách khỏi Safari — người dùng cài xong sẽ thấy tiến độ trống. Trang Cài đặt đã hướng dẫn cách tải về và khôi phục.
- **Tiến độ không nằm ở máy chủ**: bạn không thể khôi phục hộ người dùng, và xoá cache offline không làm mất tiến độ.

---

## Lên máy chủ tĩnh khác

Không cần Docker hay Nginx. Build một lần rồi đặt `web/out/` ở bất kỳ đâu:

```bash
cd web
NEXT_PUBLIC_SITE_URL=https://kanadojo.app npm run build    # → web/out/
```

| Nơi đặt | Ghi chú |
|---|---|
| **Netlify / Vercel / Cloudflare Pages** | Build command `npm run build`, thư mục xuất bản `out`, thư mục gốc `web`. Đặt `NEXT_PUBLIC_SITE_URL` trong biến môi trường của dự án. Các nơi này thường tự phục vụ `/luyen-viet` từ `luyen-viet.html` — vẫn nên chạy `smoke-test.sh` sau lần deploy đầu |
| **GitHub Pages** | Dùng được. Nếu site nằm ở `https://<user>.github.io/<repo>/` (có tiền tố đường dẫn) thì cần thêm `basePath` vào `next.config.mjs`; với domain riêng thì không cần |
| **S3 / GCS** | Bật website hosting; cần quy tắc ghi lại `/luyen-viet` → `/luyen-viet.html` (CloudFront Function hoặc tương đương) |
| **Nginx / Apache tự quản** | Dùng `web/nginx.conf` làm mẫu (đổi `listen`/`root`) |

Dù chọn nơi nào, nên: đặt `Cache-Control: no-cache` cho HTML, `sw.js` và `manifest.webmanifest`; cache dài cho `/_next/static/`; trả mã 404 thật kèm `404.html`; phục vụ `manifest.webmanifest` với `application/manifest+json`; và bật HTTPS.

---

## Checklist triển khai

### Trước khi deploy

- [ ] CI xanh trên commit sẽ deploy (web, docker smoke test — gồm kiểm tra precache)
- [ ] Domain production dùng **HTTPS** và là domain sẽ dùng lâu dài (đổi domain = người dùng mất tiến độ)
- [ ] `SITE_URL` / `NEXT_PUBLIC_SITE_URL` đúng domain production, không có `/` cuối

### Sau khi deploy

- [ ] `bash scripts/smoke-test.sh https://kanadojo.app` — tất cả ✓ (hai kiểm tra cuối chỉ áp dụng với `nginx.conf` của repo này)
- [ ] `https://kanadojo.app/sitemap.xml` và `/robots.txt` trả URL đúng domain
- [ ] Mở thử trên điện thoại: viết một chữ, tải lại trang, xác nhận tiến độ còn
- [ ] DevTools → Application: manifest không cảnh báo, service worker *activated*, cache `kd-…` có đủ tệp; tải lại khi *Offline* vẫn mở được `/` và `/luyen-viet`
- [ ] Mọi biến thể domain (`http`, `www`) redirect về domain chính; `SITE_URL` đúng domain đó
- [ ] Phản hồi có `Strict-Transport-Security` (do lớp TLS đặt)

### Bảo mật

- [ ] Chỉ cổng web (`WEB_PORT`) mở ra máy chủ, và chỉ lớp TLS phía trước truy cập nó
- [ ] Không có bí mật nào để lộ: site không có biến môi trường lúc chạy. `NEXT_PUBLIC_SITE_URL` là công khai theo thiết kế
- [ ] Nếu cần Content-Security-Policy: Next chèn script inline (dữ liệu hydrate, script chọn giao diện) nên CSP chặt cần nonce hoặc hash — chưa cấu hình sẵn

---

## Vận hành

Không có gì để theo dõi phía máy chủ ngoài việc container sống:

```bash
docker compose ps                  # healthy?
docker compose logs -f web         # log truy cập Nginx
```

Không có CSDL để sao lưu. **Tiến độ của người học nằm trong trình duyệt của họ**, không phải ở máy chủ — vì vậy bạn không thể khôi phục hộ họ.
Hướng dẫn người dùng dùng *Cài đặt → Tải tiến độ về máy*.

---

## Nâng cấp

### Nâng Next.js lên 16

Hiện tại đang dùng Next.js 15.5.25. Vẫn còn 1 lỗ hổng `postcss` mức **high** chỉ hết khi nâng lên Next.js 16. Khi nâng:

1. Đọc [Next.js 16 migration guide](https://nextjs.org/docs/upgrading)
2. Chạy lại toàn bộ CI (có smoke test qua Docker)
3. Kiểm tra lại các điểm đặc thù của xuất bản tĩnh: `generateStaticParams` + `dynamicParams = false`, `<Suspense>` quanh `useSearchParams`, `export const dynamic = "force-static"` ở `robots.ts`/`sitemap.ts`/`manifest.ts`
4. Kiểm tra bố cục thư mục `out/` (tên tệp `.html`/`.txt` của từng route, vị trí `manifest.webmanifest`, `apple-icon.png`) vì `scripts/build-sw.mjs` suy ra danh sách precache từ đó; smoke test sẽ báo nếu có URL không trả 200

### Đổi định dạng tiến độ

Tăng `STATE_VERSION` trong `web/src/lib/learning/state.ts` và thêm bước migrate trong `parseState` để dữ liệu của người dùng hiện có (và tệp sao lưu cũ) vẫn nạp được.
