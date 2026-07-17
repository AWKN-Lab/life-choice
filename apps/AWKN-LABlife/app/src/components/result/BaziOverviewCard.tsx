import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import BaZiTable from '@/components/BaZiTable';

interface BaziOverviewCardProps {
  calcResult: {
    yearPillar?: string;
    monthPillar?: string;
    dayPillar?: string;
    hourPillar?: string;
    yearShishen?: string;
    monthShishen?: string;
    dayShishen?: string;
    hourShishen?: string;
    wuxing?: {
      ming?: string;
      year?: string;
      month?: string;
      day?: string;
      hour?: string;
      scores?: Record<string, number>;
    };
    daYun?: Array<{ startAge: number; endAge: number; gan?: string; zhi?: string; full?: string }>;
    shenSha?: Record<string, string>;
    naYin?: { year?: string; month?: string; day?: string; time?: string };
    changSheng?: Record<string, string>;
    taiXi?: string;
    mingGong?: string;
    shenGong?: string;
    qiYunAge?: { years: number; months: number; days: number };
    kongWang?: string[];
  };
  birthDate?: string;
}

const WUXING_LABELS: Record<string, string> = {
  木: '木',
  火: '火',
  土: '土',
  金: '金',
  水: '水',
};

const WUXING_COLORS: Record<string, string> = {
  木: 'bg-emerald-500',
  火: 'bg-red-500',
  土: 'bg-amber-600',
  金: 'bg-gray-400',
  水: 'bg-blue-500',
};

function getWuxingCounts(wuxing?: { year?: string; month?: string; day?: string; hour?: string }) {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const wuxingMap: Record<string, string> = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  };
  
  const elements = [wuxing?.year, wuxing?.month, wuxing?.day, wuxing?.hour].filter(Boolean) as string[];
  elements.forEach((el) => {
    const w = wuxingMap[el[0]];
    if (w && counts[w] !== undefined) counts[w]++;
  });
  
  return counts;
}

function getCurrentDaYun(daYun?: Array<{ startAge: number; endAge: number; gan?: string; zhi?: string; full?: string }>, birthDate?: string) {
  if (!daYun || !daYun.length) return null;
  
  const birth = birthDate ? new Date(birthDate) : new Date();
  const birthYear = birth.getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  for (const d of daYun) {
    if (age >= d.startAge && age <= d.endAge) {
      return d;
    }
  }
  
  return daYun[0];
}

function getDayGan(wuxing?: { ming?: string }) {
  return wuxing?.ming || '-';
}

function getBodyStrength(calcResult: BaziOverviewCardProps['calcResult']) {
  const wuxing = calcResult.wuxing;
  if (!wuxing?.scores) {
    const counts = getWuxingCounts(wuxing);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return { dayGan: '-', bodyStrength: '-', counts: counts, total };
    
    const ratios = { 木: counts['木'] / total, 火: counts['火'] / total, 土: counts['土'] / total, 金: counts['金'] / total, 水: counts['水'] / total };
    const selfCount = counts['木'] + counts['火'] + counts['土'] + counts['金'] + counts['水'] - (counts['木'] + counts['金'] + counts['水']);
    
    if (selfCount > 3) return { dayGan: wuxing?.ming || '-', bodyStrength: '强', counts, total };
    if (selfCount < 2) return { dayGan: wuxing?.ming || '-', bodyStrength: '弱', counts, total };
    return { dayGan: wuxing?.ming || '-', bodyStrength: '中', counts, total };
  }
  
  return { dayGan: wuxing?.ming || '-', bodyStrength: '中', counts: {}, total: 0 };
}

