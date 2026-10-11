import { fold } from "../vocabulary";
import { validateTypingText } from "../typing/phrases";
import {
  LIMITS, SpaceError, freshId, systemEnv, type Deck, type DeckCard, type Env, type Note, type Space, type UserText,
} from "./space";

/* Thư viện của người học: ghi chú (tài liệu), bộ thẻ và câu luyện gõ. Hàm thuần như space.ts — mỗi thao tác trả
   Space mới, hoặc ném SpaceError với thông báo tiếng Việt (khi đó Space cũ không bị đụng tới). */

/** Cắt theo độ dài nhưng không bao giờ để lại nửa cặp surrogate (emoji, kanji hiếm) ở cuối. */
const clip = (s: string, max: number): string => {
  if (s.length <= max) return s;
  const t = s.slice(0, max);
  return /[\ud800-\udbff]$/.test(t) ? t.slice(0, -1) : t;
};

const withLibrary = (space: Space, patch: Partial<Space["library"]>): Space =>
  ({ ...space, library: { ...space.library, ...patch } });

// ------------------------------------------------------------------ ghi chú

export interface NoteDraft { title?: string; body?: string; pinned?: boolean }

export function addNote(space: Space, draft: NoteDraft = {}, env: Env = systemEnv()): { space: Space; note: Note } {
  if (space.library.notes.length >= LIMITS.notes) throw new SpaceError(`Tối đa ${LIMITS.notes} ghi chú — hãy xoá bớt những ghi chú không cần.`);
  const note: Note = {
    id: freshId(space, env),
    title: clip((draft.title ?? "").trim(), LIMITS.noteTitle),
    body: clip(draft.body ?? "", LIMITS.noteBody),
    pinned: draft.pinned ?? false,
    createdAt: env.now,
    updatedAt: env.now,
  };
  return { space: withLibrary(space, { notes: [note, ...space.library.notes] }), note };
}

export function updateNote(space: Space, id: string, patch: NoteDraft, env: Env = systemEnv()): Space {
  const current = space.library.notes.find((n) => n.id === id);
  if (!current) throw new SpaceError("Không tìm thấy ghi chú này (có thể đã bị xoá ở tab khác).");
  const title = patch.title === undefined ? current.title : clip(patch.title.trim(), LIMITS.noteTitle);
  const body = patch.body === undefined ? current.body : clip(patch.body, LIMITS.noteBody);
  const edited = title !== current.title || body !== current.body;
  const next: Note = { ...current, title, body, pinned: patch.pinned ?? current.pinned, updatedAt: edited ? env.now : current.updatedAt };
  return withLibrary(space, { notes: space.library.notes.map((n) => (n.id === id ? next : n)) });
}

export const deleteNote = (space: Space, id: string): Space =>
  withLibrary(space, { notes: space.library.notes.filter((n) => n.id !== id) });

/** Ghim lên đầu, rồi mới sửa gần nhất. Ghim/bỏ ghim không đổi `updatedAt` nên không làm ghi chú nhảy chỗ. */
export const sortNotes = (notes: readonly Note[]): Note[] =>
  [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);

/** Tìm trong tiêu đề và nội dung, không phân biệt hoa/thường và dấu tiếng Việt. */
export function searchNotes(notes: readonly Note[], query: string): Note[] {
  const needle = fold(query.trim());
  const list = sortNotes(notes);
  return needle ? list.filter((n) => fold(`${n.title}\n${n.body}`).includes(needle)) : list;
}

// ------------------------------------------------------------------ bộ thẻ

const cleanName = (name: string): string => {
  const n = clip(name.trim(), LIMITS.deckName);
  if (!n) throw new SpaceError("Tên bộ thẻ đang trống.");
  return n;
};

export function addDeck(space: Space, name: string, env: Env = systemEnv()): { space: Space; deck: Deck } {
  if (space.library.decks.length >= LIMITS.decks) throw new SpaceError(`Tối đa ${LIMITS.decks} bộ thẻ.`);
  const deck: Deck = { id: freshId(space, env), name: cleanName(name), active: true, reverse: false, createdAt: env.now, cards: [] };
  return { space: withLibrary(space, { decks: [...space.library.decks, deck] }), deck };
}

