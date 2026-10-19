"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { HINT_AFTER_MISSES, StrokeStage, type AttemptResult, type StrokeFeedback, type StrokeStageHandle } from "@/components/kana/StrokeStage";
import { Badge, Button, Seg, SpeakButton } from "@/components/ui";
import { VOCABULARY } from "@/data/vocabulary";
import { RADICAL_NAMES, hanVietOf, kanjiOf, kunLabel, type KanjiEntry } from "@/lib/kanji";
import { stageStrokes, strokeCount } from "@/lib/kanji-strokes";
import type { PracticeMode } from "@/lib/types";

/* Trang một chữ: thứ tự nét (xem hoạt ảnh hoặc tự viết, máy chấm từng nét), âm Hán Việt, nghĩa, On/Kun, bộ thủ,
   chiết tự, cách nhớ và từ ví dụ kèm âm Hán Việt. Tập viết ở đây chỉ để luyện tay — không ghi điểm, không vào lịch FSRS
   (Kanji chưa phải một nguồn thẻ; muốn ôn theo lịch thì thêm chữ vào bộ thẻ). */

const startNote = (mode: PracticeMode) =>
  mode === "TEST"
    ? `Tự viết trên bảng trắng. Sai ${HINT_AFTER_MISSES.TEST} lần liên tiếp ở một nét thì nét mẫu mới hiện ra.`
    : "Xem hoạt ảnh rồi viết đè theo nét mẫu, đúng thứ tự.";

interface Props {
  k: KanjiEntry;
  /** Vị trí trong danh sách đang lọc, để chuyển chữ trước/sau. */
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onPick: (c: string) => void;
  onRadical: (r: string) => void;
  onClose: () => void;
  speak: (text: string, key: string) => void;
  speaking: string | null;
  hasCard: boolean;
  onAddCard: () => void;
  wordsAdded: boolean;
  onAddWords: () => void;
}

