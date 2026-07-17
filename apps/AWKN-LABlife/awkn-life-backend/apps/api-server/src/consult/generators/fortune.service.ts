import { Injectable } from '@nestjs/common';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';
import { GAN, ZHI, WUXING_TIANGAN, WUXING_DIZHI } from '../../calc-engine/bazi-engine/core/bazi-data.service';
import {
  DailyFortune,
  MonthlyFortune,
  YearlyFortune,
  FortuneAspect,
} from './fortune.types';

@Injectable()
export class FortuneService {
  // GAN, ZHI, WUXING_TIANGAN, WUXING_DIZHI — 已从 bazi-data.service.ts 统一导入
  private readonly MONTHS_CN = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

  private readonly GAN_RELATIONS: Record<string, { score: number; label: string }> = {
    'identical': { score: 5, label: '比肩' },
    'combination': { score: 10, label: '天干合' },
    'same_yin_yang': { score: 3, label: '同阴阳' },
    'opposite': { score: -10, label: '对冲' },
    'clash': { score: -15, label: '天干冲' },
  };

  private readonly TIAN_GAN_HE: string[] = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
  private readonly TIAN_GAN_CHONG: string[] = ['甲庚', '乙辛', '丙壬', '丁癸'];
  private readonly DI_ZHI_HE: string[] = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
  private readonly DI_ZHI_CHONG: string[] = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  private readonly DI_ZHI_SAN_HE: string[][] = [
    ['申', '子', '辰'], ['亥', '卯', '未'],
    ['寅', '午', '戌'], ['巳', '酉', '丑'],
  ];

  private readonly LUCKY_COLORS: Record<string, string[]> = {
    '木': ['青色', '绿色', '翠色'],
    '火': ['红色', '紫色', '橙色'],
    '土': ['黄色', '棕色', '咖色'],
    '金': ['白色', '金色', '银色'],
    '水': ['黑色', '蓝色', '灰色'],
  };

  private readonly ZHI_HOURS: Record<string, string> = {
    '子': '23:00-01:00', '丑': '01:00-03:00', '寅': '03:00-05:00',
    '卯': '05:00-07:00', '辰': '07:00-09:00', '巳': '09:00-11:00',
    '午': '11:00-13:00', '未': '13:00-15:00', '申': '15:00-17:00',
    '酉': '17:00-19:00', '戌': '19:00-21:00', '亥': '21:00-23:00',
  };

  calculateDaily(baziResult: BaziFullResult, date: Date): DailyFortune {
    const dayGanIndex = this.getDayGanIndex(date);
    const monthZhiIndex = this.getMonthZhiIndex(date);
    const yearGanIndex = this.getYearGanIndex(date);
    const dayGan = GAN[dayGanIndex];
    const dayZhi = ZHI[this.getDayZhiIndex(date)];
    const monthGan = GAN[(yearGanIndex * 2 + monthZhiIndex) % 10];
    const monthZhi = ZHI[monthZhiIndex];
    const yearGan = GAN[yearGanIndex];
    const yearZhi = ZHI[(date.getFullYear() - 4) % 12];

    const dayGanZhi = `${dayGan}${dayZhi}`;
    const monthGanZhi = `${monthGan}${monthZhi}`;
    const yearGanZhi = `${yearGan}${yearZhi}`;

    const dayElement = WUXING_TIANGAN[dayGan];
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];

    const baseScore = this.calculateBaseScore(baziResult, dayGanZhi, monthGanZhi, yearGanZhi);
    const modifiers = this.calculateDailyModifiers(baziResult, dayGanZhi, monthGanZhi, yearGanZhi, date);

    const overallScore = this.clamp(baseScore + modifiers.overall, 10, 95);

