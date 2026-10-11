import "server-only";

import { randomUUID } from "node:crypto";

import type { ExamMode } from "@/generated/prisma/enums";
import { analyzeEditorialBalance } from "@/features/exams/editorial-balance";
import {
  deterministicShuffle,
  selectExamQuestions,
} from "@/features/exams/question-selection";
import { getDb } from "@/lib/db";

export class InsufficientQuestionBankError extends Error {
  constructor(public readonly topicCode: string) {
    super(`Não há questões ativas suficientes no Tema ${topicCode}.`);
  }
}

export class EmptyPersonalQuestionSetError extends Error {
  constructor(public readonly mode: "ERROR_NOTEBOOK" | "FAVORITES" | "SPACED_REVIEW") {
    super(mode === "ERROR_NOTEBOOK"
      ? "Seu caderno de erros ainda está vazio."
      : mode === "FAVORITES"
        ? "Você ainda não adicionou questões aos favoritos."
        : "Não há revisões vencidas neste momento.");
  }
}

const questionInclude = {
  topic: { select: { code: true, name: true } },
  subtopic: { select: { slug: true, name: true } },
  options: true,
  sources: {
    include: { regulationVersion: true },
  },
} as const;

function hasValidAnswerKey(question: { options: Array<{ isCorrect: boolean }> }) {
  return question.options.length === 4
    && question.options.filter((option) => option.isCorrect).length === 1;
}

function selectBalancedQuestions<T extends { options: Array<{ text: string; isCorrect: boolean }> }>(
  questions: T[],
  seed: string,
  count: number,
) {
  return deterministicShuffle(questions, seed)
    .sort((left, right) => analyzeEditorialBalance(left.options).penalty - analyzeEditorialBalance(right.options).penalty)
    .slice(0, count);
}

type SessionConfiguration = {
  questionCount?: number;
  durationMinutes?: number;
  topicCode?: string;
};

