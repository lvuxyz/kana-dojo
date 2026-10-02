// Bản port Dart của web/src/lib/fsrs.ts và web/src/lib/stroke-match.ts — chỉ dùng dart:math.
// Mục đích spike: chứng minh port cho kết quả giống engine TypeScript trên fixture sinh từ chính mã web.
import 'dart:math' as math;

// ------------------------------------------------------------------ số học kiểu JavaScript

/// Math.round của JS: làm tròn nửa về phía +∞ (khác `num.round()` của Dart: nửa ra xa số 0).
/// Hai cách chỉ khác nhau ở số ÂM có phần thập phân đúng 0,5 — ví dụ -2,5: JS ra -2, Dart ra -3.
double jsRound(double x) {
  final f = x.floorToDouble();
  return (x - f >= 0.5) ? f + 1 : f; // không dùng floor(x + 0.5): sai với 0.49999999999999994
}

double clamp(double v, double lo, double hi) => math.min(math.max(v, lo), hi);

// ------------------------------------------------------------------ FSRS-6

const List<double> w = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

final double decay = -w[20];
final double factor = math.pow(0.9, 1 / decay).toDouble() - 1;

const learningSteps = [1, 10];
const relearningSteps = [10];
const minStability = 0.01;
const maxIntervalDays = 36500;
const minuteMs = 60000;
const dayMs = 86400000;

class FsrsState {
  final double stability;
  final double difficulty;
  final String state; // NEW | LEARNING | REVIEW | RELEARNING
  final int learningStep;
  final int reps;
  final int lapses;
  const FsrsState(this.stability, this.difficulty, this.state, this.learningStep, this.reps, this.lapses);
}

class FsrsResult {
  final FsrsState next;
  final int intervalDays;
  final int dueAt;
  const FsrsResult(this.next, this.intervalDays, this.dueAt);
}

FsrsState newCardState() => const FsrsState(0, 0, 'NEW', 0, 0, 0);

double retrievability(double stability, double elapsedDays) {
  final s = math.max(stability, minStability);
  final t = math.max(elapsedDays, 0);
  return math.pow(1 + (factor * t) / s, decay).toDouble();
}

int intervalDays(double stability, double desiredRetention) {
  final retention = clamp(desiredRetention, 0.7, 0.99);
  final raw = (math.max(stability, minStability) / factor) * (math.pow(retention, 1 / decay).toDouble() - 1);
  return clamp(jsRound(raw), 1, maxIntervalDays.toDouble()).toInt();
}

double initialStability(int grade) => math.max(w[grade - 1], minStability);

double initialDifficulty(int grade) =>
    clamp(w[4] - math.exp(w[5] * (grade - 1)) + 1, 1, 10);

double nextDifficulty(double difficulty, int grade) {
  final deltaD = -w[6] * (grade - 3);
  final dampened = difficulty + (deltaD * (10 - difficulty)) / 9;
  final reverted = w[7] * initialDifficulty(4) + (1 - w[7]) * dampened;
  return clamp(reverted, 1, 10);
}

double stabilityAfterRecall(double stability, double difficulty, double r, int grade) {
  final s = math.max(stability, minStability);
  final hardPenalty = grade == 2 ? w[15] : 1.0;
  final easyBonus = grade == 4 ? w[16] : 1.0;
  final growth = math.exp(w[8]) *
      (11 - difficulty) *
      math.pow(s, -w[9]).toDouble() *
      (math.exp(w[10] * (1 - r)) - 1) *
      hardPenalty *
      easyBonus;
  return math.max(s * (1 + growth), minStability);
}

double stabilityAfterForget(double stability, double difficulty, double r) {
  final s = math.max(stability, minStability);
  final d = math.max(difficulty, 1);
  final postLapse = w[11] *
      math.pow(d, -w[12]).toDouble() *
      (math.pow(s + 1, w[13]).toDouble() - 1) *
      math.exp(w[14] * (1 - r));
  return math.max(math.min(s, postLapse), minStability);
}

double stabilityShortTerm(double stability, int grade) {
  final s = math.max(stability, minStability);
  return math.max(s * math.exp(w[17] * (grade - 3 + w[18])) * math.pow(s, -w[19]).toDouble(), minStability);
}

