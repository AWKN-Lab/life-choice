// ============================================================
// KlineCalculationEngine v2.0.0 — 纯确定性 K 线计算引擎
// P1-02 产物：从 KlineGenerator (consult path) 15 因子抽离而来
//
// 核心契约（不可破坏）：
//   1. 纯函数式：相同输入 → 相同输出（无 Math.random、无 Date.now、无 DB）
//   2. 无副作用：不写入 DB、不调用 LLM、不读取 env
//   3. 因子可验证：每条 bar 附 factorsHash，支持黄金样例比对（P1-10）
//   4. 数据源标识：所有 bar 的 source 恒为 'calculated'（V2 链路，Phase 1 修正）
//   5. 不依赖 _seededRandom：V2 链路禁用 seed 生成（P1-03）
//   6. 36 个月契约：yearMonth 模式固定生成当前月起 36 个数据点（Phase 1 Step 1.2）
//   7. 无隐式时间：所有时间来源于 asOfDate 输入（Phase 1 Step 1.1）
//
// 依赖：BaziFullResult（八字完整结果）、birthYear、可选 birthTime
// 输出：KlineCalculationResult（bars[] + meta）
// ============================================================

import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { BaziFullResult } from '../calc-engine/bazi-calculator-wrapper';
import {
  WUXING_BASE_SCORE,
  WUXING_TIANGAN,
  WUXING_DIZHI,
} from '../calc-engine/bazi-engine/core/bazi-data.service';
import type { KlineDataSource } from './v2-contracts';
import { Lunar } from 'lunar-javascript';

/** V2 视图模式（删除 'monthly'，合并到 'yearMonth'） */
export type KlineViewModeV2 = 'life' | 'decade' | 'yearMonth';

/** V2 单条 K 线数据点 */
export interface KlineBarV2 {
  /** 虚岁（0-100） */
  age: number;
  /** 公历年 */
  year: number;
  /** 月份（仅 yearMonth 模式） */
  month?: number;
  /** 流年干支（保留以供 KlineDecisionService 使用） */
  ganZhi: string;
  /** 当前大运干支 */
  daYun: string;
  /** 开盘价 */
  open: number;
  /** 最高价 */
  high: number;
  /** 最低价 */
  low: number;
  /** 收盘价（= 综合评分；V2 替代 KlinePoint.score 与 ParsedKlineBar.close） */
  close: number;
  /** 事业线分值（Phase 1 Step 1.4：四条独立曲线之一，基于官星旺衰） */
  career: number;
  /** 财富线分值（Phase 1 Step 1.4：基于财星+食伤生财） */
  wealth: number;
  /** 情感线分值（Phase 1 Step 1.4：基于配偶星+桃花神煞，男财女官） */
  relationship: number;
  /** 波动率 */
  volatility: number;
  /** 数据源标识 — V2 链路恒为 'calculated'（Phase 1 Step 1.6 修正） */
  source: KlineDataSource;
  /** V2 趋势标签（4 态，待 P1-05 映射为 5 态 V2 阶段） */
  trend: '上升' | '调整' | '蓄势' | '转折';
  /** 该条 bar 的因子指纹（P1-10 黄金样例验证用） */
  factorsHash: string;
  /** 是否当前年 */
  isCurrentYear: boolean;
  /** 是否大运切换年 */
  isDaYunChange: boolean;
}

/** 15 因子完整快照（透明可审计） */
export interface KlineFactorBreakdown {
  daYun: number;
  liuNian: number;
  yongShen: number;
  relation: number;
  shenSha: number;
  baseChart: number;
  shiShen: {
    biJian: number;
    jieCai: number;
    shiShen: number;
    shangGuan: number;
    pianCai: number;
    zhengCai: number;
    qiSha: number;
    zhengGuan: number;
  };
  xingChongHeHai: number;
  riskPenalty: number;
}

