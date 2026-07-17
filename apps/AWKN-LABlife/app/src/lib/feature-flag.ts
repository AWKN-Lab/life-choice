/**
 * Feature Flag 框架（M6 补缺）
 *
 * 设计动机：
 *   整改计划 14 个任务都涉及面向用户的改动。一次性全量发布 = 翻车零退路。
 *   用 Feature Flag 实现：
 *     1. 灰度：1% → 10% → 50% → 100% 渐进式放量
 *     2. 隔离：A/B 测试（控制组 vs 实验组）
 *     3. 急停：30 秒内关闭开关
 *
 * 与整改计划任务的对应：
 *   - divination_ritual_enabled       → P1-2 仪式动画
 *   - expectation_management_enabled  → P1-3 期望管理
 *   - cost_warning_enabled            → P2-1 蛐蛐代价提醒
 *   - cost_confirmation_enabled       → P2-2 代价确认环
 *   - high_risk_script_enabled        → P2-3 高风险场景
 *   - callback_enabled                → P3-1 回访系统
 *   - memory_anchor_enabled           → P3-2 记忆锚定
 *   - user_classifier_enabled         → P3-3 用户状态分类
 *   - multi_turn_enabled              → P4-2/3/4 多轮对话
 *
 * 使用方式：
 *   import { isEnabled } from '@/lib/feature-flag';
 *   if (isEnabled('divination_ritual_enabled', { userId })) {
 *     return <DivinationRitualLoader />;
 *   }
 *   return <SimpleSpinner />;
 *
 * 决策依据：[DOD-开发整改计划.md §通用验收] · [批判性分析-开发整改计划.md R6]
 *
 * @author 补缺计划 M6
 * @date 2026-06-13
 */

import { FLAG_REGISTRY, FlagRule } from '../config/feature-flags.config';

// ───────────────────────────────────────────────────────────────────────
// 类型定义
// ───────────────────────────────────────────────────────────────────────

/**
 * Feature Flag 标识符（与 FLAG_REGISTRY 严格对应）
 *
 * 添加新 flag 的步骤：
 *   1. 在 feature-flags.config.ts 的 FLAG_REGISTRY 中加一项
 *   2. 在此处联合类型中加一项（TS 会强制提醒）
 *   3. 在 rollout 阶段调 setFlagOverride 或远程配置生效
 */
export type FlagKey =
  | 'divination_ritual_enabled'
  | 'expectation_management_enabled'
  | 'cost_warning_enabled'
  | 'cost_confirmation_enabled'
  | 'high_risk_script_enabled'
  | 'callback_enabled'
  | 'memory_anchor_enabled'
  | 'user_classifier_enabled'
  | 'multi_turn_enabled'
  | 'avatar_replacement_enabled';

/**
 * Flag 评估上下文
 *
 * - userId: 必填，用于哈希分桶
 * - cohort: 可选，用于 A/B 测试（'control' | 'treatment_a' | 'treatment_b'）
 * - deviceType: 可选，移动/桌面不同策略
 * - region: 可选，地区差异化（未来扩展）
 */
export interface FlagContext {
  userId: string;
  cohort?: 'control' | 'treatment_a' | 'treatment_b';
  deviceType?: 'mobile' | 'desktop';
  region?: string;
}

/**
 * Flag 评估结果（含决策依据）
 */
export interface FlagEvaluation {
  /** 是否启用 */
  enabled: boolean;
  /** 评估原因（用于日志和埋点） */
  reason:
    | 'override_enabled'      // 强制开启（运维/测试）
    | 'override_disabled'     // 强制关闭（紧急回滚）
    | 'deny_list'             // 黑名单用户
    | 'allow_list'            // 白名单用户（内测）
    | 'percentage_in'         // 哈希落在放量区间内
    | 'percentage_out'        // 哈希落在放量区间外
    | 'flag_not_found'        // 未注册的 flag（默认 false）
    | 'disabled_default';     // 注册但未开启（默认 false）
}

