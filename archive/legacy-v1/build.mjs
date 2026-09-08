/* Gộp src/ thành một file HTML chạy độc lập (không cần server, mở là chạy).
   node build.mjs   →  dist/kana-dojo.html + dist/artifact-body.html          */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const safe = (js) => js.replace(/<\/(script)/gi, '<\\/$1');

// Thứ tự nạp = thứ tự phụ thuộc giữa các module (khớp với src/index.html)
const JS_MODULES = [
  'core', 'store', 'speech', 'geometry', 'kana-index', 'state', 'sheet', 'engine', 'main'
];

const html = read('./src/index.html');
const css  = read('./src/styles.css');
const data = read('./src/kana-data.js');
const app  = JS_MODULES.map((m) => read(`./src/js/${m}.js`)).join('\n');

const oldScripts = ['kana-data.js', ...JS_MODULES.map((m) => `js/${m}.js`)]
  .map((f) => `<script src="${f}"></script>`)
  .join('\n');

const bundle = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace(oldScripts, `<script>\n${safe(data)}\n${safe(app)}\n</script>`);

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('./dist/kana-dojo.html', import.meta.url), bundle);

/* Bản dùng cho Artifact: chỉ phần thân, không doctype/html/head/body */
const head = bundle.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = bundle.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .split('\n')
  .filter((l) => /<title|<style|fonts\.googleapis|fonts\.gstatic|^\}|^[^<]/.test(l.trim()) === true || l.includes('</style>'))
  .join('\n');
writeFileSync(new URL('./dist/artifact-body.html', import.meta.url), keep + '\n' + body);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log('dist/kana-dojo.html      ', kb(bundle));
console.log('dist/artifact-body.html  ', kb(keep + body));
