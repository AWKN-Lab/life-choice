import React from 'react';
import { useTranslation } from 'react-i18next';

interface FortuneAspect {
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  advice: string;
}

interface DailyFortuneData {
  date: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  lucky_numbers: number[];
  lucky_colors: string[];
  advice: string[];
  auspicious_hours: string[];
  warnings: string[];
}

interface DailyFortuneProps {
  fortune: DailyFortuneData;
}

const ScoreRing: React.FC<{ score: number; size?: number; label?: string }> = ({ score, size = 80, label }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold" style={{ color }}>{score}</span>
      </div>
      {label && <span className="text-xs text-slate-500 mt-1">{label}</span>}
    </div>
  );
};

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'up') return <span className="text-emerald-500 text-sm">↑</span>;
  if (trend === 'down') return <span className="text-rose-500 text-sm">↓</span>;
  return <span className="text-slate-400 text-sm">→</span>;
};

const DailyFortune: React.FC<DailyFortuneProps> = ({ fortune }) => {
  const { t } = useTranslation();
  if (!fortune) return null;

  const aspects = [
    { key: 'career', label: t('resultPage.divination.aspects.career'), data: fortune.career, icon: '💼' },
    { key: 'wealth', label: t('resultPage.divination.aspects.wealth'), data: fortune.wealth, icon: '💰' },
    { key: 'relationship', label: t('resultPage.divination.aspects.relationship'), data: fortune.relationship, icon: '❤️' },
    { key: 'health', label: t('resultPage.divination.aspects.health'), data: fortune.health, icon: '🏥' },
  ];

  return (
    <div className="bg-surface-container rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">{t('fortune.daily.title')}</h3>
        <span className="text-sm text-slate-500">{fortune.date}</span>
      </div>

      <div className="flex justify-center mb-6 relative">
        <div className="relative">
          <ScoreRing score={fortune.overall_score} size={100} label={t('fortune.daily.overall')} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {aspects.map(({ key, label, data, icon }) => (
          <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg font-bold" style={{ color: data.score >= 70 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                {data.score}
              </span>
              <TrendIcon trend={data.trend} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">{data.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-indigo-50 rounded-lg p-3">
          <div className="text-xs text-indigo-600 font-medium mb-1">{t('fortune.daily.luckyNumbers')}</div>
          <div className="flex gap-2">
            {fortune.lucky_numbers.map((n, i) => (
              <span key={i} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-sm font-mono">{n}</span>
            ))}
          </div>
        </div>
        <div className="bg-rose-50 rounded-lg p-3">
          <div className="text-xs text-rose-600 font-medium mb-1">{t('fortune.daily.luckyColors')}</div>
          <div className="flex gap-1 flex-wrap">
            {fortune.lucky_colors.map((c, i) => (
              <span key={i} className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {fortune.auspicious_hours.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-3 mb-3">
          <div className="text-xs text-amber-600 font-medium mb-1">{t('fortune.daily.auspiciousHours')}</div>
          <div className="flex gap-2 flex-wrap">
            {fortune.auspicious_hours.map((h, i) => (
              <span key={i} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">{h}</span>
            ))}
          </div>
        </div>
      )}

      {fortune.advice.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 font-medium mb-1">{t('fortune.daily.advice')}</div>
          <ul className="text-xs text-slate-700 space-y-1">
            {fortune.advice.map((a, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fortune.warnings.length > 0 && (
        <div className="bg-rose-50 rounded-lg p-3">
          <div className="text-xs text-rose-600 font-medium mb-1">{t('fortune.warnings')}</div>
          <ul className="text-xs text-rose-700 space-y-1">
            {fortune.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DailyFortune;
