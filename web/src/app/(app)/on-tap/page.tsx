"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HINT_AFTER_MISSES, StrokeStage, type AttemptResult } from "@/components/kana/StrokeStage";
import { useSpeech } from "@/components/typing/useSpeech";
import { Button, Card, Empty, Kbd, Notice, Progress, SpeakButton, Spinner } from "@/components/ui";
import { KANA } from "@/lib/kana";
import { useLearnContext, useProgress } from "@/lib/learning/hooks";
import { createReviewQueue, gradeReviewCard, recordWritingAttempt } from "@/lib/learning/store";
import { DEFAULT_GRADE, reviewKeyAction, spokenText, type KeyTarget } from "@/lib/review-keys";
import type { Grade, GradeResult, ItemType, ReviewQueue, ReviewQueueItem } from "@/lib/types";

/** Thẻ đã quy về dạng hỏi–đáp để hiển thị, bất kể là thẻ kana hay từ vựng. */
interface ReviewCard {
  cardKey: string; itemType: ItemType; itemId: string;
  prompt: string; answer: string; hint: string | null;
  /** Mặt có chữ tiếng Nhật để đọc thành tiếng; null nếu thẻ không có (thẻ tự soạn toàn tiếng Việt). */
  speak: string | null;
}

function toCard(item: ReviewQueueItem): ReviewCard {
  const base = { cardKey: item.cardKey, itemType: item.itemType, itemId: item.itemId };
  const sides = (() => {
    switch (item.itemType) {
      case "VOCAB_MEANING":
        return { prompt: item.word ?? "", answer: item.meaningVi ?? "", hint: item.reading };
      case "VOCAB_READING":
        return { prompt: item.word ?? "", answer: item.reading ?? "", hint: item.meaningVi };
      default:
        return { prompt: item.character ?? "", answer: item.romaji ?? "", hint: item.readingVi };
    }
  })();
  return { ...base, ...sides, speak: spokenText(sides.prompt, sides.answer, sides.hint) };
}

/** Phân loại chỗ đang có focus cho phím tắt (xem `KeyTarget`). */
function keyTarget(t: EventTarget | null): KeyTarget {
  if (!(t instanceof HTMLElement)) return "none";
  if (t.isContentEditable || t.closest("input, textarea, select")) return "editable";
  if (t.closest("button, a[href], summary, [role=button]")) return "control";
  return "none";
}

const SPEECH_RATE = 0.8;

const GRADE_LABEL: Record<Grade, { text: string; hint: string; tone: string }> = {
  1: { text: "Quên rồi", hint: "gặp lại sau ~1 phút", tone: "border-shu/50 text-shu hover:bg-shu-tint" },
  2: { text: "Khó", hint: "khoảng cách ngắn", tone: "border-gold/50 text-gold hover:bg-surface-2" },
  3: { text: "Được", hint: "khoảng cách bình thường", tone: "border-genko/50 text-genko hover:bg-genko-tint" },
  4: { text: "Dễ", hint: "khoảng cách dài hơn", tone: "border-genko/50 text-genko hover:bg-genko-tint" },
};

