import { AtomTool } from '../types';
import {
  GAN,
  ZHI,
  WUXING_TIANGAN,
  WUXING_DIZHI,
  getShishen,
  getNayin,
} from '../../../calc-engine/bazi-engine/core/bazi-data.service';

export interface LiunianInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  liunianGan: string;
  liunianZhi: string;
}

export interface LiunianOutput {
  liunianGanZhi: string;
  tianganInteractions: string[];
  dizhiInteractions: string[];
  liunianShishen: string;
  nayin: string;
  overallEffect: '吉' | '平' | '凶';
  summary: string;
}

const TIANGAN_WUHE: Array<{ pair: [string, string]; result: string; name: string }> = [
  { pair: ['甲', '己'], result: '土', name: '甲己合化土' },
  { pair: ['乙', '庚'], result: '金', name: '乙庚合化金' },
  { pair: ['丙', '辛'], result: '水', name: '丙辛合化水' },
  { pair: ['丁', '壬'], result: '木', name: '丁壬合化木' },
  { pair: ['戊', '癸'], result: '火', name: '戊癸合化火' },
];

const DIZHI_LIUHE: Array<{ pair: [string, string]; name: string }> = [
  { pair: ['子', '丑'], name: '子丑合土' },
  { pair: ['寅', '亥'], name: '寅亥合木' },
  { pair: ['卯', '戌'], name: '卯戌合火' },
  { pair: ['辰', '酉'], name: '辰酉合金' },
  { pair: ['巳', '申'], name: '巳申合水' },
  { pair: ['午', '未'], name: '午未合火' },
];

const DIZHI_SANHE: Array<{ group: [string, string, string]; name: string }> = [
  { group: ['申', '子', '辰'], name: '申子辰合水局' },
  { group: ['亥', '卯', '未'], name: '亥卯未合木局' },
  { group: ['寅', '午', '戌'], name: '寅午戌合火局' },
  { group: ['巳', '酉', '丑'], name: '巳酉丑合金局' },
];

const DIZHI_LIUCHONG: Array<{ pair: [string, string]; name: string }> = [
  { pair: ['子', '午'], name: '子午冲' },
  { pair: ['丑', '未'], name: '丑未冲' },
  { pair: ['寅', '申'], name: '寅申冲' },
  { pair: ['卯', '酉'], name: '卯酉冲' },
  { pair: ['辰', '戌'], name: '辰戌冲' },
  { pair: ['巳', '亥'], name: '巳亥冲' },
];

const DIZHI_SANXING: Array<{ pair: [string, string]; name: string }> = [
  { pair: ['寅', '巳'], name: '寅巳刑' },
  { pair: ['巳', '申'], name: '巳申刑' },
  { pair: ['寅', '申'], name: '寅申刑' },
  { pair: ['丑', '戌'], name: '丑戌刑' },
  { pair: ['戌', '未'], name: '戌未刑' },
  { pair: ['丑', '未'], name: '丑未刑' },
  { pair: ['子', '卯'], name: '子卯刑' },
  { pair: ['辰', '辰'], name: '辰自刑' },
  { pair: ['午', '午'], name: '午自刑' },
  { pair: ['酉', '酉'], name: '酉自刑' },
  { pair: ['亥', '亥'], name: '亥自刑' },
];

const DIZHI_LIUHAI: Array<{ pair: [string, string]; name: string }> = [
  { pair: ['子', '未'], name: '子未害' },
  { pair: ['丑', '午'], name: '丑午害' },
  { pair: ['寅', '巳'], name: '寅巳害' },
  { pair: ['卯', '辰'], name: '卯辰害' },
  { pair: ['申', '亥'], name: '申亥害' },
  { pair: ['酉', '戌'], name: '酉戌害' },
];

const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

function checkTianganHe(gan1: string, gan2: string): string | null {
  for (const item of TIANGAN_WUHE) {
    if ((item.pair[0] === gan1 && item.pair[1] === gan2) ||
        (item.pair[0] === gan2 && item.pair[1] === gan1)) {
      return item.name;
    }
  }
  return null;
}

function checkTianganChong(gan1: string, gan2: string): boolean {
  const idx1 = GAN.indexOf(gan1);
  const idx2 = GAN.indexOf(gan2);
  if (idx1 < 0 || idx2 < 0) return false;
  return Math.abs(idx1 - idx2) === 6;
}

function analyzeTianganInteractions(
  liunianGan: string,
  pillarGans: Array<{ gan: string; position: string }>,
): string[] {
  const results: string[] = [];
  const liunianWu = WUXING_TIANGAN[liunianGan];

  for (const { gan, position } of pillarGans) {
    const heResult = checkTianganHe(liunianGan, gan);
    if (heResult) {
      results.push(`${heResult}（流年与${position}合）`);
      continue;
    }

    if (checkTianganChong(liunianGan, gan)) {
      results.push(`${liunianGan}${gan}冲（流年与${position}冲）`);
      continue;
    }

    const ganWu = WUXING_TIANGAN[gan];
    if (liunianWu && ganWu) {
      if (SHENG[liunianWu] === ganWu) {
        results.push(`流年${liunianGan}生${position}${gan}`);
      } else if (SHENG[ganWu] === liunianWu) {
        results.push(`${position}${gan}生流年${liunianGan}`);
      }
    }
  }

  return results;
}

