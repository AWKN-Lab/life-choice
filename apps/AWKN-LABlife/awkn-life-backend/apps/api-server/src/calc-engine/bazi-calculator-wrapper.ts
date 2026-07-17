/**
 * 统一八字计算引擎入口
 * 节气→solar-terms.ts / 数据→bazi-data.service.ts
 */

import { Injectable } from '@nestjs/common';
import {
  getCorrectYearPillar,
  getMonthZhiIndex,
  getQiYunAge,
  QiYunAge,
  JIE_INDICES,
} from './bazi-engine/core/solar-terms';
import {
  GAN, ZHI,
  WUXING_TIANGAN, WUXING_DIZHI, WUXING_TO_EN,
  getZanggan, getShishen, getChangshengStage, getAllShenshaDefs, computeBaziShensha, getNayin, getKongWang,
} from './bazi-engine/core/bazi-data.service';

// ─── 五行英文映射（统一由 bazi-data.service.ts 派生，消除内联硬编码） ───
type WuxingEn = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const TIANGAN_WU_EN: Record<string, WuxingEn> = {};
for (const [g, wx] of Object.entries(WUXING_TIANGAN)) TIANGAN_WU_EN[g] = WUXING_TO_EN[wx];

const DIZHI_WU_EN: Record<string, WuxingEn> = {};
for (const [z, wx] of Object.entries(WUXING_DIZHI)) DIZHI_WU_EN[z] = WUXING_TO_EN[wx];

export interface BaziInput {
  year: number;
  month: number;  // 0-11 (JS month)
  day: number;
  hour: number;
  minute: number;
  gender: 'male' | 'female';
}

export interface BaziFullResult {
  // 四柱
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;

  // 十神
  yearShishen: string;
  monthShishen: string;
  dayShishen: string;
  hourShishen: string;

  // 五行统计
  wuxing: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };

  // 大运
  daYun: Array<{
    index: number;
    gan: string;
    zhi: string;
    full: string;
    startAge: number;
    endAge: number;
  }>;

  // 起运年龄（精确到年月日）
  qiYunAge: QiYunAge;

  // 流年
  liuNian: Array<{
    year: number;
    ganZhi: string;
    shishen: string;
  }>;

  // 流年详情（刑冲合害/用忌/评分/主题）
  liuNianDetail: Array<{
    year: number;
    ganZhi: string;
    shishen: string;
    he: Array<{ with: string; relation: string }>;
    chong: Array<{ with: string; relation: string }>;
    hai: Array<{ with: string; relation: string }>;
    xing: Array<{ with: string; relation: string }>;
    yongJi: string;
    score: number;
    theme: string;
  }>;

  // 神煞
  shenSha: Record<string, string[]>;

  // 纳音
  naYin: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };

  // 空亡
  kongWang: string[];

  // 胎元
  taiYuan: string;

  // 命宫
  mingGong: string;

  // 身宫
  shenGong: string;

  // 藏干十神
  zangganShishen: {
    year: Array<{ gan: string; shishen: string }>;
    month: Array<{ gan: string; shishen: string }>;
    day: Array<{ gan: string; shishen: string }>;
    hour: Array<{ gan: string; shishen: string }>;
  };

  // 十二长生
  changsheng: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };

  // 刑冲合害
  xingChongHeHai: {
    he: Array<{ pillars: string[]; relation: string }>;
    chong: Array<{ pillars: string[]; relation: string }>;
    hai: Array<{ pillars: string[]; relation: string }>;
    xing: Array<{ pillars: string[]; relation: string }>;
  };

  // 自坐（按各柱天干坐各柱地支）
  selfSeat: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };

  // 按柱返回神煞数组
  shenShaByPillar: {
    year: string[];
    month: string[];
    day: string[];
    hour: string[];
  };
}

