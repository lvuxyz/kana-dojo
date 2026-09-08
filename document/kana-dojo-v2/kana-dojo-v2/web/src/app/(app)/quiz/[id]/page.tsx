"use client";

import { use } from "react";
import Link from "next/link";
import { Button, Empty } from "@/components/ui";

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Empty
      title={`Bài quiz #${id}`}
      hint="Màn hình làm bài đang được hoàn thiện. API phía máy chủ (tạo lượt làm bài và nộp đáp án) đã sẵn sàng."
      action={<Link href="/quiz"><Button variant="solid">Quay lại danh sách</Button></Link>}
    />
  );
}
