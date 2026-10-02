import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'engine.dart';

double d(dynamic v) => (v as num).toDouble();

FsrsState stateOf(Map<String, dynamic> m) => FsrsState(
    d(m['stability']), d(m['difficulty']), m['state'] as String, m['learningStep'] as int, m['reps'] as int, m['lapses'] as int);

double relErr(double a, double b) {
  if (a == b) return 0;
  final scale = math.max(a.abs(), b.abs());
  return scale == 0 ? 0 : (a - b).abs() / scale;
}

void main(List<String> args) {
  final fx = jsonDecode(File(args[0]).readAsStringSync()) as Map<String, dynamic>;

  // tham số mặc định phải trùng bit với web
  final wWeb = (fx['W'] as List).map(d).toList();
  var wOk = wWeb.length == w.length;
  for (var i = 0; i < w.length && wOk; i++) {
    wOk = wWeb[i] == w[i];
  }
  print('W trùng web: $wOk');

  // ---------------- FSRS: mỗi bước nạp đúng trạng thái đầu vào của fixture (không cộng dồn sai số)
  var steps = 0, intMismatch = 0, bitExactS = 0, bitExactD = 0;
  var maxRelS = 0.0, maxRelD = 0.0;
  final mismatches = <String>[];
  for (final card in fx['cards'] as List) {
    for (final s in card as List) {
      steps++;
      final cur = stateOf(s['cur'] as Map<String, dynamic>);
      final out = review(cur, s['grade'] as int, d(s['elapsedDays']), s['now'] as int, d(s['retention']));
      final exp = s['out'] as Map<String, dynamic>;
      final en = exp['next'] as Map<String, dynamic>;
      final ok = out.next.state == en['state'] &&
          out.next.learningStep == en['learningStep'] &&
          out.next.reps == en['reps'] &&
          out.next.lapses == en['lapses'] &&
          out.intervalDays == exp['intervalDays'] &&
          out.dueAt == exp['dueAt'];
      if (!ok) {
        intMismatch++;
        if (mismatches.length < 5) mismatches.add('state=${out.next.state}/${en['state']} int=${out.intervalDays}/${exp['intervalDays']} due=${out.dueAt}/${exp['dueAt']}');
      }
      final es = d(en['stability']), ed = d(en['difficulty']);
      if (out.next.stability == es) bitExactS++;
      if (out.next.difficulty == ed) bitExactD++;
      maxRelS = math.max(maxRelS, relErr(out.next.stability, es));
      maxRelD = math.max(maxRelD, relErr(out.next.difficulty, ed));
    }
  }
  print('FSRS (từng bước độc lập): $steps bước');
  print('  sai khác trường số nguyên/trạng thái/dueAt: $intMismatch');
  print('  stability  bit-exact: $bitExactS/$steps   sai số tương đối lớn nhất: $maxRelS');
  print('  difficulty bit-exact: $bitExactD/$steps   sai số tương đối lớn nhất: $maxRelD');
  for (final m in mismatches) {
    print('    ví dụ lệch: $m');
  }

  // ---------------- FSRS: chuỗi cộng dồn — dùng chính đầu ra của Dart làm đầu vào bước sau
  var chainStateMismatch = 0, chainDueMismatch = 0, chainCards = 0;
  var chainMaxRelS = 0.0;
  for (final card in fx['cards'] as List) {
    chainCards++;
    var cur = newCardState();
    for (final s in card as List) {
      final out = review(cur, s['grade'] as int, d(s['elapsedDays']), s['now'] as int, d(s['retention']));
      final exp = s['out'] as Map<String, dynamic>;
      final en = exp['next'] as Map<String, dynamic>;
      if (out.next.state != en['state'] || out.next.learningStep != en['learningStep'] || out.next.reps != en['reps'] || out.next.lapses != en['lapses']) {
        chainStateMismatch++;
      }
      if (out.intervalDays != exp['intervalDays'] || out.dueAt != exp['dueAt']) chainDueMismatch++;
      chainMaxRelS = math.max(chainMaxRelS, relErr(out.next.stability, d(en['stability'])));
      cur = out.next;
    }
  }
  print('FSRS (chuỗi cộng dồn, $chainCards thẻ): lệch trạng thái=$chainStateMismatch lệch lịch=$chainDueMismatch  sai số tương đối S lớn nhất=$chainMaxRelS');

  // ---------------- Chấm nét
  var n = 0, scoreMismatch = 0, reasonMismatch = 0, revMismatch = 0, resampleBad = 0;
  var maxDev = 0.0, maxRatio = 0.0, bitDev = 0, maxResample = 0.0;
  var maxScoreDiff = 0;
  for (final s in fx['strokes'] as List) {
    n++;
    List<Pt> pts(dynamic l) => (l as List).map((p) => Pt(d(p['x']), d(p['y']))).toList();
    final user = pts(s['user']);
    final target = pts(s['target']);
    final out = scoreStroke(user, target, d(s['targetLen']));
    final exp = s['out'] as Map<String, dynamic>;
    if (out.score != exp['score']) {
      scoreMismatch++;
      maxScoreDiff = math.max(maxScoreDiff, (out.score - (exp['score'] as int)).abs());
    }
    if (out.reason != exp['reason']) reasonMismatch++;
    if (out.reversed != exp['reversed']) revMismatch++;
    if (out.dev == d(exp['dev'])) bitDev++;
    maxDev = math.max(maxDev, relErr(out.dev, d(exp['dev'])));
    maxRatio = math.max(maxRatio, relErr(out.ratio, d(exp['ratio'])));
    final rs = resample(user, 24);
    final er = pts(s['resampled']);
    for (var i = 0; i < 24; i++) {
      final diff = math.max((rs[i].x - er[i].x).abs(), (rs[i].y - er[i].y).abs());
      maxResample = math.max(maxResample, diff);
      if (diff > 1e-9) resampleBad++;
    }
  }
  print('Chấm nét: $n nét');
  print('  lệch score=$scoreMismatch (lệch tối đa $maxScoreDiff điểm) lệch reason=$reasonMismatch lệch reversed=$revMismatch');
  print('  dev bit-exact: $bitDev/$n   sai số tương đối lớn nhất dev=$maxDev ratio=$maxRatio');
  print('  resample: điểm lệch >1e-9: $resampleBad   lệch tuyệt đối lớn nhất: $maxResample');

  // ---------------- Bộ phân tích đường nét (chỉ M và c) trên cả 433 nét thật của kana-data.json
  var pn = 0, pBad = 0;
  var pMaxLen = 0.0, pMaxPt = 0.0;
  for (final c in (fx['pathChecks'] as List?) ?? const []) {
    pn++;
    final poly = polylineOf(c['d'] as String, 200);
    final len = polyLen(poly);
    final pts = resample(poly, 32);
    final ep = (c['pts32'] as List).map((p) => Pt(d(p['x']), d(p['y']))).toList();
    pMaxLen = math.max(pMaxLen, relErr(len, d(c['len'])));
    for (var i = 0; i < 32; i++) {
      pMaxPt = math.max(pMaxPt, math.max((pts[i].x - ep[i].x).abs(), (pts[i].y - ep[i].y).abs()));
    }
    if (relErr(len, d(c['len'])) > 1e-12) pBad++;
  }
  print('Phân tích đường nét: $pn nét, lệch độ dài >1e-12: $pBad, lệch độ dài tương đối lớn nhất=$pMaxLen, lệch điểm mẫu lớn nhất=$pMaxPt');

  // ---------------- Bẫy làm tròn: Math.round (JS) vs num.round() (Dart)
  print('Làm tròn: jsRound(-2.5)=${jsRound(-2.5)}  (-2.5).round()=${(-2.5).round()}  jsRound(2.5)=${jsRound(2.5)}  (2.5).round()=${(2.5).round()}  jsRound(0.49999999999999994)=${jsRound(0.49999999999999994)}');
}
