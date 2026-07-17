/**
 * P1-19: 转化漏斗埋点工具
 *
 * 漏斗事件清单：
 * | 事件名                       | 触发时机           | 目标   |
 * |------------------------------|-------------------|--------|
 * | funnel_home_to_ask           | 用户点击问事入口    | ≥ 30% |
 * | funnel_ask_to_complete       | 推演完成           | ≥ 60% |
 * | funnel_complete_to_followup  | 用户追问 1 次      | ≥ 40% |
 * | funnel_followup_to_pay       | 用户点击付费升级    | ≥ 5%  |
 * | funnel_home_to_kline         | 用户点击K线入口     | ≥ 25% |
 * | funnel_kline_to_share        | 用户点击分享        | ≥ 10% |
 */

const FUNNEL_EVENTS = new Set([
  'funnel_home_to_ask',
  'funnel_ask_to_complete',
  'funnel_complete_to_followup',
  'funnel_followup_to_pay',
  'funnel_home_to_kline',
  'funnel_kline_to_share',
]);

/**
 * 发送漏斗埋点事件
 * - console.log 输出便于开发调试
 * - 非阻塞 fetch 发送到后端 /api/v1/analytics/event
 * - 静默失败，不影响业务
 */
export function trackFunnel(event: string, data?: Record<string, unknown>) {
  if (!FUNNEL_EVENTS.has(event)) {
    console.warn(`[FUNNEL] Unknown funnel event: ${event}`);
  }

  // 非阻塞发送到后端
  fetch('/api/v1/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, timestamp: Date.now() }),
  }).catch(() => {
    // 静默失败
  });
}
