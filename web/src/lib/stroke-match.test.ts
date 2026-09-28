import { describe, expect, it } from "vitest";
import {
  PASS_THRESHOLD,
  dirText,
  dist,
  gradeFromScore,
  polyLen,
  posText,
  resample,
  scoreStroke,
  type Pt,
} from "./stroke-match";

/** Chia đoạn a→b thành `n` điểm, tuỳ chọn dồn mật độ về đầu nét (người vẽ chậm lúc đặt bút). */
function line(a: Pt, b: Pt, n: number, clustered = false): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = clustered ? (i / (n - 1)) ** 3 : i / (n - 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

// Nét ngang mẫu trong hệ 109×109 của KanjiVG.
const START: Pt = { x: 20, y: 50 };
const END: Pt = { x: 90, y: 50 };
const TARGET = line(START, END, 2);
const TARGET_LEN = polyLen(TARGET);

describe("resample", () => {
  it("trả đúng n điểm, giữ nguyên hai đầu nét", () => {
    const out = resample(line(START, END, 7), 24);
    expect(out).toHaveLength(24);
    expect(out[0]).toEqual(START);
    expect(out[23].x).toBeCloseTo(END.x);
    expect(out[23].y).toBeCloseTo(END.y);
  });

  it("các điểm cách đều theo độ dài cung, kể cả qua góc gấp", () => {
    const lShape: Pt[] = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 30 }];
    const out = resample(lShape, 7); // tổng dài 60 → mỗi bước 10
    for (let i = 1; i < out.length; i++) {
      expect(dist(out[i - 1], out[i])).toBeLessThanOrEqual(10 + 1e-9);
    }
    expect(out[3]).toEqual({ x: 30, y: 0 }); // đúng tại góc gấp
  });

  it("không phụ thuộc mật độ điểm hay tốc độ vẽ", () => {
    const sparse = resample(line(START, END, 2), 24);
    const clustered = resample(line(START, END, 60, true), 24);
    clustered.forEach((p, i) => {
      expect(p.x).toBeCloseTo(sparse[i].x, 6);
      expect(p.y).toBeCloseTo(sparse[i].y, 6);
    });
  });

  it("xử lý đầu vào suy biến mà không ném lỗi", () => {
    expect(resample([], 5)).toEqual([]);
    expect(resample([START], 3)).toEqual([START, START, START]);
    expect(resample([START, START], 3)).toEqual([START, START, START]);
  });
});

describe("scoreStroke", () => {
  it("nét trùng khít được 100 điểm, không lỗi", () => {
    const s = scoreStroke(line(START, END, 30), TARGET, TARGET_LEN);
    expect(s.score).toBe(100);
    expect(s.reason).toBeNull();
    expect(s.reversed).toBe(false);
  });

  it("vẽ nhanh hay chậm cho cùng điểm", () => {
    const fast = scoreStroke(line(START, END, 4), TARGET, TARGET_LEN);
    const slow = scoreStroke(line(START, END, 80, true), TARGET, TARGET_LEN);
    expect(slow.score).toBe(fast.score);
  });

  it("nét ngược chiều bị phạt nặng thay vì được tính như nét xuôi", () => {
    const s = scoreStroke(line(END, START, 30), TARGET, TARGET_LEN);
    expect(s.reversed).toBe(true);
    expect(s.reason).toBe("REVERSED");
    expect(s.score).toBeLessThan(PASS_THRESHOLD.test);
  });

  it("nét quá ngắn và quá dài được chẩn đoán đúng", () => {
    const short = scoreStroke(line(START, { x: 45, y: 50 }, 10), TARGET, TARGET_LEN);
    expect(short.reason).toBe("TOO_SHORT");
    expect(short.ratio).toBeLessThan(0.5);

    const long = scoreStroke(line(START, { x: 160, y: 50 }, 10), TARGET, TARGET_LEN);
    expect(long.reason).toBe("TOO_LONG");
    expect(long.ratio).toBeGreaterThan(1.9);
  });

  it("nét đúng hướng nhưng lệch vị trí là OFF_PATH", () => {
    const s = scoreStroke(line({ x: 20, y: 70 }, { x: 90, y: 70 }, 10), TARGET, TARGET_LEN);
    expect(s.reason).toBe("OFF_PATH");
    expect(s.dev).toBeCloseTo(20);
    expect(s.score).toBeLessThan(PASS_THRESHOLD.test);
  });

  it("run tay nhẹ vẫn đạt ngưỡng chế độ tô", () => {
    const wobbly = line(START, END, 15).map((p, i) => ({ x: p.x, y: p.y + (i % 2 ? 1.5 : -1.5) }));
    const s = scoreStroke(wobbly, TARGET, TARGET_LEN);
    expect(s.reason).toBeNull();
    expect(s.score).toBeGreaterThanOrEqual(PASS_THRESHOLD.trace);
    expect(s.score).toBeLessThan(100);
  });

  it("điểm luôn nằm trong 0–100", () => {
    const wild = scoreStroke(line({ x: 0, y: 0 }, { x: 109, y: 109 }, 5).reverse(), TARGET, TARGET_LEN);
    expect(wild.score).toBeGreaterThanOrEqual(0);
    expect(wild.score).toBeLessThanOrEqual(100);
  });
});

describe("gradeFromScore", () => {
  // Phải khớp tuyệt đối FsrsEngine.gradeFromScore bên backend (FsrsEngineTest khoá cùng các mốc).
  it.each([
    [0, 1], [47, 1], [48, 2], [69, 2], [70, 3], [87, 3], [88, 4], [100, 4],
  ] as const)("điểm %i → grade %i", (score, grade) => {
    expect(gradeFromScore(score, false)).toBe(grade);
  });

  it("có nét hỏng thì luôn là Again", () => {
    expect(gradeFromScore(100, true)).toBe(1);
  });
});

describe("gợi ý bằng lời", () => {
  it("dirText mô tả hướng nét", () => {
    expect(dirText(START, END)).toBe("từ trái sang phải");
    expect(dirText({ x: 50, y: 10 }, { x: 50, y: 90 })).toBe("từ trên xuống dưới");
    expect(dirText({ x: 80, y: 20 }, { x: 20, y: 80 })).toBe("chéo xuống bên trái");
  });

  it("posText mô tả vị trí trong ô, kể cả ô thứ hai của yōon", () => {
    expect(posText({ x: 10, y: 10 }, 109)).toBe("phía trên bên trái");
    expect(posText({ x: 54, y: 54 }, 109)).toBe("khoảng giữa");
    expect(posText({ x: 109 + 100, y: 100 }, 109)).toBe("phía dưới bên phải");
  });
});
