import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Icon } from '@/components/result/Icon';
import { trackEvent } from '@/lib/analytics';
import type { UnifiedResult } from '@/components/result/resultTypes';

interface MultiRoundFilterProps {
  result: UnifiedResult;
  recordId?: string;
}

const WUXING_OPTIONS = ['metal', 'wood', 'water', 'fire', 'earth'] as const;
const CHAR_COUNT_OPTIONS = [2, 3] as const;

export function MultiRoundFilter({ result, recordId }: MultiRoundFilterProps) {
  const { t } = useTranslation();
  const nameSuggestions = result.name_suggestions || [];

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [filterWuxing, setFilterWuxing] = useState<string | null>(null);
  const [filterCharCount, setFilterCharCount] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleExcluded = useCallback((name: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    trackEvent('naming_dislike', { name, record_id: recordId });
  }, [recordId]);

  const handleMoreLikeThis = useCallback((name: string) => {
    trackEvent('naming_more_like_this', { name, record_id: recordId, round });
    setIsRegenerating(true);
    setTimeout(() => {
      setRound((r) => r + 1);
      setIsRegenerating(false);
    }, 1200);
  }, [recordId, round]);

  const handleRegenerate = useCallback(() => {
    trackEvent('naming_regenerate', { record_id: recordId, round, filterWuxing, filterCharCount });
    setIsRegenerating(true);
    setTimeout(() => {
      setRound((r) => r + 1);
      setIsRegenerating(false);
    }, 1500);
  }, [recordId, round, filterWuxing, filterCharCount]);

  const filteredNames = nameSuggestions.filter((s: any) => {
    const name = s.names?.[0] || s.name || '';
    if (excluded.has(name)) return false;
    if (filterCharCount !== null) {
      const charCount = (s.characters || name.split('')).length;
      if (charCount !== filterCharCount) return false;
    }
    return true;
  });

  const favoriteNames = nameSuggestions.filter((s: any) => {
    const name = s.names?.[0] || s.name || '';
    return favorites.has(name);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-on-surface/60">
          {t('resultPage.namingAnnual.multiRoundDesc')}
        </span>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
          {t('resultPage.namingAnnual.round', { round })}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-on-surface/40 self-center">{t('resultPage.namingAnnual.filterWuxing')}</span>
        {WUXING_OPTIONS.map((w) => (
          <button
            key={w}
            onClick={() => setFilterWuxing(filterWuxing === w ? null : w)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filterWuxing === w
                ? 'bg-primary text-on-surface'
                : 'bg-on-surface/[0.06] text-on-surface/50 hover:bg-on-surface/[0.12]'
            }`}
          >
            {t(`resultPage.divination.wuXing.${w}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-on-surface/40 self-center">{t('resultPage.namingAnnual.filterCharCount')}</span>
        {CHAR_COUNT_OPTIONS.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCharCount(filterCharCount === c ? null : c)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              filterCharCount === c
                ? 'bg-primary text-on-surface'
                : 'bg-on-surface/[0.06] text-on-surface/50 hover:bg-on-surface/[0.12]'
            }`}
          >
            {c}{t('resultPage.namingAnnual.charUnit', { defaultValue: '字' })}
          </button>
        ))}
      </div>

      {isRegenerating ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-3 text-sm text-on-surface/50">{t('resultPage.namingAnnual.regenerating', { defaultValue: '重新生成中...' })}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNames.map((suggestion: any, idx: number) => {
            const name = suggestion.names?.[0] || suggestion.name || '';
            return (
              <motion.div
                key={`${name}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-lg bg-on-surface/[0.04] p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-on-surface">{name}</span>
                  {suggestion.score != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      suggestion.score >= 80 ? 'bg-green-500/20 text-green-400' :
                      suggestion.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {suggestion.score}{t('resultPage.namingAnnual.scoreUnit', { defaultValue: '分' })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleFavorite(name)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      favorites.has(name) ? 'bg-rose-500/20 text-rose-400' : 'bg-on-surface/[0.06] text-on-surface/40 hover:text-on-surface/60'
                    }`}
                  >
                    <Icon name={favorites.has(name) ? 'favorite' : 'favorite_border'} size={16} />
                  </button>
                  <button
                    onClick={() => handleMoreLikeThis(name)}
                    className="px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {t('resultPage.namingAnnual.moreLikeThis')}
                  </button>
                  <button
                    onClick={() => toggleExcluded(name)}
                    className="p-1.5 rounded-lg bg-on-surface/[0.06] text-on-surface/30 hover:text-on-surface/50 transition-colors"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {filteredNames.length === 0 && (
            <div className="text-center py-6 text-on-surface/40 text-sm">
              {t('resultPage.namingAnnual.noResults', { defaultValue: '没有符合条件的名字，请调整筛选条件' })}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        <span className="flex items-center justify-center gap-2">
          <Icon name="refresh" size={16} />
          {t('resultPage.namingAnnual.regenerate')}
        </span>
      </button>

      {favoriteNames.length > 0 && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
          <div className="text-sm text-rose-300 font-medium mb-2 flex items-center gap-1.5">
            <Icon name="favorite" size={14} />
            {t('resultPage.namingAnnual.favorites')}
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteNames.map((s: any, idx: number) => {
              const name = s.names?.[0] || s.name || '';
              return (
                <span key={idx} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-200 text-sm font-medium">
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
