// ============================================================
// 人生K线 + 潮汐图 — REST 控制器层（V1，已弃用）
//
// P1-08 (2026-07-12): 此控制器已标记为 @deprecated
// 新客户端应使用 /api/v1/kline-v2/* 端点（见 kline-v2.controller.ts）
// 所有响应附带 X-Deprecation: kline-v1-deprecated header
// 保留 14 天只读兼容期，之后将下线
//
// 路由前缀（全局 /api/v1 已设置）：
//   GET /api/v1/kline-tide/bars         — K线数据（七线 OHLCV）
//   GET /api/v1/kline-tide/snapshots    — 月度状态快照（12维向量）
//   GET /api/v1/kline-tide/phase-points — 相位空间散点
//   GET /api/v1/kline-tide/package      — 完整潮汐数据包
//   POST /api/v1/kline-tide/seed        — 重新生成模拟数据（开发用）
//
// 所有 GET 端点均需 JWT 认证 + 积分/会员门控
// ============================================================

import { Controller, Get, Post, Query, Request, UseGuards, Res, UseInterceptors } from '@nestjs/common';
import { KlineTideService, TidePackageOptions } from './kline-tide.service';
import { KlineScoringService, TripleLineScores } from './kline-scoring.service';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { V1DeprecationInterceptor } from './v1-deprecation.interceptor';

/**
 * @deprecated P1-08: 此控制器为 V1 兼容期产物，14 天后下线。
 * 新客户端请使用 KlineV2Controller (/api/v1/kline-v2/*)
 */
@Controller('kline-tide')
@UseInterceptors(V1DeprecationInterceptor)
export class KlineTideController {
  constructor(
    private readonly ktService: KlineTideService,
    private readonly scoringService: KlineScoringService,
    private readonly membershipService: MembershipService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // GET /api/v1/kline-tide/bars?from=2025-01&to=2025-06
  // 获取K线数据：七条人生线 OHLCV（career/wealth/health/...）
  // ============================================================

  @Get('bars')
  @UseGuards(JwtAuthGuard)
  async getKlineBars(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user?.id;
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      return { gated: true, moduleId: 'kline', creditsNeeded: 3 };
    }
    return this.ktService.getKlineBars(userId, from, to);
  }

  // ============================================================
  // GET /api/v1/kline-tide/snapshots?from=2025-01&to=2025-06
  // 获取月度状态快照：12维状态向量 + 衍生指标
  // ============================================================

  @Get('snapshots')
  @UseGuards(JwtAuthGuard)
  async getStateSnapshots(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user?.id;
    const access = await this.membershipService.checkAccess(userId, 'tide_radar');
    if (!access) {
      return { gated: true, moduleId: 'tide_radar', creditsNeeded: 3 };
    }
    return this.ktService.getStateSnapshots(userId, from, to);
  }

  // ============================================================
  // GET /api/v1/kline-tide/phase-points?from=2025-01&to=2025-06
  // 获取相位空间散点（免费引流入口）
  // ============================================================

  @Get('phase-points')
  @UseGuards(JwtAuthGuard)
  async getPhasePoints(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user?.id;
    // 相位空间免费开放，作为引流入口
    const pkg = await this.ktService.getTidePackage(userId, { from, to });
    return pkg.phasePoints;
  }

  // ============================================================
  // GET /api/v1/kline-tide/package?from=2025-01&to=2025-06
  // 一次性获取完整潮汐数据包（K线 + 状态快照 + 相位点）
  // 需要 kline 模块权限（积分或会员）
  // ============================================================

  @Get('package')
  @UseGuards(JwtAuthGuard)
  async getTidePackage(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const userId = req.user?.id;

    // 检查 kline 模块权限（会员层级 or 积分）
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      // 免费用户：返回部分数据 + gated='partial' 标记
      // 前端可展示 K线概览 + 3 个关键节点，其余截断
      const options: TidePackageOptions = {};
      if (from) options.from = from;
      if (to)   options.to = to;
      const fullPkg = await this.ktService.getTidePackage(userId, options);

      // 截取前3个K线节点作为免费预览
      const previewBars = fullPkg.klineBars.slice(0, 3);
      const previewSnapshots = fullPkg.stateSnapshots.slice(0, 3);
      const previewPhasePoints = fullPkg.phasePoints.slice(0, 3);

      // 获取用户积分余额（不触发扣费）
      const creditInfo = await this.membershipService.getCreditBalance(userId);

      return {
        klineBars: previewBars,
        stateSnapshots: previewSnapshots,
        phasePoints: previewPhasePoints,
        // B-S2 (2026-07-05): 透传 tideJudgment（基于最新 snapshot 生成，与 preview 截取无关）
        tideJudgment: fullPkg.tideJudgment,
        meta: {
          ...fullPkg.meta,
          totalBars: fullPkg.klineBars.length,
          totalSnapshots: fullPkg.stateSnapshots.length,
          totalPhasePoints: fullPkg.phasePoints.length,
        },
        gated: 'partial',
        moduleId: 'kline',
        creditsNeeded: 3,
        creditBalance: creditInfo.balance ?? 0,
        requiredPlan: 'month',
        message: '免费用户可查看 3 个关键节点，解锁后查看完整 K线推演',
      };
    }

