/**
 * 统一事项主键服务 - Q3 P2-2
 * 跨模块贯穿 recordId/consultationId
 * - generateConsultationId: 生成新主键
 * - getOrCreateConsultation: 通过 recordId 获取或创建 consultationId
 * - linkStages: 关联同一事项的多个阶段（analyze/clarify/result/followup）
 */
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const consultationService = {
  /**
   * 生成新 consultationId
   * 格式：cons_<uuid>，便于识别
   */
  generateConsultationId(): string {
    return `cons_${randomUUID().replace(/-/g, '')}`;
  },

  /**
   * 通过 recordId 获取 consultationId
   * 如果记录没有 consultationId，自动生成并回写
   */
  async getOrCreateConsultationId(recordId: string): Promise<string> {
    const record = await prisma.consultRecord.findUnique({
      where: { id: recordId },
      select: { id: true, consultationId: true },
    });

    if (!record) {
      throw new Error(`ConsultRecord not found: ${recordId}`);
    }

    if (record.consultationId) {
      return record.consultationId;
    }

    const newConsultationId = this.generateConsultationId();
    await prisma.consultRecord.update({
      where: { id: recordId },
      data: { consultationId: newConsultationId },
    });

    return newConsultationId;
  },

  /**
   * 创建新事项时同时生成 consultationId
   */
  async createConsultRecord(data: {
    userId?: string;
    question: string;
    routeType: string;
    sourceEntry?: string;
    sessionId?: string;
  }) {
    const consultationId = this.generateConsultationId();
    return prisma.consultRecord.create({
      data: {
        ...data,
        consultationId,
        status: 'pending',
      },
    });
  },

  /**
   * 关联同一事项的子记录（followUp, dialogue, namingResult, chronicleEntry）
   */
  async linkStages(consultationId: string): Promise<{
    record: any;
    followUps: any[];
    dialogue: any;
    namingResult: any;
    chronicleEntries: any[];
  }> {
    const record = await prisma.consultRecord.findUnique({
      where: { consultationId },
      include: {
        followUps: { orderBy: { scheduledAt: 'asc' } },
        dialogue: true,
        namingResult: true,
        chronicleEntries: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!record) {
      throw new Error(`Consultation not found: ${consultationId}`);
    }

    return {
      record,
      followUps: record.followUps,
      dialogue: record.dialogue,
      namingResult: record.namingResult,
      chronicleEntries: record.chronicleEntries,
    };
  },

  /**
   * 增量更新分享/重试计数
   */
  async incrementShare(consultationId: string): Promise<number> {
    const record = await prisma.consultRecord.update({
      where: { consultationId },
      data: {
        shareCount: { increment: 1 },
        shareGenerated: true,
      },
      select: { shareCount: true },
    });
    return record.shareCount;
  },

  async incrementRetry(consultationId: string): Promise<number> {
    const record = await prisma.consultRecord.update({
      where: { consultationId },
      data: { retryCount: { increment: 1 } },
      select: { retryCount: true },
    });
    return record.retryCount;
  },

  /**
   * 历史重开：通过 consultationId 找到原 recordId
   */
  async reopenByConsultation(consultationId: string) {
    return prisma.consultRecord.findUnique({
      where: { consultationId },
    });
  },
};

export default consultationService;
