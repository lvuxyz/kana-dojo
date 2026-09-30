import { describe, expect, it } from "vitest";
import { TypingRun } from "./engine";
import { kanaFromKey } from "./kana-layout";
import { toHiragana, toRomaji } from "./romaji";

/** Gõ lần lượt từng phím; trả về số phím bị từ chối và câu đã xong chưa. */
function type(kana: string, keys: string, method: "ROMAJI" | "KANA" = "ROMAJI") {
  const run = new TypingRun(kana, method);
  let misses = 0;
  for (const k of keys) if (!run.press(k).ok) misses++;
  return { run, misses, finished: run.finished };
}

const accepts = (kana: string, keys: string) => {
  const r = type(kana, keys);
  return r.misses === 0 && r.finished;
};

describe("romaji — nhiều cách gõ cho cùng một kana", () => {
  it.each([
    ["し", ["shi", "si", "ci"]],
    ["ち", ["chi", "ti"]],
    ["つ", ["tsu", "tu"]],
    ["ふ", ["fu", "hu"]],
    ["じ", ["ji", "zi"]],
    ["か", ["ka", "ca"]],
    ["を", ["wo"]],
    ["ぢ", ["di"]],
    ["づ", ["du"]],
  ])("%s", (kana, variants) => {
    for (const v of variants) expect(accepts(kana, v), v).toBe(true);
  });

  it("âm ghép gõ liền hoặc tách kana nhỏ đều được", () => {
    for (const v of ["kya", "kixya", "kilya"]) expect(accepts("きゃ", v), v).toBe(true);
    for (const v of ["sha", "sya", "shixya", "silya"]) expect(accepts("しゃ", v), v).toBe(true);
    for (const v of ["cho", "cyo", "tyo", "chixyo"]) expect(accepts("ちょ", v), v).toBe(true);
    for (const v of ["ja", "jya", "zya", "jixya"]) expect(accepts("じゃ", v), v).toBe(true);
  });

  it("katakana mở rộng của từ ngoại lai", () => {
    expect(accepts("ファ", "fa")).toBe(true);
    expect(accepts("ファ", "fuxa")).toBe(true);
    expect(accepts("ティ", "thi")).toBe(true);
    expect(accepts("ティ", "texi")).toBe(true);
    expect(accepts("ディ", "dhi")).toBe(true);
    expect(accepts("ウィ", "wi")).toBe(true);
    expect(accepts("ヴァ", "va")).toBe(true);
    expect(accepts("ジェ", "je")).toBe(true);
    expect(accepts("チェ", "che")).toBe(true);
    expect(accepts("シェ", "she")).toBe(true);
  });

  it("しぃ không nuốt mất し: 'shi' vẫn là し", () => {
    expect(accepts("しい", "shii")).toBe(true);
  });

  it("trường âm katakana gõ bằng dấu gạch", () => {
    expect(accepts("コーヒー", "ko-hi-")).toBe(true);
    expect(accepts("コーヒー", "kohi")).toBe(false);
  });
});

describe("ん — luật một chữ n giống IME", () => {
  it("trước phụ âm (trừ n, y) gõ một chữ n là đủ", () => {
    expect(accepts("かんじ", "kanji")).toBe(true);
    expect(accepts("かんじ", "kannji")).toBe(true);
    expect(accepts("でんしゃ", "densha")).toBe(true);
    expect(accepts("がんばって", "ganbatte")).toBe(true);
  });

  it("trước nguyên âm, y hoặc n phải gõ nn", () => {
    expect(type("きんえん", "kinen").misses).toBeGreaterThan(0);
    expect(accepts("きんえん", "kinnenn")).toBe(true);
    expect(accepts("きんえん", "kin'enn")).toBe(true);
    expect(type("ほんや", "honya").misses).toBeGreaterThan(0);
    expect(accepts("ほんや", "honnya")).toBe(true);
    // "konnichiha" trong IME ra こんいちは — người học phải gõ ba chữ n.
    expect(type("こんにちは", "konnichiha").misses).toBeGreaterThan(0);
    expect(accepts("こんにちは", "konnnichiha")).toBe(true);
  });

  it("ん cuối câu phải gõ nn", () => {
    expect(type("ほん", "hon").finished).toBe(false);
    expect(accepts("ほん", "honn")).toBe(true);
    expect(accepts("ほん", "hoxn")).toBe(true);
  });

  it("ん trước っ vẫn gõ một chữ n", () => {
    expect(accepts("あんっか", "ankka")).toBe(true);
  });
});

