"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KanaGrid, type CellState } from "@/components/kana/KanaGrid";
import { PracticePanel } from "@/components/kana/PracticePanel";
import type { AttemptResult } from "@/components/kana/StrokeStage";
import { Card, Chip, Seg, Stat } from "@/components/ui";
import { get, post } from "@/lib/api";
import { charsOf, type KanaGroup, type Script } from "@/lib/kana";
import type { KanaCharacterDto, KanaProgressDto, PracticeMode, WritingResultDto } from "@/lib/types";

const GROUPS: { value: KanaGroup | "all"; label: string; count: number }[] = [
  { value: "all", label: "Tất cả", count: 104 },
  { value: "basic", label: "Cơ bản", count: 46 },
  { value: "dakuten", label: "Biến âm", count: 25 },
  { value: "yoon", label: "Âm ghép", count: 33 },
];

export default function WritingPage() {
  const qc = useQueryClient();
  const [script, setScript] = useState<Script>("h");
  const [group, setGroup] = useState<KanaGroup | "all">("all");
  const [mode, setMode] = useState<PracticeMode>("TRACE");
  const [openAt, setOpenAt] = useState<number | null>(null);

  const apiScript = script === "h" ? "HIRAGANA" : "KATAKANA";

  const catalog = useQuery({
    queryKey: ["kana", apiScript],
    queryFn: () => get<KanaCharacterDto[]>(`/kana?script=${apiScript}`),
  });

  const progress = useQuery({
    queryKey: ["progress", "kana", apiScript],
    queryFn: () => get<KanaProgressDto[]>(`/progress/kana?script=${apiScript}`),
  });

  /** Chữ → id của backend. Nếu API chưa sẵn sàng thì map rỗng, lưới vẫn hiện
   *  đầy đủ từ dữ liệu đóng gói sẵn — chỉ mất phần lưu tiến độ. */
  const idOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of catalog.data ?? []) m.set(k.character, k.id);
    return m;
  }, [catalog.data]);

  const states = useMemo(() => {
    const m = new Map<string, CellState>();
    const now = Date.now();
    for (const p of progress.data ?? []) {
      m.set(p.character, {
        level: p.level,
        bestScore: p.bestScore,
        due: !!p.dueAt && new Date(p.dueAt).getTime() <= now,
      });
    }
    return m;
  }, [progress.data]);

  const list = charsOf(script, group);

  const submit = useMutation({
    mutationFn: async (input: { character: string; r: AttemptResult }) => {
      const id = idOf.get(input.character);
      if (!id) return null;
      return post<WritingResultDto>("/writing/attempts", {
        kanaCharacterId: id,
        mode,
        strokeScores: input.r.strokeScores,
        strokeErrors: input.r.strokeErrors,
        avgScore: input.r.avgScore,
        durationMs: input.r.durationMs,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const learned = states.size;
  const mastered = [...states.values()].filter((s) => s.level === 2).length;
  const due = [...states.values()].filter((s) => s.due).length;

  return (
    <div className="flex flex-col gap-5" style={{ ["--cell" as string]: "116px" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mincho text-2xl font-semibold">Luyện viết</h1>
          <p className="mt-0.5 text-sm text-sumi-3">
            Chọn một ký tự để tập viết. Máy chấm từng nét và tự xếp lịch ôn lại.
          </p>
        </div>
        <Seg
          value={script}
          onChange={setScript}
          options={[{ value: "h", label: "ひらがな" }, { value: "k", label: "カタカナ" }]}
        />
      </div>

      <Card className="grid grid-cols-3 gap-4 px-5 py-4">
        <Stat label="Đã học" value={learned} sub={`trên ${list.length} ký tự`} tone="genko" />
        <Stat label="Đã thuộc" value={mastered} sub="đạt 80đ ở chế độ Tự viết" tone="shu" />
        <Stat label="Đến hạn ôn" value={due} sub={due > 0 ? "nên ôn hôm nay" : "không còn thẻ nào"} tone="gold" />
      </Card>

      {(catalog.isError || progress.isError) && (
        <p className="rounded-lg border border-shu/30 bg-shu-tint px-4 py-2.5 text-[13px] text-shu-2">
          Chưa kết nối được máy chủ nên tiến độ chưa hiện. Bạn vẫn tập viết và chấm điểm bình thường,
          chỉ là kết quả lần này không được lưu.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => (
          <Chip key={g.value} active={group === g.value} onClick={() => setGroup(g.value)}>
            {g.label}<em className="ml-1.5 text-[11.5px] not-italic opacity-55">{g.count}</em>
          </Chip>
        ))}
      </div>

      <KanaGrid
        script={script}
        group={group}
        states={states}
        onPick={(c) => setOpenAt(list.findIndex((x) => x.c === c.c))}
      />

      {openAt !== null && list[openAt] && (
        <PracticePanel
          char={list[openAt]}
          index={openAt}
          total={list.length}
          mode={mode}
          onModeChange={setMode}
          onSubmit={(r) => submit.mutateAsync({ character: list[openAt].c, r })}
          onNext={() => setOpenAt((i) => ((i ?? 0) + 1) % list.length)}
          onPrev={() => setOpenAt((i) => ((i ?? 0) - 1 + list.length) % list.length)}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  );
}
