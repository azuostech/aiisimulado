import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";

type Snapshot = {
  statement: string;
  topic: { code: string; name: string };
  options: Array<{ id: string; text: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSnapshot(value: unknown): Snapshot | null {
  if (!isRecord(value) || typeof value.statement !== "string" || !isRecord(value.topic) || !Array.isArray(value.options)) return null;
  if (typeof value.topic.code !== "string" || typeof value.topic.name !== "string") return null;

  const options = value.options.flatMap((option) => {
    if (!isRecord(option) || typeof option.id !== "string" || typeof option.text !== "string") return [];
    return [{ id: option.id, text: option.text }];
  });

  return options.length === 4
    ? { statement: value.statement, topic: { code: value.topic.code, name: value.topic.name }, options }
    : null;
}

export async function GET(_request: Request, context: RouteContext<"/api/sessions/[id]">) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  const { id } = await context.params;
  const session = await getDb().examSession.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { orderBy: { position: "asc" } },
      answers: { select: { questionId: true, selectedOptionId: true, flagged: true } },
    },
  });

  if (!session) return Response.json({ error: "Sessão não encontrada." }, { status: 404 });

  const answers = new Map(session.answers.map((answer) => [answer.questionId, answer]));
  const questions = session.items.map((item) => {
    const snapshot = readSnapshot(item.questionSnapshot);
    const optionOrder = Array.isArray(item.optionOrder)
      ? item.optionOrder.filter((optionId): optionId is string => typeof optionId === "string")
      : [];
    if (!snapshot || optionOrder.length !== 4) throw new Error("INVALID_QUESTION_SNAPSHOT");
    const answer = answers.get(item.questionId);

    return {
      id: item.questionId,
      position: item.position,
      topic: snapshot.topic,
      statement: snapshot.statement,
      options: optionOrder.map((optionId) => {
        const option = snapshot.options.find((candidate) => candidate.id === optionId);
        return { id: optionId, text: option?.text ?? "" };
      }),
      selectedOptionId: answer?.selectedOptionId ?? null,
      flagged: answer?.flagged ?? false,
    };
  });

  return Response.json({
    id: session.id,
    mode: session.mode,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    durationMinutes: session.durationMinutes,
    remainingSeconds: Math.max(
      0,
      session.durationMinutes * 60
        - Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
    ),
    questions,
  }, { headers: { "Cache-Control": "no-store" } });
}
