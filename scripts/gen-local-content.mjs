// Sinh web/src/data/content.json cho chế độ độc lập từ migration V2/V3 của backend.
// Chạy lại mỗi khi đổi dữ liệu trong migration:  node scripts/gen-local-content.mjs
// (tuỳ chọn: <thư-mục-gốc-repo> <file-đầu-ra>). Kiểm tra số lượng theo docs/SPEC.md §2.6 và dừng nếu lệch.
import { readFileSync, writeFileSync } from "node:fs";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = process.argv[3] ?? resolve(root, "web/src/data/content.json");
const read = (f) => readFileSync(`${root}/backend/src/main/resources/db/migration/${f}`, "utf8")
  // bỏ dòng chú thích nguyên dòng; chú thích cuối dòng không xuất hiện trong dữ liệu
  .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

/** Đọc một danh sách tuple SQL `(a, 'b', NULL, 5), (...)` bắt đầu từ vị trí `i`, nhận biết chuỗi có `''`. */
function readTuples(s, i) {
  const tuples = [];
  for (;;) {
    while (/\s/.test(s[i])) i++;
    if (s[i] !== "(") throw new Error(`Cần "(" tại ${i}: ${JSON.stringify(s.slice(i, i + 40))}`);
    i++;
    const row = [];
    for (;;) {
      while (/\s/.test(s[i])) i++;
      if (s[i] === "'") {
        let v = "";
        i++;
        for (;;) {
          if (s[i] === "'" && s[i + 1] === "'") { v += "'"; i += 2; }
          else if (s[i] === "'") { i++; break; }
          else v += s[i++];
        }
        row.push(v);
      } else {
        let j = i;
        while (s[j] !== "," && s[j] !== ")") j++;
        const raw = s.slice(i, j).trim();
        row.push(raw === "NULL" ? null : raw === "true" ? true : raw === "false" ? false : Number(raw));
        i = j;
      }
      while (/\s/.test(s[i])) i++;
      if (s[i] === ",") { i++; continue; }
      if (s[i] === ")") { i++; break; }
      throw new Error(`Ký tự lạ tại ${i}: ${JSON.stringify(s.slice(i, i + 40))}`);
    }
    tuples.push(row);
    let k = i;
    while (/\s/.test(s[k])) k++;
    if (s[k] === ",") { i = k + 1; continue; }
    return { tuples, end: i };
  }
}

const v2 = read("V2__seed_reference.sql");
const v3 = read("V3__seed_content.sql");

// --- gói cước
const planFeatures = {};
{
  const at = v2.indexOf("INSERT INTO plan_features");
  const { tuples } = readTuples(v2, v2.indexOf("VALUES", at) + 6);
  for (const [plan, key, limit] of tuples) (planFeatures[plan] ??= {})[key] = limit;
}

// --- huy hiệu
const badges = [];
{
  const at = v2.indexOf("INSERT INTO badges");
  const { tuples } = readTuples(v2, v2.indexOf("VALUES", at) + 6);
  for (const [code, nameVi, descriptionVi, icon, tier, , sortOrder] of tuples) {
    badges.push({ code, nameVi, descriptionVi, icon, tier, sortOrder });
  }
}

// --- từ vựng (id theo thứ tự chèn: N5 rồi N4, giống BIGSERIAL)
const vocabulary = [];
for (let at = v3.indexOf("INSERT INTO vocabulary"); at !== -1; at = v3.indexOf("INSERT INTO vocabulary", at + 1)) {
  const { tuples } = readTuples(v3, v3.indexOf("VALUES", at) + 6);
  for (const [word, reading, romaji, meaningVi, meaningEn, jlptLevel, partOfSpeech, exampleJa, exampleVi] of tuples) {
    vocabulary.push({ id: vocabulary.length + 1, word, reading, romaji, meaningVi, meaningEn, jlptLevel,
      partOfSpeech, exampleJa, exampleVi, audioUrl: null });
  }
}

// --- quiz + câu hỏi (id câu hỏi tăng dần qua các quiz, giống BIGSERIAL)
const quizzes = [];
let questionId = 0;
for (let at = v3.indexOf("INSERT INTO quizzes"); at !== -1; at = v3.indexOf("INSERT INTO quizzes", at + 1)) {
  const head = readTuples(v3, v3.indexOf("VALUES", at) + 6);
  const [title, description, quizType, jlptLevel, timeLimitSec] = head.tuples[0];
  const qs = v3.indexOf("FROM quiz, (VALUES", head.end) + "FROM quiz, (VALUES".length;
  const body = readTuples(v3, qs);
  const isText = v3.slice(head.end, qs).includes("'TEXT_INPUT'");
  const questions = body.tuples.map((t) => {
    // trắc nghiệm: (prompt, options, answer, explanation, pos); tự luận: (prompt, answer, explanation, pos)
    const [prompt, options, correctAnswer, explanationVi, position] = isText
      ? [t[0], "[]", t[1], t[2], t[3]] : t;
    return { id: ++questionId, prompt, questionType: isText ? "TEXT_INPUT" : "MULTIPLE_CHOICE",
      options: JSON.parse(options), correctAnswer, explanationVi, position };
  });
  quizzes.push({ id: quizzes.length + 1, title, description, quizType, jlptLevel, timeLimitSec, questions });
}

// --- kiểm tra số lượng theo SPEC §2.6
const n5 = vocabulary.filter((v) => v.jlptLevel === 5).length;
const n4 = vocabulary.filter((v) => v.jlptLevel === 4).length;
console.error(`plan_features=${Object.values(planFeatures).reduce((a, p) => a + Object.keys(p).length, 0)} badges=${badges.length}`
  + ` vocab=${vocabulary.length} (N5=${n5}, N4=${n4}) quizzes=${quizzes.length} questions=${questionId}`);
if (n5 !== 70 || n4 !== 10 || badges.length !== 9 || quizzes.length !== 4 || questionId !== 38) {
  throw new Error("Số lượng không khớp SPEC: 70 N5 + 10 N4, 9 huy hiệu, 4 quiz, 38 câu");
}
for (const q of quizzes) {
  for (const x of q.questions) {
    if (x.questionType === "MULTIPLE_CHOICE" && !x.options.some((o) => o.trim().toLowerCase() === x.correctAnswer.trim().toLowerCase())) {
      throw new Error(`Đáp án không nằm trong options: quiz ${q.id} câu ${x.id}`);
    }
  }
}

const line = (v) => JSON.stringify(v);
const arr = (a) => `[\n${a.map((x) => `    ${line(x)}`).join(",\n")}\n  ]`;
const out = `{
  "planFeatures": ${line(planFeatures)},
  "badges": ${arr(badges)},
  "vocabulary": ${arr(vocabulary)},
  "quizzes": [
${quizzes.map((q) => `    {"id":${q.id},"title":${line(q.title)},"description":${line(q.description)},"quizType":${line(q.quizType)},`
  + `"jlptLevel":${line(q.jlptLevel)},"timeLimitSec":${line(q.timeLimitSec)},"questions":[\n${q.questions.map((x) => `      ${line(x)}`).join(",\n")}\n    ]}`).join(",\n")}
  ]
}
`;
writeFileSync(outFile, out);
console.error(`wrote ${outFile} (${out.length} bytes)`);