// ───────────────────────────────────────────────────────────────────────
// 内部状态
// ───────────────────────────────────────────────────────────────────────

/**
 * 本地覆盖（用于紧急关闭 / 内测白名单）
 * 注意：这是 Map，不是 LocalStorage 持久化，避免跨用户污染
 */
const localOverrides = new Map<FlagKey, boolean>();

/**
 * 用户级 deny list（用于紧急把某用户排除）
 */
const userDenyList = new Map<FlagKey, Set<string>>();

/**
 * 用户级 allow list（用于内测白名单）
 */
const userAllowList = new Map<FlagKey, Set<string>>();

// ───────────────────────────────────────────────────────────────────────
// 核心 API
// ───────────────────────────────────────────────────────────────────────

/**
 * 判断某 flag 对当前上下文是否启用
 *
 * 评估顺序（高优先级 → 低优先级）：
 *   1. 本地 override（运维/测试）
 *   2. 用户 deny list（黑名单）
 *   3. 用户 allow list（白名单）
 *   4. 百分比放量（哈希分桶）
 *   5. flag 不存在 / 默认 disabled
 */
export function isEnabled(flag: FlagKey, ctx: FlagContext): boolean {
  return evaluate(flag, ctx).enabled;
}

/**
 * 完整评估（带 reason，便于日志和埋点）
 */
export function evaluate(flag: FlagKey, ctx: FlagContext): FlagEvaluation {
  // 1. 本地 override（最高优先级）
  if (localOverrides.has(flag)) {
    const enabled = localOverrides.get(flag)!;
    return {
      enabled,
      reason: enabled ? 'override_enabled' : 'override_disabled',
    };
  }

  // 2. 用户 deny list
  const denySet = userDenyList.get(flag);
  if (denySet?.has(ctx.userId)) {
    return { enabled: false, reason: 'deny_list' };
  }

  // 3. 用户 allow list
  const allowSet = userAllowList.get(flag);
  if (allowSet?.has(ctx.userId)) {
    return { enabled: true, reason: 'allow_list' };
  }

  // 4. 查找注册表
  const rule = FLAG_REGISTRY[flag];
  if (!rule) {
    if (import.meta.env.DEV) {
      console.warn(
        `[FeatureFlag] Flag "${flag}" 未在 FLAG_REGISTRY 中注册，默认 false`,
      );
    }
    return { enabled: false, reason: 'flag_not_found' };
  }

  // 5. 百分比放量（确定性哈希分桶）
  if (rule.percentage <= 0) {
    return { enabled: false, reason: 'disabled_default' };
  }
  if (rule.percentage >= 100) {
    return { enabled: true, reason: 'disabled_default' };
  }
  const hash = hashUserIdToBucket(ctx.userId, flag);
  if (hash < rule.percentage) {
    return { enabled: true, reason: 'percentage_in' };
  }
  return { enabled: false, reason: 'percentage_out' };
}

// ───────────────────────────────────────────────────────────────────────
// 运维 API（紧急回滚 / 内测白名单）
// ───────────────────────────────────────────────────────────────────────

/**
 * 设置本地 override（强制开关）
 *
 * 场景：
 *   - 紧急回滚：setFlagOverride('divination_ritual_enabled', false)
 *   - 内部测试：setFlagOverride('multi_turn_enabled', true)
 *
 * 注意：仅对当前会话有效（不持久化），刷新页面后失效
 */
export function setFlagOverride(flag: FlagKey, enabled: boolean | null): void {
  if (enabled === null) {
    localOverrides.delete(flag);
  } else {
    localOverrides.set(flag, enabled);
  }
  if (import.meta.env.DEV) {
  }
}

/**
 * 把指定用户加入 deny list
 * 用途：某用户被新功能伤害时紧急排除
 */
