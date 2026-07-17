import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Inject, ForbiddenException, Logger, Delete } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { reloadScenarioRules } from '../consult/orchestrator/scenario-rules-loader';
import { PersonProfileService } from '../consult/person-profile.service';
import { LlmCostDashboardService } from '../llm-gateway/llm-cost-dashboard.service';
import { LlmRouterService } from '../llm-gateway/llm-router.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  private parseJsonField<T = any>(value: string | null | undefined, fallback: T | null = null): T | null {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private getReviewStatus(record: { closedLoopResult: string | null; createdAt: Date }): 'pending' | 'verified' | 'expired' {
    if (record.closedLoopResult) return 'verified';
    const expired = Date.now() - new Date(record.createdAt).getTime() > 90 * 24 * 60 * 60 * 1000;
    return expired ? 'expired' : 'pending';
  }

  private async findDuplicateProfiles(profile: {
    id: string;
    userId: string | null;
    sessionId: string | null;
    birthDate: string | null;
    birthTime: string | null;
    gender: string | null;
  }) {
    if (!profile.birthDate || !profile.birthTime || !profile.gender) {
      return [];
    }

    const identityWhere = profile.userId
      ? { userId: profile.userId }
      : profile.sessionId
        ? { sessionId: profile.sessionId, userId: null }
        : null;

    if (!identityWhere) {
      return [];
    }

    return this.prisma.personProfile.findMany({
      where: {
        ...identityWhere,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        gender: profile.gender,
        id: { not: profile.id },
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PersonProfileService)
    private readonly personProfileService: PersonProfileService,
    @Inject(LlmCostDashboardService)
    private readonly llmCostDashboard: LlmCostDashboardService,
    @Inject(LlmRouterService)
    private readonly llmRouter: LlmRouterService,
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Phase 9: CEO 12 指标看板 - GET /api/v1/admin/metrics?days=7
   * 返回 12 个经营指标当前值 + 周对比
   */
  @Get('metrics')
  async getOperatingDashboard(@Query('days') days?: string) {
    const d = Number(days) || 7;
    const safeDays = Math.max(1, Math.min(30, d));
    return this.analyticsService.getOperatingDashboard(safeDays);
  }

  /**
   * 热重载场景调度规则 - POST /api/v1/admin/rules/reload
   */
  @Post('rules/reload')
  async reloadRules() {
    const rules = reloadScenarioRules();
    this.logger.log(`[Admin] Rules reloaded: ${rules.scenarios.length} scenarios, ${rules.classifications.length} classifications, ${rules.tool_combos.length} tool_combos`);
    return {
      success: true,
      scenarios: rules.scenarios.length,
      classifications: rules.classifications.length,
      tool_combos: rules.tool_combos.length,
    };
  }

  /**
   * 获取所有用户列表 - GET /api/v1/admin/users
   */
  @Get('users')
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) {
      where.id = userId;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          wxOpenId: true,
          nickname: true,
          gender: true,
          birthDate: true,
          birthTime: true,
          birthPlace: true,
          isAdmin: true,
          creditBalance: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              records: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(u => ({
        ...u,
        recordsCount: u._count.records,
        ordersCount: u._count.orders,
        _count: undefined,
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
   * 获取所有人物档案 - GET /api/v1/admin/person-profiles
   */
  @Get('person-profiles')
  async getPersonProfiles(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('birthDate') birthDate?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (birthDate) where.birthDate = birthDate;
    if (sessionId) where.sessionId = sessionId;

    const [profiles, total] = await Promise.all([
      this.prisma.personProfile.findMany({
        where,
        include: {
          records: {
            select: {
              consultRecordId: true,
              consultRecord: {
                select: {
                  id: true,
                  createdAt: true,
                  routeType: true,
                  summaryLine: true,
                },
              },
            },
            orderBy: { consultRecord: { createdAt: 'desc' } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.personProfile.count({ where }),
    ]);

    const duplicateGroups = await Promise.all(
      profiles.map((profile) => this.findDuplicateProfiles(profile)),
    );

    return {
      profiles: profiles.map((p, index) => ({
        latestRecord: p.records[0]?.consultRecord
          ? {
              id: p.records[0].consultRecord.id,
              createdAt: p.records[0].consultRecord.createdAt,
              routeType: p.records[0].consultRecord.routeType,
              summaryLine: p.records[0].consultRecord.summaryLine,
            }
          : null,
        id: p.id,
        userId: p.userId,
        sessionId: p.sessionId,
        birthDate: p.birthDate,
        birthTime: p.birthTime,
        gender: p.gender,
        birthPlace: p.birthPlace,
        name: p.name,
        yearPillar: p.yearPillar,
        monthPillar: p.monthPillar,
        dayPillar: p.dayPillar,
        hourPillar: p.hourPillar,
        naYin: p.naYin,
        kongWang: p.kongWang,
        recordsCount: p.records.length,
        duplicateProfiles: duplicateGroups[index].map((item) => ({
          id: item.id,
          name: item.name,
          birthDate: item.birthDate,
          createdAt: item.createdAt,
        })),
        duplicateCount: duplicateGroups[index].length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('person-profiles/:profileId/records')
  async getPersonProfileRecords(@Param('profileId') profileId: string) {
    const profile = await this.prisma.personProfile.findUnique({
      where: { id: profileId },
      select: { id: true, name: true },
    });

    if (!profile) {
      throw new ForbiddenException('档案不存在');
    }

    const profileRecords = await this.prisma.personProfileRecord.findMany({
      where: { personProfileId: profileId },
      include: {
        consultRecord: {
          select: {
            id: true,
            question: true,
            routeType: true,
            summaryLine: true,
            status: true,
            createdAt: true,
            userId: true,
            sessionId: true,
          },
        },
      },
      orderBy: { consultRecord: { createdAt: 'desc' } },
    });

    return {
      profile,
      records: profileRecords.map((item) => ({
        id: item.consultRecord.id,
        question: item.consultRecord.question,
        routeType: item.consultRecord.routeType,
        summaryLine: item.consultRecord.summaryLine,
        status: item.consultRecord.status,
        userId: item.consultRecord.userId,
        sessionId: item.consultRecord.sessionId,
        createdAt: item.consultRecord.createdAt,
      })),
    };
  }

  @Delete('person-profiles/:profileId/records/:recordId')
  async unlinkPersonProfileRecord(
    @Param('profileId') profileId: string,
    @Param('recordId') recordId: string,
  ) {
    const [profile, link] = await Promise.all([
      this.prisma.personProfile.findUnique({
        where: { id: profileId },
        select: { id: true, name: true },
      }),
      this.prisma.personProfileRecord.findUnique({
        where: {
          personProfileId_consultRecordId: {
            personProfileId: profileId,
            consultRecordId: recordId,
          },
        },
        select: {
          personProfileId: true,
          consultRecordId: true,
        },
      }),
    ]);

    if (!profile) {
      throw new ForbiddenException('档案不存在');
    }

    if (!link) {
      throw new ForbiddenException('关联记录不存在');
    }

    await this.prisma.personProfileRecord.delete({
      where: {
        personProfileId_consultRecordId: {
          personProfileId: profileId,
          consultRecordId: recordId,
        },
      },
    });

    return {
      success: true,
      profileId,
      recordId,
      message: '已解除档案与记录关联',
    };
  }

  @Post('person-profiles/:profileId/merge')
  async mergePersonProfile(
    @Param('profileId') profileId: string,
    @Body('targetProfileId') targetProfileId: string,
  ) {
    if (!targetProfileId) {
      throw new ForbiddenException('缺少目标档案 ID');
    }

    try {
      const result = await this.personProfileService.mergeProfiles(profileId, targetProfileId);
      return {
        success: true,
        ...result,
        message: '档案合并成功',
      };
    } catch (error) {
      throw new ForbiddenException((error as Error).message || '档案合并失败');
    }
  }

  @Post('person-profiles/records/:recordId/rebind')
  async rebindPersonProfileRecord(
    @Param('recordId') recordId: string,
    @Body('targetProfileId') targetProfileId: string,
  ) {
    if (!targetProfileId) {
      throw new ForbiddenException('缺少目标档案 ID');
    }

    try {
      const result = await this.personProfileService.rebindRecordToProfile(recordId, targetProfileId);
      return {
        success: true,
        ...result,
        message: '记录已重绑到目标档案',
      };
    } catch (error) {
      throw new ForbiddenException((error as Error).message || '记录重绑失败');
    }
  }

  @Post('person-profiles/from-records/:recordId')
  async createPersonProfileFromRecord(
    @Param('recordId') recordId: string,
    @Body() body: {
      name?: string;
      birthDate?: string;
      birthTime?: string;
      gender?: string;
      birthPlace?: string;
    },
  ) {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        inputData: true,
        calcResult: true,
      },
    });

    if (!record) {
      throw new ForbiddenException('待归档记录不存在');
    }

    const inputData = this.parseJsonField<any>(record.inputData, {}) || {};
    const calcResult = this.parseJsonField<any>(record.calcResult, {}) || {};
    const calcData = calcResult?.calcData || calcResult || {};

    const profileId = await this.personProfileService.createManualProfile({
      userId: record.userId,
      sessionId: record.sessionId,
      name: body.name || inputData.name || inputData.userName || inputData.subjectName || inputData.surname || undefined,
      birthDate: body.birthDate || inputData.birthDate || inputData.birth_date || undefined,
      birthTime: body.birthTime || inputData.birthTime || inputData.birth_time || undefined,
      gender: body.gender || inputData.gender || undefined,
      birthPlace: body.birthPlace || inputData.birthPlace || inputData.birth_place || undefined,
      yearPillar: calcData.yearPillar || undefined,
      monthPillar: calcData.monthPillar || undefined,
      dayPillar: calcData.dayPillar || undefined,
      hourPillar: calcData.hourPillar || undefined,
      naYin: calcData.naYin ? JSON.stringify(calcData.naYin) : undefined,
      kongWang: calcData.kongWang ? JSON.stringify(calcData.kongWang) : undefined,
    });

    await this.prisma.personProfileRecord.deleteMany({
      where: { consultRecordId: recordId },
    });
    await this.personProfileService.linkRecordToProfile(profileId, recordId);

    return {
      success: true,
      recordId,
      profileId,
      message: '已新建人物档案并完成绑定',
    };
  }

  /**
   * 获取咨询记录详情 - GET /api/v1/admin/consult-records/:id
   */
  @Get('consult-records/:id')
  async getConsultRecord(@Param('id') id: string) {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            nickname: true,
          },
        },
        personProfileRecords: {
          include: {
            personProfile: {
              select: {
                id: true,
                name: true,
                birthDate: true,
                birthTime: true,
                gender: true,
              },
            },
          },
        },
        followUps: {
          select: {
            id: true,
            scheduledAt: true,
            completedAt: true,
            status: true,
            result: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!record) {
      throw new ForbiddenException('记录不存在');
    }

    return {
      id: record.id,
      userId: record.userId,
      sessionId: record.sessionId,
      question: record.question,
      routeType: record.routeType,
      status: record.status,
      inputData: record.inputData ? JSON.parse(record.inputData) : {},
      calcResult: record.calcResult ? JSON.parse(record.calcResult) : null,
      llmResult: record.llmResult ? JSON.parse(record.llmResult) : null,
      summaryScore: record.summaryScore,
      summaryLine: record.summaryLine,
      analysisData: record.analysisData ? JSON.parse(record.analysisData) : null,
      calcDuration: record.calcDuration,
      llmDuration: record.llmDuration,
      modelUsed: record.modelUsed,
      isSaved: record.isSaved,
      sourceEntry: record.sourceEntry,
      namingType: record.namingType,
      namingPreferences: record.namingPreferences ? JSON.parse(record.namingPreferences) : null,
      questionIntent: record.questionIntent,
      unlockStatus: record.unlockStatus,
      shareGenerated: record.shareGenerated,
      reviewStatus: this.getReviewStatus(record),
      closedLoopResult: this.parseJsonField(record.closedLoopResult),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      user: record.user,
      profiles: record.personProfileRecords.map(r => r.personProfile),
      followUps: record.followUps.map((item) => ({
        id: item.id,
        scheduledAt: item.scheduledAt,
        completedAt: item.completedAt,
        status: item.status,
        result: this.parseJsonField(item.result),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  /**
   * 获取咨询记录的 Manifest（分析摘要）- GET /api/v1/admin/consult-records/:id/manifest
   */
  @Get('consult-records/:id/manifest')
  async getConsultRecordManifest(@Param('id') id: string) {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        question: true,
        routeType: true,
        status: true,
        summaryScore: true,
        summaryLine: true,
        analysisData: true,
        calcDuration: true,
        llmDuration: true,
        modelUsed: true,
        createdAt: true,
        personProfileRecords: {
          include: {
            personProfile: {
              select: {
                id: true,
                name: true,
                birthDate: true,
                birthTime: true,
                gender: true,
                yearPillar: true,
                dayPillar: true,
              },
            },
          },
        },
      },
    });

    if (!record) {
      throw new ForbiddenException('记录不存在');
    }

    const analysisData = record.analysisData ? JSON.parse(record.analysisData) : {};

    return {
      recordId: record.id,
      userId: record.userId,
      question: record.question,
      routeType: record.routeType,
      status: record.status,
      summaryLine: record.summaryLine,
      summaryScore: record.summaryScore,
      qualityScore: analysisData.qualityScore,
      modules: analysisData.moduleContent ? Object.keys(analysisData.moduleContent) : [],
      calcDuration: record.calcDuration,
      llmDuration: record.llmDuration,
      modelUsed: record.modelUsed,
      createdAt: record.createdAt,
      profiles: record.personProfileRecords.map(r => ({
        id: r.personProfile.id,
        name: r.personProfile.name,
        birthDate: r.personProfile.birthDate,
        birthTime: r.personProfile.birthTime,
        gender: r.personProfile.gender,
        yearPillar: r.personProfile.yearPillar,
        dayPillar: r.personProfile.dayPillar,
      })),
    };
  }

  /**
   * 搜索咨询记录 - GET /api/v1/admin/consult-records
   */
  @Get('consult-records')
  async searchConsultRecords(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('routeType') routeType?: string,
    @Query('withoutProfile') withoutProfile?: string,
    @Query('reviewStatus') reviewStatus?: 'pending' | 'verified' | 'expired',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (sessionId) where.sessionId = sessionId;
    if (routeType) where.routeType = routeType;
    if (withoutProfile === 'true' || withoutProfile === '1') {
      where.personProfileRecords = { none: {} };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const allRecords = await this.prisma.consultRecord.findMany({
      where,
      select: {
        id: true,
        userId: true,
        sessionId: true,
        question: true,
        routeType: true,
        status: true,
        summaryScore: true,
        summaryLine: true,
        isSaved: true,
        closedLoopResult: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
        personProfileRecords: {
          select: {
            personProfileId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filteredRecords = reviewStatus
      ? allRecords.filter((r) => this.getReviewStatus(r) === reviewStatus)
      : allRecords;
    const total = filteredRecords.length;
    const records = filteredRecords.slice(skip, skip + limitNum);

    return {
      records: records.map(r => ({
        ...r,
        reviewStatus: this.getReviewStatus(r),
        closedLoopResult: this.parseJsonField(r.closedLoopResult),
        user: r.user ? { id: r.user.id, email: r.user.email, nickname: r.user.nickname } : null,
        profilesCount: r.personProfileRecords.length,
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
   * 获取统计概览 - GET /api/v1/admin/stats
   */
  @Get('stats')
  async getStats() {
    const [
      totalUsers,
      totalRecords,
      totalProfiles,
      recentRecords,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.consultRecord.count(),
      this.prisma.personProfile.count(),
      this.prisma.consultRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          userId: true,
          routeType: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalUsers,
      totalRecords,
      totalProfiles,
      recentActivity: recentRecords,
    };
  }

  /**
   * 获取咨询记录的证据链 - GET /api/v1/admin/consult-records/:id/evidence
   */
  @Get('consult-records/:id/evidence')
  async getConsultRecordEvidence(@Param('id') id: string) {
    const packets = await this.prisma.evidencePacket.findMany({
      where: { recordId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      recordId: id,
      packets: packets.map(p => ({
        id: p.id,
        routeType: p.routeType,
        version: p.version,
        inputHash: p.inputHash,
        packetData: JSON.parse(p.packetJson),
        warnings: JSON.parse(p.warnings),
        createdAt: p.createdAt,
      })),
    };
  }

  /**
   * 获取咨询记录的生成过程 - GET /api/v1/admin/consult-records/:id/generation-runs
   */
  @Get('consult-records/:id/generation-runs')
  async getGenerationRuns(@Param('id') id: string) {
    const runs = await this.prisma.generationRun.findMany({
      where: { recordId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      recordId: id,
      runs: runs.map(r => ({
        id: r.id,
        moduleId: r.moduleId,
        status: r.status,
        provider: r.provider,
        model: r.model,
        promptVersion: r.promptVersion,
        qualityScore: r.qualityScore,
        errorCode: r.errorCode,
        errorMessage: r.errorMessage,
        durationMs: r.durationMs,
        rawOutput: r.rawOutput,
        finalJson: r.finalJson,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }

  /**
   * 获取知识命中记录 - GET /api/v1/admin/knowledge-hits?recordId=xxx
   */
  @Get('knowledge-hits')
  async getKnowledgeHits(@Query('recordId') recordId: string) {
    if (!recordId) {
      return { recordId: null, hits: [] };
    }

    const runs = await this.prisma.generationRun.findMany({
      where: { recordId },
      select: { id: true },
    });

    const runIds = runs.map(r => r.id);

    const hits = await this.prisma.knowledgeHit.findMany({
      where: { runId: { in: runIds } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      recordId,
      hits: hits.map(h => ({
        id: h.id,
        runId: h.runId,
        sourceId: h.sourceId,
        sourceType: h.sourceType,
        title: h.title,
        snippet: h.snippet,
        score: h.score,
        createdAt: h.createdAt,
      })),
    };
  }

  /**
   * 获取用户互动事件 - GET /api/v1/admin/interaction-events?recordId=xxx
   */
  @Get('interaction-events')
  async getInteractionEvents(@Query('recordId') recordId: string, @Query('limit') limit?: number) {
    const where: any = {};
    if (recordId) where.recordId = recordId;

    const events = await this.prisma.interactionEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? Math.min(Number(limit), 100) : 50,
    });

    return {
      events: events.map(e => ({
        id: e.id,
        userId: e.userId,
        sessionId: e.sessionId,
        recordId: e.recordId,
        eventType: e.eventType,
        eventData: JSON.parse(e.eventJson),
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * 获取预览记录列表 - GET /api/v1/admin/consult-previews
   */
  @Get('consult-previews')
  async getConsultPreviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('module') module?: string,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (module) where.module = module;
    if (userId) where.userId = userId;

    const [previews, total] = await Promise.all([
      this.prisma.consultPreview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.consultPreview.count({ where }),
    ]);

    return {
      previews: previews.map(p => ({
        id: p.id,
        module: p.module,
        inputData: p.inputData ? JSON.parse(p.inputData) : null,
        calcResult: p.calcResult ? JSON.parse(p.calcResult) : null,
        freeContent: JSON.parse(p.freeContent),
        lang: p.lang,
        userId: p.userId,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        isExpired: new Date() > p.expiresAt,
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
   * 获取会员列表 - GET /api/v1/admin/memberships
   */
  @Get('memberships')
  async getMemberships(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status;

    const [memberships, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nickname: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.membership.count({ where }),
    ]);

    return {
      memberships: memberships.map(m => ({
        id: m.id,
        userId: m.userId,
        type: m.type,
        status: m.status,
        startDate: m.startDate,
        expireDate: m.expireDate,
        isExpired: m.expireDate ? new Date() > m.expireDate : false,
        isActive: m.status === 'active' && (!m.expireDate || new Date() <= m.expireDate),
        user: m.user,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
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
   * 获取统计概览（增强版，含新增模块统计） - GET /api/v1/admin/stats/enhanced
   */
  @Get('naming-records')
  async getNamingRecords(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { routeType: 'quming' };

    const [records, total] = await Promise.all([
      this.prisma.consultRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          userId: true,
          question: true,
          routeType: true,
          status: true,
          namingType: true,
          namingPreferences: true,
          inputData: true,
          analysisData: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              nickname: true,
            },
          },
        },
      }),
      this.prisma.consultRecord.count({ where }),
    ]);

    return {
      records: records.map(r => ({
        id: r.id,
        userId: r.userId,
        question: r.question,
        routeType: r.routeType,
        status: r.status,
        namingType: r.namingType,
        namingPreferences: r.namingPreferences ? JSON.parse(r.namingPreferences) : null,
        inputData: r.inputData ? JSON.parse(r.inputData) : null,
        analysisData: r.analysisData ? JSON.parse(r.analysisData) : null,
        createdAt: r.createdAt,
        user: r.user ? { id: r.user.id, email: r.user.email, nickname: r.user.nickname } : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('question-records')
  async getQuestionRecords(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('reviewStatus') reviewStatus?: 'pending' | 'verified' | 'expired',
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const questionTypes = ['liuren', 'ziping', 'liuyao', 'qimen'];
    const where: any = { routeType: { in: questionTypes } };

    const allRecords = await this.prisma.consultRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        question: true,
        routeType: true,
        status: true,
        questionIntent: true,
        inputData: true,
        analysisData: true,
        closedLoopResult: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    });

    const filteredRecords = reviewStatus
      ? allRecords.filter((r) => this.getReviewStatus(r) === reviewStatus)
      : allRecords;
    const total = filteredRecords.length;
    const records = filteredRecords.slice(skip, skip + limitNum);

    return {
      records: records.map(r => ({
        id: r.id,
        userId: r.userId,
        question: r.question,
        routeType: r.routeType,
        status: r.status,
        questionIntent: r.questionIntent,
        inputData: this.parseJsonField(r.inputData),
        analysisData: this.parseJsonField(r.analysisData),
        reviewStatus: this.getReviewStatus(r),
        closedLoopResult: this.parseJsonField(r.closedLoopResult),
        createdAt: r.createdAt,
        user: r.user ? { id: r.user.id, email: r.user.email, nickname: r.user.nickname } : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('kline-records')
  async getKlineRecords(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('reviewStatus') reviewStatus?: 'pending' | 'verified' | 'expired',
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { sourceEntry: 'kline' };

    const allRecords = await this.prisma.consultRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        question: true,
        routeType: true,
        status: true,
        unlockStatus: true,
        analysisData: true,
        closedLoopResult: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    });

    const filteredRecords = reviewStatus
      ? allRecords.filter((r) => this.getReviewStatus(r) === reviewStatus)
      : allRecords;
    const total = filteredRecords.length;
    const records = filteredRecords.slice(skip, skip + limitNum);

    return {
      records: records.map(r => ({
        id: r.id,
        userId: r.userId,
        question: r.question,
        routeType: r.routeType,
        status: r.status,
        unlockStatus: r.unlockStatus,
        analysisData: this.parseJsonField(r.analysisData),
        reviewStatus: this.getReviewStatus(r),
        closedLoopResult: this.parseJsonField(r.closedLoopResult),
        createdAt: r.createdAt,
        user: r.user ? { id: r.user.id, email: r.user.email, nickname: r.user.nickname } : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('unlock-records')
  async getUnlockRecords(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      unlockStatus: { not: null, notIn: ['preview'] },
    };
    if (userId) where.userId = userId;

    const [records, total] = await Promise.all([
      this.prisma.consultRecord.findMany({
        where,
        select: {
          id: true,
          userId: true,
          sourceEntry: true,
          routeType: true,
          unlockStatus: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.consultRecord.count({ where }),
    ]);

    return {
      records: records.map(r => ({
        id: r.id,
        userId: r.userId,
        userName: r.user?.nickname || r.user?.email || null,
        module: r.sourceEntry || r.routeType,
        feature: r.unlockStatus,
        membershipLevel: r.unlockStatus === 'unlocked_full' ? 'full' : 'partial',
        unlockedAt: r.createdAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('credit-usage')
  async getCreditUsage(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      activityType: { in: ['credit', 'unlock', 'consult'] },
    };
    if (userId) where.userId = userId;

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      records: activities.map(a => {
        const data = a.activityData ? JSON.parse(a.activityData) : {};
        return {
          id: a.id,
          userId: a.userId,
          userName: a.user?.nickname || a.user?.email || null,
          amount: data.amount || data.creditAmount || 1,
          purpose: data.purpose || a.activityType,
          createdAt: a.createdAt,
        };
      }),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('llm-failures')
  async getLlmFailures(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('errorType') errorType?: string,
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      status: { in: ['failed', 'failed_retryable'] },
    };
    if (errorType) where.errorCode = errorType;

    const [runs, total] = await Promise.all([
      this.prisma.generationRun.findMany({
        where,
        select: {
          id: true,
          recordId: true,
          moduleId: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          provider: true,
          model: true,
          durationMs: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.generationRun.count({ where }),
    ]);

    return {
      records: runs.map(r => ({
        id: r.id,
        recordId: r.recordId,
        errorType: r.errorCode || r.status,
        errorMessage: r.errorMessage,
        provider: r.provider,
        model: r.model,
        durationMs: r.durationMs,
        retryStatus: r.status === 'failed_retryable' ? 'retryable' : 'final',
        createdAt: r.createdAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('stats/enhanced')
  async getEnhancedStats() {
    const [
      totalUsers,
      totalRecords,
      totalProfiles,
      totalPreviews,
      activeMemberships,
      recordsBySource,
      recordsByRoute,
      membershipsByType,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.consultRecord.count(),
      this.prisma.personProfile.count(),
      this.prisma.consultPreview.count(),
      this.prisma.membership.count({ where: { status: 'active' } }),
      this.prisma.consultRecord.groupBy({
        by: ['sourceEntry'],
        _count: { id: true },
        where: { sourceEntry: { not: null } },
      }),
      this.prisma.consultRecord.groupBy({
        by: ['routeType'],
        _count: { id: true },
      }),
      this.prisma.membership.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { status: 'active' },
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalRecords,
        totalProfiles,
        totalPreviews,
        activeMemberships,
      },
      recordsBySource: Object.fromEntries(
        recordsBySource.map(r => [r.sourceEntry || 'direct', r._count.id])
      ),
      recordsByRoute: Object.fromEntries(
        recordsByRoute.map(r => [r.routeType, r._count.id])
      ),
      membershipsByType: Object.fromEntries(
        membershipsByType.map(r => [r.type, r._count.id])
      ),
    };
  }

  /**
   * Phase 5 T5.2: LLM 成本看板 - GET /api/v1/admin/llm-cost?days=7
   * 返回最近 N 天的 LLM 调用成本聚合（按 provider / routeType / 日期 + 单轮 vs 多轮对比）
   */
  @Get('llm-cost')
  async getLlmCostDashboard(@Query('days') days?: number) {
    const daysNum = Math.min(90, Math.max(1, Number(days) || 7));
    return this.llmCostDashboard.getDashboard(daysNum);
  }

  /**
   * Phase 5 T5.3: 智能 Provider 路由表 - GET /api/v1/admin/llm-router
   * 返回当前路由表配置 + 启用状态
   */
  @Get('llm-router')
  async getLlmRouterConfig() {
    return {
      enabled: this.llmRouter.isEnabled(),
      routeTable: this.llmRouter.getRouteTable(),
    };
  }
}
