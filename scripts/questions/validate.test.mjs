import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateQuestion, validateQuestionBank } from "./lib.mjs";

const batch = JSON.parse(await readFile("data/questions/tema-I/lote-001.json", "utf8"));

test("o lote editorial inteiro passa pelo gate", () => {
  for (const question of batch.questions) assert.deepEqual(validateQuestion(question), []);
});

test("rejeita questão com duas respostas corretas", () => {
  const question = structuredClone(batch.questions[0]);
  question.options[0].isCorrect = true;
  assert.match(validateQuestion(question).join(" "), /exatamente uma opção correta/);
});

test("rejeita questão ativa sem fonte oficial", () => {
  const question = structuredClone(batch.questions[0]);
  question.sources = [];
  assert.match(validateQuestion(question).join(" "), /fonte ausente/);
});

test("permite várias questões da mesma família quando os ângulos são distintos", () => {
  const first = structuredClone(batch.questions[0]);
  const second = structuredClone(batch.questions[0]);
  second.id = "AI-I-999998";
  second.family.angle = "aplicar a mesma vedação em transição de intermediário";
  assert.equal(validateQuestionBank([first, second]).size, 0);
});

test("rejeita ângulo repetido dentro da mesma família", () => {
  const first = structuredClone(batch.questions[0]);
  const second = structuredClone(batch.questions[0]);
  second.id = "AI-I-999998";
  assert.match(validateQuestionBank([first, second]).get(second.id)?.join(" ") ?? "", /ângulo duplicado/);
});

test("rejeita família reutilizada em outro nó taxonômico", () => {
  const first = structuredClone(batch.questions[0]);
  const second = structuredClone(batch.questions[0]);
  second.id = "AI-I-999998";
  second.family.angle = "novo ângulo";
  second.contentNodeSlug = "tema-i-outro-no";
  assert.match(validateQuestionBank([first, second]).get(second.id)?.join(" ") ?? "", /taxonomia/);
});