/** 计算输入 */
export interface KlineCalculationInput {
  baziResult: BaziFullResult;
  birthYear: number;
  /** 视图模式，默认 'yearMonth'（V2 主链路 36 个月，Phase 1 Step 1.2） */
  viewMode?: KlineViewModeV2;
  /** 计算基准日期（必填，替代原 currentYear 隐式读取，Phase 1 Step 1.1） */
  asOfDate: Date;
  /** 出生时辰（影响 confidence，不影响 close） */
  birthTime?: string;
  /** 性别（Phase 1 Step 1.4：影响 relationship 线计算，男财女官，默认 male） */
  gender?: 'male' | 'female';
}

/** 计算输出 */
export interface KlineCalculationResult {
  bars: KlineBarV2[];
  meta: {
    engineVersion: 'v2.0.0';
    calculatedAt: string;
    factorsHash: string;
    viewMode: KlineViewModeV2;
    /** 36 个月契约：yearMonth 模式固定 3（36 个月）；life/decade 模式 100 */
    rangeYears: number;
    /** 36 个月契约：yearMonth 模式固定 36 */
    monthCount?: number;
    factorBreakdowns: KlineFactorBreakdown[];
  };
}

const ENGINE_VERSION = 'v2.0.0' as const;

@Injectable()
export class KlineCalculationEngine {
  private readonly WUXING_SCORE: Record<string, number> = WUXING_BASE_SCORE;
  private readonly GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  private readonly ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /**
   * 计算 K 线数据（纯确定性）
   * 同一 baziResult + birthYear + asOfDate → 完全一致的 bars + meta.factorsHash
   *
   * Phase 1 修正：
   * - Step 1.1：asOfDate 必填，删除 new Date() 隐式读取
   * - Step 1.2：yearMonth 模式固定 36 个月（当前月起）
   * - Step 1.6：source 改为 'calculated'
   */
  calculate(input: KlineCalculationInput): KlineCalculationResult {
    const viewMode = input.viewMode ?? 'yearMonth';
    const currentYear = input.asOfDate.getFullYear();
    const gender = input.gender ?? 'male';

    let bars: KlineBarV2[];
    let factorBreakdowns: KlineFactorBreakdown[];
    let rangeYears: number;
    let monthCount: number | undefined;

    if (viewMode === 'yearMonth') {
      // V2 主链路：当前月起固定 36 个月（Phase 1 Step 1.2）
      const r = this.generateYearMonthBars(input.baziResult, input.birthYear, input.asOfDate, input.birthTime, gender);
      bars = r.bars;
      factorBreakdowns = r.breakdowns;
      rangeYears = 3;
      monthCount = 36;
    } else if (viewMode === 'decade') {
      const full = this.generateLifeBars(input.baziResult, input.birthYear, currentYear, 100, input.birthTime, gender);
      const currentAge = Math.max(0, currentYear - input.birthYear);
      const currentDaYun = this.findDaYun(input.baziResult, currentAge);
      if (currentDaYun) {
        bars = full.bars.filter((b) => b.age >= currentDaYun.startAge && b.age <= currentDaYun.endAge);
        factorBreakdowns = full.meta.factorBreakdowns.filter((_, i) => {
          const age = full.bars[i].age;
          return age >= currentDaYun.startAge && age <= currentDaYun.endAge;
        });
      } else {
        bars = full.bars.filter((b) => b.age >= currentAge && b.age < currentAge + 10);
        factorBreakdowns = full.meta.factorBreakdowns.filter((_, i) => {
          const age = full.bars[i].age;
          return age >= currentAge && age < currentAge + 10;
        });
      }
      rangeYears = 100;
    } else {
      // life
      const full = this.generateLifeBars(input.baziResult, input.birthYear, currentYear, 100, input.birthTime, gender);
      bars = full.bars;
      factorBreakdowns = full.meta.factorBreakdowns;
      rangeYears = 100;
    }

    const factorsHash = this.hashFactors(input, bars, factorBreakdowns);

    return {
      bars,
      meta: {
        engineVersion: ENGINE_VERSION,
        calculatedAt: input.asOfDate.toISOString(),
        factorsHash,
        viewMode,
        rangeYears,
        monthCount,
        factorBreakdowns,
      },
    };
  }

  // ============================================================
  // 内部生成方法
  // ============================================================

