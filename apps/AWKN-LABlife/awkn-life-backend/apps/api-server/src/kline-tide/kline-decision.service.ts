/**
 * KlineDecisionService v2 — P1-05 (2026-07-12)
 *
 * 唯一产品判断服务（V2 契约 §3.1）：
 *   - 阶段（accumulate/advance/turn/defend/unknown）
 *   - 趋势（up/sideways/down/unknown）
 *   - 节点（opportunity/risk/turn）— 唯一来源
 *   - 行动偏向（expand/probe/repair/hold）
 *
 * 不可破坏的约束：
 *   1. 所有节点 evidenceRefs 必须非空（factor-registry.buildEvidenceRefs）
 *   2. 不调用 LLM、不读 DB、不生成数值（数值由 KlineCalculationEngine 提供）
 *   3. 仅消费 KlineBarV2[]（不再消费旧 KlinePoint）
 *   4. 阶段判定不能依赖未来数据（不能用 look-ahead bias）
 *
 * 旧 6 态方法保留但标记 @deprecated（P1-08 后页面不再调用）
 */
import { Injectable, Logger } from '@nestjs/common';
import { KlineBarV2 } from './kline-calculation.engine';
import {
  buildEvidenceRefs,
  validateEvidenceRefs,
  FACTOR_REGISTRY_VERSION,
} from './factor-registry';

// ============================================================
// V2 类型定义（对齐 §3.1 KlineProductViewModelV2.current 与 windows）
// ============================================================

export type V2Stage = 'accumulate' | 'advance' | 'turn' | 'defend' | 'unknown';
export type V2Trend = 'up' | 'sideways' | 'down' | 'unknown';
export type V2ActionBias = 'expand' | 'probe' | 'repair' | 'hold';
export type V2NodeType = 'opportunity' | 'risk' | 'turn';

/** V2 节点（对齐 KlineNode schema 与 §3.1 KlineNode 接口） */
export interface V2KlineNode {
  id: string;
  snapshotId: string;
  monthLabel: string;
  nodeType: V2NodeType;
  score: number;
  summary: string;
  evidenceRefs: string[];
  confidence: number;
}

/** V2 当前阶段判断 */
export interface V2CurrentStage {
  stage: V2Stage;
  trend: V2Trend;
  summary: string;
  action: string;
  actionBias: V2ActionBias;
}

/** V2 完整决策结果 */
export interface V2DecisionResult {
  current: V2CurrentStage;
  windows: {
    opportunity: V2KlineNode[];
    risk: V2KlineNode[];
    turn: V2KlineNode[];
  };
  meta: {
    algorithmVersion: string;
    factorRegistryVersion: string;
    barsAnalyzed: number;
  };
}

// ============================================================
// 旧类型（@deprecated — P1-08 后页面不再调用）
// ============================================================

/** @deprecated 使用 KlineBarV2 替代 */
interface KlinePoint {
  year: number;
  month: number;
  monthLabel: string;
  compositeCapital: number;
  volatility: number;
  career?: { close: number };
  wealth?: { close: number };
  health?: { close: number };
}

/** @deprecated */
interface KlineBundle {
  points: KlinePoint[];
  meta: { currentAge: number; currentDaYun: string; birthDate: string };
  viewMode: 'trend' | 'detail' | 'comparison';
  bestWindow: { start: string; end: string; reason: string };
  riskWindow: { start: string; end: string; reason: string };
  factorBreakdown?: Array<{ name: string; score: number; weight: number }>;
}

// ============================================================
// 阈值常量（命名后便于 P4 算法校准）
// ============================================================

const STAGE_THRESHOLD_HIGH = 70; // close >= 70 视为高位
const STAGE_THRESHOLD_LOW = 45; // close < 45 视为低位
const STAGE_TREND_WINDOW = 3; // 最近 3 条 bar 判定趋势
const NODE_DEVIATION_MULTIPLE = 1.2; // 偏离均值 1.2 倍标准差触发节点
const NODE_MIN_GAP_MONTHS = 2; // Phase 1 Step 1.5：同类型节点最小间隔月份（6→2）
const NODE_MAX_PER_TYPE = 3; // Phase 1 Step 1.5：每类节点最大数量
const NODE_MIN_CONFIDENCE = 0.65; // Phase 1 Step 1.5：节点最低置信度
const CONFIDENCE_BASE = 0.7; // 节点置信度基准
const CONFIDENCE_STEP = 0.05; // 每多一档偏离增加 0.05

