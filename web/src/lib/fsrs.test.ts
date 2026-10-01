import { describe, expect, it } from "vitest";
import {
  LEARNING_STEPS_MINUTES, W, gradeFromScore, intervalDays, newCardState, retrievability, review,
  type FsrsState,
} from "./fsrs";

const NOW = Date.parse("2026-09-07T10:00:00Z");
const RETENTION = 0.9;
const MIN = 60_000;

const mature = (over: Partial<FsrsState> = {}): FsrsState =>
  ({ stability: 30, difficulty: 5, state: "REVIEW", learningStep: 0, reps: 5, lapses: 0, ...over });

/** PRNG có seed để chuỗi chấm "ngẫu nhiên" tái lập được giữa các lần chạy. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("FSRS-6", () => {
  it("thẻ mới với từng grade cho trạng thái và lịch đúng", () => {
    const again = review(newCardState(), 1, 0, NOW, RETENTION);
    expect(again.next.state).toBe("LEARNING");
    expect(again.next.learningStep).toBe(0);
    expect(again.next.stability).toBe(W[0]);
    expect(again.dueAt).toBe(NOW + MIN);
    expect(again.next.lapses).toBe(0);

    const hard = review(newCardState(), 2, 0, NOW, RETENTION);
    expect(hard.next.state).toBe("LEARNING");
    expect(hard.next.stability).toBe(W[1]);

    const good = review(newCardState(), 3, 0, NOW, RETENTION);
    expect(good.next.state).toBe("LEARNING");
    expect(good.next.learningStep).toBe(1);
    expect(good.next.stability).toBe(W[2]);
    expect(good.dueAt).toBe(NOW + 10 * MIN);

    // Easy tốt nghiệp ngay, bỏ qua các bước học còn lại.
    const easy = review(newCardState(), 4, 0, NOW, RETENTION);
    expect(easy.next.state).toBe("REVIEW");
    expect(easy.next.stability).toBe(W[3]);
    expect(easy.intervalDays).toBeGreaterThanOrEqual(1);

    for (const r of [again, hard, good, easy]) {
      expect(r.next.reps).toBe(1);
      expect(r.next.difficulty).toBeGreaterThanOrEqual(1);
      expect(r.next.difficulty).toBeLessThanOrEqual(10);
      expect(r.next.stability).toBeGreaterThan(0);
    }
  });

  it("chuỗi Good liên tiếp cho khoảng cách ôn tăng dần", () => {
    let state = newCardState();
    let elapsed = 0;
    const intervals: number[] = [];

    for (let i = 0; i < 8; i++) {
      const result = review(state, 3, elapsed, NOW, RETENTION);
      state = result.next;
      if (state.state === "REVIEW") {
        intervals.push(result.intervalDays);
        elapsed = result.intervalDays;
      } else {
        // Còn trong bước học: thời gian trôi qua tính bằng phút.
        elapsed = LEARNING_STEPS_MINUTES[state.learningStep] / 1440;
      }
    }

    expect(intervals.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
  });

  it("một lần quên làm stability giảm và đẩy thẻ về RELEARNING", () => {
    const m = mature();
    const result = review(m, 1, 30, NOW, RETENTION);

    expect(result.next.stability).toBeLessThan(m.stability);
    expect(result.next.stability).toBeGreaterThan(0);
    expect(result.next.state).toBe("RELEARNING");
    expect(result.next.lapses).toBe(1);
    expect(result.next.learningStep).toBe(0);
    expect(result.dueAt).toBe(NOW + 10 * MIN);
  });

  it("retrievability giảm theo thời gian và luôn nằm trong (0, 1]", () => {
    const stability = 10;
    let previous = Number.POSITIVE_INFINITY;

    for (const t of [0, 0.5, 1, 5, 10, 30, 100, 365, 3650]) {
      const r = retrievability(stability, t);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(r).toBeLessThan(previous);
      previous = r;
    }

    expect(retrievability(stability, 0)).toBe(1);
    // Đúng bằng stability thì R phải rơi về mức mục tiêu 90%.
    expect(retrievability(stability, stability)).toBeCloseTo(0.9, 9);
    // Không được chia cho 0 khi thẻ chưa có stability.
    const r0 = retrievability(0, 5);
    expect(r0).toBeGreaterThan(0);
    expect(r0).toBeLessThanOrEqual(1);
  });

  it("Hard cho khoảng cách ngắn hơn Good, Easy dài hơn Good", () => {
    const m = mature();
    const hard = review(m, 2, 30, NOW, RETENTION).intervalDays;
    const good = review(m, 3, 30, NOW, RETENTION).intervalDays;
    const easy = review(m, 4, 30, NOW, RETENTION).intervalDays;

    expect(hard).toBeLessThan(good);
    expect(easy).toBeGreaterThan(good);
  });

  it("difficulty luôn nằm trong [1, 10] qua chuỗi chấm ngẫu nhiên dài", () => {
    const random = mulberry32(20260907);
    let state = newCardState();
    let elapsed = 0;

    for (let i = 0; i < 5000; i++) {
      const grade = 1 + Math.floor(random() * 4);
      const result = review(state, grade, elapsed, NOW, RETENTION);
      state = result.next;

      expect(state.difficulty).toBeGreaterThanOrEqual(1);
      expect(state.difficulty).toBeLessThanOrEqual(10);
      expect(state.stability).toBeGreaterThan(0);
      expect(result.intervalDays).toBeGreaterThanOrEqual(0);
      expect(result.intervalDays).toBeLessThanOrEqual(36500);

      elapsed = result.intervalDays > 0 ? result.intervalDays : 10 / 1440;
    }

    // Chấm Again liên tục phải đẩy D lên sát trần nhưng không vượt.
    let hardest = newCardState();
    for (let i = 0; i < 200; i++) hardest = review(hardest, 1, 1, NOW, RETENTION).next;
    expect(hardest.difficulty).toBeLessThanOrEqual(10);
    expect(hardest.difficulty).toBeGreaterThan(9);

    // Chấm Easy liên tục phải kéo D xuống sát sàn nhưng không thủng.
    let easiest = newCardState();
    for (let i = 0; i < 200; i++) easiest = review(easiest, 4, 1, NOW, RETENTION).next;
    expect(easiest.difficulty).toBeGreaterThanOrEqual(1);
    expect(easiest.difficulty).toBeLessThan(2);
  });

  it("quy điểm nét viết sang grade đúng các ngưỡng 48/70/88", () => {
    expect(gradeFromScore(0, false)).toBe(1);
    expect(gradeFromScore(47, false)).toBe(1);
    expect(gradeFromScore(48, false)).toBe(2);
    expect(gradeFromScore(69, false)).toBe(2);
    expect(gradeFromScore(70, false)).toBe(3);
    expect(gradeFromScore(87, false)).toBe(3);
    expect(gradeFromScore(88, false)).toBe(4);
    expect(gradeFromScore(100, false)).toBe(4);

    // Một nét hỏng là đủ để coi như quên, bất kể điểm trung bình.
    expect(gradeFromScore(100, true)).toBe(1);
    expect(gradeFromScore(95, true)).toBe(1);
  });

  it("khoảng cách ôn nhất quán với định nghĩa của stability", () => {
    // Với mức nhớ mục tiêu 90%, khoảng cách đúng bằng stability theo định nghĩa của FSRS.
    expect(intervalDays(10, 0.9)).toBe(10);
    expect(intervalDays(45, 0.9)).toBe(45);

    // Muốn nhớ chắc hơn thì phải ôn dày hơn.
    expect(intervalDays(30, 0.95)).toBeLessThan(intervalDays(30, 0.9));
    // Khoảng cách tối thiểu là 1 ngày, kể cả khi stability rất nhỏ.
    expect(intervalDays(0.001, 0.9)).toBe(1);
    expect(intervalDays(1e9, 0.9)).toBe(36500);
  });

  it("grade ngoài khoảng 1..4 bị từ chối", () => {
    expect(() => review(newCardState(), 0, 0, NOW, RETENTION)).toThrow(RangeError);
    expect(() => review(newCardState(), 5, 0, NOW, RETENTION)).toThrow(RangeError);
    expect(() => review(newCardState(), 2.5, 0, NOW, RETENTION)).toThrow(RangeError);
  });

  it("thẻ RELEARNING quay lại REVIEW sau khi trả lời Good ở mốc cuối", () => {
    const relearning: FsrsState = { stability: 2.5, difficulty: 6, state: "RELEARNING", learningStep: 0, reps: 6, lapses: 1 };

    const result = review(relearning, 3, 10 / 1440, NOW, RETENTION);
    expect(result.next.state).toBe("REVIEW");
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
    // Trả lời đúng trong lúc học lại không được tính thêm lapse.
    expect(result.next.lapses).toBe(1);

    const againAgain = review(relearning, 1, 10 / 1440, NOW, RETENTION);
    expect(againAgain.next.state).toBe("RELEARNING");
    expect(againAgain.next.lapses).toBe(1);
  });
});
