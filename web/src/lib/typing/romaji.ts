/* Bảng quy đổi kana → phím gõ, theo đúng hành vi của bộ gõ IME (MS-IME, Google 日本語入力):
 * người học quen tay ở đây thì sang máy thật gõ y hệt. Cách đầu tiên trong mỗi danh sách là cách
 * chuẩn (Hepburn — cùng hệ romaji với phần còn lại của ứng dụng), dùng để quy đổi số phím và thống
 * kê phím hay nhầm; các cách sau vẫn được chấp nhận (kunrei-shiki "si/ti/tu", "x/l" cho kana nhỏ…).
 * Màn gõ không hiện romaji: người học phải tự nhớ cách gõ từ chữ Nhật. */

/** Một cách gõ cho cụm kana bắt đầu tại một vị trí: chuỗi phím và số kana nó phủ. */
export interface Candidate {
  keys: string;
  len: number;
}

const SINGLE: Record<string, string[]> = {
  あ: ["a"], い: ["i", "yi"], う: ["u", "wu", "whu"], え: ["e"], お: ["o"],
  か: ["ka", "ca"], き: ["ki"], く: ["ku", "cu", "qu"], け: ["ke"], こ: ["ko", "co"],
  さ: ["sa"], し: ["shi", "si", "ci"], す: ["su"], せ: ["se", "ce"], そ: ["so"],
  た: ["ta"], ち: ["chi", "ti"], つ: ["tsu", "tu"], て: ["te"], と: ["to"],
  な: ["na"], に: ["ni"], ぬ: ["nu"], ね: ["ne"], の: ["no"],
  は: ["ha"], ひ: ["hi"], ふ: ["fu", "hu"], へ: ["he"], ほ: ["ho"],
  ま: ["ma"], み: ["mi"], む: ["mu"], め: ["me"], も: ["mo"],
  や: ["ya"], ゆ: ["yu"], よ: ["yo"],
  ら: ["ra"], り: ["ri"], る: ["ru"], れ: ["re"], ろ: ["ro"],
  わ: ["wa"], ゐ: ["wyi"], ゑ: ["wye"], を: ["wo"],
  が: ["ga"], ぎ: ["gi"], ぐ: ["gu"], げ: ["ge"], ご: ["go"],
  ざ: ["za"], じ: ["ji", "zi"], ず: ["zu"], ぜ: ["ze"], ぞ: ["zo"],
  // ぢ/づ: gõ "ji/zu" sẽ ra じ/ず, nên IME dùng "di/du".
  だ: ["da"], ぢ: ["di"], づ: ["du"], で: ["de"], ど: ["do"],
  ば: ["ba"], び: ["bi"], ぶ: ["bu"], べ: ["be"], ぼ: ["bo"],
  ぱ: ["pa"], ぴ: ["pi"], ぷ: ["pu"], ぺ: ["pe"], ぽ: ["po"],
  ゔ: ["vu"],
  ぁ: ["xa", "la"], ぃ: ["xi", "li", "xyi", "lyi"], ぅ: ["xu", "lu"],
  ぇ: ["xe", "le", "xye", "lye"], ぉ: ["xo", "lo"],
  ゃ: ["xya", "lya"], ゅ: ["xyu", "lyu"], ょ: ["xyo", "lyo"],
  ゎ: ["xwa", "lwa"], ゕ: ["xka", "lka"], ゖ: ["xke", "lke"],
  ー: ["-"],
};

const SMALL_TSU = ["xtu", "ltu", "xtsu", "ltsu"];
const N_ALONE = ["nn", "xn", "n'"];

/** Âm ghép với ゃゅょ (và ぃぇ): phụ âm đầu + nguyên âm của kana nhỏ. */
const YOON_HEADS: Record<string, string[]> = {
  き: ["ky"], ぎ: ["gy"], し: ["sh", "sy"], じ: ["j", "jy", "zy"],
  ち: ["ch", "cy", "ty"], ぢ: ["dy"], に: ["ny"], ひ: ["hy"], び: ["by"],
  ぴ: ["py"], み: ["my"], り: ["ry"],
};
const YOON_TAILS: Record<string, string> = { ゃ: "a", ぃ: "i", ゅ: "u", ぇ: "e", ょ: "o" };

