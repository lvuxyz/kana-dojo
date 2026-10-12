import { describe, expect, it } from "vitest";
import { parseSaved, withSaved } from "./saved";
import {
  currentCard, formatClock, formatDuration, isDone, resumeSession, shouldOfferSave, startSession, studyCta, studyKeyAction,
  studyReducer, summarize, toSaved, type Flashcard, type StudyEvent, type StudySession,
} from "./session";

const T0 = Date.parse("2026-10-12T03:00:00Z");
const deck: Flashcard[] = [
  { id: "a", front: "私", back: "tôi", hint: "わたし" },
  { id: "b", front: "あなた", back: "bạn", hint: "" },
  { id: "c", front: "水", back: "nước", hint: "みず" },
];

const start = (cards = deck, from = 0) => {
  const s = startSession("d1", cards, T0, from);
  if (!s) throw new Error("phiên rỗng");
  return s;
};
const run = (s: StudySession, ...events: StudyEvent[]) => events.reduce(studyReducer, s);
/** Lật, chờ hiệu ứng xong, đánh giá, chờ thẻ mới vào — một thẻ trọn vẹn như người dùng làm. */
const answer = (s: StudySession, verdict: "known" | "again", now = T0) =>
  run(s, { type: "flip" }, { type: "settle" }, { type: "rate", verdict, now }, { type: "settle" });

describe("nút Học ngay", () => {
  it("bị tắt và có hướng dẫn thêm thẻ khi bộ trống", () => {
    const cta = studyCta(0);
    expect(cta.disabled).toBe(true);
    expect(cta.hint).toMatch(/thêm/i);
    expect(startSession("d1", [], T0)).toBeNull();
  });

  it("bật và ghi tổng số thẻ khi bộ có thẻ", () => {
    expect(studyCta(25)).toEqual({ disabled: false, label: "Học ngay (25 thẻ)", hint: null });
  });
});

describe("bắt đầu phiên", () => {
  it("mở thẻ đầu tiên ở mặt trước, chưa khoá, chưa có kết quả", () => {
    const s = start();
    expect(currentCard(s)?.id).toBe("a");
    expect(s.side).toBe("front");
    expect(s.locked).toBe(false);
    expect(s.index).toBe(0);
    expect(s.results).toEqual({});
  });

  it("“Học từ thẻ này” bắt đầu đúng vị trí, chỉ gồm thẻ từ đó trở đi", () => {
    const s = start(deck, 1);
    expect(currentCard(s)?.id).toBe("b");
    expect(s.cards.map((c) => c.id)).toEqual(["b", "c"]);
    expect(startSession("d1", deck, T0, 99)).toBeNull();
  });
});

describe("lật thẻ", () => {
  it("lật sang mặt sau và khoá cho đến khi hiệu ứng xong", () => {
    const s = run(start(), { type: "flip" });
    expect(s.side).toBe("back");
    expect(s.locked).toBe(true);
    expect(run(s, { type: "settle" }).locked).toBe(false);
  });

  it("không đánh giá được khi chưa lật", () => {
    const s = start();
    expect(run(s, { type: "rate", verdict: "known", now: T0 })).toBe(s);
  });

  it("bấm đánh giá trong lúc thẻ đang lật bị bỏ qua", () => {
    const flipping = run(start(), { type: "flip" });
    expect(run(flipping, { type: "rate", verdict: "known", now: T0 })).toBe(flipping);
  });
});

describe("đánh giá và chuyển thẻ", () => {
  it("ghi kết quả, tăng tiến trình, thẻ kế mở ở mặt trước", () => {
    const s = answer(start(), "known");
    expect(s.results).toEqual({ a: "known" });
    expect(s.index).toBe(1);
    expect(currentCard(s)?.id).toBe("b");
    expect(s.side).toBe("front");
  });

  it("bấm đúp không nhảy cóc: cú thứ hai rơi vào lúc thẻ mới còn đang vào", () => {
    const flipped = run(start(), { type: "flip" }, { type: "settle" });
    const s = run(flipped, { type: "rate", verdict: "again", now: T0 }, { type: "rate", verdict: "known", now: T0 });
    expect(s.index).toBe(1);
    expect(s.results).toEqual({ a: "again" });
    // Lật đúp cũng vậy: lần lật thứ hai không làm gì.
    expect(run(s, { type: "settle" }, { type: "flip" }, { type: "flip" }).side).toBe("back");
  });
});

