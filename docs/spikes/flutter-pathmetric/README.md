# Spike: `Path.computeMetrics()` của Flutter lệch bao nhiêu so với trình duyệt?

Mã **bỏ đi sau khi dùng**, phục vụ [docs/MOBILE_FLUTTER.md](../../MOBILE_FLUTTER.md) (mục 5.6 và 6.2) và
[docs/CONTRACT.md](../../CONTRACT.md) (§3.2). Bộ chấm nét lấy 24 điểm theo độ dài cung từ nét mẫu. Web lấy bằng
`getPointAtLength()`; Flutter có `PathMetric`. Hai thứ có giống nhau không, và nếu lệch thì điểm số lệch bao nhiêu?

| Tệp | Làm gì |
|---|---|
| `test/pathmetric_test.dart` | Dựng `Path` cho cả 433 nét thật của `kana-data.json`, lấy 32 điểm theo độ dài cung bằng `PathMetric`, so với tích phân Bézier chính xác (`../flutter-engine-parity/engine.dart`). Trình duyệt đã được đo lệch tích phân chính xác ≤ 0,001 đơn vị (`../flutter-engine-parity/arc-length-browser.mjs`), nên "so với chính xác" cũng xấp xỉ "so với trình duyệt" |
| `test/scoreimpact_test.dart` | Với mỗi nét sinh 5 nét người dùng giả (nhiễu Gauss σ = 1, 3, 6 đơn vị), chấm với mục tiêu "chính xác" và mục tiêu "`PathMetric`", đếm số nét lệch điểm và số lần lật ngưỡng 48/58/70/88 |

## Chạy lại

Cần Flutter (đã thử trên 3.35.4) — không cần thiết bị hay trình giả lập, `flutter test` chạy trên máy:

```bash
cd docs/spikes/flutter-pathmetric
flutter pub get          # dùng --offline nếu gói đã có trong bộ nhớ đệm pub
flutter test
```

## Kết quả (Flutter 3.35.4, Windows x64)

- 433 nét, mỗi nét một contour. Điểm mẫu lệch so với chính xác: trung bình **0,077**, trung vị 0,061, p95 0,212, p99 0,289,
  tối đa **0,456** đơn vị (1 đơn vị ≈ 0,92% cạnh ô). Độ dài lệch tương đối trung bình **0,21%**, tối đa **1,23%** (nét む).
- Tác động lên điểm (2.165 nét giả × 3 mức nhiễu): lệch tối đa **1 điểm**; 2,2–3,9% số nét lệch 1 điểm; lật ngưỡng 48/58/70/88
  ở **0–0,05%** số nét (1 trên 2.165). Tức `PathMetric` đủ gần để dùng, nhưng không giống hệt: muốn hai nền tảng cho điểm
  **giống hệt từng điểm** thì cả hai phải dùng chung một bảng mẫu (CONTRACT.md §3.2, phương án B).
- Các con số trùng với phép đo độc lập của phiên viết CONTRACT.md (họ đo `PathMetric` so với Chromium).

> Chỉ nói về `PathMetric` trên Windows với engine của Flutter 3.35.4. Android/iOS và Flutter 3.47 chưa đo.
