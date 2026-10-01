# Kana Dōjō — Nền tảng học viết tiếng Nhật

Ứng dụng web **công khai** dạy viết Hiragana và Katakana đúng thứ tự nét, kết hợp thuật toán lặp lại ngắt quãng FSRS-6 để tối ưu hóa việc ghi nhớ lâu dài.

**Không tài khoản, không cơ sở dữ liệu, không máy chủ ứng dụng.** Ai mở trang cũng học được ngay. Toàn bộ site là tệp tĩnh (HTML/JS/CSS), tiến độ học của mỗi người nằm trong `localStorage` của chính trình duyệt họ và không bao giờ rời khỏi máy.

```
kana-dojo/
├── docs/
│   ├── SPEC.md            Đặc tả kỹ thuật — thuật toán, mô hình dữ liệu, luật XP/streak/huy hiệu
│   ├── ARCHITECTURE.md    Kiến trúc, luồng dữ liệu, quyết định thiết kế
│   ├── DEVELOPMENT.md     Hướng dẫn thiết lập môi trường phát triển
│   ├── DEPLOYMENT.md      Hướng dẫn đưa site lên mạng
│   └── kana-data.json     208 ký tự · 148 glyph, trích từ KanjiVG (CC BY-SA 3.0)
├── web/                   Next.js 15 (xuất bản tĩnh) · TypeScript · Tailwind CSS v4 (+ Dockerfile, nginx.conf)
├── docker-compose.yml     Một container Nginx phục vụ bản build tĩnh
├── .github/workflows/     CI: lint, typecheck, test, build, rồi smoke test qua Docker
├── scripts/smoke-test.sh  Kiểm tra nhanh một bản triển khai đang chạy
└── archive/legacy-v1/     Bản offline HTML/CSS/JS thuần đời đầu
```

---

## Tính năng chính

| Tính năng | Mô tả |
|---|---|
| **Tập viết có hướng dẫn** | Vẽ nét trên canvas, so khớp với dữ liệu KanjiVG, điểm 0–100 |
| **FSRS-6** | Lặp lại ngắt quãng thế hệ mới — điểm tập viết tự động xác định cấp độ ghi nhớ |
| **Streak & XP** | Chuỗi ngày học, điểm kinh nghiệm, level, 9 huy hiệu thành tích |
| **Quiz** | 4 bài mẫu (trắc nghiệm + gõ romaji), đếm giờ, chấm và giải thích từng câu |
| **Từ vựng JLPT** | 70 từ N5 + 10 từ N4, nghĩa tiếng Việt, câu ví dụ; tìm kiếm không cần gõ dấu |
| **Sao lưu tiến độ** | Xuất/nhập tiến độ thành tệp JSON để chuyển máy hoặc phòng khi xoá dữ liệu trình duyệt |
| **Bảng chữ cái công khai** | `/bang-chu-cai/hiragana`, `/bang-chu-cai/katakana` dựng sẵn cho SEO; bấm một chữ để vào luyện viết đúng chữ đó |

### Điều cần biết khi không có tài khoản

- Tiến độ **gắn với trình duyệt + thiết bị**: không tự đồng bộ giữa điện thoại và máy tính. Dùng *Cài đặt → Sao lưu* để chuyển.
- Xoá dữ liệu trang web, hoặc dùng chế độ riêng tư, sẽ làm mất tiến độ. Ứng dụng báo rõ khi trình duyệt không cho lưu.
- Không có bảng xếp hạng (cần dữ liệu chung giữa người dùng) và không có gói PRO/giới hạn lượt học — mọi thứ mở cho mọi người.

---

## Khởi động nhanh

Yêu cầu: **Node.js 20+** (khuyến nghị 22). Không cần Java, Maven, Docker hay cơ sở dữ liệu.

```bash
cd web
npm ci
npm run dev        # http://localhost:3001
```

