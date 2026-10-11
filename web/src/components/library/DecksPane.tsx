"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Empty, Field, Notice, Switch, TextArea } from "@/components/ui";
import { downloadText, safeFileName } from "@/components/app/download";
import { useProgress } from "@/lib/learning/hooks";
import { forgetDeletedCards } from "@/lib/learning/store";
import { systemClock } from "@/lib/learning/time";
import {
  addCards, addDeck, deckToTsv, deleteCard, deleteDeck, parseCardLines, updateCard, updateDeck, type AddCardsResult,
} from "@/lib/space/library";
import { cardSchedule, deckSchedule } from "@/lib/space/schedule";
import { LIMITS, type Deck, type DeckCard } from "@/lib/space/space";
import { useSpace } from "@/lib/space/hooks";
import { getSpace, updateSpace } from "@/lib/space/store";

/** Sau khi xoá: bỏ lịch ôn của những thẻ không còn nằm ở bộ nào (một mã có thể có ở hai bộ nếu nhập từ tệp ngoài). */
function forgetIfGone(cardIds: readonly string[]) {
  const left = new Set(getSpace().library.decks.flatMap((d) => d.cards.map((c) => c.id)));
  forgetDeletedCards(cardIds.filter((id) => !left.has(id)));
}

/* Bộ thẻ tự soạn: mỗi thẻ có mặt trước (câu hỏi), mặt sau (đáp án) và gợi ý tuỳ chọn. Thẻ vào hàng đợi ôn FSRS cùng
   thẻ kana và từ vựng có sẵn — người học quyết định bộ nào đang ôn, có hỏi ngược không. */

type Msg = { tone: "ok" | "err"; text: string } | null;

export function DecksPane() {
  const { space } = useSpace();
  const [openId, setOpenId] = useState<string | null>(null);
  const deck = space.library.decks.find((d) => d.id === openId) ?? null;

  return deck ? <DeckDetail key={deck.id} deck={deck} onBack={() => setOpenId(null)} /> : <DeckList onOpen={setOpenId} />;
}

// ------------------------------------------------------------------ danh sách bộ thẻ

