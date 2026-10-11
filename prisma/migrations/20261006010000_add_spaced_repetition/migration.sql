ALTER TYPE "ExamMode" ADD VALUE IF NOT EXISTS 'SPACED_REVIEW';

CREATE TABLE "UserQuestionReview" (
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "repetitions" INTEGER NOT NULL DEFAULT 0,
  "intervalDays" INTEGER NOT NULL DEFAULT 1,
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "lastReviewedAt" TIMESTAMP(3) NOT NULL,
  "lastCorrect" BOOLEAN NOT NULL,
  CONSTRAINT "UserQuestionReview_pkey" PRIMARY KEY ("userId", "questionId")
);

CREATE INDEX "UserQuestionReview_userId_dueAt_idx" ON "UserQuestionReview"("userId", "dueAt");

ALTER TABLE "UserQuestionReview" ADD CONSTRAINT "UserQuestionReview_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserQuestionReview" ADD CONSTRAINT "UserQuestionReview_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
