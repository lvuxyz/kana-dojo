"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Button, Card, Progress } from "@/components/ui";
import { kanaFromKey } from "@/lib/typing/kana-layout";
import { PhraseView, RomajiGuide } from "./PhraseView";
import { useSpeech } from "./useSpeech";
import { useTypingGame, type GameConfig, type GameResult } from "./useTypingGame";
import { VirtualKeyboard, capLabel, keyForKanaToken } from "./VirtualKeyboard";

type Warning = "ime" | "vietnamese" | null;

/** Phím romaji hợp lệ: chữ Latin, số và vài dấu dùng trong bảng (ー = "-", ん = "n'"). */
const ROMAJI_KEY = /^[a-z0-9\-',.!?[\]/~]$/;

export function TypingStage({
  config,
  onFinish,
  onExit,
}: {
  config: GameConfig;
  onFinish: (r: GameResult) => void;
  /** Bỏ ván, quay về màn chọn bài */
  onExit: () => void;
}) {
  const game = useTypingGame(config, onFinish);
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
  const nextKey = run?.nextKey();
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
          <span className={clsx(live.miss > 0 && "text-shu")}>{live.miss}</span>
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
        className={clsx("relative flex min-h-64 flex-col items-center justify-center gap-5 px-5 py-9 sm:px-10")}
      >
        <div key={live.missTick} className={clsx("flex w-full flex-col items-center gap-5", live.missTick > 0 && "type-shake")}>
          <PhraseView
            phrase={live.phrase}
            unit={method === "IME" ? "ime" : "kana"}
            pos={method === "IME" ? live.imeMatched : (cur?.start ?? 0)}
            curEnd={method === "IME" ? live.imeMatched + 1 : (cur?.end ?? 0)}
            hidden={config.dictation}
          />

          {live.phrase.vi && <p className="text-center text-sm font-medium text-sumi-3">{live.phrase.vi}</p>}

          {method === "ROMAJI" && run && config.showGuide && (
            <RomajiGuide typed={run.typed} rest={run.rest()} showRest={!config.dictation} />
          )}
          {method === "KANA" && config.showGuide && nextKey && !config.dictation && <KanaHint token={nextKey} />}
        </div>

        {live.phase === "ready" && (
          <p className="absolute inset-x-0 top-3 text-center text-[12px] font-semibold text-sumi-3">
            {method === "IME" ? "Gõ vào ô bên dưới để bắt đầu tính giờ" : "Gõ phím đầu tiên để bắt đầu tính giờ"}
          </p>
        )}
        {canSpeak && (
          <button
            type="button"
            onClick={() => speak(live.phrase.text)}
            className="absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-full text-sumi-3 transition-colors hover:bg-paper-sunk hover:text-sumi"
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
          <PhraseView phrase={live.upcoming} unit="kana" pos={0} curEnd={0} size="sm" />
        </div>
      )}

      {config.showKeyboard && method !== "IME" && (
        <VirtualKeyboard
          method={method}
          next={config.dictation ? undefined : nextKey}
          className="mx-auto hidden w-full max-w-3xl md:block"
        />
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

/** Chế độ kana: nói rõ phím nào, vì người mới chưa thuộc bố cục JIS. */
function KanaHint({ token }: { token: string }) {
  const key = keyForKanaToken(token);
  return (
    <p className="text-center text-sm text-sumi-3">
      Phím kế tiếp: <span className="font-japanese text-lg font-bold text-shu">{token}</span>
      {key && (
        <>
          {" "}→{" "}
          {key.shift && <Kbd>Shift</Kbd>}
          {key.shift && " + "}
          <Kbd>{capLabel(key.code)}</Kbd>
        </>
      )}
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-rule bg-surface px-1.5 py-0.5 font-mono text-xs text-sumi">{children}</kbd>;
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