export function addToDenyList(flag: FlagKey, userId: string): void {
  if (!userDenyList.has(flag)) {
    userDenyList.set(flag, new Set());
  }
  userDenyList.get(flag)!.add(userId);
}

/**
 * 把指定用户加入 allow list
 * 用途：CEO / 内部员工 / 重点客户优先体验
 */
export function addToAllowList(flag: FlagKey, userId: string): void {
  if (!userAllowList.has(flag)) {
    userAllowList.set(flag, new Set());
  }
  userAllowList.get(flag)!.add(userId);
}

/**
 * 批量调整放量比例（远程配置使用，本地降级）
 *
 * 场景：后端动态下发放量策略（百分比 0~100）
 */
export function applyRemoteRegistry(remoteRegistry: Partial<Record<FlagKey, FlagRule>>): void {
  for (const [flag, rule] of Object.entries(remoteRegistry) as [FlagKey, FlagRule][]) {
    if (FLAG_REGISTRY[flag]) {
      FLAG_REGISTRY[flag] = { ...FLAG_REGISTRY[flag], ...rule };
    }
  }
}

/**
 * 从后端 API 同步 Feature Flag 状态，覆盖本地百分比配置
 *
 * 调用 GET /api/feature-flags 获取后端环境变量驱动的开关状态，
 * 将 enabled=true 的 flag 的 percentage 设为 100，enabled=false 的设为 0。
 * 本地 override / deny list / allow list 优先级仍高于此。
 */
export async function syncFeatureFlagsFromServer(): Promise<void> {
  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    const res = await fetch(`${apiBase}/feature-flags`);
    if (!res.ok) {
      if (import.meta.env.DEV) {
        console.warn(`[FeatureFlag] 同步失败: HTTP ${res.status}`);
      }
      return;
    }
    const remoteFlags = await res.json() as Record<string, boolean>;
    const remoteRegistry: Partial<Record<FlagKey, FlagRule>> = {};
    for (const [flag, enabled] of Object.entries(remoteFlags)) {
      if (FLAG_REGISTRY[flag]) {
        remoteRegistry[flag as FlagKey] = {
          ...FLAG_REGISTRY[flag],
          percentage: enabled ? 100 : 0,
        };
      }
    }
    applyRemoteRegistry(remoteRegistry);
    if (import.meta.env.DEV) {
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[FeatureFlag] 远程同步异常:', err);
    }
  }
}

// ───────────────────────────────────────────────────────────────────────
// 内部工具
// ───────────────────────────────────────────────────────────────────────

/**
 * 确定性哈希：把 userId 映射到 [0, 100) 的稳定桶号
 *
 * 关键属性：
 *   - 同一 userId + flag 永远落在同一桶（重要：避免用户感知闪烁）
 *   - 不同 userId 均匀分布
 *   - 不同 flag 的桶号独立（避免所有 flag 同步放量）
 */
function hashUserIdToBucket(userId: string, flag: FlagKey): number {
  // 简单但稳定的 FNV-1a 哈希
  let hash = 2166136261;
  const input = `${userId}:${flag}`; // 拼接 flag 保证独立
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // FNV prime，保持 32 位无符号
  }
  return hash % 100;
}

// ───────────────────────────────────────────────────────────────────────
// 调试工具
// ───────────────────────────────────────────────────────────────────────

/**
 * 列出当前所有 flag 的状态（开发模式用）
 */
export function listAllFlags(ctx: FlagContext): Array<{ flag: FlagKey; evaluation: FlagEvaluation }> {
  const flags: FlagKey[] = [
    'divination_ritual_enabled',
    'expectation_management_enabled',
    'cost_warning_enabled',
    'cost_confirmation_enabled',
    'high_risk_script_enabled',
    'callback_enabled',
    'memory_anchor_enabled',
    'user_classifier_enabled',
    'multi_turn_enabled',
    'avatar_replacement_enabled',
  ];
  return flags.map((flag) => ({ flag, evaluation: evaluate(flag, ctx) }));
}
