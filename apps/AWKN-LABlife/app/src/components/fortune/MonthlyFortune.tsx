import React from 'react';
import { useTranslation } from 'react-i18next';

interface FortuneAspect {
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  advice: string;
}

interface MonthlyFortuneData {
  year: number;
  month: number;
  month_name: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  lucky_days: number[];
  advice: string[];
  warnings: string[];
}

interface MonthlyFortuneProps {
  fortune: MonthlyFortuneData;
}

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'up') return <span className="text-emerald-500 text-sm">↑</span>;
  if (trend === 'down') return <span className="text-rose-500 text-sm">↓</span>;
  return <span className="text-slate-400 text-sm">→</span>;
};

const ScoreBar: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const textColor = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${textColor} w-6 text-right`}>{score}</span>
    </div>
  );
};

const MonthlyFortune: React.FC<MonthlyFortuneProps> = ({ fortune }) => {
  const { t } = useTranslation();
  if (!fortune) return null;

  const aspects = [
    { key: 'career', label: t('resultPage.divination.aspects.career'), data: fortune.career, icon: '💼' },
    { key: 'wealth', label: t('resultPage.divination.aspects.wealth'), data: fortune.wealth, icon: '💰' },
    { key: 'relationship', label: t('resultPage.divination.aspects.relationship'), data: fortune.relationship, icon: '❤️' },
    { key: 'health', label: t('resultPage.divination.aspects.health'), data: fortune.health, icon: '🏥' },
  ];

  const overallColor = fortune.overall_score >= 70 ? '#10b981' : fortune.overall_score >= 50 ? '#f59e0b' : '#ef4444';
  const overallLabel = fortune.overall_score >= 70
    ? t('fortune.monthly.overallGood')
    : fortune.overall_score >= 50
      ? t('fortune.monthly.overallStable')
      : t('fortune.monthly.overallLow');

  return (
    <div className="bg-surface-container rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">{t('fortune.monthly.title')}</h3>
        <span className="text-sm text-slate-500">
          {t('fortune.yearMonthLabel', { year: fortune.year, month: fortune.month_name })}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50 rounded-lg">
        <div className="text-center">
          <div className="text-3xl font-bold" style={{ color: overallColor }}>
            {fortune.overall_score}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{t('fortune.monthly.overallScore')}</div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-700 mb-2">{overallLabel}</div>
          <div className="space-y-2">
            {aspects.map(({ key, label, data }) => (
              <ScoreBar key={key} score={data.score} label={label} />
            ))}
          </div>
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

      {fortune.lucky_days.length > 0 && (
        <div className="bg-indigo-50 rounded-lg p-3 mb-3">
          <div className="text-xs text-indigo-600 font-medium mb-1">{t('fortune.monthly.luckyDays')}</div>
          <div className="flex gap-2 flex-wrap">
            {fortune.lucky_days.map((d, i) => (
              <span key={i} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-mono">
                {t('fortune.dayLabel', { day: d })}
              </span>
            ))}
          </div>
        </div>
      )}

      {fortune.advice.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 font-medium mb-1">{t('fortune.monthly.advice')}</div>
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

export default MonthlyFortune;
