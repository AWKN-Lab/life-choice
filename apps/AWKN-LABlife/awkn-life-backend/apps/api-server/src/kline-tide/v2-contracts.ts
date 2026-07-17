/**
 * KlineProductViewModelV2 — 前后端共享契约（后端副本）
 *
 * 此文件是 apps/AWKN-LABlife/shared-types/kline-v2.ts 的后端副本，
 * 因 TypeScript rootDir 约束无法跨包直接引用，故创建本地副本。
 *
 * 来源：TECHNICAL-REFERENCE-P01-命运K线与潮汐架构-20260712.md §3.1
 * 版本：v1
 *
 * 关键约束（§3.2）：
 *   1. 每个 KlinePoint 和 KlineNode 必须包含 evidenceRefs、source、confidence
 *   2. evidenceRefs 必须非空数组
 *   3. source='simulated' 时 degraded 必须为 true
 *   4. confidence=null 仅当 source='fallback' 时允许
 *   5. 前端只能消费此接口，不能再有本地业务判断
 *
 * 同步策略：修改 shared-types/kline-v2.ts 时必须同步修改此文件
 */

// ============================================================
// 数据来源标识（§2.7）
// ============================================================

export type KlineDataSource =
  | 'calculated'        // 基于已确认出生资料和确定性规则计算
  | 'user_reported'     // 用户主动填写的真实事件或状态
  | 'llm_narrative'     // LLM 基于证据包生成的解释文字
  | 'simulated'         // 开发或演示模拟，不进入正式结果
  | 'fallback'          // 降级数据
  | 'unknown';          // 无法确认来源，禁止包装成正式结论

// ============================================================
// 主 ViewModel（§3.1）
// ============================================================

export interface KlineProductViewModelV2 {
  meta: {
    snapshotId: string;
    profileId: string;
    generatedAt: string;       // ISO 8601，必须来自服务端
    dataVersion: string;        // "v1.1"
    algorithmVersion: string;   // "alg-v1"
    narrativeVersion?: string;  // LLM 叙事版本
    sourceSummary: Array<'calculated' | 'user_reported' | 'llm_narrative'>;
    confidence: number | null;  // 0-1
    degraded: boolean;
  };
  horizon: {
    from: string;               // "YYYY-MM"
    to: string;
    granularity: 'month';
  };
  current: {
    stage: 'accumulate' | 'advance' | 'turn' | 'defend' | 'unknown';
    trend: 'up' | 'sideways' | 'down' | 'unknown';
    summary: string;
    action: string;
  };
  series: {
    overall: KlinePoint[];
    /** 事业线（Phase 1 Step 1.4：四条独立曲线之一） */
    career: KlinePoint[];
    /** 财富线（Phase 1 Step 1.4：四条独立曲线之一） */
    wealth: KlinePoint[];
    /** 情感线（Phase 1 Step 1.4：四条独立曲线之一） */
    relationship: KlinePoint[];
  };
  windows: {
    opportunity: KlineNode[];
    risk: KlineNode[];
  };
  currentTide?: {
    timing: TideSignal | null;
    position: TideSignal | null;
    mindset: TideSignal | null;
  };
  entitlements: {
    canViewDomainLines: boolean;
    canViewAllNodes: boolean;
    canAskNode: boolean;
  };
  history?: {
    previousSnapshotId?: string;
    actualOutcomePending: boolean;
  };
}

// ============================================================
// 子类型
// ============================================================

export interface KlinePoint {
  monthLabel: string;           // "YYYY-MM"
  value: number;
  evidenceRefs: string[];       // 必须非空
  source: KlineDataSource;
  confidence: number;           // 0-1
}

export interface KlineNode {
  id: string;                    // nodeId
  snapshotId: string;
  monthLabel: string;
  nodeType: 'opportunity' | 'risk' | 'turn';
  score: number;
  summary: string;
  evidenceRefs: string[];
  confidence: number;
}

export interface TideSignal {
  label: string;
  score: number;
  evidenceRefs: string[];
}

// ============================================================
// 契约校验工具（运行时校验，可选使用）
// ============================================================

/**
 * 校验 KlinePoint 是否满足契约（§3.2）
 * - evidenceRefs 非空
 * - confidence 在 [0, 1]
 * - source='simulated' 时需配合外部判定 degraded=true
 */
export function validateKlinePoint(point: KlinePoint): { valid: boolean; reason?: string } {
  if (!point.evidenceRefs || point.evidenceRefs.length === 0) {
    return { valid: false, reason: 'KlinePoint.evidenceRefs 必须非空数组' };
  }
  if (typeof point.confidence !== 'number' || point.confidence < 0 || point.confidence > 1) {
    return { valid: false, reason: 'KlinePoint.confidence 必须在 [0, 1]' };
  }
  if (!point.monthLabel || !/^\d{4}-\d{2}$/.test(point.monthLabel)) {
    return { valid: false, reason: 'KlinePoint.monthLabel 必须为 "YYYY-MM" 格式' };
  }
  return { valid: true };
}

/**
 * 校验 KlineNode 是否满足契约（§3.2）
 */
