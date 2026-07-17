import { apiClient } from '@/api/client';

export interface Person {
  id: string;
  name?: string;
  relationType?: string;
  importance: string;
  currentStatus?: string;
  riskTags: string[];
  currentAdvice?: string;
  completeness: number;
  _count?: { relatedCases: number };
}

export interface NetworkData {
  nodes: {
    id: string;
    name: string;
    relationType: string;
    importance: string;
    currentStatus: string;
    riskTags: string[];
    currentAdvice: string;
    completeness: number;
  }[];
  edges: { source: string; target: string; relation: string }[];
  center: string;
}

export const starChartApi = {
  listPersons: async (filter?: string): Promise<Person[]> => {
    const params: Record<string, string> = {};
    if (filter) params.filter = filter;
    return apiClient.get<Person[]>('/star-chart/persons', params);
  },

  getNetwork: async (): Promise<NetworkData> => {
    return apiClient.get<NetworkData>('/star-chart/network');
  },

  getNetworkStats: async () => {
    return apiClient.get<{ total: number; critical: number; withRisk: number; avgCompleteness: number }>('/star-chart/network/stats');
  },
};
