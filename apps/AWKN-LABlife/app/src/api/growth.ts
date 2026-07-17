/**
 * Growth API - 增长专题页相关接口
 */
import { apiClient } from './client';

export interface InviteStats {
  code: string | null;
  usedCount: number;
  currentTier: string;
  nextTier: string | null;
  nextReward: string | null;
  nextThreshold: number | null;
  referrals: number;
  // P2-3: 3级裂变统计
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalChainCount: number;
}

export interface ReferralRewards {
  l1Reward: number;
  l2Reward: number;
  l3Reward: number;
  totalReward: number;
}

export interface GrowthOffer {
  id: string;
  offerType: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeColor: string;
  ctaText: string;
  action: string;
  discount: string | null;
  expireAt: string; // ISO string
}

export const growthApi = {
  /** 获取邀请码 */
  getInviteCode: () =>
    apiClient.get<{ code: string }>('/growth/invite-code'),

  /** 获取邀请统计 */
  getInviteStats: () =>
    apiClient.get<InviteStats>('/growth/invite-stats'),

  /** 记录回流访问（无需登录） */
  recordReferral: (params: {
    inviteCode: string;
    source?: string;
    medium?: string;
    campaign?: string;
  }) =>
    apiClient.post<{ success: boolean; referralId?: string }>(
      '/growth/referral/record',
      params,
    ),

  /** 获取当前有效优惠 */
  getActiveOffers: () =>
    apiClient.get<{ offers: GrowthOffer[] }>('/growth/offers'),

  // P2-3: 海报裂变

  /** 记录海报分享（含3级链路） */
  recordPosterShare: (params: {
    inviteCode: string;
    source: string;
    medium?: string;
    campaign?: string;
    parentReferralId?: string;
  }) =>
    apiClient.post<{ success: boolean; referralId?: string }>(
      '/growth/poster-share',
      params,
    ),

  /** 获取3级返利统计 */
  getReferralRewards: () =>
    apiClient.get<ReferralRewards>('/growth/referral-rewards'),
};
