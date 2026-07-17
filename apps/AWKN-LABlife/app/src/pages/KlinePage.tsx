/**
 * KlinePage — V2 人生 K线页面
 *
 * 设计原则（P2-09 重写）：
 *   - 完全消费 KlineProductViewModelV2，前端不再做本地业务计算
 *   - 图表进入第一视口（current stage/trend → 趋势图 → 节点卡）
 *   - 二级折叠面板：节点列表 / 潮汐信号 / 历史版本 / 数据来源
 *   - 节点卡统一为 KlineNodeCard（机会/风险/转折）
 *
 * 数据流程：
 *   useKlineProduct → KlineProductViewModelV2 → KlineTrendChart + KlineNodeCard
 *
 * 路由：/life/kline
 *
 * P2-05：节点问事携带 V2 snapshotId/nodeId/nodeType/score/summary 到 /question
 */

import { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { trackFunnel } from '@/utils/analytics';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoginRequired } from '@/components/feedback/LoginRequired';
import { PageHeader } from '@/components/layout/PageHeader';
import { useKlineProduct } from '@/hooks/useKlineProduct';
import { KlineTrendChart } from '@/components/kline/KlineTrendChart';
import { KlineNodeCard } from '@/components/kline/KlineNodeCard';
import { KlineReminderBanner } from '@/components/kline/KlineReminderBanner';
import { KlineEntitlementSummary } from '@/components/kline/KlineEntitlementSummary';
import type {
  KlineProductViewModelV2,
  KlineNode,
  KlinePoint,
  TideSignal,
} from '@/types/kline-v2';
import {
  STAGE_LABELS,
  TREND_LABELS,
  NODE_TYPE_LABELS,
  DATA_SOURCE_LABELS,
} from '@/types/kline-v2';
import type { KlineQuestionContext } from '@/components/frontdesk/frontdeskAdapters';

// ── 延迟加载分享卡（保留 V1 模式） ──
const LazyKlineShareCard = lazy(() =>
  import('../components/kline/KlineShareCard').then((module) => ({ default: module.KlineShareCard })),
);

// ── stage / trend 颜色 ──
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
// 辅助组件：折叠面板
// ============================================================

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}

