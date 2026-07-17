import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
  getPalaceByName,
  getPalaceByIndex,
  getSanfangPalaceIndices,
  PALACE_NAMES,
} from './ziwei-types';

export interface DayunOverlayInput {
  chart: ZiweiChartInput;
  dayunPalaceName: string;
}

export interface OverlayEffect {
  originalPalace: string;
  dayunPalace: string;
  effect: string;
}

export interface DayunOverlayOutput {
  dayunPalace: string;
  overlayEffects: OverlayEffect[];
  dayunSihua: string[];
  summary: string;
}

const FEIGONG_SIHUA: Record<string, Array<{ star: string; hua: string }>> = {
  '甲': [{ star: '廉贞', hua: '化禄' }, { star: '破军', hua: '化权' }, { star: '武曲', hua: '化科' }, { star: '太阳', hua: '化忌' }],
  '乙': [{ star: '天机', hua: '化禄' }, { star: '天梁', hua: '化权' }, { star: '紫微', hua: '化科' }, { star: '太阴', hua: '化忌' }],
  '丙': [{ star: '天同', hua: '化禄' }, { star: '天机', hua: '化权' }, { star: '文昌', hua: '化科' }, { star: '廉贞', hua: '化忌' }],
  '丁': [{ star: '太阴', hua: '化禄' }, { star: '天同', hua: '化权' }, { star: '天机', hua: '化科' }, { star: '巨门', hua: '化忌' }],
  '戊': [{ star: '贪狼', hua: '化禄' }, { star: '太阴', hua: '化权' }, { star: '右弼', hua: '化科' }, { star: '天机', hua: '化忌' }],
  '己': [{ star: '武曲', hua: '化禄' }, { star: '贪狼', hua: '化权' }, { star: '天梁', hua: '化科' }, { star: '文曲', hua: '化忌' }],
  '庚': [{ star: '太阳', hua: '化禄' }, { star: '武曲', hua: '化权' }, { star: '太阴', hua: '化科' }, { star: '天同', hua: '化忌' }],
  '辛': [{ star: '巨门', hua: '化禄' }, { star: '太阳', hua: '化权' }, { star: '文曲', hua: '化科' }, { star: '文昌', hua: '化忌' }],
  '壬': [{ star: '天梁', hua: '化禄' }, { star: '紫微', hua: '化权' }, { star: '左辅', hua: '化科' }, { star: '武曲', hua: '化忌' }],
  '癸': [{ star: '破军', hua: '化禄' }, { star: '巨门', hua: '化权' }, { star: '太阴', hua: '化科' }, { star: '贪狼', hua: '化忌' }],
};

function findStarInPalaces(palaces: ZiweiPalaceData[], starName: string): ZiweiPalaceData | null {
  for (const palace of palaces) {
    const allStars = [...palace.majorStars, ...palace.minorStars];
    if (allStars.some(s => s.name === starName)) {
      return palace;
    }
  }
  return null;
}

function computeDayunSihua(
  dayunPalace: ZiweiPalaceData,
  palaces: ZiweiPalaceData[],
): string[] {
  const tianGan = dayunPalace.heavenlyStem;
  const sihuaList = FEIGONG_SIHUA[tianGan];
  if (!sihuaList) return [];

  const results: string[] = [];
  for (const item of sihuaList) {
    const targetPalace = findStarInPalaces(palaces, item.star);
    const targetName = targetPalace ? targetPalace.name : '未知宫位';
    results.push(`大限${item.hua}入${targetName}（${item.star}${item.hua}）`);
  }

  return results;
}

