"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { KANA, VIEW_BOX, strokesOf, type KanaChar } from "@/lib/kana";
import { createPointerGate, pointerKind } from "@/lib/pointer-gate";
import {
  PASS_THRESHOLD, dirText, polyLen, posText, scoreStroke,
  type Pt, type StrokeErrorReason,
} from "@/lib/stroke-match";

/* =============================================================================
   Khung tập viết.
   SVG  giữ lưới giấy, nét mẫu, hoạt ảnh — vector, sắc ở mọi độ phân giải,
        và getPointAtLength() giải sẵn bài toán tham số hoá theo độ dài cung.
   Canvas nhận mực người dùng — hàng trăm điểm mỗi giây; làm bằng SVG thì mỗi
        điểm là một thao tác DOM và sẽ giật.
   Hai lớp chồng khít nhau và dùng chung hệ toạ độ 109 của KanjiVG.
   ========================================================================== */

export interface StrokeError { index: number; reason: Exclude<StrokeErrorReason, null> }

export interface AttemptResult {
  avgScore: number;
  strokeScores: number[];
  strokeErrors: StrokeError[];
  durationMs: number;
}

export interface StrokeFeedback {
  strokeIndex: number;
  ok: boolean;
  score: number;
  message: string;
}

export interface StrokeStageHandle {
  reset: () => void;
  replay: () => void;
  toggleCompare: () => void;
  peek: () => void;
}

interface Props {
  char: KanaChar;
  mode: "TRACE" | "TEST";
  onFeedback?: (f: StrokeFeedback) => void;
  onProgress?: (doneStrokes: number, total: number) => void;
  onComplete?: (r: AttemptResult) => void;
}

interface StrokeModel { d: string; dx: number; el: SVGPathElement; len: number; pts: Pt[] }

const EASE = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

function gridCell(dx: number, key: number) {
  return (
    <g key={key} transform={dx ? `translate(${dx},0)` : undefined}>
      <rect className="cellbg" x="1.5" y="1.5" width="106" height="106" rx="2" />
      <line className="cellcross" x1="54.5" y1="5" x2="54.5" y2="104" />
      <line className="cellcross" x1="5" y1="54.5" x2="104" y2="54.5" />
      <line className="celldiag" x1="7" y1="7" x2="102" y2="102" />
      <line className="celldiag" x1="102" y1="7" x2="7" y2="102" />
    </g>
  );
}

