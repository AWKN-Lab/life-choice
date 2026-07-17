import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';
import { TideJudgmentService } from './tide-judgment.service';

interface DimensionScores {
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
  confidence: number;
}

// ==================== 任务 2.2：get12DimStatus 类型定义 ====================

/** get12DimStatus 的结构化输入（与 KlineStageInput 结构一致） */
export interface TideStatusInput {
  userId?: string;
  profileId?: string;
  birthDate?: string;
  targetDate?: string;
  questionType?: string;
  recordId?: string;
}

/** 三组判断结果（复用 TideJudgmentService 的 GroupJudgment 结构） */
export interface TideGroupJudgment {
  score: number;
  level: 'high' | 'mid' | 'low';
  label: string;
}

/** get12DimStatus 返回结果 */
export interface TideStatusResult {
  /** 目标月份 */
  targetDate: string;
  /** 12 维状态分数（0-100） */
  dimensions: {
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
  };
  /** 三组聚合分 */
  timeGroup: number;
  positionGroup: number;
  mindGroup: number;
  /** 三组判断 */
  timeStatus: TideGroupJudgment;
  positionStatus: TideGroupJudgment;
  mindStatus: TideGroupJudgment;
  /** 综合相位判断 */
  phaseJudgment: string;
  /** 短指令 */
  shortDirective: string;
  /** 窗口提示 */
  windowTip: string;
  /** 行动建议 */
  actionAdvice: string;
  /** 象限 */
  quadrant?: string;
  /** 承载容量 */
  capacity?: number;
  /** 熵值 */
  entropy?: number;
  /** 问事类型 */
  questionType?: string;
  /** 关联记录ID */
  recordId?: string;
  /** 数据来源：llm=LLM推导 / fallback=兜底 */
  source: 'llm' | 'fallback';
}

@Injectable()
export class TideInferenceService {
  private readonly logger = new Logger(TideInferenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly llmProvidersService?: LlmProvidersService,
  ) {}

  /**
   * 类型断言辅助：PrismaClient 在运行时包含 StateSnapshot/KlineBar 模型，
   * 但 TypeScript 类型可能未同步（prisma generate 未更新时）。
   */
  private get db() {
    return this.prisma as any;
  }

