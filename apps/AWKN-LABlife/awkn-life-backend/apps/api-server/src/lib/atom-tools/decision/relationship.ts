import { AtomTool } from '../types';

export interface PartyBaziData {
  dayGan: string;
  dayGanWuxing: string;
  shishenDistribution: Record<string, number>;
  dominantShishen: string;
}

export interface PartyZiweiData {
  couplePalaceStars: string[];
  couplePalaceJi: boolean;
  couplePalaceLu: boolean;
}

export interface RelationshipInput {
  partyA: {
    bazi: PartyBaziData;
    ziwei: PartyZiweiData;
  };
  partyB: {
    bazi: PartyBaziData;
    ziwei: PartyZiweiData;
  };
}

export interface RelationshipOutput {
  score: number;
  fitLevel: '极佳' | '和谐' | '一般' | '需磨合' | '不建议';
  elementRelation: string;
  complementaryFactors: string[];
  conflictFactors: string[];
  summary: string;
}

const WUXING_SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};
const WUXING_KE: Record<string, string> = {
  '木': '土', '火': '金', '土': '水', '金': '木', '水': '火',
};

function getElementRelation(aWu: string, bWu: string): { relation: string; score: number } {
  if (aWu === bWu) return { relation: '比和（同类互助）', score: 7 };
  if (WUXING_SHENG[aWu] === bWu) return { relation: `${aWu}生${bWu}（A付出型）`, score: 5 };
  if (WUXING_SHENG[bWu] === aWu) return { relation: `${bWu}生${aWu}（A受助型）`, score: 6 };
  if (WUXING_KE[aWu] === bWu) return { relation: `${aWu}克${bWu}（A主导型）`, score: 4 };
  if (WUXING_KE[bWu] === aWu) return { relation: `${bWu}克${aWu}（B主导型）`, score: 4 };
  return { relation: '无直接生克', score: 5 };
}

const SHISHEN_COMPLEMENT: Record<string, string[]> = {
  '官杀': ['食伤', '印'],
  '食伤': ['官杀', '财'],
  '财': ['比劫', '食伤'],
  '比劫': ['财', '官杀'],
  '印': ['食伤', '比劫'],
};

const SHISHEN_CONFLICT: Record<string, string[]> = {
  '官杀': ['比劫'],
  '比劫': ['官杀', '财'],
  '食伤': ['印'],
  '印': ['食伤'],
  '财': ['比劫'],
};

const COUPLE_PALACE_AUSPICIOUS = ['天同', '天梁', '太阳', '太阴', '天府', '天相', '禄存'];
const COUPLE_PALACE_INAUSPICIOUS = ['七杀', '破军', '贪狼', '廉贞', '巨门', '擎羊', '陀罗', '火星', '铃星'];

function classifyFitLevel(score: number): RelationshipOutput['fitLevel'] {
  if (score >= 80) return '极佳';
  if (score >= 65) return '和谐';
  if (score >= 45) return '一般';
  if (score >= 25) return '需磨合';
  return '不建议';
}

