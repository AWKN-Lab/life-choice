/**
 * P2-2: 专家标注闭环（学自真本事）
 *
 * - 用户提交反馈：rating/accuracy/helpfulness/tone/comment
 * - 专家（admin）补充校准项：isJudgmentCorrect/calibrationTag/calibrationNote
 * - 复盘任务：定时扫描未采纳的 feedback，按 calibrationTag 调整 scenario 关键词权重
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SubmitFeedbackInput {
  recordId: string;
  userId?: string;
  rating: number; // 1-5
  accuracy?: number;
  helpfulness?: number;
  tone?: number;
  comment?: string;
}

export interface CalibrationInput {
  feedbackId: string;
  reviewerId: string;
  isJudgmentCorrect: boolean;
  calibrationTag: string;
  calibrationNote?: string;
}

export interface AdminFeedbackListParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'reviewed' | 'applied';
  rating?: number;
  routeType?: string;
  hasComment?: boolean;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitFeedback(input: SubmitFeedbackInput) {
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('rating must be 1-5');
    }
    // 同一 recordId + userId 只允许一条最新反馈（更新语义）
    const existing = await this.prisma.consultFeedback.findFirst({
      where: { recordId: input.recordId, userId: input.userId || null },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return this.prisma.consultFeedback.update({
        where: { id: existing.id },
        data: {
          rating: input.rating,
          accuracy: input.accuracy,
          helpfulness: input.helpfulness,
          tone: input.tone,
          comment: input.comment,
          // 重新提交后清空 appliedAt，等待下一轮复盘
          appliedAt: null,
          appliedByCronId: null,
        },
      });
    }
    return this.prisma.consultFeedback.create({
      data: {
        recordId: input.recordId,
        userId: input.userId || null,
        rating: input.rating,
        accuracy: input.accuracy,
        helpfulness: input.helpfulness,
        tone: input.tone,
        comment: input.comment,
      },
    });
  }

  async applyCalibration(input: CalibrationInput) {
    return this.prisma.consultFeedback.update({
      where: { id: input.feedbackId },
      data: {
        reviewerId: input.reviewerId,
        isJudgmentCorrect: input.isJudgmentCorrect,
        calibrationTag: input.calibrationTag,
        calibrationNote: input.calibrationNote,
      },
    });
  }

  async listFeedbacks(recordId: string) {
    return this.prisma.consultFeedback.findMany({
      where: { recordId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdminFeedbacks(params: AdminFeedbackListParams) {
    const pageNum = Math.max(1, Number(params.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (params.status === 'pending') {
      where.appliedAt = null;
      where.isJudgmentCorrect = null;
      where.calibrationTag = null;
    } else if (params.status === 'reviewed') {
      where.appliedAt = null;
      where.OR = [
        { isJudgmentCorrect: { not: null } },
        { calibrationTag: { not: null } },
        { calibrationNote: { not: null } },
      ];
    } else if (params.status === 'applied') {
      where.appliedAt = { not: null };
    }

    if (params.rating) {
      where.rating = Number(params.rating);
    }

    if (params.hasComment === true) {
      where.comment = { not: null };
    }

    if (params.routeType) {
      where.record = {
        routeType: params.routeType,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.consultFeedback.findMany({
        where,
        include: {
          record: {
            select: {
              id: true,
              question: true,
              routeType: true,
              sourceEntry: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.consultFeedback.count({ where }),
    ]);

    const userIds = Array.from(new Set(items.map((item) => item.userId).filter(Boolean))) as string[];
    const reviewerIds = Array.from(new Set(items.map((item) => item.reviewerId).filter(Boolean))) as string[];
    const allUserIds = Array.from(new Set([...userIds, ...reviewerIds]));

    const users = allUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        })
      : [];

    const userMap = new Map(users.map((user) => [user.id, user]));

    return {
      records: items.map((item) => ({
        id: item.id,
        recordId: item.recordId,
        rating: item.rating,
        accuracy: item.accuracy,
        helpfulness: item.helpfulness,
        tone: item.tone,
        comment: item.comment,
        isJudgmentCorrect: item.isJudgmentCorrect,
        calibrationTag: item.calibrationTag,
        calibrationNote: item.calibrationNote,
        appliedAt: item.appliedAt,
        appliedByCronId: item.appliedByCronId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        status: item.appliedAt
          ? 'applied'
          : item.isJudgmentCorrect !== null || item.calibrationTag || item.calibrationNote
            ? 'reviewed'
            : 'pending',
        user: item.userId ? userMap.get(item.userId) || { id: item.userId, email: null, nickname: null } : null,
        reviewer: item.reviewerId ? userMap.get(item.reviewerId) || { id: item.reviewerId, email: null, nickname: null } : null,
        record: item.record,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 复盘：找出未采纳 + 已校准的 feedback
   * - 按 calibrationTag 聚合
   * - 返回结构化结果供 cron 任务消费（实际调整关键词权重逻辑由 cron 任务执行）
   */
  async collectUnappliedFeedbacks(): Promise<{
    total: number;
    byTag: Record<string, number>;
    items: Array<{ id: string; recordId: string; calibrationTag: string; note: string | null; createdAt: Date }>;
  }> {
    const items = await this.prisma.consultFeedback.findMany({
      where: {
        appliedAt: null,
        calibrationTag: { not: null },
        isJudgmentCorrect: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    const byTag: Record<string, number> = {};
    for (const it of items) {
      const t = it.calibrationTag || 'unknown';
      byTag[t] = (byTag[t] || 0) + 1;
    }
    return {
      total: items.length,
      byTag,
      items: items.map(i => ({
        id: i.id,
        recordId: i.recordId,
        calibrationTag: i.calibrationTag || 'unknown',
        note: i.calibrationNote,
        createdAt: i.createdAt,
      })),
    };
  }

  /**
   * 复盘：标记一组 feedback 为已采纳
   */
  async markApplied(feedbackIds: string[], cronId: string) {
    if (feedbackIds.length === 0) return { count: 0 };
    const result = await this.prisma.consultFeedback.updateMany({
      where: { id: { in: feedbackIds } },
      data: { appliedAt: new Date(), appliedByCronId: cronId },
    });
    this.logger.log(`[Feedback] marked ${result.count} feedbacks as applied (cron=${cronId})`);
    return { count: result.count };
  }

  async markSingleApplied(feedbackId: string, cronId: string) {
    return this.prisma.consultFeedback.update({
      where: { id: feedbackId },
      data: {
        appliedAt: new Date(),
        appliedByCronId: cronId,
      },
    });
  }

  /**
   * 复盘：基于 calibrationTag 给出关键词权重调整建议
   * - scenario_misclass: 该场景的关键词分数 +1
   * - agent_unfit: 该场景的主调 agent 切换
   * - tone_off: 后续 LLM temperature 调低
   * - evidence_insufficient: 强制升级到 deep_consult
   * - cost_missing: cost 字段强制非空
   * - other: 记录到 lessons-learned
   */
  async generateCalibrationSuggestions(): Promise<Array<{ tag: string; count: number; action: string; priority: number }>> {
    const stats = await this.collectUnappliedFeedbacks();
    const suggestions: Array<{ tag: string; count: number; action: string; priority: number }> = [];
    for (const [tag, count] of Object.entries(stats.byTag)) {
      if (count === 0) continue;
      switch (tag) {
        case 'scenario_misclass':
          suggestions.push({ tag, count, action: '调高匹配 scenario 的关键词权重 +1', priority: 1 });
          break;
        case 'agent_unfit':
          suggestions.push({ tag, count, action: 'review agent 调度，重选主调', priority: 1 });
          break;
        case 'tone_off':
          suggestions.push({ tag, count, action: '降低 LLM temperature 至 0.5', priority: 2 });
          break;
        case 'evidence_insufficient':
          suggestions.push({ tag, count, action: 'quick_read 强制升级 deep_consult', priority: 1 });
          break;
        case 'cost_missing':
          suggestions.push({ tag, count, action: 'cost 字段加入 schema 强校验', priority: 2 });
          break;
        case 'other':
          suggestions.push({ tag, count, action: '记录到 lessons-learned，等待人工 review', priority: 3 });
          break;
      }
    }
    return suggestions;
  }
}
