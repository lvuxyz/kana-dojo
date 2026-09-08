"use client";

import { useRef, useState } from "react";
import { StrokeStage, type StrokeStageHandle } from "./StrokeStage";
import { Button, Seg } from "@/components/ui";
import { KANA } from "@/lib/kana";
import type { PracticeMode } from "@/lib/types";

const DEMO = ["あ", "い", "ぬ", "ね", "き", "さ"];

/** Hero của trang chủ chính là sản phẩm, không phải ảnh chụp sản phẩm.
 *  Khách vào là viết được ngay, không cần tài khoản. */
export function HeroDemo() {
  const stage = useRef<StrokeStageHandle>(null);
  const [ci, setCi] = useState(0);
  const [mode, setMode] = useState<PracticeMode>("TRACE");
  const [note, setNote] = useState("Dùng chuột hoặc ngón tay viết theo nét mờ.");
  const [tone, setTone] = useState<"" | "good" | "bad">("");
  const [score, setScore] = useState<number | null>(null);

  const char = KANA.chars.find((c) => c.c === DEMO[ci])!;

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-rule bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="label-xs">Thử ngay — không cần tài khoản</span>
        <Seg
          value={mode}
          onChange={setMode}
          options={[{ value: "TRACE", label: "Đồ nét" }, { value: "TEST", label: "Tự viết" }]}
        />
      </div>

      <div className="mx-auto w-full" style={{ maxWidth: 320 }}>
        <StrokeStage
          ref={stage}
          char={char}
          mode={mode}
          onFeedback={(f) => { setNote(f.message); setTone(f.ok ? "good" : "bad"); setScore(f.score); }}
          onComplete={(r) => { setNote(`Xong! Trung bình ${r.avgScore}/100.`); setTone("good"); setScore(r.avgScore); }}
        />
      </div>

      <p className={`min-h-10 text-center text-[13px] leading-snug ${
        tone === "bad" ? "text-shu-2" : tone === "good" ? "text-genko" : "text-sumi-2"}`}>
        {note}
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => stage.current?.replay()}>Xem mẫu</Button>
          <Button size="sm" onClick={() => stage.current?.reset()}>Xóa</Button>
        </div>
        <div className="flex items-center gap-2">
          {score !== null && (
            <span className={`font-mincho text-xl font-semibold tnum ${
              score >= 80 ? "text-genko" : score >= 58 ? "text-gold" : "text-shu"}`}>{score}</span>
          )}
          <Button size="sm" onClick={() => setCi((i) => (i + 1) % DEMO.length)}>Chữ khác ›</Button>
        </div>
      </div>
    </div>
  );
}
