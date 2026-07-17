export interface LiurenLesson {
  askTime: string;
  askDate: string;
  askLocation: string;
  trueSolarTime: string;
  jiangjiang: string;
  zhoushi: string;
  tianpan: TianPanItem[];
  dipan: DiPanItem[];
  siKe: SiKeItem[];
  sanChuan: SanChuanItem[];
  tiTi: string;
  keTi: string;
  shenSha: ShenSha[];
  biFa: string[];
}

export interface TianPanItem {
  position: string;
  gan: string;
  zhi: string;
  tianjiang: string;
}

export interface DiPanItem {
  position: string;
  gan: string;
  zhi: string;
}

export interface SiKeItem {
  ke: number;
  gan: string;
  zhi: string;
  ganYinYang: '阳' | '阴';
  zhiYinYang: '阳' | '阴';
}

export interface SanChuanItem {
  chuan: '初传' | '中传' | '末传';
  gan: string;
  zhi: string;
  tianjiang: string;
  faYong: string;
}

export interface ShenSha {
  name: string;
  position: string;
  meaning: string;
}

export interface SanChuanHeJuResult {
  isHeJu: boolean;
  heJuType: string;
  heJuElement: string;
  relationToDayGan: string;
  description: string;
}

export interface BiFaResult {
  rule: string;
  businessContext: string;
}

export interface ZhanLeiDetail {
  eventType: string;
  leiShen: string[];
  leiShenExplanation: string;
  focusPoints: string[];
}

export interface TrueSolarTimeDetail {
  originalTime: string;
  location: string;
  longitude: number;
  timeDiff: number;
  correctedTime: string;
  correctedShiChen: string;
  description: string;
}

export interface GanZhiDay {
  date: string;
  ganZhi: string;
  isAskDate: boolean;
}

export interface JinKouJueLesson {
  diFen: string;
  diFenZhi: string;
  yueJiang: string;
  yueJiangZhi: string;
  guiShen: string;
  guiShenZhi: string;
  renYuan: string;
  renYuanGan: string;
  wuWei: {
    gan: string;
    shen: string;
    jiang: string;
    fang: string;
  };
  keTi: string;
  shengKe: {
    ganShengKeJiang: string;
    shenShengKeJiang: string;
    fangShengKeJiang: string;
  };
}

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const JIANG_JIANG = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const WU_XING_MAP: Record<string, '木' | '火' | '土' | '金' | '水'> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

const ZHI_WU_XING_MAP: Record<string, '木' | '火' | '土' | '金' | '水'> = {
  '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火',
  '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水', '子': '水', '丑': '土',
};

const TIAN_JIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

const ZHI_SHENG: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '辛', '癸'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['乙', '戊', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['丁', '己', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['辛', '戊', '丁'],
  '亥': ['壬', '甲'],
};

const JI_GONG: Record<string, string> = {
  '甲': '寅', '乙': '辰', '丙': '巳', '丁': '未',
  '戊': '巳', '己': '未', '庚': '申', '辛': '戌',
  '壬': '亥', '癸': '丑',
};

const ZHOU_CANG = ['甲', '丙', '戊', '庚', '壬', '甲', '丙', '戊', '庚', '壬', '甲', '丙'];

const SHI_CHEN_MAPPING: Record<number, string> = {
  0: '子', 1: '丑', 2: '寅', 3: '卯', 4: '辰',
  5: '巳', 6: '午', 7: '未', 8: '申', 9: '酉',
  10: '戌', 11: '亥', 12: '子', 13: '丑', 14: '寅',
  15: '卯', 16: '辰', 17: '巳', 18: '午', 19: '未',
  20: '申', 21: '酉', 22: '戌', 23: '亥',
};

// 中国主要城市经纬度（用于真太阳时计算）
const CITY_COORDINATES: Record<string, { lng: number; lat: number }> = {
  '北京': { lng: 116.4074, lat: 39.9042 },
  '上海': { lng: 121.4737, lat: 31.2304 },
  '广州': { lng: 113.2644, lat: 23.1291 },
  '深圳': { lng: 114.0579, lat: 22.5431 },
  '香港': { lng: 114.1694, lat: 22.3193 },
  '澳门': { lng: 113.5491, lat: 22.1987 },
  '南宁': { lng: 108.3669, lat: 22.8170 },
  '重庆': { lng: 106.5516, lat: 29.5630 },
  '成都': { lng: 104.0665, lat: 30.5728 },
  '杭州': { lng: 120.1536, lat: 30.2875 },
  '南京': { lng: 118.7969, lat: 32.0603 },
  '武汉': { lng: 114.3055, lat: 30.5928 },
  '西安': { lng: 108.9402, lat: 34.3416 },
  '天津': { lng: 117.3616, lat: 39.3434 },
  '苏州': { lng: 120.5853, lat: 31.2989 },
  '厦门': { lng: 118.0894, lat: 24.4798 },
  '福州': { lng: 119.2965, lat: 26.0745 },
  '长沙': { lng: 112.9388, lat: 28.2282 },
  '郑州': { lng: 113.6254, lat: 34.7466 },
  '济南': { lng: 116.9941, lat: 36.6823 },
  '青岛': { lng: 120.3826, lat: 36.0671 },
  '沈阳': { lng: 123.4315, lat: 41.8057 },
  '大连': { lng: 121.6147, lat: 38.9140 },
  '昆明': { lng: 102.8349, lat: 24.8820 },
  '贵阳': { lng: 106.7135, lat: 26.5783 },
  '阳江': { lng: 111.9826, lat: 21.8574 },
};

const BEIJING_LNG = 120.0; // 北京时间基准经度

// 真太阳时计算：经度差 × 4分钟
function calculateTrueSolarTimeOffset(longitude: number): number {
  return Math.round((BEIJING_LNG - longitude) * 4);
}

// 真太阳时校正
function adjustToTrueSolarTime(date: Date, location: string): { adjustedDate: Date; offset: number; locationName: string } {
  const coords = CITY_COORDINATES[location];
  if (!coords) {
    return { adjustedDate: date, offset: 0, locationName: location || '未知' };
  }

  const offsetMinutes = calculateTrueSolarTimeOffset(coords.lng);
  const adjustedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

  return {
    adjustedDate,
    offset: offsetMinutes,
    locationName: location,
  };
}

// 24节气表 - 中气换将用（每月两个，前为节气，后为中气）
const JIE_QI_TABLE: Record<string, { solarTerm: string; jiang: string }[]> = {
  '01': [{ solarTerm: '小寒', jiang: '丑' }, { solarTerm: '大寒', jiang: '丑' }],
  '02': [{ solarTerm: '立春', jiang: '寅' }, { solarTerm: '雨水', jiang: '寅' }],
  '03': [{ solarTerm: '惊蛰', jiang: '卯' }, { solarTerm: '春分', jiang: '卯' }],
  '04': [{ solarTerm: '清明', jiang: '辰' }, { solarTerm: '谷雨', jiang: '辰' }],
  '05': [{ solarTerm: '立夏', jiang: '巳' }, { solarTerm: '小满', jiang: '巳' }],
  '06': [{ solarTerm: '芒种', jiang: '午' }, { solarTerm: '夏至', jiang: '午' }],
  '07': [{ solarTerm: '小暑', jiang: '未' }, { solarTerm: '大暑', jiang: '未' }],
  '08': [{ solarTerm: '立秋', jiang: '申' }, { solarTerm: '处暑', jiang: '申' }],
  '09': [{ solarTerm: '白露', jiang: '酉' }, { solarTerm: '秋分', jiang: '酉' }],
  '10': [{ solarTerm: '寒露', jiang: '戌' }, { solarTerm: '霜降', jiang: '戌' }],
  '11': [{ solarTerm: '立冬', jiang: '亥' }, { solarTerm: '小雪', jiang: '亥' }],
  '12': [{ solarTerm: '大雪', jiang: '子' }, { solarTerm: '冬至', jiang: '子' }],
};

// 节气大约日期（用于判断当前处于哪个节气区间）
const JIE_QI_APPROX_DAYS: Record<string, number> = {
  '小寒': 5, '大寒': 20, '立春': 3, '雨水': 18, '惊蛰': 5, '春分': 20,
  '清明': 4, '谷雨': 20, '立夏': 5, '小满': 21, '芒种': 5, '夏至': 21,
  '小暑': 7, '大暑': 22, '立秋': 7, '处暑': 23, '白露': 7, '秋分': 23,
  '寒露': 8, '霜降': 23, '立冬': 7, '小雪': 22, '大雪': 7, '冬至': 21,
};

// 根据日期获取中气月将（中气换将规则）
function getJiangjiangByZhongqi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = date.getDate();
  const monthData = JIE_QI_TABLE[month];
  if (!monthData) return '子';

  for (let i = 0; i < monthData.length; i++) {
    const current = monthData[i];
    const nextInMonth = monthData[i + 1];
    const nextMonthData = JIE_QI_TABLE[String(Number(month) + 1).padStart(2, '0')];
    const next = nextInMonth || nextMonthData?.[0];

    const currentDay = JIE_QI_APPROX_DAYS[current.solarTerm];
    const nextDay = next ? JIE_QI_APPROX_DAYS[next.solarTerm] : 31;

    if (day >= currentDay && day < nextDay) {
      return current.jiang;
    }
  }

  return monthData[0].jiang;
}

