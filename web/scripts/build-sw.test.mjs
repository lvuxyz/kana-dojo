import { describe, expect, it } from "vitest";
import { buildPrecache, fileToUrl, isPrecached, renderSw } from "./build-sw.mjs";

const read = (map) => (file) => Buffer.from(map[file] ?? "");

describe("fileToUrl", () => {
  it("ánh xạ tệp của Next export về URL trình duyệt yêu cầu", () => {
    expect(fileToUrl("index.html")).toBe("/");
    expect(fileToUrl("luyen-viet.html")).toBe("/luyen-viet");
    expect(fileToUrl("quiz/1.html")).toBe("/quiz/1");
    expect(fileToUrl("bang-chu-cai/hiragana.html")).toBe("/bang-chu-cai/hiragana");
    // payload RSC mà Next prefetch cho điều hướng phía client
    expect(fileToUrl("luyen-viet.txt")).toBe("/luyen-viet.txt");
    expect(fileToUrl("index.txt")).toBe("/index.txt");
    expect(fileToUrl("_next/static/chunks/a-1.js")).toBe("/_next/static/chunks/a-1.js");
    expect(fileToUrl("icons/icon-192.png")).toBe("/icons/icon-192.png");
  });

  it("mã hoá [ ] đúng dạng trình duyệt yêu cầu; ( ) giữ nguyên", () => {
    // Next ghi vào HTML: /_next/static/chunks/app/(app)/quiz/%5Bid%5D/page-<hash>.js
    expect(fileToUrl("_next/static/chunks/app/(app)/quiz/[id]/page-abc.js")).toBe(
      "/_next/static/chunks/app/(app)/quiz/%5Bid%5D/page-abc.js",
    );
    expect(fileToUrl("bang-chu-cai/[script]/x.js")).toBe("/bang-chu-cai/%5Bscript%5D/x.js");
  });
});

describe("precache", () => {
  it("loại 404.html (Nginx chỉ phục vụ nội bộ), sw.js, source map, robots, sitemap", () => {
    for (const f of ["404.html", "sw.js", "x/y.js.map", "robots.txt", "sitemap.xml", ".gitkeep"]) {
      expect(isPrecached(f), f).toBe(false);
    }
    for (const f of ["index.html", "luyen-viet.html", "_next/static/css/a.css", "manifest.webmanifest", "icons/icon-512.png"]) {
      expect(isPrecached(f), f).toBe(true);
    }
  });

  it("danh sách URL được sắp xếp và không chứa tệp bị loại", () => {
    const files = ["luyen-viet.html", "404.html", "index.html", "sw.js", "_next/static/a.js", "a.js.map"];
    const { urls } = buildPrecache(files, read({}));
    expect(urls).toEqual(["/", "/_next/static/a.js", "/luyen-viet"]);
  });

  it("mã phiên bản ổn định với cùng nội dung và đổi khi NỘI DUNG đổi (kể cả khi tên tệp giữ nguyên)", () => {
    const files = ["index.html", "luyen-viet.html"];
    const a = buildPrecache(files, read({ "index.html": "v1" })).version;
    const same = buildPrecache([...files].reverse(), read({ "index.html": "v1" })).version;
    const changed = buildPrecache(files, read({ "index.html": "v2" })).version;
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(same).toBe(a);
    expect(changed).not.toBe(a);
  });

  it("renderSw điền đủ chỗ trống và để mỗi URL trên một dòng (smoke test đọc lại theo dòng)", () => {
    const tpl = 'const VERSION = "__VERSION__";\nconst PRECACHE = __PRECACHE__;\n';
    const out = renderSw(tpl, "abc123", ["/", "/quiz/1"]);
    expect(out).not.toContain("__");
    expect(out).toContain('"abc123"');
    expect(out).toContain('\n  "/",\n  "/quiz/1",\n');
  });
});