Chạy thử bản build thật (xuất bản tĩnh vào `web/out/`):

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
├── components/
│   ├── app/                     Brand, Nav, ThemeToggle
│   ├── kana/                    StrokeStage, KanaGrid, PracticePanel, HeroDemo
│   ├── quiz/QuizRunner.tsx
│   └── ui/index.tsx             Design system: Button, Card, Field, Chip, Progress, Stat, …
├── data/
│   ├── kana-data.json           Dữ liệu nét 208 ký tự (57 KB, ~20 KB gzip)
│   ├── vocabulary.ts · quizzes.ts · badges.ts   Nội dung tĩnh
└── lib/
    ├── fsrs.ts                  FSRS-6 — thuần hàm
    ├── stroke-match.ts          Bộ chấm điểm nét — arc-length resampling, thuần hàm
    ├── kana.ts                  Truy cập dữ liệu nét đã bundle
    ├── vocabulary.ts            Lọc/tìm từ vựng (bỏ dấu)
    ├── types.ts
    └── learning/                Bộ máy học chạy trong trình duyệt
        ├── state.ts             Hình dạng + schema (zod) của tiến độ lưu trữ
        ├── store.ts             localStorage, đồng bộ nhiều tab, xuất/nhập — nơi duy nhất đụng I/O
        ├── hooks.ts             useStats, useKanaProgress, … (React)
        ├── activity.ts          XP, level, streak, heatmap
        ├── badges.ts · cards.ts · reviews.ts · quiz.ts · time.ts
```

---

## Kiểm thử

```bash
cd web
npm test              # Vitest — 84 test
npm run lint
npm run typecheck
npm run build         # xuất bản tĩnh vào out/
```

Toàn bộ logic học (FSRS, hàng đợi, XP/streak/múi giờ, huy hiệu, quiz, lưu trữ) là hàm thuần hoặc chạy trên `localStorage` giả,
nên test chạy trong Node, không cần trình duyệt hay Docker. CI (GitHub Actions) chạy các lệnh trên cho mỗi pull request, rồi dựng
container bằng `docker compose` và chạy `scripts/smoke-test.sh` — xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#ci-github-actions).

---

## Trạng thái build đã kiểm chứng

Kiểm chứng ngày 2026-10-01:

- `npm test` 84/84 · `npm run lint` sạch · `tsc --noEmit` sạch · `next build` — 19 trang tĩnh
- **End-to-end trong trình duyệt** (bản build tĩnh): viết đủ 3 nét あ → +25 XP, huy hiệu "Nét đầu tiên", thẻ chuyển REVIEW hẹn 8 ngày → tải lại trang vẫn còn
  → Ôn tập cấp đúng 9 thẻ mới (hạn mức 10/ngày) → làm quiz → xuất/nhập/xoá tiến độ ở Cài đặt; không có request mạng nào ngoài tệp tĩnh
- **Docker:** `docker compose up --build --wait` + `scripts/smoke-test.sh` chạy trong CI; chưa được chạy cục bộ ở lần kiểm chứng này

---

## Giới hạn đã biết (cố ý)

| Hạng mục | Trạng thái |
|---|---|
| Thẻ từ vựng trong hàng đợi ôn | Hạn mức thẻ mới/ngày dùng chung và thẻ `KANA_WRITING` được cấp trước, nên thẻ `VOCAB_*` chỉ xuất hiện sau khi đã mở hết các ký tự kana (trừ khi gọi `createReviewQueue({ types: ["VOCAB_MEANING"] })`). Trang Từ vựng hiện chỉ để tra cứu, chưa có nút "thêm vào ôn tập" |
| Quản trị nội dung | Không có trang admin — sửa `web/src/data/*.ts` rồi build lại |
| Đồng bộ nhiều thiết bị | Không có (xem phần trên). Sao lưu thủ công bằng tệp JSON |
| Đáp án quiz | Nằm trong bundle JS (không có máy chủ để giấu) — phù hợp với quiz tự học, không phù hợp để thi có tính điểm nghiêm túc |
| Dữ liệu cũ trên PostgreSQL | Phiên bản có tài khoản lưu tiến độ trên máy chủ; không có công cụ chuyển sang tiến độ cục bộ |

---

## Tài liệu liên quan

| Tài liệu | Mục đích |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Đặc tả kỹ thuật — mô hình dữ liệu, thuật toán, luật trò chơi hoá |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, luồng dữ liệu, quyết định thiết kế |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Thiết lập môi trường dev, quy ước code, sự cố đã gặp |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Đưa site lên mạng: máy chủ tĩnh, Docker, Nginx, CI |
| [archive/legacy-v1/README.md](archive/legacy-v1/README.md) | Giải thích đầy đủ thuật toán chấm nét (arc-length, forward-only) |

---

## Giấy phép

Dữ liệu thứ tự nét trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — share-alike, cho phép dùng thương mại.
Nếu phát hành lại `kana-data.json` hoặc bản dẫn xuất, phải ghi công KanjiVG và giữ nguyên giấy phép đó cho phần dữ liệu.
