import { describe, expect, it } from "vitest";
import { cardKey, itemExists } from "./cards";
import { DEFAULT_CONTEXT, DEFAULT_STUDY, catalogFromDecks, type DeckLike, type LearnContext, type StudyOptions } from "./context";
import { buildQueue, gradeCard, summaryOf } from "./reviews";
import { emptyState } from "./state";
import type { Clock } from "./time";

const VN = "Asia/Ho_Chi_Minh";
const at = (iso: string): Clock => ({ now: Date.parse(iso), zone: VN });
const MON = at("2026-09-07T03:00:00Z");

const deck = (over: Partial<DeckLike> = {}): DeckLike => ({
  id: "deck1", active: true, reverse: false,
  cards: [
    { id: "c1", front: "水", back: "nước", hint: "みず" },
    { id: "c2", front: "火", back: "lửa", hint: "" },
    { id: "c3", front: "木", back: "cây", hint: "" },
  ],
  ...over,
});

const ctxOf = (decks: DeckLike[], study: Partial<StudyOptions> = {}): LearnContext => ({
  catalog: catalogFromDecks(decks),
  study: { ...DEFAULT_STUDY, ...study },
});

const keys = (q: { content: { cardKey: string }[] }) => q.content.map((c) => c.cardKey);

describe("catalog thẻ tự soạn", () => {
  it("chỉ gồm bộ đang bật, giữ thứ tự soạn", () => {
    const cat = catalogFromDecks([deck({ id: "a", cards: [{ id: "x1", front: "a", back: "b", hint: "" }] }), deck({ id: "b", active: false }), deck({ id: "c", cards: [{ id: "x2", front: "c", back: "d", hint: "" }] })]);
    expect(cat.order).toEqual(["x1", "x2"]);
    expect(cat.cards.get("x1")).toMatchObject({ deckId: "a", front: "a", back: "b", reverse: false });
    expect(cat.cards.has("c1")).toBe(false);
  });

  it("thẻ chiều ngược chỉ tồn tại khi bộ bật hỏi cả hai chiều", () => {
    const one = catalogFromDecks([deck()]);
    const both = catalogFromDecks([deck({ reverse: true })]);
    expect(itemExists("VOCAB_MEANING", "u:c1", one)).toBe(true);
    expect(itemExists("VOCAB_READING", "u:c1", one)).toBe(false);
    expect(itemExists("VOCAB_READING", "u:c1", both)).toBe(true);
    expect(itemExists("KANA_WRITING", "u:c1", both)).toBe(false);
    expect(itemExists("VOCAB_MEANING", "u:khong-co", both)).toBe(false);
  });
});