const V2_ACTION_BIAS: Record<V2Stage, V2ActionBias> = {
  accumulate: 'probe', // 蓄势：试探
  advance: 'expand', // 上升：扩张
  turn: 'hold', // 转折：观望
  defend: 'repair', // 防御：修复
  unknown: 'hold',
};

const V2_ACTION_TEXT: Record<V2Stage, string> = {
  accumulate: '蓄势阶段：可试探小步行动，准备机会窗口',
  advance: '上升阶段：可推进关键决策，把握扩张机会',
  turn: '转折阶段：暂缓重大决策，观察方向明确后再行动',
  defend: '防御阶段：以修复与守成为主，避免扩张',
  unknown: '数据不足，建议补充档案后重新评估',
};

@Injectable()
export class KlineDecisionService {
  private readonly logger = new Logger(KlineDecisionService.name);

  // ============================================================
  // V2 主入口：基于 KlineBarV2[] 生成决策
  // ============================================================

  /**
   * V2 决策入口：基于 KlineCalculationEngine 输出生成阶段 + 节点
   *
   * @param bars KlineBarV2[]（来自 KlineCalculationEngine.calculate）
   * @param snapshotId 快照 ID（用于构造节点 ID）
   * @param currentYear 当前年（用于定位当前阶段）
   * @param currentMonth 当前月（yearMonth 模式下使用）
   */
  decideV2(
    bars: KlineBarV2[],
    snapshotId: string,
    currentYear: number,
    currentMonth?: number,
  ): V2DecisionResult {
    if (!bars || bars.length === 0) {
      this.logger.warn(`[decideV2] bars 为空，返回 unknown 阶段`);
      return {
        current: {
          stage: 'unknown',
          trend: 'unknown',
          summary: '数据不足，无法判定阶段',
          action: V2_ACTION_TEXT.unknown,
          actionBias: V2_ACTION_BIAS.unknown,
        },
        windows: { opportunity: [], risk: [], turn: [] },
        meta: {
          algorithmVersion: 'v2.0.0',
          factorRegistryVersion: FACTOR_REGISTRY_VERSION,
          barsAnalyzed: 0,
        },
      };
    }

    const current = this.determineStage(bars, currentYear, currentMonth);
    const nodes = this.identifyNodes(bars, snapshotId, currentYear);

    return {
      current,
      windows: {
        opportunity: nodes.filter(n => n.nodeType === 'opportunity'),
        risk: nodes.filter(n => n.nodeType === 'risk'),
        turn: nodes.filter(n => n.nodeType === 'turn'),
      },
      meta: {
        algorithmVersion: 'v2.0.0',
        factorRegistryVersion: FACTOR_REGISTRY_VERSION,
        barsAnalyzed: bars.length,
      },
    };
  }

  // ============================================================
  // V2 阶段判定（无 look-ahead bias）
  // ============================================================

  private determineStage(
    bars: KlineBarV2[],
    currentYear: number,
    currentMonth?: number,
  ): V2CurrentStage {
    // 定位当前 bar
    const idx = bars.findIndex(b =>
      b.year === currentYear && (currentMonth === undefined || b.month === currentMonth),
    );
    const safeIdx = idx >= 0 ? idx : bars.length - 1;
    const current = bars[safeIdx];

    // 趋势判定：最近 N 条 bar 的 close 走向
    const trend = this.determineTrend(bars, safeIdx);

    // 阶段判定矩阵
    const close = current.close;
    let stage: V2Stage;

    if (close >= STAGE_THRESHOLD_HIGH) {
      // 高位
      stage = trend === 'up' ? 'advance' : trend === 'down' ? 'turn' : 'advance';
    } else if (close < STAGE_THRESHOLD_LOW) {
      // 低位
      stage = trend === 'up' ? 'accumulate' : 'defend';
    } else {
      // 中位
      stage = trend === 'up' ? 'advance' : trend === 'down' ? 'defend' : 'accumulate';
    }

    // bar.trend 标签作为补充信号
    if (current.trend === '转折' && stage !== 'turn') {
      // bar 自带转折标签，且与矩阵判定不同 → 倾向 turn
      stage = 'turn';
    }

    const summary = this.buildStageSummary(stage, close, trend, current.year);
    const action = V2_ACTION_TEXT[stage];
    const actionBias = V2_ACTION_BIAS[stage];

    return { stage, trend, summary, action, actionBias };
  }