function computeOverlayEffects(
  dayunPalaceIndex: number,
  palaces: ZiweiPalaceData[],
): OverlayEffect[] {
  const effects: OverlayEffect[] = [];
  const dayunPalace = getPalaceByIndex(palaces, dayunPalaceIndex);
  if (!dayunPalace) return effects;

  const dayunSanfangIndices = getSanfangPalaceIndices(dayunPalaceIndex);

  for (const idx of dayunSanfangIndices) {
    const dayunSidePalace = getPalaceByIndex(palaces, idx);
    if (!dayunSidePalace) continue;

    const originalPalaceAtSameIndex = getPalaceByIndex(palaces, idx);
    if (!originalPalaceAtSameIndex) continue;

    const dayunStars = dayunSidePalace.majorStars.map(s => s.name);
    const originalStars = originalPalaceAtSameIndex.majorStars.map(s => s.name);

    const combinedStars = [...new Set([...dayunStars, ...originalStars])];
    const isSamePalace = idx === dayunPalaceIndex;

    let effectDesc: string;
    if (isSamePalace) {
      effectDesc = `大限走${dayunSidePalace.name}，本宫星曜${dayunStars.join('+') || '空宫'}叠加`;
    } else {
      effectDesc = `大限${dayunSidePalace.name}叠原局${originalPalaceAtSameIndex.name}，星曜${combinedStars.join('+') || '空宫'}`;
    }

    const domainLink = getDomainLink(dayunPalace.name, originalPalaceAtSameIndex.name);
    if (domainLink) {
      effectDesc += `，${domainLink}`;
    }

    effects.push({
      originalPalace: originalPalaceAtSameIndex.name,
      dayunPalace: dayunSidePalace.name,
      effect: effectDesc,
    });
  }

  return effects;
}

function getDomainLink(dayunName: string, originalName: string): string {
  const domainMap: Record<string, string> = {
    '命宫': '自身', '财帛宫': '财运', '官禄宫': '事业', '夫妻宫': '感情',
    '迁移宫': '外出', '福德宫': '精神', '田宅宫': '家宅', '子女宫': '子嗣',
    '疾厄宫': '健康', '兄弟宫': '手足', '仆役宫': '人际', '父母宫': '长辈',
  };

  const d1 = domainMap[dayunName] || '';
  const d2 = domainMap[originalName] || '';

  if (d1 && d2 && d1 !== d2) {
    return `${d1}与${d2}联动加强`;
  }
  if (d1) {
    return `${d1}领域重点突出`;
  }
  return '';
}

export const dayunOverlayTool: AtomTool<DayunOverlayInput, DayunOverlayOutput> = {
  name: 'dayun-overlay',
  description: '大限叠宫分析：分析大限宫位与原局宫位的叠加关系、大限四化对原局的影响',
  category: 'ziwei',

  async execute(input: DayunOverlayInput): Promise<DayunOverlayOutput> {
    const { chart } = input;
    const dayunPalace = getPalaceByName(chart.palaces, input.dayunPalaceName);

    if (!dayunPalace) {
      return {
        dayunPalace: input.dayunPalaceName,
        overlayEffects: [],
        dayunSihua: [],
        summary: `未找到大限宫位"${input.dayunPalaceName}"`,
      };
    }

    const overlayEffects = computeOverlayEffects(dayunPalace.index, chart.palaces);
    const dayunSihua = computeDayunSihua(dayunPalace, chart.palaces);

    const parts: string[] = [];
    parts.push(`大限走${dayunPalace.name}`);

    const mainEffect = overlayEffects.find(e => e.originalPalace === dayunPalace.name);
    if (mainEffect) {
      parts.push(mainEffect.effect);
    }

    const crossEffects = overlayEffects.filter(e => e.originalPalace !== dayunPalace.name);
    for (const effect of crossEffects) {
      parts.push(effect.effect);
    }

    const luEntry = dayunSihua.find(s => s.includes('化禄'));
    if (luEntry) {
      parts.push(luEntry);
      parts.push('此十年事业运有提升');
    }

    const jiEntry = dayunSihua.find(s => s.includes('化忌'));
    if (jiEntry) {
      parts.push(jiEntry);
    }

    const summary = parts.join('；');

    return {
      dayunPalace: dayunPalace.name,
      overlayEffects,
      dayunSihua,
      summary,
    };
  },

  toPromptOutput(output: DayunOverlayOutput): string {
    return output.summary;
  },
};
