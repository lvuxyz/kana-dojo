# Web ở chế độ cá nhân (tạm thời)

> **Trạng thái:** có trên nhánh `claude/read-source-write-docs-bbc090`, chưa commit và chưa vào `master`.
> Backend (`backend/`), Docker Compose và CI **không bị đổi** — chỉ `web/`.

Hiện tại web được dùng cho **một người, trên một trình duyệt**. Vì vậy mọi mã của web chạm tới backend/CSDL
(gọi API, đăng nhập, cookie refresh token, rewrite `/api/v1`) được **comment lại, giữ nguyên từng dòng**, và dữ liệu học tập
được lưu ngay trong trình duyệt (`localStorage`). Không cần chạy backend hay PostgreSQL:

```bash
cd web
npm install
npm run dev        # http://localhost:3001 — dùng được ngay, không cần backend
```

---

## 1. Cách hoạt động

Các trang **không đổi**: chúng vẫn gọi `get("/stats/me")`, `post("/writing/attempts", …)`… Chỉ có một chỗ đổi — `lib/api.ts`
không `fetch` nữa mà chuyển lời gọi cho bộ xử lý cục bộ, bộ này nhận **đúng đường dẫn và hình dạng DTO của backend**
([SPEC.md §5](SPEC.md)) nhưng trả lời từ dữ liệu trên máy.

```
Trang React ──get/post/patch──► lib/api.ts ──► lib/local/router.ts ──► lib/local/*  ──► localStorage["kd.local.v1"]
                                   │
                                   └─ (đang tắt) fetch /api/v1/* → rewrite → Spring Boot → PostgreSQL
```

| File (`web/src/lib/`) | Vai trò | Bản gốc ở backend |
|---|---|---|
| `local/router.ts` | Nhận `(method, path, body)`, gọi đúng hàm, ném lỗi dạng RFC 7807 | các `*Controller` |
| `local/store.ts` | Đọc/ghi một khoá `localStorage`; `mutate()` là "giao dịch": hàm ném lỗi thì không ghi gì | JPA + Flyway |
| `local/fsrs.ts` | FSRS-6, **port nguyên văn** `FsrsEngine.java` | `srs/FsrsEngine` |
| `local/learning.ts` | Hàng đợi ôn, chấm thẻ, ghi bài viết (một lần: lưu → grade → FSRS → XP/streak → huy hiệu), tiến độ | `ReviewService`, `WritingService`, `ProgressService` |
| `local/gamification.ts` | XP, level, streak + thẻ băng, heatmap, 9 huy hiệu | `GamificationService`, `BadgeService` |
| `local/content.ts` | Từ vựng (lọc, tìm, phân trang), quiz (đề không lộ đáp án, chấm điểm) | `VocabularyService`, `QuizService` |
| `local/catalog.ts`, `profile.ts`, `time.ts` | Danh mục kana/từ vựng, hồ sơ, ngày giờ theo múi giờ người học | `KanaService`, `AuthService`, `LocalDay` |
| `api-error.ts` | `ApiError` (tách khỏi `api.ts` để cả hai chế độ dùng chung) | `ApiException` |

Nội dung cố định lấy từ `web/src/data/`:

| File | Nội dung | Nguồn |
|---|---|---|
| `kana-data.json` | 208 ký tự, 148 glyph (đã có) | `KanaSeeder` |
| `vocabulary.json` | 80 từ (70 N5 + 10 N4) | trích từ `V3__seed_content.sql` |
| `quizzes.json` | 4 quiz, 38 câu, kèm đáp án và giải thích | trích từ `V3__seed_content.sql` |
| `badges.json` | 9 huy hiệu | `V2__seed_reference.sql` |

> Id kana ở hai chế độ **trùng nhau** (đều theo thứ tự trong file, từ 1), nên `kana-data.json` là nguồn duy nhất.
> Nếu sửa nội dung seed trong migration, phải trích lại các file JSON ở trên — chúng không tự đồng bộ.

### Đường dẫn được xử lý

