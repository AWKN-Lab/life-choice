import { Injectable, Logger } from '@nestjs/common';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';

/**
 * 月运数据生成器
 * 生成12个月的运势数据
 */
@Injectable()
export class MonthlyGenerator {
  private readonly logger = new Logger(MonthlyGenerator.name);
  private readonly GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  private readonly ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  private readonly MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  private readonly WUXING_SCORE: Record<string, number> = {
    '木': 82, '火': 88, '土': 75, '金': 72, '水': 85,
  };

  /**
   * 生成月运数据
   */
  generateMonthlyData(baziResult: BaziFullResult, birthYear: number, birthMonth: number): any[] {
    const data: any[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    for (let i = 0; i < 12; i++) {
      const month = i + 1;
      const year = currentYear + (currentMonth + i > 12 ? 1 : 0);
      const zhiIndex = (birthMonth + i - 1) % 12;

      const zhi = this.ZHI[zhiIndex];
      const wuxing = this.getZhiWuxing(zhi);
      const score = this.WUXING_SCORE[wuxing] + this.deterministicOffset(`${year}-${month}-${zhi}`);

      data.push({
        month,
        monthName: this.MONTHS[i],
        year,
        ganZhi: `${this.GAN[i]}${zhi}`,
        wuxing,
        score: Math.max(60, Math.min(95, score)),
        reason: this.generateMonthReason(this.GAN[i], zhi, month),
        isCurrent: month === currentMonth,
      });
    }

    return data;
  }

  /**
   * 生成月份评语
   */
  generateMonthReason(gan: string, zhi: string, month: number): string {
    const ganWuxing = this.getGanWuxing(gan);
    const zhiWuxing = this.getZhiWuxing(zhi);

    if (ganWuxing === zhiWuxing) {
      return `${this.MONTHS[month - 1]}五行相助，运势平稳`;
    }

    const relations = this.getWuXingRelation(ganWuxing, zhiWuxing);
    return `${this.MONTHS[month - 1]}${relations}`;
  }

  private getWuXingRelation(wx1: string, wx2: string): string {
    const relations: Record<string, Record<string, string>> = {
      '木': { '火': '木生火，运势上扬', '土': '木克土，付出较多', '金': '金克木，面临挑战', '水': '水生木，贵人相助' },
      '火': { '木': '火生木，活力充沛', '土': '火生土，财运稳定', '金': '火克金，支出增加', '水': '水克火，注意调节' },
      '土': { '火': '土生金，财运积累', '木': '土克水，保守为宜', '金': '土生金，贵人相助', '水': '土克水，付出较多' },
      '金': { '土': '金生水，财运流通', '火': '火克金，注意花费', '木': '金克木，突破困难', '水': '金生水，运势上扬' },
      '水': { '木': '水生木，贵人相助', '火': '水克火，财运稳定', '土': '土克水，保守为宜', '金': '金生水，财运流通' },
    };

    return relations[wx1]?.[wx2] || '运势平稳';
  }

  private getGanWuxing(gan: string): string {
    const map: Record<string, string> = {
      '甲': '木', '乙': '木', '丙': '火', '丁': '火',
      '戊': '土', '己': '土', '庚': '金', '辛': '金',
      '壬': '水', '癸': '水',
    };
    return map[gan] || '土';
  }

  private getZhiWuxing(zhi: string): string {
    const map: Record<string, string> = {
      '子': '水', '丑': '土', '寅': '木', '卯': '木',
      '辰': '土', '巳': '火', '午': '火', '未': '土',
      '申': '金', '酉': '金', '戌': '土', '亥': '水',
    };
    return map[zhi] || '土';
  }

  private deterministicOffset(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 11) - 5;
  }
}
