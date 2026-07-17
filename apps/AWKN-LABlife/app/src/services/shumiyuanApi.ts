import { apiClient } from '@/api/client';

export interface SpeakRequest {
  question: string;
  userId?: string;
}

export interface SpeakResponse {
  recordId: string;
  sessionId: string;
  identifiedType: string;
  relatedPeople: string[];
  userEmotion: string;
  coreStuckPoint: string;
  riskWords: string[];
  options: string[];
  nextStep: string;
}

export interface SpreadCard {
  key: string;
  title: string;
  content: string;
  type: 'default' | 'conditional';
  editable: boolean;
}

export interface SpreadResponse {
  recordId: string;
  cards: SpreadCard[];
  needsPeopleDetail: boolean;
  peopleQuestions?: { question: string; options: string[] }[];
}

export interface BottomResponse {
  recordId: string;
  stuckPoint: string;
  people: string[];
  risks: string[];
  threeWays: string[];
  minStep: string;
  reviewPoint: string;
  dispatchOptions: { key: string; label: string; description: string }[];
}

export const shumiyuanApi = {
  speak: async (data: SpeakRequest): Promise<SpeakResponse> => {
    // JWT 自动注入 userId，前端只需传 question
    const payload = { question: data.question };
    return apiClient.post<SpeakResponse>('/shumiyuan/speak', payload);
  },

  getSpread: async (recordId: string): Promise<SpreadResponse> => {
    return apiClient.get<SpreadResponse>(`/shumiyuan/spread/${recordId}`);
  },

  confirmSpread: async (recordId: string, data: Record<string, any>): Promise<SpreadResponse> => {
    return apiClient.post<SpreadResponse>(`/shumiyuan/spread/${recordId}`, { ...data, confirmed: true });
  },

  getBottom: async (recordId: string): Promise<BottomResponse> => {
    return apiClient.get<BottomResponse>(`/shumiyuan/bottom/${recordId}`);
  },

  dispatch: async (recordId: string, action: string): Promise<{ action: string; redirectTo: string }> => {
    return apiClient.post<{ action: string; redirectTo: string }>(`/shumiyuan/bottom/${recordId}/dispatch`, { action });
  },
};
