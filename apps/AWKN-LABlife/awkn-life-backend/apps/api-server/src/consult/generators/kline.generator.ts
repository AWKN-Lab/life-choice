import { Injectable } from '@nestjs/common';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';
import { WUXING_BASE_SCORE, WUXING_TIANGAN, WUXING_DIZHI } from '../../calc-engine/bazi-engine/core/bazi-data.service';

export type KlineViewMode = 'life' | 'decade' | 'monthly' | 'yearMonth';

export interface KlinePoint {
  age: number;
  year: number;
  month?: number;
  monthName?: string;
  ganZhi: string;
  daYun: string;
  liuNian: string;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  volatility: number;
  reason: string;
  evidenceTags: string[];
  confidence: number;
  viewMode: KlineViewMode;
  granularity?: 'year' | 'month';
  trend: '上升' | '调整' | '蓄势' | '转折';
  advice: string;
  isCurrentYear?: boolean;
  isDaYunChange?: boolean;
}

export interface KlineMeta {
  currentAge: number;
  currentDaYun: string;
  confidence: number;
  bestWindow: { year: number; age: number; score: number } | null;
  riskWindow: { year: number; age: number; score: number } | null;
}

@Injectable()
export class KlineGenerator {
  private readonly WUXING_SCORE: Record<string, number> = WUXING_BASE_SCORE;

  generateKLineData(
    baziResult: BaziFullResult,
    birthYear: number,
    options: { birthTime?: string; viewMode?: KlineViewMode; currentYear?: number; rangeYears?: 80 | 100 } = {},
  ): KlinePoint[] {
    const currentYear = options.currentYear || new Date().getFullYear();
    const currentAge = Math.max(0, currentYear - birthYear);
    const confidence = this.calculateConfidence(options.birthTime);
    const rangeYears = options.rangeYears || 100;
    const fullData = this.generateLifeData(baziResult, birthYear, currentYear, confidence, rangeYears);

    if (options.viewMode === 'decade') {
      const currentDaYun = this.findDaYun(baziResult, currentAge);
      if (!currentDaYun) return fullData.filter((point) => point.age >= currentAge && point.age < currentAge + 10);
      return fullData.filter((point) => point.age >= currentDaYun.startAge && point.age <= currentDaYun.endAge);
    }

    if (options.viewMode === 'monthly') {
      return this.generateMonthlyData(baziResult, birthYear, options.birthTime, currentYear) as any;
    }

    if (options.viewMode === 'yearMonth') {
      return this.generateYearMonthData(baziResult, birthYear, options.birthTime, currentYear, rangeYears) as any;
    }

    return fullData.filter((point) => point.age >= 0 && point.age <= rangeYears);
  }

  generateYearMonthData(
    baziResult: BaziFullResult,
    birthYear: number,
    birthTime?: string,
    currentYear = new Date().getFullYear(),
    rangeYears: 80 | 100 = 100,
  ): KlinePoint[] {
    const confidence = this.calculateConfidence(birthTime);
    const points: KlinePoint[] = [];
    let previousClose = this.generateLifeData(baziResult, birthYear, currentYear, confidence, 0)[0]?.close || 60;

    for (let age = 0; age <= rangeYears; age++) {
      const year = birthYear + age;
      const daYun = this.findDaYun(baziResult, age);

      for (let month = 1; month <= 12; month++) {
        const monthGanZhi = this.getApproxFlowMonthGanZhi(year, month);
        const scoreParts = this.scoreParts(baziResult, daYun, monthGanZhi);
        const close = this.clamp(Math.round(this.weightedScore(scoreParts)), 20, 95);
        const volatility = this.clamp(Math.round(5 + Math.abs(close - previousClose) * 0.45 + Math.abs(scoreParts.relation - 50) / 8), 4, 18);
        const open = this.clamp(Math.round(previousClose * 0.55 + close * 0.45), 10, 100);
        const decimalAge = Math.round((age + (month - 1) / 12) * 100) / 100;

        points.push({
          age: decimalAge,
          year,
          month,
          monthName: this.MONTHS[month - 1],
          ganZhi: monthGanZhi,
          daYun: daYun?.full || '',
          liuNian: this.findLiuNian(baziResult, year),
          open,
          close,
          high: this.clamp(Math.max(open, close) + volatility, 10, 100),
          low: this.clamp(Math.min(open, close) - volatility, 10, 100),
          score: close,
          volatility,
          reason: this.buildReason(scoreParts, daYun?.full || '', `${year}年${this.MONTHS[month - 1]}(${monthGanZhi})`),
          evidenceTags: this.buildEvidenceTags(scoreParts, daYun?.full || '', monthGanZhi),
          confidence,
          viewMode: 'yearMonth',
          granularity: 'month',
          trend: this.trendFromScore(close, open, close),
          advice: this.adviceFromScore(close),
          isCurrentYear: year === currentYear && month === new Date().getMonth() + 1,
          isDaYunChange: !!daYun && age === daYun.startAge && month === 1,
        });
        previousClose = close;
      }
    }

    return points;
  }