/** Tổ hợp dùng cho từ ngoại lai (katakana mở rộng) — không suy ra được theo quy luật. */
const EXTENDED: Record<string, string[]> = {
  いぇ: ["ye"],
  うぁ: ["wha"], うぃ: ["wi", "whi"], うぇ: ["we", "whe"], うぉ: ["who"],
  ゔぁ: ["va"], ゔぃ: ["vi", "vyi"], ゔぇ: ["ve", "vye"], ゔぉ: ["vo"], ゔゅ: ["vyu"],
  くぁ: ["kwa", "qa"], くぃ: ["qi", "kwi"], くぇ: ["qe", "kwe"], くぉ: ["qo", "kwo"], ぐぁ: ["gwa"],
  すぃ: ["swi"], ずぃ: ["zwi"],
  つぁ: ["tsa"], つぃ: ["tsi"], つぇ: ["tse"], つぉ: ["tso"],
  てぃ: ["thi"], てゅ: ["thu"], でぃ: ["dhi"], でゅ: ["dhu"],
  とぅ: ["twu"], どぅ: ["dwu"],
  ふぁ: ["fa", "fwa"], ふぃ: ["fi", "fwi", "fyi"], ふぇ: ["fe", "fwe", "fye"], ふぉ: ["fo", "fwo"],
  ふゃ: ["fya"], ふゅ: ["fyu"], ふょ: ["fyo"],
};

const DOUBLE: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = { ...EXTENDED };
  for (const [head, prefixes] of Object.entries(YOON_HEADS)) {
    for (const [small, vowel] of Object.entries(YOON_TAILS)) {
      // "shi", "chi", "ji" đã là し/ち/じ, nên しぃ/ちぃ/じぃ chỉ gõ được bằng dạng có "y".
      const usable = vowel === "i" ? prefixes.filter((p) => p.endsWith("y")) : prefixes;
      out[head + small] = usable.map((p) => p + vowel);
    }
  }
  return out;
})();

/** Ký tự hiển thị nhưng không phải gõ: dấu câu, khoảng trắng. Mọi trò gõ phím
 *  phổ biến (寿司打, e-typing bản rút gọn) đều bỏ qua chúng để người chơi tập trung vào kana. */
const SKIP_RE = /[\s　、。，．,.!?！？「」『』（）()・…〜～"'“”‘’]/;

export function isSkipped(ch: string): boolean {
  return SKIP_RE.test(ch);
}

/** Katakana → hiragana, giữ nguyên độ dài chuỗi để chỉ số vị trí vẫn khớp với văn bản gốc. */
export function toHiragana(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : ch;
  }
  return out;
}

export function isTypeable(ch: string): boolean {
  const h = toHiragana(ch);
  return h in SINGLE || h === "ん" || h === "っ";
}

/**
 * Mọi cách gõ tại từng vị trí của một chuỗi kana (đã bỏ dấu câu).
 *
 * Hai trường hợp phụ thuộc kana đứng sau nên được tính từ cuối chuỗi ngược lên:
 * - ん: luôn gõ được "nn"/"xn"/"n'"; gõ một chữ "n" chỉ hợp lệ khi phím kế tiếp là phụ âm
 *   khác n và y — "kanji" ra かんじ, còn "kona" là こな chứ không phải こんあ. Đây đúng là luật của IME.
 * - っ: nhân đôi phụ âm đầu của cụm sau ("kitte"), hoặc gõ riêng "xtu"/"ltu".
 * Cả hai được biểu diễn thành một ứng viên phủ luôn cụm phía sau, nên bộ so khớp không cần
 * trạng thái riêng nào cho chúng.
 */
export function romajiCandidates(kana: string): Candidate[][] {
  const h = toHiragana(kana);
  const out: Candidate[][] = new Array(h.length);

  for (let i = h.length - 1; i >= 0; i--) {
    const ch = h[i];
    const next = out[i + 1] ?? [];
    const list: Candidate[] = [];

    if (ch === "ん") {
      for (const c of next) {
        if (!/^[aiueoyn']/.test(c.keys)) list.push({ keys: "n" + c.keys, len: 1 + c.len });
      }
      for (const k of N_ALONE) list.push({ keys: k, len: 1 });
    } else if (ch === "っ") {
      for (const c of next) {
        if (/^[bcdfghjkmpqrstvwyz]/.test(c.keys)) list.push({ keys: c.keys[0] + c.keys, len: 1 + c.len });
        if (c.keys.startsWith("ch")) list.push({ keys: "t" + c.keys, len: 1 + c.len });
      }
      for (const k of SMALL_TSU) list.push({ keys: k, len: 1 });
    } else {
      const pair = h.slice(i, i + 2);
      if (pair.length === 2) for (const k of DOUBLE[pair] ?? []) list.push({ keys: k, len: 2 });
      for (const k of SINGLE[ch] ?? []) list.push({ keys: k, len: 1 });
    }
    out[i] = list;
  }
  return out;
}

/** Cách gõ chuẩn (ngắn gọn, Hepburn) cho cả chuỗi — dùng để quy đổi số phím ở chế độ IME. */
export function toRomaji(kana: string): string {
  const cands = romajiCandidates(kana);
  let out = "";
  for (let i = 0; i < cands.length; ) {
    const c = cands[i][0];
    if (!c) return out; // ký tự không gõ được — dữ liệu sai, dừng thay vì lặp vô hạn
    out += c.keys;
    i += c.len;
  }
  return out;
}
