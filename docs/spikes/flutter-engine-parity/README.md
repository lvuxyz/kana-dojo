# Spike: engine Dart có cho kết quả giống engine TypeScript không?

Mã **bỏ đi sau khi dùng** (không phải sản phẩm), phục vụ [docs/MOBILE_FLUTTER.md](../../MOBILE_FLUTTER.md). Nó trả lời một câu hỏi duy nhất:
nếu port `fsrs.ts` và `stroke-match.ts` sang Dart, kết quả có trùng với web không — và những bẫy nào lòi ra khi port.

| Tệp | Làm gì |
|---|---|
| `gen.mjs` | Import **chính mã nguồn** `web/src/lib/fsrs.ts` và `stroke-match.ts` (Node ≥ 22.18 chạy thẳng `.ts`), sinh `fixtures.json`: 500 thẻ × 40–80 lần chấm (≈ 30.000 bước FSRS, kể cả ôn lại trong ngày, quên, học lại, `desiredRetention` khác 0,9), 1.500 nét (gần đúng, ngược chiều, sai nét, suy biến), và 433 nét thật để kiểm bộ phân tích SVG |
| `engine.dart` | Bản port Dart: FSRS-6, `resample`/`scoreStroke`, bộ phân tích đường nét `M`/`c`, và `jsRound` (= `Math.round` của JS). Chỉ dùng `dart:math` |
| `compare.dart` | Nạp `fixtures.json`, chạy lại bằng Dart, so khớp: trường nguyên/trạng thái/`dueAt` phải **bằng tuyệt đối**; số thực báo sai số tương đối lớn nhất |
| `sortcheck.dart` | Chứng minh `List.sort` của Dart không ổn định (JS `Array.sort` thì ổn định) |
| `arc-length-browser.mjs` | Mở Edge/Chrome ẩn, đo `getTotalLength()`/`getPointAtLength()` của trình duyệt trên 433 nét so với tích phân Bézier chính xác → dung sai hình học cho fixture. Cần trình duyệt; đặt `EDGE_PATH` nếu không dùng Edge ở đường dẫn mặc định của Windows |

## Chạy lại

Từ thư mục gốc của repo (cần Node ≥ 22.18 và Dart ≥ 3.9 — không cần Flutter, không cần tải gói nào):

```bash
node --no-warnings docs/spikes/flutter-engine-parity/gen.mjs        # tạo fixtures.json (~20 MB, đã gitignore)
cd docs/spikes/flutter-engine-parity
dart run compare.dart fixtures.json
dart run sortcheck.dart
cd ../../.. && node --no-warnings docs/spikes/flutter-engine-parity/arc-length-browser.mjs   # tuỳ chọn: cần trình duyệt
```

Thư mục anh em [`../color-contrast/`](../color-contrast/contrast.mjs) tính độ tương phản WCAG của token màu web (không liên quan engine, cùng mục đích: số liệu tái tạo được cho tài liệu mobile).

Kết quả đã ghi và diễn giải ở [docs/MOBILE_FLUTTER.md, phụ lục A](../../MOBILE_FLUTTER.md#phụ-lục-a-kết-quả-spike).

> Kết quả chỉ nói về Dart VM x64 (Windows). Trên ARM64 (điện thoại thật) `pow`/`exp` có thể lệch ở bit cuối khác nhau — vì vậy hợp đồng fixture
> dùng dung sai tương đối rõ ràng cho số thực và **phải chạy lại trên thiết bị thật / CI ARM**, đừng suy rộng "bit-exact".
