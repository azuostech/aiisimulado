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
const SUBTOPIC_REPEAT_PENALTY = 30;
const MAX_DIFFICULTY_DEVIATION = 2;

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

type DifficultyProfile<T> = {
  counts: number[];
  questions: T[];
  subtopicCounts: Map<string, number>;
  cost: number;
};

function profileKey(counts: number[]) {
  return counts.join(":");
}

function selectedCount(counts: number[]) {
  return counts.reduce((sum, count) => sum + count, 0);
}

function buildTopicDifficultyProfiles<T extends SelectableExamQuestion>(
  candidates: T[],
  required: number,
) {
  const candidatesByFamily = new Map<string, T[]>();
  for (const question of candidates) {
    const family = candidatesByFamily.get(question.familyId) ?? [];
    family.push(question);
    candidatesByFamily.set(question.familyId, family);
  }

  let profiles = new Map<string, DifficultyProfile<T>>([
    [profileKey([0, 0, 0, 0, 0]), {
      counts: [0, 0, 0, 0, 0],
      questions: [],
      subtopicCounts: new Map(),
      cost: 0,
    }],
  ]);

  for (const familyCandidates of candidatesByFamily.values()) {
    const next = new Map(profiles);
    for (const profile of profiles.values()) {
      if (selectedCount(profile.counts) >= required) continue;

      for (const question of familyCandidates) {
        const counts = [...profile.counts];
        counts[question.difficulty - 1] += 1;
        const key = profileKey(counts);
        const previousSubtopicCount = profile.subtopicCounts.get(question.subtopicId) ?? 0;
        const cost = profile.cost + previousSubtopicCount * SUBTOPIC_REPEAT_PENALTY;
        const current = next.get(key);
        if (current && current.cost <= cost) continue;

        const subtopicCounts = new Map(profile.subtopicCounts);
        subtopicCounts.set(question.subtopicId, previousSubtopicCount + 1);
        next.set(key, {
          counts,
          questions: [...profile.questions, question],
          subtopicCounts,
          cost,
        });
      }
    }
    profiles = next;
  }

  return [...profiles.values()].filter((profile) => selectedCount(profile.counts) === required);
}

/**
 * Finds the closest global difficulty mix when the bank can stay within a
 * narrow deviation without recent questions or editorial penalties. Topic
 * quotas and family uniqueness remain hard constraints; a level-5 shortage is
 * avoided before subtopic repetition is used as a tie-breaker.
 */
function selectOptimizedDifficultyMix<T extends SelectableExamQuestion>({
  candidates,
  topicQuotas,
  targets,
}: {
  candidates: T[];
  topicQuotas: ReadonlyMap<string, number>;
  targets: ReadonlyMap<number, number>;
}): T[] | null {
  const targetCounts = [1, 2, 3, 4, 5].map((difficulty) => targets.get(difficulty) ?? 0);
  const topics = [...topicQuotas].sort(([left], [right]) => left.localeCompare(right));
  let combinations = new Map<string, { counts: number[]; questions: T[]; cost: number }>([
    [profileKey([0, 0, 0, 0, 0]), { counts: [0, 0, 0, 0, 0], questions: [], cost: 0 }],
  ]);

  for (const [topicCode, required] of topics) {
    const topicCandidates = candidates.filter((question) => question.topicCode === topicCode);
    const profiles = buildTopicDifficultyProfiles(topicCandidates, required);
    if (profiles.length === 0) return null;

    const next = new Map<string, { counts: number[]; questions: T[]; cost: number }>();
    for (const combination of combinations.values()) {
      for (const profile of profiles) {
        const counts = combination.counts.map((count, index) => count + profile.counts[index]);
        if (counts.some((count, index) => count > targetCounts[index] + MAX_DIFFICULTY_DEVIATION)) continue;
        const key = profileKey(counts);
        const cost = combination.cost + profile.cost;
        const current = next.get(key);
        if (current && current.cost <= cost) continue;
        next.set(key, { counts, questions: [...combination.questions, ...profile.questions], cost });
      }
    }
    if (next.size === 0) return null;
    combinations = next;
  }

  const ranked = [...combinations.values()]
    .filter((combination) => combination.counts.every((count, index) =>
      Math.abs(count - targetCounts[index]) <= MAX_DIFFICULTY_DEVIATION))
    .sort((left, right) => {
      const leftDistance = left.counts.reduce((sum, count, index) => sum + Math.abs(count - targetCounts[index]), 0);
      const rightDistance = right.counts.reduce((sum, count, index) => sum + Math.abs(count - targetCounts[index]), 0);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;

      const leftAdvancedShortage = Math.max(0, targetCounts[4] - left.counts[4]);
      const rightAdvancedShortage = Math.max(0, targetCounts[4] - right.counts[4]);
      if (leftAdvancedShortage !== rightAdvancedShortage) return leftAdvancedShortage - rightAdvancedShortage;
      return left.cost - right.cost;
    });

  return ranked[0]?.questions ?? null;
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
  const preferredPool = pool.filter((question) =>
    !recentQuestionIds.has(question.id) && (question.editorialPenalty ?? 0) === 0);
  const optimizedSelection = selectOptimizedDifficultyMix({
    candidates: preferredPool,
    topicQuotas,
    targets: targetByDifficulty,
  });
  if (optimizedSelection) return { questions: optimizedSelection, shortageTopic: null };

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
        - subtopicPenalty * SUBTOPIC_REPEAT_PENALTY
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