const KE_TI_NAMES: Record<number, string> = {
  0: '贼克',
  1: '比用',
  2: '涉害',
  3: '遥克',
  4: '昴星',
  5: '别责',
  6: '八专',
  7: '伏吟',
  8: '返吟',
};

export class LiurenCalculator {
  private getJiangjiang(riZhi: string): string {
    const monthIndex = DI_ZHI.indexOf(riZhi);
    return JIANG_JIANG[(monthIndex + 2) % 12];
  }

  private getZhoushi(riZhi: string, riGan: string): string {
    const zhouIndex = TIAN_GAN.indexOf(riGan) % 6;
    return DI_ZHI[(DI_ZHI.indexOf(riZhi) + zhouIndex) % 12];
  }

  private getTianpanIndex(zhi: string, jiangjiang: string): number {
    const zhiIndex = DI_ZHI.indexOf(zhi);
    const jiangIndex = DI_ZHI.indexOf(jiangjiang);
    return (zhiIndex - jiangIndex + 12) % 12;
  }

  private getTianjiang(position: string, gan: string): string {
    const ganIndex = TIAN_GAN.indexOf(gan);
    const tianJiangMap: Record<number, string> = {
      0: '青龙', 1: '青龙', 2: '朱雀', 3: '六合',
      4: '勾陈', 5: '青龙', 6: '天空', 7: '白虎',
      8: '太常', 9: '玄武', 10: '太阴', 11: '天后',
    };
    return tianJiangMap[ganIndex] || '贵人';
  }

  private getDipanGan(zhi: string, shift: number): string {
    const zhiIndex = DI_ZHI.indexOf(zhi);
    const ganIndex = ZHOU_CANG[(zhiIndex + shift) % 6];
    return TIAN_GAN[ganIndex];
  }

  private calculateShift(jiangjiang: string, zhoushi: string): number {
    const jiangIndex = DI_ZHI.indexOf(jiangjiang);
    const zhouIndex = DI_ZHI.indexOf(zhoushi);
    return (jiangIndex - zhouIndex + 12) % 12;
  }

  setUpLesson(askTime: Date, location?: string): LiurenLesson {
    // Step 1: 真太阳时校正
    const { adjustedDate, offset, locationName } = adjustToTrueSolarTime(askTime, location || '');

    const hours = adjustedDate.getHours();
    const riZhi = SHI_CHEN_MAPPING[hours];
    const riZhiIndex = DI_ZHI.indexOf(riZhi);

    const riGan = this.getRigangFromZhi(riZhi);
    const jiangjiang = getJiangjiangByZhongqi(adjustedDate); // 使用中气换将
    const zhoushi = this.getZhoushi(riZhi, riGan);
    const shift = this.calculateShift(jiangjiang, zhoushi);

    const tianpan: TianPanItem[] = [];
    const dipan: DiPanItem[] = [];

    for (let i = 0; i < 12; i++) {
      const zhi = DI_ZHI[i];
      const gan = this.getDipanGan(zhi, shift);
      tianpan.push({
        position: zhi,
        gan: gan,
        zhi: zhi,
        tianjiang: this.getTianjiang(zhi, gan),
      });
      dipan.push({
        position: zhi,
        gan: gan,
        zhi: zhi,
      });
    }

    const siKe = this.calculateSiKe(riGan, riZhi, shift);
    const sanChuan = this.calculateSanChuan(siKe, riZhi, shift);
    const { tiTi, keTi } = this.calculateTiKe(sanChuan);

    const trueSolarTimeStr = offset >= 0
      ? `北京时间${askTime.getHours()}时校正后${hours}时（早${offset}分钟）`
      : `北京时间${askTime.getHours()}时校正后${hours}时（晚${Math.abs(offset)}分钟）`;

    return {
      askTime: askTime.toISOString(),
      askDate: askTime.toLocaleDateString('zh-CN'),
      askLocation: locationName,
      trueSolarTime: trueSolarTimeStr,
      jiangjiang,
      zhoushi,
      tianpan,
      dipan,
      siKe,
      sanChuan,
      tiTi,
      keTi,
      shenSha: this.getShenSha(siKe, sanChuan),
      biFa: this.getBiFa(sanChuan, siKe),
    };
  }

  private getRigangFromZhi(zhi: string): string {
    const zhiToGanMap: Record<string, string[]> = {
      '子': ['甲', '己'],
      '丑': ['乙', '庚'],
      '寅': ['丙', '辛'],
      '卯': ['丁', '壬'],
      '辰': ['戊', '癸'],
      '巳': ['甲', '己'],
      '午': ['乙', '庚'],
      '未': ['丙', '辛'],
      '申': ['丁', '壬'],
      '酉': ['戊', '癸'],
      '戌': ['甲', '己'],
      '亥': ['乙', '庚'],
    };
    return zhiToGanMap[zhi]?.[0] || '甲';
  }

  private calculateSiKe(riGan: string, riZhi: string, shift: number): SiKeItem[] {
    const riGanIndex = TIAN_GAN.indexOf(riGan);
    const riZhiIndex = DI_ZHI.indexOf(riZhi);
    const jiGong = JI_GONG[riGan];

    const gan1 = riGan;
    const zhi1 = DI_ZHI[(riZhiIndex + shift) % 12];
    const gan2 = TIAN_GAN[(riGanIndex + 1) % 10];
    const zhi2 = DI_ZHI[(riZhiIndex + 1 + shift) % 12];
    const gan3 = ZHOU_CANG[riZhiIndex % 6];
    const zhi3 = DI_ZHI[(riZhiIndex + 2) % 12];
    const gan4 = ZHOU_CANG[(riZhiIndex + 1) % 6];
    const zhi4 = DI_ZHI[(riZhiIndex + 3) % 12];

    const ganZhiToYinYang = (g: string, z: string): '阳' | '阴' => {
      const ganYang = ['甲', '丙', '戊', '庚', '壬'].includes(g);
      return ganYang ? '阳' : '阴';
    };

    return [
      { ke: 1, gan: gan1, zhi: zhi1, ganYinYang: ganZhiToYinYang(gan1, zhi1), zhiYinYang: '阳' },
      { ke: 2, gan: gan2, zhi: zhi2, ganYinYang: ganZhiToYinYang(gan2, zhi2), zhiYinYang: '阴' },
      { ke: 3, gan: gan3, zhi: zhi3, ganYinYang: ganZhiToYinYang(gan3, zhi3), zhiYinYang: '阳' },
      { ke: 4, gan: gan4, zhi: zhi4, ganYinYang: ganZhiToYinYang(gan4, zhi4), zhiYinYang: '阴' },
    ];
  }

