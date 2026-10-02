# Kana Dōjō — Nền tảng học viết tiếng Nhật

Ứng dụng web **công khai** dạy viết Hiragana và Katakana đúng thứ tự nét, kết hợp thuật toán lặp lại ngắt quãng FSRS-6 để tối ưu hóa việc ghi nhớ lâu dài.

**Không tài khoản, không cơ sở dữ liệu, không máy chủ ứng dụng.** Ai mở trang cũng học được ngay. Toàn bộ site là tệp tĩnh (HTML/JS/CSS), tiến độ học của mỗi người nằm trong `localStorage` của chính trình duyệt họ và không bao giờ rời khỏi máy.
Site là **PWA**: cài ra màn hình chính như một ứng dụng và chạy được khi không có mạng.

```
kana-dojo/
├── docs/
│   ├── SPEC.md            Đặc tả kỹ thuật — dữ liệu, FSRS, XP/streak/huy hiệu, chấm nét, nhập con trỏ, PWA
│   ├── ARCHITECTURE.md    Kiến trúc, độ bền dữ liệu, PWA/offline, giao diện, hướng mobile, quyết định thiết kế
│   ├── DEVELOPMENT.md     Môi trường phát triển, quy ước code, cách kiểm thử (kể cả PWA và cảm ứng)
│   ├── DEPLOYMENT.md      Đưa site lên mạng: HTTPS, domain, Nginx, CI
│   ├── MOBILE_FLUTTER.md  Phiên bản mobile bằng Flutter — nghiên cứu, thiết kế, tính năng nâng cấp, lộ trình (đề xuất)
│   └── spikes/            Mã chạy thử bỏ đi, minh chứng cho số liệu trong MOBILE_FLUTTER.md
├── web/                   Next.js 15 (xuất bản tĩnh) · TypeScript · Tailwind CSS v4 (+ Dockerfile, nginx.conf, scripts/ dựng service worker)
├── docker-compose.yml     Một container Nginx phục vụ bản build tĩnh
├── .github/workflows/     CI: lint, typecheck, test, build, rồi smoke test qua Docker
└── scripts/smoke-test.sh  Kiểm tra nhanh một bản triển khai đang chạy
```

---

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **Tập viết có hướng dẫn** | Vẽ nét trên canvas, so khớp với dữ liệu KanjiVG, điểm 0–100. Chuột, cảm ứng và bút; chỉ một con trỏ được viết cùng lúc nên ngón thứ hai/lòng bàn tay không phá nét |
| **FSRS-6** | Lặp lại ngắt quãng thế hệ mới — điểm tập viết tự động xác định cấp độ ghi nhớ |
| **Streak & XP** | Chuỗi ngày học, điểm kinh nghiệm, level, 9 huy hiệu thành tích |
| **Quiz** | 4 bài mẫu (trắc nghiệm + gõ romaji), đếm giờ, chấm và giải thích từng câu |
| **Từ vựng JLPT** | 70 từ N5 + 10 từ N4, nghĩa tiếng Việt, câu ví dụ; tìm kiếm không cần gõ dấu |
| **PWA & offline** | Cài ra màn hình chính (Chrome/Edge: nút cài; iPhone/iPad: Thêm vào Màn hình chính); sau lần mở đầu tiên chạy được khi không có mạng |
| **Sao lưu tiến độ** | Xuất/nhập tiến độ thành tệp JSON để chuyển máy hoặc phòng khi xoá dữ liệu trình duyệt |
| **Bảng chữ cái công khai** | `/bang-chu-cai/hiragana`, `/bang-chu-cai/katakana` dựng sẵn cho SEO; bấm một chữ để vào luyện viết đúng chữ đó |

### Điều cần biết khi không có tài khoản

- Tiến độ **gắn với trình duyệt + thiết bị**: không tự đồng bộ giữa điện thoại và máy tính. Dùng *Cài đặt → Sao lưu* để chuyển.
- Xoá dữ liệu trang web, hoặc dùng chế độ riêng tư, sẽ làm mất tiến độ. Ứng dụng báo rõ khi trình duyệt không cho lưu.
- **Safari trên iPhone/Mac xoá dữ liệu của trang web sau 7 ngày không mở**; bản cài ra Màn hình chính được miễn quy tắc đó, nhưng trên iOS bản đã cài có **kho dữ liệu riêng** — tiến độ ở Safari phải tải về rồi khôi phục vào app.
- Đổi domain hay `http`↔`https` cũng làm tiến độ "biến mất" (mỗi origin một kho). Chi tiết và số đo: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#dữ-liệu-nằm-ở-đâu-và-khi-nào-mất).
- Không có bảng xếp hạng (cần dữ liệu chung giữa người dùng) và không có gói PRO/giới hạn lượt học — mọi thứ mở cho mọi người.

---