FsrsResult review(FsrsState cur, int grade, double elapsedDays, int now, [double desiredRetention = 0.9]) {
  if (grade < 1 || grade > 4) throw RangeError('grade phải nằm trong 1..4, nhận được: $grade');

  final elapsed = math.max(elapsedDays, 0);
  final reps = cur.reps + 1;
  double stability, difficulty;

  if (cur.state == 'NEW' || cur.reps == 0) {
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
  } else {
    final r = retrievability(cur.stability, elapsed.toDouble());
    difficulty = nextDifficulty(cur.difficulty, grade);
    if (grade == 1) {
      stability = stabilityAfterForget(cur.stability, cur.difficulty, r);
    } else if (elapsed < 1) {
      stability = stabilityShortTerm(cur.stability, grade);
    } else {
      stability = stabilityAfterRecall(cur.stability, cur.difficulty, r, grade);
    }
  }

  final lapses = (grade == 1 && cur.state == 'REVIEW') ? cur.lapses + 1 : cur.lapses;

  switch (cur.state) {
    case 'NEW':
    case 'LEARNING':
      return _steps(learningSteps, 'LEARNING', cur.learningStep, grade, stability, difficulty, reps, lapses, now, desiredRetention);
    case 'RELEARNING':
      return _steps(relearningSteps, 'RELEARNING', cur.learningStep, grade, stability, difficulty, reps, lapses, now, desiredRetention);
    default: // REVIEW
      if (grade == 1) {
        return FsrsResult(FsrsState(stability, difficulty, 'RELEARNING', 0, reps, lapses), 0, now + relearningSteps[0] * minuteMs);
      }
      return _graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  }
}

FsrsResult _steps(List<int> steps, String stepState, int currentStep, int grade, double stability, double difficulty,
    int reps, int lapses, int now, double desiredRetention) {
  if (grade == 4) return _graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  final step = grade == 1
      ? 0
      : grade == 2
          ? math.min(math.max(currentStep, 0), steps.length - 1)
          : math.max(currentStep, 0) + 1;
  if (step >= steps.length) return _graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  return FsrsResult(FsrsState(stability, difficulty, stepState, step, reps, lapses), 0, now + steps[step] * minuteMs);
}

FsrsResult _graduate(double stability, double difficulty, int reps, int lapses, int now, double desiredRetention) {
  final interval = intervalDays(stability, desiredRetention);
  return FsrsResult(FsrsState(stability, difficulty, 'REVIEW', 0, reps, lapses), interval, now + interval * dayMs);
}

// ------------------------------------------------------------------ chấm nét

class Pt {
  final double x, y;
  const Pt(this.x, this.y);
}

