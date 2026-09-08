/* ========================================================================== *
 * KD.Engine — engine tập viết
 *   SVG    = lưới giấy + nét mẫu + hoạt ảnh (vector, nét sắc ở mọi độ phân giải)
 *   Canvas = mực của người dùng (vẽ liên tục, hàng trăm điểm mỗi giây)
 * ========================================================================== */
(function () {
'use strict';

var $ = KD.$, DATA = KD.DATA, VB = KD.VB, SVGNS = KD.SVGNS;
var Store = KD.Store, Sheet = KD.Sheet;
var Geometry = KD.Geometry, polyLen = Geometry.polyLen, compare = Geometry.compare,
    dirText = Geometry.dirText, posText = Geometry.posText;

var stage  = $('stage');
var svg    = $('svg');
var canvas = $('ink');
var ctx    = canvas.getContext('2d');
var LAY    = { grid: $('lGrid'), guide: $('lGuide'), check: $('lCheck'), anim: $('lAnim'), num: $('lNum') };

var cur = null;          // ký tự đang luyện
var glyphN = 1;          // số ô (âm ghép = 2 ô)
var strokes = [];        // [{d, dx, el, len, pts}]
var si = 0;              // nét đang chờ viết
var inked = [];          // các nét người dùng đã viết đúng
var scores = [];
var misses = 0;
var drawing = false, live = [];
var rafId = 0, timerId = 0;
var INK = '#1A1F1C', ACC = '#C33C2B';

function readColors() {
  var s = getComputedStyle(document.documentElement);
  INK = (s.getPropertyValue('--sumi') || '#1A1F1C').trim();
  ACC = (s.getPropertyValue('--shu') || '#C33C2B').trim();
}

function gridCell(dx) {
  var t = dx ? ' transform="translate(' + dx + ',0)"' : '';
  return '<g' + t + '>' +
    '<rect class="cellbg" x="1.5" y="1.5" width="106" height="106" rx="2"/>' +
    '<line class="cellcross" x1="54.5" y1="5" x2="54.5" y2="104"/>' +
    '<line class="cellcross" x1="5" y1="54.5" x2="104" y2="54.5"/>' +
    '<line class="celldiag" x1="7" y1="7" x2="102" y2="102"/>' +
    '<line class="celldiag" x1="102" y1="7" x2="7" y2="102"/>' +
  '</g>';
}

function samplePath(el, n, dx) {
  var total = el.getTotalLength(), out = [], i, p;
  for (i = 0; i < n; i++) {
    p = el.getPointAtLength(total * i / (n - 1));
    out.push({ x: p.x + dx, y: p.y });
  }
  return out;
}

function buildStage(c) {
  cur = c;
  var gl = Array.from(c.c);
  glyphN = gl.length;

  svg.setAttribute('viewBox', '0 0 ' + (VB * glyphN) + ' ' + VB);
  stage.classList.toggle('is-wide', glyphN > 1);

  LAY.grid.innerHTML = gl.map(function (_, i) { return gridCell(i * VB); }).join('');
  LAY.guide.textContent = ''; LAY.check.textContent = '';
  LAY.anim.textContent = '';  LAY.num.textContent = '';
  strokes = [];

  gl.forEach(function (g, i) {
    var dx = i * VB;
    (DATA.glyphs[g] || []).forEach(function (d) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', 'gstroke');
      if (dx) p.setAttribute('transform', 'translate(' + dx + ',0)');
      LAY.guide.appendChild(p);
      strokes.push({ d: d, dx: dx, el: p });
    });
  });

  // getPointAtLength bỏ qua transform của thẻ cha nên phải cộng dx thủ công
  strokes.forEach(function (s) {
    s.len = s.el.getTotalLength();
    s.pts = samplePath(s.el, 32, s.dx);
  });

  resetChar();
}

function resetChar() {
  stopAnim();
  si = 0; inked = []; scores = []; misses = 0; live = []; drawing = false;
  LAY.check.textContent = '';
  stage.classList.remove('is-peek');
  $('done').classList.remove('is-on');
  setScore(null);
  paintGuides(); paintPips(); paintNum(); fitCanvas();
  note('Viết nét số <b>1</b> theo hướng mũi tên của nét mẫu.', '');
}

function paintGuides() {
  strokes.forEach(function (s, i) {
    s.el.classList.toggle('is-next', i === si);
    s.el.classList.toggle('is-done', i < si);
  });
}

function paintNum() {
  if (si >= strokes.length) { LAY.num.textContent = ''; return; }
  if (stage.dataset.mode === 'test' && !stage.classList.contains('is-peek')) { LAY.num.textContent = ''; return; }
  var p = strokes[si].pts[0];
  LAY.num.innerHTML = '<g class="snum"><circle cx="' + p.x + '" cy="' + p.y + '" r="5.8"/>' +
                      '<text x="' + p.x + '" y="' + p.y + '">' + (si + 1) + '</text></g>';
}

function paintPips() {
  var h = '';
  for (var i = 0; i < strokes.length; i++) {
    var st = i < si ? 'ok' : (i === si ? 'now' : 'wait');
    h += '<span class="pip" data-s="' + st + '">' + (i + 1) + '</span>';
  }
  $('pips').innerHTML = h;
}

function note(html, tone) {
  var el = $('note');
  el.innerHTML = html;
  if (tone) el.dataset.tone = tone; else delete el.dataset.tone;
}

function setScore(v, hint) {
  var n = $('sNum');
  if (v == null) { n.textContent = '—'; delete n.dataset.tone; $('sHint').textContent = 'Viết nét đầu tiên để bắt đầu'; return; }
  n.textContent = v;
  n.dataset.tone = v >= 80 ? 'good' : (v >= 58 ? 'ok' : 'bad');
  $('sHint').textContent = hint || (v >= 80 ? 'Rất sát nét mẫu' : v >= 58 ? 'Đạt, còn lệch một chút' : 'Chưa đạt — thử lại nét này');
}

/* ------------------------------------------------------------- canvas mực */
function fitCanvas() {
  var r = stage.getBoundingClientRect();
  if (!r.width) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width  = Math.round(r.width  * dpr);
  canvas.height = Math.round(r.height * dpr);
  // vẽ thẳng trong hệ toạ độ 109 của SVG
  ctx.setTransform(canvas.width / (VB * glyphN), 0, 0, canvas.height / VB, 0, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  repaint();
}

function strokePath(p, color, w, alpha) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = w;
  if (p.length === 1) {
    ctx.beginPath(); ctx.arc(p[0].x, p[0].y, w / 2, 0, Math.PI * 2); ctx.fill();
  } else if (p.length > 1) {
    ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
    for (var i = 1; i < p.length - 1; i++) {
      ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
    }
    ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function repaint(extra) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  inked.forEach(function (p) { strokePath(p, INK, 5.4, 1); });
  if (live.length) strokePath(live, ACC, 5.4, 0.9);
  if (extra) strokePath(extra, ACC, 5.4, 0.85);
}

function toStage(e) {
  var r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / r.width  * VB * glyphN,
    y: (e.clientY - r.top)  / r.height * VB
  };
}

canvas.addEventListener('pointerdown', function (e) {
  if (!cur || si >= strokes.length) return;
  e.preventDefault();
  stopAnim();
  drawing = true;
  live = [toStage(e)];
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  repaint();
});

canvas.addEventListener('pointermove', function (e) {
  if (!drawing) return;
  e.preventDefault();
  var p = toStage(e), last = live[live.length - 1];
  var dx = p.x - last.x, dy = p.y - last.y;
  if (dx * dx + dy * dy < 0.36) return;      // lọc rung tay / nhiễu bút
  live.push(p);
  repaint();
});

function endDraw(e) {
  if (!drawing) return;
  drawing = false;
  var p = live; live = [];
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  judge(p);
}
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointercancel', endDraw);

/* -------------------------------------------------------------- chấm điểm */
function judge(p) {
  if (si >= strokes.length) { repaint(); return; }
  if (p.length < 3 || polyLen(p) < 4) { repaint(); return; }   // chạm nhầm, không tính

  var t = strokes[si];
  var res = compare(p, t.pts, t.len);
  var pass = res.score >= (stage.dataset.mode === 'trace' ? 58 : 48);

  if (pass) {
    inked.push(p); scores.push(res.score); si++; misses = 0;
    setScore(res.score);
    paintGuides(); paintPips(); paintNum(); repaint();
    if (si >= strokes.length) finish();
    else note((res.score >= 85 ? 'Đẹp! ' : 'Được rồi. ') + 'Sang nét số <b>' + (si + 1) + '</b>.', 'good');
    return;
  }

  misses++;
  setScore(res.score);

  // nét vừa vẽ có khớp với một nét KHÁC của chữ này không?
  var alt = -1, altScore = Math.max(55, res.score + 15);   // chỉ dám khẳng định khi thật sự khớp
  strokes.forEach(function (o, j) {
    if (j === si) return;
    var q = compare(p, o.pts, o.len);
    if (q.score > altScore) { altScore = q.score; alt = j; }
  });

  note(alt >= 0
    ? 'Nét đó là nét số <b>' + (alt + 1) + '</b>. Thứ tự nét rất quan trọng — hãy viết nét số <b>' +
      (si + 1) + '</b> trước, bắt đầu ở <b>' + posText(t.pts[0]) + '</b> ô.'
    : explain(res, t), 'bad');
  repaint(p);
  setTimeout(function () { if (!drawing) repaint(); }, 560);
  if (misses >= 2) { misses = 0; setTimeout(function () { play(si); }, 620); }
}

function explain(res, t) {
  if (res.reversed)      return 'Đúng hình nhưng <b>ngược chiều</b>. Nét này viết ' + dirText(t.pts[0], t.pts[t.pts.length - 1]) + '.';
  if (res.ratio < 0.5)   return 'Nét <b>quá ngắn</b> — kéo hết chiều dài của nét mẫu.';
  if (res.ratio > 1.9)   return 'Nét <b>quá dài</b>, có vẻ bạn viết dính sang nét khác.';
  if (res.dev > 15)      return 'Đây chưa phải nét số <b>' + (si + 1) + '</b>. Nét này bắt đầu ở <b>' + posText(t.pts[0]) + '</b> ô.';
  return 'Sát rồi — bám đường tâm nét mẫu thêm chút nữa.';
}

function finish() {
  var sum = 0; scores.forEach(function (v) { sum += v; });
  var avg = Math.round(sum / (scores.length || 1));
  var mode = stage.dataset.mode;

  var rec = Store.get(cur.c);
  var best = Math.max(rec.best || 0, avg);
  var lv = rec.lv || 0;
  if (mode === 'test' && avg >= 80) lv = 2; else if (lv < 1) lv = 1;
  Store.set(cur.c, { lv: lv, best: best });
  Sheet.refreshCell(cur.c); Sheet.refreshGauge();

  showCheck(true);
  paintNum();
  note('Xong <b>' + strokes.length + '</b> nét. Đường xanh là nét chuẩn để bạn đối chiếu.', 'good');
  setScore(avg, 'Trung bình cả chữ');

  $('done').classList.add('is-on');
  $('doneTitle').textContent = avg >= 85 ? '見事 — Xuất sắc' : avg >= 68 ? 'よし — Tốt' : 'もう一度 — Luyện lại nhé';
  $('doneSub').innerHTML = 'Trung bình <b>' + avg + '</b>/100 · ' +
    (mode === 'test' ? 'chế độ Tự viết' : 'chế độ Đồ theo nét') +
    (lv === 2 ? ' · đã thuộc ✓' : ' · đạt <b>80</b> điểm ở chế độ <b>Tự viết</b> để được tính là thuộc');
}

function showCheck(on) {
  if (!on) { LAY.check.textContent = ''; return; }
  LAY.check.innerHTML = strokes.map(function (s) {
    return '<path class="cstroke" d="' + s.d + '"' + (s.dx ? ' transform="translate(' + s.dx + ',0)"' : '') + '/>';
  }).join('');
}

/* ------------------------------------------------------ hoạt ảnh nét mẫu */
function stopAnim() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  if (timerId) { clearTimeout(timerId); timerId = 0; }
  LAY.anim.textContent = '';
}

