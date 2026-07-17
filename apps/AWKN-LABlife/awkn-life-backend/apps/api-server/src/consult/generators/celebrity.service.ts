import { Injectable } from '@nestjs/common';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';
import { GAN, ZHI, WUXING_TIANGAN, WUXING_DIZHI, WUXING_TO_EN } from '../../calc-engine/bazi-engine/core/bazi-data.service';
import { CelebrityCase, CelebrityScores, BaziSimilarity } from './fortune.types';

@Injectable()
export class CelebrityService {
  // GAN, ZHI, WUXING_TIANGAN, WUXING_DIZHI — 已从 bazi-data.service.ts 统一导入
  private readonly DI_ZHI_HE: string[] = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
  private readonly DI_ZHI_CHONG: string[] = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
  private readonly DI_ZHI_SAN_HE: string[][] = [
    ['申', '子', '辰'], ['亥', '卯', '未'],
    ['寅', '午', '戌'], ['巳', '酉', '丑'],
  ];

  private readonly PRESET_CASES: CelebrityCase[] = [
    {
      id: 'steve-jobs',
      name: 'Steve Jobs',
      name_cn: '史蒂夫·乔布斯',
      category: 'sudden_downfall',
      category_cn: '巨星陨落与意外',
      birth_date: '1955-02-24',
      birth_location: { city: '旧金山', lat: 37.7749, lng: -122.4194 },
      description: '苹果公司联合创始人，科技与设计的完美结合者',
      tags: ['科技', '创新', '设计', '商业'],
      year_pillar: '乙未',
      month_pillar: '戊寅',
      day_pillar: '丙辰',
      hour_pillar: '甲午',
      scores: { overall: 92, personality: 95, career: 96, wealth: 88, marriage: 55, health: 35 },
    },
    {
      id: 'jack-ma',
      name: 'Jack Ma',
      name_cn: '马云',
      category: 'corporate_fate',
      category_cn: '商业帝国运势',
      birth_date: '1964-09-10',
      birth_location: { city: '杭州', lat: 30.2741, lng: 120.1551 },
      description: '阿里巴巴创始人，电商帝国的缔造者',
      tags: ['电商', '互联网', '商业', '演讲'],
      year_pillar: '甲辰',
      month_pillar: '癸酉',
      day_pillar: '壬申',
      hour_pillar: '庚戌',
      scores: { overall: 88, personality: 90, career: 94, wealth: 92, marriage: 72, health: 68 },
    },
    {
      id: 'sam-altman',
      name: 'Sam Altman',
      name_cn: '萨姆·奥特曼',
      category: 'ai_tech',
      category_cn: 'AI纪元与科技新贵',
      birth_date: '1985-04-22',
      birth_location: { city: '芝加哥', lat: 41.8781, lng: -87.6298 },
      description: 'OpenAI CEO，AI时代的领航者',
      tags: ['AI', '科技', '投资', '创业'],
      year_pillar: '乙丑',
      month_pillar: '庚辰',
      day_pillar: '壬寅',
      hour_pillar: '丙午',
      scores: { overall: 86, personality: 82, career: 90, wealth: 85, marriage: 60, health: 75 },
    },
    {
      id: 'cz-binance',
      name: 'CZ (Changpeng Zhao)',
      name_cn: '赵长鹏',
      category: 'crypto_macro',
      category_cn: '虚拟资产与宏观',
      birth_date: '1977-11-10',
      birth_location: { city: '连云港', lat: 34.596, lng: 119.221 },
      description: '币安创始人，加密货币交易所之王',
      tags: ['加密货币', '交易所', '区块链', '商业'],
      year_pillar: '丁巳',
      month_pillar: '辛亥',
      day_pillar: '壬戌',
      hour_pillar: '甲辰',
      scores: { overall: 84, personality: 78, career: 88, wealth: 90, marriage: 65, health: 72 },
    },
    {
      id: 'elon-musk',
      name: 'Elon Musk',
      name_cn: '埃隆·马斯克',
      category: 'rising_power',
      category_cn: '逆袭与实力爆发',
      birth_date: '1971-06-28',
      birth_location: { city: '比勒陀利亚', lat: -25.7479, lng: 28.2293 },
      description: 'Tesla/SpaceX创始人，跨领域颠覆者',
      tags: ['科技', '汽车', '航天', '颠覆'],
      year_pillar: '辛亥',
      month_pillar: '甲午',
      day_pillar: '壬寅',
      hour_pillar: '戊申',
      scores: { overall: 90, personality: 88, career: 95, wealth: 96, marriage: 45, health: 70 },
    },
    {
      id: 'warren-buffett',
      name: 'Warren Buffett',
      name_cn: '沃伦·巴菲特',
      category: 'corporate_fate',
      category_cn: '商业帝国运势',
      birth_date: '1930-08-30',
      birth_location: { city: '奥马哈', lat: 41.2565, lng: -95.9345 },
      description: '伯克希尔·哈撒韦CEO，价值投资之父',
      tags: ['投资', '价值投资', '商业', '慈善'],
      year_pillar: '庚午',
      month_pillar: '甲申',
      day_pillar: '丁巳',
      hour_pillar: '壬寅',
      scores: { overall: 93, personality: 85, career: 92, wealth: 98, marriage: 70, health: 80 },
    },
    {
      id: 'zhuge-liang',
      name: 'Zhuge Liang',
      name_cn: '诸葛亮',
      category: 'rising_power',
      category_cn: '逆袭与实力爆发',
      birth_date: '181-09-17',
      birth_location: { city: '琅琊阳都', lat: 35.5, lng: 118.4 },
      description: '蜀汉丞相，千古智圣，鞠躬尽瘁死而后已',
      tags: ['谋略', '政治', '军事', '忠义'],
      year_pillar: '辛酉',
      month_pillar: '丁酉',
      day_pillar: '癸巳',
      hour_pillar: '丙辰',
      scores: { overall: 95, personality: 98, career: 90, wealth: 60, marriage: 70, health: 40 },
    },
    {
      id: 'cao-cao',
      name: 'Cao Cao',
      name_cn: '曹操',
      category: 'corporate_fate',
      category_cn: '商业帝国运势',
      birth_date: '155-03-01',
      birth_location: { city: '沛国谯县', lat: 33.8, lng: 115.8 },
      description: '魏武帝，乱世枭雄，文武双全的政治家',
      tags: ['政治', '军事', '文学', '权谋'],
      year_pillar: '乙未',
      month_pillar: '己卯',
      day_pillar: '甲子',
      hour_pillar: '庚午',
      scores: { overall: 94, personality: 92, career: 96, wealth: 85, marriage: 55, health: 65 },
    },
    {
      id: 'su-shi',
      name: 'Su Shi',
      name_cn: '苏轼',
      category: 'sudden_downfall',
      category_cn: '巨星陨落与意外',
      birth_date: '1037-01-08',
      birth_location: { city: '眉山', lat: 30.0, lng: 103.8 },
      description: '东坡居士，千古第一文人，一生三起三落',
      tags: ['文学', '书法', '美食', '豁达'],
      year_pillar: '丙子',
      month_pillar: '辛丑',
      day_pillar: '癸亥',
      hour_pillar: '甲寅',
      scores: { overall: 88, personality: 95, career: 65, wealth: 50, marriage: 45, health: 60 },
    },
    {
      id: 'zeng-guofan',
      name: 'Zeng Guofan',
      name_cn: '曾国藩',
      category: 'rising_power',
      category_cn: '逆袭与实力爆发',
      birth_date: '1811-11-26',
      birth_location: { city: '湘乡', lat: 27.7, lng: 112.5 },
      description: '晚清四大名臣之首，立德立功立言三不朽',
      tags: ['政治', '军事', '理学', '修身'],
      year_pillar: '辛未',
      month_pillar: '己亥',
      day_pillar: '丙辰',
      hour_pillar: '戊子',
      scores: { overall: 92, personality: 90, career: 93, wealth: 70, marriage: 75, health: 55 },
    },
    {
      id: 'mao-zedong',
      name: 'Mao Zedong',
      name_cn: '毛泽东',
      category: 'rising_power',
      category_cn: '逆袭与实力爆发',
      birth_date: '1893-12-26',
      birth_location: { city: '韶山', lat: 27.9, lng: 112.5 },
      description: '中华人民共和国缔造者，诗人革命家',
      tags: ['革命', '政治', '军事', '诗词'],
      year_pillar: '癸巳',
      month_pillar: '甲子',
      day_pillar: '丁酉',
      hour_pillar: '甲辰',
      scores: { overall: 96, personality: 95, career: 98, wealth: 40, marriage: 35, health: 60 },
    },
    {
      id: 'jack-ma-2',
      name: 'Ren Zhengfei',
      name_cn: '任正非',
      category: 'corporate_fate',
      category_cn: '商业帝国运势',
      birth_date: '1944-10-25',
      birth_location: { city: '镇宁', lat: 26.1, lng: 105.8 },
      description: '华为创始人，中国科技自主的旗帜',
      tags: ['科技', '通信', '管理', '韧性'],
      year_pillar: '甲申',
      month_pillar: '甲戌',
      day_pillar: '辛巳',
      hour_pillar: '庚寅',
      scores: { overall: 91, personality: 88, career: 94, wealth: 82, marriage: 60, health: 72 },
    },
  ];

