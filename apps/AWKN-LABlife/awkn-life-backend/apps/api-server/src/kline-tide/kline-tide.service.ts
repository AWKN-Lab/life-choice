// ============================================================
// 人生K线 + 潮汐图 — 数据服务层
// 阶段一（2026-06-09）：SQLite 持久化 + 内存 fallback 生成
// 阶段二：接入 Supabase + LLM 推导
//
// 核心职责：
//   - 查询 KlineBar / StateSnapshot 表
//   - 解析 KlineBar 中以 JSON 字符串存储的 OHLCV 字段
//   - 组合数据包（klineBars + stateSnapshots + phasePoints）
// ============================================================

import { Injectable, Logger, Inject, Optional, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvidersService, LlmMessage } from '../llm-providers/llm-providers.service';
import { KlineScoringService, TripleLineScores } from './kline-scoring.service';
import { TideJudgmentService, TideJudgment } from '../tide-inference/tide-judgment.service';

// ==================== 类型定义 ====================

/** 单条 OHLCV 数据结构（对应每条人生线的一个月数据） */
export interface OhlcvData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TideFactorScores {
  trend: number;
  pressure: number;
  liquidity: number;
  stability: number;
}

export interface TideStateProbabilities {
  prosperous: number;
  exploration: number;
  recovery: number;
  risk: number;
}

export interface TideWindowScores {
  short: number;
  mid: number;
  long: number;
}

/** KlineBar 七条人生线维度名称 */
export type KlineDimension =
  | 'career'       // 事业线
  | 'wealth'       // 财富线
  | 'health'       // 健康线
  | 'relationship' // 关系线
  | 'growth'       // 成长线
  | 'freedom'      // 自由线
  | 'buffer';      // 缓冲线

/** 七线维度名称列表 */
const KLINE_DIMS: KlineDimension[] = [
  'career', 'wealth', 'health', 'relationship', 'growth', 'freedom', 'buffer',
];

/**
 * K线/潮汐数据来源标识（Step 12 - P0治理 2026-07-03）
 * - real: 数据库中的真实数据（非LLM推导）
 * - simulated: seed生成的模拟数据（ALLOW_SEED_WRITE=true时）
 * - llm_inferred: LLM推导的数据（compositeCapital>0 或 timeGroup非空）
 * - fallback: 降级数据（无数据且ALLOW_SEED_WRITE未启用）
 */
export type KlineDataSource = 'real' | 'simulated' | 'llm_inferred' | 'fallback';

/** 解析后的 KlineBar 数据（OHLCV JSON 字段已 parse） */
export interface ParsedKlineBar {
  id: string;
  userId: string;
  year: number;
  month: number;
  monthLabel: string;
  /** 主K柱 OHLCV */
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;

  /** 七条人生线的 OHLCV 数据（已从 JSON 字符串解析为对象） */
  career: OhlcvData;
  wealth: OhlcvData;
  health: OhlcvData;
  relationship: OhlcvData;
  growth: OhlcvData;
  freedom: OhlcvData;
  buffer: OhlcvData;

  /** 综合生命资本分 */
  compositeCapital: number;
  /** 波动率（七线标准差均值） */
  volatility: number;
  /** 上行机会分 */
  opportunityScore?: number;
  /** 下行风险分 */
  riskScore?: number;
  /** 机会影线 */
  upsideRange?: number;
  /** 风险影线 */
  downsideRange?: number;
  /** 主因子 */
  factorScores?: TideFactorScores;
  /** 阶段标签 */
  signalLabel?: string;
  /** 数据来源标识（Step 12 - P0治理 2026-07-03） */
  source?: KlineDataSource;
  createdAt: Date;
}

/** 解析后的 StateSnapshot 数据 */
export interface ParsedStateSnapshot {
  id: string;
  userId: string;
  year: number;
  month: number;
  /** 月份标签，格式 "YYYY-MM" */
  date: string;

  // 12维状态向量（0-100）
  energy: number;
  recovery: number;
  emotion: number;
  clarity: number;
  liquidity: number;
  momentum: number;
  support: number;
  agency: number;
  order: number;
  growth: number;
  optionality: number;
  buffer: number;

  // V0.7 时·位·心 三组聚合
  /** 时：avg(liquidity, momentum, optionality) */
  timeGroup: number;
  /** 位：avg(support, agency, order, growth, buffer) */
  positionGroup: number;
  /** 心：avg(energy, recovery, emotion, clarity) */
  mindGroup: number;
  /** 潮汐四主因子 */
  factorScores?: TideFactorScores;
  /** 综合潮汐分 */
  tideScore?: number;
  /** 短中长时间窗 */
  windowScores?: TideWindowScores;
  /** 四类状态代理概率 */
  stateProbabilities?: TideStateProbabilities;
  /** 当前动作偏向 */
  actionBias?: 'expand' | 'probe' | 'repair' | 'shrink';

  // 衍生指标
  /** 承载容量（= 五维均值：energy, recovery, liquidity, support, buffer） */
  capacity: number;
  /** 熵值（= 12维标准差/均值 × 100） */
  entropy: number;
  /** 相位象限：prosperous(扩张) / exploration(探索) / recovery(修复) / risk(风险) */
  quadrant: 'prosperous' | 'exploration' | 'recovery' | 'risk';
  /** 数据来源标识（Step 12 - P0治理 2026-07-03） */
  source?: KlineDataSource;
  createdAt: Date;
}

/** 相位空间散点（用于潮汐图相位空间可视化） */
export interface PhasePoint {
  /** 散点唯一标识 */
  id: string;
  /** 月份标签 */
  date: string;
  /** X轴：位（positionGroup） */
  x: number;
  /** Y轴：心（mindGroup） */
  y: number;
  /** 颜色映射：时（timeGroup） */
  timeGroup: number;
  /** 气泡大小：可选性 optionality */
  size: number;
  /** 相位象限 */
  quadrant: 'prosperous' | 'exploration' | 'recovery' | 'risk';
  /** 显示标签 */
  label: string;
  /** 当前建议动作 */
  actionBias?: 'expand' | 'probe' | 'repair' | 'shrink';
}

/** getTidePackage 的可选配置 */
export interface TidePackageOptions {
  /** 起始月份，格式 "YYYY-MM"，默认 "2023-01" */
  from?: string;
  /** 截止月份，格式 "YYYY-MM"，默认当前月 */
  to?: string;
  /** K线回溯月数（当 from/to 未指定时生效），默认 36 */
  klineMonths?: number;
  /** 状态快照回溯月数（当 from/to 未指定时生效），默认 12 */
  tideMonths?: number;
}

/** 完整潮汐数据包 */
export interface TidePackage {
  /** K线数据（七线 OHLCV 已解析） */
  klineBars: ParsedKlineBar[];
  /** 状态快照（12维向量） */
  stateSnapshots: ParsedStateSnapshot[];
  /** 相位空间散点（从 stateSnapshots 派生） */
  phasePoints: PhasePoint[];
  /** 潮汐判断（时·位·心 三组 + 阶段 + 短指令 + 窗口提示 + 行动建议）— B-S2 2026-07-05 */
  tideJudgment?: TideJudgment;
  /** 元数据 */
  meta: {
    generatedAt: string;
    userId: string;
    from?: string;
    to?: string;
    note: string;
    /** 数据来源标识（Step 12 - P0治理 2026-07-03）：整体数据源，取klineBars和stateSnapshots的最高优先级 */
    source?: KlineDataSource;
  };
}

// ==================== 任务 2.1：getCurrentStage 类型定义 ====================

/** getCurrentStage 的结构化输入 */
export interface KlineStageInput {
  /** 用户ID（必填） */
  userId?: string;
  /** 八字档案ID（可选，未来用于个性化推导） */
  profileId?: string;
  /** 出生日期（可选，备用） */
  birthDate?: string;
  /** 目标月份/日期，格式 "YYYY-MM"，默认当前月 */
  targetDate?: string;
  /** 问事类型（如"事业"/"财运"/"感情"），用于行动建议聚焦 */
  questionType?: string;
  /** 关联问事记录ID，可选 */
  recordId?: string;
}

/** 6 种状态窗口 */
export type CurrentStage =
  | 'breakthrough' // 突破：主升+综合分高+扩张概率高
  | 'attack'       // 进攻：主升或扩张象限
  | 'buildup'      // 蓄势：趋势积累+流动性好
  | 'pullback'     // 回撤：承压+稳定性低
  | 'repair'       // 修复：稳定性恢复+压力下降
  | 'wait';        // 等待：震荡整固

