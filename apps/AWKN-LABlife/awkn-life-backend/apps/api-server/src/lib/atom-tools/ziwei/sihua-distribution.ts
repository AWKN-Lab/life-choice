import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
} from './ziwei-types';

export interface SihuaDistributionInput {
  chart: ZiweiChartInput;
}

export interface SihuaStar {
  star: string;
  palace: string;
  palaceIndex: number;
}

export interface SihuaDistributionOutput {
  lu: SihuaStar | null;
  quan: SihuaStar | null;
  ke: SihuaStar | null;
  ji: SihuaStar | null;
  summary: string;
}

const MUTAGEN_MAP: Record<string, keyof Omit<SihuaDistributionOutput, 'summary'>> = {
  '禄': 'lu',
  '权': 'quan',
  '科': 'ke',
  '忌': 'ji',
};

const SIHUA_LABELS: Record<string, string> = {
  'lu': '化禄',
  'quan': '化权',
  'ke': '化科',
  'ji': '化忌',
};

function extractSihuaFromPalaces(
  palaces: ZiweiPalaceData[],
): {
  lu: SihuaStar[];
  quan: SihuaStar[];
  ke: SihuaStar[];
  ji: SihuaStar[];
} {
  const result: Record<string, SihuaStar[]> = { lu: [], quan: [], ke: [], ji: [] };

  for (const palace of palaces) {
    const allStars = [...palace.majorStars, ...palace.minorStars];
    for (const star of allStars) {
      if (star.mutagen && MUTAGEN_MAP[star.mutagen]) {
        const key = MUTAGEN_MAP[star.mutagen];
        result[key].push({
          star: star.name,
          palace: palace.name,
          palaceIndex: palace.index,
        });
      }
    }
  }

  return result as any;
}

export const sihuaDistribution: AtomTool<SihuaDistributionInput, SihuaDistributionOutput> = {
  name: 'sihua-distribution',
  description: '四化星分布：提取化禄/化权/化科/化忌的星曜及所在宫位',
  category: 'ziwei',

  async execute(input: SihuaDistributionInput): Promise<SihuaDistributionOutput> {
    const { chart } = input;
    const sihua = extractSihuaFromPalaces(chart.palaces);

    const lu = sihua.lu[0] || null;
    const quan = sihua.quan[0] || null;
    const ke = sihua.ke[0] || null;
    const ji = sihua.ji[0] || null;

    const parts: string[] = [];
    if (lu) parts.push(`化禄在${lu.star}${lu.palace}`);
    if (quan) parts.push(`化权在${quan.star}${quan.palace}`);
    if (ke) parts.push(`化科在${ke.star}${ke.palace}`);
    if (ji) parts.push(`化忌在${ji.star}${ji.palace}`);

    const summary = parts.length > 0 ? parts.join('，') : '无四化星数据';

    return { lu, quan, ke, ji, summary };
  },

  toPromptOutput(output: SihuaDistributionOutput): string {
    const parts: string[] = [];
    if (output.lu) parts.push(`化禄在${output.lu.star}${output.lu.palace}`);
    if (output.quan) parts.push(`化权在${output.quan.star}${output.quan.palace}`);
    if (output.ke) parts.push(`化科在${output.ke.star}${output.ke.palace}`);
    if (output.ji) parts.push(`化忌在${output.ji.star}${output.ji.palace}`);
    return parts.length > 0 ? parts.join('，') : '无四化星数据';
  },
};
