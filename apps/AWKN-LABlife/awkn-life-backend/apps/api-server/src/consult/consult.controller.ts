import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request, Inject, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Allow, IsOptional, IsString } from 'class-validator';
import { ConsultService } from './consult.service';
import { PersonProfileService } from './person-profile.service';
import { RouterService } from './router.service';
import { PrismaService } from '../prisma/prisma.service';
import { XuanxueOrchestratorService } from './orchestrator/orchestrator.service';
import { BehaviorService } from './behavior/behavior.service';
import { RouteDto, SubmitInfoDto, SaveRecordDto, ConsultAnalyzeDto, FortuneQueryDto, CelebritySimilarityDto, DeleteRecordsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { logger } from '../logger';
import { rebuildNamingSelectionState } from './naming-selection-state';

class ClosedLoopResultDto {
  userReflection?: string;
  actualOutcome!: string;
  accuracyCheck?: string;
}

class BehaviorEventDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  event_type?: string;

  @IsOptional()
  @Allow()
  payload?: Record<string, unknown> | string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

@Controller('consult')
export class ConsultController {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ConsultService)
    private readonly consultService: ConsultService,
    @Inject(PersonProfileService)
    private readonly personProfileService: PersonProfileService,
    @Inject(RouterService)
    private readonly routerService: RouterService,
    @Inject(XuanxueOrchestratorService)
    private readonly orchestrator: XuanxueOrchestratorService,
    @Inject(BehaviorService)
    private readonly behaviorService: BehaviorService,
  ) {}

  private normalizeBehaviorEvent(body: BehaviorEventDto) {
    const explicitEventType = body.eventType || body.event_type;
    if (explicitEventType) {
      return {
        eventType: explicitEventType,
        payload: typeof body.payload === 'string'
          ? { raw: body.payload }
          : (body.payload || {}),
      };
    }

    if (body.action === 'favorite') {
      return {
        eventType: 'naming_favorite',
        payload: { name: body.name || '', source: 'naming' },
      };
    }

    if (body.action === 'remove') {
      return {
        eventType: 'naming_remove',
        payload: { name: body.name || '', source: 'naming' },
      };
    }

    return {
      eventType: body.action || 'naming_remove',
      payload: { name: body.name || '' },
    };
  }

  /**
   * 实验接口 - 主流程不使用
   * 当前免费预览由 /consult/analyze 返回的算法结果生成
   * 此接口返回固定样例内容，仅用于开发调试
   */
  @Post('preview')
  async createPreview(
    @Body() body: { module: 'kline' | 'naming' | 'question'; birthDate?: string; birthTime?: string; gender?: string; questionType?: string },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Preview endpoint is not available in production');
    }
    return this.consultService.createPreview(body);
  }

  @Post('analyze')
  @UseGuards(OptionalJwtAuthGuard)
  async analyze(@Body() dto: ConsultAnalyzeDto, @Query('lang') lang?: string, @Request() req?: any) {
    try {
      if (req?.user?.id && !dto.userId) {
        dto.userId = req.user.id;
      }
      return await this.consultService.analyze(dto, lang || 'zh-CN');
    } catch (error: any) {
      // 将未捕获异常转为结构化错误，避免裸 500
      const status = error?.status || error?.statusCode || 500;
      const message = error?.message || '分析服务暂时不可用，请稍后重试';
      if (status >= 500) {
        // 服务端错误打日志，前端只看到通用提示
        logger.error('[ConsultController] analyze 500: ' + (error?.stack || error));
      }
      return {
        error: true,
        status,
        message: status >= 500 ? '分析服务暂时不可用，请稍后重试' : message,
        route_type: dto.routeType || dto.route_type || 'ziping',
        record_id: '',
      };
    }
  }

  @Post('route')
  async route(@Body() dto: RouteDto) {
    return this.consultService.route(dto);
  }

  @Post('clarify')
  async clarify(@Body('question') question: string) {
    const clarifyingQuestion = await this.routerService.generateClarifyQuestion(question);
    return { clarifyingQuestion };
  }

  @Post('info')
  async submitInfo(@Body() dto: SubmitInfoDto) {
    return this.consultService.submitInfo(dto);
  }

  @Get('result/:recordId')
  @UseGuards(OptionalJwtAuthGuard)
  async getResult(
    @Param('recordId') recordId: string,
    @Query('module') moduleId: string,
    @Query('lang') lang: string,
    @Request() req: any,
  ) {
    return this.consultService.getResult(recordId, req.user?.id, moduleId, lang || 'zh-CN');
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  async saveRecord(@Body() dto: SaveRecordDto, @Request() req: any) {
    return this.consultService.saveRecord(dto.recordId, req.user.id);
  }

  @Get('records')
  @UseGuards(JwtAuthGuard)
  async getRecords(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.consultService.getRecords(req.user.id, limit, offset);
  }

  @Post('records/delete')
  @UseGuards(JwtAuthGuard)
  async deleteRecords(@Body() dto: DeleteRecordsDto, @Request() req: any) {
    const userId = req.user.id;
    const { recordIds } = dto;

    if (!recordIds || recordIds.length === 0) {
      return { deletedCount: 0 };
    }

    // v1.5: 软删除，仅允许删除自己的记录
    const result = await this.prisma.consultRecord.updateMany({
      where: {
        id: { in: recordIds },
        userId,  // 只允许删除自己的记录，不再用 OR sessionId
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return { deletedCount: result.count };
  }

  @Post('records/:recordId/closed-loop')
  @UseGuards(JwtAuthGuard)
  async saveClosedLoopResult(
    @Param('recordId') recordId: string,
    @Body() dto: ClosedLoopResultDto,
    @Request() req: any,
  ) {
    return this.consultService.saveClosedLoopResult(recordId, req.user.id, {
      userReflection: dto.userReflection || '',
      actualOutcome: dto.actualOutcome || '',
      accuracyCheck: dto.accuracyCheck || '',
    });
  }

  @Get('person-profiles')
  @UseGuards(JwtAuthGuard)
  async getPersonProfiles(@Request() req: any) {
    return this.personProfileService.getProfilesByUserId(req.user.id);
  }

  @Get('person-profiles/:profileId/records')
  @UseGuards(JwtAuthGuard)
  async getProfileRecords(
    @Param('profileId') profileId: string,
    @Request() req: any,
  ) {
    return this.personProfileService.getRecordsByProfile(profileId, req.user.id);
  }

  @Delete('person-profiles/:profileId')
  @UseGuards(JwtAuthGuard)
  async deletePersonProfile(
    @Param('profileId') profileId: string,
    @Request() req: any,
  ) {
    await this.personProfileService.deleteProfile(profileId, req.user.id);
    return { success: true };
  }

  @Get('fortune/daily')
  async getDailyFortune(@Query() dto: FortuneQueryDto, @Query('lang') lang?: string) {
    return this.consultService.getFortune('daily', dto, undefined, undefined, lang || 'zh-CN');
  }

  @Get('fortune/monthly/:year/:month')
  async getMonthlyFortune(
    @Param('year') year: number,
    @Param('month') month: number,
    @Query() dto: FortuneQueryDto,
    @Query('lang') lang?: string,
  ) {
    return this.consultService.getFortune('monthly', dto, year, month, lang || 'zh-CN');
  }

  @Get('fortune/yearly/:year')
  async getYearlyFortune(
    @Param('year') year: number,
    @Query() dto: FortuneQueryDto,
    @Query('lang') lang?: string,
  ) {
    return this.consultService.getFortune('yearly', dto, year, undefined, lang || 'zh-CN');
  }

  @Get('celebrity-cases')
  async getCelebrityCases(@Query('category') category?: string) {
    return this.consultService.getCelebrityCases(category);
  }

  @Get('celebrity-cases/:id')
  async getCelebrityCaseById(@Param('id') id: string) {
    return this.consultService.getCelebrityCaseById(id);
  }

  @Post('celebrity-cases/:id/similarity')
  async calculateSimilarity(
    @Param('id') id: string,
    @Body() dto: CelebritySimilarityDto,
  ) {
    return this.consultService.calculateCelebritySimilarity(id, dto);
  }

  @Post('records/:recordId/modules/:moduleId/destiny-snapshot')
  async saveDestinySnapshot(
    @Param('recordId') recordId: string,
    @Param('moduleId') moduleId: string,
    @Body() body: { destinyKline: any },
  ) {
    return this.consultService.saveDestinySnapshot(recordId, moduleId, body.destinyKline);
  }

  @Get('records/:recordId/modules/:moduleId')
  async getModuleStatus(
    @Param('recordId') recordId: string,
    @Param('moduleId') moduleId: string,
  ) {
    const runs = await this.prisma.generationRun.findMany({
      where: { recordId, moduleId },
      orderBy: { createdAt: 'desc' },
    });

    const record = await this.prisma.consultRecord.findUnique({ where: { id: recordId } });

    // 统一提取 followUpQuestions
    let followUpQuestions: string[] = [];
    if (record?.analysisData) {
      try {
        const parsed = JSON.parse(record.analysisData as string);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          followUpQuestions = parsed.followUpQuestions || [];
        }
      } catch { /* old format */ }
    }

    // 无 GenerationRun：从主记录推断状态
    if (runs.length === 0) {
      if (!record) {
        // 记录不存在 → not_found
        return {
          recordId,
          moduleId,
          status: 'not_found',
          content: null,
          followUpQuestions: [],
          errorCode: 'not_found',
          errorMessage: '记录不存在',
          startedAt: null,
          finishedAt: null,
        };
      }

      const recordStatus = record.status;
      // 映射主记录状态到模块状态
      let moduleStatus: 'pending' | 'running' | 'completed' | 'failed' | 'not_found';
      if (recordStatus === 'completed') {
        moduleStatus = 'completed';
      } else if (recordStatus === 'processing' || recordStatus === 'analyzing') {
        moduleStatus = 'running';
      } else if (recordStatus === 'failed') {
        moduleStatus = 'failed';
      } else if (!record) {
        moduleStatus = 'not_found';
      } else {
        moduleStatus = 'pending';
      }

      return {
        recordId,
        moduleId,
        status: moduleStatus,
        content: record?.llmResult || record?.analysisData || null,
        followUpQuestions,
        errorCode: moduleStatus === 'failed' ? 'provider_failed' : null,
        errorMessage: null,
        startedAt: record?.createdAt?.toISOString() || null,
        finishedAt: moduleStatus === 'completed' ? record?.updatedAt?.toISOString() || null : null,
      };
    }

    // 有 GenerationRun：直接映射
    const latestRun = runs[0];
    const runStatus = latestRun.status;
    let moduleStatus: 'pending' | 'running' | 'completed' | 'failed' | 'not_found';
    if (runStatus === 'completed') {
      moduleStatus = 'completed';
    } else if (runStatus === 'pending') {
      moduleStatus = 'pending';
    } else if (runStatus === 'failed_retryable' || runStatus === 'failed') {
      moduleStatus = 'failed';
    } else {
      moduleStatus = 'running';
    }

    return {
      recordId,
      moduleId,
      status: moduleStatus,
      content: latestRun.finalJson,
      followUpQuestions,
      errorCode: latestRun.errorCode || null,
      errorMessage: latestRun.errorMessage || null,
      startedAt: latestRun.createdAt?.toISOString() || null,
      finishedAt: moduleStatus === 'completed' ? latestRun.updatedAt?.toISOString() || null : null,
    };
  }

  @Post('records/:id/behavior')
  @UseGuards(OptionalJwtAuthGuard)
  async saveBehavior(
    @Param('id') id: string,
    @Body() body: BehaviorEventDto,
    @Request() req?: any,
  ) {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id },
      select: { id: true, userId: true, anonymousId: true },
    });

    if (!record) {
      throw new NotFoundException('咨询记录不存在');
    }

    const { eventType, payload } = this.normalizeBehaviorEvent(body);
    const identityKey = req?.user?.id || body.sessionId || record.userId || record.anonymousId || `record:${id}`;
    await this.behaviorService.track(String(identityKey), id, eventType);

    await this.prisma.interactionEvent.create({
      data: {
        userId: req?.user?.id || record.userId || null,
        sessionId: body.sessionId || record.anonymousId || null,
        recordId: id,
        eventType,
        eventJson: JSON.stringify(payload || {}),
      },
    });

    if (['poster_generated', 'poster_saved', 'poster_shared'].includes(eventType)) {
      await this.prisma.consultRecord.update({
        where: { id },
        data: { shareGenerated: true },
      });
    }

    return { success: true, recordId: id, eventType };
  }

  @Post('records/:recordId/modules/:moduleId/retry')
  async retryModule(
    @Param('recordId') recordId: string,
    @Param('moduleId') moduleId: string,
  ) {
    const existing = await this.prisma.generationRun.findFirst({
      where: { recordId, moduleId, status: 'failed_retryable' },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return { error: 'no_retryable_module', message: '该模块没有可重试的失败记录' };
    }

    await this.prisma.generationRun.update({
      where: { id: existing.id },
      data: { status: 'pending' },
    });

    const record = await this.prisma.consultRecord.findUnique({ where: { id: recordId } });
    if (record) {
      try {
        const inputData = record.inputData ? JSON.parse(record.inputData as string) : {};
        await this.orchestrator.enqueue({
          recordId,
          question: record.question || inputData.question || '',
          birthInfo: inputData.birthDate ? {
            year: new Date(inputData.birthDate).getFullYear(),
            month: new Date(inputData.birthDate).getMonth() + 1,
            day: new Date(inputData.birthDate).getDate(),
            hour: inputData.birthTime ? parseInt(inputData.birthTime.split(':')[0], 10) : 12,
            gender: inputData.gender || 'male',
          } : undefined,
          askTime: inputData.askTime,
          explicitRouteType: (inputData.routeType || inputData.route_type) as 'liuren' | 'qimen' | 'ziping' | 'ziwei' | 'liuyao' | 'quming' | 'meihua' | undefined,
        });
        await this.prisma.interactionEvent.create({
          data: {
            userId: record.userId || null,
            sessionId: record.anonymousId || null,
            recordId,
            eventType: 'module_retry',
            eventJson: JSON.stringify({ moduleId }),
          },
        });
      } catch (err) {
        return { error: 'retry_enqueue_failed', message: '重试入队失败: ' + (err as Error).message };
      }
    }

    return {
      data: {
        recordId,
        moduleId,
        status: 'processing',
        message: '重试任务已加入队列',
      },
      error: null,
    };
  }

  @Get('admin/asset-overview')
  @UseGuards(JwtAuthGuard)
  async getAssetOverview(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('moduleType') moduleType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // 管理员权限校验 — 返回 403 而非 200
    if (!req.user?.isAdmin) {
      throw new ForbiddenException('需要管理员权限');
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // 构建查询条件
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 查询记录 + 手动查询关联的 GenerationRun（schema 无 @relation 定义，无法 include）
    const [records, total] = await Promise.all([
      this.prisma.consultRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip,
      }),
      this.prisma.consultRecord.count({ where }),
    ]);

    // 批量查询所有关联的 GenerationRun
    const recordIds = records.map((r) => r.id);
    const generationRuns = recordIds.length > 0
      ? await this.prisma.generationRun.findMany({
          where: { recordId: { in: recordIds } },
          select: {
            recordId: true,
            moduleId: true,
            status: true,
            qualityScore: true,
            provider: true,
            model: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // 按 recordId 分组
    const runsByRecordId = new Map<string, typeof generationRuns>();
    for (const gr of generationRuns) {
      const list = runsByRecordId.get(gr.recordId) || [];
      list.push(gr);
      runsByRecordId.set(gr.recordId, list);
    }

    // 合并记录与 GenerationRun
    const recordsWithRuns = records.map((r) => ({
      ...r,
      generationRuns: runsByRecordId.get(r.id) || [],
    }));

    // 如果指定了 moduleType，过滤 generationRuns
    const filtered = moduleType
      ? recordsWithRuns.map((r) => ({
          ...r,
          generationRuns: r.generationRuns.filter((gr) => gr.moduleId === moduleType),
        })).filter((r) => r.generationRuns.length > 0)
      : recordsWithRuns;

    return {
      data: filtered,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 查询当前用户的取名历史
   */
  @Get('naming/history')
  @UseGuards(JwtAuthGuard)
  async getNamingHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize || '20', 10)));

    const [records, total] = await Promise.all([
      this.prisma.namingResult.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
      this.prisma.namingResult.count({ where: { userId } }),
    ]);

    const recordIds = records.map((record) => record.consultRecordId);
    const events = recordIds.length > 0
      ? await this.prisma.interactionEvent.findMany({
          where: {
            recordId: { in: recordIds },
            eventType: { in: [
              'naming_favorite', 'naming_unfavorite', 'naming_remove', 'naming_restore',
              'naming_compare', 'naming_final_select', 'naming_iteration_requested',
            ] },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const eventsByRecord = new Map<string, typeof events>();
    for (const event of events) {
      if (!event.recordId) continue;
      const list = eventsByRecord.get(event.recordId) || [];
      list.push(event);
      eventsByRecord.set(event.recordId, list);
    }

    const enrichedRecords = records.map((record) => {
      const state = rebuildNamingSelectionState(eventsByRecord.get(record.consultRecordId) || []);
      let names: unknown = [];
      try { names = JSON.parse(record.names || '[]'); } catch { names = []; }
      return {
        ...record,
        names,
        selectionState: {
          favoriteCandidateIds: state.favoriteCandidateIds,
          removedCandidateIds: state.removedCandidateIds,
          compareCandidateIds: state.compareCandidateIds,
          finalCandidateId: state.finalCandidateId,
        },
        iterationCount: state.iterationCount,
      };
    });

    return {
      records: enrichedRecords,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    };
  }
}
