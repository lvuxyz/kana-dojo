// Tính tỉ lệ tương phản WCAG 2.x của token màu thật trong web/src/app/globals.css (đọc trực tiếp, không chép tay).
//   node docs/spikes/color-contrast/contrast.mjs
// Ngưỡng AA: 4,5 cho chữ thường; 3,0 cho chữ lớn (>= 24 px, hoặc >= 18,66 px đậm) và thành phần giao diện.
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../../web/src/app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`Không thấy ${selector}`);
  const open = css.indexOf("{", i), close = css.indexOf("}", open);
  const vars = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]] = m[2];
  return vars;
}
const themes = { sáng: block(":root {"), tối: block(':root[data-theme="dark"]') };

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const verdict = (r) => (r >= 4.5 ? "đạt AA" : r >= 3 ? "chỉ đủ chữ lớn/thành phần" : "KHÔNG đạt");

// [chữ, nền, ghi chú về chỗ dùng trong web]
const pairs = [
  ["sumi", "paper", "chữ chính"], ["sumi-2", "paper", "chữ phụ"], ["sumi-3", "paper", "chữ mờ (nhãn, gợi ý)"], ["sumi-3", "surface", "chữ mờ trên thẻ"],
  ["genko", "paper", "chữ xanh"], ["genko-2", "paper", "chữ xanh nhạt"], ["genko", "genko-tint", "chữ xanh trên nền nhạt"],
  ["shu", "paper", "chữ đỏ"], ["shu-2", "paper", "chữ đỏ đậm"], ["shu", "shu-tint", "thông báo lỗi"], ["shu-2", "shu-tint", "thông báo lỗi (đậm)"],
  ["gold", "paper", "chữ vàng (nhãn Khó, chip XP, huy hiệu)"], ["gold", "surface", "chữ vàng trên thẻ"], ["gold", "gold-tint", "chip vàng"],
];
const fills = [["shu", "nút chính / con dấu 済"], ["shu-2", "đầu kia của nút chính (gradient)"], ["genko", "số nét đã xong"], ["gold", "nút vàng"]];

for (const [name, t] of Object.entries(themes)) {
  console.log(`\n== Giao diện ${name} ==`);
  for (const [f, b, note] of pairs) {
    if (!t[f] || !t[b]) continue;
    const r = ratio(t[f], t[b]);
    console.log(`${f.padEnd(8)} ${t[f]} trên ${b.padEnd(10)} ${t[b]}  ${r.toFixed(2).padStart(5)}  ${verdict(r).padEnd(26)} ${note}`);
  }
  for (const [f, note] of fills) {
    if (!t[f]) continue;
    const white = ratio("#ffffff", t[f]), ink = ratio(t.paper, t[f]), sumi = ratio(t.sumi, t[f]);
    console.log(`nền ${f.padEnd(8)} ${t[f]}  chữ trắng ${white.toFixed(2).padStart(5)} (${verdict(white)}) | chữ giấy ${t.paper} ${ink.toFixed(2).padStart(5)} (${verdict(ink)}) | chữ sumi ${t.sumi} ${sumi.toFixed(2).padStart(5)} (${verdict(sumi)})  ${note}`);
  }
}

// Ứng viên thay thế (đề xuất trong docs/MOBILE_FLUTTER.md, mục 7.4)
console.log("\n== Ứng viên thay thế ==");
const cand = [
  ["chữ vàng sáng", ["#946610", "#8f6410"], themes.sáng.paper], ["chữ vàng sáng trên gold-tint", ["#946610", "#8f6410"], themes.sáng["gold-tint"]],
  ["sumi-3 sáng trên paper", ["#65716a"], themes.sáng.paper], ["sumi-3 sáng trên paper-sunk", ["#5d6a62"], themes.sáng["paper-sunk"]],
];
for (const [n, list, bg] of cand) for (const c of list) console.log(`${n.padEnd(34)} ${c} trên ${bg}  ${ratio(c, bg).toFixed(2)}`);
for (const c of ["#d93a27"]) console.log(`nền nút chính tối ${c}: chữ trắng ${ratio("#ffffff", c).toFixed(2)}`);
for (const c of ["#2d8254"]) console.log(`nền số nét tối ${c}: chữ trắng ${ratio("#ffffff", c).toFixed(2)}`);
