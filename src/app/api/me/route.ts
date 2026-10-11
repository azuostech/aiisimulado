import { getDb } from "@/lib/db";
import { getAuthenticatedUser } from "@/server/auth/require-user";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: "Autenticação necessária." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const profile = await getDb().user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, examDate: true },
  });

  return Response.json(
    { ...profile, examDate: profile?.examDate?.toISOString().slice(0, 10) ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });

  try {
    const body = await request.json() as { name?: unknown; examDate?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return Response.json({ error: "O nome deve ter entre 2 e 80 caracteres." }, { status: 400 });
    }
    if (body.examDate !== null && body.examDate !== "" && (typeof body.examDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.examDate))) {
      return Response.json({ error: "Informe uma data de prova válida." }, { status: 400 });
    }

    const examDate = body.examDate ? new Date(`${body.examDate}T12:00:00.000Z`) : null;
    if (examDate && (Number.isNaN(examDate.getTime()) || examDate.toISOString().slice(0, 10) !== body.examDate)) {
      return Response.json({ error: "Informe uma data de prova válida." }, { status: 400 });
    }

    const profile = await getDb().user.update({
      where: { id: user.id },
      data: { name, examDate },
      select: { id: true, name: true, email: true, examDate: true },
    });

    return Response.json(
      { ...profile, examDate: profile.examDate?.toISOString().slice(0, 10) ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "JSON inválido." }, { status: 400 });
    console.error("Falha ao atualizar perfil", error);
    return Response.json({ error: "Não foi possível salvar as configurações." }, { status: 500 });
  }
}
