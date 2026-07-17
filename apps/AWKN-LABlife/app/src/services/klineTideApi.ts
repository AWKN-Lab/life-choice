// 人生K线 + 潮汐图 API（需要认证，使用 apiClient）
import { apiClient } from '@/api/client';
import type { MonthlyKlineBar, StateSnapshot, PhasePoint } from '../types/lifekline';

/** 时·位·心 三组判断（B-S2 2026-07-05 接入 TideJudgmentService） */
export interface GroupJudgment {
  score: number;
  level: 'high' | 'mid' | 'low';
  label: string;
}

/** 潮汐判断结果（基于最新 StateSnapshot 生成） */
export interface TideJudgment {
  timeStatus: GroupJudgment;
  positionStatus: GroupJudgment;
  mindStatus: GroupJudgment;
  phaseJudgment: string;
  shortDirective: string;
  windowTip: string;
  actionAdvice: string;
}

export interface TidePackage {
  klineBars: MonthlyKlineBar[];
  stateSnapshots: StateSnapshot[];
  phasePoints: PhasePoint[];
  /** 潮汐判断（时·位·心 三组 + 阶段 + 短指令）— B-S2 2026-07-05 */
  tideJudgment?: TideJudgment;
  meta: {
    generatedAt: string;
    startYear?: number;
    startMonth?: number;
    klineMonths?: number;
    tideMonths?: number;
    userId?: string;
    from?: string;
    to?: string;
    note: string;
    /** 数据来源标识（Step 12 - P0治理 2026-07-03） */
    source?: 'real' | 'simulated' | 'llm_inferred' | 'fallback';
  };
}

/** 门控响应（积分不足或未登录时后端返回） */
export interface GatedResponse {
  gated: true;
  moduleId: string;
  creditsNeeded: number;
  creditBalance?: number;
  requiredPlan?: string;
  message?: string;
}

/** fetchPackage 可能返回正常数据或门控响应 */
export type TidePackageResult = TidePackage | GatedResponse;

/** P1-T2.3: 三线命理评分结果 */
export interface LineScore {
  dimension: 'career' | 'wealth' | 'relationship';
  score: number | null;
  reasoning: string;
  factors: Array<{
    name: string;
    type: 'shiShen' | 'shenSha' | 'xiYong' | 'shenWang';
    impact: number;
    source?: string;
  }>;
  riskHint?: string;
}

export interface ScoresResponse {
  career: LineScore;
  wealth: LineScore;
  relationship: LineScore;
  source: 'bazi' | 'fallback';
  scoredAt: string;
  gated?: false | 'preview';
  moduleId?: string;
  creditsNeeded?: number;
  creditBalance?: number;
  requiredPlan?: string;
  message?: string;
}

export const klineTideApi = {
  /** 获取K线数据 */
  fetchBars: (params?: { startYear?: number; startMonth?: number; months?: number }): Promise<MonthlyKlineBar[]> =>
    apiClient.get<MonthlyKlineBar[]>('/kline-tide/bars', params as Record<string, string>),

  /** 获取状态快照 */
  fetchSnapshots: (params?: { startYear?: number; startMonth?: number; months?: number }): Promise<StateSnapshot[]> =>
    apiClient.get<StateSnapshot[]>('/kline-tide/snapshots', params as Record<string, string>),

  /** 获取相位空间点 */
  fetchPhasePoints: (params?: { startYear?: number; startMonth?: number; months?: number }): Promise<PhasePoint[]> =>
    apiClient.get<PhasePoint[]>('/kline-tide/phase-points', params as Record<string, string>),

  /** 一次性获取完整潮汐数据（可能返回门控响应） */
  fetchPackage: (params?: { startYear?: number; startMonth?: number; klineMonths?: number; tideMonths?: number }): Promise<TidePackageResult> =>
    apiClient.get<TidePackageResult>('/kline-tide/package', params as Record<string, string>),

  /** P1-T2.3: 获取三线命理评分（免费用户仅返回事业线，会员返回全部） */
  fetchScores: (): Promise<ScoresResponse> =>
    apiClient.get<ScoresResponse>('/kline-tide/scores'),
};
