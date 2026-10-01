# Kana Dōjō — Hướng dẫn phát triển

## Yêu cầu môi trường

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Node.js | 20 LTS (khuyến nghị 22) | Kiểm tra: `node -v` |
| npm | 10 | Đi kèm Node.js |
| Docker | 24 | *Tuỳ chọn* — chỉ để thử container giống production |

Không cần Java, Maven, PostgreSQL hay bất kỳ dịch vụ nào chạy nền.

---

## Thiết lập lần đầu

```bash
git clone <repo> kana-dojo
cd kana-dojo/web
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm ci
npm run dev                     # http://localhost:3001
```

`.env.local` chỉ có một biến, `NEXT_PUBLIC_SITE_URL` — dùng cho canonical/sitemap/Open Graph. Mặc định `http://localhost:3001` là đủ khi phát triển.

`npm run dev` có hot reload. Tiến độ học trong lúc dev nằm trong `localStorage` của `localhost:3001`; xoá bằng DevTools → Application → Local Storage
hoặc bằng nút *Xoá toàn bộ tiến độ* ở `/cai-dat`.

### Xem bản build thật

`next dev` khác bản xuất bản tĩnh ở vài điểm (không có prerender, không kiểm tra `generateStaticParams`), nên trước khi mở PR nên chạy thử:

```bash
npm run build           # ghi site tĩnh vào out/
npx serve out           # máy chủ tệp tĩnh bất kỳ; serve hỗ trợ /luyen-viet → luyen-viet.html
```

Hoặc dựng đúng container production: `docker compose up -d --build --wait` ở thư mục gốc rồi `bash scripts/smoke-test.sh`.

---

## Chạy kiểm thử

```bash
cd web

npm test              # Vitest, chạy một lần
npm run test:watch    # chạy lại khi sửa file

# Lint (ESLint 9, cấu hình eslint.config.mjs = next/core-web-vitals + next/typescript)
npm run lint

# Kiểm tra kiểu TypeScript
npm run typecheck

# Build production (xuất bản tĩnh — phát hiện lỗi prerender)
npm run build
```

Unit test đặt cạnh mã nguồn, tên `*.test.ts`, chạy trong môi trường Node (không jsdom):

| Tệp | Kiểm tra gì |
|---|---|
| `lib/stroke-match.test.ts` | Lấy mẫu theo độ dài cung, bất biến với tốc độ vẽ, phạt nét ngược chiều, chẩn đoán `TOO_SHORT`/`TOO_LONG`/`OFF_PATH` |
| `lib/fsrs.test.ts` | FSRS-6: thẻ mới theo từng grade, khoảng cách tăng dần, quên → RELEARNING, `D` luôn trong [1, 10] qua 5000 lượt ngẫu nhiên có seed, mốc 48/70/88 |
| `lib/learning/activity.test.ts` | Ngày theo múi giờ, XP/level, mục tiêu ngày, streak (liên tiếp / thẻ băng / đứt), hồi thẻ băng Thứ Hai, heatmap |
| `lib/learning/reviews.test.ts` | Hàng đợi (hạn mức 10 thẻ mới/ngày theo ngày địa phương), chấm thẻ, luyện viết (đạt lần đầu, nét hỏng, kẹp điểm), huy hiệu, tiến độ |
| `lib/vocabulary.test.ts` | Trang Từ vựng hiện đủ 70 từ N5 (không cắt ở 60), tìm không dấu, tìm theo cách đọc/romaji/nghĩa |
| `lib/learning/quiz.test.ts` | Chấm quiz + tính toàn vẹn nội dung đóng gói (id, đáp án nằm trong options) |
| `lib/learning/store.test.ts` | `localStorage` giả: lưu/nạp lại, dữ liệu hỏng, trình duyệt chặn ghi, đồng bộ tab, xuất/nhập/xoá |

`next build` **không** chạy lint (`eslint.ignoreDuringBuilds`) vì lint đã có lệnh riêng; `next lint` đã bị khai tử từ Next 15.5.

### Kiểm thử logic học: đặt giờ giả

Các hàm trong `lib/learning` nhận một `Clock { now: number; zone: string }` thay vì gọi `Date.now()`. Test dùng giờ cố định và múi giờ tường minh:

