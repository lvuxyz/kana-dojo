# Kana Dōjō Mobile (Flutter): nghiên cứu, thiết kế và lộ trình

> **Trạng thái: đề xuất, chưa triển khai.** Viết ngày 2026-10-02 dựa trên mã nguồn web ở commit `368c04b`, các phép chạy thử trong repo này và tài liệu chính thức của nền tảng.
> Tài liệu này đi sâu hơn mục "Hướng mobile" trong [ARCHITECTURE.md](ARCHITECTURE.md#hướng-mobile) (mục đó vẫn đúng, chỉ ngắn).
> Hợp đồng chuẩn giữa web và mobile (tệp tiến độ, nội dung, hành vi engine, khác biệt JS/Dart đã đo): [CONTRACT.md](CONTRACT.md). Tài liệu này dẫn tới đó thay vì lặp lại.

**Cách đọc độ tin cậy.** Mỗi khẳng định quan trọng mang một nhãn:

| Nhãn | Nghĩa |
|---|---|
| ✅ | Đã chạy hoặc đo trong repo này — có lệnh tái chạy (xem [phụ lục A](#phụ-lục-a-kết-quả-spike)) |
| 📘 | Lấy từ tài liệu / nguồn chính thức (liên kết ở [phụ lục F](#phụ-lục-f-nguồn-tham-khảo)), tra cứu ngày 2026-10-02 |
| 📐 | Ước lượng hoặc đề xuất thiết kế — chưa kiểm chứng |
| ❓ | Chưa biết, phải thử trên thiết bị / nền tảng thật |

## Mục lục

1. [Tóm tắt](#1-tóm-tắt)
2. [Phạm vi và nguyên tắc](#2-phạm-vi-và-nguyên-tắc)
3. [Kiểm kê web: cái gì phải mang sang](#3-kiểm-kê-web-cái-gì-phải-mang-sang)
4. [Quyết định kiến trúc](#4-quyết-định-kiến-trúc)
5. [Port engine học](#5-port-engine-học)
6. [Khung viết nét](#6-khung-viết-nét)
7. [Màn hình và giao diện](#7-màn-hình-và-giao-diện)
8. [Dữ liệu, nội dung và phông chữ](#8-dữ-liệu-nội-dung-và-phông-chữ)
9. [Tính năng native: phần nâng cấp so với web](#9-tính-năng-native-phần-nâng-cấp-so-với-web)
10. [Nâng cấp phương pháp học và nội dung](#10-nâng-cấp-phương-pháp-học-và-nội-dung)
11. [Phát hành và vận hành](#11-phát-hành-và-vận-hành)
12. [Kiểm thử và chất lượng](#12-kiểm-thử-và-chất-lượng)
13. [Rủi ro](#13-rủi-ro)
14. [Lộ trình và ước lượng](#14-lộ-trình-và-ước-lượng)
15. [Quyết định cần chốt](#15-quyết-định-cần-chốt)
16. Phụ lục: [A. Kết quả spike](#phụ-lục-a-kết-quả-spike) · [B. Ánh xạ TypeScript sang Dart](#phụ-lục-b-ánh-xạ-typescript-sang-dart) · [C. Gói đề xuất](#phụ-lục-c-gói-đề-xuất) · [D. Kiểm tra tệp nhập](#phụ-lục-d-kiểm-tra-tệp-nhập) · [E. Định dạng fixture](#phụ-lục-e-định-dạng-fixture) · [F. Nguồn tham khảo](#phụ-lục-f-nguồn-tham-khảo)

---

## 1. Tóm tắt

**Kết luận: làm được, và phần rủi ro nhất không phải là thuật toán.**

1. **Engine học port được gần như nguyên văn.** Phần logic của web là 1.316 dòng TypeScript thuần hàm ✅. Spike: bản port Dart cho kết quả **trùng web trên 29.773 bước FSRS (500 thẻ) và 1.500 nét viết** — 0 sai khác ở trạng thái thẻ, lịch ôn (`dueAt`), điểm nét và lý do lỗi ✅. Rủi ro thật nằm ở khung viết nét trên màn hình cảm ứng (cử chỉ hệ thống, lòng bàn tay, bút), ở vận hành (build iOS, cửa hàng ứng dụng) và ở việc giữ hai bản engine không lệch nhau theo thời gian.
2. **Port tay, đừng dùng gói `fsrs` của Dart.** Gói 2.0.1 mặc định bộ tham số khác `W` của web (W[0] = 0,2172 so với 0,212; W[3] = 16,1507 so với 8,2956…) và bật *fuzzing* ngẫu nhiên sẵn 📘. Dùng nó thì lịch ôn của mobile lệch web ngay từ thẻ đầu tiên và không tái lập được.
3. **Năm bẫy port đã lộ ra khi chạy thử** ✅ (mục 5.3): `Math.round` khác `round()`; `List.sort` của Dart không ổn định (đảo thứ tự ở 200/200 lần chạy từ 100 phần tử, trong khi test nhỏ vẫn qua); `pow`/`exp` lệch ở bit cuối; JSON số nguyên với số thực; `trim()` coi U+0085 là khoảng trắng còn JS thì không. Thêm một sai lệch **hình học**: `PathMetric` của Flutter lệch trình duyệt tới **0,456 đơn vị** (độ dài tới 1,23%) — đã tái lập độc lập và đo tác động: điểm lệch tối đa 1, lật ngưỡng chấm ≈ 0,05% số nét. Nên dùng chung một bảng mẫu nét (mục 5.6) để hai nền tảng cho điểm giống hệt.
4. **Không cần thư viện SVG.** Dữ liệu nét chỉ dùng hai lệnh `M` và `c` (433 `M`, 1.175 `c`) ✅; bộ phân tích 30 dòng cho kết quả bit-by-bit giống web trên cả 433 nét thật ✅. `path_drawing` mà ARCHITECTURE.md từng gợi ý vẫn đọc được path (phiên viết CONTRACT.md đã chạy nó trên cả 433 nét) nhưng không cập nhật từ 2022-08 và khai báo `sdk <3.0.0` 📘 — dùng được; tự viết 30 dòng thì đỡ một phụ thuộc không bảo trì.
5. **Hợp đồng dữ liệu là `ProgressState` v1.** Mobile đọc và ghi đúng khối JSON này thì tệp sao lưu của web nhập được vào app, và ngược lại — không cần tài khoản hay đồng bộ. Lưu bằng **một tệp JSON ghi nguyên tử** trong thư mục ứng dụng; Android Auto Backup và iCloud backup cho độ bền miễn phí, **khắc phục điểm yếu lớn nhất của bản web** (Safari xoá dữ liệu sau 7 ngày không dùng).
6. **Môi trường dev hiện tại chưa sẵn sàng** ✅: máy có Flutter **3.35.4 / Dart 3.9.2**, trong khi các gói đề xuất (Riverpod 3.4.3, go_router 18.0.2, ML Kit 0.16.1…) đòi Dart ≥ 3.12 / Flutter ≥ 3.44 📘 — phải nâng lên Flutter 3.47 (stable hiện hành). Android SDK thiếu `cmdline-tools`, chưa chấp nhận license; máy Windows không build được iOS → cần macOS (CI hoặc máy thật).
7. **Cửa hàng có mốc cứng** 📘: Google Play yêu cầu target API 36 từ 2026-08-31 (đang hiệu lực) và hỗ trợ 16 KB page size từ 2027-02-01; tài khoản nhà phát triển cá nhân mới phải chạy closed test 12 người × 14 ngày liên tục; Apple yêu cầu Xcode 26 từ 2026-04-28 và khai báo Privacy Manifest cho `UserDefaults`.
8. **Lợi thế native lớn nhất** (mục 9): nhắc ôn tập và chuỗi ngày bằng thông báo cục bộ, widget màn hình chính, độ bền dữ liệu, âm thanh chuẩn, bút (Apple Pencil/S Pen). **Nâng cấp học thuật đáng đầu tư nhất** (mục 10): lưu nhật ký ôn (*revlog*) để tối ưu tham số FSRS theo từng người và để đồng bộ không mất dữ liệu; sửa các khoảng hở của lộ trình học hiện tại (thẻ từ vựng chỉ xuất hiện sau ≈ 21–42 ngày; thẻ đọc và từ vựng vẫn tự chấm).
9. **Phát hiện thêm trên bản web, nên xử lý trước khi nhân đôi sang mobile**: chữ nhỏ màu `gold` trên nền giấy chỉ đạt **3,4 : 1** (dưới ngưỡng AA 4,5 : 1); nút chính chữ trắng ở giao diện tối chỉ **3,6 : 1** (còn **2,8 : 1** ở đầu gradient), số nét đã xong chữ trắng trên nền xanh chỉ **3,0 : 1** ✅; và web vẫn tải font từ Google Fonts trong khi tài liệu nói không có request ngoài (mục 7.4, 8.3).
10. **Ước lượng** 📐: bản v1.0 ngang tính năng web ≈ **15–18 tuần-người** (một dev quen Flutter), nên dự phòng thêm 10–25% (→ 17–22 tuần); chưa tính đồ hoạ cửa hàng và nội dung mới (mục 14).

**Thứ tự đề xuất:** nâng toolchain và dựng monorepo + hợp đồng fixture → engine → khung viết nét (rủi ro cao nhất, làm sớm) → các màn hình → tính năng native → beta kín → nâng cấp theo mức ưu tiên ở mục 9–10.

---

## 2. Phạm vi và nguyên tắc

**Trong phạm vi v1**

- Android (điện thoại và máy tính bảng) và iOS (iPhone và iPad).
- Ngang tính năng web v2: tập viết (đồ nét / tự viết), ôn tập FSRS-6, từ vựng, quiz, XP / streak / huy hiệu, mục tiêu ngày, sao lưu / khôi phục / xoá tiến độ, giao diện sáng / tối. Chạy **hoàn toàn offline**.

**Ngoài phạm vi v1**

- Tài khoản, đồng bộ đám mây, bảng xếp hạng, mua trong ứng dụng, quảng cáo, thu thập số liệu.
- Flutter Web: web đã có (Next.js xuất tĩnh, tốt cho SEO) và Flutter Web hiện vẫn dùng Skia thay vì Impeller 📘. Không có lý do thay.

**Nguyên tắc**

1. **Không tài khoản, không máy chủ, không SDK theo dõi** → nhãn quyền riêng tư "không thu thập dữ liệu" (Apple *Data Not Collected*; Play *Data safety*).
2. **Offline-first.** Mạng không bao giờ là điều kiện để học.
3. **Ngang web trước, nâng cấp sau.** Mỗi nâng cấp ở mục 9–10 tách khỏi v1 để không làm trễ nó.
4. **Hợp đồng dữ liệu bất biến**: `ProgressState` + `STATE_VERSION` (SPEC §2). Đổi định dạng thì đổi ở cả hai nền tảng cùng lúc, có migrate.
5. **Engine là Dart thuần**, không import Flutter → test chạy bằng `dart test`, không cần máy ảo.
6. **Mọi hành vi của engine được chứng minh bằng fixture sinh từ chính mã web**, không bằng việc đọc code đối chiếu.
7. **Nội dung có một nguồn**: `web/src/data/` → sinh asset cho mobile (mục 8).

---

## 3. Kiểm kê web: cái gì phải mang sang

Đo ngày 2026-10-02 ✅ (`wc -l` trên `web/src`).

| Lớp | Nội dung | Quy mô | Cách mang sang | Rủi ro |
|---|---|---|---|---|
| **Engine thuần** | `fsrs` 252 · `stroke-match` 113 · `pointer-gate` 74 · `learning/{reviews 218, activity 146, state 105, badges 67, time 67, quiz 49, cards 38}` · `kana` 78 · `types` 92 · `vocabulary` 17 | **1.316 dòng** | Port sang Dart thuần (`kd_engine`) | Thấp — spike đã chứng minh |
| **Keo I/O + React** | `store` 154 · `hooks` 48 · `pwa` 23 | 225 dòng | Viết lại: `ProgressRepository` + Riverpod | Thấp |
| **Giao diện** | `components/` 1.903 · trang trong `app/` 1.590 | ≈ 3.500 dòng TSX | Viết lại bằng widget; không có gì tái dùng trực tiếp | Trung bình (khối lượng) |
| **Test** | 11 tệp, 109 test: 9 tệp ở `src/lib` (95 test, 1.185 dòng) + 2 tệp của service worker (14 test, không cần port) | 1.185 dòng đáng port | Nguồn của fixture; port logic test sang `dart test` | Thấp |
| **Nội dung tĩnh** | `kana-data.json` 59.123 B · `vocabulary.ts` 19,7 KB · `quizzes.ts` 9,1 KB · `badges.ts` 1,6 KB | 208 ký tự · 148 glyph · 433 nét · 80 từ · 4 quiz / 38 câu · 9 huy hiệu | Sinh asset từ nguồn web (mục 8) | Thấp |

Chi tiết nội dung ✅: 208 ký tự = 2 bảng chữ × (46 cơ bản + 25 biến âm + 33 âm ghép); **66 ký tự ghép gồm 2 glyph** (きゃ…) với `viewBox` giãn thành 218×109; ký tự nhiều nét nhất có 9 nét; tập chữ Nhật dùng trong toàn bộ nội dung là **310 glyph khác nhau** (gồm **160 chữ Hán** trong từ vựng và quiz).

**Không mang sang** (chỉ có ý nghĩa với web): service worker và manifest PWA, `InstallCard`, script chọn giao diện trong `<head>`, `nginx.conf` / Docker, `sitemap` / `robots`, các trang SEO `/bang-chu-cai/*`, trang giới thiệu `/` (thay bằng onboarding, mục 7.3).

---

## 4. Quyết định kiến trúc

### 4.1 Vì sao Flutter

Quyết định đã chọn; phần này ghi lại điều đánh đổi để không bị bất ngờ.

| Tiêu chí | Flutter | Capacitor (bọc bản web) | Expo / React Native |
|---|---|---|---|
| Tái dùng mã | Engine và UI viết lại (≈ 4.800 dòng) | ≈ 100% | Engine TS dùng chung; UI viết lại (≈ 3.500 dòng) |
| Khung viết nét | `CustomPainter` + sự kiện con trỏ thô (loại thiết bị, áp lực, `PointerCancelEvent`); mọi thiết bị vẽ như nhau | Canvas hiện có dùng nguyên; cử chỉ hệ thống và hành vi WebView khác nhau theo máy ❓ | Cần `react-native-svg` / Skia; phải tự lo cử chỉ |
| Độ bền dữ liệu | Tệp trong thư mục ứng dụng, nằm trong backup hệ điều hành | `localStorage`/IndexedDB của WebView **có thể bị hệ điều hành thu hồi** (ARCHITECTURE) | Tệp / SQLite |
| Rủi ro duyệt App Store | Có tính năng native thật | **Apple 4.2.2 loại app chỉ là "web clipping"** (ARCHITECTURE) | Có tính năng native thật |
| Chi phí về sau | **Hai bản engine** phải giữ khớp nhau (giảm bằng fixture, mục 5.6) | Một bản | Một bản engine |
| Build trên Windows | Android được, **iOS không** | Như Flutter | Như Flutter |

Điểm cộng riêng của Flutter cho sản phẩm này: render một đường dẫn (Path) không phụ thuộc WebView, Impeller là engine duy nhất trên iOS và mặc định trên Android API ≥ 29 (có phương án OpenGL cho máy thấp hơn) 📘, và test cử chỉ nhiều ngón bằng `WidgetTester` ngay trong CI (mục 12).
Điểm trừ cần chấp nhận: hai bản engine; hệ sinh thái plugin thay đổi nhanh; riêng 3.47 là đợt Material/Cupertino tách thành gói `material_ui` / `cupertino_ui` 1.0 và thư viện trong SDK sắp bị đánh dấu *deprecated* ở bản Fall stable tháng 11 📘 — nên **dự án mới dùng thẳng các gói tách rời, và giữ giao diện tuỳ biến (mục 7.4) để ít phụ thuộc widget Material**.

### 4.2 Cách giữ hai engine khớp nhau

| Phương án | Nguồn sự thật | Chi phí | Nhận xét |
|---|---|---|---|
| **(a) Port Dart + fixture sinh từ web** *(đề xuất)* | Mã TS; Dart được kiểm bằng fixture | Port 1.316 dòng (spike đã làm phần nặng nhất); mỗi lần đổi engine phải cập nhật hai nơi | Spike ✅ cho 0 sai khác; CI chặn lệch |
| (b) Nhúng JS engine (QuickJS / `flutter_js`) chạy chính bundle TS | Một bản duy nhất | Thêm runtime JS và cầu nối; debug khó; chi phí khởi động ❓ | Loại bỏ nguy cơ lệch nhưng đổi lấy phức tạp ở mọi nơi khác |
| (c) Lõi Rust + `flutter_rust_bridge` | Rust | Viết lại thành ba bản (TS, Rust, và web vẫn TS) trừ khi bỏ engine TS | Chỉ hợp nếu muốn dùng `fsrs-rs` (optimizer, mục 10.1); engine của ta có quy ước riêng nên không phải `fsrs-rs` nguyên bản |
| (d) Dart làm nguồn duy nhất, biên dịch sang JS/Wasm cho web | Dart | Đảo ngược kiến trúc web | Không khuyến nghị |

→ **Chọn (a).** Điều kiện để (a) an toàn: hợp đồng fixture ở mục 5.6 chạy trong CI của cả hai phía, và `STATE_VERSION` tăng đồng thời.

### 4.3 Cấu trúc repo (đề xuất)

```
kana-dojo/
├── web/                         giữ nguyên
├── mobile/
│   ├── pubspec.yaml             Dart pub workspace (Dart ≥ 3.6)
│   ├── packages/
│   │   ├── kd_engine/           Dart THUẦN (không import flutter): fsrs, stroke_match, pointer_gate, learning/*
│   │   └── kd_content/          asset sinh từ web/src/data (kana-data.json, content.json)
│   └── app/                     ứng dụng Flutter
│       └── lib/{features, ui, platform, l10n}
├── contract/                    (đề xuất) content/ (JSON), kana-samples.json, schema/, fixtures/ + script sinh — nguồn sự thật chung, đặc tả ở docs/CONTRACT.md
└── docs/
```

`kd_engine` không phụ thuộc Flutter nên chạy `dart test` trong vài giây trên mọi máy, kể cả CI Linux rẻ tiền. Phần phụ thuộc nền tảng (tệp, thông báo, âm thanh) nằm ở `app/lib/platform` sau các interface của engine.

### 4.4 Quản lý trạng thái: Riverpod

`flutter_riverpod` 3.4.3 (2026-09-03, Dart ^3.12) 📘. Ánh xạ trực tiếp từ web:

| Web | Flutter |
|---|---|
| `store.ts` (singleton + `subscribe`) | `ProgressRepository` (interface) + `progressProvider` là `AsyncNotifier<ProgressState>` |
| `useSyncExternalStore` và cờ `ready` | `AsyncValue.loading` trong lúc đọc tệp lúc khởi động |
| `useStats`, `useSummary`, `useHeatmap`, `useBadges`, `useKanaProgress` | provider dẫn xuất (`statsProvider`…) gọi hàm thuần của engine |
| `systemClock()` | `clockProvider` — test ghi đè bằng đồng hồ giả |
| `commit(outcome)` | `notifier.commit(outcome)`: gán state → ghi tệp → các provider dẫn xuất tự cập nhật |

Lý do chọn: test được mà không cần `BuildContext`, ghi đè được `clock` và kho lưu trữ trong test, và hợp với mô hình "hàm thuần trả `{ state, result }`" của engine. Bloc cũng dùng được; khác biệt chủ yếu là sở thích của nhóm.

### 4.5 Điều hướng và liên kết sâu

`go_router` 18.0.2 (2026-09-28; Dart ^3.12, Flutter ≥ 3.44) 📘. Thanh điều hướng dưới (mục 7.1), `StatefulShellRoute` giữ trạng thái từng tab.
Liên kết sâu `?c=あ` của web (từ bảng chữ cái công khai vào thẳng khung viết) có thể sống tiếp bằng **Android App Links / iOS Universal Links** nếu app và web dùng chung tên miền chính thức → web có thể hiện "Mở trong ứng dụng". Phụ thuộc vào việc chốt tên miền (xem [DEPLOYMENT.md](DEPLOYMENT.md): đổi domain là mất tiến độ web) 📐.

### 4.6 Lưu trữ

| Phương án | Hợp khi | Không hợp khi |
|---|---|---|
| **Một tệp JSON, ghi nguyên tử** *(đề xuất cho v1)* | Dữ liệu ≈ 290 KB ở kịch bản xấu nhất (ARCHITECTURE đã đo cho web: 576 thẻ + 5 năm hoạt động); một thao tác học ≈ 8 ms | Cần truy vấn, nhật ký lớn, nhiều tiến trình ghi đồng thời |
| `shared_preferences` 2.5.5 (bọc `NSUserDefaults` / `SharedPreferences`) | Cờ nhỏ (đã xem hướng dẫn, giờ nhắc) | Khối dữ liệu lớn: Android nạp cả tệp XML vào bộ nhớ; iOS dùng `UserDefaults` thì phải khai báo lý do trong Privacy Manifest (mục 11.2) |
| `drift` 2.35.1 (SQLite) | Khi thêm nhật ký ôn / đồng bộ (mục 9.9, 10.1) | v1: thừa |

**Quy tắc ghi:** ghi vào tệp tạm cùng thư mục → `flush` → `rename` đè lên tệp chính (nguyên tử trên cùng hệ tệp) → giữ một bản `.bak` của lần ghi thành công trước. Đọc lỗi → giữ nguyên bản hỏng thành `progress.corrupt.json` rồi dùng `.bak` (web chỉ giữ bản hỏng và bắt đầu từ rỗng — mobile làm tốt hơn được vì có `.bak`).
Giấu `ProgressRepository` sau interface để chuyển sang SQLite khi cần mà không động tới engine.

**Độ bền ngoài ứng dụng** 📘 (nguồn trong ARCHITECTURE): Android Auto Backup mặc định bật từ API 23, tối đa 25 MB, khôi phục khi cài lại → đặt tệp trong thư mục được sao lưu (không phải `noBackupFilesDir`/cache). iOS: thư mục Application Support nằm trong backup iCloud/iTunes, **đừng** đặt cờ loại trừ backup. Cả hai phải được kiểm bằng thử nghiệm cài lại (mục 12), không tin vào mặc định.

---

## 5. Port engine học

### 5.1 Bản đồ module

| TypeScript (`web/src/lib`) | Dart (`kd_engine`) | Lưu ý khi port | Test nguồn |
|---|---|---|---|
| `fsrs.ts` | `fsrs.dart` | ✅ Đã port trong spike. Hằng `FACTOR` tính từ `W[20]`; làm tròn bằng `jsRound` | `fsrs.test.ts` (10) |
| `stroke-match.ts` | `stroke_match.dart` | ✅ Đã port. Chuỗi hướng dẫn tiếng Việt (`dirText`, `posText`) → trả **mã**, dịch ở tầng giao diện | `stroke-match.test.ts` (13) |
| `pointer-gate.ts` | `pointer_gate.dart` | Máy trạng thái 74 dòng, không đụng nền tảng | `pointer-gate.test.ts` (8) |
| `learning/time.ts` | `day_clock.dart` | `Intl.DateTimeFormat` → giao diện `DayClock` (mục 5.4) | trong `activity`/`reviews` |
| `learning/state.ts` | `progress_state.dart` | zod → bộ phân tích thủ công, **giữ nguyên thứ tự kiểm tra** (mục 5.5, phụ lục D) | `store.test.ts` (13) |
| `learning/activity.ts` | `activity.dart` | XP, cấp độ, streak, thẻ băng, heatmap | `activity.test.ts` (12) |
| `learning/reviews.ts` | `reviews.dart` | **Sắp xếp ổn định** trong `buildQueue` (bẫy 2) | `reviews.test.ts` (24) |
| `learning/quiz.ts` | `quiz.dart` | `isCorrect`: `trim` + hạ chữ thường | `quiz.test.ts` (9) |
| `learning/badges.ts`, `cards.ts` | `badges.dart`, `cards.dart` | Danh mục huy hiệu và khoá thẻ `"<loại>:<mã>"` | trong `reviews.test.ts` |
| `kana.ts`, `vocabulary.ts`, `types.ts` | `content.dart` (+ mô hình) | `fold()` dùng chuẩn hoá Unicode (bẫy 5) | `vocabulary.test.ts` (3) |
| `store.ts` | `ProgressRepository` (ngoài `kd_engine`) | I/O tách khỏi engine | — |

### 5.2 Kiểu trả về

Giữ mô hình "hàm thuần trả `{ state, result }`" của web để mỗi hàm Dart đọc được song song với hàm TS tương ứng (giảm nguy cơ lệch khi bảo trì):

```dart
ReviewQueue buildQueue(ProgressState s, {int limit = 20, Set<ItemType>? types}, DayClock clock);
Outcome<GradeResult>   gradeCard(ProgressState s, String cardKey, Grade grade, int durationMs, DayClock clock);
Outcome<WritingResult> recordWriting(ProgressState s, WritingInput input, DayClock clock);
Outcome<QuizResult>    submitQuiz(ProgressState s, int quizId, Map<int, String> answers, int durationMs, DayClock clock);
```

`structuredClone` + sửa bản nháp của web được thay bằng `ProgressDraft`: `final draft = state.toDraft();` (bản sao sâu, có thể sửa) → sửa → `draft.freeze()` thành `ProgressState` bất biến. Cách này cho phép port **từng dòng** thay vì viết lại theo phong cách bất biến (cái khó kiểm chứng hơn).

### 5.3 Bẫy khi port (đã gặp và dự báo)

| # | Bẫy | Bằng chứng | Cách xử lý |
|---|---|---|---|
| 1 | **`Math.round` khác `num.round()`.** JS làm tròn nửa về +∞; Dart làm tròn nửa ra xa số 0. Khác nhau ở số *âm* có phần thập phân đúng 0,5: `Math.round(-2.5)` = −2, `(-2.5).round()` = −3 | ✅ chạy trực tiếp. Web dùng `Math.round` ở 8 chỗ trong `src/lib` (`fsrs.ts:93`, `activity.ts:38`, `quiz.ts:39`, `reviews.ts:166`, `store.ts:133`, `time.ts:51`, `stroke-match.ts:85,105`); hầu hết là số dương nên chưa lộ, nhưng `dirText` (`Math.round(ang / 45)`) nhận góc âm | Một hàm `jsRound` duy nhất, dùng ở mọi nơi. Không dùng `floor(x + 0.5)`: sai với `0.49999999999999994` (spike kiểm: `jsRound` ra 0 đúng) |
| 2 | **`List.sort` của Dart không ổn định** (JS `Array.sort` ổn định). `buildQueue` sắp thẻ đến hạn theo `dueAt`; thẻ trùng `dueAt` phải giữ thứ tự chèn | ✅ Với phần tử trùng khoá: **không đảo ở n ≤ 33** (Dart dùng insertion sort cho danh sách ngắn) nhưng **đảo ở 200/200 lần chạy khi n ≥ 100**. Tức test nhỏ vẫn qua, hàng đợi lớn mới sai. Tài liệu API xác nhận "not guaranteed to be stable" 📘 | Sắp bằng khoá phụ là chỉ số gốc, hoặc `mergeSort` của `package:collection`. Đưa case >100 thẻ trùng `dueAt` vào fixture |
| 3 | **`pow`/`exp` lệch ở bit cuối** giữa V8 và Dart | ✅ 29.773 bước: `difficulty` bit-exact 100%, `stability` bit-exact 82,5% (24.565/29.773); lệch tương đối lớn nhất **3,8e-15**; sau chuỗi cộng dồn 500 thẻ ≈ 8,9e-15 và **không làm đổi** trạng thái hay lịch ôn nào | So số thực bằng dung sai tương đối **1e-12**; so số nguyên, trạng thái, `dueAt` **tuyệt đối**. ⚠ Phép đo chỉ cho Dart VM x64; ARM64 dùng `libm` khác → phải chạy lại trên thiết bị/CI ARM ❓. Rủi ro còn lại: `intervalDays` rơi đúng .5 và lật khi làm tròn (xác suất cực nhỏ; 0 trường hợp trong 29.773 bước). Chấp nhận lệch ±1 ngày nhưng có bộ đếm cảnh báo |
| 4 | **Số nguyên và số thực trong JSON.** JS không phân biệt `1` và `1.0`; Dart `jsonDecode("1")` ra `int`, ép kiểu `as double` sẽ ném lỗi | ✅ `compare.dart` phải dùng `(v as num).toDouble()`. Web chấp nhận `stability: 1` (zod `z.number()`) nên tệp sao lưu có thể chứa số nguyên ở trường thực | Đọc mọi trường số qua `num`; ghi ra số thực. `dueAt`, `reps`… là `int` (mili-giây epoch vừa trong 64-bit) |
| 5 | **Chuẩn hoá Unicode.** `fold()` của tìm kiếm từ vựng dùng `normalize("NFD")` rồi bỏ dấu để gõ "ban" ra "bạn". Dart core **không** có chuẩn hoá Unicode | 📐 (suy từ API; chưa chạy) | Hoặc gói bỏ dấu (như `diacritic`), hoặc bảng ánh xạ tự viết — app chỉ cần tiếng Việt và Latin. Tính trước `searchText` đã bỏ dấu cho 80 từ ngay ở bước sinh nội dung; chỉ truy vấn của người dùng cần `fold` lúc chạy. Có test: "ban" tìm ra "bạn", "dong" tìm ra "đồng" |
| 6 | **Sao chép trạng thái** (`structuredClone`) | — | `ProgressDraft` như mục 5.2 |
| 7 | **Múi giờ** (`Intl.DateTimeFormat` với IANA zone) | — | Mục 5.4 |
| 8 | **`String.trim()`.** Dart coi U+0085 (NEL) là khoảng trắng, JS thì không. `isCorrect` của quiz so khớp sau `trim` | ✅ Thử 10 ký tự: khác nhau **chỉ ở U+0085**; U+00A0, U+3000, U+FEFF, U+1680, U+2028, U+000B cả hai bỏ; U+200B, U+180E, U+001C cả hai giữ (phát hiện bởi phiên viết CONTRACT.md, tái lập ở đây) | Hàm `jsTrim` dùng đúng tập khoảng trắng của JS; fixture quiz có `\u0085` |

Ngoài ra (nhỏ): `Object.values(state.cards)` duyệt theo thứ tự chèn với khoá không phải số nguyên — `LinkedHashMap` của Dart giữ thứ tự chèn như vậy nên khớp; chuỗi kana là BMP nên tách theo `runes` hay `split('')` đều đúng (dùng `runes` cho chắc); `toLocaleString("vi-VN")` và `toFixed(1)` chỉ dùng ở giao diện → `intl`.

### 5.4 Thời gian và múi giờ

Mọi phép "ngày" của web (mục tiêu XP, streak, hạn mức thẻ mới, thẻ băng, huy hiệu Cú đêm) đi qua `Clock { now, zone }`. Bản Dart đổi thành giao diện nhỏ:

```dart
abstract interface class DayClock {
  int get nowMs;
  String dayKey(int ms);   // "YYYY-MM-DD" theo múi giờ của thiết bị
  int hourOf(int ms);      // 0–23
}
```

- **Production:** `DeviceClock` dùng `DateTime.fromMillisecondsSinceEpoch(ms)` (giờ địa phương theo cơ sở dữ liệu múi giờ của hệ điều hành) rồi tự đệm số 0. Không cần gói nào.
- **Test:** `ZonedClock(zone)` dùng gói `timezone` (0.11.1) để dựng lại đúng các ca web đã test (`Asia/Ho_Chi_Minh`) và thêm các ca khó: `America/Los_Angeles` (chuyển giờ mùa hè), `Pacific/Kiritimati` (+14), `Australia/Lord_Howe` (lệch 30 phút khi chuyển giờ), `Asia/Kolkata` (+5:30), và ranh giới 23:00 / 00:00 / Thứ Hai.
- **Đã đo** (phiên viết [CONTRACT.md](CONTRACT.md), chưa tái lập ở đây): `timezone` so với `Intl.DateTimeFormat` của Node trên 27.000 ca (18 vùng gồm Lord_Howe, Chatham, Kathmandu, Casablanca, Gaza, Apia…, 2015–2036): **0 sai lệch** `dayKey` / `hourOf`. Nhưng hai bên dùng **hai bản tz database khác nhau** (Node: 2025b; `timezone` 0.11.1: 2025c) và sẽ lệch khi luật múi giờ đổi → ghim phiên bản gói và có fixture múi giờ trong CI.
- **Vì sao production dùng `DateTime` địa phương thay vì `timezone`** 📐: hệ điều hành cập nhật dữ liệu múi giờ độc lập với app, còn `timezone` đóng băng dữ liệu theo phiên bản gói — người ở nơi vừa đổi luật sẽ lệch ngày cho tới khi cập nhật app. Đây là một lựa chọn thiết kế chưa so sánh trên thiết bị ❓; `flutter_local_notifications` vẫn cần `timezone`, chấp nhận lệch rất nhỏ ở thông báo.
- `weekStart`, `addDays`, `daysBetween` của web tính bằng `Date.UTC`, **không phụ thuộc múi giờ** → port nguyên bằng `DateTime.utc`.
- Quy ước thiết bị đổi múi giờ giữa chừng giữ như web: ngày tính theo múi giờ tại thời điểm ghi nhận (📐 cân nhắc lưu `dayKey` vào sự kiện khi có nhật ký ôn, mục 10.1, để việc gộp dữ liệu không phụ thuộc múi giờ về sau).

### 5.5 Kiểm tra dữ liệu nhập (thay zod)

`parseState` của web làm theo thứ tự: JSON hợp lệ → `version` là số và lớn hơn `STATE_VERSION` thì từ chối bằng thông báo "tạo bởi phiên bản mới hơn" → khớp schema → nhận. Bản Dart phải **giữ đúng thứ tự và đúng các thông báo** (hoặc mã lỗi ánh xạ 1-1) vì người dùng sẽ nhập tệp từ web:

- zod mặc định **bỏ các khoá lạ** (không từ chối) → bộ phân tích Dart cũng bỏ qua khoá lạ và không ghi lại chúng.
- `.int()` chấp nhận `3.0` (bằng `3` trong JS) và từ chối `3.5`.
- Khoá của `daily` phải khớp `^\d{4}-\d{2}-\d{2}$`; khoá của `cards`/`writing.best` là chuỗi bất kỳ (thẻ mồ côi vẫn hợp lệ, engine tự bỏ qua).
- Danh sách quy tắc từng trường: [phụ lục D](#phụ-lục-d-kiểm-tra-tệp-nhập). Kèm bộ tệp **sai có chủ đích** (thiếu trường, sai kiểu, số âm, `recent` dài 11, `version` 2, JSON cụt…) trong fixture.
- Giới hạn kích thước tệp nhập 5 MiB như web.

### 5.6 Hợp đồng fixture

Mục tiêu: bất kỳ thay đổi nào ở engine web mà làm đổi kết quả đều **làm hỏng CI của mobile** (và ngược lại).

| Nhóm | Nội dung | So khớp |
|---|---|---|
| `fsrs` | Chuỗi chấm ngẫu nhiên có seed (như spike) | Trạng thái, `learningStep`, `reps`, `lapses`, `intervalDays`, `dueAt` **bằng tuyệt đối**; `stability`, `difficulty` sai số tương đối ≤ 1e-12 |
| `stroke` | Nét người dùng + **bảng mẫu chung** (mục 2 bên dưới) → `score`, `reason`, `reversed` | `score`, `reason`, `reversed` bằng tuyệt đối khi dùng bảng mẫu chung (nếu mỗi nền tảng tự lấy mẫu thì ± 1 điểm); `dev`, `ratio` ≤ 1e-12 |
| `scenarios` | Chuỗi gọi `buildQueue` / `gradeCard` / `recordWriting` / `submitQuiz` kèm đồng hồ giả (các ca của `reviews.test.ts`, `activity.test.ts`, `quiz.test.ts`) | Trạng thái và kết quả sau mỗi bước |
| `state-parse` | Tệp hợp lệ (gồm **một tệp xuất thật từ web**) và tệp sai | Nhận/từ chối và lý do |
| `time` | `dayKey`, `hourOf`, `weekStart` ở các múi giờ khó (mục 5.4) | Bằng tuyệt đối |
| `content` | Băm nội dung đã sinh (`kana-data`, `kana-samples`, từ vựng, quiz, huy hiệu) | Bằng tuyệt đối |

Định dạng và dung sai chuẩn: [CONTRACT.md §4](CONTRACT.md#4-hợp-đồng-3--hành-vi-engine); ví dụ thật ở [phụ lục E](#phụ-lục-e-định-dạng-fixture). Hai điểm cần biết:

1. **Nhóm `scenarios` không sinh được bằng `node` trần.** `cards.ts` và `quiz.ts` import `@/data/...` (alias của `tsconfig`); chạy thử ✅: `node` ném `ERR_MODULE_NOT_FOUND: Cannot find package '@/data'`. Spike import được `fsrs.ts` và `stroke-match.ts` vì hai tệp đó không có alias. Bộ sinh `scenarios` phải chạy trong **Vitest** (đã có sẵn alias). Ngược lại ba tệp dữ liệu (`badges.ts`, `quizzes.ts`, `vocabulary.ts`) import được bằng `node` trần ✅ vì chỉ có `import type` — đủ cho bước sinh nội dung (mục 8.1).
2. **Điểm mẫu của nét chuẩn: `PathMetric` không giống `getPointAtLength()`.** Mobile có `PathMetric` thay cho `getPointAtLength` của trình duyệt. Trình duyệt so với tích phân chính xác lệch rất ít ✅ (độ dài trung bình 5,8e-7, tối đa 2,1e-6; điểm mẫu tối đa 0,001 đơn vị), nhưng **`PathMetric` so với chính xác lệch nhiều hơn hẳn** ✅ (Flutter 3.35.4, Windows, 433 nét): điểm mẫu trung bình **0,077**, p95 0,212, **tối đa 0,456 đơn vị** (1 đơn vị ≈ 0,92% cạnh ô); độ dài trung bình **0,21%**, tối đa **1,23%** (nét む). Phiên viết CONTRACT.md đo độc lập `PathMetric` so với Chromium và ra đúng các số đó; **bản đầu của tài liệu này ghi dung sai 0,01 đơn vị là sai** (khi đó chưa đo `PathMetric`). Tác động lên điểm **nhỏ** ✅: 2.165 nét giả × 3 mức nhiễu → điểm lệch tối đa **1**, 2–4% số nét lệch 1 điểm, lật ngưỡng 48/58/70/88 ở 0–0,05% số nét. Quyết định (phương án B của [CONTRACT.md §3.2](CONTRACT.md#32-mẫu-điểm-của-nét-chuẩn-kana-samplesjson--quyết-định-cần-chốt)): sinh một bảng `kana-samples.json` (32 điểm + độ dài cho mỗi nét, tính bằng Node) dùng chung cho cả hai nền tảng khi **chấm điểm**; `PathMetric` chỉ còn dùng cho hoạt ảnh. Nhờ vậy fixture `stroke` so bằng tuyệt đối thay vì ± 1 điểm. Mã đo: [`docs/spikes/flutter-pathmetric/`](spikes/flutter-pathmetric/README.md). Chưa đo trên Android/iOS và Flutter 3.47 ❓.

CI: job `engine-parity` chạy trên mỗi PR chạm `web/src/lib/**`, `web/src/data/**` hoặc `mobile/packages/**`: `npm ci` → sinh fixture → `dart test`. Chạy thêm trên máy ARM64 hoặc thiết bị thật (`integration_test`) vì libm khác x64 ❓.

---

## 6. Khung viết nét

Đây là phần khó nhất và là lý do người dùng chọn app. Thuật toán chấm đã được chứng minh (mục 5); phần dưới là chuyện cảm ứng, hình học màn hình và cảm giác.

### 6.1 Các lớp

| Lớp (web) | Flutter | Ghi chú |
|---|---|---|
| SVG: lưới ô, nét mẫu, hoạt ảnh, số thứ tự nét | `CustomPaint` xếp chồng: `GridPainter`, `GuidePainter`, `AnimPainter` | Hai lớp đầu tĩnh → bọc `RepaintBoundary` |
| Canvas: mực người dùng | `InkPainter(repaint: inkNotifier)` | Chỉ lớp này vẽ lại khi di chuyển; **không `setState` mỗi điểm** |
| Lớp bắt sự kiện (canvas) | `Listener` bọc ngoài | Xem 6.3 |

Tất cả dùng hệ toạ độ 109 × (109·số glyph) của KanjiVG: `canvas.scale(size.width / vbW, size.height / 109)` rồi vẽ trực tiếp theo đơn vị KanjiVG, đúng như `ctx.setTransform` của web. Không phải tự nhân `devicePixelRatio` (Flutter lo).
Khung có `AspectRatio(aspectRatio: số glyph)`; ký tự ghép dùng hai glyph (xem 6.7 về cách bố trí trên điện thoại).

### 6.2 Mô hình nét

```dart
class StrokeModel { Path path; double length; List<Pt> pts32; double dx; }   // dx = chỉ số glyph × 109
```

- **Phân tích** chuỗi `d` bằng bộ phân tích 30 dòng (`parseKanjiVgPath` trong `docs/spikes/flutter-engine-parity/engine.dart`): chỉ hiểu `M` và `c`, ném lỗi với lệnh khác để test nội dung bắt ngay ✅ (433 nét, bit-exact so với web). Dựng `Path` bằng `cubicTo` tuyệt đối.
- **32 điểm mẫu để chấm** lấy từ bảng dùng chung `kana-samples.json` (mục 5.6; [CONTRACT.md §3.2](CONTRACT.md#32-mẫu-điểm-của-nét-chuẩn-kana-samplesjson--quyết-định-cần-chốt)), **không** tự đo bằng `PathMetric` (lệch web tới 0,456 đơn vị). Phần **hoạt ảnh** vẫn dùng `path.computeMetrics()` (`extractPath`, `getTangentForOffset`) 📘. Ký tự ghép: điểm mẫu của glyph thứ hai đã cộng `dx = 109` trong bảng. Nếu chưa có bảng chung (giai đoạn đầu), lấy mẫu bằng `metric.getTangentForOffset(len * i / 31)` rồi cộng `dx` sau khi lấy — chấp nhận lệch ≤ 1 điểm; bẫy `getPointAtLength` bỏ qua `transform` của web (SPEC §1.1) tránh được nếu không dùng `Path.shift` trước khi đo.
- `PathMetrics` không nhớ kết quả (`computeMetrics` là snapshot) 📘 → dựng một lần khi mở chữ, giữ `StrokeModel`.

### 6.3 Con trỏ

`Listener` (không qua *gesture arena*: không độ trễ nhận diện, nhận thẳng `kind`, `pointer`, `buttons`). Ánh xạ sang `pointer-gate`:

```dart
PointerKind kindOf(PointerDeviceKind k) => switch (k) {
  PointerDeviceKind.touch => PointerKind.touch,
  PointerDeviceKind.stylus || PointerDeviceKind.invertedStylus => PointerKind.pen,
  _ => PointerKind.mouse,
};
// web: e.button (0 = chính). Flutter: bit của event.buttons
final button = (e.buttons & kPrimaryButton) != 0 ? 0 : 1;
```

| Sự kiện web | Flutter |
|---|---|
| `pointerdown/move/up` | `onPointerDown/Move/Up` |
| `pointerId` | `PointerEvent.pointer`: duy nhất cho mỗi lần chạm và **không tái sử dụng** 📘 (id chuột/bút của web có thể lặp), nên nhánh "`down` lặp của chính con trỏ → viết lại" chỉ còn xảy ra khi sự kiện `up` thất lạc |
| `pointercancel` | `onPointerCancel` (`PointerCancelEvent`) → `gate.cancel(id)` → **bỏ nét, không chấm** |
| `lostpointercapture` | Không có tương đương; Flutter chuyển mọi sự kiện của một con trỏ tới các đích đã hit-test lúc `down` nên nét không đứt khi tay vượt khung 📐 |
| `touch-action: none` | Không có cuộn tổ tiên: khung viết nằm trong trang **không cuộn** hoặc dùng `NeverScrollableScrollPhysics`. `Listener` vẫn nhận sự kiện kể cả khi `ScrollView` thắng arena → cuộn và vẽ **cùng lúc** nếu để khung trong danh sách cuộn 📐 |

Các quy tắc còn lại giữ nguyên SPEC §7: một con trỏ mỗi lúc, bút thắng cảm ứng đang viết dở, `down` lặp của chính con trỏ thì viết lại, lọc điểm cách nhau < 0,6 đơn vị, bỏ nét < 3 điểm hoặc dài < 4 đơn vị.

### 6.4 Chấm và phản hồi

Giữ nguyên `judge` của `StrokeStage`: ngưỡng `TRACE` 58 / `TEST` 48; nét trượt được so với **mọi nét khác của chữ** (ngưỡng `max(55, score + 15)`) để báo "đó là nét số N, hãy viết nét số M trước"; trượt hai lần liền ở cùng một nét → tự phát lại hoạt ảnh. Engine trả **mã** (`StrokeFeedbackCode` + tham số), `app/l10n` dựng câu — bỏ chuỗi tiếng Việt khỏi engine để thêm tiếng Anh sau này không phải đụng engine.

### 6.5 Hoạt ảnh và nét mực

- **Hoạt ảnh nét mẫu**: `AnimationController` (thời lượng `min(1500, max(500, 360 + len·5))` ms như web) → `metric.extractPath(0, len·ease(k))` vẽ phần đã đi, `getTangentForOffset(len·ease(k))` đặt chấm bút 📘. Thay cho `strokeDasharray/Dashoffset` của web.
- **Mực**: làm mượt bằng `quadraticBezierTo` qua điểm giữa như web (`strokeWidth` 5,4 đơn vị, `StrokeCap.round`, `StrokeJoin.round`). Muốn nét "bút lông" có độ dày theo tốc độ/áp lực: `perfect_freehand` 2.5.2+1 📘 chỉ cho **hiển thị**; chấm điểm luôn dùng điểm thô.
- **Giảm chuyển động**: `MediaQuery.disableAnimationsOf(context)` tương ứng nhánh `prefers-reduced-motion` của web (hiện nét hoàn chỉnh 700 ms, không chấm bút).
- **Hiệu năng**: Impeller là engine duy nhất trên iOS và mặc định trên Android API ≥ 29 (máy thấp hơn hoặc không có Vulkan tự lùi về OpenGL) 📘; Impeller biên dịch shader trước nên tránh kiểu giật do biên dịch lúc chạy. Một nét chỉ vài trăm điểm nên dựng lại `Path` mỗi khung hình là rất nhẹ 📐 — vẫn phải đo trên máy Android yếu ❓.

### 6.6 Tình huống thực tế trên điện thoại

| Tình huống | Hành vi mong muốn | Hiện thực | Trạng thái |
|---|---|---|---|
| Lòng bàn tay chạm sau ngón/bút | Bỏ qua | `pointer-gate` (`ignore`) | 📐 logic đã có test ở web |
| Bút chạm sau lòng bàn tay | Bút thắng | `pointer-gate` (`restart`) | 📐 |
| Hệ điều hành giành cử chỉ (vuốt từ mép, cuộc gọi đến, từ chối lòng bàn tay) | Bỏ nét dở | `PointerCancelEvent` | ❓ kiểm trên thiết bị: Android và iPadOS có gửi cancel cho lòng bàn tay không |
| **Vuốt quay lại từ mép trái (iOS) / điều hướng cử chỉ (Android 10+)** khi viết sát mép | Không thoát khỏi màn hình | Chừa lề ≥ 24 dp quanh khung; `PopScope(canPop: false)` trong lúc đang có nét; kiểm vùng loại trừ cử chỉ hệ thống | ❓ rủi ro thật, kiểm trên cả hai nền tảng |
| App xuống nền giữa nét (`AppLifecycleState.paused`) | Bỏ nét dở | Huỷ nét trong `didChangeAppLifecycleState` | 📐 |
| Xoay màn hình giữa nét | Bỏ nét dở, giữ tiến độ các nét trước | Khung đo lại theo `LayoutBuilder`; huỷ `live` | 📐 |
| Máy tính bảng có bút (Apple Pencil, S Pen) | Dùng áp lực chỉ để vẽ; chấm không đổi | `event.pressure` cho hiển thị | ❓ kiểm `PointerHoverEvent` của Pencil, độ trễ |
| Bút điện dung rẻ tiền / ngón đeo găng | Vẫn viết được | Báo là `touch` | — |

### 6.7 Kích thước ô và dung sai (phát hiện quan trọng)

Điểm nét ≈ `100 − 4,2 · độ lệch trung bình` (khi độ dài nét đúng), nên ngưỡng `TRACE = 58` ứng với lệch trung bình ≤ **10,0 đơn vị**, `TEST = 48` ứng với ≤ **12,4 đơn vị**; `OFF_PATH` khi lệch > 15 đơn vị. Đổi ra kích thước vật lý (1 dp = 1/160 inch = 0,159 mm) 📐 (số học):

| Bố cục | Cạnh một ô | 1 đơn vị | Dung sai `TRACE` (10 đơn vị) | Dung sai `TEST` (12,4 đơn vị) |
|---|---|---|---|---|
| Điện thoại 360 dp, ký tự đơn (lề 16 dp) | 328 dp | 3,0 dp = 0,48 mm | **4,8 mm** | **5,9 mm** |
| Điện thoại 360 dp, ký tự ghép **xếp ngang** (2 ô) | 164 dp | 1,5 dp = 0,24 mm | **2,4 mm** | **3,0 mm** |
| Máy tính bảng, ô 500 dp | 500 dp | 4,6 dp = 0,73 mm | 7,3 mm | 9,0 mm |

(1 dp ≈ 1/160 inch ≈ 0,16 mm; điểm `pt` của iOS gần tương đương. Con số chỉ để so sánh độ lớn tương đối giữa các bố cục.)

Đầu ngón tay vẽ chính xác cỡ vài milimét; **dung sai 2,4 mm của ký tự ghép xếp ngang trên điện thoại là quá chặt**, trong khi ký tự đơn thì thoải mái. Đề xuất 📐:

1. **Ký tự ghép (きゃ…) hiện lần lượt hai glyph trong cùng một ô lớn** (66 ký tự), thay vì hai ô cạnh nhau. Engine không đổi: các chỉ số nét vẫn liên tục, và khi ánh xạ toạ độ chạm sang hệ nét mẫu chỉ việc cộng `dx = chỉ số glyph × 109`.
2. **Đo phân bố điểm của người dùng thật** (beta kín) trước khi chốt ngưỡng; có thể cần hệ số riêng theo loại con trỏ (ngón vs bút) — bút chính xác hơn nên giữ ngưỡng chặt hơn.
3. Với hai nhóm trên, giữ `PASS_THRESHOLD` và hằng số 4,2 là **tham số của engine** (đã tách trong SPEC §6) để chỉnh mà không động tới cấu trúc.

### 6.8 Trợ năng của khung viết

Khung viết là canvas nên trình đọc màn hình không "thấy" gì. Cần lối thay thế:

- `Semantics` mô tả trạng thái ("nét 2/3, bắt đầu phía trên, kéo từ trên xuống"), vùng thông báo trực tiếp (`liveRegion`) cho phản hồi sau mỗi nét, tương ứng `aria-live` của web.
- Chế độ **không vẽ** cho người không viết được: xem hoạt ảnh nét mẫu rồi tự đánh giá (4 nút Quên/Khó/Được/Dễ như thẻ từ vựng). Đây là ngoại lệ có chủ đích so với nguyên tắc "đo thay vì tự chấm" và nên ghi rõ trong Cài đặt.

### 6.9 Kiểm thử khung viết

- Test widget bằng `WidgetTester.startGesture` / `TestPointer`: một ngón; hai ngón cùng lúc; bút sau cảm ứng; `cancel` giữa nét; nét quá ngắn; nét sai thứ tự; trượt hai lần → phát lại.
- Golden test của khung ở trạng thái: đầu, giữa, xong, so sánh nét chuẩn.
- Thiết bị thật (mục 12): tất cả dòng ❓ ở bảng 6.6.
- **Phát lại nét thật**: lưu (có đồng ý) vài trăm nét của người dùng beta thành fixture cố định để mọi thay đổi ngưỡng/công thức sau này được hồi quy với dữ liệu thật, không chỉ nét tổng hợp.

---

## 7. Màn hình và giao diện

### 7.1 Cấu trúc điều hướng

Web có 6 mục (Tổng quan, Ôn tập, Luyện viết, Từ vựng, Quiz, Cài đặt). Thanh điều hướng dưới nên có 3–5 đích 📐. Đề xuất 5 tab:

| Tab | Gồm | Ghi chú |
|---|---|---|
| **Hôm nay** | Chào, thẻ hành động hôm nay, mục tiêu XP, chuỗi ngày | = "Tổng quan" của web, bỏ heatmap/huy hiệu xuống "Tôi" |
| **Học** | Chuyển đổi `Kana` / `Từ vựng` | Bảng ngũ thập âm → khung viết; từ vựng tra cứu |
| **Ôn tập** | Hàng đợi FSRS; chấm đỏ số thẻ đến hạn | Tab quan trọng nhất cho thói quen |
| **Quiz** | Danh sách và làm bài | |
| **Tôi** | Cấp độ, chuỗi dài nhất, heatmap, huy hiệu, **cài đặt** (mục tiêu, nhắc nhở, giao diện, sao lưu, giấy phép) | Vẫn với tới được sao lưu (lý do web đưa Cài đặt lên thanh dưới) |

Máy tính bảng / màn hình rộng: `NavigationRail` thay thanh dưới (mục 7.5).

### 7.2 Bản đồ route → màn hình

| Web | Mobile | Khác biệt chính |
|---|---|---|
| `/` (584 dòng) | **Onboarding** 3 màn, chỉ lần đầu | Thay trang giới thiệu; tái dùng hoạt ảnh `HeroDemo` |
| `/bang-dieu-khien` | Tab **Hôm nay** | Thẻ hành động lên đầu; heatmap sang tab **Tôi** |
| `/luyen-viet` + `PracticePanel` | Tab **Học → Kana**, trang **Viết** toàn màn hình | Modal 2 cột của web → trang đứng (dọc) / hai khung (ngang, máy tính bảng) |
| `/on-tap` | Tab **Ôn tập** | Khoá chống chấm đúp giữ nguyên |
| `/tu-vung` | Tab **Học → Từ vựng** | Thêm nút nghe (TTS) |
| `/quiz`, `/quiz/[id]` | Tab **Quiz** | Đồng hồ tính theo `Stopwatch` thay vì đếm giảm từng giây (xem dưới) |
| `/cai-dat` | Tab **Tôi → Cài đặt** | Thay `InstallCard` bằng thông báo/nhắc nhở; sao lưu bằng share sheet |
| `/bang-chu-cai/*` | Gộp vào **Học → Kana** | Không cần trang SEO |

### 7.3 Từng màn hình

**Onboarding (3 màn).** (1) *Giá trị*: hoạt ảnh nét mẫu và dòng "máy chấm từng nét". (2) *Tiến độ nằm trên máy bạn*: nói rõ không có tài khoản, hệ điều hành tự sao lưu, nên xuất tệp để chuyển máy — đây là điểm khác lớn so với app có tài khoản nên phải nói sớm. (3) *Mục tiêu XP hằng ngày* (10–500; mặc định 50). **Xin quyền thông báo sau phiên học đầu tiên**, không xin lúc mở app 📐 (người dùng đã thấy giá trị).

**Hôm nay.** `Greeting`, thẻ hành động với con dấu 今日 ("Ôn N thẻ đến hạn" hoặc "Học chữ mới"), 4 ô số liệu (2×2 trên điện thoại), thanh mục tiêu XP. Dữ liệu từ `statsProvider`, `summaryProvider`; trạng thái đang nạp dùng `AsyncValue.loading` thay cho cờ `ready` của web.

**Học → Kana.** Bảng đọc như bảng, **không phải lưới thẻ** (nguyên tắc giao diện của web): cột thẳng hàng, や行 và わ行 giữ ô trống. Mỗi ô: ký tự, romaji, con dấu 済 khi đã qua bước học, chấm vàng khi đến hạn, thanh điểm cao nhất. 5 cột trên điện thoại 360 dp (≈ 60 dp một ô). Bộ chọn Hiragana/Katakana và chip nhóm (Tất cả 104 / Cơ bản 46 / Biến âm 25 / Âm ghép 33).

**Viết.** Dọc: khung viết vuông phía trên (tối đa ≈ 390 dp), hàng chấm tiến độ nét, dòng phản hồi (có `liveRegion`), điểm, rồi hàng nút: Nghe · Xem nét mẫu · Xoá làm lại · Đồ nét/Tự viết · So sánh · Hé nét 2 giây (chỉ `TEST`) · Trước/Sau. Ngang và máy tính bảng: khung bên trái, bảng điều khiển bên phải (như `lg:grid-cols` của web). **Không vuốt ngang để đổi chữ** (xung đột với viết).

**Ôn tập.** Mỗi thẻ là một trong: viết (`KANA_WRITING`: dùng khung viết ở `TEST`, điểm tự quyết định lịch), hoặc "hiện đáp án" rồi 4 nút Quên / Khó / Được / Dễ (đọc kana, từ vựng). Sau mỗi thẻ hiện "ôn lại sau N ngày · độ bền trí nhớ S ngày" rồi chuyển thẻ. Giữ nguyên: hàng đợi chụp một lần cho cả phiên, khoá chống chấm đúp, mục "Vì sao thẻ này xuất hiện hôm nay?".

**Từ vựng.** Chip N5/N4, ô tìm kiếm không cần gõ dấu, thẻ từ có cách đọc, nghĩa, câu ví dụ; thêm nút nghe (mục 9.4).

**Quiz.** Ba pha (giới thiệu → làm bài → kết quả); trắc nghiệm và gõ romaji (`autocorrect: false`, `enableSuggestions: false`, không tự viết hoa — tương ứng `autoCapitalize="off"` / `spellCheck={false}`). **Đồng hồ:** web trừ 1 mỗi lần `setInterval` chạy (`QuizRunner.tsx`), nên **chạy chậm khi tab nền bị trình duyệt giãn bộ hẹn giờ** 📐; mobile tính `còn lại = giới hạn − Stopwatch` và **tạm dừng khi app xuống nền** (quyết định sản phẩm: quiz tự học nên ưu ái người dùng; ghi rõ khác biệt với web) 📐. Nộp đúng một lần kể cả khi hết giờ trùng lúc bấm nộp (giữ `submitted`).

**Tôi / Cài đặt.** Mục tiêu XP; nhắc ôn tập (giờ, ngày); giao diện (hệ thống/sáng/tối); *Sao lưu*: xuất, nhập, xoá (mục 9.3); Giấy phép và ghi công (mục 8.5); phiên bản.

### 7.4 Design system

Mô hình "giấy ô vuông 原稿用紙" của web (ARCHITECTURE: *Giao diện*) mang sang nguyên ý: nền giấy, mực sumi, lưới xanh genkō, chu sa shu cho thầy chấm, vàng cho cấp độ và huy hiệu. Token đặt trong `ThemeExtension<KdColors>` (sáng/tối), theo `ThemeMode.system` mặc định, lựa chọn của người dùng lưu ở cài đặt riêng (không nằm trong `ProgressState` để giữ hợp đồng — web cũng để `kd.theme` ngoài).

**Kiểm tra độ tương phản của token hiện tại (WCAG 2.x)** ✅ — số liệu do [`docs/spikes/color-contrast/contrast.mjs`](spikes/color-contrast/contrast.mjs) tính từ chính `web/src/app/globals.css` (chạy lại: `node docs/spikes/color-contrast/contrast.mjs`). Nên sửa ở token của mobile, và nên sửa cả web:

| Cặp màu | Hiện tại | Kết quả | Đề xuất |
|---|---|---|---|
| Chữ `gold` `#b07d14` trên giấy `#faf8f5` (sáng) | **3,42** | Không đạt AA (4,5) cho chữ thường. Đang dùng ở chữ nhỏ: nhãn "Khó" (14 px) trong ôn tập, chip XP và dòng "Đạt huy hiệu" (12 px đậm). Điểm số cỡ lớn (30 px) dùng cùng màu thì chỉ cần 3 : 1 nên đạt | `#946610` (4,75) hoặc `#8f6410` (4,95) cho chữ; giữ `#b07d14` cho nền/viền |
| Chữ `sumi-3` `#6b776e` trên giấy (sáng) | 4,41 | Sát ngưỡng, trượt | `#65716a` (4,80); trên `paper-sunk` dùng `#5d6a62` (4,90) |
| Chữ `genko-2` `#2d8254` trên giấy (sáng) | 4,47 | Sát ngưỡng | Dùng `genko` `#1b5e3b` (7,31) cho chữ, `genko-2` chỉ làm nền |
| `shu` trên `shu-tint` (sáng) | 4,44 | Sát ngưỡng | Dùng `shu-2` `#aa2011` (6,19) |
| **Chữ trắng trên nút chính (nền `shu`) ở giao diện tối** `#f24935` → đầu gradient `shu-2` `#f86f5e` | **3,63 → 2,83** | Không đạt cho chữ thường | Nền `#d93a27` (4,58) hoặc chữ mực `#0b100d` trên `#f24935` (5,28) |
| Số nét đã xong: chữ trắng trên `genko` tối `#45a772` | **2,99** | Không đạt | Chữ mực `#0b100d` (6,42) hoặc nền `#2d8254` (4,74) |
| Nút `gold`, chữ trắng: giao diện sáng `#b07d14` / tối `#e5b03e` | 3,63 / **1,98** | Không đạt | Chữ mực: sáng `#151a17` (4,86), tối `#0b100d` (9,70) |
| Mọi cặp chữ-trên-nền còn lại, cả hai giao diện | 4,68 – 17,59 | Đạt | Giữ |

"Đạt/không đạt" phụ thuộc cỡ chữ và độ đậm (chữ lớn ≥ 24 px, hoặc ≥ 18,66 px đậm, chỉ cần 3 : 1); phần lớn chữ bị nêu ở trên là 12–13 px.

**Ánh xạ thành phần** (từ `components/ui/index.tsx`, 270 dòng): `Button` (solid / outline / ghost / danger / cinnabar / sumi / gold), `Card` (mặc định / interactive / glass), `Chip`, `Seg` (đoạn chọn), `Progress`, `Stat`, `Badge`, `Field`, `Empty`, `Spinner`, nhãn `label-xs`, con dấu `hanko-seal`. Viết thành bộ widget riêng (`kd_ui`), **không** bám vào widget Material mặc định.
Lưu ý: hiệu ứng kính mờ (`glass-luxury`, `backdrop-blur`) → `BackdropFilter` tốn kém ở máy yếu ❓ — chỉ dùng cho thanh điều hướng và sheet, có nền đặc dự phòng; hiệu ứng quét sáng (`shimmer-sweep`) là trang trí, tắt khi giảm chuyển động.

### 7.5 Thích ứng màn hình

Với `targetSdk 36` (bắt buộc từ 2026-08-31, mục 11.2), trên màn hình rộng ≥ 600 dp (máy tính bảng, gập mở) Android 16 **bỏ qua** `screenOrientation`, `resizableActivity`, `minAspectRatio`, `maxAspectRatio` — ứng dụng luôn lấp đầy cửa sổ; chỉ có thể tạm xin miễn đến API 37 📘. Nên **thiết kế thích ứng ngay từ đầu**, không dựa vào việc khoá dọc:

| Lớp cửa sổ 📐 | Rộng | Điều hướng | Màn Viết |
|---|---|---|---|
| Compact | < 600 dp | Thanh dưới | Dọc: khung trên, điều khiển dưới |
| Medium | 600–839 dp | Rail | Hai khung nếu ngang |
| Expanded | ≥ 840 dp | Rail | Hai khung; khung viết có thể to tới ≈ 500 dp (dung sai 7 mm, mục 6.7) |

Cũng bắt buộc theo Android 16 📘: **edge-to-edge** (không còn opt-out) → xử lý `SafeArea`/`viewPadding`; **predictive back** (`onBackPressed` không còn được gọi) → dùng `PopScope`, không chặn nút Back bằng cách cũ. iOS 15 là mức tối thiểu của Flutter 3.47 📘; iPad hỗ trợ Split View/Slide Over nên không giả định kích thước cố định.

### 7.6 Trợ năng chung

- `Semantics` cho từng ô kana (`"あ — a, 3 nét, đã thuộc"` thay cho `aria-label` của web), vùng thông báo trực tiếp cho phản hồi.
- Mục tiêu chạm ≥ 48 dp (Android) / 44 pt (iOS); kiểm bằng `meetsGuideline(androidTapTargetGuideline / iOSTapTargetGuideline / textContrastGuideline / labeledTapTargetGuideline)` trong test (mục 12).
- Chữ co giãn đến 200%: ô kana và nhãn không bị cắt; khung viết không co theo chữ.
- Không dùng màu làm kênh duy nhất (web đã kèm chữ "Quên/Khó/Được/Dễ", con dấu 済, thanh điểm); giữ vậy — đặc biệt xanh genkō / đỏ shu dễ nhầm với người mù màu đỏ-xanh.
- Android tự nhận chế độ tương phản cao và đảo màu (Flutter 3.47) 📘.

### 7.7 Ngôn ngữ giao diện

Toàn bộ chuỗi trên web viết cứng bằng tiếng Việt trong TSX. Mobile dùng `flutter gen-l10n` (ARB, `app_vi.arb` là nguồn) → thêm `app_en.arb` khi cần; từ vựng đã có `meaningEn` (cả 80 từ đều có ✅). Quy tắc: **engine trả mã, không trả câu chữ** (thông báo của `parseState`, `dirText`/`posText` và lời phản hồi nét) — để dịch được và để fixture so sánh theo mã, không theo câu.

---

## 8. Dữ liệu, nội dung và phông chữ

### 8.1 Đường ống nội dung

Một nguồn: `web/src/data/*.ts` và `kana-data.json`. Script `contract/export-content.mjs` (Node ≥ 22.18, chạy thẳng `.ts`; ba tệp dữ liệu chỉ có `import type` nên import được ✅) xuất:

- `kd_content/assets/content.json`: `vocabulary`, `quizzes`, `badges` + trường `searchText` đã bỏ dấu (bẫy 5);
- `kd_content/assets/kana-data.json`: bản sao nguyên văn;
- `contentHash`: băm cả hai, vào fixture nhóm `content`.

CI: sinh lại và so băm; lệch thì fail (nguy cơ lớn nhất là ai đó sửa nội dung web mà quên mobile). **Bất biến giữ nguyên** (SPEC §1): `Vocabulary.id` chỉ thêm vào cuối, không đánh số lại; thứ tự `chars` là thứ tự dạy học.
Nạp lúc khởi động: `rootBundle.loadString` + `jsonDecode` cho ≈ 89 KB 📐 (≪ 10 ms), phân tích 433 đường nét lười theo từng glyph hoặc một lần.

### 8.2 Phông chữ

Web dùng Lora, Plus Jakarta Sans, Zen Kaku Gothic New, Zen Old Mincho **tải từ Google Fonts** — đã thấy trong lúc kiểm tra: mỗi lần mở trang phát sinh request tới `fonts.googleapis.com` / `fonts.gstatic.com` ✅. Mobile **đóng gói phông vào app**: offline, và không gửi gì ra ngoài (nhất quán với nhãn không thu thập dữ liệu). Không dùng `google_fonts` ở chế độ tải lúc chạy.

- Phông Nhật rất nặng nếu đủ bộ chữ Hán, nhưng toàn bộ nội dung chỉ dùng **310 glyph** ✅ (gồm 160 chữ Hán) → cắt tập con bằng `pyftsubset` (fonttools) còn cỡ vài chục KB 📐.
- **Script kiểm tra trong CI:** mọi ký tự CJK/kana xuất hiện trong nội dung phải có trong bảng ký tự của phông đã cắt — thêm từ vựng mới không được sinh ra ô vuông "tofu".
- Phông Latin cần phủ tiếng Việt (dấu, `đ`): xác minh từng họ trước khi cắt ❓ (web dựa vào Plus Jakarta Sans có tập con tiếng Việt).
- Giấy phép: cả bốn họ phát hành trên Google Fonts theo SIL OFL 📐 — kiểm lại từng tệp giấy phép và đưa vào màn hình ghi công.

### 8.3 Việc nên làm cho web cùng lúc

Tự lưu phông trong `web/public` thay vì Google Fonts: bỏ request ngoài (đúng với tuyên bố "không request mạng nào ngoài tệp tĩnh" trong README/DEPLOYMENT), bỏ rủi ro quyền riêng tư (IP gửi cho Google), và phông dùng được khi offline (hiện service worker để mặc font hệ thống). Việc nhỏ, tách khỏi mobile.

### 8.4 Biểu tượng và màn hình khởi động

Nguồn: `web/public/icons/` (192, 512, maskable 512). Cần thêm: biểu tượng iOS 1024×1024 **không kênh alpha**, biểu tượng thích ứng của Android (nền + chữ 仮, và lớp đơn sắc cho biểu tượng theo chủ đề ❓), ảnh chụp màn hình cho hai cửa hàng. Công cụ sinh (`flutter_launcher_icons`, `flutter_native_splash`) ❓ chưa kiểm phiên bản.

### 8.5 Giấy phép và ghi công

Màn hình "Giấy phép & ghi công" cộng `showLicensePage` cho các gói. Nội dung bắt buộc ngay từ v1: **KanjiVG** (CC BY-SA 3.0, © Ulrich Apel) — dữ liệu nét là bản dẫn xuất nên phải giữ nguyên giấy phép share-alike cho phần dữ liệu này (README đã nêu) và ghi công; phông chữ (OFL). Khi mở rộng nội dung (mục 10.3): **JMdict / KANJIDIC** (CC BY-SA 4.0): app di động phải ghi công trong mục "Giới thiệu" và cho phép tới tệp giấy phép 📘; **Tatoeba**: câu theo CC BY 2.0 FR (ghi tên tác giả từng câu), âm thanh tuỳ từng người đóng góp, có loại không cho dùng thương mại hoặc dẫn xuất 📘. Ranh giới pháp lý khi kiếm tiền từ app có dữ liệu share-alike: hỏi chuyên gia ❓.

---

## 9. Tính năng native: phần nâng cấp so với web

| # | Tính năng | Giá trị cho người học | Độ khó | Ưu tiên | Phụ thuộc |
|---|---|---|---|---|---|
| 9.1 | Nhắc ôn tập và chuỗi ngày (thông báo cục bộ) | Rất cao: hình thành thói quen | M | **P0** (cùng v1) | `flutter_local_notifications`, `timezone` |
| 9.2 | Sao lưu tự động của hệ điều hành | Rất cao: không mất tiến độ | S | **P0** | cấu hình + kiểm thử cài lại |
| 9.3 | Xuất / nhập tệp bằng share sheet | Cao | S | **P0** | `share_plus`, `file_picker` |
| 9.4 | Âm thanh: TTS rồi âm thu sẵn | Cao | S → L | **P0** (TTS) / P1 (thu sẵn) | `flutter_tts`, `just_audio` |
| 9.5 | Rung phản hồi (haptics) | Trung bình | S | **P0** | có sẵn trong Flutter |
| 9.6 | Bút và máy tính bảng (áp lực, nét lông) | Trung bình | M | P1 | `perfect_freehand` |
| 9.7 | Widget màn hình chính | Cao cho giữ thói quen | L | P1 | `home_widget` + mã native hai nền tảng |
| 9.8 | Nhận dạng chữ viết tay (ML Kit) | Cao ở chế độ tự do, đổi lấy phụ thuộc | M | P2, **opt-in** | `google_mlkit_digital_ink_recognition` |
| 9.9 | Chuyển máy không tài khoản / đồng bộ tuỳ chọn | Cao | L | P2 | nhật ký ôn (mục 10.1) |
| 9.10 | Liên kết sâu web ↔ app | Trung bình | S–M | P2 | tên miền chính thức |
| 9.11 | Chấm phát âm (nhận dạng giọng nói) | Trung bình | M, rủi ro quyền riêng tư | P3, opt-in | `speech_to_text` |
| 9.12 | Phím tắt hệ thống (Siri / App Shortcuts) | Thấp | M | P3 | mã native |

### 9.1 Nhắc ôn tập và chuỗi ngày

Đây là thay đổi tác động mạnh nhất lên thói quen học: web là site tĩnh không máy chủ, nên không có cách lập lịch thông báo cục bộ đáng tin cậy 📐.

- **Gói:** `flutter_local_notifications` 22.3.1 (2026-09-13) 📘.
- **Quyền:** Android 13+ cần `POST_NOTIFICATIONS`, xin bằng `requestNotificationsPermission()`; iOS có hộp thoại riêng. **Xin sau phiên học đầu tiên**, không xin lúc mở app (người dùng đã thấy giá trị) 📐.
- **Lập lịch:** `zonedSchedule` với `TZDateTime` (cần `timezone` + `flutter_timezone` để biết múi giờ thiết bị); nhắc hằng ngày dùng `matchDateTimeComponents` để tự theo giờ mùa hè 📘.
- **iOS chỉ giữ 64 thông báo chờ** 📘 → chỉ lập lịch vài ngày tới (đề xuất 14 ngày × ≤ 2 khung = 28), lập lại sau mỗi lần mở app hoặc `commit`.
- **Android:** nhắc học không cần chính xác đến giây → dùng chế độ **không chính xác** (`inexactAllowWhileIdle`) để khỏi cần `SCHEDULE_EXACT_ALARM`; `USE_EXACT_ALARM` không hỏi người dùng nhưng bị cửa hàng kiểm duyệt 📘. Cần `RECEIVE_BOOT_COMPLETED` thì lịch mới sống sau khi khởi động lại máy 📘.
- **Nội dung:** thông báo cục bộ không chạy mã lúc hiện, nên văn bản phải biết trước. Số thẻ đến hạn tại giờ nhắc **tính được từ `dueAt` đã lưu** (thẻ nào có `dueAt ≤ giờ nhắc`); nếu người dùng ôn thêm, mỗi `commit` tính lại và đặt lại lịch → con số luôn đúng với trạng thái mới nhất 📐.
- **Chuỗi ngày sắp đứt:** nhắc lúc 21:00 nếu mục tiêu hôm nay chưa đạt và `currentStreak > 0`; **huỷ ngay trong `commit`** khi đã đạt.
- **Cài đặt:** bật/tắt, giờ nhắc, ngày trong tuần, giờ yên lặng.
- ❓ **Độ tin cậy trên Android của các hãng** diệt tác vụ nền hoặc tối ưu pin mạnh (Xiaomi, Oppo, Huawei…): phải thử trên thiết bị. Không để tính đúng đắn của bất cứ thứ gì phụ thuộc vào việc thông báo đến.

### 9.2 Sao lưu tự động của hệ điều hành

Khắc phục điểm yếu lớn nhất của web (xoá dữ liệu trang, Safari xoá sau 7 ngày). Android: `allowBackup` (mặc định) cùng cấu hình `dataExtractionRules`/`fullBackupContent` để chắc chắn **bao gồm** tệp tiến độ ❓; iOS: để tệp ở Application Support, không đặt cờ loại trừ backup. Giới hạn: Android Auto Backup tối đa 25 MB (tệp ≈ 290 KB — dư), phụ thuộc người dùng đã bật backup Google; iOS phụ thuộc iCloud/iTunes backup. **Không thay thế xuất tệp** — nhắc "đã X ngày chưa sao lưu" ở Cài đặt. Phải kiểm bằng thử nghiệm cài lại thật (mục 12.4), không tin mặc định.

### 9.3 Xuất / nhập tệp

`share_plus` 13.3.1 (2026-10-01) mở share sheet (Drive, Zalo, email, AirDrop…); `file_picker` 13.1.0 (2026-09-15) chọn tệp qua Storage Access Framework / Files 📘. Quy tắc giữ như web: tên `kana-dojo-tien-do-YYYY-MM-DD.json`, đúng định dạng `ProgressState` v1, giới hạn nhập 5 MiB, hộp thoại xác nhận "Thay toàn bộ tiến độ?", áp dụng nguyên tử, tệp sai không đụng tiến độ hiện có. Tương thích hai chiều với web được kiểm bằng fixture `state-parse` (có một tệp xuất thật từ web).

### 9.4 Âm thanh

Web dùng `speechSynthesis` `ja-JP`, tốc độ 0,72, chọn giọng khớp `^ja`; báo "máy chưa cài giọng tiếng Nhật" khi không có.

- **v1:** `flutter_tts` 4.2.5 (2026-01-05) 📘 — TTS của hệ điều hành. Phải: hỏi `isLanguageAvailable("ja-JP")`, hướng dẫn cài giọng khi thiếu, và **hiệu chỉnh lại thang tốc độ** (thang `rate` của Android và iOS khác nhau, không dùng 0,72 nguyên xi) ❓. Chất lượng khác nhau theo máy; TTS có thể đọc một chữ đơn lẻ không tự nhiên (ví dụ は đọc là "ha" hay "wa"?) ❓.
- **v1.1 (P1): âm thu sẵn** cho 208 kana + 80 từ + 80 câu ≈ 370 clip, ≈ 15 KB/clip (đơn kênh, 1–2 s) ≈ 5–6 MB 📐; phát bằng `just_audio` 0.10.6 (2026-06-29) 📘. Nguồn âm thanh (mọi phương án đều có điều kiện giấy phép):
  - *Thu bởi người bản ngữ có hợp đồng*: chất lượng tốt nhất, tốn tiền.
  - *Tổng hợp bằng dịch vụ TTS thương mại rồi đóng gói*: điều khoản của từng nhà cung cấp quyết định việc phân phối lại trong app ❓ — đọc kỹ trước.
  - *Tatoeba*: mỗi tệp âm thanh một giấy phép, có loại cấm thương mại hoặc dẫn xuất 📘 → phải lọc theo giấy phép, hoặc tránh.
- Âm điệu (pitch accent) là nội dung nâng cao, nguồn và giấy phép chưa khảo sát ❓.

### 9.5 Rung phản hồi

`HapticFeedback.selectionClick` / `lightImpact` khi nét đạt, `mediumImpact` khi trượt, `heavyImpact` khi hoàn thành chữ. Tắt được trong Cài đặt; hệ điều hành có thể chặn. Âm hiệu (tiếng "tách" khi đạt) là tuỳ chọn.

### 9.6 Bút và máy tính bảng

`PointerEvent.pressure` (Apple Pencil, S Pen) làm độ dày nét hiển thị; `perfect_freehand` 2.5.2+1 (2026-01-26) 📘 dựng đường viền nét lông. Chấm điểm **không đổi** (dùng điểm thô). Thử: `PointerHoverEvent` của Pencil, độ trễ, từ chối lòng bàn tay của hệ điều hành ❓. Bố cục hai khung và ô lớn cho máy tính bảng (mục 7.5) giúp dung sai vật lý rộng hơn hẳn điện thoại (mục 6.7).

### 9.7 Widget màn hình chính

`home_widget` 0.10.0 (2026-09-17; Flutter ≥ 3.38.1) 📘. Mô hình: Dart ghi **một snapshot nhỏ** (chuỗi ngày, thẻ đến hạn, XP hôm nay) vào kho dùng chung (iOS: App Group; Android: `SharedPreferences`) rồi widget native đọc. **Phải viết hai khối mã native**: iOS WidgetKit (SwiftUI) và Android AppWidget/Glance (Kotlin) → độ khó L, kỹ năng ngoài Flutter. Cập nhật mỗi `commit` và theo lịch; iOS giới hạn ngân sách làm mới timeline ❓. `UserDefaults` dùng chung qua App Group cũng thuộc nhóm API cần khai Privacy Manifest — kiểm mã lý do phù hợp ❓. Giá trị: thấy chuỗi ngày và số thẻ mỗi lần mở khoá màn hình.

### 9.8 Nhận dạng chữ viết tay (ML Kit)

`google_mlkit_digital_ink_recognition` 0.16.1 (2026-08-17; Dart ^3.12, Flutter ≥ 3.44; Android và iOS) 📘. Chạy **trên thiết bị**, tải gói ngôn ngữ khi cần, hỗ trợ 300+ ngôn ngữ trong đó có tiếng Nhật 📘; **kích thước gói mô hình tiếng Nhật không được công bố ở trang tổng quan** ❓ → đo.

Dùng để:

1. **Viết tự do:** viết một chữ hoặc một từ không có nét mờ, app nhận dạng và nói "đây là ふ" — kiểm tra cuối cùng độc lập với chấm nét.
2. **Kiểm chéo:** nếu nét đạt điểm cao nhưng nhận dạng ra chữ khác, đó là tín hiệu về dữ liệu mẫu hoặc ngưỡng chấm cần xem lại.
3. **Viết cả từ vựng** (nhiều ký tự trên một dòng): nâng cấp lớn so với web, vốn chỉ viết từng kana.

Ràng buộc: **tải mô hình lần đầu cần mạng** (lệch với "không bao giờ cần mạng") → làm tính năng **opt-in**, nói rõ trước khi tải, và xem lại nhãn quyền riêng tư ❓; **không kiểm thứ tự nét** (đó là việc của engine); độ chính xác với chữ viết bằng ngón tay trên màn nhỏ phải đánh giá trên nét thật trước khi cam kết ❓; thêm thư viện native `.so` → kiểm 16 KB page size (mục 11.2).

### 9.9 Chuyển máy và đồng bộ không tài khoản

| Phương án | Cách hoạt động | Ưu | Nhược |
|---|---|---|---|
| Tệp thủ công (v1) | Xuất → chuyển → nhập | Đã có; tương thích web | Thủ công, dễ quên |
| Backup của hệ điều hành | Tự khôi phục khi dùng máy mới cùng hệ sinh thái | Không phải làm gì | Chỉ Android→Android, iOS→iOS; không chủ động |
| Mã / QR truyền trực tiếp | Nén JSON, chia nhiều khung QR hoặc truyền qua mạng nội bộ | Không đám mây | Một QR chứa cỡ vài KB nên 290 KB cần nhiều khung hoặc kết nối LAN; phức tạp ❓ |
| iCloud Key-Value (chỉ iOS) | Tự đồng bộ | Không cần tài khoản riêng của app | Chỉ iOS, dung lượng nhỏ ❓; Android không có tương đương không cần đăng nhập |
| Đồng bộ có tài khoản | Máy chủ + CSDL | Đa nền tảng | **Phá nguyên tắc cốt lõi** (mục 2) |

**Gộp hai trạng thái không làm đúng được nếu chỉ có `ProgressState`:** XP và tổng hợp theo ngày là số cộng dồn — gộp bằng "lấy lớn hơn" thì mất, bằng "cộng" thì nhân đôi. Chỉ làm đúng với **nhật ký sự kiện**: gộp = hợp các sự kiện theo `id` rồi tính lại (mục 10.1). Nên nhật ký ôn là điều kiện tiên quyết của mọi dạng đồng bộ.

### 9.10 Liên kết sâu web ↔ app

Android App Links (`assetlinks.json` trong `/.well-known/`, `autoVerify`) và iOS Universal Links (`apple-app-site-association`) cho phép link `…/luyen-viet?c=あ` mở thẳng khung viết trong app; web có thể hiện banner "Mở trong ứng dụng". **Phụ thuộc tên miền chính thức — mà web chưa được triển khai công khai** (repo private, không có deployment; kiểm tra 2026-10-02 ✅). Chốt domain trước (xem [DEPLOYMENT.md](DEPLOYMENT.md): đổi domain làm mất tiến độ web).

### 9.11 – 9.12 Phát âm và phím tắt hệ thống

`speech_to_text` 7.5.0 (2026-09-14; Dart ^3.12, Flutter ≥ 3.44) 📘 dùng bộ nhận dạng của nền tảng; một số cấu hình gửi âm thanh lên đám mây tuỳ hệ điều hành ❓ → mâu thuẫn nhãn riêng tư, để P3 và opt-in. Phím tắt Siri / App Shortcuts: giá trị thấp, cần mã native; để sau.

---

## 10. Nâng cấp phương pháp học và nội dung

### 10.1 Nhật ký ôn (revlog), tối ưu FSRS và nền cho đồng bộ

Web đã bỏ nhật ký ôn ("Không còn lưu nhật ký từng lần ôn", SPEC §2). Hệ quả: không tối ưu được tham số theo người học, không vẽ được thống kê sâu, không gộp được dữ liệu giữa thiết bị.

**Đề xuất** 📐: sự kiện `ReviewEvent { id, ts, dayKey, type: review|writing|quiz, itemKey?, grade?, score?, elapsedDays?, durationMs }`. ≈ 60–80 byte mỗi sự kiện (JSON) → ≈ 1.000 sự kiện/tháng ≈ 80 KB/tháng ≈ 1 MB/năm → chuyển lưu sang SQLite (`drift`) khi bật. `ProgressState` trở thành **bản chụp (cache)** tính từ sự kiện bằng hàm `fold` thuần và tất định; gộp hoặc đồng bộ = hợp sự kiện theo `id` rồi tính lại. Lưu `dayKey` trong sự kiện để việc tính lại không phụ thuộc múi giờ lúc đó. Đổi sang mô hình này là tăng `STATE_VERSION` lên 2 → **cập nhật web trước** để web đọc được (hoặc chấp nhận có chủ đích một chiều).

**Tối ưu tham số FSRS.** Tài liệu Anki 📘: dưới "vài trăm lần ôn" thì chất lượng FSRS bị hạn chế; tối ưu lại khoảng mỗi tháng là đủ; **không chép tham số của người khác**; khuyên giữ mức nhớ mong muốn dưới 97% (mặc định 90%). Cách làm, theo thứ tự rủi ro tăng dần:

1. *Xuất nhật ký để tối ưu bên ngoài* (nghiên cứu, hiệu chỉnh nội bộ) — rẻ nhất.
2. *Trong app qua `fsrs-rs` + `flutter_rust_bridge`.* Có kho `fsrs-rs-dart`, nhưng README **không** nêu việc đưa optimizer ra Dart, không nêu đã có trên pub.dev, không nêu phiên bản FSRS, mức bảo trì chưa rõ, và bắt buộc cài Rust 📘 → cần **một spike riêng** ❓. Ngoài ra engine của ta có quy ước riêng (bước học 1/10 phút, học lại 10 phút, công thức trong cùng ngày) nên tham số `fsrs-rs` huấn luyện chỉ dùng được nếu công thức lõi thực sự trùng ❓.
3. *Chờ.*

**Việc làm được ngay, không cần nhật ký:** `desiredRetention` chỉnh được (0,80–0,95; cảnh báo trên 0,97 📘; hiện là hằng 0,9); `NEW_CARDS_PER_DAY` chỉnh được (hiện hằng 10); **dự báo số thẻ đến hạn 7/30 ngày** (tính từ `dueAt` hiện có); phát hiện thẻ "đỉa" (nhiều lần quên) và đưa gợi ý mẹo nhớ.

### 10.2 Lộ trình học và hàng đợi: ba khoảng hở của bản hiện tại

1. **Thẻ từ vựng đến rất muộn.** `buildQueue` cấp thẻ mới theo thứ tự loại `KANA_WRITING → KANA_READING → VOCAB_MEANING → VOCAB_READING` với hạn mức chung **10 thẻ mới/ngày**. Hàng đợi phải cấp hết 208 thẻ viết, rồi 208 thẻ đọc, mới tới từ vựng → thẻ từ vựng chỉ bắt đầu xuất hiện sau **416 thẻ kana**: **≈ 42 ngày** nếu học hoàn toàn qua hàng đợi, và **sớm nhất ≈ 21 ngày** nếu người học tự viết hết 208 chữ ở phòng Luyện viết trước (thẻ viết tạo từ đó không bị hạn mức 10/ngày chặn, còn thẻ đọc chỉ tạo được qua hàng đợi) ✅ (tính từ `buildQueue` và `recordWriting`). README đã ghi nhận hạn chế này; người muốn học từ vựng N5 sớm không có đường, và thẻ **đọc** kana chỉ đến sau khi mọi chữ đã có thẻ viết.
2. **Thẻ đọc và từ vựng vẫn tự chấm.** Trang Ôn tập hiện đáp án rồi người học tự chọn 1–4 cho `KANA_READING`, `VOCAB_*` — đi ngược luận điểm của chính sản phẩm ("Anki/WaniKani bắt người học tự chấm … dữ liệu nhiễu", SPEC §3.4). Chỉ `KANA_WRITING` được chấm tự động.
3. **Chưa có nút "thêm vào ôn tập"** ở trang Từ vựng (README: trang chỉ để tra cứu).

**Đề xuất** 📐:

- Mở khoá theo **mức thành thạo**, không theo số đếm: *đường kana* (viết cho chữ mới + **đọc xen kẽ** cho các chữ đã mở) và *đường từ vựng* mở khi hiragana cơ bản đã thành thạo (cùng điều kiện huy hiệu `HIRAGANA_MASTER`) hoặc người học bật tay; **hạn mức riêng cho từng đường**, chỉnh được.
- Nút "Thêm vào ôn tập" trên từ vựng.
- **Thẻ đọc kana → chọn đáp án hoặc gõ romaji; thẻ từ vựng → trắc nghiệm nghĩa hoặc gõ cách đọc;** tự suy ra grade từ đúng/sai và thời gian trả lời (sai → Quên; đúng nhưng chậm → Được; đúng và nhanh → Dễ; ngưỡng thời gian tính theo độ dài đáp án). Giữ chế độ tự chấm như một tuỳ chọn. Đây là thay đổi **engine** (cần fixture và bàn bạc chung với web).

### 10.3 Nội dung

- **Mẹo nhớ bằng tiếng Việt và các cặp dễ nhầm** (シ/ツ, ソ/ン, ヌ/メ, ぬ/め, ね/れ/わ…): web đã có `explanationVi` cho cả 38 câu quiz ✅ → dùng làm hạt giống; **sinh quiz động từ các cặp dễ nhầm** thay vì 4 bài cố định.
- **Bài giải thích biến âm và âm ghép** (hiện chỉ có trong bảng).
- **Phòng luyện gõ:** web có `/luyen-go` (bản gộp tương thích site tĩnh ở nhánh `claude/typing-room-unified`, thiết kế trong `docs/TYPING.md` của nhánh đó; thay cho PR #2). Bộ máy riêng ở `lib/typing/`, kỷ lục lưu riêng ngoài `ProgressState`. Bản mobile có thể port bộ máy gõ (thuần hàm) nhưng **điện thoại không có bàn phím vật lý**: chỉ chế độ IME/flick dùng được ❓ (đúng như web ghi cho màn cảm ứng) — cần quyết định riêng, sau v1.
- **Chữ Hán.** Engine không biết mình đang vẽ kana (ARCHITECTURE: *Hướng mở rộng*); KanjiVG có 6.763 tệp, mỗi nét là đường tâm đơn tuyến (SPEC §1.1). **Bắt đầu từ 160 chữ Hán đã có trong từ vựng và quiz** ✅. Ước lượng dung lượng 📐: kana = 59 KB / 433 nét ≈ 136 B/nét, nên 500 chữ × ≈ 11 nét ≈ 0,75 MB thô (số nét trung bình ≈ 10–12 là suy đoán ❓). Cần: bộ sinh dữ liệu (script cũ vẫn trong git: `git show ed8ff35:archive/legacy-v1/build_data.py`), ngưỡng chấm riêng cho nét dài/ngắn và ô nhỏ hơn, giấy phép CC BY-SA 3.0 như kana.
- **Mở rộng từ vựng.** Hiện 80 từ (70 N5 + 10 N4). Nguồn: JMdict (CC BY-SA 4.0, bắt buộc ghi công 📘) — nhưng kho này chủ yếu có nghĩa bằng ngôn ngữ châu Âu nên `meaningVi` phải biên soạn và duyệt tay ❓. Câu ví dụ: Tatoeba (CC BY 2.0 FR, ghi tên tác giả từng câu 📘). Danh sách cấp JLPT phổ biến là phi chính thức → ghi rõ nguồn. Giữ bất biến `id` chỉ thêm cuối.
- **Trò chơi hoá:** nhiệm vụ ngày/tuần; **thẻ chia sẻ thành tích** (dựng ảnh bằng `RepaintBoundary` + share sheet); thêm huy hiệu; *không* có bảng xếp hạng (cần máy chủ — web đã bỏ vì lý do này).
- **Chấm nét:** tách phản hồi "đúng hình, sai thứ tự" khỏi "sai hình"; thêm độ trôi chảy (tốc độ); độ khó theo loại con trỏ (mục 6.7).

### 10.4 Đo lường mà không theo dõi

Thống kê cục bộ (đã có `daily`, sẽ có nhật ký sự kiện). **Không** SDK phân tích. Nếu cần dữ liệu thật để chỉnh ngưỡng chấm → kênh **tự nguyện**: "Chia sẻ ẩn danh nét viết của tôi" (xem trước dữ liệu, người dùng tự gửi tệp qua email/biểu mẫu) — vẫn không có SDK, không có mạng ngầm. Cần chốt ❓.

---

## 11. Phát hành và vận hành

### 11.1 Môi trường dev hiện tại

Chạy `flutter doctor -v` ngày 2026-10-02 ✅:

| Hạng mục | Hiện có | Cần |
|---|---|---|
| Flutter / Dart | 3.35.4 / 3.9.2 (2025-09, stable cũ) | **3.47.x** (Dart 3.13.x). Các gói đề xuất ở phiên bản mới nhất đòi Dart ≥ 3.12 / Flutter ≥ 3.44 📘 nên với 3.35.4 không dùng được (pub báo xung đột hoặc lùi về bản cũ hơn, khác với bản đã tra cứu ở phụ lục C) |
| Android SDK | Có (35.0.0), **thiếu `cmdline-tools`**, license "unknown" | Cài `cmdline-tools`, `flutter doctor --android-licenses`, platform **36** (bắt buộc cho target) |
| Android Studio | Hai bản: 2025.1.3 báo "Unable to find bundled Java", 2026.1.3 chạy được (JDK 25) | Dùng một bản hoạt động; kiểm tương thích JDK với bộ công cụ Android của Flutter 3.47 ❓ |
| JDK | JDK 17 trên PATH | — |
| **iOS** | **Không** (máy Windows) | macOS: CI (GitHub Actions runner macOS, Codemagic…) hoặc máy Mac; Xcode 26+ |
| Visual Studio | Không có | Không cần (không làm app Windows) |
| Ghim phiên bản | — | FVM hoặc ghi cứng phiên bản trong CI ❓ (bản stable mùa thu ra tháng 11 📘) |
| `ANDROID_HOME` | Chưa đặt | Đặt thành `C:\Users\rando\AppData\Local\Android\Sdk` (đường dẫn Android SDK mà `flutter doctor` báo; theo phiên viết CONTRACT.md) |
| Mức OS tối thiểu | Flutter 3.47: Android **API 24** (hỗ trợ 24–37, CI thử 24–36), iOS **15** (hỗ trợ 15–27) 📘 | Đặt `minSdk 24` và iOS deployment target 15 |
| JDK cho Android Studio 2026.1.3 | JDK 25 đi kèm | Nếu Gradle báo không tương thích, trỏ Flutter tới JDK 17 đã có trên máy: `flutter config --jdk-dir` ❓ chưa thử |

### 11.2 Chính sách cửa hàng

| Nền tảng | Yêu cầu | Mốc | Nghĩa với dự án |
|---|---|---|---|
| Google Play 📘 | **Target API 36** cho app mới và bản cập nhật; xin gia hạn tới 2026-11-01; app đang có phải ≥ API 35 để còn hiển thị cho người dùng mới trên Android cao hơn | **2026-08-31 (đang hiệu lực)** | Bản đầu tiên phải target 36; kiểm `targetSdkVersion` mặc định của Flutter 3.47 ❓ |
| Google Play 📘 | Mọi app target Android 15+ phải hỗ trợ **16 KB page size** trên thiết bị 64-bit | **2027-02-01** | App có thư viện native (engine Flutter, ML Kit…) phải căn chỉnh 16 KB: AGP ≥ 8.5.1 và NDK ≥ r28 cho mặc định đúng. Kiểm: `zipalign -c -P 16 -v 4 app.apk`, `bundletool dump config … \| grep alignment` ra `PAGE_ALIGNMENT_16K`. ❓ kiểm từng plugin native |
| Google Play 📘 | Tài khoản cá nhân tạo sau 2023-11-13: closed test **≥ 12 tester opt-in liên tục ≥ 14 ngày** trước khi xin production; tài khoản tổ chức hoặc cũ hơn được miễn | — | **Chọn loại tài khoản sớm:** ảnh hưởng lịch phát hành ≥ 2 tuần |
| Android 16 📘 | Màn hình lớn bỏ qua hạn chế hướng/co giãn; edge-to-edge bắt buộc; predictive back | Khi target 36 | Mục 7.5 |
| Apple 📘 | Bản tải lên App Store Connect build bằng **Xcode 26+ / SDK iOS 26+** | **2026-04-28 (đang hiệu lực)** | Cần macOS với Xcode 26 |
| Apple 📘 | **Privacy Manifest** cho các API "required reason": `UserDefaults`, file timestamp, system boot time, disk space, active keyboard. Dùng mà không khai → bị từ chối. `UserDefaults` dùng riêng cho app khai `CA92.1` | — | `shared_preferences` bọc `NSUserDefaults`: kiểm báo cáo privacy của Xcode (*Generate Privacy Report* khi archive) để chắc plugin đã kèm manifest ❓; **báo cáo:** `file_picker` 12.0.0–12.1.1 (và `file_picker_darwin` 1.0.0–1.0.2) từng **rơi `PrivacyInfo.xcprivacy` khi build bằng Swift Package Manager** → App Store báo ITMS-91061 (issue #2175 của `file_picker`, đã đóng kèm cách sửa; chưa kiểm bản 13.1.0 đã có bản vá chưa ❓) |
| Flutter 3.47 📘 | iOS tối thiểu **15**; SDK iOS 27 đòi vòng đời **UIScene** cho mọi app UIKit; CocoaPods chuyển sang bảo trì, Swift Package Manager đã có 92/100 plugin hàng đầu | — | Dự án mới theo template mới là đủ; ưu tiên plugin hỗ trợ SwiftPM |
| Apple (ARCHITECTURE) | 5.1.1(v): mô hình không tài khoản phù hợp; 4.2.2 loại app chỉ là "web clipping" | — | Có tính năng native thật (thông báo, widget, bút) |

Cả hai cửa hàng thường đòi **URL chính sách quyền riêng tư** dù app không thu thập gì 📐 — một trang tĩnh "không thu thập dữ liệu", đặt cùng web.

### 11.3 CI/CD

Workflow `mobile.yml` (đề xuất), kích hoạt khi đổi `mobile/**`, `web/src/lib/**`, `web/src/data/**`:

1. `engine-parity` (Linux): Node 22 + `npm ci` ở `web/` → sinh fixture → `dart test` trong `kd_engine`; chạy lại trên runner ARM64 nếu có ❓.
2. `analyze-test` (Linux): `flutter analyze`, `flutter test` (widget + golden).
3. `android` (Linux): `flutter build appbundle --release`, kiểm 16 KB bằng `zipalign`, lưu artifact.
4. `ios` (macOS, chỉ nhánh phát hành vì tính phí theo phút ❓): `flutter build ipa`, ký bằng secrets, đẩy TestFlight.
5. Phát hành: Play internal track / TestFlight bằng fastlane hoặc Codemagic ❓ (chưa chọn).

Ký: keystore Android (Play App Signing) và chứng chỉ/provisioning iOS nằm trong secrets — đó là bí mật **lúc build**; app vẫn không có bí mật lúc chạy. Phiên bản: SemVer `x.y.z+build`, độc lập với `STATE_VERSION`.

### 11.4 Quyền riêng tư và tuân thủ

Mục tiêu nhãn "không thu thập dữ liệu" (Apple *Data Not Collected*, Play *Data safety*: không thu thập, không chia sẻ). **Xem lại nhãn mỗi khi thêm tính năng** ❓: ML Kit (tải mô hình), nhận dạng giọng nói, âm thanh tải từ mạng đều có thể làm đổi câu trả lời. Ghi công giấy phép (mục 8.5). Không quảng cáo. Nếu nhắm cả trẻ em: kiểm chính sách dành cho gia đình của hai cửa hàng ❓.

### 11.5 Cập nhật và di trú dữ liệu

`STATE_VERSION` ở cả hai phía; tệp phiên bản mới hơn bị từ chối bằng thông báo "hãy cập nhật ứng dụng"; migrate chạy lúc nạp. **Tăng version thì cập nhật web trước.** Không có máy chủ nên không ép cập nhật được — thiết kế để bản cũ không hỏng khi gặp tệp mới (từ chối, không ghi đè). Nhịp nâng Flutter: bản stable theo quý; nâng trong vòng ≈ 1 tháng sau khi các plugin sẵn sàng, chạy lại toàn bộ test và fixture ARM.

### 11.6 Giám sát

Không telemetry. Dùng số liệu có sẵn của cửa hàng (Play Console vitals cho ANR/crash; Xcode Organizer và App Store Connect cho crash) 📐 — không cần SDK. Báo cáo crash chi tiết hơn (Sentry…) chỉ opt-in và sẽ làm đổi nhãn quyền riêng tư; không làm ở v1.

---

## 12. Kiểm thử và chất lượng

### 12.1 Tháp kiểm thử

| Tầng | Công cụ | Nội dung | Chạy khi |
|---|---|---|---|
| Engine + fixture | `dart test` (`kd_engine`) | Mục 5.6; x64 và ARM64 | Mọi PR |
| Widget | `flutter test` | Bố cục, khoá chống chấm đúp, đồng hồ quiz (`fakeAsync`), bàn phím, **khung viết bằng `WidgetTester.startGesture` / `TestPointer`** | Mọi PR |
| Golden | `flutter test --update-goldens` có kiểm soát | Màn chính ở sáng/tối, chữ 1× và 2×, điện thoại và máy tính bảng | Mọi PR |
| Tích hợp | `integration_test` | Viết → lưu → mở lại; nhập tệp web; tắt app giữa lúc ghi; sao lưu/khôi phục | Nhánh phát hành |
| Thiết bị thật | Thủ công theo bảng 6.6 | Mọi dòng ❓ | Trước mỗi bản phát hành |

### 12.2 Ma trận thiết bị 📐

Android: máy yếu (RAM 2 GB, Android Go), tầm trung, cao cấp; Android 10 đến 16; một máy của hãng diệt nền mạnh (Xiaomi / Oppo); máy gập mở. iOS: iPhone cỡ nhỏ (375 × 667), iPhone hiện hành; iPad có Pencil. Bút: Apple Pencil, S Pen, bút điện dung rẻ tiền. Màn hình: 60 Hz và 120 Hz.

### 12.3 Ca kiểm thử khung viết

Toàn bộ bảng 6.6; thêm: giảm chuyển động; chữ co giãn 200%; TalkBack và VoiceOver; giao diện tối; xoay màn hình; ngón thứ hai chạm giữa nét; nét viết ra ngoài rìa khung; hai lần trượt liên tiếp phát lại hoạt ảnh; app bị đưa xuống nền giữa nét.

### 12.4 Ca dữ liệu

Tắt app giữa lúc ghi (nguyên tử + `.bak`); đầy đĩa (giữ trong bộ nhớ và cảnh báo như `isPersistent` của web); tệp hỏng → khôi phục từ `.bak` và giữ bản hỏng; nhập **tệp xuất thật từ web**; nhập tệp phiên bản mới hơn; tệp > 5 MiB; đổi múi giờ giữa phiên; đồng hồ hệ thống chỉnh lùi (`elapsedDays` đã kẹp `max(…, 0)`); **cài lại rồi khôi phục backup** (Android: `adb shell bmgr`; iOS: khôi phục từ backup).

### 12.5 Ngân sách hiệu năng 📐

Khởi động nguội < 2 s trên máy tầm trung; khung hình lớp mực ≤ 16,6 ms (60 Hz) hoặc ≤ 8,3 ms (120 Hz); dung lượng tải về ≤ 30 MB (AAB) — **chưa đo ❓**, đo ngay từ bản build đầu tiên và chặn hồi quy trong CI.

### 12.6 Trợ năng tự động

`tester.ensureSemantics()` cùng `meetsGuideline(textContrastGuideline | labeledTapTargetGuideline | androidTapTargetGuideline | iOSTapTargetGuideline)` cho mọi màn hình chính.

### 12.7 Hồi quy chấm nét

Nét thật (từ beta, có đồng ý) làm fixture cố định: mọi thay đổi công thức hoặc ngưỡng phải cho thấy tác động lên tập này trước khi gộp.

---

## 13. Rủi ro

| # | Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---|---|---|---|
| 1 | Hai bản engine lệch nhau theo thời gian | Trung bình | Cao | Fixture trong CI hai phía; chạy cả ARM; quy tắc "đổi engine = đổi cả hai" |
| 2 | Khung viết kém trên thiết bị thật (cử chỉ mép, cancel, lòng bàn tay) | **Cao** | Cao | Làm sớm (M3); ma trận thiết bị; chừa lề; bảng 6.6 |
| 3 | Dung sai quá chặt trên ô nhỏ (ký tự ghép xếp ngang) | **Cao** | Cao | Ký tự ghép lần lượt trong ô lớn; hiệu chuẩn bằng nét thật (mục 6.7) |
| 4 | Không build được iOS trên máy hiện có | **Chắc chắn** | Cao | CI macOS hoặc máy Mac — chốt cách ngay từ M0 |
| 5 | Plugin native không đạt 16 KB hoặc ngừng bảo trì | Trung bình | Trung bình | Kiểm bằng `zipalign`; ML Kit để P2 và opt-in; chọn plugin hỗ trợ SwiftPM |
| 6 | Tài khoản Play cá nhân: 12 tester × 14 ngày | Trung bình | Trung bình (trễ ≥ 2 tuần) | Lập danh sách tester sớm hoặc dùng tài khoản tổ chức |
| 7 | Apple từ chối (Privacy Manifest, 4.2) | Thấp–Trung bình | Cao | Khai manifest; có tính năng native thật |
| 8 | Thông báo không đến trên Android của hãng diệt nền | **Cao** | Trung bình | Không dựa vào thông báo cho tính đúng; hướng dẫn trong app; thử thật |
| 9 | Mất dữ liệu (ghi dở, backup không khôi phục) | Thấp | **Rất cao** | Ghi nguyên tử + `.bak`; thử cài lại thật; nhắc xuất tệp định kỳ |
| 10 | Flutter/Material biến động (3.47 tách gói; bản mùa thu tháng 11) | Cao | Thấp–Trung bình | UI tuỳ biến `kd_ui`; ghim phiên bản; nâng theo nhịp |
| 11 | Phông không phủ glyph (ô vuông "tofu") | Trung bình | Trung bình | Script kiểm bảng ký tự trong CI (mục 8.2) |
| 12 | Giấy phép dữ liệu (share-alike KanjiVG/JMdict; âm thanh Tatoeba) | Trung bình | Trung bình–Cao | Ghi công; lọc âm thanh theo giấy phép; hỏi chuyên gia khi kiếm tiền |
| 13 | Ngưỡng chấm không hợp người dùng (quá khó/dễ) → bỏ cuộc | Trung bình | Cao | Beta kín; đo phân bố điểm; tham số hoá |
| 14 | Phạm vi trượt (nâng cấp chen vào v1) | **Cao** | Trung bình | Khoá phạm vi v1 (mục 2); backlog P1/P2 tách riêng |
| 15 | Web chưa triển khai công khai, tên miền chưa chốt ✅ | — | Trung bình | Chốt domain trước khi làm liên kết sâu (9.10) |
| 16 | Điểm nét lệch giữa hai nền tảng vì `PathMetric` ≠ trình duyệt ✅ | Chắc chắn (có lệch) | Thấp: ≤ 1 điểm, ≈ 0,05% lật ngưỡng | Bảng mẫu chung `kana-samples.json` (mục 5.6) |

---

## 14. Lộ trình và ước lượng

Ước lượng 📐 cho **một dev quen Flutter, làm toàn thời gian**; khoảng giá trị phản ánh độ bất định. Không gồm: thiết kế đồ hoạ (biểu tượng, ảnh cửa hàng), nội dung mới, thời gian chờ duyệt của cửa hàng, thiết bị thử.

| Giai đoạn | Nội dung | Tiêu chí hoàn thành | Tuần |
|---|---|---|---|
| **M0 Chuẩn bị** | Nâng Flutter 3.47, Android SDK, FVM; monorepo `mobile/` + `contract/`; CI khung; chốt app id và cách build iOS. **Phía web (cho hợp đồng):** sinh `kana-samples.json`; chốt chiều nội dung (quyết định 13); xuất JSON Schema từ zod (tuỳ chọn, để kiểm tệp nhập); bộ sinh fixture chạy dưới **Vitest** (`node` trần không giải được bí danh `@/`); job CI kiểm fixture đã commit không đổi sau khi sinh lại | `flutter doctor` xanh; build APK trống; CI chạy; fixture sinh được từ web | 1–1,5 |
| **M1 Engine + fixture** | Port phần còn lại (reviews, activity, badges, quiz, time, state-parse, content) trên nền spike; đủ sáu nhóm fixture; `ProgressRepository` dạng tệp | 100% fixture qua trên x64 và ARM; 95 test của `src/lib` có ánh xạ | 2 |
| **M2 Design system + khung app** | Token (đã sửa AA), `kd_ui`, điều hướng, theme, phông cắt tập con, l10n vi | Năm tab rỗng; golden sáng/tối | 2 |
| **M3 Khung viết nét** | Lớp vẽ, mô hình nét, cổng con trỏ, chấm, hoạt ảnh; thử thiết bị thật | Viết đủ 208 chữ trên ≥ 4 thiết bị; bảng 6.6 có kết luận | 3 |
| **M4 Màn hình lõi** | Hôm nay, Học (kana + từ vựng), Viết, Ôn tập, Quiz, Tôi (sao lưu/nhập) | Ngang web v2; nhập được tệp xuất từ web | 3–4 |
| **M5 Native cơ bản** | Thông báo, TTS, rung, trợ năng, (en) | Các mục P0 ở mục 9 | 2–3 |
| **M6 Hoàn thiện, phát hành** | Ma trận thiết bị, hiệu năng, ghi công, tài sản cửa hàng, chính sách quyền riêng tư; beta kín | Beta kín → production (+ 14 ngày chờ closed test nếu tài khoản cá nhân) | 2 |
| **Tổng** | | | **≈ 15–18** |

Nên dự phòng thêm **10–25%** cho các ẩn số lớn (build iOS lần đầu, hành vi cảm ứng trên thiết bị thật, plugin bất ngờ) → khoảng 17–22 tuần.

M2 và M3 độc lập với nhau, có thể song song nếu có hai người. **Đường găng là M3**: chất lượng khung viết quyết định chất lượng sản phẩm → làm sớm, thử thiết bị sớm.

Sau v1, theo ưu tiên ở mục 9–10: **P1** âm thu sẵn, widget, bút, nhật ký ôn + dự báo, `desiredRetention` chỉnh được; **P2** ML Kit, đồng bộ tuỳ chọn, liên kết sâu, lộ trình học mới (10.2), chữ Hán; **P3** chấm phát âm, phím tắt hệ thống.

---

## 15. Quyết định cần chốt

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| 1 | Nền tảng v1: Android và iOS cùng lúc? iOS cần macOS (CI hoặc máy Mac) | Cả hai; **beta Android trước** vì kiểm được ngay trên máy hiện có |
| 2 | Cấu trúc repo | Monorepo `mobile/` + `contract/` (mục 4.3) |
| 3 | Tên miền chính thức và app id | Chốt trước — phụ thuộc việc triển khai web (hiện chưa có) |
| 4 | Loại tài khoản cửa hàng: cá nhân hay tổ chức | Quyết định sớm vì ảnh hưởng ≥ 2 tuần lịch (12 tester × 14 ngày) |
| 5 | Ngôn ngữ giao diện v1 | Việt trước; kiến trúc l10n sẵn để thêm Anh |
| 6 | ML Kit (tải mô hình lần đầu cần mạng) | Chỉ như tính năng **opt-in**, P2 |
| 7 | Đồng bộ thiết bị | v1: tệp thủ công + backup hệ điều hành |
| 8 | Chữ Hán: khi nào, bắt đầu từ 160 chữ đã có? | Sau v1 (P2); cần thiết kế riêng cho ô nhỏ và nét dài |
| 9 | Sửa trước ở web: màu đạt AA, tự lưu phông (mục 7.4, 8.3) | Tách PR riêng, làm trước hoặc song song M2 |
| 10 | Kiếm tiền (nếu có) | Xem lại giấy phép share-alike (8.5) và nhãn quyền riêng tư (11.4) trước |
| 11 | PR #2–#4 của web (còn mở, dựa trên bản có backend) | #3, #4 đã bị #5 thay thế → đóng; #2 (phòng luyện gõ) được thay bằng nhánh `claude/typing-room-unified` đã tương thích site tĩnh → đóng khi nhánh đó merge |
| 12 | Mẫu điểm nét: mỗi nền tảng tự lấy mẫu (A) hay bảng chung `kana-samples.json` (B) | **B** — `PathMetric` lệch web tới 0,456 đơn vị (mục 5.6); B cho điểm giống hệt và test chấm nét được trong Node |
| 13 | Chiều nội dung: JSON làm bản gốc (web nhập JSON) hay sinh JSON từ `.ts` | Bắt đầu bằng **sinh từ `.ts`** (không đụng web; import được bằng `node` trần ✅); lật sang JSON gốc khi nội dung lớn lên ([CONTRACT.md §3.1](CONTRACT.md#31-tệp-nội-dung) đề xuất lật ngay) |

---

## Phụ lục A. Kết quả spike

Mã và cách chạy: [`docs/spikes/flutter-engine-parity/`](spikes/flutter-engine-parity/README.md) (engine, sắp xếp, độ lệch của trình duyệt) và [`docs/spikes/flutter-pathmetric/`](spikes/flutter-pathmetric/README.md) (`PathMetric`, cần Flutter). Môi trường: Node 22.18.0, Dart 3.9.2, Flutter 3.35.4, Windows x64. Fixture sinh bằng cách **import chính `web/src/lib/fsrs.ts` và `stroke-match.ts`**; Dart đọc cùng tệp.

**Phạm vi phủ:** 500 thẻ × 40–80 lần chấm = **29.773 bước FSRS**, gồm ôn lại trong cùng ngày, ôn sớm / đúng hạn / trễ, quên, học lại, và `desiredRetention` ∈ {0,7; 0,8; 0,85; 0,9; 0,95; 0,97} (phân bố trạng thái sau chấm: `REVIEW` 24.845, `RELEARNING` 4.222, `LEARNING` 706). **1.500 nét** thử: gần đúng có nhiễu và co giãn, ngược chiều, nét của chữ khác, nét suy biến (phân bố lý do lỗi: `TOO_LONG` 882, `TOO_SHORT` 223, `REVERSED` 153, `OFF_PATH` 96, không lỗi 146). **433 đường nét thật** cho bộ phân tích.

| Hạng mục | Kết quả |
|---|---|
| Tham số `W` mặc định trùng web | Có, từng bit |
| FSRS, mỗi bước độc lập — trạng thái, `learningStep`, `reps`, `lapses`, `intervalDays`, `dueAt` | **0 / 29.773 sai khác** |
| FSRS — `difficulty` | bit-exact 29.773 / 29.773 |
| FSRS — `stability` | bit-exact 24.565 / 29.773 (82,5%); sai số tương đối lớn nhất **3,8e-15** |
| FSRS, chuỗi cộng dồn 500 thẻ (dùng đầu ra Dart làm đầu vào bước sau) | 0 sai khác trạng thái, 0 sai khác lịch; sai số tương đối `S` lớn nhất 8,9e-15 |
| Chấm nét, 1.500 nét | 0 sai khác `score`, `reason`, `reversed`; `dev` và `ratio` bit-exact; `resample` bit-exact |
| Bộ phân tích đường nét `M`/`c`, 433 nét | độ dài và 32 điểm mẫu bit-exact |
| Làm tròn | `jsRound(-2.5)` = −2 (JS) so với `(-2.5).round()` = −3 (Dart); `jsRound(0.49999999999999994)` = 0 |
| `List.sort` có ổn định không | Có khi n ≤ 33; **không ở n ≥ 100 (200/200 lần chạy đảo thứ tự phần tử bằng nhau)** |
| Trình duyệt so với tích phân chính xác, 433 nét (Edge) | độ dài lệch tương đối: trung bình **5,8e-7**, tối đa **2,1e-6** (nét `ゃ` thứ 2: 16,07079 so với 16,07076); điểm mẫu lệch: trung bình 5,8e-5, tối đa **1,0e-3** đơn vị |
| **`PathMetric` của Flutter** so với tích phân chính xác, 433 nét (`flutter test`, Flutter 3.35.4) | điểm mẫu lệch: trung bình **0,077**, trung vị 0,061, p95 0,212, p99 0,289, tối đa **0,456** đơn vị; độ dài lệch tương đối: trung bình **0,21%**, tối đa **1,23%** (nét む: 30,116 so với 30,492). Trùng với phép đo độc lập của phiên viết CONTRACT.md (so với Chromium) |
| Tác động lên điểm: mục tiêu `PathMetric` thay vì chính xác (2.165 nét giả × nhiễu σ = 1, 3, 6 đơn vị) | điểm lệch tối đa **1**; 3,9% / 2,7% / 2,2% số nét lệch 1 điểm; lật ngưỡng 48/58/70/88: 0–0,05% (tối đa 1 trên 2.165) |
| `String.trim()` | Dart bỏ U+0085, JS giữ; 9 ký tự còn lại trong 10 ký tự thử giống nhau |

**Phạm vi chưa kiểm** (phải làm ở M1): `reviews`, `activity`, `badges`, `quiz`, `time`, `state-parse`, `store`; **ARM64** (libm khác x64 nên "bit-exact" không được suy rộng); `PathMetric` trên Android/iOS và Flutter 3.47 (mới đo trên Windows, Flutter 3.35.4); múi giờ (27.000 ca là báo cáo của CONTRACT.md, chưa tái lập ở đây); mọi hành vi trên thiết bị thật.

Ghi chú về môi trường dev (`flutter doctor`) ở mục 11.1.

---

## Phụ lục B. Ánh xạ TypeScript sang Dart

| TypeScript / web | Dart / Flutter | Lưu ý |
|---|---|---|
| `number` | `double` hoặc `int` theo trường | Đọc qua `num`, ghi số thực cho trường thực (bẫy 4) |
| `Math.round` | `jsRound` | Bẫy 1 |
| `Math.trunc(x) \|\| 1` | `x.truncate()`, rồi `== 0 ? 1 : …` | `\|\| 1` cũng bắt `NaN` |
| `Array.sort` (ổn định) | Sắp ổn định (khoá phụ hoặc `mergeSort`) | Bẫy 2 |
| `Object.values/entries` | `Map.values/entries` | Cùng thứ tự chèn |
| `structuredClone` | `ProgressDraft` | Mục 5.2 |
| `Intl.DateTimeFormat(zone)` | `DayClock` | Mục 5.4 |
| `Date.UTC(y, m, d)` | `DateTime.utc(y, m, d).millisecondsSinceEpoch` | `weekStart` / `addDays` không phụ thuộc múi giờ |
| `Date.now()` | `DateTime.now().millisecondsSinceEpoch` | |
| `normalize("NFD")` + bỏ dấu | Bảng ánh xạ hoặc gói bỏ dấu | Bẫy 5 |
| zod `progressSchema` | Bộ phân tích thủ công | Mục 5.5, phụ lục D |
| `localStorage` | Tệp JSON ghi nguyên tử | Mục 4.6 |
| `useSyncExternalStore` | Riverpod `AsyncNotifier` | Mục 4.4 |
| `getPointAtLength` | `parseKanjiVgPath` + `PathMetric` | Mục 6.2 |
| Pointer Events | `Listener` + `PointerEvent` | Mục 6.3 |
| `setPointerCapture` | Hit-test lúc `down` | 📐 |
| `ResizeObserver` + `devicePixelRatio` | `LayoutBuilder` | Không phải tự nhân dpr |
| `speechSynthesis` | `flutter_tts` | Mục 9.4 |
| `window.confirm` | `showDialog` | |
| Tải Blob / `<input type=file>` | `share_plus` / `file_picker` | Mục 9.3 |
| `prefers-reduced-motion` | `MediaQuery.disableAnimationsOf` | |
| `prefers-color-scheme` | `ThemeMode.system` | |
| Service worker / PWA / manifest | Không cần | |

---

## Phụ lục C. Gói đề xuất

Tra ngày 2026-10-02 bằng `pub.dev/api/packages/<tên>` 📘. **Nhiều gói đòi Dart ≥ 3.12 / Flutter ≥ 3.44, nên phải nâng từ 3.35.4.**

| Gói | Phiên bản (ngày) | Ràng buộc SDK | Vai trò |
|---|---|---|---|
| `flutter_riverpod` | 3.4.3 (2026-09-03) | Dart ^3.12 | Trạng thái |
| `go_router` | 18.0.2 (2026-09-28) | Dart ^3.12, Flutter ≥ 3.44 | Điều hướng |
| `drift` | 2.35.1 (2026-09-30) | Dart ≥ 3.10 < 4 | SQLite — khi có nhật ký ôn (10.1) |
| `shared_preferences` | 2.5.5 (2026-03-25) | Dart ^3.9, Flutter ≥ 3.35 | Cờ nhỏ (không dùng cho khối tiến độ) |
| `timezone` | 0.11.1 (2026-06-29) | Dart ^3.10 | Test múi giờ; thông báo |
| `flutter_timezone` | 5.1.0 (2026-05-28) | Dart ≥ 3.4, Flutter ≥ 3.22 | Múi giờ thiết bị cho thông báo |
| `flutter_local_notifications` | 22.3.1 (2026-09-13) | Dart ^3.10 | Mục 9.1 |
| `flutter_tts` | 4.2.5 (2026-01-05) | Dart ≥ 3.4 | Mục 9.4 |
| `just_audio` | 0.10.6 (2026-06-29) | Dart ^3.6, Flutter ≥ 3.27 | Âm thu sẵn (P1) |
| `share_plus` | 13.3.1 (2026-10-01) | Dart ≥ 3.10, Flutter ≥ 3.38.1 | Xuất tệp |
| `file_picker` | 13.1.0 (2026-09-15) | Dart ≥ 3.10, Flutter ≥ 3.38.0 | Nhập tệp |
| `home_widget` | 0.10.0 (2026-09-17) | Dart ≥ 3.10, Flutter ≥ 3.38.1 | Widget (P1) |
| `perfect_freehand` | 2.5.2+1 (2026-01-26) | Dart ≥ 3.1.3 | Nét lông (P1) |
| `google_mlkit_digital_ink_recognition` | 0.16.1 (2026-08-17) | Dart ^3.12, Flutter ≥ 3.44 | Nhận dạng chữ (P2, opt-in) |
| `speech_to_text` | 7.5.0 (2026-09-14) | Dart ^3.12, Flutter ≥ 3.44 | Chấm phát âm (P3, opt-in) |

**Cố ý không dùng**

| Gói | Lý do |
|---|---|
| `fsrs` 2.0.1 (2025-06-20) | Tham số mặc định khác web (W[0] 0,2172 so với 0,212; W[3] 16,1507 so với 8,2956…), `enable_fuzzing` mặc định `true`, bước học và các nhánh có thể khác quy ước của web → lịch ôn không tái lập. Port 252 dòng rẻ hơn và đã kiểm chứng |
| `path_drawing` 1.0.1 (2022-08-04) | Dùng được (phiên viết CONTRACT.md chạy `parseSvgPathData` trên cả 433 nét, Dart 3.9) nhưng không cập nhật từ 2022 và khai báo `sdk <3.0.0`. Ta chọn bộ phân tích 30 dòng tự viết để khỏi phụ thuộc gói không bảo trì; dùng `path_drawing` cũng chấp nhận được |
| `path_parsing` 1.1.0 (2024-11-01) | Dùng được, nhưng dữ liệu chỉ có `M`/`c` nên bộ phân tích 30 dòng tự viết rẻ hơn một phụ thuộc |
| `fsrs-rs-dart` (kho GitHub) | README không nêu optimizer, không nêu đã có trên pub.dev; cần Rust. Chỉ xem xét ở spike riêng (10.1) |
| `google_fonts` (tải lúc chạy) | Phông phải đóng gói sẵn (mục 8.2) |

---

## Phụ lục D. Kiểm tra tệp nhập

Rút từ `web/src/lib/learning/state.ts`. Bản Dart phải **không chặt hơn** web (tệp hợp lệ với web phải nhận được) và **không lỏng hơn** (tệp web từ chối phải bị từ chối).

| Trường | Quy tắc |
|---|---|
| (toàn khối) | Là JSON; `version` là số và `> 1` → từ chối với thông báo "tạo bởi phiên bản mới hơn"; khoá lạ bị **bỏ qua** (zod mặc định bỏ) |
| `version` | Đúng bằng `1` |
| `settings.dailyGoalXp` | Số nguyên 10..500 |
| `stats.xpTotal`, `currentStreak`, `longestStreak`, `totalReviews`, `totalWritingMs` | Số nguyên ≥ 0 |
| `stats.lastActiveDate`, `stats.freezeWeek` | Chuỗi khớp `^\d{4}-\d{2}-\d{2}$` hoặc `null` — **chỉ kiểm mẫu, không kiểm ngày có thật** (`9999-99-99` hợp lệ) |
| `stats.streakFreezes` | Số nguyên 0..2 |
| `daily` | Khoá khớp mẫu ngày; giá trị `{xp, reviews, chars, studyMs}` số nguyên ≥ 0 và `goalMet` bool |
| `cards` | Khoá chuỗi bất kỳ (**không** bắt khoá khớp `itemType:itemId`); giá trị: `itemType` ∈ {`KANA_WRITING`, `KANA_READING`, `VOCAB_MEANING`, `VOCAB_READING`}, `itemId` chuỗi không rỗng, `state` ∈ {`LEARNING`, `REVIEW`, `RELEARNING`} (**không** có `NEW`), `stability` số ≥ 0 (không bắt nguyên), `difficulty` số 0..10, `dueAt` số bất kỳ (kể cả âm, thập phân), `lastReviewedAt` số hoặc `null`, `reps`/`lapses`/`learningStep` số nguyên ≥ 0, `introducedDay` mẫu ngày hoặc `null` |
| `writing.best` | Khoá chuỗi → số 0..100 |
| `writing.passed` | Mảng chuỗi (cho phép trùng) |
| `writing.recent` | Mảng số 0..100, **tối đa 10 phần tử** |
| `badges` | Khoá chuỗi → số |
| `.int()` | Chấp nhận `3.0`, từ chối `3.5` |
| Kích thước tệp | ≤ 5 MiB (kiểm ở giao diện, không thuộc schema) |

Thẻ mồ côi (khoá trỏ tới mục nội dung đã gỡ) hợp lệ; engine tự bỏ qua. **Không** thêm kiểm tra chặt hơn ở bước nạp — nếu muốn làm sạch, làm sau khi nạp.

---

## Phụ lục E. Định dạng fixture

Một tệp JSON mỗi nhóm; số thực in bằng dạng rút gọn lặp lại được của `JSON.stringify` (Dart `jsonDecode` đọc lại đúng từng bit), số nguyên in nguyên.

Ví dụ 1 là **một bước thật** trích từ `fixtures.json` do spike sinh (thẻ đang ở bước học thứ hai, chấm Good → tốt nghiệp sang `REVIEW`, hẹn 1 ngày). Hình dạng theo [CONTRACT.md §4](CONTRACT.md#4-hợp-đồng-3--hành-vi-engine) (`suite` · `name` · `input` · `expected`):

```json
{ "suite": "fsrs.review", "name": "learning-step-2-good-graduates",
  "input":  { "cur": { "stability": 0.24668918777567272, "difficulty": 6.4078867, "state": "LEARNING", "learningStep": 1, "reps": 2, "lapses": 0 },
              "grade": 3, "elapsedDays": 0.02098866898148148, "now": 1769033369719, "retention": 0.9 },
  "expected": { "next": { "stability": 0.2842063592758949, "difficulty": 6.4024788133, "state": "REVIEW", "learningStep": 0, "reps": 3, "lapses": 0 },
              "intervalDays": 1, "dueAt": 1769119769719 } }
```

Ví dụ 2 cho một thao tác của `reviews`, với kỳ vọng lấy từ chính test của web (`reviews.test.ts`, "lần viết đạt đầu tiên ghi đủ mọi thứ": `recordWriting(emptyState(), { あ, 95 }, MON)` cho `passed: true, grade: 4, xpEarned: 25, newBadges: ["FIRST_STROKE"]`, thẻ `KANA_WRITING:あ` ở `REVIEW`, `reps: 1`, `xpTotal: 25`):

```json
{ "suite": "reviews.recordWriting", "name": "đạt lần đầu cho +25 XP và huy hiệu Nét đầu tiên",
  "input":  { "state": "<emptyState()>", "clock": { "now": 1788750000000, "zone": "Asia/Ho_Chi_Minh" },
              "args": { "character": "あ", "avgScore": 95, "strokeErrors": [], "durationMs": 4000 } },
  "expected": { "result": { "passed": true, "grade": 4, "xpEarned": 25, "newBadges": ["FIRST_STROKE"] },
                "state": "<toàn bộ ProgressState sau bước, sinh bởi bộ sinh Vitest>" } }
```

Quy tắc so khớp theo [CONTRACT.md §4](CONTRACT.md#4-hợp-đồng-3--hành-vi-engine): số nguyên, chuỗi, bool, trạng thái, `dueAt`, ngày **bằng tuyệt đối**; số thực sai số tương đối ≤ 1e-12; thứ tự danh sách bằng tuyệt đối kể cả khi hoà khoá; `state` so sánh sâu cả khối. Fixture `state-parse` có thêm `expected.error` là **mã lỗi** (không phải câu chữ).

---

## Phụ lục F. Nguồn tham khảo

Tra cứu ngày 2026-10-02.

**Flutter / Dart**

- [What's new in Flutter 3.47](https://flutter.dev/blog/whats-new-in-flutter-3-47) — Material/Cupertino tách gói, iOS tối thiểu 15, UIScene, SwiftPM.
- [Impeller rendering engine](https://docs.flutter.dev/perf/impeller) — mặc định theo nền tảng; Web còn dùng Skia.
- [Flutter SDK archive](https://docs.flutter.dev/install/archive) xác nhận 3.47 là bản mới nhất; số bản vá 3.47.5 (2026-09-18) theo trang bên thứ ba [flutterreleases.com](https://flutterreleases.com/).
- [`PathMetric`](https://api.flutter.dev/flutter/dart-ui/PathMetric-class.html) · [`PointerDeviceKind`](https://api.flutter.dev/flutter/dart-ui/PointerDeviceKind.html) · [`GestureBinding.resamplingEnabled`](https://api.flutter.dev/flutter/gestures/GestureBinding/resamplingEnabled.html) · [`List.sort`](https://api.dart.dev/stable/dart-core/List/sort.html).
- [Flutter: supported platforms](https://docs.flutter.dev/reference/supported-platforms) (Android API 24+, iOS 15+) · [`PointerEvent.pointer`](https://api.flutter.dev/flutter/gestures/PointerEvent/pointer.html) (id không tái sử dụng).

**Cửa hàng ứng dụng**

- [Google Play: yêu cầu target API](https://support.google.com/googleplay/android-developer/answer/11926878) · [16 KB page size](https://developer.android.com/guide/practices/page-sizes) · [closed testing cho tài khoản cá nhân](https://support.google.com/googleplay/android-developer/answer/14151465) · [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16).
- [Apple: yêu cầu SDK tối thiểu](https://developer.apple.com/news/upcoming-requirements/) · [Required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).

**Thư viện và dữ liệu**

- [`flutter_local_notifications`](https://pub.dev/packages/flutter_local_notifications) (giới hạn 64 thông báo iOS, quyền Android 13/14, múi giờ) · [ML Kit Digital Ink Recognition](https://developers.google.com/ml-kit/vision/digital-ink-recognition) · [`dart-fsrs`](https://github.com/open-spaced-repetition/dart-fsrs) · [`fsrs-rs-dart`](https://github.com/open-spaced-repetition/fsrs-rs-dart) · [Anki: FSRS](https://docs.ankiweb.net/deck-options.html). · [`file_picker` issue #2175](https://github.com/vicajilau/flutter_file_picker/issues/2175) (Privacy Manifest bị rơi với SwiftPM).
- Phiên bản gói: `https://pub.dev/packages/<tên gói>` (bảng ở phụ lục C).
- [EDRDG: giấy phép JMdict/KANJIDIC](https://www.edrdg.org/edrdg/licence.html) · [Tatoeba: điều khoản sử dụng](https://tatoeba.org/en/terms_of_use) · [KanjiVG](http://kanjivg.tagaini.net).

**Trong repo**

[CONTRACT.md](CONTRACT.md) (hợp đồng chuẩn web ↔ mobile) · [SPEC.md](SPEC.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [`docs/spikes/flutter-engine-parity/`](spikes/flutter-engine-parity/README.md) · [`docs/spikes/flutter-pathmetric/`](spikes/flutter-pathmetric/README.md) · [`docs/spikes/color-contrast/contrast.mjs`](spikes/color-contrast/contrast.mjs).
