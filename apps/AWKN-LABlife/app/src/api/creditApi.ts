/**
 * 积分 API 客户端
 * 封装 /membership/credit/* 端点
 */
import { apiClient } from './client';

const CREDIT_BASE = '/membership/credit';

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  moduleId?: string | null;
  recordId?: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface CreditBalanceResponse {
  balance: number;
  recentTransactions: CreditTransaction[];
}

export interface CreditHistoryResponse {
  items: CreditTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ModuleCreditCosts {
  [moduleId: string]: number;
}

export const creditApi = {
  /** 获取积分余额 + 最近 10 条流水 */
  getBalance: async (): Promise<CreditBalanceResponse> => {
    return apiClient.get<CreditBalanceResponse>(`${CREDIT_BASE}/balance`);
  },

  /** 获取积分流水（分页） */
  getHistory: async (page = 1, pageSize = 20): Promise<CreditHistoryResponse> => {
    return apiClient.get<CreditHistoryResponse>(
      `${CREDIT_BASE}/history`,
      { page: String(page), pageSize: String(pageSize) },
    );
  },

  /** 获取所有模块的积分成本 */
  getCosts: async (): Promise<ModuleCreditCosts> => {
    return apiClient.get<ModuleCreditCosts>(`${CREDIT_BASE}/costs`);
  },
};

/** 积分原因中文映射 */
export const CREDIT_REASON_LABELS: Record<string, string> = {
  register_bonus: '注册赠送',
  module_unlock: '模块解锁',
  admin_auto_topup: '管理员充值',
  refund_breakthrough_timeout: '超时退款',
  profile_completion: '完善资料',
  invite_reward: '邀请奖励',
  referred_bonus: '被邀请奖励',
};