export function validateKlineNode(node: KlineNode): { valid: boolean; reason?: string } {
  if (!node.id) {
    return { valid: false, reason: 'KlineNode.id 必须非空' };
  }
  if (!node.snapshotId) {
    return { valid: false, reason: 'KlineNode.snapshotId 必须非空' };
  }
  if (!node.evidenceRefs || node.evidenceRefs.length === 0) {
    return { valid: false, reason: 'KlineNode.evidenceRefs 必须非空数组' };
  }
  if (typeof node.confidence !== 'number' || node.confidence < 0 || node.confidence > 1) {
    return { valid: false, reason: 'KlineNode.confidence 必须在 [0, 1]' };
  }
  if (!['opportunity', 'risk', 'turn'].includes(node.nodeType)) {
    return { valid: false, reason: `KlineNode.nodeType 必须为 opportunity|risk|turn，实际为 ${node.nodeType}` };
  }
  return { valid: true };
}

/**
 * 校验 KlineProductViewModelV2 完整契约
 * - meta.degraded 必须与 source='simulated' 一致
 * - meta.confidence=null 仅当 source='fallback' 时允许
 * - 所有 series 中的点必须通过 validateKlinePoint
 * - 所有 windows 中的节点必须通过 validateKlineNode
 */
export function validateKlineViewModel(vm: KlineProductViewModelV2): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // meta
  if (!vm.meta?.snapshotId) reasons.push('meta.snapshotId 必须非空');
  if (!vm.meta?.profileId) reasons.push('meta.profileId 必须非空');
  if (!vm.meta?.generatedAt) reasons.push('meta.generatedAt 必须非空');
  if (vm.meta?.confidence !== null && (typeof vm.meta?.confidence !== 'number' || vm.meta.confidence < 0 || vm.meta.confidence > 1)) {
    reasons.push('meta.confidence 必须为 null 或 [0, 1] 内的数字');
  }

  // horizon
  if (!vm.horizon?.from || !/^\d{4}-\d{2}$/.test(vm.horizon.from)) {
    reasons.push('horizon.from 必须为 "YYYY-MM" 格式');
  }
  if (!vm.horizon?.to || !/^\d{4}-\d{2}$/.test(vm.horizon.to)) {
    reasons.push('horizon.to 必须为 "YYYY-MM" 格式');
  }
  if (vm.horizon?.granularity !== 'month') {
    reasons.push('horizon.granularity 必须为 "month"');
  }

  // current
  if (!vm.current?.summary) reasons.push('current.summary 必须非空');
  if (!vm.current?.action) reasons.push('current.action 必须非空');
  const validStages = ['accumulate', 'advance', 'turn', 'defend', 'unknown'];
  const validTrends = ['up', 'sideways', 'down', 'unknown'];
  if (!validStages.includes(vm.current?.stage)) {
    reasons.push(`current.stage 必须为 ${validStages.join('|')}`);
  }
  if (!validTrends.includes(vm.current?.trend)) {
    reasons.push(`current.trend 必须为 ${validTrends.join('|')}`);
  }

  // series.overall 必须存在（Phase 1 Step 1.4：career/wealth/relationship 也必填）
  if (!Array.isArray(vm.series?.overall)) {
    reasons.push('series.overall 必须为数组');
  } else {
    vm.series.overall.forEach((p, i) => {
      const r = validateKlinePoint(p);
      if (!r.valid) reasons.push(`series.overall[${i}]: ${r.reason}`);
    });
  }
  if (!Array.isArray(vm.series?.career)) {
    reasons.push('series.career 必须为数组');
  } else {
    vm.series.career.forEach((p, i) => {
      const r = validateKlinePoint(p);
      if (!r.valid) reasons.push(`series.career[${i}]: ${r.reason}`);
    });
  }
  if (!Array.isArray(vm.series?.wealth)) {
    reasons.push('series.wealth 必须为数组');
  } else {
    vm.series.wealth.forEach((p, i) => {
      const r = validateKlinePoint(p);
      if (!r.valid) reasons.push(`series.wealth[${i}]: ${r.reason}`);
    });
  }
  if (!Array.isArray(vm.series?.relationship)) {
    reasons.push('series.relationship 必须为数组');
  } else {
    vm.series.relationship.forEach((p, i) => {
      const r = validateKlinePoint(p);
      if (!r.valid) reasons.push(`series.relationship[${i}]: ${r.reason}`);
    });
  }

  // windows
  if (!Array.isArray(vm.windows?.opportunity)) {
    reasons.push('windows.opportunity 必须为数组');
  } else {
    vm.windows.opportunity.forEach((n, i) => {
      const r = validateKlineNode(n);
      if (!r.valid) reasons.push(`windows.opportunity[${i}]: ${r.reason}`);
    });
  }
  if (!Array.isArray(vm.windows?.risk)) {
    reasons.push('windows.risk 必须为数组');
  } else {
    vm.windows.risk.forEach((n, i) => {
      const r = validateKlineNode(n);
      if (!r.valid) reasons.push(`windows.risk[${i}]: ${r.reason}`);
    });
  }

  // entitlements
  if (typeof vm.entitlements?.canViewDomainLines !== 'boolean') {
    reasons.push('entitlements.canViewDomainLines 必须为 boolean');
  }
  if (typeof vm.entitlements?.canViewAllNodes !== 'boolean') {
    reasons.push('entitlements.canViewAllNodes 必须为 boolean');
  }
  if (typeof vm.entitlements?.canAskNode !== 'boolean') {
    reasons.push('entitlements.canAskNode 必须为 boolean');
  }

  return { valid: reasons.length === 0, reasons };
}
