ALTER TABLE "RegulationVersion" ADD COLUMN "effectiveUntil" TIMESTAMP(3);

ALTER TABLE "Question"
  ADD COLUMN "contentNodeId" TEXT,
  ADD COLUMN "cognitiveSkill" TEXT NOT NULL DEFAULT 'APPLICATION',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "CandidateConfusion"
  ADD COLUMN "subtopicSlug" TEXT,
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM';

CREATE TABLE "ContentNode" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "parentId" TEXT,
  "depth" INTEGER NOT NULL,
  "terminal" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ContentNode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentNode_depth_check" CHECK ("depth" >= 1)
);

CREATE TABLE "QuestionFamily" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "subtopicId" TEXT NOT NULL,
  "contentNodeId" TEXT,
  CONSTRAINT "QuestionFamily_pkey" PRIMARY KEY ("id")
);

INSERT INTO "QuestionFamily" ("id", "code", "name", "angle", "subtopicId")
SELECT DISTINCT q."familyId", q."familyId", q."familyId", 'legacy-pilot', q."subtopicId"
FROM "Question" q;

CREATE TABLE "QuestionReview" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "reviewer" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "checklist" JSONB NOT NULL,
  "notes" TEXT,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionExposure" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionExposure_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuestionExposure_position_check" CHECK ("position" >= 0)
);

INSERT INTO "QuestionExposure" ("id", "userId", "questionId", "sessionId", "position", "seenAt")
SELECT 'exposure-' || item."id", session."userId", item."questionId", item."sessionId", item."position", session."startedAt"
FROM "ExamSessionQuestion" item
JOIN "ExamSession" session ON session."id" = item."sessionId";

CREATE UNIQUE INDEX "ContentNode_slug_key" ON "ContentNode"("slug");
CREATE INDEX "ContentNode_topicId_parentId_sortOrder_idx" ON "ContentNode"("topicId", "parentId", "sortOrder");
CREATE INDEX "ContentNode_topicId_terminal_idx" ON "ContentNode"("topicId", "terminal");
CREATE UNIQUE INDEX "QuestionFamily_code_key" ON "QuestionFamily"("code");
CREATE INDEX "QuestionFamily_subtopicId_idx" ON "QuestionFamily"("subtopicId");
CREATE INDEX "QuestionFamily_contentNodeId_idx" ON "QuestionFamily"("contentNodeId");
CREATE INDEX "Question_contentNodeId_idx" ON "Question"("contentNodeId");
CREATE INDEX "QuestionReview_questionId_reviewedAt_idx" ON "QuestionReview"("questionId", "reviewedAt");
CREATE UNIQUE INDEX "QuestionExposure_sessionId_questionId_key" ON "QuestionExposure"("sessionId", "questionId");
CREATE INDEX "QuestionExposure_userId_seenAt_idx" ON "QuestionExposure"("userId", "seenAt");
CREATE INDEX "QuestionExposure_userId_questionId_seenAt_idx" ON "QuestionExposure"("userId", "questionId", "seenAt");

ALTER TABLE "ContentNode" ADD CONSTRAINT "ContentNode_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentNode" ADD CONSTRAINT "ContentNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionFamily" ADD CONSTRAINT "QuestionFamily_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionFamily" ADD CONSTRAINT "QuestionFamily_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "QuestionFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_contentNodeId_fkey" FOREIGN KEY ("contentNodeId") REFERENCES "ContentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionReview" ADD CONSTRAINT "QuestionReview_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionExposure" ADD CONSTRAINT "QuestionExposure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionExposure" ADD CONSTRAINT "QuestionExposure_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionExposure" ADD CONSTRAINT "QuestionExposure_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
