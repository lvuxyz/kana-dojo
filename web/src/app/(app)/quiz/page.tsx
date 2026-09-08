"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, Spinner } from "@/components/ui";
import { get } from "@/lib/api";

interface QuizDto {
  id: number; title: string; description: string | null;
  quizType: string; jlptLevel: number | null; timeLimitSec: number | null; questionCount: number;
}

export default function QuizListPage() {
  const list = useQuery({ queryKey: ["quizzes"], queryFn: () => get<QuizDto[]>("/quizzes") });

  if (list.isLoading) return <Spinner />;
  if (list.isError) return <Empty title="Chưa tải được danh sách quiz" hint="Máy chủ đang không phản hồi." />;
  if (!list.data?.length) {
    return <Empty title="Chưa có bài quiz nào" hint="Quản trị viên chưa xuất bản bài nào. Trong lúc chờ, bạn có thể luyện viết hoặc ôn từ vựng."
                  action={<Link href="/luyen-viet"><Button variant="solid">Luyện viết</Button></Link>} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-mincho text-2xl font-semibold">Quiz</h1>
        <p className="mt-0.5 text-sm text-sumi-3">Kiểm tra nhanh để biết mình đang hổng chỗ nào.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.data.map((q) => (
          <Card key={q.id} className="flex flex-col gap-2 px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-mincho text-lg">{q.title}</h2>
              {q.jlptLevel && <span className="rounded border border-rule px-1.5 text-[10.5px] text-sumi-3">N{q.jlptLevel}</span>}
            </div>
            {q.description && <p className="text-[13px] text-sumi-2">{q.description}</p>}
            <p className="text-[11.5px] text-sumi-3 tnum">
              {q.questionCount} câu{q.timeLimitSec ? ` · ${Math.round(q.timeLimitSec / 60)} phút` : ""}
            </p>
            <Link href={`/quiz/${q.id}`} className="mt-1"><Button variant="solid" className="w-full">Làm bài</Button></Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
