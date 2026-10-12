# Kana Dōjō — Dōjō học tiếng Nhật của riêng bạn

Ứng dụng web **công khai** để học tiếng Nhật theo cách của chính bạn: tập viết Hiragana/Katakana đúng thứ tự nét, ôn bằng thuật toán lặp lại ngắt quãng FSRS-6, luyện gõ — và **mỗi người mở trang có một dōjō riêng**:
bạn chọn công cụ nào hiện ra, tự soạn ghi chú, bộ thẻ và câu luyện gõ, rồi quyết định cách học (thẻ mới mỗi ngày, độ dày lịch ôn, học gì, theo thứ tự nào).

**Không tài khoản, không cơ sở dữ liệu, không máy chủ ứng dụng.** Ai mở trang cũng có ngay một không gian riêng. Toàn bộ site là tệp tĩnh (HTML/JS/CSS); tiến độ và mọi thứ bạn tự soạn nằm trong `localStorage` của chính trình duyệt bạn và không bao giờ rời khỏi máy.
Site là **PWA**: cài ra màn hình chính như một ứng dụng và chạy được khi không có mạng.

```
kana-dojo/
├── docs/
│   ├── SPEC.md            Đặc tả kỹ thuật — dữ liệu, không gian riêng, FSRS, XP/streak/huy hiệu, chấm nét, nhập con trỏ, PWA
│   ├── ARCHITECTURE.md    Kiến trúc, không gian riêng, độ bền dữ liệu, PWA/offline, giao diện, hướng mobile, quyết định thiết kế
│   ├── DEVELOPMENT.md     Môi trường phát triển, quy ước code, cách kiểm thử (kể cả PWA và cảm ứng)
│   ├── DEPLOYMENT.md      Đưa site lên mạng: HTTPS, domain, Nginx, CI
│   ├── TYPING.md          Phòng luyện gõ tiếng Nhật — nghiên cứu, thiết kế, quyết định khi gộp vào site tĩnh
│   ├── MOBILE_FLUTTER.md  Phiên bản mobile bằng Flutter — nghiên cứu, thiết kế, tính năng nâng cấp, lộ trình (đề xuất)
│   ├── CONTRACT.md        Hợp đồng dữ liệu và hành vi web ↔ mobile: tệp tiến độ, nội dung, fixture, khác biệt JS/Dart (đặc tả)
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
| **Dōjō của riêng bạn** | Lần đầu mở có màn dựng không gian (bỏ qua được): tên, điểm xuất phát (học đầy đủ / chỉ tập viết kana / tự soạn từ trang trắng), mục tiêu ngày. Bạn **bật/tắt và sắp xếp** công cụ trên thanh điều hướng, chọn **khối nào hiện ở Tổng quan**, viết **mục đích học** của mình. Tắt công cụ chỉ ẩn nó, dữ liệu vẫn giữ |
| **Thư viện của tôi** | `/thu-vien`: **ghi chú/tài liệu** tự soạn (tự lưu, ghim, tìm, tải `.md`; cú pháp nhẹ + furigana `{漢字|かんじ}`), **bộ thẻ** tự soạn (thêm/sửa, dán nhiều thẻ từ Excel/Anki, xuất, bật/tắt từng bộ, hỏi cả hai chiều) vào thẳng hàng ôn FSRS; nút **Học ngay** mở phiên học tập trung trên một bộ (lật thẻ 3D, tự đánh giá Đã nhớ/Chưa nhớ, tổng kết, ôn lại thẻ chưa nhớ, lưu phiên dở để học tiếp — không đổi lịch FSRS), và **câu luyện gõ** riêng. Ghi chú ghim hiện ở Tổng quan |
| **Cách học do bạn chọn** | Cài đặt › Cách học: thẻ mới mỗi ngày (0–100), cỡ phiên ôn, **mức nhớ mục tiêu** của FSRS (70–97%), nguồn thẻ nào vào ôn (viết kana, đọc kana, từ vựng có sẵn, bộ thẻ của tôi), phạm vi kana, thứ tự cấp thẻ mới |
| **Tập viết có hướng dẫn** | Vẽ nét trên canvas, so khớp với dữ liệu KanjiVG, điểm 0–100. Chuột, cảm ứng và bút; chỉ một con trỏ được viết cùng lúc nên ngón thứ hai/lòng bàn tay không phá nét |
| **FSRS-6** | Lặp lại ngắt quãng thế hệ mới — điểm tập viết tự động xác định cấp độ ghi nhớ |
| **Streak & XP** | Chuỗi ngày học, điểm kinh nghiệm, level, 9 huy hiệu thành tích |
| **Quiz** | 4 bài mẫu (trắc nghiệm + gõ romaji), đếm giờ, chấm và giải thích từng câu |
| **Luyện gõ tiếng Nhật** | `/luyen-go`: gõ theo câu mẫu, bấm giờ và chấm điểm — 3 cách nhập (romaji, kana JIS, bộ gõ IME/flick) × 7 loại văn bản (hiragana, katakana, hỗn hợp, kanji có furigana, kana ngẫu nhiên, chữ hay sai, **câu của tôi**) × 3 chế độ (bài mẫu, đua giờ, sinh tử); màn gõ chỉ có tiếng Nhật, có gợi ý khi kẹt và nghe chép. Kỷ lục lưu trên trình duyệt; không cộng XP/streak ([docs/TYPING.md](docs/TYPING.md)) |
| **Từ vựng JLPT** | 70 từ N5 + 10 từ N4, nghĩa tiếng Việt, câu ví dụ; tìm kiếm không cần gõ dấu; **thêm từng từ (hoặc cả danh sách đang lọc) vào bộ thẻ của bạn** để ôn theo lịch |
| **PWA & offline** | Cài ra màn hình chính (Chrome/Edge: nút cài; iPhone/iPad: Thêm vào Màn hình chính); sau lần mở đầu tiên chạy được khi không có mạng |
| **Sao lưu** | Một tệp JSON chứa tiến độ **và** không gian riêng (ghi chú, bộ thẻ, câu gõ, công cụ, cách học) để chuyển máy hoặc phòng khi xoá dữ liệu trình duyệt. Vẫn nhập được tệp tiến độ của bản cũ. Có "Xoá việc học, giữ tài liệu của tôi" |
| **Bảng chữ cái công khai** | `/bang-chu-cai/hiragana`, `/bang-chu-cai/katakana` dựng sẵn cho SEO; bấm một chữ để vào luyện viết đúng chữ đó |

### Điều cần biết khi không có tài khoản

- Tiến độ **và mọi thứ bạn tự soạn** gắn với trình duyệt + thiết bị: không tự đồng bộ giữa điện thoại và máy tính. Dùng *Cài đặt › Dữ liệu* để sao lưu và chuyển.
- Không gian riêng có trần dung lượng (~1 triệu ký tự, ≈ 2 MB trong trình duyệt) để không bao giờ chiếm hết bộ nhớ trang; chạm trần thì việc thêm bị từ chối kèm thông báo (xoá thì luôn được).
- Xoá dữ liệu trang web, hoặc dùng chế độ riêng tư, sẽ làm mất tiến độ. Ứng dụng báo rõ khi trình duyệt không cho lưu.
- **Safari trên iPhone/Mac xoá dữ liệu của trang web sau 7 ngày không mở**; bản cài ra Màn hình chính được miễn quy tắc đó, nhưng trên iOS bản đã cài có **kho dữ liệu riêng** — tiến độ ở Safari phải tải về rồi khôi phục vào app.
- Đổi domain hay `http`↔`https` cũng làm tiến độ "biến mất" (mỗi origin một kho). Chi tiết và số đo: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#dữ-liệu-nằm-ở-đâu-và-khi-nào-mất).
- Không có bảng xếp hạng (cần dữ liệu chung giữa người dùng) và không có gói PRO/giới hạn lượt học — mọi thứ mở cho mọi người.
- Một trình duyệt = một không gian. Máy dùng chung nhiều người chưa có hồ sơ riêng cho từng người.

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
│   ├── (app)/                   Khu vực học — khung có thanh điều hướng (theo công cụ người học bật) + màn dựng lần đầu
│   │   ├── bang-dieu-khien/     Tổng quan: các khối do người học chọn — việc hôm nay, số liệu, XP, heatmap, huy hiệu, ghi chú ghim
│   │   ├── thu-vien/            Thư viện của tôi: ghi chú · bộ thẻ · câu luyện gõ
│   │   ├── luyen-viet/          Tập viết (nhận ?c=あ để mở thẳng một chữ)
│   │   ├── luyen-go/            Luyện gõ tiếng Nhật (chọn bài → gõ → kết quả)
│   │   ├── on-tap/              Ôn tập SRS
│   │   ├── tu-vung/             Từ vựng
│   │   ├── quiz/ , quiz/[id]/   Danh sách và màn làm bài
│   │   └── cai-dat/             4 tab: hồ sơ · công cụ · cách học · dữ liệu (sao lưu / khôi phục / xoá)
│   ├── not-found.tsx · robots.ts · sitemap.ts
│   ├── manifest.ts · apple-icon.png        PWA: manifest và icon cảm ứng iOS
├── components/
│   ├── app/                     Brand, Nav, Onboarding, ThemeToggle, InstallCard, ServiceWorkerRegister
│   ├── library/                 NotesPane, DecksPane, TextsPane, RichText
│   ├── settings/                ProfileTab, ToolsTab, StudyTab, DataTab, ReorderList, NumberSetting
│   ├── kana/                    StrokeStage, KanaGrid, PracticePanel, HeroDemo
│   ├── quiz/QuizRunner.tsx
│   ├── typing/                  TypingSetup, TypingStage, TypingResult, PhraseView, useTypingGame
│   └── ui/index.tsx             Design system: Button, Card, Field, Chip, Progress, Stat, …
├── data/
│   ├── kana-data.json           Dữ liệu nét 208 ký tự (57 KB, ~20 KB gzip)
│   ├── vocabulary.ts · quizzes.ts · badges.ts   Nội dung tĩnh
│   └── typing-texts.ts          Kho câu mẫu luyện gõ, kanji viết {chữ|cách đọc}
└── lib/
    ├── fsrs.ts                  FSRS-6 — thuần hàm
    ├── stroke-match.ts          Bộ chấm điểm nét — arc-length resampling, thuần hàm
    ├── pointer-gate.ts          Cổng con trỏ: một con trỏ viết tại một thời điểm (chuột/cảm ứng/bút)
    ├── pwa.ts                   Nhận diện ngữ cảnh cài đặt (đã cài / iOS / còn lại)
    ├── kana.ts                  Truy cập dữ liệu nét đã bundle
    ├── vocabulary.ts            Lọc/tìm từ vựng (bỏ dấu)
    ├── types.ts
    ├── typing/                  Bộ máy luyện gõ: romaji.ts (bảng IME), kana-layout.ts (JIS), engine.ts, ime.ts, phrases.ts, score.ts, history.ts
    ├── space/                   Không gian riêng của người học (SPEC §2.3)
    │   ├── space.ts             Schema (zod) + mặc định + thao tác hồ sơ/công cụ/cách học
    │   ├── library.ts           Ghi chú, bộ thẻ, thẻ, câu gõ; nhập/xuất thẻ dạng văn bản
    │   ├── store.ts · hooks.ts  localStorage `kd.space.v1` + React
    │   └── markup.ts · modules.ts · presets.ts · schedule.ts
    ├── backup.ts                Tệp sao lưu bọc: tiến độ + không gian riêng
    └── learning/                Bộ máy học chạy trong trình duyệt
        ├── context.ts           Cách học (StudyOptions) + thẻ tự soạn (Catalog) đi vào bộ máy qua tham số
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
npm test              # Vitest — 426 test (24 tệp)
npm run lint
npm run typecheck
npm run build         # xuất bản tĩnh vào out/ và sinh out/sw.js
```