  generateMeta(
    baziResult: BaziFullResult,
    birthYear: number,
    points: KlinePoint[],
    birthTime?: string,
    currentYear = new Date().getFullYear(),
  ): KlineMeta {
    const currentAge = Math.max(0, currentYear - birthYear);
    const currentDaYun = this.findDaYun(baziResult, currentAge);
    const best = points.reduce<KlinePoint | null>((acc, point) => (!acc || point.score > acc.score ? point : acc), null);
    const risk = points.reduce<KlinePoint | null>((acc, point) => (!acc || point.score < acc.score ? point : acc), null);

    return {
      currentAge,
      currentDaYun: currentDaYun?.full || '',
      confidence: this.calculateConfidence(birthTime),
      bestWindow: best ? { year: best.year, age: best.age, score: best.score } : null,
      riskWindow: risk ? { year: risk.year, age: risk.age, score: risk.score } : null,
    };
  }

  generateMonthlyData(
    baziResult: BaziFullResult,
    birthYear: number,
    birthTime?: string,
    currentYear = new Date().getFullYear(),
  ): Array<KlinePoint & { month: number; monthName: string }> {
    const currentMonth = new Date().getMonth() + 1;
    const confidence = this.calculateConfidence(birthTime);

    return Array.from({ length: 12 }).map((_, index) => {
      const month = ((currentMonth + index - 1) % 12) + 1;
      const year = currentYear + Math.floor((currentMonth + index - 1) / 12);
      const age = Math.max(0, year - birthYear);
      const gan = this.GAN[(year + month + index) % this.GAN.length];
      const zhi = this.ZHI[(month - 1) % this.ZHI.length];
      const liuNian = `${gan}${zhi}`;
      const daYun = this.findDaYun(baziResult, age);
      const scoreParts = this.scoreParts(baziResult, daYun, liuNian);
      const score = this.clamp(Math.round(this.weightedScore(scoreParts)), 20, 95);
      const volatility = this.clamp(Math.round(8 + Math.abs(scoreParts.relation - 50) / 4), 6, 20);
      const open = this.clamp(score - Math.round(volatility / 3), 10, 100);
      const close = score;

      return {
        month,
        monthName: this.MONTHS[month - 1],
        age,
        year,
        ganZhi: liuNian,
        daYun: daYun?.full || '',
        liuNian,
        open,
        close,
        high: this.clamp(Math.max(open, close) + volatility, 10, 100),
        low: this.clamp(Math.min(open, close) - volatility, 10, 100),
        score,
        volatility,
        reason: this.buildReason(scoreParts, daYun?.full || '', liuNian),
        evidenceTags: this.buildEvidenceTags(scoreParts, daYun?.full || '', liuNian),
        confidence,
        viewMode: 'monthly' as const,
        granularity: 'month' as const,
        trend: this.trendFromScore(score, open, close),
        advice: this.adviceFromScore(score),
        isCurrentYear: year === currentYear && month === currentMonth,
        isDaYunChange: false,
      };
    });
  }

  generateTrends(baziResult: BaziFullResult, birthYear = new Date().getFullYear() - 30): any[] {
    return this.generateKLineData(baziResult, birthYear, { viewMode: 'decade' })
      .slice(0, 3)
      .map((point) => ({
        period: `${point.year}年`,
        direction: point.trend,
        probability: point.confidence,
        note: point.reason,
      }));
  }

  generateKeyNodes(baziResult: BaziFullResult, birthYear: number): any[] {
    return baziResult.daYun
      .filter((yun) => yun.startAge >= 18 && yun.startAge <= 80)
      .map((yun) => ({
        time: `${yun.startAge}-${yun.endAge}岁`,
        year: birthYear + yun.startAge,
        event: `${yun.full}大运`,
        impact: this.scoreDaYun(yun, baziResult) >= 68 ? 'positive' : 'neutral',
        description: `大运切换，${this.getDaYunTheme(yun, baziResult)}`,
      }));
  }

