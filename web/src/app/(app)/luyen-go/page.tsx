"use client";

import { useCallback, useEffect, useState } from "react";
import { TypingResult, type RecordOutcome } from "@/components/typing/TypingResult";
import { TypingSetup } from "@/components/typing/TypingSetup";
import { TypingStage } from "@/components/typing/TypingStage";
import type { GameConfig, GameResult } from "@/components/typing/useTypingGame";
import { addSession, emptyHistory, loadHistory, saveHistory, type TypingHistory } from "@/lib/typing/history";

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

/** Luyện gõ chạy hoàn toàn trên trình duyệt: chấm điểm tại chỗ, kỷ lục lưu ở localStorage. */
export default function TypingPage() {
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<View>("setup");
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RecordOutcome>(null);
  const [history, setHistory] = useState<TypingHistory>(emptyHistory);

  useEffect(() => {
    setConfig(loadConfig());
    setHistory(loadHistory());
  }, []);

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
      if (r.correctKeys === 0) {
        setOutcome(null);
        return;
      }
      // Đọc lại từ bộ nhớ thay vì dùng state: tab khác có thể vừa ghi thêm lượt.
      const { history: next, personalBest, newBest } = addSession(loadHistory(), {
        method: r.config.method,
        content: r.config.content,
        mode: r.config.mode,
        score: r.score,
        kpm: r.kpm,
        accuracy: r.accuracy,
        durationMs: r.durationMs,
        at: new Date().toISOString(),
      });
      saveHistory(next);
      setHistory(next);
      setOutcome({ personalBest, newBest });
    },
    [go],
  );

  const exit = useCallback(() => go("setup"), [go]);

  if (view === "play") {
    return <TypingStage key={runId} config={config} onFinish={finish} onExit={exit} />;
  }

  if (view === "result" && result) {
    return <TypingResult result={result} outcome={outcome} onRetry={start} onSetup={exit} />;
  }

  return <TypingSetup config={config} onChange={setConfig} onStart={start} history={history} />;
}