  private calculateSanChuan(siKe: SiKeItem[], riZhi: string, shift: number): SanChuanItem[] {
    const riZhiIndex = DI_ZHI.indexOf(riZhi);
    const gan1 = siKe[0].gan;
    const zhi1 = siKe[0].zhi;
    const zhi1Index = DI_ZHI.indexOf(zhi1);

    let chuan1Index = (zhi1Index - shift + 12) % 12;
    let chuan1Gan = this.getDipinGanFromZhi(DI_ZHI[chuan1Index], siKe);
    let faYong1 = this.getFaYong(chuan1Gan, chuan1Index);

    let chuan2Index = (chuan1Index - shift + 12) % 12;
    let chuan2Gan = this.getDipinGanFromZhi(DI_ZHI[chuan2Index], siKe);
    let faYong2 = this.getFaYong(chuan2Gan, chuan2Index);

    let chuan3Index = (chuan2Index - shift + 12) % 12;
    let chuan3Gan = this.getDipinGanFromZhi(DI_ZHI[chuan3Index], siKe);
    let faYong3 = this.getFaYong(chuan3Gan, chuan3Index);

    return [
      { chuan: '初传', gan: chuan1Gan, zhi: DI_ZHI[chuan1Index], tianjiang: this.getTianjiang(DI_ZHI[chuan1Index], chuan1Gan), faYong: faYong1 },
      { chuan: '中传', gan: chuan2Gan, zhi: DI_ZHI[chuan2Index], tianjiang: this.getTianjiang(DI_ZHI[chuan2Index], chuan2Gan), faYong: faYong2 },
      { chuan: '末传', gan: chuan3Gan, zhi: DI_ZHI[chuan3Index], tianjiang: this.getTianjiang(DI_ZHI[chuan3Index], chuan3Gan), faYong: faYong3 },
    ];
  }

  private getDipinGanFromZhi(zhi: string, siKe: SiKeItem[]): string {
    for (const ke of siKe) {
      if (ke.zhi === zhi) return ke.gan;
    }
    return '甲';
  }

  private getFaYong(gan: string, zhiIndex: number): string {
    const ganIndex = TIAN_GAN.indexOf(gan);
    return KE_TI_NAMES[ganIndex % 9] || '贼克';
  }

  // 九宗门类型
  private determineJiuMen(siKe: SiKeItem[], shift: number, riGan: string): string {
    // 伏吟：天地盘同位
    if (shift === 0) return '伏吟';

    // 返吟：天地盘相冲
    if (shift === 6) return '返吟';

    // 贼克：四课上下有克
    if (this.checkZeiKe(siKe, riGan)) return '贼克';

    // 遥克：日干与天盘神将遥克
    if (this.checkYaoKe(riGan, siKe)) return '遥克';

    // 昴星：四课上克下或下克上
    if (this.checkMangXing(siKe)) return '昴星';

    // 比用：四课无克，取阴阳相比
    if (this.checkBiYong(siKe)) return '比用';

    // 涉害：取地盘受克最深的
    return '涉害';
  }

  // 贼克判断
  private checkZeiKe(siKe: SiKeItem[], riGan: string): boolean {
    for (const ke of siKe) {
      if (this.getShengKeRelation(ke.gan, riGan) !== 0) return true;
    }
    return false;
  }

  // 遥克判断
  private checkYaoKe(riGan: string, siKe: SiKeItem[]): boolean {
    const riGanIdx = TIAN_GAN.indexOf(riGan);
    for (const ke of siKe) {
      const ganIdx = TIAN_GAN.indexOf(ke.gan);
      const dist = Math.abs(riGanIdx - ganIdx);
      if (dist === 4 || dist === 6) return true;
    }
    return false;
  }

  // 昴星判断
  private checkMangXing(siKe: SiKeItem[]): boolean {
    for (const ke of siKe) {
      if (this.getShengKeRelation(ke.gan, ke.zhi) !== 0) return true;
    }
    return false;
  }

  // 比用判断
  private checkBiYong(siKe: SiKeItem[]): boolean {
    const yangCount = siKe.filter(ke => ke.ganYinYang === '阳').length;
    return yangCount === 2;
  }

  // 生克关系
  private getShengKeRelation(gan: string, target: string): number {
    const gIdx = TIAN_GAN.indexOf(gan);
    const tIdx = TIAN_GAN.indexOf(target);

    // 天干五合（不相克）
    const heWu = [[0,5], [1,6], [2,7], [3,8], [4,9]];
    for (const [a, b] of heWu) {
      if ((gIdx === a && tIdx === b) || (gIdx === b && tIdx === a)) return 0;
    }

    // 天干相克
    const keMap: Record<number, number> = {
      0: 2, 1: 4,  // 甲乙木克戊己土、庚辛金
      2: 8, 3: 9,  // 丙丁火克壬癸水、甲乙木
      4: 0, 5: 1,  // 戊己土克甲乙木、丙丁火
      6: 2, 7: 3,  // 庚辛金克戊己土、丙丁火
      8: 6, 9: 7,  // 壬癸水克丙丁火、庚辛金
    };

    const keIdx = keMap[gIdx];
    if (keIdx === tIdx) return 1; // gan克target
    const beKeIdx = keMap[tIdx];
    if (beKeIdx === gIdx) return -1; // target克gan
    return 0;
  }

  private calculateTiKe(sanChuan: SanChuanItem[]): { tiTi: string; keTi: string } {
    const firstChuanGan = sanChuan[0].gan;
    const firstChuanZhi = sanChuan[0].zhi;

    const keTiOptions: Record<number, string> = {
      0: '元首课',
      1: '重审课',
      2: '知一课',
      3: '涉害课',
      4: '遥克课',
      5: '昴星课',
      6: '别责课',
      7: '八专课',
      8: '伏吟课',
      9: '返吟课',
    };

    const firstChuanIndex = TIAN_GAN.indexOf(firstChuanGan);
    const keTi = keTiOptions[firstChuanIndex % 10] || '元首课';

    return {
      tiTi: '元首课',
      keTi: keTi,
    };
  }

