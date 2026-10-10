import { describe, expect, it } from "vitest";
import {
  SOUND_THEMES,
  effectVolume,
  playKeySound,
  playMissSound,
  playSentenceCompleteSound,
  playStreakMilestoneSound,
  streakMilestoneCrossed,
  type SoundTheme,
} from "./sound";

describe("effectVolume", () => {
  it("tắt tiếng thì mọi hiệu ứng câm hẳn, dù âm lượng đã chọn vẫn còn", () => {
    // Nút tắt tiếng chỉ đổi soundTheme; soundVolume giữ nguyên 0.6 — tiếng gõ sai/hết câu/mốc combo trước đây vẫn kêu.
    expect(effectVolume("off", 0.6)).toBe(0);
    expect(effectVolume("off", 1)).toBe(0);
  });

  it("các kiểu khác giữ âm lượng đã chọn, kẹp trong 0–1", () => {
    for (const t of ["thock", "clicky", "typewriter", "arcade"] as const) expect(effectVolume(t, 0.4)).toBe(0.4);
    expect(effectVolume("thock", 3)).toBe(1);
    expect(effectVolume("thock", -1)).toBe(0);
  });
});

describe("streakMilestoneCrossed", () => {
  it("gõ từng phím: đúng các mốc 10, 25, 50, 100 rồi mỗi 50", () => {
    const hits: number[] = [];
    for (let s = 1; s <= 260; s++) {
      const m = streakMilestoneCrossed(s - 1, s);
      if (m !== null) hits.push(m);
    }
    expect(hits).toEqual([10, 25, 50, 100, 150, 200, 250]);
  });

  it("IME chốt nhiều chữ một lần vẫn không lỡ mốc nằm giữa", () => {
    expect(streakMilestoneCrossed(8, 12)).toBe(10);
    expect(streakMilestoneCrossed(23, 30)).toBe(25);
    expect(streakMilestoneCrossed(97, 104)).toBe(100);
    expect(streakMilestoneCrossed(148, 153)).toBe(150);
  });

  it("không vượt mốc nào, hoặc chuỗi không tăng, thì null", () => {
    expect(streakMilestoneCrossed(11, 20)).toBeNull();
    expect(streakMilestoneCrossed(101, 149)).toBeNull();
    expect(streakMilestoneCrossed(10, 10)).toBeNull();
    expect(streakMilestoneCrossed(30, 0)).toBeNull();
  });
});

describe("sound module", () => {
  it("exports valid sound themes", () => {
    expect(SOUND_THEMES.length).toBe(5);
    const themeValues = SOUND_THEMES.map((t) => t.value);
    expect(themeValues).toContain("thock");
    expect(themeValues).toContain("clicky");
    expect(themeValues).toContain("typewriter");
    expect(themeValues).toContain("arcade");
    expect(themeValues).toContain("off");
  });

  it("does not crash when calling audio functions in non-browser or muted environments", () => {
    // Calling with "off" or 0 volume should safely no-op
    expect(() => playKeySound("off", 0.5)).not.toThrow();
    expect(() => playKeySound("thock", 0)).not.toThrow();
    expect(() => playMissSound(0)).not.toThrow();
    expect(() => playSentenceCompleteSound(0)).not.toThrow();
    expect(() => playStreakMilestoneSound(10, 0)).not.toThrow();
  });

  it("handles sound theme calls safely without throwing", () => {
    const themes: SoundTheme[] = ["thock", "clicky", "typewriter", "arcade", "off"];
    for (const theme of themes) {
      expect(() => playKeySound(theme, 0.5)).not.toThrow();
    }
    expect(() => playMissSound(0.5)).not.toThrow();
    expect(() => playSentenceCompleteSound(0.5)).not.toThrow();
    expect(() => playStreakMilestoneSound(25, 0.5)).not.toThrow();
  });
});
