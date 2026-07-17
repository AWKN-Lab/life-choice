import { AtomTool } from '../types';
import {
  WUXING_TIANGAN,
  WUXING_DIZHI,
  getZanggan,
} from '../../../calc-engine/bazi-engine/core/bazi-data.service';

export interface WuxingBalanceInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface WuxingBalanceOutput {
  distribution: Record<string, number>;
  dayMasterElement: string;
  xiYong: string[];
  jiShen: string[];
  summary: string;
}

const WUXING_CN: Record<string, string> = {
  '木': '木', '火': '火', '土': '土', '金': '金', '水': '水',
};

const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};
const SHENG_WO: Record<string, string> = {
  '木': '水', '火': '木', '土': '火', '金': '土', '水': '金',
};
const KE: Record<string, string> = {
  '木': '土', '火': '金', '土': '水', '金': '木', '水': '火',
};
const KE_WO: Record<string, string> = {
  '木': '金', '火': '水', '土': '木', '金': '火', '水': '土',
};
const WO_KE: Record<string, string> = {
  '木': '金', '火': '水', '土': '木', '金': '火', '水': '土',
};

function countWuxing(pillars: string[]): Record<string, number> {
  const dist: Record<string, number> = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };

  for (const pillar of pillars) {
    const gan = pillar[0];
    const zhi = pillar[1];
    const ganWu = WUXING_TIANGAN[gan];
    if (ganWu) dist[ganWu] += 1;

    const zhiWu = WUXING_DIZHI[zhi];
    if (zhiWu) dist[zhiWu] += 0.5;

    const zg = getZanggan(zhi);
    for (const g of [zg.main, zg.middle, zg.residual].filter(Boolean) as string[]) {
      const gWu = WUXING_TIANGAN[g];
      if (gWu) dist[gWu] += 0.5;
    }
  }

  const rounded: Record<string, number> = {};
  for (const [k, v] of Object.entries(dist)) {
    rounded[k] = Math.round(v * 10) / 10;
  }
  return rounded;
}

function determineXiJi(dayWu: string, dist: Record<string, number>): { xiYong: string[]; jiShen: string[] } {
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const dayScore = dist[dayWu] / total;
  const shengWoWu = SHENG_WO[dayWu];
  const shengWoScore = shengWoWu ? dist[shengWoWu] / total : 0;
  const selfAndHelp = dayScore + shengWoScore;

  const xiYong: string[] = [];
  const jiShen: string[] = [];

  if (selfAndHelp < 0.35) {
    xiYong.push(dayWu);
    if (shengWoWu) xiYong.push(shengWoWu);
    const woKeWu = WO_KE[dayWu];
    if (woKeWu) jiShen.push(woKeWu);
    const keWoWu = KE_WO[dayWu];
    if (keWoWu) jiShen.push(keWoWu);
    const shengWu = SHENG[dayWu];
    if (shengWu) jiShen.push(shengWu);
  } else if (selfAndHelp > 0.55) {
    const shengWu = SHENG[dayWu];
    if (shengWu) xiYong.push(shengWu);
    const woKeWu = WO_KE[dayWu];
    if (woKeWu) xiYong.push(woKeWu);
    jiShen.push(dayWu);
    if (shengWoWu) jiShen.push(shengWoWu);
  } else {
    const shengWu = SHENG[dayWu];
    if (shengWu && dist[shengWu] / total < 0.15) xiYong.push(shengWu);
    const woKeWu = WO_KE[dayWu];
    if (woKeWu && dist[woKeWu] / total < 0.15) xiYong.push(woKeWu);
    if (xiYong.length === 0) xiYong.push(dayWu);
  }

  return {
    xiYong: [...new Set(xiYong)],
    jiShen: [...new Set(jiShen)],
  };
}

export const wuxingBalanceTool: AtomTool<WuxingBalanceInput, WuxingBalanceOutput> = {
  name: 'wuxing-balance',
  description: '五行分布统计与喜忌用神推导：统计金木水火土分布，判断日主五行，推导喜用神和忌神',
  category: 'bazi',

  async execute(input: WuxingBalanceInput): Promise<WuxingBalanceOutput> {
    const dayGan = input.dayPillar[0];
    const dayMasterElement = WUXING_TIANGAN[dayGan] || '未知';
    const pillars = [input.yearPillar, input.monthPillar, input.dayPillar, input.hourPillar];

    const distribution = countWuxing(pillars);
    const { xiYong, jiShen } = determineXiJi(dayMasterElement, distribution);

    const distStr = Object.entries(distribution)
      .map(([k, v]) => `${k}${v}`)
      .join(' ');
    const xiStr = xiYong.join('');
    const jiStr = jiShen.join('');
    const summary = `五行分布：${distStr}，日主${dayGan}${dayMasterElement}，喜用神为${xiStr}，忌神为${jiStr}`;

    return {
      distribution,
      dayMasterElement,
      xiYong,
      jiShen,
      summary,
    };
  },

  toPromptOutput(output: WuxingBalanceOutput): string {
    return output.summary;
  },
};
