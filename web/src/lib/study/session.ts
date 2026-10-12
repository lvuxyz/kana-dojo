/* Phiên học tập trung (chủ động gợi nhớ) trên một bộ thẻ tự soạn: lần lượt từng thẻ, tự nhớ đáp án rồi lật để kiểm tra,
 * tự đánh giá "Chưa nhớ" / "Đã nhớ". Cuối phiên có tổng kết và vòng ôn lại riêng các thẻ chưa nhớ.
 *
 * Khác trang Ôn tập: phiên này KHÔNG chấm FSRS và không cộng XP/streak. Người học mở nó lúc nào cũng được, kể cả khi
 * thẻ chưa đến hạn — ghi những lượt đó vào lịch FSRS sẽ làm lịch ôn sai (ôn sớm bị tính như ôn đúng hạn).
 *
 * Toàn bộ là hàm thuần: thời gian đi vào qua sự kiện (`now`), không đọc đồng hồ, không đụng DOM hay localStorage. */

/** Một thẻ trong phiên — chỉ phần cần để hỏi–đáp, tách khỏi schema bộ thẻ. */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
}

export type Verdict = "known" | "again";
export type Side = "front" | "back";

export interface StudySession {
  deckId: string;
  /** Thứ tự thẻ của phiên, cố định suốt phiên. */
  cards: Flashcard[];
  /** Thẻ đang học, 0-based. `index === cards.length` là đã xong. */
  index: number;
  side: Side;
  /** true trong lúc thẻ đang lật hoặc đang chuyển sang thẻ kế: mọi thao tác lật/đánh giá bị bỏ qua.
   *  Khoá nằm trong reducer chứ không ở handler: React xếp hàng các lần dispatch, nên hai cú bấm trong cùng một tick
   *  vẫn được xử lý lần lượt — cú thứ hai thấy `locked` của cú thứ nhất. */
  locked: boolean;
  /** Kết quả theo mã thẻ — chỉ các thẻ đã đánh giá. */
  results: Record<string, Verdict>;
  /** Mốc bắt đầu (ms). Khi khôi phục phiên dở, lùi lại đúng bằng thời gian đã học để đồng hồ không tính phần nghỉ. */
  startedAt: number;
  finishedAt: number | null;
  /** 1 = lượt đầu, 2+ = các vòng "Ôn lại các thẻ chưa nhớ". */
  round: number;
}

export type StudyEvent =
  | { type: "flip" }
  /** Hiệu ứng lật/chuyển thẻ đã chạy xong — mở khoá. */
  | { type: "settle" }
  | { type: "rate"; verdict: Verdict; now: number }
  | { type: "retryMissed"; now: number };

/** `startAt`: bắt đầu từ thẻ này trong bộ ("Học từ thẻ này"); thẻ trước nó không vào phiên. */
export function startSession(deckId: string, cards: readonly Flashcard[], now: number, startAt = 0): StudySession | null {
  const from = Math.min(Math.max(0, Math.trunc(startAt)), cards.length);
  const picked = cards.slice(from).map(toFlashcard);
  if (picked.length === 0) return null;
  return { deckId, cards: picked, index: 0, side: "front", locked: false, results: {}, startedAt: now, finishedAt: null, round: 1 };
}

const toFlashcard = (c: Flashcard): Flashcard => ({ id: c.id, front: c.front, back: c.back, hint: c.hint });

export const isDone = (s: StudySession) => s.index >= s.cards.length;

/** Thẻ đang học, `null` khi đã xong — giao diện không bao giờ đọc `cards[index]` trần. */
export const currentCard = (s: StudySession): Flashcard | null => s.cards[s.index] ?? null;

export function studyReducer(s: StudySession, e: StudyEvent): StudySession {
  switch (e.type) {
    case "flip":
      if (s.locked || isDone(s) || s.side === "back") return s;
      return { ...s, side: "back", locked: true };

    case "settle":
      return s.locked ? { ...s, locked: false } : s;

    case "rate": {
      // Chỉ đánh giá được sau khi đã lật: không cho chấm "Đã nhớ" khi chưa tự kiểm tra đáp án.
      const card = currentCard(s);
      if (s.locked || !card || s.side !== "back") return s;
      const index = s.index + 1;
      const done = index >= s.cards.length;
      return {
        ...s,
        results: { ...s.results, [card.id]: e.verdict },
        index,
        // Thẻ kế luôn mở ở mặt trước. Khoá giữ đến hết hiệu ứng thẻ mới trượt vào; xong phiên thì không còn gì để khoá.
        side: "front",
        locked: !done,
        finishedAt: done ? e.now : null,
      };
    }

    case "retryMissed": {
      if (!isDone(s)) return s;
      const missed = s.cards.filter((c) => s.results[c.id] === "again");
      if (missed.length === 0) return s;
      return { ...s, cards: missed, index: 0, side: "front", locked: false, results: {}, startedAt: e.now, finishedAt: null, round: s.round + 1 };
    }
  }
}

