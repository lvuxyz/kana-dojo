// Chạy MÃ THẬT của scripts/sw.template.js trong một "service worker giả" ở Node: Cache API và fetch dựng tay.
// Lý do: trình duyệt nhúng khi phát triển không cho đăng ký service worker, và CI không có trình duyệt — nhưng logic
// "cái gì được phục vụ từ cache, khi nào đi mạng, khi nào dọn cache cũ" vẫn phải được khoá bằng test.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { renderSw } from "./build-sw.mjs";

const ORIGIN = "https://kana.test";
const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "sw.template.js"), "utf8");

/** Một Request giải tương đối theo ORIGIN như trong service worker thật (Node không có "base URL" mặc định). */
class Req extends Request {
  constructor(input, init) {
    super(typeof input === "string" ? new URL(input, ORIGIN).href : input, init);
  }
}

function makeCaches() {
  const stores = new Map();
  const norm = (input, ignoreSearch) => {
    const u = new URL(typeof input === "string" ? input : input.url, ORIGIN);
    if (ignoreSearch) u.search = "";
    return u.href;
  };
  const cacheFor = (store) => ({
    async addAll(requests) {
      const responses = await Promise.all(
        requests.map(async (r) => {
          const res = await globalThis.__fetch(r);
          if (!res.ok) throw new TypeError(`addAll: ${r.url} trả ${res.status}`);
          return [r, res];
        }),
      );
      for (const [r, res] of responses) store.set(norm(r, false), res);
    },
    async match(input, opts = {}) {
      const want = norm(input, opts.ignoreSearch);
      for (const [key, res] of store) if (norm(key, opts.ignoreSearch) === want) return res.clone();
      return undefined;
    },
    async keys() {
      return [...store.keys()].map((u) => new Req(u));
    },
  });
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      return cacheFor(stores.get(name));
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
}

