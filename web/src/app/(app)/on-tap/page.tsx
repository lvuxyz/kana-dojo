"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StrokeStage, type AttemptResult } from "@/components/kana/StrokeStage";
import { Button, Card, Empty, Progress, Spinner } from "@/components/ui";
import { get, post } from "@/lib/api";
import { KANA } from "@/lib/kana";
import { gradeFromScore } from "@/lib/stroke-match";
import type { GradeResultDto, ItemType, ReviewQueueDto, ReviewQueueItemDto, WritingResultDto } from "@/lib/types";

/** Thẻ đã quy về dạng hỏi–đáp để hiển thị, bất kể là thẻ kana hay từ vựng. */
interface ReviewCard {
  cardId: number; itemType: ItemType; itemId: number;
  prompt: string; answer: string; hint: string | null;
}

function toCard(item: ReviewQueueItemDto): ReviewCard {
  const base = { cardId: item.cardId, itemType: item.itemType, itemId: item.itemId };
  switch (item.itemType) {
    case "VOCAB_MEANING":
      return { ...base, prompt: item.word ?? "", answer: item.meaningVi ?? "", hint: item.reading };
    case "VOCAB_READING":
      return { ...base, prompt: item.word ?? "", answer: item.reading ?? "", hint: item.meaningVi };
    default:
      return { ...base, prompt: item.character ?? "", answer: item.romaji ?? "", hint: item.readingVi };
  }
}

const GRADE_LABEL: Record<1 | 2 | 3 | 4, { text: string; hint: string; tone: string }> = {
  1: { text: "Quên rồi", hint: "gặp lại sau ~1 phút", tone: "border-shu/50 text-shu hover:bg-shu-tint" },
  2: { text: "Khó", hint: "khoảng cách ngắn", tone: "border-gold/50 text-gold hover:bg-surface-2" },
  3: { text: "Được", hint: "khoảng cách bình thường", tone: "border-genko/50 text-genko hover:bg-genko-tint" },
  4: { text: "Dễ", hint: "khoảng cách dài hơn", tone: "border-genko/50 text-genko hover:bg-genko-tint" },
};