export function updateDeck(
  space: Space, id: string, patch: Partial<Pick<Deck, "name" | "active" | "reverse">>,
): Space {
  if (!space.library.decks.some((d) => d.id === id)) throw new SpaceError("Không tìm thấy bộ thẻ này.");
  const decks = space.library.decks.map((d) =>
    d.id !== id ? d : { ...d, name: patch.name === undefined ? d.name : cleanName(patch.name), active: patch.active ?? d.active, reverse: patch.reverse ?? d.reverse },
  );
  return withLibrary(space, { decks });
}

export const deleteDeck = (space: Space, id: string): Space =>
  withLibrary(space, { decks: space.library.decks.filter((d) => d.id !== id) });

export const totalCards = (space: Space): number => space.library.decks.reduce((n, d) => n + d.cards.length, 0);

export interface CardDraft { front: string; back: string; hint?: string }

function cleanCard(d: CardDraft): Pick<DeckCard, "front" | "back" | "hint"> | null {
  const front = clip(d.front.trim(), LIMITS.cardFront);
  const back = clip(d.back.trim(), LIMITS.cardBack);
  if (!front || !back) return null;
  return { front, back, hint: clip((d.hint ?? "").trim(), LIMITS.cardHint) };
}

export interface AddCardsResult { space: Space; added: number; empty: number; duplicate: number }

/** Thêm một loạt thẻ vào bộ. Thẻ thiếu mặt trước/sau hoặc trùng (cùng mặt trước và sau) bị bỏ qua và được đếm lại;
 *  vượt giới hạn tổng số thẻ thì không thêm gì cả — tránh nhập dở dang một nửa danh sách. */
export function addCards(space: Space, deckId: string, drafts: readonly CardDraft[], env: Env = systemEnv()): AddCardsResult {
  const deck = space.library.decks.find((d) => d.id === deckId);
  if (!deck) throw new SpaceError("Không tìm thấy bộ thẻ này.");

  const seen = new Set(deck.cards.map((c) => `${c.front}\u0000${c.back}`));
  let empty = 0;
  let duplicate = 0;
  const fresh: Pick<DeckCard, "front" | "back" | "hint">[] = [];
  for (const d of drafts) {
    const c = cleanCard(d);
    if (!c) { empty++; continue; }
    const key = `${c.front}\u0000${c.back}`;
    if (seen.has(key)) { duplicate++; continue; }
    seen.add(key);
    fresh.push(c);
  }
  if (totalCards(space) + fresh.length > LIMITS.cards) {
    throw new SpaceError(`Tối đa ${LIMITS.cards} thẻ trên mọi bộ (hiện có ${totalCards(space)}, định thêm ${fresh.length}).`);
  }

  // Mã được cấp lần lượt: mỗi thẻ mới phải tránh cả những thẻ vừa cấp trong cùng lượt.
  let working = space;
  const cards: DeckCard[] = [];
  for (const c of fresh) {
    const id = freshId(working, env);
    cards.push({ id, ...c });
    working = withLibrary(working, {
      decks: working.library.decks.map((d) => (d.id === deckId ? { ...d, cards: [...d.cards, { id, ...c }] } : d)),
    });
  }
  return { space: working, added: cards.length, empty, duplicate };
}

export function updateCard(space: Space, deckId: string, cardId: string, patch: Partial<CardDraft>): Space {
  const deck = space.library.decks.find((d) => d.id === deckId);
  const card = deck?.cards.find((c) => c.id === cardId);
  if (!deck || !card) throw new SpaceError("Không tìm thấy thẻ này.");
  const next = cleanCard({ front: patch.front ?? card.front, back: patch.back ?? card.back, hint: patch.hint ?? card.hint });
  if (!next) throw new SpaceError("Thẻ cần có cả mặt trước và mặt sau.");
  return withLibrary(space, {
    decks: space.library.decks.map((d) =>
      d.id !== deckId ? d : { ...d, cards: d.cards.map((c) => (c.id === cardId ? { id: cardId, ...next } : c)) }),
  });
}

export const deleteCard = (space: Space, deckId: string, cardId: string): Space =>
  withLibrary(space, {
    decks: space.library.decks.map((d) => (d.id !== deckId ? d : { ...d, cards: d.cards.filter((c) => c.id !== cardId) })),
  });

// ------------------------------------------------------------------ nhập / xuất thẻ dạng văn bản