  private generateLifeData(
    baziResult: BaziFullResult,
    birthYear: number,
    currentYear: number,
    confidence: number,
    rangeYears = 100,
  ): KlinePoint[] {
    const points: KlinePoint[] = [];

    for (let age = 0; age <= rangeYears; age++) {
      const year = birthYear + age;
      const daYun = this.findDaYun(baziResult, age);
      const liuNian = this.findLiuNian(baziResult, year);
      const scoreParts = this.scoreParts(baziResult, daYun, liuNian);
      const close = this.clamp(Math.round(this.weightedScore(scoreParts)), 20, 95);
      const previousClose = points[points.length - 1]?.close ?? close;
      const volatility = this.clamp(Math.round(7 + Math.abs(close - previousClose) * 0.55 + Math.abs(scoreParts.relation - 50) / 6), 6, 22);
      const open = this.clamp(Math.round(previousClose * 0.65 + close * 0.35), 10, 100);

      points.push({
        age,
        year,
        ganZhi: liuNian,
        daYun: daYun?.full || '',
        liuNian,
        open,
        close,
        high: this.clamp(Math.max(open, close) + volatility, 10, 100),
        low: this.clamp(Math.min(open, close) - volatility, 10, 100),
        score: close,
        volatility,
        reason: this.buildReason(scoreParts, daYun?.full || '', liuNian),
        evidenceTags: this.buildEvidenceTags(scoreParts, daYun?.full || '', liuNian),
        confidence,
        viewMode: 'life',
        granularity: 'year',
        trend: this.trendFromScore(close, open, close),
        advice: this.adviceFromScore(close),
        isCurrentYear: year === currentYear,
        isDaYunChange: !!daYun && age === daYun.startAge,
      });
    }

    return points;
  }

  private scoreParts(baziResult: BaziFullResult, daYun: BaziFullResult['daYun'][number] | undefined, liuNian: string) {
    const daYunScore = daYun ? this.scoreDaYun(daYun, baziResult) : 55;
    const liuNianScore = this.scoreGanZhi(liuNian, baziResult);
    const yongShenScore = this.scoreYongShen(liuNian, baziResult);
    const relation = daYun ? this.scoreRelations(daYun.full, liuNian) : 50;
    const shenSha = this.scoreShenSha(liuNian, baziResult);

    // U-P1-2: 新增 10 个核心因子（baseChart + 8 十神 + xingChongHeHai + riskPenalty）
    const baseChart = this.computeBaseChart(baziResult);
    const shiShen = this.computeShiShenFactors(baziResult, liuNian);
    const xingChongHeHai = this.computeXingChongHeHai(baziResult, liuNian);
    const riskPenalty = this.computeRiskPenalty(baziResult, liuNian);

    return {
      // 现有 5 因子
      daYun: daYunScore,
      liuNian: liuNianScore,
      yongShen: yongShenScore,
      relation,
      shenSha,
      // U-P1-2: 新增 10 因子
      baseChart,
      shiShen,
      xingChongHeHai,
      riskPenalty,
    };
  }

  // U-P1-2: 新权重公式（5 现有 + 10 新增 = 15 因子）
  private weightedScore(parts: {
    daYun: number; liuNian: number; yongShen: number; relation: number; shenSha: number;
    baseChart: number;
    shiShen: { biJian: number; jieCai: number; shiShen: number; shangGuan: number;
               pianCai: number; zhengCai: number; qiSha: number; zhengGuan: number };
    xingChongHeHai: number;
    riskPenalty: number;
  }): number {
    // 现有 5 因子（权重降低，腾出空间给新因子）
    const base = parts.daYun * 0.20 + parts.liuNian * 0.18 + parts.yongShen * 0.10
               + parts.relation * 0.05 + parts.shenSha * 0.08;
    // 新增 10 因子
    const extended = parts.baseChart * 0.12
                   + (parts.shiShen.biJian + parts.shiShen.jieCai + parts.shiShen.shiShen
                      + parts.shiShen.shangGuan + parts.shiShen.pianCai + parts.shiShen.zhengCai
                      + parts.shiShen.qiSha + parts.shiShen.zhengGuan) * 0.02
                   + parts.xingChongHeHai * 0.05;
    // 风险扣分
    const penalty = parts.riskPenalty;
    return Math.max(0, Math.min(100, base + extended - penalty));
  }

