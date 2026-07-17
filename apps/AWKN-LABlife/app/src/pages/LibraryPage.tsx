import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { libraryApi, type SavedCase, type Scope } from '@/api/library';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from '@/components/BottomNav';
import { trackEvent } from '@/lib/analytics';
import '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import { CATEGORY_LABELS } from '@/constants/routeTypes';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoginRequired } from '@/components/feedback/LoginRequired';
import { PageHeader } from '@/components/layout/PageHeader';

/** 顶部 scope 过滤 tab（与 ADR-001 的 scope 三态语义对齐） */
const SCOPE_TABS: { key: Scope; zh: string; en: string; icon: string }[] = [
  { key: 'all',     zh: '全部', en: 'All',    icon: 'apps' },
  { key: 'private', zh: '我的', en: 'Mine',   icon: 'lock' },
  { key: 'public',  zh: '公开', en: 'Public', icon: 'public' },
];

const PAGE_SIZE = 20;

function formatDate(iso: string, isEnglish: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  if (isEnglish) {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCategoryMeta(category: string | null): { label: string; icon: string } {
  if (!category) return { label: '', icon: 'category' };
  const meta = CATEGORY_LABELS[category];
  return meta
    ? { label: meta.zh, icon: meta.icon }
    : { label: category, icon: 'category' };
}

/**
 * 渲染单个 SavedCase 卡片的视觉层次
 *
 * 这是这个页面的核心 UX 决策——命理应用里一条命例应该怎么视觉化？
 * 数据已经全部就绪：item.name / item.notes / item.category / item.tags / item.visibility / item.createdAt
 * 工具：getCategoryMeta(item.category) 拿 (label, icon)；formatDate(item.createdAt, isEnglish) 拿日期
 * 可见性视觉：private → lock 图标；public → public 图标
 *
 * TODO: 实现 SavedCaseItem 的 JSX（5-10 行）
 *   - 外层 motion.div（带 initial/animate/exit 渐入，className 用项目里的 `card` 容器）
 *   - 点击整卡触发 onClick()
 *   - 内部布局建议：
 *       [可见性图标] [name 标题]                [类别徽章 + 图标]
 *       [notes 截断 2 行（line-clamp-2）]
 *       [tags chips（最多 3 个）]               [日期 右下角]
 */
function SavedCaseItem({
  item,
  isEnglish,
  onClick,
}: {
  item: SavedCase;
  isEnglish: boolean;
  onClick: () => void;
}) {
  const category = getCategoryMeta(item.category);
  const date = formatDate(item.createdAt, isEnglish);
  const isPrivate = item.visibility === 'private';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={onClick}
      className="card overflow-hidden transition-all duration-200 cursor-pointer hover:ring-1 hover:ring-primary/30"
    >
      <div className="p-4">
        {/* Row 1: [可见性图标] [name] [类别徽章] */}
        <div className="flex items-center gap-2 mb-2">
          <Icon
            name={isPrivate ? 'lock' : 'public'}
            size={14}
            className="text-on-surface/40 flex-shrink-0"
          />
          <span className="text-on-surface font-medium truncate flex-1 min-w-0">
            {item.name}
          </span>
          {category.label && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] flex items-center gap-1">
              <Icon name={category.icon} size={10} />
              {category.label}
            </span>
          )}
        </div>

        {/* Row 2: notes 2-line truncate */}
        {item.notes && (
          <p className="text-on-surface/60 text-xs line-clamp-2 mb-2">{item.notes}</p>
        )}

        {/* Row 3: [tags chips] [日期] */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
            {item.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded bg-on-surface/5 text-on-surface/50 text-[10px] truncate max-w-[80px]"
              >
                #{tag}
              </span>
            ))}
          </div>
          {date && (
            <span className="flex-shrink-0 text-on-surface/40 text-[10px]">{date}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function LibraryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const isEnglish = i18n.language.startsWith('en');

  const [scope, setScope] = useState<Scope>('all');
  const [items, setItems] = useState<SavedCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadCases = useCallback(
    async (currentScope: Scope, currentOffset: number, append: boolean) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await libraryApi.list({
          scope: currentScope,
          limit: PAGE_SIZE,
          offset: currentOffset,
        });
        // 兼容 { items, meta } 与可能的裸数组
        const list: SavedCase[] =
          (data as any)?.items ?? (Array.isArray(data) ? (data as SavedCase[]) : []);
        const meta = (data as any)?.meta ?? {
          total: list.length,
          limit: PAGE_SIZE,
          offset: currentOffset,
          hasMore: false,
        };
        setItems(prev => (append ? [...prev, ...list] : list));
        setTotal(meta.total);
        setHasMore(Boolean(meta.hasMore));
        setOffset(currentOffset + list.length);
      } catch (err) {
        console.error('加载命例失败:', err);
        setError(isEnglish ? 'Failed to load cases' : '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, isEnglish],
  );

  // 切换 scope 时重置并重新加载
  useEffect(() => {
    if (isAuthenticated) {
      loadCases(scope, 0, false);
    }
  }, [scope, isAuthenticated, loadCases]);

  const handleScopeChange = (next: Scope) => {
    if (next === scope) return;
    trackEvent('library_scope_change', { from: scope, to: next });
    setScope(next);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadCases(scope, offset, true);
    }
  };

  if (!hasHydrated) {
    return (
      <LoadingState fullScreen />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginRequired
        icon="library_books"
        title={isEnglish ? 'Login required' : '请先登录'}
        description={isEnglish ? 'Login to view and manage your cases' : '登录后查看和管理你的命例'}
      />
    );
  }

  return (
    <div className="page-container relative">
      <div className="relative z-10 px-4 sm:px-5 pt-6 pb-32 mobile-safe-top">
        <PageHeader
          title={isEnglish ? 'Case Library' : '命例库'}
          onBack={() => navigate(-1)}
          className="px-0 pt-0 pb-0 mb-6"
        />

        {/* scope 过滤 tab */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {SCOPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleScopeChange(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                scope === tab.key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-on-surface/5 text-on-surface/50 hover:bg-on-surface/10'
              }`}
            >
              <Icon name={tab.icon} size={14} />
              {isEnglish ? tab.en : tab.zh}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-on-surface/50 text-sm">
            {isEnglish ? `${total} case${total === 1 ? '' : 's'}` : `共 ${total} 条`}
          </span>
        </div>

        {loading && items.length === 0 && (
          <LoadingState className="py-16" />
        )}

        {error && !loading && <ErrorState message={error} onRetry={() => loadCases(scope, 0, false)} />}

        {!loading && !error && items.length === 0 && (
          <EmptyState
            icon="library_books"
            title={isEnglish ? 'No cases' : '暂无命例'}
            description={isEnglish ? 'Save cases from consultation records to view here' : '从咨询记录中保存命例即可在此查看'}
            actionText={isEnglish ? 'View History' : '查看历史'}
            onAction={() => navigate('/history')}
          />
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <AnimatePresence>
                {items.map(item => (
                  <SavedCaseItem
                    key={item.id}
                    item={item}
                    isEnglish={isEnglish}
                    onClick={() => trackEvent('library_view_case', { id: item.id })}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-on-surface/5 hover:bg-on-surface/10 rounded-lg text-on-surface/70 text-sm transition-colors disabled:opacity-50"
                >
                  {loading
                    ? isEnglish ? 'Loading...' : '加载中...'
                    : isEnglish ? 'Load more' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
