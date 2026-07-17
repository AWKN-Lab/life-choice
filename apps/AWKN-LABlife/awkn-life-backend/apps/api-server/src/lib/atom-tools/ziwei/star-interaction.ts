import { AtomTool } from '../types';
import {
  ZiweiChartInput,
  ZiweiPalaceData,
  STAR_WUXING,
} from './ziwei-types';

export interface StarInteractionInput {
  chart: ZiweiChartInput;
}

export interface StarInteraction {
  stars: string[];
  relation: string;
  effect: string;
}

export interface StarInteractionOutput {
  interactions: StarInteraction[];
  summary: string;
}

const WUXING_SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

const WUXING_KE: Record<string, string> = {
  '木': '土', '火': '金', '土': '水', '金': '木', '水': '火',
};

function getRelation(wx1: string, wx2: string): string {
  if (wx1 === wx2) return '比和';
  if (WUXING_SHENG[wx1] === wx2) return '我生';
  if (WUXING_SHENG[wx2] === wx1) return '生我';
  if (WUXING_KE[wx1] === wx2) return '我克';
  if (WUXING_KE[wx2] === wx1) return '克我';
  return '无直接关系';
}

function describeRelation(star1: string, wx1: string, star2: string, wx2: string, relation: string): string {
  switch (relation) {
    case '比和':
      return `${star1}(${wx1})与${star2}(${wx2})同宫比和，增强稳定性`;
    case '我生':
      return `${star1}(${wx1})生${star2}(${wx2})为泄气，力量外泄`;
    case '生我':
      return `${star2}(${wx2})生${star1}(${wx1})为得助，力量增强`;
    case '我克':
      return `${star1}(${wx1})克${star2}(${wx2})为制约，控制力强`;
    case '克我':
      return `${star2}(${wx2})克${star1}(${wx1})为受制，力量受限`;
    default:
      return `${star1}(${wx1})与${star2}(${wx2})无直接生克`;
  }
}

const AUSPICIOUS_PAIRS: Array<{ stars: [string, string]; effect: string }> = [
  { stars: ['左辅', '右弼'], effect: '辅弼夹/同宫，助力倍增，贵人运旺' },
  { stars: ['天魁', '天钺'], effect: '魁钺夹/同宫，贵人星聚，逢凶化吉' },
  { stars: ['文昌', '文曲'], effect: '昌曲同宫，文才出众，利考试文职' },
  { stars: ['禄存', '天马'], effect: '禄马交驰，财运亨通，利远方求财' },
];

const INAUSPICIOUS_PAIRS: Array<{ stars: [string, string]; effect: string }> = [
  { stars: ['擎羊', '陀罗'], effect: '羊陀夹/同宫，刑伤阻碍，需防意外' },
  { stars: ['火星', '铃星'], effect: '火铃夹/同宫，暴躁冲动，波折较多' },
  { stars: ['地空', '地劫'], effect: '空劫夹/同宫，虚耗破财，精神困扰' },
];

function checkSpecialPairs(starNames: string[]): StarInteraction[] {
  const results: StarInteraction[] = [];
  const nameSet = new Set(starNames);

  for (const pair of AUSPICIOUS_PAIRS) {
    if (pair.stars.every((s) => nameSet.has(s))) {
      results.push({
        stars: [...pair.stars],
        relation: '吉星组合',
        effect: pair.effect,
      });
    }
  }

  for (const pair of INAUSPICIOUS_PAIRS) {
    if (pair.stars.every((s) => nameSet.has(s))) {
      results.push({
        stars: [...pair.stars],
        relation: '凶星组合',
        effect: pair.effect,
      });
    }
  }

  return results;
}

function analyzePalaceInteractions(palace: ZiweiPalaceData): StarInteraction[] {
  const interactions: StarInteraction[] = [];
  const majorStars = palace.majorStars.filter((s) => STAR_WUXING[s.name]);

  for (let i = 0; i < majorStars.length; i++) {
    for (let j = i + 1; j < majorStars.length; j++) {
      const s1 = majorStars[i];
      const s2 = majorStars[j];
      const wx1 = STAR_WUXING[s1.name];
      const wx2 = STAR_WUXING[s2.name];
      if (!wx1 || !wx2) continue;

      const relation = getRelation(wx1, wx2);
      if (relation === '无直接关系') continue;

      interactions.push({
        stars: [s1.name, s2.name],
        relation,
        effect: describeRelation(s1.name, wx1, s2.name, wx2, relation),
      });
    }
  }

  const allStarNames = [
    ...palace.majorStars.map((s) => s.name),
    ...palace.minorStars.map((s) => s.name),
  ];
  interactions.push(...checkSpecialPairs(allStarNames));

  return interactions;
}

export const starInteraction: AtomTool<StarInteractionInput, StarInteractionOutput> = {
  name: 'star-interaction',
  description: '星曜生克关系：主星之间的五行生克关系、吉凶星组合',
  category: 'ziwei',

  async execute(input: StarInteractionInput): Promise<StarInteractionOutput> {
    const { chart } = input;
    const allInteractions: StarInteraction[] = [];
    const seen = new Set<string>();

    for (const palace of chart.palaces) {
      const palaceInteractions = analyzePalaceInteractions(palace);
      for (const interaction of palaceInteractions) {
        const key = [...interaction.stars].sort().join('+') + '|' + interaction.relation;
        if (!seen.has(key)) {
          seen.add(key);
          allInteractions.push(interaction);
        }
      }
    }

    const summaryParts: string[] = [];
    for (const interaction of allInteractions) {
      summaryParts.push(interaction.effect);
    }

    const summary = summaryParts.length > 0
      ? summaryParts.join('；')
      : '无显著星曜生克关系';

    return { interactions: allInteractions, summary };
  },

  toPromptOutput(output: StarInteractionOutput): string {
    return output.summary;
  },
};
