import { Injectable, Logger } from '@nestjs/common';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';
import { WUXING_TO_EN, WUXING_BASE_SCORE, WUXING_TIANGAN } from '../../calc-engine/bazi-engine/core/bazi-data.service';

/**
 * 五行分析生成器
 * 生成五行分析数据
 */
@Injectable()
export class WuxingGenerator {
  private readonly logger = new Logger(WuxingGenerator.name);
  private readonly WUXING_ORDER = ['木', '火', '土', '金', '水'];
  private readonly WUXING_KEY_MAP = WUXING_TO_EN;
  private readonly WUXING_SCORES: Record<string, number> = WUXING_BASE_SCORE;

  /**
   * 生成五行分析
   */
  generateWuxingAnalysis(baziResult: BaziFullResult): any {
    const { wuxing, dayPillar } = baziResult;
    const dayGan = dayPillar.charAt(0);
    const dayWuxing = this.getGanWuxing(dayGan);

    const scores = this.calculateWuxingScores(wuxing);
    const balance = this.getBalanceLevel(scores);
    const suggestions = this.getWuxingSuggestions(scores, dayWuxing);

    return {
      summary: `日主为${dayWuxing}，五行${balance}`,
      scores,
      balance,
      suggestions,
      dayElement: dayWuxing,
    };
  }

  /**
   * 计算五行得分
   */
  private calculateWuxingScores(wuxing: Record<string, number>): Record<string, number> {
    const total = Object.values(wuxing).reduce((sum, v) => sum + v, 0) || 1;
    const scores: Record<string, number> = {};

    for (const wx of this.WUXING_ORDER) {
      const key = this.WUXING_KEY_MAP[wx] || wx;
      const count = wuxing[key] || 0;
      scores[wx] = Math.round((count / total) * 100);
    }

    return scores;
  }

  /**
   * 获取平衡等级
   */
  private getBalanceLevel(ratios: Record<string, number>): string {
    const values = Object.values(ratios);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;

    if (range < 15) return '平衡';
    if (range < 25) return '基本平衡';
    if (max > 50) return '偏盛';
    return '偏弱';
  }

  /**
   * 获取五行建议
   */
  private getWuxingSuggestions(wuxingScores: Record<string, number>, dayElement: string): string[] {
    const suggestions: string[] = [];
    const sorted = this.WUXING_ORDER
      .map(wx => ({ name: wx, score: wuxingScores[wx] || 0 }))
      .sort((a, b) => a.score - b.score);

    // 最弱的五行需要补充
    const weakest = sorted[0].name;
    const weakestSuggestions: Record<string, string> = {
      '木': '建议多接触木属性事物，如绿色植物、木质家具',
      '火': '建议多接触火属性事物，如阳光、红色物品',
      '土': '建议多接触土属性事物，如玉石、陶瓷',
      '金': '建议多接触金属性事物，如金银饰品、金属器皿',
      '水': '建议多接触水属性事物，如蓝色物品、水边环境',
    };
    suggestions.push(weakestSuggestions[weakest] || '注意调理');

    // 最强的五行需要宣泄
    const strongest = sorted[4].name;
    const strongestSuggestions: Record<string, string> = {
      '木': '木过旺，宜金制木，可佩戴金属饰品',
      '火': '火过旺，宜水熄火，可多接触水属性',
      '土': '土过旺，宜木疏土，可多接触木属性',
      '金': '金过旺，宜火炼金，可多接触火属性',
      '水': '水过旺，宜土制水，可多接触土属性',
    };
    suggestions.push(strongestSuggestions[strongest] || '注意平衡');

    return suggestions;
  }

  private getGanWuxing(gan: string): string {
    // P1-5 修复: 引用统一源 WUXING_TIANGAN（原本地 map 重复定义）
    return WUXING_TIANGAN[gan] || '土';
  }
}
