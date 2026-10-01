/* "Máy chủ" cục bộ: nhận đúng các đường dẫn và hình dạng DTO của backend (docs/SPEC.md §5) nhưng trả lời từ
   localStorage. Nhờ vậy các trang giữ nguyên lời gọi get()/post()/patch() — chỉ lib/api.ts đổi chỗ gửi đi.

   Chưa hỗ trợ (cần nhiều người dùng hoặc tài khoản): /leaderboard/*, /me/entitlements, /auth/* cấp phiên. Gọi tới
   chúng trả 404. */

import { badRequest, notFound } from "../api-error";
import type { ItemType } from "../types";
import { groupCode, KANA_LIST, scriptCode, toKanaDto } from "./catalog";
import {
  listQuizzes, quizDetail, searchVocabulary, startQuizAttempt, submitQuizAttempt, type SubmitInput,
} from "./content";
import { badgesDto, heatmap, statsDto } from "./gamification";
import {
  gradeCard, kanaProgress, progressSummary, queue, recordWriting, type GradeInput, type WritingInput,
} from "./learning";
import { getUser, updateProfile, type ProfilePatch } from "./profile";
import { mutate, readState } from "./store";

const ITEM_TYPES: ItemType[] = ["KANA_WRITING", "KANA_READING", "VOCAB_MEANING", "VOCAB_READING"];

const num = (v: string | null, fallback: number) => {
  if (v === null || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** `?types=A,B` hoặc `?types=A&types=B` đều được (Spring chấp nhận cả hai). */
function parseTypes(params: URLSearchParams): ItemType[] | null {
  const raw = params.getAll("types").flatMap((v) => v.split(",")).map((v) => v.trim().toUpperCase()).filter(Boolean);
  if (raw.length === 0) return null;
  const types = raw.map((v) => ITEM_TYPES.find((t) => t === v));
  if (types.some((t) => t === undefined)) throw badRequest("Nội dung yêu cầu không đúng định dạng mong đợi");
  return types as ItemType[];
}

export async function handleLocal(method: string, path: string, body?: unknown, now: Date = new Date()): Promise<unknown> {
  const url = new URL(path, "http://local");
  const route = url.pathname;
  const q = url.searchParams;
  const verb = method.toUpperCase();
  const match = (re: RegExp) => re.exec(route);

  if (verb === "GET") {
    switch (route) {
      case "/auth/me": return getUser();
      case "/stats/me": return readState((s) => statsDto(s, now));
      case "/stats/heatmap": return readState((s) => heatmap(s, num(q.get("days"), 365), now));
      case "/badges": return readState(badgesDto);
      case "/progress/summary": return readState((s) => progressSummary(s, now));
      case "/progress/kana": return readState((s) => kanaProgress(s, scriptCode(q.get("script"))));
      case "/kana": {
        const script = scriptCode(q.get("script"));
        const group = groupCode(q.get("group"));
        return KANA_LIST.filter((k) => (script === null || k.s === script) && (group === null || k.g === group)).map(toKanaDto);
      }
      case "/reviews/queue":
        return mutate((s) => queue(s, num(q.get("limit"), 20), parseTypes(q), now));
      case "/vocabulary": {
        const level = num(q.get("level"), NaN);
        return searchVocabulary(Number.isNaN(level) ? null : level, q.get("q"), num(q.get("page"), 0), num(q.get("size"), 20));
      }
      case "/quizzes": return listQuizzes(num(q.get("page"), 0), num(q.get("size"), 20));
    }
    const quiz = match(/^\/quizzes\/(\d+)$/);
    if (quiz) return quizDetail(Number(quiz[1]));
  }

  if (verb === "PATCH" && route === "/auth/me") return updateProfile((body ?? {}) as ProfilePatch);

  if (verb === "POST") {
    if (route === "/reviews/grade") return mutate((s) => gradeCard(s, (body ?? {}) as GradeInput, now));
    if (route === "/writing/attempts") return mutate((s) => recordWriting(s, (body ?? {}) as WritingInput, now));
    const start = match(/^\/quizzes\/(\d+)\/attempts$/);
    if (start) return mutate((s) => startQuizAttempt(s, Number(start[1]), now));
    const submit = match(/^\/quiz-attempts\/(\d+)\/submit$/);
    if (submit) return mutate((s) => submitQuizAttempt(s, Number(submit[1]), (body ?? {}) as SubmitInput, now));
  }

  throw notFound(`Chế độ cá nhân chưa hỗ trợ ${verb} ${route}`);
}