Toàn bộ logic học (FSRS, hàng đợi, XP/streak/múi giờ, huy hiệu, quiz, lưu trữ), cổng con trỏ và service worker là hàm thuần hoặc chạy trên `localStorage`/Cache API giả,
nên test chạy trong Node, không cần trình duyệt hay Docker. CI (GitHub Actions) chạy các lệnh trên cho mỗi pull request, rồi dựng
container bằng `docker compose` và chạy `scripts/smoke-test.sh` — xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#ci-github-actions).

---

## Trạng thái build đã kiểm chứng

**Kiểm chứng ngày 2026-10-05 — không gian riêng** (bản build tĩnh, Chromium thật, 3 lần chạy liên tiếp đều đạt):

- `npm test` 426/426 (24 tệp) · `npm run lint` sạch · `tsc --noEmit` sạch · `next build` — 23 route tĩnh (thêm `/thu-vien`), `sw.js` precache 83 tệp; `scripts/smoke-test.sh` qua mọi kiểm tra trang và PWA (kể cả `/thu-vien` và *mọi* URL precache trả 200)
- **Màn dựng lần đầu:** chọn tên + "Tự soạn từ trang trắng" → điều hướng chỉ còn đúng 5 công cụ, thanh bên ghi "Dōjō của Vũ", lời chào "おかえり、Vũさん！"
- **Ghi chú:** soạn → tự lưu → xem (tiêu đề, danh sách, **in đậm**, furigana `<ruby>`) → ghim → tải lại vẫn còn; HTML thô (`<img onerror>`, `<script>`) hiện nguyên là chữ, không chạy mã, không sinh phần tử
- **Bộ thẻ:** thêm bằng form, dán nhiều thẻ (đọc được 3, bỏ 1 dòng hỏng, bỏ qua thẻ trùng); bật "hỏi cả hai chiều"; **Ôn tập** ra thẻ do mình soạn (không phải kana) → lật → chấm "Được" → FSRS hẹn lịch → lịch được lưu và hiện lại ở bộ thẻ
- **Câu luyện gõ:** `abc` và kanji trần bị chặn ngay lúc soạn (nêu cách viết đúng); câu `{水|みず}をください` gõ trọn 5 lượt bằng phím thật ở romaji → ra màn kết quả
- **Cài đặt:** bật Quiz → thêm vào thanh bên; ▲ đưa lên một bậc; Tổng quan/Cài đặt không có nút di chuyển; "Thẻ mới mỗi ngày" 9999 → kẹp về 100
- **Sao lưu:** tệp `format: 2` có `progress` v1 + `space`; *Xoá sạch mọi thứ* → quay lại màn chào (kỷ lục gõ cũng mất) → *Khôi phục từ tệp* ở màn chào → tên, ghi chú, bộ thẻ trở lại; tệp sai một phần bị từ chối và `localStorage` giữ nguyên **từng byte**
- **Người dùng cũ** (có `kd.progress.v1`, chưa có `kd.space.v1`): không bị chặn bởi màn chào, thấy đủ 8 công cụ gồm Thư viện
- **Điện thoại 375 px:** thanh dưới 5 mục + "Thêm" (Cài đặt vẫn với tới được), không tràn ngang ở Tổng quan và Thư viện
- Chưa kiểm: phím tắt/trợ năng của các màn mới bằng trình đọc màn hình thật; dung lượng thực của `localStorage` trên Safari iOS (trần 1 triệu ký tự chọn theo mốc 5 MiB của tài liệu, chưa đo trên thiết bị)

