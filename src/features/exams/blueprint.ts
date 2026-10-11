export type PublicBlueprintTopic = {
  code: string;
  questionCount: number;
  minimumCorrect: number | null;
};

export type PublicExamBlueprint = {
  version: string;
  questionCount: number;
  durationMinutes: number;
  passingPercentage: number;
  reviewedAt: string;
  officialSourceUrl: string;
  topics: PublicBlueprintTopic[];
};
