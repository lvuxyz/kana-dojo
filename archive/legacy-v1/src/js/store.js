/* ========================================================================== *
 * KD.Store — localStorage có thể bị chặn, luôn có bản dự phòng trong RAM
 * ========================================================================== */
(function () {
'use strict';

var KEY = 'kanadojo.progress.v1', mem = null, ok = true;
try { localStorage.setItem('__kd', '1'); localStorage.removeItem('__kd'); }
catch (e) { ok = false; }

function read() {
  if (mem) return mem;
  mem = {};
  if (ok) { try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { mem = {}; } }
  return mem;
}
function flush() { if (ok) { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} } }

KD.Store = {
  get: function (ch) { return read()[ch] || { lv: 0, best: 0 }; },
  set: function (ch, v) { read()[ch] = v; flush(); },
  wipe: function () { mem = {}; flush(); },
  pref: function (k, v) {
    if (!ok) return null;
    try {
      if (v === undefined) return localStorage.getItem('kanadojo.' + k);
      localStorage.setItem('kanadojo.' + k, v);
    } catch (e) {}
    return null;
  }
};
})();
