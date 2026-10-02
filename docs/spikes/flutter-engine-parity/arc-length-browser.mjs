// Đo độ lệch của getTotalLength()/getPointAtLength() của trình duyệt (Blink/Skia) so với tích phân Bézier chính xác
// trên cả 433 nét của kana-data.json. Mục đích: đặt dung sai cho fixture dùng chung web <-> Flutter (PathMetric).
//   node docs/spikes/flutter-engine-parity/arc-length-browser.mjs        (cần Microsoft Edge hoặc Chrome, chạy ẩn)
//   EDGE_PATH="/đường/dẫn/chrome" node ...                               (đổi trình duyệt)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(fs.readFileSync(new URL("../../../web/src/data/kana-data.json", import.meta.url), "utf8"));
const EDGE = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- tham chiếu chính xác: M + c tương đối -> các đoạn Bézier bậc 3, chia nhỏ rất mịn
function parse(d) {
  const toks = d.match(/[Mc]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let i = 0, cx = 0, cy = 0, cmd = "";
  const segs = [];
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (toks[i] === "M" || toks[i] === "c") { cmd = toks[i++]; }
    if (cmd === "M") { cx = num(); cy = num(); cmd = "L"; continue; }
    if (cmd === "c") {
      const p0 = [cx, cy];
      const p1 = [cx + num(), cy + num()];
      const p2 = [cx + num(), cy + num()];
      const p3 = [cx + num(), cy + num()];
      segs.push([p0, p1, p2, p3]);
      cx = p3[0]; cy = p3[1];
    }
  }
  return segs;
}
const bez = ([p0, p1, p2, p3], t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u*u*u*p0[k] + 3*u*u*t*p1[k] + 3*u*t*t*p2[k] + t*t*t*p3[k]);
};
function dense(d, perSeg = 4000) {
  const pts = [];
  for (const s of parse(d)) for (let k = 0; k <= perSeg; k++) pts.push(bez(s, k / perSeg));
  const acc = [0];
  for (let k = 1; k < pts.length; k++) acc.push(acc[k-1] + Math.hypot(pts[k][0]-pts[k-1][0], pts[k][1]-pts[k-1][1]));
  return { pts, acc, len: acc[acc.length - 1] };
}
function at(D, s) {
  let lo = 0, hi = D.acc.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (D.acc[m] < s) lo = m + 1; else hi = m; }
  const j = Math.max(1, lo);
  const span = D.acc[j] - D.acc[j-1];
  const t = span > 0 ? (s - D.acc[j-1]) / span : 0;
  return [D.pts[j-1][0] + (D.pts[j][0]-D.pts[j-1][0])*t, D.pts[j-1][1] + (D.pts[j][1]-D.pts[j-1][1])*t];
}

const all = [];
for (const [g, ps] of Object.entries(DATA.glyphs)) ps.forEach((d, i) => all.push({ g, i, d }));

const proc = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(here, "edge-profile-arc")}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], { stdio: "ignore" });
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });

try {
  let targets;
  for (let k = 0; k < 40; k++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some(t => t.type === "page")) break; } catch {} await sleep(500); }
  ws = new WebSocket(targets.find(t => t.type === "page").webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); } };
  await send("Runtime.enable");
  const expr = `(() => {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg"); document.body.appendChild(svg);
    const out = [];
    for (const d of ${JSON.stringify(all.map(a => a.d))}) {
      const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.appendChild(p);
      const len = p.getTotalLength(); const pts = [];
      for (let i = 0; i < 32; i++) { const q = p.getPointAtLength(len * i / 31); pts.push([q.x, q.y]); }
      out.push({ len, pts });
    }
    return out;
  })()`;
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  const browser = r.result.value;

  let maxLenErr = 0, sumLenErr = 0, maxPt = 0, sumPt = 0, nPt = 0, worst = null;
  all.forEach((a, k) => {
    const D = dense(a.d);
    const b = browser[k];
    const le = Math.abs(b.len - D.len) / D.len;
    sumLenErr += le; if (le > maxLenErr) { maxLenErr = le; worst = { g: a.g, i: a.i, browser: b.len, exact: D.len }; }
    for (let i = 0; i < 32; i++) {
      // điểm thứ i theo CHÍNH độ dài mà trình duyệt tin: so với điểm chính xác tại cùng tỉ lệ i/31 của độ dài chính xác
      const e = at(D, D.len * i / 31);
      const d = Math.hypot(e[0] - b.pts[i][0], e[1] - b.pts[i][1]);
      sumPt += d; nPt++; if (d > maxPt) maxPt = d;
    }
  });
  console.log(JSON.stringify({
    strokes: all.length,
    lengthRelErr: { mean: sumLenErr / all.length, max: maxLenErr, worst },
    samplePointErrUnits109: { mean: sumPt / nPt, max: maxPt },
    unitPctOfCell: "1 unit ≈ 0.92% cạnh ô",
  }, null, 2));
} catch (e) { console.log("ERR", e.message); }
finally { try { ws && ws.close(); } catch {} proc.kill(); spawn("taskkill", ["/F", "/T", "/PID", String(proc.pid)], { stdio: "ignore" }); }