  private getShenSha(siKe: SiKeItem[], sanChuan?: SanChuanItem[]): ShenSha[] {
    const shenShaList: ShenSha[] = [];
    const dayZhi = siKe[2]?.zhi || '';
    const dayGan = siKe[0]?.gan || '';

    const zhiLeiShen: Record<string, { name: string; meaning: string; jiXiong: string }[]> = {
      '子': [{ name:'神后', meaning:'后嗣妇女，主阴私', jiXiong:'中' }, { name:'天后', meaning:'阴人妇女之事', jiXiong:'吉' }],
      '丑': [{ name:'大吉', meaning:'田宅土地，主稳定', jiXiong:'吉' }, { name:'贵人', meaning:'官禄爵位，主提携', jiXiong:'大吉' }],
      '寅': [{ name:'功曹', meaning:'财帛文书，主财运', jiXiong:'吉' }, { name:'青龙', meaning:'官禄财喜之兆', jiXiong:'大吉' }],
      '卯': [{ name:'太冲', meaning:'舟车盗贼，主动迁', jiXiong:'中' }, { name:'六合', meaning:'和合婚姻，主合作', jiXiong:'吉' }],
      '辰': [{ name:'天罡', meaning:'牢狱争斗，主官非', jiXiong:'凶' }, { name:'勾陈', meaning:'田宅纠缠之事', jiXiong:'凶' }],
      '巳': [{ name:'太乙', meaning:'灾患惊忧，主突变', jiXiong:'凶' }, { name:'螣蛇', meaning:'惊恐怪异之事', jiXiong:'凶' }],
      '午': [{ name:'胜光', meaning:'文书光明，主事业', jiXiong:'吉' }, { name:'朱雀', meaning:'口舌是非之事', jiXiong:'凶' }],
      '未': [{ name:'小吉', meaning:'婚姻酒食，主喜庆', jiXiong:'吉' }, { name:'太常', meaning:'宴乐吉庆之事', jiXiong:'吉' }],
      '申': [{ name:'传送', meaning:'道路信息，主出行', jiXiong:'中' }, { name:'白虎', meaning:'凶丧血光之事', jiXiong:'大凶' }],
      '酉': [{ name:'从魁', meaning:'金银阴私，主财富', jiXiong:'中' }, { name:'太阴', meaning:'隐秘谋事之事', jiXiong:'中' }],
      '戌': [{ name:'河魁', meaning:'坟墓虚耗，主终结', jiXiong:'凶' }, { name:'天空', meaning:'虚诈损财之事', jiXiong:'凶' }],
      '亥': [{ name:'登明', meaning:'文书阴私，主信息', jiXiong:'中' }, { name:'玄武', meaning:'盗贼失脱之事', jiXiong:'凶' }],
    };

    for (const ke of siKe) {
      const shenList = zhiLeiShen[ke.zhi];
      if (shenList) {
        for (const sha of shenList) {
          shenShaList.push({ name: sha.name, position: `第${ke.ke}课`, meaning: sha.meaning });
        }
      }
    }

    if (sanChuan) {
      for (const chuan of sanChuan) {
        shenShaList.push({
          name: chuan.tianjiang,
          position: `${chuan.chuan}${chuan.zhi}`,
          meaning: ({ '贵人':'吉庆富贵','青龙':'官禄财喜','六合':'和合婚姻','勾陈':'争斗田宅','天空':'虚诈损财','白虎':'凶丧血光','太常':'吉庆宴乐','玄武':'盗贼失脱','太阴':'隐秘谋事','天后':'阴私妇女','螣蛇':'惊忧虚惊','朱雀':'口舌官讼' } as Record<string, string>)[chuan.tianjiang] || '',
        });
      }
    }

    // === 岁煞 ===
    const currentYear = new Date().getFullYear();
    const yearZhi = ['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'][currentYear % 12];
    const zhiIndex = DI_ZHI.indexOf(yearZhi);
    const suiPo = DI_ZHI[(zhiIndex + 6) % 12];
    const bingFu = DI_ZHI[(zhiIndex - 1 + 12) % 12];
    shenShaList.push({ name: '太岁', position: yearZhi, meaning: `当年值年太岁在${yearZhi}，主一年吉凶` });
    if (sanChuan) {
      const chuanZhi = sanChuan.map(c => c.zhi);
      if (chuanZhi.some(z => z === suiPo)) shenShaList.push({ name: '岁破', position: suiPo, meaning: '主破败耗失，不宜远行签约' });
      if (chuanZhi.some(z => z === bingFu)) shenShaList.push({ name: '病符', position: bingFu, meaning: '主旧病复发、旧事纠缠' });
    }

    // === 月煞 ===
    const month = new Date().getMonth() + 1;
    const yueJian = DI_ZHI[(month - 1) % 12];
    const shengQi = DI_ZHI[(month - 1) % 12];
    const yiMaMap: Record<string, string> = { '寅':'申','午':'申','戌':'申','巳':'亥','酉':'亥','丑':'亥','申':'寅','子':'寅','辰':'寅','亥':'巳','卯':'巳','未':'巳' };
    const yiMaZhi = yiMaMap[dayZhi];
    shenShaList.push({ name: '月建', position: yueJian, meaning: `当月建${yueJian}，主月内大事` });
    if (yiMaZhi) shenShaList.push({ name: '驿马', position: yiMaZhi, meaning: '主动迁出行，利于行动开拓' });

    // === 旬空 ===
    const kongWangZhi = this.getKongWang(siKe);
    for (const kw of kongWangZhi) {
      shenShaList.push({ name: '旬空', position: kw, meaning: '主虚而不实，事落空难成' });
    }

    // === 干煞 ===
    const ganMu: Record<string, string> = { '甲':'未','乙':'戌','丙':'戌','丁':'丑','戊':'戌','己':'丑','庚':'丑','辛':'辰','壬':'辰','癸':'未' };
    const ganDe: Record<string, string> = { '甲':'寅','己':'寅','乙':'申','庚':'申','丙':'巳','辛':'巳','丁':'亥','壬':'亥','戊':'巳','癸':'巳' };
    if (ganDe[dayGan]) shenShaList.push({ name: '日德', position: ganDe[dayGan], meaning: '遇德神有助，得贵人扶持' });

    // === 支煞 ===
    const zhiChong: Record<string, string> = { '子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥','午':'子','未':'丑','申':'寅','酉':'卯','戌':'辰','亥':'巳' };
    const zhiHai: Record<string, string[]> = { '子':['未'],'丑':['午'],'寅':['巳'],'卯':['辰'],'辰':['卯'],'巳':['寅'],'午':['丑'],'未':['子'],'申':['亥'],'酉':['戌'],'戌':['酉'],'亥':['申'] };
    if (zhiChong[dayZhi]) shenShaList.push({ name: '日冲', position: zhiChong[dayZhi], meaning: '冲动离散，主变数' });
    if (zhiHai[dayZhi]) shenShaList.push({ name: '日害', position: zhiHai[dayZhi][0], meaning: '暗中损害，人际关系有隐患' });

    const unique = shenShaList.filter((v, i, a) => a.findIndex(t => t.name === v.name && t.position === v.position) === i);
    return unique;
  }