  private generateLifeBars(
    baziResult: BaziFullResult,
    birthYear: number,
    currentYear: number,
    rangeYears: number,
    birthTime?: string,
    gender: 'male' | 'female' = 'male',
  ): KlineCalculationResult {
    const bars: KlineBarV2[] = [];
    const breakdowns: KlineFactorBreakdown[] = [];

    for (let age = 0; age <= rangeYears; age++) {
      const year = birthYear + age;
      const daYun = this.findDaYun(baziResult, age);
      const liuNian = this.findLiuNian(baziResult, year);
      const breakdown = this.scoreParts(baziResult, daYun, liuNian);
      const close = this.clamp(Math.round(this.weightedScore(breakdown)), 20, 95);
      const lineScores = this.computeLineScores(breakdown, gender);
      const previousClose = bars.length > 0 ? bars[bars.length - 1].close : close;
      const volatility = this.clamp(
        Math.round(7 + Math.abs(close - previousClose) * 0.55 + Math.abs(breakdown.relation - 50) / 6),
        6,
        22,
      );
      const open = this.clamp(Math.round(previousClose * 0.65 + close * 0.35), 10, 100);

      bars.push({
        age,
        year,
        ganZhi: liuNian,
        daYun: daYun?.full || '',
        open,
        high: this.clamp(Math.max(open, close) + volatility, 10, 100),
        low: this.clamp(Math.min(open, close) - volatility, 10, 100),
        close,
        career: lineScores.career,
        wealth: lineScores.wealth,
        relationship: lineScores.relationship,
        volatility,
        source: 'calculated',
        trend: this.trendFromScore(close, open, close),
        factorsHash: this.hashSingleBar(age, year, undefined, liuNian, daYun?.full || '', breakdown, lineScores),
        isCurrentYear: year === currentYear,
        isDaYunChange: !!daYun && age === daYun.startAge,
      });
      breakdowns.push(breakdown);
    }

    return {
      bars,
      meta: {
        engineVersion: ENGINE_VERSION,
        calculatedAt: new Date().toISOString(),
        factorsHash: '',
        viewMode: 'life',
        rangeYears,
        factorBreakdowns: breakdowns,
      },
    };
  }

  /**
   * 生成 36 个月月度数据（V2 主链路，Phase 1 Step 1.2）
   *
   * 契约：
   * - 从 asOfDate 当前月起，固定生成 36 个数据点
   * - source 恒为 'calculated'（Phase 1 Step 1.6）
   * - 无 new Date() 隐式读取（Phase 1 Step 1.1）
   */
  private generateYearMonthBars(
    baziResult: BaziFullResult,
    birthYear: number,
    asOfDate: Date,
    birthTime?: string,
    gender: 'male' | 'female' = 'male',
  ): { bars: KlineBarV2[]; breakdowns: KlineFactorBreakdown[] } {
    const bars: KlineBarV2[] = [];
    const breakdowns: KlineFactorBreakdown[] = [];

    // 初始 previousClose：用出生年（age=0）的 close 作为起点
    const currentYear = asOfDate.getFullYear();
    const prevLife = this.generateLifeBars(baziResult, birthYear, currentYear, 0, birthTime, gender);
    let previousClose = prevLife.bars[0]?.close ?? 60;

    // 36 个月契约：从 asOfDate 当前月起
    const startYear = asOfDate.getFullYear();
    const startMonth = asOfDate.getMonth() + 1; // 1-12
    const MONTH_COUNT = 36;

    for (let i = 0; i < MONTH_COUNT; i++) {
      // 计算第 i 个月的年月
      const totalMonths = (startYear * 12 + (startMonth - 1)) + i;
      const year = Math.floor(totalMonths / 12);
      const month = (totalMonths % 12) + 1;
      const age = Math.max(0, year - birthYear);
      const daYun = this.findDaYun(baziResult, age);

      const monthGanZhi = this.getFlowMonthGanZhi(year, month);
      const breakdown = this.scoreParts(baziResult, daYun, monthGanZhi);
      const close = this.clamp(Math.round(this.weightedScore(breakdown)), 20, 95);
      const lineScores = this.computeLineScores(breakdown, gender);
      const volatility = this.clamp(
        Math.round(5 + Math.abs(close - previousClose) * 0.45 + Math.abs(breakdown.relation - 50) / 8),
        4,
        18,
      );
      const open = this.clamp(Math.round(previousClose * 0.55 + close * 0.45), 10, 100);

      bars.push({
        age,
        year,
        month,
        ganZhi: monthGanZhi,
        daYun: daYun?.full || '',
        open,
        high: this.clamp(Math.max(open, close) + volatility, 10, 100),
        low: this.clamp(Math.min(open, close) - volatility, 10, 100),
        close,
        career: lineScores.career,
        wealth: lineScores.wealth,
        relationship: lineScores.relationship,
        volatility,
        source: 'calculated',
        trend: this.trendFromScore(close, open, close),
        factorsHash: this.hashSingleBar(age, year, month, monthGanZhi, daYun?.full || '', breakdown, lineScores),
        isCurrentYear: i === 0, // 第 0 个为当前月
        isDaYunChange: !!daYun && age === daYun.startAge && month === 1,
      });
      breakdowns.push(breakdown);
      previousClose = close;
    }

    return { bars, breakdowns };
  }

