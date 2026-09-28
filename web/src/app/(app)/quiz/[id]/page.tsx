"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Empty, Progress, Spinner } from "@/components/ui";
import { ApiError, get, post } from "@/lib/api";
import type { QuestionDto, QuizAttemptDto, QuizDetailDto, QuizResultDto } from "@/lib/types";

type Phase = "intro" | "answering" | "result";

function formatClock(totalSec: number) {
  const s = Math.max(0, totalSec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [attempt, setAttempt] = useState<QuizAttemptDto | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResultDto | null>(null);

  const quiz = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => get<QuizDetailDto>(`/quizzes/${id}`),
  });

  const start = useMutation({
    mutationFn: () => post<QuizAttemptDto>(`/quizzes/${id}/attempts`),
    onSuccess: (res) => {
      setAttempt(res);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setSecondsLeft(quiz.data?.timeLimitSec ?? null);
      setPhase("answering");
    },
  });

  const submit = useMutation({
    mutationFn: (input: { attemptId: number; questions: QuestionDto[]; answers: Record<number, string> }) =>
      post<QuizResultDto>(`/quiz-attempts/${input.attemptId}/submit`, {
        // Gửi đủ mọi câu, kể cả câu bỏ trống, để backend chấm trên đúng tổng số câu.
        answers: input.questions.map((q) => ({ questionId: q.id, givenAnswer: input.answers[q.id]?.trim() || null })),
      }),
    onSuccess: (res) => {
      setResult(res);
      setPhase("result");
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["badges"] });
    },
  });

  const questions = quiz.data?.questions ?? [];
  const current = questions[index];

  const doSubmit = useCallback(() => {
    if (!attempt || submit.isPending || phase !== "answering") return;
    submit.mutate({ attemptId: attempt.attemptId, questions, answers });
  }, [attempt, submit, phase, questions, answers]);

  // Đồng hồ đếm ngược; hết giờ thì tự nộp với những gì đã trả lời.
  const submitRef = useRef(doSubmit);
  submitRef.current = doSubmit;
  const timed = phase === "answering" && secondsLeft !== null;
  useEffect(() => {
    if (!timed) return;
    const t = setInterval(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearInterval(t);
  }, [timed]);
  useEffect(() => {
    if (phase === "answering" && secondsLeft !== null && secondsLeft <= 0) submitRef.current();
  }, [phase, secondsLeft]);

  const choose = (value: string) => {
    if (!current) return;
    setAnswers((a) => ({ ...a, [current.id]: value }));
  };
  const next = () => setIndex((i) => Math.min(i + 1, questions.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));
  const isLast = index === questions.length - 1;

  // Phím tắt: 1–4 chọn đáp án, Enter sang câu kế / nộp bài.
  useEffect(() => {
    if (phase !== "answering" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement;
      if (!typing && current.questionType === "MULTIPLE_CHOICE") {
        const n = Number(e.key);
        if (n >= 1 && n <= current.options.length) {
          setAnswers((a) => ({ ...a, [current.id]: current.options[n - 1] }));
          return;
        }
      }
      if (e.key === "Enter" && answers[current.id]?.trim()) {
        e.preventDefault();
        if (isLast) submitRef.current();
        else setIndex((i) => i + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, answers, isLast]);

  if (quiz.isLoading) return <Spinner label="Đang tải đề" />;
  if (quiz.isError || !quiz.data) {
    const notFound = quiz.error instanceof ApiError && quiz.error.status === 404;
    return (
      <Empty
        title={notFound ? "Không tìm thấy bài quiz" : "Chưa tải được đề"}
        hint={notFound ? "Bài này có thể đã bị gỡ hoặc chưa xuất bản." : "Máy chủ đang không phản hồi."}
        action={<Link href="/quiz"><Button variant="solid">Quay lại danh sách</Button></Link>}
      />
    );
  }

  const data = quiz.data;

  if (questions.length === 0) {
    return (
      <Empty
        title={data.title}
        hint="Bài này chưa có câu hỏi nào."
        action={<Link href="/quiz"><Button variant="solid">Quay lại danh sách</Button></Link>}
      />
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <Link href="/quiz" className="text-[13px] text-sumi-3 hover:text-sumi">‹ Danh sách quiz</Link>
        <Card className="flex flex-col gap-4 px-6 py-7">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-mincho text-2xl font-semibold">{data.title}</h1>
            {data.jlptLevel && <span className="rounded border border-rule px-1.5 text-[10.5px] text-sumi-3">N{data.jlptLevel}</span>}
          </div>
          {data.description && <p className="text-sm text-sumi-2">{data.description}</p>}
          <ul className="flex flex-col gap-1 text-[13px] text-sumi-3">
            <li><b className="tnum text-sumi">{questions.length}</b> câu hỏi</li>
            <li>{data.timeLimitSec ? <>Thời gian: <b className="tnum text-sumi">{formatClock(data.timeLimitSec)}</b> — hết giờ bài sẽ tự nộp</> : "Không giới hạn thời gian"}</li>
            <li>Thưởng <b className="text-sumi">20 XP</b> + 5 XP cho mỗi câu đúng</li>
          </ul>
          {start.isError && (
            <p className="text-[13px] text-shu">
              {start.error instanceof ApiError ? start.error.message : "Không bắt đầu được lượt làm bài."}
            </p>
          )}
          <Button variant="solid" size="lg" disabled={start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? "Đang chuẩn bị…" : "Bắt đầu làm bài"}
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "result" && result) {
    const byId = new Map(questions.map((q) => [q.id, q]));
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="label-xs">Kết quả</span>
          <p className={clsx("font-mincho text-5xl font-bold tnum", result.score >= 80 ? "text-genko" : result.score >= 50 ? "text-gold" : "text-shu")}>
            {result.score}
          </p>
          <p className="text-sm text-sumi-2">
            Đúng <b className="tnum">{result.correctCount}</b>/<span className="tnum">{result.totalCount}</span> câu · +{result.xpEarned} XP
          </p>
          <p className="text-[13px] text-sumi-3">
            {result.score === 100 ? "満点 — Tuyệt đối!" : result.score >= 80 ? "よし — Rất tốt" : "Xem lại các câu sai bên dưới rồi thử lần nữa nhé."}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button variant="solid" disabled={start.isPending} onClick={() => start.mutate()}>Làm lại</Button>
            <Link href="/quiz"><Button>Bài khác</Button></Link>
          </div>
        </Card>

        <div className="flex flex-col gap-2.5">
          {result.answers.map((a, i) => {
            const q = byId.get(a.questionId);
            return (
              <Card key={a.questionId} className={clsx("flex flex-col gap-1 border-l-4 px-4 py-3", a.correct ? "border-l-genko" : "border-l-shu")}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mincho text-xl">{q?.prompt}</span>
                  <span className={clsx("text-[12px] font-semibold", a.correct ? "text-genko" : "text-shu")}>
                    {i + 1}. {a.correct ? "Đúng" : "Sai"}
                  </span>
                </div>
                <p className="text-[13px] text-sumi-2">
                  Bạn trả lời: <b>{a.givenAnswer || "(bỏ trống)"}</b>
                  {!a.correct && <> · Đáp án: <b className="text-genko">{a.correctAnswer}</b></>}
                </p>
                {a.explanationVi && <p className="text-[12.5px] text-sumi-3">{a.explanationVi}</p>}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (!current) return null;
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const selected = answers[current.id] ?? "";
  const lowTime = secondsLeft !== null && secondsLeft <= 15;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-sumi-3 tnum">{index + 1}/{questions.length}</span>
        <Progress value={answered} max={questions.length} className="flex-1" tone="genko" />
        {secondsLeft !== null && (
          <span className={clsx("text-xs font-semibold tnum", lowTime ? "text-shu" : "text-sumi-3")} aria-live="polite">
            ⏱ {formatClock(secondsLeft)}
          </span>
        )}
      </div>

      <Card className="flex flex-col items-center gap-6 px-6 py-8">
        <div className="text-center">
          <span className="label-xs">
            {current.questionType === "TEXT_INPUT" ? "Gõ cách đọc (romaji)" : "Chọn đáp án đúng"}
          </span>
          <p className="mt-2 font-mincho text-5xl">{current.prompt}</p>
        </div>

        {current.questionType === "TEXT_INPUT" ? (
          <input
            key={current.id}
            autoFocus
            value={selected}
            onChange={(e) => choose(e.target.value)}
            placeholder="vd: sakana"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            className="w-full max-w-xs rounded-xl border border-rule/80 bg-surface px-4 py-2.5 text-center text-lg outline-none focus:border-shu focus:ring-3 focus:ring-shu/15"
          />
        ) : (
          <div className="grid w-full gap-2 sm:grid-cols-2">
            {current.options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => choose(opt)}
                aria-pressed={selected === opt}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors cursor-pointer",
                  selected === opt
                    ? "border-shu bg-shu-tint text-sumi"
                    : "border-rule/80 bg-surface text-sumi-2 hover:border-rule-firm hover:text-sumi",
                )}
              >
                <span className="text-[11px] font-semibold text-sumi-3 tnum">{i + 1}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {submit.isError && (
        <p className="text-center text-[13px] text-shu">
          {submit.error instanceof ApiError ? submit.error.message : "Nộp bài không thành công."} Thử lại nhé.
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" disabled={index === 0} onClick={prev}>‹ Câu trước</Button>
        {isLast ? (
          <Button variant="solid" disabled={submit.isPending} onClick={doSubmit}>
            {submit.isPending ? "Đang chấm…" : answered < questions.length ? `Nộp bài (${answered}/${questions.length})` : "Nộp bài"}
          </Button>
        ) : (
          <Button variant="solid" onClick={next}>Câu tiếp ›</Button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setIndex(i)}
            aria-label={`Câu ${i + 1}`}
            className={clsx(
              "h-2.5 w-2.5 rounded-full transition-colors cursor-pointer",
              i === index ? "bg-shu" : answers[q.id]?.trim() ? "bg-genko" : "bg-rule",
            )}
          />
        ))}
      </div>
    </div>
  );
}