export function BaziOverviewCard({ calcResult, birthDate }: BaziOverviewCardProps) {
  const [showDetailedPan, setShowDetailedPan] = useState(false);
  const [detailExpanded, setDetailExpanded] = useState(false);

  const pillars = [
    { label: '年柱', value: calcResult.yearPillar, shishen: calcResult.yearShishen },
    { label: '月柱', value: calcResult.monthPillar, shishen: calcResult.monthShishen },
    { label: '日柱', value: calcResult.dayPillar, shishen: calcResult.dayShishen },
    { label: '时柱', value: calcResult.hourPillar, shishen: calcResult.hourShishen },
  ];

  const { dayGan, bodyStrength, counts, total } = getBodyStrength(calcResult);
  const currentDaYun = getCurrentDaYun(calcResult.daYun, birthDate);
  const daYun = calcResult.daYun || [];

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-surface-container-low/80 p-4">
      <h3 className="text-primary font-semibold flex items-center gap-2">
        <Icon name="visibility" size={18} />
        命盘总览
      </h3>

      {/* 四柱 */}
      <div className="grid grid-cols-4 gap-2">
        {pillars.map((pillar) => (
          <div
            key={pillar.label}
            className="rounded-xl border border-border/40 bg-surface-container p-3 text-center"
          >
            <div className="mb-1 text-[10px] text-on-surface-variant/70">{pillar.label}</div>
            <div className="text-lg font-semibold leading-tight text-on-surface">{pillar.value || '-'}</div>
            {pillar.shishen && <div className="text-[10px] text-primary/70 mt-0.5">{pillar.shishen}</div>}
          </div>
        ))}
      </div>

      {/* 日主/身强/大运 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-center">
          <div className="mb-1 text-[10px] text-on-surface-variant/70">日主</div>
          <div className="text-xl font-semibold text-primary leading-tight">{dayGan}</div>
        </div>
        <div className={`rounded-xl border p-3 text-center ${
          bodyStrength === '强' ? 'border-emerald-400/20 bg-emerald-400/10' :
          bodyStrength === '弱' ? 'border-rose-400/20 bg-rose-400/10' :
          'border-border/40 bg-surface-container'
        }`}>
          <div className="mb-1 text-[10px] text-on-surface-variant/70">身强</div>
          <div className={`text-lg font-semibold leading-tight ${
            bodyStrength === '强' ? 'text-emerald-100' :
            bodyStrength === '弱' ? 'text-rose-100' :
            'text-on-surface'
          }`}>{bodyStrength}</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-surface-container p-3 text-center">
          <div className="mb-1 text-[10px] text-on-surface-variant/70">当前大运</div>
          <div className="text-lg font-semibold leading-tight text-on-surface">
            {currentDaYun ? currentDaYun.full || `${currentDaYun.gan || ''}${currentDaYun.zhi || ''}` : '-'}
          </div>
        </div>
      </div>

      {/* 五行分布 */}
      {total > 0 && (
        <div className="rounded-xl border border-border/40 bg-surface-container p-3">
          <div className="mb-2 text-[10px] text-on-surface-variant/65">五行分布</div>
          <div className="flex h-6 overflow-hidden rounded-full bg-surface-base/80">
            {Object.entries(counts).map(([key, count]) => {
              const width = Math.max(4, Math.round((count / total) * 100));
              return (
                <div
                  key={key}
                  className={`flex items-center justify-center text-xs font-semibold ${WUXING_COLORS[key]}`}
                  style={{ width: `${width}%` }}
                >
                  {WUXING_LABELS[key]}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 纳音 */}
      {calcResult.naYin?.year && (
        <div className="flex flex-wrap gap-2">
          {['年', '月', '日', '时'].map((pos) => {
            const naYin = calcResult.naYin?.[pos.toLowerCase() as keyof typeof calcResult.naYin];
            if (!naYin) return null;
            return (
              <div key={pos} className="rounded bg-surface-container px-2 py-1 text-xs text-on-surface-variant/80">
                {pos}：{naYin}
              </div>
            );
          })}
        </div>
      )}

      {/* 展开详细排盘按钮 */}
      <button
        onClick={() => setShowDetailedPan(!showDetailedPan)}
        className="w-full rounded-xl border border-primary/20 bg-primary/10 p-2.5 flex items-center justify-center gap-2 text-xs text-primary hover:bg-primary/15 transition-colors"
      >
        <Icon name={showDetailedPan ? 'expand_less' : 'expand_more'} size={16} />
        <span>{showDetailedPan ? '收起详细排盘' : '查看详细排盘'}</span>
      </button>

      <AnimatePresence initial={false}>
        {showDetailedPan && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mb-3">
              <BaZiTable calcResult={calcResult as any} locale="zh" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl border border-border/40 bg-surface-container p-2.5">
                <div className="mb-1 text-[10px] text-on-surface-variant/65">起运</div>
                <div className="text-xs text-on-surface">
                  {calcResult.qiYunAge ? `${calcResult.qiYunAge.years}年${calcResult.qiYunAge.months}月${calcResult.qiYunAge.days}日` : '-'}
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-surface-container p-2.5">
                <div className="mb-1 text-[10px] text-on-surface-variant/65">胎元</div>
                <div className="text-xs text-on-surface">{calcResult.taiXi || '-'}</div>
              </div>
              <div className="rounded-xl border border-border/40 bg-surface-container p-2.5">
                <div className="mb-1 text-[10px] text-on-surface-variant/65">命宫/身宫</div>
                <div className="text-xs text-on-surface">{calcResult.mingGong || '-'}/{calcResult.shenGong || '-'}</div>
              </div>
              <div className="rounded-xl border border-border/40 bg-surface-container p-2.5">
                <div className="mb-1 text-[10px] text-on-surface-variant/65">空亡</div>
                <div className="text-xs text-on-surface">
                  {Array.isArray(calcResult.kongWang) && calcResult.kongWang.length > 0
                    ? calcResult.kongWang.join('、')
                    : '-'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 大运/流年/神煞 */}
      {(daYun.length > 0 || (calcResult.shenSha && Object.keys(calcResult.shenSha).length > 0)) && (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-surface-container">
          <button
            onClick={() => setDetailExpanded(!detailExpanded)}
            className="flex w-full items-center justify-between p-3 text-xs text-on-surface-variant/80 transition-colors hover:text-primary"
          >
            <span>大运 · 神煞</span>
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
                  {daYun.length > 0 && (
                    <div>
                      <div className="text-[10px] text-primary mb-2">大运明细</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {daYun.slice(0, 9).map((d, idx) => {
                          const isCurrent = currentDaYun && (d.gan === currentDaYun.gan && d.zhi === currentDaYun.zhi);
                          return (
                            <div
                              key={idx}
                              className={`rounded-lg p-1.5 text-center ${
                                isCurrent ? 'border border-primary/30 bg-primary/20' : 'bg-surface-base/70'
                              }`}
                            >
                              <div className="text-[9px] text-on-surface-variant/55">
                                {d.startAge ?? d.startAge}-{d.endAge ?? d.endAge}
                              </div>
                              <div className={`text-xs font-semibold ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>
                                {d.full || `${d.gan || ''}${d.zhi || ''}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {calcResult.shenSha && Object.keys(calcResult.shenSha).length > 0 && (
                    <div>
                      <div className="text-[10px] text-primary mb-2">神煞</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(calcResult.shenSha).slice(0, 20).map(([name, position]) => (
                          <span
                            key={name}
                            className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                          >
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
