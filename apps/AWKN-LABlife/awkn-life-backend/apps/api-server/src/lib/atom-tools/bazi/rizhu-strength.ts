import { AtomTool } from '../types';
import {
  GAN,
  ZHI,
  WUXING_TIANGAN,
  WUXING_DIZHI,
  getZanggan,
  getChangshengStage,
} from '../../../calc-engine/bazi-engine/core/bazi-data.service';

export interface RizhuStrengthInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface RizhuStrengthOutput {
  strength: '强' | '偏强' | '中和' | '偏弱' | '弱';
  deling: string;
  dedi: string;
  deshi: string;
  summary: string;
}

const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};
const KE: Record<string, string> = {
  '木': '土', '火': '金', '土': '水', '金': '木', '水': '火',
};
const WO_KE: Record<string, string> = {
  '木': '金', '火': '水', '土': '木', '金': '火', '水': '土',
};

function judgeDeling(dayGan: string, monthZhi: string): { result: string; score: number } {
  const dayWu = WUXING_TIANGAN[dayGan];
  const monthWu = WUXING_DIZHI[monthZhi];
  if (!dayWu || !monthWu) return { result: '未知', score: 0 };

  if (dayWu === monthWu) return { result: '得令（当令旺气）', score: 3 };
  if (SHENG[monthWu] === dayWu) return { result: '得令（月令生扶）', score: 2 };
  if (KE[dayWu] === monthWu) return { result: '失令（日主泄气）', score: -1 };
  if (WO_KE[dayWu] === monthWu) return { result: '失令（日主克月令）', score: -0.5 };
  if (KE[monthWu] === dayWu) return { result: '失令（月令克日主）', score: -2 };

  return { result: '平', score: 0 };
}

function judgeDedi(dayGan: string, zhiArr: string[]): { result: string; score: number } {
  const dayWu = WUXING_TIANGAN[dayGan];
  if (!dayWu) return { result: '未知', score: 0 };

  let rootCount = 0;
  const details: string[] = [];

  for (const zhi of zhiArr) {
    const stage = getChangshengStage(dayGan, zhi);
    if (['长生', '帝旺', '临官', '建禄'].includes(stage)) {
      rootCount += 1;
      details.push(`${zhi}(${stage})`);
    } else if (stage === '冠带') {
      rootCount += 0.5;
      details.push(`${zhi}(${stage})`);
    }

    const zg = getZanggan(zhi);
    const zgGans = [zg.main, zg.middle, zg.residual].filter(Boolean) as string[];
    for (const g of zgGans) {
      const gWu = WUXING_TIANGAN[g];
      if (gWu === dayWu) {
        rootCount += 0.3;
        details.push(`${zhi}藏${g}`);
      }
    }
  }

  if (rootCount >= 2) return { result: `得地（根气足：${details.join('、')}）`, score: 2 };
  if (rootCount >= 1) return { result: `得地（有根：${details.join('、')}）`, score: 1 };
  if (rootCount > 0) return { result: `得地（根弱：${details.join('、')}）`, score: 0.5 };
  return { result: '失地（无根）', score: -1 };
}

function judgeDeshi(dayGan: string, pillars: string[]): { result: string; score: number } {
  const dayWu = WUXING_TIANGAN[dayGan];
  if (!dayWu) return { result: '未知', score: 0 };

  const shengWo = Object.entries(SHENG).find(([, v]) => v === dayWu)?.[0];
  let tongLeiCount = 0;
  const details: string[] = [];

  for (const pillar of pillars) {
    const gan = pillar[0];
    const zhi = pillar[1];
    const ganWu = WUXING_TIANGAN[gan];
    if (ganWu === dayWu && gan !== dayGan) {
      tongLeiCount += 1;
      details.push(`${gan}同类`);
    }
    if (shengWo && ganWu === shengWo) {
      tongLeiCount += 0.5;
      details.push(`${gan}生扶`);
    }

    const zg = getZanggan(zhi);
    for (const g of [zg.main, zg.middle, zg.residual].filter(Boolean) as string[]) {
      const gWu = WUXING_TIANGAN[g];
      if (gWu === dayWu) {
        tongLeiCount += 0.3;
        details.push(`${zhi}藏${g}同类`);
      }
      if (shengWo && gWu === shengWo) {
        tongLeiCount += 0.2;
        details.push(`${zhi}藏${g}生扶`);
      }
    }
  }

  if (tongLeiCount >= 2) return { result: `得势（帮扶多：${details.join('、')}）`, score: 2 };
  if (tongLeiCount >= 1) return { result: `得势（有帮扶：${details.join('、')}）`, score: 1 };
  if (tongLeiCount > 0) return { result: `得势（帮扶弱：${details.join('、')}）`, score: 0.5 };
  return { result: '失势（无助）', score: -1 };
}

function classifyStrength(totalScore: number): '强' | '偏强' | '中和' | '偏弱' | '弱' {
  if (totalScore >= 5) return '强';
  if (totalScore >= 3) return '偏强';
  if (totalScore >= 1) return '中和';
  if (totalScore >= -1) return '偏弱';
  return '弱';
}

export const rizhuStrengthTool: AtomTool<RizhuStrengthInput, RizhuStrengthOutput> = {
  name: 'rizhu-strength',
  description: '日主强弱判断：根据得令、得地、得势三维度综合评估日主强弱',
  category: 'bazi',

  async execute(input: RizhuStrengthInput): Promise<RizhuStrengthOutput> {
    const dayGan = input.dayPillar[0];
    const monthZhi = input.monthPillar[1];
    const zhiArr = [
      input.yearPillar[1],
      input.monthPillar[1],
      input.dayPillar[1],
      input.hourPillar[1],
    ];
    const pillars = [
      input.yearPillar,
      input.monthPillar,
      input.dayPillar,
      input.hourPillar,
    ];

    const delingResult = judgeDeling(dayGan, monthZhi);
    const dediResult = judgeDedi(dayGan, zhiArr);
    const deshiResult = judgeDeshi(dayGan, pillars);

    const totalScore = delingResult.score + dediResult.score + deshiResult.score;
    const strength = classifyStrength(totalScore);

    const dayWu = WUXING_TIANGAN[dayGan] || '未知';
    const summary = `日主${dayGan}${dayWu}，生于${monthZhi}月${delingResult.result}，${dediResult.result}，${deshiResult.result}，综合判断日主${strength}`;

    return {
      strength,
      deling: delingResult.result,
      dedi: dediResult.result,
      deshi: deshiResult.result,
      summary,
    };
  },

  toPromptOutput(output: RizhuStrengthOutput): string {
    return output.summary;
  },
};
