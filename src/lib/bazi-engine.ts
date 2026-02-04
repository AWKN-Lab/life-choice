/**
 * 2026高光日历 - 命理算法引擎
 * 基于子平真诠简化逻辑，计算用户2026年全年高光日
 */

// 天干地支定义
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行属性
const WUXING = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

// 地支藏干
const DI_ZHI_CANG_GAN: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲']
};

// 十神关系 (保留用于后续扩展)
// const SHI_SHEN = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];

// 高光日类型定义
export interface HighlightDay {
  date: Date;
  dateStr: string;
  type: '财官双美' | '贵人相助' | '桃花盛开' | '事业高升' | '财运亨通' | '智慧开启' | '平安顺遂';
  ganZhi: string;
  description: string;
  actionGuide: string;
  score: number; // 0-100
}

// 用户命盘信息
export interface UserBazi {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  dayMaster: string; // 日主
  dayMasterWuxing: string;
  pattern: string; // 格局
}

// 出生信息
export interface BirthInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar: boolean;
  gender: 'male' | 'female';
}

/**
 * 阳历转农历（简化算法）
 */
export function solarToLunar(year: number, month: number, day: number): { year: number; month: number; day: number } {
  // 简化处理，实际应用需要更复杂的农历转换
  return { year, month, day };
}

/**
 * 计算年柱
 */