export const relationshipTool: AtomTool<RelationshipInput, RelationshipOutput> = {
  name: 'relationship-fit',
  description: '关系契合度评分：基于双方日主五行生克、十神互补性、紫微夫妻宫星曜评估关系契合度',
  category: 'decision',

  async execute(input: RelationshipInput): Promise<RelationshipOutput> {
    const { partyA, partyB } = input;
    let score = 50;
    const complementaryFactors: string[] = [];
    const conflictFactors: string[] = [];

    const aWu = partyA.bazi.dayGanWuxing;
    const bWu = partyB.bazi.dayGanWuxing;
    const { relation: elementRelation, score: elementScore } = getElementRelation(aWu, bWu);

    score += (elementScore - 5) * 4;
    if (elementScore >= 6) {
      complementaryFactors.push(`日主五行${elementRelation}，天然亲近`);
    } else if (elementScore <= 4) {
      conflictFactors.push(`日主五行${elementRelation}，权力需平衡`);
    } else {
      complementaryFactors.push(`日主五行${elementRelation}，平顺相处`);
    }

    const aDom = partyA.bazi.dominantShishen;
    const bDom = partyB.bazi.dominantShishen;

    const aComplements = SHISHEN_COMPLEMENT[aDom] || [];
    if (aComplements.includes(bDom)) {
      score += 8;
      complementaryFactors.push(`A方${aDom}主导与B方${bDom}主导互补，性格配合好`);
    }

    const bComplements = SHISHEN_COMPLEMENT[bDom] || [];
    if (bComplements.includes(aDom)) {
      score += 8;
      complementaryFactors.push(`B方${bDom}主导与A方${aDom}主导互补，互相成就`);
    }

    const aConflicts = SHISHEN_CONFLICT[aDom] || [];
    if (aConflicts.includes(bDom)) {
      score -= 6;
      conflictFactors.push(`A方${aDom}主导与B方${bDom}主导冲突，易生分歧`);
    }

    const bConflicts = SHISHEN_CONFLICT[bDom] || [];
    if (bConflicts.includes(aDom)) {
      score -= 6;
      conflictFactors.push(`B方${bDom}主导与A方${aDom}主导冲突，需注意沟通`);
    }

    if (aDom === bDom) {
      score += 3;
      complementaryFactors.push(`双方均${aDom}主导，价值观相近`);
    }

    const aCoupleStars = partyA.ziwei.couplePalaceStars;
    const bCoupleStars = partyB.ziwei.couplePalaceStars;

    const aAuspicious = aCoupleStars.filter(s => COUPLE_PALACE_AUSPICIOUS.includes(s));
    const aInauspicious = aCoupleStars.filter(s => COUPLE_PALACE_INAUSPICIOUS.includes(s));
    const bAuspicious = bCoupleStars.filter(s => COUPLE_PALACE_AUSPICIOUS.includes(s));
    const bInauspicious = bCoupleStars.filter(s => COUPLE_PALACE_INAUSPICIOUS.includes(s));

    score += aAuspicious.length * 3;
    score -= aInauspicious.length * 3;
    score += bAuspicious.length * 3;
    score -= bInauspicious.length * 3;

    if (aAuspicious.length > 0) {
      complementaryFactors.push(`A方夫妻宫${aAuspicious.join('+')}，感情运顺`);
    }
    if (aInauspicious.length > 0) {
      conflictFactors.push(`A方夫妻宫${aInauspicious.join('+')}，感情多波折`);
    }
    if (bAuspicious.length > 0) {
      complementaryFactors.push(`B方夫妻宫${bAuspicious.join('+')}，感情运顺`);
    }
    if (bInauspicious.length > 0) {
      conflictFactors.push(`B方夫妻宫${bInauspicious.join('+')}，感情多波折`);
    }

    if (partyA.ziwei.couplePalaceJi) {
      score -= 5;
      conflictFactors.push('A方夫妻宫化忌，感情易受阻碍');
    }
    if (partyA.ziwei.couplePalaceLu) {
      score += 4;
      complementaryFactors.push('A方夫妻宫化禄，感情有助力');
    }
    if (partyB.ziwei.couplePalaceJi) {
      score -= 5;
      conflictFactors.push('B方夫妻宫化忌，感情易受阻碍');
    }
    if (partyB.ziwei.couplePalaceLu) {
      score += 4;
      complementaryFactors.push('B方夫妻宫化禄，感情有助力');
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const fitLevel = classifyFitLevel(score);

    const compStr = complementaryFactors.length > 0 ? complementaryFactors.join('；') : '';
    const confStr = conflictFactors.length > 0 ? conflictFactors.join('；') : '';
    const summary = `关系契合度${score}分（${fitLevel}），日主${aWu}${elementRelation.includes('生') ? '生' : elementRelation.includes('克') ? '克' : '与'}${bWu}为${elementRelation.split('（')[1]?.replace('）', '') || elementRelation}${compStr ? '，' + compStr : ''}${confStr ? '，需注意：' + confStr : ''}`;

    return { score, fitLevel, elementRelation, complementaryFactors, conflictFactors, summary };
  },

  toPromptOutput(output: RelationshipOutput): string {
    const compStr = output.complementaryFactors.join('；');
    const confStr = output.conflictFactors.length > 0 ? `；需注意：${output.conflictFactors.join('；')}` : '';
    return `关系契合度${output.score}分（${output.fitLevel}），${output.elementRelation}${compStr ? '，' + compStr : ''}${confStr}`;
  },
};
