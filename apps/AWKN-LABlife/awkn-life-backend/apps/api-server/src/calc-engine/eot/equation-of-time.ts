/**
 * Equation of Time (EOT) - 均时差计算
 *
 * 来源：天火智能体技能迁移报告 §2.3 真太阳时校准
 * 算法：NOAA / Spencer 公式
 *
 * EOT = 9.87 * sin(2B) - 7.53 * cos(B) - 1.5 * sin(B)
 * 其中 B = (360 / 365) * (dayOfYear - 81)，单位度
 *
 * 返回值单位：分钟（正数表示真太阳时比平均太阳时快）
 *
 * 验收标准：与 NOAA Solar Position Calculator 在 100 个采样点误差 ≤ 30 秒
 */

/**
 * 计算给定日期的均时差（EOT），单位分钟
 * @param date 日期对象
 * @returns EOT 分钟数（真太阳时 - 平均太阳时）
 */
export function getEquationOfTime(date: Date): number {
  const dayOfYear = getDayOfYear(date);
  const B = ((360 / 365) * (dayOfYear - 81)) * (Math.PI / 180);
  const eot =
    9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  return eot;
}

/**
 * 计算一年中的第几天（1-365/366）
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 真太阳时校正总偏移（分钟）
 *
 * 总偏移 = 经度差校正 + 均时差校正
 * 经度差校正 = (longitude - standardMeridian) * 4 分钟/度
 *
 * @param date 日期
 * @param longitude 出生地经度（东经为正）
 * @param standardMeridian 标准时区中央经线（中国默认 120°）
 * @returns 总偏移分钟数（加到标准时间上得到真太阳时）
 */
export function getTrueSolarTimeOffset(
  date: Date,
  longitude: number,
  standardMeridian: number = 120,
): number {
  const longitudeOffset = (longitude - standardMeridian) * 4;
  const eot = getEquationOfTime(date);
  return longitudeOffset + eot;
}

/**
 * 将标准时间转换为真太阳时
 */
export function toTrueSolarTime(
  standardTime: Date,
  longitude: number,
  standardMeridian: number = 120,
): Date {
  const offsetMinutes = getTrueSolarTimeOffset(standardTime, longitude, standardMeridian);
  return new Date(standardTime.getTime() + offsetMinutes * 60 * 1000);
}