  // ============================================================
  // 15 因子评分（从 KlineGenerator 完整迁移）
  // ============================================================

  private scoreParts(
    baziResult: BaziFullResult,
    daYun: BaziFullResult['daYun'][number] | undefined,
    liuNian: string,
  ): KlineFactorBreakdown {
    const daYunScore = daYun ? this.scoreDaYun(daYun, baziResult) : 55;
    const liuNianScore = this.scoreGanZhi(liuNian, baziResult);
    const yongShenScore = this.scoreYongShen(liuNian, baziResult);
    const relation = daYun ? this.scoreRelations(daYun.full, liuNian) : 50;
    const shenSha = this.scoreShenSha(liuNian, baziResult);
    const baseChart = this.computeBaseChart(baziResult);
    const shiShen = this.computeShiShenFactors(baziResult, liuNian);
    const xingChongHeHai = this.computeXingChongHeHai(baziResult, liuNian);
    const riskPenalty = this.computeRiskPenalty(baziResult, liuNian);

    return {
      daYun: daYunScore,
      liuNian: liuNianScore,
      yongShen: yongShenScore,
      relation,
      shenSha,
      baseChart,
      shiShen,
      xingChongHeHai,
      riskPenalty,
    };
  }

  /**
   * 计算三线分值（Phase 1 Step 1.4：四条独立曲线）
   *
   * 基于 KlineFactorBreakdown.shiShen 的十神字段计算 career/wealth/relationship 三个独立分值。
   *
   * 规则参考 KlineScoringService（kline-scoring.service.ts）：
   *  - career：官星旺衰（zhengGuan + qiSha）+ 日主强弱（baseChart）
   *  - wealth：财星旺衰（zhengCai + pianCai）+ 食伤生财（shiShen + shangGuan）
   *  - relationship：配偶星（男财女官）+ 刑冲合害（xingChongHeHai）
   *
   * @param breakdown 15 因子完整快照
   * @param gender 性别（影响 relationship 线计算，男财女官）
   * @returns 三线分值（0-100）
   */
  private computeLineScores(
    breakdown: KlineFactorBreakdown,
    gender: 'male' | 'female',
  ): { career: number; wealth: number; relationship: number } {
    const { shiShen, baseChart, xingChongHeHai } = breakdown;

    // 事业线：官星旺衰（zhengGuan + qiSha）+ 日主强弱（baseChart）
    const guanScore = (shiShen.zhengGuan + shiShen.qiSha) / 2;
    const careerRaw = 40 + guanScore * 0.4 + baseChart * 0.2;
    const career = this.clamp(Math.round(careerRaw), 20, 95);

    // 财富线：财星旺衰（zhengCai + pianCai）+ 食伤生财（shiShen + shangGuan）
    const caiScore = (shiShen.zhengCai + shiShen.pianCai) / 2;
    const shiShangScore = (shiShen.shiShen + shiShen.shangGuan) / 2;
    const wealthRaw = 40 + caiScore * 0.35 + shiShangScore * 0.15 + baseChart * 0.1;
    const wealth = this.clamp(Math.round(wealthRaw), 20, 95);

    // 情感线：配偶星（男财女官）+ 刑冲合害
    const spouseScore = gender === 'male'
      ? (shiShen.zhengCai + shiShen.pianCai) / 2
      : (shiShen.zhengGuan + shiShen.qiSha) / 2;
    const relationshipRaw = 45 + spouseScore * 0.35 + xingChongHeHai * 0.2;
    const relationship = this.clamp(Math.round(relationshipRaw), 20, 95);

    return { career, wealth, relationship };
  }

