import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

interface DaYunLiuNianTableProps {
  calcResult: {
    daYun?: Array<{ startAge: number; endAge: number; gan?: string; zhi?: string; full?: string }>;
    liuNian?: Array<{ year: string; ganZhi?: string }>;
  };
  birthDate?: string;
}

function getCurrentDaYunIndex(daYun?: Array<{ startAge: number; endAge: number; gan?: string; zhi?: string; full?: string }>, birthDate?: string) {
  if (!daYun || !daYun.length) return -1;
  
  const birth = birthDate ? new Date(birthDate) : new Date();
  const birthYear = birth.getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  for (let i = 0; i < daYun.length; i++) {
    const d = daYun[i];
    if (age >= d.startAge && age <= d.endAge) {
      return i;
    }
  }
  
  return 0;
}

export function DaYunLiuNianTable({ calcResult, birthDate }: DaYunLiuNianTableProps) {
  const [expanded, setExpanded] = useState(false);
  const daYun = calcResult.daYun || [];
  const liuNian = calcResult.liuNian || [];
  const currentIndex = getCurrentDaYunIndex(daYun, birthDate);

  if (daYun.length === 0) return null;

  return (
    <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4">
      <h3 className="text-primary font-semibold flex items-center gap-2 mb-3">
        <Icon name="schedule" size={18} />
        大运流年
      </h3>

      {/* 大运表格 */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-4 gap-2 px-1 text-[10px] text-on-surface/40">
          <div>年龄</div>
          <div>天干</div>
          <div>地支</div>
          <div>状态</div>
        </div>
        {daYun.map((d, idx) => {
          const isCurrent = idx === currentIndex;
          return (
            <div
              key={idx}
              className={`grid grid-cols-4 gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                isCurrent
                  ? 'bg-primary/20 border border-primary/30'
                  : 'hover:bg-on-surface/5'
              }`}
            >
              <div className={`${isCurrent ? 'text-primary font-semibold' : 'text-on-surface/70'}`}>
                {d.startAge}-{d.endAge}
              </div>
              <div className={isCurrent ? 'text-primary' : 'text-on-surface'}>
                {d.gan || '-'}
              </div>
              <div className={isCurrent ? 'text-primary' : 'text-on-surface'}>
                {d.zhi || '-'}
              </div>
              <div>
                {isCurrent ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">当前</span>
                ) : (
                  <span className="text-[10px] text-on-surface/30">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 流年 */}
      {liuNian.length > 0 && (
        <div className="mt-4 border-t border-outline/5 pt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs text-on-surface/50 hover:text-on-surface/70 transition-colors"
          >
            <Icon name="date_range" size={14} />
            <span>流年明细 ({liuNian.length}年)</span>
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={14} />
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {liuNian.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded bg-on-surface/5 p-1.5 text-center"
                    >
                      <div className="text-[9px] text-on-surface/35">{item.year}</div>
                      <div className="text-xs text-on-surface/80 font-semibold">{item.ganZhi || '-'}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}