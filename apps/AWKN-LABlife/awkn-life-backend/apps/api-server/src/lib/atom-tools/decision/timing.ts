import { AtomTool } from '../types';

export interface BaziDayunData {
  dayGan: string;
  dayZhi: string;
  dayunGan: string;
  dayunZhi: string;
  liunianGan: string;
  liunianZhi: string;
  dayunShishen: string;
  pillarZhis: string[];
}

export interface ZiweiDaxianData {
  daxianPalace: string;
  daxianStars: string[];
  liunianPalace: string;
  liunianStars: string[];
  liunianJiPalace: string;
  liunianJiStar: string;
  liunianLuPalace: string;
  liunianLuStar: string;
}

export type DecisionType = 'career' | 'investment' | 'relationship' | 'relocation' | 'general';

export interface TimingInput {
  bazi: BaziDayunData;
  ziwei: ZiweiDaxianData;
  decisionType: DecisionType;
}

export interface TimingOutput {
  score: number;
  level: '极佳' | '适宜' | '一般' | '不宜' | '大忌';
  factors: string[];
  summary: string;
}

const TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const CHONG_PAIRS: Record<string, string> = {
  '子午': '子午冲', '丑未': '丑未冲', '寅申': '寅申冲',
  '卯酉': '卯酉冲', '辰戌': '辰戌冲', '巳亥': '巳亥冲',
};

const HE_PAIRS: Record<string, string> = {
  '子丑': '子丑合', '寅亥': '寅亥合', '卯戌': '卯戌合',
  '辰酉': '辰酉合', '巳申': '巳申合', '午未': '午未合',
};

const SANHE_MAP: Record<string, string[]> = {
  '申': ['申子辰', '水局'], '子': ['申子辰', '水局'], '辰': ['申子辰', '水局'],
  '亥': ['亥卯未', '木局'], '卯': ['亥卯未', '木局'], '未': ['亥卯未', '木局'],
  '寅': ['寅午戌', '火局'], '午': ['寅午戌', '火局'], '戌': ['寅午戌', '火局'],
  '巳': ['巳酉丑', '金局'], '酉': ['巳酉丑', '金局'], '丑': ['巳酉丑', '金局'],
};

const SHISHEN_TIMING_SCORE: Record<string, number> = {
  '正财': 8, '偏财': 7, '正官': 8, '七杀': 4,
  '食神': 8, '伤官': 3, '正印': 7, '偏印': 5,
  '比肩': 5, '劫财': 3, '日主': 6,
};

const DECISION_TYPE_BONUS: Record<DecisionType, Record<string, number>> = {
  career: { '正官': 3, '七杀': 1, '正印': 2, '偏印': 1 },
  investment: { '正财': 3, '偏财': 3, '食神': 2, '伤官': -1 },
  relationship: { '正财': 2, '正官': 2, '食神': 2, '伤官': -2 },
  relocation: { '偏财': 2, '七杀': 1, '食神': 2, '正印': -1 },
  general: {},
};

function checkChong(zhi1: string, zhi2: string): string | null {
  const idx1 = DIZHI.indexOf(zhi1);
  const idx2 = DIZHI.indexOf(zhi2);
  const pair = idx1 < idx2 ? zhi1 + zhi2 : zhi2 + zhi1;
  return CHONG_PAIRS[pair] || null;
}

function checkHe(zhi1: string, zhi2: string): string | null {
  const idx1 = DIZHI.indexOf(zhi1);
  const idx2 = DIZHI.indexOf(zhi2);
  const pair = idx1 < idx2 ? zhi1 + zhi2 : zhi2 + zhi1;
  return HE_PAIRS[pair] || null;
}

function checkSanhe(zhi1: string, zhi2: string): string | null {
  const info1 = SANHE_MAP[zhi1];
  const info2 = SANHE_MAP[zhi2];
  if (info1 && info2 && info1[0] === info2[0]) {
    return `${info1[0]}${info1[1]}`;
  }
  return null;
}