/// Dữ liệu nét của kana-data.json chỉ dùng hai lệnh SVG: `M` (1 lần đầu nét) và `c` (Bézier bậc 3 tương đối) —
/// đã đếm trên cả 433 nét: 433 `M`, 1175 `c`. Nên không cần thư viện phân tích SVG (và `path_drawing` đã bỏ từ 2022).
/// Trả về các đoạn Bézier tuyệt đối [p0, p1, p2, p3]; gặp lệnh khác thì ném lỗi để test nội dung bắt được ngay.
List<List<Pt>> parseKanjiVgPath(String d) {
  final tokens = RegExp(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?').allMatches(d).map((m) => m.group(0)!).toList();
  var i = 0;
  var x = 0.0, y = 0.0;
  var cmd = '';
  var started = false;
  double next() => double.parse(tokens[i++]);
  final segs = <List<Pt>>[];
  while (i < tokens.length) {
    if (RegExp(r'^[A-Za-z]$').hasMatch(tokens[i])) {
      cmd = tokens[i++];
      if (cmd != 'M' && cmd != 'c') throw FormatException('Lệnh SVG chưa hỗ trợ: $cmd');
      if (cmd == 'M') {
        if (started) throw const FormatException('Nét có nhiều hơn một lệnh M');
        started = true;
        x = next();
        y = next();
        continue;
      }
    }
    if (cmd != 'c') throw FormatException('Số thừa sau lệnh $cmd');
    final p0 = Pt(x, y);
    final p1 = Pt(x + next(), y + next());
    final p2 = Pt(x + next(), y + next());
    final p3 = Pt(x + next(), y + next());
    segs.add([p0, p1, p2, p3]);
    x = p3.x;
    y = p3.y;
  }
  return segs;
}

/// Đa tuyến dày đặc của nét (mỗi đoạn Bézier chia `perSeg` bước) — dùng để lấy độ dài cung và 32 điểm mẫu.
/// Trong Flutter thật, `Path.computeMetrics()` + `getTangentForOffset` làm đúng việc này.
List<Pt> polylineOf(String d, int perSeg) {
  final pts = <Pt>[];
  final segs = parseKanjiVgPath(d);
  if (segs.isEmpty) return pts;
  pts.add(segs.first[0]);
  for (final s in segs) {
    for (var k = 1; k <= perSeg; k++) {
      final t = k / perSeg, u = 1 - t;
      pts.add(Pt(
        u * u * u * s[0].x + 3 * u * u * t * s[1].x + 3 * u * t * t * s[2].x + t * t * t * s[3].x,
        u * u * u * s[0].y + 3 * u * u * t * s[1].y + 3 * u * t * t * s[2].y + t * t * t * s[3].y,
      ));
    }
  }
  return pts;
}

double dist(Pt a, Pt b) {
  final dx = a.x - b.x, dy = a.y - b.y;
  return math.sqrt(dx * dx + dy * dy);
}

double polyLen(List<Pt> p) {
  var t = 0.0;
  for (var i = 1; i < p.length; i++) {
    t += dist(p[i - 1], p[i]);
  }
  return t;
}

List<Pt> resample(List<Pt> p, int n) {
  if (p.isEmpty) return [];
  if (p.length == 1) return List.filled(n, p[0]);
  final acc = <double>[0];
  var total = 0.0;
  for (var i = 1; i < p.length; i++) {
    total += dist(p[i - 1], p[i]);
    acc.add(total);
  }
  if (total == 0) return List.filled(n, p[0]);
  final out = <Pt>[];
  var j = 1;
  for (var i = 0; i < n; i++) {
    final target = (total * i) / (n - 1);
    while (j < acc.length - 1 && acc[j] < target) {
      j++;
    }
    final span = acc[j] - acc[j - 1];
    final t = span > 0 ? (target - acc[j - 1]) / span : 0.0;
    out.add(Pt(p[j - 1].x + (p[j].x - p[j - 1].x) * t, p[j - 1].y + (p[j].y - p[j - 1].y) * t));
  }
  return out;
}

class StrokeScore {
  final int score;
  final double dev;
  final bool reversed;
  final double ratio;
  final String? reason;
  const StrokeScore(this.score, this.dev, this.reversed, this.ratio, this.reason);
}

const nCmp = 24;

StrokeScore scoreStroke(List<Pt> user, List<Pt> target, double targetLen) {
  final u = resample(user, nCmp);
  final t = resample(target, nCmp);
  var fwd = 0.0, rev = 0.0;
  for (var i = 0; i < nCmp; i++) {
    fwd += dist(u[i], t[i]);
    rev += dist(u[i], t[nCmp - 1 - i]);
  }
  fwd /= nCmp;
  rev /= nCmp;

  final reversed = rev < fwd - 1.2;
  final ratio = polyLen(user) / (targetLen == 0 ? 1 : targetLen);
  final lenPenalty = (math.log(math.max(0.05, math.min(20, ratio))).abs()) * 15;
  final score = math.max(0, math.min(100, jsRound(100 - fwd * 4.2 - lenPenalty))).toInt();

  String? reason;
  if (reversed) {
    reason = 'REVERSED';
  } else if (ratio < 0.5) {
    reason = 'TOO_SHORT';
  } else if (ratio > 1.9) {
    reason = 'TOO_LONG';
  } else if (fwd > 15) {
    reason = 'OFF_PATH';
  }
  return StrokeScore(score, fwd, reversed, ratio, reason);
}
