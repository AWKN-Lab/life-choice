import { AtomTool } from '../types';
import { GAN } from '../../../calc-engine/bazi-engine/core/bazi-data.service';

export interface ChongHeInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface TianGanHeItem {
  gans: string[];
  type: string;
  effect: string;
}

export interface ChongHeOutput {
  tianGanHe: TianGanHeItem[];
  diZhiLiuHe: string[];
  diZhiSanHe: string[];
  diZhiLiuChong: string[];
  diZhiSanXing: string[];
  diZhiLiuHai: string[];
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

const DIZHI_BANHE: Array<{ pair: [string, string]; name: string }> = [
  { pair: ['申', '子'], name: '申子半合水局' },
  { pair: ['子', '辰'], name: '子辰半合水局' },
  { pair: ['申', '辰'], name: '申辰半合水局（拱水）' },
  { pair: ['亥', '卯'], name: '亥卯半合木局' },
  { pair: ['卯', '未'], name: '卯未半合木局' },
  { pair: ['亥', '未'], name: '亥未半合木局（拱木）' },
  { pair: ['寅', '午'], name: '寅午半合火局' },
  { pair: ['午', '戌'], name: '午戌半合火局' },
  { pair: ['寅', '戌'], name: '寅戌半合火局（拱火）' },
  { pair: ['巳', '酉'], name: '巳酉半合金局' },
  { pair: ['酉', '丑'], name: '酉丑半合金局' },
  { pair: ['巳', '丑'], name: '巳丑半合金局（拱金）' },
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

const PILLAR_LABELS = ['年', '月', '日', '时'] as const;

function matchPair(zhi1: string, zhi2: string, pair: [string, string]): boolean {
  return (pair[0] === zhi1 && pair[1] === zhi2) || (pair[0] === zhi2 && pair[1] === zhi1);
}

function findTianGanHe(
  gans: Array<{ gan: string; position: string }>,
): TianGanHeItem[] {
  const results: TianGanHeItem[] = [];
  const used = new Set<number>();

  for (let i = 0; i < gans.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < gans.length; j++) {
      if (used.has(j)) continue;
      const g1 = gans[i].gan;
      const g2 = gans[j].gan;
      for (const item of TIANGAN_WUHE) {
        if ((item.pair[0] === g1 && item.pair[1] === g2) ||
            (item.pair[0] === g2 && item.pair[1] === g1)) {
          used.add(i);
          used.add(j);
          results.push({
            gans: [g1, g2],
            type: item.name,
            effect: `${gans[i].position}${gans[j].position}合，化${item.result}`,
          });
          break;
        }
      }
    }
  }

  return results;
}

function findDiZhiLiuHe(
  zhis: Array<{ zhi: string; position: string }>,
): string[] {
  const results: string[] = [];
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const item of DIZHI_LIUHE) {
        if (matchPair(zhis[i].zhi, zhis[j].zhi, item.pair)) {
          results.push(`${item.name}（${zhis[i].position}${zhis[j].position}合）`);
        }
      }
    }
  }
  return results;
}

function findDiZhiSanHe(
  zhis: Array<{ zhi: string; position: string }>,
): string[] {
  const results: string[] = [];
  const zhiValues = zhis.map(z => z.zhi);
  const positionMap = new Map(zhis.map(z => [z.zhi, z.position]));

  for (const item of DIZHI_SANHE) {
    const present = item.group.filter(z => zhiValues.includes(z));
    if (present.length === 3) {
      const positions = item.group.map(z => positionMap.get(z) || z).join('');
      results.push(`${item.name}（${positions}三合全）`);
    }
  }

  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const item of DIZHI_BANHE) {
        if (matchPair(zhis[i].zhi, zhis[j].zhi, item.pair)) {
          const sanheMatch = DIZHI_SANHE.find(sh => sh.group.includes(item.pair[0]) && sh.group.includes(item.pair[1]));
          const isFull = sanheMatch
            ? sanheMatch.group.every(z => zhiValues.includes(z))
            : false;
          if (!isFull) {
            results.push(`${item.name}（${zhis[i].position}${zhis[j].position}合）`);
          }
        }
      }
    }
  }

  return results;
}

