"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Script } from "@/lib/kana";
import { TypingRun, type InputMethod } from "@/lib/typing/engine";
import { compareIme, imeProgress, normalizeIme } from "@/lib/typing/ime";
import { createFeed, type ContentType, type Phrase } from "@/lib/typing/phrases";
import { accuracy, kpm, typingScore, type TypingMode } from "@/lib/typing/score";

export interface GameConfig {
  content: ContentType;
  method: InputMethod;
  mode: TypingMode;
  /** Số câu của chế độ bài mẫu */
  phraseCount: number;
  /** Số giây của chế độ đua giờ */
  timeLimitSec: number;
  drillScript: Script;
  /** Nghe chép: che chữ, đọc câu thành tiếng */
  dictation: boolean;
}

export interface PhraseRecord {
  text: string;
  /** Nghĩa tiếng Việt — chỉ hiện ở màn kết quả, màn gõ chỉ có tiếng Nhật */
  vi: string;
  ms: number;
  keys: number;
  misses: number;
}

/** Xong bài, hết giờ, gõ sai (sinh tử), hoặc người học bấm dừng sớm. */
export type EndReason = "complete" | "timeout" | "miss" | "stopped";

export interface GameResult {
  config: GameConfig;
  endedBy: EndReason;
  durationMs: number;
  correctKeys: number;
  missKeys: number;
  /** Số kana đã gõ xong */
  charsTyped: number;
  phrasesCompleted: number;
  kpm: number;
  accuracy: number;
  score: number;
  /** Kana hay gõ sai nhất, nhiều nhất trước */
  weakKana: [string, number][];
  /** Phím lẽ ra phải bấm ở những lần sai */
  weakKeys: [string, number][];
  phrases: PhraseRecord[];
}

export type Phase = "ready" | "playing" | "finished";

interface Live {
  phase: Phase;
  phrase: Phrase;
  /** Câu kế tiếp để xem trước; null khi đang ở câu cuối của bài mẫu */
  upcoming: Phrase | null;
  run: TypingRun | null;
  index: number;
  startedAt: number | null;
  phraseStartedAt: number;
  endedAt: number | null;
  correct: number;
  miss: number;
  chars: number;
  phraseKeys: number;
  phraseMisses: number;
  missKana: Map<string, number>;
  missKeys: Map<string, number>;
  records: PhraseRecord[];
  /** Tăng mỗi lần gõ sai — dùng làm key để chạy lại hiệu ứng rung */
  missTick: number;
  /** Chế độ IME: số ký tự đầu đã khớp và có đang có chữ sai phía sau không */
  imeMatched: number;
  imeWrong: boolean;
}

