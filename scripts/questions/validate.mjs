import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { validateQuestionBank } from "./lib.mjs";

const root = path.resolve("data/questions");
const files = (await readdir(root, { recursive: true })).filter((file) => file.endsWith(".json"));
const questions = [];
const locations = new Map();

for (const file of files) {
  const batch = JSON.parse(await readFile(path.join(root, file), "utf8"));
  for (const question of batch.questions ?? []) {
    questions.push(question);
    locations.set(question.id, file);
  }
}

const errorsByQuestion = validateQuestionBank(questions);
for (const [questionId, errors] of errorsByQuestion) {
  console.error(`${locations.get(questionId) ?? "arquivo desconhecido"} :: ${questionId}: ${errors.join("; ")}`);
}

const rejected = errorsByQuestion.size;
console.log(JSON.stringify({ files: files.length, total: questions.length, accepted: questions.length - rejected, rejected }, null, 2));
if (rejected > 0) process.exitCode = 1;
