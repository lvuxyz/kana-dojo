"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { StrokeStage, type AttemptResult, type StrokeFeedback, type StrokeStageHandle } from "./StrokeStage";
import { Button, Seg } from "@/components/ui";
import { BADGES } from "@/data/badges";
import type { KanaChar } from "@/lib/kana";
import type { PracticeMode, WritingResult } from "@/lib/types";

interface Props {
  char: KanaChar;
  index: number;
  total: number;
  mode: PracticeMode;
  onModeChange: (m: PracticeMode) => void;
  onSubmit: (r: AttemptResult) => WritingResult;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export function PracticePanel({
  char, index, total, mode, onModeChange, onSubmit, onNext, onPrev, onClose,
}: Props) {
  const stage = useRef<StrokeStageHandle>(null);
  const [done, setDone] = useState(0);
  const [note, setNote] = useState("Viết nét số 1 theo hướng mũi tên của nét mẫu.");
  const [tone, setTone] = useState<"" | "good" | "bad">("");
  const [score, setScore] = useState<number | null>(null);
  const [result, setResult] = useState<WritingResult | null>(null);
  // Kết quả chỉ mang mã huy hiệu; tên hiển thị tra từ danh mục.
  const badgeName = (code: string) => BADGES.find((b) => b.code === code)?.nameVi ?? code;

  useEffect(() => {
    setDone(0); setNote("Viết nét số 1 theo hướng mũi tên của nét mẫu.");
    setTone(""); setScore(null); setResult(null);
  }, [char.c, mode]);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNote("Trình duyệt này không hỗ trợ đọc thành tiếng."); setTone("bad"); return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(char.c);
    u.lang = "ja-JP";
    u.rate = 0.72;
    const ja = window.speechSynthesis.getVoices().find((v) => /^ja/i.test(v.lang));
    if (ja) u.voice = ja;
    else { setNote("Máy chưa cài giọng tiếng Nhật — âm thanh có thể sai."); setTone("bad"); }
    window.speechSynthesis.speak(u);
  }, [char.c]);

  const handleFeedback = (f: StrokeFeedback) => {
    setNote(f.message);
    setTone(f.ok ? "good" : "bad");
    setScore(f.score);
  };

  const handleComplete = (r: AttemptResult) => {
    setScore(r.avgScore);
    setResult(onSubmit(r));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") { e.preventDefault(); onNext(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); }
      else if (k === "r") { e.preventDefault(); stage.current?.replay(); }
      else if (k === "c") { e.preventDefault(); stage.current?.reset(); }
      else if (e.key === " ") { e.preventDefault(); speak(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev, speak]);

  const strokeTotal = char.n;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center sm:p-5">
      <button className="absolute inset-0 bg-sumi/50 backdrop-blur-md cursor-pointer" onClick={onClose} aria-label="Đóng" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tập viết ${char.c}`}
        className="glass-luxury relative flex h-dvh w-full flex-col overflow-auto bg-surface sm:h-auto sm:max-h-[calc(100dvh-40px)] sm:w-[min(940px,100%)] sm:rounded-3xl sm:border sm:border-rule/80 sm:shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-xl border border-rule/80 bg-surface/90 text-sumi-2 shadow-xs hover:text-sumi hover:bg-surface cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_310px]">
          {/* ------------------------------------------------ khung tập viết */}
          <div className="flex flex-col items-center justify-center gap-5 border-b border-rule/70 px-4 pb-6 pt-14 lg:border-b-0 lg:border-r lg:px-8 lg:pt-8">
            <div className="w-full" style={{ maxWidth: char.c.length > 1 ? 620 : 390 }}>
              <div className="relative mx-auto rounded-2xl border-2 border-rule-firm/60 bg-paper-sunk/35 p-2 shadow-inner">
                <StrokeStage
                  ref={stage}
                  char={char}
                  mode={mode}
                  onFeedback={handleFeedback}
                  onProgress={setDone}
                  onComplete={handleComplete}
                />
              </div>
            </div>

            {/* Các nét đã hoàn thành */}
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: strokeTotal }, (_, i) => (
                <span
                  key={i}
                  className={clsx(
                    "grid h-7 w-7 place-items-center rounded-full border-[1.5px] text-xs font-bold tnum transition-all",
                    i < done
                      ? "border-genko bg-genko text-white shadow-xs shadow-genko/30"
                      : i === done
                      ? "border-shu text-shu ring-4 ring-shu-tint font-extrabold"
                      : "border-rule text-sumi-3 bg-surface/60",
                  )}
                >
                  {i + 1}
                </span>
              ))}
            </div>

            <p
              aria-live="polite"
              className={clsx(
                "min-h-10 max-w-[44ch] text-center text-sm font-medium leading-relaxed px-4 py-2 rounded-xl transition-colors",
                tone === "bad"
                  ? "text-shu-2 bg-shu-tint border border-shu/25"
                  : tone === "good"
                  ? "text-genko bg-genko-tint border border-genko/25"
                  : "text-sumi-2 bg-paper-sunk/60",
              )}
            >
              {note}
            </p>
          </div>

          {/* -------------------------------------------------------- bảng bên */}
          <aside className="flex flex-col gap-4.5 bg-surface-2/80 px-6 py-6 border-t border-rule/50 lg:border-t-0">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 pr-6">
              <div className="font-mincho text-5xl font-bold leading-none tracking-tight text-sumi">
                {char.c}
              </div>
              <div>
                <div className="text-xl font-extrabold text-sumi">{char.r}</div>
                <div className="text-[13px] font-medium text-sumi-2">Đọc gần như: <b className="text-sumi font-semibold">{char.vn}</b></div>
                <div className="text-xs font-medium text-sumi-3 tnum">{char.n} nét · Ký tự {index + 1}/{total}</div>
              </div>
            </div>

            <Button onClick={speak} className="w-full font-semibold">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
              <span>Nghe giọng bản ngữ</span>
            </Button>

            <div>
              <span className="label-xs">Chế độ luyện tập</span>
              <Seg
                className="mt-1.5"
                value={mode}
                onChange={onModeChange}
                options={[{ value: "TRACE", label: "Đồ theo nét" }, { value: "TEST", label: "Tự viết" }]}
              />
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5 rounded-2xl border border-rule/80 bg-surface px-4 py-3.5 shadow-xs">
              <div
                className={clsx(
                  "min-w-[2.5ch] text-right font-mincho text-3xl font-bold leading-none tnum",
                  score == null ? "text-sumi-3" : score >= 80 ? "text-genko" : score >= 58 ? "text-gold" : "text-shu",
                )}
              >
                {score ?? "—"}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="label-xs">{done >= strokeTotal ? "Điểm trung bình cả chữ" : "Nét vừa hoàn thành"}</span>
                <span className="text-xs font-medium text-sumi-2">
                  {score == null
                    ? "Viết nét đầu tiên để chấm điểm"
                    : score >= 80
                    ? "Nét vẽ rất chuẩn xác!"
                    : score >= 58
                    ? "Đạt yêu cầu, còn lệch nhẹ"
                    : "Chưa đạt — thử vẽ lại nét này nhé"}
                </span>
              </div>
            </div>

            {result && (
              <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-genko/30 bg-genko-tint/80 p-4 text-center shadow-xs">
                <div className="font-mincho text-lg font-bold text-genko">
                  {result.avgScore >= 85 ? "見事 — Xuất sắc!" : result.avgScore >= 68 ? "よし — Làm tốt lắm" : "もう一度 — Cố gắng thêm nhé"}
                </div>
                <div className="text-[13px] font-semibold text-sumi-2">
                  +{result.xpEarned} XP
                  {result.card.intervalDays > 0
                    ? <> · Lịch ôn: sau <b className="tnum text-genko">{result.card.intervalDays}</b> ngày</>
                    : <> · Gặp lại trong ít phút</>}
                </div>
                {result.newBadges.length > 0 && (
                  <div className="text-xs font-bold text-gold">
                    🎖 Đạt huy hiệu: {result.newBadges.map(badgeName).join(", ")}
                  </div>
                )}
                <Button variant="solid" onClick={onNext} className="mt-1 w-full font-semibold">
                  Ký tự tiếp theo ›
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => stage.current?.replay()}>Xem nét mẫu</Button>
              <Button onClick={() => stage.current?.reset()}>Xoá làm lại</Button>
              <Button onClick={onPrev}>‹ Ký tự trước</Button>
              <Button onClick={onNext}>Tiếp theo ›</Button>
              <Button className="col-span-2" onClick={() => stage.current?.toggleCompare()}>So sánh nét chuẩn</Button>
              {mode === "TEST" && (
                <Button className="col-span-2" variant="ghost" onClick={() => stage.current?.peek()}>
                  Hé nét mẫu 2 giây
                </Button>
              )}
            </div>

            <p className="text-[11.5px] leading-relaxed text-sumi-3 pt-1">
              Phím tắt: <kbd className="rounded border border-rule-firm border-b-2 px-1 py-0.5 text-[10.5px]">R</kbd> xem mẫu ·{" "}
              <kbd className="rounded border border-rule-firm border-b-2 px-1 py-0.5 text-[10.5px]">C</kbd> xoá ·{" "}
              <kbd className="rounded border border-rule-firm border-b-2 px-1 py-0.5 text-[10.5px]">Space</kbd> đọc ·{" "}
              <kbd className="rounded border border-rule-firm border-b-2 px-1 py-0.5 text-[10.5px]">←</kbd>
              <kbd className="rounded border border-rule-firm border-b-2 px-1 py-0.5 text-[10.5px]">→</kbd> đổi chữ
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