function bump(map: Map<string, number>, key: string | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function top(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function useTypingGame(config: GameConfig, onFinish: (r: GameResult) => void) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [now, setNow] = useState(() => performance.now());
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const feedRef = useRef<(() => Phrase) | null>(null);
  const liveRef = useRef<Live | null>(null);
  if (liveRef.current === null) {
    const feed = createFeed(config.content, config.drillScript);
    feedRef.current = feed;
    const first = feed();
    const passage = config.mode === "PASSAGE";
    liveRef.current = {
      phase: "ready",
      phrase: first,
      upcoming: passage && config.phraseCount <= 1 ? null : feed(),
      run: config.method === "IME" ? null : new TypingRun(first.kana, config.method),
      index: 0,
      startedAt: null,
      phraseStartedAt: 0,
      endedAt: null,
      correct: 0,
      miss: 0,
      chars: 0,
      phraseKeys: 0,
      phraseMisses: 0,
      missKana: new Map(),
      missKeys: new Map(),
      records: [],
      missTick: 0,
      imeMatched: 0,
      imeWrong: false,
    };
  }
  const live = liveRef.current;

  /** Phím đúng và kana đã gõ, tính cả phần dở dang của câu IME hiện tại. */
  const totals = useCallback(() => {
    const l = liveRef.current!;
    if (config.method !== "IME") return { correct: l.correct, chars: l.chars };
    const partial = imeProgress(l.phrase, l.imeMatched);
    return { correct: l.correct + partial.keys, chars: l.chars + partial.chars };
  }, [config.method]);

  const finish = useCallback(
    (reason: EndReason, at: number) => {
      const l = liveRef.current!;
      if (l.phase === "finished") return;
      const started = l.startedAt ?? at;
      // Đua giờ: cắt đúng mốc giới hạn dù tick đồng hồ có trễ vài chục ms.
      const limit = config.mode === "TIME_ATTACK" ? config.timeLimitSec * 1000 : Infinity;
      const durationMs = Math.round(Math.min(at - started, limit));
      l.phase = "finished";
      l.endedAt = started + durationMs;
      const { correct, chars } = totals();
      rerender();
      onFinishRef.current({
        config,
        endedBy: reason,
        durationMs,
        correctKeys: correct,
        missKeys: l.miss,
        charsTyped: chars,
        phrasesCompleted: l.records.length,
        kpm: kpm(correct, durationMs),
        accuracy: accuracy(correct, l.miss),
        score: typingScore(config.mode, correct, l.miss, durationMs),
        weakKana: top(l.missKana, 8),
        weakKeys: top(l.missKeys, 8),
        phrases: l.records,
      });
    },
    [config, totals],
  );

  const begin = (at: number) => {
    const l = liveRef.current!;
    if (l.phase !== "ready") return;
    l.phase = "playing";
    l.startedAt = at;
    l.phraseStartedAt = at;
    setNow(at);
  };

  const completePhrase = (at: number, keys: number) => {
    const l = liveRef.current!;
    l.records.push({ text: l.phrase.text, vi: l.phrase.vi, ms: at - l.phraseStartedAt, keys, misses: l.phraseMisses });
    if (config.mode === "PASSAGE" && l.records.length >= config.phraseCount) {
      finish("complete", at);
      return;
    }
    const feed = feedRef.current!;
    l.phrase = l.upcoming ?? feed();
    l.index += 1;
    const remaining = config.phraseCount - l.records.length;
    l.upcoming = config.mode === "PASSAGE" && remaining <= 1 ? null : feed();
    l.run = config.method === "IME" ? null : new TypingRun(l.phrase.kana, config.method);
    l.phraseStartedAt = at;
    l.phraseKeys = 0;
    l.phraseMisses = 0;
    l.imeMatched = 0;
    l.imeWrong = false;
  };

  const registerMiss = (at: number, kana: string | undefined, key: string | undefined) => {
    const l = liveRef.current!;
    l.miss += 1;
    l.phraseMisses += 1;
    l.missTick += 1;
    bump(l.missKana, kana);
    bump(l.missKeys, key);
    if (config.mode === "SUDDEN_DEATH") finish("miss", at);
  };

  /** Một phím ở chế độ romaji/kana: "a", "-", "か", "゛"… */
  const press = useCallback(
    (key: string) => {
      const l = liveRef.current!;
      const run = l.run;
      if (!run || l.phase === "finished") return;
      const at = performance.now();
      begin(at);

      const before = run.pos;
      const cur = run.current();
      const expected = run.nextKey();
      const res = run.press(key);
      if (!res.ok) {
        registerMiss(at, l.phrase.kana.slice(cur.start, cur.end), expected);
      } else {
        l.correct += 1;
        l.phraseKeys += 1;
        l.chars += run.pos - before;
        if (res.finished) completePhrase(at, l.phraseKeys);
      }
      rerender();
    },
    // begin/completePhrase/registerMiss chỉ đọc ref và config — ổn định trong suốt một ván.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config],
  );

  /** Chế độ IME: gọi mỗi khi ô nhập đổi, kể cả lúc đang ghép chữ. Trả về true nếu câu vừa xong
   *  (ô nhập cần được xoá để gõ câu kế). */
  const imeInput = useCallback(
    (value: string, composing: boolean): boolean => {
      const l = liveRef.current!;
      if (l.phase === "finished") return false;
      const at = performance.now();
      if (value.length > 0) begin(at);
      if (composing) {
        rerender();
        return false;
      }

      const target = l.phrase.ime;
      const { matched, wrong } = compareIme(normalizeIme(value), target);

      if (wrong && !l.imeWrong) registerMiss(at, target[matched] ?? target.at(-1), undefined);
      l.imeWrong = wrong;
      l.imeMatched = matched;
      // registerMiss có thể vừa kết thúc ván (chế độ sinh tử) — TS không thấy được thay đổi đó.
      if ((l.phase as Phase) === "finished") {
        rerender();
        return false;
      }

      if (!wrong && matched === target.length) {
        const whole = imeProgress(l.phrase, target.length);
        l.correct += whole.keys;
        l.chars += whole.chars;
        completePhrase(at, whole.keys);
        rerender();
        return true;
      }
      rerender();
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config],
  );

  const phase = live.phase;
  useEffect(() => {
    if (phase !== "playing") return;
    const limit = config.mode === "TIME_ATTACK" ? config.timeLimitSec * 1000 : Infinity;
    const t = setInterval(() => {
      const at = performance.now();
      setNow(at);
      const started = liveRef.current!.startedAt;
      if (started !== null && at - started >= limit) finish("timeout", at);
    }, 100);
    return () => clearInterval(t);
  }, [phase, config.mode, config.timeLimitSec, finish]);

  const quit = useCallback(() => {
    const l = liveRef.current!;
    if (l.phase === "playing") finish("stopped", performance.now());
  }, [finish]);

  const elapsed = live.startedAt === null ? 0 : (live.endedAt ?? now) - live.startedAt;
  const { correct } = totals();

  return {
    live,
    elapsed,
    liveKpm: kpm(correct, elapsed),
    liveAccuracy: accuracy(correct, live.miss),
    correct,
    press,
    imeInput,
    /** Kết thúc sớm và chấm điểm phần đã gõ */
    quit,
  };
}
