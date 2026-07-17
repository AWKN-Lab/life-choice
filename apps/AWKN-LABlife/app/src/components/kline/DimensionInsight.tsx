/**
 * DimensionInsight — 维度详情面板（S3 业务进化）
 *
 * 功能：
 *   - 点击维度线后弹出，展示该维度的趋势/极值/月度变化
 *   - 自动生成一句话解读（基于最近3个月趋势）
 *   - 支持维度对比（选中2个维度时显示强弱差）
 *
 * 设计原则：
 *   - 不依赖后端额外接口，纯前端基于 klineBars 计算
 *   - 解读文案用规则引擎生成（不调LLM，零延迟）
 *   - 移动端友好（底部抽屉式）
 */

import { useMemo } from 'react';
import type { MonthlyKlineBar, LifeDimension } from '../../types/lifekline';
import { LIFE_DIMENSION_LABELS } from '../../types/lifekline';

interface DimensionInsightProps {
  dimension: LifeDimension | null;
  compareDimension?: LifeDimension | null;
  bars: MonthlyKlineBar[];
  onClose: () => void;
}

// 分组映射（与 KlineChart 保持一致）
const DIM_GROUP: Record<LifeDimension, { group: 'time' | 'position' | 'mind'; label: string }> = {
  career:       { group: 'position', label: '事业' },
  wealth:       { group: 'position', label: '财富' },
  growth:       { group: 'position', label: '成长' },
  freedom:      { group: 'time',     label: '自由' },
  buffer:       { group: 'time',     label: '缓冲' },
  health:       { group: 'mind',     label: '健康' },
  relationship: { group: 'mind',     label: '关系' },
};

const GROUP_LABEL: Record<'time' | 'position' | 'mind', string> = {
  time: '时',
  position: '位',
  mind: '心',
};

// 维度解读规则引擎
function generateInsight(
  dim: LifeDimension,
  values: number[],
): { trend: 'up' | 'down' | 'flat'; insight: string; extreme: { max: { month: string; value: number }; min: { month: string; value: number } } | null } {
  if (values.length === 0) {
    return { trend: 'flat', insight: '暂无数据', extreme: null };
  }

  const recent = values.slice(-3);
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const prev = values.slice(-6, -3);
  const prevAvg = prev.length > 0 ? prev.reduce((s, v) => s + v, 0) / prev.length : avg;

  const diff = avg - prevAvg;
  const trend: 'up' | 'down' | 'flat' = diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat';

  const info = LIFE_DIMENSION_LABELS[dim];
  const groupInfo = DIM_GROUP[dim];
  const groupName = GROUP_LABEL[groupInfo.group];

  let insight = '';
  if (trend === 'up') {
    insight = `${groupName}·${info.zh}近3个月上升 ${diff.toFixed(1)} 分，处于近期高位`;
    if (avg > 75) insight += '，建议保持当前节奏';
    else if (avg > 60) insight += '，仍有上升空间';
    else insight += '，从低位回升';
  } else if (trend === 'down') {
    insight = `${groupName}·${info.zh}近3个月下降 ${Math.abs(diff).toFixed(1)} 分`;
    if (avg < 40) insight += '，已接近低位，建议关注';
    else if (avg < 55) insight += '，注意下滑趋势';
    else insight += '，从高位回落';
  } else {
    insight = `${groupName}·${info.zh}近期平稳在 ${avg.toFixed(0)} 分`;
    if (avg > 70) insight += '，维持高位';
    else if (avg < 45) insight += '，持续低位';
    else insight += '，中位震荡';
  }

  // 极值（仅在有≥6个月数据时计算）
  let extreme: { max: { month: string; value: number }; min: { month: string; value: number } } | null = null;
  if (values.length >= 6) {
    let maxIdx = 0;
    let minIdx = 0;
    values.forEach((v, i) => {
      if (v > values[maxIdx]) maxIdx = i;
      if (v < values[minIdx]) minIdx = i;
    });
    extreme = {
      max: { month: `第${maxIdx + 1}月`, value: values[maxIdx] },
      min: { month: `第${minIdx + 1}月`, value: values[minIdx] },
    };
  }

  return { trend, insight, extreme };
}

