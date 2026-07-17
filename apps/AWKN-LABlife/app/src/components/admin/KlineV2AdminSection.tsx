/**
 * KlineV2AdminSection — V2 K线资产查看（P3-06）
 *
 * 在管理后台展示 V2 K线快照资产：
 *   - 总快照数、降级数、最新快照时间
 *   - 快照列表（snapshotId、生成时间、版本、置信度、降级标志）
 *   - "在历史页打开" 链接
 *
 * 数据来源：GET /kline-v2/snapshots（JWT 鉴权，admin 自己的快照）
 * 注：跨用户的全量查看需要后端 admin 端点（P4 范围）
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { trackFunnel } from '@/utils/analytics';

interface SnapshotListItem {
  snapshotId: string;
  generatedAt: string;
  status: string;
  dataVersion: string;
  algorithmVersion: string;
  confidence: number | null;
  degraded: boolean;
}

export function KlineV2AdminSection() {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiClient.get<SnapshotListItem[]>('/kline-v2/snapshots?limit=100');
      setSnapshots(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  // ── 统计 ──
  const totalCount = snapshots.length;
  const degradedCount = snapshots.filter((s) => s.degraded).length;
  const latestSnapshot = snapshots[0];
  const avgConfidence =
    snapshots.length > 0
      ? snapshots.filter((s) => s.confidence !== null).reduce((acc, s) => acc + (s.confidence ?? 0), 0) /
        Math.max(snapshots.filter((s) => s.confidence !== null).length, 1)
      : null;

  return (
    <div className="bg-surface-elevated rounded-2xl overflow-hidden mb-4">
      <div className="px-4 py-3 bg-surface-base border-b border-border flex items-center justify-between">
        <h3 className="font-medium text-text-primary">V2 K线快照资产</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSnapshots}
            disabled={loading}
            className="text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            {loading ? '刷新中…' : '刷新'}
          </button>
          <Link
            to="/kline/history"
            onClick={() => trackFunnel('admin_kline_v2_open_history')}
            className="text-xs text-primary hover:text-primary/80"
          >
            在历史页打开 →
          </Link>
        </div>
      </div>

      {/* ── 统计卡片 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 border-b border-border">
        <StatCard label="总快照数" value={String(totalCount)} />
        <StatCard label="降级数" value={String(degradedCount)} tone={degradedCount > 0 ? 'amber' : 'default'} />
        <StatCard
          label="平均置信度"
          value={avgConfidence !== null ? `${Math.round(avgConfidence * 100)}%` : '—'}
        />
        <StatCard
          label="最新快照"
          value={
            latestSnapshot
              ? new Date(latestSnapshot.generatedAt).toLocaleDateString('zh-CN')
              : '—'
          }
        />
      </div>

      {/* ── 错误 ── */}
      {error && (
        <div className="p-4 text-sm text-rose-400 bg-rose-500/5 border-b border-border">
          加载失败：{error.message}
        </div>
      )}

      {/* ── 快照列表 ── */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-base">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Snapshot ID</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">生成时间</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">数据版本</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">算法版本</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">置信度</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">状态</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">降级</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-secondary text-sm">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && snapshots.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-secondary text-sm">
                  暂无 V2 快照
                </td>
              </tr>
            )}
            {!loading && snapshots.map((snap) => (
              <tr key={snap.snapshotId} className="hover:bg-surface-base/50">
                <td className="px-4 py-2 text-xs text-text-secondary font-mono break-all">
                  {snap.snapshotId.slice(0, 16)}…
                </td>
                <td className="px-4 py-2 text-xs text-text-secondary">
                  {new Date(snap.generatedAt).toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-2 text-xs text-text-primary">{snap.dataVersion}</td>
                <td className="px-4 py-2 text-xs text-text-secondary">{snap.algorithmVersion}</td>
                <td className="px-4 py-2 text-xs text-text-primary">
                  {snap.confidence !== null ? `${Math.round(snap.confidence * 100)}%` : '—'}
                </td>
                <td className="px-4 py-2 text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    snap.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : snap.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-gray-500/10 text-text-secondary'
                  }`}>
                    {snap.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {snap.degraded ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400">
                      降级
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-secondary">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// 子组件：统计卡
// ============================================================

interface StatCardProps {
  label: string;
  value: string;
  tone?: 'default' | 'amber';
}

function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-base p-3">
      <p className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${
        tone === 'amber' ? 'text-amber-400' : 'text-text-primary'
      }`}>
        {value}
      </p>
    </div>
  );
}

export default KlineV2AdminSection;
