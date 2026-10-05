import { DEFAULT_DESIRED_RETENTION } from "../fsrs";
import type { KanaGroup, Script } from "../kana";

/* "Ngữ cảnh học": hai thứ bộ máy học cần biết ngoài tiến độ — người học muốn học THẾ NÀO (StudyOptions) và
   học CÁI GÌ ngoài nội dung đóng gói (Catalog: thẻ do chính họ soạn).
   Cả hai do người học quyết định và nằm trong "không gian riêng" (lib/space), nhưng file này không import gì từ đó:
   bộ máy học vẫn là hàm thuần nhận dữ liệu qua tham số. Không truyền gì thì dùng DEFAULT_CONTEXT, chạy y như trước. */

/** Thứ tự cấp thẻ MỚI: thẻ tự soạn trước, nội dung đóng gói trước, hoặc xen kẽ từng nguồn. */
export type NewOrder = "mine" | "builtin" | "mixed";

export interface StudyOptions {
  /** Số thẻ mới tối đa mỗi ngày; 0 = chỉ ôn lại thẻ đã học. */
  newCardsPerDay: number;
  /** Số thẻ tối đa mỗi phiên ôn tập. */
  sessionSize: number;
  /** Xác suất nhớ mục tiêu lúc đến hạn ôn (FSRS). Cao hơn = ôn dày hơn. */
  desiredRetention: number;
  /** Nguồn thẻ: ôn viết kana, ôn đọc kana, từ vựng đóng gói, thẻ tự soạn. Tắt nguồn nào thì thẻ của nguồn đó
   *  không vào hàng đợi (lịch ôn đã lưu vẫn giữ nguyên, bật lại là tiếp tục). */
  kanaWriting: boolean;
  kanaReading: boolean;
  vocab: boolean;
  decks: boolean;
  /** Phạm vi kana được ôn (áp cho cả hai loại thẻ kana). */
  kanaScripts: readonly Script[];
  kanaGroups: readonly KanaGroup[];
  newOrder: NewOrder;
}

export const NEW_CARDS_PER_DAY = 10;
export const SESSION_SIZE = 30;

export const STUDY_LIMITS = {
  newCardsPerDay: { min: 0, max: 100 },
  sessionSize: { min: 5, max: 100 },
  desiredRetention: { min: 0.7, max: 0.97 },
} as const;

export const ALL_SCRIPTS: readonly Script[] = ["h", "k"];
export const ALL_GROUPS: readonly KanaGroup[] = ["basic", "dakuten", "yoon"];

export const DEFAULT_STUDY: StudyOptions = {
  newCardsPerDay: NEW_CARDS_PER_DAY,
  sessionSize: SESSION_SIZE,
  desiredRetention: DEFAULT_DESIRED_RETENTION,
  kanaWriting: true,
  kanaReading: true,
  vocab: true,
  decks: true,
  kanaScripts: ALL_SCRIPTS,
  kanaGroups: ALL_GROUPS,
  newOrder: "mine",
};

// ------------------------------------------------------------------ thẻ tự soạn

/** Thẻ tự soạn trong ngữ cảnh học: mặt trước hỏi, mặt sau là đáp án, `hint` hiện kèm khi lật. */
export interface UserCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string;
  /** Bộ thẻ có hỏi cả chiều ngược (mặt sau → mặt trước) không. */
  reverse: boolean;
}

/** Hình dạng tối thiểu của một bộ thẻ mà catalog cần (lib/space có hình dạng đầy đủ hơn). */
export interface DeckLike {
  id: string;
  active: boolean;
  reverse: boolean;
  cards: readonly { id: string; front: string; back: string; hint: string }[];
}

export interface Catalog {
  cards: ReadonlyMap<string, UserCard>;
  /** Mã thẻ theo thứ tự soạn (bộ này rồi tới bộ kia) — thứ tự cấp thẻ mới. */
  order: readonly string[];
}

export const EMPTY_CATALOG: Catalog = { cards: new Map(), order: [] };

/** Chỉ tính các bộ đang bật. Bộ tắt giống như không tồn tại với hàng đợi, nhưng lịch ôn của thẻ vẫn nằm trong tiến độ. */
export function catalogFromDecks(decks: readonly DeckLike[]): Catalog {
  const cards = new Map<string, UserCard>();
  const order: string[] = [];
  for (const d of decks) {
    if (!d.active) continue;
    for (const c of d.cards) {
      if (cards.has(c.id)) continue;
      cards.set(c.id, { id: c.id, deckId: d.id, front: c.front, back: c.back, hint: c.hint, reverse: d.reverse });
      order.push(c.id);
    }
  }
  return { cards, order };
}

export interface LearnContext {
  catalog: Catalog;
  study: StudyOptions;
}

export const DEFAULT_CONTEXT: LearnContext = { catalog: EMPTY_CATALOG, study: DEFAULT_STUDY };

// ------------------------------------------------------------------ mã mục của thẻ tự soạn

/* Thẻ tự soạn đi vào tiến độ bằng các loại thẻ SẴN CÓ, nên tệp tiến độ (ProgressState v1) không đổi hình dạng:
     VOCAB_MEANING:u:<mã thẻ>   mặt trước → mặt sau
     VOCAB_READING:u:<mã thẻ>   mặt sau → mặt trước (chỉ khi bộ thẻ bật "hỏi cả hai chiều")
   Tiền tố `u:` không bao giờ trùng id từ vựng đóng gói (số nguyên). Bản cũ không biết bộ thẻ của bạn sẽ coi những mục
   này là "nội dung đã gỡ" và bỏ qua (cơ chế vốn có của itemExists), không báo lỗi tệp. */

const USER_PREFIX = "u:";

export const userItemId = (cardId: string) => `${USER_PREFIX}${cardId}`;
export const isUserItem = (itemId: string) => itemId.startsWith(USER_PREFIX);
export const userCardIdOf = (itemId: string) => itemId.slice(USER_PREFIX.length);
