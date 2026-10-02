// Sinh fixture "đầu vào -> đầu ra" từ ĐÚNG mã TypeScript của web (fsrs.ts, stroke-match.ts).
// Dart đọc chính tệp này để chứng minh bản port cho cùng kết quả.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Đường dẫn tính từ vị trí tệp này (docs/spikes/flutter-engine-parity/) tới web/src — chạy được ở mọi máy.
// Cần Node >= 22.18 (chạy thẳng .ts); bản cũ hơn thêm --experimental-strip-types.
const WEB = new URL("../../../web/src/", import.meta.url);
const fsrs = await import(new URL("lib/fsrs.ts", WEB).href);
const sm = await import(new URL("lib/stroke-match.ts", WEB).href);
const kana = JSON.parse(fs.readFileSync(new URL("data/kana-data.json", WEB), "utf8"));
const here = path.dirname(fileURLToPath(import.meta.url));

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261002);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const DAY = 86_400_000, MIN = 60_000;

// ---------------------------------------------------------------- FSRS
const cards = [];
let totalSteps = 0;
for (let c = 0; c < 500; c++) {
  let cur = fsrs.newCardState();
  let now = Date.parse("2026-01-01T00:00:00Z") + Math.floor(rnd() * 90) * DAY + Math.floor(rnd() * DAY);
  let dueAt = now;
  const steps = [];
  const retention = rnd() < 0.8 ? 0.9 : [0.7, 0.8, 0.85, 0.95, 0.97][Math.floor(rnd() * 5)];
  const n = 40 + Math.floor(rnd() * 40);
  for (let k = 0; k < n; k++) {
    // thời điểm ôn: quanh hạn (sớm / đúng / trễ), thỉnh thoảng ôn lại ngay trong ngày
    const r = rnd();
    let wait = r < 0.1 ? Math.floor(rnd() * 20 * MIN) : Math.max(dueAt - now, 0) + Math.floor((rnd() * 2 - 0.3) * Math.max(dueAt - now, MIN) * 1.5);
    if (wait < 0) wait = 0;
    now += wait;
    const lastReviewedAt = steps.length ? steps[steps.length - 1].now : null;
    const elapsedDays = lastReviewedAt === null ? 0 : Math.max((now - lastReviewedAt) / DAY, 0);
    const g = rnd();
    const grade = g < 0.12 ? 1 : g < 0.3 ? 2 : g < 0.75 ? 3 : 4;
    const out = fsrs.review(cur, grade, elapsedDays, now, retention);
    steps.push({ cur, grade, elapsedDays, now, retention, out });
    cur = out.next; dueAt = out.dueAt; totalSteps++;
  }
  cards.push(steps);
}

// ---------------------------------------------------------------- stroke-match
function exactPolyline(d, perSeg = 60) {
  const toks = d.match(/[Mc]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0, cx = 0, cy = 0, cmd = "";
  const pts = [];
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (toks[i] === "M" || toks[i] === "c") cmd = toks[i++];
    if (cmd === "M") { cx = num(); cy = num(); cmd = "L"; pts.push({ x: cx, y: cy }); continue; }
    const p0 = [cx, cy], p1 = [cx + num(), cy + num()], p2 = [cx + num(), cy + num()], p3 = [cx + num(), cy + num()];
    for (let k = 1; k <= perSeg; k++) {
      const t = k / perSeg, u = 1 - t;
      pts.push({
        x: u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
        y: u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
      });
    }
    cx = p3[0]; cy = p3[1];
  }
  return pts;
}
const allPaths = Object.values(kana.glyphs).flat();
const strokes = [];
for (let n = 0; n < 1500; n++) {
  const d = allPaths[Math.floor(rnd() * allPaths.length)];
  const poly = exactPolyline(d);
  const target = sm.resample(poly, 32);
  const targetLen = sm.polyLen(poly);
  const kind = rnd();
  let user;
  if (kind < 0.7) {
    // nét "gần đúng": lấy lại số điểm tuỳ ý, nhiễu Gauss, co giãn, dịch, đôi khi ngược chiều
    const cnt = 4 + Math.floor(rnd() * 160);
    let base = sm.resample(poly, cnt);
    if (rnd() < 0.12) base = base.slice().reverse();
    const sigma = rnd() * 7, sc = 0.4 + rnd() * 1.8, ox = (rnd() - 0.5) * 12, oy = (rnd() - 0.5) * 12;
    const cxm = base.reduce((a, p) => a + p.x, 0) / base.length, cym = base.reduce((a, p) => a + p.y, 0) / base.length;
    user = base.map((p) => ({ x: cxm + (p.x - cxm) * sc + ox + gauss() * sigma, y: cym + (p.y - cym) * sc + oy + gauss() * sigma }));
  } else if (kind < 0.9) {
    // nét của một glyph khác (chắc chắn sai)
    const other = exactPolyline(allPaths[Math.floor(rnd() * allPaths.length)]);
    user = sm.resample(other, 3 + Math.floor(rnd() * 100));
  } else {
    // rác / suy biến: ít điểm, trùng điểm, nét cực ngắn
    const cnt = 1 + Math.floor(rnd() * 5);
    const x0 = rnd() * 109, y0 = rnd() * 109;
    user = Array.from({ length: cnt }, () => ({ x: x0 + (rnd() < 0.5 ? 0 : rnd() * 2), y: y0 + (rnd() < 0.5 ? 0 : rnd() * 2) }));
  }
  const res = sm.scoreStroke(user, target, targetLen);
  strokes.push({ user, target, targetLen, out: res, resampled: sm.resample(user, 24) });
}

// ---------------------------------------------------------------- bộ phân tích đường nét SVG (chỉ M và c)
// Mỗi nét: chuỗi `d` -> điểm lấy mẫu 32 điểm theo độ dài cung (cách StrokeStage tạo `pts`) + độ dài cung.
const pathChecks = [];
for (const d of allPaths) {
  const poly = exactPolyline(d, 200);
  pathChecks.push({ d, len: sm.polyLen(poly), pts32: sm.resample(poly, 32) });
}

fs.writeFileSync(path.join(here, "fixtures.json"), JSON.stringify({ cards, strokes, pathChecks, W: Array.from(fsrs.W) }));
console.log(JSON.stringify({ cards: cards.length, fsrsSteps: totalSteps, strokes: strokes.length, paths: pathChecks.length }));
const reasons = strokes.reduce((a, s) => { a[s.out.reason ?? "null"] = (a[s.out.reason ?? "null"] || 0) + 1; return a; }, {});
console.log("reasons", JSON.stringify(reasons));
const stCount = cards.flat().reduce((a, s) => { a[s.out.next.state] = (a[s.out.next.state] || 0) + 1; return a; }, {});
console.log("fsrs next states", JSON.stringify(stCount));
