import { describe, expect, it } from "vitest";
import { detectInstallContext, type InstallEnv } from "./pwa";

const env = (over: Partial<InstallEnv>): InstallEnv => ({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130", platform: "Win32", maxTouchPoints: 0,
  standaloneMedia: false, navigatorStandalone: false, ...over,
});

describe("detectInstallContext", () => {
  it("đang chạy như app đã cài (mọi nền tảng)", () => {
    expect(detectInstallContext(env({ standaloneMedia: true }))).toBe("installed");
    expect(detectInstallContext(env({ userAgent: "iPhone", navigatorStandalone: true }))).toBe("installed");
  });

  it("iPhone, iPad và iPadOS (giả làm Mac) chưa cài → hướng dẫn thủ công", () => {
    expect(detectInstallContext(env({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }))).toBe("ios");
    expect(detectInstallContext(env({ userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" }))).toBe("ios");
    expect(detectInstallContext(env({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5 }))).toBe("ios");
  });

  it("Mac thật (không cảm ứng), Windows, Android → other", () => {
    expect(detectInstallContext(env({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 0 }))).toBe("other");
    expect(detectInstallContext(env({}))).toBe("other");
    expect(detectInstallContext(env({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile", platform: "Linux armv81", maxTouchPoints: 5 }))).toBe("other");
  });
});
