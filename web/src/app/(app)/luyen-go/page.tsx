"use client";

import { useCallback, useEffect, useState } from "react";
import { TypingResult, type RecordOutcome } from "@/components/typing/TypingResult";
import { TypingSetup } from "@/components/typing/TypingSetup";
import { TypingStage } from "@/components/typing/TypingStage";
import type { GameConfig, GameResult, GameSource } from "@/components/typing/useTypingGame";
import {
  addSession,
  addWeak,
  emptyHistory,
  loadHistory,
  saveHistory,
  weakList,
  type TypingHistory,
} from "@/lib/typing/history";
import { useAuth } from "@/lib/auth-context";
import type { Phrase } from "@/lib/typing/phrases";

const DEFAULT_CONFIG: GameConfig = {
  content: "HIRAGANA",
  method: "ROMAJI",
  mode: "PASSAGE",
  phraseCount: 10,
  timeLimitSec: 60,
  drillScript: "h",
  drillGroup: "basic",
  hideFurigana: false,
  stuckHint: true,
  dictation: false,
};

/** Chỉ là tiện ích nhớ lựa chọn lần trước trên máy này — mất đi cũng không sao. */
const STORAGE_KEY = "kd.typing.config";

const ALLOWED: { [K in keyof GameConfig]: readonly GameConfig[K][] } = {
  content: ["HIRAGANA", "KATAKANA", "MIXED", "KANJI", "KANA_DRILL", "WEAK"],
  method: ["ROMAJI", "KANA", "IME"],
  mode: ["PASSAGE", "TIME_ATTACK", "SUDDEN_DEATH"],
  phraseCount: [5, 10, 20],
  timeLimitSec: [30, 60, 120],
  drillScript: ["h", "k"],
  drillGroup: ["basic", "dakuten", "yoon", "all"],
  hideFurigana: [true, false],
  stuckHint: [true, false],
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

/** Một ván: cấu hình cố định trong suốt ván + nguồn câu. `practice` = luyện lại câu có lỗi, không tính kỷ lục. */
interface Session {
  config: GameConfig;
  source: GameSource;
  practice: boolean;
}

/** Luyện gõ chạy hoàn toàn trên trình duyệt: chấm điểm tại chỗ, kỷ lục lưu ở localStorage. */
export default function TypingPage() {
  // Layout của nhóm (app) chỉ hiện trang khi đã đăng nhập, nên user luôn có ở đây.
  const owner = useAuth().user?.id ?? "guest";
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<View>("setup");
  const [session, setSession] = useState<Session | null>(null);
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [outcome, setOutcome] = useState<RecordOutcome>(null);
  const [history, setHistory] = useState<TypingHistory>(emptyHistory);

  useEffect(() => {
    setConfig(loadConfig());
    setHistory(loadHistory(owner));
  }, [owner]);

  const go = useCallback((next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  const play = useCallback(
    (next: Session) => {
      setSession(next);
      setRunId((n) => n + 1);
      go("play");
    },
    [go],
  );

  const start = (c: GameConfig = config) => {
    storeConfig(c);
    setConfig(c);
    play({ config: c, source: { weak: weakList(loadHistory(owner)) }, practice: false });
  };

  const retryMistakes = (phrases: Phrase[]) => {
    if (!result) return;
    play({
      config: { ...result.config, mode: "PASSAGE", phraseCount: phrases.length },
      source: { phrases },
      practice: true,
    });
  };

  const finish = useCallback(
    (r: GameResult) => {
      setResult(r);
      go("result");
      // Đọc lại từ bộ nhớ thay vì dùng state: tab khác có thể vừa ghi thêm lượt.
      // Chữ gõ sai luôn được ghi (kể cả lượt luyện lại) để mục "Chữ hay sai" bám sát người học.
      let next = addWeak(loadHistory(owner), r.weakKana);
      let recorded: RecordOutcome = null;
      if (session?.practice) {
        recorded = { kind: "practice" };
      } else if (r.correctKeys > 0) {
        const added = addSession(next, {
          method: r.config.method,
          content: r.config.content,
          mode: r.config.mode,
          score: r.score,
          kpm: r.kpm,
          accuracy: r.accuracy,
          durationMs: r.durationMs,
          at: new Date().toISOString(),
        });
        next = added.history;
        recorded = { kind: "record", personalBest: added.personalBest, newBest: added.newBest };
      }
      saveHistory(owner, next);
      setHistory(next);
      setOutcome(recorded);
    },
    [go, session, owner],
  );

  const exit = useCallback(() => go("setup"), [go]);

  if (view === "play" && session) {
    return <TypingStage key={runId} config={session.config} source={session.source} onFinish={finish} onExit={exit} />;
  }

  if (view === "result" && result && session) {
    return (
      <TypingResult
        result={result}
        outcome={outcome}
        onRetry={() => play(session.practice ? session : { ...session, source: { weak: weakList(loadHistory(owner)) } })}
        onRetryMistakes={retryMistakes}
        onSetup={exit}
      />
    );
  }

  return (
    <TypingSetup
      config={config}
      onChange={setConfig}
      onStart={() => start()}
      onPracticeWeak={() => start({ ...config, content: "WEAK" })}
      history={history}
    />
  );
}
