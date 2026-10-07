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
npm run build           # next build + sinh out/sw.js (service worker) — ghi site tĩnh vào out/
npx serve out           # máy chủ tệp tĩnh bất kỳ; serve hỗ trợ /luyen-viet → luyen-viet.html
```

Service worker chỉ được đăng ký ở **bản production** (và chỉ trên HTTPS hoặc `localhost`). `npm run dev` thì ngược lại: nó tự **gỡ** mọi service worker còn sót lại từ lần bạn xem thử bản build
trên cùng origin, nếu không cache cũ sẽ che mất mọi thay đổi bạn đang sửa. Nếu vẫn thấy bản cũ: DevTools → Application → Service Workers → *Unregister*, và Cache Storage → xoá các cache `kd-*`.

> Dùng cổng khác khi `3001` đã bận: `npx next dev -p 3011`. Mỗi worktree/phiên làm việc có thể đang giữ cổng riêng của nó — `EADDRINUSE` nghĩa là server bạn thấy ở `localhost:3001` **không phải** bản bạn vừa sửa.

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
| `lib/learning/personal.test.ts` | Cách học và thẻ tự soạn: catalog (chỉ bộ đang bật), thứ tự cấp thẻ mới (`mine`/`builtin`/`mixed`), hạn mức dùng chung, tắt nguồn thẻ, phạm vi kana, retention đổi lịch ôn, thẻ đã xoá giữ lịch trong tiến độ nhưng không vào hàng đợi, mặc định không đổi |
| `lib/space/space.test.ts` · `library.test.ts` | Schema/chuẩn hoá không gian riêng, kẹp cách học, `home`/`settings` luôn có; ghi chú (ghim không đổi `updatedAt`, tìm không dấu), bộ thẻ (trùng/trống/giới hạn), nhập–xuất TSV, câu gõ phải gõ được, mã không trùng |
| `lib/space/store.test.ts` | `localStorage` giả cho `kd.space.v1`: không tự ghi khi mở lần đầu, `SpaceError` không đổi gì, bản hỏng giữ ở `.corrupt`, đồng bộ tab, ghi thất bại lộ ra `isPersistent`, **trần tổng dung lượng** chỉ chặn việc làm to thêm |
| `lib/space/markup.test.ts` | Cú pháp ghi chú; cú pháp dang dở không nuốt nội dung; HTML/liên kết không bao giờ thành phần tử |
| `lib/space/presets.test.ts` · `schedule.test.ts` | Điểm xuất phát của màn dựng lần đầu (hàng ôn đúng theo từng preset); tình trạng ôn của thẻ tự soạn |
| `lib/backup.test.ts` | Tệp sao lưu bọc: vòng xuất–nhập, `progress` bên trong là v1 nguyên vẹn, nhập được tệp tiến độ trần của bản cũ (không đụng ghi chú), từ chối tệp hỏng/mới hơn/sai app, sai một phần là từ chối cả tệp, reset giữ tài liệu |
| `lib/pointer-gate.test.ts` | Cổng con trỏ: ngón thứ hai bị bỏ qua, bút thắng cảm ứng, `pointercancel` bỏ nét dở, chuột phải bị bỏ qua, `up` thất lạc không gây kẹt |
| `lib/typing/engine.test.ts` | Mọi biến thể romaji (`shi/si/ci`, `nn`/`n'`/`xn`, `っ` gấp đôi, âm ghép, katakana mở rộng), kana JIS, phím "lẽ ra phải bấm" và gợi ý theo cách người học đang gõ |
| `lib/typing/phrases.test.ts` | Phân tích `{kanji|cách đọc}`; **từng câu trong kho** gõ trọn bằng cả romaji lẫn kana JIS; nguồn câu không lặp; 600 chuỗi kana ngẫu nhiên đều gõ được; "Chữ hay sai" |
| `lib/typing/ime.test.ts` · `score.test.ts` | Chuẩn hoá chữ IME và quy đổi số phím; KPM, độ chính xác, điểm, sinh tử, thang đai |
| `lib/typing/history.test.ts` | Kỷ lục theo tổ hợp, chữ yếu giảm dần; `localStorage` giả: khoá cố định, dữ liệu hỏng giữ ở `.corrupt`, bị chặn/đầy bộ nhớ không ném lỗi, xoá |
| `lib/pwa.test.ts` | Nhận diện ngữ cảnh cài đặt: đã cài / iPhone-iPad-iPadOS / còn lại |
| `scripts/build-sw.test.mjs` | Trình dựng service worker: ánh xạ tệp → URL (`encodeURI`, `[id]` → `%5Bid%5D`), loại `404.html`, mã phiên bản băm theo nội dung |
| `scripts/sw.test.mjs` | **Mã thật** của `sw.template.js` chạy trong Node với Cache API và `fetch` giả: precache, install thất bại khi có URL không 200, dọn cache cũ, phục vụ từ cache (kể cả `?query`, dấu `/` cuối, RSC, `%5Bid%5D`), offline, không can thiệp POST/khác origin/`/sw.js`, cập nhật phiên bản |

