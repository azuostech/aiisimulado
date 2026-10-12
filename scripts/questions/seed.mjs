import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { slugify, stableId, validateQuestion } from "./lib.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const requestedTopics = new Set(process.argv.slice(2)
  .filter((argument) => argument.startsWith("--topic="))
  .map((argument) => argument.slice("--topic=".length).trim().toUpperCase())
  .filter(Boolean));
const isFilteredRun = requestedTopics.size > 0;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  const taxonomyFiles = (await readdir(path.resolve("data/taxonomy"))).filter((file) => file.endsWith(".json"));
  for (const file of isFilteredRun ? [] : taxonomyFiles) {
    const taxonomy = JSON.parse(await readFile(path.resolve("data/taxonomy", file), "utf8"));
    const topic = await client.query('SELECT "id" FROM "Topic" WHERE "code" = $1', [taxonomy.topicCode]);
    if (topic.rowCount !== 1) throw new Error(`Tema ${taxonomy.topicCode} não encontrado. Execute o seed base primeiro.`);
    const topicId = topic.rows[0].id;

    for (const [branchIndex, branch] of taxonomy.branches.entries()) {
      const subtopicId = `subtopic-${taxonomy.topicCode.toLowerCase()}-${branch.slug}`;
      if (!taxonomy.subtopicPrefix) throw new Error(`${file}: subtopicPrefix não definido`);
      const subtopicSlug = `${taxonomy.subtopicPrefix}-${branch.slug}`;
      await client.query(`
        INSERT INTO "Subtopic" ("id", "slug", "name", "topicId") VALUES ($1, $2, $3, $4)
        ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "topicId" = EXCLUDED."topicId"
      `, [subtopicId, subtopicSlug, branch.name, topicId]);
      const branchSlug = `tema-${taxonomy.topicCode.toLowerCase()}-${branch.slug}`;
      const branchId = `node-${stableId(branchSlug)}`;
      await client.query(`
        INSERT INTO "ContentNode" ("id", "slug", "name", "topicId", "depth", "terminal", "sortOrder")
        VALUES ($1, $2, $3, $4, 1, false, $5)
        ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "sortOrder" = EXCLUDED."sortOrder"
      `, [branchId, branchSlug, branch.name, topicId, branchIndex]);

      for (const [conceptIndex, concept] of branch.concepts.entries()) {
        const conceptSlug = `${branchSlug}-${slugify(concept)}`;
        await client.query(`
          INSERT INTO "ContentNode" ("id", "slug", "name", "topicId", "parentId", "depth", "terminal", "sortOrder")
          VALUES ($1, $2, $3, $4, $5, 2, true, $6)
          ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "parentId" = EXCLUDED."parentId", "sortOrder" = EXCLUDED."sortOrder"
        `, [`node-${stableId(conceptSlug)}`, conceptSlug, concept, topicId, branchId, conceptIndex]);
      }
    }
  }

  const questionFiles = (await readdir(path.resolve("data/questions"), { recursive: true })).filter((file) => file.endsWith(".json"));
  let seeded = 0;
  for (const file of questionFiles) {
    const batch = JSON.parse(await readFile(path.resolve("data/questions", file), "utf8"));
    for (const question of batch.questions ?? []) {
      if (isFilteredRun && !requestedTopics.has(question.topicCode)) continue;
      const errors = validateQuestion(question);
      if (errors.length) throw new Error(`${question.id}: ${errors.join("; ")}`);
      const topic = await client.query('SELECT "id" FROM "Topic" WHERE "code" = $1', [question.topicCode]);
      const subtopic = await client.query('SELECT "id" FROM "Subtopic" WHERE "slug" = $1', [question.subtopicSlug]);
      const node = await client.query('SELECT "id" FROM "ContentNode" WHERE "slug" = $1 AND "terminal" = true', [question.contentNodeSlug]);
      if (topic.rowCount !== 1 || subtopic.rowCount !== 1 || node.rowCount !== 1) throw new Error(`${question.id}: referência taxonômica não encontrada`);

      await client.query(`
        INSERT INTO "QuestionFamily" ("id", "code", "name", "angle", "subtopicId", "contentNodeId")
        VALUES ($1, $1, $2, $3, $4, $5)
        ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "angle" = EXCLUDED."angle", "subtopicId" = EXCLUDED."subtopicId", "contentNodeId" = EXCLUDED."contentNodeId"
      `, [question.family.code, question.family.name, question.family.angle, subtopic.rows[0].id, node.rows[0].id]);

      const primarySource = question.sources[0];
      const regulationId = `reg-${stableId(primarySource.authority, primarySource.normNumber, primarySource.versionLabel)}`;
      await client.query(`
        INSERT INTO "RegulationVersion" ("id", "authority", "normNumber", "versionLabel", "officialUrl", "checkedAt")
        VALUES ($1, $2, $3, $4, $5, $6::date)
        ON CONFLICT ("authority", "normNumber", "versionLabel") DO UPDATE SET "officialUrl" = EXCLUDED."officialUrl", "checkedAt" = EXCLUDED."checkedAt"
      `, [regulationId, primarySource.authority, primarySource.normNumber, primarySource.versionLabel, primarySource.url, primarySource.checkedAt]);

      await client.query(`
        INSERT INTO "Question" ("id", "version", "status", "topicId", "subtopicId", "familyId", "familyAngle", "contentNodeId", "difficulty", "questionType", "cognitiveSkill", "tags", "statement", "explanation", "commonTrap", "estimatedTimeSeconds", "calculationRequired", "calculatorAllowed", "sourceConfidence", "qualityScore", "regulationVersion", "lastReviewedAt", "updatedAt")
        VALUES ($1, 1, $2::"QuestionStatus", $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'OFFICIAL', 1.000, $18, $19::date, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status", "subtopicId" = EXCLUDED."subtopicId", "familyId" = EXCLUDED."familyId", "familyAngle" = EXCLUDED."familyAngle", "contentNodeId" = EXCLUDED."contentNodeId", "difficulty" = EXCLUDED."difficulty", "questionType" = EXCLUDED."questionType", "cognitiveSkill" = EXCLUDED."cognitiveSkill", "tags" = EXCLUDED."tags", "statement" = EXCLUDED."statement", "explanation" = EXCLUDED."explanation", "commonTrap" = EXCLUDED."commonTrap", "estimatedTimeSeconds" = EXCLUDED."estimatedTimeSeconds", "calculationRequired" = EXCLUDED."calculationRequired", "calculatorAllowed" = EXCLUDED."calculatorAllowed", "regulationVersion" = EXCLUDED."regulationVersion", "lastReviewedAt" = EXCLUDED."lastReviewedAt", "updatedAt" = CURRENT_TIMESTAMP
      `, [question.id, question.status, topic.rows[0].id, subtopic.rows[0].id, question.family.code, question.family.angle, node.rows[0].id, question.difficulty, question.questionType, question.cognitiveSkill, question.tags, question.statement, question.explanation, question.commonTrap, question.estimatedSeconds, question.requiresCalculation, question.calculatorAllowed, primarySource.normNumber, batch.reviewedAt]);

      await client.query('DELETE FROM "QuestionOption" WHERE "questionId" = $1', [question.id]);
      for (const option of question.options) {
        await client.query(`
          INSERT INTO "QuestionOption" ("id", "stableKey", "text", "isCorrect", "distractorReason", "questionId")
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [`${question.id}-${option.id}`, option.id, option.text, option.isCorrect, option.distractorReason ?? null, question.id]);
      }

      await client.query('DELETE FROM "QuestionSource" WHERE "questionId" = $1', [question.id]);
      for (const source of question.sources) {
        const sourceRegulationId = `reg-${stableId(source.authority, source.normNumber, source.versionLabel)}`;
        await client.query(`
          INSERT INTO "RegulationVersion" ("id", "authority", "normNumber", "versionLabel", "officialUrl", "checkedAt")
          VALUES ($1, $2, $3, $4, $5, $6::date)
          ON CONFLICT ("authority", "normNumber", "versionLabel") DO UPDATE SET "officialUrl" = EXCLUDED."officialUrl", "checkedAt" = EXCLUDED."checkedAt"
        `, [sourceRegulationId, source.authority, source.normNumber, source.versionLabel, source.url, source.checkedAt]);
        await client.query(`
          INSERT INTO "QuestionSource" ("id", "questionId", "regulationVersionId", "locator", "checkedAt")
          VALUES ($1, $2, $3, $4, $5::date)
        `, [`source-${stableId(question.id, sourceRegulationId, source.locator)}`, question.id, sourceRegulationId, source.locator, source.checkedAt]);
      }

      await client.query('DELETE FROM "QuestionReview" WHERE "questionId" = $1 AND "reviewer" = $2', [question.id, "editorial-pipeline-v1"]);
      await client.query(`
        INSERT INTO "QuestionReview" ("id", "questionId", "reviewer", "verdict", "checklist", "notes", "reviewedAt")
        VALUES ($1, $2, 'editorial-pipeline-v1', 'APPROVED', $3::jsonb, $4, $5::date)
      `, [`review-${stableId(question.id, batch.reviewedAt)}`, question.id, JSON.stringify({ fourOptions: true, oneCorrect: true, officialSource: true, locator: true, distractorsExplained: true, taxonomyTerminal: true }), `Lote ${batch.batchId}`, batch.reviewedAt]);
      seeded += 1;
    }
  }
  if (isFilteredRun && seeded === 0) throw new Error(`Nenhuma questão encontrada para os temas: ${[...requestedTopics].join(", ")}`);
  await client.query("COMMIT");
  console.log(JSON.stringify({
    taxonomyFiles: isFilteredRun ? 0 : taxonomyFiles.length,
    questionFiles: questionFiles.length,
    topics: isFilteredRun ? [...requestedTopics] : "all",
    seeded,
  }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