function play(i, then) {
  stopAnim();
  var s = strokes[i];
  if (!s) { if (then) then(); return; }

  var path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', s.d);
  path.setAttribute('class', 'astroke');
  if (s.dx) path.setAttribute('transform', 'translate(' + s.dx + ',0)');

  var ring = document.createElementNS(SVGNS, 'circle');
  ring.setAttribute('class', 'brushdot__ring'); ring.setAttribute('r', '7');
  var dot = document.createElementNS(SVGNS, 'circle');
  dot.setAttribute('class', 'brushdot'); dot.setAttribute('r', '3.4');

  LAY.anim.replaceChildren(path, ring, dot);
  path.style.strokeDasharray = s.len + ' ' + s.len;
  path.style.strokeDashoffset = s.len;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    path.style.strokeDashoffset = '0';
    ring.remove(); dot.remove();
    timerId = setTimeout(function () { LAY.anim.textContent = ''; if (then) then(); }, 700);
    return;
  }

  var dur = Math.min(1500, Math.max(500, 360 + s.len * 5));
  var t0 = performance.now();
  (function step(now) {
    var k = Math.min(1, (now - t0) / dur);
    var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    path.style.strokeDashoffset = String(s.len * (1 - e));
    var pt = s.el.getPointAtLength(s.len * e);
    dot.setAttribute('cx', pt.x + s.dx); dot.setAttribute('cy', pt.y);
    ring.setAttribute('cx', pt.x + s.dx); ring.setAttribute('cy', pt.y);
    if (k < 1) rafId = requestAnimationFrame(step);
    else { rafId = 0; timerId = setTimeout(function () { LAY.anim.textContent = ''; if (then) then(); }, 420); }
  })(performance.now());
}

function playFrom(i) {
  if (i >= strokes.length) return;
  play(i, function () { playFrom(i + 1); });
}

/** Tự phát hoạt ảnh nét đầu sau một khoảng trễ (dùng khi vừa mở khu tập viết) —
 *  dùng timerId nội bộ để stopAnim() có thể hủy nếu người dùng thao tác trước. */
function autoPlayFrom(delay) {
  timerId = setTimeout(function () { playFrom(0); }, delay);
}

KD.Engine = {
  stage: stage,
  LAY: LAY,
  buildStage: buildStage,
  resetChar: resetChar,
  play: play,
  playFrom: playFrom,
  autoPlayFrom: autoPlayFrom,
  showCheck: showCheck,
  readColors: readColors,
  repaint: repaint,
  fitCanvas: fitCanvas,
  stopAnim: stopAnim,
  note: note,
  setScore: setScore,
  get cur() { return cur; },
  get si() { return si; },
  get strokes() { return strokes; }
};
})();
