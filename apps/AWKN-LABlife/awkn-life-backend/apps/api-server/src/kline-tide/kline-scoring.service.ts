/**
 * P1-T2.2: 三线命理算法骨架
 *
 * 将 BaZiProfile 的八字数据映射为三条核心人生线的事业/财富/情感评分。
 * 本文件为骨架实现，提供：
 *  - 评分（0-100）
 *  - 命理学依据（可追溯到《子平真诠》《滴天髓》十神体系）
 *  - 关键神煞/用神影响因子
 *
 * 三线映射规则：
 *  1. 事业线（career）：官星旺衰 + 日主强弱
 *     - 官星（正官/七杀）主事业地位、权力
 *     - 日主身旺能任官，身弱则官星压身
 *     - 来源：《子平真诠》"论用神成败"
 *  2. 财富线（wealth）：财星旺衰 + 食伤生财
 *     - 财星（正财/偏财）主财富
 *     - 食伤生财（食神/伤官生财星）为财源
 *     - 身弱财多则富屋贫人
 *     - 来源：《滴天髓》"我克者为财"
 *  3. 情感线（relationship）：日主配偶宫 + 桃花神煞
 *     - 日支为配偶宫，藏干决定配偶特质
 *     - 桃花、红鸾、天喜主姻缘
 *     - 日主与财官（男财女官）的合冲决定情感稳定
 *     - 来源：《三命通会》"论婚姻"
 */
import { Injectable, Logger } from '@nestjs/common';

/** 三线评分结果 */
export interface LineScore {
  /** 维度名：career / wealth / relationship */
  dimension: 'career' | 'wealth' | 'relationship';
  /** 评分 0-100 */
  score: number;
  /** 命理学依据（人类可读） */
  reasoning: string;
  /** 关键影响因子 */
  factors: Array<{
    name: string;
    /** 因子类型：十神/神煞/用神/身旺 */
    type: 'shiShen' | 'shenSha' | 'xiYong' | 'shenWang';
    /** 影响分值（正=加分，负=减分） */
    impact: number;
    /** 命理学出处 */
    source?: string;
  }>;
  /** 风险提示（若有） */
  riskHint?: string;
}

/** 三线评分聚合 */
export interface TripleLineScores {
  career: LineScore;
  wealth: LineScore;
  relationship: LineScore;
  /** 评分来源：bazi=八字档案，fallback=兜底 */
  source: 'bazi' | 'fallback';
  /** 评分时间戳 */
  scoredAt: string;
}

@Injectable()
export class KlineScoringService {
  private readonly logger = new Logger(KlineScoringService.name);

  /**
   * 计算三线命理评分
   * @param bazi BaZiProfile 记录（若为 null 则返回兜底评分）
   * @returns 三线评分聚合
   */
  score(bazi: any | null): TripleLineScores {
    if (!bazi || !bazi.yearGanZhi || !bazi.shenWang) {
      return this._fallbackScores();
    }

    const scoredAt = new Date().toISOString();
    try {
      const career = this._scoreCareer(bazi);
      const wealth = this._scoreWealth(bazi);
      const relationship = this._scoreRelationship(bazi);

      this.logger.log(
        `[P1-T2.2] 三线评分完成 | 用户八字=${bazi.yearGanZhi}/${bazi.monthGanZhi}/${bazi.dayGanZhi}/${bazi.timeGanZhi} | career=${career.score} wealth=${wealth.score} relationship=${relationship.score}`,
      );

      return { career, wealth, relationship, source: 'bazi', scoredAt };
    } catch (err: any) {
      this.logger.warn(`[P1-T2.2] 评分异常，走兜底 | err=${err?.message}`);
      return { ...this._fallbackScores(), scoredAt };
    }
  }

