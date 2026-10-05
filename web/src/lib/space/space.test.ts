import { describe, expect, it } from "vitest";
import {
  LIMITS, SPACE_VERSION, SpaceError, completeOnboarding, emptySpace, normalizeModules, parseSpace, setModules,
  setProfile, setStudy, setWidgets, spaceSchema, type Env,
} from "./space";

/** Mã tăng dần: xác định, không đụng nhau. */
const env = (now = 1_000): Env => {
  let n = 0;
  return { now, id: () => `id${String(++n).padStart(4, "0")}` };
};

describe("không gian riêng — mặc định", () => {
  it("người mới: đủ mọi công cụ, chưa dựng, cách học y như site từ trước tới nay", () => {
    const s = emptySpace(5);
    expect(s).toMatchObject({ version: SPACE_VERSION, createdAt: 5, onboarded: false });
    expect(s.modules).toEqual(["home", "review", "writing", "library", "typing", "vocab", "quiz", "settings"]);
    expect(s.study).toMatchObject({ newCardsPerDay: 10, sessionSize: 30, desiredRetention: 0.9, vocab: true, decks: true });
    expect(s.library).toEqual({ notes: [], decks: [], texts: [] });
  });

  it("không gian mặc định tự qua được schema (không có trường nào lệch)", () => {
    expect(spaceSchema.safeParse(emptySpace()).success).toBe(true);
  });
});

describe("mô-đun", () => {
  it("home luôn đứng đầu, settings luôn đứng cuối, bỏ trùng", () => {
    expect(normalizeModules(["quiz", "settings", "typing", "quiz", "home"])).toEqual(["home", "quiz", "typing", "settings"]);
    expect(normalizeModules([])).toEqual(["home", "settings"]);
  });

  it("tắt hết công cụ vẫn còn đường quay về Cài đặt", () => {
    expect(setModules(emptySpace(), []).modules).toEqual(["home", "settings"]);
  });

  it("bỏ qua mã mô-đun lạ", () => {
    expect(setModules(emptySpace(), ["review", "bogus" as never]).modules).toEqual(["home", "review", "settings"]);
  });
});

describe("cách học", () => {
  it("kẹp mọi con số vào khoảng cho phép", () => {
    const s = setStudy(emptySpace(), { newCardsPerDay: 9999, sessionSize: -4, desiredRetention: 2 });
    expect(s.study.newCardsPerDay).toBe(100);
    expect(s.study.sessionSize).toBe(5);
    expect(s.study.desiredRetention).toBe(0.97);
    expect(setStudy(emptySpace(), { desiredRetention: 0.1 }).study.desiredRetention).toBe(0.7);
  });

  it("0 thẻ mới/ngày là hợp lệ: chỉ ôn lại", () => {
    expect(setStudy(emptySpace(), { newCardsPerDay: 0 }).study.newCardsPerDay).toBe(0);
  });

  it("chỉ đổi trường được nêu, giữ nguyên phần còn lại", () => {
    const base = emptySpace();
    const s = setStudy(base, { kanaScripts: ["h"] });
    expect(s.study.kanaScripts).toEqual(["h"]);
    expect(s.study.kanaGroups).toEqual(base.study.kanaGroups);
    expect(s.study.newCardsPerDay).toBe(10);
  });
});

describe("hồ sơ và widget", () => {
  it("cắt khoảng trắng và độ dài; chỉ đổi trường được nêu", () => {
    const s = setProfile(emptySpace(), { name: `  ${"a".repeat(100)}  `, goal: "  N5 trong 6 tháng " });
    expect(s.profile.name).toHaveLength(LIMITS.name);
    expect(s.profile.goal).toBe("N5 trong 6 tháng");
    expect(setProfile(s, { name: "Vũ" }).profile).toEqual({ name: "Vũ", goal: "N5 trong 6 tháng" });
  });

  it("widget: bỏ trùng và mã lạ, giữ thứ tự người học chọn", () => {
    const s = setWidgets(emptySpace(), ["badges", "today", "badges", "zzz" as never]);
    expect(s.home.widgets).toEqual(["badges", "today"]);
  });

  it("completeOnboarding không tạo đối tượng mới nếu đã xong", () => {
    const done = completeOnboarding(emptySpace());
    expect(done.onboarded).toBe(true);
    expect(completeOnboarding(done)).toBe(done);
  });
});

describe("đọc tệp không gian", () => {
  it("vòng JSON giữ nguyên", () => {
    const s = setProfile(emptySpace(7), { name: "Vũ" });
    const r = parseSpace(JSON.stringify(s));
    expect(r.ok && r.space).toEqual(s);
  });

  it("chuẩn hoá khi đọc: tệp sửa tay thiếu home/settings vẫn ra điều hướng hợp lệ", () => {
    const raw = { ...emptySpace(), modules: ["quiz", "quiz"] };
    const r = parseSpace(JSON.stringify(raw));
    expect(r.ok && r.space.modules).toEqual(["home", "quiz", "settings"]);
  });

  it("từ chối JSON hỏng, sai hình dạng, và phiên bản mới hơn (không đoán)", () => {
    expect(parseSpace("{")).toMatchObject({ ok: false, error: expect.stringContaining("JSON") });
    expect(parseSpace("{}")).toMatchObject({ ok: false });
    const newer = parseSpace(JSON.stringify({ ...emptySpace(), version: SPACE_VERSION + 1 }));
    expect(newer).toMatchObject({ ok: false, error: expect.stringContaining("mới hơn") });
  });

  it("từ chối giá trị ngoài khoảng (retention 5, mã ghi chú có ký tự lạ)", () => {
    const bad = { ...emptySpace(), study: { ...emptySpace().study, desiredRetention: 5 } };
    expect(parseSpace(JSON.stringify(bad)).ok).toBe(false);
    const badId = { ...emptySpace(), library: { notes: [{ id: "A B", title: "", body: "", pinned: false, createdAt: 0, updatedAt: 0 }], decks: [], texts: [] } };
    expect(parseSpace(JSON.stringify(badId)).ok).toBe(false);
  });
});

describe("SpaceError", () => {
  it("là Error thường để kho phân biệt với lỗi lập trình", () => {
    expect(new SpaceError("x")).toBeInstanceOf(Error);
    expect(env().id()).toBe("id0001");
  });
});
