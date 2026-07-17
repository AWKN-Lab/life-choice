import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
  getPalaceByName,
  getPalaceByIndex,
  getSanfangPalaceIndices,
  PALACE_NAMES,
} from './ziwei-types';

export interface PalaceCombinationInput {
  chart: ZiweiChartInput;
  focusPalaces?: string[];
}

export interface PalaceDetail {
  stars: string[];
  minorStars: string[];
  sihua: string[];
  sanfang: string[];
  sanfangStars: string[];
}

export interface PalaceCombinationOutput {
  palaces: Record<string, PalaceDetail>;
  summary: string;
}

const DEFAULT_FOCUS_PALACES = ['命宫', '财帛宫', '官禄宫', '夫妻宫', '迁移宫', '福德宫'];

function extractSihuaFromPalace(palace: ZiweiPalaceData): string[] {
  const result: string[] = [];
  const allStars = [...palace.majorStars, ...palace.minorStars];
  for (const star of allStars) {
    if (star.mutagen) {
      const label = star.mutagen === '禄' ? '化禄'
        : star.mutagen === '权' ? '化权'
        : star.mutagen === '科' ? '化科'
        : star.mutagen === '忌' ? '化忌'
        : star.mutagen;
      result.push(`${star.name}${label}`);
    }
  }
  return result;
}

function getSanfangInfo(
  palace: ZiweiPalaceData,
  allPalaces: ZiweiPalaceData[],
): { sanfang: string[]; sanfangStars: string[] } {
  const indices = getSanfangPalaceIndices(palace.index);
  const sanfangNames: string[] = [];
  const sanfangStars: string[] = [];

  for (const idx of indices) {
    const p = getPalaceByIndex(allPalaces, idx);
    if (p && p.index !== palace.index) {
      sanfangNames.push(p.name);
      const stars = p.majorStars.map((s) => s.name);
      sanfangStars.push(...stars);
    }
  }

  return { sanfang: sanfangNames, sanfangStars };
}

const CAREER_STAR_KEYWORDS: Record<string, string> = {
  '紫微': '管理领导', '天府': '稳定管理', '太阳': '公职文教', '太阴': '财务艺术',
  '武曲': '金融财务', '天相': '行政服务', '天梁': '教育医疗', '廉贞': '政法公关',
  '贪狼': '交际应酬', '巨门': '口才传播', '七杀': '开创竞争', '破军': '变革创新',
  '天机': '策划谋略', '天同': '服务休闲',
};

function inferCareerHint(stars: string[]): string {
  const hints = stars
    .filter((s) => CAREER_STAR_KEYWORDS[s])
    .map((s) => CAREER_STAR_KEYWORDS[s]);
  if (hints.length === 0) return '';
  if (hints.length <= 2) return `适合${hints.join('、')}类岗位`;
  return `适合${hints.slice(0, 2).join('、')}等方向`;
}

export const palaceCombination: AtomTool<PalaceCombinationInput, PalaceCombinationOutput> = {
  name: 'palace-combination',
  description: '重点宫位组合分析：指定宫位的主星、辅星、四化、三方四正组合',
  category: 'ziwei',

  async execute(input: PalaceCombinationInput): Promise<PalaceCombinationOutput> {
    const { chart } = input;
    const focusPalaces = input.focusPalaces && input.focusPalaces.length > 0
      ? input.focusPalaces
      : DEFAULT_FOCUS_PALACES;

    const palaces: Record<string, PalaceDetail> = {};

    for (const palaceName of focusPalaces) {
      const palace = getPalaceByName(chart.palaces, palaceName);
      if (!palace) continue;

      const stars = palace.majorStars.map((s) => s.name);
      const minorStars = palace.minorStars.map((s) => s.name);
      const sihua = extractSihuaFromPalace(palace);
      const { sanfang, sanfangStars } = getSanfangInfo(palace, chart.palaces);

      palaces[palaceName] = {
        stars,
        minorStars,
        sihua,
        sanfang,
        sanfangStars,
      };
    }

    const summaryParts: string[] = [];
    for (const [name, detail] of Object.entries(palaces)) {
      const starText = detail.stars.length > 0 ? detail.stars.join('+') : '空宫';
      const sfStarText = detail.sanfangStars.length > 0
        ? `三方四正：${detail.sanfangStars.join('+')}`
        : '';

      let line = `${name}${starText}`;
      if (sfStarText) line += `，${sfStarText}`;

      if (detail.sihua.length > 0) {
        line += `，${detail.sihua.join('、')}`;
      }

      if (name === '官禄宫' && detail.sanfangStars.length > 0) {
        const hint = inferCareerHint([...detail.stars, ...detail.sanfangStars]);
        if (hint) line += `，${hint}`;
      }

      summaryParts.push(line);
    }

    const summary = summaryParts.join('；') || '无宫位数据';

    return { palaces, summary };
  },

  toPromptOutput(output: PalaceCombinationOutput): string {
    return output.summary;
  },
};
