import { describe, expect, it } from "vitest";
import {
  addCards, addDeck, addNote, addText, addTexts, deckToTsv, deleteCard, deleteDeck, deleteNote, deleteText, parseCardLines,
  searchNotes, sortNotes, totalCards, updateCard, updateDeck, updateNote, updateText,
} from "./library";
import { LIMITS, SpaceError, emptySpace, parseSpace, type Env, type Space } from "./space";

const makeEnv = (now = 1_000): Env => {
  let n = 0;
  return { now, id: () => `id${String(++n).padStart(4, "0")}` };
};

function withDeck(): { space: Space; deckId: string; env: Env } {
  const env = makeEnv();
  const { space, deck } = addDeck(emptySpace(), "Từ của tôi", env);
  return { space, deckId: deck.id, env };
}

describe("ghi chú", () => {
  it("thêm: ghi chú mới đứng đầu, có dấu thời gian, cắt khoảng trắng tiêu đề", () => {
    const env = makeEnv(10);
    const a = addNote(emptySpace(), { title: "  Trợ từ は  ", body: "は đọc là wa" }, env);
    const b = addNote(a.space, { title: "Ngữ pháp" }, { ...env, now: 20 });
    expect(a.note).toMatchObject({ title: "Trợ từ は", createdAt: 10, updatedAt: 10, pinned: false });
    expect(b.space.library.notes.map((n) => n.title)).toEqual(["Ngữ pháp", "Trợ từ は"]);
  });

  it("sửa nội dung đổi updatedAt; ghim thì không (ghi chú không nhảy chỗ)", () => {
    const env = makeEnv(10);
    const { space, note } = addNote(emptySpace(), { title: "A", body: "x" }, env);
    const edited = updateNote(space, note.id, { body: "y" }, { ...env, now: 99 });
    expect(edited.library.notes[0]).toMatchObject({ body: "y", updatedAt: 99 });
    const pinned = updateNote(edited, note.id, { pinned: true }, { ...env, now: 500 });
    expect(pinned.library.notes[0]).toMatchObject({ pinned: true, updatedAt: 99 });
  });

  it("sửa ghi chú đã bị xoá: báo lỗi tiếng Việt thay vì im lặng", () => {
    expect(() => updateNote(emptySpace(), "nope", { body: "x" })).toThrow(SpaceError);
  });

  it("sắp xếp: ghim trước, rồi mới sửa gần nhất", () => {
    const env = makeEnv();
    let s = addNote(emptySpace(), { title: "cũ" }, { ...env, now: 1 }).space;
    s = addNote(s, { title: "mới" }, { ...env, now: 2 }).space;
    s = addNote(s, { title: "ghim", pinned: true }, { ...env, now: 0 }).space;
    expect(sortNotes(s.library.notes).map((n) => n.title)).toEqual(["ghim", "mới", "cũ"]);
  });

  it("tìm không phân biệt hoa/thường và dấu tiếng Việt, tìm cả nội dung", () => {
    const env = makeEnv();
    let s = addNote(emptySpace(), { title: "Động từ nhóm 1", body: "đuôi う" }, env).space;
    s = addNote(s, { title: "Số đếm", body: "ひとつ" }, env).space;
    expect(searchNotes(s.library.notes, "DONG TU").map((n) => n.title)).toEqual(["Động từ nhóm 1"]);
    expect(searchNotes(s.library.notes, "ひとつ")).toHaveLength(1);
    expect(searchNotes(s.library.notes, "")).toHaveLength(2);
  });

  it("xoá; chạm giới hạn số ghi chú thì từ chối, không đổi gì", () => {
    const env = makeEnv();
    const { space, note } = addNote(emptySpace(), { title: "A" }, env);
    expect(deleteNote(space, note.id).library.notes).toEqual([]);

    const full: Space = {
      ...emptySpace(),
      library: {
        ...emptySpace().library,
        notes: Array.from({ length: LIMITS.notes }, (_, i) => ({ id: `n${String(i).padStart(4, "0")}`, title: "", body: "", pinned: false, createdAt: 0, updatedAt: 0 })),
      },
    };
    expect(() => addNote(full, {}, env)).toThrow(/Tối đa/);
  });

  it("không cắt giữa một cặp surrogate khi tiêu đề dài quá giới hạn", () => {
    const title = "あ".repeat(LIMITS.noteTitle - 1) + "😀";
    const { note } = addNote(emptySpace(), { title }, makeEnv());
    expect(note.title).toBe("あ".repeat(LIMITS.noteTitle - 1));
  });
});