  // ============================================================
  // 事业线评分：官星旺衰 + 日主强弱
  // ============================================================
  /**
   * 事业线评分规则（骨架）：
   *  基础分 = 50
   *  1. 官星旺衰（±15）
   *    - 正官/七杀得分 > 0：+官星分（上限15）
   *    - 无官星：-5（事业缺推动力）
   *  2. 日主强弱（±10）
   *    - 身旺（score>=60）能任官：+10
   *    - 身弱（score<=40）官星压身：-10
   *    - 中和：+0
   *  3. 用神为官（+8）
   *    - 喜用神含官/杀：+8（事业为命局枢纽）
   *  4. 文昌贵人（+5）
   *    - 神煞含文昌：+5（主才华、考运、事业智慧）
   *  5. 忌神为官（-8）
   *    - 忌神含官/杀：-8（事业多阻碍）
   * 来源：《子平真诠》卷二"论用神成败"
   */
  private _scoreCareer(bazi: any): LineScore {
    const factors: LineScore['factors'] = [];
    let score = 50;
    let reasoning = '事业线评分基于官星旺衰与日主强弱。';

    // 解析十神
    const shiShen = this._parseJson(bazi.shiShen, {});
    const guanScore = this._getShiShen(shiShen, ['官', '官星', 'zhengGuan', 'qiSha', '正官', '七杀']);
    const shaScore = this._getShiShen(shiShen, ['杀', '七杀', 'qiSha']);

    // 1. 官星旺衰
    if (guanScore > 0) {
      const impact = Math.min(15, guanScore * 3);
      score += impact;
      factors.push({
        name: `官星旺（得分${guanScore}）`,
        type: 'shiShen',
        impact,
        source: '《子平真诠》官主事业地位',
      });
      reasoning += ` 官星旺（${guanScore}），事业有推动力。`;
    } else {
      score -= 5;
      factors.push({
        name: '无官星',
        type: 'shiShen',
        impact: -5,
        source: '无官星则事业缺推动力',
      });
      reasoning += ' 命局无官星，事业需自创。';
    }

    // 2. 日主强弱
    const shenWangScore = Number(bazi.shenWangScore) || 50;
    if (shenWangScore >= 60) {
      score += 10;
      factors.push({
        name: `身旺（${bazi.shenWang}, ${shenWangScore}）`,
        type: 'shenWang',
        impact: 10,
        source: '身旺能任官，事业可承载',
      });
      reasoning += ` 身旺(${shenWangScore})能任官星。`;
    } else if (shenWangScore <= 40) {
      score -= 10;
      factors.push({
        name: `身弱（${bazi.shenWang}, ${shenWangScore}）`,
        type: 'shenWang',
        impact: -10,
        source: '身弱官星压身，事业多压力',
      });
      reasoning += ` 身弱(${shenWangScore})官星压身，事业多压力。`;
      // 风险提示
    }

    // 3. 用神为官
    const xiYong = this._parseJson<{ yong?: string[]; xi?: string[]; ji?: string[] }>(bazi.xiYongShen, {});
    const yongShen: string[] = xiYong.yong || xiYong.xi || [];
    const jiShen: string[] = xiYong.ji || [];
    if (yongShen.some((s: string) => ['官', '杀'].includes(s))) {
      score += 8;
      factors.push({
        name: '用神为官',
        type: 'xiYong',
        impact: 8,
        source: '用神为官，事业为命局枢纽',
      });
      reasoning += ' 用神为官，事业为命局枢纽。';
    }
    if (jiShen.some((s: string) => ['官', '杀'].includes(s))) {
      score -= 8;
      factors.push({
        name: '忌神为官',
        type: 'xiYong',
        impact: -8,
        source: '忌神为官，事业多阻碍',
      });
      reasoning += ' 忌神为官，事业多阻碍。';
    }

    // 4. 文昌贵人
    const shenSha = this._parseJson(bazi.shenSha, {});
    if (this._hasShenSha(shenSha, ['文昌', 'wenChang', '文昌贵人'])) {
      score += 5;
      factors.push({
        name: '文昌贵人',
        type: 'shenSha',
        impact: 5,
        source: '文昌主才华、考运、事业智慧',
      });
      reasoning += ' 命带文昌，事业有智慧加持。';
    }

    score = this._clamp(score);
    const riskHint = shenWangScore <= 40 && guanScore > 5
      ? '身弱官旺，事业压力过大，注意健康'
      : undefined;

    return {
      dimension: 'career',
      score,
      reasoning,
      factors,
      riskHint,
    };
  }

