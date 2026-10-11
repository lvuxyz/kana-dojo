"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Button } from "@/components/ui";
import { addTexts, type AddTextsResult } from "@/lib/space/library";
import { LIMITS } from "@/lib/space/space";
import { updateSpace } from "@/lib/space/store";
import { MAX_IMPORT_BYTES, decodeTextFile, importLinesToText, parseTypingImport } from "@/lib/typing/import";

/* Nhập cả đoạn văn bản (dán vào, chọn hoặc kéo thả tệp .txt) thành "Câu của tôi". Câu nào không gõ được thì ở lại
   trong ô kèm lý do, để người học thêm cách đọc {漢字|かんじ} rồi nhập tiếp — không câu hỏng nào lọt vào ván gõ. */

type Msg = { tone: "ok" | "err"; text: string } | null;

const SHOWN_PROBLEMS = 3;

const SYNTAX: { code: string; note: string }[] = [
  { code: "おはよう。げんき？", note: "Tự tách câu ở 。！？" },
  { code: "ありがとう | Cảm ơn", note: "Kèm nghĩa (dấu | hoặc Tab)" },
  { code: "{漢字|かんじ}", note: "Kanji phải kèm cách đọc" },
];

export function TextImport({ existing }: { existing: number }) {
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [help, setHelp] = useState(false);
  const [allProblems, setAllProblems] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => parseTypingImport(input), [input]);
  const ok = lines.filter((l) => l.reason === null);
  const bad = lines.filter((l) => l.reason !== null);
  const room = LIMITS.texts - existing;
  const full = ok.length > room;

  const edit = (text: string) => {
    setInput(text);
    setMsg(null);
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) return setMsg({ tone: "err", text: "Tệp quá lớn — hãy chọn tệp văn bản dưới 256 KB." });
      const text = decodeTextFile(await file.arrayBuffer());
      setInput((prev) => (prev.trim() ? `${prev.replace(/\s+$/, "")}\n${text}` : text));
      setMsg({ tone: "ok", text: `Đã đọc “${file.name}”.` });
    } catch {
      setMsg({ tone: "err", text: "Không đọc được tệp này. Hãy dùng tệp văn bản thường (.txt)." });
    } finally {
      if (fileInput.current) fileInput.current.value = ""; // cho phép chọn lại đúng tệp đó lần nữa
    }
  };

  const importAll = () => {
    let out: AddTextsResult | null = null;
    const res = updateSpace((s) => {
      out = addTexts(s, ok);
      return out.space;
    });
    if (!res.ok || !out) return setMsg({ tone: "err", text: res.ok ? "Không nhập được." : res.error });
    const r: AddTextsResult = out;
    const dup = r.duplicate > 0 ? ` · bỏ qua ${r.duplicate} câu đã có` : "";
    const rest = bad.length > 0 ? ` · ${bad.length} câu cần sửa vẫn ở trong ô` : "";
    setMsg({ tone: "ok", text: `Đã thêm ${r.added} câu${dup}${rest}.` });
    setInput(importLinesToText(bad));
    setAllProblems(false);
  };

  const problems = allProblems ? bad : bad.slice(0, SHOWN_PROBLEMS);

  return (
    <div className="flex flex-col gap-2.5">
      {/* Ô soạn và thanh công cụ là một khối — kéo thả tệp vào bất kỳ đâu trong khối. */}
      <div
        className={clsx(
          "@container overflow-hidden rounded-xl border bg-surface transition-colors",
          dragging ? "border-shu border-dashed ring-3 ring-shu/15" : "border-rule/80 focus-within:border-shu focus-within:ring-3 focus-within:ring-shu/15",
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void loadFile(e.dataTransfer.files[0]); }}
      >
        <textarea
          aria-label="Văn bản cần nhập"
          value={input}
          rows={4}
          lang="ja"
          className="block w-full resize-y bg-transparent px-4 py-3 font-japanese text-[15px] leading-relaxed text-sumi outline-none placeholder:text-sumi-3/70"
          placeholder={"Dán văn bản hoặc kéo thả tệp .txt vào đây\nVD: おはよう。{今日|きょう}もがんばろう！"}
          onChange={(e) => edit(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule/60 bg-paper-sunk/40 px-2 py-1.5">
          <ToolButton onClick={() => fileInput.current?.click()} icon={<UploadIcon />} title="Chọn tệp .txt">Tệp .txt</ToolButton>
          <ToolButton onClick={() => setHelp((v) => !v)} icon={<InfoIcon />} active={help} aria-expanded={help} title="Cú pháp">Cú pháp</ToolButton>
          {input.trim() && <ToolButton onClick={() => edit("")} icon={<ClearIcon />} aria-label="Xoá nội dung ô" title="Xoá nội dung ô" />}
          <input ref={fileInput} type="file" accept=".txt,.tsv,.csv,text/plain" className="hidden" onChange={(e) => void loadFile(e.target.files?.[0])} />

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {bad.length > 0 && <Pill tone="err">{bad.length} cần sửa</Pill>}
            <Button variant="solid" size="sm" onClick={importAll} disabled={ok.length === 0 || full}>
              {ok.length > 0 ? `Thêm ${ok.length} câu` : "Thêm câu"}
            </Button>
          </div>
        </div>
      </div>

      {help && (
        <dl className="flex flex-col divide-y divide-rule/50 rounded-xl border border-rule/60 bg-paper-sunk/40 px-3 text-[12px]">
          {SYNTAX.map((s) => (
            <div key={s.code} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
              <dt><code lang="ja" className="font-japanese text-[13px] text-sumi">{s.code}</code></dt>
              <dd className="text-sumi-3">{s.note}</dd>
            </div>
          ))}
        </dl>
      )}

      {full && <Line tone="err">Chỉ còn chỗ cho {Math.max(0, room)} câu (tối đa {LIMITS.texts}) — hãy bớt văn bản hoặc xoá câu cũ.</Line>}

      {bad.length > 0 && (
        <div className="flex flex-col gap-1">
          {problems.map((l) => (
            <div key={l.text} className="rounded-lg border-l-2 border-shu bg-shu-tint/50 px-3 py-1.5">
              <p lang="ja" className="truncate font-japanese text-[13.5px] text-sumi">{l.text}</p>
              <p className="text-[11.5px] leading-snug text-shu-2">{l.reason}</p>
            </div>
          ))}
          {bad.length > SHOWN_PROBLEMS && (
            <button type="button" className="self-start px-1 text-[12px] font-semibold text-sumi-3 hover:text-sumi" onClick={() => setAllProblems((v) => !v)}>
              {allProblems ? "Thu gọn" : `Xem thêm ${bad.length - SHOWN_PROBLEMS} câu cần sửa`}
            </button>
          )}
        </div>
      )}

      {msg && <Line tone={msg.tone}>{msg.text}</Line>}
    </div>
  );
}

/** Khung gọn bao ô nhập: tiêu đề + số câu đã lưu, link quản lý, nút mở/thu gọn (mở sẵn khi chưa có câu nào). */
export function TextImportPanel({ existing, count, manageHref }: { existing: number; count: number; manageHref?: string }) {
  // Chỉ lấy trạng thái ban đầu theo số câu; sau đó giữ đúng như người học chọn (không tự đóng sau khi vừa nhập xong).
  const [open, setOpen] = useState(count === 0);
  return (
    <div className="rounded-2xl border border-rule/70 bg-surface-2/60">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span lang="ja" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-shu-tint font-japanese text-[13px] font-bold text-shu">文</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-bold text-sumi">Nhập văn bản để luyện gõ</p>
          <p className="text-[11.5px] text-sumi-3 tnum">
            {count > 0 ? `${count} câu đã lưu` : "Chưa có câu nào"}
            {manageHref && count > 0 && (
              <>
                {" · "}
                <Link href={manageHref} className="font-semibold hover:text-sumi hover:underline">Quản lý</Link>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-sumi-2 transition-colors hover:bg-paper-sunk"
        >
          {open ? "Thu gọn" : count > 0 ? "Nhập thêm" : "Mở"}
          <svg {...ICON} className={clsx("transition-transform", open && "rotate-180")}><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-rule/60 p-3">
          <TextImport existing={existing} />
        </div>
      )}
    </div>
  );
}

function ToolButton({
  icon,
  active,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors",
        active ? "bg-surface text-sumi shadow-xs" : "text-sumi-3 hover:bg-surface hover:text-sumi",
      )}
      {...rest}
    >
      {icon}
      {children && <span className="hidden @md:inline">{children}</span>}
    </button>
  );
}

function Pill({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold tnum",
        tone === "ok" ? "bg-genko-tint text-genko" : "bg-shu-tint text-shu-2",
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", tone === "ok" ? "bg-genko" : "bg-shu")} />
      {children}
    </span>
  );
}

function Line({ tone, children }: { tone: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p role={tone === "err" ? "alert" : "status"} className={clsx("px-1 text-[12.5px] font-semibold", tone === "ok" ? "text-genko" : "text-shu-2")}>
      {tone === "ok" ? "✓ " : ""}{children}
    </p>
  );
}

const ICON = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const UploadIcon = () => (
  <svg {...ICON}><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" /></svg>
);
const InfoIcon = () => (
  <svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>
);
const ClearIcon = () => (
  <svg {...ICON}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
