"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import clsx from "clsx";
import { Button, Kbd, Progress, Stat } from "@/components/ui";
import { getSpace } from "@/lib/space/store";
import { clearSaved, saveSession } from "@/lib/study/saved";
import {
  currentCard, formatClock, formatDuration, isDone, shouldOfferSave, studyKeyAction, studyReducer, summarize, toSaved,
  type Flashcard, type StudySession, type Verdict,
} from "@/lib/study/session";

/* Màn học tập trung: phủ cả màn hình (ẩn điều hướng), một thẻ một lúc. Toàn bộ luật nằm ở lib/study/session.ts;
   component này chỉ vẽ trạng thái, đổi thao tác thành sự kiện và báo "hiệu ứng xong" (`settle`) cho reducer. */

/** Khớp `duration-500` của mặt thẻ và `.study-card-in` trong globals.css. */
const FLIP_MS = 500;
const CARD_IN_MS = 260;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function StudyFocus({
  initial,
  deckName,
  onExit,
}: {
  initial: StudySession;
  deckName: string;
  /** Rời màn học. Lưu/xoá phiên dở đã làm xong trước khi gọi. */
  onExit: () => void;
}) {
  const [s, dispatch] = useReducer(studyReducer, initial);
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const card = currentCard(s);
  const done = isDone(s);

  // Mở khoá khi hiệu ứng chạy xong. Hẹn giờ thay vì `transitionend`: sự kiện đó không đến khi người dùng tắt hiệu ứng,
  // khi tab bị ẩn giữa chừng, hoặc khi phần tử bị thay (thẻ mới) — khoá sẽ kẹt vĩnh viễn.
  useEffect(() => {
    if (!s.locked) return;
    const ms = prefersReducedMotion() ? 0 : s.side === "back" ? FLIP_MS : CARD_IN_MS;
    const t = setTimeout(() => dispatch({ type: "settle" }), ms);
    return () => clearTimeout(t);
  }, [s.locked, s.side, s.index]);

  // Xong phiên thì phiên dở (nếu có) không còn ý nghĩa.
  useEffect(() => {
    if (done) clearSaved(s.deckId);
  }, [done, s.deckId]);

  // Nút đã mở màn học — đọc ngay lần render đầu, trước khi effect của FlipCard kéo focus vào thẻ.
  const [opener] = useState(() => (typeof document === "undefined" ? null : document.activeElement));

  // Khoá cuộn trang phía sau lớp phủ; rời màn học thì trả focus về chỗ cũ, để người dùng bàn phím/trình đọc màn hình
  // không bị đẩy về đầu trang.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      mounted.current = false;
      document.body.style.overflow = prev;
      // Chờ React vẽ xong trang phía sau: nút "Học ngay" có thể vừa được thay bằng "Học tiếp" (phần tử mới), khi đó
      // dùng nút học chính của bộ thẻ. Ref (không phải biến cục bộ) để bắt được việc StrictMode gỡ rồi gắn lại effect
      // lúc dev: lần gắn lại đặt `mounted` về true trước khi hẹn giờ chạy, và màn học vẫn đang mở.
      setTimeout(() => {
        if (mounted.current) return;
        // `<body>` không tính là nút mở: Safari không đưa focus vào nút khi bấm chuột/chạm, nên activeElement lúc mở là body.
        const usable = opener instanceof HTMLElement && opener !== document.body && opener.isConnected;
        const target = usable ? opener : document.querySelector<HTMLElement>("[data-study-return]");
        target?.focus({ preventScroll: true });
      }, 0);
    };
  }, [opener]);

  // `latest` cho các handler đăng ký một lần (popstate, beforeunload) luôn thấy phiên mới nhất.
  const latest = useRef(s);
  latest.current = s;

  /* Nút Back của trình duyệt/điện thoại: thêm một mục lịch sử khi vào màn học. Bấm Back thì mục đó bị bỏ; nếu đang dở
     thì đặt lại mục và hỏi lưu, nếu không thì rời màn học. Thoát bằng nút của trang thì tự `history.back()` để không
     để lại mục thừa — `leaving` báo cho handler biết lần popstate đó là của chính mình. */
  const leaving = useRef(false);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;
  useEffect(() => {
    // StrictMode chạy effect hai lần khi dev: đừng thêm mục thứ hai.
    if (!(window.history.state as { kdStudy?: boolean } | null)?.kdStudy) window.history.pushState({ kdStudy: true }, "");
    const onPop = () => {
      if (leaving.current || !shouldOfferSave(latest.current)) {
        leaving.current = false;
        exitRef.current();
        return;
      }
      window.history.pushState({ kdStudy: true }, "");
      setConfirming(true);
    };
    // Đóng tab/tải lại giữa chừng: trình duyệt tự hỏi (không tuỳ biến được nội dung).
    const onUnload = (e: BeforeUnloadEvent) => {
      if (shouldOfferSave(latest.current)) e.preventDefault();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  const leave = (before?: () => void) => {
    before?.();
    leaving.current = true;
    window.history.back();
  };

  const requestExit = () => {
    if (shouldOfferSave(s)) setConfirming(true);
    else leave();
  };

  const saveAndExit = () => {
    const liveDeckIds = getSpace().library.decks.map((d) => d.id);
    if (!saveSession(toSaved(s, Date.now()), liveDeckIds)) return setSaveError(true);
    leave();
  };

  const discardAndExit = () => leave(() => clearSaved(s.deckId));

  const flip = () => dispatch({ type: "flip" });
  const rate = (verdict: Verdict) => dispatch({ type: "rate", verdict, now: Date.now() });

  useEffect(() => {
    if (confirming || done) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      const action = studyKeyAction(
        { key: e.key, repeat: e.repeat, modified: e.ctrlKey || e.metaKey || e.altKey, onControl: !!t?.closest("button, a[href]") },
        s.side,
      );
      if (!action) return;
      e.preventDefault();
      if (action === "flip") flip();
      else if (action === "exit") requestExit();
      else rate(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper text-sumi" role="dialog" aria-modal="true" aria-label={`Học bộ thẻ ${deckName}`}>
      <div className="bg-genko-grid pointer-events-none absolute inset-0 opacity-[0.3]" />

      <header className="relative z-10 border-b border-rule/70 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={done ? () => leave() : requestExit}
            aria-label="Thoát phiên học"
            aria-keyshortcuts="Escape"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-rule/80 bg-surface text-sumi-2 transition-colors hover:text-sumi"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-[13px] font-semibold text-sumi-2">
                {deckName}{s.round > 1 && <span className="font-normal text-sumi-3"> · ôn lại lần {s.round - 1}</span>}
              </p>
              <p className="shrink-0 text-[13px] font-semibold text-sumi tnum" aria-live="polite">
                {done ? "Hoàn thành" : `Thẻ ${s.index + 1} / ${s.cards.length}`}
              </p>
            </div>
            <Progress value={s.index} max={s.cards.length} tone="genko" className="mt-1.5" />
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-6 px-4 py-6">
          {done ? (
            <StudySummary session={s} onRetry={() => dispatch({ type: "retryMissed", now: Date.now() })} onBack={() => leave()} />
          ) : card ? (
            <>
              {/* key theo vòng + vị trí: thẻ mới là phần tử mới, luôn ở mặt trước và không "lật ngược" để lộ mặt sau thẻ kế. */}
              <FlipCard key={`${s.round}-${s.index}`} card={card} side={s.side} onFlip={flip} />

              <div className="flex flex-col items-center gap-2">
                {s.side === "front" ? (
                  <Button variant="solid" size="lg" className="w-full sm:w-auto" disabled={s.locked} onClick={flip} aria-keyshortcuts="Space Enter">
                    Lật thẻ <Kbd>Space</Kbd>
                  </Button>
                ) : (
                  <div className="grid w-full grid-cols-2 gap-3">
                    <RateButton verdict="again" disabled={s.locked} onClick={() => rate("again")} />
                    <RateButton verdict="known" disabled={s.locked} onClick={() => rate("known")} />
                  </div>
                )}
                <p className="text-center text-[12px] text-sumi-3">
                  {s.side === "front"
                    ? "Nhớ đáp án trong đầu trước, rồi mới lật để kiểm tra."
                    : "Tự đánh giá thật lòng — thẻ “Chưa nhớ” sẽ được ôn lại ở cuối phiên."}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </main>

      {confirming && (
        <ExitDialog
          progress={`${s.index} / ${s.cards.length}`}
          saveError={saveError}
          onSave={saveAndExit}
          onDiscard={discardAndExit}
          onCancel={() => { setConfirming(false); setSaveError(false); }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ thẻ lật 3D

function FlipCard({ card, side, onFlip }: { card: Flashcard; side: "front" | "back"; onFlip: () => void }) {
  const back = side === "back";
  // Mỗi thẻ mới nhận focus: focus không được ở lại nút "Học ngay" phía sau lớp phủ (Space sẽ bấm nút đó thay vì lật thẻ),
  // và người dùng bàn phím/trình đọc màn hình bắt đầu ngay ở thẻ.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  const face = "col-start-1 row-start-1 flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-rule/80 bg-surface px-6 py-10 text-center shadow-md backface-hidden";
  return (
    <div className="study-card-in perspective-[1400px]">
      <div
        ref={ref}
        role="button"
        tabIndex={back ? -1 : 0}
        aria-disabled={back}
        aria-label={back ? undefined : "Chạm để lật thẻ"}
        onClick={back ? undefined : onFlip}
        onKeyDown={(e) => { if (!back && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); onFlip(); } }}
        className={clsx(
          "grid transition-transform duration-500 ease-out transform-3d motion-reduce:transition-none",
          back ? "rotate-y-180" : "cursor-pointer",
          "rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-shu/25",
        )}
      >
        <div className={face} aria-hidden={back}>
          <span className="label-xs">Mặt trước</span>
          <p className="font-mincho text-4xl leading-tight break-words sm:text-5xl" lang="ja">{card.front}</p>
          <span className="mt-2 text-[12px] text-sumi-3">Chạm vào thẻ để xem đáp án</span>
        </div>
        <div className={clsx(face, "rotate-y-180 border-genko/40")} aria-hidden={!back}>
          {/* Mặt sau chỉ có nội dung sau khi lật: không lộ qua trình đọc màn hình, tìm trong trang hay chọn chữ. */}
          {back && (
            <>
              <span className="label-xs">Đáp án</span>
              <p className="font-mincho text-2xl text-sumi-3" lang="ja">{card.front}</p>
              <p className="text-2xl font-semibold leading-snug break-words sm:text-3xl" aria-live="polite">{card.back}</p>
              {card.hint && <p className="text-sm text-sumi-3" lang="ja">{card.hint}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const RATE: Record<Verdict, { label: string; key: string; tone: string }> = {
  again: { label: "Chưa nhớ", key: "1", tone: "border-shu/50 text-shu hover:bg-shu-tint" },
  known: { label: "Đã nhớ", key: "2", tone: "border-genko/50 text-genko hover:bg-genko-tint" },
};

function RateButton({ verdict, disabled, onClick }: { verdict: Verdict; disabled: boolean; onClick: () => void }) {
  const r = RATE[verdict];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-keyshortcuts={r.key}
      className={clsx(
        "relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl border bg-surface px-4 py-3.5 text-[15px] font-semibold shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        r.tone,
      )}
    >
      {r.label}
      <Kbd>{r.key}</Kbd>
    </button>
  );
}

// ------------------------------------------------------------------ tổng kết

function StudySummary({ session, onRetry, onBack }: { session: StudySession; onRetry: () => void; onBack: () => void }) {
  const sum = summarize(session, Date.now());
  const missed = session.cards.filter((c) => session.results[c.id] === "again");
  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <div className="text-center">
        <p className="font-mincho text-2xl font-bold">{sum.again === 0 ? "Nhớ hết rồi 🎉" : "Xong phiên học"}</p>
        <p className="mt-1 text-sm text-sumi-3">{sum.total} thẻ trong {formatDuration(sum.durationMs)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-3xl border border-rule/80 bg-surface px-5 py-5 shadow-xs sm:grid-cols-4">
        <Stat label="Đã nhớ" value={sum.known} tone="genko" />
        <Stat label="Chưa nhớ" value={sum.again} tone="shu" />
        <Stat label="Chính xác" value={`${sum.accuracy}%`} />
        <Stat label="Thời gian" value={formatClock(sum.durationMs)} sub={formatDuration(sum.durationMs)} />
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="label-xs">Cần ôn lại</span>
          <ul className="flex flex-wrap gap-1.5">
            {missed.slice(0, 30).map((c) => (
              <li key={c.id} className="rounded-lg border border-shu/30 bg-shu-tint px-2.5 py-1 text-sm">
                <span lang="ja" className="font-mincho">{c.front}</span> <span className="text-sumi-3">· {c.back}</span>
              </li>
            ))}
            {missed.length > 30 && <li className="px-1 py-1 text-sm text-sumi-3">và {missed.length - 30} thẻ nữa</li>}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button variant="solid" size="lg" disabled={missed.length === 0} onClick={onRetry}>
          {missed.length > 0 ? `Ôn lại ${missed.length} thẻ chưa nhớ` : "Không còn thẻ chưa nhớ"}
        </Button>
        <Button size="lg" onClick={onBack}>Quay về thư viện</Button>
      </div>
      <p className="text-center text-[12px] text-sumi-3">
        Phiên học nhanh không đổi lịch ôn FSRS và không cộng XP — lịch ôn vẫn do trang Ôn tập tính.
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ hỏi lưu khi thoát giữa chừng

function ExitDialog({
  progress, saveError, onSave, onDiscard, onCancel,
}: { progress: string; saveError: boolean; onSave: () => void; onDiscard: () => void; onCancel: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      {/* Nền mờ chỉ để bấm chuột ra ngoài; bàn phím và trình đọc màn hình dùng nút "Học tiếp" trong hộp thoại (và Esc),
          nên nó không phải một nút thứ hai cùng tên trong cây trợ năng. */}
      <div className="absolute inset-0 cursor-pointer bg-black/55 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div role="alertdialog" aria-modal="true" aria-labelledby="study-exit-title" aria-describedby="study-exit-desc"
        className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-rule/80 bg-surface p-6 shadow-2xl">
        <div>
          <p id="study-exit-title" className="font-mincho text-xl font-bold">Lưu phiên học dở dang?</p>
          <p id="study-exit-desc" className="mt-1.5 text-sm text-sumi-3">
            Bạn đã học <b className="text-sumi tnum">{progress}</b> thẻ. Lưu lại để lần sau học tiếp từ thẻ kế tiếp trên trình duyệt này.
          </p>
        </div>
        {saveError && <p className="text-sm font-medium text-shu">Trình duyệt không cho lưu (bộ nhớ đầy hoặc bị chặn).</p>}
        <div className="flex flex-col gap-2">
          <Button ref={first} variant="solid" onClick={onSave}>Lưu và thoát</Button>
          <Button onClick={onDiscard}>Thoát, không lưu</Button>
          <Button variant="ghost" onClick={onCancel}>Học tiếp</Button>
        </div>
      </div>
    </div>
  );
}