@Injectable()
export class BaziCalculatorWrapper {
  countMainQiWuxing(pillars: string[]): BaziFullResult['wuxing'] {
    const wuxing = {
      wood: 0,
      fire: 0,
      earth: 0,
      metal: 0,
      water: 0,
    };

    // 统一使用模块级 TIANGAN_WU_EN / DIZHI_WU_EN，不再内联定义
    for (const pillar of pillars) {
      const gan = pillar?.[0];
      const zhi = pillar?.[1];
      if (gan && TIANGAN_WU_EN[gan]) wuxing[TIANGAN_WU_EN[gan]] += 1;
      if (zhi && DIZHI_WU_EN[zhi]) wuxing[DIZHI_WU_EN[zhi]] += 1;
    }

    return wuxing;
  }

  countWeightedWuxing(pillars: string[]): BaziFullResult['wuxing'] {
    const wuxing = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    for (const pillar of pillars) {
      const gan = pillar?.[0];
      const zhi = pillar?.[1];
      if (gan && TIANGAN_WU_EN[gan]) wuxing[TIANGAN_WU_EN[gan]] += 0.35;
      if (zhi) {
        const zg = getZanggan(zhi);
        if (zg.main && TIANGAN_WU_EN[zg.main]) wuxing[TIANGAN_WU_EN[zg.main]] += 0.3;
        if (zg.middle && TIANGAN_WU_EN[zg.middle]) wuxing[TIANGAN_WU_EN[zg.middle]] += 0.2;
        if (zg.residual && TIANGAN_WU_EN[zg.residual]) wuxing[TIANGAN_WU_EN[zg.residual]] += 0.15;
      }
    }

    return wuxing;
  }

