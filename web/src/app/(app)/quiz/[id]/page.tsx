import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { QUIZZES } from "@/data/quizzes";
import { findQuiz } from "@/lib/learning/quiz";

/* Xuất bản tĩnh: mỗi bài quiz là một trang dựng sẵn lúc build; id lạ trả 404 thay vì cố dựng lúc chạy. */
export const dynamicParams = false;

export function generateStaticParams() {
  return QUIZZES.map((q) => ({ id: String(q.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const quiz = findQuiz(Number((await params).id));
  if (!quiz) return {};
  return {
    title: quiz.title,
    description: quiz.description ?? undefined,
    alternates: { canonical: `/quiz/${quiz.id}` },
  };
}

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const quiz = findQuiz(Number((await params).id));
  if (!quiz) notFound();
  return <QuizRunner quizId={quiz.id} />;
}