function CollapsibleSection({ title, defaultOpen = false, children, badge }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-outline/10 px-4 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
        aria-label={title}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-on-surface">{title}</h3>
          {badge && (
            <span className="rounded-full bg-on-surface/[0.06] px-2 py-0.5 text-[10px] text-gray-400">
              {badge}
            </span>
          )}
        </div>
        <span
          className={`material-symbols-outlined text-base text-gray-500 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        >
          chevron_right
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

// ============================================================
// 辅助组件：潮汐信号卡
// ============================================================

interface TideSignalCardProps {
  tide?: KlineProductViewModelV2['currentTide'];
}

function TideSignalCard({ tide }: TideSignalCardProps) {
  if (!tide) return null;
  const items: Array<{ key: string; label: string; signal: TideSignal | null }> = [
    { key: 'timing', label: '时', signal: tide.timing },
    { key: 'position', label: '位', signal: tide.position },
    { key: 'mindset', label: '心', signal: tide.mindset },
  ];
  const visible = items.filter((i) => i.signal !== null);
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {visible.map(({ key, label, signal }) => (
        <div
          key={key}
          className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-4"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">{label}</p>
          <p className="mt-2 text-base font-semibold text-on-surface">{signal?.label ?? '—'}</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {signal ? signal.score.toFixed(0) : '—'}
            <span className="ml-1 text-xs font-normal text-gray-500">/ 100</span>
          </p>
          {signal && signal.evidenceRefs.length > 0 && (
            <p className="mt-2 text-[10px] text-gray-500">{signal.evidenceRefs.length} 条证据</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export function KlinePage() {
  return (
    <ErrorBoundary>
      <KlinePageMain />
    </ErrorBoundary>
  );
}

function KlinePageMain() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydratedStore = useAuthStore((s) => s.hasHydrated);
  const [hydratedTimeout, setHydratedTimeout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setHydratedTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  const hasHydrated = hasHydratedStore || hydratedTimeout;

  // P3-03: 从历史页跳转过来时，指定要查看的 snapshotId（必须在 useKlineProduct 之前声明）
  const [pendingSnapshotId, setPendingSnapshotId] = useState<string | undefined>(undefined);
  // P3-04: 节点结果回写状态
  const [writtenOutcomes, setWrittenOutcomes] = useState<Map<string, 'occurred' | 'not_occurred' | 'partial'>>(new Map());
  // P2-06: 从问事页返回时，高亮原节点
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [askedNodeIds, setAskedNodeIds] = useState<Set<string>>(new Set());
  const nodeSectionRef = useRef<HTMLElement>(null);

  const {
    viewModel,
    loading,
    error,
    gated,
    gatedModuleId,
    degraded,
    degradedReason,
    needsGenerate,
    refetch,
    generate,
    askNode,
    writeOutcome,
  } = useKlineProduct({
    enabled: hasHydrated && isAuthenticated,
    snapshotId: pendingSnapshotId,
  });

  // P2-06: 挂载时检查 sessionStorage 是否有返回节点标记
  // P3-03: 同时检查是否有从历史页跳转过来的 pending snapshotId
  useEffect(() => {
    try {
      const returnNodeId = sessionStorage.getItem('kline_return_node_id');
      if (returnNodeId) {
        sessionStorage.removeItem('kline_return_node_id');
        setHighlightedNodeId(returnNodeId);
        // 延迟滚动，等待节点卡渲染
        setTimeout(() => {
          nodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
      // P3-03: 从历史页跳转时携带的指定快照 ID
      const pendingId = sessionStorage.getItem('kline_pending_snapshot_id');
      if (pendingId) {
        sessionStorage.removeItem('kline_pending_snapshot_id');
        setPendingSnapshotId(pendingId);
      }
    } catch {
      // sessionStorage 不可用时静默降级
    }
  }, []);

  // ── 合并 opportunity + risk 节点，按 monthLabel 排序 ──
  const mergedNodes = useMemo<KlineNode[]>(() => {
    if (!viewModel) return [];
    const all = [
      ...viewModel.windows.opportunity,
      ...viewModel.windows.risk,
    ];
    return all.sort((a, b) => a.monthLabel.localeCompare(b.monthLabel));
  }, [viewModel]);

  // ── 图表节点（KlineTrendChart 期望的精简结构） ──
  const chartNodes = useMemo(() => {
    return mergedNodes.map((n) => ({
      monthLabel: n.monthLabel,
      nodeType: n.nodeType,
      score: n.score,
      summary: n.summary,
    }));
  }, [mergedNodes]);

  // ── 主线最后一个点（用于头部展示） ──
  const latestPoint = useMemo<KlinePoint | null>(() => {
    if (!viewModel || viewModel.series.overall.length === 0) return null;
    return viewModel.series.overall[viewModel.series.overall.length - 1];
  }, [viewModel]);

  // ── 权益：能否看到三线 / 全部节点 ──
  const canViewDomainLines = viewModel?.entitlements.canViewDomainLines ?? false;
  const canViewAllNodes = viewModel?.entitlements.canViewAllNodes ?? false;
  const canAskNode = viewModel?.entitlements.canAskNode ?? false;

  // ── 副线（事业/财富/情感），仅在权益允许时传递 ──
  const chartDomains = useMemo(() => {
    if (!viewModel || !canViewDomainLines) return undefined;
    return {
      career: viewModel.series.career,
      wealth: viewModel.series.wealth,
      relationship: viewModel.series.relationship,
    };
  }, [viewModel, canViewDomainLines]);

  // ── 数据来源摘要 ──
  const sourceSummaryLabel = useMemo(() => {
    if (!viewModel) return '';
    return viewModel.meta.sourceSummary
      .map((s) => DATA_SOURCE_LABELS[s] ?? s)
      .join(' / ');
  }, [viewModel]);

  // ── 节点问事：携带 V2 上下文跳转 /question ──
  const handleAskNode = useCallback(
    (node: KlineNode) => {
      if (!viewModel) return;
      trackFunnel('kline_v2_ask_node_clicked', {
        nodeId: node.id,
        snapshotId: viewModel.meta.snapshotId,
        nodeType: node.nodeType,
        score: node.score,
      });
      const klineQuestionContext: KlineQuestionContext = {
        contextSource: 'kline_node',
        targetDate: node.monthLabel,
        questionType: 'kline_node',
        // V1 兼容字段（保留旧字段，便于未升级的下游消费）
        signalLabel: NODE_TYPE_LABELS[node.nodeType],
        compositeScore: node.score,
        // P2-05: V2 新增字段
        snapshotId: viewModel.meta.snapshotId,
        nodeId: node.id,
        nodeType: node.nodeType,
        score: node.score,
        summary: node.summary,
      };
      // P2-06: 存储 nodeId 以便问事返回后高亮原节点
      try {
        sessionStorage.setItem('kline_return_node_id', node.id);
      } catch {
        // sessionStorage 不可用时静默降级
      }
      navigate('/question', { state: { klineQuestionContext } });
    },
    [navigate, viewModel],
  );

  // ── 调用 askNode API + 标记已问事 ──
  const handleAskNodeClick = useCallback(
    async (node: KlineNode) => {
      if (!canAskNode) return;
      if (askedNodeIds.has(node.id)) return;
      const consultRecordId = await askNode(
        node.id,
        `就 ${node.monthLabel} 这个 ${NODE_TYPE_LABELS[node.nodeType]} 节点问事`,
        'kline_node',
      );
      if (consultRecordId) {
        setAskedNodeIds((prev) => {
          const next = new Set(prev);
          next.add(node.id);
          return next;
        });
        handleAskNode(node);
      }
    },
    [askNode, askedNodeIds, canAskNode, handleAskNode],
  );

  // ── 触发生成新快照 ──
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    trackFunnel('kline_v2_generate_started');
    await generate();
    setGenerating(false);
    trackFunnel('kline_v2_generate_succeeded');
  }, [generate]);

  // ── P3-04: 节点结果回写 ──
  const handleWriteOutcome = useCallback(
    async (node: KlineNode, result: 'occurred' | 'not_occurred' | 'partial') => {
      const outcomeId = await writeOutcome(node.id, result);
      if (outcomeId) {
        setWrittenOutcomes((prev) => {
          const next = new Map(prev);
          next.set(node.id, result);
          return next;
        });
        trackFunnel('kline_v2_outcome_written', {
          nodeId: node.id,
          snapshotId: viewModel?.meta.snapshotId,
          result,
        });
      }
    },
    [writeOutcome, viewModel],
  );

  // ── Loading ──
  if (!hasHydrated || loading) {
    return <LoadingState fullScreen label="加载 K线数据…" className="bg-surface-base" />;
  }

  // ── 未登录引导 ──
  if (!isAuthenticated) {
    return (
      <LoginRequired
        icon="show_chart"
        title="登录后查看人生 K线"
        description="登录后即可查看您的专属人生 K线数据"
      />
    );
  }

  // ── Error ──
  if (error) {
    return (
      <ErrorState
        message="数据加载失败"
        detail={error.message}
        onRetry={refetch}
        className="bg-surface-base"
      />
    );
  }

  // ── V2 未启用降级 ──
  if (degraded) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-8">
        <PageHeader title="人生 K线" subtitle="人生的K线，不只是涨落，更是你做对什么的证据" />
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
          <span className="material-symbols-outlined text-3xl text-amber-300">info</span>
          <p className="mt-2 text-sm text-amber-300">
            {degradedReason ?? 'K线V2功能未启用'}
          </p>
          <p className="mt-1 text-xs text-gray-500">请稍后再试或联系管理员</p>
        </div>
      </div>
    );
  }

  // ── 权益门控（完全付费） ──
  if (gated) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-8">
        <PageHeader title="人生 K线" subtitle="人生的K线，不只是涨落，更是你做对什么的证据" />
        <div className="mx-auto max-w-md rounded-xl border border-primary/30 bg-on-surface/[0.04] p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          <p className="mt-3 text-sm font-medium text-primary">
            此内容需要解锁「{gatedModuleId ?? 'kline'}」模块
          </p>
          <p className="mt-2 text-xs text-gray-500">
            升级会员即可查看 36 个月命运趋势、机会/风险节点、潮汐信号
          </p>
          <button
            onClick={() => {
              trackFunnel('kline_v2_upgrade_clicked', { moduleId: gatedModuleId ?? 'kline' });
              navigate('/price');
            }}
            className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            查看会员方案
          </button>
        </div>
      </div>
    );
  }

  // ── 暂无快照，需 generate ──
  if (needsGenerate || !viewModel) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-8">
        <PageHeader title="人生 K线" subtitle="人生的K线，不只是涨落，更是你做对什么的证据" />
        <EmptyState
          icon="show_chart"
          title="尚未生成 K线快照"
          description="完善出生信息后，点击下方按钮生成你的第一份人生 K线"
          actionText={generating ? '生成中…' : '生成 K线'}
          onAction={handleGenerate}
          className="h-[400px] rounded-xl border border-outline/5 bg-on-surface/[0.02]"
        />
      </div>
    );
  }

  // ── 当前 VM ──
  const vm = viewModel;
  const stageLabel = STAGE_LABELS[vm.current.stage];
  const trendLabel = TREND_LABELS[vm.current.trend];

  return (
    <div className="min-h-screen bg-surface-base text-on-surface pb-8">
      {/* ── 页面标题 + 操作栏 ── */}
      <header className="flex items-center justify-between border-b border-outline/10 px-4 py-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">人生 K线</h1>
          <p className="mt-1 text-xs text-gray-500 truncate">
            把人生的没底，变成可以被记录、被摆开、被试算的判断力
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 数据来源徽章 */}
          {sourceSummaryLabel && (
            <span className="rounded-full bg-on-surface/[0.06] px-2.5 py-1 text-[10px] font-medium text-gray-300">
              {sourceSummaryLabel}
            </span>
          )}
          {vm.meta.degraded && (
            <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[10px] font-medium text-amber-300">
              降级
            </span>
          )}
          {vm.series.overall.length > 0 && (
            <button
              onClick={() => {
                setShareOpen(true);
                trackFunnel('funnel_kline_to_share');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10"
              aria-label="分享命运K线"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              分享
            </button>
          )}
        </div>
      </header>

      {/* ============================================================
          第一视口：current → 图表 → 节点卡
         ============================================================ */}

      {/* ── P3-05: 回访提醒横幅（仅当有待回写节点时显示） ── */}
      <KlineReminderBanner
        viewModel={vm}
        writtenOutcomes={writtenOutcomes}
        onScrollToNodes={() => {
          nodeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* ── 当前阶段 + 趋势 ── */}
      <section className="border-b border-outline/10 px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">趋势判断</p>
            <h2 className="mt-1 text-base font-semibold text-on-surface">
              当前阶段：{stageLabel}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STAGE_COLOR[vm.current.stage]}`}>
              {stageLabel}
            </span>
            <span className={`text-xs font-medium ${TREND_COLOR[vm.current.trend]}`}>
              趋势 {trendLabel}
            </span>
          </div>
        </div>
        <p className="text-sm leading-6 text-gray-300">{vm.current.summary}</p>
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-gray-500">下一步行动</p>
          <p className="mt-1 text-sm font-medium text-amber-200">{vm.current.action}</p>
        </div>
        {latestPoint && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">最新月份</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{latestPoint.monthLabel}</p>
            </div>
            <div className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">综合分</p>
              <p className="mt-1 text-lg font-bold text-amber-300">
                {latestPoint.value.toFixed(1)}
                <span className="ml-1 text-xs font-normal text-gray-500">/ 100</span>
              </p>
            </div>
            <div className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">数据范围</p>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {vm.horizon.from} → {vm.horizon.to}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 趋势图 ── */}
      {vm.series.overall.length > 0 && (
        <section className="border-b border-outline/10 px-2 py-4 sm:px-4">
          <ErrorBoundary
            fallback={
              <div className="flex h-[320px] flex-col items-center justify-center rounded-xl border border-outline/5 bg-on-surface/[0.02] text-center">
                <p className="text-sm text-gray-400 mb-2">K线图表加载失败</p>
                <p className="text-xs text-gray-600">请刷新页面重试</p>
              </div>
            }
          >
            <KlineTrendChart
              overall={vm.series.overall}
              domains={chartDomains}
              nodes={chartNodes}
              height={320}
              onMonthClick={(m) => {
                trackFunnel('kline_v2_month_clicked', { month: m });
              }}
            />
          </ErrorBoundary>
          {!canViewDomainLines && (
            <p className="mt-2 text-center text-[10px] text-gray-500">
              升级会员查看事业 / 财富 / 情感 三条副线
            </p>
          )}
        </section>
      )}

      {/* ── 节点卡（机会 + 风险，前 2 条进入第一视口） ── */}
      {mergedNodes.length > 0 && (
        <section ref={nodeSectionRef} className="border-b border-outline/10 px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-on-surface">关键节点</h3>
            {!canViewAllNodes && (
              <span className="rounded-full bg-on-surface/[0.06] px-2 py-0.5 text-[10px] text-gray-400">
                免费版仅显示前 {vm.windows.opportunity.length + vm.windows.risk.length} 个 · 升级解锁全部
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mergedNodes.map((node) => (
              <div
                key={node.id}
                className={
                  highlightedNodeId === node.id
                    ? 'rounded-2xl ring-2 ring-primary/60 transition-shadow'
                    : ''
                }
              >
                <KlineNodeCard
                  node={node}
                  gated={false}
                  asked={askedNodeIds.has(node.id)}
                  onAsk={canAskNode ? handleAskNodeClick : undefined}
                  onViewEvidence={(n) => {
                    trackFunnel('kline_v2_view_evidence_clicked', { nodeId: n.id });
                  }}
                  onWriteOutcome={handleWriteOutcome}
                  writtenOutcome={writtenOutcomes.get(node.id) ?? null}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          二级折叠面板
         ============================================================ */}

      {/* ── 潮汐信号 ── */}
      {vm.currentTide && (
        <CollapsibleSection title="潮汐信号（时·位·心）" badge="currentTide">
          <TideSignalCard tide={vm.currentTide} />
        </CollapsibleSection>
      )}

      {/* ── 历史版本 ── */}
      <CollapsibleSection
        title="历史版本"
        badge={vm.history ? (vm.history.actualOutcomePending ? '待回写' : '已结案') : '仅当前'}
      >
        <div className="mb-3">
          <Link
            to="/kline/history"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            <span className="material-symbols-outlined text-sm">history</span>
            查看全部历史版本
          </Link>
        </div>
        {vm.history ? (
          <div className="space-y-2">
            {vm.history.previousSnapshotId && (
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
                <p className="text-xs text-gray-500">上一版本快照</p>
                <p className="mt-1 font-mono text-xs text-gray-300">
                  {vm.history.previousSnapshotId}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">实际结果回写状态</p>
              <p className="mt-1 text-sm text-on-surface">
                {vm.history.actualOutcomePending ? '等待用户回写实际结果' : '已结案'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">尚无历史版本，首次生成</p>
        )}
      </CollapsibleSection>

      {/* ── 数据来源 & 置信度 ── */}
      <CollapsibleSection title="数据来源 & 置信度">
        <div className="space-y-3">
          <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
            <p className="text-xs text-gray-500">快照 ID</p>
            <p className="mt-1 font-mono text-xs text-gray-300 break-all">{vm.meta.snapshotId}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">数据版本</p>
              <p className="mt-1 text-sm font-medium text-on-surface">{vm.meta.dataVersion}</p>
            </div>
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">算法版本</p>
              <p className="mt-1 text-sm font-medium text-on-surface">{vm.meta.algorithmVersion}</p>
            </div>
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">整体置信度</p>
              <p className="mt-1 text-sm font-medium text-on-surface">
                {vm.meta.confidence !== null
                  ? `${Math.round(vm.meta.confidence * 100)}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">生成时间</p>
              <p className="mt-1 text-xs text-gray-300">
                {new Date(vm.meta.generatedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          {sourceSummaryLabel && (
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3">
              <p className="text-xs text-gray-500">数据来源构成</p>
              <p className="mt-1 text-sm text-on-surface">{sourceSummaryLabel}</p>
            </div>
          )}
          {vm.meta.degraded && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-300">⚠ 当前数据为降级状态，部分结论可能不完整</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ── P3-08: 权益说明 ── */}
      <CollapsibleSection
        title="权益说明"
        badge={
          vm.entitlements.canViewDomainLines &&
          vm.entitlements.canViewAllNodes &&
          vm.entitlements.canAskNode
            ? '已解锁'
            : '免费版'
        }
      >
        <KlineEntitlementSummary viewModel={vm} />
      </CollapsibleSection>

      {/* ── 底部：刷新快照 ── */}
      <footer className="mt-6 px-4 pb-4 text-center">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/60 hover:bg-primary/20 disabled:opacity-50"
        >
          {generating ? '生成中…' : '重新生成 K线快照'}
        </button>
      </footer>

      {/* ── 分享弹窗（P3-01: V2 驱动） ── */}
      <Suspense fallback={null}>
        <LazyKlineShareCard
          viewModel={viewModel}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      </Suspense>
    </div>
  );
}

export default KlinePage;
