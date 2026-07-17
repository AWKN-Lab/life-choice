export interface GanZhi {
  gan: string;
  zhi: string;
  full?: string;
  ganIndex?: number;
  zhiIndex?: number;
  monthIndex?: number;
}

export interface ShiShen {
  year: string;
  month: string;
  day: string;
  time: string;
}

export interface ZhiShiShen {
  gan: string;
  shishen: string;
}

export interface NaYin {
  year: string;
  month: string;
  day: string;
  time: string;
}

export interface ShenSha {
  tianYiGuiRen: string[];
  taiJiGuiRen: string[];
  wenChangGuiRen: string[];
  yangRen: string[];
  taoHua: string[];
  jiangXing: string[];
  huaGai: string[];
  yiMa: string[];
}

export interface DaYunItem {
  index: number;
  gan: string;
  zhi: string;
  full: string;
  startAge: number;
  endAge: number;
}

export interface DaYun {
  qiYunSui: number;
  isShun: boolean;
  isYangYear: boolean;
  daYun: DaYunItem[];
}

export interface LiuNian {
  year: number;
  ganZhi: string;
  gan: string;
  zhi: string;
  shishen: string;
}

export interface BaZiResult {
  year: GanZhi;
  month: GanZhi;
  day: GanZhi;
  time: GanZhi & { name?: string };
  baZi: string[];
  fullBaZi: string;
  info: {
    originalDate: string;
    calculatedDate: string;
    shiChen?: string;
  };
}

export interface FullAnalysis {
  baZi: BaZiResult;
  shiShen: ShiShen;
  zhiShiShen: {
    year: ZhiShiShen[];
    month: ZhiShiShen[];
    day: ZhiShiShen[];
    time: ZhiShiShen[];
  };
  daYun: DaYun;
  shenSha: ShenSha;
  dayGan: string;
  wuXing: {
    year: { gan: string; zhi: string };
    month: { gan: string; zhi: string };
    day: { gan: string; zhi: string };
    time: { gan: string; zhi: string };
  };
  naYin: NaYin;
  changSheng: {
    year: string;
    month: string;
    day: string;
    time: string;
  };
  kongWang: string[];
  taiYuan: {
    gan: string;
    zhi: string;
    full: string;
    naYin: string;
  };
  mingGong: {
    gan: string;
    zhi: string;
    full: string;
    naYin: string;
  };
  xiaoYun: {
    age: number;
    gan: string;
    zhi: string;
    full: string;
  }[];
  jiaoYunTime: {
    dateStr: string;
  };
}
