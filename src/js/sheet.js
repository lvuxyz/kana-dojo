/* ========================================================================== *
 * KD.Sheet — bảng ngũ thập âm
 * ========================================================================== */
(function () {
'use strict';

var $ = KD.$, DATA = KD.DATA, Store = KD.Store, KanaIndex = KD.KanaIndex, State = KD.State;
var listOf = KanaIndex.listOf, rowsOf = KanaIndex.rowsOf, GROUP_LABEL = KanaIndex.GROUP_LABEL;
var sheet = $('sheet');

function cellHTML(c) {
  var rec = Store.get(c.c);
  return '<button class="kana" data-ch="' + c.c + '" data-level="' + rec.lv + '" ' +
         'aria-label="' + c.c + ' — ' + c.r + ', ' + c.n + ' nét">' +
           '<span class="kana__glyph">' + c.c + '</span>' +
           '<span class="kana__rj">' + c.r + '</span>' +
           '<span class="kana__seal" aria-hidden="true">済</span>' +
           '<span class="kana__bar"><i style="width:' + Math.min(100, rec.best) + '%"></i></span>' +
         '</button>';
}

function renderSheet() {
  var list = listOf(State.script, State.filter);
  var rows = rowsOf(list);
  var html = '', lastGroup = null;

  rows.forEach(function (r) {
    if (r.group !== lastGroup) {
      lastGroup = r.group;
      html += '<div class="sect"><span class="sect__jp">' + GROUP_LABEL[r.group] + '</span></div>';
    }
    var cols = 3;
    if (r.group !== 'yoon') {
      cols = 1;
      r.cells.forEach(function (c) { cols = Math.max(cols, c.col + 1); });
    }
    var slots = new Array(cols);
    r.cells.forEach(function (c) { slots[c.col] = c; });

    var cells = '';
    for (var i = 0; i < cols; i++) {
      cells += slots[i] ? cellHTML(slots[i]) : '<div class="kana--void" aria-hidden="true"></div>';
    }
    var label = DATA.rowLabels[r.row] || r.row;
    html += '<section class="krow">' +
              '<div class="krow__head">' +
                '<span class="krow__jp">' + label + '</span>' +
                '<span class="krow__rj">' + r.row + '</span>' +
              '</div>' +
              '<div class="krow__cells" style="--cols:' + cols + '">' + cells + '</div>' +
            '</section>';
  });

  sheet.innerHTML = html;
  refreshGauge();
}

function refreshCell(ch) {
  var el = sheet.querySelector('.kana[data-ch="' + ch + '"]');
  if (!el) return;
  var rec = Store.get(ch);
  el.dataset.level = rec.lv;
  el.querySelector('.kana__bar i').style.width = Math.min(100, rec.best) + '%';
}

function refreshGauge() {
  var all = listOf(State.script, 'all');
  var done = all.filter(function (c) { return Store.get(c.c).lv === 2; }).length;
  $('gaugeDone').textContent = done;
  $('gaugeAll').textContent = all.length;
  $('gaugeFill').style.width = (all.length ? done / all.length * 100 : 0) + '%';
  $('cAll').textContent = all.length;
}

KD.Sheet = { el: sheet, render: renderSheet, refreshCell: refreshCell, refreshGauge: refreshGauge };
})();
