import { getAuthenticatedUser } from "@/server/auth/require-user";
import {
  InvalidSessionSubmissionError,
  SessionAlreadySubmittedError,
  SessionNotFoundError,
  submitExamSession,
} from "@/server/services/submit-exam-session";

export async function POST(request: Request, context: RouteContext<"/api/sessions/[id]/submit">) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const result = await submitExamSession(user.id, id, await request.json());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof InvalidSessionSubmissionError) {
      return Response.json(
        { error: error instanceof Error ? error.message : "JSON inválido." },
        { status: 400 },
      );
    }

    if (error instanceof SessionNotFoundError) {
      return Response.json({ error: "Sessão não encontrada." }, { status: 404 });
    }

    if (error instanceof SessionAlreadySubmittedError) {
      return Response.json({ error: "Esta sessão já foi finalizada." }, { status: 409 });
    }

    console.error("Falha ao finalizar sessão", error);
    return Response.json({ error: "Não foi possível finalizar a sessão." }, { status: 500 });
  }
}
