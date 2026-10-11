import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { validateQuestionBank } from "./lib.mjs";

const QUESTION_ROOT = path.resolve("data/questions");
const TAXONOMY_ROOT = path.resolve("data/taxonomy");
const ABSOLUTE_PATTERN = /\b(sempre|nunca|jamais|exclusivamente|somente|qualquer|todos?|nenhum(?:a)?|integralmente|ilimitad[oa]s?|automaticamente)\b/iu;
const difficultyTargets = {
  REAL: { 1: 8, 2: 12, 3: 32, 4: 20, 5: 8 },
  BLINDAGEM: { 1: 4, 2: 8, 3: 24, 4: 28, 5: 16 },
};

function wordCount(value) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

const questionFiles = (await readdir(QUESTION_ROOT, { recursive: true })).filter((file) => file.endsWith(".json"));
const questions = [];
for (const file of questionFiles) {
  const batch = JSON.parse(await readFile(path.join(QUESTION_ROOT, file), "utf8"));
  questions.push(...(batch.questions ?? []));
}

const taxonomyFiles = (await readdir(TAXONOMY_ROOT)).filter((file) => file.endsWith(".json"));
const terminalNodes = new Set();
for (const file of taxonomyFiles) {
  const taxonomy = JSON.parse(await readFile(path.join(TAXONOMY_ROOT, file), "utf8"));
  for (const branch of taxonomy.branches ?? []) {
    for (const concept of branch.concepts ?? []) {
      const normalized = concept.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      terminalNodes.add(`tema-${taxonomy.topicCode.toLowerCase()}-${branch.slug}-${normalized}`);
    }
  }
}

const active = questions.filter((question) => question.status === "ACTIVE");
const validationErrors = validateQuestionBank(questions);
const difficulty = Object.fromEntries([1, 2, 3, 4, 5].map((level) => [level,
  active.filter((question) => question.difficulty === level).length]));
const families = new Map();
for (const question of active) {
  const items = families.get(question.family.code) ?? [];
  items.push(question.id);
  families.set(question.family.code, items);
}

const uniquelyLongestCorrect = [];
const absolutesOnlyInDistractors = [];
let correctWords = 0;
let distractorWords = 0;
let distractorCount = 0;

for (const question of active) {
  const correct = question.options.find((option) => option.isCorrect);
  const distractors = question.options.filter((option) => !option.isCorrect);
  if (!correct) continue;
  const correctLength = wordCount(correct.text);
  const distractorLengths = distractors.map((option) => wordCount(option.text));
  if (distractorLengths.every((length) => correctLength > length)) uniquelyLongestCorrect.push(question.id);
  if (!ABSOLUTE_PATTERN.test(correct.text) && distractors.some((option) => ABSOLUTE_PATTERN.test(option.text))) {
    absolutesOnlyInDistractors.push(question.id);
  }
  correctWords += correctLength;
  distractorWords += distractorLengths.reduce((sum, length) => sum + length, 0);
  distractorCount += distractors.length;
}

const coveredNodes = new Set(active.map((question) => question.contentNodeSlug));
const calculationFlagMismatch = active
  .filter((question) => question.requiresCalculation && !question.calculatorAllowed)
  .map((question) => question.id);
const repeatedFamilies = Object.fromEntries([...families]
  .filter(([, ids]) => ids.length > 1)
  .sort(([left], [right]) => left.localeCompare(right)));
const difficultyFeasibility = Object.fromEntries(Object.entries(difficultyTargets).map(([mode, target]) => [mode,
  Object.fromEntries(Object.entries(target).map(([level, required]) => [level, {
    required,
    active: difficulty[level],
    gap: Math.max(0, required - difficulty[level]),
  }]))]));

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  questions: {
    total: questions.length,
    active: active.length,
    invalid: validationErrors.size,
    uniqueFamilies: families.size,
    repeatedFamilies,
  },
  difficulty,
  difficultyFeasibility,
  coverage: {
    terminalNodes: terminalNodes.size,
    coveredTerminalNodes: [...coveredNodes].filter((node) => terminalNodes.has(node)).length,
    coveragePercentage: Number((100 * [...coveredNodes].filter((node) => terminalNodes.has(node)).length / terminalNodes.size).toFixed(1)),
  },
  editorialSignals: {
    uniquelyLongestCorrect: {
      count: uniquelyLongestCorrect.length,
      percentage: Number((100 * uniquelyLongestCorrect.length / active.length).toFixed(1)),
      questionIds: uniquelyLongestCorrect,
    },
    absolutesOnlyInDistractors: {
      count: absolutesOnlyInDistractors.length,
      percentage: Number((100 * absolutesOnlyInDistractors.length / active.length).toFixed(1)),
      questionIds: absolutesOnlyInDistractors,
    },
    averageCorrectWords: Number((correctWords / active.length).toFixed(2)),
    averageDistractorWords: Number((distractorWords / distractorCount).toFixed(2)),
    calculationFlagMismatch,
  },
  validationErrors: Object.fromEntries(validationErrors),
}, null, 2));