| | Đường dẫn |
|---|---|
| ✅ | `GET /auth/me`, `PATCH /auth/me` · `GET /kana` · `GET /vocabulary` · `GET /quizzes`, `GET /quizzes/{id}`, `POST /quizzes/{id}/attempts`, `POST /quiz-attempts/{id}/submit` · `GET /reviews/queue`, `POST /reviews/grade` · `POST /writing/attempts` · `GET /progress/kana`, `GET /progress/summary` · `GET /stats/me`, `GET /stats/heatmap` · `GET /badges` |
| ⛔ trả 404 | `/leaderboard/*`, `/me/entitlements`, `/auth/register`, `/login`, `/google`, `/refresh`, `/logout` — cần nhiều người dùng hoặc tài khoản |

---

## 2. Dữ liệu được lưu ở đâu

Một khoá `localStorage` duy nhất: **`kd.local.v1`** (JSON, vài trăm byte lúc mới dùng, cỡ vài trăm KB sau nhiều tháng).

| Phần | Nội dung |
|---|---|
| `profile` | Tên hiển thị, múi giờ, mục tiêu XP ngày, ngôn ngữ |
| `stats` | XP, level, streak, kỷ lục, thẻ băng, tổng lượt ôn |
| `daily` | Hoạt động theo ngày địa phương (XP, lượt ôn, ký tự đã viết, thời gian học, đã đạt mục tiêu) |
| `cards` | Thẻ ôn FSRS (`KANA_WRITING`, `KANA_READING`, `VOCAB_*`): trạng thái, stability, difficulty, lịch ôn, ngày được giới thiệu |
| `writing` | Điểm cao nhất mỗi ký tự, ký tự đã viết đạt, 10 điểm gần nhất |
| `badges`, `quizAttempts` | Huy hiệu đã đạt; các lượt làm quiz gần đây (tối đa 30) |

**Giới hạn cần biết:**

- Dữ liệu **chỉ nằm trong trình duyệt này**. Xoá dữ liệu trang web, đổi trình duyệt/máy, hoặc dùng cửa sổ ẩn danh thì **mất tiến độ**
  (ẩn danh vẫn dùng được trong một phiên nhưng không nhớ sau khi đóng). Chưa có xuất/nhập dữ liệu.
- Không lưu nhật ký từng lượt ôn (`review_logs`) và từng bài viết thô (`writing_attempts`) như backend — chỉ giữ trạng thái hiện tại.
  Muốn sau này tối ưu tham số FSRS theo cá nhân thì cần bật lại bản có máy chủ.
- Dữ liệu hỏng (JSON không đọc được) được **giữ lại** ở khoá `kd.local.v1.corrupt` rồi ứng dụng bắt đầu lại, không ghi đè mất.
- Nút **Xoá toàn bộ dữ liệu** ở trang Hồ sơ xoá khoá này.

---

## 3. Khác biệt so với bản có máy chủ

| Chủ đề | Bản có máy chủ | Chế độ cá nhân |
|---|---|---|
| Tài khoản | Đăng ký / đăng nhập / Google / đăng xuất | Không có. `/dang-nhap`, `/dang-ky` chuyển thẳng vào dashboard; hồ sơ mặc định "Học viên" |
| Múi giờ mặc định | `Asia/Ho_Chi_Minh` | Múi giờ của trình duyệt (đổi được ở Hồ sơ) |
| Gói FREE/PRO | Hạn mức ôn/viết mỗi ngày, từ vựng chỉ N5 | **Không giới hạn**; thấy cả từ vựng N4. Trang Hồ sơ không còn thẻ "Hạn mức gói" |
| Bảng xếp hạng | Top 50 tuần | Tắt (cần nhiều người): mục "Xếp hạng" ẩn khỏi menu, trang hiện thông báo |
| Hạn mức thẻ mới/ngày | Đếm thẻ có `reps = 1` hôm nay — "rò" khi một thẻ được chấm lần hai ([STATUS.md](STATUS.md), lỗi E) | Đếm bằng ngày thẻ được giới thiệu (`introducedOn`) nên **không rò**: đúng 10 thẻ mới/ngày |
| `bestScore` chưa từng viết | bỏ trống | `0` |
| Luật XP, level, streak, huy hiệu, FSRS, bước học, quiz | — | **Giống hệt** (được port và có test) |

