/** 时·位·心 圆形进度仪表盘 */
export function GroupGauge({ label, score, color, desc }: { label: string; score: number; color: string; desc: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="relative h-[64px] w-[64px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36" cy="36" r={radius}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"
          />
          <circle
            cx="36" cy="36" r={radius}
            fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      <span className="text-[10px] text-gray-500 leading-tight text-center">{desc}</span>
    </div>
  );
}