  private computeRelations(
    zhiArr: string[],
    ganArr: string[],
  ): {
    he: Array<{ pillars: string[]; relation: string }>;
    chong: Array<{ pillars: string[]; relation: string }>;
    hai: Array<{ pillars: string[]; relation: string }>;
    xing: Array<{ pillars: string[]; relation: string }>;
  } {
    const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const zhiIdx = (z: string) => ZHI.indexOf(z);
    const pairKey = (a: number, b: number) => a < b ? `${a},${b}` : `${b},${a}`;

    const HE_PAIRS: Record<string, string> = {
      '0,1': '子丑合','2,11': '寅亥合','3,10': '卯戌合','4,9': '辰酉合','5,8': '巳申合','6,7': '午未合',
    };
    const CHONG_PAIRS: Record<string, string> = {
      '0,6': '子午冲','1,7': '丑未冲','2,8': '寅申冲','3,9': '卯酉冲','4,10': '辰戌冲','5,11': '巳亥冲',
    };
    const HAI_PAIRS: Record<string, string> = {
      '0,7': '子未害','1,6': '丑午害','2,5': '寅巳害','3,4': '卯辰害','8,11': '申亥害','9,10': '酉戌害',
    };

    const he: Array<{ pillars: string[]; relation: string }> = [];
    const chong: Array<{ pillars: string[]; relation: string }> = [];
    const hai: Array<{ pillars: string[]; relation: string }> = [];
    const xing: Array<{ pillars: string[]; relation: string }> = [];

    const n = zhiArr.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const k = pairKey(zhiIdx(zhiArr[i]), zhiIdx(zhiArr[j]));
        if (HE_PAIRS[k]) he.push({ pillars: [zhiArr[i], zhiArr[j]], relation: HE_PAIRS[k] });
        if (CHONG_PAIRS[k]) chong.push({ pillars: [zhiArr[i], zhiArr[j]], relation: CHONG_PAIRS[k] });
        if (HAI_PAIRS[k]) hai.push({ pillars: [zhiArr[i], zhiArr[j]], relation: HAI_PAIRS[k] });
      }
    }

    const ziXing = { '4': '辰','6': '午','9': '酉','11': '亥' };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (zhiArr[i] === zhiArr[j] && ziXing[zhiIdx(zhiArr[i])]) {
          xing.push({ pillars: [zhiArr[i], zhiArr[j]], relation: `${zhiArr[i]}自刑` });
        }
      }
    }

    const zhiIdxMap = new Map<number, number>();
    for (let i = 0; i < n; i++) zhiIdxMap.set(zhiIdx(zhiArr[i]), i);

    const SAN_HE = [
      { indices: [8, 0, 4], name: '申子辰水局' },
      { indices: [5, 9, 1], name: '巳酉丑金局' },
      { indices: [2, 6, 10], name: '寅午戌火局' },
      { indices: [11, 3, 7], name: '亥卯未木局' },
    ];
    for (const sh of SAN_HE) {
      if (sh.indices.every(idx => zhiIdxMap.has(idx))) {
        he.push({ pillars: sh.indices.map(idx => zhiArr[zhiIdxMap.get(idx)!]), relation: sh.name });
      }
    }

    const SAN_HUI = [
      { indices: [2, 3, 4], name: '寅卯辰木局' },
      { indices: [5, 6, 7], name: '巳午未火局' },
      { indices: [8, 9, 10], name: '申酉戌金局' },
      { indices: [11, 0, 1], name: '亥子丑水局' },
    ];
    for (const sh of SAN_HUI) {
      if (sh.indices.every(idx => zhiIdxMap.has(idx))) {
        he.push({ pillars: sh.indices.map(idx => zhiArr[zhiIdxMap.get(idx)!]), relation: sh.name });
      }
    }

    const GAN_HE: Record<string, string> = {
      '甲己': '甲己合土','己甲': '甲己合土','乙庚': '乙庚合金','庚乙': '乙庚合金',
      '丙辛': '丙辛合水','辛丙': '丙辛合水','丁壬': '丁壬合木','壬丁': '丁壬合木',
      '戊癸': '戊癸合火','癸戊': '戊癸合火',
    };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const key = ganArr[i] + ganArr[j];
        if (GAN_HE[key]) he.push({ pillars: [ganArr[i] + zhiArr[i], ganArr[j] + zhiArr[j]], relation: GAN_HE[key] });
      }
    }

    return { he, chong, hai, xing };
  }

  private determineYongJi(dayGan: string, monthZhi: string, wuxing: BaziFullResult['wuxing']): string {
    // GAN 已从 bazi-data.service.ts 统一导入；五行映射使用模块级常量
    const dayWu = TIANGAN_WU_EN[dayGan];
    const monthWu = DIZHI_WU_EN[monthZhi];

    // 月令生扶日主 → 旺；月令克泄日主 → 衰
    const SHENG: Record<string, string> = { water: 'wood', wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water' };
    const KE: Record<string, string> = { water: 'fire', fire: 'metal', metal: 'wood', wood: 'earth', earth: 'water' };

    const isSheng = SHENG[monthWu] === dayWu;
    const isKe = KE[monthWu] === dayWu;
    const isTong = monthWu === dayWu;

    // 旺衰初步判断
    let wangShuai: '旺' | '衰' | '平' = '平';
    if (isTong || isSheng) wangShuai = '旺';
    else if (isKe) wangShuai = '衰';

    // 综合五行统计修正
    const wuMap: Record<keyof typeof wuxing, string> = {
      wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
    };
    const totalScore = Object.values(wuxing).reduce((a, b) => a + b, 0);
    const dayScore = wuxing[dayWu] / (totalScore || 1);

    if (wangShuai === '旺' && dayScore < 0.25) return '用神: 需补' + wuMap[dayWu];
    if (wangShuai === '衰' && dayScore < 0.25) return '用神: 需补' + wuMap[dayWu];
    if (wangShuai === '旺' && dayScore > 0.4) return '忌神: ' + wuMap[dayWu] + '过旺需泄';
    if (wangShuai === '衰' && dayScore > 0.4) return '忌神: 身弱' + wuMap[dayWu] + '重';
    return '闲神';
  }

  private scoreLiuNian(
    relations: { he: Array<{ pillars: string[]; relation: string }>; chong: Array<{ pillars: string[]; relation: string }>; hai: Array<{ pillars: string[]; relation: string }>; xing: Array<{ pillars: string[]; relation: string }> },
    shishen: string,
    yongJi: string,
  ): number {
    let score = 60;

    // 合 +10
    score += relations.he.length * 10;
    // 冲 -15
    score -= relations.chong.length * 15;
    // 害 -8
    score -= relations.hai.length * 8;
    // 刑 -10
    score -= relations.xing.length * 10;

    // 十神影响
    const JI_SHEN = ['正印', '正官', '食神', '正财', '偏财'];
    const XIONG_SHEN = ['七杀', '伤官', '劫财', '枭神'];
    if (JI_SHEN.includes(shishen)) score += 5;
    if (XIONG_SHEN.includes(shishen)) score -= 5;

    // 用忌影响
    if (yongJi.startsWith('用神')) score += 10;
    if (yongJi.startsWith('忌神')) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private getLiuNianTheme(
    score: number,
    relations: { he: Array<{ pillars: string[]; relation: string }>; chong: Array<{ pillars: string[]; relation: string }> },
    shishen: string,
  ): string {
    if (score >= 80) return '大吉之年，诸事顺遂';
    if (score >= 65) return '平稳发展，小吉之象';
    if (score >= 50) return '运势平平，守成为主';
    if (relations.chong.length > 0) return '变动之年，注意冲击';
    if (relations.he.length > 0) return '合化之年，机遇暗藏';
    if (['七杀', '伤官', '劫财'].includes(shishen)) return '挑战之年，以守为攻';
    if (['正官', '正财', '正印'].includes(shishen)) return '事业之年，稳步提升';
    return '普通年份，积蓄力量';
  }

  /**
   * 计算完整八字命盘
   * 这是完整算法的简化封装
   */
  async calculate(input: BaziInput): Promise<BaziFullResult> {
    // 完整八字排盘
    const result = this.calculateBaZiFull(
      input.year,
      input.month,
      input.day,
      input.hour,
      input.minute,
      input.gender
    );

    return result;
  }

  /**
   * 核心八字计算逻辑
   */
  private calculateBaZiFull(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    gender: 'male' | 'female'
  ): BaziFullResult {
    // GAN, ZHI, WUXING_TIANGAN, WUXING_DIZHI, WUXING_TO_EN — 已从 bazi-data.service.ts 统一导入

    /** 计算干支的五行属性 */
    function countWuxing(ganZhi: string): string {
      return WUXING_TIANGAN[ganZhi] || WUXING_DIZHI[ganZhi] || '';
    }

    // 计算年柱（使用真节气：立春前后年柱不同）
    const correctYearPillar = getCorrectYearPillar(year, month, day, hour);
    const yearGan = correctYearPillar[0];
    const yearZhi = correctYearPillar[1];
    const yearGanIndex = GAN.indexOf(yearGan);
    const yearZhiIndex = ZHI.indexOf(yearZhi);

    // 计算月柱（基于真节气，精确到分钟）
    const wuHuDun: Record<string, number> = {
      '甲': 2, '乙': 4, '丙': 6, '丁': 8, '戊': 0,
      '己': 2, '庚': 4, '辛': 6, '壬': 8, '癸': 0
    };

    const monthZhiIndex = getMonthZhiIndex(year, month, day, hour);
    const monthOrderFromYin = (monthZhiIndex - 2 + 12) % 12;
    const monthGanIndex = ((wuHuDun[yearGan] || 0) + monthOrderFromYin) % 10;
    const monthGan = GAN[monthGanIndex];
    const monthZhi = ZHI[monthZhiIndex];

    // 计算日柱（使用儒略日数 JDN，精确且无远期年份限制）
    const jdn = (y: number, m: number, d: number): number => {
      const a = Math.floor((14 - m) / 12);
      const yy = y + 4800 - a;
      const mm = m + 12 * a - 3;
      return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    };
    const currentJdn = jdn(year, month + 1, day);
    const dayIdx = ((currentJdn + 49) % 60 + 60) % 60;
    const dayGanIndex = dayIdx % 10;
    const dayZhiIndex = dayIdx % 12;
    const dayGan = GAN[dayGanIndex];
    const dayZhi = ZHI[dayZhiIndex];

    // 计算时柱（五鼠遁）
    const wuShuDun: Record<string, number> = {
      '甲': 0, '乙': 2, '丙': 4, '丁': 6, '戊': 8,
      '己': 0, '庚': 2, '辛': 4, '壬': 6, '癸': 8
    };
    const hourZhiIndex = (Math.floor((hour + 1) / 2) % 12 + 12) % 12;
    const hourGanIndex = ((wuShuDun[dayGan] || 0) + hourZhiIndex) % 10;
    const hourGan = GAN[hourGanIndex];
    const hourZhi = ZHI[hourZhiIndex];

    // 计算十神
    const dayShishenList = GAN.map(g => getShishen(dayGan, g));
    const yearShishenIdx = GAN.indexOf(yearGan);
    const monthShishenIdx = GAN.indexOf(monthGan);
    const hourShishenIdx = GAN.indexOf(hourGan);

    // 计算五行统计：天干 0.35 + 藏干本气 0.3 + 中气 0.2 + 余气 0.15 加权
    const wuxing = this.countWeightedWuxing([
      `${yearGan}${yearZhi}`,
      `${monthGan}${monthZhi}`,
      `${dayGan}${dayZhi}`,
      `${hourGan}${hourZhi}`,
    ]);

    // 计算大运
    const isYangYear = yearGanIndex % 2 === 0;
    const isMale = gender === 'male';
    const isShun = (isYangYear && isMale) || (!isYangYear && !isMale);
    const qiYunAge = getQiYunAge(year, month, day, hour, isShun);
    const qiYunYears = qiYunAge.years;

    const daYun: BaziFullResult['daYun'] = [];
    for (let i = 0; i < 8; i++) {
      let ganIdx: number, zhiIdx: number;
      if (isShun) {
        ganIdx = (monthGanIndex + i + 1) % 10;
        zhiIdx = (monthZhiIndex + i + 1) % 12;
      } else {
        ganIdx = (monthGanIndex - i - 1 + 10) % 10;
        zhiIdx = (monthZhiIndex - i - 1 + 12) % 12;
      }
      daYun.push({
        index: i + 1,
        gan: GAN[ganIdx],
        zhi: ZHI[zhiIdx],
        full: GAN[ganIdx] + ZHI[zhiIdx],
        startAge: qiYunYears + i * 10,
        endAge: qiYunYears + (i + 1) * 10 - 1,
      });
    }

    // 计算流年（最近10年）
    const liuNianBaseYear = 1984;
    const liuNianBaseGan = 0;
    const liuNianBaseZhi = 0;
    const currentYear = new Date().getFullYear();
    const liuNian: BaziFullResult['liuNian'] = [];
    for (let y = 0; y < 10; y++) {
      const yearG = currentYear + y;
      const yearGOffset = yearG - liuNianBaseYear;
      const yearGGanIdx = ((liuNianBaseGan + yearGOffset) % 10 + 10) % 10;
      const yearGZhiIdx = ((liuNianBaseZhi + yearGOffset) % 12 + 12) % 12;
      const yearGGan = GAN[yearGGanIdx];
      const yearGZhi = ZHI[yearGZhiIdx];

      const shishenIdx = GAN.indexOf(yearGGan);
      liuNian.push({
        year: yearG,
        ganZhi: yearGGan + yearGZhi,
        shishen: dayShishenList[shishenIdx % 10] || '比肩',
      });
    }

    const liuNianDetail: BaziFullResult['liuNianDetail'] = [];
    const dayZhiArr = [yearZhi, monthZhi, dayZhi, hourZhi];
    const yuanGanArr = [yearGan, monthGan, dayGan, hourGan];
    const yongJi = this.determineYongJi(dayGan, monthZhi, wuxing);

    for (const ln of liuNian) {
      const lnGan = ln.ganZhi[0];
      const lnZhi = ln.ganZhi[1];
      // 流年 vs 原局
      const vsYuanJu = this.computeRelations(
        [lnZhi, ...dayZhiArr],
        [lnGan, ...yuanGanArr],
      );
      // 流年 vs 大运（找到当前活跃大运）
      const activeDaYun = daYun.find(d => ln.year >= (year + d.startAge) && ln.year < (year + d.endAge));
      const vsDaYun = activeDaYun
        ? this.computeRelations([lnZhi, activeDaYun.zhi], [lnGan, activeDaYun.gan])
        : { he: [], chong: [], hai: [], xing: [] };

      // 合并原局和大运的关系
      const allHe = [...vsYuanJu.he, ...vsDaYun.he];
      const allChong = [...vsYuanJu.chong, ...vsDaYun.chong];
      const allHai = [...vsYuanJu.hai, ...vsDaYun.hai];
      const allXing = [...vsYuanJu.xing, ...vsDaYun.xing];

      const score = this.scoreLiuNian(
        { he: allHe, chong: allChong, hai: allHai, xing: allXing },
        ln.shishen,
        yongJi,
      );
      const theme = this.getLiuNianTheme(score, { he: allHe, chong: allChong }, ln.shishen);

      liuNianDetail.push({
        year: ln.year,
        ganZhi: ln.ganZhi,
        shishen: ln.shishen,
        he: allHe.map(h => ({ with: h.pillars.join('+'), relation: h.relation })),
        chong: allChong.map(c => ({ with: c.pillars.join('+'), relation: c.relation })),
        hai: allHai.map(h => ({ with: h.pillars.join('+'), relation: h.relation })),
        xing: allXing.map(x => ({ with: x.pillars.join('+'), relation: x.relation })),
        yongJi: yongJi,
        score,
        theme,
      });
    }

    // 神煞（由 computeBaziShensha 计算，数据驱动）

    // 纳音
    const naYin: BaziFullResult['naYin'] = {
      year: getNayin(yearGan + yearZhi),
      month: getNayin(monthGan + monthZhi),
      day: getNayin(dayGan + dayZhi),
      hour: getNayin(hourGan + hourZhi),
    };

    // 空亡（基于完整日柱干支所在旬）
    const kongWang = getKongWang(dayGan + dayZhi);

    // 胎元
    const taiYuanGanIdx = (monthGanIndex + 1) % 10;
    const taiYuanZhiIdx = (monthZhiIndex + 3) % 12;
    const taiYuan = GAN[taiYuanGanIdx] + ZHI[taiYuanZhiIdx];

    // 命宫
    const mingGongZhiIdx = (14 - (monthZhiIndex + hourZhiIndex) % 12 + 12) % 12;
    const mingGong = GAN[((wuHuDun[yearGan] || 0) + mingGongZhiIdx) % 10] + ZHI[mingGongZhiIdx];

    // 身宫（公式：月支 + 时支 mod 12，从寅起正月）
    const shenGongZhiIdx = (monthZhiIndex + hourZhiIndex) % 12;
    const shenGong = GAN[((wuHuDun[yearGan] || 0) + shenGongZhiIdx) % 10] + ZHI[shenGongZhiIdx];

    const computeZangganShishen = (zhi: string) => {
      const zg = getZanggan(zhi);
      const result: Array<{ gan: string; shishen: string }> = [];
      const add = (g?: string | null) => {
        if (g) result.push({ gan: g, shishen: getShishen(dayGan, g) });
      };
      add(zg.main);
      add(zg.middle);
      add(zg.residual);
      return result;
    };

    const zangganShishen = {
      year: computeZangganShishen(yearZhi),
      month: computeZangganShishen(monthZhi),
      day: computeZangganShishen(dayZhi),
      hour: computeZangganShishen(hourZhi),
    };

    const changsheng = {
      year: getChangshengStage(dayGan, yearZhi),
      month: getChangshengStage(dayGan, monthZhi),
      day: getChangshengStage(dayGan, dayZhi),
      hour: getChangshengStage(dayGan, hourZhi),
    };

    const shenShaAll = computeBaziShensha(
      yearGan, yearZhi,
      monthGan, monthZhi,
      dayGan, dayZhi,
      hourGan, hourZhi,
    );

    const pillarZhiMap: Record<string, string> = {
      year: yearZhi,
      month: monthZhi,
      day: dayZhi,
      hour: hourZhi,
    };
    const shenShaByName: Record<string, string[]> = {};
    for (const [pillar, entries] of Object.entries(shenShaAll)) {
      for (const entry of entries) {
        if (!shenShaByName[entry.name]) shenShaByName[entry.name] = [];
        shenShaByName[entry.name].push(pillarZhiMap[pillar]);
      }
    }

    const zhiArr = [yearZhi, monthZhi, dayZhi, hourZhi];
    const pillarNames = ['year', 'month', 'day', 'hour'];
    const he: Array<{ pillars: string[]; relation: string }> = [];
    const chong: Array<{ pillars: string[]; relation: string }> = [];
    const hai: Array<{ pillars: string[]; relation: string }> = [];
    const xing: Array<{ pillars: string[]; relation: string }> = [];

    const zhiIdx = (z: string) => ZHI.indexOf(z);
    const pairKey = (a: number, b: number) => a < b ? `${a},${b}` : `${b},${a}`;

    const HE_PAIRS: Record<string, string> = {
      '0,1': '子丑合', '2,11': '寅亥合', '3,10': '卯戌合', '4,9': '辰酉合', '5,8': '巳申合', '6,7': '午未合',
    };
    const CHONG_PAIRS: Record<string, string> = {
      '0,6': '子午冲', '1,7': '丑未冲', '2,8': '寅申冲', '3,9': '卯酉冲', '4,10': '辰戌冲', '5,11': '巳亥冲',
    };
    const HAI_PAIRS: Record<string, string> = {
      '0,7': '子未害', '1,6': '丑午害', '2,5': '寅巳害', '3,4': '卯辰害', '8,11': '申亥害', '9,10': '酉戌害',
    };

    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const k = pairKey(zhiIdx(zhiArr[i]), zhiIdx(zhiArr[j]));
        if (HE_PAIRS[k]) he.push({ pillars: [pillarNames[i], pillarNames[j]], relation: HE_PAIRS[k] });
        if (CHONG_PAIRS[k]) chong.push({ pillars: [pillarNames[i], pillarNames[j]], relation: CHONG_PAIRS[k] });
        if (HAI_PAIRS[k]) hai.push({ pillars: [pillarNames[i], pillarNames[j]], relation: HAI_PAIRS[k] });
      }
    }

    const ziXing = { '4': '辰', '6': '午', '9': '酉', '11': '亥' };
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        if (zhiArr[i] === zhiArr[j] && ziXing[zhiIdx(zhiArr[i])]) {
          xing.push({ pillars: [pillarNames[i], pillarNames[j]], relation: `${zhiArr[i]}自刑` });
        }
      }
    }

    const zhiIdxMap = new Map<number, number>();
    for (let i = 0; i < 4; i++) zhiIdxMap.set(zhiIdx(zhiArr[i]), i);

    const SAN_HE: Array<{ indices: number[]; name: string }> = [
      { indices: [8, 0, 4], name: '申子辰水局' },
      { indices: [5, 9, 1], name: '巳酉丑金局' },
      { indices: [2, 6, 10], name: '寅午戌火局' },
      { indices: [11, 3, 7], name: '亥卯未木局' },
    ];
    const SAN_HUI: Array<{ indices: number[]; name: string }> = [
      { indices: [2, 3, 4], name: '寅卯辰木局' },
      { indices: [5, 6, 7], name: '巳午未火局' },
      { indices: [8, 9, 10], name: '申酉戌金局' },
      { indices: [11, 0, 1], name: '亥子丑水局' },
    ];

    for (const sh of SAN_HE) {
      if (sh.indices.every(idx => zhiIdxMap.has(idx))) {
        const pillars = sh.indices.map(idx => pillarNames[zhiIdxMap.get(idx)!]);
        he.push({ pillars, relation: sh.name });
      }
    }
    for (const sh of SAN_HUI) {
      if (sh.indices.every(idx => zhiIdxMap.has(idx))) {
        const pillars = sh.indices.map(idx => pillarNames[zhiIdxMap.get(idx)!]);
        he.push({ pillars, relation: sh.name });
      }
    }

    const GAN_HE: Record<string, string> = {
      '甲己': '甲己合土', '己甲': '甲己合土',
      '乙庚': '乙庚合金', '庚乙': '乙庚合金',
      '丙辛': '丙辛合水', '辛丙': '丙辛合水',
      '丁壬': '丁壬合木', '壬丁': '丁壬合木',
      '戊癸': '戊癸合火', '癸戊': '戊癸合火',
    };
    const ganArr = [yearGan, monthGan, dayGan, hourGan];
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const key = ganArr[i] + ganArr[j];
        if (GAN_HE[key]) {
          he.push({ pillars: [pillarNames[i], pillarNames[j]], relation: GAN_HE[key] });
        }
      }
    }

    return {
      yearPillar: yearGan + yearZhi,
      monthPillar: monthGan + monthZhi,
      dayPillar: dayGan + dayZhi,
      hourPillar: hourGan + hourZhi,
      yearShishen: dayShishenList[yearShishenIdx % 10] || '比肩',
      monthShishen: dayShishenList[monthShishenIdx % 10] || '劫财',
      dayShishen: '日主',
      hourShishen: dayShishenList[hourShishenIdx % 10] || '比肩',
      wuxing,
      daYun,
      qiYunAge,
      liuNian,
      liuNianDetail,
      shenSha: shenShaByName,
      naYin,
      kongWang,
      taiYuan,
      mingGong,
      shenGong,
      zangganShishen,
      changsheng,
      xingChongHeHai: { he, chong, hai, xing },
      selfSeat: {
        year: this.getSelfSeat(yearGan, yearZhi),
        month: this.getSelfSeat(monthGan, monthZhi),
        day: this.getSelfSeat(dayGan, dayZhi),
        hour: this.getSelfSeat(hourGan, hourZhi),
      },
      shenShaByPillar: {
        year: shenShaAll['year']?.map(e => e.name) || [],
        month: shenShaAll['month']?.map(e => e.name) || [],
        day: shenShaAll['day']?.map(e => e.name) || [],
        hour: shenShaAll['hour']?.map(e => e.name) || [],
      },
    };
  }

  /**
   * 计算自坐（天干坐地支的五行归属）
   */
  private getSelfSeat(gan: string, zhi: string): string {
    // 使用统一导入的 WUXING_TIANGAN / WUXING_DIZHI（中文五行）
    const ganWu = WUXING_TIANGAN[gan] || '';
    const zhiWu = WUXING_DIZHI[zhi] || '';

    if (ganWu === zhiWu) {
      return ganWu + '旺';
    }

    const SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const KE: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

    if (SHENG[ganWu] === zhiWu) {
      return ganWu + '泄';
    }
    if (KE[ganWu] === zhiWu) {
      return ganWu + '克';
    }

    return ganWu + '相';
  }
}
