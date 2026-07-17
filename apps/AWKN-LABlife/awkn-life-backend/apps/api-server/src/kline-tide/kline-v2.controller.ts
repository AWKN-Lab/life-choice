/**
 * KlineV2Controller — V2 K线 API（P1-06）
 *
 * 来源：TECHNICAL-REFERENCE-P01 §3.3
 *
 * 端点：
 *   GET    /api/v1/kline-v2                            — 获取当前用户最新 ViewModelV2
 *   POST   /api/v1/kline-v2/generate                  — 触发生成新 snapshot
 *   GET    /api/v1/kline-v2/snapshots/:snapshotId      — 获取指定 snapshot
 *   GET    /api/v1/kline-v2/snapshots                   — 列出用户所有 snapshot
 *   POST   /api/v1/kline-v2/nodes/:nodeId/ask          — 节点问事
 *   POST   /api/v1/kline-v2/nodes/:nodeId/outcome      — 回写节点结果
 *   GET    /api/v1/kline-v2/share/:token               — 公开分享预览（脱敏）
 *
 * 功能开关：KLINE_V2_ENABLED（生产默认 false）
 *
 * 鉴权：
 *   - GET endpoints: JWT
 *   - POST generate: JWT + 会员校验
 *   - POST nodes/ask: JWT + 积分校验
 *   - GET share: 无（脱敏）
 *
 * 旧 API 兼容：保留 /api/v1/kline-tide/* 14 天只读
 */

import {
  Controller, Get, Post, Param, Body, Query, Request, UseGuards,
  ForbiddenException, NotFoundException, BadRequestException, Headers,
  Logger,
} from '@nestjs/common';
import { KlineSnapshotService } from './kline-snapshot.service';
import { KlineTideService } from './kline-tide.service';
import { KlineCalculationEngine } from './kline-calculation.engine';
import { KlineDecisionService } from './kline-decision.service';
import { MembershipService } from '../membership/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { KlineProductViewModelV2 } from './v2-contracts';

// ============================================================
// DTO
// ============================================================

export class GenerateSnapshotDto {
  profileId?: string;
  birthDate?: string;
  birthTime?: string;
  viewMode?: 'life' | 'decade' | 'yearMonth';
  /** Phase 1 Step 1.2：yearMonth 模式固定 36 个月，rangeYears 已废弃 */
  /** Phase 1 Step 1.4：性别影响 relationship 线计算（男财女官） */
  gender?: 'male' | 'female';
}

export class NodeAskDto {
  question: string;
  questionType?: string;
}

export class NodeOutcomeDto {
  result: 'occurred' | 'not_occurred' | 'partial';
  actualScore?: number;
  notes?: string;
}

// ============================================================
// Controller
// ============================================================

@Controller('kline-v2')
export class KlineV2Controller {
  private readonly logger = new Logger(KlineV2Controller.name);

  constructor(
    private readonly snapshotService: KlineSnapshotService,
    private readonly tideService: KlineTideService,
    private readonly calcEngine: KlineCalculationEngine,
    private readonly decisionService: KlineDecisionService,
    private readonly membershipService: MembershipService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // 全局功能开关校验（每次请求都过）
  // ============================================================

  private assertV2Enabled(): void {
    const enabled = process.env.KLINE_V2_ENABLED === 'true';
    if (!enabled) {
      throw new ForbiddenException(
        'K线V2功能未启用 (KLINE_V2_ENABLED=false)。请使用 /api/v1/kline-tide/* 兼容端点。',
      );
    }
  }

  // 添加弃用 header（旧客户端可识别）
  private addDeprecationHeader(res?: any): void {
    if (res?.setHeader) {
      res.setHeader('X-Deprecation', 'kline-v1-deprecated');
    }
  }

  // ============================================================
  // GET /api/v1/kline-v2 — 获取当前用户最新 ViewModelV2
  // ============================================================

  @Get()
  @UseGuards(JwtAuthGuard)
  async getLatest(
    @Request() req: any,
    @Headers() headers: any,
  ): Promise<KlineProductViewModelV2 | { gated: true; moduleId: string }> {
    this.assertV2Enabled();

    const userId = req.user?.id;

    // 权限校验：会员 或 积分
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      return {
        gated: true,
        moduleId: 'kline',
      };
    }

    const vm = await this.snapshotService.getLatestSnapshot(userId);
    if (!vm) {
      throw new NotFoundException(
        '尚无 K线V2 快照，请先调用 POST /api/v1/kline-v2/generate',
      );
    }

    // 根据权益裁剪 entitlements
    return this.applyEntitlements(vm, access as any);
  }

