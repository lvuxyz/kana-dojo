import { z } from "zod";
import {
  ALL_GROUPS, ALL_SCRIPTS, DEFAULT_STUDY, STUDY_LIMITS, catalogFromDecks, type LearnContext, type StudyOptions,
} from "../learning/context";

/* "Không gian riêng" của một người học: mọi thứ do CHÍNH HỌ quyết định — công cụ nào hiện ra, tài liệu và bộ thẻ họ tự
   soạn, câu luyện gõ của họ, cách học (hạn mức, độ dày lịch ôn, nguồn thẻ), tên và mục đích học.
   Cố ý KHÔNG có màu giao diện tuỳ chọn: màu đỏ (--shu) của site mang nghĩa "sai / xoá / cảnh báo" (thông báo lỗi, nút
   "Quên rồi", nút xoá), đổi nó thành màu khác sẽ làm lỗi trông như thông tin bình thường.
   Tách khỏi ProgressState (tiến độ học) vì hai thứ đổi với nhịp khác nhau và vì tệp tiến độ là hợp đồng web ↔ mobile
   (docs/CONTRACT.md §2) — thêm tài liệu của người dùng vào đó sẽ buộc đổi hợp đồng. Hai thứ gặp nhau ở tệp sao lưu (lib/backup.ts).
   Mọi thao tác ở đây là hàm thuần: nhận Space cũ, trả Space mới (hoặc ném SpaceError, khi đó không có gì đổi). */

export const SPACE_VERSION = 1;

// ------------------------------------------------------------------ giới hạn

/** Giới hạn cứng để không gian luôn vừa localStorage (~5 MB) và nạp nhanh. Nới ra là đổi con số ở đây. */
export const LIMITS = {
  name: 40,
  goal: 200,
  noteTitle: 120,
  noteBody: 20_000,
  notes: 500,
  deckName: 60,
  decks: 50,
  cardFront: 200,
  cardBack: 400,
  cardHint: 200,
  /** Tổng số thẻ trên mọi bộ. */
  cards: 5_000,
  text: 200,
  textVi: 200,
  texts: 500,
} as const;

export class SpaceError extends Error {}

// ------------------------------------------------------------------ mô-đun, widget

/** Các công cụ người học có thể bật/tắt và sắp xếp. `home` và `settings` luôn có: tắt hết thì không còn đường quay lại. */
export const MODULE_IDS = ["home", "review", "writing", "library", "typing", "vocab", "quiz", "settings"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];
export const LOCKED_MODULES: readonly ModuleId[] = ["home", "settings"];

export const WIDGET_IDS = ["today", "stats", "goal", "heatmap", "badges", "notes"] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

const dedupe = <T>(list: readonly T[]): T[] => [...new Set(list)];

/** Bỏ trùng; `home` luôn đứng đầu và `settings` luôn đứng cuối — hai điểm neo của điều hướng. */
export function normalizeModules(list: readonly ModuleId[]): ModuleId[] {
  const middle = dedupe(list).filter((m) => !LOCKED_MODULES.includes(m));
  return ["home", ...middle, "settings"];
}

// ------------------------------------------------------------------ schema

const id = z.string().regex(/^[a-z0-9]{4,24}$/);
const ms = z.number().int().min(0);

const noteSchema = z.object({
  id,
  title: z.string().max(LIMITS.noteTitle),
  body: z.string().max(LIMITS.noteBody),
  pinned: z.boolean(),
  createdAt: ms,
  updatedAt: ms,
});

const deckCardSchema = z.object({
  id,
  front: z.string().min(1).max(LIMITS.cardFront),
  back: z.string().min(1).max(LIMITS.cardBack),
  hint: z.string().max(LIMITS.cardHint),
});

const deckSchema = z.object({
  id,
  name: z.string().min(1).max(LIMITS.deckName),
  /** Bộ tắt không vào hàng đợi ôn; thẻ và lịch ôn của nó vẫn được giữ. */
  active: z.boolean(),
  /** Hỏi cả chiều ngược (mặt sau → mặt trước). */
  reverse: z.boolean(),
  createdAt: ms,
  cards: z.array(deckCardSchema).max(LIMITS.cards),
});

const textSchema = z.object({
  id,
  /** Cú pháp luyện gõ: kanji kèm cách đọc viết {漢字|かんじ}. */
  text: z.string().min(1).max(LIMITS.text),
  vi: z.string().max(LIMITS.textVi),
});

const studySchema = z.object({
  newCardsPerDay: z.number().int().min(STUDY_LIMITS.newCardsPerDay.min).max(STUDY_LIMITS.newCardsPerDay.max),
  sessionSize: z.number().int().min(STUDY_LIMITS.sessionSize.min).max(STUDY_LIMITS.sessionSize.max),
  desiredRetention: z.number().min(STUDY_LIMITS.desiredRetention.min).max(STUDY_LIMITS.desiredRetention.max),
  kanaWriting: z.boolean(),
  kanaReading: z.boolean(),
  vocab: z.boolean(),
  decks: z.boolean(),
  kanaScripts: z.array(z.enum(["h", "k"])).transform(dedupe),
  kanaGroups: z.array(z.enum(["basic", "dakuten", "yoon"])).transform(dedupe),
  newOrder: z.enum(["mine", "builtin", "mixed"]),
});

export const spaceSchema = z.object({
  version: z.literal(SPACE_VERSION),
  createdAt: ms,
  /** Đã qua (hoặc bỏ qua) màn dựng không gian lần đầu. */
  onboarded: z.boolean(),
  profile: z.object({
    name: z.string().max(LIMITS.name),
    /** Mục đích học, người học tự viết — hiện ở trang Tổng quan. */
    goal: z.string().max(LIMITS.goal),
  }),
  modules: z.array(z.enum(MODULE_IDS)).transform(normalizeModules),
  home: z.object({ widgets: z.array(z.enum(WIDGET_IDS)).transform(dedupe) }),
  study: studySchema,
  library: z.object({
    notes: z.array(noteSchema).max(LIMITS.notes),
    decks: z.array(deckSchema).max(LIMITS.decks),
    texts: z.array(textSchema).max(LIMITS.texts),
  }),
});