  private getBiFa(sanChuan: SanChuanItem[], siKe: SiKeItem[]): string[] {
    const biFaList: string[] = [];
    const cZhi = sanChuan.map(c => c.zhi);
    const cJiang = sanChuan.map(c => c.tianjiang);
    const dayZhi = siKe[2]?.zhi || '';
    const ganShangZhi = siKe[0]?.zhi || '';

    const zhiWX: Record<string, string> = {
      '寅':'木','卯':'木','巳':'火','午':'火','辰':'土','丑':'土','未':'土','戌':'土','申':'金','酉':'金','子':'水','亥':'水',
    };
    const wx0 = zhiWX[cZhi[0]] || '';
    const wx1 = zhiWX[cZhi[1]] || '';
    const wx2 = zhiWX[cZhi[2]] || '';
    const sMap: Record<string, string[]> = { '木':['火'],'火':['土'],'土':['金'],'金':['水'],'水':['木'] };
    const kMap: Record<string, string[]> = { '木':['土'],'火':['金'],'土':['水'],'金':['木'],'水':['火'] };
    const kongWangZhi = this.getKongWang(siKe);

    // === 三传结构类 ===
    if (cZhi[0] === cZhi[1] && cZhi[0] === cZhi[2]) {
      biFaList.push('三传皆同（力量集中，事专一不二，成败较极端）');
    }
    if (cJiang[0] === cJiang[1] && cJiang[0] === cJiang[2]) {
      biFaList.push('天将三同（同一力量主导全程，格局单一）');
    }
    const zhiUnique = new Set(cZhi);
    if (zhiUnique.size === 2) {
      const dup = cZhi.filter((z, i) => cZhi.indexOf(z) !== i);
      biFaList.push(`传有重复（${[...new Set(dup)].join('、')}重复出现，关键节点反复）`);
    }

    // === 三传生克流转 ===
    if (wx0 && wx1 && wx2) {
      if (sMap[wx0]?.includes(wx1) && sMap[wx1]?.includes(wx2)) {
        biFaList.push('三传递生（层层推进有人引荐，事可成）');
      }
      if (kMap[wx0]?.includes(wx1) && kMap[wx1]?.includes(wx2)) {
        biFaList.push('三传递克（层层受阻众人欺凌，事难为）');
      }
      if (kMap[wx0]?.includes(wx2)) {
        biFaList.push('初传克末（虎头蛇尾，开局好结局差）');
      }
      if (kMap[wx2]?.includes(wx0)) {
        biFaList.push('末传克初（先难后易，苦尽甘来）');
      }
    }

    // === 四课结构 ===
    if (siKe[0].zhi === siKe[1].zhi) {
      biFaList.push('干课相同（求事需反复，非一蹴而就）');
    }
    if (siKe[2].zhi === siKe[3].zhi) {
      biFaList.push('支课相同（对方/环境因素单一，变化不大）');
    }
    if (siKe[0].zhi === siKe[2].zhi) {
      biFaList.push('干传支（干上神即支上神，事多牵强被动）');
    }
    const ganYY = siKe.map(s => s.ganYinYang);
    if (ganYY.every(y => y === '阳') || ganYY.every(y => y === '阴')) {
      biFaList.push('课传纯阴/纯阳（气偏一端，事难周全）');
    }
    if (siKe[0].gan !== siKe[2].gan && siKe[1].gan !== siKe[3].gan) {
      biFaList.push('宾主不投（双方理念不合，合作有摩擦）');
    }

    // === 空亡 ===
    if (cZhi.some(z => kongWangZhi.includes(z))) {
      const kongC = cZhi.filter(z => kongWangZhi.includes(z));
      biFaList.push(`传逢空亡（${kongC.join('、')}落空，对应阶段事难落实）`);
    }
    if (kongWangZhi.includes(ganShangZhi)) {
      biFaList.push('干上空亡（自身准备不足或时机未到）');
    }
    if (kongWangZhi.includes(dayZhi)) {
      biFaList.push('支上空亡（对方/环境空虚，基础不牢）');
    }

    // === 财官格局 ===
    const caiZhi = ['寅','卯','巳','午'];
    const guiZhi = ['申','酉','亥','子'];
    if (caiZhi.includes(cZhi[0]) && guiZhi.includes(cZhi[2])) {
      biFaList.push('财化为鬼（初财末鬼，先得后失利转害）');
    }
    if (guiZhi.includes(cZhi[0]) && caiZhi.includes(cZhi[2])) {
      biFaList.push('鬼化为财（先难后得，压力转利益）');
    }
    if (cZhi.includes('卯') && cZhi.includes('戌')) {
      biFaList.push('卯戌相合（六合而成，有暗中促成之力）');
    }

    // === 天将组合 ===
    const jiJiang = ['贵人','青龙','六合','太阴','太常','天后'];
    const xiongJiang = ['白虎','玄武','螣蛇','勾陈','天空','朱雀'];
    const jiCount = cJiang.filter(j => jiJiang.includes(j)).length;
    const xCount = cJiang.filter(j => xiongJiang.includes(j)).length;
    if (jiCount >= 2) biFaList.push('吉将多临（多个吉神入传，助力较足）');
    if (xCount >= 2) biFaList.push('凶将多临（多个凶神入传，阻力明显）');
    if (cJiang.includes('贵人') && cJiang.includes('青龙')) {
      biFaList.push('贵人青龙并见（上层助力+财喜，大吉之兆）');
    }
    if (cJiang.includes('白虎') && cJiang.includes('玄武')) {
      biFaList.push('虎玄同现（血光+盗贼，风险叠加需警惕）');
    }
    if (cJiang.includes('朱雀') && cJiang.includes('勾陈')) {
      biFaList.push('雀勾并见（口舌+纠缠，官司纠纷难解）');
    }
    if (cJiang.includes('六合') && cJiang.includes('天后')) {
      biFaList.push('后合并见（媒妁+女性，婚姻合作有喜）');
    }

    // === 刑冲害 ===
    const liuChong: Record<string, string> = { '子':'午','丑':'未','寅':'申','卯':'酉','辰':'戌','巳':'亥' };
    for (const k of Object.keys(liuChong)) {
      if (cZhi.includes(k) && cZhi.includes(liuChong[k])) {
        biFaList.push(`传中见冲（${k}冲${liuChong[k]}，有突变、分离之象）`);
        break;
      }
    }
    const liuHai: Record<string, string[]> = {
      '子':['未'],'丑':['午'],'寅':['巳'],'卯':['辰'],'辰':['卯'],'巳':['寅'],'午':['丑'],'未':['子'],'申':['亥'],'酉':['戌'],'戌':['酉'],'亥':['申'],
    };
    if (liuHai[ganShangZhi]?.includes(dayZhi)) {
      biFaList.push('干支相害（面和心不和，合作有暗坑）');
    }
    const xingPairs: [string, string][] = [['寅','巳'],['巳','申'],['申','寅'],['子','卯'],['丑','未'],['未','戌'],['戌','丑']];
    for (const [a, b] of xingPairs) {
      if (cZhi.includes(a) && cZhi.includes(b)) {
        biFaList.push(`传中见刑（${a}刑${b}，有伤害、纠纷之象）`);
        break;
      }
    }

    // === 驿马动态 ===
    const yiMaZhi: Record<string, string> = {
      '申':'寅','子':'寅','辰':'寅',
      '寅':'申','午':'申','戌':'申',
      '巳':'亥','酉':'亥','丑':'亥',
      '亥':'巳','卯':'巳','未':'巳',
    };
    const riZhiMa = cZhi.find(z => z === yiMaZhi[dayZhi]);
    if (riZhiMa) biFaList.push('驿马入传（主动、出行、变动，利于行动开拓）');

    // === 合局 ===
    const sanHe: [string[], string, string][] = [
      [['巳','酉','丑'],'金','财局'], [['亥','卯','未'],'木','印局'],
      [['寅','午','戌'],'火','食伤局'], [['申','子','辰'],'水','官局'],
    ];
    for (const [zhiList, wx, name] of sanHe) {
      if (zhiList.every(z => cZhi.includes(z))) {
        biFaList.push(`三传合${wx}${name}（多方力量汇聚，利于${wx==='金'?'求财合作':wx==='木'?'学业名声':wx==='火'?'创作表达':'升职考试'}）`);
      }
    }
    const sanHui: [string[], string, string][] = [
      [['寅','卯','辰'],'木','东方'], [['巳','午','未'],'火','南方'],
      [['申','酉','戌'],'金','西方'], [['亥','子','丑'],'水','北方'],
    ];
    for (const [zhiList, wx, name] of sanHui) {
      if (zhiList.every(z => cZhi.includes(z))) {
        biFaList.push(`三传会${name}${wx}局（同方汇气，力量更强更专）`);
      }
    }

    // === 盘面特殊 ===
    if (cJiang.includes('天空')) biFaList.push('天空入传（虚诈不实，信息需多方核实）');
    if (cJiang.includes('太常')) biFaList.push('太常入传（宴乐吉庆，利于交际应酬）');
    if (cJiang.includes('螣蛇')) biFaList.push('螣蛇入传（惊忧虚惊，防诈防骗防误导）');

    return biFaList;
  }

