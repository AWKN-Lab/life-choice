import { AtomTool } from '../types';

export interface BaziRiskData {
  dayGan: string;
  liunianGan: string;
  liunianZhi: string;
  dayZhi: string;
  pillarZhis: string[];
  dayunShishen: string;
  xiYong: string[];
  jiShen: string[];
  dayStrength: '强' | '偏强' | '中和' | '偏弱' | '弱';
}

export interface ZiweiRiskData {
  jiPalace: string;
  jiStar: string;
  hasYangTuo: boolean;
  yangTuoPalace: string;
  hasHuoLing: boolean;
  huoLingPalace: string;
  hasKongJie: boolean;
  kongJiePalace: string;
  liunianJiPalace: string;
  liunianJiStar: string;
  chongPalace: string;
}

export interface RiskInput {
  bazi: BaziRiskData;
  ziwei: ZiweiRiskData;
}

export interface RiskSignal {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface RiskOutput {
  signals: RiskSignal[];
  overallRisk: 'high' | 'medium' | 'low';
  summary: string;
}

const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const CHONG_PAIRS: Record<string, string> = {
  '子午': '子午冲', '丑未': '丑未冲', '寅申': '寅申冲',
  '卯酉': '卯酉冲', '辰戌': '辰戌冲', '巳亥': '巳亥冲',
};

function checkChong(zhi1: string, zhi2: string): string | null {
  const idx1 = DIZHI.indexOf(zhi1);
  const idx2 = DIZHI.indexOf(zhi2);
  const pair = idx1 < idx2 ? zhi1 + zhi2 : zhi2 + zhi1;
  return CHONG_PAIRS[pair] || null;
}

const HIGH_RISK_SHISHEN = ['七杀', '伤官', '劫财'];
const MEDIUM_RISK_SHISHEN = ['偏印', '偏财'];

const JI_PALACE_RISK: Record<string, { severity: 'high' | 'medium'; desc: string }> = {
  '命宫': { severity: 'high', desc: '化忌入命宫，自身运势受阻' },
  '财帛宫': { severity: 'high', desc: '化忌入财帛，防破财损财' },
  '官禄宫': { severity: 'high', desc: '化忌入官禄，事业受阻' },
  '夫妻宫': { severity: 'medium', desc: '化忌入夫妻，感情易生波折' },
  '迁移宫': { severity: 'medium', desc: '化忌入迁移，外出变动不利' },
  '疾厄宫': { severity: 'medium', desc: '化忌入疾厄，需注意健康' },
};

function classifyOverallRisk(signals: RiskSignal[]): 'high' | 'medium' | 'low' {
  const highCount = signals.filter(s => s.severity === 'high').length;
  const mediumCount = signals.filter(s => s.severity === 'medium').length;
  if (highCount >= 2 || (highCount >= 1 && mediumCount >= 2)) return 'high';
  if (highCount >= 1 || mediumCount >= 2) return 'medium';
  return 'low';
}

export const riskTool: AtomTool<RiskInput, RiskOutput> = {
  name: 'decision-risk',
  description: '风险信号提取：从八字冲合、紫微化忌、空亡、羊陀火铃等提取风险信号，评估整体风险等级',
  category: 'decision',

  async execute(input: RiskInput): Promise<RiskOutput> {
    const { bazi, ziwei } = input;
    const signals: RiskSignal[] = [];

    const liunianChongDay = checkChong(bazi.liunianZhi, bazi.dayZhi);
    if (liunianChongDay) {
      signals.push({
        type: '流年冲日支',
        severity: 'high',
        description: `流年${liunianChongDay}，变动剧烈，根基受冲`,
      });
    }

    for (const zhi of bazi.pillarZhis) {
      const chong = checkChong(bazi.liunianZhi, zhi);
      if (chong && chong !== liunianChongDay) {
        signals.push({
          type: '流年冲命局',
          severity: 'medium',
          description: `流年${chong}，冲击命局地支，需防变动`,
        });
        break;
      }
    }

    if (bazi.jiShen.length > 0 && bazi.liunianGan) {
      const liunianWu = bazi.liunianGan;
      const isJiShen = bazi.jiShen.some(j => {
        const TIANGAN_WUXING: Record<string, string> = {
          '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
          '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
        };
        const wu = TIANGAN_WUXING[liunianWu];
        return wu === j;
      });
      if (isJiShen) {
        signals.push({
          type: '流年逢忌神',
          severity: 'medium',
          description: `流年天干${liunianWu}属忌神五行，运势不利`,
        });
      }
    }

    if (HIGH_RISK_SHISHEN.includes(bazi.dayunShishen)) {
      signals.push({
        type: '大运凶神透干',
        severity: 'high',
        description: `大运${bazi.dayunShishen}透干，冲克风险大`,
      });
    } else if (MEDIUM_RISK_SHISHEN.includes(bazi.dayunShishen)) {
      signals.push({
        type: '大运偏星透干',
        severity: 'medium',
        description: `大运${bazi.dayunShishen}透干，波动性增加`,
      });
    }

    if (bazi.dayStrength === '弱' || bazi.dayStrength === '偏弱') {
      signals.push({
        type: '日主偏弱',
        severity: 'low',
        description: `日主${bazi.dayStrength}，抗压能力不足，决策需谨慎`,
      });
    }

    const jiInfo = JI_PALACE_RISK[ziwei.jiPalace];
    if (jiInfo) {
      signals.push({
        type: '化忌入宫',
        severity: jiInfo.severity,
        description: `${jiInfo.desc}（${ziwei.jiStar}化忌）`,
      });
    }

    if (ziwei.liunianJiPalace) {
      const liunianJiInfo = JI_PALACE_RISK[ziwei.liunianJiPalace];
      if (liunianJiInfo) {
        signals.push({
          type: '流年化忌入宫',
          severity: liunianJiInfo.severity,
          description: `流年${liunianJiInfo.desc}（${ziwei.liunianJiStar}化忌）`,
        });
      } else {
        signals.push({
          type: '流年化忌入宫',
          severity: 'low',
          description: `流年化忌入${ziwei.liunianJiPalace}，需留意相关领域`,
        });
      }
    }

    if (ziwei.hasYangTuo) {
      signals.push({
        type: '羊陀夹/同宫',
        severity: 'medium',
        description: `擎羊陀罗在${ziwei.yangTuoPalace}，刑伤阻碍，需防意外纠纷`,
      });
    }

    if (ziwei.hasHuoLing) {
      signals.push({
        type: '火铃夹/同宫',
        severity: 'medium',
        description: `火星铃星在${ziwei.huoLingPalace}，暴躁冲动，波折较多`,
      });
    }

    if (ziwei.hasKongJie) {
      signals.push({
        type: '空劫夹/同宫',
        severity: 'low',
        description: `地空地劫在${ziwei.kongJiePalace}，虚耗破财，精神困扰`,
      });
    }

    if (ziwei.chongPalace) {
      signals.push({
        type: '宫位对冲',
        severity: 'medium',
        description: `${ziwei.chongPalace}对冲，该领域易生变故`,
      });
    }

    const overallRisk = classifyOverallRisk(signals);
    const highSignals = signals.filter(s => s.severity === 'high');
    const mediumSignals = signals.filter(s => s.severity === 'medium');
    const lowSignals = signals.filter(s => s.severity === 'low');

    const summaryParts: string[] = [];
    summaryParts.push(`检测到${signals.length}个风险信号`);
    if (highSignals.length > 0) {
      summaryParts.push(`[高]${highSignals.map(s => s.description).join('、')}`);
    }
    if (mediumSignals.length > 0) {
      summaryParts.push(`[中]${mediumSignals.map(s => s.description).join('、')}`);
    }
    if (lowSignals.length > 0) {
      summaryParts.push(`[低]${lowSignals.map(s => s.description).join('、')}`);
    }

    const summary = summaryParts.join('；');

    return { signals, overallRisk, summary };
  },

  toPromptOutput(output: RiskOutput): string {
    return output.summary;
  },
};