  getCelebrityCases(category?: string): CelebrityCase[] {
    if (category) {
      return this.PRESET_CASES.filter(c => c.category === category);
    }
    return this.PRESET_CASES;
  }

  getCelebrityCaseById(id: string): CelebrityCase | undefined {
    return this.PRESET_CASES.find(c => c.id === id);
  }

  calculateSimilarity(baziResult: BaziFullResult, celebrity: CelebrityCase): BaziSimilarity {
    const userPillars = {
      year: baziResult.yearPillar,
      month: baziResult.monthPillar,
      day: baziResult.dayPillar,
      hour: baziResult.hourPillar,
    };

    const celebPillars = {
      year: celebrity.year_pillar,
      month: celebrity.month_pillar,
      day: celebrity.day_pillar,
      hour: celebrity.hour_pillar,
    };

    const yearScore = this.scorePillarSimilarity(userPillars.year, celebPillars.year);
    const monthScore = this.scorePillarSimilarity(userPillars.month, celebPillars.month);
    const dayScore = this.scorePillarSimilarity(userPillars.day, celebPillars.day);
    const hourScore = this.scorePillarSimilarity(userPillars.hour, celebPillars.hour);

    const wuxingBalanceScore = this.scoreWuxingBalance(baziResult, celebPillars);

    const overallScore = Math.min(95, Math.round(
      yearScore * 0.10 +
      monthScore * 0.20 +
      dayScore * 0.25 +
      hourScore * 0.15 +
      wuxingBalanceScore * 0.30
    ));

    const dayMasterRelation = this.getDayMasterRelation(baziResult, celebPillars);

    const insights = this.generateInsights(baziResult, celebrity, {
      yearScore, monthScore, dayScore, hourScore, wuxingBalanceScore, overallScore,
    });

    return {
      overall_score: overallScore,
      year_pillar_score: yearScore,
      month_pillar_score: monthScore,
      day_pillar_score: dayScore,
      hour_pillar_score: hourScore,
      wuxing_balance_score: wuxingBalanceScore,
      day_master_relation: dayMasterRelation,
      insights,
    };
  }

