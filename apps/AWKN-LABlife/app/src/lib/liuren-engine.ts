/**
 * 断事推演起课引擎 - TypeScript 版本
 * 基于 Ruby 版本 (liuren.rb) 逻辑重写
 * 核心功能：起四课三传、天地盘、月将、贵神、将神、人元
 */

// ==================== 核心数据表 ====================

/** 天干 */
const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 地支 */
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 十二天将（贵神） */
const TIANJIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

/** 月将表：索引=月支(0子-11亥)，值=月将地支索引 */
const YUEJIANG = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

/** 贵神昼（以日干查起贵神地支索引）甲戊庚牛昼 */
const GUISHEN_DAY: Record<string, number> = {
  '甲': 1, '乙': 0, '丙': 11, '丁': 11, '戊': 1,
  '己': 0, '庚': 1, '辛': 6, '壬': 5, '癸': 5
};

/** 贵神夜（以日干查起贵神地支索引）六辛日马夜 */
const GUISHEN_NIGHT: Record<string, number> = {
  '甲': 7, '乙': 8, '丙': 9, '丁': 9, '戊': 7,
  '己': 8, '庚': 7, '辛': 2, '壬': 3, '癸': 3
};

/** 人元偏移（日干查）甲0乙2丙4丁6戊8 */
const RENYUAN_OFFSET: Record<string, number> = {
  '甲': 0, '乙': 2, '丙': 4, '丁': 6, '戊': 8,
  '己': 0, '庚': 2, '辛': 4, '壬': 6, '癸': 8
};

// ==================== 类型定义 ====================

interface GanZhiResult {
  gan: string;
  zhi: string;
  full: string;
}

interface SiZhu {
  year: GanZhiResult;
  month: GanZhiResult;
  day: GanZhiResult;
  time: GanZhiResult;
}

interface LiuRenResult {
  // 输入
  inputDate: string;
  difen: number;         // 地分索引 0-11 (子=0)
  difenName: string;     // 地分名称

  // 四柱
  sizhu: SiZhu;

  // 断事推演核心要素
  diFen: GanZhiResult;       // 地分
  yueJiang: { index: number; name: string; full: string };   // 月将
  jiangShen: { index: number; name: string; full: string };   // 将神
  guiShen: { index: number; name: string; full: string };  // 贵神
  renYuan: GanZhiResult;     // 人元
  jiangGan: GanZhiResult;    // 将干
  shenGan: GanZhiResult;     // 神干

  // 四课
  siKe: {
    dayGan: string;      // 日干
    firstKe: string;      // 一课：日干+将神
    secondKe: string;     // 二课：日支+将干
    thirdKe: string;     // 三课：神干+贵神
    fourthKe: string;     // 四课：人元+月将
  };

  // 天地盘
  tianPan: string[];    // 天盘（12宫）
  diPan: string[];      // 地盘（12宫）

  // 三传（简化版：贼克法）
  sanChuan: {
    shang: string;      // 上传/初传
    zhong: string;      // 中传
    xia: string;        // 下传/末传
  };

  // 元丈（吉凶参考）
  yuanWang: '元' | '丈' | '命' | '斩' | '破' | string;

  // 昼夜判断
  isDayTime: boolean;

  // 随机种子
  randomSeed: number;
}

// ==================== 工具函数 ====================

/** 模12运算（确保非负） */
function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

/** 模10运算（确保非负） */
function mod10(n: number): number {
  return ((n % 10) + 10) % 10;
}

/** 获取地支名称 */
function getDiZhiName(index: number): string {
  return DIZHI[mod12(index)] || '子';
}

/** 获取天干名称 */
function getTianGanName(index: number): string {
  return TIANGAN[mod10(index)] || '甲';
}

/** 判断昼夜（简化：6-18为昼） */
function isDayTime(hour: number): boolean {
  return hour >= 6 && hour < 18;
}

