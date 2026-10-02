// Ảnh hưởng tới ĐIỂM khi mục tiêu lấy mẫu bằng PathMetric (Flutter) thay vì chính xác (≈ trình duyệt).
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import '../../flutter-engine-parity/engine.dart' as eng;

void main() {
  test('tác động lên điểm chấm', () {
    final raw = jsonDecode(File('../../../web/src/data/kana-data.json').readAsStringSync()) as Map<String, dynamic>;
    final rnd = math.Random(42);
    double gauss() => math.sqrt(-2 * math.log(1 - rnd.nextDouble())) * math.cos(2 * math.pi * rnd.nextDouble());
    final thresholds = [48, 58, 70, 88];
    for (final sigma in [1.0, 3.0, 6.0]) {
      var n = 0, diff = 0, maxD = 0;
      final flips = {for (final t in thresholds) t: 0};
      var sumAbs = 0;
      for (final ps in raw['glyphs'].values) {
        for (final d in (ps as List).cast<String>()) {
          final segs = eng.parseKanjiVgPath(d);
          final path = Path()..moveTo(segs.first[0].x, segs.first[0].y);
          for (final s in segs) { path.cubicTo(s[1].x, s[1].y, s[2].x, s[2].y, s[3].x, s[3].y); }
          final m = path.computeMetrics().first;
          final poly = eng.polylineOf(d, 2000);
          final exactLen = eng.polyLen(poly);
          final exactT = eng.resample(poly, 32);
          final pmT = [for (var i = 0; i < 32; i++) (() { final t = m.getTangentForOffset(m.length * i / 31)!; return eng.Pt(t.position.dx, t.position.dy); })()];
          for (var k = 0; k < 5; k++) {
            final cnt = 8 + rnd.nextInt(120);
            final base = eng.resample(poly, cnt);
            final user = [for (final p in base) eng.Pt(p.x + gauss() * sigma, p.y + gauss() * sigma)];
            final a = eng.scoreStroke(user, exactT, exactLen).score;
            final b = eng.scoreStroke(user, pmT, m.length).score;
            n++; final dd = (a - b).abs(); sumAbs += dd; if (dd > 0) diff++; if (dd > maxD) maxD = dd;
            for (final t in thresholds) { if ((a >= t) != (b >= t)) flips[t] = flips[t]! + 1; }
          }
        }
      }
      // ignore: avoid_print
      print('σ=$sigma đơn vị  n=$n  điểm khác nhau: ${(100 * diff / n).toStringAsFixed(1)}%  |Δ| trung bình=${(sumAbs / n).toStringAsFixed(2)}  |Δ| tối đa=$maxD  lật ngưỡng: ${flips.entries.map((e) => "≥${e.key}: ${e.value} (${(100 * e.value / n).toStringAsFixed(2)}%)").join(", ")}');
    }
  });
}
