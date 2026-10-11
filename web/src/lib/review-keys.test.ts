import { describe, expect, it } from "vitest";
import { reviewKeyAction, spokenText, type KeyInput, type ReviewKeyState } from "./review-keys";

const key = (k: string, code: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key: k, code, repeat: false, modified: false, composing: false, target: "none", ...extra,
});
const SPACE = key(" ", "Space");
const ENTER = key("Enter", "Enter");
const front: ReviewKeyState = { revealed: false, writing: false, speakable: true };
const back: ReviewKeyState = { ...front, revealed: true };

describe("reviewKeyAction", () => {
  it("Space and Enter reveal the answer", () => {
    expect(reviewKeyAction(SPACE, front)).toEqual({ type: "reveal" });
    expect(reviewKeyAction(ENTER, front)).toEqual({ type: "reveal" });
  });

  it("Space and Enter grade Good, not Easy, once revealed (Anki default)", () => {
    expect(reviewKeyAction(SPACE, back)).toEqual({ type: "grade", grade: 3 });
    expect(reviewKeyAction(ENTER, back)).toEqual({ type: "grade", grade: 3 });
  });

  it("1–4 grade only after the answer is shown", () => {
    for (const g of [1, 2, 3, 4] as const) {
      expect(reviewKeyAction(key(String(g), `Digit${g}`), back)).toEqual({ type: "grade", grade: g });
      expect(reviewKeyAction(key(String(g), `Numpad${g}`), back)).toEqual({ type: "grade", grade: g });
      expect(reviewKeyAction(key(String(g), `Digit${g}`), front)).toBeNull();
    }
    expect(reviewKeyAction(key("5", "Digit5"), back)).toBeNull();
    expect(reviewKeyAction(key("0", "Digit0"), back)).toBeNull();
  });

  it("matches digits by physical key when the layout types symbols (AZERTY)", () => {
    expect(reviewKeyAction(key("&", "Digit1"), back)).toEqual({ type: "grade", grade: 1 });
    expect(reviewKeyAction(key("é", "Digit2"), back)).toEqual({ type: "grade", grade: 2 });
  });

  it("ignores auto-repeat so holding Space cannot reveal and grade in one go", () => {
    expect(reviewKeyAction({ ...SPACE, repeat: true }, front)).toBeNull();
    expect(reviewKeyAction({ ...SPACE, repeat: true }, back)).toBeNull();
    expect(reviewKeyAction(key("4", "Digit4", { repeat: true }), back)).toBeNull();
  });

  it("leaves modifier shortcuts and IME composition to the browser", () => {
    expect(reviewKeyAction(key("1", "Digit1", { modified: true }), back)).toBeNull();
    expect(reviewKeyAction(key("r", "KeyR", { modified: true }), back)).toBeNull();
    expect(reviewKeyAction({ ...SPACE, composing: true }, front)).toBeNull();
  });

  it("does nothing while focus is in a text field", () => {
    const t = { target: "editable" } as const;
    expect(reviewKeyAction({ ...SPACE, ...t }, front)).toBeNull();
    expect(reviewKeyAction(key("2", "Digit2", t), back)).toBeNull();
    expect(reviewKeyAction(key("r", "KeyR", t), back)).toBeNull();
  });

  it("lets a focused button handle Space/Enter itself, but digits still grade", () => {
    const t = { target: "control" } as const;
    expect(reviewKeyAction({ ...SPACE, ...t }, back)).toBeNull();
    expect(reviewKeyAction({ ...ENTER, ...t }, front)).toBeNull();
    expect(reviewKeyAction(key("2", "Digit2", t), back)).toEqual({ type: "grade", grade: 2 });
  });

  it("is fully off on writing cards", () => {
    const writing = { ...back, writing: true };
    expect(reviewKeyAction(SPACE, { ...writing, revealed: false })).toBeNull();
    expect(reviewKeyAction(key("1", "Digit1"), writing)).toBeNull();
    expect(reviewKeyAction(key("r", "KeyR"), writing)).toBeNull();
  });

  it("R replays only after reveal and only when there is Japanese to read", () => {
    expect(reviewKeyAction(key("r", "KeyR"), back)).toEqual({ type: "speak" });
    expect(reviewKeyAction(key("R", "KeyR"), back)).toEqual({ type: "speak" });
    expect(reviewKeyAction(key("r", "KeyR"), front)).toBeNull(); // nghe trước khi lật là lộ cách đọc
    expect(reviewKeyAction(key("r", "KeyR"), { ...back, speakable: false })).toBeNull();
  });

  it("R follows the typed letter, falling back to position on non-Latin layouts", () => {
    expect(reviewKeyAction(key("к", "KeyR"), back)).toEqual({ type: "speak" }); // tiếng Nga
    expect(reviewKeyAction(key("p", "KeyR"), back)).toBeNull(); // Dvorak: phím này gõ ra p
    expect(reviewKeyAction(key("r", "KeyO"), back)).toEqual({ type: "speak" }); // Dvorak: R nằm ở đây
  });
});

describe("spokenText", () => {
  it("picks the first side that contains Japanese", () => {
    expect(spokenText("あ", "a", null)).toBe("あ");
    expect(spokenText("食べる", "ăn", "たべる")).toBe("食べる");
    expect(spokenText("ăn", "食べる")).toBe("食べる"); // thẻ tự soạn chiều ngược
    expect(spokenText("ｶ")).toBe("ｶ"); // katakana nửa độ rộng
  });

  it("returns null when no side is Japanese", () => {
    expect(spokenText("xin chào", "hello", null)).toBeNull();
    expect(spokenText(null, "")).toBeNull();
  });
});