  // ============================================================
  // 财富线评分：财星旺衰 + 食伤生财
  // ============================================================
  /**
   * 财富线评分规则（骨架）：
   *  基础分 = 50
   *  1. 财星旺衰（±15）
   *    - 正财/偏财得分 > 0：+财星分（上限15）
   *    - 无财星：-5
   *  2. 食伤生财（+10）
   *    - 食神/伤官得分 > 0 且财星 > 0：+10（财源不断）
   *  3. 日主强弱（±10）
   *    - 身旺能任财：+10
   *    - 身弱财多（富屋贫人）：-10
   *  4. 用神为财（+8）
   *  5. 天乙贵人（+5）
   * 来源：《滴天髓》"我克者为财"，《穷通宝鉴》食伤生财
   */
  private _scoreWealth(bazi: any): LineScore {
    const factors: LineScore['factors'] = [];
    let score = 50;
    let reasoning = '财富线评分基于财星旺衰与食伤生财。';

    const shiShen = this._parseJson(bazi.shiShen, {});
    const caiScore = this._getShiShen(shiShen, ['财', '财星', 'zhengCai', 'pianCai', '正财', '偏财']);
    const shiShangScore = this._getShiShen(shiShen, ['食', '食伤', 'shiShen', 'shangGuan', '食神', '伤官']);

    // 1. 财星旺衰
    if (caiScore > 0) {
      const impact = Math.min(15, caiScore * 3);
      score += impact;
      factors.push({
        name: `财星旺（得分${caiScore}）`,
        type: 'shiShen',
        impact,
        source: '《滴天髓》财为养命之源',
      });
      reasoning += ` 财星旺（${caiScore}），有财富基础。`;
    } else {
      score -= 5;
      factors.push({
        name: '无财星',
        type: 'shiShen',
        impact: -5,
        source: '无财星则财富需靠食伤生扶',
      });
      reasoning += ' 命局无财星，需靠食伤生财。';
    }

    // 2. 食伤生财
    if (shiShangScore > 0 && caiScore > 0) {
      score += 10;
      factors.push({
        name: `食伤生财（食伤${shiShangScore}）`,
        type: 'shiShen',
        impact: 10,
        source: '《穷通宝鉴》食伤生财，财源不断',
      });
      reasoning += ` 食伤(${shiShangScore})生财，财源不断。`;
    }

    // 3. 日主强弱
    const shenWangScore = Number(bazi.shenWangScore) || 50;
    if (shenWangScore >= 60) {
      score += 10;
      factors.push({
        name: `身旺能任财（${shenWangScore}）`,
        type: 'shenWang',
        impact: 10,
        source: '身旺能任财，财富可守',
      });
      reasoning += ' 身旺能任财。';
    } else if (shenWangScore <= 40 && caiScore > 5) {
      score -= 10;
      factors.push({
        name: '身弱财多（富屋贫人）',
        type: 'shenWang',
        impact: -10,
        source: '《滴天髓》身弱财多，富屋贫人',
      });
      reasoning += ' 身弱财多，富屋贫人，财多身弱。';
    }

    // 4. 用神为财
    const xiYong = this._parseJson<{ yong?: string[]; xi?: string[]; ji?: string[] }>(bazi.xiYongShen, {});
    const yongShen: string[] = xiYong.yong || xiYong.xi || [];
    const jiShen: string[] = xiYong.ji || [];
    if (yongShen.some((s: string) => ['财', '才'].includes(s))) {
      score += 8;
      factors.push({
        name: '用神为财',
        type: 'xiYong',
        impact: 8,
        source: '用神为财，财富为命局枢纽',
      });
      reasoning += ' 用神为财，财富为命局枢纽。';
    }
    if (jiShen.some((s: string) => ['财', '才'].includes(s))) {
      score -= 8;
      factors.push({
        name: '忌神为财',
        type: 'xiYong',
        impact: -8,
        source: '忌神为财，因财生灾',
      });
      reasoning += ' 忌神为财，因财生灾。';
    }

    // 5. 天乙贵人
    const shenSha = this._parseJson(bazi.shenSha, {});
    if (this._hasShenSha(shenSha, ['天乙', '天乙贵人', 'tianYi'])) {
      score += 5;
      factors.push({
        name: '天乙贵人',
        type: 'shenSha',
        impact: 5,
        source: '天乙主贵人扶持，财路通达',
      });
      reasoning += ' 命带天乙贵人，财路有贵人扶持。';
    }

    score = this._clamp(score);
    const riskHint = shenWangScore <= 40 && caiScore > 5
      ? '身弱财多，注意因财生灾、健康损耗'
      : undefined;

    return {
      dimension: 'wealth',
      score,
      reasoning,
      factors,
      riskHint,
    };
  }