describe("っ — nhân đôi phụ âm hoặc gõ riêng", () => {
  it("nhân đôi phụ âm đầu của cụm sau", () => {
    expect(accepts("きって", "kitte")).toBe(true);
    expect(accepts("きっぷ", "kippu")).toBe(true);
    expect(accepts("ざっし", "zasshi")).toBe(true);
    expect(accepts("ざっし", "zassi")).toBe(true);
  });

  it("gõ riêng bằng xtu/ltu/xtsu/ltsu", () => {
    for (const v of ["kixtute", "kiltute", "kixtsute", "kiltsute"]) expect(accepts("きって", v), v).toBe(true);
  });

  it("っち: cchi, tti hoặc tchi", () => {
    for (const v of ["maccha", "mattya", "matcha", "macchixya"]) expect(accepts("まっちゃ", v), v).toBe(true);
  });

  it("っ + âm ghép", () => {
    expect(accepts("ちょっと", "chotto")).toBe(true);
    expect(accepts("いっしょ", "issho")).toBe(true);
    expect(accepts("いっしょ", "issyo")).toBe(true);
  });

  it("không nhân đôi được nguyên âm", () => {
    expect(type("あっあ", "aaa").misses).toBeGreaterThan(0);
    expect(accepts("あっあ", "axtua")).toBe(true);
  });
});

describe("gợi ý phím", () => {
  it("gợi ý Hepburn ngắn nhất cho cả câu", () => {
    expect(toRomaji("かんじ")).toBe("kanji");
    expect(toRomaji("こんにちは")).toBe("konnnichiha");
    expect(toRomaji("ちょっとまってください")).toBe("chottomattekudasai");
    expect(toRomaji("コーヒー")).toBe("ko-hi-");
    expect(toRomaji("ファッション")).toBe("fasshonn");
    expect(new TypingRun("かんじ", "ROMAJI").minKeys).toBe(5);
  });

  it("gợi ý đổi theo cách người học đang gõ", () => {
    const run = new TypingRun("しかく", "ROMAJI");
    expect(run.rest()).toBe("shikaku");
    run.press("s");
    expect(run.rest()).toBe("hikaku");
    run.press("i");
    expect(run.rest()).toBe("kaku");
    expect(run.typed).toBe("si");
  });

  it("phím sai bị từ chối và không làm đổi trạng thái", () => {
    const run = new TypingRun("か", "ROMAJI");
    expect(run.press("x").ok).toBe(false);
    expect(run.rest()).toBe("ka");
    expect(run.typed).toBe("");
    expect(run.press("k")).toEqual({ ok: true, advanced: false, finished: false });
    expect(run.press("a")).toEqual({ ok: true, advanced: true, finished: true });
    expect(run.press("a").ok).toBe(false);
  });

  it("cụm đang gõ phủ cả ん lẫn kana phía sau khi gõ một chữ n", () => {
    const run = new TypingRun("かんじ", "ROMAJI");
    run.press("k");
    run.press("a");
    expect(run.current()).toEqual({ start: 1, end: 3 });
  });

  it("chữ không có trong bảng thì câu không gõ được", () => {
    expect(new TypingRun("日本", "ROMAJI").typeable).toBe(false);
    expect(new TypingRun("にほん", "ROMAJI").typeable).toBe(true);
  });
});

describe("kana JIS", () => {
  it("chữ có dấu gõ thành hai phím: chữ gốc rồi ゛/゜", () => {
    expect(type("が", "か゛", "KANA").finished).toBe(true);
    expect(type("ぱ", "は゜", "KANA").finished).toBe(true);
    expect(type("ヴ", "う゛", "KANA").finished).toBe(true);
    expect(type("コーヒー", "こーひー", "KANA").finished).toBe(true);
    expect(type("が", "が", "KANA").misses).toBe(1);
  });

  it("kana nhỏ nằm ở tầng Shift", () => {
    expect(kanaFromKey("KeyZ", false)).toBe("つ");
    expect(kanaFromKey("KeyZ", true)).toBe("っ");
    expect(kanaFromKey("Digit7", true)).toBe("ゃ");
    expect(kanaFromKey("Digit9", true)).toBe("ょ");
    expect(kanaFromKey("Digit0", true)).toBe("を");
  });

  it("bàn phím US thiếu phím ¥ và ろ thì dùng phím `", () => {
    expect(kanaFromKey("IntlYen", false)).toBe("ー");
    expect(kanaFromKey("Backquote", false)).toBe("ー");
    expect(kanaFromKey("IntlRo", false)).toBe("ろ");
    expect(kanaFromKey("Backquote", true)).toBe("ろ");
    expect(kanaFromKey("F1", false)).toBeUndefined();
  });
});

describe("toHiragana", () => {
  it("giữ nguyên độ dài và các ký tự không phải katakana", () => {
    expect(toHiragana("コーヒーをください")).toBe("こーひーをください");
    expect(toHiragana("ヴァ")).toBe("ゔぁ");
  });
});
