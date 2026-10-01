/* Kana Dōjō — service worker (offline).
   KHÔNG sửa out/sw.js: tệp đó được scripts/build-sw.mjs sinh từ mẫu này sau mỗi lần `next build`.

   Chiến lược "precache toàn bộ": mọi trang, JS, CSS và icon của đúng bản build này được tải sẵn vào một cache mang tên
   theo phiên bản. Nhờ vậy HTML và JS luôn cùng một bản build, và sau lần mở đầu tiên app chạy được khi không có mạng.
   Tiến độ học nằm trong localStorage nên không liên quan tới cache này. */

const VERSION = "__VERSION__";
const CACHE = `kd-${VERSION}`;

// BEGIN PRECACHE
const PRECACHE = __PRECACHE__;
// END PRECACHE

self.addEventListener("install", (event) => {
  // `cache: "reload"` bỏ qua cache HTTP của trình duyệt để không nhặt nhầm tệp cũ vào bản mới.
  // Cố ý KHÔNG gọi skipWaiting(): các tab đang mở vẫn dùng đúng bộ tệp cũ (HTML và JS cùng một bản build)
  // và bản mới chỉ có hiệu lực khi người dùng mở lại ứng dụng.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("kd-") && name !== CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Chỉ xử lý tệp cùng origin. Font Google và mọi thứ bên ngoài để trình duyệt tự lo (offline thì dùng font hệ thống).
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  event.respondWith(respond(request, url));
});

async function respond(request, url) {
  const cache = await caches.open(CACHE);

  // Tra cache chỉ bằng đường dẫn (bỏ query): `/luyen-viet/` và `/luyen-viet?c=あ` đều là trang `/luyen-viet`,
  // `?_rsc=…` của Next cũng chỉ là tham số thêm vào. `url.pathname` giữ nguyên dạng đã mã hoá (`%5Bid%5D`), khớp khoá precache.
  const path = url.pathname.length > 1 && url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  const hit = await cache.match(path, { ignoreVary: true });
  if (hit) return hit;

  try {
    return await fetch(request);
  } catch (err) {
    // Mất mạng và đường dẫn không có trong bản build (gõ nhầm…): đưa về trang chủ thay vì màn hình lỗi của trình duyệt.
    if (request.mode === "navigate") {
      const home = await cache.match("/");
      if (home) return home;
    }
    throw err;
  }
}