export default function ReviewPage() {
  const { ready } = useProgress();
  const { study } = useLearnContext();
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [last, setLast] = useState<GradeResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Chốt đồng bộ chống chấm đúp. Không dựa vào state `last`: hai click trong cùng một tick (hoặc chạm đúp)
  // đều thấy `last` còn null vì React chưa kịp render lại giữa chúng.
  const locked = useRef(false);

  // Hàng đợi chỉ là ảnh chụp lúc mở trang: giữ cố định cả phiên để thẻ không nhảy chỗ khi vừa chấm xong.
  const loadQueue = useCallback(() => {
    clearTimeout(timer.current);
    locked.current = false;
    // Cỡ phiên, hạn mức thẻ mới và nguồn thẻ do người học chọn (Cài đặt › Cách học) — store tự áp.
    setQueue(createReviewQueue());
    setI(0);
    setRevealed(false);
    setLast(null);
  }, []);

  useEffect(() => {
    if (ready) loadQueue();
    return () => clearTimeout(timer.current);
  }, [ready, loadQueue]);

  const cards = useMemo(() => (queue?.content ?? []).map(toCard), [queue]);
  const card = cards[i];

  const kanaChar = useMemo(
    () => (card ? KANA.chars.find((c) => c.c === card.prompt) ?? null : null),
    [card],
  );
  const isWriting = card?.itemType === "KANA_WRITING" && kanaChar;

  const { speak, speaking, supported: canSpeak, missingVoice } = useSpeech();
  const [speechError, setSpeechError] = useState(false);
  const speakCard = () => {
    if (!card?.speak) return;
    if (!canSpeak) return setSpeechError(true);
    speak(card.speak, { rate: SPEECH_RATE, key: card.cardKey });
  };

  /** Hiện kết quả một lát rồi sang thẻ kế. Trong lúc chờ, `locked` khoá việc chấm để không chấm đúp một thẻ. */
  const showThenAdvance = (res: GradeResult, delayMs: number) => {
    setLast(res);
    timer.current = setTimeout(() => {
      locked.current = false;
      setRevealed(false);
      setLast(null);
      setI((v) => v + 1);
    }, delayMs);
  };

  const grade = (g: Grade) => {
    if (!card || locked.current) return;
    locked.current = true;
    try {
      showThenAdvance(gradeReviewCard(card.cardKey, g), 700);
    } catch (e) {
      locked.current = false; // lỗi thì nhả khoá, đừng để hàng đợi kẹt
      throw e;
    }
  };

  const submitWriting = (r: AttemptResult) => {
    if (!card || locked.current) return;
    locked.current = true;
    try {
      const res = recordWritingAttempt({ character: card.itemId, avgScore: r.avgScore, strokeErrors: r.strokeErrors, durationMs: r.durationMs });
      showThenAdvance(res.card, 1100);
    } catch (e) {
      locked.current = false;
      throw e;
    }
  };

  // Phím tắt kiểu Anki (bảng phím trong lib/review-keys.ts). Không có mảng phụ thuộc: đăng ký lại sau mỗi
  // lần render để handler luôn thấy thẻ và trạng thái lật mới nhất; trang này render rất ít nên rẻ.
  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      const action = reviewKeyAction(
        {
          key: e.key, code: e.code, repeat: e.repeat,
          modified: e.ctrlKey || e.metaKey || e.altKey,
          composing: e.isComposing || e.keyCode === 229,
          target: keyTarget(e.target),
        },
        { revealed, writing: !!isWriting, speakable: card.speak !== null },
      );
      if (!action) return;
      e.preventDefault(); // Space không cuộn trang
      if (action.type === "reveal") setRevealed(true);
      else if (action.type === "grade") grade(action.grade);
      else speakCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!queue) return <Spinner label="Đang dựng hàng đợi ôn tập" />;

  if (cards.length === 0) {
    return (
      <Empty
        title="Hết thẻ đến hạn rồi 🎉"
        hint={`Lịch ôn được tính bằng FSRS — ôn sớm hơn hạn thì tốn thời gian mà trí nhớ không khá hơn bao nhiêu. Mỗi ngày bạn học thêm tối đa ${study.newCardsPerDay} thẻ mới (đổi ở Cài đặt › Cách học); thẻ chưa có nghĩa là hạn mức hôm nay đã dùng hết hoặc bạn đã tắt nguồn thẻ đó.`}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link href="/luyen-viet"><Button variant="solid">Học ký tự mới</Button></Link>
            <Link href="/thu-vien?tab=decks"><Button>Soạn thẻ của tôi</Button></Link>
          </div>
        }
      />
    );
  }

  if (i >= cards.length) {
    return (
      <Empty
        title={`Xong ${cards.length} thẻ`}
        hint="Tiến độ đã được lưu trong trình duyệt và lịch ôn kế tiếp đã được tính lại."
        action={<Button variant="solid" onClick={loadQueue}>Tải thêm thẻ</Button>}
      />
    );
  }

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
              key={card.cardKey}
              char={kanaChar}
              mode="TEST"
              onComplete={submitWriting}
            />
          </div>

          <p className="text-center text-[13px] text-sumi-3">
            Bảng trắng, không có nét mờ. Sai {HINT_AFTER_MISSES.TEST} lần liên tiếp ở một nét thì nét mẫu mới hiện.
            Điểm bạn viết sẽ tự quyết định lịch ôn kế tiếp.
          </p>
        </Card>
      ) : (
        <Card className="flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
          <p className="font-mincho text-4xl">{card.prompt}</p>
          {revealed ? (
            <>
              <p className="text-lg">{card.answer}</p>
              {card.hint && <p className="text-sm text-sumi-3">{card.hint}</p>}
              {card.speak && (
                <span className="inline-flex items-center gap-1 text-sumi-3">
                  <SpeakButton
                    active={speaking === card.cardKey}
                    label={`Phát âm “${card.speak}”`}
                    aria-keyshortcuts="R"
                    onClick={speakCard}
                    // Bấm chuột không giữ focus trên nút loa, để Space ngay sau đó vẫn chấm thẻ thay vì đọc lại.
                    onMouseDown={(e) => e.preventDefault()}
                  />
                  <Kbd>R</Kbd>
                </span>
              )}
            </>
          ) : (
            <Button variant="solid" size="lg" aria-keyshortcuts="Space Enter" onClick={() => setRevealed(true)}>
              Hiện đáp án <Kbd>Space</Kbd>
            </Button>
          )}
        </Card>
      )}

      {!isWriting && revealed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([1, 2, 3, 4] as const).map((g) => (
            <button
              key={g}
              disabled={!!last}
              onClick={() => grade(g)}
              aria-keyshortcuts={g === DEFAULT_GRADE ? `${g} Space Enter` : String(g)}
              className={`relative flex flex-col items-center gap-0.5 rounded-lg border bg-surface px-3 py-2.5 transition-colors disabled:opacity-50 ${GRADE_LABEL[g].tone}`}
            >
              <Kbd className="absolute right-1.5 top-1">{g}</Kbd>
              <span className="text-sm font-medium">{GRADE_LABEL[g].text}</span>
              <span className="text-[10.5px] text-sumi-3">{GRADE_LABEL[g].hint}</span>
            </button>
          ))}
        </div>
      )}

      {!isWriting && revealed && card.speak && speechError && (
        <Notice tone="err">Trình duyệt này không hỗ trợ đọc thành tiếng.</Notice>
      )}
      {!isWriting && revealed && card.speak && missingVoice && (
        <Notice tone="err">Máy chưa cài giọng tiếng Nhật — âm thanh phát âm có thể sai.</Notice>
      )}

      {last && (
        <p className="text-center text-[13px] text-genko">
          {last.intervalDays > 0 ? (
            <>Ôn lại sau <b className="tnum">{last.intervalDays}</b> ngày</>
          ) : (
            <>Gặp lại trong ít phút</>
          )}
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
