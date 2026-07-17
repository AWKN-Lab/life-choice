/**
 * KlineSharePage — 公开脱敏分享页（P3-02）
 *
 * 路由：/share/:token
 *
 * 设计原则：
 *   - 无需登录即可访问（脱敏后的摘要数据）
 *   - 后端返回 5 个 overall 点 + 1 个 opportunity 节点
 *   - 不展示完整 K线、副线、风险节点、潮汐信号
 *   - 底部 CTA 引导登录查看完整内容
 *
 * 数据来源：
 *   GET /kline-v2/share/:token → useKlineSharePreview
 *
 * 安全约束（§5.2）：
 *   - 不包含 profileId、完整节点列表、副线、风险节点
 *   - 仅展示 meta + current + 前 5 个 overall + 1 个 opportunity
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useKlineSharePreview } from '@/hooks/useKlineProduct';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PageHeader } from '@/components/layout/PageHeader';
import { KlineTrendChart } from '@/components/kline/KlineTrendChart';
import { KlineNodeCard } from '@/components/kline/KlineNodeCard';
import { trackFunnel } from '@/utils/analytics';
import type {
  KlineProductViewModelV2,
  KlineNode,
  KlinePoint,
} from '@/types/kline-v2';
import {
  STAGE_LABELS,
  TREND_LABELS,
  DATA_SOURCE_LABELS,
} from '@/types/kline-v2';

// ── stage / trend 颜色（与 KlinePage 保持一致） ──
const STAGE_COLOR: Record<KlineProductViewModelV2['current']['stage'], string> = {
  accumulate: 'text-amber-300 bg-amber-500/12',
  advance: 'text-emerald-300 bg-emerald-500/12',
  turn: 'text-sky-300 bg-sky-500/12',
  defend: 'text-rose-300 bg-rose-500/12',
  unknown: 'text-gray-400 bg-gray-500/12',
};

const TREND_COLOR: Record<KlineProductViewModelV2['current']['trend'], string> = {
  up: 'text-emerald-300',
  sideways: 'text-amber-300',
  down: 'text-rose-300',
  unknown: 'text-gray-400',
};

// ============================================================
// 主组件
// ============================================================

export function KlineSharePage() {
  return (
    <ErrorBoundary>
      <KlineSharePageMain />
    </ErrorBoundary>
  );
}

function KlineSharePageMain() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { preview, loading, error } = useKlineSharePreview(token ?? null);

  // ── 登录查看完整 K线 ──
  const handleViewFull = () => {
    trackFunnel('kline_v2_share_login_clicked', {
      token: token ?? '',
      snapshotId: preview?.snapshotId ?? '',
    });
    navigate('/kline');
  };

  // ── Loading ──
  if (loading) {
    return (
      <LoadingState
        fullScreen
        label="加载分享内容…"
        className="bg-surface-base"
      />
    );
  }

  // ── Error / 无 token ──
  if (error || !token) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-8">
        <PageHeader
          title="分享内容不存在"
          subtitle="该分享链接已失效或已被撤销"
        />
        <div className="mx-auto max-w-md rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
          <span className="material-symbols-outlined text-3xl text-rose-300">
            link_off
          </span>
          <p className="mt-2 text-sm text-rose-300">
            {error?.message ?? '链接无效'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg border border-outline/30 px-5 py-2 text-sm text-on-surface transition-colors hover:bg-on-surface/[0.04]"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // ── 无预览数据 ──
  if (!preview) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-8">
        <PageHeader title="分享内容" subtitle="暂无可展示的内容" />
      </div>
    );
  }

  const { meta, current, series, windows } = preview.preview;
  const overallPoints: KlinePoint[] = series.overall ?? [];
  const opportunityNode: KlineNode | null =
    windows.opportunity && windows.opportunity.length > 0
      ? windows.opportunity[0]
      : null;

  const sourceLabel = meta.sourceSummary
    .map((s) => DATA_SOURCE_LABELS[s] ?? s)
    .join(' / ');

  const generatedDate = new Date(meta.generatedAt).toLocaleDateString('zh-CN');

  return (
    <div className="min-h-screen bg-surface-base">
      {/* ── 顶部品牌区 ── */}
      <header className="border-b border-outline/10 px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">show_chart</span>
            <span className="text-sm font-medium text-on-surface">人生 K线</span>
          </div>
          <span className="rounded-full bg-on-surface/[0.06] px-2.5 py-1 text-[10px] text-gray-400">
            分享预览
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* ── 当前阶段 + 趋势 ── */}
        <section className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            当前阶段
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STAGE_COLOR[current.stage]}`}
            >
              {STAGE_LABELS[current.stage]}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs ${TREND_COLOR[current.trend]}`}
            >
              <span className="material-symbols-outlined text-sm">
                {current.trend === 'up'
                  ? 'trending_up'
                  : current.trend === 'down'
                    ? 'trending_down'
                    : 'trending_flat'}
              </span>
              {TREND_LABELS[current.trend]}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-on-surface">
            {current.summary}
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-400">
            <span className="material-symbols-outlined mr-1 align-middle text-sm">
              lightbulb
            </span>
            {current.action}
          </p>
        </section>

        {/* ── 趋势图（前 5 个 overall 点） ── */}
        {overallPoints.length > 0 && (
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-on-surface">趋势预览</h2>
              <span className="text-[10px] text-gray-500">
                共 {overallPoints.length} 个月
              </span>
            </div>
            <div className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <KlineTrendChart
                overall={overallPoints}
                height={180}
                nodes={opportunityNode ? [opportunityNode] : []}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-gray-500">
              登录后可查看完整 36 个月趋势线与副线（事业/财富/情感）
            </p>
          </section>
        )}

        {/* ── 机会节点（仅 1 个） ── */}
        {opportunityNode && (
          <section className="mt-4">
            <h2 className="mb-2 text-sm font-medium text-on-surface">
              近期机会
            </h2>
            <KlineNodeCard node={opportunityNode} gated={false} />
            <p className="mt-1.5 text-[10px] text-gray-500">
              登录后可查看全部节点（机会/风险/转折）与潮汐信号
            </p>
          </section>
        )}

        {/* ── 元信息（脱敏后） ── */}
        <section className="mt-4 rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-4 text-[11px] text-gray-500">
          <div className="flex items-center justify-between">
            <span>生成时间</span>
            <span className="text-gray-400">{generatedDate}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span>数据来源</span>
            <span className="text-gray-400">{sourceLabel}</span>
          </div>
          {meta.confidence !== null && (
            <div className="mt-1.5 flex items-center justify-between">
              <span>置信度</span>
              <span className="text-gray-400">
                {Math.round(meta.confidence * 100)}%
              </span>
            </div>
          )}
        </section>

        {/* ── CTA：登录查看完整 K线 ── */}
        <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-primary">
            lock_open
          </span>
          <p className="mt-2 text-sm font-medium text-primary">
            登录查看完整人生 K线
          </p>
          <p className="mt-1 text-xs text-gray-500">
            36 个月趋势 · 完整节点列表 · 潮汐信号 · 副线（事业/财富/情感）
          </p>
          <button
            onClick={handleViewFull}
            className="mt-4 w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            登录查看
          </button>
        </section>

        {/* ── 底部品牌 ── */}
        <footer className="mt-8 border-t border-outline/10 pt-4 text-center">
          <p className="text-[11px] text-gray-500">
            AWKN · 人生决策宗师 — 把人生的没底，变成可以被记录的判断力
          </p>
        </footer>
      </main>
    </div>
  );
}

export default KlineSharePage;
