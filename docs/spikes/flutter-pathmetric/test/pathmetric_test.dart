// Đo Path.computeMetrics()/getTangentForOffset của Flutter so với tích phân Bézier chính xác (engine.dart) trên 433 nét thật.
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter_test/flutter_test.dart';
import '../../flutter-engine-parity/engine.dart' as eng;

Path buildPath(String d) {
  final p = Path();
  final segs = eng.parseKanjiVgPath(d);
  p.moveTo(segs.first[0].x, segs.first[0].y);
  for (final s in segs) {
    p.cubicTo(s[1].x, s[1].y, s[2].x, s[2].y, s[3].x, s[3].y);
  }
  return p;
}

void main() {
  test('PathMetric so với tích phân chính xác', () {
    final raw = jsonDecode(File('../../../web/src/data/kana-data.json').readAsStringSync()) as Map<String, dynamic>;
    final glyphs = raw['glyphs'] as Map<String, dynamic>;
    var n = 0, contours = 0;
    var sumLen = 0.0, maxLen = 0.0, sumPt = 0.0, maxPt = 0.0, nPt = 0;
    var worst = '';
    final ptErrs = <double>[];
    glyphs.forEach((g, ps) {
      for (final d in (ps as List).cast<String>()) {
        n++;
        final path = buildPath(d);
        final metrics = path.computeMetrics().toList();
        contours += metrics.length;
        final m = metrics.first;
        final poly = eng.polylineOf(d, 2000);
        final exactLen = eng.polyLen(poly);
        final le = (m.length - exactLen).abs() / exactLen;
        sumLen += le;
        if (le > maxLen) { maxLen = le; worst = '$g len ${m.length} vs exact $exactLen'; }
        // 32 điểm theo độ dài cung: PathMetric (theo độ dài của CHÍNH nó) so với điểm chính xác tại cùng tỉ lệ i/31 của độ dài chính xác
        final exactPts = eng.resample(poly, 32);
        for (var i = 0; i < 32; i++) {
          final t = m.getTangentForOffset(m.length * i / 31)!;
          final e = exactPts[i];
          final dd = math.sqrt(math.pow(t.position.dx - e.x, 2) + math.pow(t.position.dy - e.y, 2));
          sumPt += dd; nPt++; ptErrs.add(dd);
          if (dd > maxPt) maxPt = dd;
        }
      }
    });
    ptErrs.sort();
    double q(double p) => ptErrs[(ptErrs.length * p).floor().clamp(0, ptErrs.length - 1)];
    // ignore: avoid_print
    print('strokes=$n contours=$contours');
    // ignore: avoid_print
    print('độ dài tương đối: mean=${sumLen / n} max=$maxLen ($worst)');
    // ignore: avoid_print
    print('điểm mẫu (đơn vị 109), $nPt điểm: mean=${sumPt / nPt} median=${q(0.5)} p95=${q(0.95)} p99=${q(0.99)} max=$maxPt');
  });
}