  private determineTrend(bars: KlineBarV2[], currentIdx: number): V2Trend {
    if (currentIdx < 1) return 'unknown';

    const start = Math.max(0, currentIdx - STAGE_TREND_WINDOW + 1);
    const recent = bars.slice(start, currentIdx + 1);
    if (recent.length < 2) return 'unknown';

    // 线性回归斜率（简化版）
    const n = recent.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = recent.reduce((s, b) => s + b.close, 0);
    const sumXY = recent.reduce((s, b, i) => s + i * b.close, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return 'sideways';

    const slope = (n * sumXY - sumX * sumY) / denom;
    const avgClose = sumY / n;

    // 斜率归一化：相对均值的变化率
    const relativeSlope = avgClose > 0 ? slope / avgClose : 0;

    if (Math.abs(relativeSlope) < 0.005) return 'sideways';
    return relativeSlope > 0 ? 'up' : 'down';
  }

  private buildStageSummary(stage: V2Stage, close: number, trend: V2Trend, year: number): string {
    const trendText = trend === 'up' ? '上升' : trend === 'down' ? '下行' : '震荡';
    const stageText = {
      accumulate: '蓄势',
      advance: '上升',
      turn: '转折',
      defend: '防御',
      unknown: '未知',
    }[stage];

    return `${year} 年综合分 ${close.toFixed(1)}，趋势${trendText}，判定为「${stageText}」阶段`;
  }

  // ============================================================
  // V2 节点识别（opportunity / risk / turn）
  // ============================================================

  private identifyNodes(
    bars: KlineBarV2[],
    snapshotId: string,
    currentYear: number,
  ): V2KlineNode[] {
    if (bars.length < 6) return []; // 数据不足，跳过节点识别

    // 计算均值与标准差
    const closes = bars.map(b => b.close);
    const avg = closes.reduce((s, c) => s + c, 0) / closes.length;
    const variance = closes.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / closes.length;
    const stddev = Math.sqrt(variance);

    const upperThreshold = avg + stddev * NODE_DEVIATION_MULTIPLE;
    const lowerThreshold = avg - stddev * NODE_DEVIATION_MULTIPLE;

    const nodes: V2KlineNode[] = [];
    let lastOppMonth = -NODE_MIN_GAP_MONTHS;
    let lastRiskMonth = -NODE_MIN_GAP_MONTHS;
    let lastTurnMonth = -NODE_MIN_GAP_MONTHS;
    // Phase 1 Step 1.5：每类节点数量计数
    let oppCount = 0;
    let riskCount = 0;
    let turnCount = 0;

    for (let i = 1; i < bars.length; i++) {
      const bar = bars[i];
      const monthIndex = i; // 简化：用 index 作为月份序号
      const monthLabel = this.formatMonthLabel(bar);

      // 1. 转折节点：趋势从 up→down 或 down→up
      const prev = bars[i - 1];
      const prevTrend = this.determineTrend(bars, i - 1);
      const curTrend = this.determineTrend(bars, i);
      if (
        turnCount < NODE_MAX_PER_TYPE &&
        ((prevTrend === 'up' && curTrend === 'down') ||
        (prevTrend === 'down' && curTrend === 'up'))
      ) {
        if (monthIndex - lastTurnMonth >= NODE_MIN_GAP_MONTHS) {
          nodes.push(this.buildNode(
            bar, snapshotId, monthLabel, 'turn', bar.close,
            `趋势反转：${prevTrend === 'up' ? '上升转下行' : '下行转上升'}`,
            avg, stddev,
          ));
          lastTurnMonth = monthIndex;
          turnCount++;
        }
      }

      // 2. 机会节点：close > upperThreshold
      if (oppCount < NODE_MAX_PER_TYPE && bar.close > upperThreshold && monthIndex - lastOppMonth >= NODE_MIN_GAP_MONTHS) {
        nodes.push(this.buildNode(
          bar, snapshotId, monthLabel, 'opportunity', bar.close,
          `综合分 ${bar.close.toFixed(1)} 高于均值 ${avg.toFixed(1)} + ${NODE_DEVIATION_MULTIPLE}σ`,
          avg, stddev,
        ));
        lastOppMonth = monthIndex;
        oppCount++;
      }

      // 3. 风险节点：close < lowerThreshold
      if (riskCount < NODE_MAX_PER_TYPE && bar.close < lowerThreshold && monthIndex - lastRiskMonth >= NODE_MIN_GAP_MONTHS) {
        nodes.push(this.buildNode(
          bar, snapshotId, monthLabel, 'risk', bar.close,
          `综合分 ${bar.close.toFixed(1)} 低于均值 ${avg.toFixed(1)} - ${NODE_DEVIATION_MULTIPLE}σ`,
          avg, stddev,
        ));
        lastRiskMonth = monthIndex;
        riskCount++;
      }
    }

    // Phase 1 Step 1.5：过滤掉置信度低于阈值的节点
    const filteredNodes = nodes.filter(n => n.confidence >= NODE_MIN_CONFIDENCE);
    if (filteredNodes.length < nodes.length) {
      this.logger.log(
        `[identifyNodes] Phase 1 Step 1.5：过滤 ${nodes.length - filteredNodes.length} 个低置信度节点（阈值 ${NODE_MIN_CONFIDENCE}）`,
      );
    }

    // 校验所有节点 evidenceRefs 非空
    for (const node of filteredNodes) {
      const check = validateEvidenceRefs(node.evidenceRefs);
      if (!check.valid) {
        this.logger.warn(`[identifyNodes] 节点 ${node.id} evidenceRefs 无效: ${check.reason}`);
      }
    }

    return filteredNodes;
  }

  private buildNode(
    bar: KlineBarV2,
    snapshotId: string,
    monthLabel: string,
    nodeType: V2NodeType,
    score: number,
    summary: string,
    avg: number,
    stddev: number,
  ): V2KlineNode {
    // 节点 ID：snapshotId + monthLabel + nodeType（保证稳定可重生成）
    const id = `${snapshotId}:${monthLabel}:${nodeType}`;

    // 偏离程度 → 置信度
    const deviation = stddev > 0 ? Math.abs(bar.close - avg) / stddev : 0;
    const confidence = Math.min(0.95, CONFIDENCE_BASE + Math.floor(deviation) * CONFIDENCE_STEP);

    // evidenceRefs：复用 factor-registry 构造
    const evidenceRefs = buildEvidenceRefs({
      baziResult: undefined as any, // bazi 由 KlineCalculationEngine 已用；此处仅构造 evidence
      year: bar.year,
      month: bar.month,
      age: bar.age,
      daYun: bar.daYun,
      liuNian: bar.ganZhi,
    });

    return {
      id,
      snapshotId,
      monthLabel,
      nodeType,
      score,
      summary,
      evidenceRefs,
      confidence,
    };
  }

  private formatMonthLabel(bar: KlineBarV2): string {
    if (bar.month !== undefined) {
      return `${bar.year}-${String(bar.month).padStart(2, '0')}`;
    }
    return String(bar.year);
  }

  // ============================================================
  // 旧方法（@deprecated — P1-08 后页面不再调用）
  // ============================================================

  /**
   * @deprecated V1 6 态判定。P1-05 后由 decideV2() 替代。
   * 保留是为了向后兼容 P1-08 之前的 consult 路径调用。
   */
  static determineCurrentStage(points: KlinePoint[], currentIndex: number): {
    stage: string;
    reason: string;
  } {
    if (currentIndex < 0 || currentIndex >= points.length) {
      return { stage: '未知', reason: '数据点缺失' };
    }

    const current = points[currentIndex];
    const recent5 = points.slice(Math.max(0, currentIndex - 4), currentIndex + 1);
    const avg5 = recent5.reduce((s, p) => s + p.compositeCapital, 0) / recent5.length;

    if (current.compositeCapital >= 80) {
      return { stage: '巅峰', reason: `综合分 ${current.compositeCapital.toFixed(1)} 处于高位` };
    } else if (current.compositeCapital >= 60) {
      if (avg5 > current.compositeCapital) {
        return { stage: '上升中', reason: `近5月均分 ${avg5.toFixed(1)} 略高于当前` };
      }
      return { stage: '稳定高位', reason: `综合分 ${current.compositeCapital.toFixed(1)} 维持高位` };
    } else if (current.compositeCapital >= 40) {
      return { stage: '中位震荡', reason: `综合分 ${current.compositeCapital.toFixed(1)} 中性区间` };
    } else {
      return { stage: '低谷', reason: `综合分 ${current.compositeCapital.toFixed(1)} 处于低位` };
    }
  }

  /** @deprecated V1 支撑位/压力位计算。保留向后兼容。 */
  static calcSupportResistance(points: KlinePoint[]): {
    support: number;
    resistance: number;
  } {
    if (points.length === 0) return { support: 0, resistance: 0 };

    const sorted = [...points].sort((a, b) => a.compositeCapital - b.compositeCapital);
    return {
      support: sorted[Math.floor(sorted.length * 0.2)].compositeCapital,
      resistance: sorted[Math.floor(sorted.length * 0.8)].compositeCapital,
    };
  }

  /** @deprecated V1 窗口识别。保留向后兼容。 */
  static identifyWindows(points: KlinePoint[]): {
    best: { start: string; end: string; reason: string };
    risk: { start: string; end: string; reason: string };
  } {
    if (points.length < 6) {
      return {
        best: { start: '', end: '', reason: '数据不足' },
        risk: { start: '', end: '', reason: '数据不足' },
      };
    }

    let bestAvg = 0, bestIdx = 0;
    let riskAvg = 100, riskIdx = 0;

    for (let i = 0; i <= points.length - 6; i++) {
      const window6 = points.slice(i, i + 6);
      const avg = window6.reduce((s, p) => s + p.compositeCapital, 0) / 6;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestIdx = i;
      }
      if (avg < riskAvg) {
        riskAvg = avg;
        riskIdx = i;
      }
    }

    return {
      best: {
        start: points[bestIdx].monthLabel,
        end: points[Math.min(bestIdx + 5, points.length - 1)].monthLabel,
        reason: `6月均分 ${bestAvg.toFixed(1)} 全期最高`,
      },
      risk: {
        start: points[riskIdx].monthLabel,
        end: points[Math.min(riskIdx + 5, points.length - 1)].monthLabel,
        reason: `6月均分 ${riskAvg.toFixed(1)} 全期最低`,
      },
    };
  }

