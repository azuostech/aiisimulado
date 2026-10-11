import "server-only";

import type { DemoSubmissionResult } from "@/features/exams/demo-questions";

type AnswerDefinition = {
  correctOptionId: string;
  explanation: string;
  source: string;
};

const answerKey: Record<string, AnswerDefinition> = {
  "DEMO-I-001": { correctOptionId:"b", explanation:"O assessor não pode atuar como procurador ou representante de clientes perante intermediários. Prazo, comunicação ou tipo de produto não afastam a vedação.", source:"Resolução CVM 178/2023, art. 25" },
  "DEMO-III-001": { correctOptionId:"d", explanation:"A abordagem baseada em risco exige controles proporcionais ao risco. A classificação elevada não implica recusa automática, mas demanda diligência reforçada.", source:"Resolução CVM 50/2021, texto consolidado" },
  "DEMO-VIII-001": { correctOptionId:"a", explanation:"Como há emissão de novas ações e entrada de recursos na companhia, trata-se do mercado primário. Por ela já ser listada, a oferta é subsequente (follow-on), não um IPO.", source:"Lei 6.404/1976 e Resolução CVM 160/2022" },
  "DEMO-XIII-001": { correctOptionId:"c", explanation:"FV = 10.000 × (1 + 0,01)² = 10.201. O juro do segundo mês incide também sobre o rendimento do primeiro.", source:"Conteúdo programático oficial ANCORD/FGV — Tema XIII" },
  "DEMO-XV-001": { correctOptionId:"b", explanation:"O importador tem uma obrigação futura em dólar e perde com a alta da moeda. A posição comprada em dólar futuro tende a ganhar nesse cenário, compensando o aumento do desembolso.", source:"Conteúdo programático oficial ANCORD/FGV — Tema XV" },
};

const optionIds = new Set(["a", "b", "c", "d"]);

export class InvalidDemoSubmissionError extends Error {}

function parseAnswers(input: unknown): Record<string, string | null> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new InvalidDemoSubmissionError("O corpo da requisição deve ser um objeto JSON.");
  }

  const answers = Reflect.get(input, "answers");

  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    throw new InvalidDemoSubmissionError("O campo answers deve ser um objeto.");
  }

  const entries = Object.entries(answers);
  const knownQuestionIds = new Set(Object.keys(answerKey));

  if (entries.some(([questionId]) => !knownQuestionIds.has(questionId))) {
    throw new InvalidDemoSubmissionError("A submissão contém uma questão desconhecida.");
  }

  for (const [, selectedOptionId] of entries) {
    if (selectedOptionId !== null && (typeof selectedOptionId !== "string" || !optionIds.has(selectedOptionId))) {
      throw new InvalidDemoSubmissionError("A submissão contém uma alternativa inválida.");
    }
  }

  return Object.fromEntries(entries) as Record<string, string | null>;
}

export function gradeDemoExam(input: unknown): DemoSubmissionResult {
  const answers = parseAnswers(input);
  const review = Object.entries(answerKey).map(([id, item]) => ({
    id,
    ...item,
    isCorrect: answers[id] === item.correctOptionId,
  }));

  return {
    score: review.filter((item) => item.isCorrect).length,
    review,
  };
}
