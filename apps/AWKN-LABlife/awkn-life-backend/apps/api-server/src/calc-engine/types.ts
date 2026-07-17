export interface SolarTerm {
  name: string;
  date: Date;
  yueJiang: string;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  dayGan: number;
  dayZhi: number;
  monthGan: number;
  monthZhi: number;
}

export interface BaZiPillar {
  pillar: string;
  gan: string;
  zhi: string;
  wuxing: string;
}

export interface BaZiResult {
  year: BaZiPillar;
  month: BaZiPillar;
  day: BaZiPillar;
  hour: BaZiPillar;
  wuxing: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  shishen: Record<string, string>;
  dayun: any[];
  liunian: any[];
}

export interface LiurenResult {
  tianDiPan: any;
  siKe: any[];
  sanChuan: any[];
  keTi: string;
  shensha: Record<string, string>;
}

export const WUXING = ['木', '火', '土', '金', '水'] as const;
export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const WUXING_RELATIONS: Record<string, { generating: string[]; defeating: string[] }> = {
  木: { generating: ['火'], defeating: ['金'] },
  火: { generating: ['土'], defeating: ['水'] },
  土: { generating: ['金'], defeating: ['木'] },
  金: { generating: ['水'], defeating: ['火'] },
  水: { generating: ['木'], defeating: ['土'] },
};
