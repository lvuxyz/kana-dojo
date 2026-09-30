"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TypingResult, type SaveState } from "@/components/typing/TypingResult";
import { TypingSetup } from "@/components/typing/TypingSetup";
import { TypingStage } from "@/components/typing/TypingStage";
import type { GameConfig, GameResult } from "@/components/typing/useTypingGame";
import { ApiError, get, post } from "@/lib/api";
import type { TypingResultDto, TypingSessionRequest, TypingStatsDto } from "@/lib/types";

const DEFAULT_CONFIG: GameConfig = {
  content: "HIRAGANA",
  method: "ROMAJI",
  mode: "PASSAGE",
  phraseCount: 10,
  timeLimitSec: 60,
  drillScript: "h",
  showGuide: true,
  showKeyboard: true,
  dictation: false,
};

/** Chỉ là tiện ích nhớ lựa chọn lần trước trên máy này — mất đi cũng không sao. */
const STORAGE_KEY = "kd.typing.config";

const ALLOWED: { [K in keyof GameConfig]: readonly GameConfig[K][] } = {
  content: ["HIRAGANA", "KATAKANA", "MIXED", "KANJI", "KANA_DRILL"],
  method: ["ROMAJI", "KANA", "IME"],
  mode: ["PASSAGE", "TIME_ATTACK", "SUDDEN_DEATH"],
  phraseCount: [5, 10, 20],
  timeLimitSec: [30, 60, 120],
  drillScript: ["h", "k"],
  showGuide: [true, false],
  showKeyboard: [true, false],
  dictation: [true, false],
};

/** Giá trị lưu từ phiên bản cũ hoặc bị sửa tay thì bỏ qua từng trường, giữ mặc định. */
function loadConfig(): GameConfig {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    const out: Record<string, unknown> = { ...DEFAULT_CONFIG };
    for (const key of Object.keys(ALLOWED) as (keyof GameConfig)[]) {
      if ((ALLOWED[key] as readonly unknown[]).includes(saved[key])) out[key] = saved[key];
    }
    return out as unknown as GameConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function storeConfig(c: GameConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {
    /* chế độ ẩn danh / bị chặn lưu trữ: bỏ qua */
  }
}

type View = "setup" | "play" | "result";

export default function TypingPage() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<View>("setup");
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [save, setSave] = useState<SaveState>({ status: "skipped" });

  useEffect(() => setConfig(loadConfig()), []);

  const stats = useQuery({
    queryKey: ["typing", "stats"],
    queryFn: () => get<TypingStatsDto>("/typing/stats"),
  });

  const record = useMutation({
    mutationFn: (body: TypingSessionRequest) => post<TypingResultDto>("/typing/sessions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["typing", "stats"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
  const { mutate } = record;

  const go = useCallback((next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  const start = () => {
    storeConfig(config);
    setRunId((n) => n + 1);
    go("play");
  };

  const finish = useCallback(
    (r: GameResult) => {
      setResult(r);
      go("result");
      if (r.correctKeys === 0 || r.durationMs < 1000) {
        setSave({ status: "skipped" });
        return;
      }
      setSave({ status: "saving" });
      mutate(
        {
          inputMethod: r.config.method,
          contentType: r.config.content,
          mode: r.config.mode,
          durationMs: r.durationMs,
          correctKeys: r.correctKeys,
          missKeys: r.missKeys,
          charsTyped: r.charsTyped,
          phrasesCompleted: r.phrasesCompleted,
        },
        {
          onSuccess: (data) => setSave({ status: "saved", data }),
          onError: (e) =>
            setSave({
              status: "error",
              message: e instanceof ApiError ? e.message : "máy chủ không phản hồi. Điểm vẫn được chấm trên máy.",
            }),
        },
      );
    },
    [go, mutate],
  );

  const exit = useCallback(() => go("setup"), [go]);

  if (view === "play") {
    return <TypingStage key={runId} config={config} onFinish={finish} onExit={exit} />;
  }

  if (view === "result" && result) {
    return <TypingResult result={result} save={save} onRetry={start} onSetup={exit} />;
  }

  return <TypingSetup config={config} onChange={setConfig} onStart={start} stats={stats.data} />;
}