  /** 15 因子加权（权重与 KlineGenerator.weightedScore 一致） */
  private weightedScore(parts: KlineFactorBreakdown): number {
    const base =
      parts.daYun * 0.2 +
      parts.liuNian * 0.18 +
      parts.yongShen * 0.1 +
      parts.relation * 0.05 +
      parts.shenSha * 0.08;
    const extended =
      parts.baseChart * 0.12 +
      (parts.shiShen.biJian +
        parts.shiShen.jieCai +
        parts.shiShen.shiShen +
        parts.shiShen.shangGuan +
        parts.shiShen.pianCai +
        parts.shiShen.zhengCai +
        parts.shiShen.qiSha +
        parts.shiShen.zhengGuan) *
        0.02 +
      parts.xingChongHeHai * 0.05;
    const penalty = parts.riskPenalty;
    return Math.max(0, Math.min(100, base + extended - penalty));
  }

  // ---------- 单因子实现（与 KlineGenerator 逐行一致） ----------

  private computeBaseChart(baziResult: BaziFullResult): number {
    try {
      const { wood, fire, earth, metal, water } = baziResult.wuxing;
      const total = (wood || 0) + (fire || 0) + (earth || 0) + (metal || 0) + (water || 0);
      if (total === 0) return 50;
      const avg = total / 5;
      const variance =
        [wood, fire, earth, metal, water].reduce((sum, n) => sum + Math.pow((n || 0) - avg, 2), 0) / 5;
      const balance = Math.max(0, 100 - variance * 8);
      return this.clamp(Math.round(balance), 30, 90);
    } catch {
      return 50;
    }
  }

  private computeShiShenFactors(
    baziResult: BaziFullResult,
    liuNian: string,
  ): KlineFactorBreakdown['shiShen'] {
    try {
      const dayGan = baziResult.dayPillar[0];
      const yearGan = liuNian[0];
      const shiShenName = this.deriveShiShen(dayGan, yearGan);
      const result = {
        biJian: 50,
        jieCai: 50,
        shiShen: 50,
        shangGuan: 50,
        pianCai: 50,
        zhengCai: 50,
        qiSha: 50,
        zhengGuan: 50,
      };
      const weakest = this.getWeakestElement(baziResult);
      const shiShenElement = this.getGanWuxing(yearGan);
      const isFavorable = shiShenElement === weakest;
      const boost = isFavorable ? 20 : -10;
      if (shiShenName in result) {
        (result as any)[shiShenName] = this.clamp(50 + boost, 30, 80);
      }
      return result;
    } catch {
      return {
        biJian: 50,
        jieCai: 50,
        shiShen: 50,
        shangGuan: 50,
        pianCai: 50,
        zhengCai: 50,
        qiSha: 50,
        zhengGuan: 50,
      };
    }
  }

  private deriveShiShen(dayGan: string, targetGan: string): string {
    const dayWuxing = this.getGanWuxing(dayGan);
    const targetWuxing = this.getGanWuxing(targetGan);
    const dayIndex = this.GAN.indexOf(dayGan);
    const targetIndex = this.GAN.indexOf(targetGan);
    const sameYinYang = dayIndex % 2 === targetIndex % 2;
    if (dayWuxing === targetWuxing) return sameYinYang ? 'biJian' : 'jieCai';
    if (this.isGenerating(dayWuxing, targetWuxing)) return sameYinYang ? 'shiShen' : 'shangGuan';
    if (this.isOvercoming(dayWuxing, targetWuxing)) return sameYinYang ? 'pianCai' : 'zhengCai';
    if (this.isOvercoming(targetWuxing, dayWuxing)) return sameYinYang ? 'qiSha' : 'zhengGuan';
    return 'biJian';
  }

