/** Backend chạy ngay trong trình duyệt (chế độ độc lập — xem lib/standalone.ts).
 *
 *  `localRequest` thay cho `fetch("/api/v1/...")` và `localAuth` thay cho `fetch("/api/auth/...")`, giữ nguyên hợp
 *  đồng của docs/SPEC.md §5: cùng đường dẫn, cùng DTO, cùng lỗi RFC 7807. Nhờ vậy không trang nào phải sửa. */
import { ApiError } from "../api";
import type { ItemType, UserDto } from "../types";
import * as auth from "./auth";
import type { Db, LocalUser } from "./db";
import { load, save } from "./db";
import { notFound, validation } from "./errors";
import {
  entitlementsOf, heatmap, listBadges, statsDto, weeklyLeaderboard,
} from "./gamification";
import {
  gradeCard, ITEM_TYPES, kanaList, kanaProgress, progressSummary, recordWriting, reviewQueue, searchVocabulary,
  type GradeRequest, type WritingAttemptRequest,
} from "./learning";
import { listQuizzes, quizDetail, startAttempt, submitAttempt, type SubmitRequest } from "./quiz";

interface Ctx { db: Db; user: LocalUser; m: string[]; q: URLSearchParams; body: unknown }
interface Route { method: string; re: RegExp; auth: boolean; write: boolean; run: (c: Ctx) => unknown }

const SCRIPTS = ["HIRAGANA", "KATAKANA"];
const GROUPS = ["BASIC", "DAKUTEN", "YOON"];

/** Tham số số nguyên có mặc định; giá trị không phải số là lỗi 400 như Spring. */
function int(q: URLSearchParams, name: string, fallback: number): number {
  const raw = q.get(name);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw validation({ [name]: "Tham số không hợp lệ" }, "Tham số không hợp lệ");
  return n;
}

function oneOf(q: URLSearchParams, name: string, allowed: string[]): string | null {
  const raw = q.get(name);
  if (raw === null || raw === "") return null;
  if (!allowed.includes(raw)) throw validation({ [name]: "Tham số không hợp lệ" }, "Tham số không hợp lệ");
  return raw;
}

const id = (m: string[]) => Number(m[1]);