## Khởi động nhanh

Yêu cầu: **Node.js 20+** (khuyến nghị 22). Không cần Java, Maven, Docker hay cơ sở dữ liệu.

```bash
cd web
npm ci
npm run dev        # http://localhost:3001
```

Chạy thử bản build thật (xuất bản tĩnh vào `web/out/`, kèm `out/sw.js` cho chế độ offline):

```bash
npm run build
npx serve out      # hoặc bất kỳ máy chủ tệp tĩnh nào
```

Hoặc bằng Docker:

```bash
cp .env.example .env     # chỉ cần SITE_URL
docker compose up -d --build --wait
```

Mở <http://localhost:3000>. Chi tiết: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Biến môi trường

Chỉ có một, và nó được nhúng vào trang **lúc build** (đổi giá trị phải build lại):

| Biến | Mặc định | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | URL công khai của site — dùng cho canonical, sitemap, Open Graph. Trong Docker đặt qua `SITE_URL` trong `.env` |
| `WEB_PORT` *(chỉ compose)* | `3000` | Cổng máy chủ mở ra |

---

## Cấu trúc thư mục chi tiết

```
web/src/
├── app/
│   ├── page.tsx                 Trang chủ
│   ├── bang-chu-cai/[script]/   Bảng chữ cái công khai (dựng sẵn lúc build)
│   ├── (app)/                   Khu vực học — dùng chung khung có thanh điều hướng
│   │   ├── bang-dieu-khien/     Tổng quan: XP, streak, heatmap, huy hiệu
│   │   ├── luyen-viet/          Tập viết (nhận ?c=あ để mở thẳng một chữ)
│   │   ├── on-tap/              Ôn tập SRS
│   │   ├── tu-vung/             Từ vựng
│   │   ├── quiz/ , quiz/[id]/   Danh sách và màn làm bài
│   │   └── cai-dat/             Mục tiêu XP, sao lưu / khôi phục / xoá tiến độ
│   ├── not-found.tsx · robots.ts · sitemap.ts
│   ├── manifest.ts · apple-icon.png        PWA: manifest và icon cảm ứng iOS
├── components/
│   ├── app/                     Brand, Nav, ThemeToggle, InstallCard, ServiceWorkerRegister
│   ├── kana/                    StrokeStage, KanaGrid, PracticePanel, HeroDemo
│   ├── quiz/QuizRunner.tsx
│   └── ui/index.tsx             Design system: Button, Card, Field, Chip, Progress, Stat, …
├── data/
│   ├── kana-data.json           Dữ liệu nét 208 ký tự (57 KB, ~20 KB gzip)
│   ├── vocabulary.ts · quizzes.ts · badges.ts   Nội dung tĩnh
└── lib/
    ├── fsrs.ts                  FSRS-6 — thuần hàm
    ├── stroke-match.ts          Bộ chấm điểm nét — arc-length resampling, thuần hàm
    ├── pointer-gate.ts          Cổng con trỏ: một con trỏ viết tại một thời điểm (chuột/cảm ứng/bút)
    ├── pwa.ts                   Nhận diện ngữ cảnh cài đặt (đã cài / iOS / còn lại)
    ├── kana.ts                  Truy cập dữ liệu nét đã bundle
    ├── vocabulary.ts            Lọc/tìm từ vựng (bỏ dấu)
    ├── types.ts
    └── learning/                Bộ máy học chạy trong trình duyệt
        ├── state.ts             Hình dạng + schema (zod) của tiến độ lưu trữ
        ├── store.ts             localStorage, đồng bộ nhiều tab, xuất/nhập — nơi duy nhất đụng I/O
        ├── hooks.ts             useStats, useKanaProgress, … (React)
        ├── activity.ts          XP, level, streak, heatmap
        ├── badges.ts · cards.ts · reviews.ts · quiz.ts · time.ts

web/public/icons/            Icon PWA 192 / 512 / maskable (tĩnh)
web/scripts/                 build-sw.mjs sinh out/sw.js từ sw.template.js sau `next build`; test của chúng
```

---

## Kiểm thử

```bash
cd web
npm test              # Vitest — 109 test (11 tệp)
npm run lint
npm run typecheck
npm run build         # xuất bản tĩnh vào out/ và sinh out/sw.js
```

Toàn bộ logic học (FSRS, hàng đợi, XP/streak/múi giờ, huy hiệu, quiz, lưu trữ), cổng con trỏ và service worker là hàm thuần hoặc chạy trên `localStorage`/Cache API giả,
nên test chạy trong Node, không cần trình duyệt hay Docker. CI (GitHub Actions) chạy các lệnh trên cho mỗi pull request, rồi dựng
container bằng `docker compose` và chạy `scripts/smoke-test.sh` — xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#ci-github-actions).

---

## Trạng thái build đã kiểm chứng

