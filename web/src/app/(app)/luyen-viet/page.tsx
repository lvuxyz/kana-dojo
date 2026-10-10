"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KanaGrid, type CellState } from "@/components/kana/KanaGrid";
import { PracticePanel } from "@/components/kana/PracticePanel";
import { Card, Chip, Seg, Spinner, Stat } from "@/components/ui";
import { charsOf, type KanaGroup, type Script } from "@/lib/kana";
import { findKana } from "@/lib/learning/cards";
import { useKanaProgress } from "@/lib/learning/hooks";
import { recordWritingAttempt } from "@/lib/learning/store";
import type { PracticeMode } from "@/lib/types";

const GROUPS: { value: KanaGroup | "all"; label: string; count: number }[] = [
  { value: "all", label: "Tất cả", count: 104 },
  { value: "basic", label: "Cơ bản", count: 46 },
  { value: "dakuten", label: "Biến âm", count: 25 },
  { value: "yoon", label: "Âm ghép", count: 33 },
];

export default function WritingPage() {
  // useSearchParams buộc phần dưới phải nằm trong Suspense khi xuất bản tĩnh.
  return (
    <Suspense fallback={<Spinner label="Đang mở phòng luyện viết" />}>
      <WritingRoom />
    </Suspense>
  );
}

function WritingRoom() {
  // Từ bảng chữ cái công khai, bấm một ký tự sẽ tới đây với ?c=あ để mở thẳng khung tập viết của ký tự đó.
  const target = findKana(useSearchParams().get("c") ?? "");

  const [script, setScript] = useState<Script>(target?.s ?? "h");
  const [group, setGroup] = useState<KanaGroup | "all">("all");
  const [mode, setMode] = useState<PracticeMode>("TRACE");
  const [openAt, setOpenAt] = useState<number | null>(
    target ? charsOf(target.s, "all").findIndex((c) => c.c === target.c) : null,
  );

  const { progress, ready } = useKanaProgress(script);

  const states = useMemo(() => {
    const m = new Map<string, CellState>();
    const now = Date.now();
    for (const p of progress) {
      if (p.level === 0) continue;
      m.set(p.character, { level: p.level, bestScore: p.bestScore, due: p.dueAt !== null && p.dueAt <= now });
    }
    return m;
  }, [progress]);

  const list = charsOf(script, group);

  const learned = states.size;
  const mastered = [...states.values()].filter((s) => s.level === 2).length;
  const due = [...states.values()].filter((s) => s.due).length;

  if (!ready) return <Spinner label="Đang mở phòng luyện viết" />;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Tiêu đề trang & Bộ chọn bảng chữ cái */}
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 border-b border-rule/60 pb-3.5 sm:pb-4">
        <div>
          <h1 className="font-mincho text-2xl font-bold sm:text-3xl text-sumi">
            Phòng Luyện Viết
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-sumi-3">
            Bấm vào bất kỳ ký tự nào để bắt đầu viết. Máy chấm điểm từng nét và tự xếp lịch ôn lại cho bạn.
          </p>
        </div>
        <Seg
          value={script}
          onChange={setScript}
          options={[
            { value: "h", label: <span className="font-mincho font-bold text-sm px-1">ひらがな</span> },
            { value: "k", label: <span className="font-mincho font-bold text-sm px-1">カタカナ</span> },
          ]}
        />
      </div>

      {/* Thẻ thống kê 3 chỉ số */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card variant="interactive" className="p-4 sm:p-5">
          <Stat label="Đã rèn luyện" value={learned} sub={`trên tổng số ${charsOf(script, "all").length} ký tự`} tone="genko" />
        </Card>
        <Card variant="interactive" className="p-4 sm:p-5">
          <Stat label="Đã thuộc" value={mastered} sub="Đã qua bước học, vào lịch ôn FSRS" tone="shu" />
        </Card>
        <Card variant="interactive" className="p-4 sm:p-5">
          <Stat label="Đến hạn cần ôn" value={due} sub={due > 0 ? "Ưu tiên ôn tập hôm nay" : "Không còn thẻ tồn đọng"} tone="gold" />
        </Card>
      </div>

      {/* Bộ lọc nhóm chữ */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {GROUPS.map((g) => (
          <Chip key={g.value} active={group === g.value} onClick={() => setGroup(g.value)}>
            <span>{g.label}</span>
            <span className="ml-1.5 rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10.5px] font-bold">
              {g.count}
            </span>
          </Chip>
        ))}
      </div>

      {/* Lưới chữ Kana */}
      <KanaGrid
        script={script}
        group={group}
        states={states}
        onPick={(c) => setOpenAt(list.findIndex((x) => x.c === c.c))}
      />

      {/* Hộp thoại tập viết khi người dùng click vào chữ */}
      {openAt !== null && list[openAt] && (
        <PracticePanel
          char={list[openAt]}
          index={openAt}
          total={list.length}
          mode={mode}
          onModeChange={setMode}
          onSubmit={(r) =>
            recordWritingAttempt({
              character: list[openAt].c,
              avgScore: r.avgScore,
              strokeErrors: r.strokeErrors,
              durationMs: r.durationMs,
            })
          }
          onNext={() => setOpenAt((i) => ((i ?? 0) + 1) % list.length)}
          onPrev={() => setOpenAt((i) => ((i ?? 0) - 1 + list.length) % list.length)}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  );
}
