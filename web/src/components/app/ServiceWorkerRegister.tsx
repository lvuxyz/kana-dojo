"use client";

import { useEffect } from "react";

/** Đăng ký service worker (out/sw.js, sinh bởi scripts/build-sw.mjs) để app chạy được offline.
 *  Ở chế độ dev thì ngược lại: gỡ mọi service worker còn sót từ lần xem thử bản build trên cùng origin (localhost:3001…),
 *  nếu không nó sẽ phục vụ bản cũ từ cache và che mất mọi thay đổi đang phát triển. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => void r.unregister())).catch(() => {});
      return;
    }

    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* chạy tiếp, chỉ không có offline */ });
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
