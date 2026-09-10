"use client";

import { useCallback, useRef, useState } from "react";
import { StrokeStage, type StrokeStageHandle } from "./StrokeStage";
import { Button, Seg } from "@/components/ui";
import { KANA } from "@/lib/kana";
import type { PracticeMode } from "@/lib/types";

const DEMO_CHARS = [
  { c: "あ", r: "a", name: "Hiragana a" },
  { c: "い", r: "i", name: "Hiragana i" },
  { c: "ね", r: "ne", name: "Hiragana ne" },
  { c: "き", r: "ki", name: "Hiragana ki" },
  { c: "さ", r: "sa", name: "Hiragana sa" },
  { c: "ゆ", r: "yu", name: "Hiragana yu" },
];

/** Studio tập viết tương tác trực tiếp ngay tại Hero
 *  Khách vào trang là có thể trải nghiệm nét cọ và phát âm ngay mà không cần tạo tài khoản.
 */
export function HeroDemo() {
  const stage = useRef<StrokeStageHandle>(null);
  const [activeChar, setActiveChar] = useState(DEMO_CHARS[0].c);
  const [mode, setMode] = useState<PracticeMode>("TRACE");
  const [note, setNote] = useState("Dùng chuột hoặc ngón tay vẽ theo đường nét mờ.");
  const [tone, setTone] = useState<"" | "good" | "bad">("");
  const [score, setScore] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  const char = KANA.chars.find((c) => c.c === activeChar) ?? KANA.chars[0];

  const handleSelectChar = (c: string) => {
    setActiveChar(c);
    setScore(null);
    setTone("");
    setCompleted(false);
    setNote("Dùng chuột hoặc ngón tay vẽ theo đường nét mờ.");
    stage.current?.reset();
  };

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(char.c);
    u.lang = "ja-JP";
    u.rate = 0.75;
    const jaVoice = window.speechSynthesis.getVoices().find((v) => /^ja/i.test(v.lang));
    if (jaVoice) u.voice = jaVoice;
    window.speechSynthesis.speak(u);
  }, [char.c]);

  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      {/* Hiệu ứng hào quang nền đa sắc (Ambient Glow & Urushi Lacquer depth) */}
      <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-tr from-shu/20 via-gold/15 to-genko/20 blur-2xl opacity-80 dark:opacity-50 pointer-events-none" />

      <div className="glass-luxury relative flex flex-col gap-4.5 rounded-[28px] p-5.5 sm:p-6 transition-all duration-300">
        {/* Header của khung demo */}
        <div className="flex items-center justify-between gap-3 border-b border-rule/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-shu opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-shu shadow-xs shadow-shu" />
            </span>
            <div className="flex items-center gap-1.5 font-sans text-xs font-bold tracking-wider uppercase text-sumi">
              <span>Studio Trải Nghiệm</span>
              <span className="rounded bg-shu-tint px-1.5 py-0.2 font-mincho text-[10px] font-bold text-shu">
                試筆
              </span>
            </div>
          </div>

          <Seg
            value={mode}
            onChange={(m) => {
              setMode(m);
              setCompleted(false);
              setScore(null);
              stage.current?.reset();
            }}
            options={[
              { value: "TRACE", label: "Đồ nét" },
              { value: "TEST", label: "Tự viết" },
            ]}
          />
        </div>

        {/* Danh sách chọn nhanh chữ demo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-sumi-3 shrink-0 mr-1">Chữ:</span>
          {DEMO_CHARS.map((item) => (
            <button
              key={item.c}
              onClick={() => handleSelectChar(item.c)}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-mincho text-sm font-bold transition-all duration-150 cursor-pointer ${
                activeChar === item.c
                  ? "bg-gradient-to-br from-shu to-shu-2 text-white shadow-md shadow-shu/30 scale-105 ring-1 ring-white/20"
                  : "bg-surface/80 text-sumi-2 border border-rule/70 hover:border-rule-firm hover:text-sumi hover:bg-surface"
              }`}
            >
              <span className="text-base leading-none">{item.c}</span>
              <span className="font-sans text-[10px] opacity-80 font-normal">({item.r})</span>
            </button>
          ))}
        </div>

        {/* Khung Canvas StrokeStage với phong cách khung tranh Washi */}
        <div className="relative mx-auto w-full max-w-[340px] rounded-2xl border-2 border-rule-firm/60 bg-paper-sunk/40 p-2.5 shadow-inner backdrop-blur-xs">
          {/* Góc trang trí truyền thống */}
          <span className="absolute top-1.5 left-1.5 h-2 w-2 border-t-2 border-l-2 border-genko/50 rounded-tl-sm pointer-events-none" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 border-t-2 border-r-2 border-genko/50 rounded-tr-sm pointer-events-none" />
          <span className="absolute bottom-1.5 left-1.5 h-2 w-2 border-b-2 border-l-2 border-genko/50 rounded-bl-sm pointer-events-none" />
          <span className="absolute bottom-1.5 right-1.5 h-2 w-2 border-b-2 border-r-2 border-genko/50 rounded-br-sm pointer-events-none" />

          <StrokeStage
            ref={stage}
            char={char}
            mode={mode}
            onFeedback={(f) => {
              setNote(f.message);
              setTone(f.ok ? "good" : "bad");
              setScore(f.score);
              setCompleted(false);
            }}
            onComplete={(r) => {
              setNote(`Hoàn thành xuất sắc! Điểm trung bình: ${r.avgScore}/100.`);
              setTone("good");
              setScore(r.avgScore);
              setCompleted(true);
            }}
          />

          {/* Con dấu triện son Hanko chúc mừng khi hoàn thành (合格 / 済) */}
          {completed && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="hanko-seal hanko-seal-stamp flex flex-col items-center justify-center px-4 py-2 text-center shadow-xl shadow-shu/30 backdrop-blur-xs">
                <span className="text-2xl font-black leading-tight tracking-widest text-shu">
                  {score && score >= 80 ? "合格" : "済"}
                </span>
                <span className="font-sans text-[10px] font-bold text-shu-2 tracking-wider">
                  {score && score >= 80 ? "XUẤT SẮC" : "ĐÃ XONG"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hộp phản hồi trạng thái nét viết với phong cách thanh lịch */}
        <div
          className={`flex min-h-[48px] items-center justify-center rounded-xl px-3.5 py-2 text-center text-[13px] font-semibold leading-snug transition-all duration-200 ${
            tone === "bad"
              ? "bg-shu-tint text-shu-2 border border-shu/30 shadow-xs shadow-shu/10"
              : tone === "good"
              ? "bg-genko-tint text-genko border border-genko/30 shadow-xs shadow-genko/10"
              : "bg-surface/80 text-sumi-2 border border-rule/70"
          }`}
        >
          {note}
        </div>

        {/* Thanh công cụ hành động trực quan */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={speak}
              className="text-xs"
              title="Phát âm chuẩn tiếng Nhật"
            >
              <svg className="w-3.5 h-3.5 text-shu" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
              </svg>
              <span>Đọc âm</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCompleted(false);
                stage.current?.replay();
              }}
              className="text-xs"
              title="Xem hoạt ảnh mẫu thứ tự nét"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Xem mẫu</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCompleted(false);
                setScore(null);
                stage.current?.reset();
              }}
              className="text-xs"
              title="Xoá để vẽ lại từ đầu"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Vẽ lại</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {score !== null && (
              <div className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 border border-rule/80 shadow-xs">
                <span className="text-[11px] font-bold text-sumi-3 uppercase tracking-wider">Điểm:</span>
                <span
                  className={`font-mincho text-xl font-bold tnum ${
                    score >= 80 ? "text-genko" : score >= 58 ? "text-gold" : "text-shu"
                  }`}
                >
                  {score}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