**Kiểm chứng ngày 2026-10-02 (còn nguyên, chưa chạy lại trong lần trên):**

- **End-to-end trong trình duyệt:** viết đủ 3 nét あ → +25 XP, huy hiệu "Nét đầu tiên", thẻ REVIEW hẹn 8 ngày → tải lại trang vẫn còn → Ôn tập cấp đúng 9 thẻ mới (hạn mức 10/ngày)
- **Luyện gõ** (bản build tĩnh): `/luyen-go` với romaji + bài mẫu 5 câu bằng phím thật — phím sai bị từ chối và được đếm, màn kết quả hiện điểm, đai, kỷ lục và chữ hay sai. Kana JIS, IME, đua giờ, sinh tử, nghe chép **chưa chạy lại** (engine có test)
- **Đa điểm chạm** (sự kiện con trỏ giả lập, chưa thử trên thiết bị thật): ngón thứ hai chạm giữa nét → nét vẫn được chấm; `pointercancel` → nét dở bị bỏ, không chấm; bút giành quyền từ lòng bàn tay
- **PWA:** manifest, icon, `apple-touch-icon` và meta iOS được phục vụ đúng. Logic service worker được kiểm bằng test Node (Cache API giả) — **vòng đời service worker chưa được kiểm trong trình duyệt thật**: trình duyệt nhúng trong môi trường phát triển không cho đăng ký service worker (kể cả tệp một dòng)
- **Docker:** `docker compose up --build --wait` + `scripts/smoke-test.sh` chạy trong CI; chưa được chạy cục bộ. Hai kiểm tra header cuối của `smoke-test.sh` nhắm vào `web/nginx.conf` nên chỉ đạt trên Nginx thật (trên `serve` trơn thì `X-Content-Type-Options` trượt — không phải lỗi mã)

