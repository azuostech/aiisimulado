import { createHash } from "node:crypto";

export type SelectionMode = "REAL" | "BLINDAGEM";

export type SelectableExamQuestion = {
  id: string;
  familyId: string;
  subtopicId: string;
  topicCode: string;
  difficulty: number;
  editorialPenalty?: number;
};

export const difficultyTargets: Record<SelectionMode, Record<number, number>> = {
  REAL: { 1: 8, 2: 12, 3: 32, 4: 20, 5: 8 },
  BLINDAGEM: { 1: 4, 2: 8, 3: 24, 4: 28, 5: 16 },
};

const EDITORIAL_PENALTY_WEIGHT = 1_000;

export function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let state = createHash("sha256").update(seed).digest().readUInt32LE(0) || 1;

  for (let index = result.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const target = (state >>> 0) % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function scaledDifficultyTargets(mode: SelectionMode, total: number) {
  const base = difficultyTargets[mode];
  const baseTotal = Object.values(base).reduce((sum, count) => sum + count, 0);
  const entries = Object.entries(base).map(([difficulty, count]) => {
    const exact = (count * total) / baseTotal;
    return { difficulty: Number(difficulty), count: Math.floor(exact), remainder: exact % 1 };
  });
  let missing = total - entries.reduce((sum, entry) => sum + entry.count, 0);

  for (const entry of [...entries].sort((left, right) => right.remainder - left.remainder || left.difficulty - right.difficulty)) {
    if (missing === 0) break;
    entry.count += 1;
    missing -= 1;
  }

  return new Map(entries.map((entry) => [entry.difficulty, entry.count]));
}

export type ExamSelectionResult<T> =
  | { questions: T[]; shortageTopic: null }
  | { questions: []; shortageTopic: string };

/**
 * Selects the whole exam in one pass. Topic quotas remain exact, while
 * difficulty, subtopic diversity and recent exposure are optimized globally.
 * This makes the result independent from the database order of blueprint topics.
 */
export function selectExamQuestions<T extends SelectableExamQuestion>({
  candidates,
  topicQuotas,
  seed,
  recentQuestionIds,
  mode,
}: {
  candidates: T[];
  topicQuotas: ReadonlyMap<string, number>;
  seed: string;
  recentQuestionIds: ReadonlySet<string>;
  mode: SelectionMode;
}): ExamSelectionResult<T> {
  for (const [topicCode, required] of topicQuotas) {
    const uniqueFamilies = new Set(
      candidates.filter((question) => question.topicCode === topicCode).map((question) => question.familyId),
    );
    if (uniqueFamilies.size < required) return { questions: [], shortageTopic: topicCode };
  }

  const pool = deterministicShuffle(candidates, seed);
  const remainingByTopic = new Map(topicQuotas);
  const total = [...topicQuotas.values()].reduce((sum, count) => sum + count, 0);
  const targetByDifficulty = scaledDifficultyTargets(mode, total);
  const selectedByDifficulty = new Map<number, number>();
  const selectedBySubtopic = new Map<string, number>();
  const usedFamilies = new Set<string>();
  const selected: T[] = [];

  while (selected.length < total) {
    const eligible = pool.filter((question) =>
      (remainingByTopic.get(question.topicCode) ?? 0) > 0
      && !usedFamilies.has(question.familyId));

    if (eligible.length === 0) {
      const shortageTopic = [...remainingByTopic].find(([, count]) => count > 0)?.[0] ?? "desconhecido";
      return { questions: [], shortageTopic };
    }

    let best = eligible[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const question of eligible) {
      const difficultyDeficit = (targetByDifficulty.get(question.difficulty) ?? 0)
        - (selectedByDifficulty.get(question.difficulty) ?? 0);
      const subtopicKey = `${question.topicCode}:${question.subtopicId}`;
      const subtopicPenalty = selectedBySubtopic.get(subtopicKey) ?? 0;
      const recentPenalty = recentQuestionIds.has(question.id) ? 10_000 : 0;
      const editorialPenalty = question.editorialPenalty ?? 0;
      const score = difficultyDeficit * 100
        - subtopicPenalty * 30
        - recentPenalty
        - editorialPenalty * EDITORIAL_PENALTY_WEIGHT;

      if (score > bestScore) {
        best = question;
        bestScore = score;
      }
    }

    selected.push(best);
    usedFamilies.add(best.familyId);
    remainingByTopic.set(best.topicCode, (remainingByTopic.get(best.topicCode) ?? 0) - 1);
    selectedByDifficulty.set(best.difficulty, (selectedByDifficulty.get(best.difficulty) ?? 0) + 1);
    const subtopicKey = `${best.topicCode}:${best.subtopicId}`;
    selectedBySubtopic.set(subtopicKey, (selectedBySubtopic.get(subtopicKey) ?? 0) + 1);
  }

  return { questions: selected, shortageTopic: null };
}
