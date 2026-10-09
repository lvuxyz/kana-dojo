"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button, Card, Progress } from "@/components/ui";
import type { InputMethod } from "@/lib/typing/engine";
import { kanaFromKey, kanaKeyLabel } from "@/lib/typing/kana-layout";
import type { Phrase } from "@/lib/typing/phrases";
import { playKeySound } from "@/lib/typing/sound";
import { PhraseView } from "./PhraseView";
import { useSpeech } from "./useSpeech";
import { STUCK_AFTER, useTypingGame, type GameConfig, type GameResult, type GameSource } from "./useTypingGame";

type Warning = "ime" | "vietnamese" | null;

/** Phím romaji hợp lệ: chữ Latin, số và vài dấu dùng trong bảng (ー = "-", ん = "n'"). */
const ROMAJI_KEY = /^[a-z0-9\-',.!?[\]/~]$/;

export function TypingStage({
  config,
  source,
  onFinish,
  onExit,
  onConfigChange,
}: {
  config: GameConfig;
  /** Câu cố định hoặc chữ hay sai; chỉ đọc lúc bắt đầu ván */
  source?: GameSource;
  onFinish: (r: GameResult) => void;
  /** Bỏ ván, quay về màn chọn bài */
  onExit: () => void;
  onConfigChange?: (c: GameConfig) => void;
}) {
  const game = useTypingGame(config, onFinish, source);
  const { live } = game;
  const { speak, supported: canSpeak, missingVoice } = useSpeech();
  const [warning, setWarning] = useState<Warning>(null);
  const imeRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  const { press, quit } = game;
  const method = config.method;

  // Romaji/kana đọc phím ở cấp window, không cần ô nhập nào có focus — nhờ vậy IME của hệ điều
  // hành thường không chen vào. Bỏ focus khỏi nút "Bắt đầu" để Space/Enter không bấm nhầm nút.
  useEffect(() => {
    if (method === "IME") imeRef.current?.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [method]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape" && !e.isComposing) {
        e.preventDefault();
        onExit();
        return;
      }
      if (method === "IME") return;
      if (e.isComposing || e.key === "Process" || e.keyCode === 229) {
        setWarning("ime");
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (canSpeak) speak(live.phrase.text);
        return;
      }
      if (e.repeat) return;

      let token: string | undefined;
      if (method === "KANA") {
        token = kanaFromKey(e.code, e.shiftKey);
      } else if (e.key.length === 1) {
        const k = e.key.toLowerCase();
        if (ROMAJI_KEY.test(k)) token = k;
        else if (/\p{Script=Latin}/u.test(k)) {
          // "â", "ư", "đ"… chỉ xuất hiện khi Unikey/EVKey đang biến đổi phím.
          e.preventDefault();
          setWarning("vietnamese");
          return;
        } else if (/[぀-ヿ]/.test(k)) {
          e.preventDefault();
          setWarning("ime");
          return;
        }
      }
      if (!token) return;
      e.preventDefault();
      setWarning(null);
      press(token);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [method, press, onExit, canSpeak, speak, live.phrase.text]);

  // Nghe chép: đọc mỗi câu mới một lần.
  useEffect(() => {
    if (config.dictation && canSpeak) speak(live.phrase.text);
  }, [config.dictation, canSpeak, speak, live.phrase]);

  const handleIme = (value: string, composing: boolean) => {
    if (game.imeInput(value, composing) && imeRef.current) imeRef.current.value = "";
  };

  const run = live.run;
  const cur = run?.current();
  const unit = method === "IME" ? "ime" : "kana";
  const here = method === "IME" ? live.imeMatched : (cur?.start ?? 0);

  // Gợi ý khi bị kẹt, theo bậc: kanji đang ẩn furigana thì bậc 1 chỉ hiện lại furigana (vẫn là
  // tiếng Nhật), bậc 2 mới hiện cách gõ; chữ đã thấy cách đọc thì bậc 1 hiện cách gõ luôn.
  const level = !config.stuckHint ? 0 : game.stuckMisses >= STUCK_AFTER * 2 ? 2 : game.stuckMisses >= STUCK_AFTER ? 1 : 0;
  const rubyHidden = config.hideFurigana && !!segmentAt(live.phrase, unit, here)?.ruby;
  const revealAt = level >= 1 && rubyHidden ? here : undefined;
  const keyHint =
    run && cur && (level >= 2 || (level >= 1 && !rubyHidden))
      ? { chunk: live.phrase.kana.slice(cur.start, cur.end), keys: run.currentKeys() }
      : null;
  const limitMs = config.timeLimitSec * 1000;
  const clock = config.mode === "TIME_ATTACK" ? Math.max(0, limitMs - game.elapsed) : game.elapsed;
  const lowTime = config.mode === "TIME_ATTACK" && clock <= 10_000 && live.phase === "playing";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      {/* Thanh chỉ số */}
      <Card className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-4">
        <Metric label={config.mode === "TIME_ATTACK" ? "Còn lại" : "Thời gian"}>
          <span className={clsx(lowTime && "text-shu")}>{formatClock(clock)}</span>
        </Metric>
        <Metric label="Phím / phút">{Math.round(game.liveKpm)}</Metric>
        <Metric label="Chính xác">{(game.liveAccuracy * 100).toFixed(1)}%</Metric>
        <Metric label="Gõ sai">
          <div className="flex items-center justify-between">
            <span className={clsx(live.miss > 0 && "text-shu")}>{live.miss}</span>
            {game.streak >= 5 && (
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tnum shadow-2xs",
                  game.streak >= 50
                    ? "border border-gold/40 bg-gold/20 text-gold animate-pulse"
                    : game.streak >= 20
                    ? "border border-shu/35 bg-shu/15 text-shu"
                    : "border border-rule/80 bg-paper-sunk text-sumi-2",
                )}
                title={`Đang gõ đúng liên tiếp ${game.streak} phím (kỷ lục ván: ${game.maxStreak})`}
              >
                <span>⚡</span>
                <span>{game.streak}</span>
              </span>
            )}
          </div>
        </Metric>
        <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
          {config.mode === "PASSAGE" && (
            <>
              <span className="text-xs font-semibold text-sumi-3 tnum">
                Câu {Math.min(live.records.length + 1, config.phraseCount)}/{config.phraseCount}
              </span>
              <Progress value={live.records.length} max={config.phraseCount} tone="genko" className="flex-1" />
            </>
          )}
          {config.mode === "TIME_ATTACK" && (
            <>
              <span className="text-xs font-semibold text-sumi-3 tnum">{live.records.length} câu xong</span>
              <Progress value={limitMs - clock} max={limitMs} tone={lowTime ? "shu" : "gold"} className="flex-1" />
            </>
          )}
          {config.mode === "SUDDEN_DEATH" && (
            <span className="text-xs font-semibold text-sumi-3">
              Sinh tử — sai một phím là kết thúc · chuỗi hiện tại <b className="tnum text-sumi">{game.correct}</b> phím
            </span>
          )}
        </div>
      </Card>

      {/* Câu mẫu */}
      <Card
        variant="luxury"
        className={clsx(
          "relative flex min-h-64 flex-col items-center justify-center gap-4 px-5 py-9 sm:px-10 transition-all duration-300",
          game.streak >= 50
            ? "ring-2 ring-gold/45 shadow-xl shadow-gold/10"
            : game.streak >= 20
            ? "ring-1 ring-shu/35 shadow-lg shadow-shu/5"
            : "",
        )}
      >
        {/* Banner mốc liên kích (Streak / Combo) */}
        {game.streak >= 10 && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <div
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all",
                game.streak >= 50
                  ? "border border-gold/50 bg-gradient-to-r from-gold/25 via-shu/25 to-gold/25 text-gold shadow-sm shadow-gold/20 scale-105"
                  : game.streak >= 20
                  ? "border border-shu/35 bg-shu/15 text-shu shadow-2xs"
                  : "border border-rule-firm bg-paper-sunk text-sumi-2",
              )}
            >
              <span className={clsx(game.streak >= 20 && "animate-pulse")}>⚡</span>
              <span>{game.streak} 連撃</span>
              <span className="text-[10.5px] font-medium opacity-80">· Combo {game.streak}</span>
            </div>
          </div>
        )}

        <div key={live.missTick} className={clsx("flex w-full flex-col items-center gap-4", live.missTick > 0 && "type-shake")}>
          <PhraseView
            phrase={live.phrase}
            unit={method === "IME" ? "ime" : "kana"}
            pos={here}
            curEnd={method === "IME" ? live.imeMatched + 1 : (cur?.end ?? 0)}
            hidden={config.dictation}
            hideRuby={config.hideFurigana}
            revealAt={revealAt}
          />

          {/* Nghĩa tiếng Việt */}
          {config.showMeaning && live.phrase.vi && !config.dictation && (
            <p className="max-w-xl text-center font-sans text-sm font-medium text-sumi-3 transition-opacity">
              {live.phrase.vi}
            </p>
          )}

          {run && <PendingKeys keys={run.buf} />}
          <div className="flex min-h-8 items-center justify-center" aria-live="polite">
            {keyHint && method !== "IME" && <StuckHint method={method} {...keyHint} />}
          </div>
        </div>

        {live.phase === "ready" && (
          <p className="absolute inset-x-0 top-3 text-center text-[12px] font-semibold text-sumi-3">
            {method === "IME" ? "Gõ vào ô bên dưới để bắt đầu tính giờ" : "Gõ phím đầu tiên để bắt đầu tính giờ"}
          </p>
        )}

        {/* Thanh công cụ nhanh góc trên bên phải */}
        <div className="absolute right-3 top-3 flex items-center gap-1">
          {/* Nút bật/tắt nghĩa tiếng Việt */}
          {onConfigChange && !config.dictation && (
            <button
              type="button"
              onClick={() => onConfigChange({ ...config, showMeaning: !config.showMeaning })}
              className={clsx(
                "grid h-8 w-8 cursor-pointer place-items-center rounded-full text-xs font-bold transition-colors",
                config.showMeaning
                  ? "bg-shu/10 text-shu hover:bg-shu/20"
                  : "text-sumi-3 opacity-60 hover:bg-paper-sunk hover:text-sumi",
              )}
              aria-label="Bật/tắt nghĩa tiếng Việt"
              title={config.showMeaning ? "Đang hiện nghĩa tiếng Việt (Bấm để ẩn)" : "Đang ẩn nghĩa tiếng Việt (Bấm để hiện)"}
              tabIndex={-1}
            >
              文
            </button>
          )}

          {/* Nút bật/tắt âm thanh gõ */}
          {onConfigChange && (
            <button
              type="button"
              onClick={() => {
                const nextTheme = config.soundTheme === "off" ? "thock" : "off";
                onConfigChange({ ...config, soundTheme: nextTheme });
                if (nextTheme !== "off") playKeySound(nextTheme, config.soundVolume);
              }}
              className={clsx(
                "grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-colors",
                config.soundTheme !== "off"
                  ? "bg-gold/15 text-gold hover:bg-gold/25"
                  : "text-sumi-3 opacity-60 hover:bg-paper-sunk hover:text-sumi",
              )}
              aria-label="Bật/tắt âm thanh gõ phím"
              title={
                config.soundTheme !== "off"
                  ? `Âm thanh: ${config.soundTheme} (Bấm để tắt)`
                  : "Đang tắt âm thanh (Bấm để bật)"
              }
              tabIndex={-1}
            >
              {config.soundTheme !== "off" ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
          )}

          {/* Nút nghe đọc câu */}
          {canSpeak && (
            <button
              type="button"
              onClick={() => speak(live.phrase.text)}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-sumi-3 transition-colors hover:bg-paper-sunk hover:text-sumi"
              aria-label="Nghe câu này"
              title={method === "IME" ? "Nghe câu này" : "Nghe câu này (Space)"}
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" />
                <path d="M15.5 9a4 4 0 0 1 0 6" />
                <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
              </svg>
            </button>
          )}
        </div>
      </Card>

      {method === "IME" && (
        <div className="flex flex-col gap-1.5">
          <input
            ref={imeRef}
            lang="ja"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-label="Ô gõ tiếng Nhật"
            placeholder="Bật bộ gõ tiếng Nhật rồi gõ câu ở trên…"
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              handleIme(e.currentTarget.value, false);
            }}
            onChange={(e) => {
              const native = e.nativeEvent as InputEvent;
              handleIme(e.currentTarget.value, native.isComposing || composingRef.current);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
            }}
            className={clsx(
              "w-full rounded-2xl border bg-surface px-5 py-3.5 text-center font-japanese text-2xl text-sumi shadow-xs outline-none transition-all placeholder:font-sans placeholder:text-base placeholder:text-sumi-3",
              live.imeWrong ? "border-shu ring-3 ring-shu/15" : "border-rule/80 focus:border-shu focus:ring-3 focus:ring-shu/15",
            )}
          />
          <p className={clsx("text-center text-[12px]", live.imeWrong ? "font-semibold text-shu" : "text-sumi-3")}>
            {live.imeWrong
              ? "Có chữ chưa khớp — xoá phần sai (Backspace) rồi gõ lại."
              : "Gõ cách đọc rồi nhấn Space để đổi sang kanji/katakana, Enter để chốt. Câu đúng sẽ tự chuyển."}
          </p>
        </div>
      )}

      {warning && <WarningNote kind={warning} />}
      {config.dictation && missingVoice && (
        <p className="rounded-xl border border-gold/30 bg-gold-tint px-4 py-2.5 text-[12.5px] font-medium text-gold">
          Máy chưa cài giọng đọc tiếng Nhật nên phần nghe có thể sai. Windows: Cài đặt → Thời gian & ngôn ngữ → Giọng nói → thêm “日本語”.
        </p>
      )}

      {live.upcoming && !config.dictation && (
        <div className="flex items-center justify-center gap-3 text-sumi-3">
          <span className="label-xs">Tiếp theo</span>
          <PhraseView phrase={live.upcoming} unit="kana" pos={0} curEnd={0} size="sm" hideRuby={config.hideFurigana} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={onExit} tabIndex={-1}>
          ‹ Chọn bài khác <kbd className="ml-1 rounded border border-rule px-1 text-[10px]">Esc</kbd>
        </Button>
        {live.phase === "playing" && (
          <Button variant="outline" size="sm" onClick={quit} tabIndex={-1}>
            Dừng &amp; chấm điểm
          </Button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-xs">{label}</span>
      <span className="font-mincho text-2xl font-bold leading-none tnum">{children}</span>
    </div>
  );
}

function formatClock(ms: number) {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

/**
 * Phím đã gõ của cụm chưa thành chữ (ví dụ "sh" trước khi thành し, か chờ ゛) — giống ô ghép chữ
 * của IME. Chỉ phản chiếu phím người học đã bấm, không bao giờ gợi ý phím tiếp theo: màn gõ chỉ
 * có tiếng Nhật để người học tự nhớ cách gõ.
 */
function PendingKeys({ keys }: { keys: string }) {
  return (
    <p className="flex h-7 items-center justify-center font-mono text-lg text-sumi-2" aria-label="Phím đang gõ dở">
      <span className="border-b-2 border-dashed border-sumi-3/60 px-0.5 empty:hidden">{keys}</span>
      <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse rounded-full bg-shu" aria-hidden />
    </p>
  );
}

/** Cụm kana chứa vị trí `pos` (theo đơn vị kana hoặc ký tự IME). */
function segmentAt(p: Phrase, unit: "kana" | "ime", pos: number) {
  return p.segments.find((s) => {
    if (!s.reading) return false;
    const start = unit === "kana" ? s.start : s.imeStart;
    const len = unit === "kana" ? s.reading.length : s.text.length;
    return start <= pos && pos < start + len;
  });
}

/** Cách gõ của riêng chữ đang bị kẹt — chỉ hiện sau nhiều lần sai liên tiếp, biến mất khi gõ qua. */
function StuckHint({ method, chunk, keys }: { method: Exclude<InputMethod, "IME">; chunk: string; keys: string }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold-tint px-3 py-1.5 text-[13px] text-gold">
      <span className="font-japanese font-semibold" lang="ja">ヒント</span>
      <span className="font-japanese text-base text-sumi">{chunk}</span>
      <span aria-hidden>→</span>
      {method === "ROMAJI" ? (
        <kbd className="rounded-md border border-gold/40 bg-surface px-1.5 font-mono text-sm text-sumi">{keys}</kbd>
      ) : (
        Array.from(keys, (token, i) => (
          <kbd key={i} className="rounded-md border border-gold/40 bg-surface px-1.5 font-mono text-sm text-sumi">
            <span className="font-japanese">{token}</span> · {kanaKeyLabel(token) ?? "?"}
          </kbd>
        ))
      )}
    </p>
  );
}

function WarningNote({ kind }: { kind: Exclude<Warning, null> }) {
  return (
    <p className="rounded-xl border border-shu/30 bg-shu-tint px-4 py-3 text-[13px] font-medium text-shu-2" role="alert">
      {kind === "vietnamese" ? (
        <>
          Có vẻ <b>bộ gõ tiếng Việt</b> (Unikey, EVKey…) đang bật nên phím romaji bị biến thành “â, ư, đ…”.
          Chuyển bộ gõ sang chế độ tiếng Anh (thường là <kbd>Ctrl + Shift</kbd> hoặc <kbd>Alt + Z</kbd>) rồi gõ tiếp.
        </>
      ) : (
        <>
          <b>Bộ gõ tiếng Nhật (IME)</b> đang giữ phím nên bài không nhận được. Tắt IME (phím <kbd>半角/全角</kbd> hoặc{" "}
          <kbd>Alt + `</kbd>), hoặc quay lại chọn cách nhập “Bộ gõ IME”.
        </>
      )}
    </p>
  );
}