  private isGenerating(from: string, to: string): boolean {
    const genPairs: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    return genPairs[from] === to;
  }

  private isOvercoming(from: string, to: string): boolean {
    const overcomePairs: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
    return overcomePairs[from] === to;
  }

  private computeXingChongHeHai(baziResult: BaziFullResult, liuNian: string): number {
    try {
      const liuNianZhi = liuNian[1];
      const pillars = [
        baziResult.yearPillar,
        baziResult.monthPillar,
        baziResult.dayPillar,
        baziResult.hourPillar,
      ];
      let score = 50;
      for (const pillar of pillars) {
        const pillarZhi = pillar[1];
        if (this.checkDiZhiHe(liuNianZhi, pillarZhi)) score += 8;
        if (this.checkDiZhiChong(liuNianZhi, pillarZhi)) score -= 12;
        if (this.checkSanHe(liuNianZhi, pillarZhi)) score += 5;
        if (this.checkXing(liuNianZhi, pillarZhi)) score -= 8;
        if (this.checkHai(liuNianZhi, pillarZhi)) score -= 6;
      }
      return this.clamp(score, 20, 90);
    } catch {
      return 50;
    }
  }

  private checkSanHe(a: string, b: string): boolean {
    const sanHeGroups = [
      ['申', '子', '辰'],
      ['寅', '午', '戌'],
      ['巳', '酉', '丑'],
      ['亥', '卯', '未'],
    ];
    return sanHeGroups.some((group) => group.includes(a) && group.includes(b) && a !== b);
  }

  private checkXing(a: string, b: string): boolean {
    const xingPairs = [
      ['寅', '巳'],
      ['巳', '申'],
      ['申', '寅'],
      ['丑', '戌'],
      ['戌', '未'],
      ['未', '丑'],
      ['子', '卯'],
    ];
    return xingPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  }

  private checkHai(a: string, b: string): boolean {
    const haiPairs = [
      ['子', '未'],
      ['丑', '午'],
      ['寅', '巳'],
      ['卯', '辰'],
      ['申', '亥'],
      ['酉', '戌'],
    ];
    return haiPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  }

  private computeRiskPenalty(baziResult: BaziFullResult, liuNian: string): number {
    try {
      const liuNianZhi = liuNian[1];
      const pillars = [
        baziResult.yearPillar,
        baziResult.monthPillar,
        baziResult.dayPillar,
        baziResult.hourPillar,
      ];
      let penaltyCount = 0;
      for (const pillar of pillars) {
        const pillarZhi = pillar[1];
        if (this.checkDiZhiChong(liuNianZhi, pillarZhi)) penaltyCount++;
        if (this.checkXing(liuNianZhi, pillarZhi)) penaltyCount++;
        if (this.checkHai(liuNianZhi, pillarZhi)) penaltyCount++;
      }
      return Math.min(penaltyCount * 2, 10);
    } catch {
      return 0;
    }
  }

  private scoreDaYun(yun: BaziFullResult['daYun'][number], baziResult: BaziFullResult): number {
    return this.clamp(
      (this.scoreElement(this.getGanWuxing(yun.gan), baziResult) +
        this.scoreElement(this.getZhiWuxing(yun.zhi), baziResult)) /
        2 +
        6,
      25,
      95,
    );
  }

  private scoreGanZhi(ganZhi: string, baziResult: BaziFullResult): number {
    return this.clamp(
      (this.scoreElement(this.getGanWuxing(ganZhi[0]), baziResult) +
        this.scoreElement(this.getZhiWuxing(ganZhi[1]), baziResult)) /
        2,
      20,
      95,
    );
  }

