import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { chronicleApi, ChronicleEntry, InsightProfile } from '@/services/chronicleApi';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';

type Tab = 'overview' | 'entries' | 'reviews' | 'insights';

export function TongjianPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [entries, setEntries] = useState<ChronicleEntry[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ChronicleEntry[]>([]);
  const [insights, setInsights] = useState<InsightProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // userId 从 JWT 自动获取，无需前端传递
      if (activeTab === 'entries' || activeTab === 'overview') {
        const data = await chronicleApi.listEntries();
        setEntries(data);
      }
      if (activeTab === 'reviews' || activeTab === 'overview') {
        const data = await chronicleApi.getPendingReviews();
        setPendingReviews(data);
      }
      if (activeTab === 'insights') {
        const data = await chronicleApi.getInsights();
        setInsights(data);
      }
    } catch (e) {
      console.error('Failed to load chronicle data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setLoading(true);
    try {
      const data = await chronicleApi.generateInsights();
      setInsights(data);
    } catch (e) {
      toast.error('生成画像失败');
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { key: 'entries', title: '记录', desc: `${entries.length} 条`, icon: 'history' },
    { key: 'reviews', title: '待回看', desc: `${pendingReviews.length} 条`, icon: 'visibility' },
    { key: 'insights', title: '我的画像', desc: '决策模式', icon: 'person' },
  ];

  return (
    <div className="min-h-screen bg-shumiyuan flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">通鉴</h1>
          <p className="text-sm text-muted-foreground mt-1">记录、回看、成长</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-4 py-2">
        <div className="flex gap-1 p-1 rounded-xl glass-card">
          {(['overview', 'entries', 'reviews', 'insights'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' && '概览'}
              {tab === 'entries' && '记录'}
              {tab === 'reviews' && '回看'}
              {tab === 'insights' && '画像'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {loading ? (
          <LoadingState fullScreen label="加载中..." />
        ) : activeTab === 'overview' ? (
          /* 概览 */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {modules.map((m, i) => (
                <button
                  key={m.key}
                  onClick={() => setActiveTab(m.key as Tab)}
                  className={`glass-card p-4 text-left animate-fade-in-up-stagger stagger-delay-${i + 1}`}
                >
                  <span className="material-symbols-outlined text-secondary text-xl">
                    {m.icon}
                  </span>
                  <p className="text-sm font-medium text-foreground mt-2">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* 最近记录 */}
            {entries.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-3">最近记录</p>
                <div className="space-y-2">
                  {entries.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="glass-card p-3">
                      <p className="text-sm text-foreground">{entry.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 待回看提醒 */}
            {pendingReviews.length > 0 && (
              <div className="glass-card p-4 animate-fade-in-up-stagger stagger-delay-2" style={{ borderColor: 'hsl(var(--shumiyuan-warn) / 0.2)' }}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[hsl(var(--shumiyuan-warn))]">notifications</span>
                  <p className="text-sm font-medium text-[hsl(var(--shumiyuan-warn))]">
                    有 {pendingReviews.length} 条记录到了回看时间
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'entries' ? (
          /* 记录列表 */
          <div className="space-y-3">
            {entries.length === 0 ? (
              <EmptyState title="暂无记录" className="py-8" />
            ) : (
              entries.map((entry, i) => (
                <div key={entry.id} className={`glass-card p-4 animate-fade-in-up-stagger stagger-delay-${(i % 5) + 1}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        entry.entryType === 'case'
                          ? 'bg-blue-500/10 text-blue-500'
                          : entry.entryType === 'person'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {entry.entryType === 'case' ? '事项' : entry.entryType === 'person' ? '人物' : '回看'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          /* 待回看 */
          <div className="space-y-3">
            {pendingReviews.length === 0 ? (
              <EmptyState title="暂无待回看记录" className="py-8" />
            ) : (
              pendingReviews.map((entry, i) => (
                <div key={entry.id} className={`glass-card p-4 animate-fade-in-up-stagger stagger-delay-${(i % 5) + 1}`}>
                  <p className="text-sm font-medium text-foreground">{entry.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    计划回看：{entry.reviewAt ? new Date(entry.reviewAt).toLocaleDateString('zh-CN') : '未设置'}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'insights' ? (
          /* 我的画像 */
          <div className="space-y-4">
            {!insights ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">还没有生成个人画像</p>
                <button
                  onClick={handleGenerateInsights}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? '生成中…' : '生成我的画像'}
                </button>
              </div>
            ) : (
              <>
                {/* 统计 */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass-card p-3 text-center">
                    <p className="stat-number">{insights.totalEntries}</p>
                    <p className="text-xs text-muted-foreground">总记录</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="stat-number">{insights.totalReviews}</p>
                    <p className="text-xs text-muted-foreground">已回看</p>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <p className="stat-number">
                      {insights.accuracyRate ? `${Math.round(insights.accuracyRate * 100)}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">看准率</p>
                  </div>
                </div>

                {/* 风险偏好 */}
                <div className="glass-card p-4">
                  <p className="text-sm text-muted-foreground">风险偏好</p>
                  <p className="text-base font-medium text-foreground">{insights.riskPreference}</p>
                </div>

                {/* 常见卡点 */}
                {insights.commonStuckPoints.length > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-sm font-medium text-foreground mb-2">常见卡点</p>
                    <div className="flex flex-wrap gap-2">
                      {insights.commonStuckPoints.map((p, i) => (
                        <span key={i} className="px-2 py-1 text-xs rounded-full bg-secondary/10 text-secondary">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 误判模式 */}
                {insights.misjudgmentPatterns.length > 0 && (
                  <div className="glass-card-risk glass-card p-4">
                    <p className="text-sm font-medium text-[hsl(var(--shumiyuan-risk))] mb-2">常见误判</p>
                    <ul className="space-y-1">
                      {insights.misjudgmentPatterns.map((p, i) => (
                        <li key={i} className="text-sm text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--shumiyuan-risk))]" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 上头场景 */}
                {insights.commonTriggers.length > 0 && (
                  <div className="glass-card p-4" style={{ borderColor: 'hsl(var(--shumiyuan-warn) / 0.2)' }}>
                    <p className="text-sm font-medium text-[hsl(var(--shumiyuan-warn))] mb-2">容易上头的场景</p>
                    <div className="flex flex-wrap gap-2">
                      {insights.commonTriggers.map((t, i) => (
                        <span key={i} className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-500">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 长期趋势 */}
                {insights.longTermTrend && (
                  <div className="glass-card p-4" style={{ borderColor: 'hsl(var(--secondary) / 0.2)' }}>
                    <p className="text-sm font-medium text-secondary mb-2">长期趋势</p>
                    <p className="text-sm text-foreground">{insights.longTermTrend}</p>
                  </div>
                )}

                <button
                  onClick={handleGenerateInsights}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? '更新中…' : '更新画像'}
                </button>
              </>
            )}
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}