`next build` **không** chạy lint (`eslint.ignoreDuringBuilds`) vì lint đã có lệnh riêng; `next lint` đã bị khai tử từ Next 15.5.

### Kiểm thử logic học: đặt giờ giả

Các hàm trong `lib/learning` nhận một `Clock { now: number; zone: string }` thay vì gọi `Date.now()`. Test dùng giờ cố định và múi giờ tường minh:

```ts
const at = (iso: string): Clock => ({ now: Date.parse(iso), zone: "Asia/Ho_Chi_Minh" });
const { state, result } = recordWriting(emptyState(), { character: "あ", avgScore: 95, strokeErrors: [], durationMs: 4000 }, at("2026-09-07T03:00:00Z"));
```

---

## Quy ước code

- **Logic trong hàm thuần:** mọi thứ trong `lib/` (trừ các `store.ts`, `hooks.ts` và `backup.ts` — chỗ nối hai kho) không chạm DOM hay `localStorage`, và không tự đọc đồng hồ: thời gian và nguồn mã đi vào qua tham số (`Clock`, `Env`); chỉ giá trị *mặc định* của tham số mới gọi `Date.now()`.
  Thêm luật mới → thêm vào hàm thuần + test, rồi mới nối vào giao diện. Hàm cần DOM (tải tệp về…) nằm ở `components/`, không ở `lib/`.
- **Thao tác học trả `{ state, result }`:** sao chép trạng thái (`structuredClone`), sửa bản sao, trả về. Không sửa trạng thái đầu vào. Lỗi (ký tự lạ, thẻ không tồn tại) ném **trước** khi sao chép để trạng thái cũ nguyên vẹn.
- **Chỉ các `store.ts` đụng `localStorage`** (`lib/learning/store.ts` cho tiến độ, `lib/space/store.ts` cho không gian riêng; kỷ lục gõ có `lib/typing/history.ts` riêng). Component đọc qua hook (`lib/learning/hooks.ts`, `lib/space/hooks.ts`) và ghi qua hàm hành động của store.
  Sửa không gian riêng bằng `updateSpace(fn)` với `fn` là thao tác thuần ở `lib/space/` — nó trả `{ ok, error }`, luôn hiện `error` cho người dùng.
