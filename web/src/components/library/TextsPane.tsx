"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Empty, Field, Notice } from "@/components/ui";
import { addText, deleteText, updateText } from "@/lib/space/library";
import { LIMITS, type UserText } from "@/lib/space/space";
import { useSpace } from "@/lib/space/hooks";
import { updateSpace } from "@/lib/space/store";
import { parsePhrase, validateTypingText } from "@/lib/typing/phrases";
import { TextImportPanel } from "./TextImport";

/* Câu luyện gõ của riêng người học. Dùng cú pháp có sẵn của phòng luyện gõ: kanji kèm cách đọc {漢字|かんじ}.
   Câu phải gõ được trọn vẹn (xem validateTypingText) nên lỗi được báo ngay lúc soạn, không phải lúc đang gõ dở. */

export function TextsPane() {
  const { space } = useSpace();
  const [text, setText] = useState("");
  const [vi, setVi] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const texts = space.library.texts;
  // Báo lỗi ngay khi gõ, nhưng chỉ khi đã có chữ: ô trống không phải "lỗi".
  const live = text.trim() ? validateTypingText(text) : null;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateSpace((s) => addText(s, { text, vi }).space);
    if (!res.ok) return setErr(res.error);
    setErr(null);
    setText("");
    setVi("");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Thêm câu luyện gõ</span>
        <form onSubmit={add} className="flex flex-col gap-3">
          <Field
            label="Câu tiếng Nhật"
            value={text}
            maxLength={LIMITS.text}
            lang="ja"
            placeholder="{私|わたし}は{学生|がくせい}です"
            error={live ?? undefined}
            onChange={(e) => { setText(e.target.value); setErr(null); }}
          />
          <Field label="Nghĩa tiếng Việt (tuỳ chọn, chỉ hiện ở màn kết quả)" value={vi} maxLength={LIMITS.textVi} placeholder="Tôi là học sinh" onChange={(e) => setVi(e.target.value)} />
          <p className="text-[12.5px] leading-relaxed text-sumi-3">
            Hiragana, katakana và dấu câu gõ thẳng. <b>Kanji phải kèm cách đọc</b>: viết <code>{"{漢字|かんじ}"}</code> để vừa hiện furigana vừa biết phải gõ gì.
          </p>
          <Button type="submit" variant="solid" className="self-start" disabled={!text.trim() || live !== null}>Thêm câu</Button>
        </form>
        {err && <Notice tone="err">{err}</Notice>}
      </Card>

      <TextImportPanel existing={texts.length} count={texts.length} />

      {texts.length === 0 ? (
        <Empty title="Chưa có câu nào" hint="Thêm câu từ bài học, bài hát, truyện bạn đang đọc — rồi chọn “Câu của tôi” trong phòng luyện gõ." />
      ) : (
        <>
          <p className="text-[12.5px] text-sumi-3">
            {texts.length} câu · <Link href="/luyen-go" className="underline">Vào phòng luyện gõ</Link> và chọn nội dung “Câu của tôi”.
          </p>
          <ul className="flex flex-col gap-2">
            {texts.map((t) => <TextRow key={t.id} item={t} />)}
          </ul>
        </>
      )}
    </div>
  );
}

function TextRow({ item }: { item: UserText }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [vi, setVi] = useState(item.vi);
  const [err, setErr] = useState<string | null>(null);
  const phrase = parsePhrase(item.text, item.vi);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateSpace((s) => updateText(s, item.id, { text, vi }));
    if (!res.ok) return setErr(res.error);
    setErr(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <Card className="px-4 py-3">
          <form onSubmit={save} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Câu" value={text} maxLength={LIMITS.text} lang="ja" onChange={(e) => setText(e.target.value)} />
            <Field label="Nghĩa" value={vi} maxLength={LIMITS.textVi} onChange={(e) => setVi(e.target.value)} />
            <div className="flex gap-1.5">
              <Button type="submit" variant="solid" size="sm">Lưu</Button>
              <Button type="button" size="sm" onClick={() => { setEditing(false); setErr(null); setText(item.text); setVi(item.vi); }}>Huỷ</Button>
            </div>
          </form>
          {err && <Notice tone="err" className="mt-2">{err}</Notice>}
        </Card>
      </li>
    );
  }

  return (
    <li>
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <span className="min-w-0 flex-1" lang="ja">
          <span className="font-japanese text-lg">
            {phrase.segments.map((s, i) =>
              s.ruby ? <ruby key={i}>{s.text}<rt className="text-[0.55em] text-sumi-3">{s.reading}</rt></ruby> : <span key={i}>{s.text}</span>,
            )}
          </span>
          {item.vi && <span className="block text-[12.5px] text-sumi-3">{item.vi}</span>}
        </span>
        <span className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Sửa</Button>
          <Button size="sm" variant="ghost" className="text-shu hover:text-shu-2" onClick={() => updateSpace((s) => deleteText(s, item.id))}>Xoá</Button>
        </span>
      </Card>
    </li>
  );
}
