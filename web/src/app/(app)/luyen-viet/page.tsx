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
      // Backend trả một ô cho MỌI ký tự kể cả chưa học (level 0); ô trống đã là mặc định của lưới,
      // và `learned` bên dưới đếm số ô — nếu không bỏ qua thì tài khoản mới hiện "đã rèn 104/104".
      if (p.level === 0) continue;
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
    <div className="flex flex-col gap-6" style={{ ["--cell" as string]: "116px" }}>
      {/* Tiêu đề trang & Bộ chọn bảng chữ cái */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule/60 pb-4">
        <div>
          <h1 className="font-mincho text-2xl font-bold sm:text-3xl text-sumi">
            Phòng Luyện Viết
          </h1>
          <p className="mt-1 text-sm font-medium text-sumi-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="interactive" className="p-5">
          <Stat label="Đã rèn luyện" value={learned} sub={`trên tổng số ${list.length} ký tự`} tone="genko" />
        </Card>
        <Card variant="interactive" className="p-5">
          <Stat label="Đã tinh thông" value={mastered} sub="Đạt từ 80đ ở chế độ Tự viết" tone="shu" />
        </Card>
        <Card variant="interactive" className="p-5">
          <Stat label="Đến hạn cần ôn" value={due} sub={due > 0 ? "Ưu tiên ôn tập hôm nay" : "Không còn thẻ tồn đọng"} tone="gold" />
        </Card>
      </div>

      {(catalog.isError || progress.isError) && (
        <p className="rounded-2xl border border-shu/30 bg-shu-tint/90 px-4.5 py-3 text-xs font-semibold text-shu-2 shadow-xs">
          Chưa kết nối được máy chủ nên tiến độ chưa được đồng bộ từ tài khoản. Bạn vẫn có thể tập viết và chấm điểm hoàn toàn bình thường trên máy!
        </p>
      )}

      {/* Bộ lọc nhóm chữ */}
      <div className="flex flex-wrap items-center gap-2">
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
          onSubmit={(r) => submit.mutateAsync({ character: list[openAt].c, r })}
          onNext={() => setOpenAt((i) => ((i ?? 0) + 1) % list.length)}
          onPrev={() => setOpenAt((i) => ((i ?? 0) - 1 + list.length) % list.length)}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  );
}