  // ============================================================
  // POST /api/v1/kline-v2/generate — 触发生成新 snapshot
  // ============================================================

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(
    @Request() req: any,
    @Body() dto: GenerateSnapshotDto,
  ): Promise<{
    snapshotId: string;
    viewModel: KlineProductViewModelV2;
  }> {
    this.assertV2Enabled();

    const userId = req.user?.id;

    // 权限校验：会员 或 积分
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      throw new ForbiddenException({
        message: '需要 kline 模块权限',
        moduleId: 'kline',
        creditsNeeded: 3,
      });
    }

    // 加载八字档案
    const profile = await this.loadBaziProfile(userId, dto.profileId, dto.birthDate, dto.birthTime);
    if (!profile) {
      throw new BadRequestException(
        '未找到八字档案，请先创建档案或提供 birthDate/birthTime',
      );
    }

    // 计算引擎：生成 bars（Phase 1：asOfDate 必填，yearMonth 默认 36 个月，gender 影响三线）
    const asOfDate = new Date();
    const calcResult = this.calcEngine.calculate({
      baziResult: profile.baziResult,
      birthYear: profile.birthYear,
      viewMode: dto.viewMode ?? 'yearMonth',
      asOfDate,
      birthTime: dto.birthTime ?? profile.birthTime,
      gender: dto.gender ?? profile.gender ?? 'male',
    });

    // 决策服务：生成阶段 + 节点（从 asOfDate 派生，无 new Date() 隐式读取）
    const currentYear = asOfDate.getFullYear();
    const currentMonth = asOfDate.getMonth() + 1;
    const decision = this.decisionService.decideV2(
      calcResult.bars,
      'placeholder', // 占位，snapshotService 会用真实 snapshotId 替换
      currentYear,
      currentMonth,
    );

    // 创建快照
    const result = await this.snapshotService.createSnapshot({
      userId,
      profileId: profile.profileId,
      bars: calcResult.bars,
      decision,
      sourceSummary: ['calculated'],
      confidence: 0.75,
    });

    this.logger.log(
      `[generate] userId=${userId} snapshotId=${result.snapshotId} bars=${calcResult.bars.length}`,
    );

