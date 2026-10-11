"use client";

import { useSyncExternalStore } from "react";
import { getDevice, getServerDevice, subscribeDevice } from "./device";

/** Ghi chép về sao lưu / lưu bền của máy này (lib/device.ts). Phía máy chủ và lúc hydrate là bản rỗng. */
export function useDevice() {
  return useSyncExternalStore(subscribeDevice, getDevice, getServerDevice);
}