export interface SessionSummary {
  total: number;
  known: number;
  again: number;
  /** 0–100, làm tròn. */
  accuracy: number;
  durationMs: number;
}

export function summarize(s: StudySession, now: number): SessionSummary {
  const verdicts = Object.values(s.results);
  const known = verdicts.filter((v) => v === "known").length;
  const again = verdicts.length - known;
  return {
    total: s.cards.length,
    known,
    again,
    accuracy: verdicts.length ? Math.round((known / verdicts.length) * 100) : 0,
    durationMs: Math.max(0, (s.finishedAt ?? now) - s.startedAt),
  };
}

/** "3 phút 05 giây", "42 giây". */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m > 0 ? `${m} phút ${String(sec).padStart(2, "0")} giây` : `${sec} giây`;
}

/** "1:35" — cho ô số lớn ở màn tổng kết. */
export function formatClock(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ nút "Học ngay"

export interface StudyCta {
  disabled: boolean;
  label: string;
  /** Hướng dẫn khi chưa học được. */
  hint: string | null;
}

export function studyCta(cardCount: number): StudyCta {
  if (cardCount <= 0) return { disabled: true, label: "Học ngay", hint: "Bộ thẻ còn trống — thêm ít nhất một thẻ để bắt đầu học." };
  return { disabled: false, label: `Học ngay (${cardCount} thẻ)`, hint: null };
}

// ------------------------------------------------------------------ phiên dở dang

/** Phần của phiên được lưu khi thoát giữa chừng: thứ tự theo mã thẻ (không chép nội dung thẻ — thẻ có thể được sửa
 *  trong lúc nghỉ), vị trí K và thời gian đã học. */
export interface SavedSession {
  deckId: string;
  order: string[];
  index: number;
  results: Record<string, Verdict>;
  elapsedMs: number;
  round: number;
}

/** Chỉ lưu khi đang dở: đã đánh giá ít nhất một thẻ và chưa xong. */
export function shouldOfferSave(s: StudySession): boolean {
  return s.index > 0 && !isDone(s);
}

export function toSaved(s: StudySession, now: number): SavedSession {
  return {
    deckId: s.deckId,
    order: s.cards.map((c) => c.id),
    index: s.index,
    results: { ...s.results },
    elapsedMs: Math.max(0, now - s.startedAt),
    round: s.round,
  };
}

/**
 * Dựng lại phiên từ bản đã lưu trên bộ thẻ HIỆN TẠI. Thẻ bị xoá trong lúc nghỉ thì rơi khỏi phiên (K lùi theo nếu thẻ đó
 * nằm trước K), thẻ được sửa thì hiện nội dung mới. `null` nếu không còn gì để học tiếp.
 */
export function resumeSession(saved: SavedSession, deckCards: readonly Flashcard[], now: number): StudySession | null {
  const byId = new Map(deckCards.map((c) => [c.id, c]));
  const cards: Flashcard[] = [];
  let index = 0;
  saved.order.forEach((id, i) => {
    const c = byId.get(id);
    if (!c) return;
    cards.push(toFlashcard(c));
    if (i < saved.index) index++;
  });
  if (index >= cards.length) return null;
  const results = Object.fromEntries(
    Object.entries(saved.results).filter(([id]) => cards.slice(0, index).some((c) => c.id === id)),
  );
  return {
    deckId: saved.deckId, cards, index, side: "front", locked: false, results,
    startedAt: now - saved.elapsedMs, finishedAt: null, round: saved.round,
  };
}

// ------------------------------------------------------------------ phím tắt

export type StudyKeyAction = "flip" | "again" | "known" | "exit" | null;

/** Space/Enter lật thẻ (không chấm: muốn ghi nhận thì phải chọn rõ ràng), 1 = Chưa nhớ, 2 = Đã nhớ, Esc = thoát.
 *  `onControl`: focus đang ở nút — Space/Enter để trình duyệt bấm chính nút đó. */
export function studyKeyAction(k: { key: string; repeat: boolean; modified: boolean; onControl: boolean }, side: Side): StudyKeyAction {
  if (k.modified) return null;
  if (k.key === "Escape") return "exit";
  if (k.repeat) return null;
  if (k.key === " " || k.key === "Enter") return !k.onControl && side === "front" ? "flip" : null;
  if (side !== "back") return null;
  if (k.key === "1") return "again";
  if (k.key === "2") return "known";
  return null;
}
