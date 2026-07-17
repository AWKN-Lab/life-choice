/**
 * 行为事件类型定义与白名单守卫
 * 后端不能什么事件都收，要补白名单，否则脏数据会进库。
 */

export const ALLOWED_BEHAVIOR_EVENTS = [
  'view_kline',
  'click_kline_month',
  'view_state_radar',
  'view_phase_chart',
  'click_tide_from_result',
  'claim_confirmed',
  'claim_partial',
  'claim_rejected',
  'action_executed',
  'action_partial',
  'action_skipped',
  'view_metaphysics_hint',
  'hide_metaphysics_hint',
  'naming_favorite',
  'naming_unfavorite',
  'naming_remove',
  'naming_restore',
  'naming_compare',
  'naming_final_select',
  'naming_iteration_requested',
  'poster_generated',
  'poster_saved',
  'poster_shared',
  'poster_share_cancelled',
  'module_retry',
] as const;

export type BehaviorEventType = (typeof ALLOWED_BEHAVIOR_EVENTS)[number];

/**
 * 检查事件类型是否在白名单中
 * @param value 待检查的事件类型字符串
 * @returns true 如果在白名单中
 */
export function isAllowedBehaviorEvent(value: string): value is BehaviorEventType {
  return (ALLOWED_BEHAVIOR_EVENTS as readonly string[]).includes(value);
}
