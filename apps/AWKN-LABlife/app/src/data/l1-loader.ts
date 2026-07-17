/**
 * L1 内容线 — 数据加载器
 *
 * 统一加载 scenarios、clauses、followups 数据集。
 * 按路由类型和用户状态提供筛选接口。
 */

import scenarios from './scenarios/index';
import clauses from './clauses/index';
import followups from './followups/index';
import type { ConversationScenario, ScenarioCategory } from './scenarios/types';
import type { Clause } from './clauses/types';
import type { Followup } from './followups/types';

export interface L1DataContext {
  scenarios: ConversationScenario[];
  clauses: Clause[];
  followups: Followup[];
}

/**
 * 获取完整 L1 数据集
 */
export function getL1Data(): L1DataContext {
  return { scenarios, clauses, followups };
}

/**
 * 按路由类型筛选对话样例
 */
export function getScenariosByRoute(routeType: string): ConversationScenario[] {
  return scenarios.filter(s => s.expectedRoute === routeType);
}

/**
 * 按分类筛选对话样例
 */
export function getScenariosByCategory(category: ScenarioCategory): ConversationScenario[] {
  return scenarios.filter(s => s.category === category);
}

/**
 * 按用户状态筛选断句
 */
export function getClausesByUserState(userState: string): Clause[] {
  return clauses
    .filter(c => c.userState === userState)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 按路由类型 + 用户状态筛选追问
 */
export function getFollowups(routeType: string, userState: string): Followup[] {
  return followups.filter(f =>
    f.routeTypes.includes(routeType) && f.userState === userState,
  );
}

/**
 * 随机获取 N 条追问（去重）
 */
export function getRandomFollowups(routeType: string, userState: string, count: number): Followup[] {
  const candidates = getFollowups(routeType, userState);
  if (candidates.length <= count) return candidates;

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export type { ConversationScenario, ScenarioCategory, Clause, Followup };