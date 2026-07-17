import { AtomTool } from '../types';
import {
  getShishen,
  getZanggan,
} from '../../../calc-engine/bazi-engine/core/bazi-data.service';

export interface ShishenInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface ShishenOutput {
  shishenMap: Record<string, string[]>;
  categoryCount: Record<string, number>;
  dominantCategory: string;
  summary: string;
}

const CATEGORY_MAP: Record<string, string> = {
  '比肩': '比劫', '劫财': '比劫',
  '食神': '食伤', '伤官': '食伤',
  '偏财': '财', '正财': '财',
  '七杀': '官杀', '正官': '官杀',
  '偏印': '印', '正印': '印',
};

const CATEGORY_TRAIT: Record<string, string> = {
  '比劫': '自我意识强，竞争心重',
  '食伤': '才华外露，表达欲强',
  '财': '务实重利，善于经营',
  '官杀': '事业心强，重规矩权威',
  '印': '重学习思考，依赖性强',
};

export const shishenTool: AtomTool<ShishenInput, ShishenOutput> = {
  name: 'shishen-analysis',
  description: '十神分析：统计四柱天干地支的十神关系，归纳比劫/食伤/财/官杀/印的分布与主导',
  category: 'bazi',

  async execute(input: ShishenInput): Promise<ShishenOutput> {
    const dayGan = input.dayPillar[0];
    const pillarNames = ['year', 'month', 'day', 'hour'] as const;
    const pillars = [input.yearPillar, input.monthPillar, input.dayPillar, input.hourPillar];

    const shishenMap: Record<string, string[]> = {
      year: [],
      month: [],
      day: [],
      hour: [],
    };

    const categoryCount: Record<string, number> = {
      '比劫': 0, '食伤': 0, '财': 0, '官杀': 0, '印': 0,
    };

    for (let i = 0; i < 4; i++) {
      const pillar = pillars[i];
      const pName = pillarNames[i];
      const gan = pillar[0];
      const zhi = pillar[1];

      if (pName === 'day') {
        shishenMap[pName].push('日主');
        continue;
      }

      const ganShishen = getShishen(dayGan, gan);
      shishenMap[pName].push(`${gan}${ganShishen}`);
      const cat = CATEGORY_MAP[ganShishen];
      if (cat) categoryCount[cat] += 1;

      const zg = getZanggan(zhi);
      for (const g of [zg.main, zg.middle, zg.residual].filter(Boolean) as string[]) {
        const zgShishen = getShishen(dayGan, g);
        shishenMap[pName].push(`${zhi}藏${g}${zgShishen}`);
        const zgCat = CATEGORY_MAP[zgShishen];
        if (zgCat) categoryCount[zgCat] += 0.5;
      }
    }

    const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    const dominantCategory = sorted[0]?.[0] || '比劫';

    const countStr = sorted
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}${Math.round(v * 10) / 10}`)
      .join(' ');
    const trait = CATEGORY_TRAIT[dominantCategory] || '';
    const summary = `十神分布：${countStr}，以${dominantCategory}为重，${trait}`;

    return {
      shishenMap,
      categoryCount,
      dominantCategory,
      summary,
    };
  },

  toPromptOutput(output: ShishenOutput): string {
    return output.summary;
  },
};