```ts
const at = (iso: string): Clock => ({ now: Date.parse(iso), zone: "Asia/Ho_Chi_Minh" });
const { state, result } = recordWriting(emptyState(), { character: "あ", avgScore: 95, strokeErrors: [], durationMs: 4000 }, at("2026-09-07T03:00:00Z"));
```

---

## Quy ước code

- **Logic trong hàm thuần:** mọi thứ trong `lib/` (trừ `store.ts` và `hooks.ts`) không chạm DOM, `localStorage` hay `Date.now()`. Thêm luật mới → thêm vào hàm thuần + test, rồi mới nối vào giao diện.
- **Thao tác học trả `{ state, result }`:** sao chép trạng thái (`structuredClone`), sửa bản sao, trả về. Không sửa trạng thái đầu vào. Lỗi (ký tự lạ, thẻ không tồn tại) ném **trước** khi sao chép để trạng thái cũ nguyên vẹn.
- **Chỉ `store.ts` đụng `localStorage`.** Component đọc qua hook trong `lib/learning/hooks.ts` và ghi qua hàm hành động của `store.ts`.
- **Chống thao tác đúp bằng `ref`, không bằng state:** hai click trong cùng một tick (chạm đúp, hoặc hết giờ trùng lúc bấm nộp) đều thấy state cũ vì React chưa render lại giữa chúng. Xem `locked` ở `on-tap/page.tsx` và `submitted` ở `QuizRunner.tsx`.
- **Hydration:** trang đọc tiến độ phải kiểm tra `ready` (từ `useProgress`/`useStats`/…) trước khi hiện số — phía máy chủ chỉ có trạng thái rỗng. Đặt mọi hook *trước* lệnh `return` sớm.
- **Hiển thị theo `type`, không so khớp chuỗi tự do:** `ItemType`, `CardState`, `Grade` định nghĩa ở `lib/types.ts`.
- **Xuất bản tĩnh:** trang động (`[id]`) phải có `generateStaticParams` + `dynamicParams = false`; `useSearchParams` phải nằm trong `<Suspense>`; `robots.ts`/`sitemap.ts` cần `export const dynamic = "force-static"`; không dùng route handler hay `rewrites()`.
- **Trang cá nhân hoá** (`bang-dieu-khien`, `on-tap`, `cai-dat`) là client component và `noindex`. Trang nội dung công khai nên là server component có `metadata` + canonical.
- **Naming:** component file = PascalCase, utility file = camelCase, route folder = tiếng Việt (theo codebase).

---

## Thêm kana / từ vựng / quiz / huy hiệu

Không có CSDL hay trang quản trị: sửa tệp nội dung rồi build lại.

### Kana

Nguồn là `docs/kana-data.json`, bản dùng thật là `web/src/data/kana-data.json` — hai tệp giống hệt nhau, nếu sửa phải đồng bộ cả hai.
Thứ tự trong `chars` là thứ tự dạy học, và mã ký tự là khoá của thẻ ôn nên **không đổi mã ký tự đã có**.

### Từ vựng

Thêm phần tử vào **cuối** `web/src/data/vocabulary.ts` với `id` kế tiếp. Không xoá, không đánh lại số: thẻ ôn đã lưu trong trình duyệt người dùng tham chiếu tới `id`
(thẻ trỏ tới từ không còn tồn tại sẽ bị bỏ qua khỏi hàng đợi nhưng vẫn nằm trong tiến độ).
`jlptLevel` mới sẽ tự có chip lọc ở trang Từ vựng.

### Quiz

Thêm vào `web/src/data/quizzes.ts`. Giữ `id` quiz và `id` câu hỏi duy nhất; câu trắc nghiệm phải có `correctAnswer` nằm trong `options`; câu gõ để `options: []`.
`quiz.test.ts` kiểm các bất biến này. Trang `/quiz/[id]` và `sitemap.xml` tự cập nhật theo danh sách.

### Huy hiệu

Thêm định nghĩa vào `web/src/data/badges.ts` **và** điều kiện trao vào `evaluateBadges` (`lib/learning/badges.ts`) kèm test.

---

## Sự cố đã gặp và cách xử lý

### Trang hiện khung chờ mãi / số nháy từ 0 sang giá trị thật

