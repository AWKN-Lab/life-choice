import React from 'react';
import { useTranslation } from 'react-i18next';

interface CelebrityCase {
  id: string;
  name: string;
  name_cn: string;
  category: string;
  category_cn: string;
  birth_date: string;
  description: string;
  tags: string[];
  year_pillar: string;
  month_pillar: string;
  day_pillar: string;
  hour_pillar: string;
  scores?: {
    overall: number;
    personality: number;
    career: number;
    wealth: number;
    marriage: number;
    health: number;
  };
}

interface BaziSimilarity {
  overall_score: number;
  year_pillar_score: number;
  month_pillar_score: number;
  day_pillar_score: number;
  hour_pillar_score: number;
  wuxing_balance_score: number;
  day_master_relation: string;
  insights: string[];
}

interface CelebrityComparison {
  celebrity: CelebrityCase;
  similarity: BaziSimilarity;
}

interface BaziComparisonPanelProps {
  comparisons: CelebrityComparison[];
  userPillars?: { year: string; month: string; day: string; hour: string };
}

const ScoreBar: React.FC<{ score: number; label: string; maxScore?: number }> = ({ score, label, maxScore = 100 }) => {
  const percentage = (score / maxScore) * 100;
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-slate-700">{score}</span>
    </div>
  );
};

const SimilarityBadge: React.FC<{ score: number }> = ({ score }) => {
  const { t } = useTranslation();
  const color = score >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {t('celebrity.similarityPercent', { score })}
    </span>
  );
};

const BaziComparisonPanel: React.FC<BaziComparisonPanelProps> = ({ comparisons, userPillars }) => {
  const { t, i18n } = useTranslation();
  if (!comparisons || comparisons.length === 0) return null;
  const isEnglish = i18n.language.startsWith('en');
  const pillarLabels = ['year', 'month', 'day', 'hour'] as const;

  return (
    <div className="bg-surface-container rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">{t('celebrity.title')}</h3>
      <p className="text-xs text-slate-500 mb-4">{t('celebrity.subtitle')}</p>

      {userPillars && (
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <div className="text-xs text-slate-500 mb-2">{t('celebrity.yourChart')}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {pillarLabels.map((label, i) => {
              const pillars = [userPillars.year, userPillars.month, userPillars.day, userPillars.hour];
              return (
                <div key={label}>
                  <div className="text-[10px] text-slate-400">{t(`celebrity.pillars.${label}`)}</div>
                  <div className="text-sm font-bold text-slate-800">{pillars[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comparisons.map(({ celebrity, similarity }) => (
          <div key={celebrity.id} className="border border-slate-100 rounded-lg p-4 hover:border-indigo-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{isEnglish ? celebrity.name : celebrity.name_cn}</h4>
                  <span className="text-xs text-slate-400">{isEnglish ? celebrity.name_cn : celebrity.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{isEnglish ? celebrity.category : celebrity.category_cn}</span>
                  <span className="text-xs text-slate-400">{celebrity.birth_date}</span>
                </div>
              </div>
              <SimilarityBadge score={similarity.overall_score} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-[10px] text-slate-400 mb-1">{t('celebrity.celebrityChart')}</div>
                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                  {[celebrity.year_pillar, celebrity.month_pillar, celebrity.day_pillar, celebrity.hour_pillar].map((p, i) => (
                    <span key={i} className="font-mono font-bold text-slate-700">{p}</span>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-[10px] text-slate-400 mb-1">{t('celebrity.dayMasterRelation')}</div>
                <div className="text-xs text-slate-700 font-medium">{similarity.day_master_relation}</div>
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              <ScoreBar score={similarity.year_pillar_score} label={t('celebrity.shortPillars.year')} />
              <ScoreBar score={similarity.month_pillar_score} label={t('celebrity.shortPillars.month')} />
              <ScoreBar score={similarity.day_pillar_score} label={t('celebrity.shortPillars.day')} />
              <ScoreBar score={similarity.hour_pillar_score} label={t('celebrity.shortPillars.hour')} />
              <ScoreBar score={similarity.wuxing_balance_score} label={t('celebrity.shortPillars.wuxing')} />
            </div>

            {similarity.insights.length > 0 && (
              <div className="bg-amber-50 rounded p-2">
                <div className="text-[10px] text-amber-600 font-medium mb-1">{t('celebrity.insights')}</div>
                <ul className="text-xs text-amber-800 space-y-0.5">
                  {similarity.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {celebrity.scores && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Object.entries(celebrity.scores).map(([key, val]) => {
                  if (key === 'overall') return null;
                  const labels: Record<string, string> = {
                    personality: t('celebrity.scoreLabels.personality'),
                    career: t('celebrity.scoreLabels.career'),
                    wealth: t('celebrity.scoreLabels.wealth'),
                    marriage: t('celebrity.scoreLabels.marriage'),
                    health: t('celebrity.scoreLabels.health'),
                  };
                  return (
                    <div key={key} className="text-center bg-slate-50 rounded p-1.5">
                      <div className="text-[10px] text-slate-400">{labels[key] || key}</div>
                      <div className="text-sm font-bold" style={{ color: val >= 80 ? '#10b981' : val >= 60 ? '#f59e0b' : '#ef4444' }}>{val}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BaziComparisonPanel;