export function DimensionInsight({ dimension, compareDimension, bars, onClose }: DimensionInsightProps) {
  const data = useMemo(() => {
    if (!dimension) return null;

    const values = bars
      .map((b) => b.dimensions?.[dimension])
      .filter((v): v is number => typeof v === 'number');

    const insight = generateInsight(dimension, values);

    let compare = null;
    if (compareDimension) {
      const compareValues = bars
        .map((b) => b.dimensions?.[compareDimension])
        .filter((v): v is number => typeof v === 'number');
      if (compareValues.length > 0 && values.length > 0) {
        const compareAvg = compareValues.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, compareValues.length);
        const mainAvg = values.slice(-3).reduce((s, v) => s + v, 0) / Math.min(3, values.length);
        const gap = mainAvg - compareAvg;
        compare = {
          dimension: compareDimension,
          gap,
          stronger: gap > 0 ? dimension : compareDimension,
          insight: `${LIFE_DIMENSION_LABELS[dimension].zh}比${LIFE_DIMENSION_LABELS[compareDimension].zh} ${gap > 0 ? '高' : '低'} ${Math.abs(gap).toFixed(1)} 分`,
        };
      }
    }

    return { dimension, insight, compare, recentValues: values.slice(-6) };
  }, [dimension, compareDimension, bars]);

  if (!data || !dimension) return null;

  const info = LIFE_DIMENSION_LABELS[dimension];
  const groupInfo = DIM_GROUP[dimension];
  const trendColor = data.insight.trend === 'up' ? '#22c55e' : data.insight.trend === 'down' ? '#ef4444' : '#999';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-[#1a1a2e] border border-outline/20 rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
            <h3 className="text-base font-semibold text-on-surface">
              {GROUP_LABEL[groupInfo.group]}·{info.zh}
            </h3>
            <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded bg-on-surface/[0.05]">
              {GROUP_LABEL[groupInfo.group]}组
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-on-surface text-xl leading-none">×</button>
        </div>

        {/* 趋势解读 */}
        <div className="mb-4 p-3 rounded-lg bg-on-surface/[0.03] border-l-2" style={{ borderColor: trendColor }}>
          <p className="text-xs text-gray-500 mb-1">趋势解读</p>
          <p className="text-sm text-on-surface leading-relaxed">{data.insight.insight}</p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-gray-500">近3月趋势：</span>
            <span style={{ color: trendColor }}>
              {data.insight.trend === 'up' ? '↑ 上升' : data.insight.trend === 'down' ? '↓ 下降' : '→ 平稳'}
            </span>
          </div>
        </div>

        {/* 近6个月数值 */}
        {data.recentValues.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">近{data.recentValues.length}个月数值</p>
            <div className="flex items-end gap-1 h-20">
              {data.recentValues.map((v, i) => {
                const height = Math.max(4, (v / 100) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">{v}</span>
                    <div
                      className="w-full rounded-t"
                      style={{ height: `${height}%`, backgroundColor: info.color, opacity: 0.3 + (i / data.recentValues.length) * 0.7 }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 极值 */}
        {data.insight.extreme && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-on-surface/[0.03]">
              <p className="text-xs text-gray-500">最高</p>
              <p className="text-sm font-medium text-[#22c55e]">
                {data.insight.extreme.max.value} <span className="text-xs text-gray-500">@ {data.insight.extreme.max.month}</span>
              </p>
            </div>
            <div className="p-2 rounded bg-on-surface/[0.03]">
              <p className="text-xs text-gray-500">最低</p>
              <p className="text-sm font-medium text-[#ef4444]">
                {data.insight.extreme.min.value} <span className="text-xs text-gray-500">@ {data.insight.extreme.min.month}</span>
              </p>
            </div>
          </div>
        )}

        {/* 对比 */}
        {data.compare && (
          <div className="p-3 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/30">
            <p className="text-xs text-gray-500 mb-1">维度对比</p>
            <p className="text-sm text-[#e0c97a]">{data.compare.insight}</p>
            <p className="text-xs text-gray-400 mt-1">
              强势方：{LIFE_DIMENSION_LABELS[data.compare.stronger].zh}
            </p>
          </div>
        )}

        {/* 提示 */}
        <p className="mt-4 text-xs text-gray-600 text-center">
          点击图表上的其他维度线可切换查看
        </p>
      </div>
    </div>
  );
}

export default DimensionInsight;
