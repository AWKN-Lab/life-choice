import { AtomTool } from '../types';
import {
  WUXING_TIANGAN,
  WUXING_DIZHI,
  getShishen,
} from '../../../calc-engine/bazi-engine/core/bazi-data.service';

export interface DayunStageInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  daYun: Array<{
    index: number;
    gan: string;
    zhi: string;
    full: string;
    startAge: number;
    endAge: number;
  }>;
  currentAge: number;
}

export interface DayunStageOutput {
  currentDayun: string;
  dayunIndex: number;
  totalDayun: number;
  dayunGanZhi: string;
  interaction: string;
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

function analyzeInteraction(
  dayGan: string,
  dayunGan: string,
  dayunZhi: string,
  pillarZhis: string[],
): string {
  const parts: string[] = [];
  const dayWu = WUXING_TIANGAN[dayGan];
  const dayunGanWu = WUXING_TIANGAN[dayunGan];
  const dayunZhiWu = WUXING_DIZHI[dayunZhi];

  const shishen = getShishen(dayGan, dayunGan);
  parts.push(`${dayunGan}${shishen}透干`);

  if (dayWu && dayunGanWu) {
    if (dayunGanWu === dayWu) parts.push('帮身');
    else if (SHENG[dayunGanWu] === dayWu) parts.push('生扶日主');
    else if (WO_KE[dayWu] === dayunGanWu) parts.push('克泄日主');
    else if (KE[dayunGanWu] === dayWu) parts.push('克制日主');
  }

  if (dayWu && dayunZhiWu) {
    if (dayunZhiWu === dayWu) parts.push('地支帮身');
    else if (SHENG[dayunZhiWu] === dayWu) parts.push('地支生扶');
    else if (KE[dayunZhiWu] === dayWu) parts.push('地支克制');
  }

  const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const CHONG_PAIRS: Record<string, string> = {
    '0,6': '子午冲', '1,7': '丑未冲', '2,8': '寅申冲', '3,9': '卯酉冲', '4,10': '辰戌冲', '5,11': '巳亥冲',
  };
  const HE_PAIRS: Record<string, string> = {
    '0,1': '子丑合', '2,11': '寅亥合', '3,10': '卯戌合', '4,9': '辰酉合', '5,8': '巳申合', '6,7': '午未合',
  };

  const dayunZhiIdx = ZHI.indexOf(dayunZhi);
  for (const zhi of pillarZhis) {
    const zhiIdx = ZHI.indexOf(zhi);
    const pairA = Math.min(dayunZhiIdx, zhiIdx);
    const pairB = Math.max(dayunZhiIdx, zhiIdx);
    const key = `${pairA},${pairB}`;
    if (CHONG_PAIRS[key]) parts.push(CHONG_PAIRS[key]);
    if (HE_PAIRS[key]) parts.push(HE_PAIRS[key]);
  }

  return parts.join('，');
}

export const dayunStageTool: AtomTool<DayunStageInput, DayunStageOutput> = {
  name: 'dayun-stage',
  description: '大运阶段分析：判断当前所处大运阶段，分析大运干支与命局的交互关系',
  category: 'bazi',

  async execute(input: DayunStageInput): Promise<DayunStageOutput> {
    const dayGan = input.dayPillar[0];
    const pillarZhis = [
      input.yearPillar[1],
      input.monthPillar[1],
      input.dayPillar[1],
      input.hourPillar[1],
    ];

    const totalDayun = input.daYun.length;
    let currentDayunEntry = input.daYun.find(
      d => input.currentAge >= d.startAge && input.currentAge <= d.endAge,
    );

    if (!currentDayunEntry && input.daYun.length > 0) {
      if (input.currentAge < input.daYun[0].startAge) {
        currentDayunEntry = {
          index: 0,
          gan: '',
          zhi: '',
          full: '起运前',
          startAge: 0,
          endAge: input.daYun[0].startAge - 1,
        };
      } else {
        currentDayunEntry = input.daYun[input.daYun.length - 1];
      }
    }

    if (!currentDayunEntry) {
      return {
        currentDayun: '无大运数据',
        dayunIndex: 0,
        totalDayun: 0,
        dayunGanZhi: '',
        interaction: '',
        summary: '无大运数据',
      };
    }

    const dayunGanZhi = currentDayunEntry.full;
    const interaction = currentDayunEntry.gan
      ? analyzeInteraction(dayGan, currentDayunEntry.gan, currentDayunEntry.zhi, pillarZhis)
      : '起运前，尚未进入大运';

    const ageRange = `${currentDayunEntry.startAge}-${currentDayunEntry.endAge}岁`;
    const currentDayun = currentDayunEntry.index > 0
      ? `第${currentDayunEntry.index}步大运${dayunGanZhi}（${ageRange}）`
      : `起运前（${ageRange}）`;

    const summary = `当前处于${currentDayun}，${interaction}`;

    return {
      currentDayun,
      dayunIndex: currentDayunEntry.index,
      totalDayun,
      dayunGanZhi,
      interaction,
      summary,
    };
  },

  toPromptOutput(output: DayunStageOutput): string {
    return output.summary;
  },
};