describe("hàng đợi với thẻ tự soạn", () => {
  it("mặc định ('mine'): thẻ của người học đứng trước nội dung đóng gói", () => {
    const q = buildQueue(emptyState(), { limit: 5 }, MON, ctxOf([deck()]));
    expect(keys(q)).toEqual([
      "VOCAB_MEANING:u:c1", "VOCAB_MEANING:u:c2", "VOCAB_MEANING:u:c3", "KANA_WRITING:あ", "KANA_WRITING:い",
    ]);
  });

  it("thẻ xuôi hỏi mặt trước, đáp mặt sau, gợi ý hiện kèm", () => {
    const [first] = buildQueue(emptyState(), { limit: 1 }, MON, ctxOf([deck()])).content;
    expect(first).toMatchObject({
      itemType: "VOCAB_MEANING", itemId: "u:c1", state: "NEW", word: "水", meaningVi: "nước", reading: "みず", character: null,
    });
  });

  it("thẻ ngược đổi chỗ hai mặt, gợi ý thành 'nghĩa' phụ", () => {
    const q = buildQueue(emptyState(), { limit: 2 }, MON, ctxOf([deck({ reverse: true })]));
    expect(keys(q)).toEqual(["VOCAB_MEANING:u:c1", "VOCAB_READING:u:c1"]);
    expect(q.content[1]).toMatchObject({ word: "nước", reading: "水", meaningVi: "みず" });
  });

  it("'builtin': nội dung đóng gói trước, thẻ tự soạn sau — y cách làm cũ", () => {
    const q = buildQueue(emptyState(), { limit: 5 }, MON, ctxOf([deck()], { newOrder: "builtin", newCardsPerDay: 5 }));
    expect(keys(q)).toEqual(["KANA_WRITING:あ", "KANA_WRITING:い", "KANA_WRITING:う", "KANA_WRITING:え", "KANA_WRITING:お"]);
  });

  it("'mixed': xen kẽ từng nguồn thay vì dồn hết một nguồn", () => {
    const q = buildQueue(emptyState(), { limit: 6 }, MON, ctxOf([deck()], { newOrder: "mixed", newCardsPerDay: 6 }));
    expect(keys(q)).toEqual([
      "VOCAB_MEANING:u:c1", "KANA_WRITING:あ", "KANA_READING:あ", "VOCAB_MEANING:1", "VOCAB_READING:1", "VOCAB_MEANING:u:c2",
    ].filter(Boolean));
  });

  it("'mixed' khi một nguồn cạn: các nguồn còn lại tiếp tục lấp chỗ", () => {
    const small = deck({ cards: [{ id: "c1", front: "a", back: "b", hint: "" }] });
    const q = buildQueue(emptyState(), { limit: 5 }, MON, ctxOf([small], { newOrder: "mixed", newCardsPerDay: 5, kanaReading: false, vocab: false }));
    expect(keys(q)).toEqual(["VOCAB_MEANING:u:c1", "KANA_WRITING:あ", "KANA_WRITING:い", "KANA_WRITING:う", "KANA_WRITING:え"]);
  });

  it("thẻ tự soạn đến hạn xếp theo độ trễ như mọi thẻ khác, và ôn xong thì lịch được lưu", () => {
    const ctx = ctxOf([deck()]);
    let s = emptyState();
    s = gradeCard(s, "VOCAB_MEANING:u:c1", 3, 0, MON, ctx).state;
    expect(s.cards["VOCAB_MEANING:u:c1"]).toMatchObject({ itemType: "VOCAB_MEANING", itemId: "u:c1", reps: 1 });
    const next = buildQueue(s, { limit: 50 }, at("2026-09-09T03:00:00Z"), ctx);
    expect(next.dueCount).toBe(1);
    expect(next.content[0]).toMatchObject({ cardKey: "VOCAB_MEANING:u:c1", word: "水" });
  });

  it("chấm thẻ không còn trong catalog (đã xoá, bộ đã tắt) thì báo lỗi như thẻ không tồn tại", () => {
    expect(() => gradeCard(emptyState(), "VOCAB_MEANING:u:c1", 3, 0, MON, DEFAULT_CONTEXT)).toThrow(/Không tìm thấy thẻ/);
    expect(() => gradeCard(emptyState(), "VOCAB_MEANING:u:c1", 3, 0, MON, ctxOf([deck({ active: false })]))).toThrow();
  });

  it("xoá thẻ rồi: lịch ôn còn trong tiến độ nhưng không vào hàng đợi, không đếm là đến hạn", () => {
    let s = gradeCard(emptyState(), "VOCAB_MEANING:u:c1", 3, 0, MON, ctxOf([deck()])).state;
    const later = at("2026-09-20T03:00:00Z");
    const without = ctxOf([deck({ cards: deck().cards.slice(1) })]);
    expect(buildQueue(s, { limit: 50 }, later, without).content.some((c) => c.cardKey === "VOCAB_MEANING:u:c1")).toBe(false);
    expect(summaryOf(s, later, without).dueToday).toBe(0);
    expect(s.cards["VOCAB_MEANING:u:c1"]).toBeDefined();
    // Dữ liệu còn đó: bật lại bộ thì thẻ quay lại đúng lịch cũ.
    s = structuredClone(s);
    expect(summaryOf(s, later, ctxOf([deck()])).dueToday).toBe(1);
  });
});

