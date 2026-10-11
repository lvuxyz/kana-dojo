"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Script } from "../kana";
import { heatmapOf, statsOf } from "./activity";
import { badgeStatuses } from "./badges";
import { kanaProgress, summaryOf } from "./reviews";
import { getLearnContext, getServerLearnContext, subscribe as subscribeSpace } from "../space/store";
import { SERVER_STATE, getServerState, getState, isNewerData, isPersistent, subscribe } from "./store";
import type { LearnContext } from "./context";
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

/** true nếu tiến độ trong trình duyệt do phiên bản mới hơn ghi — tab này phải tải lại. */
export function useNewerData(): boolean {
  return useSyncExternalStore(subscribe, isNewerData, () => false);
}

export function useStats() {
  const { state, ready } = useProgress();
  return { ready, stats: useMemo(() => statsOf(state, systemClock()), [state]) };
}

/** Cách học và thẻ tự soạn của người dùng; đổi khi họ sửa không gian riêng. */
export function useLearnContext(): LearnContext {
  return useSyncExternalStore(subscribeSpace, getLearnContext, getServerLearnContext);
}

export function useSummary() {
  const { state, ready } = useProgress();
  const ctx = useLearnContext();
  return { ready, summary: useMemo(() => summaryOf(state, systemClock(), ctx), [state, ctx]) };
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
