import { AtomTool } from '../types';

export interface CareerFitInput {
  shishenDistribution: Record<string, number>;
  dominantShishen: string;
  minggongStars: string[];
  minggongCombination: string;
  careerCategory: CareerCategory;
}

export type CareerCategory =
  | 'management'
  | 'creative'
  | 'finance'
  | 'technology'
  | 'education'
  | 'service'
  | 'sales'
  | 'legal'
  | 'medical'
  | 'art';

export interface CareerFitOutput {
  score: number;
  fitLevel: '极佳' | '适合' | '一般' | '不太适合' | '不建议';
  matchedFactors: string[];
  unmatchedFactors: string[];
  summary: string;
}

const CAREER_SHISHEN_FIT: Record<CareerCategory, Record<string, number>> = {
  management: { '官杀': 10, '印': 6, '比劫': 4, '财': 5, '食伤': 2 },
  creative: { '食伤': 10, '财': 5, '比劫': 3, '印': 4, '官杀': 1 },
  finance: { '财': 10, '官杀': 5, '食伤': 4, '印': 3, '比劫': 2 },
  technology: { '印': 9, '食伤': 7, '比劫': 4, '官杀': 3, '财': 2 },
  education: { '印': 9, '食伤': 6, '官杀': 5, '比劫': 3, '财': 2 },
  service: { '食伤': 7, '财': 5, '印': 5, '比劫': 4, '官杀': 3 },
  sales: { '食伤': 8, '财': 7, '比劫': 5, '官杀': 2, '印': 1 },
  legal: { '官杀': 9, '印': 6, '比劫': 4, '食伤': 3, '财': 3 },
  medical: { '印': 8, '食伤': 6, '官杀': 5, '比劫': 3, '财': 2 },
  art: { '食伤': 10, '印': 5, '财': 4, '比劫': 3, '官杀': 0 },
};

const CAREER_STAR_FIT: Record<CareerCategory, Record<string, number>> = {
  management: { '紫微': 10, '天府': 8, '太阳': 7, '天相': 7, '武曲': 6 },
  creative: { '贪狼': 8, '天机': 7, '廉贞': 6, '破军': 6, '太阴': 5 },
  finance: { '武曲': 10, '天府': 8, '太阴': 8, '天相': 6, '禄存': 7 },
  technology: { '天机': 9, '太阴': 6, '天梁': 5, '巨门': 5, '文曲': 5 },
  education: { '天梁': 9, '太阳': 8, '天机': 6, '文曲': 6, '天同': 5 },
  service: { '天同': 8, '天相': 7, '天梁': 6, '太阳': 5, '太阴': 5 },
  sales: { '贪狼': 9, '巨门': 7, '廉贞': 6, '太阳': 5, '武曲': 5 },
  legal: { '廉贞': 9, '七杀': 6, '天梁': 6, '太阳': 5, '紫微': 5 },
  medical: { '天梁': 9, '太阴': 6, '天同': 5, '天机': 5, '巨门': 4 },
  art: { '太阴': 9, '贪狼': 7, '天机': 6, '文曲': 7, '廉贞': 5 },
};

const CAREER_LABEL: Record<CareerCategory, string> = {
  management: '管理类', creative: '创意类', finance: '金融财务类',
  technology: '技术类', education: '教育类', service: '服务类',
  sales: '销售类', legal: '法律类', medical: '医疗类', art: '艺术类',
};

const SHISHEN_TRAIT: Record<string, string> = {
  '比劫': '自我意识强，竞争心重',
  '食伤': '才华外露，表达欲强',
  '财': '务实重利，善于经营',
  '官杀': '事业心强，重规矩权威',
  '印': '重学习思考，依赖性强',
};

function classifyFitLevel(score: number): CareerFitOutput['fitLevel'] {
  if (score >= 80) return '极佳';
  if (score >= 60) return '适合';
  if (score >= 40) return '一般';
  if (score >= 20) return '不太适合';
  return '不建议';
}