- **Văn bản người dùng tự soạn không bao giờ vào HTML thô:** hiển thị bằng phần tử React dựng từ `parseMarkup` (xem `components/library/RichText.tsx`). Không dùng `dangerouslySetInnerHTML` cho bất cứ thứ gì đến từ `Space`.
- **Hook không bao giờ gọi có điều kiện**, kể cả khi gộp hai cờ: viết `const a = useA(); const b = useB(); a && b`, không viết `useA() && useB()` (vế đầu sai sẽ bỏ qua hook thứ hai). ESLint `react-hooks/rules-of-hooks` bắt lỗi này.
- **Chống thao tác đúp bằng `ref`, không bằng state:** hai click trong cùng một tick (chạm đúp, hoặc hết giờ trùng lúc bấm nộp) đều thấy state cũ vì React chưa render lại giữa chúng. Xem `locked` ở `on-tap/page.tsx` và `submitted` ở `QuizRunner.tsx`.
- **Hydration:** trang đọc tiến độ phải kiểm tra `ready` (từ `useProgress`/`useStats`/…) trước khi hiện số — phía máy chủ chỉ có trạng thái rỗng. Đặt mọi hook *trước* lệnh `return` sớm.
- **Hiển thị theo `type`, không so khớp chuỗi tự do:** `ItemType`, `CardState`, `Grade` định nghĩa ở `lib/types.ts`.
- **Xuất bản tĩnh:** trang động (`[id]`) phải có `generateStaticParams` + `dynamicParams = false`; `useSearchParams` phải nằm trong `<Suspense>`; `robots.ts`/`sitemap.ts` cần `export const dynamic = "force-static"`; không dùng route handler hay `rewrites()`.
- **Trang cá nhân hoá** (`bang-dieu-khien`, `on-tap`, `cai-dat`) là client component và `noindex`. Trang nội dung công khai nên là server component có `metadata` + canonical.
- **Nhận con trỏ qua cổng:** mọi thao tác viết bằng chuột/cảm ứng/bút phải đi qua `createPointerGate()` (`lib/pointer-gate.ts`), kiểm `pointerId` ở `move`/`up`, và coi `pointercancel`/`lostpointercapture` là *bỏ* nét chứ không phải *hoàn tất*. `setPointerCapture` luôn bọc `try/catch`.
- **Service worker:** sửa `scripts/sw.template.js`, không bao giờ sửa `out/sw.js` (sinh lại sau mỗi build). URL precache phải đúng dạng trình duyệt yêu cầu (`encodeURI`), và **mọi URL trong danh sách phải trả 200** từ Nginx — nếu không `cache.addAll` làm hỏng cả lần cài đặt.
  Thêm tệp không nên precache (ví dụ trang chỉ Nginx phục vụ nội bộ như `404.html`) thì thêm vào `EXCLUDED` ở `scripts/build-sw.mjs` kèm test.
- **Naming:** component file = PascalCase, utility file = camelCase, route folder = tiếng Việt (theo codebase).

---

## Thêm một công cụ (mô-đun) vào điều hướng

Công cụ mà người học bật/tắt/xếp thứ tự là một `ModuleId`. Để thêm: (1) thêm mã vào `MODULE_IDS` ở `lib/space/space.ts` (thứ tự mảng là thứ tự mặc định); (2) thêm mục tương ứng vào `MODULE_INFO` ở `lib/space/modules.ts`
(đường dẫn, nhãn, biểu tượng — thêm hình vào `ICONS` ở `components/app/Nav.tsx`, mô tả); (3) nếu muốn nó nằm trong một điểm xuất phát, thêm vào `PRESETS` ở `lib/space/presets.ts`.
Không gian đã lưu của người dùng *không* có mã mới trong `modules` nên công cụ mới không tự hiện với họ — họ bật nó ở Cài đặt › Công cụ. Đổi `Space` theo cách không tương thích thì tăng `SPACE_VERSION` kèm migrate và test.
Các khối ở Tổng quan (`WidgetId`) làm tương tự với `WIDGET_IDS`, `WIDGET_INFO` và bản dựng ở `app/(app)/bang-dieu-khien/page.tsx`.

---

## Thêm kana / từ vựng / quiz / huy hiệu

Không có CSDL hay trang quản trị: sửa tệp nội dung rồi build lại.

### Kana

