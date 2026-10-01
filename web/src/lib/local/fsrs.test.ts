import { describe, expect, it } from "vitest";
import {
  gradeFromScore, intervalDays, LEARNING_STEPS_MINUTES, newCardState, retrievability, review, W,
  type FsrsState,
} from "./fsrs";

// Port của backend/src/test/.../srs/FsrsEngineTest.java — hai bản phải cho cùng kết quả.
const NOW = new Date("2026-09-07T10:00:00Z");
const RETENTION = 0.9;
const mature = (): FsrsState => ({ stability: 30, difficulty: 5, state: "REVIEW", learningStep: 0, reps: 5, lapses: 0 });

describe("FSRS-6 (port của FsrsEngine.java)", () => {
  it("thẻ mới với từng grade cho trạng thái và lịch đúng", () => {
    const again = review(newCardState(), 1, 0, NOW, RETENTION);
    expect(again.next.state).toBe("LEARNING");
    expect(again.next.learningStep).toBe(0);
    expect(again.next.stability).toBe(W[0]);
    expect(again.dueAt.getTime()).toBe(NOW.getTime() + 60_000);
    expect(again.next.lapses).toBe(0);

    const hard = review(newCardState(), 2, 0, NOW, RETENTION);
    expect(hard.next.state).toBe("LEARNING");
    expect(hard.next.stability).toBe(W[1]);

    const good = review(newCardState(), 3, 0, NOW, RETENTION);
    expect(good.next.state).toBe("LEARNING");
    expect(good.next.learningStep).toBe(1);
    expect(good.next.stability).toBe(W[2]);
    expect(good.dueAt.getTime()).toBe(NOW.getTime() + 600_000);

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
    expect(result.dueAt.getTime()).toBe(NOW.getTime() + 600_000);
  });

  it("retrievability giảm theo thời gian và luôn nằm trong (0, 1]", () => {
    let previous = Number.MAX_VALUE;
    for (const t of [0, 0.5, 1, 5, 10, 30, 100, 365, 3650]) {
      const r = retrievability(10, t);
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(r).toBeLessThan(previous);
      previous = r;
    }
    expect(retrievability(10, 0)).toBe(1);
    // Đúng bằng stability thì R phải rơi về mức mục tiêu 90%.
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 9);
    // Không được chia cho 0 khi thẻ chưa có stability.
    const r0 = retrievability(0, 5);
    expect(r0).toBeGreaterThan(0);
    expect(r0).toBeLessThanOrEqual(1);
  });

  it("Hard ngắn hơn Good, Easy dài hơn Good", () => {
    const hard = review(mature(), 2, 30, NOW, RETENTION).intervalDays;
    const good = review(mature(), 3, 30, NOW, RETENTION).intervalDays;
    const easy = review(mature(), 4, 30, NOW, RETENTION).intervalDays;
    expect(hard).toBeLessThan(good);
    expect(easy).toBeGreaterThan(good);
  });

  it("difficulty luôn nằm trong [1, 10] qua chuỗi chấm ngẫu nhiên dài", () => {
    let seed = 20260907;
    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    let state = newCardState();
    let elapsed = 0;
    for (let i = 0; i < 5000; i++) {
      const grade = 1 + Math.floor(rand() * 4);
      const result = review(state, grade, elapsed, NOW, RETENTION);
      state = result.next;
      expect(state.difficulty).toBeGreaterThanOrEqual(1);
      expect(state.difficulty).toBeLessThanOrEqual(10);
      expect(state.stability).toBeGreaterThan(0);
      expect(result.intervalDays).toBeGreaterThanOrEqual(0);
      expect(result.intervalDays).toBeLessThanOrEqual(36500);
      elapsed = result.intervalDays > 0 ? result.intervalDays : 10 / 1440;
    }

    let hardest = newCardState();
    for (let i = 0; i < 200; i++) hardest = review(hardest, 1, 1, NOW, RETENTION).next;
    expect(hardest.difficulty).toBeLessThanOrEqual(10);
    expect(hardest.difficulty).toBeGreaterThan(9);

    let easiest = newCardState();
    for (let i = 0; i < 200; i++) easiest = review(easiest, 4, 1, NOW, RETENTION).next;
    expect(easiest.difficulty).toBeGreaterThanOrEqual(1);
    expect(easiest.difficulty).toBeLessThan(2);
  });

  it("điểm nét viết quy sang grade đúng các ngưỡng 48/70/88", () => {
    expect([0, 47, 48, 69, 70, 87, 88, 100].map((s) => gradeFromScore(s, false)))
      .toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    // Một nét hỏng là đủ để coi như quên, bất kể điểm trung bình.
    expect(gradeFromScore(100, true)).toBe(1);
    expect(gradeFromScore(95, true)).toBe(1);
  });

  it("khoảng cách ôn nhất quán với định nghĩa của stability", () => {
    expect(intervalDays(10, 0.9)).toBe(10);
    expect(intervalDays(45, 0.9)).toBe(45);
    expect(intervalDays(30, 0.95)).toBeLessThan(intervalDays(30, 0.9));
    expect(intervalDays(0.001, 0.9)).toBe(1);
    expect(intervalDays(1e9, 0.9)).toBe(36500);
  });

  it("grade ngoài khoảng 1..4 bị từ chối", () => {
    expect(() => review(newCardState(), 0, 0, NOW, RETENTION)).toThrow();
    expect(() => review(newCardState(), 5, 0, NOW, RETENTION)).toThrow();
  });

  it("thẻ RELEARNING quay lại REVIEW sau khi trả lời Good ở mốc cuối", () => {
    const relearning: FsrsState = { stability: 2.5, difficulty: 6, state: "RELEARNING", learningStep: 0, reps: 6, lapses: 1 };
    const ok = review(relearning, 3, 10 / 1440, NOW, RETENTION);
    expect(ok.next.state).toBe("REVIEW");
    expect(ok.intervalDays).toBeGreaterThanOrEqual(1);
    expect(ok.next.lapses).toBe(1);

    const again = review(relearning, 1, 10 / 1440, NOW, RETENTION);
    expect(again.next.state).toBe("RELEARNING");
    expect(again.next.lapses).toBe(1);
  });
});