export const careerFitTool: AtomTool<CareerFitInput, CareerFitOutput> = {
  name: 'career-fit',
  description: '职业适配度评分：基于八字十神分布与紫微命宫主星，评估目标职业类别的匹配度',
  category: 'decision',

  async execute(input: CareerFitInput): Promise<CareerFitOutput> {
    const { shishenDistribution, dominantShishen, minggongStars, minggongCombination, careerCategory } = input;
    const matchedFactors: string[] = [];
    const unmatchedFactors: string[] = [];

    const shishenFitMap = CAREER_SHISHEN_FIT[careerCategory];
    let shishenScore = 0;
    let shishenMax = 0;

    const categories = Object.keys(shishenDistribution) as string[];
    for (const cat of categories) {
      const count = shishenDistribution[cat] || 0;
      if (count <= 0) continue;
      const fit = shishenFitMap[cat] ?? 5;
      shishenScore += count * fit;
      shishenMax += count * 10;
    }

    if (shishenMax === 0) shishenMax = 1;
    const shishenPct = (shishenScore / shishenMax) * 60;

    const topShishen = [...categories]
      .sort((a, b) => (shishenDistribution[b] || 0) - (shishenDistribution[a] || 0))
      .slice(0, 2);

    for (const cat of topShishen) {
      const fit = shishenFitMap[cat] ?? 5;
      if (fit >= 7) {
        matchedFactors.push(`${cat}主导（${SHISHEN_TRAIT[cat] || ''}），利${CAREER_LABEL[careerCategory]}职业`);
      } else if (fit <= 3) {
        unmatchedFactors.push(`${cat}偏重（${SHISHEN_TRAIT[cat] || ''}），与${CAREER_LABEL[careerCategory]}职业匹配度低`);
      }
    }

    const starFitMap = CAREER_STAR_FIT[careerCategory];
    let starScore = 0;
    let starMax = 0;

    for (const star of minggongStars) {
      const fit = starFitMap[star] ?? 5;
      starScore += fit;
      starMax += 10;
      if (fit >= 7) {
        matchedFactors.push(`命宫${star}坐镇，利${CAREER_LABEL[careerCategory]}发展`);
      } else if (fit <= 3) {
        unmatchedFactors.push(`命宫${star}与${CAREER_LABEL[careerCategory]}方向不太匹配`);
      }
    }

    if (starMax === 0) starMax = 1;
    const starPct = (starScore / starMax) * 30;

    let comboBonus = 10;
    const comboStr = minggongCombination || '';
    if (careerCategory === 'management' && (comboStr.includes('紫府') || comboStr.includes('紫杀'))) {
      comboBonus = 25;
      matchedFactors.push(`${comboStr.split('，')[0]}格局，领导力极强`);
    } else if (careerCategory === 'creative' && (comboStr.includes('紫贪') || comboStr.includes('廉贪'))) {
      comboBonus = 25;
      matchedFactors.push(`${comboStr.split('，')[0]}格局，创意欲望旺盛`);
    } else if (careerCategory === 'finance' && (comboStr.includes('武府') || comboStr.includes('武相'))) {
      comboBonus = 25;
      matchedFactors.push(`${comboStr.split('，')[0]}格局，理财能力突出`);
    } else if (careerCategory === 'technology' && comboStr.includes('机阴')) {
      comboBonus = 22;
      matchedFactors.push('机阴同宫格局，聪慧内敛善谋略');
    } else if (minggongStars.length === 0) {
      comboBonus = 5;
      unmatchedFactors.push('命宫空宫，职业方向需借对宫参考');
    }

    const rawScore = shishenPct + starPct + comboBonus;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const fitLevel = classifyFitLevel(score);

    const matchStr = matchedFactors.length > 0 ? matchedFactors.join('；') : '无明显匹配因素';
    const unmatchStr = unmatchedFactors.length > 0 ? unmatchedFactors.join('；') : '';
    const summary = `${CAREER_LABEL[careerCategory]}职业适配度${score}分（${fitLevel}），${matchStr}${unmatchStr ? '；但' + unmatchStr : ''}`;

    return { score, fitLevel, matchedFactors, unmatchedFactors, summary };
  },

  toPromptOutput(output: CareerFitOutput): string {
    const matchStr = output.matchedFactors.join('；');
    const unmatchStr = output.unmatchedFactors.length > 0 ? `；但${output.unmatchedFactors.join('；')}` : '';
    return `${matchStr}${unmatchStr}→适配度${output.score}分（${output.fitLevel}）`;
  },
};