describe("bộ thẻ", () => {
  it("tạo bộ: bật sẵn, một chiều; tên trống bị từ chối", () => {
    const { space, deck } = addDeck(emptySpace(), "  Kanji N5 ", makeEnv());
    expect(deck).toMatchObject({ name: "Kanji N5", active: true, reverse: false, cards: [] });
    expect(space.library.decks).toHaveLength(1);
    expect(() => addDeck(emptySpace(), "   ", makeEnv())).toThrow(/trống/);
  });

  it("thêm thẻ: cấp mã duy nhất, đếm thẻ trống và thẻ trùng", () => {
    const { space, deckId, env } = withDeck();
    const r = addCards(space, deckId, [
      { front: "水", back: "nước", hint: "みず" },
      { front: "水", back: "nước" }, // trùng mặt trước + sau
      { front: "火", back: "" },     // thiếu mặt sau
      { front: "  ", back: "x" },    // thiếu mặt trước
      { front: "火", back: "lửa" },
    ], env);
    expect(r).toMatchObject({ added: 2, empty: 2, duplicate: 1 });
    const cards = r.space.library.decks[0].cards;
    expect(cards.map((c) => c.front)).toEqual(["水", "火"]);
    expect(new Set(cards.map((c) => c.id)).size).toBe(2);
  });

  it("thẻ trùng so với thẻ đã có trong bộ cũng bị bỏ qua", () => {
    const { space, deckId, env } = withDeck();
    const first = addCards(space, deckId, [{ front: "a", back: "b" }], env).space;
    expect(addCards(first, deckId, [{ front: "a", back: "b" }], env)).toMatchObject({ added: 0, duplicate: 1 });
  });

  it("vượt giới hạn tổng số thẻ: không thêm gì cả", () => {
    const { space, deckId, env } = withDeck();
    const drafts = Array.from({ length: LIMITS.cards + 1 }, (_, i) => ({ front: `f${i}`, back: `b${i}` }));
    expect(() => addCards(space, deckId, drafts, env)).toThrow(/Tối đa/);
    expect(totalCards(space)).toBe(0);
  });

  it("sửa và xoá thẻ; sửa thành thẻ thiếu mặt thì từ chối", () => {
    const { space, deckId, env } = withDeck();
    const s1 = addCards(space, deckId, [{ front: "a", back: "b" }], env).space;
    const id = s1.library.decks[0].cards[0].id;
    const s2 = updateCard(s1, deckId, id, { back: "c", hint: "gợi ý" });
    expect(s2.library.decks[0].cards[0]).toEqual({ id, front: "a", back: "c", hint: "gợi ý" });
    expect(() => updateCard(s2, deckId, id, { front: " " })).toThrow(SpaceError);
    expect(deleteCard(s2, deckId, id).library.decks[0].cards).toEqual([]);
  });

  it("tắt/bật, đổi chiều, đổi tên, xoá bộ", () => {
    const { space, deckId } = withDeck();
    const s = updateDeck(space, deckId, { active: false, reverse: true, name: "Mới" });
    expect(s.library.decks[0]).toMatchObject({ active: false, reverse: true, name: "Mới" });
    expect(() => updateDeck(s, deckId, { name: "" })).toThrow(SpaceError);
    expect(() => updateDeck(s, "nope", { active: true })).toThrow(SpaceError);
    expect(deleteDeck(s, deckId).library.decks).toEqual([]);
  });
});

describe("nhập / xuất thẻ dạng văn bản", () => {
  it("TAB (dán từ Excel/Anki), có cột gợi ý; bỏ dòng trống và dòng # của Anki", () => {
    const { drafts, ignored } = parseCardLines("#separator:tab\n水\tnước\tみず\r\n\n火\tlửa\n\nlinh tinh\n");
    expect(drafts).toEqual([
      { front: "水", back: "nước", hint: "みず" },
      { front: "火", back: "lửa", hint: "" },
    ]);
    expect(ignored).toBe(1);
  });

  it("nhận | và ; khi dòng không có tab; không tách dấu phẩy (nghĩa tiếng Việt hay có phẩy)", () => {
    const { drafts } = parseCardLines("木 | cây, gỗ\n山;núi\n川, sông");
    expect(drafts).toEqual([
      { front: "木", back: "cây, gỗ", hint: "" },
      { front: "山", back: "núi", hint: "" },
    ]);
  });

  it("xuất rồi nhập lại ra đúng bộ thẻ (kể cả mặt có xuống dòng bị gộp thành khoảng trắng)", () => {
    const { space, deckId, env } = withDeck();
    const s = addCards(space, deckId, [
      { front: "水", back: "nước", hint: "みず" },
      { front: "火", back: "lửa\nnóng" },
    ], env).space;
    const tsv = deckToTsv(s.library.decks[0]);
    expect(tsv).toBe("水\tnước\tみず\n火\tlửa nóng");
    const { drafts } = parseCardLines(tsv);
    expect(drafts.map((d) => [d.front, d.back, d.hint])).toEqual([["水", "nước", "みず"], ["火", "lửa nóng", ""]]);
  });
});