function analyzeDizhiInteractions(
  liunianZhi: string,
  pillarZhis: Array<{ zhi: string; position: string }>,
  allZhis: string[],
): string[] {
  const results: string[] = [];

  for (const { zhi, position } of pillarZhis) {
    for (const item of DIZHI_LIUCHONG) {
      if ((item.pair[0] === liunianZhi && item.pair[1] === zhi) ||
          (item.pair[0] === zhi && item.pair[1] === liunianZhi)) {
        results.push(`${item.name}（流年与${position}冲）`);
      }
    }

    for (const item of DIZHI_LIUHE) {
      if ((item.pair[0] === liunianZhi && item.pair[1] === zhi) ||
          (item.pair[0] === zhi && item.pair[1] === liunianZhi)) {
        results.push(`${item.name}（流年与${position}合）`);
      }
    }

    for (const item of DIZHI_SANXING) {
      if ((item.pair[0] === liunianZhi && item.pair[1] === zhi) ||
          (item.pair[0] === zhi && item.pair[1] === liunianZhi)) {
        results.push(`${item.name}（流年与${position}刑）`);
      }
    }

    for (const item of DIZHI_LIUHAI) {
      if ((item.pair[0] === liunianZhi && item.pair[1] === zhi) ||
          (item.pair[0] === zhi && item.pair[1] === liunianZhi)) {
        results.push(`${item.name}（流年与${position}害）`);
      }
    }
  }

  for (const item of DIZHI_SANHE) {
    const combined = [...allZhis, liunianZhi];
    const matchCount = item.group.filter(z => combined.includes(z)).length;
    if (matchCount >= 2 && item.group.includes(liunianZhi)) {
      const present = item.group.filter(z => combined.includes(z));
      if (present.length >= 2) {
        results.push(`${item.name}（流年参与，已有${present.join('、')}）`);
      }
    }
  }

  return results;
}

function judgeOverallEffect(
  tianganInteractions: string[],
  dizhiInteractions: string[],
  liunianShishen: string,
): '吉' | '平' | '凶' {
  let score = 0;

  const allInteractions = [...tianganInteractions, ...dizhiInteractions];
  for (const item of allInteractions) {
    if (item.includes('合')) score += 2;
    if (item.includes('生')) score += 1;
    if (item.includes('冲')) score -= 2;
    if (item.includes('刑')) score -= 1;
    if (item.includes('害')) score -= 1;
  }

  const jiShishen = ['正财', '偏财', '正官', '正印', '食神', '正印'];
  const xiongShishen = ['七杀', '偏印', '伤官', '劫财'];
  if (jiShishen.includes(liunianShishen)) score += 1;
  if (xiongShishen.includes(liunianShishen)) score -= 1;

  if (score >= 2) return '吉';
  if (score <= -2) return '凶';
  return '平';
}

export const liunianTool: AtomTool<LiunianInput, LiunianOutput> = {
  name: 'liunian-interaction',
  description: '流年与命局交互：分析流年天干地支与命局的冲合害刑关系、流年十神、流年纳音及整体吉凶',
  category: 'bazi',

  async execute(input: LiunianInput): Promise<LiunianOutput> {
    const dayGan = input.dayPillar[0];
    const liunianGanZhi = input.liunianGan + input.liunianZhi;

    const pillarGans = [
      { gan: input.yearPillar[0], position: '年干' },
      { gan: input.monthPillar[0], position: '月干' },
      { gan: input.dayPillar[0], position: '日干' },
      { gan: input.hourPillar[0], position: '时干' },
    ];

    const pillarZhis = [
      { zhi: input.yearPillar[1], position: '年支' },
      { zhi: input.monthPillar[1], position: '月支' },
      { zhi: input.dayPillar[1], position: '日支' },
      { zhi: input.hourPillar[1], position: '时支' },
    ];

    const allZhis = pillarZhis.map(p => p.zhi);

    const tianganInteractions = analyzeTianganInteractions(input.liunianGan, pillarGans);
    const dizhiInteractions = analyzeDizhiInteractions(input.liunianZhi, pillarZhis, allZhis);
    const liunianShishen = getShishen(dayGan, input.liunianGan);
    const nayin = getNayin(liunianGanZhi);
    const overallEffect = judgeOverallEffect(tianganInteractions, dizhiInteractions, liunianShishen);

    const shishenDesc = getShishenDescription(liunianShishen);
    const effectLabel = overallEffect === '吉' ? '偏吉' : overallEffect === '凶' ? '偏凶' : '平稳';

    const tianganDesc = tianganInteractions.length > 0 ? tianganInteractions.join('，') : '无明显天干交互';
    const dizhiDesc = dizhiInteractions.length > 0 ? dizhiInteractions.join('，') : '无明显地支交互';

    const summary = `流年${liunianGanZhi}，天干${input.liunianGan}与日主${dayGan}为${liunianShishen}${shishenDesc}，${dizhiDesc}，流年${liunianShishen}主${getShishenDomain(liunianShishen)}，整体${effectLabel}`;

    return {
      liunianGanZhi,
      tianganInteractions,
      dizhiInteractions,
      liunianShishen,
      nayin,
      overallEffect,
      summary,
    };
  },

  toPromptOutput(output: LiunianOutput): string {
    return output.summary;
  },
};

function getShishenDescription(shishen: string): string {
  const map: Record<string, string> = {
    '比肩': '同类帮身', '劫财': '争财夺利',
    '食神': '才华展现', '伤官': '叛逆创新',
    '偏财': '意外之财', '正财': '稳定收入',
    '七杀': '压力挑战', '正官': '正统管束',
    '偏印': '偏门学识', '正印': '学业贵人',
  };
  return map[shishen] || '';
}

function getShishenDomain(shishen: string): string {
  const map: Record<string, string> = {
    '比肩': '竞争合作', '劫财': '竞争破耗',
    '食神': '才艺享乐', '伤官': '变革口舌',
    '偏财': '投资偏门', '正财': '薪酬理财',
    '七杀': '事业压力', '正官': '升迁名誉',
    '偏印': '学习进修', '正印': '学业贵人',
  };
  return map[shishen] || '日常事务';
}
