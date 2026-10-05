"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DecksPane } from "@/components/library/DecksPane";
import { NotesPane } from "@/components/library/NotesPane";
import { TextsPane } from "@/components/library/TextsPane";
import { Seg, Spinner } from "@/components/ui";
import { useSpace } from "@/lib/space/hooks";

type Tab = "notes" | "decks" | "texts";
const isTab = (v: string | null): v is Tab => v === "notes" || v === "decks" || v === "texts";

export default function LibraryPage() {
  // useSearchParams buộc phần dưới phải nằm trong Suspense khi xuất bản tĩnh.
  return (
    <Suspense fallback={<Spinner label="Đang mở thư viện" />}>
      <Library />
    </Suspense>
  );
}

function Library() {
  const params = useSearchParams();
  const { space, ready } = useSpace();
  // Từ Tổng quan, bấm một ghi chú đã ghim sẽ tới đây với ?tab=notes&note=<mã> để mở thẳng ghi chú đó.
  const initialTab = params.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "notes");

  if (!ready) return <Spinner label="Đang mở thư viện" />;

  const { notes, decks, texts } = space.library;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-rule/60 pb-4">
        <h1 className="font-mincho text-2xl font-bold text-sumi sm:text-3xl">Thư viện của tôi</h1>
        <p className="mt-1 text-sm font-medium text-sumi-3">
          Của riêng bạn: tài liệu, bộ thẻ và câu luyện gõ do bạn soạn. Tất cả nằm trong trình duyệt này —
          nhớ tải bản sao lưu ở Cài đặt.
        </p>
      </div>

      <Seg
        className="w-fit max-w-full overflow-x-auto"
        value={tab}
        onChange={setTab}
        options={[
          { value: "notes", label: `Ghi chú · ${notes.length}` },
          { value: "decks", label: `Bộ thẻ · ${decks.length}` },
          { value: "texts", label: `Câu luyện gõ · ${texts.length}` },
        ]}
      />

      {tab === "notes" && <NotesPane initialId={params.get("note")} />}
      {tab === "decks" && <DecksPane />}
      {tab === "texts" && <TextsPane />}
    </div>
  );
}