export default function ReviewPage() {
  const qc = useQueryClient();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [last, setLast] = useState<GradeResultDto | null>(null);

  const queue = useQuery({
    queryKey: ["reviews", "queue"],
    queryFn: () => get<ReviewQueueDto>("/reviews/queue?limit=30"),
    staleTime: 0,
  });

  const cards = useMemo(() => (queue.data?.content ?? []).map(toCard), [queue.data]);
  const card = cards[i];

  const advance = () => {
    setRevealed(false);
    setLast(null);
    setI((v) => v + 1);
  };

  const grade = useMutation({
    mutationFn: (input: { cardId: number; grade: number; score?: number; durationMs: number }) =>
      post<GradeResultDto>("/reviews/grade", input),
    onSuccess: (res) => {
      setLast(res);
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
      setTimeout(advance, 700);
    },
  });

  const writing = useMutation({
    mutationFn: (input: { kanaCharacterId: number; r: AttemptResult }) =>
      post<WritingResultDto>("/writing/attempts", {
        kanaCharacterId: input.kanaCharacterId,
        mode: "TEST",
        strokeScores: input.r.strokeScores,
        strokeErrors: input.r.strokeErrors,
        avgScore: input.r.avgScore,
        durationMs: input.r.durationMs,
      }),
    onSuccess: (res) => {
      setLast(res.card);
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
      setTimeout(advance, 1100);
    },
  });

  useEffect(() => { setI(0); setRevealed(false); }, [queue.dataUpdatedAt]);

  const kanaChar = useMemo(
    () => (card ? KANA.chars.find((c) => c.c === card.prompt) ?? null : null),
    [card],
  );

  if (queue.isLoading) return <Spinner label="Đang dựng hàng đợi ôn tập" />;

  if (queue.isError) {
    return (
      <Empty
        title="Chưa kết nối được máy chủ"
        hint="Hàng đợi ôn tập nằm ở phía máy chủ vì lịch ôn phải giống nhau trên mọi thiết bị của bạn."
        action={<Button onClick={() => queue.refetch()}>Thử lại</Button>}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <Empty
        title="Hết thẻ đến hạn rồi 🎉"
        hint="Lịch ôn được tính bằng FSRS — ôn sớm hơn hạn thì tốn thời gian mà trí nhớ không khá hơn bao nhiêu. Học ký tự mới thì hữu ích hơn."
        action={<Link href="/luyen-viet"><Button variant="solid">Học ký tự mới</Button></Link>}
      />
    );
  }

  if (i >= cards.length) {
    return (
      <Empty
        title={`Xong ${cards.length} thẻ`}
        hint="Tiến độ đã được lưu và lịch ôn kế tiếp đã được tính lại."
        action={<Button variant="solid" onClick={() => queue.refetch()}>Tải thêm thẻ</Button>}
      />
    );
  }

  const isWriting = card.itemType === "KANA_WRITING" && kanaChar;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-sumi-3 tnum">{i + 1}/{cards.length}</span>
        <Progress value={i} max={cards.length} className="flex-1" tone="genko" />
      </div>

      {isWriting ? (
        <Card className="flex flex-col items-center gap-4 px-4 py-6">
          <div className="text-center">
            <span className="label-xs">Viết ký tự này</span>
            <p className="mt-1 text-lg font-bold">{card.answer}</p>
            {card.hint && <p className="text-[12.5px] text-sumi-3">{card.hint}</p>}
          </div>

          <div className="w-full" style={{ maxWidth: kanaChar.c.length > 1 ? 560 : 360 }}>
            <StrokeStage
              key={card.cardId}
              char={kanaChar}
              mode="TEST"
              onComplete={(r) => writing.mutate({ kanaCharacterId: card.itemId, r })}
            />
          </div>

          <p className="text-center text-[13px] text-sumi-3">
            Không có nét mờ — điểm bạn viết sẽ tự quyết định lịch ôn kế tiếp.
          </p>
        </Card>
      ) : (
        <Card className="flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
          <p className="font-mincho text-4xl">{card.prompt}</p>
          {revealed ? (
            <>
              <p className="text-lg">{card.answer}</p>
              {card.hint && <p className="text-sm text-sumi-3">{card.hint}</p>}
            </>
          ) : (
            <Button variant="solid" size="lg" onClick={() => setRevealed(true)}>Hiện đáp án</Button>
          )}
        </Card>
      )}

      {!isWriting && revealed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([1, 2, 3, 4] as const).map((g) => (
            <button
              key={g}
              disabled={grade.isPending}
              onClick={() => grade.mutate({ cardId: card.cardId, grade: g, durationMs: 0 })}
              className={`flex flex-col items-center gap-0.5 rounded-lg border bg-surface px-3 py-2.5 transition-colors disabled:opacity-50 ${GRADE_LABEL[g].tone}`}
            >
              <span className="text-sm font-medium">{GRADE_LABEL[g].text}</span>
              <span className="text-[10.5px] text-sumi-3">{GRADE_LABEL[g].hint}</span>
            </button>
          ))}
        </div>
      )}

      {last && (
        <p className="text-center text-[13px] text-genko">
          Ôn lại sau <b className="tnum">{last.intervalDays}</b> ngày
          <span className="text-sumi-3"> · độ bền trí nhớ {last.stability.toFixed(1)} ngày</span>
        </p>
      )}

      <details className="text-[12.5px] text-sumi-3">
        <summary className="cursor-pointer">Vì sao thẻ này xuất hiện hôm nay?</summary>
        <p className="mt-2 leading-relaxed">
          FSRS ước lượng xác suất bạn còn nhớ thẻ này và xếp lịch sao cho lúc ôn xác suất đó rơi
          xuống khoảng 90%. Ôn đúng thời điểm đó tốn ít lượt nhất mà vẫn giữ được trí nhớ —
          ôn sớm hơn là lãng phí, muộn hơn là phải học lại từ đầu.
        </p>
      </details>
    </div>
  );
}