    return {
      date: this.formatDate(date),
      overall_score: overallScore,
      career: this.calculateAspectScore(baseScore + modifiers.career, 'career', baziResult, dayGanZhi),
      wealth: this.calculateAspectScore(baseScore + modifiers.wealth, 'wealth', baziResult, dayGanZhi),
      relationship: this.calculateAspectScore(baseScore + modifiers.relationship, 'relationship', baziResult, dayGanZhi),
      health: this.calculateAspectScore(baseScore + modifiers.health, 'health', baziResult, dayGanZhi),
      lucky_numbers: this.getLuckyNumbers(baziResult, date),
      lucky_colors: this.getLuckyColors(dayElement),
      advice: this.generateDailyAdvice(baziResult, dayGanZhi, overallScore),
      auspicious_hours: this.getAuspiciousHours(baziResult, dayGan),
      warnings: this.generateDailyWarnings(baziResult, dayGanZhi, overallScore),
    };
  }

  calculateMonthly(baziResult: BaziFullResult, year: number, month: number): MonthlyFortune {
    const monthZhiIndex = (month + 1) % 12;
    const yearGanIndex = (year - 4) % 10;
    const monthGan = GAN[(yearGanIndex * 2 + monthZhiIndex) % 10];
    const monthZhi = ZHI[monthZhiIndex];
    const monthGanZhi = `${monthGan}${monthZhi}`;

    const baseScore = this.calculateBaseScore(baziResult, monthGanZhi, monthGanZhi, `${GAN[yearGanIndex]}${ZHI[(year - 4) % 12]}`);
    const modifiers = this.calculateMonthlyModifiers(baziResult, monthGanZhi, month);

    const overallScore = this.clamp(baseScore + modifiers.overall, 15, 95);

    return {
      year,
      month,
      month_name: this.MONTHS_CN[month - 1] || `${month}月`,
      overall_score: overallScore,
      career: this.calculateAspectScore(baseScore + modifiers.career, 'career', baziResult, monthGanZhi),
      wealth: this.calculateAspectScore(baseScore + modifiers.wealth, 'wealth', baziResult, monthGanZhi),
      relationship: this.calculateAspectScore(baseScore + modifiers.relationship, 'relationship', baziResult, monthGanZhi),
      health: this.calculateAspectScore(baseScore + modifiers.health, 'health', baziResult, monthGanZhi),
      lucky_days: this.getLuckyDays(baziResult, year, month),
      advice: this.generateMonthlyAdvice(baziResult, monthGanZhi, overallScore),
      warnings: this.generateMonthlyWarnings(baziResult, monthGanZhi, overallScore),
    };
  }

  calculateYearly(baziResult: BaziFullResult, year: number): YearlyFortune {
    const yearGanIndex = (year - 4) % 10;
    const yearZhiIndex = (year - 4) % 12;
    const yearGan = GAN[yearGanIndex];
    const yearZhi = ZHI[yearZhiIndex];
    const yearGanZhi = `${yearGan}${yearZhi}`;

    const baseScore = this.calculateBaseScore(baziResult, yearGanZhi, yearGanZhi, yearGanZhi);
    const modifiers = this.calculateYearlyModifiers(baziResult, yearGanZhi);

    const overallScore = this.clamp(baseScore + modifiers.overall, 15, 95);

    const monthlyScores: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const mf = this.calculateMonthly(baziResult, year, m);
      monthlyScores.push(mf.overall_score);
    }

    const sortedMonths = monthlyScores
      .map((score, idx) => ({ month: idx + 1, score }))
      .sort((a, b) => b.score - a.score);

    const bestMonths = sortedMonths.slice(0, 3).map(m => m.month);
    const worstMonths = sortedMonths.slice(-3).map(m => m.month);

    return {
      year,
      gan_zhi: yearGanZhi,
      overall_score: overallScore,
      career: this.calculateAspectScore(baseScore + modifiers.career, 'career', baziResult, yearGanZhi),
      wealth: this.calculateAspectScore(baseScore + modifiers.wealth, 'wealth', baziResult, yearGanZhi),
      relationship: this.calculateAspectScore(baseScore + modifiers.relationship, 'relationship', baziResult, yearGanZhi),
      health: this.calculateAspectScore(baseScore + modifiers.health, 'health', baziResult, yearGanZhi),
      key_moments: this.generateKeyMoments(baziResult, year, monthlyScores),
      crisis_periods: this.identifyCrisisPeriods(monthlyScores),
      opportunities: this.identifyOpportunities(baziResult, year, monthlyScores),
      best_months: bestMonths,
      worst_months: worstMonths,
      zodiac_compatibility: this.calculateZodiacCompatibility(baziResult, yearZhi),
      advice: this.generateYearlyAdvice(baziResult, yearGanZhi, overallScore),
    };
  }

  private calculateBaseScore(baziResult: BaziFullResult, dayGanZhi: string, monthGanZhi: string, yearGanZhi: string): number {
    let score = 50;
    const baziDayGan = baziResult.dayPillar[0];

    const dayGan = dayGanZhi[0];
    const dayZhi = dayGanZhi[1];

    if (dayGan === baziDayGan) score += 5;
    if (this.isTianGanHe(baziDayGan, dayGan)) score += 10;
    if (this.isTianGanChong(baziDayGan, dayGan)) score -= 15;
    if (this.isDiZhiHe(baziResult.dayPillar[1], dayZhi)) score += 8;
    if (this.isDiZhiChong(baziResult.dayPillar[1], dayZhi)) score -= 10;

    const dayWuxing = WUXING_TIANGAN[dayGan];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    if (this.isOutputElement(baziDayWuxing, dayWuxing)) score += 5;
    if (this.isWealthElement(baziDayWuxing, dayWuxing)) score += 5;

    return score;
  }

  private calculateDailyModifiers(baziResult: BaziFullResult, dayGanZhi: string, monthGanZhi: string, yearGanZhi: string, date: Date) {
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    const dayGan = dayGanZhi[0];
    const dayWuxing = WUXING_TIANGAN[dayGan];

    let career = 0, wealth = 0, relationship = 0, health = 0;

    if (this.isOutputElement(baziDayWuxing, dayWuxing)) career += 15;
    if (this.isWealthElement(baziDayWuxing, dayWuxing)) wealth += 20;
    if (this.isPowerElement(baziDayWuxing, dayWuxing)) relationship += 10;
    if (this.isResourceElement(baziDayWuxing, dayWuxing)) health += 10;

    const month = date.getMonth() + 1;
    const seasonModifier = this.getSeasonModifier(baziDayWuxing, month);
    career += seasonModifier.career;
    wealth += seasonModifier.wealth;
    relationship += seasonModifier.relationship;
    health += seasonModifier.health;

    if (this.isTianGanHe(baziDayGan, dayGan)) {
      relationship += 8;
    }
    if (this.isDiZhiHe(baziResult.dayPillar[1], dayGanZhi[1])) {
      relationship += 5;
    }

    const hash = this.deterministicHash(`${dayGanZhi}-${date.toISOString().slice(0, 10)}`);
    career += (hash % 7) - 3;
    wealth += ((hash >> 3) % 7) - 3;
    relationship += ((hash >> 6) % 5) - 2;
    health += ((hash >> 9) % 5) - 2;

    return {
      overall: Math.round((career + wealth + relationship + health) / 4),
      career, wealth, relationship, health,
    };
  }

  private calculateMonthlyModifiers(baziResult: BaziFullResult, monthGanZhi: string, month: number) {
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    const monthGan = monthGanZhi[0];
    const monthWuxing = WUXING_TIANGAN[monthGan];

    let career = 0, wealth = 0, relationship = 0, health = 0;

    if (this.isOutputElement(baziDayWuxing, monthWuxing)) career += 12;
    if (this.isWealthElement(baziDayWuxing, monthWuxing)) wealth += 15;
    if (this.isPowerElement(baziDayWuxing, monthWuxing)) relationship += 8;
    if (this.isResourceElement(baziDayWuxing, monthWuxing)) health += 8;

    const seasonModifier = this.getSeasonModifier(baziDayWuxing, month);
    career += seasonModifier.career;
    wealth += seasonModifier.wealth;

    return {
      overall: Math.round((career + wealth + relationship + health) / 4),
      career, wealth, relationship, health,
    };
  }

  private calculateYearlyModifiers(baziResult: BaziFullResult, yearGanZhi: string) {
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    const yearGan = yearGanZhi[0];
    const yearWuxing = WUXING_TIANGAN[yearGan];

    let career = 0, wealth = 0, relationship = 0, health = 0;

    if (this.isOutputElement(baziDayWuxing, yearWuxing)) career += 10;
    if (this.isWealthElement(baziDayWuxing, yearWuxing)) wealth += 12;
    if (this.isPowerElement(baziDayWuxing, yearWuxing)) relationship += 8;
    if (this.isResourceElement(baziDayWuxing, yearWuxing)) health += 8;

    if (this.isTianGanHe(baziDayGan, yearGan)) {
      relationship += 10;
      career += 5;
    }
    if (this.isTianGanChong(baziDayGan, yearGan)) {
      career -= 8;
      health -= 5;
    }

    return {
      overall: Math.round((career + wealth + relationship + health) / 4),
      career, wealth, relationship, health,
    };
  }

  private calculateAspectScore(rawScore: number, aspect: string, baziResult: BaziFullResult, ganZhi: string): FortuneAspect {
    const score = this.clamp(Math.round(rawScore), 10, 95);
    const trend: 'up' | 'down' | 'stable' = score >= 70 ? 'up' : score <= 40 ? 'down' : 'stable';

    const descriptions: Record<string, Record<string, string>> = {
      career: {
        up: '事业运势上扬，适合推进重要项目',
        down: '事业运势低迷，宜守不宜攻',
        stable: '事业运势平稳，适合积累蓄力',
      },
      wealth: {
        up: '财运亨通，可适度投资理财',
        down: '财运欠佳，谨慎理财避免破财',
        stable: '财运平稳，适合稳健理财',
      },
      relationship: {
        up: '人际感情运势良好，适合社交拓展',
        down: '人际感情需注意沟通，避免冲突',
        stable: '人际感情平稳，维持现状即可',
      },
      health: {
        up: '身体状态良好，精力充沛',
        down: '注意身体保养，避免过度劳累',
        stable: '健康状况平稳，保持规律作息',
      },
    };

    const advices: Record<string, Record<string, string>> = {
      career: {
        up: '把握时机推进核心项目，争取突破',
        down: '收敛锋芒，专注能力提升',
        stable: '巩固基础，为下一个机遇做准备',
      },
      wealth: {
        up: '适度增加投资比例，把握财运窗口',
        down: '减少不必要开支，保守理财',
        stable: '维持现有理财策略，不急不躁',
      },
      relationship: {
        up: '主动拓展人脉，加深重要关系',
        down: '减少无效社交，专注亲密关系维护',
        stable: '保持社交节奏，顺其自然',
      },
      health: {
        up: '适合增加运动量，挑战体能',
        down: '注意休息，定期体检',
        stable: '保持现有健康习惯，适度运动',
      },
    };

    return {
      score,
      trend,
      description: descriptions[aspect]?.[trend] || '运势平稳',
      advice: advices[aspect]?.[trend] || '保持现状',
    };
  }

  private getSeasonModifier(dayWuxing: string, month: number): { career: number; wealth: number; relationship: number; health: number } {
    const seasons: Record<string, { strong: number[]; weak: number[] }> = {
      '木': { strong: [1, 2, 3], weak: [7, 8, 9] },
      '火': { strong: [4, 5, 6], weak: [10, 11, 12] },
      '土': { strong: [1, 4, 7, 10], weak: [] },
      '金': { strong: [7, 8, 9], weak: [1, 2, 3] },
      '水': { strong: [10, 11, 12], weak: [4, 5, 6] },
    };

    const season = seasons[dayWuxing];
    if (!season) return { career: 0, wealth: 0, relationship: 0, health: 0 };

    if (season.strong.includes(month)) {
      return { career: 5, wealth: 3, relationship: 2, health: 5 };
    }
    if (season.weak.includes(month)) {
      return { career: -3, wealth: -2, relationship: -2, health: -3 };
    }
    return { career: 0, wealth: 0, relationship: 0, health: 0 };
  }

  private getLuckyNumbers(baziResult: BaziFullResult, date: Date): number[] {
    const dayGan = baziResult.dayPillar[0];
    const ganIndex = GAN.indexOf(dayGan);
    const base = (ganIndex + 1) * 3;
    const dateOffset = date.getDate() % 9;
    return [
      (base + dateOffset) % 49 + 1,
      (base * 2 + dateOffset) % 49 + 1,
      (base * 3 + dateOffset * 2) % 49 + 1,
    ].sort((a, b) => a - b);
  }

  private getLuckyColors(dayElement: string): string[] {
    const colors = this.LUCKY_COLORS[dayElement] || ['白色', '金色'];
    const shengElement = this.getShengElement(dayElement);
    return [...colors.slice(0, 2), ...(this.LUCKY_COLORS[shengElement] || []).slice(0, 1)];
  }

  private getShengElement(element: string): string {
    const map: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    return map[element] || '土';
  }

  private generateDailyAdvice(baziResult: BaziFullResult, dayGanZhi: string, overallScore: number): string[] {
    const advice: string[] = [];
    const dayGan = dayGanZhi[0];
    const baziDayGan = baziResult.dayPillar[0];

    if (this.isTianGanHe(baziDayGan, dayGan)) {
      advice.push('今日天干相合，适合合作洽谈');
    }
    if (this.isTianGanChong(baziDayGan, dayGan)) {
      advice.push('今日天干相冲，重要决策宜缓');
    }

    if (overallScore >= 75) {
      advice.push('整体运势较佳，可主动出击');
    } else if (overallScore <= 40) {
      advice.push('今日运势偏低，宜保守行事');
    } else {
      advice.push('运势平稳，按计划推进即可');
    }

    return advice;
  }

  private getAuspiciousHours(baziResult: BaziFullResult, dayGan: string): string[] {
    const auspiciousZhi: string[] = [];
    const baziDayZhi = baziResult.dayPillar[1];

    for (const zhi of ZHI) {
      if (this.isDiZhiHe(baziDayZhi, zhi)) {
        auspiciousZhi.push(zhi);
      }
    }

    if (baziResult.shenSha?.tianYi) {
      for (const zhi of baziResult.shenSha.tianYi) {
        if (!auspiciousZhi.includes(zhi)) {
          auspiciousZhi.push(zhi);
        }
      }
    }

    return auspiciousZhi.slice(0, 3).map(zhi => `${zhi}时(${this.ZHI_HOURS[zhi]})`);
  }

  private generateDailyWarnings(baziResult: BaziFullResult, dayGanZhi: string, overallScore: number): string[] {
    const warnings: string[] = [];
    const dayGan = dayGanZhi[0];
    const dayZhi = dayGanZhi[1];
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayZhi = baziResult.dayPillar[1];

    if (this.isTianGanChong(baziDayGan, dayGan)) {
      warnings.push(`今日${dayGan}与日主${baziDayGan}相冲，注意口舌是非`);
    }
    if (this.isDiZhiChong(baziDayZhi, dayZhi)) {
      warnings.push(`今日地支${dayZhi}与日支${baziDayZhi}相冲，注意情绪管理`);
    }
    if (overallScore <= 35) {
      warnings.push('今日运势偏低，避免重大决策和签约');
    }

    return warnings;
  }

  private getLuckyDays(baziResult: BaziFullResult, year: number, month: number): number[] {
    const baziDayGan = baziResult.dayPillar[0];
    const luckyDays: number[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dayGanIndex = this.getDayGanIndex(new Date(year, month - 1, d));
      const dayGan = GAN[dayGanIndex];
      if (this.isTianGanHe(baziDayGan, dayGan)) {
        luckyDays.push(d);
      }
    }

    return luckyDays.slice(0, 5);
  }

  private generateMonthlyAdvice(baziResult: BaziFullResult, monthGanZhi: string, overallScore: number): string[] {
    const advice: string[] = [];
    const monthGan = monthGanZhi[0];
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    const monthWuxing = WUXING_TIANGAN[monthGan];

    if (this.isWealthElement(baziDayWuxing, monthWuxing)) {
      advice.push('本月财星当令，适合理财投资');
    }
    if (this.isOutputElement(baziDayWuxing, monthWuxing)) {
      advice.push('本月食伤旺，适合创意输出和表达');
    }
    if (this.isPowerElement(baziDayWuxing, monthWuxing)) {
      advice.push('本月官杀旺，注意职场人际关系');
    }
    if (this.isResourceElement(baziDayWuxing, monthWuxing)) {
      advice.push('本月印星旺，适合学习充电');
    }

    if (overallScore >= 70) {
      advice.push('本月整体运势不错，可积极行动');
    } else if (overallScore <= 40) {
      advice.push('本月运势偏低，宜守不宜攻');
    }

    return advice.length > 0 ? advice : ['运势平稳，按部就班即可'];
  }

  private generateMonthlyWarnings(baziResult: BaziFullResult, monthGanZhi: string, overallScore: number): string[] {
    const warnings: string[] = [];
    const monthZhi = monthGanZhi[1];
    const baziDayZhi = baziResult.dayPillar[1];

    if (this.isDiZhiChong(baziDayZhi, monthZhi)) {
      warnings.push(`本月地支与日支相冲，注意健康和情绪`);
    }

    return warnings;
  }

  private generateKeyMoments(baziResult: BaziFullResult, year: number, monthlyScores: number[]): Array<{ month: number; description: string }> {
    const moments: Array<{ month: number; description: string }> = [];
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];

    for (let m = 0; m < 12; m++) {
      if (monthlyScores[m] >= 80) {
        moments.push({ month: m + 1, description: '运势高峰期，把握机遇主动出击' });
      } else if (monthlyScores[m] <= 30) {
        moments.push({ month: m + 1, description: '运势低谷期，宜守不宜攻' });
      }
    }

    return moments;
  }

  private identifyCrisisPeriods(monthlyScores: number[]): Array<{ start_month: number; end_month: number; description: string }> {
    const crises: Array<{ start_month: number; end_month: number; description: string }> = [];
    let start = -1;

    for (let m = 0; m < 12; m++) {
      if (monthlyScores[m] <= 40) {
        if (start === -1) start = m;
      } else {
        if (start !== -1) {
          crises.push({
            start_month: start + 1,
            end_month: m,
            description: `连续${m - start}个月运势偏低，需特别注意`,
          });
          start = -1;
        }
      }
    }
    if (start !== -1) {
      crises.push({
        start_month: start + 1,
        end_month: 12,
        description: `年末${12 - start}个月运势偏低，需特别注意`,
      });
    }

    return crises;
  }

  private identifyOpportunities(baziResult: BaziFullResult, year: number, monthlyScores: number[]): Array<{ month: number; type: string; description: string }> {
    const opportunities: Array<{ month: number; type: string; description: string }> = [];
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    const yearGanIndex = (year - 4) % 10;

    for (let m = 1; m <= 12; m++) {
      const monthZhiIndex = (m + 1) % 12;
      const monthGan = GAN[(yearGanIndex * 2 + monthZhiIndex) % 10];
      const monthWuxing = WUXING_TIANGAN[monthGan];

      if (this.isWealthElement(baziDayWuxing, monthWuxing) && monthlyScores[m - 1] >= 60) {
        opportunities.push({ month: m, type: 'investment', description: '财星当令，适合投资理财' });
      }
      if (this.isOutputElement(baziDayWuxing, monthWuxing) && monthlyScores[m - 1] >= 60) {
        opportunities.push({ month: m, type: 'career', description: '食伤旺月，适合创意输出和事业突破' });
      }
    }

    return opportunities;
  }

  private calculateZodiacCompatibility(baziResult: BaziFullResult, yearZhi: string): Array<{ zodiac: string; score: number }> {
    const baziDayZhi = baziResult.dayPillar[1];
    const result: Array<{ zodiac: string; score: number }> = [];

    for (const zhi of ZHI) {
      let score = 50;
      if (this.isDiZhiHe(baziDayZhi, zhi)) score += 30;
      if (this.isDiZhiChong(baziDayZhi, zhi)) score -= 25;
      if (this.isDiZhiSanHe(baziDayZhi, zhi)) score += 20;
      if (zhi === yearZhi) score += 10;
      result.push({ zodiac: zhi, score: this.clamp(score, 10, 95) });
    }

    return result.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  private generateYearlyAdvice(baziResult: BaziFullResult, yearGanZhi: string, overallScore: number): string[] {
    const advice: string[] = [];
    const yearGan = yearGanZhi[0];
    const baziDayGan = baziResult.dayPillar[0];
    const baziDayWuxing = WUXING_TIANGAN[baziDayGan];
    const yearWuxing = WUXING_TIANGAN[yearGan];

    if (this.isWealthElement(baziDayWuxing, yearWuxing)) {
      advice.push('流年财星当令，把握投资理财机遇');
    }
    if (this.isOutputElement(baziDayWuxing, yearWuxing)) {
      advice.push('流年食伤旺，适合创意输出和自我表达');
    }
    if (this.isPowerElement(baziDayWuxing, yearWuxing)) {
      advice.push('流年官杀旺，职场有变动，注意人际关系');
    }
    if (this.isResourceElement(baziDayWuxing, yearWuxing)) {
      advice.push('流年印星旺，适合学习深造和内在提升');
    }

    if (this.isTianGanHe(baziDayGan, yearGan)) {
      advice.push('流年天干与日主相合，贵人运旺');
    }
    if (this.isTianGanChong(baziDayGan, yearGan)) {
      advice.push('流年天干与日主相冲，注意健康和决策');
    }

    if (overallScore >= 70) {
      advice.push('年度运势较佳，可积极规划');
    } else if (overallScore <= 40) {
      advice.push('年度运势偏低，宜保守稳健');
    }

    return advice.length > 0 ? advice : ['运势平稳，按部就班前行'];
  }

  private isOutputElement(dayWuxing: string, targetWuxing: string): boolean {
    const map: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    return map[dayWuxing] === targetWuxing;
  }

  private isWealthElement(dayWuxing: string, targetWuxing: string): boolean {
    const map: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
    return map[dayWuxing] === targetWuxing;
  }

  private isPowerElement(dayWuxing: string, targetWuxing: string): boolean {
    const map: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
    return map[dayWuxing] === targetWuxing;
  }

  private isResourceElement(dayWuxing: string, targetWuxing: string): boolean {
    const map: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    return map[dayWuxing] === targetWuxing;
  }

  private isTianGanHe(a: string, b: string): boolean {
    return this.TIAN_GAN_HE.some(pair => pair.includes(a) && pair.includes(b) && a !== b);
  }

  private isTianGanChong(a: string, b: string): boolean {
    return this.TIAN_GAN_CHONG.some(pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a));
  }

  private isDiZhiHe(a: string, b: string): boolean {
    return this.DI_ZHI_HE.some(pair => pair.includes(a) && pair.includes(b) && a !== b);
  }

  private isDiZhiChong(a: string, b: string): boolean {
    return this.DI_ZHI_CHONG.some(pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a));
  }

  private isDiZhiSanHe(a: string, b: string): boolean {
    return this.DI_ZHI_SAN_HE.some(group => group.includes(a) && group.includes(b) && a !== b);
  }

  private getYearGanIndex(date: Date): number {
    return (date.getFullYear() - 4) % 10;
  }

  private getMonthZhiIndex(date: Date): number {
    const month = date.getMonth() + 1;
    return (month + 1) % 12;
  }

  private getDayGanIndex(date: Date): number {
    const jdn = this.getJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return (jdn + 9) % 10;
  }

  private getDayZhiIndex(date: Date): number {
    const jdn = this.getJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return (jdn + 1) % 12;
  }

  private getJDN(year: number, month: number, day: number): number {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private deterministicHash(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
