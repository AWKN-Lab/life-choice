/**
 * P2-2: 反馈 API
 */
import { apiClient } from './client';

export interface FeedbackSubmitParams {
  recordId: string;
  rating: number;
  accuracy?: number;
  helpfulness?: number;
  tone?: number;
  comment?: string;
  isJudgmentCorrect?: boolean;
  calibrationTag?: string;
  calibrationNote?: string;
}

export interface AdminFeedbackRecord {
  id: string;
  recordId: string;
  rating: number;
  accuracy?: number | null;
  helpfulness?: number | null;
  tone?: number | null;
  comment?: string | null;
  isJudgmentCorrect?: boolean | null;
  calibrationTag?: string | null;
  calibrationNote?: string | null;
  appliedAt?: string | null;
  appliedByCronId?: string | null;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'reviewed' | 'applied';
  user: { id: string; email: string | null; nickname: string | null } | null;
  reviewer: { id: string; email: string | null; nickname: string | null } | null;
  record: {
    id: string;
    question: string;
    routeType: string;
    sourceEntry: string | null;
    createdAt: string;
  };
}

export const feedbackApi = {
  /** 提交反馈 */
  async submit(params: FeedbackSubmitParams): Promise<any> {
    return apiClient.post('/feedback', params);
  },

  /** 查询某条记录的反馈 */
  async listByRecord(recordId: string): Promise<any> {
    return apiClient.get(`/feedback/record/${recordId}`);
  },

  async adminList(params?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'reviewed' | 'applied' | 'all';
    rating?: number | 'all';
    routeType?: string;
    hasComment?: boolean;
  }): Promise<{ records: AdminFeedbackRecord[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.limit) query.limit = String(params.limit);
    if (params?.status) query.status = params.status;
    if (params?.rating) query.rating = String(params.rating);
    if (params?.routeType) query.routeType = params.routeType;
    if (typeof params?.hasComment === 'boolean') query.hasComment = String(params.hasComment);
    return apiClient.get('/feedback/admin/list', query);
  },

  async adminReview(
    id: string,
    params: {
      isJudgmentCorrect: boolean;
      calibrationTag: string;
      calibrationNote?: string;
    },
  ): Promise<any> {
    return apiClient.post(`/feedback/${id}/calibrate`, params);
  },

  async adminApply(id: string, cronId?: string): Promise<any> {
    return apiClient.post(`/feedback/${id}/apply`, cronId ? { cronId } : undefined);
  },
};
