import { Injectable } from '@nestjs/common';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';

export interface ShortCyclePoint {
  date: string;
  dayOffset: number;
  score: number;
  signalLabel: string;
  evidenceTags: string[];
}

export interface ShortCycleResult {
  period: 'day3' | 'xun' | 'month' | 'quarter';
  days: number;
  label: string;
  points: ShortCyclePoint[];
  summary: {
    todaySignal: string;
    overallTrend: string;
    suitable: string[];
    caution: string[];
  };
}

@Injectable()
export class ShortCycleGenerator {
  private readonly GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  private readonly ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  private readonly PERIOD_CONFIG: Record<string, { days: number; label: string }> = {
    day3: { days: 3, label: '三日运' },
    xun: { days: 11, label: '旬运(11日)' },
    month: { days: 30, label: '月运(30日)' },
    quarter: { days: 100, label: '季运(100日)' },
  };

  private readonly GAN_SHISHEN_SCORE: Record<string, number> = {
    比肩: 5,
    劫财: -3,
    食神: 3,
    伤官: 2,
    偏财: 4,
    正财: 3,
    七杀: -2,
    正官: 1,
    偏印: 1,
    正印: 2,
  };

  private readonly GAN_WUXING: Record<string, string> = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
    己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  };

  private readonly ZHI_WUXING: Record<string, string> = {
    子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土',
    巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金',
    戌: '土', 亥: '水',
  };

  generateShortCycleData(
    baziResult: BaziFullResult,
    birthYear: number,
    period: 'day3' | 'xun' | 'month' | 'quarter',
  ): ShortCycleResult {
    const config = this.PERIOD_CONFIG[period];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - Math.floor(config.days / 2));

    const dayMaster = baziResult.dayPillar[0];
    const dayMasterZhi = baziResult.dayPillar[1];
    const currentAge = Math.max(0, today.getFullYear() - birthYear);
    const currentDaYun = baziResult.daYun.find(
      (yun) => currentAge >= yun.startAge && currentAge <= yun.endAge,
    );

    const points: ShortCyclePoint[] = [];
    for (let i = 0; i < config.days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dayOffset = Math.round((currentDate.getTime() - today.getTime()) / 86400000);
      const dateStr = this.formatDate(currentDate);
      const liuRiGanZhi = this.getDayGanZhi(currentDate);

      const score = this.calculateDayScore(
        dayMaster,
        dayMasterZhi,
        liuRiGanZhi,
        currentDaYun,
        baziResult,
        dayOffset,
      );

      const evidenceTags = this.buildEvidenceTags(
        dayMaster,
        liuRiGanZhi,
        currentDaYun,
        baziResult,
        score,
      );

      const signalLabel = this.getSignalLabel(score, dayOffset);

      points.push({
        date: dateStr,
        dayOffset,
        score,
        signalLabel,
        evidenceTags,
      });
    }

    return {
      period,
      days: config.days,
      label: config.label,
      points,
      summary: this.buildSummary(points, dayMaster),
    };
  }

  private calculateDayScore(
    dayMaster: string,
    dayMasterZhi: string,
    liuRiGanZhi: string,
    currentDaYun: BaziFullResult['daYun'][number] | undefined,
    baziResult: BaziFullResult,
    dayOffset: number,
  ): number {
    let score = 50;

    const liuRiGan = liuRiGanZhi[0];
    const liuRiZhi = liuRiGanZhi[1];
    const shishen = this.getShishen(dayMaster, liuRiGan);
    score += this.GAN_SHISHEN_SCORE[shishen] || 0;

    score += this.calculateZhiRelationScore(dayMasterZhi, liuRiZhi, baziResult);

    if (currentDaYun && liuRiGan === currentDaYun.gan) {
      score += 3;
    }

    if (currentDaYun) {
      const daYunZhiRelation = this.calculateZhiRelationScore(dayMasterZhi, currentDaYun.zhi, baziResult);
      score += Math.round(daYunZhiRelation * 0.3);
    }

    score += this.deterministicNoise(dayOffset, liuRiGanZhi);

    return this.clamp(Math.round(score), 0, 100);
  }

  private calculateZhiRelationScore(
    natalZhi: string,
    flowZhi: string,
    baziResult: BaziFullResult,
  ): number {
    let score = 0;

    if (this.isLiuHe(natalZhi, flowZhi)) score += 5;
    if (this.isSanHe(natalZhi, flowZhi, baziResult)) score += 4;
    if (this.isChong(natalZhi, flowZhi)) score -= 5;
    if (this.isXing(natalZhi, flowZhi)) score -= 3;
    if (this.isHai(natalZhi, flowZhi)) score -= 2;

    return score;
  }

  private getShishen(dayMaster: string, targetGan: string): string {
    if (dayMaster === targetGan) return '比肩';

    const dayWu = this.GAN_WUXING[dayMaster];
    const targetWu = this.GAN_WUXING[targetGan];
    if (!dayWu || !targetWu) return '比肩';

    const dayIdx = this.GAN.indexOf(dayMaster);
    const targetIdx = this.GAN.indexOf(targetGan);
    const isSameElement = dayWu === targetWu;
    const isYangDay = dayIdx % 2 === 0;
    const isYangTarget = targetIdx % 2 === 0;
    const samePolarity = isYangDay === isYangTarget;

    const SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    const KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
    const SHENG_BY: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
    const KE_BY: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };

    if (isSameElement) return samePolarity ? '比肩' : '劫财';
    if (SHENG[dayWu] === targetWu) return samePolarity ? '食神' : '伤官';
    if (KE[dayWu] === targetWu) return samePolarity ? '偏财' : '正财';
    if (KE_BY[dayWu] === targetWu) return samePolarity ? '七杀' : '正官';
    if (SHENG_BY[dayWu] === targetWu) return samePolarity ? '偏印' : '正印';

    return '比肩';
  }

  private isLiuHe(a: string, b: string): boolean {
    return ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'].some(
      (pair) => pair.includes(a) && pair.includes(b),
    );
  }

  private isSanHe(natalZhi: string, flowZhi: string, baziResult: BaziFullResult): boolean {
    const allZhi = [
      baziResult.yearPillar[1],
      baziResult.monthPillar[1],
      baziResult.dayPillar[1],
      baziResult.hourPillar[1],
      flowZhi,
    ];
    const SAN_HE_GROUPS = [
      ['申', '子', '辰'],
      ['巳', '酉', '丑'],
      ['寅', '午', '戌'],
      ['亥', '卯', '未'],
    ];
    return SAN_HE_GROUPS.some((group) => {
      const withNatal = group.includes(natalZhi);
      const withFlow = group.includes(flowZhi);
      const allPresent = group.every((z) => allZhi.includes(z));
      return withNatal && withFlow && allPresent;
    });
  }

  private isChong(a: string, b: string): boolean {
    return ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].some(
      (pair) => pair.includes(a) && pair.includes(b),
    );
  }

  private isXing(a: string, b: string): boolean {
    if (a === b && ['辰', '午', '酉', '亥'].includes(a)) return true;
    const XING_PAIRS: Record<string, string> = { 寅: '巳', 巳: '申', 申: '寅', 丑: '戌', 戌: '未', 未: '丑', 子: '卯', 卯: '子' };
    return XING_PAIRS[a] === b;
  }

  private isHai(a: string, b: string): boolean {
    return ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'].some(
      (pair) => pair.includes(a) && pair.includes(b),
    );
  }

  private deterministicNoise(dayOffset: number, ganZhi: string): number {
    const ganIdx = this.GAN.indexOf(ganZhi[0]);
    const zhiIdx = this.ZHI.indexOf(ganZhi[1]);
    const seed = ((dayOffset * 7 + ganIdx * 3 + zhiIdx * 11 + 97) % 7) - 3;
    return seed;
  }

  private getDayGanZhi(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    const dayIdx = ((jdn + 49) % 60 + 60) % 60;
    const ganIdx = dayIdx % 10;
    const zhiIdx = dayIdx % 12;
    return this.GAN[ganIdx] + this.ZHI[zhiIdx];
  }

  private buildEvidenceTags(
    dayMaster: string,
    liuRiGanZhi: string,
    currentDaYun: BaziFullResult['daYun'][number] | undefined,
    baziResult: BaziFullResult,
    score: number,
  ): string[] {
    const tags: string[] = [];
    const liuRiGan = liuRiGanZhi[0];
    const liuRiZhi = liuRiGanZhi[1];
    const dayMasterZhi = baziResult.dayPillar[1];

    const shishen = this.getShishen(dayMaster, liuRiGan);
    tags.push(`流日${shishen}`);

    if (this.isLiuHe(dayMasterZhi, liuRiZhi)) tags.push('日支六合');
    if (this.isChong(dayMasterZhi, liuRiZhi)) tags.push('日支逢冲');
    if (this.isXing(dayMasterZhi, liuRiZhi)) tags.push('日支逢刑');
    if (this.isHai(dayMasterZhi, liuRiZhi)) tags.push('日支逢害');

    if (currentDaYun) {
      if (liuRiGan === currentDaYun.gan) tags.push('大运天干同气');
      if (this.isLiuHe(currentDaYun.zhi, liuRiZhi)) tags.push('大运地支合');
      if (this.isChong(currentDaYun.zhi, liuRiZhi)) tags.push('大运地支冲');
    }

    if (baziResult.shenSha?.tianYi?.includes(liuRiZhi)) tags.push('天乙贵人日');
    if (baziResult.shenSha?.wenChang?.includes(liuRiZhi)) tags.push('文昌日');

    if (score >= 65) tags.push('运势偏强');
    else if (score <= 35) tags.push('运势偏弱');

    return tags.slice(0, 6);
  }

  private getSignalLabel(score: number, dayOffset: number): string {
    if (dayOffset === 0) {
      if (score >= 70) return '今日大吉';
      if (score >= 55) return '今日平稳';
      if (score >= 40) return '今日小耗';
      return '今日宜守';
    }
    if (score >= 70) return '强势';
    if (score >= 55) return '平稳';
    if (score >= 40) return '偏弱';
    return '低迷';
  }

  private buildSummary(
    points: ShortCyclePoint[],
    dayMaster: string,
  ): ShortCycleResult['summary'] {
    const todayPoint = points.find((p) => p.dayOffset === 0);
    const avgScore = points.reduce((sum, p) => sum + p.score, 0) / points.length;
    const todayScore = todayPoint?.score ?? Math.round(avgScore);

    let todaySignal: string;
    if (todayScore >= avgScore + 10) todaySignal = '今日运势高于周期均值，可主动出击';
    else if (todayScore >= avgScore) todaySignal = '今日运势与周期持平，稳中求进';
    else if (todayScore >= avgScore - 10) todaySignal = '今日运势略低于周期均值，宜守不宜攻';
    else todaySignal = '今日运势明显低于周期均值，建议收缩风险';

    const recentPoints = points.slice(-3);
    const recentTrend = recentPoints[recentPoints.length - 1].score - recentPoints[0].score;
    let overallTrend: string;
    if (recentTrend > 5) overallTrend = '上升';
    else if (recentTrend < -5) overallTrend = '下行';
    else overallTrend = '平稳';

    const suitable: string[] = [];
    const caution: string[] = [];

    const allTags = points.flatMap((p) => p.evidenceTags);
    const tagCounts: Record<string, number> = {};
    for (const tag of allTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }

    if (tagCounts['日支六合'] || 0 > 0) suitable.push('合作洽谈');
    if (tagCounts['天乙贵人日'] || 0 > 0) suitable.push('求人办事');
    if (tagCounts['文昌日'] || 0 > 0) suitable.push('学习考试');
    if (tagCounts['运势偏强'] || 0 > tagCounts['运势偏弱'] || 0) suitable.push('主动推进');
    if (tagCounts['大运天干同气'] || 0 > 0) suitable.push('借势发力');
    if (todayScore >= 60) suitable.push('社交拓展');

    if (tagCounts['日支逢冲'] || 0 > 0) caution.push('避免冲突');
    if (tagCounts['日支逢刑'] || 0 > 0) caution.push('谨防口舌');
    if (tagCounts['日支逢害'] || 0 > 0) caution.push('留意小人');
    if (tagCounts['大运地支冲'] || 0 > 0) caution.push('大运冲日，重大决策需谨慎');
    if (tagCounts['运势偏弱'] || 0 > tagCounts['运势偏强'] || 0) caution.push('避免重仓承诺');
    if (todayScore <= 40) caution.push('减少外出应酬');

    if (suitable.length === 0) suitable.push('日常事务');
    if (caution.length === 0) caution.push('保持节奏');

    return {
      todaySignal,
      overallTrend,
      suitable: suitable.slice(0, 4),
      caution: caution.slice(0, 4),
    };
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
