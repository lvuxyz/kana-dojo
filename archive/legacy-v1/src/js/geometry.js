/* ========================================================================== *
 * KD.Geometry — so khớp nét vẽ tay với đường tâm nét chuẩn
 * ========================================================================== */
(function () {
'use strict';

var VB = KD.VB;

function dist(a, b) { var x = a.x - b.x, y = a.y - b.y; return Math.sqrt(x * x + y * y); }

function polyLen(p) {
  var t = 0;
  for (var i = 1; i < p.length; i++) t += dist(p[i - 1], p[i]);
  return t;
}

/** Lấy lại n điểm cách đều nhau theo độ dài cung — bước then chốt để hai nét
 *  có số điểm và tốc độ vẽ khác nhau vẫn so sánh được theo từng cặp. */
function resample(p, n) {
  if (!p.length) return [];
  if (p.length === 1) { var o = []; while (o.length < n) o.push(p[0]); return o; }
  var acc = [0], total = 0, i;
  for (i = 1; i < p.length; i++) { total += dist(p[i - 1], p[i]); acc.push(total); }
  if (total === 0) { var q = []; while (q.length < n) q.push(p[0]); return q; }
  var out = [], j = 1;
  for (i = 0; i < n; i++) {
    var target = total * i / (n - 1);
    while (j < acc.length - 1 && acc[j] < target) j++;
    var span = acc[j] - acc[j - 1];
    var t = span > 0 ? (target - acc[j - 1]) / span : 0;
    out.push({
      x: p[j - 1].x + (p[j].x - p[j - 1].x) * t,
      y: p[j - 1].y + (p[j].y - p[j - 1].y) * t
    });
  }
  return out;
}

var N_CMP = 24;

/** Trả về {score 0–100, dev, reversed, ratio}. dev = sai lệch trung bình tính
 *  bằng đơn vị của ô 109×109, nên 3 ≈ 2.8% cạnh ô. */
function compare(user, target, tlen) {
  var U = resample(user, N_CMP), T = resample(target, N_CMP);
  var f = 0, r = 0, i;
  for (i = 0; i < N_CMP; i++) {
    f += dist(U[i], T[i]);
    r += dist(U[i], T[N_CMP - 1 - i]);
  }
  f /= N_CMP; r /= N_CMP;

  // Chấm theo chiều XUÔI. Nét vẽ ngược sẽ lệch rất xa ở hai đầu nên tự động
  // rớt điểm — không được lấy min(f, r), làm vậy là thưởng cho nét ngược chiều.
  var reversed = r < f - 1.2;
  var ratio = polyLen(user) / (tlen || 1);
  var lenPenalty = Math.abs(Math.log(Math.max(0.05, Math.min(20, ratio)))) * 15;
  var score = 100 - f * 4.2 - lenPenalty;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    dev: f, devRev: r, reversed: reversed, ratio: ratio
  };
}

var DIRS = ['từ trái sang phải', 'chéo xuống bên phải', 'từ trên xuống dưới', 'chéo xuống bên trái',
            'từ phải sang trái', 'chéo lên bên trái', 'từ dưới lên trên', 'chéo lên bên phải'];
function dirText(a, b) {
  var ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  return DIRS[(Math.round(ang / 45) + 8) % 8];
}
function posText(p) {
  var x = p.x - Math.floor(p.x / VB) * VB;
  var v = p.y < VB * 0.38 ? 'phía trên' : (p.y > VB * 0.63 ? 'phía dưới' : 'khoảng giữa');
  var h = x < VB * 0.38 ? ' bên trái' : (x > VB * 0.63 ? ' bên phải' : '');
  return v + h;
}

KD.Geometry = {
  dist: dist, polyLen: polyLen, resample: resample, compare: compare,
  dirText: dirText, posText: posText, N_CMP: N_CMP
};
})();
