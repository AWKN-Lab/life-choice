/**
 * KlineSnapshotService — 快照版本管理服务（P1-04, P1-06）
 *
 * 来源：TECHNICAL-REFERENCE-P01 §1.3, §2.2-2.4, §3.3
 *
 * 职责：
 *   - 创建 KlineSnapshot（持久化 KlineProductViewModelV2）
 *   - 查询用户快照列表
 *   - 获取指定快照
 *   - 旧快照 superseded 标记
 *   - 节点（KlineNode）持久化
 *   - 结果回写（KlineOutcome）
 *
 * 不可做：
 *   - 生成数值（数值由 KlineCalculationEngine 提供）
 *   - 调用 LLM
 *   - 业务判断（由 KlineDecisionService 提供）
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KlineBarV2 } from './kline-calculation.engine';
import { V2DecisionResult, V2KlineNode } from './kline-decision.service';
import {
  KlineProductViewModelV2,
  KlinePoint,
  KlineNode as V2KlineNodeContract,
  KlineDataSource,
  validateKlineViewModel,
} from './v2-contracts';

// ============================================================
// 常量
// ============================================================

const DATA_VERSION = 'v1.1';
const ALGORITHM_VERSION = 'alg-v1';

// ============================================================
// 内部辅助类型
// ============================================================

interface SnapshotMeta {
  snapshotId: string;
  profileId: string;
  generatedAt: string;
  dataVersion: string;
  algorithmVersion: string;
  sourceSummary: Array<'calculated' | 'user_reported' | 'llm_narrative'>;
  confidence: number | null;
  degraded: boolean;
  degradedReason?: string;
}

interface CreateSnapshotInput {
  userId: string;
  profileId: string;
  bars: KlineBarV2[];
  decision: V2DecisionResult;
  sourceSummary?: Array<'calculated' | 'user_reported' | 'llm_narrative'>;
  confidence?: number | null;
  degraded?: boolean;
  degradedReason?: string;
  supersedesId?: string;
}

// ============================================================
// Service
// ============================================================

@Injectable()
export class KlineSnapshotService {
  private readonly logger = new Logger(KlineSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 创建快照
  // ============================================================

  async createSnapshot(input: CreateSnapshotInput): Promise<{
    snapshotId: string;
    viewModel: KlineProductViewModelV2;
  }> {
    const snapshotId = this.generateSnapshotId();
    const viewModel = this.buildViewModel(snapshotId, input);

    // 校验契约
    const validation = validateKlineViewModel(viewModel);
    if (!validation.valid) {
      this.logger.error(
        `[createSnapshot] ViewModel 校验失败:\n${validation.reasons.join('\n')}`,
      );
      throw new BadRequestException(
        `ViewModel 契约校验失败: ${validation.reasons.slice(0, 3).join('; ')}`,
      );
    }

    // 旧快照标记为 superseded
    if (input.supersedesId) {
      await this.markSuperseded(input.supersedesId, snapshotId);
    } else {
      // 默认将同用户同 profile 旧 active 快照标记为 superseded
      await this.deactivatePreviousSnapshots(input.userId, input.profileId, snapshotId);
    }

    // 持久化 KlineSnapshot
    await this.prisma.klineSnapshot.create({
      data: {
        id: snapshotId,
        userId: input.userId,
        profileId: input.profileId,
        dataVersion: DATA_VERSION,
        algorithmVersion: ALGORITHM_VERSION,
        status: 'active',
        sourceSummary: JSON.stringify(viewModel.meta.sourceSummary),
        confidence: viewModel.meta.confidence,
        degradedReason: input.degradedReason,
        supersedesId: input.supersedesId,
        payload: JSON.stringify(viewModel),
      },
    });

    // 持久化 KlineNode
    const allNodes = [
      ...viewModel.windows.opportunity,
      ...viewModel.windows.risk,
    ];
    if (allNodes.length > 0) {
      await this.persistNodes(snapshotId, allNodes);
    }

    this.logger.log(
      `[createSnapshot] snapshotId=${snapshotId}, nodes=${allNodes.length}, bars=${input.bars.length}`,
    );

    return { snapshotId, viewModel };
  }

  // ============================================================
  // 查询：当前用户最新快照
  // ============================================================

  async getLatestSnapshot(userId: string): Promise<KlineProductViewModelV2 | null> {
    const record = await this.prisma.klineSnapshot.findFirst({
      where: { userId, status: 'active' },
      orderBy: { generatedAt: 'desc' },
    });

    if (!record) return null;
    return this.parseSnapshotPayload(record);
  }

  // ============================================================
  // 查询：指定快照
  // ============================================================

  async getSnapshotById(
    snapshotId: string,
    userId?: string,
  ): Promise<KlineProductViewModelV2 | null> {
    const record = await this.prisma.klineSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!record) return null;
    if (userId && record.userId !== userId) {
      throw new BadRequestException('snapshot 不属于该用户');
    }
    return this.parseSnapshotPayload(record);
  }

  // ============================================================
  // 查询：用户所有快照
  // ============================================================

  async listSnapshots(userId: string, limit: number = 20): Promise<Array<{
    snapshotId: string;
    generatedAt: string;
    status: string;
    dataVersion: string;
    algorithmVersion: string;
    confidence: number | null;
    degraded: boolean;
  }>> {
    const records = await this.prisma.klineSnapshot.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return records.map(r => ({
      snapshotId: r.id,
      generatedAt: r.generatedAt.toISOString(),
      status: r.status,
      dataVersion: r.dataVersion,
      algorithmVersion: r.algorithmVersion,
      confidence: r.confidence,
      degraded: !!r.degradedReason,
    }));
  }

  // ============================================================
  // 节点查询
  // ============================================================

  async getNodes(snapshotId: string): Promise<V2KlineNode[]> {
    const records = await this.prisma.klineNode.findMany({
      where: { snapshotId },
    });
    return records.map(r => ({
      id: r.id,
      snapshotId: r.snapshotId,
      monthLabel: r.monthLabel,
      nodeType: r.nodeType as 'opportunity' | 'risk' | 'turn',
      score: r.score,
      summary: r.summary,
      evidenceRefs: this.safeParseArray(r.evidenceRefs),
      confidence: r.confidence,
    }));
  }

  // ============================================================
  // 节点问事记录
  // ============================================================

  async markNodeAsked(
    nodeId: string,
    consultRecordId: string,
  ): Promise<void> {
    await this.prisma.klineNode.update({
      where: { id: nodeId },
      data: {
        consultRecordId,
        askedAt: new Date(),
      },
    });
  }

  // ============================================================
  // 结果回写
  // ============================================================

  async writeOutcome(input: {
    nodeId: string;
    userId: string;
    result: 'occurred' | 'not_occurred' | 'partial';
    actualScore?: number;
    notes?: string;
    source?: string;
  }): Promise<{ outcomeId: string }> {
    const outcome = await this.prisma.klineOutcome.create({
      data: {
        nodeId: input.nodeId,
        userId: input.userId,
        result: input.result,
        actualScore: input.actualScore,
        notes: input.notes,
        source: input.source || 'user_reported',
      },
    });

    this.logger.log(
      `[writeOutcome] outcomeId=${outcome.id}, nodeId=${input.nodeId}, result=${input.result}`,
    );

    return { outcomeId: outcome.id };
  }

  // ============================================================
  // 私有：构建 ViewModel
  // ============================================================

  private buildViewModel(snapshotId: string, input: CreateSnapshotInput): KlineProductViewModelV2 {
    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const fromMonthLabel = input.bars.length > 0
      ? this.formatMonthLabel(input.bars[0])
      : `${currentYear}-01`;
    const toMonthLabel = input.bars.length > 0
      ? this.formatMonthLabel(input.bars[input.bars.length - 1])
      : `${currentYear}-12`;

    // series：从 bars 转换为 KlinePoint（Phase 1 Step 1.4：四条独立曲线）
    const overall: KlinePoint[] = input.bars.map(bar => ({
      monthLabel: this.formatMonthLabel(bar),
      value: bar.close,
      evidenceRefs: this.buildBarEvidenceRefs(bar),
      source: 'calculated' as KlineDataSource,
      confidence: this.calculateBarConfidence(bar),
    }));

    const career: KlinePoint[] = input.bars.map(bar => ({
      monthLabel: this.formatMonthLabel(bar),
      value: bar.career,
      evidenceRefs: this.buildBarEvidenceRefs(bar, 'career'),
      source: 'calculated' as KlineDataSource,
      confidence: this.calculateBarConfidence(bar),
    }));

    const wealth: KlinePoint[] = input.bars.map(bar => ({
      monthLabel: this.formatMonthLabel(bar),
      value: bar.wealth,
      evidenceRefs: this.buildBarEvidenceRefs(bar, 'wealth'),
      source: 'calculated' as KlineDataSource,
      confidence: this.calculateBarConfidence(bar),
    }));

    const relationship: KlinePoint[] = input.bars.map(bar => ({
      monthLabel: this.formatMonthLabel(bar),
      value: bar.relationship,
      evidenceRefs: this.buildBarEvidenceRefs(bar, 'relationship'),
      source: 'calculated' as KlineDataSource,
      confidence: this.calculateBarConfidence(bar),
    }));

    // windows：opportunity / risk
    const opportunity: V2KlineNodeContract[] = input.decision.windows.opportunity.map(n => ({
      id: n.id,
      snapshotId,
      monthLabel: n.monthLabel,
      nodeType: 'opportunity' as const,
      score: n.score,
      summary: n.summary,
      evidenceRefs: n.evidenceRefs,
      confidence: n.confidence,
    }));

    const risk: V2KlineNodeContract[] = input.decision.windows.risk.map(n => ({
      id: n.id,
      snapshotId,
      monthLabel: n.monthLabel,
      nodeType: 'risk' as const,
      score: n.score,
      summary: n.summary,
      evidenceRefs: n.evidenceRefs,
      confidence: n.confidence,
    }));

    // meta.confidence：取所有节点平均 confidence
    const allConfidences = [
      ...opportunity.map(n => n.confidence),
      ...risk.map(n => n.confidence),
    ];
    const metaConfidence = allConfidences.length > 0
      ? allConfidences.reduce((s, c) => s + c, 0) / allConfidences.length
      : (input.confidence ?? 0.7);

    return {
      meta: {
        snapshotId,
        profileId: input.profileId,
        generatedAt: now,
        dataVersion: DATA_VERSION,
        algorithmVersion: ALGORITHM_VERSION,
        sourceSummary: input.sourceSummary ?? ['calculated'],
        confidence: input.degraded ? null : metaConfidence,
        degraded: !!input.degraded,
      },
      horizon: {
        from: fromMonthLabel,
        to: toMonthLabel,
        granularity: 'month',
      },
      current: {
        stage: input.decision.current.stage,
        trend: input.decision.current.trend,
        summary: input.decision.current.summary,
        action: input.decision.current.action,
      },
      series: {
        overall,
        career,
        wealth,
        relationship,
      },
      windows: {
        opportunity,
        risk,
      },
      entitlements: {
        canViewDomainLines: false,
        canViewAllNodes: false,
        canAskNode: false,
      },
    };
  }

  // ============================================================
  // 私有：持久化节点
  // ============================================================

  private async persistNodes(
    snapshotId: string,
    nodes: V2KlineNodeContract[],
  ): Promise<void> {
    if (nodes.length === 0) return;

    await this.prisma.klineNode.createMany({
      data: nodes.map(n => ({
        id: n.id,
        snapshotId,
        monthLabel: n.monthLabel,
        nodeType: n.nodeType,
        score: n.score,
        summary: n.summary,
        evidenceRefs: JSON.stringify(n.evidenceRefs),
        confidence: n.confidence,
      })),
    });
  }

  // ============================================================
  // 私有：标记旧快照为 superseded
  // ============================================================

  private async deactivatePreviousSnapshots(
    userId: string,
    profileId: string,
    newSnapshotId: string,
  ): Promise<void> {
    await this.prisma.klineSnapshot.updateMany({
      where: {
        userId,
        profileId,
        status: 'active',
        id: { not: newSnapshotId },
      },
      data: { status: 'superseded' },
    });
  }

  private async markSuperseded(oldId: string, newId: string): Promise<void> {
    await this.prisma.klineSnapshot.update({
      where: { id: oldId },
      data: { status: 'superseded' },
    });
  }

  // ============================================================
  // 私有：解析快照 payload
  // ============================================================

  private parseSnapshotPayload(record: any): KlineProductViewModelV2 {
    try {
      const payload = typeof record.payload === 'string'
        ? JSON.parse(record.payload)
        : record.payload;
      return payload as KlineProductViewModelV2;
    } catch (err: any) {
      this.logger.error(
        `[parseSnapshotPayload] 解析失败 snapshotId=${record.id}: ${err.message}`,
      );
      throw new BadRequestException('快照 payload 解析失败');
    }
  }

  // ============================================================
  // 私有：辅助方法
  // ============================================================

  private generateSnapshotId(): string {
    // 使用 crypto.randomUUID 保证唯一性（Node 16.7+）
    try {
      return (globalThis as any).crypto?.randomUUID?.() || `snap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      return `snap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }

  private formatMonthLabel(bar: KlineBarV2): string {
    if (bar.month && bar.month > 0) {
      return `${bar.year}-${String(bar.month).padStart(2, '0')}`;
    }
    return `${bar.year}-01`;
  }

  private buildBarEvidenceRefs(bar: KlineBarV2, line?: 'career' | 'wealth' | 'relationship'): string[] {
    // 从 bar 构造最小证据引用（factor-registry.buildEvidenceRefs 已在 DecisionService 调用）
    const linePrefix = line ? `${line}:` : '';
    const refs: string[] = [`${linePrefix}bar:${bar.year}`];
    if (bar.isDaYunChange) refs.push(`${linePrefix}dayun-change:${bar.daYun}`);
    if (bar.factorsHash) refs.push(`${linePrefix}factors:${bar.factorsHash.slice(0, 8)}`);
    return refs;
  }

  private calculateBarConfidence(bar: KlineBarV2): number {
    // 基础置信度 0.7，大运切换年略低（信息更不确定）
    return bar.isDaYunChange ? 0.65 : 0.75;
  }

  private safeParseArray(s: string | null | undefined): string[] {
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