  /**
   * 从用户最近的咨询记录推导 12 维状态向量
   */
  async inferState(userId: string): Promise<DimensionScores | null> {
    if (!this.llmProvidersService) {
      this.logger.warn('LLM Providers not available, skipping inference');
      return null;
    }

    try {
      // 1. 获取用户最近的咨询记录（最多5条）
      const recentRecords = await this.db.consultRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          question: true,
          summaryLine: true,
          emotionSnapshot: true,
          extractedFacts: true,
          createdAt: true,
        },
      });

      if (recentRecords.length === 0) {
        this.logger.log('No consultation records found, skipping inference');
        return null;
      }

      // 2. 获取用户记忆
      const memory = await this.db.userMemory.findUnique({
        where: { userId },
        select: { insights: true, consultHistory: true },
      });

      // 3. 构建 prompt
      const systemPrompt = buildIdentityLayer() + `\n\n你是一个人生状态评估专家。基于用户的咨询记录和记忆，评估用户当前在以下 12 个维度的状态（0-100分）。

维度定义：
- energy(精力): 生理和心理能量水平
- recovery(恢复力): 从压力中恢复的能力
- emotion(情绪): 情绪稳定性和积极性
- clarity(清晰度): 对自身处境的认知清晰度
- liquidity(流动性): 资源和选择的流动性
- momentum(动量): 行动推进的势头
- support(支持度): 外部支持网络强度
- agency(掌控感): 对局面的掌控程度
- order(秩序): 生活和工作的有序程度
- growth(成长): 个人成长和学习速度
- optionality(可选项): 面临的选择丰富度
- buffer(缓冲): 安全缓冲和容错空间

输出严格的 JSON 格式，不要有任何其他文字：
{"energy":72,"recovery":65,"emotion":58,"clarity":70,"liquidity":45,"momentum":55,"support":60,"agency":50,"order":40,"growth":68,"optionality":35,"buffer":42,"confidence":0.8}`;

      const userPrompt = `用户最近的咨询记录：
${recentRecords.map((r, i) => `${i + 1}. [${r.createdAt.toISOString().slice(0, 10)}] ${r.question} → ${r.summaryLine || '无结论'}`).join('\n')}

${memory?.insights ? `用户洞察：${memory.insights}` : ''}

请评估用户当前 12 维状态。`;

      // 4. 调用 LLM
      const response = await this.llmProvidersService.chatCheap(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.3, maxTokens: 500, jsonMode: true },
      );

      // 5. 解析响应（LlmResponse.content 是纯文本）
      const content = response.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('LLM response does not contain valid JSON');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 6. 验证和钳制值
      const dimensions = ['energy', 'recovery', 'emotion', 'clarity', 'liquidity', 'momentum', 'support', 'agency', 'order', 'growth', 'optionality', 'buffer'];
      const result: Record<string, number> = { confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)) };

      for (const dim of dimensions) {
        const val = parsed[dim];
        if (typeof val !== 'number' || isNaN(val)) {
          this.logger.warn(`Invalid value for ${dim}: ${val}, using 50`);
          result[dim] = 50;
        } else {
          result[dim] = Math.round(Math.min(100, Math.max(0, val)));
        }
      }

      this.logger.log(`Inferred state for user ${userId}: confidence=${result.confidence}`);
      return result as unknown as DimensionScores;
    } catch (error) {
      this.logger.error(`State inference failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * 推导并写入 StateSnapshot
   */
  async inferAndPersist(userId: string): Promise<boolean> {
    const scores = await this.inferState(userId);
    if (!scores) return false;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 计算聚合值
    const timeGroup = Math.round((scores.liquidity + scores.momentum + scores.optionality) / 3);
    const positionGroup = Math.round((scores.support + scores.agency + scores.order + scores.growth + scores.buffer) / 5);
    const mindGroup = Math.round((scores.energy + scores.recovery + scores.emotion + scores.clarity) / 4);

    // 计算 capacity/entropy/quadrant
    const allValues = [scores.energy, scores.recovery, scores.emotion, scores.clarity, scores.liquidity, scores.momentum, scores.support, scores.agency, scores.order, scores.growth, scores.optionality, scores.buffer];
    const capacity = Math.round((scores.energy + scores.recovery + scores.liquidity + scores.support + scores.buffer) / 5);
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const variance = allValues.reduce((a, b) => a + (b - mean) ** 2, 0) / allValues.length;
    const entropy = Math.round(Math.sqrt(variance));

    let quadrant = 'recovery';
    if (capacity >= 50 && entropy < 30) quadrant = 'prosperous';
    else if (capacity >= 50 && entropy >= 30) quadrant = 'exploration';
    else if (capacity < 50 && entropy >= 30) quadrant = 'risk';

    const dateStr = `${year}-${String(month).padStart(2, '0')}`;

    await this.db.stateSnapshot.upsert({
      where: { userId_year_month: { userId, year, month } },
      create: {
        userId, year, month, date: dateStr,
        energy: scores.energy, recovery: scores.recovery, emotion: scores.emotion, clarity: scores.clarity,
        liquidity: scores.liquidity, momentum: scores.momentum, support: scores.support, agency: scores.agency,
        order: scores.order, growth: scores.growth, optionality: scores.optionality, buffer: scores.buffer,
        timeGroup, positionGroup, mindGroup,
        capacity, entropy, quadrant,
      },
      update: {
        date: dateStr,
        energy: scores.energy, recovery: scores.recovery, emotion: scores.emotion, clarity: scores.clarity,
        liquidity: scores.liquidity, momentum: scores.momentum, support: scores.support, agency: scores.agency,
        order: scores.order, growth: scores.growth, optionality: scores.optionality, buffer: scores.buffer,
        timeGroup, positionGroup, mindGroup,
        capacity, entropy, quadrant,
      },
    });

    this.logger.log(`Persisted LLM-inferred state for user ${userId}`);
    return true;
  }

  /**
   * K线 LLM 推导
   * 从用户状态推导月度 K 线数据（7 线 OHLCV）
   */
  async inferKline(userId: string): Promise<boolean> {
    if (!this.llmProvidersService) return false;

    try {
      // 获取用户八字档案
      const baziProfile = await this.db.baZiProfile.findUnique({
        where: { userId },
        select: { wuXingDist: true, shenWang: true, xiYongShen: true },
      });

      // 获取最近12个月状态快照
      const snapshots = await this.db.stateSnapshot.findMany({
        where: { userId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      });

      if (!baziProfile && snapshots.length === 0) {
        this.logger.log('No data for K-line inference');
        return false;
      }

      const systemPrompt = buildIdentityLayer() + `\n\n你是一个命理量化分析师。基于用户的八字信息和近期状态，评估未来6个月在以下7条人生线的走势（0-100分）。

7条线定义：
- career(事业线): 职业发展
- wealth(财富线): 财务状况
- health(健康线): 身体健康
- relationship(关系线): 人际关系
- growth(成长线): 个人成长
- freedom(自由线): 自由度
- buffer(缓冲线): 安全缓冲

输出严格的 JSON 格式：
{"months":[{"month":1,"career":{"open":60,"high":70,"low":50,"close":65,"volume":70},"wealth":{...},...},...]}

每个月每条线都有 OHLCV 五个值（0-100）。`;

      const userPrompt = `用户八字信息：${baziProfile ? `五行分布=${baziProfile.wuXingDist}, 身旺=${baziProfile.shenWang}, 喜用神=${baziProfile.xiYongShen}` : '无'}

最近状态：${snapshots.length > 0 ? `capacity=${snapshots[0].capacity}, entropy=${snapshots[0].entropy}, quadrant=${snapshots[0].quadrant}` : '无'}

请评估未来6个月的7线走势。`;

      const response = await this.llmProvidersService.chatCheap(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.4, maxTokens: 2000, jsonMode: true },
      );

      const content = response.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('K-line LLM response does not contain valid JSON');
        return false;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const months = parsed.months;
      if (!Array.isArray(months)) return false;

      const now = new Date();
      const lines = ['career', 'wealth', 'health', 'relationship', 'growth', 'freedom', 'buffer'];

      for (const monthData of months) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + (monthData.month || 1) - 1, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        const lineData: Record<string, string> = {};
        for (const line of lines) {
          const ohlcv = monthData[line];
          if (ohlcv && typeof ohlcv === 'object') {
            lineData[line] = JSON.stringify({
              open: Math.min(100, Math.max(0, ohlcv.open || 50)),
              high: Math.min(100, Math.max(0, ohlcv.high || 60)),
              low: Math.min(100, Math.max(0, ohlcv.low || 40)),
              close: Math.min(100, Math.max(0, ohlcv.close || 55)),
              volume: Math.min(100, Math.max(0, ohlcv.volume || 50)),
            });
          }
        }

        // 计算综合分
        const closes = lines.map(l => {
          try {
            const parsed = JSON.parse(lineData[l] || '{}');
            return parsed.close || 50;
          } catch { return 50; }
        });
        const compositeCapital = Math.round(closes.reduce((a, b) => a + b, 0) / closes.length);
        const volatility = Math.round(Math.sqrt(closes.reduce((a, b) => a + (b - compositeCapital) ** 2, 0) / closes.length));

        const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

        await this.db.klineBar.upsert({
          where: { userId_year_month: { userId, year, month } },
          create: {
            userId, year, month, monthLabel,
            career: lineData.career, wealth: lineData.wealth, health: lineData.health,
            relationship: lineData.relationship, growth: lineData.growth,
            freedom: lineData.freedom, buffer: lineData.buffer,
            compositeCapital, volatility,
          },
          update: {
            career: lineData.career, wealth: lineData.wealth, health: lineData.health,
            relationship: lineData.relationship, growth: lineData.growth,
            freedom: lineData.freedom, buffer: lineData.buffer,
            compositeCapital, volatility,
          },
        });
      }

      this.logger.log(`Persisted LLM-inferred K-line for user ${userId}, ${months.length} months`);
      return true;
    } catch (error) {
      this.logger.error(`K-line inference failed: ${(error as Error).message}`);
      return false;
    }
  }

  // ============================================================
  // get12DimStatus — 任务 2.2：获取"问此事"所处的 12 维潮汐状态
  // ============================================================

  /**
   * 获取当前问事所处的 12 维潮汐状态 + 三组判断 + 综合相位判断
   *
   * 实现策略：
   *   1. 查询用户最新的 StateSnapshot（按 targetDate 定位）
   *   2. 若无数据，尝试调用 inferAndPersist() 推导一次再查询
   *   3. 复用 TideJudgmentService.buildTideJudgment() 生成三组判断 + 综合判断
   *   4. 若 LLM 不可用或查询失败，返回 fallback 兜底数据
   *
   * @param input - 结构化输入：userId / profileId / birthDate / targetDate / questionType / recordId
   * @returns 12 维分数 + 三组聚合 + 三组判断 + 综合判断 + 行动建议
   */
  async get12DimStatus(input: TideStatusInput): Promise<TideStatusResult> {
    const userId = input?.userId;
    const targetDate = input?.targetDate || this._currentMonthLabel();

    if (!userId) {
      return this._fallbackTideStatus('未提供 userId', input);
    }

    try {
      // 1. 查询用户所有状态快照，定位最接近 targetDate 的那条
      const snapshots: any[] = await this.db.stateSnapshot.findMany({
        where: { userId },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });

      let snap = this._findNearestSnapshot(snapshots, targetDate);

      // 2. 若无数据，尝试 LLM 推导一次再查询
      if (!snap && this.llmProvidersService) {
        this.logger.log(`[get12DimStatus] 用户 ${userId} 无快照，尝试 LLM 推导...`);
        const inferred = await this.inferAndPersist(userId);
        if (inferred) {
          const reSnapshots: any[] = await this.db.stateSnapshot.findMany({
            where: { userId },
            orderBy: [{ year: 'asc' }, { month: 'asc' }],
          });
          snap = this._findNearestSnapshot(reSnapshots, targetDate);
        }
      }

      if (!snap) {
        this.logger.warn(`[get12DimStatus] 用户 ${userId} 无快照数据且 LLM 推导失败`);
        return this._fallbackTideStatus('无快照数据且 LLM 推导失败', input);
      }

      // 3. 构造 StateSnapshot 接口（兼容 TideJudgmentService 的入参）
      const snapForJudgment = {
        energy: snap.energy ?? 50,
        recovery: snap.recovery ?? 50,
        emotion: snap.emotion ?? 50,
        clarity: snap.clarity ?? 50,
        liquidity: snap.liquidity ?? 50,
        momentum: snap.momentum ?? 50,
        support: snap.support ?? 50,
        agency: snap.agency ?? 50,
        order: snap.order ?? 50,
        growth: snap.growth ?? 50,
        optionality: snap.optionality ?? 50,
        buffer: snap.buffer ?? 50,
        timeGroup: snap.timeGroup ?? this._avg([snap.liquidity, snap.momentum, snap.optionality]),
        positionGroup: snap.positionGroup ?? this._avg([snap.support, snap.agency, snap.order, snap.growth, snap.buffer]),
        mindGroup: snap.mindGroup ?? this._avg([snap.energy, snap.recovery, snap.emotion, snap.clarity]),
        quadrant: snap.quadrant || 'recovery',
      };

      // 4. 复用 TideJudgmentService 生成三组判断 + 综合判断
      const judgment = TideJudgmentService.buildTideJudgment(snapForJudgment as any);

      this.logger.log(
        `[get12DimStatus] 用户 ${userId} targetDate=${targetDate} ` +
        `phase=${judgment.phaseJudgment} quadrant=${snapForJudgment.quadrant}`,
      );

      return {
        targetDate,
        dimensions: {
          energy: snapForJudgment.energy,
          recovery: snapForJudgment.recovery,
          emotion: snapForJudgment.emotion,
          clarity: snapForJudgment.clarity,
          liquidity: snapForJudgment.liquidity,
          momentum: snapForJudgment.momentum,
          support: snapForJudgment.support,
          agency: snapForJudgment.agency,
          order: snapForJudgment.order,
          growth: snapForJudgment.growth,
          optionality: snapForJudgment.optionality,
          buffer: snapForJudgment.buffer,
        },
        timeGroup: snapForJudgment.timeGroup,
        positionGroup: snapForJudgment.positionGroup,
        mindGroup: snapForJudgment.mindGroup,
        timeStatus: judgment.timeStatus,
        positionStatus: judgment.positionStatus,
        mindStatus: judgment.mindStatus,
        phaseJudgment: judgment.phaseJudgment,
        shortDirective: judgment.shortDirective,
        windowTip: judgment.windowTip,
        actionAdvice: judgment.actionAdvice,
        quadrant: snapForJudgment.quadrant,
        capacity: snap.capacity,
        entropy: snap.entropy,
        questionType: input?.questionType,
        recordId: input?.recordId,
        source: 'llm',
      };
    } catch (error) {
      this.logger.error(`[get12DimStatus] 失败: ${(error as Error).message}`);
      return this._fallbackTideStatus(`查询异常: ${(error as Error).message}`, input);
    }
  }

  /** 当前月份标签 "YYYY-MM" */
  private _currentMonthLabel(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /** 数组均值（用于补全缺失的 group 分） */
  private _avg(values: (number | undefined)[]): number {
    const valid = values.filter((v) => typeof v === 'number' && !isNaN(v)) as number[];
    if (valid.length === 0) return 50;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }

  /** 在快照列表中找到最接近 targetDate 的那条 */
  private _findNearestSnapshot(snapshots: any[], targetDate: string): any | null {
    if (!snapshots || snapshots.length === 0) return null;
    const sorted = [...snapshots].sort((a, b) => {
      const aDate = a.date || `${a.year}-${String(a.month).padStart(2, '0')}`;
      const bDate = b.date || `${b.year}-${String(b.month).padStart(2, '0')}`;
      return aDate.localeCompare(bDate);
    });
    const before = sorted.filter((s) => {
      const sDate = s.date || `${s.year}-${String(s.month).padStart(2, '0')}`;
      return sDate <= targetDate;
    });
    return before.length > 0 ? before[before.length - 1] : sorted[0];
  }

  /** 兜底返回（无数据或异常时） */
  private _fallbackTideStatus(reason: string, input?: TideStatusInput): TideStatusResult {
    const targetDate = input?.targetDate || this._currentMonthLabel();
    return {
      targetDate,
      dimensions: {
        energy: 50, recovery: 50, emotion: 50, clarity: 50,
        liquidity: 50, momentum: 50, support: 50, agency: 50,
        order: 50, growth: 50, optionality: 50, buffer: 50,
      },
      timeGroup: 50,
      positionGroup: 50,
      mindGroup: 50,
      timeStatus: { score: 50, level: 'mid', label: '时机中性，可有选择地推进' },
      positionStatus: { score: 50, level: 'mid', label: '基础中等，注意风险对冲' },
      mindStatus: { score: 50, level: 'mid', label: '心能平稳，避免过度决策' },
      phaseJudgment: '中位震荡：按既定节奏推进',
      shortDirective: '保持节奏，不冒进不保守',
      windowTip: '数据不足，暂无窗口提示',
      actionAdvice: `当前无法判断 12 维状态（${reason}），建议先完成潮汐数据推导后再问事。`,
      quadrant: 'recovery',
      questionType: input?.questionType,
      recordId: input?.recordId,
      source: 'fallback',
    };
  }
}
