import {
  gradeDemoExam,
  InvalidDemoSubmissionError,
} from "@/server/services/grade-demo-exam";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > 8_192) {
    return Response.json(
      { error: "A submissão excede o tamanho permitido." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = gradeDemoExam(await request.json());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof InvalidDemoSubmissionError) {
      return Response.json(
        { error: error instanceof InvalidDemoSubmissionError ? error.message : "JSON inválido." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("Falha ao corrigir a demonstração", error);
    return Response.json(
      { error: "Não foi possível corrigir a demonstração." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