function classifyLevel(score: number): TimingOutput['level'] {
  if (score >= 80) return '极佳';
  if (score >= 60) return '适宜';
  if (score >= 40) return '一般';
  if (score >= 20) return '不宜';
  return '大忌';
}

export const timingTool: AtomTool<TimingInput, TimingOutput> = {
  name: 'decision-timing',
  description: '决策时机适宜度评分：综合八字大运流年冲合关系与紫微大限四化，评估当前时机是否适合做决策',
  category: 'decision',

  async execute(input: TimingInput): Promise<TimingOutput> {
    const { bazi, ziwei, decisionType } = input;
    let score = 50;
    const factors: string[] = [];

    const shishenScore = SHISHEN_TIMING_SCORE[bazi.dayunShishen] || 5;
    score += (shishenScore - 5) * 3;
    factors.push(`大运${bazi.dayunShishen}透干（${shishenScore >= 6 ? '利' : '不利'}决策）`);

    const typeBonus = DECISION_TYPE_BONUS[decisionType];
    const bonus = typeBonus[bazi.dayunShishen] || 0;
    if (bonus !== 0) {
      score += bonus * 2;
      factors.push(`${decisionType === 'career' ? '事业' : decisionType === 'investment' ? '投资' : decisionType === 'relationship' ? '感情' : decisionType === 'relocation' ? '迁动' : '综合'}型决策，大运${bazi.dayunShishen}${bonus > 0 ? '加分' : '减分'}`);
    }

    const liunianChong = checkChong(bazi.liunianZhi, bazi.dayZhi);
    if (liunianChong) {
      score -= 12;
      factors.push(`流年${liunianChong}，变动剧烈`);
    }

    const liunianHe = checkHe(bazi.liunianZhi, bazi.dayZhi);
    if (liunianHe) {
      score += 8;
      factors.push(`流年${liunianHe}，助力明显`);
    }

    const liunianSanhe = checkSanhe(bazi.liunianZhi, bazi.dayZhi);
    if (liunianSanhe) {
      score += 10;
      factors.push(`流年与命局${liunianSanhe}，三合助力`);
    }

    for (const zhi of bazi.pillarZhis) {
      const chong = checkChong(bazi.liunianZhi, zhi);
      if (chong && chong !== liunianChong) {
        score -= 6;
        factors.push(`流年${chong}，冲击命局`);
        break;
      }
    }

    if (ziwei.liunianLuPalace) {
      score += 6;
      factors.push(`流年化禄在${ziwei.liunianLuPalace}（${ziwei.liunianLuStar}），财运助力`);
    }

    if (ziwei.liunianJiPalace) {
      score -= 10;
      const isRelocation = ziwei.liunianJiPalace === '迁移宫';
      factors.push(`化忌入${ziwei.liunianJiPalace}（${ziwei.liunianJiStar}），${isRelocation ? '需防变动' : '需防阻碍'}`);
    }

    const daxianCareerStars = ['紫微', '天府', '太阳', '武曲', '天相'];
    const hasDaxianCareer = ziwei.daxianStars.some(s => daxianCareerStars.includes(s));
    if (hasDaxianCareer && decisionType === 'career') {
      score += 5;
      factors.push('大限逢紫府阳武相等事业星，事业运旺');
    }

    const daxianWealthStars = ['太阴', '天府', '武曲', '禄存'];
    const hasDaxianWealth = ziwei.daxianStars.some(s => daxianWealthStars.includes(s));
    if (hasDaxianWealth && decisionType === 'investment') {
      score += 5;
      factors.push('大限逢财星，投资运旺');
    }

    if (ziwei.liunianPalace === '命宫' || ziwei.liunianPalace === '官禄宫') {
      score += 4;
      factors.push(`流年入${ziwei.liunianPalace}，主事宫位发力`);
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = classifyLevel(score);

    const summary = `决策时机评分${score}分（${level}），${factors.slice(0, 3).join('；')}`;

    return { score, level, factors, summary };
  },

  toPromptOutput(output: TimingOutput): string {
    return `决策时机评分${output.score}分（${output.level}），${output.factors.join('；')}`;
  },
};
