/**
 * KlineProductViewModelV2 — 前端本地副本
 *
 * 此文件是 apps/AWKN-LABlife/shared-types/kline-v2.ts 的前端副本，
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
    career?: KlinePoint[];
    wealth?: KlinePoint[];
    relationship?: KlinePoint[];
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
// 中文标签映射（前端 UI 文案统一来源）
// ============================================================

/** 阶段标签：accumulate→蓄势, advance→推进, turn→转折, defend→防守, unknown→待定 */
export const STAGE_LABELS: Record<KlineProductViewModelV2['current']['stage'], string> = {
  accumulate: '蓄势',
  advance: '推进',
  turn: '转折',
  defend: '防守',
  unknown: '待定',
};

/** 趋势标签：up→向上, sideways→震荡, down→向下, unknown→待定 */
export const TREND_LABELS: Record<KlineProductViewModelV2['current']['trend'], string> = {
  up: '向上',
  sideways: '震荡',
  down: '向下',
  unknown: '待定',
};

/** 节点类型标签：opportunity→机会, risk→风险, turn→转折 */
export const NODE_TYPE_LABELS: Record<KlineNode['nodeType'], string> = {
  opportunity: '机会',
  risk: '风险',
  turn: '转折',
};

/** 数据来源标签 */
export const DATA_SOURCE_LABELS: Record<KlineDataSource, string> = {
  calculated: '已计算',
  user_reported: '用户填报',
  llm_narrative: 'LLM推导',
  simulated: '模拟数据',
  fallback: '降级数据',
  unknown: '未知来源',
};
