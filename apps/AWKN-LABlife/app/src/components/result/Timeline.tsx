import { motion } from 'framer-motion';
import { Icon } from './Icon';

export interface TimelineEvent {
  date: string;
  event: string;
  dayunRange?: string;
  liunianGanZhi?: string;
  source: 'user_stated' | 'system_inferred';
}

export interface TimelineProps {
  events: TimelineEvent[];
}

function SourceBadge({ source }: { source: TimelineEvent['source'] }) {
  if (source === 'user_stated') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
        <Icon name="person" size={10} filled />
        自述
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/30 px-2 py-0.5 text-[10px] font-medium text-on-surface-variant/70">
      <Icon name="auto_awesome" size={10} />
      推断
    </span>
  );
}

function TimelineItem({ item, index }: { item: TimelineEvent; index: number }) {
  const isUser = item.source === 'user_stated';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative flex gap-3 pb-5 last:pb-0"
    >
      <div className="flex flex-col items-center shrink-0 w-10">
        <div
          className={`w-3 h-3 rounded-full mt-1.5 ring-2 ${
            isUser
              ? 'bg-primary ring-primary/25'
              : 'bg-secondary-container ring-secondary-container/25'
          }`}
        />
        <div className="flex-1 w-px bg-outline/15 mt-1" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-medium text-on-surface/70 tabular-nums">{item.date}</span>
          <SourceBadge source={item.source} />
          {item.liunianGanZhi && (
            <span className="rounded bg-surface-container-high/60 px-1.5 py-0.5 text-[10px] text-on-surface-variant/60 font-mono">
              {item.liunianGanZhi}
            </span>
          )}
        </div>

        <p className="text-sm text-on-surface/75 leading-relaxed">{item.event}</p>

        {item.dayunRange && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary/[0.08] px-2 py-0.5">
            <Icon name="timeline" size={12} className="text-primary/60" />
            <span className="text-[10px] text-primary/70 font-medium">大运 {item.dayunRange}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (isNaN(da) || isNaN(db)) return b.date.localeCompare(a.date);
    return db - da;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card p-5 md:p-6 mb-4"
    >
      <h2 className="text-primary text-lg md:text-xl font-semibold flex items-center gap-2 mb-4">
        <Icon name="history" size={20} />
        人生时间线
      </h2>

      <div className="flex items-center gap-4 mb-4 text-[10px] text-on-surface-variant/50">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          自述事件
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-secondary-container" />
          系统推断
        </span>
      </div>

      <div>
        {sorted.map((item, i) => (
          <TimelineItem key={`${item.date}-${i}`} item={item} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
