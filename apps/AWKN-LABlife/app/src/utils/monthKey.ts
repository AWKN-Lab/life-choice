/**
 * 月份标准化工具
 * 解决 "2026年6月" / "2026-06" / "2026-6" / (2026, 6) 格式不统一问题
 * 所有比较统一走 toMonthKey()
 */

/**
 * 将任意月份输入统一为 YYYY-MM 格式
 * @param input 年份数字、年份字符串或完整月份字符串
 * @param month 可选的月份数字（当 input 为年份时）
 * @returns 标准化后的 YYYY-MM 字符串
 *
 * @example
 * toMonthKey("2026年6月")  // "2026-06"
 * toMonthKey(2026, 6)      // "2026-06"
 * toMonthKey("2026-6")     // "2026-06"
 * toMonthKey("2026-06")    // "2026-06"
 */
export function toMonthKey(input: string | number, month?: number): string {
  if (typeof input === 'number' && typeof month === 'number') {
    return `${input}-${String(month).padStart(2, '0')}`;
  }

  const str = String(input).trim();

  const matched = str.match(/(\d{4})\D?(\d{1,2})/);
  if (!matched) return str;

  const year = matched[1];
  const m = matched[2].padStart(2, '0');

  return `${year}-${m}`;
}
