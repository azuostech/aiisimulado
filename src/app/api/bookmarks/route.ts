import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";

function getQuestionId(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const questionId = Reflect.get(value, "questionId");
  return typeof questionId === "string" && questionId.length > 0 ? questionId : null;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  try {
    const questionId = getQuestionId(await request.json());
    if (!questionId) return Response.json({ error: "Questão inválida." }, { status: 400 });
    const question = await getDb().question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!question) return Response.json({ error: "Questão não encontrada." }, { status: 404 });

    await getDb().bookmark.upsert({
      where: { userId_questionId: { userId: user.id, questionId } },
      create: { userId: user.id, questionId },
      update: {},
    });
    return Response.json({ questionId, bookmarked: true }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSON inválido." }, { status: 400 });
    console.error("Falha ao favoritar questão", error);
    return Response.json({ error: "Não foi possível favoritar a questão." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  try {
    const questionId = getQuestionId(await request.json());
    if (!questionId) return Response.json({ error: "Questão inválida." }, { status: 400 });
    await getDb().bookmark.deleteMany({ where: { userId: user.id, questionId } });
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSON inválido." }, { status: 400 });
    console.error("Falha ao remover favorito", error);
    return Response.json({ error: "Não foi possível remover o favorito." }, { status: 500 });
  }
}
