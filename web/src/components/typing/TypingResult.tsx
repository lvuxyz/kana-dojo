"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Badge, Button, Card } from "@/components/ui";
import type { Phrase } from "@/lib/typing/phrases";
import { beltFor, formatDuration, kpm, nextBelt } from "@/lib/typing/score";
import type { GameResult, PhraseRecord } from "./useTypingGame";

/**
 * Kết quả ghi lượt: kỷ lục của tổ hợp vừa chơi; "practice" nếu là lượt luyện lại câu có lỗi (không tính
 * kỷ lục); null nếu chưa gõ đúng phím nào.
 */
export type RecordOutcome =
  | { kind: "record"; personalBest: number; newBest: boolean }
  | { kind: "practice" }
  | null;

const ENDED: Record<GameResult["endedBy"], string> = {
  complete: "Hoàn thành bài",
  timeout: "Hết giờ",
  miss: "Gõ sai — kết thúc lượt sinh tử",
  stopped: "Dừng sớm",
};

export function TypingResult({
  result,
  outcome,
  onRetry,
  onRetryMistakes,
  onSetup,
}: {
  result: GameResult;
  outcome: RecordOutcome;
  onRetry: () => void;
  /** Luyện lại đúng các câu vừa gõ sai */
  onRetryMistakes: (phrases: Phrase[]) => void;
  onSetup: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSetup();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSetup]);

  const sudden = result.config.mode === "SUDDEN_DEATH";
  // Sinh tử chấm bằng độ dài chuỗi, nên đai (thang theo tốc độ) chỉ áp cho hai chế độ còn lại.
  const belt = beltFor(result.score);
  const upcoming = nextBelt(result.score);
  const minutes = result.durationMs / 60_000;
  const cpm = minutes > 0 ? result.charsTyped / minutes : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Card variant="luxury" className="flex flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:items-center sm:gap-10 sm:px-10">
        {sudden ? (
          <div className="hanko-seal hanko-seal-stamp h-28 w-28 flex-none flex-col text-4xl">
            連<span className="mt-1 text-[11px] font-bold tracking-widest">{result.correctKeys} phím</span>
          </div>
        ) : (
          <div className="flex flex-none flex-col items-center gap-2">
            <div className="hanko-seal hanko-seal-stamp h-28 w-28 text-[38px]">{belt.ja}</div>
            <span className="h-2 w-28 rounded-full border border-rule-firm" style={{ background: belt.color }} aria-hidden />
          </div>
        )}

        <div className="flex flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <span className="label-xs">{ENDED[result.endedBy]}</span>
          <div className="flex items-baseline gap-3">
            <span className="font-mincho text-6xl font-bold leading-none tnum">{result.score}</span>
            <span className="text-sm font-semibold text-sumi-3">{sudden ? "phím liên tiếp" : "điểm"}</span>
          </div>
          {!sudden && (
            <p className="text-sm text-sumi-2">
              <b>{belt.vi}</b>
              {upcoming ? <> · còn <b className="tnum">{upcoming.min - result.score}</b> điểm nữa lên {upcoming.vi} ({upcoming.ja})</> : " · hạng cao nhất"}
            </p>
          )}
          <RecordLine outcome={outcome} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Phím / phút" value={Math.round(result.kpm)} />
        <Tile label="Kana / phút" value={Math.round(cpm)} />
        <Tile label="Chính xác" value={`${(result.accuracy * 100).toFixed(1)}%`} />
        <Tile label="Thời gian" value={formatDuration(result.durationMs)} />
        <Tile label="Gõ sai" value={result.missKeys} />
        <Tile label="Câu xong" value={result.phrasesCompleted} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3 px-5 py-4">
          <h2 className="font-mincho text-lg font-semibold">Điểm yếu cần luyện</h2>
          {result.weakKana.length === 0 ? (
            <p className="text-sm text-sumi-3">Không sai phím nào — 完璧！</p>
          ) : (
            <>
              <WeakList title="Chữ hay sai" items={result.weakKana.slice(0, 8)} ja />
              {result.weakKeys.length > 0 && <WeakList title="Phím lẽ ra phải bấm" items={result.weakKeys.slice(0, 8)} />}
              {result.hinted.length > 0 && <WeakList title="Phải nhờ gợi ý mới gõ được" items={result.hinted} ja />}
              <p className="text-[12px] text-sumi-3">Các chữ này đã được ghi vào mục “Chữ hay sai” để luyện riêng.</p>
            </>
          )}
          <p className="text-[12.5px] leading-relaxed text-sumi-3">{advice(result)}</p>
        </Card>

        <Card className="flex flex-col gap-3 px-5 py-4">
          <h2 className="font-mincho text-lg font-semibold">Tốc độ từng câu</h2>
          {result.phrases.length >= 2 ? (
            <PhraseSpeedChart phrases={result.phrases.slice(-24)} />
          ) : (
            <p className="text-sm text-sumi-3">Cần gõ xong ít nhất 2 câu để so tốc độ.</p>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="solid" size="lg" onClick={onRetry} autoFocus>
          Gõ lại <kbd className="ml-1 rounded border border-white/40 px-1 text-[10px]">Enter</kbd>
        </Button>
        {result.retry.length > 0 && (
          <Button variant="gold" size="lg" onClick={() => onRetryMistakes(result.retry)}>
            Luyện lại {result.retry.length} câu có lỗi
          </Button>
        )}
        <Button size="lg" onClick={onSetup}>
          Chọn bài khác <kbd className="ml-1 rounded border border-rule px-1 text-[10px]">Esc</kbd>
        </Button>
      </div>
    </div>
  );
}

