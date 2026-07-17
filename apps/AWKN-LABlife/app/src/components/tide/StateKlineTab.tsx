/**
 * StateKlineTab — 状态 K线 Tab
 * 接 useTidePackage + useEventDedup + toMonthKey
 */

import { useMemo } from 'react';
import { useTidePackage } from '../../hooks/useTidePackage';
import { useEventDedup } from '../../hooks/useEventDedup';
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking';
import { toMonthKey } from '../../utils/monthKey';

export interface StateKlineTabProps {
  recordId: string;
  onSelectMonth?: (month: string) => void;
}

export function StateKlineTab({ recordId, onSelectMonth }: StateKlineTabProps) {
  const { data, loading, error } = useTidePackage();
  const shouldSkip = useEventDedup(500);
  const { track } = useBehaviorTracking();

  const bars = useMemo(() => data.klineBars, [data.klineBars]);

  if (loading) return <div className="text-sm text-gray-500">加载 K线数据中…</div>;
  if (error) return <div className="text-sm text-red-500">K线数据加载失败：{error.message}</div>;

  return (
    <div className="space-y-2">
      {bars.map((bar) => {
        const monthKey = toMonthKey(bar.year, bar.month);
        return (
          <button
            key={monthKey}
            type="button"
            data-testid={`kline-bar-${monthKey}`}
            className="block w-full rounded border px-3 py-2 text-left hover:bg-gray-50"
            onClick={() => {
              if (shouldSkip(`click_kline_month:${monthKey}`)) return;
              track({ recordId, eventType: 'click_kline_month', payload: { month: monthKey } });
              onSelectMonth?.(monthKey);
            }}
          >
            <div className="font-medium">{bar.monthLabel || monthKey}</div>
            <div className="text-xs text-gray-500">综合分 {bar.compositeScore} · OHLC {bar.open}/{bar.high}/{bar.low}/{bar.close}</div>
          </button>
        );
      })}
    </div>
  );
}

export default StateKlineTab;