export const StrokeStage = forwardRef<StrokeStageHandle, Props>(function StrokeStage(
  { char, mode, onFeedback, onProgress, onComplete },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<SVGGElement>(null);
  const numRef = useRef<SVGGElement>(null);
  const animPathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const strokes = useRef<StrokeModel[]>([]);
  const si = useRef(0);
  const inked = useRef<Pt[][]>([]);
  const scores = useRef<number[]>([]);
  const errors = useRef<StrokeError[]>([]);
  const misses = useRef(0);
  const live = useRef<Pt[]>([]);
  const drawing = useRef(false);
  // Chỉ một con trỏ được viết cùng lúc: ngón thứ hai/lòng bàn tay không được phá nét đang dở.
  const gate = useRef(createPointerGate());
  const startedAt = useRef(0);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useRef({ ink: "#1a1f1c", accent: "#c33c2b" });

  const [compare, setCompare] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [finished, setFinished] = useState(false);

  const glyphs = strokesOf(char.c);
  const glyphN = glyphs.length;
  const total = glyphs.reduce((s, g) => s + g.paths.length, 0);
  const vbW = VIEW_BOX * glyphN;

  const readColors = useCallback(() => {
    const s = getComputedStyle(document.documentElement);
    colors.current = {
      ink: s.getPropertyValue("--sumi").trim() || "#1a1f1c",
      accent: s.getPropertyValue("--shu").trim() || "#c33c2b",
    };
  }, []);

  /* ---------------------------------------------------------------- canvas */
  const repaint = useCallback((extra?: Pt[]) => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.restore();

    const draw = (p: Pt[], color: string, alpha: number) => {
      if (p.length === 0) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 5.4;
      if (p.length === 1) {
        ctx.beginPath();
        ctx.arc(p[0].x, p[0].y, 2.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length - 1; i++) {
          ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2);
        }
        ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    for (const p of inked.current) draw(p, colors.current.ink, 1);
    if (live.current.length) draw(live.current, colors.current.accent, 0.9);
    if (extra) draw(extra, colors.current.accent, 0.85);
  }, []);

  const fitCanvas = useCallback(() => {
    const cv = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !wrap || !ctx) return;

    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    // Vẽ thẳng trong hệ toạ độ 109 của SVG, không phải pixel màn hình
    ctx.setTransform(cv.width / vbW, 0, 0, cv.height / VIEW_BOX, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    repaint();
  }, [repaint, vbW]);

  /* ------------------------------------------------------------ hoạt ảnh */
  const stopAnim = useCallback(() => {
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    for (const el of [animPathRef.current, dotRef.current, ringRef.current]) {
      if (el) el.style.display = "none";
    }
  }, []);

  const play = useCallback((index: number, then?: () => void) => {
    stopAnim();
    const s = strokes.current[index];
    const path = animPathRef.current, dot = dotRef.current, ring = ringRef.current;
    if (!s || !path || !dot || !ring) { then?.(); return; }

    path.setAttribute("d", s.d);
    path.setAttribute("transform", s.dx ? `translate(${s.dx},0)` : "");
    for (const el of [path, dot, ring]) el.style.display = "";
    path.style.strokeDasharray = `${s.len} ${s.len}`;
    path.style.strokeDashoffset = String(s.len);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      path.style.strokeDashoffset = "0";
      dot.style.display = ring.style.display = "none";
      timer.current = setTimeout(() => { stopAnim(); then?.(); }, 700);
      return;
    }

    const dur = Math.min(1500, Math.max(500, 360 + s.len * 5));
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = EASE(k);
      path.style.strokeDashoffset = String(s.len * (1 - e));
      const pt = s.el.getPointAtLength(s.len * e);
      for (const c of [dot, ring]) {
        c.setAttribute("cx", String(pt.x + s.dx));
        c.setAttribute("cy", String(pt.y));
      }
      if (k < 1) raf.current = requestAnimationFrame(step);
      else {
        raf.current = 0;
        timer.current = setTimeout(() => { stopAnim(); then?.(); }, 420);
      }
    };
    raf.current = requestAnimationFrame(step);
  }, [stopAnim]);

  const playFrom = useCallback((i: number) => {
    if (i >= strokes.current.length) return;
    play(i, () => playFrom(i + 1));
  }, [play]);

  /* -------------------------------------------------- vẽ lại lớp gợi ý */
  const paintGuides = useCallback(() => {
    strokes.current.forEach((s, i) => {
      s.el.classList.toggle("is-next", i === si.current);
      s.el.classList.toggle("is-done", i < si.current);
    });
    const g = numRef.current;
    if (!g) return;
    const cur = strokes.current[si.current];
    const hidden = mode === "TEST" && !peeking;
    if (!cur || hidden) { g.innerHTML = ""; return; }
    const p = cur.pts[0];
    g.innerHTML =
      `<circle cx="${p.x}" cy="${p.y}" r="5.8"/><text x="${p.x}" y="${p.y}">${si.current + 1}</text>`;
  }, [mode, peeking]);

  const reset = useCallback(() => {
    stopAnim();
    si.current = 0;
    inked.current = [];
    scores.current = [];
    errors.current = [];
    misses.current = 0;
    live.current = [];
    drawing.current = false;
    gate.current.reset();
    startedAt.current = performance.now();
    setCompare(false);
    setPeeking(false);
    setFinished(false);
    paintGuides();
    repaint();
    onProgress?.(0, total);
  }, [onProgress, paintGuides, repaint, stopAnim, total]);

  /* -------------------------------------- đo nét mẫu khi đổi ký tự */
  useLayoutEffect(() => {
    const g = guideRef.current;
    if (!g) return;
    const els = Array.from(g.querySelectorAll<SVGPathElement>("path"));
    let k = 0;
    const models: StrokeModel[] = [];
    glyphs.forEach((glyph, gi) => {
      const dx = gi * VIEW_BOX;
      for (const d of glyph.paths) {
        const el = els[k++];
        if (!el) continue;
        const len = el.getTotalLength();
        // getPointAtLength BỎ QUA transform của thẻ cha — phải cộng dx thủ công.
        const pts: Pt[] = [];
        for (let i = 0; i < 32; i++) {
          const p = el.getPointAtLength((len * i) / 31);
          pts.push({ x: p.x + dx, y: p.y });
        }
        models.push({ d, dx, el, len, pts });
      }
    });
    strokes.current = models;
    readColors();
    reset();
    fitCanvas();
    timer.current = setTimeout(() => playFrom(0), 260);
    return () => stopAnim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char.c, mode]);

  useEffect(() => {
    fitCanvas();
    const ro = new ResizeObserver(() => fitCanvas());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [fitCanvas]);

  useEffect(() => { paintGuides(); }, [paintGuides]);

  /* --------------------------------------------------------- chấm điểm */
  const judge = useCallback((p: Pt[]) => {
    const list = strokes.current;
    if (si.current >= list.length) { repaint(); return; }
    if (p.length < 3 || polyLen(p) < 4) { repaint(); return; }   // chạm nhầm

    const t = list[si.current];
    const res = scoreStroke(p, t.pts, t.len);
    const pass = res.score >= PASS_THRESHOLD[mode === "TRACE" ? "trace" : "test"];

    if (pass) {
      inked.current.push(p);
      scores.current.push(res.score);
      si.current += 1;
      misses.current = 0;
      paintGuides();
      repaint();
      onProgress?.(si.current, list.length);
      onFeedback?.({
        strokeIndex: si.current - 1, ok: true, score: res.score,
        message: si.current >= list.length
          ? `Xong ${list.length} nét.`
          : `${res.score >= 85 ? "Đẹp!" : "Được rồi."} Sang nét số ${si.current + 1}.`,
      });

      if (si.current >= list.length) {
        setFinished(true);
        setCompare(true);
        const avg = Math.round(scores.current.reduce((a, b) => a + b, 0) / scores.current.length);
        onComplete?.({
          avgScore: avg,
          strokeScores: [...scores.current],
          strokeErrors: [...errors.current],
          durationMs: Math.round(performance.now() - startedAt.current),
        });
      }
      return;
    }

    misses.current += 1;
    if (res.reason) errors.current.push({ index: si.current, reason: res.reason });

    // Nét vừa vẽ có khớp với một nét KHÁC của chữ này không? Viết sai thứ tự là
    // lỗi phổ biến nhất của người mới, và biết mình nhầm sang nét nào thì hữu
    // ích hơn hẳn một con điểm 0.
    let alt = -1;
    let best = Math.max(55, res.score + 15);
    list.forEach((o, j) => {
      if (j === si.current) return;
      const q = scoreStroke(p, o.pts, o.len);
      if (q.score > best) { best = q.score; alt = j; }
    });

    let message: string;
    if (alt >= 0) {
      message = `Nét đó là nét số ${alt + 1}. Thứ tự nét rất quan trọng — hãy viết nét số ${si.current + 1} trước, bắt đầu ở ${posText(t.pts[0], VIEW_BOX)} ô.`;
      if (!errors.current.some((e) => e.index === si.current && e.reason === "OFF_PATH")) {
        errors.current.push({ index: si.current, reason: "OFF_PATH" });
      }
    } else if (res.reversed) {
      message = `Đúng hình nhưng ngược chiều. Nét này viết ${dirText(t.pts[0], t.pts[t.pts.length - 1])}.`;
    } else if (res.ratio < 0.5) {
      message = "Nét quá ngắn — kéo hết chiều dài của nét mẫu.";
    } else if (res.ratio > 1.9) {
      message = "Nét quá dài, có vẻ bạn viết dính sang nét khác.";
    } else {
      message = "Sát rồi — bám đường tâm nét mẫu thêm chút nữa.";
    }

    onFeedback?.({ strokeIndex: si.current, ok: false, score: res.score, message });
    repaint(p);
    timer.current = setTimeout(() => { if (!drawing.current) repaint(); }, 560);

    if (misses.current >= 2) {
      misses.current = 0;
      const target = si.current;
      timer.current = setTimeout(() => play(target), 620);
    }
  }, [mode, onComplete, onFeedback, onProgress, paintGuides, play, repaint]);

  /* ------------------------------------------------------ sự kiện con trỏ */
  const toStage = useCallback((e: React.PointerEvent): Pt => {
    const r = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * vbW,
      y: ((e.clientY - r.top) / r.height) * VIEW_BOX,
    };
  }, [vbW]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (si.current >= strokes.current.length) return;
    const verdict = gate.current.down({ id: e.pointerId, kind: pointerKind(e.pointerType), button: e.button });
    if (verdict === "ignore") return;
    e.preventDefault();
    stopAnim();
    readColors();
    drawing.current = true;
    live.current = [toStage(e)];
    // Có thể ném lỗi nếu con trỏ đã rời trước khi handler chạy; nét vẫn viết được mà không cần bắt con trỏ.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* con trỏ không còn hoạt động */ }
    repaint();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !gate.current.move(e.pointerId)) return;
    e.preventDefault();
    const p = toStage(e);
    const last = live.current[live.current.length - 1];
    const dx = p.x - last.x, dy = p.y - last.y;
    if (dx * dx + dy * dy < 0.36) return;      // lọc rung tay
    live.current.push(p);
    repaint();
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!gate.current.up(e.pointerId)) return;
    drawing.current = false;
    const p = live.current;
    live.current = [];
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* con trỏ đã rời */ }
    judge(p);
  };

  /** Hệ điều hành giành lại cử chỉ (cuộn, vuốt từ mép, cuộc gọi đến…) hoặc mất quyền bắt con trỏ: người học
   *  KHÔNG chủ động nhấc tay, nên nét dở dang bị bỏ chứ không đem đi chấm. */
  const onAbort = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!gate.current.cancel(e.pointerId)) return;
    drawing.current = false;
    live.current = [];
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* đã nhả */ }
    repaint();
  };

  useImperativeHandle(ref, () => ({
    reset,
    replay: () => (finished ? playFrom(0) : play(si.current)),
    toggleCompare: () => setCompare((v) => !v),
    peek: () => {
      setPeeking(true);
      setTimeout(() => setPeeking(false), 2200);
    },
  }), [finished, play, playFrom, reset]);

  return (
    <div
      ref={wrapRef}
      data-mode={mode === "TEST" ? "test" : "trace"}
      data-peek={peeking}
      className="relative w-full touch-none select-none"
      style={{ aspectRatio: `${glyphN} / 1` }}
    >
      <svg viewBox={`0 0 ${vbW} ${VIEW_BOX}`} className="block h-full w-full" aria-hidden="true">
        <g>{glyphs.map((_, i) => gridCell(i * VIEW_BOX, i))}</g>

        <g ref={guideRef}>
          {glyphs.flatMap((glyph, gi) =>
            glyph.paths.map((d, i) => (
              <path
                key={`${gi}-${i}`}
                className="gstroke"
                d={d}
                transform={gi ? `translate(${gi * VIEW_BOX},0)` : undefined}
              />
            )),
          )}
        </g>

        {compare && (
          <g>
            {glyphs.flatMap((glyph, gi) =>
              glyph.paths.map((d, i) => (
                <path
                  key={`c-${gi}-${i}`}
                  className="cstroke"
                  d={d}
                  transform={gi ? `translate(${gi * VIEW_BOX},0)` : undefined}
                />
              )),
            )}
          </g>
        )}

        <g>
          <path ref={animPathRef} className="astroke" style={{ display: "none" }} />
          <circle ref={ringRef} className="brushring" r="7" style={{ display: "none" }} />
          <circle ref={dotRef} className="brushdot" r="3.4" style={{ display: "none" }} />
        </g>

        <g ref={numRef} className="snum" />
      </svg>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onAbort}
        onLostPointerCapture={onAbort}
      />
    </div>
  );
});

export { KANA };