Các lỗi giao diện đã biết nhưng **chưa sửa** (không thuộc phạm vi thay đổi này): lệch thang `level` 0–5 ↔ 0–2 ở lưới kana, thống kê "Đã rèn luyện",
heatmap lệch ngày — xem [STATUS.md §5](STATUS.md).

---

## 4. Mã đã comment

Mọi chỗ đã tắt đều có dấu **`[máy chủ — đang tắt]`**. Liệt kê chúng:

```bash
grep -rn "máy chủ — đang tắt" web/src web/next.config.mjs
```

| File | Đã làm | Mã gốc |
|---|---|---|
| `lib/api.ts` | `get/post/patch` chuyển sang bộ xử lý cục bộ | Khối comment cuối file: `fetch('/api/v1…')`, tự refresh token khi 401, gom refresh đồng thời |
| `lib/auth-context.tsx` | `AuthProvider` đọc hồ sơ từ `localStorage`; thêm `reloadUser`, `resetData` | Khối comment cuối file: khôi phục phiên bằng cookie, `login`, `register`, `loginWithGoogle`, `logout` |
| `lib/auth-proxy.ts` | Comment toàn bộ (thêm `export {};`) | Tách refresh token vào cookie httpOnly `kd_rt` |
| `app/api/auth/{login,register,google,refresh,logout}/route.ts` | Comment toàn bộ (thêm `export {};`) | BFF chuyển tiếp tới backend |
| `next.config.mjs` | Bỏ `rewrites()` | Rewrite `/api/v1/:path*` → `BACKEND_URL` |
| `app/(auth)/dang-nhap`, `dang-ky/page.tsx` | Thay bằng `redirect("/bang-dieu-khien")` | Toàn bộ trang |
| `app/(app)/bang-xep-hang/page.tsx` | Thay bằng thông báo "đang tạm tắt" | Toàn bộ trang |
| `app/(app)/ho-so/page.tsx` | Bỏ thẻ hạn mức, nút đăng xuất, email và nhãn gói; thêm nút xoá dữ liệu; `reloadUser()` sau khi lưu | Phần bị bỏ nằm trong comment `{/* … */}` |
| `components/app/Nav.tsx` | Ẩn mục "Xếp hạng" | Dòng bị comment |
| `app/page.tsx` (landing) | Ẩn nút/link "Đăng nhập", "Đăng ký"; "Tạo tài khoản miễn phí" → "Bắt đầu học ngay"; thêm link "Vào ứng dụng" | Phần bị bỏ nằm trong comment |

Không đổi: các trang `/luyen-viet`, `/on-tap`, `/tu-vung`, `/quiz`, `/bang-dieu-khien`, `PracticePanel`, `StrokeStage`, `stroke-match.ts` —
chúng không biết dữ liệu đến từ đâu. `components/app/GoogleButton.tsx` còn nguyên nhưng không trang nào dùng.

---

## 5. Bật lại bản có máy chủ