describe("kết thúc phiên", () => {
  it("thẻ cuối cùng đưa phiên sang trạng thái xong với tổng kết đúng", () => {
    let s = start();
    s = answer(s, "known");
    s = answer(s, "again");
    s = answer(s, "known", T0 + 95_000);
    expect(isDone(s)).toBe(true);
    expect(currentCard(s)).toBeNull();
    expect(s.locked).toBe(false);
    expect(summarize(s, T0 + 999_999)).toEqual({ total: 3, known: 2, again: 1, accuracy: 67, durationMs: 95_000 });
    expect(formatDuration(95_000)).toBe("1 phút 35 giây");
    expect(formatClock(95_000)).toBe("1:35");
    expect(formatDuration(42_000)).toBe("42 giây");
  });

  it("ôn lại chỉ các thẻ chưa nhớ, từ mặt trước, vòng mới", () => {
    let s = start();
    s = answer(s, "again");
    s = answer(s, "known");
    s = answer(s, "again", T0 + 10_000);
    const retry = run(s, { type: "retryMissed", now: T0 + 20_000 });
    expect(retry.cards.map((c) => c.id)).toEqual(["a", "c"]);
    expect(retry.round).toBe(2);
    expect(retry.side).toBe("front");
    expect(retry.results).toEqual({});
    expect(retry.startedAt).toBe(T0 + 20_000);
  });

  it("không có thẻ chưa nhớ thì không có vòng ôn lại; phiên dở cũng không", () => {
    let s = start([deck[0]]);
    s = answer(s, "known");
    expect(run(s, { type: "retryMissed", now: T0 })).toBe(s);
    const mid = answer(start(), "again");
    expect(run(mid, { type: "retryMissed", now: T0 })).toBe(mid);
  });
});

describe("phiên dở dang", () => {
  it("chỉ hỏi lưu khi đã học ít nhất một thẻ và chưa xong", () => {
    expect(shouldOfferSave(start())).toBe(false);
    expect(shouldOfferSave(answer(start(), "known"))).toBe(true);
    let s = start([deck[0]]);
    s = answer(s, "known");
    expect(shouldOfferSave(s)).toBe(false);
  });

  it("lưu rồi khôi phục đúng vị trí K, mặt trước, đồng hồ không tính thời gian nghỉ", () => {
    const s = answer(start(), "again");
    const saved = toSaved(s, T0 + 30_000);
    expect(saved).toMatchObject({ order: ["a", "b", "c"], index: 1, elapsedMs: 30_000 });
    const back = resumeSession(saved, deck, T0 + 3_600_000);
    expect(back && currentCard(back)?.id).toBe("b");
    expect(back?.side).toBe("front");
    expect(back?.results).toEqual({ a: "again" });
    expect(back?.startedAt).toBe(T0 + 3_600_000 - 30_000);
  });

  it("thẻ bị xoá trong lúc nghỉ rơi khỏi phiên, thẻ sửa hiện nội dung mới", () => {
    const saved = toSaved(answer(start(), "known"), T0);
    const edited = [{ ...deck[1], back: "anh/chị" }, deck[2]]; // "a" đã bị xoá
    const back = resumeSession(saved, edited, T0);
    expect(back?.index).toBe(0);
    expect(back?.results).toEqual({});
    expect(back && currentCard(back)?.back).toBe("anh/chị");
    expect(resumeSession(saved, [deck[0]], T0)).toBeNull(); // chỉ còn thẻ đã học
  });

  it("lưu phiên mới dọn phiên của bộ đã bị xoá, giữ bộ còn sống, thay phiên cũ của chính bộ đó", () => {
    const mk = (deckId: string, index: number) => ({ ...toSaved(answer(start(), "known"), T0), deckId, index });
    const all = { d1: mk("d1", 1), gone: mk("gone", 1), d2: mk("d2", 2) };
    const next = withSaved(all, mk("d1", 2), ["d1", "d2"]);
    expect(Object.keys(next).sort()).toEqual(["d1", "d2"]);
    expect(next.d1.index).toBe(2);
    // Bộ vừa lưu luôn được giữ, kể cả khi danh sách bộ đang có chưa kịp có nó.
    expect(Object.keys(withSaved(all, mk("d3", 1), []))).toEqual(["d3"]);
  });

  it("bản lưu hỏng hoặc sai hình dạng bị bỏ, mục tốt được giữ", () => {
    const good = toSaved(answer(start(), "known"), T0);
    const raw = JSON.stringify({ d1: good, d2: { deckId: "d2", order: [], index: 5 }, d3: { ...good, deckId: "khác" } });
    expect(Object.keys(parseSaved(raw))).toEqual(["d1"]);
    expect(parseSaved("{hỏng")).toEqual({});
    expect(parseSaved(null)).toEqual({});
  });
});

describe("phím tắt", () => {
  const k = (key: string, extra: Partial<{ repeat: boolean; modified: boolean; onControl: boolean }> = {}) =>
    ({ key, repeat: false, modified: false, onControl: false, ...extra });

  it("Space lật, không bao giờ tự chấm", () => {
    expect(studyKeyAction(k(" "), "front")).toBe("flip");
    expect(studyKeyAction(k(" "), "back")).toBeNull();
    expect(studyKeyAction(k(" ", { onControl: true }), "front")).toBeNull();
  });

  it("1/2 chỉ đánh giá sau khi lật; giữ phím không lặp", () => {
    expect(studyKeyAction(k("2"), "front")).toBeNull();
    expect(studyKeyAction(k("1"), "back")).toBe("again");
    expect(studyKeyAction(k("2"), "back")).toBe("known");
    expect(studyKeyAction(k("2", { repeat: true }), "back")).toBeNull();
    expect(studyKeyAction(k("Escape"), "back")).toBe("exit");
  });
});
