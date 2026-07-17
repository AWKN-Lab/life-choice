import React from 'react';
import { useTranslation } from 'react-i18next';

interface FortuneAspect {
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  advice: string;
}

interface YearlyFortuneData {
  year: number;
  gan_zhi: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  key_moments: Array<{ month: number; description: string }>;
  crisis_periods: Array<{ start_month: number; end_month: number; description: string }>;
  opportunities: Array<{ month: number; type: string; description: string }>;
  best_months: number[];
  worst_months: number[];
  zodiac_compatibility: Array<{ zodiac: string; score: number }>;
  advice: string[];
}

interface YearlyFortuneProps {
  fortune: YearlyFortuneData;
}

const TrendIcon: React.FC<{ trend: string }> = ({ trend }) => {
  if (trend === 'up') return <span className="text-emerald-500 text-sm">↑</span>;
  if (trend === 'down') return <span className="text-rose-500 text-sm">↓</span>;
  return <span className="text-slate-400 text-sm">→</span>;
};

const MiniBar: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
  const pct = (value / max) * 100;
  const color = value >= 70 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const YearlyFortune: React.FC<YearlyFortuneProps> = ({ fortune }) => {
  const { t } = useTranslation();
  if (!fortune) return null;

  const aspects = [
    { key: 'career', label: t('resultPage.divination.aspects.career'), data: fortune.career, icon: '💼' },
    { key: 'wealth', label: t('resultPage.divination.aspects.wealth'), data: fortune.wealth, icon: '💰' },
    { key: 'relationship', label: t('resultPage.divination.aspects.relationship'), data: fortune.relationship, icon: '❤️' },
    { key: 'health', label: t('resultPage.divination.aspects.health'), data: fortune.health, icon: '🏥' },
  ];

  const overallColor = fortune.overall_score >= 70 ? '#10b981' : fortune.overall_score >= 50 ? '#f59e0b' : '#ef4444';

  const monthName = (month: number) => t('fortune.monthLabel', { month });

  return (
    <div className="bg-surface-container rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800">{t('fortune.yearly.title')}</h3>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
            {t('fortune.yearly.ganZhiYear', { ganZhi: fortune.gan_zhi })}
          </span>
          <span className="text-sm text-slate-500">{t('fortune.yearLabel', { year: fortune.year })}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-5 p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-lg">
        <div className="text-center">
          <div className="text-4xl font-bold" style={{ color: overallColor }}>
            {fortune.overall_score}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{t('fortune.yearly.overall')}</div>
        </div>
        <div className="flex-1 space-y-2">
          {aspects.map(({ key, label, data }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8">{label}</span>
              <div className="flex-1">
                <MiniBar value={data.score} />
              </div>
              <span className="text-xs font-bold w-6 text-right" style={{ color: data.score >= 70 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                {data.score}
              </span>
              <TrendIcon trend={data.trend} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {fortune.best_months.length > 0 && (
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-xs text-emerald-600 font-medium mb-1">{t('fortune.yearly.bestMonths')}</div>
            <div className="flex gap-1.5 flex-wrap">
              {fortune.best_months.map((m, i) => (
                <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs">
                  {monthName(m)}
                </span>
              ))}
            </div>
          </div>
        )}
        {fortune.worst_months.length > 0 && (
          <div className="bg-rose-50 rounded-lg p-3">
            <div className="text-xs text-rose-600 font-medium mb-1">{t('fortune.yearly.worstMonths')}</div>
            <div className="flex gap-1.5 flex-wrap">
              {fortune.worst_months.map((m, i) => (
                <span key={i} className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs">
                  {monthName(m)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {fortune.key_moments.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 font-medium mb-2">{t('fortune.yearly.keyMoments')}</div>
          <div className="space-y-2">
            {fortune.key_moments.map((moment, i) => (
              <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg p-2">
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                  {monthName(moment.month)}
                </span>
                <span className="text-xs text-slate-700">{moment.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fortune.opportunities.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 font-medium mb-2">{t('fortune.yearly.opportunities')}</div>
          <div className="space-y-1.5">
            {fortune.opportunities.map((opp, i) => {
              const typeColor = opp.type === 'investment' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';
              const typeLabel = opp.type === 'investment' ? t('fortune.yearly.investment') : t('resultPage.divination.aspects.career');
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className={`${typeColor} px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0`}>
                    {typeLabel}
                  </span>
                  <span className="text-xs text-slate-700">
                    {t('fortune.monthWithColon', { month: monthName(opp.month) })}{opp.description}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fortune.crisis_periods.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-rose-600 font-medium mb-2">{t('fortune.yearly.riskPeriods')}</div>
          <div className="space-y-1.5">
            {fortune.crisis_periods.map((crisis, i) => (
              <div key={i} className="flex items-start gap-2 bg-rose-50 rounded-lg p-2">
                <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                  {monthName(crisis.start_month)}-{monthName(crisis.end_month)}
                </span>
                <span className="text-xs text-rose-700">{crisis.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fortune.zodiac_compatibility.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-slate-500 font-medium mb-2">{t('fortune.yearly.zodiacCompatibility')}</div>
          <div className="flex gap-2 flex-wrap">
            {fortune.zodiac_compatibility.map((z, i) => {
              const zodiacColor = z.score >= 70 ? 'bg-emerald-100 text-emerald-700' : z.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
              return (
                <span key={i} className={`${zodiacColor} px-2 py-1 rounded text-xs`}>
                  {z.zodiac} {z.score}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {fortune.advice.length > 0 && (
        <div className="bg-indigo-50 rounded-lg p-3">
          <div className="text-xs text-indigo-600 font-medium mb-1">{t('fortune.yearly.advice')}</div>
          <ul className="text-xs text-indigo-800 space-y-1">
            {fortune.advice.map((a, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-indigo-400 mt-0.5">•</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default YearlyFortune;
