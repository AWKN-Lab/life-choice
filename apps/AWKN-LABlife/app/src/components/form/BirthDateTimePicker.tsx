import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FateHourWheel } from './FateHourWheel';
import { SHICHEN_OPTIONS } from '@/constants/shichen';

interface BirthDateTimePickerProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hour?: number;
  minute?: number;
  onHourChange?: (hour: number) => void;
  onMinuteChange?: (minute: number) => void;
  timeLabel?: string;
  /** 直接在页面内展开时辰圆盘，不使用按钮弹窗 */
  inlineTimeWheel?: boolean;
  /** 弹窗内是否显示时辰圆盘（默认 true）。设为 false 时弹窗只显示 24 小时数字按钮 */
  modalWheel?: boolean;
}

const THIS_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;
const MAX_YEAR = THIS_YEAR;

function findShichenByHour(hour: number) {
  return SHICHEN_OPTIONS.find((item) => {
    if (item.hour === 23) return hour >= 23 || hour < 1;
    return hour >= item.hour && hour < item.hour + 2;
  }) ?? SHICHEN_OPTIONS[0];
}

export function BirthDateTimePicker({
  value,
  onChange,
  label,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  timeLabel = '出生时辰',
  inlineTimeWheel = false,
  modalWheel = true,
}: BirthDateTimePickerProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const initial = useMemo(() => {
    const [y, m, d] = (value || `${THIS_YEAR - 25}-01-01`).split('-').map(Number);
    return { year: y || THIS_YEAR - 25, month: m || 1, day: d || 1 };
  }, [value]);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  const hasTimePicker = typeof hour === 'number' && typeof minute === 'number' && !!onHourChange && !!onMinuteChange;
  const selectedShichen = hasTimePicker ? findShichenByHour(hour) : null;
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setYear(initial.year);
    setMonth(initial.month);
    setDay(initial.day);
  }, [initial.day, initial.month, initial.year]);

  useEffect(() => {
    onChange(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }, [year, month, day, onChange]);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const firstDay = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month]);

  useEffect(() => {
    setDay((current) => Math.min(current, daysInMonth));
  }, [daysInMonth]);

  useEffect(() => {
    if (dateOpen && yearRef.current) {
      const target = yearRef.current.querySelector(`[data-year="${year}"]`);
      if (target) {
        (target as HTMLElement).scrollIntoView({ block: 'center', inline: 'center' });
      }
    }
  }, [dateOpen, year]);

  const handleYearScroll = useCallback(() => {
    const el = yearRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    const buttons = el.querySelectorAll<HTMLElement>('[data-year]');
    let nearest: HTMLElement | null = null;
    let minDist = Infinity;

    buttons.forEach((btn) => {
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
      const dist = Math.abs(btnCenter - center);
      if (dist < minDist) {
        minDist = dist;
        nearest = btn;
      }
    });

    const nearestBtn = nearest as HTMLElement | null;
    if (nearestBtn) {
      const nextYear = Number(nearestBtn.getAttribute('data-year'));
      if (nextYear && nextYear !== year) setYear(nextYear);
    }
  }, [year]);

  return (
    <div className="w-full space-y-3">
      <div className={`grid gap-3 ${hasTimePicker && !inlineTimeWheel ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="min-w-0">
          {label && (
            <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-2.5">
              <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 16 }}>calendar_month</span>
              {label}
            </label>
          )}

          <button
            type="button"
            onClick={() => setDateOpen(true)}
            className="w-full min-h-[88px] input-mystic text-left flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-mono text-base sm:text-lg leading-none">
                <span className="text-primary font-bold">{year}</span>
                <span className="text-on-surface/40 mx-1">/</span>
                <span className="text-primary font-bold">{String(month).padStart(2, '0')}</span>
                <span className="text-on-surface/40 mx-1">/</span>
                <span className="text-primary font-bold">{String(day).padStart(2, '0')}</span>
              </div>
              <div className="mt-2 text-xs text-on-surface/45">点击选择日期</div>
            </div>
            <span className="material-symbols-outlined shrink-0 text-amber-400/80" style={{ fontSize: 20 }}>edit_calendar</span>
          </button>
        </div>

        {hasTimePicker && selectedShichen && (
          <div className="min-w-0">
            <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-2.5">
              <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 16 }}>schedule</span>
              {timeLabel}
            </label>
            {inlineTimeWheel ? (
              <div className="w-full input-mystic p-3 flex flex-col items-center gap-2">
                <FateHourWheel
                  hour={hour ?? 0}
                  minute={minute ?? 0}
                  onHourChange={onHourChange!}
                  onMinuteChange={onMinuteChange!}
                  minimal
                />
                <button
                  type="button"
                  onClick={() => setTimeOpen(true)}
                  className="text-xs text-on-surface/60 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>apps</span>
                  精确选择
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTimeOpen(true)}
                className="w-full min-h-[88px] input-mystic text-left flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary">{selectedShichen.number}</span>
                    <span className="text-primary font-semibold text-base">{selectedShichen.name}时</span>
                  </div>
                  <div className="mt-1 text-xs text-on-surface/40">{selectedShichen.branch}</div>
                  <div className="mt-1 text-[11px] text-on-surface/45 font-mono truncate">
                    {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} · {selectedShichen.range}
                  </div>
                </div>
                <span className="material-symbols-outlined shrink-0 text-amber-400/80" style={{ fontSize: 20 }}>schedule</span>
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {dateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setDateOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[hsl(var(--surface-container))] border border-[hsl(var(--primary)/0.2)]"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-outline/10 bg-[hsl(var(--surface-container))]">
                <span className="text-sm text-on-surface/60">选择出生日期</span>
                <button onClick={() => setDateOpen(false)} className="p-1 rounded-full hover:bg-on-surface/5">
                  <span className="material-symbols-outlined text-on-surface/60" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              <div className="px-4 py-4 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-on-surface/50">年</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setYear((current) => Math.max(MIN_YEAR, current - 10))}
                        className="h-7 px-2 rounded-md bg-on-surface/5 hover:bg-on-surface/10 text-[10px] font-medium transition-colors"
                        aria-label="上10年"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => setYear((current) => Math.max(MIN_YEAR, current - 1))}
                        className="w-7 h-7 rounded-full bg-on-surface/5 hover:bg-on-surface/10 flex items-center justify-center transition-colors"
                        aria-label="上一年"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                      </button>
                      <span className="text-2xl font-bold font-mono w-16 text-center" style={{ color: 'hsl(var(--primary))' }}>{year}</span>
                      <button
                        type="button"
                        onClick={() => setYear((current) => Math.min(MAX_YEAR, current + 1))}
                        className="w-7 h-7 rounded-full bg-on-surface/5 hover:bg-on-surface/10 flex items-center justify-center transition-colors"
                        aria-label="下一年"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setYear((current) => Math.min(MAX_YEAR, current + 10))}
                        className="h-7 px-2 rounded-md bg-on-surface/5 hover:bg-on-surface/10 text-[10px] font-medium transition-colors"
                        aria-label="下10年"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, hsl(var(--surface-container)), transparent)' }} />
                    <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, hsl(var(--surface-container)), transparent)' }} />
                    <div
                      ref={yearRef}
                      onScroll={handleYearScroll}
                      className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }).map((_, index) => {
                        const itemYear = MIN_YEAR + index;
                        const active = itemYear === year;
                        return (
                          <button
                            key={itemYear}
                            type="button"
                            data-year={itemYear}
                            onClick={() => setYear(itemYear)}
                            className="flex-shrink-0 w-12 h-12 rounded-lg text-xs font-mono transition-all"
                            style={active ? {
                              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
                              color: 'hsl(var(--on-primary))',
                              boxShadow: '0 0 12px hsl(var(--primary) / 0.4)',
                              transform: 'scale(1.08)',
                            } : {
                              background: 'hsl(var(--surface-container-low))',
                              color: 'hsl(var(--on-surface) / 0.5)',
                            }}
                          >
                            {itemYear}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-on-surface/50">月</span>
                    <span className="text-2xl font-bold font-mono" style={{ color: 'hsl(var(--primary))' }}>{String(month).padStart(2, '0')}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 12 }).map((_, index) => {
                      const itemMonth = index + 1;
                      const active = itemMonth === month;
                      return (
                        <button
                          key={itemMonth}
                          onClick={() => setMonth(itemMonth)}
                          className="relative h-12 rounded-lg text-sm font-mono font-bold transition-all"
                          style={active ? {
                            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
                            color: 'hsl(var(--on-primary))',
                            boxShadow: '0 0 12px hsl(var(--primary) / 0.3)',
                          } : {
                            background: 'hsl(var(--surface-container-low))',
                            color: 'hsl(var(--on-surface) / 0.6)',
                          }}
                        >
                          {String(itemMonth).padStart(2, '0')}
                          {active && (
                            <span
                              className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full animate-pulse"
                              style={{ background: 'hsl(var(--primary))' }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-on-surface/50">日</span>
                    <span className="text-2xl font-bold font-mono" style={{ color: 'hsl(var(--primary))' }}>{String(day).padStart(2, '0')}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['日', '一', '二', '三', '四', '五', '六'].map((item) => (
                      <div key={item} className="text-center text-[10px] text-on-surface/30 py-1">{item}</div>
                    ))}
                    {Array.from({ length: firstDay }).map((_, index) => (
                      <div key={`pad-${index}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const itemDay = index + 1;
                      const active = itemDay === day;
                      return (
                        <button
                          key={itemDay}
                          onClick={() => setDay(itemDay)}
                          className="aspect-square rounded-md text-xs font-mono transition-all"
                          style={active ? {
                            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
                            color: 'hsl(var(--on-primary))',
                            boxShadow: '0 0 8px hsl(var(--primary) / 0.3)',
                            transform: 'scale(1.05)',
                          } : {
                            background: 'hsl(var(--surface-container-low) / 0.5)',
                            color: 'hsl(var(--on-surface) / 0.5)',
                          }}
                        >
                          {itemDay}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 p-4 border-t border-outline/10 bg-[hsl(var(--surface-container))]">
                <button
                  onClick={() => setDateOpen(false)}
                  className="w-full py-3 rounded-xl text-sm font-medium gold-shimmer"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)', color: 'hsl(var(--on-primary))' }}
                >
                  确认 · {year}-{String(month).padStart(2, '0')}-{String(day).padStart(2, '0')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasTimePicker && timeOpen && selectedShichen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setTimeOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[hsl(var(--surface-container))] border border-[hsl(var(--primary)/0.2)]"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-outline/10 bg-[hsl(var(--surface-container))]">
                <span className="text-sm text-on-surface/60">选择出生时辰</span>
                <button onClick={() => setTimeOpen(false)} className="p-1 rounded-full hover:bg-on-surface/5">
                  <span className="material-symbols-outlined text-on-surface/60" style={{ fontSize: 20 }}>close</span>
                </button>
              </div>

              <div className="px-4 py-4 space-y-5">
                {!inlineTimeWheel && modalWheel && (
                  <div className="flex justify-center">
                    <FateHourWheel
                      hour={hour ?? 0}
                      minute={minute ?? 0}
                      onHourChange={onHourChange}
                      onMinuteChange={onMinuteChange}
                      label="拖动外环或内环选择时辰"
                    />
                  </div>
                )}

                {modalWheel ? (
                  /* 方案C：24 小时数字网格 */
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-on-surface/50">小时</span>
                      <span className="text-lg font-bold font-mono" style={{ color: 'hsl(var(--primary))' }}>
                        {String(hour ?? 0).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {Array.from({ length: 24 }, (_, h) => {
                        const active = h === (hour ?? 0);
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => onHourChange?.(h)}
                            className="h-9 rounded-lg text-xs font-mono font-medium transition-all"
                            style={active ? {
                              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
                              color: 'hsl(var(--on-primary))',
                              boxShadow: '0 0 8px hsl(var(--primary) / 0.3)',
                            } : {
                              background: 'hsl(var(--surface-container-low))',
                              color: 'hsl(var(--on-surface) / 0.6)',
                            }}
                          >
                            {String(h).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* 方案B：0-11 时辰 + 0-59 分钟 */
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-on-surface/50">时辰</span>
                        <span className="text-lg font-bold font-mono" style={{ color: 'hsl(var(--primary))' }}>
                          {selectedShichen.name}时
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {SHICHEN_OPTIONS.map((item, idx) => {
                          const active = selectedShichen.name === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => onHourChange?.(item.hour % 24)}
                              className="h-12 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5"
                              style={active ? {
                                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
                                color: 'hsl(var(--on-primary))',
                                boxShadow: '0 0 8px hsl(var(--primary) / 0.3)',
                              } : {
                                background: 'hsl(var(--surface-container-low))',
                                color: 'hsl(var(--on-surface) / 0.6)',
                              }}
                            >
                              <span className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>{item.name}</span>
                              <span className="text-[10px] font-mono opacity-70">{idx}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-on-surface/50">分钟</span>
                        <span className="text-lg font-bold font-mono" style={{ color: 'hsl(var(--primary))' }}>
                          {String(minute ?? 0).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="grid grid-cols-8 gap-1.5 max-h-[200px] overflow-y-auto">
                        {Array.from({ length: 60 }, (_, m) => {
                          const active = m === (minute ?? 0);
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => onMinuteChange?.(m)}
                              className="h-8 rounded-md text-[11px] font-mono font-medium transition-all"
                              style={active ? {
                                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)',
                                color: 'hsl(var(--on-primary))',
                                boxShadow: '0 0 6px hsl(var(--primary) / 0.3)',
                              } : {
                                background: 'hsl(var(--surface-container-low))',
                                color: 'hsl(var(--on-surface) / 0.5)',
                              }}
                            >
                              {String(m).padStart(2, '0')}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sticky bottom-0 p-4 border-t border-outline/10 bg-[hsl(var(--surface-container))]">
                <button
                  onClick={() => setTimeOpen(false)}
                  className="w-full py-3 rounded-xl text-sm font-medium gold-shimmer"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-light)) 100%)', color: 'hsl(var(--on-primary))' }}
                >
                  确认 · {selectedShichen.name}时 {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BirthDateTimePicker;