function DeckList({ onOpen }: { onOpen: (id: string) => void }) {
  const { space } = useSpace();
  const { state } = useProgress();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const now = useMemo(() => systemClock().now, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    let id: string | null = null;
    const res = updateSpace((s) => {
      const r = addDeck(s, name);
      id = r.deck.id;
      return r.space;
    });
    if (!res.ok) return setMsg({ tone: "err", text: res.error });
    setMsg(null);
    setName("");
    if (id) onOpen(id);
  };

  const decks = space.library.decks;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <Field label="Tạo bộ thẻ mới" value={name} maxLength={LIMITS.deckName} placeholder="Ví dụ: Kanji N5, Từ trong bài hát…" onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" variant="solid" disabled={!name.trim()}>＋ Tạo bộ</Button>
      </form>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {decks.length === 0 ? (
        <Empty
          title="Chưa có bộ thẻ nào"
          hint="Tự soạn thẻ về bất cứ thứ gì bạn muốn nhớ — chữ Hán, từ trong truyện, ngữ pháp. Thẻ sẽ được ôn theo lịch FSRS cùng với phần còn lại."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {decks.map((d) => {
            const st = deckSchedule(state, d, now);
            return (
              <li key={d.id}>
                <Card className="flex h-full flex-col gap-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mincho text-lg font-bold text-sumi">{d.name}</p>
                      <p className="text-[12.5px] text-sumi-3 tnum">{d.cards.length} thẻ{st.due > 0 ? ` · ${st.due} đến hạn` : ""}{st.fresh > 0 ? ` · ${st.fresh} chưa học` : ""}</p>
                    </div>
                    {!d.active && <Badge size="sm">Đang tắt</Badge>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Switch
                      checked={d.active}
                      onChange={(v) => updateSpace((s) => updateDeck(s, d.id, { active: v }))}
                      label="Đưa vào ôn tập"
                      hint="Tắt thì bộ nằm yên, lịch ôn vẫn được giữ."
                    />
                    <Switch
                      checked={d.reverse}
                      onChange={(v) => updateSpace((s) => updateDeck(s, d.id, { reverse: v }))}
                      label="Hỏi cả hai chiều"
                      hint="Thêm thẻ mặt sau → mặt trước cho mỗi thẻ."
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onOpen(d.id)} className="mt-auto self-start">Mở bộ thẻ</Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ một bộ thẻ

const PAGE = 100;

function DeckDetail({ deck, onBack }: { deck: Deck; onBack: () => void }) {
  const { state } = useProgress();
  const now = useMemo(() => systemClock().now, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState({ front: "", back: "", hint: "" });
  const [name, setName] = useState(deck.name);
  const [paste, setPaste] = useState("");
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [msg, setMsg] = useState<Msg>(null);
  const frontRef = useRef<HTMLInputElement>(null);

  const st = deckSchedule(state, deck, now);
  const parsedPaste = useMemo(() => parseCardLines(paste), [paste]);

  const run = (fn: (s: Parameters<Parameters<typeof updateSpace>[0]>[0]) => AddCardsResult): AddCardsResult | null => {
    let out: AddCardsResult | null = null;
    const res = updateSpace((s) => {
      out = fn(s);
      return out.space;
    });
    if (!res.ok) { setMsg({ tone: "err", text: res.error }); return null; }
    return out;
  };

  const addOne = (e: React.FormEvent) => {
    e.preventDefault();
    const r = run((s) => addCards(s, deck.id, [draft]));
    if (!r) return;
    if (r.added === 0) return setMsg({ tone: "err", text: r.duplicate > 0 ? "Thẻ này đã có trong bộ." : "Thẻ cần có cả mặt trước và mặt sau." });
    setMsg(null);
    setDraft({ front: "", back: "", hint: "" });
    frontRef.current?.focus();
  };

  const importPaste = () => {
    const r = run((s) => addCards(s, deck.id, parsedPaste.drafts));
    if (!r) return;
    const skipped = r.duplicate + r.empty + parsedPaste.ignored;
    setMsg({ tone: "ok", text: `Đã thêm ${r.added} thẻ${skipped > 0 ? ` (bỏ qua ${skipped}: trùng hoặc không đọc được)` : ""}.` });
    if (r.added > 0) setPaste("");
  };

  const rename = () => {
    if (name.trim() === deck.name) return;
    const res = updateSpace((s) => updateDeck(s, deck.id, { name }));
    if (!res.ok) { setName(deck.name); setMsg({ tone: "err", text: res.error }); }
  };

  const remove = () => {
    if (!window.confirm(`Xoá bộ “${deck.name}” cùng ${deck.cards.length} thẻ? Lịch ôn của các thẻ này cũng bị xoá. Không thể hoàn tác.`)) return;
    const ids = deck.cards.map((c) => c.id);
    if (updateSpace((s) => deleteDeck(s, deck.id)).ok) forgetIfGone(ids);
    onBack();
  };

  const exportTsv = () => downloadText(`${safeFileName(deck.name, "bo-the")}.tsv`, `${deckToTsv(deck)}\n`, "text/tab-separated-values;charset=utf-8");

  const copyTsv = async () => {
    try {
      await navigator.clipboard.writeText(deckToTsv(deck));
      setMsg({ tone: "ok", text: "Đã sao chép bộ thẻ." });
    } catch {
      setMsg({ tone: "err", text: "Trình duyệt không cho sao chép tự động — hãy dùng nút “Tải về”." });
    }
  };

  const needle = filter.trim().toLowerCase();
  const shown = needle ? deck.cards.filter((c) => `${c.front} ${c.back} ${c.hint}`.toLowerCase().includes(needle)) : deck.cards;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Các bộ thẻ</Button>
        <div className="min-w-56 flex-1">
          <Field label="Tên bộ thẻ" value={name} maxLength={LIMITS.deckName} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={exportTsv} disabled={deck.cards.length === 0}>Tải về</Button>
          <Button size="sm" variant="outline" onClick={() => void copyTsv()} disabled={deck.cards.length === 0}>Sao chép</Button>
          <Button size="sm" variant="ghost" onClick={remove} className="text-shu hover:text-shu-2">Xoá bộ</Button>
        </div>
      </div>

      <p className="text-[12.5px] text-sumi-3 tnum">
        {deck.cards.length} thẻ · {st.due} đến hạn · {st.fresh} chưa học ·{" "}
        {deck.active ? "đang ôn" : "đang tắt"}{deck.reverse ? " · hỏi cả hai chiều" : ""} ·{" "}
        <Link href="/on-tap" className="underline">Ôn tập</Link>
      </p>

      <Card className="flex flex-col gap-3 px-5 py-4">
        <span className="label-xs">Thêm thẻ</span>
        <form onSubmit={addOne} className="grid gap-2.5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field ref={frontRef} label="Mặt trước (câu hỏi)" value={draft.front} maxLength={LIMITS.cardFront} placeholder="水" lang="ja" onChange={(e) => setDraft({ ...draft, front: e.target.value })} />
          <Field label="Mặt sau (đáp án)" value={draft.back} maxLength={LIMITS.cardBack} placeholder="nước" onChange={(e) => setDraft({ ...draft, back: e.target.value })} />
          <Field label="Gợi ý (tuỳ chọn)" value={draft.hint} maxLength={LIMITS.cardHint} placeholder="みず" onChange={(e) => setDraft({ ...draft, hint: e.target.value })} />
          <Button type="submit" variant="solid" disabled={!draft.front.trim() || !draft.back.trim()}>Thêm</Button>
        </form>

        <details className="text-[13px]">
          <summary className="cursor-pointer font-semibold text-sumi-2">Nhập nhiều thẻ cùng lúc</summary>
          <div className="mt-3 flex flex-col gap-2.5">
            <p className="text-[12.5px] leading-relaxed text-sumi-3">
              Mỗi dòng một thẻ, các cột cách nhau bằng <b>Tab</b> (dán thẳng từ Excel, Google Sheets, Anki), hoặc <code>|</code>, hoặc <code>;</code>.
              Cột 1 = mặt trước, cột 2 = mặt sau, cột 3 = gợi ý (tuỳ chọn).
            </p>
            <TextArea aria-label="Danh sách thẻ cần nhập" value={paste} rows={6} className="font-japanese" placeholder={"水 | nước | みず\n火 | lửa | ひ"} onChange={(e) => setPaste(e.target.value)} />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={importPaste} disabled={parsedPaste.drafts.length === 0}>
                Nhập {parsedPaste.drafts.length} thẻ
              </Button>
              {paste.trim() && (
                <span className="text-[12px] text-sumi-3">
                  Đọc được {parsedPaste.drafts.length} thẻ{parsedPaste.ignored > 0 ? `, ${parsedPaste.ignored} dòng không tách được hai mặt` : ""}.
                </span>
              )}
            </div>
          </div>
        </details>
      </Card>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {deck.cards.length === 0 ? (
        <Empty title="Bộ thẻ còn trống" hint="Thêm thẻ đầu tiên ở trên. Từ vựng có sẵn cũng thêm được từ trang Từ vựng." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {deck.cards.length > 8 && (
            <input
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setLimit(PAGE); }}
              placeholder="Lọc thẻ trong bộ…"
              aria-label="Lọc thẻ trong bộ"
              className="w-full rounded-xl border border-rule/80 bg-surface px-3.5 py-2 text-sm outline-none focus:border-shu focus:ring-3 focus:ring-shu/15 sm:w-72"
            />
          )}
          <ul className="flex flex-col gap-2">
            {shown.slice(0, limit).map((c) => (
              <CardRow key={c.id} deckId={deck.id} card={c} schedule={cardSchedule(state, c.id, now)} />
            ))}
          </ul>
          {shown.length > limit && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setLimit(limit + PAGE)}>
              Hiện thêm {Math.min(PAGE, shown.length - limit)} thẻ
            </Button>
          )}
          {shown.length === 0 && <p className="text-sm text-sumi-3">Không có thẻ nào khớp “{filter}”.</p>}
        </div>
      )}
    </div>
  );
}

function CardRow({ deckId, card, schedule }: { deckId: string; card: DeckCard; schedule: ReturnType<typeof cardSchedule> }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ front: card.front, back: card.back, hint: card.hint });
  const [err, setErr] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateSpace((s) => updateCard(s, deckId, card.id, f));
    if (!res.ok) return setErr(res.error);
    setErr(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <Card className="px-4 py-3">
          <form onSubmit={save} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <Field label="Mặt trước" value={f.front} maxLength={LIMITS.cardFront} lang="ja" onChange={(e) => setF({ ...f, front: e.target.value })} />
            <Field label="Mặt sau" value={f.back} maxLength={LIMITS.cardBack} onChange={(e) => setF({ ...f, back: e.target.value })} />
            <Field label="Gợi ý" value={f.hint} maxLength={LIMITS.cardHint} onChange={(e) => setF({ ...f, hint: e.target.value })} />
            <div className="flex gap-1.5">
              <Button type="submit" variant="solid" size="sm">Lưu</Button>
              <Button type="button" size="sm" onClick={() => { setEditing(false); setErr(null); setF({ front: card.front, back: card.back, hint: card.hint }); }}>Huỷ</Button>
            </div>
          </form>
          {err && <Notice tone="err" className="mt-2">{err}</Notice>}
        </Card>
      </li>
    );
  }

  return (
    <li>
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <span className="min-w-20 font-mincho text-lg" lang="ja">{card.front}</span>
        <span className="min-w-0 flex-1 text-sm text-sumi-2">
          {card.back}
          {card.hint && <span className="ml-2 text-[12.5px] text-sumi-3">· {card.hint}</span>}
        </span>
        <span className="text-[11.5px] font-semibold text-sumi-3 tnum">
          {schedule.kind === "new" && "Chưa học"}
          {schedule.kind === "due" && <span className="text-shu">Đến hạn</span>}
          {schedule.kind === "later" && `Ôn sau ${schedule.inDays} ngày`}
        </span>
        <span className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Sửa</Button>
          <Button size="sm" variant="ghost" className="text-shu hover:text-shu-2" onClick={() => { if (updateSpace((s) => deleteCard(s, deckId, card.id)).ok) forgetIfGone([card.id]); }}>Xoá</Button>
        </span>
      </Card>
    </li>
  );
}
