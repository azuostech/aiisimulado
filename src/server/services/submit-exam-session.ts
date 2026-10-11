import "server-only";

import { getDb } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type SubmittedAnswer = {
  selectedOptionId: string | null;
  flagged: boolean;
  elapsedSeconds: number;
};

type QuestionSnapshot = {
  explanation: string;
  commonTrap: string | null;
  correctOptionId: string;
  sources: Array<{
    locator: string;
    officialUrl: string;
    versionLabel: string;
  }>;
};

export class InvalidSessionSubmissionError extends Error {}
export class SessionNotFoundError extends Error {}
export class SessionAlreadySubmittedError extends Error {}

function nextReviewSchedule(previous: {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
} | undefined, isCorrect: boolean, reviewedAt: Date) {
  const current = previous ?? { repetitions: 0, intervalDays: 1, easeFactor: 2.5 };
  const repetitions = isCorrect ? current.repetitions + 1 : 0;
  const intervalDays = !isCorrect
    ? 1
    : repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.max(4, Math.round(current.intervalDays * current.easeFactor));
  const easeFactor = isCorrect
    ? Math.min(3, current.easeFactor + 0.05)
    : Math.max(1.3, current.easeFactor - 0.2);
  const dueAt = new Date(reviewedAt.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return { repetitions, intervalDays, easeFactor, dueAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSnapshot(value: unknown): QuestionSnapshot {
  if (!isRecord(value)
    || typeof value.explanation !== "string"
    || typeof value.correctOptionId !== "string"
    || !Array.isArray(value.sources)) {
    throw new Error("INVALID_QUESTION_SNAPSHOT");
  }

  return {
    explanation: value.explanation,
    commonTrap: typeof value.commonTrap === "string" ? value.commonTrap : null,
    correctOptionId: value.correctOptionId,
    sources: value.sources.flatMap((source) => {
      if (!isRecord(source)
        || typeof source.locator !== "string"
        || typeof source.officialUrl !== "string"
        || typeof source.versionLabel !== "string") {
        return [];
      }

      return [{
        locator: source.locator,
        officialUrl: source.officialUrl,
        versionLabel: source.versionLabel,
      }];
    }),
  };
}

function parseAnswers(input: unknown): Record<string, SubmittedAnswer> {
  if (!isRecord(input) || !isRecord(input.answers)) {
    throw new InvalidSessionSubmissionError("O campo answers deve ser um objeto.");
  }

  return Object.fromEntries(Object.entries(input.answers).map(([questionId, value]) => {
    if (!isRecord(value)
      || (value.selectedOptionId !== null && typeof value.selectedOptionId !== "string")
      || typeof value.flagged !== "boolean"
      || !Number.isInteger(value.elapsedSeconds)
      || Number(value.elapsedSeconds) < 0) {
      throw new InvalidSessionSubmissionError("A submissão contém uma resposta inválida.");
    }

    return [questionId, {
      selectedOptionId: value.selectedOptionId as string | null,
      flagged: value.flagged,
      elapsedSeconds: Number(value.elapsedSeconds),
    }];
  }));
}

export async function submitExamSession(userId: string, sessionId: string, input: unknown) {
  const submittedAnswers = parseAnswers(input);
  const db = getDb();
  const session = await db.examSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      blueprint: { select: { passingPercentage: true } },
      answers: true,
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!session) {
    throw new SessionNotFoundError();
  }

  if (session.status === "SUBMITTED") {
    const persistedAnswers = new Map(session.answers.map((answer) => [answer.questionId, answer]));
    const review = session.items.map((item) => {
      const snapshot = parseSnapshot(item.questionSnapshot);
      const answer = persistedAnswers.get(item.questionId);
      return {
        questionId: item.questionId,
        position: item.position,
        selectedOptionId: answer?.selectedOptionId ?? null,
        correctOptionId: snapshot.correctOptionId,
        isCorrect: answer?.isCorrect === true,
        flagged: answer?.flagged ?? false,
        elapsedSeconds: answer?.elapsedSeconds ?? 0,
        explanation: snapshot.explanation,
        commonTrap: snapshot.commonTrap,
        sources: snapshot.sources,
      };
    });
    const score = review.filter((item) => item.isCorrect).length;
    const percentage = Math.round((score / review.length) * 100);
    return {
      sessionId,
      score,
      total: review.length,
      percentage,
      passed: percentage >= session.blueprint.passingPercentage,
      review,
    };
  }

  if (session.status !== "IN_PROGRESS") {
    throw new SessionAlreadySubmittedError();
  }

  const knownQuestionIds = new Set(session.items.map((item) => item.questionId));
  if (Object.keys(submittedAnswers).some((questionId) => !knownQuestionIds.has(questionId))) {
    throw new InvalidSessionSubmissionError("A submissão contém uma questão desconhecida.");
  }

  const previousAnswers = new Map(session.answers.map((answer) => [answer.questionId, answer]));
  const previousReviews = new Map((await db.userQuestionReview.findMany({
    where: { userId, questionId: { in: session.items.map((item) => item.questionId) } },
  })).map((item) => [item.questionId, item]));
  const review = session.items.map((item) => {
    const snapshot = parseSnapshot(item.questionSnapshot);
    const optionOrder = Array.isArray(item.optionOrder)
      ? item.optionOrder.filter((optionId): optionId is string => typeof optionId === "string")
      : [];
    const submitted = submittedAnswers[item.questionId] ?? {
      selectedOptionId: null,
      flagged: false,
      elapsedSeconds: 0,
    };

    if (submitted.selectedOptionId !== null && !optionOrder.includes(submitted.selectedOptionId)) {
      throw new InvalidSessionSubmissionError("A submissão contém uma alternativa desconhecida.");
    }

    return {
      questionId: item.questionId,
      position: item.position,
      selectedOptionId: submitted.selectedOptionId,
      correctOptionId: snapshot.correctOptionId,
      isCorrect: submitted.selectedOptionId === snapshot.correctOptionId,
      flagged: submitted.flagged,
      elapsedSeconds: submitted.elapsedSeconds,
      explanation: snapshot.explanation,
      commonTrap: snapshot.commonTrap,
      sources: snapshot.sources,
    };
  });

  const reviewedAt = new Date();
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const item of review) {
    const previous = previousAnswers.get(item.questionId);
    const answerChanges = previous
      ? previous.answerChanges + Number(previous.selectedOptionId !== item.selectedOptionId)
      : 0;

    operations.push(
      db.userAnswer.upsert({
        where: {
          sessionId_questionId: { sessionId, questionId: item.questionId },
        },
        create: {
          userId,
          sessionId,
          questionId: item.questionId,
          selectedOptionId: item.selectedOptionId,
          isCorrect: item.isCorrect,
          flagged: item.flagged,
          elapsedSeconds: item.elapsedSeconds,
          answerChanges,
        },
        update: {
          selectedOptionId: item.selectedOptionId,
          isCorrect: item.isCorrect,
          flagged: item.flagged,
          elapsedSeconds: item.elapsedSeconds,
          answerChanges,
        },
      }),
    );

    const schedule = nextReviewSchedule(previousReviews.get(item.questionId), item.isCorrect, reviewedAt);
    operations.push(
      db.userQuestionReview.upsert({
        where: { userId_questionId: { userId, questionId: item.questionId } },
        create: {
          userId,
          questionId: item.questionId,
          ...schedule,
          lastReviewedAt: reviewedAt,
          lastCorrect: item.isCorrect,
        },
        update: {
          ...schedule,
          lastReviewedAt: reviewedAt,
          lastCorrect: item.isCorrect,
        },
      }),
    );
  }

  operations.push(
    db.examSession.update({
      where: { id: sessionId },
      data: { status: "SUBMITTED", submittedAt: reviewedAt },
    }),
  );

  // A transação em lote mantém a finalização atômica sem o limite curto das
  // transações interativas, que expirava em provas com muitas questões.
  await db.$transaction(operations, { maxWait: 10_000, timeout: 120_000 });

  const score = review.filter((item) => item.isCorrect).length;
  const percentage = Math.round((score / review.length) * 100);

  return {
    sessionId,
    score,
    total: review.length,
    percentage,
    passed: percentage >= session.blueprint.passingPercentage,
    review,
  };
}