const ROUTES: Route[] = [
  { method: "GET", re: /^\/kana$/, auth: false, write: false,
    run: ({ q }) => kanaList(oneOf(q, "script", SCRIPTS), oneOf(q, "group", GROUPS)) },
  { method: "GET", re: /^\/vocabulary$/, auth: true, write: false,
    run: ({ user, q }) => searchVocabulary(user, q.get("level") ? int(q, "level", 0) : null, q.get("q"), int(q, "page", 0), int(q, "size", 20)) },

  { method: "GET", re: /^\/progress\/kana$/, auth: true, write: false,
    run: ({ db, user, q }) => kanaProgress(db, user, oneOf(q, "script", SCRIPTS)) },
  { method: "GET", re: /^\/progress\/summary$/, auth: true, write: false, run: ({ db, user }) => progressSummary(db, user) },

  // Hàng đợi cấp thẻ mới nên cũng là thao tác ghi.
  { method: "GET", re: /^\/reviews\/queue$/, auth: true, write: true,
    run: ({ db, user, q }) => {
      const raw = q.get("types");
      const types = raw ? raw.split(",").map((t) => t.trim()).filter(Boolean) : null;
      if (types?.some((t) => !ITEM_TYPES.includes(t as ItemType))) {
        throw validation({ types: "Tham số không hợp lệ" }, "Tham số không hợp lệ");
      }
      return reviewQueue(db, user, int(q, "limit", 20), types as ItemType[] | null);
    } },
  { method: "POST", re: /^\/reviews\/grade$/, auth: true, write: true,
    run: ({ db, user, body }) => gradeCard(db, user, (body ?? {}) as GradeRequest) },
  { method: "POST", re: /^\/writing\/attempts$/, auth: true, write: true,
    run: ({ db, user, body }) => recordWriting(db, user, (body ?? {}) as WritingAttemptRequest) },

  { method: "GET", re: /^\/stats\/me$/, auth: true, write: false, run: ({ db, user }) => statsDto(db, user) },
  { method: "GET", re: /^\/stats\/heatmap$/, auth: true, write: false,
    run: ({ db, user, q }) => heatmap(db, user, int(q, "days", 365)) },
  { method: "GET", re: /^\/badges$/, auth: true, write: false, run: ({ db, user }) => listBadges(db, user) },
  { method: "GET", re: /^\/leaderboard\/weekly$/, auth: true, write: false,
    run: ({ db, user, q }) => weeklyLeaderboard(db, user.id, int(q, "limit", 50)) },
  { method: "GET", re: /^\/me\/entitlements$/, auth: true, write: false, run: ({ db, user }) => entitlementsOf(db, user) },

  { method: "GET", re: /^\/quizzes$/, auth: true, write: false,
    run: ({ q }) => listQuizzes(int(q, "page", 0), int(q, "size", 20)) },
  { method: "GET", re: /^\/quizzes\/(\d+)$/, auth: true, write: false, run: ({ m }) => quizDetail(id(m)) },
  { method: "POST", re: /^\/quizzes\/(\d+)\/attempts$/, auth: true, write: true,
    run: ({ db, user, m }) => startAttempt(db, user, id(m)) },
  { method: "POST", re: /^\/quiz-attempts\/(\d+)\/submit$/, auth: true, write: true,
    run: ({ db, user, m, body }) => submitAttempt(db, user, id(m), (body ?? {}) as SubmitRequest) },

  { method: "GET", re: /^\/auth\/me$/, auth: true, write: false, run: ({ user }) => auth.toDto(user) },
  { method: "PATCH", re: /^\/auth\/me$/, auth: true, write: true,
    run: ({ user, body }) => auth.updateProfile(user, (body ?? {}) as auth.ProfileRequest) },
];

/** Thay cho `fetch("/api/v1" + path)`. Mỗi request đọc kho, chạy handler đồng bộ rồi chỉ ghi khi là thao tác ghi. */
export async function localRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const url = new URL(path, "http://local");
  const verb = method.toUpperCase();
  const instance = `/api/v1${url.pathname}`;
  try {
    const hit = ROUTES.map((r) => ({ r, m: r.method === verb ? url.pathname.match(r.re) : null })).find((x) => x.m);
    if (!hit) throw notFound(`Không có tài nguyên ${verb} ${instance}`);

    const db = load();
    const user = hit.r.auth ? auth.requireUser(db) : (undefined as unknown as LocalUser);
    const out = hit.r.run({ db, user, m: hit.m!, q: url.searchParams, body });
    if (hit.r.write) save(db);
    // Qua JSON như khi đi qua mạng: tách khỏi dữ liệu nội dung dùng chung và bỏ các trường `undefined`.
    return (out === undefined ? undefined : JSON.parse(JSON.stringify(out))) as T;
  } catch (e) {
    if (e instanceof ApiError && !e.problem.instance) e.problem.instance = instance;
    throw e;
  }
}

/** Thay cho `fetch("/api/auth/<path>")` của route handler BFF. Lỗi là `Error` có `message` hiển thị được. */
export async function localAuth(path: string, body?: unknown): Promise<{ accessToken: string; user: UserDto }> {
  switch (path) {
    case "register": return auth.register((body ?? {}) as auth.RegisterRequest);
    case "login": return auth.login((body ?? {}) as auth.LoginRequest);
    case "refresh": return auth.refresh();
    case "google": throw new Error("Đăng nhập Google cần máy chủ nên tạm tắt ở chế độ độc lập. Hãy đăng ký bằng email.");
    default: throw notFound(`Không có tài nguyên POST /api/auth/${path}`);
  }
}

export function localLogout() {
  auth.logout();
}
