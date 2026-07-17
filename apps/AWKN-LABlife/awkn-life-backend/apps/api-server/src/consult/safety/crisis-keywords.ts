/**
 * P1.5-2: 危机关键词库
 * 检测自杀/自残/暴力等危机信号
 */

export const CRISIS_KEYWORDS: string[] = [
  // 自杀相关
  '自杀', '想死', '不想活', '活不下去', '了结自己', '结束生命',
  '跳楼', '割腕', '吃安眠药', '上吊', '投河',
  // 自残相关
  '自残', '伤害自己', '割自己',
  // 暴力相关
  '杀了他', '杀了她', '杀了他们', '报复', '同归于尽',
  // 求救信号
  '救命', '帮帮我', '谁来救我',
];

/**
 * 检测问题是否包含危机关键词
 * @param question 用户输入的问题
 * @returns 是否检测到危机信号
 */
export function isCrisisQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}