export async function createExamSession(userId: string, mode: ExamMode, configuration: SessionConfiguration = {}) {
  const db = getDb();
  const now = new Date();
  const blueprint = await db.examBlueprint.findFirst({
    where: {
      effectiveFrom: { lte: now },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: { topics: true },
  });

  if (!blueprint) {
    throw new Error("BLUEPRINT_NOT_FOUND");
  }

  const randomSeed = randomUUID();
  const requestedQuestionCount = configuration.questionCount ?? 20;
  const activeQuestions = await db.question.findMany({
    where: { status: "ACTIVE" },
    include: questionInclude,
  });
  const validQuestions = activeQuestions.filter(hasValidAnswerKey);
  const selected = [];

  if (mode === "QUICK_REVIEW") {
    if (validQuestions.length === 0) {
      throw new InsufficientQuestionBankError("piloto");
    }

    selected.push(...selectBalancedQuestions(validQuestions, `${randomSeed}:quick-review`, requestedQuestionCount));
  } else if (mode === "ERROR_NOTEBOOK") {
    const wrongAnswers = await db.userAnswer.findMany({
      where: { userId, isCorrect: false, session: { status: "SUBMITTED" } },
      orderBy: { session: { submittedAt: "desc" } },
      select: { questionId: true },
    });
    const questionIds = new Set(wrongAnswers.map((answer) => answer.questionId));
    const personalQuestions = validQuestions.filter((question) => questionIds.has(question.id));
    if (personalQuestions.length === 0) throw new EmptyPersonalQuestionSetError("ERROR_NOTEBOOK");
    selected.push(...selectBalancedQuestions(personalQuestions, `${randomSeed}:error-notebook`, requestedQuestionCount));
  } else if (mode === "FAVORITES") {
    const bookmarks = await db.bookmark.findMany({
      where: { userId },
      select: { questionId: true },
    });
    const questionIds = new Set(bookmarks.map((bookmark) => bookmark.questionId));
    const personalQuestions = validQuestions.filter((question) => questionIds.has(question.id));
    if (personalQuestions.length === 0) throw new EmptyPersonalQuestionSetError("FAVORITES");
    selected.push(...selectBalancedQuestions(personalQuestions, `${randomSeed}:favorites`, requestedQuestionCount));
  } else if (mode === "SPACED_REVIEW") {
    const dueReviews = await db.userQuestionReview.findMany({
      where: { userId, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      take: 100,
      select: { questionId: true },
    });
    const questionIds = new Set(dueReviews.map((review) => review.questionId));
    const personalQuestions = validQuestions.filter((question) => questionIds.has(question.id));
    if (personalQuestions.length === 0) throw new EmptyPersonalQuestionSetError("SPACED_REVIEW");
    selected.push(...selectBalancedQuestions(personalQuestions, `${randomSeed}:spaced-review`, requestedQuestionCount));
  } else if (mode === "TOPIC") {
    const topicCode = configuration.topicCode ?? "";
    const topicQuestions = validQuestions.filter((question) => question.topic.code === topicCode);
    if (topicQuestions.length === 0) throw new InsufficientQuestionBankError(topicCode || "selecionado");
    selected.push(...selectBalancedQuestions(topicQuestions, `${randomSeed}:topic:${topicCode}`, requestedQuestionCount));
  } else {
    if (mode !== "REAL" && mode !== "BLINDAGEM") {
      throw new Error(`UNSUPPORTED_EXAM_MODE:${mode}`);
    }
    const recentSessions = await db.examSession.findMany({
      where: { userId, mode: { in: ["REAL", "BLINDAGEM"] } },
      orderBy: { startedAt: "desc" },
      take: 3,
      select: { id: true },
    });
    const recentExposures = recentSessions.length === 0 ? [] : await db.questionExposure.findMany({
      where: { userId, sessionId: { in: recentSessions.map((session) => session.id) } },
      select: { questionId: true },
    });
    const recentQuestionIds = new Set(recentExposures.map((exposure) => exposure.questionId));
    const selection = selectExamQuestions({
      candidates: validQuestions.map((question) => ({
        ...question,
        topicCode: question.topic.code,
        editorialPenalty: analyzeEditorialBalance(question.options).penalty,
      })),
      topicQuotas: new Map(blueprint.topics.map((topic) => [topic.topicCode, topic.questionCount])),
      seed: `${randomSeed}:${mode}`,
      recentQuestionIds,
      mode,
    });
    if (selection.shortageTopic) {
      throw new InsufficientQuestionBankError(`${selection.shortageTopic} (famílias únicas)`);
    }
    selected.push(...selection.questions);
  }

  const orderedQuestions = deterministicShuffle(selected, `${randomSeed}:questions`);
  const durationMinutes = configuration.durationMinutes
    ?? (["QUICK_REVIEW", "ERROR_NOTEBOOK", "FAVORITES", "SPACED_REVIEW", "TOPIC"].includes(mode)
      ? Math.max(10, Math.ceil(orderedQuestions.reduce((total, question) => total + question.estimatedTimeSeconds, 0) / 60))
      : blueprint.durationMinutes);
  const itemData = orderedQuestions.map((question, position) => {
    const optionOrder = deterministicShuffle(question.options.map((option) => option.id), `${randomSeed}:${question.id}:options`);
    return {
      position,
      questionId: question.id,
      questionVersion: question.version,
      optionOrder,
      questionSnapshot: {
        statement: question.statement,
        explanation: question.explanation,
        commonTrap: question.commonTrap,
        topic: question.topic,
        options: question.options,
        correctOptionId: question.options.find((option) => option.isCorrect)?.id,
        sources: question.sources.map((source) => ({
          locator: source.locator,
          officialUrl: source.regulationVersion.officialUrl,
          versionLabel: source.regulationVersion.versionLabel,
        })),
      },
    };
  });

  const session = await db.$transaction(async (transaction) => {
    const created = await transaction.examSession.create({
      data: {
        userId,
        blueprintId: blueprint.id,
        mode,
        randomSeed,
        durationMinutes,
        items: { create: itemData },
      },
      select: { id: true, startedAt: true },
    });
    await transaction.questionExposure.createMany({
      data: orderedQuestions.map((question, position) => ({
        userId,
        questionId: question.id,
        sessionId: created.id,
        position,
        seenAt: created.startedAt,
      })),
    });
    return created;
  });

  return {
    id: session.id,
    mode,
    startedAt: session.startedAt.toISOString(),
    durationMinutes,
    questions: orderedQuestions.map((question, position) => {
      const order = itemData[position].optionOrder;
      return {
        id: question.id,
        position,
        topic: question.topic,
        statement: question.statement,
        options: order.map((optionId) => {
          const option = question.options.find((candidate) => candidate.id === optionId);
          return { id: optionId, text: option?.text ?? "" };
        }),
      };
    }),
  };
}
