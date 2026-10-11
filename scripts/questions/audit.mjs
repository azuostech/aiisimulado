import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows: questions } = await client.query(`
    SELECT q."id", q."status"::text, q."difficulty", q."familyId", t."code" AS topic,
      COUNT(DISTINCT o."id")::int AS options,
      COUNT(DISTINCT o."id") FILTER (WHERE o."isCorrect")::int AS correct_options,
      COUNT(DISTINCT s."id")::int AS sources,
      COUNT(DISTINCT r."id") FILTER (WHERE r."verdict" = 'APPROVED')::int AS approvals
    FROM "Question" q
    JOIN "Topic" t ON t."id" = q."topicId"
    LEFT JOIN "QuestionOption" o ON o."questionId" = q."id"
    LEFT JOIN "QuestionSource" s ON s."questionId" = q."id"
    LEFT JOIN "QuestionReview" r ON r."questionId" = q."id"
    GROUP BY q."id", t."code"
  `);
  const { rows: blueprint } = await client.query(`
    SELECT bt."topicCode" AS code, bt."questionCount"::int AS required
    FROM "BlueprintTopic" bt
    JOIN "ExamBlueprint" b ON b."id" = bt."blueprintId"
    WHERE b."effectiveFrom" <= CURRENT_TIMESTAMP
      AND (b."effectiveUntil" IS NULL OR b."effectiveUntil" > CURRENT_TIMESTAMP)
    ORDER BY b."effectiveFrom" DESC
  `);
  const invalidActive = questions.filter((question) => question.status === "ACTIVE"
    && (question.options !== 4 || question.correct_options !== 1 || question.sources < 1));
  const byTopic = Object.fromEntries(blueprint.map(({ code, required }) => {
    const active = questions.filter((question) => question.topic === code && question.status === "ACTIVE");
    const families = new Set(active.map((question) => question.familyId)).size;
    return [code, { required, active: active.length, families, missing: Math.max(0, required - families) }];
  }));
  const byDifficulty = Object.fromEntries([1, 2, 3, 4, 5].map((difficulty) => [difficulty,
    questions.filter((question) => question.status === "ACTIVE" && question.difficulty === difficulty).length]));
  const fullExamReady = Object.values(byTopic).every((topic) => topic.missing === 0);
  console.log(JSON.stringify({
    total: questions.length,
    active: questions.filter((question) => question.status === "ACTIVE").length,
    approvedReviews: questions.filter((question) => question.approvals > 0).length,
    invalidActive: invalidActive.map((question) => question.id),
    byDifficulty,
    byTopic,
    fullExamReady,
  }, null, 2));
  if (invalidActive.length > 0) process.exitCode = 1;
} finally {
  await client.end();
}
