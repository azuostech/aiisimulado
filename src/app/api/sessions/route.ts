import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";
import {
  createExamSession,
  EmptyPersonalQuestionSetError,
  InsufficientQuestionBankError,
} from "@/server/services/create-exam-session";

const supportedModes = new Set(["REAL", "BLINDAGEM", "TOPIC", "QUICK_REVIEW", "ERROR_NOTEBOOK", "FAVORITES", "SPACED_REVIEW"] as const);
type SupportedMode = "REAL" | "BLINDAGEM" | "TOPIC" | "QUICK_REVIEW" | "ERROR_NOTEBOOK" | "FAVORITES" | "SPACED_REVIEW";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [sessions, submittedAnswers] = await Promise.all([
    getDb().examSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        mode: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        _count: { select: { items: true, answers: true } },
        answers: { select: { isCorrect: true } },
        blueprint: { select: { version: true, questionCount: true } },
      },
    }),
    getDb().userAnswer.findMany({
      where: { userId: user.id, session: { status: "SUBMITTED" } },
      select: { questionId: true, isCorrect: true },
    }),
  ]);

  const submittedSessions = sessions.filter((session) => session.status === "SUBMITTED");
  const recentPercentages = submittedSessions.slice(0, 5).map((session) => {
    const graded = session.answers.filter((answer) => answer.isCorrect !== null);
    return graded.length === 0
      ? 0
      : Math.round((graded.filter((answer) => answer.isCorrect).length / graded.length) * 100);
  });

  return Response.json({
    summary: {
      completedSessions: submittedSessions.length,
      inProgressSessions: sessions.filter((session) => session.status === "IN_PROGRESS").length,
      averagePercentage: recentPercentages.length === 0
        ? null
        : Math.round(recentPercentages.reduce((total, percentage) => total + percentage, 0) / recentPercentages.length),
      uniqueQuestions: new Set(submittedAnswers.map((answer) => answer.questionId)).size,
    },
    sessions: sessions.map((session) => ({
      id: session.id,
      mode: session.mode,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      submittedAt: session.submittedAt?.toISOString() ?? null,
      questionCount: session._count.items,
      answerCount: session._count.answers,
      score: session.status === "SUBMITTED"
        ? session.answers.filter((answer) => answer.isCorrect).length
        : null,
      blueprint: session.blueprint.version,
      expectedQuestionCount: session.blueprint.questionCount,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  try {
    const body = await request.json() as { mode?: unknown; questionCount?: unknown; durationMinutes?: unknown; topicCode?: unknown };
    const mode = body.mode;

    if (typeof mode !== "string" || !supportedModes.has(mode as SupportedMode)) {
      return Response.json({ error: "Modalidade inválida." }, { status: 400 });
    }

    const configurable = ["TOPIC", "QUICK_REVIEW", "ERROR_NOTEBOOK", "FAVORITES", "SPACED_REVIEW"].includes(mode);
    if (configurable && body.questionCount !== undefined
      && (!Number.isInteger(body.questionCount) || Number(body.questionCount) < 1 || Number(body.questionCount) > 20)) {
      return Response.json({ error: "A quantidade deve ser um número inteiro entre 1 e 20." }, { status: 400 });
    }
    if (configurable && body.durationMinutes !== undefined
      && (!Number.isInteger(body.durationMinutes) || Number(body.durationMinutes) < 1 || Number(body.durationMinutes) > 180)) {
      return Response.json({ error: "A duração deve ser um número inteiro entre 1 e 180 minutos." }, { status: 400 });
    }
    if (mode === "TOPIC" && (typeof body.topicCode !== "string" || body.topicCode.length < 1 || body.topicCode.length > 8)) {
      return Response.json({ error: "Tema inválido." }, { status: 400 });
    }

    const session = await createExamSession(user.id, mode as SupportedMode, configurable ? {
      questionCount: body.questionCount as number | undefined,
      durationMinutes: body.durationMinutes as number | undefined,
      topicCode: mode === "TOPIC" ? body.topicCode as string : undefined,
    } : {});
    return Response.json(session, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }

    if (error instanceof InsufficientQuestionBankError) {
      return Response.json(
        { error: error.message, code: "INSUFFICIENT_QUESTION_BANK", topic: error.topicCode },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (error instanceof EmptyPersonalQuestionSetError) {
      return Response.json(
        { error: error.message, code: "EMPTY_PERSONAL_QUESTION_SET", mode: error.mode },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Falha ao criar sessão", error);
    return Response.json({ error: "Não foi possível criar a sessão." }, { status: 500 });
  }
}