  // U-P1-2: 基础原局评分（日主强弱 + 五行平衡度）
  private computeBaseChart(baziResult: BaziFullResult): number {
    try {
      const { wood, fire, earth, metal, water } = baziResult.wuxing;
      const total = (wood || 0) + (fire || 0) + (earth || 0) + (metal || 0) + (water || 0);
      if (total === 0) return 50;
      // 五行平衡度：方差越小越平衡（分数越高）
      const avg = total / 5;
      const variance = [wood, fire, earth, metal, water].reduce((sum, n) => sum + Math.pow((n || 0) - avg, 2), 0) / 5;
      const balance = Math.max(0, 100 - variance * 8);
      return this.clamp(Math.round(balance), 30, 90);
    } catch {
      return 50; // fallback
    }
  }

  // U-P1-2: 八十神因子评分（基于流年天干地支与日主的关系）
  private computeShiShenFactors(
    baziResult: BaziFullResult,
    liuNian: string,
  ): { biJian: number; jieCai: number; shiShen: number; shangGuan: number;
       pianCai: number; zhengCai: number; qiSha: number; zhengGuan: number } {
    try {
      const dayGan = baziResult.dayPillar[0]; // 日主天干
      const yearGan = liuNian[0]; // 流年天干
      const shiShenName = this.deriveShiShen(dayGan, yearGan);

      // 默认中性分 50，命局需要的十神加分，不需要的减分
      const result = { biJian: 50, jieCai: 50, shiShen: 50, shangGuan: 50,
                       pianCai: 50, zhengCai: 50, qiSha: 50, zhengGuan: 50 };

      // 根据十神类型给对应因子加分（其他因子保持中性）
      const weakest = this.getWeakestElement(baziResult); // 命局最弱五行
      const shiShenElement = this.getGanWuxing(yearGan);
      const isFavorable = shiShenElement === weakest; // 流年天干五行补命局弱点 = 有利

      const boost = isFavorable ? 20 : -10;
      if (shiShenName in result) {
        (result as any)[shiShenName] = this.clamp(50 + boost, 30, 80);
      }

      return result;
    } catch {
      // fallback：全部中性分
      return { biJian: 50, jieCai: 50, shiShen: 50, shangGuan: 50,
               pianCai: 50, zhengCai: 50, qiSha: 50, zhengGuan: 50 };
    }
  }

  // U-P1-2: 推导十神名称（基于日干与流年干的关系）
  private deriveShiShen(dayGan: string, targetGan: string): string {
    const dayWuxing = this.getGanWuxing(dayGan);
    const targetWuxing = this.getGanWuxing(targetGan);
    const dayIndex = this.GAN.indexOf(dayGan);
    const targetIndex = this.GAN.indexOf(targetGan);
    const sameYinYang = (dayIndex % 2) === (targetIndex % 2);

    if (dayWuxing === targetWuxing) {
      return sameYinYang ? 'biJian' : 'jieCai';
    }
    // 我生
    if (this.isGenerating(dayWuxing, targetWuxing)) {
      return sameYinYang ? 'shiShen' : 'shangGuan';
    }
    // 我克
    if (this.isOvercoming(dayWuxing, targetWuxing)) {
      return sameYinYang ? 'pianCai' : 'zhengCai';
    }
    // 克我
    if (this.isOvercoming(targetWuxing, dayWuxing)) {
      return sameYinYang ? 'qiSha' : 'zhengGuan';
    }
    // 生我（偏印/正印，不在 8 因子内，归到 yongShen）
    return 'biJian'; // fallback
  }

  // U-P1-2: 五行相生判断
  private isGenerating(from: string, to: string): boolean {
    const genPairs: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    return genPairs[from] === to;
  }

  // U-P1-2: 五行相克判断
  private isOvercoming(from: string, to: string): boolean {
    const overcomePairs: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
    return overcomePairs[from] === to;
  }