---

## Giới hạn đã biết (cố ý)

| Hạng mục | Trạng thái |
|---|---|
| Thẻ từ vựng có sẵn trong hàng đợi ôn | Mặc định vẫn đứng sau kana (hạn mức thẻ mới dùng chung, thẻ kana được cấp trước). Người học tự gỡ được: đổi thứ tự cấp thẻ sang "Xen kẽ", tắt nguồn kana, hoặc thêm từng từ vào **bộ thẻ riêng** ở trang Từ vựng |
| Nội dung | Nội dung **đóng gói** (kana, 80 từ, quiz) vẫn sửa trong `web/src/data/*.ts` rồi build lại, không có trang admin. Nội dung **của riêng bạn** soạn ngay trong Thư viện |
| Quiz | Chỉ có đề đóng gói; chưa sinh đề từ bộ thẻ của bạn. Đáp án nằm trong bundle JS (không có máy chủ để giấu) — phù hợp tự học, không phù hợp thi có tính điểm |
| Đồng bộ nhiều thiết bị | Không có (xem trên). Sao lưu thủ công bằng tệp JSON |
| Nhiều người trên một máy | Một trình duyệt = một không gian; chưa có hồ sơ riêng cho từng người |
| Dung lượng không gian riêng | Trần ~1 triệu ký tự (≈ 2 MB), cùng trần từng mục (500 ghi chú, 50 bộ thẻ, 5.000 thẻ, 500 câu gõ). Chạm trần thì việc thêm bị từ chối kèm thông báo; xoá luôn được |
| XP từ thẻ tự soạn | Thẻ tự soạn cộng XP/streak như mọi thẻ ôn. Site cá nhân, không bảng xếp hạng nên không có gì để gian lận với ai |
| Màu giao diện | Không có màu nhấn tuỳ chọn: màu đỏ mang nghĩa "sai/xoá/cảnh báo" nên đổi nó làm lỗi trông như thông tin thường (xem ARCHITECTURE) |
| Offline / cài đặt | Chưa thử service worker và nút cài trên trình duyệt thật hay iPhone thật (xem trên). Bản mới chỉ có hiệu lực khi đóng hết tab của bản cũ, không có thông báo "có bản mới" |
| Lưu bền | Chưa gọi `navigator.storage.persist()` và chưa có nhắc sao lưu định kỳ — dữ liệu "best-effort" vẫn có thể bị trình duyệt dọn khi máy đầy (xem ARCHITECTURE). Ghi thất bại thì có banner cảnh báo |
| Luyện gõ | Kỷ lục lưu riêng (`kd.typing.history.v1`), **chưa nằm trong tệp sao lưu** và không cộng XP/streak — quyết định và cách đổi ở [docs/TYPING.md §3.4](docs/TYPING.md) |
| App mobile native | Mới có PWA. Định hướng và các lựa chọn (Capacitor / Expo / Flutter) ở [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#hướng-mobile); phân tích chi tiết cho Flutter ở [docs/MOBILE_FLUTTER.md](docs/MOBILE_FLUTTER.md) |
| Dữ liệu cũ trên PostgreSQL | Phiên bản có tài khoản lưu tiến độ trên máy chủ; không có công cụ chuyển sang tiến độ cục bộ |

---

## Tài liệu liên quan

| Tài liệu | Mục đích |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Đặc tả kỹ thuật — mô hình dữ liệu, **không gian riêng và tệp sao lưu (§2)**, FSRS, trò chơi hoá, **thuật toán chấm nét (§6)**, nhập con trỏ, PWA |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kiến trúc, **không gian riêng**, độ bền dữ liệu theo nền tảng, PWA/offline, thiết kế giao diện, hướng mobile, quyết định thiết kế |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Thiết lập môi trường dev, quy ước code, cách kiểm thử, sự cố đã gặp |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Đưa site lên mạng: máy chủ tĩnh, Docker, Nginx, HTTPS/domain, CI |
| [docs/TYPING.md](docs/TYPING.md) | Phòng luyện gõ: cách người Nhật gõ chữ, kiểu bài, chấm điểm, bộ máy so khớp, quyết định khi gộp vào site không tài khoản |
| [docs/CONTRACT.md](docs/CONTRACT.md) | Hợp đồng web ↔ mobile: tệp tiến độ (và tệp sao lưu bọc), nội dung dùng chung, bảng mẫu nét, fixture hành vi, những chỗ JS và Dart khác nhau (đã đo) |
| [docs/MOBILE_FLUTTER.md](docs/MOBILE_FLUTTER.md) | Phiên bản mobile bằng Flutter: kiến trúc, port engine (đã chạy thử), khung viết nét, tính năng native, nâng cấp học thuật, cửa hàng ứng dụng, lộ trình — **đề xuất, chưa triển khai** |

---

## Giấy phép

Dữ liệu thứ tự nét trích từ [KanjiVG](http://kanjivg.tagaini.net) © Ulrich Apel,
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) — share-alike, cho phép dùng thương mại.
Nếu phát hành lại `kana-data.json` hoặc bản dẫn xuất, phải ghi công KanjiVG và giữ nguyên giấy phép đó cho phần dữ liệu.
