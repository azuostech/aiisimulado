import { createHash } from "node:crypto";

export const allowedStatuses = new Set(["DRAFT", "REVIEWED", "VALIDATED", "ACTIVE", "NEEDS_REVIEW", "ARCHIVED"]);
export const allowedSkills = new Set(["RECALL", "UNDERSTANDING", "APPLICATION", "ANALYSIS", "CALCULATION"]);

export function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function stableId(...parts) {
  return createHash("sha256").update(parts.join(":"), "utf8").digest("hex").slice(0, 24);
}

export function validateQuestion(question) {
  const errors = [];
  if (!/^AI-[IVX]+-\d{6}$/.test(question.id ?? "")) errors.push("id fora do padrão AI-TEMA-000000");
  if (!question.topicCode || !question.subtopicSlug || !question.contentNodeSlug) errors.push("taxonomia incompleta");
  if (!question.family?.code || !question.family?.angle) errors.push("família incompleta");
  if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 5) errors.push("difficulty deve estar entre 1 e 5");
  if (!allowedSkills.has(question.cognitiveSkill)) errors.push("cognitiveSkill inválida");
  if (!allowedStatuses.has(question.status)) errors.push("status inválido");
  if (typeof question.statement !== "string" || question.statement.trim().length < 45) errors.push("enunciado curto ou ausente");
  if (!Array.isArray(question.options) || question.options.length !== 4) errors.push("a questão deve ter quatro opções");
  const correct = question.options?.filter((option) => option.isCorrect) ?? [];
  if (correct.length !== 1) errors.push("deve existir exatamente uma opção correta");
  for (const option of question.options ?? []) {
    if (!option.id || !option.text || typeof option.isCorrect !== "boolean") errors.push("opção incompleta");
    if (!option.isCorrect && !option.distractorReason) errors.push(`distrator ${option.id ?? "?"} sem justificativa`);
  }
  if (!question.explanation || question.explanation.length < 80) errors.push("explicação insuficiente");
  if (!question.commonTrap) errors.push("armadilha comum ausente");
  if (!Array.isArray(question.sources) || question.sources.length === 0) errors.push("fonte ausente");
  for (const source of question.sources ?? []) {
    if (source.confidence !== "OFFICIAL" || !source.url?.startsWith("https://") || !source.locator || !source.checkedAt) {
      errors.push("fonte oficial incompleta");
    }
  }
  if (question.status === "ACTIVE" && errors.length > 0) errors.push("questão ACTIVE reprovada no gate editorial");
  return [...new Set(errors)];
}

export function validateQuestionBank(questions) {
  const errorsByQuestion = new Map();
  const ids = new Set();
  const families = new Map();

  function addError(questionId, message) {
    const current = errorsByQuestion.get(questionId) ?? [];
    current.push(message);
    errorsByQuestion.set(questionId, current);
  }

  for (const question of questions) {
    const questionId = question.id ?? "questão-sem-id";
    for (const error of validateQuestion(question)) addError(questionId, error);

    if (ids.has(questionId)) addError(questionId, "id duplicado no banco");
    ids.add(questionId);

    const familyCode = question.family?.code;
    if (!familyCode) continue;
    const previous = families.get(familyCode);
    const metadata = {
      name: question.family?.name,
      topicCode: question.topicCode,
      subtopicSlug: question.subtopicSlug,
      contentNodeSlug: question.contentNodeSlug,
      angles: new Set([question.family?.angle]),
    };

    if (!previous) {
      families.set(familyCode, metadata);
      continue;
    }

    if (previous.name !== metadata.name
      || previous.topicCode !== metadata.topicCode
      || previous.subtopicSlug !== metadata.subtopicSlug
      || previous.contentNodeSlug !== metadata.contentNodeSlug) {
      addError(questionId, "família reutilizada com taxonomia ou nome divergente");
    }
    if (previous.angles.has(question.family?.angle)) {
      addError(questionId, "ângulo duplicado dentro da família");
    }
    previous.angles.add(question.family?.angle);
  }

  return new Map([...errorsByQuestion].map(([questionId, errors]) => [questionId, [...new Set(errors)]]));
}
