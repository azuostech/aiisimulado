import assert from "node:assert/strict";
import test from "node:test";

import { analyzeEditorialBalance } from "../../src/features/exams/editorial-balance.ts";

test("penaliza a resposta correta destacada por tamanho e distratores absolutos", () => {
  const result = analyzeEditorialBalance([
    { text: "A medida opera por diversos canais e produz efeitos graduais ao longo do horizonte relevante.", isCorrect: true },
    { text: "A inflação cai sempre no anúncio.", isCorrect: false },
    { text: "A medida afeta somente os títulos.", isCorrect: false },
    { text: "A demanda nunca se altera.", isCorrect: false },
  ]);

  assert.equal(result.uniquelyLongestCorrect, true);
  assert.equal(result.absolutesOnlyInDistractors, true);
  assert.ok(result.penalty >= 8);
});

test("não penaliza alternativas equilibradas", () => {
  const result = analyzeEditorialBalance([
    { text: "A decisão opera por diferentes canais e seus efeitos aparecem com defasagens.", isCorrect: true },
    { text: "A inflação corrente incorpora a Selic antes que crédito e expectativas reajam.", isCorrect: false },
    { text: "A Selic alcança os preços principalmente pelo mercado de títulos públicos.", isCorrect: false },
    { text: "A alta dos juros estimula a demanda pela maior renda financeira dos poupadores.", isCorrect: false },
  ]);

  assert.equal(result.uniquelyLongestCorrect, false);
  assert.equal(result.absolutesOnlyInDistractors, false);
  assert.equal(result.penalty, 0);
});