export function KanjiDetail({
  k, index, total, onPrev, onNext, onPick, onRadical, onClose, speak, speaking, hasCard, onAddCard, wordsAdded, onAddWords,
}: Props) {
  const stage = useRef<StrokeStageHandle>(null);
  const [mode, setMode] = useState<PracticeMode>("TRACE");
  const [done, setDone] = useState(0);
  const [note, setNote] = useState(() => startNote("TRACE"));
  const [tone, setTone] = useState<"" | "good" | "bad">("");

  useEffect(() => {
    setDone(0);
    setNote(startNote(mode));
    setTone("");
  }, [k.c, mode]);

  const total_ = strokeCount(k.c);
  const onFeedback = (f: StrokeFeedback) => {
    setNote(f.message);
    setTone(f.ok ? "good" : "bad");
  };
  const onComplete = (r: AttemptResult) => {
    const s = Math.round(r.avgScore);
    setNote(s >= 80 ? `Đẹp lắm! ${s}/100 điểm.` : s >= 60 ? `Được rồi: ${s}/100. Viết lại cho thật tay nhé.` : `${s}/100 — xem lại thứ tự nét rồi thử lần nữa.`);
    setTone(s >= 60 ? "good" : "bad");
  };

  // Từ vựng có sẵn chứa chữ này mà chưa nằm trong ví dụ — nối hai kho với nhau.
  const own = new Set(k.words.map(([w]) => w));
  const fromVocab = VOCABULARY.filter((v) => v.word.includes(k.c) && !own.has(v.word));

  return (
    <article aria-label={`Chữ ${k.c}`} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onPrev} disabled={total < 2} aria-label="Chữ trước">←</Button>
        <span className="text-[12px] text-sumi-3 tnum">{index + 1}/{total}</span>
        <Button size="sm" variant="ghost" onClick={onNext} disabled={total < 2} aria-label="Chữ sau">→</Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto" aria-label="Đóng chữ này">✕</Button>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex flex-col items-center">
          <span lang="ja" className="font-mincho text-7xl leading-none">{k.c}</span>
          <SpeakButton active={speaking === `k${k.c}`} label={`Phát âm chữ ${k.c}`} onClick={() => speak(k.c, `k${k.c}`)} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-wide text-shu">{k.hv}</h2>
          <p className="mt-0.5 text-[15px]">{k.vi}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge size="sm">N{k.jlpt}</Badge>
            <Badge size="sm">{total_} nét</Badge>
            <button
              type="button"
              onClick={() => onRadical(k.radical)}
              title="Xem các chữ cùng bộ"
              className="cursor-pointer rounded-full border border-genko/25 bg-genko-tint px-2.5 py-0.5 text-[10.5px] font-semibold text-genko hover:border-genko/60"
            >
              Bộ <span lang="ja" className="font-mincho text-[12px]">{k.radical}</span> {RADICAL_NAMES[k.radical]}
            </button>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-sumi-3">Âm On</dt>
        <dd lang="ja">{k.on.length ? k.on.join("・") : "—"}</dd>
        <dt className="text-sumi-3">Âm Kun</dt>
        <dd lang="ja">{k.kun.length ? k.kun.map(kunLabel).join("・") : "—"}</dd>
      </dl>

      <section aria-label="Chiết tự" className="rounded-xl border border-rule/80 bg-paper-sunk/50 px-3.5 py-3">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-sumi-3">Chiết tự · cách nhớ</h3>
        {k.parts.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {k.parts.map((p, i) => {
              const part = kanjiOf(p);
              const name = part?.hv ?? RADICAL_NAMES[p];
              const body = (
                <>
                  <span lang="ja" className="font-mincho text-lg">{p}</span>
                  {name && <span className="text-[11px] font-semibold text-sumi-3">{name}</span>}
                </>
              );
              return (
                <span key={`${p}${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-sumi-3">+</span>}
                  {part && part.c !== k.c ? (
                    <button
                      type="button"
                      onClick={() => onPick(part.c)}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-rule bg-surface px-2 py-0.5 hover:border-rule-firm"
                    >
                      {body}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 rounded-lg border border-rule/60 px-2 py-0.5">{body}</span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-sumi-3">Chữ tượng hình — vẽ lại chính sự vật.</p>
        )}
        <p className="mt-2 text-sm leading-relaxed">{k.memo}</p>
      </section>

      <section aria-label="Thứ tự nét" className="flex flex-col items-center gap-3">
        <Seg<PracticeMode>
          value={mode}
          onChange={setMode}
          options={[{ value: "TRACE", label: "Xem nét · viết theo" }, { value: "TEST", label: "Tự viết" }]}
          className="w-full max-w-sm"
        />
        <div className="w-full max-w-[300px] rounded-2xl border-2 border-rule-firm/60 bg-paper-sunk/35 p-1.5 shadow-inner">
          <StrokeStage
            ref={stage}
            char={{ c: k.c }}
            strokes={stageStrokes(k.c)}
            mode={mode}
            onFeedback={onFeedback}
            onProgress={setDone}
            onComplete={onComplete}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-sumi-3 tnum">{done}/{total_} nét</span>
          {mode === "TRACE" && <Button size="sm" variant="outline" onClick={() => stage.current?.replay()}>▶ Xem lại</Button>}
          <Button size="sm" variant="ghost" onClick={() => stage.current?.reset()}>Viết lại</Button>
        </div>
        <p
          aria-live="polite"
          className={clsx(
            "min-h-9 max-w-[44ch] rounded-xl px-3 py-1.5 text-center text-xs font-medium",
            tone === "bad" ? "border border-shu/25 bg-shu-tint text-shu-2" : tone === "good" ? "border border-genko/25 bg-genko-tint text-genko" : "bg-paper-sunk/60 text-sumi-2",
          )}
        >
          {note}
        </p>
      </section>

      <section aria-label="Từ ví dụ">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-sumi-3">Từ ví dụ</h3>
          <span className="ml-auto flex flex-wrap gap-1.5">
            {hasCard ? (
              <span className="text-[12px] font-semibold text-genko">✓ Chữ đã có trong bộ thẻ</span>
            ) : (
              <Button size="sm" variant="outline" onClick={onAddCard}>＋ Thêm chữ vào bộ thẻ</Button>
            )}
            {!wordsAdded && <Button size="sm" variant="ghost" onClick={onAddWords}>＋ Thêm các từ</Button>}
          </span>
        </div>
        <ul className="mt-2 divide-y divide-rule/60">
          {[...k.words.map(([w, r, vi]) => ({ w, r, vi })), ...fromVocab.map((v) => ({ w: v.word, r: v.reading, vi: v.meaningVi }))].map(({ w, r, vi }) => {
            const hv = hanVietOf(w);
            return (
              <li key={w} className="flex items-center gap-2 py-1.5 text-sm">
                <span lang="ja" className="font-mincho text-lg">{w}</span>
                <SpeakButton active={speaking === `w${w}`} label={`Phát âm ${w} (${r})`} onClick={() => speak(w, `w${w}`)} />
                <span className="min-w-0 flex-1">
                  <span lang="ja" className="text-[12.5px] text-sumi-3">{r}</span>
                  {hv && <span className="ml-1.5 text-[11.5px] font-semibold tracking-wide text-genko">{hv}</span>}
                  <span className="block">{vi}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
