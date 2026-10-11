-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'REVIEWED', 'VALIDATED', 'ACTIVE', 'NEEDS_REVIEW', 'ARCHIVED');
CREATE TYPE "SourceConfidence" AS ENUM ('OFFICIAL', 'SECONDARY', 'COMMUNITY');
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');
CREATE TYPE "ExamMode" AS ENUM ('REAL', 'BLINDAGEM', 'TOPIC', 'ERROR_NOTEBOOK', 'QUICK_REVIEW', 'WEAKNESSES');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "examDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subtopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    CONSTRAINT "Subtopic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "topicId" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "commonTrap" TEXT,
    "estimatedTimeSeconds" INTEGER NOT NULL DEFAULT 100,
    "calculationRequired" BOOLEAN NOT NULL DEFAULT false,
    "calculatorAllowed" BOOLEAN NOT NULL DEFAULT false,
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'OFFICIAL',
    "qualityScore" DECIMAL(4,3),
    "regulationVersion" TEXT NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Question_difficulty_check" CHECK ("difficulty" BETWEEN 1 AND 5),
    CONSTRAINT "Question_qualityScore_check" CHECK ("qualityScore" IS NULL OR "qualityScore" BETWEEN 0 AND 1),
    CONSTRAINT "Question_estimatedTimeSeconds_check" CHECK ("estimatedTimeSeconds" > 0)
);

CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "distractorReason" TEXT,
    "questionId" TEXT NOT NULL,
    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegulationVersion" (
    "id" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "normNumber" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "effectiveAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "contentHash" TEXT,
    CONSTRAINT "RegulationVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionSource" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "regulationVersionId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamBlueprint" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "passingPercentage" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "officialSourceUrl" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExamBlueprint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExamBlueprint_questionCount_check" CHECK ("questionCount" > 0),
    CONSTRAINT "ExamBlueprint_durationMinutes_check" CHECK ("durationMinutes" > 0),
    CONSTRAINT "ExamBlueprint_passingPercentage_check" CHECK ("passingPercentage" BETWEEN 0 AND 100)
);

CREATE TABLE "BlueprintTopic" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "topicCode" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "minimumCorrect" INTEGER,
    CONSTRAINT "BlueprintTopic_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BlueprintTopic_counts_check" CHECK (
      "questionCount" > 0 AND
      ("minimumCorrect" IS NULL OR "minimumCorrect" BETWEEN 0 AND "questionCount")
    )
);

CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "mode" "ExamMode" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "randomSeed" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamSessionQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL,
    "questionSnapshot" JSONB NOT NULL,
    "optionOrder" JSONB NOT NULL,
    CONSTRAINT "ExamSessionQuestion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExamSessionQuestion_position_check" CHECK ("position" >= 0),
    CONSTRAINT "ExamSessionQuestion_version_check" CHECK ("questionVersion" > 0)
);

CREATE TABLE "UserAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "elapsedSeconds" INTEGER NOT NULL,
    "answerChanges" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserAnswer_timing_check" CHECK ("elapsedSeconds" >= 0 AND "answerChanges" >= 0)
);

CREATE TABLE "Bookmark" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("userId", "questionId")
);

CREATE TABLE "CandidateConfusion" (
    "id" TEXT NOT NULL,
    "topicCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "sourceType" "SourceConfidence" NOT NULL DEFAULT 'COMMUNITY',
    "sourceUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "editorialNotes" TEXT,
    CONSTRAINT "CandidateConfusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Topic_code_key" ON "Topic"("code");
CREATE UNIQUE INDEX "Subtopic_slug_key" ON "Subtopic"("slug");
CREATE INDEX "Question_status_topicId_difficulty_idx" ON "Question"("status", "topicId", "difficulty");
CREATE INDEX "Question_familyId_idx" ON "Question"("familyId");
CREATE UNIQUE INDEX "QuestionOption_questionId_stableKey_key" ON "QuestionOption"("questionId", "stableKey");
CREATE UNIQUE INDEX "RegulationVersion_authority_normNumber_versionLabel_key" ON "RegulationVersion"("authority", "normNumber", "versionLabel");
CREATE UNIQUE INDEX "ExamBlueprint_version_key" ON "ExamBlueprint"("version");
CREATE UNIQUE INDEX "BlueprintTopic_blueprintId_topicCode_key" ON "BlueprintTopic"("blueprintId", "topicCode");
CREATE UNIQUE INDEX "ExamSessionQuestion_sessionId_position_key" ON "ExamSessionQuestion"("sessionId", "position");
CREATE UNIQUE INDEX "ExamSessionQuestion_sessionId_questionId_key" ON "ExamSessionQuestion"("sessionId", "questionId");
CREATE UNIQUE INDEX "UserAnswer_sessionId_questionId_key" ON "UserAnswer"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "Subtopic" ADD CONSTRAINT "Subtopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "Subtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionSource" ADD CONSTRAINT "QuestionSource_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionSource" ADD CONSTRAINT "QuestionSource_regulationVersionId_fkey" FOREIGN KEY ("regulationVersionId") REFERENCES "RegulationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlueprintTopic" ADD CONSTRAINT "BlueprintTopic_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ExamBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "ExamBlueprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamSessionQuestion" ADD CONSTRAINT "ExamSessionQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSessionQuestion" ADD CONSTRAINT "ExamSessionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