/** 简易四柱计算（不需要精确节气数据） */
function calculateSimpleSiZhu(year: number, month: number, day: number, hour: number): SiZhu {
  // 以1900-01-01甲戌为基准计算
  const baseYear = 1900, baseGan = 0, baseZhi = 10; // 甲戌

  // 计算总天数
  let totalDays = 0;
  for (let y = baseYear; y < year; y++) {
    totalDays += ((y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)) ? 366 : 365;
  }
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)) daysInMonth[1] = 29;
  for (let m = 0; m < month; m++) totalDays += daysInMonth[m];
  totalDays += day - 1;

  // 日干支
  const dayGan = mod10(baseGan + totalDays);
  const dayZhi = mod12(baseZhi + totalDays);

  // 年干支（以立春分年，简化处理）
  const yearGan = mod10(baseGan + (year - baseYear));
  const yearZhi = mod12(baseZhi + (year - baseYear));

  // 月干支（五虎遁）
  const wuHuDun: Record<string, number> = { '甲': 2, '乙': 4, '丙': 6, '丁': 8, '戊': 0, '己': 2, '庚': 4, '辛': 6, '壬': 8, '癸': 0 };
  const monthGan = mod10((wuHuDun[TIANGAN[yearGan]] || 0) + month);
  const monthZhi = mod12(2 + month); // 寅=2 开始

  // 时干支（五鼠遁）
  const wuShuDun: Record<string, number> = { '甲': 0, '乙': 2, '丙': 4, '丁': 6, '戊': 8, '己': 0, '庚': 2, '辛': 4, '壬': 6, '癸': 8 };
  const shiZhiIndex = Math.floor((hour + 1) / 2) % 12;
  const shiGan = mod10((wuShuDun[TIANGAN[dayGan]] || 0) + shiZhiIndex);

  return {
    year: { gan: TIANGAN[yearGan], zhi: DIZHI[yearZhi], full: TIANGAN[yearGan] + DIZHI[yearZhi] },
    month: { gan: TIANGAN[monthGan], zhi: DIZHI[monthZhi], full: TIANGAN[monthGan] + DIZHI[monthZhi] },
    day: { gan: TIANGAN[dayGan], zhi: DIZHI[dayZhi], full: TIANGAN[dayGan] + DIZHI[dayZhi] },
    time: { gan: TIANGAN[shiGan], zhi: DIZHI[shiZhiIndex], full: TIANGAN[shiGan] + DIZHI[shiZhiIndex] }
  };
}

/** 生成天盘（地盘+月将） */
function generateTianPan(yueJiangIndex: number): string[] {
  const pan: string[] = [];
  for (let i = 0; i < 12; i++) {
    pan.push(DIZHI[mod12(yueJiangIndex + i)]);
  }
  return pan;
}

/** 简易三传计算（贼克法） */
function calculateSanChuan(siKe: LiuRenResult['siKe'], difenIndex: number): LiuRenResult['sanChuan'] {
  const { firstKe, secondKe, thirdKe, fourthKe } = siKe;

  // 贼克法规则：
  // 1. 贼克：四课中有克者为初传
  // 2. 简单版：基于日干与将神的关系判断
  // 这里用简化规则：
  // - 一二三四课的起始地支建立关系链
  // - 初传=一课与四课的合
  // - 中传=二课与三课的合
  // - 末传=初传与中传的合

  const keItems = [
    { ke: firstKe, src: '一课' },
    { ke: secondKe, src: '二课' },
    { ke: thirdKe, src: '三课' },
    { ke: fourthKe, src: '四课' }
  ];

  // 找克：看一课和四课是否有相克关系
  // 简化：取地盘位置关系作为传递
  const d1 = DIZHI.indexOf(fourthKe[1]) || 0;
  const d2 = DIZHI.indexOf(firstKe[1]) || 0;
  const d3 = DIZHI.indexOf(secondKe[1]) || 0;
  const d4 = DIZHI.indexOf(thirdKe[1]) || 0;

  const shang = firstKe[0] + DIZHI[mod12(d1 + difenIndex)];
  const zhong = secondKe[0] + DIZHI[mod12(d2 + difenIndex)];
  const xia = thirdKe[0] + DIZHI[mod12(d3 + difenIndex)];

  return { shang, zhong, xia };
}

