"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Button, Card, Empty, Field, Notice, Seg, TextArea } from "@/components/ui";
import { downloadText, safeFileName } from "@/lib/download";
import { addNote, deleteNote, searchNotes, updateNote } from "@/lib/space/library";
import { previewOf } from "@/lib/space/markup";
import { LIMITS, type Note } from "@/lib/space/space";
import { useSpace } from "@/lib/space/hooks";
import { updateSpace } from "@/lib/space/store";
import { RichText } from "./RichText";

/* Ghi chú / tài liệu của người học: soạn bằng cú pháp nhẹ (lib/space/markup.ts), tự lưu, ghim, tìm, xuất ra tệp .md. */

const SAVE_DELAY_MS = 500;

export function NotesPane({ initialId }: { initialId: string | null }) {
  const { space } = useSpace();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialId);
  const [error, setError] = useState<string | null>(null);

  const all = space.library.notes;
  const notes = useMemo(() => searchNotes(all, query), [all, query]);
  const open = all.find((n) => n.id === openId) ?? null;

  const create = () => {
    let id: string | null = null;
    const res = updateSpace((s) => {
      const r = addNote(s);
      id = r.note.id;
      return r.space;
    });
    if (!res.ok) return setError(res.error);
    setError(null);
    setQuery("");
    setOpenId(id);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className={clsx("flex flex-col gap-3", open && "hidden lg:flex")}>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong ghi chú…"
            aria-label="Tìm trong ghi chú"
            className="min-w-0 flex-1 rounded-xl border border-rule/80 bg-surface px-3.5 py-2 text-sm outline-none focus:border-shu focus:ring-3 focus:ring-shu/15"
          />
          <Button variant="solid" size="sm" onClick={create}>＋ Mới</Button>
        </div>
        {error && <Notice tone="err">{error}</Notice>}

        {all.length === 0 ? (
          <Empty
            title="Chưa có ghi chú nào"
            hint="Viết ngữ pháp, mẹo nhớ, từ hay gặp — bất cứ thứ gì bạn muốn giữ lại. Dùng {漢字|かんじ} để hiện furigana."
            action={<Button variant="solid" onClick={create}>Viết ghi chú đầu tiên</Button>}
          />
        ) : notes.length === 0 ? (
          <p className="px-1 text-sm text-sumi-3">Không có ghi chú nào khớp “{query}”.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(n.id)}
                  aria-current={n.id === openId ? "true" : undefined}
                  className={clsx(
                    "flex w-full cursor-pointer flex-col gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    n.id === openId ? "border-shu bg-shu-tint/60" : "border-rule/80 bg-surface hover:border-rule-firm hover:bg-surface-2",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold text-sumi">
                    {n.pinned && <span aria-label="Đã ghim" title="Đã ghim">📌</span>}
                    <span className="truncate">{n.title || "Không có tiêu đề"}</span>
                  </span>
                  <span className="line-clamp-2 text-[12.5px] text-sumi-3">{previewOf(n.body) || "—"}</span>
                  <span className="text-[11px] text-sumi-3 tnum">{new Date(n.updatedAt).toLocaleDateString("vi-VN")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={clsx(!open && "hidden lg:block")}>
        {open ? (
          <NoteEditor key={open.id} note={open} onClose={() => setOpenId(null)} />
        ) : (
          <Empty title="Chọn một ghi chú để đọc hoặc sửa" hint="Hoặc bấm “＋ Mới” để viết ghi chú mới." />
        )}
      </div>
    </div>
  );
}

function NoteEditor({ note, onClose }: { note: Note; onClose: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [view, setView] = useState<"edit" | "read">(note.body ? "read" : "edit");
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const latest = useRef({ title: note.title, body: note.body });
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    const res = updateSpace((s) => updateNote(s, note.id, latest.current));
    setStatus(res.ok ? { tone: "ok", text: "Đã lưu" } : { tone: "err", text: res.error });
  }, [note.id]);

  const change = (next: { title?: string; body?: string }) => {
    if (next.title !== undefined) setTitle(next.title);
    if (next.body !== undefined) setBody(next.body);
    latest.current = { ...latest.current, ...next };
    dirty.current = true;
    setStatus(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  // Rời trang, đóng tab hay đổi sang ghi chú khác: lưu nốt phần đang chờ thay vì đánh rơi nửa câu cuối.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const togglePin = () => {
    flush();
    updateSpace((s) => updateNote(s, note.id, { pinned: !note.pinned }));
  };

  const remove = () => {
    if (!window.confirm(`Xoá ghi chú “${title || "Không có tiêu đề"}”? Không thể hoàn tác.`)) return;
    dirty.current = false;
    clearTimeout(timer.current);
    updateSpace((s) => deleteNote(s, note.id));
    onClose();
  };

  const exportMd = () => {
    flush();
    downloadText(`${safeFileName(title, "ghi-chu")}.md`, `${title ? `# ${title}\n\n` : ""}${body}\n`, "text/markdown;charset=utf-8");
  };

  return (
    <Card className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => { flush(); onClose(); }} className="lg:hidden">← Danh sách</Button>
        <Seg
          className="w-fit"
          value={view}
          onChange={(v) => { flush(); setView(v); }}
          options={[{ value: "edit", label: "Soạn" }, { value: "read", label: "Xem" }]}
        />
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={togglePin} aria-pressed={note.pinned}>
            {note.pinned ? "Bỏ ghim" : "📌 Ghim"}
          </Button>
          <Button size="sm" variant="outline" onClick={exportMd}>Tải .md</Button>
          <Button size="sm" variant="ghost" onClick={remove} className="text-shu hover:text-shu-2">Xoá</Button>
        </div>
      </div>

      <Field
        label="Tiêu đề"
        value={title}
        maxLength={LIMITS.noteTitle}
        placeholder="Ví dụ: Trợ từ は và が"
        onChange={(e) => change({ title: e.target.value })}
        onBlur={flush}
      />

      {view === "edit" ? (
        <div className="flex flex-col gap-1.5">
          <TextArea
            label="Nội dung"
            value={body}
            rows={16}
            maxLength={LIMITS.noteBody}
            className="min-h-72 font-japanese"
            placeholder={"# Tiêu đề\n- gạch đầu dòng\n**in đậm**, `romaji`, {漢字|かんじ}\n> trích dẫn"}
            onChange={(e) => change({ body: e.target.value })}
            onBlur={flush}
          />
          <p className="text-[11.5px] text-sumi-3">
            <code># tiêu đề</code> · <code>- mục</code> · <code>1. mục</code> · <code>**đậm**</code> · <code>`mã`</code> · <code>&gt; trích</code> ·{" "}
            <code>{"{漢字|かんじ}"}</code> hiện furigana
          </p>
        </div>
      ) : (
        <div className="min-h-40 rounded-xl border border-rule/70 bg-paper-sunk/40 px-5 py-4">
          <RichText source={body} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-[11.5px] text-sumi-3">
        <span className="tnum">{body.length.toLocaleString("vi-VN")}/{LIMITS.noteBody.toLocaleString("vi-VN")} ký tự</span>
        {status && <Notice tone={status.tone} className="px-2.5 py-1 text-[11.5px]">{status.text}</Notice>}
      </div>
    </Card>
  );
}