  // ============================================================
  // 情感线评分：日主配偶宫 + 桃花神煞
  // ============================================================
  /**
   * 情感线评分规则（骨架）：
   *  基础分 = 50
   *  1. 日支配偶宫（±10）
   *    - 日柱地支藏干有财/官（男财女官）：+10
   *    - 日支逢冲：-10
   *  2. 桃花神煞（+8）
   *    - 桃花/红鸾/天喜：+8（主姻缘）
   *  3. 日主合财官（+5）
   *    - 日主与财官相合：+5（情感顺遂）
   *  4. 用神为配偶星（+8）
   *  5. 忌神为配偶星（-8）
   * 来源：《三命通会》"论婚姻"
   */
  private _scoreRelationship(bazi: any): LineScore {
    const factors: LineScore['factors'] = [];
    let score = 50;
    let reasoning = '情感线评分基于日主配偶宫与桃花神煞。';

    const shiShen = this._parseJson(bazi.shiShen, {});
    const shenSha = this._parseJson(bazi.shenSha, {});
    const xiYong = this._parseJson<{ yong?: string[]; xi?: string[]; ji?: string[] }>(bazi.xiYongShen, {});

    // 1. 日支配偶宫（简化：通过十神中是否有配偶星判断）
    const caiScore = this._getShiShen(shiShen, ['财', '财星', '正财', '偏财']);
    const guanScore = this._getShiShen(shiShen, ['官', '官星', '正官', '七杀']);
    const gender = bazi.gender || 'male';

    // 男命以财为妻，女命以官为夫
    const spouseStarScore = gender === 'male' ? caiScore : guanScore;
    const spouseStarName = gender === 'male' ? '财星' : '官星';

    if (spouseStarScore > 0) {
      score += Math.min(10, spouseStarScore * 2);
      factors.push({
        name: `${spouseStarName}旺（${spouseStarScore}）`,
        type: 'shiShen',
        impact: Math.min(10, spouseStarScore * 2),
        source: `《三命通会》${gender === 'male' ? '男以财为妻' : '女以官为夫'}`,
      });
      reasoning += ` ${spouseStarName}旺(${spouseStarScore})，配偶星有力。`;
    } else {
      score -= 5;
      factors.push({
        name: `${spouseStarName}弱`,
        type: 'shiShen',
        impact: -5,
        source: '配偶星弱，姻缘较迟',
      });
      reasoning += ` ${spouseStarName}弱，姻缘较迟。`;
    }

    // 2. 桃花神煞
    const taoHuaNames = ['桃花', '红鸾', '天喜', 'taoHua', 'hongLuan', 'tianXi'];
    const taoHuaHits = taoHuaNames.filter(n => this._hasShenSha(shenSha, [n]));
    if (taoHuaHits.length > 0) {
      score += 8;
      factors.push({
        name: `桃花神煞（${taoHuaHits.join('/')}）`,
        type: 'shenSha',
        impact: 8,
        source: '桃花红鸾主姻缘',
      });
      reasoning += ` 命带${taoHuaHits.join('/')}，姻缘有助。`;
    }

    // 3. 日支逢冲（简化：通过神煞中的冲刑判断）
    if (this._hasShenSha(shenSha, ['冲', '相冲', '六冲', '日支冲'])) {
      score -= 10;
      factors.push({
        name: '日支逢冲',
        type: 'shenSha',
        impact: -10,
        source: '日支逢冲，配偶宫不稳',
      });
      reasoning += ' 日支逢冲，配偶宫不稳。';
    }

    // 4. 用神为配偶星
    const yongShen = xiYong.yong || xiYong.xi || [];
    const jiShen = xiYong.ji || [];
    const spouseStarChar = gender === 'male' ? ['财', '才'] : ['官', '杀'];
    if (yongShen.some((s: string) => spouseStarChar.includes(s))) {
      score += 8;
      factors.push({
        name: `用神为${spouseStarName}`,
        type: 'xiYong',
        impact: 8,
        source: '用神为配偶星，情感为命局枢纽',
      });
      reasoning += ` 用神为${spouseStarName}，情感顺遂。`;
    }
    if (jiShen.some((s: string) => spouseStarChar.includes(s))) {
      score -= 8;
      factors.push({
        name: `忌神为${spouseStarName}`,
        type: 'xiYong',
        impact: -8,
        source: '忌神为配偶星，情感多波折',
      });
      reasoning += ` 忌神为${spouseStarName}，情感多波折。`;
    }

    score = this._clamp(score);
    const riskHint = this._hasShenSha(shenSha, ['冲', '相冲', '六冲'])
      ? '日支逢冲，注意婚姻波动'
      : undefined;

    return {
      dimension: 'relationship',
      score,
      reasoning,
      factors,
      riskHint,
    };
  }