    return result;
  }

  // ============================================================
  // GET /api/v1/kline-v2/snapshots/:snapshotId — 获取指定 snapshot
  // ============================================================

  @Get('snapshots/:snapshotId')
  @UseGuards(JwtAuthGuard)
  async getSnapshot(
    @Request() req: any,
    @Param('snapshotId') snapshotId: string,
  ): Promise<KlineProductViewModelV2> {
    this.assertV2Enabled();

    const userId = req.user?.id;
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      throw new ForbiddenException({ message: '需要 kline 模块权限', moduleId: 'kline' });
    }

    const vm = await this.snapshotService.getSnapshotById(snapshotId, userId);
    if (!vm) {
      throw new NotFoundException(`snapshot ${snapshotId} 不存在`);
    }

    return this.applyEntitlements(vm, access as any);
  }

  // ============================================================
  // GET /api/v1/kline-v2/snapshots — 列出用户所有 snapshot
  // ============================================================

  @Get('snapshots')
  @UseGuards(JwtAuthGuard)
  async listSnapshots(
    @Request() req: any,
    @Query('limit') limit?: string,
  ): Promise<Array<{
    snapshotId: string;
    generatedAt: string;
    status: string;
    dataVersion: string;
    algorithmVersion: string;
    confidence: number | null;
    degraded: boolean;
  }>> {
    this.assertV2Enabled();

    const userId = req.user?.id;
    const n = limit ? parseInt(limit, 10) : 20;
    return this.snapshotService.listSnapshots(userId, n);
  }

  // ============================================================
  // POST /api/v1/kline-v2/nodes/:nodeId/ask — 节点问事
  // ============================================================

  @Post('nodes/:nodeId/ask')
  @UseGuards(JwtAuthGuard)
  async askNode(
    @Request() req: any,
    @Param('nodeId') nodeId: string,
    @Body() dto: NodeAskDto,
  ): Promise<{
    consultRecordId: string;
    message: string;
  }> {
    this.assertV2Enabled();

    // 节点问事功能开关
    if (process.env.KLINE_V2_NODE_ASK_ENABLED !== 'true') {
      throw new ForbiddenException(
        '节点问事功能未启用 (KLINE_V2_NODE_ASK_ENABLED=false)',
      );
    }

    const userId = req.user?.id;

    // 1. 校验节点存在且属于该用户
    const node = await this.prisma.klineNode.findUnique({
      where: { id: nodeId },
    });
    if (!node) {
      throw new NotFoundException(`节点 ${nodeId} 不存在`);
    }

    // 通过 snapshot 校验归属
    const snapshot = await this.prisma.klineSnapshot.findUnique({
      where: { id: node.snapshotId },
    });
    if (!snapshot || snapshot.userId !== userId) {
      throw new ForbiddenException('节点不属于该用户');
    }

    // 2. 校验积分
    const access = await this.membershipService.checkAccess(userId, 'kline');
    if (!access) {
      throw new ForbiddenException({
        message: '需要 kline 模块权限或积分',
        moduleId: 'kline',
        creditsNeeded: 3,
      });
    }

    // 3. 创建 ConsultRecord（简化：直接调用 consult 模块或 tideService）
    // 这里仅做占位：实际实现需要接入 ConsultService
    const consultRecordId = `consult-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 4. 标记节点已问事
    await this.snapshotService.markNodeAsked(nodeId, consultRecordId);

    this.logger.log(
      `[askNode] userId=${userId} nodeId=${nodeId} consultRecordId=${consultRecordId}`,
    );

    return {
      consultRecordId,
      message: `节点问事已创建。问题: ${dto.question}`,
    };
  }

  // ============================================================
  // POST /api/v1/kline-v2/nodes/:nodeId/outcome — 回写节点结果
  // ============================================================

  @Post('nodes/:nodeId/outcome')
  @UseGuards(JwtAuthGuard)
  async writeOutcome(
    @Request() req: any,
    @Param('nodeId') nodeId: string,
    @Body() dto: NodeOutcomeDto,
  ): Promise<{ outcomeId: string; message: string }> {
    this.assertV2Enabled();

    // 结果回写功能开关
    if (process.env.KLINE_V2_OUTCOME_ENABLED !== 'true') {
      throw new ForbiddenException(
        '结果回写功能未启用 (KLINE_V2_OUTCOME_ENABLED=false)',
      );
    }

    const userId = req.user?.id;

    // 校验节点存在且属于该用户
    const node = await this.prisma.klineNode.findUnique({
      where: { id: nodeId },
    });
    if (!node) {
      throw new NotFoundException(`节点 ${nodeId} 不存在`);
    }

    const snapshot = await this.prisma.klineSnapshot.findUnique({
      where: { id: node.snapshotId },
    });
    if (!snapshot || snapshot.userId !== userId) {
      throw new ForbiddenException('节点不属于该用户');
    }

    // 写入结果
    const result = await this.snapshotService.writeOutcome({
      nodeId,
      userId,
      result: dto.result,
      actualScore: dto.actualScore,
      notes: dto.notes,
      source: 'user_reported',
    });

    return {
      outcomeId: result.outcomeId,
      message: `节点结果已回写: ${dto.result}`,
    };
  }

  // ============================================================
  // GET /api/v1/kline-v2/share/:token — 公开分享预览（脱敏）
  // ============================================================

  @Get('share/:token')
  @UseGuards(OptionalJwtAuthGuard)
  async sharePreview(
    @Request() req: any,
    @Param('token') token: string,
  ): Promise<{
    snapshotId: string;
    preview: {
      meta: KlineProductViewModelV2['meta'];
      current: KlineProductViewModelV2['current'];
      series: { overall: KlineProductViewModelV2['series']['overall'] };
      windows: { opportunity: KlineProductViewModelV2['windows']['opportunity'] };
    };
    loginRequired: true;
  }> {
    this.assertV2Enabled();

    if (process.env.KLINE_V2_PUBLIC_PREVIEW_ENABLED !== 'true') {
      throw new ForbiddenException('公开分享预览功能未启用');
    }

    // token 解析：简化为 "snapshotId" 直接作为 token
    // 实际生产应使用签名 token（如 JWT）
    const snapshotId = token;
    const vm = await this.snapshotService.getSnapshotById(snapshotId);
    if (!vm) {
      throw new NotFoundException('分享链接无效或已失效');
    }

    // 脱敏：只返回预览部分
    return {
      snapshotId,
      preview: {
        meta: vm.meta,
        current: vm.current,
        series: { overall: vm.series.overall.slice(0, 5) }, // 只返回前 5 个点
        windows: { opportunity: vm.windows.opportunity.slice(0, 1) }, // 只返回 1 个节点
      },
      loginRequired: true,
    };
  }

  // ============================================================
  // 私有：加载八字档案
  // ============================================================

  private async loadBaziProfile(
    userId: string,
    profileId?: string,
    birthDate?: string,
    birthTime?: string,
  ): Promise<{
    profileId: string;
    baziResult: any;
    birthYear: number;
    birthTime?: string;
    gender?: 'male' | 'female';
  } | null> {
    try {
      // 优先按 profileId 加载
      const profile = profileId
        ? await (this.prisma as any).baZiProfile.findUnique({ where: { id: profileId } })
        : await (this.prisma as any).baZiProfile.findFirst({ where: { userId } });

      if (!profile) return null;

      // 解析 baziResult（可能是 JSON 字符串）
      const baziResult = typeof profile.baziResult === 'string'
        ? JSON.parse(profile.baziResult)
        : profile.baziResult;

      // birthYear 从 birthDate 解析，或从 baziResult
      const birthYear = profile.birthYear
        || (profile.birthDate ? new Date(profile.birthDate).getFullYear() : 1990);

      // Phase 1 Step 1.4：从 profile 读取 gender（可能不存在，默认 male）
      const gender = (profile.gender === 'female' || profile.gender === 'male')
        ? profile.gender
        : undefined;

      return {
        profileId: profile.id,
        baziResult,
        birthYear,
        birthTime: birthTime ?? profile.birthTime,
        gender,
      };
    } catch (err: any) {
      this.logger.error(`[loadBaziProfile] userId=${userId} 失败: ${err.message}`);
      return null;
    }
  }

  // ============================================================
  // 私有：根据权益裁剪 ViewModel
  // ============================================================

  private applyEntitlements(
    vm: KlineProductViewModelV2,
    access: { tier?: string; canViewDomainLines?: boolean; canViewAllNodes?: boolean; canAskNode?: boolean },
  ): KlineProductViewModelV2 {
    const isMember = access?.tier === 'month' || access?.tier === 'year';

    return {
      ...vm,
      entitlements: {
        canViewDomainLines: isMember,
        canViewAllNodes: isMember,
        canAskNode: isMember,
      },
      // 免费用户：截断 series.career/wealth/relationship（Phase 1 Step 1.4：三线改必填，免费用户返回空数组）
      series: isMember
        ? vm.series
        : {
            overall: vm.series.overall,
            career: [],
            wealth: [],
            relationship: [],
          },
      // 免费用户：只返回前 3 个节点
      windows: isMember
        ? vm.windows
        : {
            opportunity: vm.windows.opportunity.slice(0, 1),
            risk: vm.windows.risk.slice(0, 1),
          },
    };
  }
}
