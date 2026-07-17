import { apiClient } from '@/api/client';

export interface ChronicleEntry {
  id: string;
  title: string;
  content: string;
  entryType: string;
  createdAt: string;
  reviewAt?: string;
  reviewedAt?: string;
}

export interface InsightProfile {
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

export const chronicleApi = {
  // userId 从 JWT 自动获取，前端不再传 query 参数
  listEntries: async (type?: string): Promise<ChronicleEntry[]> => {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    return apiClient.get<ChronicleEntry[]>('/chronicle/entries', params);
  },

  getPendingReviews: async (): Promise<ChronicleEntry[]> => {
    return apiClient.get<ChronicleEntry[]>('/chronicle/reviews/pending');
  },

  getInsights: async (): Promise<InsightProfile | null> => {
    return apiClient.get<InsightProfile | null>('/chronicle/insights');
  },

  generateInsights: async (): Promise<InsightProfile> => {
    return apiClient.post<InsightProfile>('/chronicle/insights/generate');
  },
};
