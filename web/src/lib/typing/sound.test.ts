import { describe, expect, it } from "vitest";
import {
  SOUND_THEMES,
  playKeySound,
  playMissSound,
  playSentenceCompleteSound,
  playStreakMilestoneSound,
  type SoundTheme,
} from "./sound";

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
