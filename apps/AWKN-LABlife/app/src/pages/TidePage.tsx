/**
 * TidePage — 人生潮汐操作台（纯潮汐维度）
 *
 * 两个 Tab：状态雷达 | 相位空间
 *   - 状态雷达：12维状态 → 时·位·心 三组雷达图
 *   - 相位空间：位 × 心 四象限散点 + 时 色温
 *
 * 重要：此页不再包含 K线（K线已独立为 /kline），避免混淆
 *   "时间维度的K线" vs "状态维度的雷达/空间"
 *
 * 门控逻辑：
 *   - 后端返回 gated=true → 完全门控
 *   - 后端返回 gated='partial' → 部分门控，展示3个节点 + 模糊遮罩
 *
 * 路由：/life/tide
 */

import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTidePackage } from '../hooks/useTidePackage';
import { CreditBalance } from '../components/tide/CreditBalance';
import { PaywallOverlay } from '../components/tide/PaywallOverlay';
import { useAuthStore } from '../store/authStore';
import { usePreviewStore } from '../store/previewStore';
import { GroupGauge } from '@/components/charts/GroupGauge';
import type { StateSnapshot, PhasePoint } from '../types/lifekline';
import type { MonthlyKlineBar } from '../types/lifekline';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoginRequired } from '@/components/feedback/LoginRequired';
import { PageHeader } from '@/components/layout/PageHeader';
import { QUADRANT_LABELS, STATE_DIMENSION_LABELS, TIDE_FACTOR_LABELS } from '../types/lifekline';
import { deriveUnifiedDecisionBrief } from '../utils/decisionBrief';

type TabKey = 'timeline' | 'radar' | 'phase';

const TABS: { key: TabKey; label: string; desc: string }[] = [
  { key: 'timeline', label: '潮汐时间轴', desc: '因子线 / 时间窗 / 状态概率' },
  { key: 'radar', label: '状态雷达', desc: '时·位·心 三组雷达 vs 基准均值' },
  { key: 'phase', label: '相位空间', desc: '位 × 心 四象限 · 时为色温' },
];

const LazyTideTimeline = lazy(() => import('../components/tide/TideTimeline').then((module) => ({ default: module.TideTimeline })));
const LazyStateRadar = lazy(() => import('../components/tide/StateRadar').then((module) => ({ default: module.StateRadar })));
const LazyPhaseSpace = lazy(() => import('../components/tide/PhaseSpace').then((module) => ({ default: module.PhaseSpace })));

function describeTideAction(quadrant: PhasePoint['quadrant'], weakestLabel: string | null, time: number) {
  if (quadrant === 'prosperous') {
    return `当前可以扩张，但动作要围绕已被验证的方向展开${weakestLabel ? `，同时补齐 ${weakestLabel}` : ''}。`;
  }
  if (quadrant === 'exploration') {
    return `状态有冲劲但噪音偏大，适合小步试错，不适合一次性重仓下注${weakestLabel ? `，先稳住 ${weakestLabel}` : ''}。`;
  }
  if (quadrant === 'recovery') {
    return `现在更适合修复和蓄势，别急着证明自己，先把系统恢复到能持续运转的状态${weakestLabel ? `，尤其是 ${weakestLabel}` : ''}。`;
  }
  return `这是风险暴露区，先收缩承诺和消耗，优先处理 ${weakestLabel ?? '最弱维度'}，等时机分回到 ${time} 以上再谈扩张。`;
}

function buildTideDirective(snapshot: StateSnapshot) {
  const tideScore = snapshot.tideScore ?? 50;
  const short = snapshot.windowScores?.short ?? tideScore;
  const mid = snapshot.windowScores?.mid ?? tideScore;
  const long = snapshot.windowScores?.long ?? tideScore;
  const action = snapshot.actionBias ?? 'repair';
  const momentumUp = short >= mid && mid >= long;
  const pressure = snapshot.factorScores?.pressure ?? 50;

  const actionLine =
    action === 'expand' ? '这周可以推进，但只推进已经看清的主线。'
      : action === 'probe' ? '这周适合小步试探，先拿验证，不抢结论。'
      : action === 'repair' ? '这周先修复底盘，把节奏放稳。'
      : '这周先收口止损，减少额外消耗。';

  const rhythmLine = momentumUp
    ? '短中长窗同向，节律在共振。'
    : short < mid && mid < long
      ? '短中长窗都在走弱，别把一次动作做大。'
      : '时间窗有分歧，先看一轮再定是否加码。';

  const alertLine = pressure >= 60
    ? '当前警戒：压力偏高，任何新承诺都要先算承接力。'
    : tideScore <= 45
      ? '当前警戒：综合分偏低，先稳再求快。'
      : '当前警戒：别被短期顺手感误导，继续盯住后续两个月。';

  return {
    title: action === 'expand' ? '本周偏进攻' : action === 'probe' ? '本周偏试盘' : action === 'repair' ? '本周偏修复' : '本周偏防守',
    actionLine,
    rhythmLine,
    alertLine,
  };
}

