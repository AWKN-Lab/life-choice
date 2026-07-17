import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { trackEvent } from '@/lib/analytics';
import { consultApi } from '@/api/consult';
import { namingApi } from '@/api/naming';
import { Icon } from './Icon';
import type { UnifiedResult } from './resultTypes';

interface InitialQumingAlgorithmPanelProps {
  result: UnifiedResult;
  onUnlock?: () => void;
  recordId?: string;
}

export function InitialQumingAlgorithmPanel({ result, onUnlock, recordId }: InitialQumingAlgorithmPanelProps) {
  const { t } = useTranslation();
  const isQuMing = result.route_type === 'quming';

  const [favoriteNames, setFavoriteNames] = useState<string[]>([]);
  const [removedNames, setRemovedNames] = useState<string[]>([]);

  const handleUnlockClick = useCallback(() => {
    trackEvent('naming_unlock_click', { module_id: 'naming', record_id: recordId });
    if (onUnlock) {
      onUnlock();
    }
  }, [recordId, onUnlock]);

  const toggleFavorite = useCallback((name: string) => {
    const exists = favoriteNames.includes(name);
    const action = exists ? 'remove' : 'favorite' as const;
    setFavoriteNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
    trackEvent('naming_behavior', { action, name, record_id: recordId });
    if (recordId) {
      // 现有事件溯源（保留，Q7=c 两者并存）
      consultApi.saveNamingBehavior(recordId, action, name).catch(() => {});
      // P03 新三表同步（仅新增收藏时，Q5=b 只 favorite/eliminate）
      if (!exists) {
        namingApi.syncFavorite(recordId, name).catch(() => {});
      }
    }
  }, [recordId, favoriteNames]);

  const removeName = useCallback((name: string) => {
    setRemovedNames(prev => [...prev, name]);
    trackEvent('naming_behavior', { action: 'remove', name, record_id: recordId });
    if (recordId) {
      // 现有事件溯源（保留）
      consultApi.saveNamingBehavior(recordId, 'remove', name).catch(() => {});
      // P03 新三表同步（淘汰）
      namingApi.syncEliminate(recordId, name).catch(() => {});
    }
  }, [recordId]);

  const exportNames = useCallback(() => {
    const nameSuggestions = result.name_suggestions || [];
    const exportData = nameSuggestions
      .filter((s: any) => !removedNames.includes(s.names?.[0] || s.name))
      .map((s: any, i: number) => ({
        name: s.names?.[0] || s.name,
        score: s.score ?? '-',
        reason: s.reason || '',
        wuxingMatch: s.wuxingMatch || '',
        phoneticMeaning: s.phoneticMeaning || '',
        caveat: s.caveat || '',
        favorited: favoriteNames.includes(s.names?.[0] || s.name),
      }));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('resultPage.namingBehavior.exportTitle')}</title><style>body{font-family:"Noto Sans SC",system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}h1{text-align:center;color:#C9A96E}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f5f0e8;color:#8B7355}.fav{color:#e74c3c}.score-high{color:#27ae60}.score-mid{color:#f39c12}.score-low{color:#e74c3c}</style></head><body><h1>${t('resultPage.namingBehavior.exportTitle')}</h1><table><tr><th>#</th><th>${t('resultPage.quming.nameSuggestions', { defaultValue: '推荐名字' })}</th><th>评分</th><th>分析</th><th>收藏</th></tr>${exportData.map((item: any, i: number) => `<tr><td>${i + 1}</td><td>${item.name}</td><td class="${item.score >= 80 ? 'score-high' : item.score >= 60 ? 'score-mid' : 'score-low'}">${item.score}</td><td>${item.reason}${item.wuxingMatch ? '<br>五行：' + item.wuxingMatch : ''}${item.caveat ? '<br>注意：' + item.caveat : ''}</td><td class="fav">${item.favorited ? '❤️' : ''}</td></tr>`).join('')}</table></body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    trackEvent('naming_export', { record_id: recordId, count: exportData.length });
  }, [result, removedNames, favoriteNames, recordId, t]);

  if (!isQuMing) return null;

  const currentUser = useAuthStore.getState().user;
  const membership = currentUser?.membership || currentUser?.plan || 'free';
  const isAdmin = currentUser?.isAdmin === true;
  const isMember = membership === 'monthly' || membership === 'yearly' || isAdmin;
  const showFull = isMember;
  const FREE_NAME_COUNT = 3;

  const bazi = result.bazi || {};
  const wuxingAnalysis = result.wuxing_analysis || {};
  const xiYongShen = result.xi_yong_shen || {};
  const nameSuggestions = result.name_suggestions || [];

  const yearPillar = bazi.yearPillar || '';
  const monthPillar = bazi.monthPillar || '';
  const dayPillar = bazi.dayPillar || '';
  const hourPillar = bazi.hourPillar || '';
  const dayGan = bazi.dayGan || '';
  const naYin = bazi.naYin || '';

  const wuxing = wuxingAnalysis.current || {};
  const missing = wuxingAnalysis.missing || [];
  const excessive = wuxingAnalysis.excessive || [];

  const xi = xiYongShen.xi || [];
  const yong = xiYongShen.yong || [];
  const ji = xiYongShen.ji || [];

  const hasBazi = yearPillar && monthPillar && dayPillar && hourPillar;
  const hasSuggestions = nameSuggestions.length > 0;

  const visibleNames = (showFull ? nameSuggestions : nameSuggestions.slice(0, FREE_NAME_COUNT))
    .filter((s: any) => !removedNames.includes(s.names?.[0] || s.name));
  const hiddenCount = nameSuggestions.length - FREE_NAME_COUNT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="card p-5 mb-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-primary font-semibold flex items-center gap-2">
          <Icon name="group" size={18} />
          {t('resultPage.quming.baziAnalysis', { defaultValue: '八字五行分析' })}
        </h2>
        {naYin && (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
            {naYin}
          </span>
        )}
      </div>

      {hasBazi && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              [t('resultPage.bazi.year'), yearPillar],
              [t('resultPage.bazi.month'), monthPillar],
              [t('resultPage.bazi.day'), dayPillar],
              [t('resultPage.bazi.hour'), hourPillar],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3 text-center">
                <div className="text-xs text-on-surface/50 mb-1">{label}</div>
                <div className="text-lg font-serif-sc font-semibold text-primary">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
              <div className="mb-3 text-sm text-primary">{t('resultPage.quming.dayMaster', { defaultValue: '日主分析' })}</div>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{dayGan}</span>
                </div>
                <div className="flex-1">
                  <div className="text-on-surface font-medium mb-1">
                    {t('resultPage.quming.dayMasterIs', { defaultValue: '日主为' })}{dayGan}
                  </div>
                  <div className="text-sm text-on-surface/60">
                    {missing.length > 0
                      ? t('resultPage.quming.missingWuxing', { defaultValue: `八字缺${missing.join('、')}，取名宜补足` })
                      : t('resultPage.quming.balancedWuxing', { defaultValue: '五行相对平衡，取名宜顺势而为' })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
              <div className="mb-3 text-sm text-primary">{t('resultPage.quming.xiYongShen', { defaultValue: '喜用神' })}</div>
              <div className="space-y-2">
                {yong.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">{t('resultPage.quming.yong', { defaultValue: '用神' })}</span>
                    <span className="text-on-surface font-medium">{yong.join('、')}</span>
                  </div>
                )}
                {xi.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">{t('resultPage.quming.xi', { defaultValue: '喜神' })}</span>
                    <span className="text-on-surface">{xi.join('、')}</span>
                  </div>
                )}
                {ji.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">{t('resultPage.quming.ji', { defaultValue: '忌神' })}</span>
                    <span className="text-on-surface/60">{ji.join('、')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4 mb-4">
            <div className="mb-3 text-sm text-primary">{t('resultPage.quming.wuxingDistribution', { defaultValue: '五行分布' })}</div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'wood', label: t('resultPage.wuxing.wood', { defaultValue: '木' }), color: 'text-green-400', bg: 'bg-green-500/10' },
                { key: 'fire', label: t('resultPage.wuxing.fire', { defaultValue: '火' }), color: 'text-red-400', bg: 'bg-red-500/10' },
                { key: 'earth', label: t('resultPage.wuxing.earth', { defaultValue: '土' }), color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                { key: 'metal', label: t('resultPage.wuxing.metal', { defaultValue: '金' }), color: 'text-gray-300', bg: 'bg-gray-500/10' },
                { key: 'water', label: t('resultPage.wuxing.water', { defaultValue: '水' }), color: 'text-blue-400', bg: 'bg-blue-500/10' },
              ].map(({ key, label, color, bg }) => {
                const count = wuxing[key] || 0;
                const isMissing = missing.includes(label);
                const isExcessive = excessive.includes(label);
                return (
                  <div key={key} className={`rounded-lg ${bg} p-3 text-center ${isMissing ? 'ring-2 ring-red-400/50' : ''} ${isExcessive ? 'ring-2 ring-amber-400/50' : ''}`}>
                    <div className={`text-lg font-bold ${color}`}>{count}</div>
                    <div className="text-xs text-on-surface/60 mt-1">{label}</div>
                    {isMissing && <div className="text-[10px] text-red-400 mt-1">{t('resultPage.quming.missing', { defaultValue: '缺' })}</div>}
                    {isExcessive && <div className="text-[10px] text-amber-400 mt-1">{t('resultPage.quming.excessive', { defaultValue: '旺' })}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {hasSuggestions && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 text-sm text-primary flex items-center gap-2">
            <Icon name="stars" size={16} />
            {t('resultPage.quming.nameSuggestions', { defaultValue: '推荐名字' })}
            {!showFull && (
              <span className="ml-auto text-xs text-on-surface/40">
                {t('resultPage.namingGating.freeNames', { count: FREE_NAME_COUNT, defaultValue: `免费查看 ${FREE_NAME_COUNT} 个候选名` })}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {visibleNames.map((suggestion: any, idx: number) => {
              const name = suggestion.names?.[0] || suggestion.name;
              const isFav = favoriteNames.includes(name);
              return (
                <div key={name + idx} className="rounded-lg bg-on-surface/[0.04] p-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{idx + 1}</span>
                      <span className="text-lg font-bold text-on-surface">{name}</span>
                      {showFull && suggestion.score != null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${suggestion.score >= 80 ? 'bg-green-500/20 text-green-400' : suggestion.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {suggestion.score}分
                        </span>
                      )}
                      {!showFull && suggestion.score != null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${suggestion.score >= 80 ? 'bg-green-500/20 text-green-400' : suggestion.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {suggestion.score >= 80 ? '吉' : suggestion.score >= 60 ? '中' : '凶'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {showFull && <span className="text-xs text-on-surface/40 mr-2">{suggestion.characters?.join('')}</span>}
                      <button
                        onClick={() => toggleFavorite(name)}
                        className="p-1 rounded hover:bg-on-surface/10 transition-colors"
                        title={isFav ? t('resultPage.namingBehavior.favorited') : t('resultPage.namingBehavior.favorite')}
                      >
                        <Icon name={isFav ? 'favorite' : 'favorite_border'} size={16} className={isFav ? 'text-red-400' : 'text-on-surface/30'} />
                      </button>
                      <button
                        onClick={() => removeName(name)}
                        className="p-1 rounded hover:bg-on-surface/10 transition-colors"
                        title={t('resultPage.namingBehavior.remove')}
                      >
                        <Icon name="delete_outline" size={16} className="text-on-surface/30 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface/60">{suggestion.reason}</p>
                  {showFull && suggestion.wuxingMatch && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t('resultPage.namingGating.wuxingMatch', { defaultValue: '八字五行匹配' })}</span>
                      <span className="text-xs text-on-surface/50">{suggestion.wuxingMatch}</span>
                    </div>
                  )}
                  {showFull && suggestion.phoneticMeaning && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{t('resultPage.namingGating.phoneticMeaning', { defaultValue: '音形义' })}</span>
                      <span className="text-xs text-on-surface/50">{suggestion.phoneticMeaning}</span>
                    </div>
                  )}
                  {showFull && suggestion.caveat && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{t('resultPage.namingGating.caveat', { defaultValue: '避坑说明' })}</span>
                      <span className="text-xs text-on-surface/50">{suggestion.caveat}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {showFull && visibleNames.length > 0 && (
            <button
              onClick={exportNames}
              className="mt-4 w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <Icon name="download" size={16} />
              {t('resultPage.namingBehavior.exportNames')}
            </button>
          )}
          {!showFull && hiddenCount > 0 && (
            <div className="mt-4 relative">
              <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-[var(--bg-card,#1a1a2e)] pointer-events-none z-10" />
              <button
                onClick={handleUnlockClick}
                className="w-full py-3 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center gap-2 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <Icon name="lock" size={16} />
                {t('resultPage.namingGating.viewMore', { defaultValue: '查看更多名字' })}
              </button>
              <p className="text-center text-xs text-on-surface/30 mt-2">
                {t('resultPage.namingGating.unlockDesc', { defaultValue: '升级会员查看全部候选名字、详细评分和避坑说明' })}
              </p>
            </div>
          )}
          {showFull && nameSuggestions.length > FREE_NAME_COUNT && (
            <div className="mt-3 text-center">
              <span className="text-xs text-on-surface/40">
                {t('resultPage.quming.moreNames', { defaultValue: `还有 ${nameSuggestions.length - 5} 个推荐名字` })}
              </span>
            </div>
          )}
          {!showFull && (
            <div className="mt-4 rounded-xl border border-outline/5 bg-on-surface/[0.02] p-4 relative overflow-hidden">
              <div className="absolute inset-0 backdrop-blur-[3px] bg-on-surface/[0.03] z-10" />
              <div className="relative z-20 flex flex-col items-center gap-2">
                <Icon name="auto_awesome" size={24} className="text-primary/60" />
                <span className="text-sm font-medium text-primary">{t('resultPage.namingGating.unlockFull', { defaultValue: '解锁完整取名方案' })}</span>
                <span className="text-xs text-on-surface/40">{t('resultPage.namingGating.memberOnly', { defaultValue: '会员专享' })}</span>
                <button
                  onClick={handleUnlockClick}
                  className="mt-1 gold-shimmer px-6 py-2 text-xs"
                >
                  {t('resultPage.namingGating.unlockFull', { defaultValue: '解锁完整取名方案' })}
                </button>
              </div>
              <div className="space-y-2 relative z-0">
                <div className="h-4 rounded bg-on-surface/[0.04] w-3/4" />
                <div className="h-4 rounded bg-on-surface/[0.04] w-1/2" />
                <div className="h-4 rounded bg-on-surface/[0.04] w-2/3" />
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
