"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Chip, Empty, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import type { Page, VocabularyDto } from "@/lib/types";

const LEVELS = [5, 4, 3, 2, 1];

export default function VocabPage() {
  const [level, setLevel] = useState(5);
  const [q, setQ] = useState("");

  const data = useQuery({
    queryKey: ["vocab", level, q],
    queryFn: () => get<Page<VocabularyDto>>(`/vocabulary?level=${level}&size=60&q=${encodeURIComponent(q)}`),
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Từ vựng</h1>
        <p className="mt-0.5 text-sm text-sumi-3">Từ bạn học ở đây cũng đi vào cùng một hàng đợi ôn tập FSRS.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>N{l}</Chip>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm từ, cách đọc hoặc nghĩa…"
          className="ml-auto w-full rounded-lg border border-rule bg-surface px-3 py-1.5 text-sm outline-none focus:border-rule-firm sm:w-64"
        />
      </div>

      {data.isLoading && <Spinner />}
      {data.isError && <Empty title="Chưa tải được danh sách từ" hint="Máy chủ đang không phản hồi." />}
      {data.data?.content.length === 0 && <Empty title="Không có từ nào khớp" hint="Thử đổi cấp độ JLPT hoặc từ khoá khác." />}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {data.data?.content.map((v) => (
          <Card key={v.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mincho text-xl">{v.word}</span>
              {v.jlptLevel && <span className="rounded border border-rule px-1.5 text-[10.5px] text-sumi-3">N{v.jlptLevel}</span>}
            </div>
            <div className="mt-0.5 text-[12.5px] text-sumi-3">{v.reading} · {v.romaji}</div>
            <div className="mt-1 text-sm">{v.meaningVi}</div>
            {v.exampleJa && (
              <div className="mt-2 border-l-2 border-genko/40 pl-2.5 text-[12.5px] text-sumi-2">
                <div className="font-mincho">{v.exampleJa}</div>
                {v.exampleVi && <div className="text-sumi-3">{v.exampleVi}</div>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