Kiểm chứng ngày 2026-10-02:

- `npm test` 109/109 · `npm run lint` sạch · `tsc --noEmit` sạch · `next build` — 21 route tĩnh, `sw.js` precache 73 tệp
- **End-to-end trong trình duyệt** (bản build tĩnh và dev): viết đủ 3 nét あ → +25 XP, huy hiệu "Nét đầu tiên", thẻ REVIEW hẹn 8 ngày → tải lại trang vẫn còn → Ôn tập cấp đúng 9 thẻ mới (hạn mức 10/ngày)
  → quiz → xuất/nhập/xoá tiến độ ở Cài đặt; không có request mạng nào ngoài tệp tĩnh
- **Đa điểm chạm** (sự kiện con trỏ giả lập, chưa thử trên thiết bị thật): ngón thứ hai chạm giữa nét → nét vẫn được chấm; `pointercancel` → nét dở bị bỏ, không chấm; bút giành quyền từ lòng bàn tay
- **PWA:** manifest, icon, `apple-touch-icon` và meta iOS được phục vụ đúng; `scripts/smoke-test.sh` qua toàn bộ trên server giả lập Nginx, gồm kiểm tra *mọi* URL precache trả 200.
  Logic service worker được kiểm bằng test Node (Cache API giả) — **vòng đời service worker chưa được kiểm trong trình duyệt thật**: trình duyệt nhúng trong môi trường phát triển không cho đăng ký service worker (kể cả tệp một dòng)
- **Docker:** `docker compose up --build --wait` + `scripts/smoke-test.sh` chạy trong CI; chưa được chạy cục bộ

---

## Giới hạn đã biết (cố ý)

| Hạng mục | Trạng thái |
|---|---|
| Thẻ từ vựng trong hàng đợi ôn | Hạn mức thẻ mới/ngày dùng chung và thẻ `KANA_WRITING` được cấp trước, nên thẻ `VOCAB_*` chỉ xuất hiện sau khi đã mở hết các ký tự kana (trừ khi gọi `createReviewQueue({ types: ["VOCAB_MEANING"] })`). Trang Từ vựng hiện chỉ để tra cứu, chưa có nút "thêm vào ôn tập" |
| Quản trị nội dung | Không có trang admin — sửa `web/src/data/*.ts` rồi build lại |
| Đồng bộ nhiều thiết bị | Không có (xem phần trên). Sao lưu thủ công bằng tệp JSON |
| Đáp án quiz | Nằm trong bundle JS (không có máy chủ để giấu) — phù hợp với quiz tự học, không phù hợp để thi có tính điểm nghiêm túc |
| Offline / cài đặt | Chưa thử service worker và nút cài trên trình duyệt thật hay iPhone thật (xem trên). Bản mới chỉ có hiệu lực khi đóng hết tab của bản cũ, không có thông báo "có bản mới" |
| Lưu bền | Chưa gọi `navigator.storage.persist()` và chưa có nhắc sao lưu định kỳ — dữ liệu "best-effort" vẫn có thể bị trình duyệt dọn khi máy đầy (xem ARCHITECTURE) |
| App mobile native | Mới có PWA. Định hướng và các lựa chọn (Capacitor / Expo / Flutter) ở [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#hướng-mobile); phân tích chi tiết cho Flutter ở [docs/MOBILE_FLUTTER.md](docs/MOBILE_FLUTTER.md) |
| Dữ liệu cũ trên PostgreSQL | Phiên bản có tài khoản lưu tiến độ trên máy chủ; không có công cụ chuyển sang tiến độ cục bộ |

---

## Tài liệu liên quan

| Tài liệu | Mục đích |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Đặc tả kỹ thuật — mô hình dữ liệu, FSRS, trò chơi hoá, **thuật toán chấm nét (§6)**, nhập con trỏ, PWA |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, độ bền dữ liệu theo nền tảng, PWA/offline, thiết kế giao diện, hướng mobile, quyết định thiết kế |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Thiết lập môi trường dev, quy ước code, cách kiểm thử, sự cố đã gặp |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Đưa site lên mạng: máy chủ tĩnh, Docker, Nginx, HTTPS/domain, CI |
| [docs/MOBILE_FLUTTER.md](docs/MOBILE_FLUTTER.md) | Phiên bản mobile bằng Flutter: kiến trúc, port engine (đã chạy thử), khung viết nét, tính năng native, nâng cấp học thuật, cửa hàng ứng dụng, lộ trình — **đề xuất, chưa triển khai** |

---

## Giấy phép

Dữ liệu thứ tự nét trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — share-alike, cho phép dùng thương mại.
Nếu phát hành lại `kana-data.json` hoặc bản dẫn xuất, phải ghi công KanjiVG và giữ nguyên giấy phép đó cho phần dữ liệu.
