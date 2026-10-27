import assert from "node:assert/strict";
import test from "node:test";

import {
  deterministicShuffle,
  selectExamQuestions,
} from "../../src/features/exams/question-selection.ts";

function question(id, topicCode, familyId, difficulty, subtopicId = familyId, editorialPenalty = 0) {
  return { id, topicCode, familyId, difficulty, subtopicId, editorialPenalty };
}

test("a seleção é determinística para a mesma semente", () => {
  const candidates = [
    question("a1", "I", "fa1", 2),
    question("a2", "I", "fa2", 3),
    question("a3", "I", "fa3", 4),
  ];
  const input = {
    candidates,
    topicQuotas: new Map([["I", 2]]),
    seed: "fixed-seed",
    recentQuestionIds: new Set(),
    mode: "REAL",
  };
  assert.deepEqual(selectExamQuestions(input), selectExamQuestions(input));
  assert.deepEqual(deterministicShuffle(candidates, "fixed-seed"), deterministicShuffle(candidates, "fixed-seed"));
});

test("mantém cotas por tema independentemente da ordem das cotas", () => {
  const candidates = [
    question("i1", "I", "fi1", 2),
    question("i2", "I", "fi2", 3),
    question("i3", "I", "fi3", 4),
    question("v1", "V", "fv1", 2),
    question("v2", "V", "fv2", 3),
    question("v3", "V", "fv3", 4),
  ];
  const common = { candidates, seed: "order-proof", recentQuestionIds: new Set(), mode: "REAL" };
  const forward = selectExamQuestions({ ...common, topicQuotas: new Map([["I", 2], ["V", 1]]) });
  const reversed = selectExamQuestions({ ...common, topicQuotas: new Map([["V", 1], ["I", 2]]) });

  assert.deepEqual(forward.questions.map((item) => item.id), reversed.questions.map((item) => item.id));
  assert.equal(forward.questions.filter((item) => item.topicCode === "I").length, 2);
  assert.equal(forward.questions.filter((item) => item.topicCode === "V").length, 1);
});

test("nunca seleciona duas questões da mesma família", () => {
  const result = selectExamQuestions({
    candidates: [
      question("a1", "I", "family-a", 2),
      question("a2", "I", "family-a", 4),
      question("b1", "I", "family-b", 3),
    ],
    topicQuotas: new Map([["I", 2]]),
    seed: "families",
    recentQuestionIds: new Set(),
    mode: "BLINDAGEM",
  });

  assert.equal(result.questions.length, 2);
  assert.equal(new Set(result.questions.map((item) => item.familyId)).size, 2);
});

test("informa escassez quando o tema não possui famílias únicas suficientes", () => {
  const result = selectExamQuestions({
    candidates: [
      question("a1", "I", "family-a", 2),
      question("a2", "I", "family-a", 4),
    ],
    topicQuotas: new Map([["I", 2]]),
    seed: "shortage",
    recentQuestionIds: new Set(),
    mode: "REAL",
  });

  assert.equal(result.shortageTopic, "I");
  assert.deepEqual(result.questions, []);
});

test("prefere a questão editorialmente equilibrada quando os demais critérios empatam", () => {
  const result = selectExamQuestions({
    candidates: [
      question("com-pista", "I", "family-a", 3, "subtopic-a", 8),
      question("equilibrada", "I", "family-b", 3, "subtopic-b", 0),
    ],
    topicQuotas: new Map([["I", 1]]),
    seed: "editorial-balance",
    recentQuestionIds: new Set(),
    mode: "REAL",
  });

  assert.equal(result.questions[0].id, "equilibrada");
});

test("não sacrifica equilíbrio editorial para perseguir uma dificuldade declarada", () => {
  const result = selectExamQuestions({
    candidates: [
      question("dificil-com-pista", "I", "family-a", 3, "subtopic-a", 8),
      question("moderada-equilibrada", "I", "family-b", 2, "subtopic-b", 0),
    ],
    topicQuotas: new Map([["I", 1]]),
    seed: "editorial-over-label",
    recentQuestionIds: new Set(),
    mode: "REAL",
  });

  assert.equal(result.questions[0].id, "moderada-equilibrada");
});

test("cumpre a distribuição de dificuldade quando existe solução sem repetir famílias", () => {
  const candidates = [];
  for (let index = 0; index < 10; index += 1) {
    const difficulty = index < 1 ? 1 : index < 2 ? 2 : index < 5 ? 3 : index < 8 ? 4 : 5;
    candidates.push(question(`q-${index}`, "I", `family-${index}`, difficulty, `subtopic-${index % 8}`));
  }
  candidates.push(question("extra-moderada", "I", "family-extra", 3));

  const result = selectExamQuestions({
    candidates,
    topicQuotas: new Map([["I", 10]]),
    seed: "exact-difficulty",
    recentQuestionIds: new Set(),
    mode: "BLINDAGEM",
  });

  assert.equal(result.shortageTopic, null);
  assert.deepEqual(Object.fromEntries([1, 2, 3, 4, 5].map((difficulty) => [
    difficulty,
    result.questions.filter((item) => item.difficulty === difficulty).length,
  ])), { 1: 1, 2: 1, 3: 3, 4: 3, 5: 2 });
});

test("não reutiliza questão recente para forçar a distribuição de dificuldade", () => {
  const result = selectExamQuestions({
    candidates: [
      question("recente-dificil", "I", "family-a", 5),
      question("nova-moderada", "I", "family-b", 3),
    ],
    topicQuotas: new Map([["I", 1]]),
    seed: "recent-over-target",
    recentQuestionIds: new Set(["recente-dificil"]),
    mode: "BLINDAGEM",
  });

  assert.equal(result.questions[0].id, "nova-moderada");
});
