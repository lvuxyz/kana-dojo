/**
 * Cài đặt FSRS-6 (Free Spaced Repetition Scheduler).
 *
 * Thuần hàm: không state, không đụng DOM hay localStorage. Thời gian là mili-giây epoch.
 * Toàn bộ lịch ôn của ứng dụng đi qua đây nên nó phải kiểm thử được độc lập (fsrs.test.ts).
 *
 * Ý đồ chung: mỗi thẻ được mô tả bằng hai đại lượng liên tục
 *  - S (stability)  — số ngày để khả năng nhớ lại tụt xuống mức mục tiêu 90%.
 *  - D (difficulty) — độ khó riêng của thẻ với người học này, giữ trong [1, 10].
 * Khoảng cách ôn kế tiếp được suy ra từ S sao cho đúng lúc ôn thì R(t, S) rơi về
 * `desiredRetention`. Vì vậy toàn bộ "trí thông minh" của bộ lập lịch nằm ở cách cập nhật S và D.
 */

import type { CardState, Grade } from "./types";

/** 21 tham số mặc định của FSRS-6. Chỉ số trong công thức bên dưới trùng với chỉ số mảng. */
export const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const;

/** Số mũ của đường cong quên. Âm, nên R giảm đơn điệu theo t. */
const DECAY = -W[20];

/** Hằng chuẩn hoá để R(S, S) = 0.9: giải (1 + factor)^decay = 0.9.
 *  Nhờ nó, "stability = S ngày" luôn có nghĩa là "sau S ngày còn nhớ 90%". */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

/** Các mốc phút của giai đoạn học lần đầu. */
export const LEARNING_STEPS_MINUTES = [1, 10] as const;
/** Mốc phút khi thẻ bị quên và phải học lại. */
export const RELEARNING_STEPS_MINUTES = [10] as const;

export const DEFAULT_DESIRED_RETENTION = 0.9;

const MIN_STABILITY = 0.01;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MAX_INTERVAL_DAYS = 36500;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Trạng thái FSRS của một thẻ, đủ để tính bước kế tiếp mà không cần đọc lịch sử. */
export interface FsrsState {
  stability: number;
  difficulty: number;
  state: CardState;
  learningStep: number;
  reps: number;
  lapses: number;
}

/** Kết quả một lần chấm. `intervalDays` bằng 0 khi thẻ còn nằm trong các bước học dưới một ngày
 *  (lúc đó `dueAt` mới là thông tin chính xác). */
export interface FsrsResult {
  next: FsrsState;
  intervalDays: number;
  dueAt: number;
}

