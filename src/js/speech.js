/* ========================================================================== *
 * KD.Speech — Web Speech API, giọng ja-JP của hệ điều hành
 * ========================================================================== */
(function () {
'use strict';

KD.Speech = {
  voice: null,
  warned: false,
  supported: typeof speechSynthesis !== 'undefined',
  init: function () {
    if (!this.supported) return;
    var self = this;
    var pick = function () {
      var v = speechSynthesis.getVoices() || [];
      self.voice = v.filter(function (x) { return /^ja/i.test(x.lang); })[0] || null;
    };
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
  },
  say: function (text) {
    if (!this.supported) return 'Trình duyệt này không hỗ trợ đọc thành tiếng.';
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.72;
    if (this.voice) u.voice = this.voice;
    speechSynthesis.speak(u);
    if (!this.voice && !this.warned) {
      this.warned = true;
      return 'Máy chưa cài giọng đọc tiếng Nhật — âm thanh có thể sai. Cài gói ngôn ngữ tiếng Nhật để nghe chuẩn.';
    }
    return '';
  }
};
})();
