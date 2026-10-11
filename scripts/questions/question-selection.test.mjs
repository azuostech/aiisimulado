import assert from "node:assert/strict";
import test from "node:test";

import {
  deterministicShuffle,
  selectExamQuestions,
} from "../../src/features/exams/question-selection.ts";

function question(id, topicCode, familyId, difficulty, subtopicId = familyId) {
  return { id, topicCode, familyId, difficulty, subtopicId };
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
