// Service worker tự dọn dẹp cache khi đang chạy ở chế độ dev.
// CHỈ dành cho `next dev`: trình duyệt từng cài bản build trên cùng origin sẽ tải tệp này, gỡ service worker cũ và xoá cache.
// `npm run build` ghi đè out/sw.js bằng bản offline sinh từ scripts/sw.template.js. Đừng deploy bằng `next build` trần —
// tệp này sẽ lên production và site mất chế độ offline (scripts/smoke-test.sh báo lỗi "sw.js chưa được sinh đúng").
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", () => {
  // Luôn fetch trực tiếp từ mạng, không chặn cache
  return;
});
