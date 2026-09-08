/* ========================================================================== *
 * Khu tập viết — mở/đóng, điều hướng, điều khiển, sự kiện UI, khởi động
 * ========================================================================== */
(function () {
'use strict';

var $ = KD.$;
var Store = KD.Store, Speech = KD.Speech, State = KD.State;
var Sheet = KD.Sheet, Engine = KD.Engine;
var listOf = KD.KanaIndex.listOf;
var sheet = Sheet.el;

var modal = $('modal');
var lastFocus = null;

function loadCurrent() {
  var c = State.queue[State.qi];
  if (!c) return;
  $('cGlyph').textContent  = c.c;
  $('cRomaji').textContent = c.r;
  $('cVn').textContent     = 'đọc gần như: ' + c.vn;
  $('cCount').textContent  = c.n + ' nét · ' + (State.qi + 1) + '/' + State.queue.length;
  Engine.buildStage(c);
  $('btnPrev').disabled = State.queue.length < 2;
  $('btnNext').disabled = State.queue.length < 2;
  Engine.autoPlayFrom(260);
}

function openPractice(queue, index) {
  State.queue = queue; State.qi = index;
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  Engine.readColors();
  loadCurrent();
  $('btnHint').focus();
}

function closePractice() {
  Engine.stopAnim();
  modal.hidden = true;
  document.body.style.overflow = '';
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function step(delta) {
  if (!State.queue.length) return;
  State.qi = (State.qi + delta + State.queue.length) % State.queue.length;
  loadCurrent();
}

/* ------------------------------------------------------------ sự kiện UI */
sheet.addEventListener('click', function (e) {
  var btn = e.target.closest('.kana');
  if (!btn) return;
  var list = listOf(State.script, State.filter);
  var idx = list.findIndex(function (c) { return c.c === btn.dataset.ch; });
  openPractice(list, Math.max(0, idx));
});

modal.addEventListener('click', function (e) {
  if (e.target.closest('[data-close]')) closePractice();
});

$('btnStart').addEventListener('click', function () {
  openPractice(listOf(State.script, State.filter), 0);
});

$('btnShuffle').addEventListener('click', function () {
  var q = listOf(State.script, State.filter).slice();
  for (var i = q.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = q[i]; q[i] = q[j]; q[j] = t;
  }
  openPractice(q, 0);
});

$('btnReset').addEventListener('click', function () {
  if (!window.confirm('Xóa toàn bộ tiến độ đã lưu trên trình duyệt này?')) return;
  Store.wipe();
  Sheet.render();
});

$('btnPrev').addEventListener('click', function () { step(-1); });
$('btnNext').addEventListener('click', function () { step(1); });
$('btnDoneNext').addEventListener('click', function () { step(1); });
$('btnClear').addEventListener('click', function () { Engine.resetChar(); });
$('btnHint').addEventListener('click', function () {
  if (Engine.si >= Engine.strokes.length) { Engine.showCheck(false); Engine.playFrom(0); }
  else Engine.play(Engine.si);
});
$('btnCompare').addEventListener('click', function () {
  var on = !Engine.LAY.check.hasChildNodes();
  Engine.showCheck(on);
  Engine.note(on ? 'Đường <b>xanh</b> là đường tâm nét chuẩn — so với mực đen của bạn.'
                 : 'Đã ẩn nét chuẩn.', '');
});

$('btnAudio').addEventListener('click', function () {
  if (!Engine.cur) return;
  var warn = Speech.say(Engine.cur.c);
  if (warn) Engine.note(warn, 'bad');
});

Array.prototype.forEach.call(document.querySelectorAll('.modes button'), function (b) {
  b.addEventListener('click', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.modes button'), function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    Engine.stage.dataset.mode = b.dataset.mode;
    Store.pref('mode', b.dataset.mode);
    Engine.resetChar();
  });
});

Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) {
  b.addEventListener('click', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (x) {
      x.setAttribute('aria-selected', String(x === b));
    });
    State.script = b.dataset.script;
    Store.pref('script', State.script);
    Sheet.render();
  });
});

Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (b) {
  b.addEventListener('click', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (x) {
      x.setAttribute('aria-pressed', String(x === b));
    });
    State.filter = b.dataset.filter;
    Sheet.render();
  });
});

/* ---------------------------------------------------------------- bàn phím */
document.addEventListener('keydown', function (e) {
  if (modal.hidden) return;
  var k = e.key.toLowerCase();
  if (e.key === 'Escape')      { closePractice(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  else if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
  else if (k === 'r')          { e.preventDefault(); $('btnHint').click(); }
  else if (k === 'c')          { e.preventDefault(); Engine.resetChar(); }
  else if (e.key === ' ')      { e.preventDefault(); $('btnAudio').click(); }
});

/* ------------------------------------------------------------ giao diện tối */
function applyTheme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  Engine.readColors();
  if (Engine.cur) Engine.repaint();
}
$('themeBtn').addEventListener('click', function () {
  var now = document.documentElement.getAttribute('data-theme');
  if (!now) now = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var next = now === 'dark' ? 'light' : 'dark';
  Store.pref('theme', next);
  applyTheme(next);
});

/* ---------------------------------------------------------- co giãn khung */
var resizeT = 0;
window.addEventListener('resize', function () {
  clearTimeout(resizeT);
  resizeT = setTimeout(function () { if (!modal.hidden) Engine.fitCanvas(); }, 120);
});

/* ================================================================== khởi động */
Speech.init();
applyTheme(Store.pref('theme'));

var savedScript = Store.pref('script');
if (savedScript === 'k') {
  State.script = 'k';
  document.querySelectorAll('.seg button').forEach(function (x) {
    x.setAttribute('aria-selected', String(x.dataset.script === 'k'));
  });
}
var savedMode = Store.pref('mode');
if (savedMode === 'test') {
  Engine.stage.dataset.mode = 'test';
  document.querySelectorAll('.modes button').forEach(function (x) {
    x.setAttribute('aria-pressed', String(x.dataset.mode === 'test'));
  });
}

Sheet.render();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () { if (!modal.hidden) Engine.fitCanvas(); });
}
})();
