ALTER TABLE "Question"
  ADD COLUMN "familyAngle" TEXT;

UPDATE "Question" AS question
SET "familyAngle" = family."angle"
FROM "QuestionFamily" AS family
WHERE family."id" = question."familyId";

UPDATE "Question"
SET "familyAngle" = 'legacy'
WHERE "familyAngle" IS NULL;

ALTER TABLE "Question"
  ALTER COLUMN "familyAngle" SET NOT NULL,
  ALTER COLUMN "familyAngle" SET DEFAULT 'legacy';
