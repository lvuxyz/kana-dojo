import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { QUIZZES } from "@/data/quizzes";

export const metadata: Metadata = {
  title: "Quiz Hiragana, Katakana và từ vựng N5",
  description: "Bốn bài quiz miễn phí: đọc âm Hiragana, Katakana, chọn nghĩa từ vựng N5 và gõ romaji. Chấm điểm và giải thích từng câu ngay trên trình duyệt.",
  alternates: { canonical: "/quiz" },
};

export default function QuizListPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Quiz</h1>
        <p className="mt-0.5 text-sm text-sumi-3">Kiểm tra nhanh để biết mình đang hổng chỗ nào.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {QUIZZES.map((q) => (
          <Card key={q.id} className="flex flex-col gap-2 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-mincho text-lg">{q.title}</h2>
              {q.jlptLevel && <span className="rounded border border-rule px-1.5 text-[10.5px] text-sumi-3">N{q.jlptLevel}</span>}
            </div>
            {q.description && <p className="text-[13px] text-sumi-2">{q.description}</p>}
            <p className="text-[11.5px] text-sumi-3 tnum">
              {q.questions.length} câu{q.timeLimitSec ? ` · ${Math.round(q.timeLimitSec / 60)} phút` : ""}
            </p>
            <Link href={`/quiz/${q.id}`} className="mt-1"><Button variant="solid" className="w-full">Làm bài</Button></Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