describe("cách học do người dùng chọn", () => {
  it("hạn mức thẻ mới: chọn số khác 10, và 0 nghĩa là chỉ ôn", () => {
    expect(buildQueue(emptyState(), { limit: 50 }, MON, ctxOf([], { newCardsPerDay: 3 })).newCount).toBe(3);
    expect(buildQueue(emptyState(), { limit: 50 }, MON, ctxOf([], { newCardsPerDay: 0 })).newCount).toBe(0);
    expect(buildQueue(emptyState(), { limit: 100 }, MON, ctxOf([], { newCardsPerDay: 40 })).newCount).toBe(40);
  });

  it("hạn mức là chung cho mọi nguồn: thẻ vừa học hôm nay trừ vào hạn mức", () => {
    const ctx = ctxOf([deck()], { newCardsPerDay: 4 });
    let s = emptyState();
    for (const c of buildQueue(s, { limit: 2 }, MON, ctx).content) s = gradeCard(s, c.cardKey, 3, 0, MON, ctx).state;
    expect(buildQueue(s, { limit: 50 }, MON, ctx).newCount).toBe(2);
  });

  it("tắt nguồn thẻ: không vào hàng đợi, kể cả thẻ đã học đến hạn; lịch đã lưu vẫn giữ", () => {
    let s = emptyState();
    s = gradeCard(s, cardKey("KANA_WRITING", "あ"), 3, 0, MON).state;
    const later = at("2026-09-20T03:00:00Z");
    expect(buildQueue(s, { limit: 50 }, later).dueCount).toBeGreaterThan(0);

    const off = ctxOf([], { kanaWriting: false });
    const q = buildQueue(s, { limit: 50 }, later, off);
    expect(q.content.some((c) => c.itemType === "KANA_WRITING")).toBe(false);
    expect(summaryOf(s, later, off).dueToday).toBe(0);
    expect(s.cards["KANA_WRITING:あ"]).toBeDefined();
  });

  it("chỉ học tay của riêng tôi: tắt hết kana và từ vựng", () => {
    const ctx = ctxOf([deck()], { kanaWriting: false, kanaReading: false, vocab: false });
    const q = buildQueue(emptyState(), { limit: 50 }, MON, ctx);
    expect(keys(q)).toEqual(["VOCAB_MEANING:u:c1", "VOCAB_MEANING:u:c2", "VOCAB_MEANING:u:c3"]);
  });

  it("tắt thẻ tự soạn (decks=false) thì bộ thẻ nằm yên", () => {
    const q = buildQueue(emptyState(), { limit: 50 }, MON, ctxOf([deck()], { decks: false, newCardsPerDay: 100 }));
    expect(keys(q).some((k) => k.includes("u:"))).toBe(false);
  });

  it("phạm vi kana: chỉ katakana, hoặc chỉ nhóm cơ bản", () => {
    const kata = buildQueue(emptyState(), { limit: 5 }, MON, ctxOf([], { kanaScripts: ["k"], kanaReading: false }));
    expect(kata.content.map((c) => c.character)).toEqual(["ア", "イ", "ウ", "エ", "オ"]);

    const basicOnly = buildQueue(emptyState(), { limit: 100 }, MON, ctxOf([], { kanaGroups: ["basic"], newCardsPerDay: 100, vocab: false, kanaReading: false }));
    expect(basicOnly.newCount).toBe(92); // 46 hiragana + 46 katakana cơ bản
  });

  it("độ dày lịch ôn: retention cao hơn thì hẹn ôn sớm hơn", () => {
    const high = gradeCard(emptyState(), "KANA_WRITING:あ", 4, 0, MON, ctxOf([], { desiredRetention: 0.97 })).result;
    const low = gradeCard(emptyState(), "KANA_WRITING:あ", 4, 0, MON, ctxOf([], { desiredRetention: 0.7 })).result;
    const def = gradeCard(emptyState(), "KANA_WRITING:あ", 4, 0, MON).result;
    expect(high.nextDueAt).toBeLessThanOrEqual(def.nextDueAt);
    expect(def.nextDueAt).toBeLessThanOrEqual(low.nextDueAt);
    expect(high.nextDueAt).toBeLessThan(low.nextDueAt);
  });

  it("opts.types vẫn lọc thêm một lớp nữa trên cách học (không phá hành vi cũ)", () => {
    const q = buildQueue(emptyState(), { limit: 3, types: ["VOCAB_MEANING"] }, MON, ctxOf([deck()]));
    expect(keys(q)).toEqual(["VOCAB_MEANING:u:c1", "VOCAB_MEANING:u:c2", "VOCAB_MEANING:u:c3"]);
  });
});

describe("mặc định không đổi", () => {
  it("DEFAULT_CONTEXT cho hàng đợi y hệt khi không truyền ngữ cảnh", () => {
    const a = buildQueue(emptyState(), { limit: 25 }, MON);
    const b = buildQueue(emptyState(), { limit: 25 }, MON, DEFAULT_CONTEXT);
    expect(a).toEqual(b);
  });
});
