import "server-only";

import type { PublicExamBlueprint } from "@/features/exams/blueprint";
import { getDb } from "@/lib/db";

const topicOrder = [
  "I", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "XIII", "XIV", "XV",
];

export async function getCurrentBlueprint(): Promise<PublicExamBlueprint | null> {
  const now = new Date();
  const blueprint = await getDb().examBlueprint.findFirst({
    where: {
      effectiveFrom: { lte: now },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gt: now } },
      ],
    },
    orderBy: { effectiveFrom: "desc" },
    select: {
      version: true,
      questionCount: true,
      durationMinutes: true,
      passingPercentage: true,
      reviewedAt: true,
      officialSourceUrl: true,
      topics: {
        select: {
          topicCode: true,
          questionCount: true,
          minimumCorrect: true,
        },
      },
    },
  });

  if (!blueprint) {
    return null;
  }

  return {
    version: blueprint.version,
    questionCount: blueprint.questionCount,
    durationMinutes: blueprint.durationMinutes,
    passingPercentage: blueprint.passingPercentage,
    reviewedAt: blueprint.reviewedAt.toISOString(),
    officialSourceUrl: blueprint.officialSourceUrl,
    topics: blueprint.topics
      .map((topic) => ({
        code: topic.topicCode,
        questionCount: topic.questionCount,
        minimumCorrect: topic.minimumCorrect,
      }))
      .sort((left, right) => topicOrder.indexOf(left.code) - topicOrder.indexOf(right.code)),
  };
}