  /** @deprecated V1 bundle 增强。保留向后兼容。 */
  static enhanceBundle(bundle: any): KlineBundle {
    const points: KlinePoint[] = bundle.points || [];
    const currentIndex = points.length - 1;

    const stage = this.determineCurrentStage(points, currentIndex);
    const sr = this.calcSupportResistance(points);
    const windows = this.identifyWindows(points);

    const enhanced: any = {
      ...bundle,
      currentStage: stage.stage,
      stageReason: stage.reason,
      support: sr.support,
      resistance: sr.resistance,
      trendJudgment: points.length > 1 && points[currentIndex].compositeCapital > points[currentIndex - 1].compositeCapital
        ? '上升趋势'
        : '下行或震荡',
      bestWindow: windows.best,
      riskWindow: windows.risk,
      factorBreakdown: [
        { name: '事业', score: 50, weight: 0.2 },
        { name: '财富', score: 50, weight: 0.2 },
        { name: '健康', score: 50, weight: 0.15 },
        { name: '关系', score: 50, weight: 0.15 },
        { name: '成长', score: 50, weight: 0.15 },
        { name: '自由度', score: 50, weight: 0.075 },
        { name: '缓冲', score: 50, weight: 0.075 },
      ],
    };

    return enhanced;
  }
}

export default KlineDecisionService;
