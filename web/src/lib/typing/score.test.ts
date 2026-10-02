import { describe, expect, it } from "vitest";
import { BELTS, accuracy, beltFor, formatDuration, kpm, nextBelt, typingScore } from "./score";

describe("chỉ số tốc độ", () => {
  it("KPM là phím đúng trên phút", () => {
    expect(kpm(150, 60_000)).toBe(150);
    expect(kpm(100, 30_000)).toBe(200);
    expect(kpm(10, 0)).toBe(0);
  });

  it("độ chính xác; chưa gõ gì coi như tuyệt đối", () => {
    expect(accuracy(90, 10)).toBeCloseTo(0.9);
    expect(accuracy(0, 0)).toBe(1);
    expect(accuracy(0, 5)).toBe(0);
  });
});

describe("typingScore", () => {
  it("KPM × chính xác³", () => {
    expect(typingScore("PASSAGE", 200, 0, 60_000)).toBe(200);
    // 90% chính xác chỉ còn 72.9% điểm
    expect(typingScore("TIME_ATTACK", 180, 20, 60_000)).toBe(Math.round(180 * 0.9 ** 3));
    expect(typingScore("PASSAGE", 0, 0, 60_000)).toBe(0);
  });

  it("chế độ sinh tử tính số phím đúng liên tiếp", () => {
    expect(typingScore("SUDDEN_DEATH", 87, 1, 30_000)).toBe(87);
  });
});

describe("đai xếp hạng", () => {
  it("mốc tăng dần và bắt đầu từ 0", () => {
    expect(BELTS[0].min).toBe(0);
    for (let i = 1; i < BELTS.length; i++) expect(BELTS[i].min).toBeGreaterThan(BELTS[i - 1].min);
  });

  it("chọn đai cao nhất đã đạt", () => {
    expect(beltFor(0).ja).toBe("白帯");
    expect(beltFor(59).ja).toBe("白帯");
    expect(beltFor(60).ja).toBe("黄帯");
    expect(beltFor(260).ja).toBe("黒帯");
    expect(beltFor(9999).ja).toBe("名人");
    expect(nextBelt(61)?.ja).toBe("緑帯");
    expect(nextBelt(9999)).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it("dưới một phút hiện giây, trên một phút hiện m:ss.s", () => {
    expect(formatDuration(8_400)).toBe("8.4s");
    expect(formatDuration(65_300)).toBe("1:05.3");
  });
});
