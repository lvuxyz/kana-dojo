/* =============================================================================
   Kana Dōjō — hạ tầng dùng chung cho mọi module (KD.*)
   ========================================================================== */
var KD = {};
KD.DATA  = window.KANA_DATA;
KD.VB    = KD.DATA.viewBox;                    // hệ toạ độ gốc: 109 × 109
KD.SVGNS = 'http://www.w3.org/2000/svg';
KD.$ = function (id) { return document.getElementById(id); };
