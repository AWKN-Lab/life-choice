/**
 * 十二时辰统一选项表
 *
 * 合并自 FateDateChart.tsx 与 ZiweiPage.tsx 的重复定义。
 * - FateDateChart 使用 name / number / hour / range / branch 字段
 * - ZiweiPage 使用 value / label 字段
 * 统一结构同时包含两组字段，确保向后兼容。
 */

export interface ShichenOption {
  /** 地支名（单字，如 '子'） */
  name: string;
  /** 时辰序号（1-12，子时为 12） */
  number: number;
  /** 起始小时（24h 制，子时为 23） */
  hour: number;
  /** 时间范围字符串（如 '23:00-01:00'） */
  range: string;
  /** 生肖（如 '鼠'） */
  branch: string;
  /** HH:MM 格式的值（用于 select 等，子时为 '00:00'） */
  value: string;
  /** 完整标签（含时辰名和时间范围，如 '子时（23:00-01:00）'） */
  label: string;
}

export const SHICHEN_OPTIONS: ShichenOption[] = [
  { name: '子', number: 12, hour: 23, range: '23:00-01:00', branch: '鼠', value: '00:00', label: '子时（23:00-01:00）' },
  { name: '丑', number: 1, hour: 1, range: '01:00-03:00', branch: '牛', value: '01:00', label: '丑时（01:00-03:00）' },
  { name: '寅', number: 2, hour: 3, range: '03:00-05:00', branch: '虎', value: '03:00', label: '寅时（03:00-05:00）' },
  { name: '卯', number: 3, hour: 5, range: '05:00-07:00', branch: '兔', value: '05:00', label: '卯时（05:00-07:00）' },
  { name: '辰', number: 4, hour: 7, range: '07:00-09:00', branch: '龙', value: '07:00', label: '辰时（07:00-09:00）' },
  { name: '巳', number: 5, hour: 9, range: '09:00-11:00', branch: '蛇', value: '09:00', label: '巳时（09:00-11:00）' },
  { name: '午', number: 6, hour: 11, range: '11:00-13:00', branch: '马', value: '11:00', label: '午时（11:00-13:00）' },
  { name: '未', number: 7, hour: 13, range: '13:00-15:00', branch: '羊', value: '13:00', label: '未时（13:00-15:00）' },
  { name: '申', number: 8, hour: 15, range: '15:00-17:00', branch: '猴', value: '15:00', label: '申时（15:00-17:00）' },
  { name: '酉', number: 9, hour: 17, range: '17:00-19:00', branch: '鸡', value: '17:00', label: '酉时（17:00-19:00）' },
  { name: '戌', number: 10, hour: 19, range: '19:00-21:00', branch: '狗', value: '19:00', label: '戌时（19:00-21:00）' },
  { name: '亥', number: 11, hour: 21, range: '21:00-23:00', branch: '猪', value: '21:00', label: '亥时（21:00-23:00）' },
];