function findDiZhiLiuChong(
  zhis: Array<{ zhi: string; position: string }>,
): string[] {
  const results: string[] = [];
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const item of DIZHI_LIUCHONG) {
        if (matchPair(zhis[i].zhi, zhis[j].zhi, item.pair)) {
          results.push(`${item.name}（${zhis[i].position}${zhis[j].position}冲）`);
        }
      }
    }
  }
  return results;
}

function findDiZhiSanXing(
  zhis: Array<{ zhi: string; position: string }>,
): string[] {
  const results: string[] = [];
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const item of DIZHI_SANXING) {
        if (matchPair(zhis[i].zhi, zhis[j].zhi, item.pair)) {
          results.push(`${item.name}（${zhis[i].position}${zhis[j].position}刑）`);
        }
      }
    }
  }

  const zhiValues = zhis.map(z => z.zhi);
  for (const item of DIZHI_SANXING) {
    if (item.pair[0] === item.pair[1]) {
      const count = zhiValues.filter(z => z === item.pair[0]).length;
      if (count >= 2) {
        const positions = zhis.filter(z => z.zhi === item.pair[0]).map(z => z.position).join('');
        results.push(`${item.name}（${positions}自刑）`);
      }
    }
  }

  return results;
}

function findDiZhiLiuHai(
  zhis: Array<{ zhi: string; position: string }>,
): string[] {
  const results: string[] = [];
  for (let i = 0; i < zhis.length; i++) {
    for (let j = i + 1; j < zhis.length; j++) {
      for (const item of DIZHI_LIUHAI) {
        if (matchPair(zhis[i].zhi, zhis[j].zhi, item.pair)) {
          results.push(`${item.name}（${zhis[i].position}${zhis[j].position}害）`);
        }
      }
    }
  }
  return results;
}

export const chongHeTool: AtomTool<ChongHeInput, ChongHeOutput> = {
  name: 'chong-he-detection',
  description: '冲合关系检测：检测四柱天干五合、地支六合/三合/六冲/三刑/六害关系',
  category: 'bazi',

  async execute(input: ChongHeInput): Promise<ChongHeOutput> {
    const pillars = [input.yearPillar, input.monthPillar, input.dayPillar, input.hourPillar];

    const gans = pillars.map((p, i) => ({ gan: p[0], position: PILLAR_LABELS[i] + '干' }));
    const zhis = pillars.map((p, i) => ({ zhi: p[1], position: PILLAR_LABELS[i] + '支' }));

    const tianGanHe = findTianGanHe(gans);
    const diZhiLiuHe = findDiZhiLiuHe(zhis);
    const diZhiSanHe = findDiZhiSanHe(zhis);
    const diZhiLiuChong = findDiZhiLiuChong(zhis);
    const diZhiSanXing = findDiZhiSanXing(zhis);
    const diZhiLiuHai = findDiZhiLiuHai(zhis);

    const heCount = tianGanHe.length + diZhiLiuHe.length + diZhiSanHe.length;
    const chongCount = diZhiLiuChong.length + diZhiSanXing.length + diZhiLiuHai.length;

    const parts: string[] = [];
    for (const item of tianGanHe) {
      parts.push(`天干${item.type}（${item.effect}）`);
    }
    for (const item of diZhiLiuHe) {
      parts.push(item);
    }
    for (const item of diZhiSanHe) {
      parts.push(item);
    }
    for (const item of diZhiLiuChong) {
      parts.push(item);
    }
    for (const item of diZhiSanXing) {
      parts.push(item);
    }
    for (const item of diZhiLiuHai) {
      parts.push(item);
    }

    let balanceDesc: string;
    if (chongCount === 0 && heCount === 0) {
      balanceDesc = '无明显冲合，命局平稳';
    } else if (chongCount > heCount) {
      balanceDesc = '冲多于合，变动性大';
    } else if (heCount > chongCount) {
      balanceDesc = '合多于冲，稳定性强';
    } else {
      balanceDesc = '冲合相当，动静均衡';
    }

    const summary = parts.length > 0
      ? `${parts.join('，')}，${balanceDesc}`
      : balanceDesc;

    return {
      tianGanHe,
      diZhiLiuHe,
      diZhiSanHe,
      diZhiLiuChong,
      diZhiSanXing,
      diZhiLiuHai,
      summary,
    };
  },

  toPromptOutput(output: ChongHeOutput): string {
    return output.summary;
  },
};