/** 判定元丈（吉凶参考） */
function judgeYuanWang(siKe: LiuRenResult['siKe']): string {
  // 元丈门是断事推演课的吉凶判断之一
  // 简化：根据日干阴阳判断
  const dayGanIndex = TIANGAN.indexOf(siKe.dayGan);
  if (dayGanIndex % 2 === 0) return '元'; // 阳干
  return '丈'; // 阴干
}

// ==================== 主引擎类 ====================

class LiuRenEngine {
  private cache: Map<string, LiuRenResult>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 计算断事推演课
   * @param dateStr 日期字符串，格式 "YYYY-MM-DD HH:mm"
   * @param difenIndex 地分索引 0-11（子=0, 丑=1, ...亥=11）
   * @param randomSeed 随机种子（用于某些随机判断）
   */
  public calculate(dateStr: string, difenIndex: number = 0, randomSeed: number = Date.now()): LiuRenResult {
    const cacheKey = `liuren_${dateStr}_${difenIndex}_${randomSeed}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 解析日期
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour] = timePart.split(':').map(Number);

    // 计算四柱
    const sizhu = calculateSimpleSiZhu(year, month - 1, day, hour);

    // 获取日干索引
    const dayGan = sizhu.day.gan;
    const dayGanIndex = TIANGAN.indexOf(dayGan);

    // 判断昼夜
    const isDay = isDayTime(hour);

    // ========== 起断事推演课 ==========

    // 1. 地分（用户输入或地支索引）
    const difen = mod12(difenIndex);
    const difenName = DIZHI[difen];

    // 2. 月将 = 月支索引查月将表（简化：以月支当令）
    //    实际应按节气，中气后换将。简化版：月将 = (月支 + 1) % 12
    const monthZhiIndex = DIZHI.indexOf(sizhu.month.zhi);
    const yueJiangIndex = YUEJIANG[monthZhiIndex] ?? mod12(monthZhiIndex + 1);
    const yueJiang = { index: yueJiangIndex, name: DIZHI[yueJiangIndex], full: DIZHI[yueJiangIndex] };

    // 3. 将神 = (地分 + 月将 - 时支) % 12
    const timeZhiIndex = DIZHI.indexOf(sizhu.time.zhi);
    const jiangShenIndex = mod12(difen + yueJiangIndex - timeZhiIndex);
    const jiangShen = { index: jiangShenIndex, name: DIZHI[jiangShenIndex], full: DIZHI[jiangShenIndex] };

    // 4. 贵神 = 昼/夜贵神表查起贵位置
    const guiShenStart = isDay ? GUISHEN_DAY[dayGan] : GUISHEN_NIGHT[dayGan];
    const guiShenIndex = mod12(difen - guiShenStart);
    const guiShen = { index: guiShenIndex, name: TIANJIANG[guiShenIndex], full: TIANJIANG[guiShenIndex] };

    // 5. 人元 = (地分 + 人元偏移) % 10
    const renYuanOffset = RENYUAN_OFFSET[dayGan] || 0;
    const renYuanIndex = mod10(difen + renYuanOffset);
    const renYuan = { gan: TIANGAN[renYuanIndex], zhi: '', full: TIANGAN[renYuanIndex] };

    // 6. 将干 = (将神 + 人元偏移) % 10
    const jiangGanIndex = mod10(jiangShenIndex + renYuanOffset);
    const jiangGan = { gan: TIANGAN[jiangGanIndex], zhi: '', full: TIANGAN[jiangGanIndex] };

    // 7. 神干 = (地分 + 人元偏移) % 10（与将干相同）
    const shenGanIndex = mod10(difen + renYuanOffset);
    const shenGan = { gan: TIANGAN[shenGanIndex], zhi: '', full: TIANGAN[shenGanIndex] };

    // ========== 四课 ==========
    // 一课：日干 + 将神
    // 二课：日支 + 将干
    // 三课：神干 + 贵神
    // 四课：人元 + 月将
    const siKe = {
      dayGan,
      firstKe: dayGan + DIZHI[jiangShenIndex],
      secondKe: sizhu.day.zhi + TIANGAN[jiangGanIndex],
      thirdKe: TIANGAN[shenGanIndex] + TIANJIANG[guiShenIndex],
      fourthKe: TIANGAN[renYuanIndex] + DIZHI[yueJiangIndex]
    };

    // ========== 天地盘 ==========
    const tianPan = generateTianPan(yueJiangIndex);
    const diPan = [...DIZHI]; // 地盘固定

    // ========== 三传 ==========
    const sanChuan = calculateSanChuan(siKe, difen);

    // ========== 元丈 ==========
    const yuanWang = judgeYuanWang(siKe);

    const result: LiuRenResult = {
      inputDate: dateStr,
      difen,
      difenName,
      sizhu,
      diFen: { gan: '', zhi: DIZHI[difen], full: DIZHI[difen] },
      yueJiang,
      jiangShen,
      guiShen,
      renYuan,
      jiangGan,
      shenGan,
      siKe,
      tianPan,
      diPan,
      sanChuan,
      yuanWang: yuanWang as LiuRenResult['yuanWang'],
      isDayTime: isDay,
      randomSeed
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * 获取天盘某宫的名称
   */
  public getTianPanGong(gongIndex: number, yueJiangIndex: number): string {
    return DIZHI[mod12(gongIndex + yueJiangIndex)];
  }

  /**
   * 获取神将名称（天盘上对应的将神）
   */
  public getShenJiangOnTianPan(diZhiIndex: number, yueJiangIndex: number): string {
    const tianIndex = mod12(diZhiIndex + yueJiangIndex);
    return TIANJIANG[tianIndex];
  }

  /**
   * 格式化输出结果
   */
  public formatResult(result: LiuRenResult): string {
    const lines: string[] = [];
    lines.push('【断事推演课】');
    lines.push(`日期：${result.inputDate}  ${result.isDayTime ? '昼' : '夜'}`);
    lines.push(`地分：${result.difenName}`);
    lines.push('─── 四柱 ───');
    lines.push(`年柱：${result.sizhu.year.full}`);
    lines.push(`月柱：${result.sizhu.month.full}`);
    lines.push(`日柱：${result.sizhu.day.full}`);
    lines.push(`时柱：${result.sizhu.time.full}`);
    lines.push('─── 核心神将 ───');
    lines.push(`月将：${result.yueJiang.full}`);
    lines.push(`将神：${result.jiangShen.full}`);
    lines.push(`贵神：${result.guiShen.name}`);
    lines.push(`人元：${result.renYuan.full}`);
    lines.push(`将干：${result.jiangGan.full}`);
    lines.push(`神干：${result.shenGan.full}`);
    lines.push('─── 四课 ───');
    lines.push(`一课：${result.siKe.firstKe}`);
    lines.push(`二课：${result.siKe.secondKe}`);
    lines.push(`三课：${result.siKe.thirdKe}`);
    lines.push(`四课：${result.siKe.fourthKe}`);
    lines.push('─── 三传 ───');
    lines.push(`初传：${result.sanChuan.shang}`);
    lines.push(`中传：${result.sanChuan.zhong}`);
    lines.push(`末传：${result.sanChuan.xia}`);
    lines.push(`元丈：${result.yuanWang}`);
    return lines.join('\n');
  }
}

// 导出
export default LiuRenEngine;
export { LiuRenEngine };
export type { LiuRenResult, SiZhu, GanZhiResult };
