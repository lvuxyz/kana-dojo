/** Cài đặt FSRS-6 — bản port nguyên văn của backend/.../srs/FsrsEngine.java (xem docs/SPEC.md §3).
 *  Thuần hàm, không phụ thuộc DOM hay localStorage. Sửa một bên phải sửa bên kia. */
import type { CardState } from "../types";

/** 21 tham số mặc định của FSRS-6. Chỉ số trùng với chỉ số trong công thức. */
export const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const;

const DECAY = -W[20];
/** Chuẩn hoá để R(S, S) = 0.9. */
const FACTOR = Math.pow(0.9, 1.0 / DECAY) - 1.0;

export const LEARNING_STEPS_MINUTES = [1, 10] as const;
const RELEARNING_STEPS_MINUTES = [10] as const;
export const DEFAULT_DESIRED_RETENTION = 0.9;

const MIN_STABILITY = 0.01;
const MIN_DIFFICULTY = 1.0;
const MAX_DIFFICULTY = 10.0;
const MAX_INTERVAL_DAYS = 36500;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

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
  /** 0 khi thẻ còn trong các bước học dưới một ngày (lúc đó `dueAt` mới là thông tin chính xác). */
  intervalDays: number;
  dueAt: Date;
}

export const newCardState = (): FsrsState =>
  ({ stability: 0, difficulty: 0, state: "NEW", learningStep: 0, reps: 0, lapses: 0 });

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** R(t, S) = (1 + FACTOR·t/S)^DECAY — luôn trong (0, 1], bằng 1 khi t = 0. */
export function retrievability(stability: number, elapsedDays: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const t = Math.max(elapsedDays, 0);
  return Math.pow(1.0 + (FACTOR * t) / s, DECAY);
}

/** Quy điểm chấm nét viết (0..100) thành grade FSRS: 1 Again, 2 Hard, 3 Good, 4 Easy. */
export function gradeFromScore(score: number, anyStrokeFailed: boolean): 1 | 2 | 3 | 4 {
  if (anyStrokeFailed || score < 48) return 1;
  if (score < 70) return 2;
  if (score < 88) return 3;
  return 4;
}

/** Khoảng cách ôn (ngày) để khi đến hạn thì R vừa chạm mức mong muốn. */
export function intervalDays(stability: number, desiredRetention: number): number {
  const retention = clamp(desiredRetention, 0.7, 0.99);
  const raw = (Math.max(stability, MIN_STABILITY) / FACTOR) * (Math.pow(retention, 1.0 / DECAY) - 1.0);
  // Math.round của Java làm tròn nửa lên (floor(x + 0.5)) — JS cũng vậy với số dương.
  return clamp(Math.round(raw), 1, MAX_INTERVAL_DAYS);
}

const initialStability = (grade: number) => Math.max(W[grade - 1], MIN_STABILITY);
const initialDifficulty = (grade: number) =>
  clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1.0, MIN_DIFFICULTY, MAX_DIFFICULTY);

/** Cập nhật độ khó có hồi quy về trung bình. */
function nextDifficulty(difficulty: number, grade: number): number {
  const deltaD = -W[6] * (grade - 3);
  const dampened = difficulty + (deltaD * (10.0 - difficulty)) / 9.0;
  const reverted = W[7] * initialDifficulty(4) + (1.0 - W[7]) * dampened;
  return clamp(reverted, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function stabilityAfterRecall(stability: number, difficulty: number, r: number, grade: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const hardPenalty = grade === 2 ? W[15] : 1.0;
  const easyBonus = grade === 4 ? W[16] : 1.0;
  const growth = Math.exp(W[8]) * (11.0 - difficulty) * Math.pow(s, -W[9])
    * (Math.exp(W[10] * (1.0 - r)) - 1.0) * hardPenalty * easyBonus;
  return Math.max(s * (1.0 + growth), MIN_STABILITY);
}

/** Lấy min với S cũ để một lần quên không bao giờ làm thẻ "khoẻ" lên. */
function stabilityAfterForget(stability: number, difficulty: number, r: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const d = Math.max(difficulty, MIN_DIFFICULTY);
  const postLapse = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1.0, W[13]) - 1.0) * Math.exp(W[14] * (1.0 - r));
  return Math.max(Math.min(s, postLapse), MIN_STABILITY);
}

/** Ôn lại trong cùng ngày: không dùng đường cong quên vì R ≈ 1. */
function stabilityShortTerm(stability: number, grade: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  return Math.max(s * Math.exp(W[17] * (grade - 3 + W[18])) * Math.pow(s, -W[19]), MIN_STABILITY);
}

function graduate(stability: number, difficulty: number, reps: number, lapses: number,
                  now: Date, desiredRetention: number): FsrsResult {
  const interval = intervalDays(stability, desiredRetention);
  return {
    next: { stability, difficulty, state: "REVIEW", learningStep: 0, reps, lapses },
    intervalDays: interval,
    dueAt: new Date(now.getTime() + interval * MS_PER_DAY),
  };
}

/** Máy trạng thái các bước học tính bằng phút: Again→bước 0, Hard→lặp bước, Good→bước kế, Easy→tốt nghiệp. */
function scheduleThroughSteps(steps: readonly number[], stepState: CardState, currentStep: number, grade: number,
                              stability: number, difficulty: number, reps: number, lapses: number,
                              now: Date, desiredRetention: number): FsrsResult {
  if (grade === 4) return graduate(stability, difficulty, reps, lapses, now, desiredRetention);

  const step = grade === 1 ? 0
    : grade === 2 ? Math.min(Math.max(currentStep, 0), steps.length - 1)
    : Math.max(currentStep, 0) + 1;

  if (step >= steps.length) return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  return {
    next: { stability, difficulty, state: stepState, learningStep: step, reps, lapses },
    intervalDays: 0,
    dueAt: new Date(now.getTime() + steps[step] * MS_PER_MINUTE),
  };
}

/** Chấm một thẻ và trả về trạng thái + lịch ôn kế tiếp. `elapsedDays` là thời gian thật (có phần thập phân). */
export function review(cur: FsrsState, grade: number, elapsedDays: number, now: Date,
                       desiredRetention: number = DEFAULT_DESIRED_RETENTION): FsrsResult {
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
    else if (elapsed < 1.0) stability = stabilityShortTerm(cur.stability, grade);
    else stability = stabilityAfterRecall(cur.stability, cur.difficulty, r, grade);
  }

  // Chỉ tính là "quên" khi thẻ đã tốt nghiệp; sai lúc đang học là chuyện bình thường.
  const lapses = grade === 1 && cur.state === "REVIEW" ? cur.lapses + 1 : cur.lapses;

  switch (cur.state) {
    case "NEW":
    case "LEARNING":
      return scheduleThroughSteps(LEARNING_STEPS_MINUTES, "LEARNING", cur.learningStep, grade,
        stability, difficulty, reps, lapses, now, desiredRetention);
    case "RELEARNING":
      return scheduleThroughSteps(RELEARNING_STEPS_MINUTES, "RELEARNING", cur.learningStep, grade,
        stability, difficulty, reps, lapses, now, desiredRetention);
    case "REVIEW":
      if (grade === 1) {
        return {
          next: { stability, difficulty, state: "RELEARNING", learningStep: 0, reps, lapses },
          intervalDays: 0,
          dueAt: new Date(now.getTime() + RELEARNING_STEPS_MINUTES[0] * MS_PER_MINUTE),
        };
      }
      return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  }
}
