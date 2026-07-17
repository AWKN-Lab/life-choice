/**
 * K线名人对比页 — P2-2
 *
 * 用户选择名人 + 输入八字，查看与名人的K线对比
 * 复用已有 BaziComparisonPanel + consultApi
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { consultApi } from '@/api/consult';
import BaziComparisonPanel from '@/components/celebrity/BaziComparisonPanel';
import { TidePhaseChart } from '@/components/TidePhaseChart';
import { useAuthStore } from '@/store/authStore';
import { trackEvent } from '@/lib/analytics';
import type { CelebrityCase } from '@/types/lifekline';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';

interface CelebrityComparison {
  celebrity: CelebrityCase;
  similarity: {
    overall_score: number;
    year_pillar_score: number;
    month_pillar_score: number;
    day_pillar_score: number;
    hour_pillar_score: number;
    wuxing_balance_score: number;
    day_master_relation: string;
    insights: string[];
  };
}

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'business', label: '商界' },
  { id: 'politics', label: '政界' },
  { id: 'entertainment', label: '演艺' },
  { id: 'sports', label: '体育' },
  { id: 'science', label: '科技' },
];

export default function KlineComparePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [celebrities, setCelebrities] = useState<CelebrityCase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCelebrity, setSelectedCelebrity] = useState<CelebrityCase | null>(null);
  const [comparison, setComparison] = useState<CelebrityComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载名人列表
  useEffect(() => {
    const category = selectedCategory === 'all' ? undefined : selectedCategory;
    consultApi.getCelebrityCases(category)
      .then(setCelebrities)
      .catch(() => setCelebrities([]));
  }, [selectedCategory]);

  // 计算对比
  const handleCompare = useCallback(async () => {
    if (!selectedCelebrity || !user?.birthDate) return;
    setLoading(true);
    setError(null);
    trackEvent('kline_compare_click', { celebrity_id: selectedCelebrity.id });

    try {
      const similarity = await consultApi.calculateCelebritySimilarity(
        selectedCelebrity.id,
        {
          birthDate: user.birthDate,
          birthTime: user.birthTime || undefined,
          gender: (user.gender as 'male' | 'female') || undefined,
        },
      );
      setComparison({
        celebrity: selectedCelebrity,
        similarity,
      });
      trackEvent('kline_compare_success', { celebrity_id: selectedCelebrity.id, score: similarity.overall_score });
    } catch (e) {
      setError('对比计算失败，请稍后重试');
      trackEvent('kline_compare_fail', { celebrity_id: selectedCelebrity.id });
    } finally {
      setLoading(false);
    }
  }, [selectedCelebrity, user]);

  // TODO: 用户四柱需从后端 BaZiProfile API 获取，目前留空由 BaziComparisonPanel fallback 渲染
  const userPillars = undefined;

  return (
    <div className="fixed inset-0 flex flex-col bg-surface-base text-on-surface">
      {/* 头部 */}
      <PageHeader
        title="K线名人对比"
        onBack={() => navigate(-1)}
        className="gap-4 border-b border-border/40 bg-surface-container/95 pt-6 backdrop-blur-sm mobile-safe-top"
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 分类选择 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSelectedCelebrity(null); setComparison(null); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-surface-container-high text-on-surface-variant/70 border border-border/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 名人列表 */}
        <div className="grid grid-cols-2 gap-2">
          {celebrities.map((celeb) => (
            <button
              key={celeb.id}
              onClick={() => { setSelectedCelebrity(celeb); setComparison(null); }}
              className={`text-left p-3 rounded-xl border transition-all ${
                selectedCelebrity?.id === celeb.id
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border/20 bg-surface-container-high/50 hover:bg-surface-container-high'
              }`}
            >
              <p className="text-sm font-bold text-on-surface truncate">{celeb.name_cn || celeb.name}</p>
              <p className="text-xs text-on-surface-variant/60 mt-0.5">{celeb.category_cn || celeb.category}</p>
              <p className="text-[10px] text-on-surface-variant/40 mt-1 truncate">{celeb.description}</p>
            </button>
          ))}
          {celebrities.length === 0 && (
            <EmptyState title="暂无名人数据" className="col-span-2 py-8" />
          )}
        </div>

        {/* 对比按钮 */}
        {selectedCelebrity && !comparison && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleCompare}
            disabled={loading || !user?.birthDate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-on-surface text-sm font-bold disabled:opacity-50 hover:from-amber-700 hover:to-amber-600 active:from-amber-800 transition-colors"
          >
            {loading ? '计算中...' : !user?.birthDate ? '请先完善出生信息' : `与${selectedCelebrity.name_cn || selectedCelebrity.name}对比`}
          </motion.button>
        )}

        {/* 错误提示 */}
        {error && (
          <p className="text-center text-error text-sm">{error}</p>
        )}

        {/* 对比结果 */}
        <AnimatePresence>
          {comparison && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-center">
                <p className="text-lg font-bold text-on-surface">
                  你与 <span className="text-primary">{comparison.celebrity.name_cn || comparison.celebrity.name}</span> 的对比
                </p>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {comparison.similarity.overall_score}分
                </p>
              </div>

              <BaziComparisonPanel
                comparisons={[comparison]}
                userPillars={userPillars}
              />

              {/* 洞察 */}
              {comparison.similarity.insights?.length > 0 && (
                <div className="rounded-xl bg-surface-container-high/50 p-4 space-y-2">
                  <p className="text-sm font-bold text-on-surface">关键洞察</p>
                  {comparison.similarity.insights.map((insight, i) => (
                    <p key={i} className="text-xs text-on-surface/70 leading-relaxed">• {insight}</p>
                  ))}
                </div>
              )}

              {/* 12维状态雷达 + 相位空间图 */}
              <div className="rounded-xl bg-surface-container-high/50 p-4">
                <p className="text-sm font-bold text-on-surface mb-3">12维状态雷达</p>
                <TidePhaseChart height={320} />
              </div>

              {/* 分享按钮：V1 对比页降级，V2 分享请到 /kline 页使用 */}
              <a
                href="/kline"
                className="block w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors text-center"
              >
                前往 K线 生成分享卡片
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