function RecordLine({ outcome }: { outcome: RecordOutcome }) {
  if (!outcome) return <p className="text-[13px] text-sumi-3">Chưa gõ đúng phím nào nên lượt này không được ghi.</p>;
  if (outcome.kind === "practice") {
    return <p className="text-[13px] text-sumi-3">Lượt luyện lại câu có lỗi — không tính kỷ lục.</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {outcome.newBest ? (
        <Badge variant="shu">Kỷ lục mới!</Badge>
      ) : (
        <span className="text-[13px] text-sumi-3">
          Kỷ lục của bạn ở bài này: <b className="tnum text-sumi">{outcome.personalBest}</b>
        </span>
      )}
      <span className="text-[11.5px] text-sumi-3">· lưu trên trình duyệt này</span>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-1.5 px-4 py-3">
      <span className="label-xs">{label}</span>
      <span className="text-2xl font-semibold leading-none tnum">{value}</span>
    </Card>
  );
}

function WeakList({ title, items, ja = false }: { title: string; items: [string, number][]; ja?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-sumi-2">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([k, n]) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-lg border border-rule/80 bg-paper-sunk px-2.5 py-1">
            <span className={clsx(ja ? "font-japanese text-base" : "font-mono text-sm", "text-sumi")}>{k}</span>
            <span className="text-[11px] font-semibold text-sumi-3 tnum">×{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function advice(r: GameResult): string {
  if (r.config.mode === "SUDDEN_DEATH") {
    return "Sinh tử thưởng cho sự chắc tay: nhìn trọn cả cụm trước khi bấm (きゃ là kya, っ là gấp đôi phụ âm) rồi mới gõ.";
  }
  if (r.accuracy < 0.9) {
    return "Độ chính xác dưới 90% đang kéo điểm xuống rất mạnh (điểm = tốc độ × chính xác³). Gõ chậm lại một nhịp, chắc tay rồi hẵng tăng tốc.";
  }
  if (r.kpm < 60) {
    return "Nền tảng tốt! Luyện thêm chế độ “Kana ngẫu nhiên” để thuộc vị trí phím và phản xạ nhanh hơn.";
  }
  if (!r.config.dictation) {
    return "Tốc độ ổn định — thử bật chế độ nghe chép để luyện nghe và nhớ cách viết.";
  }
  return "Rất vững! Thử chế độ Đua giờ hoặc Sinh tử để đẩy giới hạn của bạn.";
}

/** Cột tốc độ (phím/phút) theo từng câu: một chuỗi dữ liệu nên không cần chú thích màu;
 *  rê chuột/focus vào cột để xem câu và số liệu, bảng đầy đủ nằm trong mục mở rộng. */
function PhraseSpeedChart({ phrases }: { phrases: PhraseRecord[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const speeds = phrases.map((p) => kpm(p.keys, p.ms));
  const max = Math.max(...speeds, 1);
  const best = speeds.indexOf(Math.max(...speeds));
  const shown = hover ?? best;

  return (
    <div className="flex flex-col gap-2">
      <p className="min-h-5 text-[12.5px] text-sumi-2" aria-live="polite">
        <b className="tnum text-sumi">{Math.round(speeds[shown])} phím/phút</b>
        {" · "}
        <span className="font-japanese">{phrases[shown].phrase.text}</span>
        {phrases[shown].misses > 0 && <span className="text-sumi-3"> · sai {phrases[shown].misses}</span>}
        {hover === null && <span className="text-sumi-3"> (câu nhanh nhất)</span>}
      </p>
      <div className="flex h-32 items-end gap-[2px] border-b border-rule" onPointerLeave={() => setHover(null)}>
        {speeds.map((v, i) => (
          <div
            key={i}
            tabIndex={0}
            role="img"
            aria-label={`Câu ${i + 1}: ${Math.round(v)} phím mỗi phút`}
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
          >
            <div
              className={clsx(
                "w-full max-w-6 rounded-t-[4px] transition-colors",
                shown === i ? "bg-genko" : "bg-genko/45",
              )}
              style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <details className="text-[12px] text-sumi-3">
        <summary className="cursor-pointer select-none">Xem các câu đã gõ</summary>
        <table className="mt-2 w-full text-left tnum">
          <thead>
            <tr className="text-sumi-2">
              <th className="py-1 font-semibold">#</th>
              <th className="py-1 font-semibold">Câu</th>
              <th className="py-1 font-semibold">Nghĩa</th>
              <th className="py-1 text-right font-semibold">Phím/phút</th>
              <th className="py-1 text-right font-semibold">Sai</th>
            </tr>
          </thead>
          <tbody>
            {phrases.map((p, i) => (
              <tr key={i} className="border-t border-rule/60">
                <td className="py-1">{i + 1}</td>
                <td className="py-1 font-japanese text-sumi">{p.phrase.text}</td>
                <td className="py-1 pr-2">{p.phrase.vi || "—"}</td>
                <td className="py-1 text-right">{Math.round(speeds[i])}</td>
                <td className="py-1 text-right">{p.misses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
