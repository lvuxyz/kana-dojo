// Sinh src/data/kanji-strokes.json từ KanjiVG cho đúng những chữ có trong src/data/kanji.ts.
// Chạy tay khi thêm chữ:  node scripts/build-kanji-strokes.mjs [thư-mục-đệm]
// Tải từng tệp SVG từ GitHub của KanjiVG (CC BY-SA 3.0) vào thư mục đệm (mặc định: thư mục tạm của hệ điều hành),
// chỉ đọc chuỗi path `d` theo số thứ tự nét — không chạy gì trong tệp tải về.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cache = process.argv[2] ?? join(tmpdir(), "kanjivg-cache");
await mkdir(cache, { recursive: true });

const source = await readFile(join(root, "src/data/kanji.ts"), "utf8");
const chars = [...source.matchAll(/\{ c: "(.)"/gu)].map((m) => m[1]);

const strokes = {};
for (const c of chars) {
  const hex = c.codePointAt(0).toString(16).padStart(5, "0");
  const file = join(cache, `${hex}.svg`);
  try {
    await access(file);
  } catch {
    const res = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`);
    if (!res.ok) throw new Error(`KanjiVG không có ${c} (${hex}): HTTP ${res.status}`);
    await writeFile(file, await res.text());
  }
  const svg = await readFile(file, "utf8");
  const paths = [...svg.matchAll(/<path id="kvg:[0-9a-f]+-s(\d+)"[^>]*\sd="([^"]+)"/g)]
    .map((m) => [Number(m[1]), m[2]])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);
  if (paths.length === 0) throw new Error(`Không đọc được nét của ${c}`);
  strokes[c] = paths;
}

const out = { license: "Stroke data derived from KanjiVG (c) Ulrich Apel, CC BY-SA 3.0 — http://kanjivg.tagaini.net", viewBox: 109, strokes };
await writeFile(join(root, "src/data/kanji-strokes.json"), JSON.stringify(out) + "\n");
console.log(`${chars.length} chữ → src/data/kanji-strokes.json`);
