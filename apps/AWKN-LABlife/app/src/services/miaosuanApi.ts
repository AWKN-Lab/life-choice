import { API_BASE_URL } from '@/config';

export interface Scenario {
  name: string;
  probability: string;
  outcome: string;
  risks: string[];
  requirements: string[];
}

export interface MiaosuanRecord {
  id: string;
  type: string;
  title: string;
  scenarios: Scenario[];
  keyFactors: string[];
  blindSpots: string[];
  recommendation: string;
  createdAt: string;
}

export interface MiaosuanRequest {
  type: 'case' | 'person' | 'review';
  title: string;
  content: string;
  consultRecordId?: string;
  personId?: string;
  userId?: string;
}

export const miaosuanApi = {
  create: async (data: MiaosuanRequest): Promise<MiaosuanRecord> => {
    const res = await fetch(`${API_BASE_URL}/miaosuan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Create miaosuan failed');
    return res.json();
  },

  list: async (userId: string): Promise<MiaosuanRecord[]> => {
    const res = await fetch(`${API_BASE_URL}/miaosuan?userId=${userId}`);
    if (!res.ok) throw new Error('List miaosuan failed');
    return res.json();
  },
};
