import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';
import { normalizeCalcResult, estimateClientBaziProfile, getCurrentDaYun, WUXING_LABELS, WUXING_COLORS } from '../resultUtils';
import BaZiTable from '@/components/BaZiTable';

export function BaziCardMessage({ calcResult, birthDate, compact = false }: { calcResult: any; birthDate?: string; compact?: boolean }) {
  const [showDetailedPan, setShowDetailedPan] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);
  const result = normalizeCalcResult(calcResult);
  if (!result) return null;

  const profile = estimateClientBaziProfile(result);
  const currentDaYun = getCurrentDaYun(result, birthDate);
  const daYun = Array.isArray(result.daYun) ? result.daYun : [];
  const currentStart = currentDaYun ? daYun.findIndex((d: any) => d === currentDaYun) : -1;
  const daYunList = currentStart >= 0 ? daYun.slice(currentStart, currentStart + 6) : daYun.slice(0, 6);
  const liuNianDetail = Array.isArray(result.liuNianDetail) ? result.liuNianDetail : [];
  const liuNianList = liuNianDetail.length > 0 ? liuNianDetail.slice(0, 10) : (Array.isArray(result.liuNian) ? result.liuNian.slice(0, 10) : []);
  const liuYueList = Array.isArray(result.liuYue) ? result.liuYue : [];
  const shenShaByName = result.shenSha && typeof result.shenSha === 'object' ? Object.entries(result.shenSha) : [];
  const relationSummary = result.xingChongHeHai || {};

  const pillars = [
    ['年柱', result.yearPillar],
    ['月柱', result.monthPillar],
    ['日柱', result.dayPillar],
    ['时柱', result.hourPillar],
  ];

  const formatCount = (count: number) => Number.isInteger(count) ? String(count) : count.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const formatZanggan = (items: any[]) => Array.isArray(items) && items.length > 0
    ? items.map((item) => `${item.gan || ''}${item.shishen ? `/${item.shishen}` : ''}`).join(' · ')
    : '-';
  const formatRelation = (items: any[]) => Array.isArray(items) && items.length > 0
    ? items.slice(0, 4).map((item) => `${(item.pillars || []).join('+')}${item.relation ? ` ${item.relation}` : ''}`).join('；')
    : '-';

  return (
    <div className="space-y-3 w-full">
      {/* 四柱 */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2">
          {pillars.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3 text-center">
              <div className="text-[10px] text-on-surface/50 mb-1">{label}</div>
              <div className="text-lg font-serif-sc text-on-surface leading-tight">{value || '-'}</div>
            </div>
          ))}
        </div>
      )}

      {/* 日主/身强/大运 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-center">
          <div className="text-[10px] text-on-surface/55 mb-1">日主</div>
          <div className="text-xl font-semibold text-primary leading-tight">{profile.dayGan}</div>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-center">
          <div className="text-[10px] text-on-surface/55 mb-1">身强</div>
          <div className="text-lg font-semibold text-emerald-100 leading-tight">{profile.bodyStrength}</div>
        </div>
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3 text-center">
          <div className="text-[10px] text-on-surface/55 mb-1">当前大运</div>
          <div className="text-lg font-semibold text-on-surface leading-tight">{currentDaYun ? `${currentDaYun.gan || ''}${currentDaYun.zhi || ''}` : '-'}</div>
        </div>
      </div>

      {/* 五行 */}
      <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
        <div className="text-[10px] text-on-surface/45 mb-2">五行分布</div>
        <div className="flex h-6 overflow-hidden rounded-full bg-on-surface/5">
          {Object.entries(profile.counts).map(([key, count]) => {
            const width = Math.max(4, Math.round((count / profile.total) * 100));
            return (
              <div key={key} className={`flex items-center justify-center text-xs font-semibold ${WUXING_COLORS[key]}`} style={{ width: `${width}%` }}>
                {WUXING_LABELS[key]}
              </div>
            );
          })}
        </div>
      </div>

      {/* 展开详细排盘 */}
      {compact && (
        <button
          onClick={() => setShowDetailedPan(!showDetailedPan)}
          className="w-full rounded-xl border border-primary/20 bg-primary/10 p-2.5 flex items-center justify-center gap-2 text-xs text-primary hover:bg-primary/15 transition-colors"
        >
          <Icon name={showDetailedPan ? 'expand_less' : 'expand_more'} size={16} />
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
            <div className="mb-3">
              <BaZiTable calcResult={result as any} locale="zh" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5">
                <div className="text-[10px] text-on-surface/40 mb-1">起运</div>
                <div className="text-xs text-on-surface">{result.qiYunAge ? `${result.qiYunAge.years}年${result.qiYunAge.months}月${result.qiYunAge.days}日` : '-'}</div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5">
                <div className="text-[10px] text-on-surface/40 mb-1">胎元</div>
                <div className="text-xs text-on-surface">{result.taiYuan || '-'}</div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5">
                <div className="text-[10px] text-on-surface/40 mb-1">命宫/身宫</div>
                <div className="text-xs text-on-surface">{result.mingGong || '-'}/{result.shenGong || '-'}</div>
              </div>
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5">
                <div className="text-[10px] text-on-surface/40 mb-1">空亡</div>
                <div className="text-xs text-on-surface">{Array.isArray(result.kongWang) && result.kongWang.length > 0 ? result.kongWang.join('、') : '-'}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 大运/流年/流月/神煞 */}
      {(daYunList.length > 0 || liuNianList.length > 0 || liuYueList.length > 0 || shenShaByName.length > 0) && (
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] overflow-hidden">
          <button
            onClick={() => setDetailExpanded(!detailExpanded)}
            className="w-full p-3 flex items-center justify-between text-xs text-on-surface/70 hover:text-primary transition-colors"
          >
            <span>大运 · 流年 · 流月 · 神煞</span>
            <Icon name={detailExpanded ? 'expand_less' : 'expand_more'} size={16} />
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
                <div className="px-3 pb-3 space-y-3">
                  {daYunList.length > 0 && (
                    <div>
                      <div className="text-[10px] text-primary mb-2">大运明细</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {daYunList.map((d: any, idx: number) => (
                          <div key={idx} className="rounded-lg bg-black/20 p-1.5 text-center">
                            <div className="text-[9px] text-on-surface/35">{d.startAge ?? d.age ?? '-'}-{d.endAge ?? d.year ?? '-'}</div>
                            <div className="text-xs font-semibold text-on-surface">{d.full || `${d.gan || ''}${d.zhi || ''}`}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {liuNianList.length > 0 && (
                    <div>
                      <div className="text-[10px] text-primary mb-2">流年</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {liuNianList.map((item: any) => (
                          <div key={item.year} className="rounded-lg bg-black/20 p-1.5">
                            <div className="flex justify-between">
                              <span className="text-[9px] text-on-surface/35">{item.year}</span>
                            </div>
                            <div className="text-xs font-semibold text-on-surface">{item.ganZhi}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {shenShaByName.length > 0 && (
                    <div>
                      <div className="text-[10px] text-primary mb-2">神煞</div>
                      <div className="flex flex-wrap gap-1">
                        {shenShaByName.slice(0, 20).map(([name, positions]) => (
                          <span key={name} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            {name}
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
      )}
    </div>
  );
}
