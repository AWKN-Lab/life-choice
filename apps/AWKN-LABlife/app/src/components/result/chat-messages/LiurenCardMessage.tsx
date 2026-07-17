import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';

interface LiurenCardMessageProps {
  engineData?: Record<string, unknown>;
  question?: string;
  askTime?: string;
  city?: string;
}

export function LiurenCardMessage({ engineData, question, askTime, city }: LiurenCardMessageProps) {
  const [detailExpanded, setDetailExpanded] = useState(false);
  const data = engineData || {};
  const sizhu = (data.sizhu || {}) as any;
  const fourPillars = [
    ['年柱', sizhu.year?.full],
    ['月柱', sizhu.month?.full],
    ['日柱', sizhu.day?.full],
    ['时柱', sizhu.time?.full],
  ];
  const coreCards = [
    { label: '月将', value: (data.yueJiang as any)?.full || '-' },
    { label: '贵神', value: (data.guiShen as any)?.name || '-' },
    { label: '人元', value: (data.renYuan as any)?.full || '-' },
    { label: '地分', value: (data.difenName as string) || '-' },
  ];
  const lessons = [
    (data.siKe as any)?.firstKe,
    (data.siKe as any)?.secondKe,
    (data.siKe as any)?.thirdKe,
    (data.siKe as any)?.fourthKe,
  ].filter(Boolean);
  const transmissions = [
    (data.sanChuan as any)?.shang,
    (data.sanChuan as any)?.zhong,
    (data.sanChuan as any)?.xia,
  ].filter(Boolean);

  return (
    <div className="space-y-3 w-full">
      {/* 核心信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {coreCards.map((item) => (
          <div key={item.label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3 text-center">
            <div className="text-[10px] text-on-surface/50 mb-1">{item.label}</div>
            <div className="text-lg font-serif-sc font-semibold text-primary leading-tight">{item.value}</div>
          </div>
        ))}
      </div>

      {/* 三传 */}
      {transmissions.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
          <div className="text-[10px] text-primary mb-2">三传</div>
          <div className="flex items-center gap-2">
            {transmissions.map((item, idx) => (
              <div key={idx} className="flex flex-1 items-center gap-2">
                <div className="flex-1 rounded-lg bg-primary/10 p-2 text-center text-sm font-semibold text-primary">{item}</div>
                {idx < transmissions.length - 1 && <Icon name="arrow_forward" size={14} className="text-on-surface/30" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 展开详细课盘 */}
      <button
        onClick={() => setDetailExpanded(!detailExpanded)}
        className="w-full rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5 flex items-center justify-center gap-2 text-xs text-on-surface/60 hover:text-primary hover:bg-on-surface/[0.06] transition-colors"
      >
        <Icon name={detailExpanded ? 'expand_less' : 'expand_more'} size={16} />
        <span>{detailExpanded ? '收起课盘' : '查看详细课盘'}</span>
      </button>

      <AnimatePresence initial={false}>
        {detailExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* 四柱 */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {fourPillars.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-2.5 text-center">
                  <div className="text-[10px] text-on-surface/50 mb-1">{label}</div>
                  <div className="text-sm font-serif-sc text-on-surface">{value || '-'}</div>
                </div>
              ))}
            </div>

            {/* 四课 */}
            {lessons.length > 0 && (
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3 mb-3">
                <div className="text-[10px] text-on-surface/50 mb-2">四课</div>
                <div className="flex flex-wrap gap-2">
                  {lessons.map((item, idx) => (
                    <span key={idx} className="rounded-full bg-on-surface/5 px-3 py-1 text-xs text-on-surface/70">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 占问信息 */}
            {(askTime || city || question) && (
              <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
                <div className="text-[10px] text-on-surface/50 mb-2">占问信息</div>
                {question && <p className="text-xs text-on-surface/70 mb-1">问：{question}</p>}
                {askTime && <p className="text-xs text-on-surface/50">{askTime.replace('T', ' ').slice(0, 19)}</p>}
                {city && <p className="text-xs text-on-surface/50">{city}</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
