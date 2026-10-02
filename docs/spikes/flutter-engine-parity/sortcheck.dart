// buildQueue sắp thẻ đến hạn theo dueAt tăng dần; JS Array.sort ổn định nên thẻ trùng dueAt giữ thứ tự chèn.
// Kiểm tra List.sort của Dart có giữ thứ tự đó không (các thẻ vừa chấm cùng một giây hay trùng dueAt).
import 'dart:math' as math;

void main() {
  for (final n in [10, 31, 32, 33, 100, 500]) {
    final rnd = math.Random(7);
    var unstableRuns = 0;
    const runs = 200;
    for (var r = 0; r < runs; r++) {
      final items = List.generate(n, (i) => (due: rnd.nextInt(4), order: i)); // nhiều phần tử trùng dueAt
      final sorted = [...items]..sort((a, b) => a.due - b.due);
      var stable = true;
      for (var i = 1; i < sorted.length; i++) {
        if (sorted[i].due == sorted[i - 1].due && sorted[i].order < sorted[i - 1].order) { stable = false; break; }
      }
      if (!stable) unstableRuns++;
    }
    print('n=$n: $unstableRuns/$runs lần chạy làm đảo thứ tự các phần tử bằng nhau');
  }
}