export type Space = z.infer<typeof spaceSchema>;
export type Note = Space["library"]["notes"][number];
export type Deck = Space["library"]["decks"][number];
export type DeckCard = Deck["cards"][number];
export type UserText = Space["library"]["texts"][number];
export type Profile = Space["profile"];

// ------------------------------------------------------------------ mặc định

export const DEFAULT_WIDGETS: readonly WidgetId[] = ["today", "stats", "goal", "heatmap", "badges", "notes"];

/** Study của một người chưa chỉnh gì — đúng những gì site làm từ trước tới nay. */
const defaultStudy = (): Space["study"] => ({
  ...DEFAULT_STUDY,
  kanaScripts: [...ALL_SCRIPTS],
  kanaGroups: [...ALL_GROUPS],
});

export function emptySpace(now = Date.now()): Space {
  return {
    version: SPACE_VERSION,
    createdAt: now,
    onboarded: false,
    profile: { name: "", goal: "" },
    modules: normalizeModules(MODULE_IDS),
    home: { widgets: [...DEFAULT_WIDGETS] },
    study: defaultStudy(),
    library: { notes: [], decks: [], texts: [] },
  };
}

// ------------------------------------------------------------------ đọc tệp

export type ParseResult = { ok: true; space: Space } | { ok: false; error: string };

/** Kiểm tra một giá trị đã parse JSON (từ localStorage hoặc từ tệp sao lưu). */
export function parseSpaceValue(raw: unknown): ParseResult {
  const version = (raw as { version?: unknown } | null)?.version;
  if (typeof version === "number" && version > SPACE_VERSION) {
    return { ok: false, error: "Không gian riêng trong tệp được tạo bởi phiên bản Kana Dōjō mới hơn. Hãy tải lại trang để cập nhật rồi thử lại." };
  }
  const parsed = spaceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Phần không gian riêng trong tệp không đúng định dạng." };
  return { ok: true, space: parsed.data };
}

export function parseSpace(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Tệp không phải JSON hợp lệ." };
  }
  return parseSpaceValue(raw);
}

// ------------------------------------------------------------------ thao tác chung

/** Thứ cần để tạo mục mới: thời điểm và nguồn mã. Tách ra để test xác định được. */
export interface Env { now: number; id: () => string }

const randomPart = () => {
  const bytes = new Uint8Array(6);
  (globalThis.crypto ?? { getRandomValues: (a: Uint8Array) => a.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
};

export const systemEnv = (): Env => ({ now: Date.now(), id: randomPart });

/** Mã chưa dùng trong không gian (thẻ, ghi chú, bộ thẻ, câu gõ đều chung một miền mã, đủ ít để kiểm tra từng cái). */
export function freshId(space: Space, env: Env): string {
  const used = new Set<string>([
    ...space.library.notes.map((n) => n.id),
    ...space.library.decks.flatMap((d) => [d.id, ...d.cards.map((c) => c.id)]),
    ...space.library.texts.map((t) => t.id),
  ]);
  for (let i = 0; i < 20; i++) {
    const candidate = env.id();
    if (!used.has(candidate)) return candidate;
  }
  throw new SpaceError("Không tạo được mã mới, hãy thử lại.");
}

const clampInt = (n: number, min: number, max: number) => Math.min(Math.max(Math.round(n) || 0, min), max);

// ------------------------------------------------------------------ hồ sơ, mô-đun, cách học

export function setProfile(space: Space, patch: Partial<Profile>): Space {
  const profile = { ...space.profile };
  if (patch.name !== undefined) profile.name = patch.name.trim().slice(0, LIMITS.name);
  if (patch.goal !== undefined) profile.goal = patch.goal.trim().slice(0, LIMITS.goal);
  return { ...space, profile };
}

export const setModules = (space: Space, modules: readonly ModuleId[]): Space =>
  ({ ...space, modules: normalizeModules(modules.filter((m) => MODULE_IDS.includes(m))) });

export const setWidgets = (space: Space, widgets: readonly WidgetId[]): Space =>
  ({ ...space, home: { widgets: dedupe(widgets.filter((w) => WIDGET_IDS.includes(w))) } });

/** Ghi đè từng phần, kẹp mọi con số vào khoảng cho phép. */
export function setStudy(space: Space, patch: Partial<StudyOptions>): Space {
  const s = { ...space.study, ...patch };
  const { newCardsPerDay: n, sessionSize: z, desiredRetention: r } = STUDY_LIMITS;
  const study: Space["study"] = {
    ...s,
    newCardsPerDay: clampInt(s.newCardsPerDay, n.min, n.max),
    sessionSize: clampInt(s.sessionSize, z.min, z.max),
    desiredRetention: Math.round(Math.min(Math.max(s.desiredRetention, r.min), r.max) * 100) / 100,
    kanaScripts: dedupe(s.kanaScripts),
    kanaGroups: dedupe(s.kanaGroups),
  };
  return { ...space, study };
}

export const completeOnboarding = (space: Space): Space => (space.onboarded ? space : { ...space, onboarded: true });

// ------------------------------------------------------------------ ngữ cảnh học

/** Phần của không gian mà bộ máy học cần: cách học + thẻ tự soạn. */
export function learnContextOf(space: Space): LearnContext {
  return { catalog: catalogFromDecks(space.library.decks), study: space.study };
}