describe("câu luyện gõ", () => {
  it("nhận câu gõ được, kể cả kanji kèm cách đọc", () => {
    const { space, text } = addText(emptySpace(), { text: "  {水|みず}をください ", vi: "Cho tôi nước" }, makeEnv());
    expect(text).toMatchObject({ text: "{水|みず}をください", vi: "Cho tôi nước" });
    expect(space.library.texts).toHaveLength(1);
  });

  it("từ chối kanji trần, chữ Latin, câu trống — kèm lý do tiếng Việt", () => {
    for (const bad of ["水をください", "abc", "   ", "{水|mizu}"]) {
      expect(() => addText(emptySpace(), { text: bad }, makeEnv())).toThrow(SpaceError);
    }
    expect(() => addText(emptySpace(), { text: "水" }, makeEnv())).toThrow(/Kanji phải viết kèm cách đọc/);
  });

  it("sửa, xoá; sửa thành câu không gõ được thì giữ nguyên câu cũ", () => {
    const { space, text } = addText(emptySpace(), { text: "こんにちは" }, makeEnv());
    const edited = updateText(space, text.id, { vi: "Xin chào" });
    expect(edited.library.texts[0].vi).toBe("Xin chào");
    expect(() => updateText(edited, text.id, { text: "abc" })).toThrow(SpaceError);
    expect(deleteText(edited, text.id).library.texts).toEqual([]);
  });
});

describe("nhập nhiều câu luyện gõ", () => {
  it("thêm câu gõ được, bỏ câu trùng (với câu đã có và trong lượt), đếm câu hỏng; mã không trùng", () => {
    const env = makeEnv();
    const start = addText(emptySpace(), { text: "こんにちは" }, env).space;
    const r = addTexts(start, [{ text: "こんにちは" }, { text: " ありがとう ", vi: "Cảm ơn" }, { text: "ありがとう" }, { text: "水" }], env);
    expect(r).toMatchObject({ added: 1, duplicate: 2, invalid: 1 });
    expect(r.space.library.texts.map((t) => t.text)).toEqual(["こんにちは", "ありがとう"]);
    expect(new Set(r.space.library.texts.map((t) => t.id)).size).toBe(2);
  });

  it("vượt giới hạn số câu thì không thêm gì", () => {
    const many = Array.from({ length: LIMITS.texts + 1 }, (_, i) => ({ text: "あ".repeat(1 + (i % 100)) + "い".repeat(1 + Math.floor(i / 100)) }));
    expect(() => addTexts(emptySpace(), many, makeEnv())).toThrow(/Tối đa/);
  });
});

describe("toàn vẹn", () => {
  it("không gian đã soạn đủ thứ vẫn qua schema sau vòng JSON", () => {
    const env = makeEnv();
    let s = addNote(emptySpace(), { title: "A", body: "b" }, env).space;
    const d = addDeck(s, "Bộ", env);
    s = addCards(d.space, d.deck.id, [{ front: "水", back: "nước" }], env).space;
    s = addText(s, { text: "ありがとう", vi: "Cảm ơn" }, env).space;
    const r = parseSpace(JSON.stringify(s));
    expect(r.ok && r.space).toEqual(s);
  });

  it("mã của ghi chú, bộ thẻ, thẻ, câu gõ không bao giờ trùng nhau", () => {
    const env = makeEnv();
    let s = addNote(emptySpace(), {}, env).space;
    const d = addDeck(s, "B", env);
    s = addCards(d.space, d.deck.id, [{ front: "a", back: "b" }, { front: "c", back: "d" }], env).space;
    s = addText(s, { text: "あ" }, env).space;
    const ids = [...s.library.notes.map((n) => n.id), ...s.library.decks.flatMap((x) => [x.id, ...x.cards.map((c) => c.id)]), ...s.library.texts.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
