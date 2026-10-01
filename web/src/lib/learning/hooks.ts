"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Script } from "../kana";
import { heatmapOf, statsOf } from "./activity";
import { badgeStatuses } from "./badges";
import { kanaProgress, summaryOf } from "./reviews";
import { SERVER_STATE, getServerState, getState, isPersistent, subscribe } from "./store";
import { systemClock } from "./time";

/* Cầu nối giữa kho tiến độ (localStorage) và React.
   `ready` = false khi render phía máy chủ và lúc hydrate: lúc đó chưa đọc được tiến độ thật, trang nên
   hiện khung chờ thay vì nháy số 0 rồi nhảy sang số thật. */

export function useProgress() {
  const state = useSyncExternalStore(subscribe, getState, getServerState);
  return { state, ready: state !== SERVER_STATE };
}

/** false nếu trình duyệt không cho lưu — tiến độ sẽ mất khi đóng tab. */
export function usePersistent(): boolean {
  return useSyncExternalStore(subscribe, isPersistent, () => true);
}

export function useStats() {
  const { state, ready } = useProgress();
  return { ready, stats: useMemo(() => statsOf(state, systemClock()), [state]) };
}

export function useSummary() {
  const { state, ready } = useProgress();
  return { ready, summary: useMemo(() => summaryOf(state, systemClock()), [state]) };
}

export function useKanaProgress(script: Script) {
  const { state, ready } = useProgress();
  return { ready, progress: useMemo(() => kanaProgress(state, script), [state, script]) };
}

export function useHeatmap(days: number) {
  const { state, ready } = useProgress();
  return { ready, days: useMemo(() => heatmapOf(state, days, systemClock()), [state, days]) };
}

export function useBadges() {
  const { state, ready } = useProgress();
  return { ready, badges: useMemo(() => badgeStatuses(state), [state]) };
}