  private scorePillarSimilarity(userPillar: string, celebPillar: string): number {
    if (!userPillar || !celebPillar) return 30;

    let score = 0;
    const userGan = userPillar[0];
    const userZhi = userPillar[1];
    const celebGan = celebPillar[0];
    const celebZhi = celebPillar[1];

    if (userGan === celebGan) {
      score += 50;
    } else if (WUXING_TIANGAN[userGan] === WUXING_TIANGAN[celebGan]) {
      score += 30;
    } else if (this.isGanSheng(userGan, celebGan) || this.isGanSheng(celebGan, userGan)) {
      score += 20;
    } else {
      score += 10;
    }

    if (userZhi === celebZhi) {
      score += 50;
    } else if (WUXING_DIZHI[userZhi] === WUXING_DIZHI[celebZhi]) {
      score += 30;
    } else if (this.isDiZhiHe(userZhi, celebZhi)) {
      score += 25;
    } else if (this.isDiZhiSanHe(userZhi, celebZhi)) {
      score += 20;
    } else if (this.isDiZhiChong(userZhi, celebZhi)) {
      score += -10;
    } else {
      score += 10;
    }

    return this.clamp(score, 0, 100);
  }

  private scoreWuxingBalance(baziResult: BaziFullResult, celebPillars: { year: string; month: string; day: string; hour: string }): number {
    const userWuxing = baziResult.wuxing;
    const celebWuxing = this.extractWuxingFromPillars(celebPillars);

    const userTotal = (userWuxing.wood || 0) + (userWuxing.fire || 0) + (userWuxing.earth || 0) + (userWuxing.metal || 0) + (userWuxing.water || 0);
    const celebTotal = celebWuxing.wood + celebWuxing.fire + celebWuxing.earth + celebWuxing.metal + celebWuxing.water;

    if (userTotal === 0 || celebTotal === 0) return 50;

    const userRatios = {
      wood: (userWuxing.wood || 0) / userTotal,
      fire: (userWuxing.fire || 0) / userTotal,
      earth: (userWuxing.earth || 0) / userTotal,
      metal: (userWuxing.metal || 0) / userTotal,
      water: (userWuxing.water || 0) / userTotal,
    };

    const celebRatios = {
      wood: celebWuxing.wood / celebTotal,
      fire: celebWuxing.fire / celebTotal,
      earth: celebWuxing.earth / celebTotal,
      metal: celebWuxing.metal / celebTotal,
      water: celebWuxing.water / celebTotal,
    };

    let totalDiff = 0;
    for (const key of ['wood', 'fire', 'earth', 'metal', 'water'] as const) {
      totalDiff += Math.abs(userRatios[key] - celebRatios[key]);
    }

    return this.clamp(Math.round((1 - totalDiff / 2) * 100), 0, 100);
  }

