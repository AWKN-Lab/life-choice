import { useState, useEffect } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { starChartApi, Person, NetworkData } from '@/services/starChartApi';
import { LoadingState } from '@/components/feedback/LoadingState';
import { EmptyState } from '@/components/feedback/EmptyState';

type FilterType = 'all' | 'important' | 'recent' | 'risk' | 'watch';

const FILTER_LABELS: Record<FilterType, string> = {
  all: '全部',
  important: '重要人物',
  recent: '近期互动',
  risk: '风险关注',
  watch: '值得观察',
};

const ADVICE_CLASSES: Record<string, string> = {
  '推进': 'advice-tag advance',
  '观察': 'advice-tag observe',
  '试探': 'advice-tag observe',
  '设边界': 'advice-tag stop',
  '暂缓': 'advice-tag stop',
  '止损': 'advice-tag stop',
};

export function XingtuPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [persons, setPersons] = useState<Person[]>([]);
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [stats, setStats] = useState({ total: 0, critical: 0, withRisk: 0, avgCompleteness: 0 });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'network'>('list');

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [personsData, networkData, statsData] = await Promise.all([
        starChartApi.listPersons(activeFilter),
        starChartApi.getNetwork(),
        starChartApi.getNetworkStats(),
      ]);
      setPersons(personsData);
      setNetwork(networkData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load star chart data:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-shumiyuan flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">星图</h1>
          <p className="text-sm text-muted-foreground mt-1">看清你身边的人</p>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-4 gap-2">
          <div className="glass-card p-2 text-center">
            <p className="stat-number">{stats.total}</p>
            <p className="text-xs text-muted-foreground">人物</p>
          </div>
          <div className="glass-card p-2 text-center">
            <p className="stat-number">{stats.critical}</p>
            <p className="text-xs text-muted-foreground">重要</p>
          </div>
          <div className="glass-card p-2 text-center">
            <p className="stat-number">{stats.withRisk}</p>
            <p className="text-xs text-muted-foreground">风险</p>
          </div>
          <div className="glass-card p-2 text-center">
            <p className="stat-number">{Math.round(stats.avgCompleteness * 100)}%</p>
            <p className="text-xs text-muted-foreground">完整度</p>
          </div>
        </div>
      </div>

      {/* Filter + View Toggle */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-secondary text-secondary-foreground'
                  : 'glass-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-lg ${view === 'list' ? 'bg-secondary/20 text-secondary' : 'text-muted-foreground'}`}
          >
            <span className="material-symbols-outlined text-sm">list</span>
          </button>
          <button
            onClick={() => setView('network')}
            className={`p-1.5 rounded-lg ${view === 'network' ? 'bg-secondary/20 text-secondary' : 'text-muted-foreground'}`}
          >
            <span className="material-symbols-outlined text-sm">hub</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {loading ? (
          <LoadingState fullScreen label="加载中..." />
        ) : view === 'network' ? (
          <div className="space-y-4">
            <div className="network-container flex items-center justify-center">
              <p className="text-muted-foreground text-sm">关系网络可视化（D3.js）</p>
            </div>
            {network && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">连接关系</p>
                {network.edges.map((edge, i) => (
                  <div key={i} className="glass-card p-2 text-sm">
                    <span className="text-foreground">{edge.source}</span>
                    <span className="text-muted-foreground mx-2">— {edge.relation} —</span>
                    <span className="text-foreground">{edge.target}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {persons.length === 0 ? (
              <EmptyState title="暂无人物记录" className="py-8" />
            ) : (
              persons.map((person, i) => (
                <div
                  key={person.id}
                  className={`glass-card p-4 animate-fade-in-up-stagger stagger-delay-${(i % 5) + 1}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-foreground">
                          {person.name || '未命名'}
                        </p>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            person.importance === 'critical' || person.importance === 'high'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {person.relationType || '其他'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {person.currentStatus || '观察中'}
                      </p>
                      {person.riskTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {person.riskTags.map((tag) => (
                            <span key={tag} className="risk-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {person.currentAdvice && (
                        <span className={ADVICE_CLASSES[person.currentAdvice] || 'advice-tag observe'}>
                          {person.currentAdvice}
                        </span>
                      )}
                      <div className="mt-2">
                        <div className="progress-ring">
                          <svg width="48" height="48" viewBox="0 0 48 48">
                            <circle className="progress-ring-bg" cx="24" cy="24" r="20" />
                            <circle
                              className="progress-ring-fill"
                              cx="24" cy="24" r="20"
                              strokeDasharray={`${2 * Math.PI * 20}`}
                              strokeDashoffset={`${2 * Math.PI * 20 * (1 - (person.completeness || 0))}`}
                            />
                          </svg>
                          <span className="progress-ring-text">{Math.round((person.completeness || 0) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
