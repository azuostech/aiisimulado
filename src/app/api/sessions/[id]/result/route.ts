import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";

type Snapshot = {
  statement: string;
  topic: { code: string; name: string };
  options: Array<{ id: string; text: string }>;
  explanation: string;
  commonTrap: string | null;
  correctOptionId: string;
  sources: Array<{ locator: string; officialUrl: string; versionLabel: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSnapshot(value: unknown): Snapshot | null {
  if (!isRecord(value)
    || typeof value.statement !== "string"
    || !isRecord(value.topic)
    || typeof value.topic.code !== "string"
    || typeof value.topic.name !== "string"
    || !Array.isArray(value.options)
    || typeof value.explanation !== "string"
    || typeof value.correctOptionId !== "string"
    || !Array.isArray(value.sources)) return null;

  const options = value.options.flatMap((option) => isRecord(option)
    && typeof option.id === "string"
    && typeof option.text === "string"
    ? [{ id: option.id, text: option.text }]
    : []);
  const sources = value.sources.flatMap((source) => isRecord(source)
    && typeof source.locator === "string"
    && typeof source.officialUrl === "string"
    && typeof source.versionLabel === "string"
    ? [{ locator: source.locator, officialUrl: source.officialUrl, versionLabel: source.versionLabel }]
    : []);

  if (options.length !== 4) return null;
  return {
    statement: value.statement,
    topic: { code: value.topic.code, name: value.topic.name },
    options,
    explanation: value.explanation,
    commonTrap: typeof value.commonTrap === "string" ? value.commonTrap : null,
    correctOptionId: value.correctOptionId,
    sources,
  };
}

export async function GET(_request: Request, context: RouteContext<"/api/sessions/[id]/result">) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  const { id } = await context.params;
  const session = await getDb().examSession.findFirst({
    where: { id, userId: user.id },
    include: {
      blueprint: { select: { passingPercentage: true } },
      items: { orderBy: { position: "asc" } },
      answers: true,
    },
  });

  if (!session) return Response.json({ error: "Sessão não encontrada." }, { status: 404 });
  if (session.status !== "SUBMITTED") return Response.json({ error: "A sessão ainda não foi finalizada." }, { status: 409 });

  const answers = new Map(session.answers.map((answer) => [answer.questionId, answer]));
  const parsed = session.items.map((item) => {
    const snapshot = readSnapshot(item.questionSnapshot);
    const optionOrder = Array.isArray(item.optionOrder)
      ? item.optionOrder.filter((optionId): optionId is string => typeof optionId === "string")
      : [];
    if (!snapshot || optionOrder.length !== 4) throw new Error("INVALID_QUESTION_SNAPSHOT");
    const answer = answers.get(item.questionId);
    const options = optionOrder.map((optionId) => ({
      id: optionId,
      text: snapshot.options.find((option) => option.id === optionId)?.text ?? "",
    }));

    return {
      question: { id: item.questionId, position: item.position, topic: snapshot.topic, statement: snapshot.statement, options },
      review: {
        questionId: item.questionId,
        position: item.position,
        selectedOptionId: answer?.selectedOptionId ?? null,
        correctOptionId: snapshot.correctOptionId,
        isCorrect: answer?.isCorrect === true,
        explanation: snapshot.explanation,
        commonTrap: snapshot.commonTrap,
        sources: snapshot.sources,
      },
    };
  });
  const score = parsed.filter((item) => item.review.isCorrect).length;
  const percentage = Math.round((score / parsed.length) * 100);
  const bookmarks = await getDb().bookmark.findMany({
    where: { userId: user.id, questionId: { in: parsed.map((item) => item.question.id) } },
    select: { questionId: true },
  });

  return Response.json({
    session: {
      id: session.id,
      mode: session.mode,
      startedAt: session.startedAt.toISOString(),
      durationMinutes: session.durationMinutes,
      questions: parsed.map((item) => item.question),
    },
    result: {
      sessionId: session.id,
      score,
      total: parsed.length,
      percentage,
      passed: percentage >= session.blueprint.passingPercentage,
      review: parsed.map((item) => item.review),
    },
    bookmarkedQuestionIds: bookmarks.map((bookmark) => bookmark.questionId),
  }, { headers: { "Cache-Control": "no-store" } });
}
