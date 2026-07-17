import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
  getPalaceByName,
  getPalaceByIndex,
  getSanfangPalaceIndices,
  describeMiaowang,
  PALACE_NAMES,
} from './ziwei-types';

export interface TripleAlignmentInput {
  chart: ZiweiChartInput;
  targetPalace: string;
}

export interface TripleAlignmentOutput {
  targetPalace: string;
  sanfangPalaces: string[];
  allStars: string[];
  majorStarCount: number;
  sihuaStars: string[];
  strength: '强' | '中' | '弱';
  summary: string;
}

const MAJOR_STAR_NAMES = new Set([
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞',
  '天府', '太阴', '贪狼', '巨门', '天相', '天梁',
  '七杀', '破军',
]);

function collectSanfangStars(
  targetPalace: ZiweiPalaceData,
  palaces: ZiweiPalaceData[],
): {
  sanfangPalaces: string[];
  allStars: string[];
  majorStarCount: number;
  sihuaStars: string[];
} {
  const indices = getSanfangPalaceIndices(targetPalace.index);
  const sanfangPalaces: string[] = [];
  const allStarsSet = new Set<string>();
  let majorStarCount = 0;
  const sihuaStars: string[] = [];

  for (const idx of indices) {
    const palace = getPalaceByIndex(palaces, idx);
    if (!palace) continue;

    sanfangPalaces.push(palace.name);

    for (const star of palace.majorStars) {
      allStarsSet.add(star.name);
      if (MAJOR_STAR_NAMES.has(star.name)) {
        majorStarCount++;
      }
      if (star.mutagen) {
        const label = star.mutagen === '禄' ? '化禄'
          : star.mutagen === '权' ? '化权'
          : star.mutagen === '科' ? '化科'
          : star.mutagen === '忌' ? '化忌'
          : star.mutagen;
        sihuaStars.push(`${star.name}${label}`);
      }
    }

    for (const star of palace.minorStars) {
      allStarsSet.add(star.name);
      if (star.mutagen) {
        const label = star.mutagen === '禄' ? '化禄'
          : star.mutagen === '权' ? '化权'
          : star.mutagen === '科' ? '化科'
          : star.mutagen === '忌' ? '化忌'
          : star.mutagen;
        sihuaStars.push(`${star.name}${label}`);
      }
    }
  }

  return {
    sanfangPalaces,
    allStars: Array.from(allStarsSet),
    majorStarCount,
    sihuaStars,
  };
}

function judgeStrength(
  majorStarCount: number,
  sihuaStars: string[],
  allStars: string[],
): '强' | '中' | '弱' {
  let score = 0;

  score += majorStarCount * 2;

  const hasLu = sihuaStars.some(s => s.includes('化禄'));
  const hasQuan = sihuaStars.some(s => s.includes('化权'));
  const hasJi = sihuaStars.some(s => s.includes('化忌'));

  if (hasLu) score += 2;
  if (hasQuan) score += 1;
  if (hasJi) score -= 2;

  const majorInAll = allStars.filter(s => MAJOR_STAR_NAMES.has(s)).length;
  if (majorInAll >= 4) score += 2;
  else if (majorInAll >= 2) score += 1;

  if (score >= 8) return '强';
  if (score >= 4) return '中';
  return '弱';
}

export const tripleAlignmentTool: AtomTool<TripleAlignmentInput, TripleAlignmentOutput> = {
  name: 'triple-alignment',
  description: '三方四正关系：计算目标宫位的三方四正宫位，汇总所有星曜，判断格局强弱',
  category: 'ziwei',

  async execute(input: TripleAlignmentInput): Promise<TripleAlignmentOutput> {
    const { chart } = input;
    const targetPalace = getPalaceByName(chart.palaces, input.targetPalace);

    if (!targetPalace) {
      return {
        targetPalace: input.targetPalace,
        sanfangPalaces: [],
        allStars: [],
        majorStarCount: 0,
        sihuaStars: [],
        strength: '弱',
        summary: `未找到宫位"${input.targetPalace}"`,
      };
    }

    const { sanfangPalaces, allStars, majorStarCount, sihuaStars } =
      collectSanfangStars(targetPalace, chart.palaces);

    const strength = judgeStrength(majorStarCount, sihuaStars, allStars);

    const majorStars = allStars.filter(s => MAJOR_STAR_NAMES.has(s));
    const majorDesc = majorStars.length > 0 ? majorStars.join('+') : '无主星';

    const parts: string[] = [];
    parts.push(`${input.targetPalace}三方四正汇聚${majorDesc}`);

    if (majorStarCount >= 4) {
      parts.push(`${majorStarCount}主星齐聚格局极强`);
    } else if (majorStarCount >= 2) {
      parts.push(`${majorStarCount}主星坐镇格局尚可`);
    } else if (majorStarCount >= 1) {
      parts.push(`仅${majorStarCount}主星格局偏弱`);
    } else {
      parts.push('无主星坐镇格局弱');
    }

    if (sihuaStars.length > 0) {
      const luStars = sihuaStars.filter(s => s.includes('化禄'));
      if (luStars.length > 0) {
        parts.push(`${luStars.join('、')}加持`);
      }
      const jiStars = sihuaStars.filter(s => s.includes('化忌'));
      if (jiStars.length > 0) {
        parts.push(`${jiStars.join('、')}需防`);
      }
    }

    const strengthDesc = strength === '强' ? '贵气重' : strength === '中' ? '中平' : '需借力';
    parts.push(`此命盘${strengthDesc}`);

    const summary = parts.join('，');

    return {
      targetPalace: input.targetPalace,
      sanfangPalaces,
      allStars,
      majorStarCount,
      sihuaStars,
      strength,
      summary,
    };
  },

  toPromptOutput(output: TripleAlignmentOutput): string {
    return output.summary;
  },
};
