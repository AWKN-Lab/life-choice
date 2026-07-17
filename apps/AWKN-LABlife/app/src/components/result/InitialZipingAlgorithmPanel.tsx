import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import type { UnifiedResult } from './resultTypes';
import { normalizeCalcResult, estimateClientBaziProfile, getCurrentDaYun, WUXING_LABELS, WUXING_COLORS } from './resultUtils';
import BaZiTable from '@/components/BaZiTable';

export function InitialZipingAlgorithmPanel({ result, birthDate, compact = false }: { result: UnifiedResult; birthDate?: string; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [showDetailedPan, setShowDetailedPan] = useState(false);
  const calcResult = normalizeCalcResult(result.calc_result);
  if (result.route_type !== 'ziping' || !calcResult) return null;
  const isEnglish = i18n.language.startsWith('en');

  const profile = estimateClientBaziProfile(calcResult);
  const currentDaYun = getCurrentDaYun(calcResult, birthDate);
  const daYun = Array.isArray(calcResult.daYun) ? calcResult.daYun : [];
  const currentStart = currentDaYun ? daYun.findIndex((d: any) => d === currentDaYun) : -1;
  const daYunList = currentStart >= 0 ? daYun.slice(currentStart, currentStart + 6) : daYun.slice(0, 6);
  const liuNianDetail = Array.isArray(calcResult.liuNianDetail) ? calcResult.liuNianDetail : [];
  const liuNianList = liuNianDetail.length > 0 ? liuNianDetail.slice(0, 10) : (Array.isArray(calcResult.liuNian) ? calcResult.liuNian.slice(0, 10) : []);
  const liuYueList = Array.isArray(calcResult.liuYue) ? calcResult.liuYue : [];
  const shenShaByName = calcResult.shenSha && typeof calcResult.shenSha === 'object' ? Object.entries(calcResult.shenSha) : [];
  const relationSummary = calcResult.xingChongHeHai || {};
  const formatCount = (count: number) => Number.isInteger(count) ? String(count) : count.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const formatZanggan = (items: any[]) => Array.isArray(items) && items.length > 0
    ? items.map((item) => `${item.gan || ''}${item.shishen ? `/${item.shishen}` : ''}`).join(' · ')
    : '-';
  const formatRelation = (items: any[]) => Array.isArray(items) && items.length > 0
    ? items.slice(0, 4).map((item) => `${(item.pillars || []).join('+')}${item.relation ? ` ${item.relation}` : ''}`).join('；')
    : '-';
  const pillars = [
    [t('resultPage.bazi.year'), calcResult.yearPillar],
    [t('resultPage.bazi.month'), calcResult.monthPillar],
    [t('resultPage.bazi.day'), calcResult.dayPillar],
    [t('resultPage.bazi.hour'), calcResult.hourPillar],
  ];
  const elementLabel = (value: string) => t(`resultPage.elementNames.${value}`, { defaultValue: value });
  const strengthLabel = (value: string) => t(`resultPage.bodyStrength.${value}`, { defaultValue: value });
  const strengthDisplay = isEnglish
    ? { primary: profile.bodyStrength, secondary: strengthLabel(profile.bodyStrength) }
    : { primary: strengthLabel(profile.bodyStrength), secondary: '' };

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="card p-5 md:p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-primary text-lg md:text-xl font-semibold flex items-center gap-2">
          <Icon name="grid_view" size={20} />
          {t('resultPage.algorithmChart')}
        </h2>
      </div>

      {!compact && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {pillars.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4 text-center">
            <div className="text-sm text-on-surface/50 mb-2">{label}</div>
            <div className="text-2xl md:text-3xl font-serif-sc text-on-surface leading-tight">{value || '-'}</div>
          </div>
        ))}
      </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-center">
          <div className="text-sm text-on-surface/55 mb-2">{t('resultPage.divination.labels.dayMaster')}</div>
          <div className="text-3xl font-semibold text-primary leading-tight">{profile.dayGan}</div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
          <div className="text-sm text-on-surface/55 mb-2">{t('resultPage.divination.labels.bodyStrength')}</div>
          <div className="text-2xl md:text-3xl font-semibold text-emerald-100 leading-tight">{strengthDisplay.primary}</div>
          {strengthDisplay.secondary && <div className="mt-1 text-sm md:text-base text-emerald-100/80">{strengthDisplay.secondary}</div>}
        </div>
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4 text-center">
          <div className="text-sm text-on-surface/55 mb-2">{t('resultPage.divination.labels.currentDaYun')}</div>
          <div className="text-2xl md:text-3xl font-semibold text-on-surface leading-tight">{currentDaYun ? `${currentDaYun.gan || ''}${currentDaYun.zhi || ''}` : '-'}</div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base md:text-lg text-on-surface/75">{t('resultPage.bazi.fiveElements')}</span>
          <span className="text-xs md:text-sm text-on-surface/45">{t('resultPage.stemBranchMainQi')}</span>
        </div>
        <div className="flex h-9 overflow-hidden rounded-full bg-on-surface/5">
          {Object.entries(profile.counts).map(([key, count]) => {
            const width = Math.max(4, Math.round((count / profile.total) * 100));
            return (
              <div key={key} className={`flex items-center justify-center text-sm md:text-base font-semibold ${WUXING_COLORS[key]}`} style={{ width: `${width}%` }}>
                {elementLabel(WUXING_LABELS[key])}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-sm md:text-base text-on-surface/60">
          {Object.entries(profile.counts).map(([key, count]) => (
            <span key={key}>{elementLabel(WUXING_LABELS[key])} {formatCount(count)}</span>
          ))}
        </div>
      </div>

      {compact && (
        <button
          onClick={() => setShowDetailedPan(!showDetailedPan)}
          className="w-full mb-4 rounded-xl border border-primary/20 bg-primary/10 p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/15 transition-colors"
        >
          <Icon name={showDetailedPan ? 'expand_less' : 'expand_more'} size={18} />
          <span>{showDetailedPan ? '收起详细排盘' : '查看详细排盘'}</span>
        </button>
      )}

      <AnimatePresence initial={false}>
        {(!compact || showDetailedPan) && (
          <motion.div
            initial={compact ? { height: 0, opacity: 0 } : false}
            animate={compact ? { height: 'auto', opacity: 1 } : {}}
            exit={compact ? { height: 0, opacity: 0 } : {}}
            transition={{ duration: 0.3 }}
            className={compact ? 'overflow-hidden' : ''}
          >
            <div className="mb-4">
              <BaZiTable calcResult={calcResult as any} locale={isEnglish ? 'en' : 'zh'} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
                <div className="text-xs text-on-surface/40 mb-1">起运</div>
                <div className="text-sm text-on-surface">{calcResult.qiYunAge ? `${calcResult.qiYunAge.years}年${calcResult.qiYunAge.months}月${calcResult.qiYunAge.days}日` : '-'}</div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
                <div className="text-xs text-on-surface/40 mb-1">胎元</div>
                <div className="text-sm text-on-surface">{calcResult.taiYuan || '-'}</div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
                <div className="text-xs text-on-surface/40 mb-1">命宫 / 身宫</div>
                <div className="text-sm text-on-surface">{calcResult.mingGong || '-'} / {calcResult.shenGong || '-'}</div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
                <div className="text-xs text-on-surface/40 mb-1">空亡</div>
                <div className="text-sm text-on-surface">{Array.isArray(calcResult.kongWang) && calcResult.kongWang.length > 0 ? calcResult.kongWang.join('、') : '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-4">
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-3 text-sm text-primary">藏干 / 副星复核</div>
                <div className="grid grid-cols-1 gap-2 text-sm text-on-surface/70">
                  {(['year', 'month', 'day', 'hour'] as const).map((key) => (
                    <div key={key} className="flex items-start justify-between gap-3 rounded-lg bg-black/20 px-3 py-2">
                      <span className="text-on-surface/40">{t(`resultPage.bazi.${key === 'year' ? 'year' : key === 'month' ? 'month' : key === 'day' ? 'day' : 'hour'}`)}</span>
                      <span className="text-right">{formatZanggan(calcResult.zangganShishen?.[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-3 text-sm text-primary">刑冲合害</div>
                <div className="space-y-2 text-sm text-on-surface/70">
                  <div><span className="text-on-surface/40">合：</span>{formatRelation(relationSummary.he)}</div>
                  <div><span className="text-on-surface/40">冲：</span>{formatRelation(relationSummary.chong)}</div>
                  <div><span className="text-on-surface/40">害：</span>{formatRelation(relationSummary.hai)}</div>
                  <div><span className="text-on-surface/40">刑：</span>{formatRelation(relationSummary.xing)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-2 text-sm text-primary">{t('resultPage.destinyReview')}</div>
                <p className="text-sm leading-relaxed text-on-surface/65">
                  {t('resultPage.destinyReviewText', {
                    yearPillar: calcResult.yearPillar,
                    monthPillar: calcResult.monthPillar,
                    dayPillar: calcResult.dayPillar,
                    hourPillar: calcResult.hourPillar,
                    dayMaster: profile.dayGan,
                    bodyStrength: strengthLabel(profile.bodyStrength),
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-2 text-sm text-primary">{t('resultPage.useAvoidGods')}</div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {profile.yong.map((item: string) => <span key={`y-${item}`} className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">{t('resultPage.useGodPrefix')} {elementLabel(item)}</span>)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.ji.map((item: string) => <span key={`j-${item}`} className="rounded-full bg-rose-400/15 px-2 py-1 text-xs text-rose-200">{t('resultPage.avoidGodPrefix')} {elementLabel(item)}</span>)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(daYunList.length > 0 || liuNianList.length > 0 || liuYueList.length > 0 || shenShaByName.length > 0) && (
        compact ? (
          <div className="mt-4 rounded-xl border border-outline/10 bg-on-surface/[0.04] overflow-hidden">
            <button
              onClick={() => setDetailExpanded(!detailExpanded)}
              className="w-full p-4 flex items-center justify-between text-sm text-on-surface/70 hover:text-primary transition-colors"
            >
              <span>大运 · 流年 · 流月 · 神煞</span>
              <Icon name={detailExpanded ? 'expand_less' : 'expand_more'} size={20} />
            </button>
            <AnimatePresence initial={false}>
              {detailExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    {daYunList.length > 0 && (
                      <div>
                        <div className="mb-3 text-sm text-primary">{t('resultPage.bazi.daYun')}明细</div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                          {daYunList.map((d: any, idx: number) => (
                            <div key={`${d.gan}${d.zhi}-${idx}`} className="rounded-lg bg-black/20 p-2 text-center">
                              <div className="text-xs text-on-surface/35">{t('resultPage.kline.ageRange', { startAge: d.startAge ?? d.age ?? '-', endAge: d.endAge ?? d.year ?? '-' })}</div>
                              <div className="text-sm font-semibold text-on-surface">{d.full || `${d.gan || ''}${d.zhi || ''}`}</div>
                              <div className="mt-1 text-[11px] text-on-surface/45">{d.gan || ''}{d.zhi || ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {liuNianList.length > 0 && (
                      <div>
                        <div className="mb-3 text-sm text-primary">流年小运</div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                          {liuNianList.map((item: any) => (
                            <div key={item.year} className="rounded-lg bg-black/20 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-on-surface/35">{item.year}</span>
                                <span className="text-xs text-primary">{item.score ? `${item.score}` : ''}</span>
                              </div>
                              <div className="mt-1 text-base font-semibold text-on-surface">{item.ganZhi}</div>
                              <div className="text-xs text-on-surface/50">{item.shishen || '-'}</div>
                              {item.theme && <div className="mt-1 text-[11px] leading-relaxed text-on-surface/35">{item.theme}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {liuYueList.length > 0 && (
                      <div>
                        <div className="mb-3 text-sm text-primary">本年流月</div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                          {liuYueList.map((item: any) => (
                            <div key={`${item.month}-${item.ganZhi}`} className="rounded-lg bg-black/20 p-2">
                              <div className="text-xs text-on-surface/35">{item.season || `${item.month}月`}</div>
                              <div className="mt-1 text-base font-semibold text-on-surface">{item.ganZhi}</div>
                              <div className="text-xs text-on-surface/50">{item.shishen || '-'}</div>
                              <div className="mt-1 text-[11px] leading-relaxed text-on-surface/35">{item.theme || '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {shenShaByName.length > 0 && (
                      <div>
                        <div className="mb-3 text-sm text-primary">神煞总览</div>
                        <div className="flex flex-wrap gap-2">
                          {shenShaByName.slice(0, 28).map(([name, positions]) => (
                            <span key={name} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                              {name}{Array.isArray(positions) && positions.length > 0 ? ` · ${positions.join('')}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            {daYunList.length > 0 && (
              <div className="mt-4 rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-3 text-sm text-primary">{t('resultPage.bazi.daYun')}明细</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  {daYunList.map((d: any, idx: number) => (
                    <div key={`${d.gan}${d.zhi}-${idx}`} className="rounded-lg bg-black/20 p-2 text-center">
                      <div className="text-xs text-on-surface/35">{t('resultPage.kline.ageRange', { startAge: d.startAge ?? d.age ?? '-', endAge: d.endAge ?? d.year ?? '-' })}</div>
                      <div className="text-sm font-semibold text-on-surface">{d.full || `${d.gan || ''}${d.zhi || ''}`}</div>
                      <div className="mt-1 text-[11px] text-on-surface/45">{d.gan || ''}{d.zhi || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {liuNianList.length > 0 && (
              <div className="mt-4 rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-3 text-sm text-primary">流年小运</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {liuNianList.map((item: any) => (
                    <div key={item.year} className="rounded-lg bg-black/20 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-on-surface/35">{item.year}</span>
                        <span className="text-xs text-primary">{item.score ? `${item.score}` : ''}</span>
                      </div>
                      <div className="mt-1 text-base font-semibold text-on-surface">{item.ganZhi}</div>
                      <div className="text-xs text-on-surface/50">{item.shishen || '-'}</div>
                      {item.theme && <div className="mt-1 text-[11px] leading-relaxed text-on-surface/35">{item.theme}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {liuYueList.length > 0 && (
              <div className="mt-4 rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-3 text-sm text-primary">本年流月</div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  {liuYueList.map((item: any) => (
                    <div key={`${item.month}-${item.ganZhi}`} className="rounded-lg bg-black/20 p-2">
                      <div className="text-xs text-on-surface/35">{item.season || `${item.month}月`}</div>
                      <div className="mt-1 text-base font-semibold text-on-surface">{item.ganZhi}</div>
                      <div className="text-xs text-on-surface/50">{item.shishen || '-'}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-on-surface/35">{item.theme || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shenShaByName.length > 0 && (
              <div className="mt-4 rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
                <div className="mb-3 text-sm text-primary">神煞总览</div>
                <div className="flex flex-wrap gap-2">
                  {shenShaByName.slice(0, 28).map(([name, positions]) => (
                    <span key={name} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      {name}{Array.isArray(positions) && positions.length > 0 ? ` · ${positions.join('')}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}
    </motion.div>
  );
}
