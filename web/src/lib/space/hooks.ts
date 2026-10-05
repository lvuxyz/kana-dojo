"use client";

import { useSyncExternalStore } from "react";
import { SERVER_SPACE, getServerSpace, getSpace, isPersistent, subscribe } from "./store";

/* Cầu nối giữa kho không gian riêng (localStorage) và React — cùng cách với lib/learning/hooks.ts.
   `ready` = false khi render phía máy chủ và lúc hydrate: chưa biết người học đã chọn gì, nên đừng vẽ điều hướng,
   màn chào hay bố cục trang chủ theo mặc định rồi mới đổi. */

export function useSpace() {
  const space = useSyncExternalStore(subscribe, getSpace, getServerSpace);
  return { space, ready: space !== SERVER_SPACE };
}

/** false nếu lần ghi gần nhất của không gian riêng thất bại — ghi chú và bộ thẻ mới chỉ sống đến khi đóng tab. */
export function useSpacePersistent(): boolean {
  return useSyncExternalStore(subscribe, isPersistent, () => true);
}