    const options: TidePackageOptions = {};
    if (from) options.from = from;
    if (to)   options.to = to;

    return this.ktService.getTidePackage(userId, options);
  }

  // ============================================================
  // GET /api/v1/kline-tide/scores
  // P1-T2.3: 三线命理评分 + 免费预览/会员分层
  //
  // 分层规则：
  //   - 免费用户：只返回 career（事业线）评分 + gated='preview'
  //   - 会员/已解锁kline模块：返回完整三线评分
  //   - 无八字档案：返回兜底评分（source='fallback'）
  // ============================================================
  @Get('scores')
  @UseGuards(JwtAuthGuard)
  async getBaziScores(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    // 加载八字档案
    let bazi: any = null;
    try {
      bazi = await (this.prisma as any).baZiProfile.findUnique({
        where: { userId },
      });
    } catch (err: any) {
      // 表可能未迁移，返回兜底
    }

    const fullScores: TripleLineScores = this.scoringService.score(bazi);

    // 检查 kline 模块权限
    const hasAccess = await this.membershipService.checkAccess(userId, 'kline');
    if (!hasAccess) {
      // 免费用户：只返回事业线评分作为预览
      const creditInfo = await this.membershipService.getCreditBalance(userId);
      return {
        // 免费预览：仅事业线
        career: fullScores.career,
        // 截断的维度标记为 gated
        wealth: {
          dimension: 'wealth',
          score: null,
          reasoning: '解锁后查看财富线命理评分',
          factors: [],
        },
        relationship: {
          dimension: 'relationship',
          score: null,
          reasoning: '解锁后查看情感线命理评分',
          factors: [],
        },
        source: fullScores.source,
        scoredAt: fullScores.scoredAt,
        gated: 'preview',
        moduleId: 'kline',
        creditsNeeded: 3,
        creditBalance: creditInfo.balance ?? 0,
        requiredPlan: 'month',
        message: '免费用户可查看事业线评分，解锁后查看完整三线命理分析',
      };
    }

    // 会员：返回完整三线评分
    return {
      ...fullScores,
      gated: false,
    };
  }

  // ============================================================
  // GET /api/v1/kline-tide/node-explanation?monthLabel=2025-06&compositeCapital=65
  // P1-T2.4: 关键节点命理LLM解释 + 兜底
  // 返回4字段：llmSummary / baziBasis / riskHint / actionSuggestion
  // ============================================================
  @Get('node-explanation')
  @UseGuards(JwtAuthGuard)
  async getNodeExplanation(
    @Request() req: any,
    @Query('monthLabel') monthLabel?: string,
    @Query('compositeCapital') compositeCapital?: string,
    @Query('stage') stage?: string,
  ) {
    const userId = req.user?.id;
    return this.ktService.generateNodeExplanation(userId, {
      monthLabel: monthLabel || new Date().toISOString().slice(0, 7),
      compositeCapital: Number(compositeCapital) || 50,
      stage: stage || undefined,
    });
  }

  // ============================================================
  // GET /api/v1/kline-tide/current-stage?targetDate=2026-06&questionType=事业&recordId=xxx
  // 任务 2.1：获取"问此事"所处的状态窗口（6态之一）
  // 复用 kline 模块权限；无权限返回 gated 标记
  // ============================================================
  @Get('current-stage')
  @UseGuards(JwtAuthGuard)
  async getCurrentStage(
    @Request() req: any,
    @Query('targetDate') targetDate?: string,
    @Query('questionType') questionType?: string,
    @Query('recordId') recordId?: string,
    @Query('profileId') profileId?: string,
    @Query('birthDate') birthDate?: string,
  ) {
    const userId = req.user?.id;

    // 权限检查：kline 模块
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      const creditInfo = await this.membershipService.getCreditBalance(userId);
      return {
        gated: true,
        moduleId: 'kline',
        creditsNeeded: 3,
        creditBalance: creditInfo.balance ?? 0,
        requiredPlan: 'month',
        message: '解锁 K线/潮汐图后可查看当前状态窗口',
      };
    }

    return this.ktService.getCurrentStage({
      userId,
      profileId,
      birthDate,
      targetDate,
      questionType,
      recordId,
    });
  }

  // ============================================================
  // POST /api/v1/kline-tide/seed
  // 清空并重新生成模拟数据（仅开发/测试环境使用）
  // ============================================================

  @Post('seed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async seed(
    @Query('userId') userId?: string,
    @Query('klineMonths') klineMonths?: string,
    @Query('tideMonths') tideMonths?: string,
  ) {
    return this.ktService.seed(
      userId || 'demo-user',
      Number(klineMonths) || 36,
      Number(tideMonths) || 12,
    );
  }
}
