import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  const now = new Date();
  const [wrongAnswers, bookmarks, submittedAnswers, reviews, allTopics, blueprint, activeQuestionMetadata] = await Promise.all([
    getDb().userAnswer.findMany({
      where: { userId: user.id, isCorrect: false, session: { status: "SUBMITTED" } },
      orderBy: { session: { submittedAt: "desc" } },
      take: 200,
      select: {
        questionId: true,
        sessionId: true,
        question: { select: { statement: true, topic: { select: { code: true, name: true } } } },
        session: { select: { submittedAt: true } },
      },
    }),
    getDb().bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        questionId: true,
        createdAt: true,
        question: { select: { statement: true, topic: { select: { code: true, name: true } } } },
      },
    }),
    getDb().userAnswer.findMany({
      where: { userId: user.id, isCorrect: { not: null }, session: { status: "SUBMITTED" } },
      select: {
        isCorrect: true,
        question: { select: { topic: { select: { code: true, name: true } } } },
      },
    }),
    getDb().userQuestionReview.findMany({
      where: { userId: user.id },
      orderBy: { dueAt: "asc" },
      select: { dueAt: true },
    }),
    getDb().topic.findMany({
      select: {
        code: true,
        name: true,
        _count: { select: { questions: { where: { status: "ACTIVE" } } } },
      },
    }),
    getDb().examBlueprint.findFirst({
      where: { effectiveFrom: { lte: now }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }] },
      orderBy: { effectiveFrom: "desc" },
      select: { topics: { select: { topicCode: true, questionCount: true } } },
    }),
    getDb().question.findMany({
      where: { status: "ACTIVE" },
      select: { familyId: true, difficulty: true, topic: { select: { code: true } } },
    }),
  ]);

  const uniqueErrors = new Map<string, typeof wrongAnswers[number]>();
  for (const answer of wrongAnswers) if (!uniqueErrors.has(answer.questionId)) uniqueErrors.set(answer.questionId, answer);
  const topics = new Map(allTopics.map((topic) => [topic.code, {
    code: topic.code,
    name: topic.name,
    availableQuestions: topic._count.questions,
    answered: 0,
    correct: 0,
  }]));
  for (const answer of submittedAnswers) {
    const topic = answer.question.topic;
    const metric = topics.get(topic.code) ?? { ...topic, availableQuestions: 0, answered: 0, correct: 0 };
    metric.answered += 1;
    metric.correct += Number(answer.isCorrect === true);
    topics.set(topic.code, metric);
  }
  const uniqueFamiliesByTopic = new Map<string, Set<string>>();
  for (const question of activeQuestionMetadata) {
    const families = uniqueFamiliesByTopic.get(question.topic.code) ?? new Set<string>();
    families.add(question.familyId);
    uniqueFamiliesByTopic.set(question.topic.code, families);
  }
  const realReady = Boolean(blueprint?.topics.every((topic) =>
    (uniqueFamiliesByTopic.get(topic.topicCode)?.size ?? 0) >= topic.questionCount));
  const hardQuestionCount = activeQuestionMetadata.filter((question) => question.difficulty >= 4).length;
  const veryHardQuestionCount = activeQuestionMetadata.filter((question) => question.difficulty === 5).length;

  return Response.json({
    errors: [...uniqueErrors.values()].map((answer) => ({
      questionId: answer.questionId,
      sessionId: answer.sessionId,
      statement: answer.question.statement,
      topic: answer.question.topic,
      occurredAt: answer.session.submittedAt?.toISOString() ?? null,
    })),
    bookmarks: bookmarks.map((bookmark) => ({
      questionId: bookmark.questionId,
      statement: bookmark.question.statement,
      topic: bookmark.question.topic,
      createdAt: bookmark.createdAt.toISOString(),
    })),
    spacedReview: {
      dueCount: reviews.filter((review) => review.dueAt <= now).length,
      nextDueAt: reviews.find((review) => review.dueAt > now)?.dueAt.toISOString() ?? null,
    },
    examAvailability: {
      real: realReady,
      blindagem: realReady && hardQuestionCount >= 44 && veryHardQuestionCount >= 16,
      coverage: blueprint?.topics.map((topic) => ({
        code: topic.topicCode,
        required: topic.questionCount,
        availableFamilies: uniqueFamiliesByTopic.get(topic.topicCode)?.size ?? 0,
      })) ?? [],
    },
    topicMetrics: [...topics.values()]
      .map((topic) => ({
        ...topic,
        percentage: topic.answered === 0 ? null : Math.round((topic.correct / topic.answered) * 100),
      }))
      .sort((left, right) => {
        const order = ["I", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
        return order.indexOf(left.code) - order.indexOf(right.code);
      }),
  }, { headers: { "Cache-Control": "no-store" } });
}