export function newCardState(): FsrsState {
  return { stability: 0, difficulty: 0, state: "NEW", learningStep: 0, reps: 0, lapses: 0 };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// ------------------------------------------------------------------ công thức cơ bản

/** Khả năng nhớ lại sau `elapsedDays` ngày: R(t, S) = (1 + FACTOR * t / S)^DECAY.
 *  Luôn nằm trong (0, 1]: bằng 1 khi t = 0 và giảm ngặt theo t. S được kẹp dưới vì S = 0 làm phép chia nổ. */
export function retrievability(stability: number, elapsedDays: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const t = Math.max(elapsedDays, 0);
  return Math.pow(1 + (FACTOR * t) / s, DECAY);
}

/** Quy điểm chấm nét viết (0..100) thành grade FSRS.
 *
 *  Đây là điểm khác biệt của sản phẩm: grade được *đo* từ chất lượng nét viết thay vì để người học
 *  tự khai báo. Một nét sai hẳn (sai thứ tự, ngược chiều…) là đủ để coi như quên, bất kể điểm trung bình. */
export function gradeFromScore(score: number, anyStrokeFailed: boolean): Grade {
  if (anyStrokeFailed || score < 48) return 1;
  if (score < 70) return 2;
  if (score < 88) return 3;
  return 4;
}

/** Khoảng cách ôn (ngày) suy ra từ S sao cho khi đến hạn thì R vừa chạm mức mong muốn. */
export function intervalDays(stability: number, desiredRetention: number): number {
  const retention = clamp(desiredRetention, 0.7, 0.99);
  const raw = (Math.max(stability, MIN_STABILITY) / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(Math.round(raw), 1, MAX_INTERVAL_DAYS);
}

// ------------------------------------------------------------------ khởi tạo S, D cho lần ôn đầu tiên

export function initialStability(grade: number): number {
  return Math.max(W[grade - 1], MIN_STABILITY);
}

export function initialDifficulty(grade: number): number {
  return clamp(W[4] - Math.exp(W[5] * (grade - 1)) + 1, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

// ------------------------------------------------------------------ cập nhật D và S

/** Cập nhật độ khó có hồi quy về trung bình. Phần `deltaD` là phản ứng tức thời với câu trả lời;
 *  phần trộn với `initialDifficulty(4)` (trọng số w7) kéo D dần về mức "dễ". Không có bước hồi quy này,
 *  D chỉ biết tăng và mọi thẻ cuối cùng đều dính trần 10. */
export function nextDifficulty(difficulty: number, grade: number): number {
  const deltaD = -W[6] * (grade - 3);
  const dampened = difficulty + (deltaD * (10 - difficulty)) / 9;
  const reverted = W[7] * initialDifficulty(4) + (1 - W[7]) * dampened;
  return clamp(reverted, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

/** S khi nhớ được (grade >= 2): S tăng nhiều nhất khi R thấp — ôn đúng lúc sắp quên là hiệu quả nhất. */
export function stabilityAfterRecall(stability: number, difficulty: number, r: number, grade: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) * (11 - difficulty) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hardPenalty * easyBonus;
  return Math.max(s * (1 + growth), MIN_STABILITY);
}

/** S khi quên (grade = 1). Lấy `min` với S cũ để một lần quên không bao giờ làm thẻ "khoẻ" lên —
 *  bẫy hay gặp khi S cũ còn rất nhỏ. */
export function stabilityAfterForget(stability: number, difficulty: number, r: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  const d = Math.max(difficulty, MIN_DIFFICULTY);
  const postLapse = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.max(Math.min(s, postLapse), MIN_STABILITY);
}

/** S cho lần ôn lại trong cùng ngày: không dùng đường cong quên vì t ≈ 0 khiến R ≈ 1 và công thức
 *  nhớ lại gần như không tăng S. Công thức ngắn hạn này thay thế. */
export function stabilityShortTerm(stability: number, grade: number): number {
  const s = Math.max(stability, MIN_STABILITY);
  return Math.max(s * Math.exp(W[17] * (grade - 3 + W[18])) * Math.pow(s, -W[19]), MIN_STABILITY);
}

// ------------------------------------------------------------------ điểm vào chính

/**
 * Chấm một thẻ và trả về trạng thái + lịch ôn kế tiếp.
 *
 * @param cur         trạng thái hiện tại của thẻ
 * @param grade       1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 * @param elapsedDays số ngày *thực tế* đã trôi kể từ lần ôn trước (có phần thập phân); phải là thời gian
 *                    thật, không phải số ngày đã lên lịch
 * @param now         mốc thời gian của lần chấm này (mili-giây epoch)
 */
export function review(
  cur: FsrsState,
  grade: number,
  elapsedDays: number,
  now: number,
  desiredRetention: number = DEFAULT_DESIRED_RETENTION,
): FsrsResult {
  if (!Number.isInteger(grade) || grade < 1 || grade > 4) {
    throw new RangeError(`grade phải nằm trong khoảng 1..4, nhận được: ${grade}`);
  }

  const elapsed = Math.max(elapsedDays, 0);
  const reps = cur.reps + 1;

  let stability: number;
  let difficulty: number;

  if (cur.state === "NEW" || cur.reps === 0) {
    // Lần đầu tiên: S, D được khởi tạo thẳng từ tham số, không có lịch sử để dựa vào.
    stability = initialStability(grade);
    difficulty = initialDifficulty(grade);
  } else {
    const r = retrievability(cur.stability, elapsed);
    difficulty = nextDifficulty(cur.difficulty, grade);
    if (grade === 1) stability = stabilityAfterForget(cur.stability, cur.difficulty, r);
    // Ôn lại trong cùng ngày (điển hình là các bước học cách nhau vài phút).
    else if (elapsed < 1) stability = stabilityShortTerm(cur.stability, grade);
    else stability = stabilityAfterRecall(cur.stability, cur.difficulty, r, grade);
  }

  // Chỉ tính là "quên" khi thẻ đã tốt nghiệp. Sai lúc đang học (LEARNING/RELEARNING) là chuyện bình thường
  // của quá trình học, đếm vào lapses sẽ thổi phồng độ khó.
  const lapses = grade === 1 && cur.state === "REVIEW" ? cur.lapses + 1 : cur.lapses;

  switch (cur.state) {
    case "NEW":
    case "LEARNING":
      return scheduleThroughSteps(LEARNING_STEPS_MINUTES, "LEARNING", cur.learningStep, grade, stability, difficulty, reps, lapses, now, desiredRetention);
    case "RELEARNING":
      return scheduleThroughSteps(RELEARNING_STEPS_MINUTES, "RELEARNING", cur.learningStep, grade, stability, difficulty, reps, lapses, now, desiredRetention);
    case "REVIEW":
      if (grade === 1) {
        // Quên một thẻ đã thuộc: rơi về RELEARNING, quay lại mốc phút đầu tiên.
        return {
          next: { stability, difficulty, state: "RELEARNING", learningStep: 0, reps, lapses },
          intervalDays: 0,
          dueAt: now + RELEARNING_STEPS_MINUTES[0] * MINUTE_MS,
        };
      }
      return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  }
}

/** Máy trạng thái của các bước học tính bằng phút.
 *  - Again → quay về bước 0.
 *  - Hard  → lặp lại chính bước hiện tại.
 *  - Good  → sang bước kế; hết bước thì tốt nghiệp sang REVIEW và bắt đầu dùng FSRS.
 *  - Easy  → tốt nghiệp ngay, bỏ qua các bước còn lại. */
function scheduleThroughSteps(
  steps: readonly number[],
  stepState: CardState,
  currentStep: number,
  grade: number,
  stability: number,
  difficulty: number,
  reps: number,
  lapses: number,
  now: number,
  desiredRetention: number,
): FsrsResult {
  if (grade === 4) return graduate(stability, difficulty, reps, lapses, now, desiredRetention);

  const step =
    grade === 1 ? 0 : grade === 2 ? Math.min(Math.max(currentStep, 0), steps.length - 1) : Math.max(currentStep, 0) + 1;

  if (step >= steps.length) return graduate(stability, difficulty, reps, lapses, now, desiredRetention);
  return {
    next: { stability, difficulty, state: stepState, learningStep: step, reps, lapses },
    intervalDays: 0,
    dueAt: now + steps[step] * MINUTE_MS,
  };
}

function graduate(
  stability: number,
  difficulty: number,
  reps: number,
  lapses: number,
  now: number,
  desiredRetention: number,
): FsrsResult {
  const interval = intervalDays(stability, desiredRetention);
  return {
    next: { stability, difficulty, state: "REVIEW", learningStep: 0, reps, lapses },
    intervalDays: interval,
    dueAt: now + interval * DAY_MS,
  };
}
