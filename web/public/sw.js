// Service worker tự dọn dẹp cache khi đang chạy ở chế độ dev
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