Chỉ có một bản: `web/src/data/kana-data.json` (bản sao ở `docs/` đã bị xoá để khỏi lệch nhau). Dữ liệu này sinh từ KanjiVG bằng script của bản v1 — xem [SPEC.md §1.1](SPEC.md#11-nguồn-gốc-dữ-liệu-nét) để biết cách lấy lại nếu cần tái sinh.
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

### Bản deploy mới không hiện / dev server hiện bản cũ

**Nguyên nhân:** service worker còn sót phục vụ từ cache. Ở production bản mới chỉ có hiệu lực khi mọi tab của bản cũ đã đóng (cố ý — xem [ARCHITECTURE.md](ARCHITECTURE.md#pwa-và-offline)); ở dev, `ServiceWorkerRegister` tự gỡ service worker nhưng cần tải lại trang một lần. Gỡ tay: DevTools → Application → Service Workers → *Unregister*.

### Smoke test báo "thiếu nội dung" dù trang đúng

**Nguyên nhân:** dưới `set -o pipefail`, `printf "$body" | grep -q …` làm `grep` thoát ngay khi khớp, bên ghi nhận SIGPIPE (exit 141) và cả pipeline bị coi là lỗi — chỉ xảy ra khi nội dung lớn (trang chủ ≈ 94 KB) và không xảy ra trên Git Bash của Windows. Đọc nội dung vào biến rồi so khớp bằng `[[ … ]]`/`=~`;
dùng `curl -g` khi URL có `[` `]` để curl không coi chúng là dải ký tự. Ghi chú nằm ở đầu `scripts/smoke-test.sh`.

### Service worker không cài được (app không offline) dù build xanh

**Nguyên nhân thường gặp:** có một URL trong precache không trả 200 (ví dụ `404.html` — Nginx chỉ phục vụ nội bộ) hoặc khoá cache sai dạng mã hoá (`[id]` thay vì `%5Bid%5D`). `scripts/smoke-test.sh` kiểm từng URL của precache; chạy nó trên bản triển khai thật.

### Trình duyệt nhúng trong app (hoặc môi trường không cho đăng ký service worker)

Báo `Failed to register a ServiceWorker … An unknown error occurred when fetching the script` ngay cả với tệp một dòng — giới hạn của môi trường chứ không phải của mã. Kiểm service worker bằng Chrome/Edge/Firefox thường trên `localhost` (xem "PWA và offline" bên dưới).

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

Mở DevTools → Application → Local Storage → khoá `kd.progress.v1` (tiến độ) và `kd.space.v1` (không gian riêng) để xem trạng thái thật sau mỗi thao tác.
Muốn thấy lại màn dựng lần đầu: xoá cả hai khoá (hoặc Cài đặt › Dữ liệu › *Xoá sạch mọi thứ*) rồi tải lại; muốn giả lập "người dùng cũ" thì chỉ xoá `kd.space.v1` và giữ `kd.progress.v1`.

### Tập viết

1. Vào `/luyen-viet` (hoặc bấm một chữ ở `/bang-chu-cai/hiragana` — sẽ mở thẳng chữ đó nhờ `?c=`)
2. Chọn script, nhóm, chế độ (Đồ theo nét / Tự viết)
3. Click vào ký tự → khung tập viết mở ra; vẽ từng nét theo hướng dẫn
4. Quan sát điểm từng nét, phản hồi lỗi (REVERSED, TOO_SHORT, …), và khi đủ nét: XP, lịch ôn kế tiếp, huy hiệu
5. Tải lại trang: tiến độ còn nguyên; `/bang-dieu-khien` hiện XP và ô huy hiệu đã sáng

### Ôn tập SRS

1. Vào `/on-tap`: người mới nhận tối đa 10 thẻ mới mỗi ngày (kana theo thứ tự dạy học)
2. Để thấy thẻ *đến hạn*: sửa `dueAt` của một thẻ trong Local Storage về quá khứ rồi tải lại, hoặc đổi giờ máy
3. Thẻ viết mở khung tập viết là bảng trắng (không nét mờ, không hoạt ảnh, không nút xem mẫu; trượt 3 lần liên tiếp ở một nét thì nét mẫu của nét đó mới hiện); thẻ khác lật đáp án rồi tự chấm 4 mức

### Luyện gõ

1. Vào `/luyen-go`, giữ mặc định (Hiragana · Romaji · Bài mẫu) và *Bắt đầu gõ*. Đồng hồ chỉ chạy từ phím đầu tiên
2. Gõ theo chữ Nhật hiện trên màn (không có romaji mẫu). Phím sai bị từ chối và được đếm vào *Gõ sai*; ん trước `y` hoặc ở cuối câu cần `nn`
3. Hết bài: màn kết quả hiện điểm, đai, kỷ lục và *Chữ hay sai*. Tải lại `/luyen-go`: kỷ lục còn nguyên (Local Storage → `kd.typing.history.v1`)
4. `/cai-dat` → *Xoá toàn bộ tiến độ*: kỷ lục luyện gõ cũng mất. Lưu ý công cụ tự động hoá nhập liệu chỉ phát `input`, không phát `keydown` thật thì trang không nhận phím — phải nhấn phím thật (hoặc action `key` của trình duyệt nhúng)

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

### Đa điểm chạm và bút

Trên thiết bị thật (hoặc DevTools → chế độ thiết bị, đặt loại con trỏ là cảm ứng):

1. Mở `/luyen-viet?c=あ`, đặt một ngón viết nét 1 và **chạm thêm ngón thứ hai** vào ô giữa chừng: nét vẫn được chấm ("Đẹp! Sang nét số 2"), không bị ghi đè.
2. Để lòng bàn tay chạm xuống rồi viết bằng bút: bút phải thắng.
3. Kéo từ mép màn hình (cử chỉ hệ thống) giữa nét: nét dở bị bỏ, không có điểm và không có thông báo lỗi.

Kiểm tự động không dựng được thiết bị thật; có thể bắn `PointerEvent` có `pointerId`/`pointerType` khác nhau vào `canvas` trong DevTools để tái hiện (xem test `lib/pointer-gate.test.ts` cho các tổ hợp cần phủ).

### PWA và offline

1. `npm run build && npx serve out` rồi mở địa chỉ `serve` in ra (thường là `http://localhost:3000`) bằng Chrome/Edge. DevTools → Application → **Manifest**: không có cảnh báo; **Service Workers**: trạng thái *activated and running*; **Cache Storage**: một cache `kd-<hex>` với đủ tệp (73 ở thời điểm viết).
2. Tải lại một lần để trang được service worker kiểm soát, rồi *Network → Offline* (hoặc tắt hẳn server) và tải lại `/`, `/luyen-viet`, `/quiz/1`, `/bang-chu-cai/hiragana`: tất cả phải mở được. Viết thử một chữ khi offline — tiến độ vẫn lưu.
3. Nút cài ở thanh địa chỉ Chrome (hoặc thẻ "Cài ra màn hình chính" ở `/cai-dat`) → ứng dụng mở không có thanh địa chỉ, bắt đầu ở `/bang-dieu-khien`.
4. iPhone/iPad: Safari → Chia sẻ → *Thêm vào Màn hình chính*. **Mở lần đầu sẽ thấy tiến độ trống** (kho tách biệt với Safari) — dùng Tải tiến độ về / Khôi phục từ tệp để chuyển sang.
5. Triển khai bản mới rồi tải lại: bản cũ vẫn chạy cho tới khi đóng hết tab, mở lại mới thấy bản mới.

### Icon PWA

`web/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` và `web/src/app/apple-icon.png` (180×180) là ảnh tĩnh, vẽ lại đúng biểu tượng của `app/icon.svg` (chữ 仮 trắng trên nền `#C33C2B`):
bản `any` bo góc 12,5%, bản `maskable` tràn nền với chữ nằm trong vùng an toàn giữa (≈ 50% cạnh), bản Apple nền đặc không bo góc (iOS tự bo; nền trong suốt sẽ thành đen). Đổi thương hiệu thì vẽ lại cả bốn tệp
(ví dụ bằng `canvas.toBlob` trong trình duyệt) — `app/manifest.ts` và `scripts/smoke-test.sh` đã tham chiếu đúng các đường dẫn này.