  private extractWuxingFromPillars(pillars: { year: string; month: string; day: string; hour: string }): Record<string, number> {
    const wuxing = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const wuxingCount = WUXING_TO_EN;

    for (const pillar of Object.values(pillars)) {
      if (!pillar || pillar.length < 2) continue;
      const ganWuxing = WUXING_TIANGAN[pillar[0]];
      const zhiWuxing = WUXING_DIZHI[pillar[1]];
      if (wuxingCount[ganWuxing]) wuxing[wuxingCount[ganWuxing]]++;
      if (wuxingCount[zhiWuxing]) wuxing[wuxingCount[zhiWuxing]]++;
    }

    return wuxing;
  }

  private getDayMasterRelation(baziResult: BaziFullResult, celebPillars: { year: string; month: string; day: string; hour: string }): string {
    const userDayGan = baziResult.dayPillar[0];
    const celebDayGan = celebPillars.day[0];
    const userDayWuxing = WUXING_TIANGAN[userDayGan];
    const celebDayWuxing = WUXING_TIANGAN[celebDayGan];

    if (userDayGan === celebDayGan) return '比肩（同日主）';
    if (WUXING_TIANGAN[userDayGan] === WUXING_TIANGAN[celebDayGan]) return '劫财（同五行）';

    const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const keMap: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

    if (shengMap[userDayWuxing] === celebDayWuxing) return '食伤关系（我生对方）';
    if (shengMap[celebDayWuxing] === userDayWuxing) return '印星关系（对方生我）';
    if (keMap[userDayWuxing] === celebDayWuxing) return '财星关系（我克对方）';
    if (keMap[celebDayWuxing] === userDayWuxing) return '官杀关系（对方克我）';

    return '中性关系';
  }

  private generateInsights(baziResult: BaziFullResult, celebrity: CelebrityCase, scores: {
    yearScore: number; monthScore: number; dayScore: number; hourScore: number;
    wuxingBalanceScore: number; overallScore: number;
  }): string[] {
    const insights: string[] = [];

    if (scores.dayScore >= 70) {
      insights.push(`日柱与${celebrity.name_cn}高度相似，核心性格和处事方式有共通之处`);
    }
    if (scores.wuxingBalanceScore >= 70) {
      insights.push(`五行结构与${celebrity.name_cn}相近，命运节奏有共振可能`);
    }
    if (scores.overallScore >= 70) {
      insights.push(`整体命盘与${celebrity.name_cn}相似度较高，可参考其人生关键节点的选择`);
    }
    if (scores.monthScore >= 70) {
      insights.push(`月柱匹配度高，事业格局与${celebrity.name_cn}有相似之处`);
    }

    const userDayGan = baziResult.dayPillar[0];
    const celebDayGan = celebrity.day_pillar[0];
    if (userDayGan === celebDayGan) {
      insights.push(`同为${userDayGan}日主，可借鉴其运势起伏规律`);
    }

    if (insights.length === 0) {
      insights.push(`命盘与${celebrity.name_cn}差异较大，但可从其人生经历中汲取经验`);
    }

    return insights.slice(0, 4);
  }

  private isGanSheng(a: string, b: string): boolean {
    const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    return shengMap[WUXING_TIANGAN[a]] === WUXING_TIANGAN[b];
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

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