function getYearPillar(year: number): string {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/**
 * 计算月柱
 */
function getMonthPillar(year: number, month: number): string {
  const yearGanIndex = (year - 4) % 10;
  const monthGanStart = (yearGanIndex % 5) * 2;
  const monthGanIndex = (monthGanStart + month - 1) % 10;
  const monthZhiIndex = (month + 1) % 12;
  return TIAN_GAN[monthGanIndex] + DI_ZHI[monthZhiIndex];
}

/**
 * 计算日柱（简化算法）
 */
function getDayPillar(year: number, month: number, day: number): string {
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const ganIndex = (diffDays + 10) % 10;
  const zhiIndex = (diffDays + 12) % 12;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

/**
 * 计算时柱
 */
function getHourPillar(dayGan: string, hour: number): string {
  const dayGanIndex = TIAN_GAN.indexOf(dayGan);
  const hourZhiIndex = Math.floor((hour + 1) / 2) % 12;
  const hourGanStart = (dayGanIndex % 5) * 2;
  const hourGanIndex = (hourGanStart + hourZhiIndex) % 10;
  return TIAN_GAN[hourGanIndex] + DI_ZHI[hourZhiIndex];
}

/**
 * 计算用户命盘
 */
export function calculateBazi(birthInfo: BirthInfo): UserBazi {
  let { year, month, day, hour } = birthInfo;
  
  // 如果是农历，转换为阳历（简化处理）
  if (birthInfo.isLunar) {
    // 实际应用需要农历转阳历
  }
  
  const yearPillar = getYearPillar(year);
  const monthPillar = getMonthPillar(year, month);
  const dayPillar = getDayPillar(year, month, day);
  const hourPillar = getHourPillar(dayPillar[0], hour);
  
  const dayMaster = dayPillar[0];
  const dayMasterWuxing = WUXING[dayMaster as keyof typeof WUXING];
  
  // 简化的格局判断
  const pattern = determinePattern(dayMaster, monthPillar);
  
  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster,
    dayMasterWuxing,
    pattern
  };
}

/**
 * 判断格局（简化版）
 */
function determinePattern(dayMaster: string, monthPillar: string): string {
  const monthZhi = monthPillar[1];
  const monthWuxing = DI_ZHI_CANG_GAN[monthZhi]?.[0] || '';
  const monthWuxingType = WUXING[monthWuxing as keyof typeof WUXING];
  
  const dayMasterWuxing = WUXING[dayMaster as keyof typeof WUXING];
  
  // 简化的格局判断逻辑
  if (monthWuxingType === dayMasterWuxing) {
    return '比肩格';
  } else if (
    (dayMasterWuxing === '木' && monthWuxingType === '火') ||
    (dayMasterWuxing === '火' && monthWuxingType === '土') ||
    (dayMasterWuxing === '土' && monthWuxingType === '金') ||
    (dayMasterWuxing === '金' && monthWuxingType === '水') ||
    (dayMasterWuxing === '水' && monthWuxingType === '木')
  ) {
    return '食神格';
  } else if (
    (dayMasterWuxing === '木' && monthWuxingType === '土') ||
    (dayMasterWuxing === '火' && monthWuxingType === '金') ||
    (dayMasterWuxing === '土' && monthWuxingType === '水') ||
    (dayMasterWuxing === '金' && monthWuxingType === '木') ||
    (dayMasterWuxing === '水' && monthWuxingType === '火')
  ) {
    return '财官格';
  }
  
  return '正印格';
}

/**
 * 计算2026年高光日
 */
export function calculateHighlightDays(bazi: UserBazi): HighlightDay[] {
  const highlights: HighlightDay[] = [];
  const year2026 = 2026;
  
  // 根据日主五行和格局，计算高光日
  const dayMaster = bazi.dayMaster;
  const pattern = bazi.pattern;
  const dayMasterWuxing = bazi.dayMasterWuxing;
  
  // 为每个月生成高光日
  for (let month = 1; month <= 12; month++) {
    const monthHighlights = generateMonthHighlights(
      year2026, 
      month, 
      dayMaster, 
      pattern, 
      dayMasterWuxing
    );
    highlights.push(...monthHighlights);
  }
  
  // 按日期排序
  highlights.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // 只返回前30个最高分的日期
  return highlights
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * 生成每月高光日
 */
function generateMonthHighlights(
  year: number, 
  month: number, 
  dayMaster: string,
  pattern: string,
  dayMasterWuxing: string
): HighlightDay[] {
  const highlights: HighlightDay[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // 根据命理逻辑，选择特定日期作为高光日
  const favorableDays = calculateFavorableDays(year, month, dayMaster, pattern);
  
  for (const day of favorableDays) {
    if (day <= daysInMonth) {
      const date = new Date(year, month - 1, day);
      const ganZhi = getDayPillar(year, month, day);
      
      const highlight = createHighlightDay(date, ganZhi, dayMaster, pattern, dayMasterWuxing);
      if (highlight) {
        highlights.push(highlight);
      }
    }
  }
  
  return highlights;
}

/**
 * 计算有利日期
 */
function calculateFavorableDays(
  _year: number, 
  month: number, 
  _dayMaster: string,
  pattern: string
): number[] {
  // 基于命理逻辑的有利日期计算
  const baseDays = [3, 8, 12, 18, 23, 28];
  
  // 根据格局调整
  if (pattern.includes('财官')) {
    baseDays.push(6, 16, 26);
  } else if (pattern.includes('食神')) {
    baseDays.push(5, 15, 25);
  } else if (pattern.includes('正印')) {
    baseDays.push(9, 19, 29);
  }
  
  // 根据月份调整
  const monthOffset = (month % 3) * 2;
  return baseDays.map(d => ((d + monthOffset - 1) % 30) + 1);
}

/**
 * 创建高光日对象
 */
function createHighlightDay(
  date: Date,
  ganZhi: string,
  _dayMaster: string,
  pattern: string,
  dayMasterWuxing: string
): HighlightDay | null {
  const dayGan = ganZhi[0];
  
  // 计算与日主的关系
  const dayGanWuxing = WUXING[dayGan as keyof typeof WUXING];
  const relation = calculateRelation(dayMasterWuxing, dayGanWuxing);
  
  // 根据关系判断高光类型
  let type: HighlightDay['type'];
  let description: string;
  let actionGuide: string;
  let score: number;
  
  // 随机因素，用于生成不同分数的日期
  const randomFactor = Math.random();
  
  switch (relation) {
    case '官':
      type = '事业高升';
      description = '官星当令，事业运势强劲，适合推进重要项目';
      actionGuide = '主动争取机会，向上级汇报工作成果';
      score = randomFactor > 0.7 ? 90 : randomFactor > 0.3 ? 75 : 55;
      break;
    case '财':
      type = '财运亨通';
      description = '财星高照，财运亨通，适合投资理财';
      actionGuide = '关注投资机会，但需谨慎决策';
      score = randomFactor > 0.7 ? 93 : randomFactor > 0.3 ? 78 : 58;
      break;
    case '印':
      type = '贵人相助';
      description = '印星护身，贵人运旺，易得长辈提携';
      actionGuide = '主动请教前辈，拓展人脉资源';
      score = randomFactor > 0.7 ? 87 : randomFactor > 0.3 ? 72 : 52;
      break;
    case '食':
      type = '智慧开启';
      description = '食神生财，创意灵感迸发，适合创作表达';
      actionGuide = '记录灵感，推进创意项目';
      score = randomFactor > 0.7 ? 85 : randomFactor > 0.3 ? 70 : 50;
      break;
    case '比':
      type = '桃花盛开';
      description = '比肩帮身，人际关系和谐，桃花运旺';
      actionGuide = '参加社交活动，拓展人际圈';
      score = randomFactor > 0.7 ? 83 : randomFactor > 0.3 ? 68 : 48;
      break;
    default:
      type = '平安顺遂';
      description = '日辰平和，诸事顺遂，适合稳步推进';
      actionGuide = '按部就班，稳扎稳打';
      score = randomFactor > 0.7 ? 75 : randomFactor > 0.3 ? 65 : 45;
  }
  
  // 特殊组合加分
  if (pattern.includes('财官') && (type === '事业高升' || type === '财运亨通')) {
    score += 5;
    description += '，财官双美，大吉之日';
  }
  
  // 日期格式化
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  return {
    date,
    dateStr,
    type,
    ganZhi,
    description,
    actionGuide,
    score: Math.min(Math.max(score, 0), 100)
  };
}

/**
 * 计算十神关系
 */
function calculateRelation(dayMasterWuxing: string, targetWuxing: string): string {
  const wuxingOrder = ['木', '火', '土', '金', '水'];
  const dayIndex = wuxingOrder.indexOf(dayMasterWuxing);
  const targetIndex = wuxingOrder.indexOf(targetWuxing);
  
  if (dayIndex === targetIndex) return '比';
  if ((dayIndex + 1) % 5 === targetIndex) return '食';
  if ((dayIndex + 2) % 5 === targetIndex) return '财';
  if ((dayIndex + 3) % 5 === targetIndex) return '官';
  return '印';
}

/**
 * 获取下一个高光日
 */
export function getNextHighlightDay(highlights: HighlightDay[]): HighlightDay | null {
  const now = new Date();
  const futureHighlights = highlights.filter(h => h.date > now);
  return futureHighlights.length > 0 ? futureHighlights[0] : null;
}

/**
 * 计算倒计时
 */
export function calculateCountdown(targetDate: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
}

/**
 * 获取年度关键词
 */
export function getAnnualKeyword(bazi: UserBazi): string {
  const patterns: Record<string, string> = {
    '财官格': '突破',
    '食神格': '创造',
    '正印格': '成长',
    '比肩格': '合作',
    '劫财格': '挑战'
  };
  
  return patterns[bazi.pattern] || '蜕变';
}

/**
 * 获取格局描述
 */
export function getPatternDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    '财官格': '财官双美，事业财运两旺，2026年是你大展宏图的一年',
    '食神格': '食神生财，创意无限，适合发挥才华，创造新价值',
    '正印格': '印星护身，贵人运旺，学习成长，稳步前进',
    '比肩格': '比肩帮身，人缘旺盛，合作共赢，携手并进',
    '劫财格': '劫财透干，竞争激烈，需要谨慎理财，稳中求进'
  };
  
  return descriptions[pattern] || '命格平和，顺天应人，2026年平安顺遂';
}
