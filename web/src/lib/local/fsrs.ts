/* FSRS-6 — bản port nguyên văn của backend/.../srs/FsrsEngine.java.
   Thuần hàm, không chạm DOM hay localStorage. Công thức và tham số phải giữ khớp với bản Java:
   khi bật lại máy chủ, lịch ôn tính ở hai nơi không được lệch nhau. */

import type { CardState } from "../types";

/** 21 tham số mặc định của FSRS-6. Chỉ số trùng với chỉ số mảng trong công thức. */
export const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const;

const DECAY = -W[20];
/** Chuẩn hoá để R(S, S) = 0.9. */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

export const LEARNING_STEPS_MINUTES = [1, 10];
export const RELEARNING_STEPS_MINUTES = [10];
export const DEFAULT_DESIRED_RETENTION = 0.9;

const MIN_STABILITY = 0.01;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MAX_INTERVAL_DAYS = 36_500;

export interface FsrsState {
  stability: number;
  difficulty: number;
  state: CardState;
  learningStep: number;
  reps: number;
  lapses: number;
}

export interface FsrsResult {
  next: FsrsState;
  /** 0 khi thẻ còn trong các bước học dưới một ngày. */
  intervalDays: number;
  dueAt: Date;
}

export function newCardState(): FsrsState {
  return { stability: 0, difficulty: 0, state: "NEW", learningStep: 0, reps: 0, lapses: 0 };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** R(t, S) = (1 + FACTOR·t/S)^DECAY */
export function retrievability(stability: number, elapsedDays: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const t = Math.max(elapsedDays, 0);
  return Math.pow(1 + (FACTOR * t) / s, DECAY);
}

/** Điểm chấm nét (0..100) → grade. Phải khớp FsrsEngine.gradeFromScore và stroke-match.ts. */
export function gradeFromScore(score: number, anyStrokeFailed: boolean): 1 | 2 | 3 | 4 {
  if (anyStrokeFailed || score < 48) return 1;
  if (score < 70) return 2;
  if (score < 88) return 3;
  return 4;
}

export function intervalDays(stability: number, desiredRetention: number): number {
  const retention = clamp(desiredRetention, 0.7, 0.99);
  const raw = (Math.max(stability, MIN_STABILITY) / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(Math.round(raw), 1, MAX_INTERVAL_DAYS);
}

export function initialStability(grade: number): number {
  return Math.max(W[grade - 1], MIN_STABILITY);
}

export function initialDifficulty(grade: number): number {
  return clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function nextDifficulty(difficulty: number, grade: number): number {
  const deltaD = -W[6] * (grade - 3);
  const dampened = difficulty + (deltaD * (10 - difficulty)) / 9;
  const reverted = W[7] * initialDifficulty(4) + (1 - W[7]) * dampened;
  return clamp(reverted, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function stabilityAfterRecall(stability: number, difficulty: number, r: number, grade: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) * (11 - difficulty) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hardPenalty * easyBonus;
  return Math.max(s * (1 + growth), MIN_STABILITY);
}

function stabilityAfterForget(stability: number, difficulty: number, r: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const d = Math.max(difficulty, MIN_DIFFICULTY);
  const postLapse = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.max(Math.min(s, postLapse), MIN_STABILITY);
}

function stabilityShortTerm(stability: number, grade: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  return Math.max(s * Math.exp(W[17] * (grade - 3 + W[18])) * Math.pow(s, -W[19]), MIN_STABILITY);
}

const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
const addDaysTo = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

function graduate(
  stability: number, difficulty: number, reps: number, lapses: number, now: Date, retention: number,
): FsrsResult {
  const interval = intervalDays(stability, retention);
  return {
    next: { stability, difficulty, state: "REVIEW", learningStep: 0, reps, lapses },
    intervalDays: interval,
    dueAt: addDaysTo(now, interval),
  };
}

function scheduleThroughSteps(
  steps: number[], stepState: CardState, currentStep: number, grade: number,
  stability: number, difficulty: number, reps: number, lapses: number, now: Date, retention: number,
): FsrsResult {
  if (grade === 4) return graduate(stability, difficulty, reps, lapses, now, retention);

  const step =
    grade === 1 ? 0
      : grade === 2 ? Math.min(Math.max(currentStep, 0), steps.length - 1)
        : Math.max(currentStep, 0) + 1;

  if (step >= steps.length) return graduate(stability, difficulty, reps, lapses, now, retention);
  return {
    next: { stability, difficulty, state: stepState, learningStep: step, reps, lapses },
    intervalDays: 0,
    dueAt: addMinutes(now, steps[step]),
  };
}

/**
 * Chấm một thẻ và trả về trạng thái + lịch ôn kế tiếp.
 * @param elapsedDays số ngày THỰC TẾ (có phần thập phân) kể từ lần ôn trước, không phải số ngày đã lên lịch.
 */
export function review(
  cur: FsrsState, grade: number, elapsedDays: number, now: Date, desiredRetention = DEFAULT_DESIRED_RETENTION,
): FsrsResult {
  if (!Number.isInteger(grade) || grade < 1 || grade > 4) {
    throw new RangeError(`grade phải nằm trong khoảng 1..4, nhận được: ${grade}`);
  }

  const elapsed = Math.max(elapsedDays, 0);
  const reps = cur.reps + 1;

  let stability: number;
  let difficulty: number;

  if (cur.state === "NEW" || cur.reps === 0) {
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
  } else {
    const r = retrievability(cur.stability, elapsed);
    difficulty = nextDifficulty(cur.difficulty, grade);
    if (grade === 1) stability = stabilityAfterForget(cur.stability, cur.difficulty, r);
    else if (elapsed < 1) stability = stabilityShortTerm(cur.stability, grade);
    else stability = stabilityAfterRecall(cur.stability, cur.difficulty, r, grade);
  }

  // Chỉ tính là "quên" khi thẻ đã tốt nghiệp; sai lúc đang học là chuyện bình thường.
  const lapses = grade === 1 && cur.state === "REVIEW" ? cur.lapses + 1 : cur.lapses;

  switch (cur.state) {
    case "NEW":
    case "LEARNING":
      return scheduleThroughSteps(
        LEARNING_STEPS_MINUTES, "LEARNING", cur.learningStep, grade, stability, difficulty, reps, lapses, now, desiredRetention);
    case "RELEARNING":
      return scheduleThroughSteps(
        RELEARNING_STEPS_MINUTES, "RELEARNING", cur.learningStep, grade, stability, difficulty, reps, lapses, now, desiredRetention);
    case "REVIEW":
      if (grade === 1) {
        return {
          next: { stability, difficulty, state: "RELEARNING", learningStep: 0, reps, lapses },
          intervalDays: 0,
          dueAt: addMinutes(now, RELEARNING_STEPS_MINUTES[0]),
        };
      }
      return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  }
}
