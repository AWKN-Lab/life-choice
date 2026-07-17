export class CreateEntryDto {
  title: string;
  content: string;
  entryType?: 'case' | 'person' | 'review';
  consultRecordId?: string;
  personId?: string;
  userId?: string;
}

export class ReviewEntryDto {
  initialView: string;
  whatHappened: string;
  gotRight: string;
  gotWrong: string;
  nextReminder: string;
  reviewAt?: Date;
}

export class InsightProfileDto {
  commonStuckPoints: string[];
  riskPreference: string;
  relationshipHabits: string[];
  misjudgmentPatterns: string[];
  commonTriggers: string[];
  longTermTrend: string;
  totalEntries: number;
  totalReviews: number;
  accuracyRate?: number;
}
