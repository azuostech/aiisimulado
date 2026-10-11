import { getCurrentBlueprint } from "@/server/data/get-current-blueprint";

export async function GET() {
  try {
    const blueprint = await getCurrentBlueprint();

    if (!blueprint) {
      return Response.json(
        { error: "Nenhuma matriz vigente foi encontrada." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(blueprint, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Falha ao carregar a matriz vigente", error);
    return Response.json(
      { error: "Não foi possível carregar a matriz vigente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
