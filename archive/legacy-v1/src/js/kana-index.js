/* ========================================================================== *
 * KD.KanaIndex — chỉ mục dữ liệu ký tự
 * ========================================================================== */
(function () {
'use strict';

var DATA = KD.DATA;
var CHARS = DATA.chars;
var GROUP_LABEL = { basic: 'Cơ bản · 46 âm', dakuten: 'Biến âm · dakuten &amp; handakuten', yoon: 'Âm ghép · yōon' };

function listOf(script, filter) {
  return CHARS.filter(function (c) {
    return c.s === script && (filter === 'all' || c.g === filter);
  });
}
function rowsOf(list) {
  var order = [], map = {};
  list.forEach(function (c) {
    if (!map[c.row]) { map[c.row] = { row: c.row, group: c.g, cells: [] }; order.push(map[c.row]); }
    map[c.row].cells.push(c);
  });
  return order;
}

KD.KanaIndex = { CHARS: CHARS, GROUP_LABEL: GROUP_LABEL, listOf: listOf, rowsOf: rowsOf };
})();
