ALTER TABLE "ExamSession" ADD COLUMN "durationMinutes" INTEGER;

UPDATE "ExamSession" AS session
SET "durationMinutes" = CASE
  WHEN session."mode"::TEXT IN ('QUICK_REVIEW', 'ERROR_NOTEBOOK', 'FAVORITES', 'SPACED_REVIEW') THEN 10
  ELSE blueprint."durationMinutes"
END
FROM "ExamBlueprint" AS blueprint
WHERE blueprint."id" = session."blueprintId";

ALTER TABLE "ExamSession" ALTER COLUMN "durationMinutes" SET NOT NULL;
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_durationMinutes_check"
  CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 180);