  private scoreYongShen(ganZhi: string, baziResult: BaziFullResult): number {
    const weakest = this.getWeakestElement(baziResult);
    const strongest = this.getStrongestElement(baziResult);
    const elements = [this.getGanWuxing(ganZhi[0]), this.getZhiWuxing(ganZhi[1])];
    let score = 55;
    if (elements.includes(weakest)) score += 20;
    if (elements.includes(strongest)) score -= 10;
    return this.clamp(score, 20, 95);
  }

  private scoreRelations(daYun: string, liuNian: string): number {
    const ganScore = this.checkTianGanHe(daYun[0], liuNian[0])
      ? 68
      : this.checkTianGanChong(daYun[0], liuNian[0])
        ? 38
        : 52;
    const zhiScore = this.checkDiZhiHe(daYun[1], liuNian[1])
      ? 70
      : this.checkDiZhiChong(daYun[1], liuNian[1])
        ? 35
        : 52;
    return (ganScore + zhiScore) / 2;
  }

  private scoreShenSha(liuNian: string, baziResult: BaziFullResult): number {
    let score = 50;
    if (baziResult.shenSha?.tianYi?.includes(liuNian[1])) score += 12;
    if (baziResult.shenSha?.wenChang?.includes(liuNian[1])) score += 8;
    if (baziResult.shenSha?.taiJi?.includes(liuNian[1])) score += 8;
    if (baziResult.shenSha?.yangRen?.includes(liuNian[1])) score -= 10;
    return this.clamp(score, 20, 90);
  }

  private scoreElement(element: string, baziResult: BaziFullResult): number {
    const count = this.getElementCount(element, baziResult);
    const base = this.WUXING_SCORE[element] || 68;
    if (count <= 1) return base + 8;
    if (count >= 4) return base - 10;
    return base;
  }

  // ============================================================
  // 工具方法（与 KlineGenerator 逐行一致）
  // ============================================================

  private trendFromScore(score: number, open: number, close: number): KlineBarV2['trend'] {
    if (score >= 74 && close >= open) return '上升';
    if (score <= 48) return '调整';
    if (Math.abs(close - open) >= 10) return '转折';
    return '蓄势';
  }

  private findDaYun(baziResult: BaziFullResult, age: number) {
    return (
      baziResult.daYun.find((yun) => age >= yun.startAge && age <= yun.endAge) ||
      baziResult.daYun[0]
    );
  }

  private findLiuNian(baziResult: BaziFullResult, year: number): string {
    return (
      baziResult.liuNian.find((item) => item.year === year)?.ganZhi || this.getGanZhiYear(year)
    );
  }

  private getGanZhiYear(year: number): string {
    const offset = year - 1984;
    return `${this.GAN[((offset % 10) + 10) % 10]}${this.ZHI[((offset % 12) + 12) % 12]}`;
  }

  /**
   * 精确流月干支（Phase 1 Step 1.3 替换原 getApproxFlowMonthGanZhi）
   *
   * 改造前：基于年干推算起始 index 的近似算法
   * 改造后：基于 lunar-javascript 的精确农历+节气计算
   *
   * 实现细节：用该月 15 号作为参考日期（避开月初节气边界），
   * 调用 Lunar.getMonthInGanZhi() 获取精确流月干支。
   */
  private getFlowMonthGanZhi(year: number, month: number): string {
    // 用 15 号作为参考日期，避开月初节气切换边界
    const lunar = Lunar.fromDate(new Date(year, month - 1, 15));
    return lunar.getMonthInGanZhi();
  }

  private getWeakestElement(baziResult: BaziFullResult): string {
    return this.elementEntries(baziResult).sort((a, b) => a.count - b.count)[0].cn;
  }

  private getStrongestElement(baziResult: BaziFullResult): string {
    return this.elementEntries(baziResult).sort((a, b) => b.count - a.count)[0].cn;
  }

  private getElementCount(element: string, baziResult: BaziFullResult): number {
    const map: Record<string, keyof BaziFullResult['wuxing']> = {
      木: 'wood',
      火: 'fire',
      土: 'earth',
      金: 'metal',
      水: 'water',
    };
    return baziResult.wuxing[map[element]] || 0;
  }

