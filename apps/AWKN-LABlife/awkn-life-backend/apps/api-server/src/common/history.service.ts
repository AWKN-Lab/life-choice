/**
 * 我的人和事 - 历史页 API - Q3 P2-4
 * 简化版（避免装饰器，单文件可独立运行）
 * 通过 NestJS Module 注册时使用装饰器版本
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HistoryService {
  /**
   * 我的人和事 - 按人物聚合
   */
  static async getPeopleAndCases(userId: string) {
    const persons = await prisma.personProfile.findMany({
      where: { userId },
    });

    const allRecords = await prisma.consultRecord.findMany({
      where: { userId, deletedAt: null },
      include: {
        personProfileRecords: {
          include: {
            personProfile: { select: { id: true, name: true, relationType: true } },
          },
        },
        followUps: { select: { id: true, scheduledAt: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const personMap = new Map<string, any>();
    for (const p of persons) {
      personMap.set(p.id, {
        id: p.id,
        name: p.name || '未命名',
        relationType: p.relationType,
        importance: p.importance,
        currentStatus: p.currentStatus,
        cases: [],
      });
    }

    for (const r of allRecords) {
      const personLinks = r.personProfileRecords || [];
      if (personLinks.length > 0) {
        for (const link of personLinks) {
          const person = personMap.get(link.personProfileId);
          if (person) {
            person.cases.push({
              consultationId: r.consultationId || r.id,
              recordId: r.id,
              question: r.question,
              routeType: r.routeType,
              sourceEntry: r.sourceEntry,
              status: r.status,
              summaryLine: r.summaryLine,
              createdAt: r.createdAt,
              followUpCount: r.followUps.length,
              shareCount: r.shareCount,
              retryCount: r.retryCount,
            });
          }
        }
      } else {
        if (!personMap.has('__standalone__')) {
          personMap.set('__standalone__', {
            id: '__standalone__',
            name: '独立事项',
            relationType: 'standalone',
            cases: [],
          });
        }
        personMap.get('__standalone__').cases.push({
          consultationId: r.consultationId || r.id,
          recordId: r.id,
          question: r.question,
          routeType: r.routeType,
          sourceEntry: r.sourceEntry,
          status: r.status,
          summaryLine: r.summaryLine,
          createdAt: r.createdAt,
          followUpCount: r.followUps.length,
          shareCount: r.shareCount,
          retryCount: r.retryCount,
        });
      }
    }

    return {
      ok: true,
      totalPersons: Array.from(personMap.values()).filter((p) => p.id !== '__standalone__').length,
      totalCases: allRecords.length,
      groups: Array.from(personMap.values()),
    };
  }

  /**
   * 事项详情 - 通过 consultationId 聚合
   */
  static async getCaseDetail(userId: string, consultationId: string) {
    const record = await prisma.consultRecord.findFirst({
      where: {
        OR: [{ consultationId }, { id: consultationId }],
        userId,
        deletedAt: null,
      },
      include: {
        personProfileRecords: { include: { personProfile: true } },
        followUps: { orderBy: { scheduledAt: 'asc' } },
        dialogue: true,
        namingResult: true,
        chronicleEntries: { orderBy: { createdAt: 'asc' } },
        feedbacks: true,
      },
    });

    if (!record) {
      return { ok: false, error: '事项不存在' };
    }

    return {
      ok: true,
      consultationId: record.consultationId,
      recordId: record.id,
      question: record.question,
      routeType: record.routeType,
      sourceEntry: record.sourceEntry,
      status: record.status,
      summaryLine: record.summaryLine,
      analysisData: record.analysisData,
      createdAt: record.createdAt,
      shareCount: record.shareCount,
      retryCount: record.retryCount,
      unlockStatus: record.unlockStatus,
      persons: record.personProfileRecords.map((ppr) => ({
        id: ppr.personProfile.id,
        name: ppr.personProfile.name,
        relationType: ppr.personProfile.relationType,
      })),
      followUps: record.followUps,
      dialogue: record.dialogue,
      namingResult: record.namingResult,
      chronicleEntries: record.chronicleEntries,
      feedbacks: record.feedbacks,
    };
  }

  /**
   * 最近事项
   */
  static async getRecentCases(userId: string, limit = 20) {
    const records = await prisma.consultRecord.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      select: {
        id: true,
        consultationId: true,
        question: true,
        routeType: true,
        sourceEntry: true,
        status: true,
        summaryLine: true,
        createdAt: true,
        shareCount: true,
        retryCount: true,
      },
    });
    return { ok: true, cases: records };
  }
}

export default HistoryService;
