import { describe, expect, it } from "vitest";
import { DEFAULT_CONTEXT, catalogFromDecks } from "../learning/context";
import { buildQueue } from "../learning/reviews";
import { emptyState } from "../learning/state";
import { PRESETS, applyPreset, findPreset } from "./presets";
import { MODULE_IDS, emptySpace, learnContextOf, spaceSchema } from "./space";

describe("điểm xuất phát", () => {
  it("mọi preset cho ra không gian hợp lệ, đã dựng, có home và settings", () => {
    for (const p of PRESETS) {
      const s = applyPreset(emptySpace(), p.id, "  Vũ ");
      expect(spaceSchema.safeParse(s).success).toBe(true);
      expect(s.onboarded).toBe(true);
      expect(s.profile.name).toBe("Vũ");
      expect(s.modules[0]).toBe("home");
      expect(s.modules.at(-1)).toBe("settings");
    }
  });

  it("'Học đầy đủ' = cấu hình mặc định của site từ trước tới nay", () => {
    const s = applyPreset(emptySpace(), "full", "");
    expect(s.modules).toEqual([...MODULE_IDS]);
    expect(learnContextOf(s).study).toEqual(DEFAULT_CONTEXT.study);
  });

  it("'Chỉ tập viết kana' bỏ từ vựng khỏi hàng ôn nhưng vẫn ôn kana", () => {
    const s = applyPreset(emptySpace(), "kana", "");
    expect(s.modules).toEqual(["home", "writing", "review", "settings"]);
    const q = buildQueue(emptyState(), { limit: 100 }, { now: Date.parse("2026-09-07T03:00:00Z"), zone: "Asia/Ho_Chi_Minh" }, learnContextOf(s));
    expect(q.content.every((c) => c.itemType.startsWith("KANA"))).toBe(true);
    expect(q.newCount).toBeGreaterThan(0);
  });

  it("'Tự soạn từ trang trắng' bắt đầu với hàng ôn trống, và có thẻ ngay khi người học soạn bộ thẻ đầu tiên", () => {
    const s = applyPreset(emptySpace(), "mine", "");
    const clock = { now: Date.parse("2026-09-07T03:00:00Z"), zone: "Asia/Ho_Chi_Minh" };
    expect(buildQueue(emptyState(), { limit: 50 }, clock, learnContextOf(s)).content).toEqual([]);

    const ctx = { ...learnContextOf(s), catalog: catalogFromDecks([{ id: "d", active: true, reverse: false, cards: [{ id: "c1", front: "水", back: "nước", hint: "" }] }]) };
    expect(buildQueue(emptyState(), { limit: 50 }, clock, ctx).content.map((c) => c.cardKey)).toEqual(["VOCAB_MEANING:u:c1"]);
  });

  it("id lạ rơi về preset đầu tiên", () => {
    expect(findPreset("zzz" as never).id).toBe("full");
  });
});