  private elementEntries(baziResult: BaziFullResult) {
    return [
      { cn: '木', count: baziResult.wuxing.wood || 0 },
      { cn: '火', count: baziResult.wuxing.fire || 0 },
      { cn: '土', count: baziResult.wuxing.earth || 0 },
      { cn: '金', count: baziResult.wuxing.metal || 0 },
      { cn: '水', count: baziResult.wuxing.water || 0 },
    ];
  }

  private getGanWuxing(gan: string): string {
    return WUXING_TIANGAN[gan] || '土';
  }

  private getZhiWuxing(zhi: string): string {
    return WUXING_DIZHI[zhi] || '土';
  }

  private checkTianGanHe(a: string, b: string): boolean {
    return ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'].some((pair) => pair.includes(a) && pair.includes(b));
  }

  private checkTianGanChong(a: string, b: string): boolean {
    return ['甲庚', '乙辛', '丙壬', '丁癸'].some((pair) => pair.includes(a) && pair.includes(b));
  }

  private checkDiZhiHe(a: string, b: string): boolean {
    return ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'].some((pair) => pair.includes(a) && pair.includes(b));
  }

  private checkDiZhiChong(a: string, b: string): boolean {
    return ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].some((pair) => pair.includes(a) && pair.includes(b));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // ============================================================
  // 确定性哈希（P1-10 黄金样例验证用）
  // ============================================================

  /**
   * 单条 bar 的因子指纹
   * 输入：定位字段 + 全部 15 因子
   * 输出：sha256 前 16 字符（足够碰撞抵抗 + 可读）
   */
  private hashSingleBar(
    age: number,
    year: number,
    month: number | undefined,
    ganZhi: string,
    daYun: string,
    breakdown: KlineFactorBreakdown,
    lineScores?: { career: number; wealth: number; relationship: number },
  ): string {
    const payload = JSON.stringify({
      age,
      year,
      month: month ?? null,
      ganZhi,
      daYun,
      f: {
        d: breakdown.daYun,
        l: breakdown.liuNian,
        y: breakdown.yongShen,
        r: breakdown.relation,
        s: breakdown.shenSha,
        b: breakdown.baseChart,
        ss: breakdown.shiShen,
        x: breakdown.xingChongHeHai,
        p: breakdown.riskPenalty,
      },
      ls: lineScores ?? null,
    });
    return createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16);
  }

  /**
   * 整批 bars 的因子指纹
   * 输入：baziResult 关键标识 + viewMode + rangeYears + bars 数量 + 首末 bar 的 factorsHash
   * 输出：sha256 前 16 字符
   */
  private hashFactors(
    input: KlineCalculationInput,
    bars: KlineBarV2[],
    breakdowns: KlineFactorBreakdown[],
  ): string {
    const bazi = input.baziResult;
    const payload = JSON.stringify({
      ev: ENGINE_VERSION,
      vm: input.viewMode ?? 'yearMonth',
      ry: input.viewMode === 'yearMonth' ? 3 : 100, // Phase 1: 36 个月 = 3 年
      mc: input.viewMode === 'yearMonth' ? 36 : undefined, // monthCount
      ad: input.asOfDate.toISOString(), // asOfDate（Phase 1 Step 1.1）
      by: input.birthYear,
      bt: input.birthTime ?? null,
      gd: input.gender ?? 'male', // Phase 1 Step 1.4：性别影响三线计算
      bz: {
        yg: bazi.yearPillar,
        mg: bazi.monthPillar,
        dg: bazi.dayPillar,
        hg: bazi.hourPillar,
        wx: bazi.wuxing,
        dy: (bazi.daYun || []).map((y) => `${y.startAge}-${y.endAge}:${y.full}`),
      },
      bn: bars.length,
      first: bars[0]?.factorsHash ?? '',
      last: bars[bars.length - 1]?.factorsHash ?? '',
      bd: breakdowns.length,
    });
    return createHash('sha256').update(payload, 'utf8').digest('hex').slice(0, 16);
  }
}
