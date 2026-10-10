import { describe, expect, it } from "vitest";
// Chính hàm Next dùng để quyết định chặn hay cho qua một origin khi dev (router-utils/block-cross-site.js).
import csrf from "next/dist/server/app-render/csrf-protection.js";
import nextConfig from "./next.config.mjs";

const { isCsrfOriginAllowed } = csrf;
const allowed = (host) => isCsrfOriginAllowed(host, nextConfig.allowedDevOrigins);

describe("allowedDevOrigins", () => {
  it("điện thoại trong mọi dải IP LAN riêng mở được bản dev", () => {
    // "192.168.*" cũ không khớp: Next so từ phải sang, mỗi `*` một đoạn → 403 và mất HMR trên điện thoại.
    for (const host of ["192.168.1.127", "192.168.0.5", "10.0.0.7", "10.20.30.40", "172.16.0.9", "172.20.1.1", "172.31.255.1"]) {
      expect(allowed(host), host).toBe(true);
    }
  });

  it("không mở cho máy ngoài dải LAN riêng", () => {
    for (const host of ["172.15.0.1", "172.32.0.1", "8.8.8.8", "example.com", "192.168.1.5.evil.com"]) {
      expect(allowed(host), host).toBe(false);
    }
  });
});