/** getCurrentStage 返回结果 */
export interface CurrentStageResult {
  /** 状态窗口（6态之一） */
  stage: CurrentStage;
  /** 中文标签 */
  stageLabel: string;
  /** 判断理由 */
  reason: string;
  /** 原始 signalLabel（5态） */
  signalLabel?: string;
  /** 原始 quadrant（4态） */
  quadrant?: string;
  /** 原始 actionBias（4态） */
  actionBias?: string;
  /** 综合潮汐分 */
  tideScore?: number;
  /** 扩张概率 */
  prosperousProb?: number;
  /** 目标月份 */
  targetDate?: string;
  /** 问事类型 */
  questionType?: string;
  /** 关联记录ID */
  recordId?: string;
  /** 行动建议 */
  actionAdvice: string;
  /** 窗口提示 */
  windowTip: string;
}

/** 6 态中文标签映射 */
const STAGE_LABELS: Record<CurrentStage, string> = {
  breakthrough: '突破',
  attack: '进攻',
  buildup: '蓄势',
  pullback: '回撤',
  repair: '修复',
  wait: '等待',
};

// ==================== 常量 ====================

/** 状态快照的12个维度名称 */
const STATE_DIMS = [
  'energy', 'recovery', 'emotion', 'clarity',
  'liquidity', 'momentum', 'support', 'agency',
  'order', 'growth', 'optionality', 'buffer',
] as const;

/** 承载容量计算所用维度 */
const CAPACITY_DIMS = ['energy', 'recovery', 'liquidity', 'support', 'buffer'] as const;

/** 象限中文标签映射 */
const QUADRANT_LABEL: Record<string, string> = {
  prosperous:  '扩张',
  exploration: '探索',
  recovery:    '修复',
  risk:        '风险',
};

// ==================== 服务实现 ====================

@Injectable()
export class KlineTideService {
  private readonly logger = new Logger(KlineTideService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
    private readonly scoringService?: KlineScoringService,
  ) {}

  /**
   * 类型断言辅助：PrismaClient 在运行时包含 KlineBar / StateSnapshot 模型，
   * 但 TypeScript 类型可能未同步（prisma generate 未更新时）。
   */
  private get db() {
    return this.prisma as any;
  }

  // ============================================================
  // getKlineBars — 查询 KlineBar 表并解析 OHLCV JSON 字段
  // ============================================================