/** Dựng service worker từ mẫu với `urls` và một "site" giả: đường dẫn → nội dung (thiếu = 404). */
function boot({ version = "v1", urls, site, caches = makeCaches(), offline = { value: false } }) {
  const listeners = {};
  const fetched = [];
  globalThis.__fetch = async (request) => {
    const req = request instanceof Request ? request : new Req(typeof request === "string" ? request : request.url);
    fetched.push({ url: req.url, cache: req.cache });
    if (offline.value) throw new TypeError("Failed to fetch");
    const body = site[new URL(req.url).pathname + new URL(req.url).search] ?? site[new URL(req.url).pathname];
    return body === undefined ? new Response("not found", { status: 404 }) : new Response(body, { status: 200 });
  };
  const self = { location: new URL(ORIGIN), addEventListener: (t, fn) => { listeners[t] = fn; }, clients: { claim: async () => {} } };
  const context = vm.createContext({ self, caches, Request: Req, Response, URL, fetch: (r) => globalThis.__fetch(r), Promise, console });
  vm.runInContext(renderSw(template, version, urls), context);

  const lifecycle = async (type) => {
    const pending = [];
    listeners[type]({ waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
  };
  /** Gửi một sự kiện fetch; trả về Response, hoặc "passthrough" nếu service worker không can thiệp. */
  const request = async (url, init = {}) => {
    const req = new Req(url, init);
    // `mode` của Request tạo tay luôn là "cors"; dựng đối tượng đủ dùng cho mã của service worker.
    const fake = { method: req.method, url: req.url, mode: init.navigate ? "navigate" : "no-cors", clone: () => req.clone() };
    let responded;
    listeners.fetch({ request: fake, respondWith: (p) => { responded = p; } });
    return responded === undefined ? "passthrough" : responded;
  };
  return { lifecycle, request, caches, fetched, offline };
}

const URLS = ["/", "/luyen-viet", "/quiz/1", "/luyen-viet.txt", "/_next/static/chunks/app/(app)/quiz/%5Bid%5D/page-abc.js", "/icons/icon-192.png"];
const SITE = Object.fromEntries(URLS.map((u) => [u, `body of ${u}`]));
const text = async (r) => (await r).text();

describe("service worker — cài đặt và dọn cache", () => {
  it("install tải sẵn mọi URL, bỏ qua cache HTTP (cache: reload)", async () => {
    const sw = boot({ urls: URLS, site: SITE });
    await sw.lifecycle("install");
    expect(sw.fetched.map((f) => new URL(f.url).pathname).sort()).toEqual([...URLS].sort());
    expect(sw.fetched.every((f) => f.cache === "reload")).toBe(true);
    expect(await sw.caches.keys()).toEqual(["kd-v1"]);
  });

  it("install THẤT BẠI nếu chỉ một URL trong danh sách không trả 200 (vì thế 404.html bị loại khỏi precache)", async () => {
    const sw = boot({ urls: [...URLS, "/404.html"], site: SITE });
    await expect(sw.lifecycle("install")).rejects.toThrow(/404/);
  });

  it("activate xoá cache kd-* của bản cũ, giữ bản hiện tại và cache không phải của mình", async () => {
    const caches = makeCaches();
    await caches.open("kd-old");
    await caches.open("other-lib-cache");
    const sw = boot({ version: "v2", urls: URLS, site: SITE, caches });
    await sw.lifecycle("install");
    await sw.lifecycle("activate");
    expect((await caches.keys()).sort()).toEqual(["kd-v2", "other-lib-cache"]);
  });
});

describe("service worker — phục vụ từ cache", () => {
  async function installed(opts = {}) {
    const sw = boot({ urls: URLS, site: SITE, ...opts });
    await sw.lifecycle("install");
    sw.fetched.length = 0;
    return sw;
  }

  it("trang, payload RSC và chunk có [id] (dạng %5Bid%5D) đều phục vụ từ cache, không đi mạng", async () => {
    const sw = await installed();
    expect(await text(sw.request("/luyen-viet", { navigate: true }))).toBe("body of /luyen-viet");
    expect(await text(sw.request("/luyen-viet?c=%E3%81%82", { navigate: true }))).toBe("body of /luyen-viet");   // ?c=あ
    expect(await text(sw.request("/luyen-viet/", { navigate: true }))).toBe("body of /luyen-viet");              // dấu / cuối
    expect(await text(sw.request("/luyen-viet.txt?_rsc=1abc"))).toBe("body of /luyen-viet.txt");                 // RSC prefetch
    expect(await text(sw.request("/_next/static/chunks/app/(app)/quiz/%5Bid%5D/page-abc.js"))).toContain("page-abc.js");
    expect(await text(sw.request("/"))).toBe("body of /");
    expect(sw.fetched).toEqual([]);
  });

  it("offline: mọi thứ đã precache vẫn chạy; đường dẫn lạ về trang chủ; tài nguyên lạ báo lỗi mạng", async () => {
    const offline = { value: false };
    const sw = await installed({ offline });
    offline.value = true;

    expect(await text(sw.request("/quiz/1", { navigate: true }))).toBe("body of /quiz/1");
    expect(await text(sw.request("/go-nham", { navigate: true }))).toBe("body of /");
    await expect(sw.request("/khong-co.js")).rejects.toThrow(/Failed to fetch/); // không phải trang → không có gì để thay thế
  });

  it("online + đường dẫn không có trong bản build: đi mạng và giữ nguyên mã trạng thái (404 vẫn là 404)", async () => {
    const sw = await installed();
    const res = await sw.request("/khong-ton-tai", { navigate: true });
    expect(res.status).toBe(404);
    expect(sw.fetched.map((f) => new URL(f.url).pathname)).toEqual(["/khong-ton-tai"]);
  });

  it("không can thiệp: POST, tài nguyên khác origin (Google Fonts), và chính /sw.js", async () => {
    const sw = await installed();
    expect(await sw.request("/luyen-viet", { method: "POST", body: "x" })).toBe("passthrough");
    expect(await sw.request("https://fonts.googleapis.com/css2?family=Lora")).toBe("passthrough");
    expect(await sw.request("/sw.js")).toBe("passthrough");
  });
});

describe("service worker — cập nhật phiên bản", () => {
  it("bản mới cài song song, và chỉ activate mới xoá cache cũ (tab đang mở không bị rút tệp)", async () => {
    const caches = makeCaches();
    const v1 = boot({ version: "v1", urls: URLS, site: SITE, caches });
    await v1.lifecycle("install");
    await v1.lifecycle("activate");

    const v2 = boot({ version: "v2", urls: URLS, site: { ...SITE, "/": "body v2" }, caches });
    await v2.lifecycle("install");
    expect((await caches.keys()).sort()).toEqual(["kd-v1", "kd-v2"]); // cả hai cùng tồn tại cho tới khi v2 activate
    await v2.lifecycle("activate");
    expect(await caches.keys()).toEqual(["kd-v2"]);
    expect(await text(v2.request("/", { navigate: true }))).toBe("body v2");
  });
});
