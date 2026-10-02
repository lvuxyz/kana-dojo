# Kana Dōjō — Hợp đồng dữ liệu và hành vi giữa web và mobile

Web (TypeScript) và app Flutter ([MOBILE_FLUTTER.md](MOBILE_FLUTTER.md)) là hai bản cài đặt của **cùng một sản phẩm**. Tài liệu này định nghĩa những gì hai bên phải giống nhau *đến từng byte hoặc từng chữ số*,
những chỗ ngôn ngữ làm hai bên lệch nhau (đã đo, không phỏng đoán), và cách để một thay đổi ở bên này không lặng lẽ làm hỏng bên kia.

> **Trạng thái:** đặc tả. Hợp đồng 1 và 2 đã đúng với web hiện tại; bộ fixture (Hợp đồng 3) và `kana-samples.json` (§3.2) **chưa được sinh** — đó là việc của giai đoạn M0–M1 trong [MOBILE_FLUTTER.md §14](MOBILE_FLUTTER.md#14-lộ-trình-và-ước-lượng).
> Web là bản cài đặt **tham chiếu**: khi hai bên bất đồng, web đúng cho tới khi có quyết định đổi hợp đồng.

---

## 1. Ba hợp đồng

| # | Hợp đồng | Là gì | Ai sinh ra |
|---|---|---|---|
| 1 | **Tệp tiến độ** | `ProgressState` v1 — JSON người dùng xuất/nhập, và cũng là khối lưu trên máy | Web (zod, `web/src/lib/learning/state.ts`); [SPEC.md §2](SPEC.md#2-mô-hình-dữ-liệu-tiến-độ) |
| 2 | **Nội dung** | Dữ liệu nét kana, từ vựng, quiz, huy hiệu (+ mẫu điểm của nét, §3.2) | `web/src/data/*` → `contract/content/*.json` |
| 3 | **Hành vi engine** | Cùng đầu vào + cùng giờ → cùng đầu ra, cho FSRS, hàng đợi, XP/streak, huy hiệu, quiz, chấm nét | Bộ fixture sinh từ **chính engine web** |

Hợp đồng 1 cho phép người dùng chuyển tiến độ giữa web và mobile bằng một tệp, không cần tài khoản. Hợp đồng 2 và 3 giữ cho hai bản tính ra cùng một kết quả khi học cùng một thứ.

---

## 2. Hợp đồng 1 — tệp tiến độ

Hình dạng đầy đủ ở [SPEC.md §2](SPEC.md#2-mô-hình-dữ-liệu-tiến-độ). Phần dưới là những gì **mobile phải tuân thủ thêm** để tệp đi lại được hai chiều.

**Kiểu JSON và kiểu Dart**

| Trường | JSON | Dart | Lưu ý |
|---|---|---|---|
| `version` | số nguyên `1` | `int` | Tệp có `version` lớn hơn bản app hiện hành bị **từ chối** (thông báo "tạo bởi phiên bản mới hơn"), không đoán. Tệp cũ hơn thì migrate |
| mọi `*At`, `lastReviewedAt`, giá trị trong `badges` | số nguyên (mili-giây epoch) | `int` | Dart `int` 64 bit đủ chứa; JS `number` an toàn tới 2⁵³ — đủ tới năm 275.760 |
| `stability`, `difficulty` | số thực | `double` | **`jsonDecode` trả `int` cho `8`** (web ghi `8` chứ không `8.0`): luôn đọc bằng `(v as num).toDouble()` |
| `reps`, `lapses`, `learningStep`, `xp`, `reviews`, … | số nguyên | `int` | Ghi ra là `3` chứ không `3.0` (zod `.int()` của web chấp nhận cả hai, nhưng giữ cho sạch) |
| ngày (`lastActiveDate`, khoá `daily`, `introducedDay`, `freezeWeek`) | chuỗi `YYYY-MM-DD` | `String` | Theo **múi giờ thiết bị**. So sánh chuỗi (`compareTo`) khớp thứ tự thời gian |
| khoá `cards` | `"<ItemType>:<itemId>"` | `String` | Kana: chính ký tự (`KANA_WRITING:あ`, `…:きゃ`). Từ vựng: id số dạng chuỗi (`VOCAB_MEANING:12`) |
| `NaN`, `Infinity` | **không hợp lệ** | — | `jsonEncode` của Dart ném lỗi; web `JSON.stringify` ghi `null`. Không bao giờ để chúng lọt vào trạng thái |

**Quy tắc ghi/đọc**

- UTF-8, **không BOM**; tên tệp xuất `kana-dojo-tien-do-YYYY-MM-DD.json` (ngày theo múi giờ thiết bị). Thứ tự khoá không quan trọng.
- Đọc = parse JSON → kiểm phiên bản → kiểm schema đầy đủ (kiểu, khoảng giá trị: `dailyGoalXp` 10–500, `streakFreezes` 0–2, `difficulty` 0–10, điểm 0–100, `recent` ≤ 10 phần tử…). **Sai bất kỳ điều gì thì từ chối cả tệp** và không đụng tới tiến độ hiện có.
- Thông báo lỗi cho người dùng giữ cùng ba loại với web: không phải JSON · không đúng định dạng · phiên bản mới hơn.
- Dữ liệu hỏng đang lưu trên máy được **giữ lại** (web: `kd.progress.corrupt`; mobile: tệp `progress.corrupt-<thời điểm>.json`) trước khi bắt đầu từ rỗng.
- **Không** đưa vào tệp: giao diện sáng/tối (`kd.theme`), cache offline, kỷ lục phòng luyện gõ của web (`kd.typing.*` — lưu riêng, xem [TYPING.md §3.4](TYPING.md#34-quyết-định-khi-gộp-vào-site-không-tài-khoản)), bất cứ thứ gì thuộc riêng một nền tảng. Danh sách quy tắc từng trường: [MOBILE_FLUTTER.md phụ lục D](MOBILE_FLUTTER.md#phụ-lục-d-kiểm-tra-tệp-nhập).
- Thẻ trỏ tới mục không còn trong nội dung (từ vựng bị gỡ, app cũ gặp tệp của web mới) **bị bỏ qua khỏi hàng đợi và bộ đếm nhưng vẫn nằm trong tệp** — để xuất lại không làm mất dữ liệu của người dùng. Hành vi này đã có test ở web (`reviews.test.ts`).

**Thay đổi định dạng:** tăng `STATE_VERSION` **ở cả hai phía cùng lúc**, thêm hàm migrate (`vN → vN+1`) cùng test với một tệp mẫu thật của phiên bản cũ, và cập nhật fixture. Web nạp được tệp cũ hơn thì mobile cũng phải nạp được.

---

## 3. Hợp đồng 2 — nội dung

### 3.1 Tệp nội dung

| Tệp | Hiện ở web | Quy tắc bất biến |
|---|---|---|
| `kana-data.json` | `web/src/data/kana-data.json` (208 ký tự, 148 glyph, 433 nét) | Thứ tự `chars` là thứ tự dạy học. **Không đổi mã ký tự đã có** — nó là khoá của thẻ |
| từ vựng | `web/src/data/vocabulary.ts` (80 từ) | `id` liên tục từ 1, **chỉ thêm cuối**, không xoá/đánh lại |
| quiz | `web/src/data/quizzes.ts` (4 bài, 38 câu) | `id` quiz và `id` câu hỏi duy nhất; trắc nghiệm có đáp án nằm trong `options`; tự luận `options: []` |
| huy hiệu | `web/src/data/badges.ts` (9) | `code` là khoá lưu trong tệp tiến độ — không đổi tên; điều kiện trao nằm ở engine (§4) |

Vì Dart không đọc được `.ts`, **từ vựng, quiz và huy hiệu phải có dạng JSON** để mobile dùng làm asset. Đề xuất: lật chiều — JSON là bản gốc ở `contract/content/`, web nhập JSON (kèm kiểu), và có test chặn việc sửa lệch. Hiện chúng được sinh một lần từ các tệp SQL cũ của backend rồi lưu thành `.ts`.

Tách phiên bản nội dung: web cập nhật tức thì còn app cập nhật qua kho ứng dụng, nên **hai bản có thể đang giữ hai phiên bản nội dung khác nhau** — vì vậy quy tắc "chỉ thêm, không xoá" và việc bỏ qua thẻ mồ côi ở trên là bắt buộc, không phải tuỳ chọn.

### 3.2 Mẫu điểm của nét chuẩn (`kana-samples.json`) — quyết định cần chốt

Chấm điểm một nét cần 24 điểm lấy mẫu từ nét mẫu **và độ dài nét mẫu**. Web lấy chúng bằng `getPointAtLength()`/`getTotalLength()` của trình duyệt; Flutter có `PathMetric` thay thế. Hai thứ **không giống hệt nhau**. Đo trên toàn bộ 433 nét (Chromium 152 so với Flutter 3.35.4, `path_drawing`):

| Đại lượng | Trung bình | p99 | Tối đa |
|---|---|---|---|
| Khoảng cách giữa hai điểm mẫu tương ứng (đơn vị ô 109; 13.856 điểm) | 0,077 | 0,289 | **0,456** |
| Sai lệch tương đối của độ dài nét | 0,21% | — | **1,23%** |

Điểm số là `100 − fwd·4,2 − |ln(độ dài/độ dài mẫu)|·15`, nên cận trên của chênh lệch điểm là cỡ **0,3 điểm (trung bình) và ≈ 2 điểm (xấu nhất)**. Đủ để lật một grade FSRS khi điểm nằm sát ngưỡng 48/70/88, và đủ để làm hai nền tảng cho điểm khác nhau với cùng một nét viết.

| Phương án | Ưu | Nhược |
|---|---|---|
| **A. Mỗi nền tảng tự lấy mẫu** (hiện trạng) | Không đổi web, không thêm dữ liệu | Điểm lệch ≲ 2; fixture chấm nét phải dùng dung sai ±2 điểm; không test được chấm nét trong Node trên dữ liệu thật |
| **B. Sinh sẵn `kana-samples.json`** bằng một thuật toán chuẩn (Node), cả hai nền tảng dùng chung | Điểm giống hệt (chỉ còn sai số float); test chấm nét trong Node trên toàn bộ kana; mobile khỏi tính `PathMetric` lúc chạy | Thêm ≈ 230 KB nguồn (433 nét × (1 độ dài + 32 điểm)), web đổi hành vi cực nhẹ (lệch ≲ 2 điểm so với trước) |

**Đo lại độc lập (2026-10-02)** bằng `flutter test` trên Flutter 3.35.4 ([`docs/spikes/flutter-pathmetric/`](spikes/flutter-pathmetric/README.md)): các con số trên **trùng khớp** (điểm mẫu: trung bình 0,077, p95 0,212, tối đa 0,456; độ dài: trung bình 0,21%, tối đa 1,23%). Vì trình duyệt chỉ lệch tích phân chính xác ≤ 0,001 đơn vị, nên chính `PathMetric` là bên lệch. Mô phỏng tác động lên điểm (2.165 nét giả × 3 mức nhiễu σ = 1, 3, 6 đơn vị): điểm lệch **tối đa 1**, khoảng **2–4% số nét lệch 1 điểm**, lật ngưỡng 48/58/70/88 ở **0–0,05%** số nét. Nghĩa là cận trên ≈ 2 điểm ở trên hiếm khi xảy ra; phương án B không cần để người dùng thấy khác biệt mà để hai nền tảng **tất định giống hệt** (nguyên tắc của hợp đồng 3).

**Khuyến nghị: B.** Ảnh vẽ (hướng dẫn, hoạt ảnh) vẫn dựng từ path `d` ở mỗi nền tảng; chỉ **chấm điểm** dùng bảng mẫu chung.

---

## 4. Hợp đồng 3 — hành vi engine

Phạm vi: mọi hàm thuần trong `web/src/lib/` (liệt kê ở [MOBILE_FLUTTER.md §5.1](MOBILE_FLUTTER.md#51-bản-đồ-module)). Mỗi hàm được mô tả bởi các **fixture**: đầu vào đầy đủ (kể cả giờ và múi giờ giả) và đầu ra mong đợi, sinh bằng cách chạy engine web.

**Dạng một fixture** (đề xuất):

```json
{
  "suite": "fsrs.review",
  "name": "REVIEW + Good sau 12,3 ngày",
  "input": { "state": { "stability": 8.2956, "difficulty": 1, "state": "REVIEW", "learningStep": 0, "reps": 1, "lapses": 0 },
             "grade": 3, "elapsedDays": 12.3, "now": 1767236400000, "desiredRetention": 0.9 },
  "expected": { "next": { "stability": 33.7, "difficulty": 1.2, "state": "REVIEW", "learningStep": 0, "reps": 2, "lapses": 0 },
                "intervalDays": 34, "dueAt": 1770173200000 }
}
```

Các nhóm: `fsrs.*` · `time.*` (kèm múi giờ) · `activity.*` (XP, streak, thẻ băng, hồi thứ Hai, heatmap) · `reviews.*` (hàng đợi, chấm thẻ, luyện viết) · `badges.*` · `quiz.*` · `strokeMatch.*` · `pointerGate.*` · `state.parse.*` (tệp hợp lệ/không hợp lệ).

**Dung sai** (căn cứ vào số đo ở §5):

| Loại giá trị | So sánh |
|---|---|
| Số nguyên, chuỗi, enum, boolean, thời điểm mili-giây, ngày `YYYY-MM-DD` | **Bằng tuyệt đối** |
| Số thực (`stability`, `difficulty`, `retrievability`, điểm thô) | Sai số tương đối ≤ **1e-12** (đo được tối đa ≈ 9e-15 sau chuỗi 30 lần chấm) |
| Điểm nét viết (sau §3.2-B) | Bằng tuyệt đối sau `round`; trước đó (phương án A) ± 2 |
| Thứ tự trong danh sách (hàng đợi, huy hiệu mới) | Bằng tuyệt đối, **kể cả khi các phần tử bằng khoá** (xem sắp xếp ổn định, §5) |

**Quy trình đổi luật** (ví dụ chỉnh hệ số XP, thêm huy hiệu):

1. Sửa TypeScript + test web.
2. Sinh lại fixture; commit cùng thay đổi.
3. CI của mobile **đỏ** cho tới khi Dart khớp — đây là mục đích của hợp đồng: không để hai bản lệch nhau trong im lặng.
4. Nếu đổi hình dạng tệp: thêm bước tăng `STATE_VERSION` (§2).

---

## 5. Những chỗ JS và Dart không giống nhau (đã đo)

Phương pháp: chạy **chính** `fsrs.ts` và `time.ts` của web trên Node 22.18 (ICU 77.1, tz database 2025b) và một bản port Dart trên Dart 3.9.2 với cùng đầu vào; so từng kết quả. Số liệu: [MOBILE_FLUTTER.md phụ lục A](MOBILE_FLUTTER.md#phụ-lục-a-kết-quả-spike) và mã chạy lại ở [`docs/spikes/`](spikes/flutter-engine-parity/README.md).

| Chủ đề | JS | Dart | Hệ quả / quy tắc |
|---|---|---|---|
| **Số học FSRS** (`exp`, `pow`, `log`) | V8 | Dart VM | 18.000 lần chấm: mọi **đầu ra nguyên khớp tuyệt đối** (khoảng ôn, trạng thái, `dueAt`); `difficulty` giống từng bit; `stability` lệch tối đa **2,8·10⁻¹⁵** (khoảng 15% giá trị không giống từng bit), 9·10⁻¹⁵ sau chuỗi 30 lần. → Không cần thuật toán đặc biệt, chỉ cần so số thực có dung sai |
| **Làm tròn nửa** | `Math.round(-2.5)` = **-2** (nửa về +∞) | `(-2.5).round()` = **-3** (nửa ra xa số 0) | Khác với **số âm**; số dương giống nhau. Điểm và khoảng ôn dương nên ít gặp, nhưng dùng một hàm `roundHalfUp` duy nhất. **Đừng** viết `(x + 0.5).floor()` (sai với `0,49999999999999994`); dùng `x - x.floor() >= 0.5 ? x.floor() + 1 : x.floor()` |
| **Sắp xếp** | `Array.prototype.sort` **ổn định** | `List.sort` **không ổn định** | Đo: 931 cặp bằng khoá bị đảo thứ tự trong 2.000 phần tử (JS: 0); đo lại độc lập: ổn định khi ≤ 33 phần tử (Dart dùng insertion sort cho danh sách ngắn), **đảo ở 200/200 lần chạy từ 100 phần tử** — nên test nhỏ vẫn qua. `buildQueue` sắp thẻ đến hạn theo `dueAt`; thẻ cùng `dueAt` phải giữ thứ tự chèn. → Dùng sắp xếp ổn định (`mergeSort` của `package:collection`) cho **mọi** chỗ sắp xếp trong engine |
| **`String.trim()`** | Không coi U+0085 (NEL) là khoảng trắng | **Coi** U+0085 là khoảng trắng | Hai bên còn lại giống nhau trên 28 ký tự thử (gồm U+00A0, U+3000, U+FEFF). Đã tái lập độc lập: Dart bỏ U+0085, JS giữ; U+00A0, U+3000, U+FEFF, U+1680, U+2028, U+000B cả hai bỏ; U+200B, U+180E, U+001C cả hai giữ. Quiz so khớp đáp án sau `trim` → viết hàm `jsTrim` dùng đúng tập của JS, và thêm fixture có `\u0085` |
| **Múi giờ → `dayKey`/`hourOf`** | `Intl.DateTimeFormat` (ICU, tz 2025b) | gói `timezone` (tz 2025c ở bản 0.11.1) | 27.000 ca (18 vùng gồm Lord_Howe, Chatham, Kathmandu, Casablanca, Gaza, Apia…, 2015–2036): **0 sai lệch**. Nhưng hai bên dùng **hai phiên bản tz database khác nhau** và sẽ lệch nhau khi luật múi giờ đổi. → ghim phiên bản gói, có fixture múi giờ trong CI, và chấp nhận rằng ở thời điểm luật mới có hiệu lực hai nền tảng có thể bất đồng một vài ngày |
| **Ngày tính theo số học** (`addDays`, `daysBetween`, `weekStart`) | `Date.UTC` | `DateTime.utc` | Chỉ là số nguyên ngày kể từ epoch (UTC), không phụ thuộc múi giờ → cài trên số nguyên, không dùng `DateTime` địa phương |
| **Thứ tự duyệt `Map`** | Khoá chuỗi không phải số: thứ tự chèn | `LinkedHashMap` mặc định: thứ tự chèn | `jsonDecode` giữ thứ tự khoá trong tệp. Nhờ vậy thứ tự thẻ khi hoà khoá khớp nhau, **miễn là** import không xáo trộn khoá. Tránh `Set`/`Map` không có thứ tự bảo đảm trong engine |
| **Kiểu số trong JSON** | chỉ có `number` | phân biệt `int`/`double` | Xem §2: đọc bằng `(v as num)`, ghi số nguyên dưới dạng `int` |
| **Chuỗi** | `length` tính theo UTF-16; `Array.from(s)` lặp theo code point | `String.length` UTF-16; `runes` theo code point | Kana (kể cả `きゃ`) đều nằm trong BMP nên `length` giống nhau; khi tách ký tự để lấy glyph dùng `runes`, không dùng chỉ số |
| **`toLowerCase()`** | theo Unicode, không phụ thuộc locale | tương tự | Quiz so khớp không phân biệt hoa/thường chỉ cho romaji ASCII; thêm fixture phi ASCII nếu mở rộng |

Danh sách này **không** đầy đủ — nó là những gì đã kiểm chứng. Khi gặp khác biệt mới, thêm một dòng ở đây **và** một fixture khoá nó lại.

---

## 6. Trạng thái triển khai hợp đồng

| Hạng mục | Trạng thái |
|---|---|
| Hợp đồng 1 (tệp tiến độ) | Có ở web (zod + test); **chưa** có JSON Schema xuất ra cho mobile |
| Hợp đồng 2 (nội dung) | `kana-data.json` dùng chung được; từ vựng/quiz/huy hiệu còn là `.ts`; `kana-samples.json` chưa có |
| Hợp đồng 3 (fixture) | Chưa có generator đầy đủ. Đã có **spike** sinh fixture FSRS và chấm nét từ chính mã web và kiểm bản port Dart (29.773 bước + 1.500 nét, 0 sai khác): [`docs/spikes/flutter-engine-parity/`](spikes/flutter-engine-parity/README.md) |
| CI | Chưa có job kiểm fixture |

Thứ tự làm đề xuất nằm ở [MOBILE_FLUTTER.md §14, M0–M1](MOBILE_FLUTTER.md#14-lộ-trình-và-ước-lượng). Lưu ý kỹ thuật cho generator: các hàm trong `reviews.ts`/`badges.ts` nhập dữ liệu qua bí danh `@/data/*` mà Node thuần không giải được —
chạy generator dưới Vitest (đã có cấu hình bí danh) thay vì `node` trực tiếp. Riêng `fsrs.ts` và `time.ts` không có bí danh nên chạy được bằng Node 22 có sẵn tính năng bỏ kiểu (đã dùng để đo ở trên).