  private getKongWang(siKe: SiKeItem[]): string[] {
    const kongWangMap: Record<string, string[]> = {
      '甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'],
      '甲午': ['辰', '巳'], '甲辰': ['寅', '卯'], '甲寅': ['子', '丑'],
    };
    const dayGan = siKe[0]?.gan || '';
    const dayZhi = siKe[2]?.zhi || '';
    const dayPillar = dayGan + dayZhi;
    for (const [jiaZi, kong] of Object.entries(kongWangMap)) {
      if (dayPillar.startsWith(jiaZi[1])) {
        return kong;
      }
    }
    return [];
  }

  classifyEvent(lesson: LiurenLesson, eventType: string): {
    eventType: string;
    judgment: string;
    favorableFactors: string[];
    unfavorableFactors: string[];
    keyPoints: string[];
    timing: string;
  } {
    const keTi = lesson.keTi;
    const sanChuan = lesson.sanChuan;
    const biFa = lesson.biFa || [];

    const favorable: string[] = [];
    const unfavorable: string[] = [];
    const keyPoints: string[] = [];
    let judgment = '中性';

    const tiTiGood = ['元首课','知一课','重审课','涉害课','昴星课','比用课'];
    const tiTiBad = ['贼克课','遥克课','别责课','八专课'];
    const tiTiSpecial = ['伏吟课','返吟课'];

    if (tiTiGood.some(t => keTi.includes(t))) { judgment = '吉利'; favorable.push('课体吉利'); }
    else if (tiTiBad.some(t => keTi.includes(t))) { judgment = '谨慎'; unfavorable.push('课体需谨慎'); }
    else if (tiTiSpecial.some(t => keTi.includes(t))) { judgment = keTi.includes('伏吟') ? '待机' : '多变'; }

    const jiJiang = ['贵人','青龙','六合','太阴','太常','天后'];
    const xiongJiang = ['白虎','玄武','螣蛇','勾陈','天空','朱雀'];
    let jiCount = 0, xCount = 0;
    for (const chuan of sanChuan) {
      if (jiJiang.includes(chuan.tianjiang)) { jiCount++; favorable.push(`${chuan.tianjiang}临${chuan.zhi}（助力）`); }
      else if (xiongJiang.includes(chuan.tianjiang)) { xCount++; unfavorable.push(`${chuan.tianjiang}临${chuan.zhi}（阻力）`); }
    }

    // 天将权重综合判断
    if (jiCount >= 2 && xCount === 0) judgment = '吉利';
    else if (xCount >= 2 && jiCount === 0) judgment = '不利';

    // 毕法赋中关键信号
    const dangerKeywords = ['传逢空亡','干支相害','初传克末','三传递克','虎玄同现','雀勾并见'];
    const goodKeywords = ['三传递生','末传克初','吉将多临','贵人青龙并见','后合并见','驿马入传'];
    for (const bf of biFa) {
      if (dangerKeywords.some(k => bf.includes(k))) { unfavorable.push(bf); if (judgment !== '不利') judgment = '谨慎'; }
      if (goodKeywords.some(k => bf.includes(k))) { favorable.push(bf); if (judgment === '中性') judgment = '吉利'; }
    }

    // 占类特殊判断
    const zhanLeiMap: Record<string, { goodJiang: string[]; badJiang: string[]; goodBiFa: string[]; badBiFa: string[] }> = {
      '合作': { goodJiang: ['六合','贵人'], badJiang: ['勾陈','天空'], goodBiFa: ['合','合局'], badBiFa: ['相害','刑'] },
      '求财': { goodJiang: ['青龙','太常'], badJiang: ['白虎','天空'], goodBiFa: ['财','财局'], badBiFa: ['空亡','财化为鬼'] },
      '官职': { goodJiang: ['贵人','青龙'], badJiang: ['玄武','天空'], goodBiFa: ['升','贵人'], badBiFa: ['受克','空亡'] },
      '婚姻': { goodJiang: ['六合','天后'], badJiang: ['白虎','勾陈'], goodBiFa: ['合','后合'], badBiFa: ['冲','害','刑'] },
      '出行': { goodJiang: ['青龙','驿马'], badJiang: ['白虎','勾陈'], goodBiFa: ['马'], badBiFa: ['空亡','破'] },
      '疾病': { goodJiang: ['太常','青龙'], badJiang: ['白虎','腾蛇'], goodBiFa: ['生'], badBiFa: ['虎','鬼','空亡'] },
      '官非': { goodJiang: ['贵人','太阴'], badJiang: ['朱雀','勾陈'], goodBiFa: ['和解','贵人'], badBiFa: ['刑','害'] },
      '田宅': { goodJiang: ['太常','青龙'], badJiang: ['白虎','天空'], goodBiFa: ['墓','宅'], badBiFa: ['破','空亡'] },
    };

    const zl = zhanLeiMap[eventType];
    if (zl) {
      for (const chuan of sanChuan) {
        if (zl.goodJiang.includes(chuan.tianjiang)) favorable.push(`${chuan.tianjiang}临${chuan.zhi}利${eventType}`);
        if (zl.badJiang.includes(chuan.tianjiang)) unfavorable.push(`${chuan.tianjiang}临${chuan.zhi}不利${eventType}`);
      }
      for (const bf of biFa) {
        if (zl.goodBiFa.some(k => bf.includes(k))) favorable.push(bf);
        if (zl.badBiFa.some(k => bf.includes(k))) unfavorable.push(bf);
      }
    }

    keyPoints.push(`三传：${sanChuan.map(c => c.gan + c.zhi + c.tianjiang).join(' → ')}`);
    keyPoints.push(`课体：${keTi}`);
    keyPoints.push(`吉将${jiCount}个 / 凶将${xCount}个`);

    return { eventType, judgment, favorableFactors: [...new Set(favorable)], unfavorableFactors: [...new Set(unfavorable)], keyPoints, timing: '详见时间窗口' };
  }

  judgeSanChuanHeJu(sanChuan: SanChuanItem[], dayGan: string): SanChuanHeJuResult {
    const zhiList = sanChuan.map(c => c.zhi);
    const sanHeJu: Record<string, { element: string; name: string }> = {
      '巳酉丑': { element: '金', name: '三合金局' },
      '亥卯未': { element: '木', name: '三合木局' },
      '寅午戌': { element: '火', name: '三合火局' },
      '申子辰': { element: '水', name: '三合水局' },
    };
    const sanHuiJu: Record<string, { element: string; name: string }> = {
      '寅卯辰': { element: '木', name: '东方木局' },
      '巳午未': { element: '火', name: '南方火局' },
      '申酉戌': { element: '金', name: '西方金局' },
      '亥子丑': { element: '水', name: '北方水局' },
    };

    for (const [key, ju] of Object.entries(sanHeJu)) {
      const required = key.split('');
      if (required.every(z => zhiList.includes(z))) {
        const relation = this.getWuXingRelation(dayGan, ju.element);
        return {
          isHeJu: true,
          heJuType: ju.name,
          heJuElement: ju.element,
          relationToDayGan: relation,
          description: `三传${zhiList.join('')}合成${ju.name}，${dayGan}日干${relation}`,
        };
      }
    }

    for (const [key, ju] of Object.entries(sanHuiJu)) {
      const required = key.split('');
      if (required.every(z => zhiList.includes(z))) {
        const relation = this.getWuXingRelation(dayGan, ju.element);
        return {
          isHeJu: true,
          heJuType: ju.name,
          heJuElement: ju.element,
          relationToDayGan: relation,
          description: `三传${zhiList.join('')}会成${ju.name}，${dayGan}日干${relation}`,
        };
      }
    }

    return {
      isHeJu: false,
      heJuType: '',
      heJuElement: '',
      relationToDayGan: '',
      description: '三传未成合局',
    };
  }

  private getWuXingRelation(dayGan: string, targetElement: string): string {
    const dayElement = WU_XING_MAP[dayGan] || '土';
    const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const keMap: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

    if (keMap[dayElement] === targetElement) return `克${targetElement}为财`;
    if (keMap[targetElement] === dayElement) return `${targetElement}克日干为官杀`;
    if (shengMap[dayElement] === targetElement) return `生${targetElement}为食伤`;
    if (shengMap[targetElement] === dayElement) return `${targetElement}生日干为印`;
    if (dayElement === targetElement) return '比劫';
    return `与${targetElement}关系待定`;
  }

  getBiFaWithBusinessContext(siKe: SiKeItem[], sanChuan: SanChuanItem[], dayGan: string, dayZhi: string): BiFaResult[] {
    const rules = this.getBiFa(sanChuan, siKe);
    const contextMap: Record<string, string> = {
      '三传皆同': '力量高度集中，成败单一方向，不成功便成仁',
      '三传递生': '层层推进、贵人接力，事情有转机和助力',
      '三传递克': '层层阻碍、众人不解，事情推进异常困难',
      '初传克末': '开局好但收尾难，虎头蛇尾，前期承诺后期难以兑现',
      '末传克初': '开头受阻但结局转好，先苦后甜，坚持会有转机',
      '干课相同': '需要反复沟通确认，不是一锤子买卖',
      '干传支': '我方主动求对方，事多牵强被动，主导权不在自己手里',
      '干支相害': '面和心不和，表面和气实则暗有摩擦，合同细节容易出问题',
      '宾主不投': '双方理念不合、合作有摩擦，合同条款容易扯皮',
      '干上空亡': '自身准备不足，或时机尚未成熟，不宜强行推进',
      '支上空亡': '对方或环境基础不牢，对方承诺可能虚浮',
      '传逢空亡': '承诺落空、计划虚浮，前期说的后期做不到',
      '财化为鬼': '先得后失、利转害，看似有利实则暗藏陷阱',
      '鬼化为财': '先难后得、压力转化为利益，逆境中有转机',
      '贵人青龙并见': '高层支持和财务利好同时到位，重大利好窗口',
      '虎玄同现': '血光风险+信息泄露双重威胁，安全第一',
      '雀勾并见': '口舌纠纷+法律纠缠，需要法务介入',
      '后合并见': '中间人牵线+女性贵人，合作推进有喜',
      '驿马入传': '主动出击、出行、变动，适合开拓新市场',
      '天空入传': '信息不实、承诺不牢，务必多方核实',
      '太常入传': '交际应酬和宴请能打开局面，人际投资值得',
      '螣蛇入传': '警惕诈骗误导，信息源不可信，忌轻信口头承诺',
    };

    return rules.map(rule => {
      let context = '';
      for (const [key, val] of Object.entries(contextMap)) {
        if (rule.includes(key)) { context = val; break; }
      }
      if (rule.includes('合') && (rule.includes('局') || rule.includes('方'))) {
        context = '多方力量汇聚，有合作条件但利益分配需明确，合力大但忌独断';
      }
      if (rule.includes('冲')) { context = '突发事件或关系突变，需做好预案和心理准备'; }
      if (rule.includes('刑')) { context = '存在法律风险或人际伤害，行动前务必合法合规'; }
      if (rule.includes('吉将多临')) { context = '整体环境有利，多方助力到位，适合积极行动'; }
      if (rule.includes('凶将多临')) { context = '当前节点阻力较大，不宜冒进，以守为主'; }
      if (!context) { context = '此条毕法赋对应当前事态，需结合具体场景解读'; }
      return { rule, businessContext: context };
    });
  }

  getZhanLeiDetail(eventType: string, lesson: LiurenLesson): ZhanLeiDetail {
    const zhanLeiMap: Record<string, { leiShen: string[]; explanation: string; focus: string[] }> = {
      '合作': {
        leiShen: ['六合', '日辰', '青龙'],
        explanation: '合作占看六合、日辰与青龙，六合主和合媒介，日辰主双方本体，青龙主财喜',
        focus: ['看初传是否有合', '干支是否相生还是相害', '六合青龙是否临身入传', '有无贵人助力'],
      },
      '求财': {
        leiShen: ['青龙', '财爻', '太常'],
        explanation: '求财占看青龙、财爻与太常，青龙主财喜，财爻主实际收入，太常主衣食',
        focus: ['看三传是否有财爻', '合局是否成财局', '青龙太常是否得地', '有无财化为鬼之象'],
      },
      '官职': {
        leiShen: ['贵人', '官星', '青龙'],
        explanation: '官职占看贵人、官星与青龙，贵人主提携，官星主权位，青龙主权势',
        focus: ['看贵人是否临身入传', '官星是否得地有力', '有无刑冲克害', '贵人与青龙是否并见'],
      },
      '婚姻': {
        leiShen: ['天后', '六合', '青龙'],
        explanation: '婚姻占看天后、六合与青龙，天后主女方，六合主媒介和合，青龙主男方喜事',
        focus: ['看天后六合并见否', '三传是否成合局', '有无冲害刑克', '干支是否相合'],
      },
      '出行': {
        leiShen: ['驿马', '天马', '青龙'],
        explanation: '出行占看驿马、天马与青龙，马星主动迁，青龙主顺利',
        focus: ['看驿马是否入传发动', '有无虎煞阻碍', '青龙是否临身护佑', '归期有无空亡阻滞'],
      },
      '疾病': {
        leiShen: ['白虎', '病符', '日鬼'],
        explanation: '疾病占看白虎、病符与日鬼，白虎主凶丧血光，病符主疾厄，日鬼主病根',
        focus: ['看虎煞是否临身日干', '日干是否受克', '有无救神（青龙太常天医）', '病符死气何在'],
      },
      '官非': {
        leiShen: ['朱雀', '勾陈', '贵人'],
        explanation: '官非占看朱雀、勾陈与贵人，朱雀主口舌文书，勾陈主纠缠拖延，贵人主化解',
        focus: ['看雀勾是否并见', '贵人和解之象', '三传有无刑害', '末传有无转机'],
      },
      '田宅': {
        leiShen: ['日支', '勾陈', '太常'],
        explanation: '田宅占看日支、勾陈与太常，日支主家宅，勾陈主田土，太常主安稳',
        focus: ['看日支上神', '勾陈太常是否得地', '有无冲害破耗', '墓神何在'],
      },
    };

    const mapped = zhanLeiMap[eventType];
    if (mapped) {
      return { eventType, leiShen: mapped.leiShen, leiShenExplanation: mapped.explanation, focusPoints: mapped.focus };
    }
    return {
      eventType,
      leiShen: ['日辰', '初传', '末传'],
      leiShenExplanation: '一般占断看日辰与初末传关系，日辰主事体，初传主开始，末传主结局',
      focusPoints: ['看初传与日干的关系', '三传生克流转方向', '课体吉凶', '有无合局冲局'],
    };
  }

  getTrueSolarTimeDetail(askDateTime: Date, location?: string): TrueSolarTimeDetail {
    const coords = location ? CITY_COORDINATES[location] : undefined;
    if (!coords) {
      return {
        originalTime: askDateTime.toLocaleString('zh-CN'),
        location: location || '未知',
        longitude: 0,
        timeDiff: 0,
        correctedTime: askDateTime.toLocaleString('zh-CN'),
        correctedShiChen: SHI_CHEN_MAPPING[askDateTime.getHours()] || '子',
        description: '未提供有效地点，未做真太阳时校正',
      };
    }

    const timeDiff = calculateTrueSolarTimeOffset(coords.lng);
    const correctedDate = new Date(askDateTime.getTime() + timeDiff * 60 * 1000);
    const correctedShiChen = SHI_CHEN_MAPPING[correctedDate.getHours()] || '子';

    const originalStr = `${askDateTime.getFullYear()}年${askDateTime.getMonth() + 1}月${askDateTime.getDate()}日 ${String(askDateTime.getHours()).padStart(2, '0')}:${String(askDateTime.getMinutes()).padStart(2, '0')}`;
    const correctedStr = `${correctedDate.getFullYear()}年${correctedDate.getMonth() + 1}月${correctedDate.getDate()}日 ${String(correctedDate.getHours()).padStart(2, '0')}:${String(correctedDate.getMinutes()).padStart(2, '0')}`;

    const diffDirection = timeDiff > 0 ? '晚' : '早';
    const description = `${location}经度${coords.lng.toFixed(2)}°E，较北京时间约${diffDirection}${Math.abs(timeDiff)}分钟，${originalStr}北京时间折真太阳时约${correctedStr}，属${correctedShiChen}时`;

    return {
      originalTime: originalStr,
      location: location || '未知',
      longitude: coords.lng,
      timeDiff,
      correctedTime: correctedStr,
      correctedShiChen,
      description,
    };
  }

  getGanZhiDaysNearby(askDate: Date, days: number = 7): GanZhiDay[] {
    const result: GanZhiDay[] = [];
    const baseTime = askDate.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    const refDate = new Date(2026, 0, 1);
    const refGanIdx = 6;
    const refZhiIdx = 8;
    const refTime = refDate.getTime();
    const dayDiff = Math.round((baseTime - refTime) / oneDay);

    for (let i = -days; i <= days; i++) {
      const d = new Date(baseTime + i * oneDay);
      const totalDiff = dayDiff + i;
      const ganIdx = ((refGanIdx + totalDiff) % 10 + 10) % 10;
      const zhiIdx = ((refZhiIdx + totalDiff) % 12 + 12) % 12;
      const ganZhi = TIAN_GAN[ganIdx] + DI_ZHI[zhiIdx];

      result.push({
        date: `${d.getMonth() + 1}月${d.getDate()}日`,
        ganZhi,
        isAskDate: i === 0,
      });
    }

    return result;
  }

  setUpJinKouJue(askTime: Date, diFen?: string): JinKouJueLesson {
    const month = askTime.getMonth() + 1;
    const hour = askTime.getHours();
    const dayGan = this.getDayGan(askTime);
    const dayZhi = this.getDayZhi(askTime);

    const diFenZhi = diFen || DI_ZHI[Math.floor(Math.random() * 12)];

    const JIANG_MAP = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const yueJiangZhi = JIANG_MAP[(month - 1) % 12];
    const yueJiangIndex = DI_ZHI.indexOf(yueJiangZhi);
    const yueJiangTianJiang = TIAN_JIANG[yueJiangIndex >= 0 ? yueJiangIndex % 12 : 0];
    const yueJiang = `${yueJiangTianJiang}${yueJiangZhi}`;

    const guiShenIndex = DI_ZHI.indexOf(diFenZhi);
    const guiShenTianJiang = TIAN_JIANG[guiShenIndex >= 0 ? guiShenIndex % 12 : 0];
    const guiShenZhi = diFenZhi;
    const guiShen = `${guiShenTianJiang}${guiShenZhi}`;

    const renYuanGan = this.getRenYuanGan(diFenZhi, dayGan);
    const renYuan = renYuanGan;

    const wuWei = {
      gan: renYuanGan,
      shen: guiShen,
      jiang: yueJiang,
      fang: diFenZhi,
    };

    const yueJiangWuXing = ZHI_WU_XING_MAP[yueJiangZhi] || '土';
    const shengKe = {
      ganShengKeJiang: this.getWuXingRelation(renYuanGan, yueJiangWuXing),
      shenShengKeJiang: this.getShengKeRelationZhi(guiShenZhi, yueJiangZhi),
      fangShengKeJiang: this.getShengKeRelationZhi(diFenZhi, yueJiangZhi),
    };

    const keTi = this.determineJinKouJueKeTi(shengKe, wuWei, diFenZhi);

    return {
      diFen: diFenZhi,
      diFenZhi,
      yueJiang,
      yueJiangZhi,
      guiShen,
      guiShenZhi,
      renYuan,
      renYuanGan,
      wuWei,
      keTi,
      shengKe,
    };
  }

  private getDayGan(date: Date): string {
    const baseDate = new Date(2000, 0, 1);
    const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const ganIndex = ((diffDays % 10) + 10) % 10;
    return TIAN_GAN[ganIndex];
  }

  private getDayZhi(date: Date): string {
    const baseDate = new Date(2000, 0, 1);
    const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const zhiIndex = ((diffDays % 12) + 12) % 12;
    return DI_ZHI[zhiIndex];
  }

  private getRenYuanGan(diFenZhi: string, dayGan: string): string {
    const ganIndex = TIAN_GAN.indexOf(dayGan);
    if (ganIndex === -1) return '甲';

    const diIndex = DI_ZHI.indexOf(diFenZhi);
    if (diIndex === -1) return '甲';

    let startGan = 0;
    if (ganIndex === 0 || ganIndex === 5) startGan = 0;
    else if (ganIndex === 1 || ganIndex === 6) startGan = 2;
    else if (ganIndex === 2 || ganIndex === 7) startGan = 4;
    else if (ganIndex === 3 || ganIndex === 8) startGan = 6;
    else startGan = 8;

    const renYuanIndex = (startGan + diIndex) % 10;
    return TIAN_GAN[renYuanIndex];
  }

  private getShengKeRelationZhi(zhiA: string, zhiB: string): string {
    const wxA = ZHI_WU_XING_MAP[zhiA];
    const wxB = ZHI_WU_XING_MAP[zhiB];
    if (!wxA || !wxB) return '比和';

    const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const keMap: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

    if (shengMap[wxA] === wxB) return '生';
    if (keMap[wxA] === wxB) return '克';
    if (shengMap[wxB] === wxA) return '被生';
    if (keMap[wxB] === wxA) return '被克';
    return '比和';
  }

  private determineJinKouJueKeTi(
    shengKe: { ganShengKeJiang: string; shenShengKeJiang: string; fangShengKeJiang: string },
    wuWei: { gan: string; shen: string; jiang: string; fang: string },
    diFenZhi: string,
  ): string {
    const yangZhi = ['子', '寅', '辰', '午', '申', '戌'];
    const yinZhi = ['丑', '卯', '巳', '未', '酉', '亥'];
    const isDiFenYang = yangZhi.includes(diFenZhi);

    const TIAN_GAN_YANG = ['甲', '丙', '戊', '庚', '壬'];
    const isRenYuanYang = TIAN_GAN_YANG.includes(wuWei.gan);

    const guiShenZhi = wuWei.shen.slice(-1);
    const yueJiangZhi = wuWei.jiang.slice(-1);
    const isGuiShenYang = yangZhi.includes(guiShenZhi);
    const isYueJiangYang = yangZhi.includes(yueJiangZhi);

    const allYang = isRenYuanYang && isDiFenYang && isGuiShenYang && isYueJiangYang;
    const allYin = !isRenYuanYang && !isDiFenYang && !isGuiShenYang && !isYueJiangYang;

    if (allYang) return '四位纯阳';
    if (allYin) return '四位纯阴';

    if (guiShenZhi === yueJiangZhi) return '神将同宫';

    if (shengKe.shenShengKeJiang === '生') return '神生将';
    if (shengKe.shenShengKeJiang === '克') return '神克将';
    if (shengKe.ganShengKeJiang === '克') return '干克神';
    if (shengKe.ganShengKeJiang === '生') return '将生干';
    if (shengKe.fangShengKeJiang === '克') return '将克方';
    if (shengKe.fangShengKeJiang === '生') return '方生将';

    return '比和';
  }
}
