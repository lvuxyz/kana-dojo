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
    <div className="mx-auto flex max-w-4xl flex-col gap-3.5">
      {/* Thanh HUD chỉ số Zen tích hợp (Unified Zen HUD) */}
      <Card className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-3 py-2 sm:px-5 sm:py-2.5">
        {/* Bên trái: Tiến độ hoặc thời gian */}
        <div className="flex items-center gap-2 sm:gap-3">
          {config.mode === "PASSAGE" && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="rounded-md border border-rule-firm bg-paper-sunk px-1.5 py-0.5 sm:px-2 font-japanese text-[10.5px] sm:text-[11px] font-bold text-sumi-2">
                文 {Math.min(live.records.length + 1, config.phraseCount)}/{config.phraseCount}
              </span>
              <div className="w-12 sm:w-24">
                <Progress value={live.records.length} max={config.phraseCount} tone="genko" className="h-1.5" />
              </div>
            </div>
          )}
          {config.mode === "TIME_ATTACK" && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span
                className={clsx(
                  "rounded-md border px-1.5 py-0.5 sm:px-2 text-[11px] sm:text-xs font-bold tnum",
                  lowTime ? "border-shu/40 bg-shu-tint text-shu animate-pulse" : "border-gold/40 bg-gold-tint text-gold",
                )}
              >
                ⏱ {formatClock(clock)}
              </span>
              <div className="w-12 sm:w-24">
                <Progress value={limitMs - clock} max={limitMs} tone={lowTime ? "shu" : "gold"} className="h-1.5" />
              </div>
            </div>
          )}
          {config.mode === "SUDDEN_DEATH" && (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md border border-shu/35 bg-shu-tint/80 px-2 py-0.5 text-xs font-bold text-shu">
              <span>命</span>
              <span>Sinh tử: <b className="tnum">{game.correct}</b> phím</span>
            </span>
          )}
        </div>

        {/* Ở giữa: Huy hiệu Liên kích Streak khi >= 5 */}
        {game.streak >= 5 ? (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            <span
              className={clsx(
                "inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 text-[11px] sm:text-xs font-bold transition-all shadow-xs",
                game.streak >= 50
                  ? "border border-gold/50 bg-gradient-to-r from-gold/25 via-shu/25 to-gold/25 text-gold animate-pulse scale-105"
                  : game.streak >= 20
                  ? "border border-shu/40 bg-shu/15 text-shu"
                  : "border border-rule/80 bg-paper-sunk text-sumi-2",
              )}
            >
              <span>⚡</span>
              <span>{game.streak} 連撃</span>
            </span>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        {/* Bên phải: Tốc độ, Chính xác, Lỗi + Công cụ nhanh */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold tnum text-sumi-2">
            <span title="Tốc độ gõ phím/phút">
              <b className="text-sumi">{Math.round(game.liveKpm)}</b> <span className="text-[10px] text-sumi-3">KPM</span>
            </span>
            <span className="text-rule-firm/60">·</span>
            <span title="Độ chính xác">
              <b className="text-sumi">{(game.liveAccuracy * 100).toFixed(1)}%</b>
            </span>
            <span className="text-rule-firm/60">·</span>
            <span title="Số phím gõ sai" className={clsx(live.miss > 0 && "text-shu")}>
              <b>{live.miss}</b> <span className="text-[10px] text-sumi-3">lỗi</span>
            </span>
          </div>

          <div className="h-3.5 w-px bg-rule/70 hidden sm:block" />

          {/* Công cụ nhanh */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {onConfigChange && !config.dictation && (
              <button
                type="button"
                onClick={() => onConfigChange({ ...config, showMeaning: !config.showMeaning })}
                className={clsx(
                  "grid h-6.5 w-6.5 sm:h-7 sm:w-7 cursor-pointer place-items-center rounded-lg text-xs font-bold transition-colors",
                  config.showMeaning
                    ? "bg-shu/15 text-shu font-japanese"
                    : "text-sumi-3 opacity-50 hover:bg-paper-sunk hover:text-sumi",
                )}
                title={config.showMeaning ? "Đang hiện nghĩa tiếng Việt (Bấm để ẩn)" : "Đang ẩn nghĩa tiếng Việt (Bấm để hiện)"}
                tabIndex={-1}
              >
                文
              </button>
            )}

            {onConfigChange && (
              <button
                type="button"
                onClick={() => {
                  const nextTheme = config.soundTheme === "off" ? "thock" : "off";
                  onConfigChange({ ...config, soundTheme: nextTheme });
                  if (nextTheme !== "off") playKeySound(nextTheme, config.soundVolume);
                }}
                className={clsx(
                  "grid h-6.5 w-6.5 sm:h-7 sm:w-7 cursor-pointer place-items-center rounded-lg transition-colors",
                  config.soundTheme !== "off"
                    ? "bg-gold/20 text-gold"
                    : "text-sumi-3 opacity-50 hover:bg-paper-sunk hover:text-sumi",
                )}
                title={config.soundTheme !== "off" ? `Âm thanh: ${config.soundTheme} (Bấm để tắt)` : "Đang tắt âm thanh (Bấm để bật)"}
                tabIndex={-1}
              >
                {config.soundTheme !== "off" ? (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </button>
            )}

            {canSpeak && (
              <button
                type="button"
                onClick={() => speak(live.phrase.text)}
                className="grid h-6.5 w-6.5 sm:h-7 sm:w-7 cursor-pointer place-items-center rounded-lg text-sumi-3 transition-colors hover:bg-paper-sunk hover:text-sumi"
                title={method === "IME" ? "Nghe câu này" : "Nghe câu này (Space)"}
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" />
                  <path d="M15.5 9a4 4 0 0 1 0 6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Sân gõ câu mẫu (The Zen Altar) */}
      <Card
        variant="luxury"
        className={clsx(
          "relative flex min-h-[220px] sm:min-h-[290px] flex-col items-center justify-center gap-3 sm:gap-3.5 px-3.5 py-5 sm:px-12 sm:py-7 transition-all duration-300",
          game.streak >= 50
            ? "ring-2 ring-gold/45 shadow-xl shadow-gold/10"
            : game.streak >= 20
            ? "ring-1 ring-shu/35 shadow-lg shadow-shu/5"
            : "",
        )}
      >
        {live.phase === "ready" && (
          <p className="absolute inset-x-0 top-3 text-center text-[11.5px] font-semibold text-sumi-3">
            {method === "IME" ? "Gõ vào ô bên dưới để bắt đầu tính giờ" : "Gõ phím đầu tiên để bắt đầu tính giờ"}
          </p>
        )}

        <div key={live.missTick} className={clsx("flex w-full flex-col items-center gap-3", live.missTick > 0 && "type-shake")}>
          <PhraseView
            phrase={live.phrase}
            unit={method === "IME" ? "ime" : "kana"}
            pos={here}
            curEnd={method === "IME" ? live.imeMatched + 1 : (cur?.end ?? 0)}
            hidden={config.dictation}
            hideRuby={config.hideFurigana}
            revealAt={revealAt}
          />

          {/* Bản dịch tiếng Việt */}
          {config.showMeaning && live.phrase.vi && !config.dictation && (
            <p className="max-w-xl text-center font-sans text-[13.5px] font-medium text-sumi-3/90 transition-opacity">
              {live.phrase.vi}
            </p>
          )}

          {/* Phím đệm buffer (giữ min-height để không giật layout) */}
          <div className="flex min-h-7 items-center justify-center">
            {run && <PendingKeys keys={run.buf} />}
          </div>

          {/* Gợi ý khi bị kẹt */}
          <div className="flex min-h-7 items-center justify-center" aria-live="polite">
            {keyHint && method !== "IME" && <StuckHint method={method} {...keyHint} />}
          </div>
        </div>

        {/* Dải xem trước câu tiếp theo (Upcoming preview) */}
        {live.upcoming && !config.dictation && (
          <div className="mt-2 flex w-full max-w-xl items-center justify-center gap-2 border-t border-rule/50 pt-2.5 text-xs text-sumi-3">
            <span className="rounded bg-paper-sunk px-1.5 py-0.5 font-japanese text-[10.5px] font-bold text-sumi-3">
              次 Câu kế
            </span>
            <PhraseView phrase={live.upcoming} unit="kana" pos={0} curEnd={0} size="sm" hideRuby={config.hideFurigana} />
          </div>
        )}
      </Card>

      {/* Ô gõ cho chế độ IME */}
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
              "w-full rounded-2xl border bg-surface px-5 py-3 text-center font-japanese text-xl text-sumi shadow-xs outline-none transition-all placeholder:font-sans placeholder:text-sm placeholder:text-sumi-3",
              live.imeWrong ? "border-shu ring-3 ring-shu/15" : "border-rule/80 focus:border-shu focus:ring-3 focus:ring-shu/15",
            )}
          />
          <p className={clsx("text-center text-[11.5px]", live.imeWrong ? "font-semibold text-shu" : "text-sumi-3")}>
            {live.imeWrong
              ? "Có chữ chưa khớp — xoá phần sai (Backspace) rồi gõ lại."
              : "Gõ cách đọc rồi nhấn Space để đổi sang kanji/katakana, Enter để chốt."}
          </p>
        </div>
      )}

      {warning && <WarningNote kind={warning} />}
      {config.dictation && missingVoice && (
        <p className="rounded-xl border border-gold/30 bg-gold-tint px-4 py-2 text-[12px] font-medium text-gold">
          Máy chưa cài giọng đọc tiếng Nhật nên phần nghe có thể sai. Windows: Cài đặt → Thời gian &amp; ngôn ngữ → Giọng nói → thêm “日本語”.
        </p>
      )}

      {/* Thanh điều hướng chân trang */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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

function formatClock(ms: number) {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

/**
 * Phím đã gõ của cụm chưa thành chữ (ví dụ "sh" trước khi thành し, か chờ ゛).
 */
function PendingKeys({ keys }: { keys: string }) {
  return (
    <p className="flex h-7 items-center justify-center font-mono text-base text-sumi-2" aria-label="Phím đang gõ dở">
      <span className="border-b-2 border-dashed border-sumi-3/60 px-0.5 empty:hidden">{keys}</span>
      <span className="ml-0.5 inline-block h-4.5 w-0.5 animate-pulse rounded-full bg-shu" aria-hidden />
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
    <p className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold-tint px-3 py-1 text-[12.5px] text-gold">
      <span className="font-japanese font-semibold" lang="ja">ヒント</span>
      <span className="font-japanese text-sm text-sumi">{chunk}</span>
      <span aria-hidden>→</span>
      {method === "ROMAJI" ? (
        <kbd className="rounded border border-gold/40 bg-surface px-1.5 font-mono text-xs text-sumi">{keys}</kbd>
      ) : (
        Array.from(keys, (token, i) => (
          <kbd key={i} className="rounded border border-gold/40 bg-surface px-1.5 font-mono text-xs text-sumi">
            <span className="font-japanese">{token}</span> · {kanaKeyLabel(token) ?? "?"}
          </kbd>
        ))
      )}
    </p>
  );
}

function WarningNote({ kind }: { kind: Exclude<Warning, null> }) {
  return (
    <p className="rounded-xl border border-shu/30 bg-shu-tint px-4 py-2.5 text-[12.5px] font-medium text-shu-2" role="alert">
      {kind === "vietnamese" ? (
        <>
          Có vẻ <b>bộ gõ tiếng Việt</b> (Unikey, EVKey…) đang bật nên phím romaji bị biến thành “â, ư, đ…”.
          Chuyển sang tiếng Anh (<kbd>Ctrl + Shift</kbd> hoặc <kbd>Alt + Z</kbd>) rồi gõ tiếp.
        </>
      ) : (
        <>
          <b>Bộ gõ tiếng Nhật (IME)</b> đang giữ phím. Tắt IME (<kbd>半角/全角</kbd> hoặc <kbd>Alt + `</kbd>), hoặc chọn cách nhập “Bộ gõ IME”.
        </>
      )}
    </p>
  );
}