  /**
   * 获取用户的人生K线数据
   *
   * @param userId - 用户ID
   * @param from   - 起始月份（格式 "YYYY-MM"），可选
   * @param to     - 截止月份（格式 "YYYY-MM"），可选
   * @returns 解析后的 KlineBar 数组，七线 OHLCV 已从 JSON 字符串解析为对象
   */
  async getKlineBars(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<ParsedKlineBar[]> {
    // 构造查询条件：userId + monthLabel 范围过滤
    const where: any = { userId };
    if (from || to) {
      where.monthLabel = {};
      if (from) where.monthLabel.gte = from;   // "YYYY-MM" 字典序比较
      if (to)   where.monthLabel.lte = to;
    }

    let dbBars = await this.db.klineBar.findMany({
      where,
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // Step 12 - P0治理 (2026-07-03): 数据来源标识
    // P01 数据契约 (Phase 6): 优先用 DB source 字段，unknown 时用 compositeCapital 启发式判断
    const resolveKlineSource = (b: any): KlineDataSource => {
      const dbSource = b.source as string | undefined;
      if (dbSource && dbSource !== 'unknown') return dbSource as KlineDataSource;
      // 兼容旧数据（source='unknown'）：compositeCapital > 0 视为 llm_inferred
      return b.compositeCapital > 0 ? 'llm_inferred' : 'real';
    };

    // 如果已有数据，直接返回（优先用 DB source 字段）
    if (dbBars.length > 0) {
      this.logger.log(`[getKlineBars] 使用已有 K线数据（${dbBars.length} 条）`);
      return dbBars.map((b: any) => ({ ...this._parseKlineBar(b), source: resolveKlineSource(b) }));
    }

    // 无数据时生成模拟数据并写入（阶段一 fallback）
    // P0-06 (2026-07-12): 生产环境禁止自动seed写库，模拟数据不进入正式历史
    // P0-09 (2026-07-12): 增加 KLINE_SIMULATED_DATA_ALLOWED 显式开关，默认 false
    // P1-03 (2026-07-12): V2 链路禁用 seed，V2 使用 KlineCalculationEngine 实时计算
    const v2Enabled = process.env.KLINE_V2_ENABLED === 'true';
    if (v2Enabled) {
      this.logger.warn(`[getKlineBars] V2 链路已启用（KLINE_V2_ENABLED=true），拒绝 seed，返回空数组；V2 由 KlineCalculationEngine 实时计算`);
      return [];
    }
    const simulatedAllowed =
      process.env.ALLOW_SEED_WRITE === 'true' &&
      process.env.NODE_ENV !== 'production' &&
      process.env.KLINE_SIMULATED_DATA_ALLOWED === 'true';
    if (simulatedAllowed) {
      this.logger.log(`[getKlineBars] 未找到用户 ${userId} 的K线数据，生成模拟数据...`);
      const { startYear, startMonth, numMonths } = this._resolveRange(from, to, 36);
      await this._seedKlineBars(userId, startYear, startMonth, numMonths);
      dbBars = await this.db.klineBar.findMany({
        where,
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });
      return dbBars.map((b: any) => ({ ...this._parseKlineBar(b), source: 'simulated' as KlineDataSource }));
    }

    this.logger.warn(`[getKlineBars] 用户 ${userId} 无K线数据，模拟数据未启用，返回空数组`);
    return [];
  }

  // ============================================================
  // getStateSnapshots — 查询 StateSnapshot 表
  // ============================================================

  /**
   * 获取用户的月度状态快照
   *
   * @param userId - 用户ID
   * @param from   - 起始月份（格式 "YYYY-MM"），可选
   * @param to     - 截止月份（格式 "YYYY-MM"），可选
   * @returns StateSnapshot 数组（12维状态向量 + 衍生指标）
   */
  async getStateSnapshots(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<ParsedStateSnapshot[]> {
    // 构造查询条件
    const where: any = { userId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to)   where.date.lte = to;
    }

    let dbSnaps = await this.db.stateSnapshot.findMany({
      where,
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // Step 12 - P0治理 (2026-07-03): 数据来源标识
    // P01 数据契约 (Phase 6): 优先用 DB source 字段，unknown 时用 timeGroup 启发式判断
    const resolveSnapSource = (s: any): KlineDataSource => {
      const dbSource = s.source as string | undefined;
      if (dbSource && dbSource !== 'unknown') return dbSource as KlineDataSource;
      // 兼容旧数据（source='unknown'）：timeGroup 非空视为 llm_inferred
      return s.timeGroup != null ? 'llm_inferred' : 'real';
    };

    // 如果已有数据，直接返回（优先用 DB source 字段）
    if (dbSnaps.length > 0) {
      this.logger.log(`[getStateSnapshots] 使用已有状态快照（${dbSnaps.length} 条）`);
      return (dbSnaps as ParsedStateSnapshot[]).map(s => ({
        ...s,
        source: resolveSnapSource(s),
      }));
    }

    // 无数据时生成模拟数据并写入（阶段一 fallback）
    // P0-06 (2026-07-12): 生产环境禁止自动seed写库，模拟数据不进入正式历史
    // P0-09 (2026-07-12): 增加 KLINE_SIMULATED_DATA_ALLOWED 显式开关，默认 false
    // P1-03 (2026-07-12): V2 链路禁用 seed，V2 使用 KlineCalculationEngine 实时计算
    const v2EnabledSnap = process.env.KLINE_V2_ENABLED === 'true';
    if (v2EnabledSnap) {
      this.logger.warn(`[getStateSnapshots] V2 链路已启用（KLINE_V2_ENABLED=true），拒绝 seed，返回空数组；V2 由 KlineCalculationEngine 实时计算`);
      return [];
    }
    const simulatedAllowedSnap =
      process.env.ALLOW_SEED_WRITE === 'true' &&
      process.env.NODE_ENV !== 'production' &&
      process.env.KLINE_SIMULATED_DATA_ALLOWED === 'true';
    if (simulatedAllowedSnap) {
      this.logger.log(`[getStateSnapshots] 未找到用户 ${userId} 的状态快照，生成模拟数据...`);
      const { startYear, startMonth, numMonths } = this._resolveRange(from, to, 12);
      await this._seedStateSnapshots(userId, startYear, startMonth, numMonths);
      dbSnaps = await this.db.stateSnapshot.findMany({
        where,
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });
      return (dbSnaps as ParsedStateSnapshot[]).map(s => ({
        ...s,
        source: 'simulated' as KlineDataSource,
      }));
    }

    this.logger.warn(`[getStateSnapshots] 用户 ${userId} 无状态快照，模拟数据未启用，返回空数组`);
    return [];
  }

  // ============================================================
  // getTidePackage — 组合数据包（K线 + 状态快照 + 相位点）
  // ============================================================

  /**
   * 一次性获取完整潮汐数据包
   *
   * @param userId  - 用户ID
   * @param options - 可选配置（from/to/klineMonths/tideMonths）
   * @returns 包含 klineBars、stateSnapshots、phasePoints 的完整数据包
   */
  async getTidePackage(
    userId: string,
    options?: TidePackageOptions,
  ): Promise<TidePackage> {
    const from = options?.from;
    const to = options?.to;

    // 并行获取 K线 + 状态快照
    const [klineBars, stateSnapshots] = await Promise.all([
      this.getKlineBars(userId, from, to),
      this.getStateSnapshots(userId, from, to),
    ]);

    const enrichedSnapshots = this._enrichStateSnapshots(stateSnapshots);
    const enrichedBars = this._enrichKlineBars(klineBars, enrichedSnapshots);

    // 从状态快照派生相位空间散点
    const phasePoints = this._derivePhasePoints(enrichedSnapshots);

    // Step 12 - P0治理 (2026-07-03): 计算整体数据来源（优先级：llm_inferred > real > simulated > fallback）
    const klineSource = klineBars[0]?.source;
    const snapSource = stateSnapshots[0]?.source;
    const overallSource: KlineDataSource =
      klineSource === 'llm_inferred' || snapSource === 'llm_inferred'
        ? 'llm_inferred'
        : klineSource || snapSource || 'fallback';

    // B-S2 (2026-07-05): 接入 TideJudgmentService，基于最新 snapshot 生成时·位·心 三组判断 + 阶段 + 短指令
    // 静态类直接调用，无需 DI 注册。取最新 snapshot（enrichedSnapshots 已按时间升序）
    let tideJudgment: TideJudgment | undefined;
    if (enrichedSnapshots.length > 0) {
      const latestSnap = enrichedSnapshots[enrichedSnapshots.length - 1];
      try {
        tideJudgment = TideJudgmentService.buildTideJudgment(latestSnap as any);
      } catch (err) {
        this.logger.warn(`[getTidePackage] buildTideJudgment 失败: ${(err as Error).message}`);
      }
    }

    return {
      klineBars: enrichedBars,
      stateSnapshots: enrichedSnapshots,
      phasePoints,
      tideJudgment,
      meta: {
        generatedAt: new Date().toISOString(),
        userId,
        from,
        to,
        note: '阶段一：SQLite 持久化 + 内存 fallback。阶段二：接入 Supabase + LLM 推导。',
        source: overallSource,
      },
    };
  }

  // ============================================================
  // getCurrentStage — 任务 2.1：获取"问此事"所处的状态窗口（6态）
  // ============================================================

  /**
   * 获取当前问事所处的状态窗口（6态之一）
   *
   * 状态映射规则（复用现有 signalLabel 5态 + quadrant 4态 + actionBias 4态 + tideScore）：
   *   - breakthrough（突破）：主升窗口 + tideScore≥75 + prosperous概率≥60
   *   - attack（进攻）：主升窗口 OR (prosperous + expand)，但不满足突破
   *   - buildup（蓄势）：蓄势待发 OR (exploration + probe)
   *   - pullback（回撤）：承压回撤 OR (risk + shrink)
   *   - repair（修复）：修复抬升 OR (recovery + repair)
   *   - wait（等待）：震荡整固 AND 不满足上述条件
   *
   * @param input - 结构化输入：userId / profileId / birthDate / targetDate / questionType / recordId
   * @returns 6 态之一 + 理由 + 行动建议 + 窗口提示
   */
  async getCurrentStage(input: KlineStageInput): Promise<CurrentStageResult> {
    const userId = input?.userId;
    if (!userId) {
      return this._fallbackStage('未提供 userId', input);
    }

    try {
      // 1. 复用 getTidePackage 获取最新数据（K线 + 状态快照已 enrich）
      const pkg = await this.getTidePackage(userId);
      const bars = pkg.klineBars || [];
      const snaps = pkg.stateSnapshots || [];

      if (bars.length === 0 && snaps.length === 0) {
        this.logger.warn(`[getCurrentStage] 用户 ${userId} 无 K线/潮汐数据`);
        return this._fallbackStage('用户无 K线/潮汐数据', input);
      }

      // 2. 定位 targetDate 对应的最新 K线 bar 和 stateSnapshot
      const targetDate = input?.targetDate || this._currentMonthLabel();
      const targetBar = this._findNearestBar(bars, targetDate);
      const targetSnap = this._findNearestSnapshot(snaps, targetDate);

      // 3. 提取关键信号
      const signalLabel = targetBar?.signalLabel || '震荡整固';
      const quadrant = targetSnap?.quadrant || 'recovery';
      const actionBias = targetSnap?.actionBias || 'shrink';
      const tideScore = targetSnap?.tideScore ?? 50;
      const prosperousProb = targetSnap?.stateProbabilities?.prosperous ?? 25;
      const factorScores = targetBar?.factorScores || targetSnap?.factorScores;

      // 4. 映射到 6 态
      const stage = this._mapToStage({
        signalLabel,
        quadrant,
        actionBias,
        tideScore,
        prosperousProb,
      });

      // 5. 生成 reason / actionAdvice / windowTip
      const reason = this._buildStageReason(stage, {
        signalLabel,
        quadrant,
        actionBias,
        tideScore,
        prosperousProb,
        factorScores,
      });
      const { actionAdvice, windowTip } = this._buildStageAdvice(stage, input?.questionType);

      this.logger.log(
        `[getCurrentStage] 用户 ${userId} targetDate=${targetDate} stage=${stage} ` +
        `signalLabel=${signalLabel} quadrant=${quadrant} tideScore=${tideScore}`,
      );

      return {
        stage,
        stageLabel: STAGE_LABELS[stage],
        reason,
        signalLabel,
        quadrant,
        actionBias,
        tideScore,
        prosperousProb,
        targetDate,
        questionType: input?.questionType,
        recordId: input?.recordId,
        actionAdvice,
        windowTip,
      };
    } catch (error) {
      this.logger.error(`[getCurrentStage] 失败: ${(error as Error).message}`);
      return this._fallbackStage(`查询异常: ${(error as Error).message}`, input);
    }
  }

  /** 当前月份标签 "YYYY-MM" */
  private _currentMonthLabel(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /** 在 K线 bars 中找到最接近 targetDate 的那条（取 targetDate 或之前最近一条） */
  private _findNearestBar(bars: ParsedKlineBar[], targetDate: string): ParsedKlineBar | null {
    if (bars.length === 0) return null;
    const sorted = [...bars].sort((a, b) => a.monthLabel.localeCompare(b.monthLabel));
    const before = sorted.filter((b) => b.monthLabel <= targetDate);
    return before.length > 0 ? before[before.length - 1] : sorted[0];
  }

  /** 在 stateSnapshots 中找到最接近 targetDate 的那条 */
  private _findNearestSnapshot(snaps: ParsedStateSnapshot[], targetDate: string): ParsedStateSnapshot | null {
    if (snaps.length === 0) return null;
    const sorted = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
    const before = sorted.filter((s) => s.date <= targetDate);
    return before.length > 0 ? before[before.length - 1] : sorted[0];
  }

  /** 6态映射核心逻辑（复用 signalLabel + quadrant + actionBias + tideScore） */
  private _mapToStage(args: {
    signalLabel: string;
    quadrant: string;
    actionBias: string;
    tideScore: number;
    prosperousProb: number;
  }): CurrentStage {
    const { signalLabel, quadrant, actionBias, tideScore, prosperousProb } = args;

    // 突破：主升窗口 + 综合分高 + 扩张概率高
    if (signalLabel === '主升窗口' && tideScore >= 75 && prosperousProb >= 60) {
      return 'breakthrough';
    }
    // 进攻：主升窗口 OR (prosperous + expand)
    if (signalLabel === '主升窗口' || (quadrant === 'prosperous' && actionBias === 'expand')) {
      return 'attack';
    }
    // 蓄势：蓄势待发 OR (exploration + probe)
    if (signalLabel === '蓄势待发' || (quadrant === 'exploration' && actionBias === 'probe')) {
      return 'buildup';
    }
    // 回撤：承压回撤 OR (risk + shrink)
    if (signalLabel === '承压回撤' || (quadrant === 'risk' && actionBias === 'shrink')) {
      return 'pullback';
    }
    // 修复：修复抬升 OR (recovery + repair)
    if (signalLabel === '修复抬升' || (quadrant === 'recovery' && actionBias === 'repair')) {
      return 'repair';
    }
    // 默认：等待（震荡整固 或 其他）
    return 'wait';
  }

  /** 生成 stage 的判断理由 */
  private _buildStageReason(
    stage: CurrentStage,
    ctx: {
      signalLabel: string;
      quadrant: string;
      actionBias: string;
      tideScore: number;
      prosperousProb: number;
      factorScores?: TideFactorScores;
    },
  ): string {
    const { signalLabel, quadrant, tideScore, prosperousProb, factorScores } = ctx;
    const quadrantLabel = QUADRANT_LABEL[quadrant] || quadrant;
    const factorStr = factorScores
      ? `趋势=${factorScores.trend} 压力=${factorScores.pressure} 流动性=${factorScores.liquidity} 稳定性=${factorScores.stability}`
      : '';

    const reasons: Record<CurrentStage, string> = {
      breakthrough: `主升窗口已开 + 综合潮汐分 ${tideScore}≥75 + 扩张概率 ${prosperousProb}≥60，处于关键突破点。象限=${quadrantLabel}。${factorStr}`,
      attack: `主升窗口或扩张象限已触发（signalLabel=${signalLabel}, quadrant=${quadrantLabel}），主动出击窗口。综合潮汐分=${tideScore}。${factorStr}`,
      buildup: `趋势积累中（signalLabel=${signalLabel}），流动性良好，准备出击。象限=${quadrantLabel}。${factorStr}`,
      pullback: `承压回撤（signalLabel=${signalLabel}），压力高+稳定性低，收缩战线。象限=${quadrantLabel}。${factorStr}`,
      repair: `修复抬升中（signalLabel=${signalLabel}），稳定性恢复+压力下降。象限=${quadrantLabel}。${factorStr}`,
      wait: `震荡整固（signalLabel=${signalLabel}），综合潮汐分=${tideScore}，宜观察储备。象限=${quadrantLabel}。${factorStr}`,
    };
    return reasons[stage] || reasons.wait;
  }

  /** 生成行动建议和窗口提示（可按 questionType 轻微聚焦） */
  private _buildStageAdvice(
    stage: CurrentStage,
    questionType?: string,
  ): { actionAdvice: string; windowTip: string } {
    const qt = questionType ? `[${questionType}] ` : '';

    const adviceMap: Record<CurrentStage, { actionAdvice: string; windowTip: string }> = {
      breakthrough: {
        actionAdvice: `${qt}关键突破窗口已开，可推进重大决策、签约、启动新项目。设定明确里程碑，避免犹豫错失窗口。`,
        windowTip: '未来 1-2 周为最佳行动窗口，宜主动出击。',
      },
      attack: {
        actionAdvice: `${qt}进攻窗口，可推进关键决策，主动出击。但需控制节奏，避免一次性 all-in。`,
        windowTip: '未来 2-4 周适合推进主轴动作。',
      },
      buildup: {
        actionAdvice: `${qt}蓄势期，宜小步快跑、快速验证。储备资源、打磨方案，准备出击。`,
        windowTip: '未来 1-2 个月按计划推进，等待进攻信号。',
      },
      pullback: {
        actionAdvice: `${qt}回撤期，收缩战线、保存实力。暂停重大决策，优先对冲风险。`,
        windowTip: '未来 4-6 周宜观察储备，避免强行推进。',
      },
      repair: {
        actionAdvice: `${qt}修复期，先稳固 1-2 个核心领域。恢复能量、修复关系，再图进取。`,
        windowTip: '未来 1-2 个月以修复为主，不宜扩张。',
      },
      wait: {
        actionAdvice: `${qt}等待期，保持觉察、按既定节奏推进。不冒进不保守，伺机而动。`,
        windowTip: '未来 1 个月按计划推进，等待窗口信号。',
      },
    };
    return adviceMap[stage] || adviceMap.wait;
  }

  /** 兜底返回（无数据或异常时） */
  private _fallbackStage(reason: string, input?: KlineStageInput): CurrentStageResult {
    return {
      stage: 'wait',
      stageLabel: STAGE_LABELS.wait,
      reason: `兜底返回：${reason}`,
      targetDate: input?.targetDate || this._currentMonthLabel(),
      questionType: input?.questionType,
      recordId: input?.recordId,
      actionAdvice: '当前无法判断状态窗口，建议先完成 K线/潮汐数据推导后再问事。',
      windowTip: '数据不足，暂无窗口提示。',
    };
  }

  // ============================================================
  // seed — 强制重新生成模拟数据（开发/测试用）
  // ============================================================

  /**
   * 清空并重新生成用户的模拟数据
   *
   * @param userId      - 用户ID
   * @param klineMonths - K线生成月数，默认 36
   * @param tideMonths  - 状态快照生成月数，默认 12
   */
  async seed(userId: string, klineMonths = 36, tideMonths = 12): Promise<TidePackage> {
    // P0-1: 生产环境禁止 seed，非生产环境需显式 ALLOW_SEED_WRITE=true
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('seed 操作在生产环境禁用');
    }
    if (process.env.ALLOW_SEED_WRITE !== 'true') {
      throw new ForbiddenException('seed 操作需要显式设置 ALLOW_SEED_WRITE=true');
    }
    // P1-03 (2026-07-12): V2 链路禁用 seed（V2 使用 KlineCalculationEngine 实时计算，不写库）
    if (process.env.KLINE_V2_ENABLED === 'true') {
      throw new ForbiddenException('V2 链路已启用（KLINE_V2_ENABLED=true），seed 操作在 V2 模式下禁用；V2 使用 KlineCalculationEngine 实时计算');
    }

    this.logger.log(`[seed] 重新生成用户 ${userId} 的模拟数据...`);
    // P0-8 删除审计：清空旧数据前审计
    const klineCount = await this.db.klineBar.count({ where: { userId } });
    const snapCount = await this.db.stateSnapshot.count({ where: { userId } });
    this.logger.log(`[P0-8-AUDIT] kline-tide.seed pending: userId=${userId} klineBars=${klineCount} snapshots=${snapCount}`);
    // 清空旧数据
    await this.db.klineBar.deleteMany({ where: { userId } });
    await this.db.stateSnapshot.deleteMany({ where: { userId } });
    this.logger.log(`[P0-8-AUDIT] kline-tide.seed executed: userId=${userId}`);
    // 重新生成并返回完整数据包
    return this.getTidePackage(userId, { klineMonths, tideMonths });
  }

  // ============================================================
  // P1-T2.4: 节点解释 LLM 化 + 命理兜底
  // ============================================================

  /**
   * 生成关键节点的命理LLM解释
   *
   * 4字段输出：
   *  - llmSummary：LLM生成的一句话总结（LLM失败时走命理兜底）
   *  - baziBasis：命理学依据（来自三线评分的factors）
   *  - riskHint：风险提示
   *  - actionSuggestion：行动建议
   *
   * @param userId    用户ID
   * @param node      关键节点数据（月份/综合分/阶段）
   * @returns 4字段解释对象
   */
  async generateNodeExplanation(
    userId: string,
    node: { monthLabel: string; compositeCapital: number; stage?: string },
  ): Promise<{
    llmSummary: string;
    baziBasis: string;
    riskHint: string;
    actionSuggestion: string;
    source: 'llm' | 'fallback';
  }> {
    // 1. 加载八字档案 + 三线评分（命理依据）
    const bazi = await this.loadBaZiProfile(userId);
    const scores: TripleLineScores | null = this.scoringService
      ? this.scoringService.score(bazi)
      : null;

    // 2. 命理兜底文本（LLM失败时使用）
    const fallback = this._buildFallbackExplanation(node, scores);

    // 3. LLM 可选注入，失败/未注入走兜底
    if (!this.llmProviders) {
      return { ...fallback, source: 'fallback' };
    }

    try {
      const messages: LlmMessage[] = [
        {
          role: 'system',
          content: '你是命理分析师，基于用户八字档案和K线节点数据，生成一句话命理解释。输出JSON：{"llmSummary":"一句话总结","baziBasis":"命理学依据","riskHint":"风险提示","actionSuggestion":"行动建议"}。每字段≤50字。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            node: { 月份: node.monthLabel, 综合分: node.compositeCapital, 阶段: node.stage },
            八字: bazi
              ? { 四柱: `${bazi.yearGanZhi}/${bazi.monthGanZhi}/${bazi.dayGanZhi}/${bazi.timeGanZhi}`, 身旺: bazi.shenWang }
              : null,
            三线评分: scores
              ? { 事业: scores.career.score, 财富: scores.wealth.score, 情感: scores.relationship.score }
              : null,
          }),
        },
      ];

      const resp = await this.llmProviders.chat(messages, undefined, {
        temperature: 0.5,
        maxTokens: 300,
        jsonMode: true,
        timeout: 15000,
      });

      // 解析LLM返回的JSON
      const parsed = JSON.parse(resp.content);
      return {
        llmSummary: String(parsed.llmSummary || fallback.llmSummary).slice(0, 100),
        baziBasis: String(parsed.baziBasis || fallback.baziBasis).slice(0, 150),
        riskHint: String(parsed.riskHint || fallback.riskHint).slice(0, 100),
        actionSuggestion: String(parsed.actionSuggestion || fallback.actionSuggestion).slice(0, 100),
        source: 'llm',
      };
    } catch (err: any) {
      this.logger.warn(`[P1-T2.4] LLM解释失败，走命理兜底 | err=${err?.message}`);
      return { ...fallback, source: 'fallback' };
    }
  }

  /**
   * 命理兜底解释（无LLM或LLM失败时使用）
   * 基于节点数据 + 三线评分的factors生成
   */
  private _buildFallbackExplanation(
    node: { monthLabel: string; compositeCapital: number; stage?: string },
    scores: TripleLineScores | null,
  ): { llmSummary: string; baziBasis: string; riskHint: string; actionSuggestion: string } {
    const score = node.compositeCapital;
    const stage = node.stage || (score >= 60 ? '高位' : score >= 40 ? '中位' : '低位');

    // LLM摘要：基于阶段+评分
    let llmSummary = `${node.monthLabel} 综合生命资本 ${score.toFixed(1)} 分，处于${stage}。`;
    if (scores && scores.source === 'bazi') {
      const top = [scores.career, scores.wealth, scores.relationship]
        .sort((a, b) => b.score - a.score)[0];
      llmSummary += ` 八字命局中${top.dimension === 'career' ? '事业' : top.dimension === 'wealth' ? '财富' : '情感'}线最有利（${top.score}分）。`;
    }

    // 命理依据：从三线评分factors提取
    let baziBasis = '基于八字十神、五行、用神综合判断。';
    if (scores && scores.source === 'bazi') {
      const allFactors = [
        ...scores.career.factors,
        ...scores.wealth.factors,
        ...scores.relationship.factors,
      ].slice(0, 3);
      if (allFactors.length > 0) {
        baziBasis = allFactors.map(f => f.name).join('；') + '。';
      }
    }

    // 风险提示
    let riskHint = '';
    if (score < 40) {
      riskHint = '综合分偏低，注意精力管理与基础修复。';
    } else if (scores) {
      const risks = [scores.career.riskHint, scores.wealth.riskHint, scores.relationship.riskHint]
        .filter(Boolean);
      riskHint = risks[0] || '';
    }

    // 行动建议
    let actionSuggestion = '';
    if (score >= 70) {
      actionSuggestion = '适合推进关键决策，把握当前势能。';
    } else if (score >= 50) {
      actionSuggestion = '稳中求进，优先补齐最短板。';
    } else {
      actionSuggestion = '先稳底盘，避免大动作，聚焦修复。';
    }

    return { llmSummary, baziBasis, riskHint, actionSuggestion };
  }

  // ============================================================
  // 内部方法：OHLCV JSON 解析
  // ============================================================

  /** 安全解析 OHLCV JSON 字符串，失败时返回默认值 */
  private _parseOhlcv(json: string): OhlcvData {
    try {
      const parsed = JSON.parse(json);
      return {
        open:   Number(parsed.open)   || 50,
        high:   Number(parsed.high)   || 55,
        low:    Number(parsed.low)    || 45,
        close:  Number(parsed.close)  || 50,
        volume: Number(parsed.volume) || 10,
      };
    } catch {
      return { open: 50, high: 55, low: 45, close: 50, volume: 10 };
    }
  }

  /**
   * 将数据库中的 KlineBar 行解析为 ParsedKlineBar
   * 核心：把 career/wealth/health/relationship/growth/freedom/buffer
   * 这七个 JSON 字符串字段解析为 OhlcvData 对象
   */
  private _parseKlineBar(db: any): ParsedKlineBar {
    const career = this._parseOhlcv(db.career);
    const wealth = this._parseOhlcv(db.wealth);
    const health = this._parseOhlcv(db.health);
    const relationship = this._parseOhlcv(db.relationship);
    const growth = this._parseOhlcv(db.growth);
    const freedom = this._parseOhlcv(db.freedom);
    const buffer = this._parseOhlcv(db.buffer);
    const dimBars = [career, wealth, health, relationship, growth, freedom, buffer];
    const avg = (values: number[]) => this._round(values.reduce((sum, value) => sum + value, 0) / values.length);

    return {
      id:               db.id,
      userId:           db.userId,
      year:             db.year,
      month:            db.month,
      monthLabel:       db.monthLabel,
      open:             avg(dimBars.map((item) => item.open)),
      high:             Math.max(...dimBars.map((item) => item.high)),
      low:              Math.min(...dimBars.map((item) => item.low)),
      close:            avg(dimBars.map((item) => item.close)),
      volume:           avg(dimBars.map((item) => item.volume)),
      career,
      wealth,
      health,
      relationship,
      growth,
      freedom,
      buffer,
      compositeCapital: db.compositeCapital,
      volatility:       db.volatility,
      // P01 数据契约 (Phase 6): 优先用 DB 中的 source 字段
      source:           (db.source as KlineDataSource) || undefined,
      createdAt:        db.createdAt,
    };
  }

  // ============================================================
  // 内部方法：相位空间散点派生
  // ============================================================

  /**
   * 从状态快照数组派生相位空间散点
   * V0.7 时·位·心 模型：
   * - X轴 = positionGroup（位）
   * - Y轴 = mindGroup（心）
   * - 颜色映射 = timeGroup（时）
   * - 气泡大小 = optionality
   * - 象限由 positionGroup/mindGroup 交叉决定
   */
  private _derivePhasePoints(snapshots: ParsedStateSnapshot[]): PhasePoint[] {
    return snapshots.map((s, i) => ({
      id:       `phase-${s.date}`,
      date:     s.date,
      x:        s.positionGroup ?? s.capacity,
      y:        s.mindGroup ?? 50,
      timeGroup: s.timeGroup ?? 50,
      size:     s.optionality,
      quadrant: s.quadrant,
      label:    `${s.date} ${QUADRANT_LABEL[s.quadrant] ?? s.quadrant}`,
      actionBias: s.actionBias,
    }));
  }

  private _enrichStateSnapshots(snapshots: ParsedStateSnapshot[]): ParsedStateSnapshot[] {
    const enriched = snapshots.map((snapshot) => this._enrichStateSnapshot(snapshot));
    const tideScores = enriched.map((snapshot) => snapshot.tideScore ?? 50);

    return enriched.map((snapshot, index) => ({
      ...snapshot,
      windowScores: {
        short: this._rollingMean(tideScores, index, 1),
        mid: this._rollingMean(tideScores, index, 3),
        long: this._rollingMean(tideScores, index, 6),
      },
    }));
  }

  private _enrichStateSnapshot(snapshot: ParsedStateSnapshot): ParsedStateSnapshot {
    const factorScores: TideFactorScores = {
      trend: this._round((snapshot.momentum + snapshot.growth + snapshot.agency) / 3),
      pressure: this._clamp(this._round(((
        (100 - snapshot.energy) +
        (100 - snapshot.recovery) +
        (100 - snapshot.clarity) +
        (100 - snapshot.buffer) +
        Math.max(0, snapshot.entropy - 20)
      ) / 5))),
      liquidity: this._round((snapshot.liquidity + snapshot.optionality + snapshot.buffer) / 3),
      stability: this._round((snapshot.order + snapshot.support + snapshot.clarity + snapshot.recovery) / 4),
    };
    const tideScore = this._round(
      (
        factorScores.trend +
        factorScores.liquidity +
        factorScores.stability +
        (100 - factorScores.pressure)
      ) / 4,
    );
    const stateProbabilities = this._normalizeProbabilities({
      prosperous: (snapshot.positionGroup + snapshot.mindGroup + snapshot.timeGroup + factorScores.trend + factorScores.stability) / 5,
      exploration: (snapshot.positionGroup + (100 - snapshot.mindGroup) + snapshot.timeGroup + factorScores.trend + factorScores.pressure) / 5,
      recovery: ((100 - snapshot.positionGroup) + snapshot.mindGroup + (100 - factorScores.pressure) + factorScores.stability + (100 - snapshot.timeGroup)) / 5,
      risk: ((100 - snapshot.positionGroup) + (100 - snapshot.mindGroup) + (100 - snapshot.timeGroup) + factorScores.pressure + (100 - factorScores.stability)) / 5,
    });

    let actionBias: ParsedStateSnapshot['actionBias'];
    if (snapshot.quadrant === 'prosperous') actionBias = 'expand';
    else if (snapshot.quadrant === 'exploration') actionBias = 'probe';
    else if (snapshot.quadrant === 'recovery') actionBias = 'repair';
    else actionBias = 'shrink';

    return {
      ...snapshot,
      factorScores,
      tideScore,
      stateProbabilities,
      actionBias,
    };
  }

  private _enrichKlineBars(
    bars: ParsedKlineBar[],
    snapshots: ParsedStateSnapshot[],
  ): ParsedKlineBar[] {
    const snapshotByMonth = new Map(snapshots.map((snapshot) => [snapshot.date, snapshot]));
    let previousClose: number | null = null;

    return bars.map((bar) => {
      const snapshot = snapshotByMonth.get(bar.monthLabel);
      const dimensions = {
        career: bar.career.close,
        wealth: bar.wealth.close,
        health: bar.health.close,
        relationship: bar.relationship.close,
        growth: bar.growth.close,
        freedom: bar.freedom.close,
        buffer: bar.buffer.close,
      };

      const factorScores: TideFactorScores = snapshot?.factorScores ?? {
        trend: this._round((dimensions.career + dimensions.wealth + dimensions.growth) / 3),
        pressure: this._clamp(this._round(((
          (100 - dimensions.health) +
          (100 - dimensions.buffer) +
          (100 - dimensions.relationship) +
          bar.volatility * 2
        ) / 4))),
        liquidity: this._round((dimensions.freedom + dimensions.buffer) / 2),
        stability: this._round((dimensions.health + dimensions.relationship + dimensions.buffer) / 3),
      };

      const close = this._clamp(this._round(bar.compositeCapital));
      const defaultOpen = this._round((
        bar.career.open +
        bar.wealth.open +
        bar.health.open +
        bar.relationship.open +
        bar.growth.open +
        bar.freedom.open +
        bar.buffer.open
      ) / 7);
      const open = previousClose ?? defaultOpen;

      const opportunityScore = this._clamp(this._round(
        factorScores.trend * 0.45 +
        factorScores.liquidity * 0.35 +
        Math.max(dimensions.growth, dimensions.career, dimensions.wealth) * 0.2,
      ));
      const riskScore = this._clamp(this._round(
        factorScores.pressure * 0.45 +
        (100 - factorScores.stability) * 0.35 +
        Math.max(0, bar.volatility * 4) * 0.2,
      ));
      const upsideRange = this._clamp(this._round(opportunityScore / 10 + bar.volatility * 0.6), 4, 18);
      const downsideRange = this._clamp(this._round(riskScore / 10 + bar.volatility * 0.6), 4, 18);
      const high = this._clamp(Math.max(close, open) + upsideRange);
      const low = this._clamp(Math.min(close, open) - downsideRange);

      let signalLabel = '震荡整固';
      if (factorScores.trend >= 65 && factorScores.pressure <= 40) signalLabel = '主升窗口';
      else if (factorScores.trend >= 58 && factorScores.liquidity >= 55) signalLabel = '蓄势待发';
      else if (factorScores.pressure >= 60 && factorScores.stability < 50) signalLabel = '承压回撤';
      else if (factorScores.stability >= 58 && factorScores.pressure < 55) signalLabel = '修复抬升';

      previousClose = close;

      return {
        ...bar,
        open,
        high,
        low,
        close,
        volume: this._round((
          bar.career.volume +
          bar.wealth.volume +
          bar.health.volume +
          bar.relationship.volume +
          bar.growth.volume +
          bar.freedom.volume +
          bar.buffer.volume
        ) / 7),
        compositeCapital: close,
        opportunityScore,
        riskScore,
        upsideRange,
        downsideRange,
        factorScores,
        signalLabel,
        // 用金融语义重算 K 柱
        career: { ...bar.career },
        wealth: { ...bar.wealth },
        health: { ...bar.health },
        relationship: { ...bar.relationship },
        growth: { ...bar.growth },
        freedom: { ...bar.freedom },
        buffer: { ...bar.buffer },
      };
    });
  }

  // ============================================================
  // 内部方法：日期范围解析辅助
  // ============================================================

  /**
   * 将 from/to 字符串转换为 startYear/startMonth/numMonths
   * 当 from/to 均未提供时使用 fallbackMonths 作为默认月数
   */
  private _resolveRange(
    from?: string,
    to?: string,
    fallbackMonths = 36,
  ): { startYear: number; startMonth: number; numMonths: number } {
    if (!from && !to) {
      const now = new Date();
      const endYear = now.getFullYear();
      const endMonth = now.getMonth() + 1;
      const totalMonths = endYear * 12 + endMonth - fallbackMonths;
      return {
        startYear: Math.floor(totalMonths / 12),
        startMonth: (totalMonths % 12) + 1,
        numMonths: fallbackMonths,
      };
    }

    const parseYM = (ym: string) => {
      const parts = ym.split('-');
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) || 1 };
    };

    const fromYM = from ? parseYM(from) : { year: 2023, month: 1 };
    const toYM   = to   ? parseYM(to)   : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

    const numMonths = (toYM.year - fromYM.year) * 12 + (toYM.month - fromYM.month) + 1;

    return {
      startYear: fromYM.year,
      startMonth: fromYM.month,
      numMonths: Math.max(1, numMonths),
    };
  }

  // ============================================================
  // 内部方法：模拟数据生成 + 写入（阶段一 fallback）
  // ============================================================

  /** 各维度的模拟数据种子配置（默认值，无八字档案时使用） */
  private static readonly DIM_SEED: Record<string, { mean: number; amplitude: number; trend: number }> = {
    career:       { mean: 55, amplitude: 12, trend: 0.15 },
    wealth:       { mean: 50, amplitude: 15, trend: 0.2 },
    health:       { mean: 65, amplitude: 8,  trend: -0.05 },
    relationship: { mean: 55, amplitude: 14, trend: 0.05 },
    growth:       { mean: 50, amplitude: 10, trend: 0.25 },
    freedom:      { mean: 45, amplitude: 13, trend: 0.1 },
    buffer:       { mean: 40, amplitude: 16, trend: 0.3 },
  };

  /**
   * P1-T2.1: 加载用户八字档案
   * 来源：BaZiProfile 表（由 ziwei-agent 或 iztro 生成）
   * 返回 null 时，调用方走 DIM_SEED 兜底
   *
   * 命理学字段说明：
   *  - yearGanZhi/monthGanZhi/dayGanZhi/timeGanZhi：四柱干支
   *  - wuXingDist：五行分布 {木,火,土,金,水}
   *  - shenWang：身旺/身弱/中和（日主强弱）
   *  - shenWangScore：身旺分数 0-100
   *  - xiYongShen：喜忌用神 {xi:[], yong:[], ji:[]}
   *  - shiShen：十神分布
   *  - shenSha：神煞（含桃花、文昌、天乙贵人等）
   */
  private async loadBaZiProfile(userId: string): Promise<any | null> {
    try {
      const profile = await this.db.baZiProfile.findUnique({
        where: { userId },
      });
      if (!profile) {
        this.logger.log(`[P1-T2.1] 用户 ${userId} 无八字档案，走 DIM_SEED 兜底`);
        return null;
      }
      // 校验关键字段完整性
      if (!profile.yearGanZhi || !profile.dayGanZhi || !profile.shenWang) {
        this.logger.warn(`[P1-T2.1] 用户 ${userId} 八字档案不完整（缺四柱或身旺判断），走兜底`);
        return null;
      }
      this.logger.log(
        `[P1-T2.1] 用户 ${userId} 命中八字档案 | 四柱:${profile.yearGanZhi}/${profile.monthGanZhi}/${profile.dayGanZhi}/${profile.timeGanZhi} | 身旺:${profile.shenWang}(${profile.shenWangScore})`,
      );
      return profile;
    } catch (err: any) {
      this.logger.warn(`[P1-T2.1] 加载 BaZiProfile 失败（表可能未迁移），走兜底 | err=${err?.message}`);
      return null;
    }
  }

  /**
   * P1-T2.1: 根据八字档案调整 DIM_SEED 的 mean/amplitude/trend
   * 命理学映射骨架（T2.2 将深化为完整三线算法）：
   *
   * 1. 身旺判断（shenWang）→ 影响 mean 偏移
   *    - 身旺（shenWangScore >= 60）：精力旺盛，career/buffer/health +5
   *    - 身弱（shenWangScore <= 40）：精力不足，health/buffer -5
   *    - 中和（40 < score < 60）：默认
   *
   * 2. 五行分布（wuXingDist）→ 影响各维度 mean
   *    - 木旺（生发）：growth/health +4
   *    - 火旺（礼）：career/relationship +4
   *    - 土旺（信）：buffer/health +4
   *    - 金旺（义）：wealth/career +4
   *    - 水旺（智）：freedom/relationship +4
   *
   * 3. 十神（shiShen）→ 影响对应维度
   *    - 官星旺：career +6（官主事业地位）
   *    - 财星旺：wealth +6（财主财富）
   *    - 食伤旺：growth/freedom +4（食伤主才华表达）
   *    - 印星旺：health/buffer +4（印主庇护）
   *    - 比劫旺：relationship/buffer +3（比劫主同辈）
   *
   * 4. 喜忌用神（xiYongShen）→ 影响 trend
   *    - 用神为官/财/印/食：对应维度 trend +0.1
   *    - 忌神为官/财/印/食：对应维度 trend -0.1
   *
   * 来源：子平命理《滴天髓》《穷通宝鉴》十神体系
   */
  private _applyBaziAdjustment(
    baseSeed: Record<string, { mean: number; amplitude: number; trend: number }>,
    bazi: any,
  ): Record<string, { mean: number; amplitude: number; trend: number }> {
    // 深拷贝基础种子配置
    const adjusted: Record<string, { mean: number; amplitude: number; trend: number }> = {};
    for (const dim of KLINE_DIMS) {
      adjusted[dim] = { ...baseSeed[dim] };
    }

    // 1. 身旺判断
    const shenWangScore = Number(bazi.shenWangScore) || 50;
    if (shenWangScore >= 60) {
      // 身旺：精力旺盛
      adjusted.career.mean += 5;
      adjusted.buffer.mean += 5;
      adjusted.health.mean += 3;
    } else if (shenWangScore <= 40) {
      // 身弱：精力不足
      adjusted.health.mean -= 5;
      adjusted.buffer.mean -= 5;
    }

    // 2. 五行分布
    let wuXing: Record<string, number> = {};
    try {
      wuXing = typeof bazi.wuXingDist === 'string' ? JSON.parse(bazi.wuXingDist) : (bazi.wuXingDist || {});
    } catch { wuXing = {}; }
    const wuXingMax = Math.max(...Object.values(wuXing).map(v => Number(v) || 0), 0);
    if (wuXingMax > 0) {
      for (const [element, count] of Object.entries(wuXing)) {
        const cnt = Number(count) || 0;
        if (cnt < wuXingMax) continue; // 仅处理最旺五行
        switch (element) {
          case '木': case 'wood':  adjusted.growth.mean += 4; adjusted.health.mean += 4; break;
          case '火': case 'fire':  adjusted.career.mean += 4; adjusted.relationship.mean += 4; break;
          case '土': case 'earth': adjusted.buffer.mean += 4; adjusted.health.mean += 4; break;
          case '金': case 'metal': adjusted.wealth.mean += 4; adjusted.career.mean += 4; break;
          case '水': case 'water': adjusted.freedom.mean += 4; adjusted.relationship.mean += 4; break;
        }
      }
    }

    // 3. 十神分布
    let shiShen: Record<string, number> = {};
    try {
      shiShen = typeof bazi.shiShen === 'string' ? JSON.parse(bazi.shiShen) : (bazi.shiShen || {});
    } catch { shiShen = {}; }
    // 十神键兼容中英文
    const getShiShenScore = (keys: string[]): number => {
      for (const k of keys) {
        if (shiShen[k] !== undefined) return Number(shiShen[k]) || 0;
      }
      return 0;
    };
    const guanScore = getShiShenScore(['官', '官星', 'zhengGuan', 'qiSha', '正官', '七杀']);
    const caiScore = getShiShenScore(['财', '财星', 'zhengCai', 'pianCai', '正财', '偏财']);
    const shiShangScore = getShiShenScore(['食', '食伤', 'shiShen', 'shangGuan', '食神', '伤官']);
    const yinScore = getShiShenScore(['印', '印星', 'zhengYin', 'pianYin', '正印', '偏印']);
    const biJieScore = getShiShenScore(['比劫', 'biJian', 'jieCai', '比肩', '劫财']);

    if (guanScore > 0) adjusted.career.mean += Math.min(6, guanScore);
    if (caiScore > 0) adjusted.wealth.mean += Math.min(6, caiScore);
    if (shiShangScore > 0) {
      adjusted.growth.mean += Math.min(4, shiShangScore);
      adjusted.freedom.mean += Math.min(4, shiShangScore);
    }
    if (yinScore > 0) {
      adjusted.health.mean += Math.min(4, yinScore);
      adjusted.buffer.mean += Math.min(4, yinScore);
    }
    if (biJieScore > 0) {
      adjusted.relationship.mean += Math.min(3, biJieScore);
      adjusted.buffer.mean += Math.min(3, biJieScore);
    }

    // 4. 喜忌用神 → trend
    let xiYong: { xi?: string[]; yong?: string[]; ji?: string[] } = {};
    try {
      xiYong = typeof bazi.xiYongShen === 'string' ? JSON.parse(bazi.xiYongShen) : (bazi.xiYongShen || {});
    } catch { xiYong = {}; }
    const yongShen = xiYong.yong || xiYong.xi || [];
    const jiShen = xiYong.ji || [];
    const elementToDim: Record<string, string[]> = {
      '官': ['career'], '杀': ['career'],
      '财': ['wealth'], '才': ['wealth'],
      '印': ['health', 'buffer'], '枭': ['health', 'buffer'],
      '食': ['growth', 'freedom'], '伤': ['growth', 'freedom'],
      '比': ['relationship', 'buffer'], '劫': ['relationship', 'buffer'],
    };
    for (const yong of yongShen) {
      const dims = elementToDim[yong];
      if (dims) for (const d of dims) adjusted[d].trend += 0.1;
    }
    for (const ji of jiShen) {
      const dims = elementToDim[ji];
      if (dims) for (const d of dims) adjusted[d].trend -= 0.1;
    }

    // 钳制所有值到合理范围
    for (const dim of KLINE_DIMS) {
      adjusted[dim].mean = this._clamp(adjusted[dim].mean);
      adjusted[dim].trend = Math.max(-0.5, Math.min(0.5, adjusted[dim].trend));
    }

    return adjusted;
  }

  /** 生成并写入模拟K线数据（P1-T2.1: 优先用八字档案调整，无档案走DIM_SEED兜底） */
  private async _seedKlineBars(
    userId: string,
    startYear: number,
    startMonth: number,
    numMonths: number,
  ): Promise<void> {
    // P1-T2.1: 加载八字档案，有则调整DIM_SEED
    const bazi = await this.loadBaZiProfile(userId);
    const dimSeed = bazi
      ? this._applyBaziAdjustment(KlineTideService.DIM_SEED, bazi)
      : KlineTideService.DIM_SEED;

    if (bazi) {
      this.logger.log(
        `[P1-T2.1] K线数据源=八字档案 | 用户=${userId} | 身旺=${bazi.shenWang}(${bazi.shenWangScore}) | career.mean=${dimSeed.career.mean.toFixed(1)} wealth.mean=${dimSeed.wealth.mean.toFixed(1)}`,
      );
    } else {
      this.logger.log(`[P1-T2.1] K线数据源=DIM_SEED兜底 | 用户=${userId}`);
    }

    const data: any[] = [];
    let seed = startYear * 100 + startMonth;

    // 用于惯性平滑的上一月维度值
    const prevDims: Record<string, number> = {};

    for (let i = 0; i < numMonths; i++) {
      const year  = startYear + Math.floor((startMonth + i - 1) / 12);
      const month = ((startMonth + i - 1) % 12) + 1;
      const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

      // 生成七线维度值（P1-T2.1: 使用八字调整后的dimSeed）
      const dims: Record<string, number> = {};
      for (const dim of KLINE_DIMS) {
        const cfg = dimSeed[dim];
        if (!cfg) { dims[dim] = 50; continue; }
        seed++;
        const noise        = (this._seededRandom(seed) - 0.5) * 2 * cfg.amplitude;
        const trendEffect  = cfg.trend * i;
        const seasonalEffect = Math.sin((month / 12) * Math.PI * 2) * cfg.amplitude * 0.3;
        const raw = cfg.mean + trendEffect + noise + seasonalEffect;

        if (i > 0 && prevDims[dim] !== undefined) {
          dims[dim] = this._clamp(Math.round((raw * 0.4 + prevDims[dim] * 0.6) * 10) / 10);
        } else {
          dims[dim] = this._clamp(Math.round(raw * 10) / 10);
        }
        prevDims[dim] = dims[dim];
      }

      // 综合分（加权）
      const weights: Record<string, number> = {
        career: 0.18, wealth: 0.16, health: 0.18, relationship: 0.14,
        growth: 0.14, freedom: 0.1, buffer: 0.1,
      };
      const compositeCapital = this._clamp(Math.round(
        KLINE_DIMS.reduce((sum, d) => sum + (dims[d] ?? 50) * (weights[d] ?? 0.14), 0) * 10,
      ) / 10);

      // 波动率
      seed++;
      const volatility = Math.round(this._seededRandom(seed + 2000) * 10 * 10) / 10;

      // 构造每线的 OHLCV JSON
      const makeOhlcv = (dimVal: number, volumeWeight: number) => {
        seed++;
        const range = 2 + this._seededRandom(seed) * 6;
        const open  = this._clamp(Math.round((dimVal - range * 0.3) * 10) / 10);
        const close = this._clamp(dimVal);
        const high  = this._clamp(Math.round(Math.max(open, close) + this._seededRandom(seed + 1) * range * 10) / 10);
        const low   = this._clamp(Math.round(Math.min(open, close) - this._seededRandom(seed + 2) * range * 10) / 10);
        const volume = Math.round(30 + this._seededRandom(seed + 3) * 70);
        return JSON.stringify({ open, high, low, close, volume });
      };

      data.push({
        userId,
        year,
        month,
        monthLabel,
        career:       makeOhlcv(dims.career, 0.16),
        wealth:       makeOhlcv(dims.wealth, 0.14),
        health:       makeOhlcv(dims.health, 0.18),
        relationship: makeOhlcv(dims.relationship, 0.12),
        growth:       makeOhlcv(dims.growth, 0.14),
        freedom:      makeOhlcv(dims.freedom, 0.12),
        buffer:       makeOhlcv(dims.buffer, 0.14),
        compositeCapital,
        volatility,
        // P01 数据契约 (Phase 6): seed 生成的模拟数据标记为 simulated
        source: 'simulated',
      });
    }

    await this.db.klineBar.createMany({ data });
    this.logger.log(`[seed] 写入 ${data.length} 条 KlineBar（用户 ${userId}）`);
  }

  /** 生成并写入模拟状态快照 */
  private async _seedStateSnapshots(
    userId: string,
    startYear: number,
    startMonth: number,
    numMonths: number,
  ): Promise<void> {
    const data: any[] = [];
    let seed = (startYear * 100 + startMonth) * 7;
    const prevVals: Record<string, number> = {};

    for (let i = 0; i < numMonths; i++) {
      const year  = startYear + Math.floor((startMonth + i - 1) / 12);
      const month = ((startMonth + i - 1) % 12) + 1;
      const date  = `${year}-${String(month).padStart(2, '0')}`;

      // 生成12维状态向量
      const values: Record<string, number> = {};
      for (const dim of STATE_DIMS) {
        seed++;
        const baseMean = 50 + (this._seededRandom(seed * 13) - 0.5) * 30;
        const noise    = (this._seededRandom(seed) - 0.5) * 20;
        const seasonal = Math.sin((month / 12) * Math.PI * 2) * 10;
        const raw = baseMean + noise + seasonal;

        if (i > 0 && prevVals[dim] !== undefined) {
          values[dim] = this._clamp(Math.round(raw * 0.3 + prevVals[dim] * 0.7));
        } else {
          values[dim] = this._clamp(Math.round(raw));
        }
        prevVals[dim] = values[dim];
      }

      // V0.7 时·位·心 三组聚合
      const timeGroup = Math.round((values.liquidity + values.momentum + values.optionality) / 3);
      const positionGroup = Math.round((values.support + values.agency + values.order + values.growth + values.buffer) / 5);
      const mindGroup = Math.round((values.energy + values.recovery + values.emotion + values.clarity) / 4);

      // 衍生指标：capacity = 五维均值
      const capacity = Math.round(
        CAPACITY_DIMS.reduce((s, d) => s + (values[d] ?? 50), 0) / CAPACITY_DIMS.length,
      );

      // 衍生指标：entropy = 12维变异系数 × 100
      const allVals = STATE_DIMS.map(d => values[d] ?? 50);
      const mean     = allVals.reduce((s, v) => s + v, 0) / allVals.length;
      const variance = allVals.reduce((s, v) => s + (v - mean) ** 2, 0) / allVals.length;
      const entropy  = mean > 0 ? Math.round(Math.sqrt(variance) / mean * 100 * 10) / 10 : 0;

      // 象限判定
      let quadrant: ParsedStateSnapshot['quadrant'];
      if (capacity >= 50 && entropy < 30)      quadrant = 'prosperous';
      else if (capacity >= 50)                  quadrant = 'exploration';
      else if (entropy < 30)                    quadrant = 'recovery';
      else                                      quadrant = 'risk';

      data.push({
        userId, year, month, date,
        energy:      values.energy,
        recovery:    values.recovery,
        emotion:     values.emotion,
        clarity:     values.clarity,
        liquidity:   values.liquidity,
        momentum:    values.momentum,
        support:     values.support,
        agency:      values.agency,
        order:       values.order,
        growth:      values.growth,
        optionality: values.optionality,
        buffer:      values.buffer,
        timeGroup,
        positionGroup,
        mindGroup,
        capacity,
        entropy,
        quadrant,
        // P01 数据契约 (Phase 6): seed 生成的模拟数据标记为 simulated
        source: 'simulated',
      });
    }

    await this.db.stateSnapshot.createMany({ data });
    this.logger.log(`[seed] 写入 ${data.length} 条 StateSnapshot（用户 ${userId}）`);
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /** 伪随机数生成器（确定性种子，保证同一用户每次结果一致） */
  private _seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  /** 数值钳位：限制在 [min, max] 区间 */
  private _clamp(val: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, val));
  }

  private _rollingMean(values: number[], endIndex: number, length: number): number {
    const start = Math.max(0, endIndex - length + 1);
    const window = values.slice(start, endIndex + 1);
    return this._round(window.reduce((sum, value) => sum + value, 0) / Math.max(window.length, 1));
  }

  private _normalizeProbabilities(raw: Record<string, number>): TideStateProbabilities {
    const entries = Object.entries(raw).map(([key, value]) => [key, Math.max(value, 1)] as const);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const normalized = Object.fromEntries(
      entries.map(([key, value]) => [key, this._round((value / total) * 100)]),
    ) as Record<string, number>;

    return {
      prosperous: normalized.prosperous ?? 25,
      exploration: normalized.exploration ?? 25,
      recovery: normalized.recovery ?? 25,
      risk: normalized.risk ?? 25,
    };
  }

  /** 保留一位小数，统一前后端数值风格 */
  private _round(value: number, digits = 1): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
}
