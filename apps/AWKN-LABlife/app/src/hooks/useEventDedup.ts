/**
 * 图表点击事件防重复 Hook
 * Recharts 点击事件容易重复触发，必须补一个简单去重。
 */

import { useRef, useCallback } from 'react';

/**
 * 返回一个 shouldSkip 函数，用于判断某 key 在短时间内是否已触发过
 * @param delay 去重窗口时长（毫秒），默认 500ms
 * @returns shouldSkip(key: string) => boolean
 *
 * @example
 * const shouldSkip = useEventDedup(500);
 * function handleMonthClick(month: string) {
 *   const eventKey = `click_kline_month:${month}`;
 *   if (shouldSkip(eventKey)) return;
 *   onSelectMonth(month);
 * }
 */
export function useEventDedup(delay = 500) {
  const lastKeyRef = useRef('');
  const lastTimeRef = useRef(0);

  return useCallback(
    (key: string): boolean => {
      const now = Date.now();

      if (lastKeyRef.current === key && now - lastTimeRef.current < delay) {
        return true; // 跳过
      }

      lastKeyRef.current = key;
      lastTimeRef.current = now;
      return false; // 不跳过
    },
    [delay],
  );
}