**Nguyên nhân:** quên kiểm tra `ready` — phía máy chủ và lúc hydrate chỉ có `SERVER_STATE` (rỗng). Xem [ARCHITECTURE.md](ARCHITECTURE.md#react).

### `next build` lỗi `Page "…" is missing "generateStaticParams()"`

**Nguyên nhân:** trang động trong chế độ xuất bản tĩnh. Thêm `generateStaticParams` (và `dynamicParams = false`) vào **server** component của route; nếu trang là client component, tách một `page.tsx` server mỏng như `app/(app)/quiz/[id]/page.tsx`.

### `useSearchParams() should be wrapped in a suspense boundary`

**Nguyên nhân:** xuất bản tĩnh buộc phần dùng `useSearchParams` nằm trong `<Suspense>`. Xem `app/(app)/luyen-viet/page.tsx`.

### `next@15.1.6` có lỗ hổng RCE

**Vấn đề:** `npm audit` phát hiện lỗ hổng **critical** trong `next@15.1.6` — RCE qua React flight protocol.

**Xử lý:** Nâng lên `next@15.5.25` (cùng major 15, không đổi API).

**Còn tồn tại:** 1 lỗ hổng `postcss` mức **high** (đọc file `.map` tùy ý). Chỉ hết khi nâng lên Next.js 16 — là breaking change, cần đánh giá riêng.

### `npm install` báo `Cannot read properties of null (reading 'edgesOut')`

**Vấn đề:** lỗi của npm 10 khi giải peer dependency nhóm `@emnapi` / `@napi-rs` (đi kèm Tailwind oxide, Vite).

**Xử lý:** `npm ci` (cài theo lockfile) không bị ảnh hưởng. Khi cần *thêm/nâng* gói, chạy lệnh đó bằng npm 11:
`npx -y npm@11 install -D <gói>` — lockfile vẫn là v3, npm 10 đọc bình thường.

---

## IDE Setup

### VS Code

Extensions được khuyến nghị:
- ESLint
- Tailwind CSS IntelliSense
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

Mở DevTools → Application → Local Storage → khoá `kd.progress.v1` để xem trạng thái thật sau mỗi thao tác.

### Tập viết

1. Vào `/luyen-viet` (hoặc bấm một chữ ở `/bang-chu-cai/hiragana` — sẽ mở thẳng chữ đó nhờ `?c=`)
2. Chọn script, nhóm, chế độ (Đồ theo nét / Tự viết)
3. Click vào ký tự → khung tập viết mở ra; vẽ từng nét theo hướng dẫn
4. Quan sát điểm từng nét, phản hồi lỗi (REVERSED, TOO_SHORT, …), và khi đủ nét: XP, lịch ôn kế tiếp, huy hiệu
5. Tải lại trang: tiến độ còn nguyên; `/bang-dieu-khien` hiện XP và ô huy hiệu đã sáng

### Ôn tập SRS

1. Vào `/on-tap`: người mới nhận tối đa 10 thẻ mới mỗi ngày (kana theo thứ tự dạy học)
2. Để thấy thẻ *đến hạn*: sửa `dueAt` của một thẻ trong Local Storage về quá khứ rồi tải lại, hoặc đổi giờ máy
3. Thẻ viết mở khung tập viết không có nét mờ; thẻ khác lật đáp án rồi tự chấm 4 mức

### Quiz

1. Vào `/quiz` → chọn một trong 4 bài mẫu → **Bắt đầu làm bài**
2. Trắc nghiệm: bấm đáp án hoặc phím `1`–`4`; tự luận: gõ romaji. `Enter` sang câu kế / nộp ở câu cuối
3. Hết giờ bài tự nộp (chỉ một lần); màn kết quả hiện đáp án đúng và giải thích cho từng câu

### Sao lưu

1. `/cai-dat` → *Tải tiến độ về máy* → mở tệp JSON, xem thử cấu trúc
2. *Xoá toàn bộ tiến độ* rồi *Khôi phục từ tệp…* — tiến độ trở lại đúng như cũ
3. Thử nhập một tệp không phải JSON hoặc JSON sai định dạng: có thông báo lỗi và tiến độ hiện tại không đổi

### Trình duyệt chặn lưu trữ

Chặn dữ liệu trang web trong cài đặt trình duyệt (hoặc dùng cửa sổ riêng tư ở trình duyệt chặn `localStorage`): khung ứng dụng hiện cảnh báo vàng
và vẫn học được trong phiên.