  // U-P1-2: 刑冲合害结构化评分（基于流年地支与四柱/大运的关系）
  private computeXingChongHeHai(baziResult: BaziFullResult, liuNian: string): number {
    try {
      const liuNianZhi = liuNian[1];
      const pillars = [baziResult.yearPillar, baziResult.monthPillar, baziResult.dayPillar, baziResult.hourPillar];
      let score = 50; // 中性分

      for (const pillar of pillars) {
        const pillarZhi = pillar[1];
        // 六合 +8
        if (this.checkDiZhiHe(liuNianZhi, pillarZhi)) score += 8;
        // 六冲 -12
        if (this.checkDiZhiChong(liuNianZhi, pillarZhi)) score -= 12;
        // 三合（半合）+5
        if (this.checkSanHe(liuNianZhi, pillarZhi)) score += 5;
        // 相刑 -8
        if (this.checkXing(liuNianZhi, pillarZhi)) score -= 8;
        // 相害 -6
        if (this.checkHai(liuNianZhi, pillarZhi)) score -= 6;
      }

      return this.clamp(score, 20, 90);
    } catch {
      return 50; // fallback
    }
  }

  // U-P1-2: 三合局判断（半合：申子/子辰/寅午/午戌/巳酉/酉丑/亥卯/卯未）
  private checkSanHe(a: string, b: string): boolean {
    const sanHeGroups = [
      ['申', '子', '辰'], ['寅', '午', '戌'],
      ['巳', '酉', '丑'], ['亥', '卯', '未'],
    ];
    return sanHeGroups.some(group => group.includes(a) && group.includes(b) && a !== b);
  }

  // U-P1-2: 相刑判断
  private checkXing(a: string, b: string): boolean {
    const xingPairs = [
      ['寅', '巳'], ['巳', '申'], ['申', '寅'], // 寅巳申三刑
      ['丑', '戌'], ['戌', '未'], ['未', '丑'], // 丑戌未三刑
      ['子', '卯'], // 子卯相刑
    ];
    return xingPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  }

  // U-P1-2: 相害判断
  private checkHai(a: string, b: string): boolean {
    const haiPairs = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
    return haiPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  }

  // U-P1-2: 风险扣分（基于刑冲克害数量，每处 -2，上限 -10）
  private computeRiskPenalty(baziResult: BaziFullResult, liuNian: string): number {
    try {
      const liuNianZhi = liuNian[1];
      const pillars = [baziResult.yearPillar, baziResult.monthPillar, baziResult.dayPillar, baziResult.hourPillar];
      let penaltyCount = 0;

      for (const pillar of pillars) {
        const pillarZhi = pillar[1];
        if (this.checkDiZhiChong(liuNianZhi, pillarZhi)) penaltyCount++;
        if (this.checkXing(liuNianZhi, pillarZhi)) penaltyCount++;
        if (this.checkHai(liuNianZhi, pillarZhi)) penaltyCount++;
      }

      // 每处 -2，上限 -10
      return Math.min(penaltyCount * 2, 10);
    } catch {
      return 0; // fallback
    }
  }

  private scoreDaYun(yun: BaziFullResult['daYun'][number], baziResult: BaziFullResult): number {
    return this.clamp((this.scoreElement(this.getGanWuxing(yun.gan), baziResult) + this.scoreElement(this.getZhiWuxing(yun.zhi), baziResult)) / 2 + 6, 25, 95);
  }