/**
 * Đọc thẻ từ văn bản dán vào: mỗi dòng một thẻ, các mặt cách nhau bằng TAB (dán từ Excel/Google Sheets/Anki),
 * hoặc dấu `|`, hoặc `;` nếu dòng không có tab. Cột 1 = mặt trước, cột 2 = mặt sau, cột 3 (tuỳ chọn) = gợi ý.
 * Dòng trống và dòng bắt đầu bằng `#` (tiêu đề tệp xuất của Anki) được bỏ qua; dòng không tách được hai mặt được đếm vào `ignored`.
 */
export function parseCardLines(input: string): { drafts: CardDraft[]; ignored: number } {
  const drafts: CardDraft[] = [];
  let ignored = 0;
  for (const raw of input.split(/\r\n|\r|\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = ["\t", "|", ";"].find((s) => raw.includes(s));
    const cols = sep ? raw.split(sep).map((c) => c.trim()) : [];
    if (cols.length < 2 || !cols[0] || !cols[1]) { ignored++; continue; }
    drafts.push({ front: cols[0], back: cols[1], hint: cols[2] ?? "" });
  }
  return { drafts, ignored };
}

const oneLine = (s: string) => s.replace(/[\t\r\n]+/g, " ");

/** Bộ thẻ dưới dạng văn bản TAB — dán lại được vào chính ô nhập, Excel hoặc Anki. */
export const deckToTsv = (deck: Pick<Deck, "cards">): string =>
  deck.cards.map((c) => [c.front, c.back, c.hint].map(oneLine).join("\t").replace(/\t+$/, "")).join("\n");

// ------------------------------------------------------------------ câu luyện gõ

export function addText(space: Space, draft: { text: string; vi?: string }, env: Env = systemEnv()): { space: Space; text: UserText } {
  if (space.library.texts.length >= LIMITS.texts) throw new SpaceError(`Tối đa ${LIMITS.texts} câu luyện gõ.`);
  const reason = validateTypingText(draft.text);
  if (reason) throw new SpaceError(reason);
  const text: UserText = {
    id: freshId(space, env),
    text: clip(draft.text.trim(), LIMITS.text),
    vi: clip((draft.vi ?? "").trim(), LIMITS.textVi),
  };
  return { space: withLibrary(space, { texts: [...space.library.texts, text] }), text };
}

export interface AddTextsResult { space: Space; added: number; duplicate: number; invalid: number }

/** Nhập nhiều câu một lượt (từ văn bản dán vào hoặc tệp). Câu trùng với câu đã có bị bỏ qua, câu không gõ được bị đếm riêng. */
export function addTexts(space: Space, drafts: readonly { text: string; vi?: string }[], env: Env = systemEnv()): AddTextsResult {
  const seen = new Set(space.library.texts.map((t) => t.text));
  let duplicate = 0;
  let invalid = 0;
  const fresh: { text: string; vi: string }[] = [];
  for (const d of drafts) {
    const text = clip(d.text.trim(), LIMITS.text);
    if (validateTypingText(text)) { invalid++; continue; }
    if (seen.has(text)) { duplicate++; continue; }
    seen.add(text);
    fresh.push({ text, vi: clip((d.vi ?? "").trim(), LIMITS.textVi) });
  }
  const have = space.library.texts.length;
  if (have + fresh.length > LIMITS.texts) {
    throw new SpaceError(`Tối đa ${LIMITS.texts} câu luyện gõ (hiện có ${have}, định thêm ${fresh.length}).`);
  }

  // Mã được cấp lần lượt: mỗi câu mới phải tránh cả những câu vừa cấp trong cùng lượt.
  let working = space;
  for (const t of fresh) {
    const id = freshId(working, env);
    working = withLibrary(working, { texts: [...working.library.texts, { id, ...t }] });
  }
  return { space: working, added: fresh.length, duplicate, invalid };
}

export function updateText(space: Space, id: string, patch: { text?: string; vi?: string }): Space {
  const current = space.library.texts.find((t) => t.id === id);
  if (!current) throw new SpaceError("Không tìm thấy câu này.");
  const src = patch.text ?? current.text;
  const reason = validateTypingText(src);
  if (reason) throw new SpaceError(reason);
  const next: UserText = { id, text: clip(src.trim(), LIMITS.text), vi: clip((patch.vi ?? current.vi).trim(), LIMITS.textVi) };
  return withLibrary(space, { texts: space.library.texts.map((t) => (t.id === id ? next : t)) });
}

export const deleteText = (space: Space, id: string): Space =>
  withLibrary(space, { texts: space.library.texts.filter((t) => t.id !== id) });
