/**
 * KlineHistoryPage — K线历史版本页（P3-03）
 *
 * 路由：/kline/history
 *
 * 功能：
 *   - 列出用户所有历史 K线快照
 *   - 点击展开 inline 详情预览
 *   - 跳转到 K线页查看完整版（sessionStorage 传递 snapshotId）
 *
 * 数据来源：
 *   GET /kline-v2/snapshots       — 列表
 *   GET /kline-v2/snapshots/:id   — 指定快照详情（通过 useKlineProduct hook）
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuthStore } from '../store/authStore';
import { useKlineProduct } from '@/hooks/useKlineProduct';
import { apiClient } from '@/api/client';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoginRequired } from '@/components/feedback/LoginRequired';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { trackFunnel } from '@/utils/analytics';
import { STAGE_LABELS, TREND_LABELS } from '@/types/kline-v2';

// ── 快照列表项类型（与后端 listSnapshots 返回一致） ──
interface SnapshotListItem {
  snapshotId: string;
  generatedAt: string;
  status: string;
  dataVersion: string;
  algorithmVersion: string;
  confidence: number | null;
  degraded: boolean;
}

// ============================================================
// 主组件
// ============================================================

export function KlineHistoryPage() {
  return (
    <ErrorBoundary>
      <KlineHistoryPageMain />
    </ErrorBoundary>
  );
}

function KlineHistoryPageMain() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydratedStore = useAuthStore((s) => s.hasHydrated);
  const [hydratedTimeout, setHydratedTimeout] = useState(false);
  const navigate = useNavigate();

  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setHydratedTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  const hasHydrated = hasHydratedStore || hydratedTimeout;

  // ── 拉取快照列表 ──
  const fetchList = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.get<SnapshotListItem[]>('/kline-v2/snapshots?limit=50');
      setSnapshots(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      void fetchList();
    }
  }, [hasHydrated, isAuthenticated, fetchList]);

  // ── 在 K线页打开（sessionStorage 传递 snapshotId） ──
  const handleOpenInKline = (snapshotId: string) => {
    trackFunnel('kline_v2_history_open_in_kline', { snapshotId });
    try {
      sessionStorage.setItem('kline_pending_snapshot_id', snapshotId);
    } catch {
      // sessionStorage 不可用时静默降级
    }
    navigate('/kline');
  };

  // ── Loading ──
  if (!hasHydrated || loading) {
    return (
      <LoadingState fullScreen label="加载历史快照列表…" className="bg-surface-base" />
    );
  }

  // ── 未登录 ──
  if (!isAuthenticated) {
    return (
      <LoginRequired
        icon="history"
        title="登录后查看 K线历史"
        description="登录后即可查看您生成过的所有 K线快照历史"
      />
    );
  }

  // ── Error ──
  if (error) {
    return (
      <ErrorState
        message="历史快照加载失败"
        detail={error.message}
        onRetry={fetchList}
        className="bg-surface-base"
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-on-surface">
      <PageHeader
        title="K线历史版本"
        subtitle="查看您生成过的所有 K线快照，对比不同时期的人生趋势判断"
      />

      <main className="mx-auto max-w-3xl px-4 py-6">
        {snapshots.length === 0 ? (
          <EmptyState
            icon="history"
            title="尚无历史快照"
            description="生成第一份 K线后，所有版本将自动归档于此"
            actionText="前往 K线页"
            onAction={() => navigate('/kline')}
            className="h-[400px] rounded-xl border border-outline/5 bg-on-surface/[0.02]"
          />
        ) : (
          <ul className="space-y-3">
            {snapshots.map((snap) => (
              <li key={snap.snapshotId}>
                <SnapshotCard
                  snap={snap}
                  expanded={selectedId === snap.snapshotId}
                  onToggle={() =>
                    setSelectedId((prev) =>
                      prev === snap.snapshotId ? null : snap.snapshotId,
                    )
                  }
                  onOpenInKline={() => handleOpenInKline(snap.snapshotId)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

// ============================================================
// 子组件：单个快照卡
// ============================================================

interface SnapshotCardProps {
  snap: SnapshotListItem;
  expanded: boolean;
  onToggle: () => void;
  onOpenInKline: () => void;
}

function SnapshotCard({ snap, expanded, onToggle, onOpenInKline }: SnapshotCardProps) {
  const generatedDate = new Date(snap.generatedAt).toLocaleString('zh-CN');
  const confidencePct =
    snap.confidence !== null ? Math.round(snap.confidence * 100) : null;

  return (
    <div className="rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-4 transition-colors hover:border-outline/30">
      {/* ── 头部 ── */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={expanded}
        aria-label={`快照 ${snap.snapshotId} 详情`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              v{snap.dataVersion}
            </span>
            <span className="text-[10px] text-gray-500">
              {snap.algorithmVersion}
            </span>
            {snap.degraded && (
              <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                降级
              </span>
            )}
            <span className="rounded-full bg-on-surface/[0.06] px-2 py-0.5 text-[10px] text-gray-400">
              {snap.status}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">{generatedDate}</p>
          <p className="mt-1 font-mono text-[10px] text-gray-500 break-all">
            {snap.snapshotId}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {confidencePct !== null && (
            <span className="text-sm font-semibold text-amber-300">
              {confidencePct}%
            </span>
          )}
          <span className="material-symbols-outlined text-base text-gray-500">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </button>

      {/* ── 展开详情 ── */}
      {expanded && (
        <div className="mt-3 border-t border-outline/10 pt-3">
          <SnapshotDetail snapshotId={snap.snapshotId} onOpenInKline={onOpenInKline} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 子组件：展开后内嵌的快照详情
// ============================================================

interface SnapshotDetailProps {
  snapshotId: string;
  onOpenInKline: () => void;
}

function SnapshotDetail({ snapshotId, onOpenInKline }: SnapshotDetailProps) {
  const { viewModel, loading, error } = useKlineProduct({
    enabled: true,
    snapshotId,
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-gray-500">
        <span className="material-symbols-outlined animate-spin text-sm">
          progress_activity
        </span>
        加载快照详情…
      </div>
    );
  }

  if (error || !viewModel) {
    return (
      <div className="rounded-lg bg-rose-500/5 p-3 text-xs text-rose-300">
        {error?.message ?? '快照详情加载失败'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── 当前阶段 + 趋势 ── */}
      <div className="rounded-lg bg-on-surface/[0.04] p-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">阶段</span>
          <span className="font-medium text-amber-300">
            {STAGE_LABELS[viewModel.current.stage]}
          </span>
          <span className="text-gray-500">·</span>
          <span className="text-gray-500">趋势</span>
          <span className="font-medium text-sky-300">
            {TREND_LABELS[viewModel.current.trend]}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-300">
          {viewModel.current.summary}
        </p>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          <span className="material-symbols-outlined mr-1 align-middle text-xs">
            lightbulb
          </span>
          {viewModel.current.action}
        </p>
      </div>

      {/* ── 元信息 ── */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 sm:grid-cols-4">
        <div>
          <p>范围</p>
          <p className="mt-0.5 text-gray-300">
            {viewModel.horizon.from} → {viewModel.horizon.to}
          </p>
        </div>
        <div>
          <p>节点数</p>
          <p className="mt-0.5 text-gray-300">
            机会 {viewModel.windows.opportunity.length} · 风险{' '}
            {viewModel.windows.risk.length}
          </p>
        </div>
        <div>
          <p>主线点数</p>
          <p className="mt-0.5 text-gray-300">
            {viewModel.series.overall.length} 个月
          </p>
        </div>
        <div>
          <p>历史回写</p>
          <p className="mt-0.5 text-gray-300">
            {viewModel.history?.actualOutcomePending ? '待回写' : '已结案'}
          </p>
        </div>
      </div>

      {/* ── 在 K线页打开 ── */}
      <button
        onClick={onOpenInKline}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary/20"
      >
        <span className="material-symbols-outlined text-sm">open_in_new</span>
        在 K线页打开
      </button>
    </div>
  );
}

export default KlineHistoryPage;
