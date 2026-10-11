import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, context: RouteContext<"/api/sessions/[id]/answers">) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)
      || typeof body.questionId !== "string"
      || (body.selectedOptionId !== null && typeof body.selectedOptionId !== "string")
      || typeof body.flagged !== "boolean"
      || typeof body.elapsedSeconds !== "number"
      || !Number.isInteger(body.elapsedSeconds)
      || Number(body.elapsedSeconds) < 0) {
      return Response.json({ error: "Resposta inválida." }, { status: 400 });
    }

    const { id } = await context.params;
    const item = await getDb().examSessionQuestion.findFirst({
      where: { sessionId: id, questionId: body.questionId, session: { userId: user.id } },
      include: {
        session: { select: { status: true } },
      },
    });

    if (!item) return Response.json({ error: "Sessão ou questão não encontrada." }, { status: 404 });
    if (item.session.status !== "IN_PROGRESS") return Response.json({ error: "Esta sessão já foi finalizada." }, { status: 409 });

    const selectedOptionId = body.selectedOptionId as string | null;
    const optionOrder = Array.isArray(item.optionOrder)
      ? item.optionOrder.filter((optionId): optionId is string => typeof optionId === "string")
      : [];
    if (selectedOptionId !== null && !optionOrder.includes(selectedOptionId)) {
      return Response.json({ error: "Alternativa inválida." }, { status: 400 });
    }

    const previous = await getDb().userAnswer.findUnique({
      where: { sessionId_questionId: { sessionId: id, questionId: body.questionId } },
    });
    const answerChanges = previous
      ? previous.answerChanges + Number(previous.selectedOptionId !== selectedOptionId)
      : 0;

    await getDb().userAnswer.upsert({
      where: { sessionId_questionId: { sessionId: id, questionId: body.questionId } },
      create: {
        userId: user.id,
        sessionId: id,
        questionId: body.questionId,
        selectedOptionId,
        isCorrect: null,
        flagged: body.flagged,
        elapsedSeconds: Number(body.elapsedSeconds),
        answerChanges,
      },
      update: {
        selectedOptionId,
        isCorrect: null,
        flagged: body.flagged,
        elapsedSeconds: Number(body.elapsedSeconds),
        answerChanges,
      },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSON inválido." }, { status: 400 });
    console.error("Falha ao salvar resposta", error);
    return Response.json({ error: "Não foi possível salvar a resposta." }, { status: 500 });
  }
}