1. `lib/api.ts`: bỏ comment khối cuối file; xoá `import { handleLocal }`, hàm `api` và `RequestOptions` cục bộ ở đầu file. Bản gốc dùng `ApiError` trong `toError`, nên thay dòng `export { ApiError } from …` bằng `import { ApiError } from "./api-error"; export { ApiError };` (các trang import `ApiError` từ `@/lib/api`).
2. `lib/auth-context.tsx`: bỏ comment khối cuối, xoá bản `AuthProvider` cục bộ và phần `getUser`/`resetState`; bỏ comment các dòng `[máy chủ — đang tắt]` trong `interface AuthState`; trả lại `import` của `useRouter` và `setAccessToken`.
3. `lib/auth-proxy.ts` và 5 file `app/api/auth/*/route.ts`: bỏ tiền tố `// `, xoá `export {};`.
4. `next.config.mjs`: bỏ comment `rewrites()`. `BACKEND_URL` phải có sẵn **lúc build** ([DEPLOYMENT.md](DEPLOYMENT.md#giá-trị-nào-chốt-lúc-build-giá-trị-nào-đọc-lúc-chạy)).
5. Hai trang `(auth)`, trang `bang-xep-hang`: xoá đoạn `redirect`/thông báo ở đầu, bỏ tiền tố `// ` ở phần mã gốc.
6. `Nav.tsx`, `ho-so/page.tsx`, `app/page.tsx`: bỏ comment các dòng `[máy chủ — đang tắt]`, xoá phần thay thế.
7. Có thể xoá `lib/local/` và `data/{vocabulary,quizzes,badges}.json` (không bắt buộc). **Giữ** `lib/api-error.ts` và `data/kana-data.json`.
8. Chạy `npm run lint && npm run typecheck && npm test && npm run build`.
9. `scripts/smoke-test.sh` mặc định ở chế độ `local`; dùng `SMOKE_MODE=server scripts/smoke-test.sh <url>` cho bản có máy chủ, và thêm `SMOKE_MODE: server` vào bước "Smoke test" của job `docker` trong `.github/workflows/ci.yml`.

Dữ liệu trong `localStorage` **không tự chuyển lên máy chủ**: tài khoản mới ở bản có máy chủ bắt đầu từ số 0.

---

## 6. Ảnh hưởng tới CI và Docker

- Job **`web`** của CI (`lint`, `typecheck`, `test`, `build`) vẫn xanh — đã chạy lại với thay đổi này.
- Job **`docker`**: `scripts/smoke-test.sh` có hai chế độ qua biến `SMOKE_MODE`. Mặc định `local` kiểm tra web tự đứng được (trang chủ, bảng
  Hiragana/Katakana dựng tĩnh, robots/sitemap, `/bang-dieu-khien` mở được, `/dang-nhap` và `/dang-ky` → 307 về dashboard, và **không còn** đường tới backend:
  `/api/v1/*` → 404, `POST /api/auth/login` → 404/405). `SMOKE_MODE=server` giữ nguyên các bước gốc (rewrite → BFF → cookie → CORS). Workflow CI không phải đổi.
- `docker-compose.yml` vẫn dựng cả `db` và `backend` (web `depends_on` backend). Chế độ cá nhân không cần chúng; nếu chỉ chạy web, dùng `npm run dev` hoặc bỏ phụ thuộc đó.
- Healthcheck của image web (`/dang-nhap`) vẫn qua: `wget` theo redirect tới dashboard.

---

## 7. Kiểm chứng (2026-10-01)

| Việc | Kết quả |
|---|---|
| `npm test` | 74/74 (22 cũ + 52 mới: port FSRS khớp `FsrsEngineTest`, streak/thẻ băng/múi giờ/huy hiệu, toàn bộ luồng API cục bộ) |
| `npm run lint`, `npm run typecheck` | Sạch |
| `npm run build` | Thành công, 23 trang/route |
| Chạy thật trên trình duyệt (không có backend) | Dashboard, Ôn tập, Từ vựng, Quiz, Hồ sơ, Xếp hạng (thông báo), `/dang-nhap` → dashboard. Làm xong quiz gõ romaji: 7/8 = 88 điểm, +105 XP, streak 1, level 2, tải lại vẫn còn; **không có request nào tới `/api/`** |
| `scripts/smoke-test.sh` | Chạy trên bản build standalone (`node server.js`, như image Docker): chế độ `local` 10/10 bước; `SMOKE_MODE=server` đỏ đúng ở bước rewrite khi không có backend; `SMOKE_MODE` sai bị từ chối |
| Chưa kiểm | Vẽ nét trên canvas rồi nộp qua bộ xử lý cục bộ (luồng ghi bài viết chỉ được test ở mức hàm; phần canvas không đổi); chạy job `docker` trên CI (`docker compose` dựng cả stack) |