  private scoreGanZhi(ganZhi: string, baziResult: BaziFullResult): number {
    return this.clamp((this.scoreElement(this.getGanWuxing(ganZhi[0]), baziResult) + this.scoreElement(this.getZhiWuxing(ganZhi[1]), baziResult)) / 2, 20, 95);
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
    const ganScore = this.checkTianGanHe(daYun[0], liuNian[0]) ? 68 : this.checkTianGanChong(daYun[0], liuNian[0]) ? 38 : 52;
    const zhiScore = this.checkDiZhiHe(daYun[1], liuNian[1]) ? 70 : this.checkDiZhiChong(daYun[1], liuNian[1]) ? 35 : 52;
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

  private buildReason(parts: any, daYun: string, liuNian: string): string {
    const primary = this.highestPart(parts);
    const trend = parts.relation >= 62 ? '有合助' : parts.relation <= 42 ? '有冲动' : '平稳承接';
    return `${daYun || '大运'}承接${liuNian}流年，${primary}较突出，${trend}。`;
  }

  private buildEvidenceTags(parts: any, daYun: string, liuNian: string): string[] {
    const tags = [daYun && `大运${daYun}`, liuNian && `流年${liuNian}`].filter(Boolean) as string[];
    tags.push(parts.yongShen >= 70 ? '喜用到位' : parts.yongShen <= 45 ? '忌神偏重' : '喜忌平衡');
    tags.push(parts.relation >= 62 ? '冲合得助' : parts.relation <= 42 ? '冲刑扰动' : '关系平稳');
    if (parts.shenSha >= 60) tags.push('贵人/文昌加分');
    return tags.slice(0, 5);
  }

  private highestPart(parts: any): string {
    const labels: Record<string, string> = {
      daYun: '大运底盘',
      liuNian: '流年气势',
      yongShen: '喜用匹配',
      relation: '冲合关系',
      shenSha: '辅助星曜',
      // U-P1-2: 新增因子标签
      baseChart: '原局基底',
      xingChongHeHai: '刑冲合害',
      riskPenalty: '风险扣分',
    };
    // U-P1-2: 只考虑数值字段（排除 shiShen 对象和 riskPenalty 减项）
    const numericKeys = ['daYun', 'liuNian', 'yongShen', 'relation', 'shenSha', 'baseChart', 'xingChongHeHai'];
    const key = numericKeys.sort((a, b) => (parts[b] || 0) - (parts[a] || 0))[0];
    return labels[key] || '整体结构';
  }

  private trendFromScore(score: number, open: number, close: number): KlinePoint['trend'] {
    if (score >= 74 && close >= open) return '上升';
    if (score <= 48) return '调整';
    if (Math.abs(close - open) >= 10) return '转折';
    return '蓄势';
  }

  private adviceFromScore(score: number): string {
    if (score >= 74) return '适合主动推进，优先处理高价值机会。';
    if (score <= 48) return '适合收缩风险，避免重仓承诺。';
    return '适合蓄力观察，把关键资源握在手里。';
  }

  private calculateConfidence(birthTime?: string): number {
    if (!birthTime || /^未知|unknown$/i.test(birthTime)) return 68;
    if (/^0?0:00$/.test(birthTime)) return 72;
    return 86;
  }

  private findDaYun(baziResult: BaziFullResult, age: number) {
    return baziResult.daYun.find((yun) => age >= yun.startAge && age <= yun.endAge) || baziResult.daYun[0];
  }

  private findLiuNian(baziResult: BaziFullResult, year: number): string {
    return baziResult.liuNian.find((item) => item.year === year)?.ganZhi || this.getGanZhiYear(year);
  }

  private getGanZhiYear(year: number): string {
    const offset = year - 1984;
    return `${this.GAN[((offset % 10) + 10) % 10]}${this.ZHI[((offset % 12) + 12) % 12]}`;
  }

  private getApproxFlowMonthGanZhi(year: number, month: number): string {
    const yearGan = this.getGanZhiYear(year)[0];
    const startByYearGan: Record<string, number> = {
      甲: 2, 己: 2,
      乙: 4, 庚: 4,
      丙: 6, 辛: 6,
      丁: 8, 壬: 8,
      戊: 0, 癸: 0,
    };
    const zhiIndex = (month + 1) % 12; // 寅月从公历2月附近开始，作为趋势细分近似
    const monthOrderFromYin = (zhiIndex - 2 + 12) % 12;
    const ganIndex = ((startByYearGan[yearGan] || 0) + monthOrderFromYin) % 10;
    return `${this.GAN[ganIndex]}${this.ZHI[zhiIndex]}`;
  }

  private getWeakestElement(baziResult: BaziFullResult): string {
    return this.elementEntries(baziResult).sort((a, b) => a.count - b.count)[0].cn;
  }

  private getStrongestElement(baziResult: BaziFullResult): string {
    return this.elementEntries(baziResult).sort((a, b) => b.count - a.count)[0].cn;
  }

  private getElementCount(element: string, baziResult: BaziFullResult): number {
    const map: Record<string, keyof BaziFullResult['wuxing']> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
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

  private getDaYunTheme(yun: BaziFullResult['daYun'][number], baziResult: BaziFullResult): string {
    const score = this.scoreDaYun(yun, baziResult);
    if (score >= 74) return '适合借势推进';
    if (score <= 50) return '适合守中求稳';
    return '适合蓄势调整';
  }

  private getGanWuxing(gan: string): string {
    // P1-5 修复: 引用统一源 WUXING_TIANGAN（原本地内联 map 重复定义）
    return WUXING_TIANGAN[gan] || '土';
  }

  private getZhiWuxing(zhi: string): string {
    // P1-5 修复: 引用统一源 WUXING_DIZHI（原本地内联 map 重复定义）
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

  private readonly GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  private readonly ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  private readonly MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
}
