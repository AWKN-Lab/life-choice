import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PersonProfileSummary {
  id: string;
  name: string;
  birthDate: string | null;
  birthTime: string | null;
  gender: string | null;
  birthPlace: string | null;
  yearPillar: string | null;
  monthPillar: string | null;
  dayPillar: string | null;
  hourPillar: string | null;
  naYin: { year?: string; month?: string; day?: string; hour?: string } | null;
  kongWang: string[] | null;
  changSheng: { year?: string; month?: string; day?: string; hour?: string } | null;
  selfSeat: { year?: string; month?: string; day?: string; hour?: string } | null;
  shenShaByPillar: { year?: string[]; month?: string[]; day?: string[]; hour?: string[] } | null;
  latestRecordId: string | null;
  recordsCount: number;
  latestRecordTime: Date | null;
  createdAt: Date;
}

@Injectable()
export class PersonProfileService {
  private readonly logger = new Logger(PersonProfileService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * 生成脱敏名称
   */
  private generateAnonymizedName(birthDate: string | null): string {
    if (!birthDate) return '未知';
    try {
      const date = new Date(birthDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return `${year}年${month}月 生`;
    } catch {
      return '未知';
    }
  }

  /**
   * 创建或获取人物档案
   * 按 birthDate+birthTime+gender 匹配，无则创建
   */
  async getOrCreateProfile(params: {
    userId?: string;
    sessionId?: string;
    birthDate?: string;
    birthTime?: string;
    gender?: string;
    birthPlace?: string;
    name?: string;
    yearPillar?: string;
    monthPillar?: string;
    dayPillar?: string;
    hourPillar?: string;
    naYin?: string;
    kongWang?: string;
  }): Promise<string> {
    const { birthDate, birthTime, gender } = params;
    const identityScope = params.userId ? { userId: params.userId } : { sessionId: params.sessionId || null };

    // 尝试查找现有档案
    const existing = await this.prisma.personProfile.findFirst({
      where: {
        ...identityScope,
        ...(birthDate && birthTime && gender ? { birthDate, birthTime, gender } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // 更新冗余字段
      await this.prisma.personProfile.update({
        where: { id: existing.id },
        data: {
          ...(params.name ? { name: params.name } : {}),
          ...(params.yearPillar ? { yearPillar: params.yearPillar } : {}),
          ...(params.monthPillar ? { monthPillar: params.monthPillar } : {}),
          ...(params.dayPillar ? { dayPillar: params.dayPillar } : {}),
          ...(params.hourPillar ? { hourPillar: params.hourPillar } : {}),
          ...(params.naYin ? { naYin: params.naYin } : {}),
          ...(params.kongWang ? { kongWang: params.kongWang } : {}),
          ...(params.birthPlace ? { birthPlace: params.birthPlace } : {}),
          ...(params.userId ? { userId: params.userId } : {}),
          ...(params.sessionId ? { sessionId: params.sessionId } : {}),
        },
      });
      return existing.id;
    }

    // 创建新档案
    const profile = await this.prisma.personProfile.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        birthDate: params.birthDate,
        birthTime: params.birthTime,
        gender: params.gender,
        birthPlace: params.birthPlace,
        name: params.name || this.generateAnonymizedName(params.birthDate || null),
        yearPillar: params.yearPillar,
        monthPillar: params.monthPillar,
        dayPillar: params.dayPillar,
        hourPillar: params.hourPillar,
        naYin: params.naYin,
        kongWang: params.kongWang,
      },
    });

    return profile.id;
  }

  /**
   * 手动创建人物档案
   * - 不做去重匹配，避免在信息不完整时误复用已有档案
   */
  async createManualProfile(params: {
    userId?: string | null;
    sessionId?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    gender?: string | null;
    birthPlace?: string | null;
    name?: string | null;
    yearPillar?: string | null;
    monthPillar?: string | null;
    dayPillar?: string | null;
    hourPillar?: string | null;
    naYin?: string | null;
    kongWang?: string | null;
  }): Promise<string> {
    const profile = await this.prisma.personProfile.create({
      data: {
        userId: params.userId || undefined,
        sessionId: params.sessionId || undefined,
        birthDate: params.birthDate || undefined,
        birthTime: params.birthTime || undefined,
        gender: params.gender || undefined,
        birthPlace: params.birthPlace || undefined,
        name: params.name || this.generateAnonymizedName(params.birthDate || null),
        yearPillar: params.yearPillar || undefined,
        monthPillar: params.monthPillar || undefined,
        dayPillar: params.dayPillar || undefined,
        hourPillar: params.hourPillar || undefined,
        naYin: params.naYin || undefined,
        kongWang: params.kongWang || undefined,
      },
    });

    return profile.id;
  }

  /**
   * 关联记录到档案
   */
  async linkRecordToProfile(profileId: string, recordId: string): Promise<void> {
    await this.prisma.personProfileRecord.upsert({
      where: {
        personProfileId_consultRecordId: {
          personProfileId: profileId,
          consultRecordId: recordId,
        },
      },
      create: {
        personProfileId: profileId,
        consultRecordId: recordId,
      },
      update: {},
    });
  }

  /**
   * 获取用户的所有人物档案
   */
  async getProfilesByUserId(userId: string): Promise<PersonProfileSummary[]> {
    await this.backfillProfilesForUser(userId);

    const profiles = await this.prisma.personProfile.findMany({
      where: { userId },
      include: {
        records: {
          select: { consultRecordId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(profiles.map(async (profile) => {
      const records = await this.prisma.personProfileRecord.findMany({
        where: { personProfileId: profile.id },
        include: {
          consultRecord: {
            select: { createdAt: true, calcResult: true, id: true },
          },
        },
        orderBy: { consultRecord: { createdAt: 'desc' } },
      });

      const latestRecord = records[0];
      const latestRecordTime = latestRecord?.consultRecord.createdAt || null;
      const latestRecordId = latestRecord?.consultRecordId || null;

      let calcData: any = {};
      if (latestRecord?.consultRecord.calcResult) {
        try {
          const parsed = JSON.parse(latestRecord.consultRecord.calcResult);
          calcData = parsed?.calcData || parsed || {};
        } catch {}
      }

      const naYin = calcData.naYin || null;
      const kongWangRaw = calcData.kongWang;
      const kongWang: string[] | null = kongWangRaw
        ? (Array.isArray(kongWangRaw)
          ? kongWangRaw.filter((v: any) => typeof v === 'string' && v)
          : Object.values(kongWangRaw).filter((v: any) => typeof v === 'string' && v))
        : null;
      const changSheng = calcData.changsheng || calcData.changSheng || null;
      const selfSeat = calcData.selfSeat || null;
      const shenShaByPillar = calcData.shenShaByPillar || null;

      return {
        id: profile.id,
        name: profile.name || this.generateAnonymizedName(profile.birthDate),
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        gender: profile.gender,
        birthPlace: profile.birthPlace,
        yearPillar: profile.yearPillar,
        monthPillar: profile.monthPillar,
        dayPillar: profile.dayPillar,
        hourPillar: profile.hourPillar,
        naYin,
        kongWang,
        changSheng,
        selfSeat,
        shenShaByPillar,
        latestRecordId,
        recordsCount: records.length,
        latestRecordTime,
        createdAt: profile.createdAt,
      };
    }));
  }

  private async backfillProfilesForUser(userId: string): Promise<void> {
    const records = await this.prisma.consultRecord.findMany({
      where: {
        userId,
        isSaved: true,
        routeType: 'ziping',
        personProfileRecords: { none: {} },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const record of records) {
      try {
        const inputData = record.inputData ? JSON.parse(record.inputData) : {};
        const calcResult = record.calcResult ? JSON.parse(record.calcResult) : {};
        const cd = calcResult?.calcData || calcResult || {};
        const profileId = await this.getOrCreateProfile({
          userId,
          birthDate: inputData.birthDate,
          birthTime: inputData.birthTime,
          gender: inputData.gender,
          birthPlace: inputData.birthPlace,
          name: inputData.surname,
          yearPillar: cd.yearPillar,
          monthPillar: cd.monthPillar,
          dayPillar: cd.dayPillar,
          hourPillar: cd.hourPillar,
          naYin: cd.naYin ? JSON.stringify(cd.naYin) : undefined,
          kongWang: cd.kongWang ? JSON.stringify(cd.kongWang) : undefined,
        });
        await this.linkRecordToProfile(profileId, record.id);
      } catch (err) {
        this.logger.warn(`[PersonProfile] backfill failed for ${record.id}: ${(err as Error).message}`);
      }
    }
  }

  /**
   * 获取用户的咨询记录（按档案分组）
   */
  async getRecordsByProfile(profileId: string, userId?: string): Promise<any[]> {
    const profile = await this.prisma.personProfile.findFirst({
      where: {
        id: profileId,
        ...(userId ? { userId } : {}),
      },
    });

    if (!profile) return [];

    const profileRecords = await this.prisma.personProfileRecord.findMany({
      where: { personProfileId: profileId },
      include: {
        consultRecord: true,
      },
      orderBy: { consultRecord: { createdAt: 'desc' } },
    });

    return profileRecords.map((pr) => ({
      id: pr.consultRecord.id,
      question: pr.consultRecord.question,
      routeType: pr.consultRecord.routeType,
      summaryLine: pr.consultRecord.summaryLine,
      createdAt: pr.consultRecord.createdAt,
    }));
  }

  /**
   * 删除档案及其关联
   */
  async deleteProfile(profileId: string, userId?: string): Promise<void> {
    await this.prisma.personProfile.deleteMany({
      where: {
        id: profileId,
        ...(userId ? { userId } : {}),
      },
    });
  }

  /**
   * 删除记录与档案的关联
   */
  async unlinkRecord(recordId: string): Promise<void> {
    await this.prisma.personProfileRecord.deleteMany({
      where: { consultRecordId: recordId },
    });
  }

  async rebindRecordToProfile(recordId: string, targetProfileId: string): Promise<{
    recordId: string;
    targetProfileId: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const [record, targetProfile] = await Promise.all([
        tx.consultRecord.findUnique({
          where: { id: recordId },
          select: {
            id: true,
            userId: true,
            sessionId: true,
          },
        }),
        tx.personProfile.findUnique({
          where: { id: targetProfileId },
          select: {
            id: true,
            userId: true,
            sessionId: true,
          },
        }),
      ]);

      if (!record) {
        throw new Error('待重绑记录不存在');
      }

      if (!targetProfile) {
        throw new Error('目标档案不存在');
      }

      const sameUser = !!record.userId && !!targetProfile.userId && record.userId === targetProfile.userId;
      const sameSession = !record.userId && !targetProfile.userId && !!record.sessionId && !!targetProfile.sessionId && record.sessionId === targetProfile.sessionId;
      if (!sameUser && !sameSession) {
        throw new Error('仅允许重绑到同一用户或同一会话下的档案');
      }

      await tx.personProfileRecord.deleteMany({
        where: { consultRecordId: recordId },
      });

      await tx.personProfileRecord.upsert({
        where: {
          personProfileId_consultRecordId: {
            personProfileId: targetProfileId,
            consultRecordId: recordId,
          },
        },
        create: {
          personProfileId: targetProfileId,
          consultRecordId: recordId,
        },
        update: {},
      });

      return {
        recordId,
        targetProfileId,
      };
    });
  }

  async mergeProfiles(sourceProfileId: string, targetProfileId: string): Promise<{
    sourceProfileId: string;
    targetProfileId: string;
    movedRecordCount: number;
  }> {
    if (sourceProfileId === targetProfileId) {
      throw new Error('不能合并到同一个档案');
    }

    return this.prisma.$transaction(async (tx) => {
      const [source, target] = await Promise.all([
        tx.personProfile.findUnique({
          where: { id: sourceProfileId },
          include: {
            records: {
              select: { consultRecordId: true },
            },
            eightDimensions: true,
          },
        }),
        tx.personProfile.findUnique({
          where: { id: targetProfileId },
          include: {
            eightDimensions: true,
          },
        }),
      ]);

      if (!source || !target) {
        throw new Error('待合并档案不存在');
      }

      const sameUser = source.userId && target.userId && source.userId === target.userId;
      const sameSession = !source.userId && !target.userId && source.sessionId && target.sessionId && source.sessionId === target.sessionId;
      if (!sameUser && !sameSession) {
        throw new Error('仅允许合并同一用户或同一会话下的档案');
      }

      await tx.personProfile.update({
        where: { id: targetProfileId },
        data: {
          userId: target.userId || source.userId,
          sessionId: target.sessionId || source.sessionId,
          name: target.name || source.name,
          birthDate: target.birthDate || source.birthDate,
          birthTime: target.birthTime || source.birthTime,
          gender: target.gender || source.gender,
          birthPlace: target.birthPlace || source.birthPlace,
          yearPillar: target.yearPillar || source.yearPillar,
          monthPillar: target.monthPillar || source.monthPillar,
          dayPillar: target.dayPillar || source.dayPillar,
          hourPillar: target.hourPillar || source.hourPillar,
          naYin: target.naYin || source.naYin,
          kongWang: target.kongWang || source.kongWang,
          relationType: target.relationType || source.relationType,
          importance: target.importance || source.importance,
          currentStatus: target.currentStatus || source.currentStatus,
          riskTags: target.riskTags && target.riskTags !== '[]' ? target.riskTags : source.riskTags,
          recentInteraction: target.recentInteraction || source.recentInteraction,
          currentAdvice: target.currentAdvice || source.currentAdvice,
        },
      });

      for (const item of source.records) {
        await tx.personProfileRecord.upsert({
          where: {
            personProfileId_consultRecordId: {
              personProfileId: targetProfileId,
              consultRecordId: item.consultRecordId,
            },
          },
          create: {
            personProfileId: targetProfileId,
            consultRecordId: item.consultRecordId,
          },
          update: {},
        });
      }

      await tx.personRelatedCase.updateMany({
        where: { personId: sourceProfileId },
        data: { personId: targetProfileId },
      });

      await tx.chronicleEntry.updateMany({
        where: { personId: sourceProfileId },
        data: { personId: targetProfileId },
      });

      if (source.eightDimensions) {
        if (target.eightDimensions) {
          await tx.personEightDimensions.update({
            where: { id: target.eightDimensions.id },
            data: {
              role: target.eightDimensions.role || source.eightDimensions.role,
              relationship: target.eightDimensions.relationship || source.eightDimensions.relationship,
              motivation: target.eightDimensions.motivation || source.eightDimensions.motivation,
              ability: target.eightDimensions.ability || source.eightDimensions.ability,
              resources: target.eightDimensions.resources || source.eightDimensions.resources,
              credit: target.eightDimensions.credit || source.eightDimensions.credit,
              behavior: target.eightDimensions.behavior || source.eightDimensions.behavior,
              risk: target.eightDimensions.risk || source.eightDimensions.risk,
              completeness: Math.max(target.eightDimensions.completeness || 0, source.eightDimensions.completeness || 0),
              pendingObservations:
                target.eightDimensions.pendingObservations && target.eightDimensions.pendingObservations !== '[]'
                  ? target.eightDimensions.pendingObservations
                  : source.eightDimensions.pendingObservations,
            },
          });
          await tx.personEightDimensions.delete({
            where: { id: source.eightDimensions.id },
          });
        } else {
          await tx.personEightDimensions.update({
            where: { id: source.eightDimensions.id },
            data: { personId: targetProfileId },
          });
        }
      }

      await tx.personProfileRecord.deleteMany({
        where: { personProfileId: sourceProfileId },
      });

      await tx.personProfile.delete({
        where: { id: sourceProfileId },
      });

      return {
        sourceProfileId,
        targetProfileId,
        movedRecordCount: source.records.length,
      };
    });
  }
}