function TideSectionFallback({ label = '加载潮汐图表…' }: { label?: string }) {
  return (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-outline/5 bg-on-surface/[0.02] mx-2">
      <LoadingState label={label} />
    </div>
  );
}

export function TidePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydratedStore = useAuthStore((s) => s.hasHydrated);
  const [hydratedTimeout, setHydratedTimeout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setHydratedTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  const hasHydrated = hasHydratedStore || hydratedTimeout;

  const { data, loading, error, gated, refetch } = useTidePackage({
    enabled: hasHydrated && isAuthenticated,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('timeline');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // ── 基础数据 ──
  const stateSnapshots = useMemo(() => data.stateSnapshots ?? [], [data.stateSnapshots]);
  const klineBars = useMemo<MonthlyKlineBar[]>(() => data.klineBars ?? [], [data.klineBars]);
  const phasePoints = useMemo<PhasePoint[]>(() => data.phasePoints ?? [], [data.phasePoints]);
  const isPartialGated = gated?.gated === 'partial';

  // B-S4 (2026-07-05): 数据来源徽章 — 显式标注模拟数据，不冒充真实能力
  const dataSource = data.meta?.source;
  const dataSourceBadge = useMemo<{ label: string; color: string; tip: string } | null>(() => {
    switch (dataSource) {
      case 'simulated':
        return { label: '演示数据', color: '#f59e0b', tip: '当前为系统生成的演示数据，不作为正式结论。' };
      case 'real':
        return { label: '已有数据', color: '#22c55e', tip: '基于已确认出生资料和确定性规则计算。' };
      case 'llm_inferred':
        return { label: 'LLM 推导', color: '#3b82f6', tip: '基于 LLM 推导的状态数据。' };
      case 'fallback':
        return { label: '兜底数据', color: '#9ca3af', tip: '使用兜底数据，仅供参考。' };
      default:
        return null;
    }
  }, [dataSource]);

  // ── 当前快照（选中月份 or 最新） ──
  const currentSnapshot = useMemo<StateSnapshot | null>(() => {
    if (stateSnapshots.length === 0) return null;
    if (selectedMonth) {
      const found = stateSnapshots.find((s) => s.date === selectedMonth);
      if (found) return found;
    }
    return stateSnapshots[stateSnapshots.length - 1];
  }, [stateSnapshots, selectedMonth]);

  // ── 基准均值 ──
  const baseline = useMemo<Record<string, number>>(() => {
    if (stateSnapshots.length === 0) return {};
    const dims = ['energy', 'recovery', 'emotion', 'clarity', 'liquidity', 'momentum', 'support', 'agency', 'order', 'growth', 'optionality', 'buffer'] as const;
    const result: Record<string, number> = {};
    for (const dim of dims) {
      const sum = stateSnapshots.reduce((acc, s) => acc + (s.values?.[dim] ?? 50), 0);
      result[dim] = Math.round(sum / stateSnapshots.length);
    }
    return result;
  }, [stateSnapshots]);

  // ── 时·位·心 聚合分（基于状态快照，非 K线） ──
  const groupScores = useMemo(() => {
    if (!currentSnapshot) return { time: 0, position: 0, mind: 0 };
    const v = currentSnapshot.values ?? {};
    return {
      time: currentSnapshot.timeGroup ?? Math.round(((v.liquidity ?? 50) + (v.momentum ?? 50) + (v.optionality ?? 50)) / 3),
      position: currentSnapshot.positionGroup ?? Math.round(((v.support ?? 50) + (v.agency ?? 50) + (v.order ?? 50) + (v.growth ?? 50) + (v.buffer ?? 50)) / 5),
      mind: currentSnapshot.mindGroup ?? Math.round(((v.energy ?? 50) + (v.recovery ?? 50) + (v.emotion ?? 50) + (v.clarity ?? 50)) / 4),
    };
  }, [currentSnapshot]);

  const tideSummary = useMemo(() => {
    if (!currentSnapshot) {
      return null;
    }

    const dimEntries = Object.entries(currentSnapshot.values ?? {}) as Array<[keyof StateSnapshot['values'], number]>;
    const weakest = dimEntries.length > 0
      ? dimEntries.reduce((worst, current) => (current[1] < worst[1] ? current : worst))
      : null;
    const strongest = dimEntries.length > 0
      ? dimEntries.reduce((best, current) => (current[1] > best[1] ? current : best))
      : null;
    const quadrantMeta = QUADRANT_LABELS[currentSnapshot.quadrant];
    const bottleneckGroup = Object.entries(groupScores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? 'time';
    const weakestLabel = weakest ? STATE_DIMENSION_LABELS[weakest[0]].zh : null;
    const strongestLabel = strongest ? STATE_DIMENSION_LABELS[strongest[0]].zh : null;

    return {
      quadrantMeta,
      weakestLabel,
      strongestLabel,
      bottleneckGroup: bottleneckGroup === 'time' ? '时' : bottleneckGroup === 'position' ? '位' : '心',
      factors: currentSnapshot.factorScores,
      action: describeTideAction(currentSnapshot.quadrant, weakestLabel, groupScores.time),
    };
  }, [currentSnapshot, groupScores]);

  const currentKlineBar = useMemo(() => {
    if (klineBars.length === 0) return null;
    if (!currentSnapshot) return klineBars[klineBars.length - 1];
    return klineBars.find((bar) => bar.monthLabel === currentSnapshot.date) ?? klineBars[klineBars.length - 1];
  }, [klineBars, currentSnapshot]);

  const unifiedDecision = useMemo(
    () => deriveUnifiedDecisionBrief(currentKlineBar, currentSnapshot),
    [currentKlineBar, currentSnapshot],
  );

  const tideDirective = useMemo(
    () => (currentSnapshot ? buildTideDirective(currentSnapshot) : null),
    [currentSnapshot],
  );

  // P0-③ (2026-07-06): 优先消费后端 tideJudgment（判断/窗口/风险/建议），fallback 到本地计算
  // 后端字段定义见 tide-judgment.service.ts，B-S2 已透传（免费+付费分支）
  const tideJudgment = useMemo(() => data.tideJudgment, [data.tideJudgment]);
  const phaseJudgment = tideJudgment?.phaseJudgment ?? tideSummary?.quadrantMeta.zh ?? '';
  const shortDirective = tideJudgment?.shortDirective ?? tideDirective?.title ?? '';
  const actionAdvice = tideJudgment?.actionAdvice ?? tideDirective?.actionLine ?? '';
  const windowTip = tideJudgment?.windowTip ?? tideDirective?.rhythmLine ?? '';
  const alertLine = tideDirective?.alertLine ?? '';

  // TidePage 不再处理 K线跳转，K线已独立为 /kline
  void isPartialGated; // 保留引用避免 unused

  // A-1: previewStore 激活 — 部分门控时记录预览状态（5分钟有效）
  const hasPreview = usePreviewStore((s) => s.previewId !== null);
  useEffect(() => {
    if (isPartialGated && phasePoints.length > 0) {
      usePreviewStore.getState().setPreview({
        previewId: `tide_${Date.now()}`,
        module: 'kline',
        freeContent: { phasePoints: phasePoints.slice(0, 3) },
        lockedContent: {
          preview: '仅展示3个相位点',
          unlockAction: '解锁完整潮汐',
          requiredPlan: 'premium',
        },
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }
    return () => usePreviewStore.getState().clearPreview();
  }, [isPartialGated, phasePoints]);

  // ── Loading ──
  if (!hasHydrated || loading) {
    return (
      <LoadingState fullScreen label="加载潮汐数据…" className="bg-surface-base" />
    );
  }

  // ── 未登录引导 ──
  if (!isAuthenticated) {
    return <LoginRequired icon="waves" title="登录后查看潮汐" description="登录后即可查看您的人生潮汐状态" />;
  }

  // ── Error ──
  if (error) {
    return <ErrorState message="数据加载失败" onRetry={refetch} className="bg-surface-base" />;
  }

  // ── 完全门控 ──
  if (gated?.gated === true) {
    return (
      <div className="min-h-screen bg-surface-base px-4 py-8">
        <PageHeader title="人生潮汐" />
        <PaywallOverlay
          moduleId="tide"
          creditsNeeded={10}
          message={gated.message}
          onUnlocked={refetch}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-on-surface pb-8">
      {/* ── 页面标题 + 跳转 K线 ── */}
      <header className="flex items-center justify-between border-b border-outline/10 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate">人生潮汐</h1>
            {dataSourceBadge && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: `${dataSourceBadge.color}20`,
                  color: dataSourceBadge.color,
                }}
                title={dataSourceBadge.tip}
              >
                {dataSourceBadge.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 truncate">时·位·心 — 人生不是只有涨落，还有此刻的状态</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <CreditBalance />
          <Link to="/kline" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            ← K线
          </Link>
        </div>
      </header>

      {currentSnapshot && tideSummary && (
        <section className="border-b border-outline/10 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">状态判断</p>
              <h2 className="mt-1 text-base font-semibold text-white">{phaseJudgment || tideSummary.quadrantMeta.zh}</h2>
            </div>
            <div
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: `${tideSummary.quadrantMeta.color}20`, color: tideSummary.quadrantMeta.color }}
            >
              {tideSummary.quadrantMeta.desc}
            </div>
          </div>
          <p className="text-sm leading-6 text-gray-300">{tideSummary.action}</p>
          {tideJudgment && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[#3b82f6]/20 bg-[#101723]/70 px-3 py-2">
                <p className="text-xs text-gray-500">时组判断</p>
                <p className="mt-1 text-sm font-medium text-[#dfe9f6]">
                  {tideJudgment.timeStatus?.label ?? `${tideJudgment.timeStatus?.level ?? 'mid'} · ${tideJudgment.timeStatus?.score ?? '-'}`}
                </p>
              </div>
              <div className="rounded-xl border border-[#22c55e]/20 bg-[#111b16]/70 px-3 py-2">
                <p className="text-xs text-gray-500">位组判断</p>
                <p className="mt-1 text-sm font-medium text-[#d8f7e2]">
                  {tideJudgment.positionStatus?.label ?? `${tideJudgment.positionStatus?.level ?? 'mid'} · ${tideJudgment.positionStatus?.score ?? '-'}`}
                </p>
              </div>
              <div className="rounded-xl border border-[#a855f7]/20 bg-[#171427]/70 px-3 py-2">
                <p className="text-xs text-gray-500">心组判断</p>
                <p className="mt-1 text-sm font-medium text-[#f3e8ff]">
                  {tideJudgment.mindStatus?.label ?? `${tideJudgment.mindStatus?.level ?? 'mid'} · ${tideJudgment.mindStatus?.score ?? '-'}`}
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#a855f7]/20 bg-[#171427]/70 p-4">
              <p className="text-xs text-gray-500">此刻卡点</p>
              <p className="mt-2 text-lg font-semibold text-white">{tideSummary.bottleneckGroup}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">三组里最低的一组，说明你不是全面不好，而是这一面在拖住整体状态。</p>
            </div>
            <div className="rounded-2xl border border-[#ef4444]/20 bg-[#211418]/70 p-4">
              <p className="text-xs text-gray-500">最弱维度</p>
              <p className="mt-2 text-lg font-semibold text-white">{tideSummary.weakestLabel ?? '暂无'}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">这不是分析结论，而是你此刻最该优先处理的具体问题位。</p>
            </div>
            <div className="rounded-2xl border border-[#22c55e]/20 bg-[#111b16]/70 p-4">
              <p className="text-xs text-gray-500">可借力维度</p>
              <p className="mt-2 text-lg font-semibold text-white">{tideSummary.strongestLabel ?? '暂无'}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">先借最强项维持局面，再逐步修复最弱项，状态才会真正转好。</p>
            </div>
          </div>
          {tideSummary.factors && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.keys(TIDE_FACTOR_LABELS) as Array<keyof typeof TIDE_FACTOR_LABELS>).map((key) => (
                <div key={key} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-xs text-gray-500">{TIDE_FACTOR_LABELS[key].zh}</p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: TIDE_FACTOR_LABELS[key].color }}>
                    {tideSummary.factors?.[key] ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-gray-400">{TIDE_FACTOR_LABELS[key].desc}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(tideDirective || tideJudgment) && (
        <section className="border-b border-outline/10 px-4 py-4">
          <div className="rounded-2xl border border-primary/20 bg-[#181520]/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">短指令</p>
            <h2 className="mt-1 text-base font-semibold text-white">{shortDirective || tideDirective?.title}</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#22c55e]/20 bg-[#111b16]/70 px-4 py-3">
                <p className="text-xs text-gray-500">现在怎么动</p>
                <p className="mt-1 text-sm font-medium text-[#d8f7e2]">{actionAdvice || tideDirective?.actionLine}</p>
              </div>
              <div className="rounded-xl border border-[#3b82f6]/20 bg-[#101723]/70 px-4 py-3">
                <p className="text-xs text-gray-500">节奏怎么看</p>
                <p className="mt-1 text-sm font-medium text-[#dfe9f6]">{windowTip || tideDirective?.rhythmLine}</p>
              </div>
              <div className="rounded-xl border border-[#ef4444]/20 bg-[#211418]/70 px-4 py-3">
                <p className="text-xs text-gray-500">当前警戒</p>
                <p className="mt-1 text-sm font-medium text-[#ffd4d4]">{alertLine || tideDirective?.alertLine}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {unifiedDecision && (
        <section className="border-b border-outline/10 px-4 py-4">
          <div className="rounded-2xl border border-[#8bb8e0]/20 bg-[#111827]/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8bb8e0]">和 K 线合并后看</p>
                <h2 className="mt-1 text-base font-semibold text-white">{unifiedDecision.headline}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-300">{unifiedDecision.summary}</p>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                unifiedDecision.alignment === 'aligned'
                  ? 'bg-emerald-500/12 text-emerald-300'
                  : unifiedDecision.alignment === 'conflict'
                    ? 'bg-rose-500/12 text-rose-300'
                    : 'bg-amber-500/12 text-amber-300'
              }`}>
                {unifiedDecision.alignment === 'aligned' ? '长期与当下同向' : unifiedDecision.alignment === 'conflict' ? '长期与当下背离' : '长期与当下待确认'}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {unifiedDecision.evidence.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-gray-300">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#22c55e]/20 bg-[#111b16]/70 px-4 py-3">
                <p className="text-xs text-gray-500">此刻动作</p>
                <p className="mt-1 text-sm font-semibold text-[#d8f7e2]">{unifiedDecision.stance}</p>
                <p className="mt-1 text-[11px] leading-5 text-gray-400">{unifiedDecision.positionHint}</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-[#1a1820]/70 px-4 py-3">
                <p className="text-xs text-gray-500">此刻最合理的动作</p>
                <p className="mt-1 text-sm font-medium text-[#f2deb0]">{unifiedDecision.nextStep}</p>
              </div>
              <div className="rounded-xl border border-[#ef4444]/20 bg-[#211418]/70 px-4 py-3">
                <p className="text-xs text-gray-500">此刻别做</p>
                <p className="mt-1 text-sm font-medium text-[#ffd4d4]">{unifiedDecision.avoid}</p>
              </div>
              <div className="rounded-xl border border-[#8bb8e0]/20 bg-[#101723]/70 px-4 py-3">
                <p className="text-xs text-gray-500">下一观察点</p>
                <p className="mt-1 text-sm font-medium text-[#dfe9f6]">{unifiedDecision.watchPoint}</p>
                <p className="mt-1 text-[11px] leading-5 text-gray-500">当前判断把握度 {unifiedDecision.confidence}%</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 时·位·心 仪表盘 ── */}
      {currentSnapshot && (
        <div className="flex items-center justify-center gap-3 sm:gap-6 border-b border-outline/10 px-4 py-4">
          <GroupGauge label="时" score={groupScores.time} color="#3b82f6" desc="流动性 动量 可选性" />
          <GroupGauge label="位" score={groupScores.position} color="#22c55e" desc="支持 掌控 秩序 成长 缓冲" />
          <GroupGauge label="心" score={groupScores.mind} color="#a855f7" desc="精力 恢复 情绪 清晰度" />
        </div>
      )}

      {/* ── Tab 导航 ── */}
      <nav className="flex gap-1 border-b border-outline/10 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-3 text-sm transition-colors ${
              activeTab === tab.key ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />}
          </button>
        ))}
      </nav>

      {/* ── Tab 描述 ── */}
      <div className="px-4 py-2">
        <p className="text-xs text-gray-500">{TABS.find((t) => t.key === activeTab)?.desc}</p>
      </div>

      {/* ── 内容区 ── */}
      <main className="px-2 sm:px-4">
        {currentSnapshot && tideSummary && (
          <div className="mx-2 mb-4 rounded-2xl border border-outline/10 bg-on-surface/[0.02] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">潮汐图不该只展示状态，它应该告诉你现在该扩张、试探、修复还是收缩。</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">雷达看哪里失衡，相位空间看你正处在哪个状态象限。</p>
              </div>
              <Link
                to="/kline"
                className="rounded-full border border-primary/30 px-3 py-1.5 text-center text-xs text-primary transition-colors hover:border-primary hover:bg-primary/10"
              >
                去看 K 线判断长期趋势
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          stateSnapshots.length > 0 ? (
            <Suspense fallback={<TideSectionFallback label="加载潮汐时间轴…" />}>
              <LazyTideTimeline
                snapshots={stateSnapshots}
                selectedDate={selectedMonth}
                onSelectDate={(date) => setSelectedMonth(date)}
              />
            </Suspense>
          ) : (
            <EmptyState
              icon="waves"
              title="暂无潮汐时间轴"
              description="先补全基础信息，系统才能生成连续的潮汐节律。"
              actionText="去补充基础信息"
              onAction={() => navigate('/kline-intro')}
              className="h-[400px] rounded-xl border border-outline/5 bg-on-surface/[0.02] mx-2"
            />
          )
        )}

        {activeTab === 'radar' && (
          currentSnapshot ? (
            <div className="relative">
              {/* 响应式：竖屏更高以便纵向排列雷达 */}
              <div className="w-full">
                <Suspense fallback={<TideSectionFallback label="加载状态雷达…" />}>
                  <LazyStateRadar current={currentSnapshot} baseline={baseline} />
                </Suspense>
              </div>
              {isPartialGated && (
                <div className="mt-3 mx-2 rounded-lg border border-primary/20 bg-[#1a1a2e]/80 px-4 py-3">
                  <p className="text-xs text-primary">{hasPreview ? "预览中·仅展示最近状态" : "仅展示最近状态"}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="waves"
              title="暂无潮汐数据"
              description="先补全出生信息，系统将为你生成潮汐状态"
              actionText="去补充基础信息"
              onAction={() => navigate('/kline-intro')}
              className="h-[400px] rounded-xl border border-outline/5 bg-on-surface/[0.02] mx-2"
            />
          )
        )}

        {activeTab === 'phase' && (
          phasePoints.length > 0 ? (
            <div className="relative">
              <Suspense fallback={<TideSectionFallback label="加载相位空间…" />}>
                <LazyPhaseSpace
                  points={phasePoints}
                  onPointClick={(point) => setSelectedMonth(point.date)}
                  className="h-[500px] sm:h-[460px] w-full"
                />
              </Suspense>
              {isPartialGated && (
                <div className="mt-3 mx-2 rounded-lg border border-primary/20 bg-[#1a1a2e]/80 px-4 py-3">
                  <p className="text-xs text-primary">{hasPreview ? "预览中·仅展示部分相位点" : "仅展示部分相位点"}</p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="waves"
              title="暂无潮汐数据"
              description="先补全出生信息，系统将为你生成潮汐状态"
              actionText="去补充基础信息"
              onAction={() => navigate('/kline-intro')}
              className="h-[400px] rounded-xl border border-outline/5 bg-on-surface/[0.02] mx-2"
            />
          )
        )}

        {/* ── 底部信息 ── */}
        <footer className="mt-6 px-2 pb-4 text-center">
          <p className="text-xs text-gray-500">
            共 {stateSnapshots.length} 个状态快照 · {phasePoints.length} 个相位点
            {selectedMonth && <span className="ml-2 text-purple-400">· 已选 {selectedMonth}</span>}
          </p>
          <Link to="/kline" className="mt-3 inline-block text-xs text-[#8bb8e0] hover:text-primary transition-colors">
            → 去看人生 K线（时间维度的涨落）
          </Link>
        </footer>
      </main>
    </div>
  );
}

export default TidePage;
