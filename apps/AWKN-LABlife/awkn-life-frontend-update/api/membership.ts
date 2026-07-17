/**
 * 会员 API 客户端 - 新增
 */
import apiClient from './client';

const MEMBERSHIP_BASE = '/membership';

export interface MembershipPlan {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  features: string[];
  highlight?: string;
}

export interface CurrentMembership {
  membershipId: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  expireDate?: string;
  features: string[];
}

export interface UnlockResult {
  success: boolean;
  reason?: string;
  requiredPlan?: string;
}

export const membershipApi = {
  getPlans: async (): Promise<MembershipPlan[]> => {
    return apiClient.get<MembershipPlan[]>(`${MEMBERSHIP_BASE}/plans`);
  },

  getPlan: async (planId: string): Promise<MembershipPlan> => {
    return apiClient.get<MembershipPlan>(`${MEMBERSHIP_BASE}/plans/${planId}`);
  },

  getCurrentMembership: async (): Promise<CurrentMembership | null> => {
    return apiClient.get<CurrentMembership | null>(`${MEMBERSHIP_BASE}/current`);
  },

  activateMembership: async (planId: string, orderId?: string): Promise<{
    membershipId: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    expireDate?: string;
  }> => {
    return apiClient.post(`${MEMBERSHIP_BASE}/activate`, { planId, orderId });
  },

  unlockModule: async (moduleId: string, recordId?: string): Promise<UnlockResult> => {
    return apiClient.post<UnlockResult>(`${MEMBERSHIP_BASE}/unlock`, {
      moduleId,
      recordId,
    });
  },

  checkAccess: async (moduleId: string): Promise<{ hasAccess: boolean }> => {
    return apiClient.get<{ hasAccess: boolean }>(`${MEMBERSHIP_BASE}/check/${moduleId}`);
  },

  getMembershipHistory: async () => {
    return apiClient.get(`${MEMBERSHIP_BASE}/history`);
  },

  cancelMembership: async (membershipId: string) => {
    return apiClient.post(`${MEMBERSHIP_BASE}/cancel/${membershipId}`, {});
  },
};