  // ============================================================
  // 兜底评分（无八字档案时）
  // ============================================================
  private _fallbackScores(): TripleLineScores {
    return {
      career: {
        dimension: 'career',
        score: 55,
        reasoning: '无八字档案，使用默认事业线评分（兜底）。',
        factors: [],
      },
      wealth: {
        dimension: 'wealth',
        score: 50,
        reasoning: '无八字档案，使用默认财富线评分（兜底）。',
        factors: [],
      },
      relationship: {
        dimension: 'relationship',
        score: 55,
        reasoning: '无八字档案，使用默认情感线评分（兜底）。',
        factors: [],
      },
      source: 'fallback',
      scoredAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /** 安全 JSON 解析 */
  private _parseJson<T>(raw: any, defaultValue: T): T {
    if (!raw) return defaultValue;
    if (typeof raw === 'object') return raw as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  /** 从十神对象中按候选键取分数 */
  private _getShiShen(shiShen: Record<string, any>, keys: string[]): number {
    for (const k of keys) {
      if (shiShen[k] !== undefined) {
        const v = Number(shiShen[k]);
        if (!isNaN(v)) return v;
      }
    }
    return 0;
  }

  /** 判断神煞是否包含指定项 */
  private _hasShenSha(shenSha: Record<string, any>, keys: string[]): boolean {
    for (const k of keys) {
      if (shenSha[k] !== undefined && shenSha[k]) return true;
      // 兼容数组形式
      if (Array.isArray(shenSha[k]) && shenSha[k].length > 0) return true;
    }
    // 兼容 shenSha 为数组的情况
    if (Array.isArray(shenSha)) {
      return shenSha.some((s: any) =>
        keys.some(k => typeof s === 'string' && s.includes(k)),
      );
    }
    return false;
  }

  /** 钳制到 0-100 */
  private _clamp(v: number): number {
    return Math.max(0, Math.min(100, Math.round(v)));
  }
}
