// Sinh out/sw.js từ scripts/sw.template.js sau `next build`.
//   node scripts/build-sw.mjs [thư-mục-out]        (mặc định: out)
//
// Việc duy nhất của nó: liệt kê mọi tệp của bản build thành danh sách URL để service worker tải sẵn, và gắn một mã phiên bản
// băm từ NỘI DUNG các tệp đó — bản build mới thì sw.js đổi byte, trình duyệt nhận ra và cập nhật.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Tệp không đưa vào precache.
 *  - 404.html: Nginx chỉ phục vụ nó nội bộ (`internal`), tải trực tiếp trả 404 và làm hỏng cả lần cài đặt service worker.
 *  - robots/sitemap/.gitkeep/.map: vô ích khi offline. */
const EXCLUDED = [/^sw\.js$/, /^404\.html$/, /\.map$/, /^robots\.txt$/, /^sitemap\.xml$/, /(^|\/)\.gitkeep$/];

export const isPrecached = (file) => !EXCLUDED.some((re) => re.test(file));

/** Đường dẫn tệp trong out/ → URL mà trình duyệt sẽ yêu cầu.
 *  Next xuất `/luyen-viet` thành luyen-viet.html và `/` thành index.html.
 *  Phải mã hoá bằng encodeURI vì đó đúng là dạng Next ghi vào HTML: chunk của `quiz/[id]` được yêu cầu là
 *  `quiz/%5Bid%5D/…`. Khoá cache ghi `[id]` thì offline sẽ không bao giờ khớp. */
export function fileToUrl(file) {
  if (file === "index.html") return "/";
  if (file.endsWith(".html")) return encodeURI("/" + file.slice(0, -".html".length));
  return encodeURI("/" + file);
}

export function listFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, base));
    else out.push(full.slice(base.length + 1).split("\\").join("/"));
  }
  return out;
}

/** Danh sách URL (đã sắp xếp) và mã phiên bản 12 ký tự hex. `read(file)` trả về nội dung tệp. */
export function buildPrecache(files, read) {
  const entries = files.filter(isPrecached).map((file) => ({
    url: fileToUrl(file),
    hash: createHash("sha256").update(read(file)).digest("hex"),
  }));
  entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  const version = createHash("sha256").update(entries.map((e) => `${e.url}:${e.hash}`).join("\n")).digest("hex").slice(0, 12);
  return { urls: entries.map((e) => e.url), version };
}

export function renderSw(template, version, urls) {
  const list = "[\n" + urls.map((u) => `  ${JSON.stringify(u)},`).join("\n") + "\n]";
  return template.replace("__VERSION__", version).replace("__PRECACHE__", list);
}

function main() {
  const root = process.argv[2] ?? "out";
  const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "sw.template.js"), "utf8");
  const { urls, version } = buildPrecache(listFiles(root), (file) => readFileSync(join(root, file)));
  writeFileSync(join(root, "sw.js"), renderSw(template, version, urls));
  console.log(`sw.js: precache ${urls.length} tệp, phiên bản ${version}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
