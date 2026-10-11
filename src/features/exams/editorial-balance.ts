const ABSOLUTE_CUE = /\b(sempre|nunca|jamais|exclusivamente|somente|apenas|qualquer|todos?|nenhum(?:a)?|integralmente|ilimitad[oa]s?|automaticamente|obrigatoriamente)\b/iu;

type EditorialOption = {
  text: string;
  isCorrect: boolean;
};

function wordCount(value: string) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

export type EditorialBalance = {
  penalty: number;
  uniquelyLongestCorrect: boolean;
  correctToDistractorRatio: number;
  absolutesOnlyInDistractors: boolean;
};

/**
 * Detects answer-key cues without trying to judge whether the financial
 * proposition is true. A lower penalty means the alternatives are more
 * balanced editorially and should be preferred by the exam selector.
 */
export function analyzeEditorialBalance(options: readonly EditorialOption[]): EditorialBalance {
  const correct = options.find((option) => option.isCorrect);
  const distractors = options.filter((option) => !option.isCorrect);
  if (!correct || distractors.length === 0) {
    return {
      penalty: 100,
      uniquelyLongestCorrect: false,
      correctToDistractorRatio: 0,
      absolutesOnlyInDistractors: false,
    };
  }

  const correctWords = wordCount(correct.text);
  const distractorWords = distractors.map((option) => wordCount(option.text));
  const averageDistractorWords = distractorWords.reduce((sum, length) => sum + length, 0) / distractorWords.length;
  const uniquelyLongestCorrect = distractorWords.every((length) => correctWords > length);
  const correctToDistractorRatio = averageDistractorWords === 0 ? 0 : correctWords / averageDistractorWords;
  const absolutesOnlyInDistractors = !ABSOLUTE_CUE.test(correct.text)
    && distractors.some((option) => ABSOLUTE_CUE.test(option.text));

  let penalty = 0;
  if (uniquelyLongestCorrect) penalty += 2;
  if (correctToDistractorRatio > 1.2) penalty += 3;
  if (correctToDistractorRatio > 1.45) penalty += 3;
  if (absolutesOnlyInDistractors) penalty += 3;

  return {
    penalty,
    uniquelyLongestCorrect,
    correctToDistractorRatio,
    absolutesOnlyInDistractors,
  };
}
