import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DestinyKlineBundle } from '@/lib/destinyKline/types';
import { Icon } from '@/components/result/Icon';

interface LifePhase {
  startAge: number;
  endAge: number;
  avgScore: number;
  trend: 'rising' | 'steady' | 'declining' | 'recovery';
  label: string;
  advice: string;
}

interface TransitionYear {
  age: number;
  from: string;
  to: string;
  description: string;
}

function derivePhases(points: { age: number; score: number }[]): LifePhase[] {
  if (points.length === 0) return [];

  const windowSize = Math.max(5, Math.floor(points.length / 8));
  const smoothed = points.map((p, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length, i + Math.ceil(windowSize / 2));
    const slice = points.slice(start, end);
    const avg = slice.reduce((s, pt) => s + pt.score, 0) / slice.length;
    return { age: p.age, score: avg };
  });

  const phases: LifePhase[] = [];
  let phaseStart = 0;

  for (let i = 1; i <= smoothed.length; i++) {
    const shouldSplit = i === smoothed.length || (() => {
      if (i < 3 || i > smoothed.length - 3) return false;
      const prevSlope = smoothed[i - 1].score - smoothed[i - 3].score;
      const nextSlope = smoothed[Math.min(i + 2, smoothed.length - 1)].score - smoothed[i].score;
      return Math.sign(prevSlope) !== Math.sign(nextSlope) && Math.abs(prevSlope) > 3;
    })();

    if (shouldSplit) {
      const slice = smoothed.slice(phaseStart, i);
      const avgScore = Math.round(slice.reduce((s, p) => s + p.score, 0) / slice.length);
      const firstScore = slice[0].score;
      const lastScore = slice[slice.length - 1].score;
      const diff = lastScore - firstScore;

      let trend: LifePhase['trend'];
      if (diff > 8) trend = 'rising';
      else if (diff < -8) trend = 'declining';
      else if (avgScore < 45) trend = 'recovery';
      else trend = 'steady';

      phases.push({
        startAge: slice[0].age,
        endAge: slice[slice.length - 1].age,
        avgScore,
        trend,
        label: '',
        advice: '',
      });

      phaseStart = i;
    }
  }

  if (phases.length === 0) {
    const avgScore = Math.round(smoothed.reduce((s, p) => s + p.score, 0) / smoothed.length);
    const diff = smoothed[smoothed.length - 1].score - smoothed[0].score;
    let trend: LifePhase['trend'] = 'steady';
    if (diff > 8) trend = 'rising';
    else if (diff < -8) trend = 'declining';
    else if (avgScore < 45) trend = 'recovery';

    phases.push({
      startAge: smoothed[0].age,
      endAge: smoothed[smoothed.length - 1].age,
      avgScore,
      trend,
      label: '',
      advice: '',
    });
  }

  return phases;
}

function findTransitions(phases: LifePhase[]): TransitionYear[] {
  const transitions: TransitionYear[] = [];
  for (let i = 1; i < phases.length; i++) {
    transitions.push({
      age: phases[i].startAge,
      from: phases[i - 1].label,
      to: phases[i].label,
      description: '',
    });
  }
  return transitions;
}

const TREND_COLORS: Record<string, string> = {
  rising: 'text-emerald-400',
  steady: 'text-amber-400',
  declining: 'text-rose-400',
  recovery: 'text-blue-400',
};

const TREND_BG: Record<string, string> = {
  rising: 'bg-emerald-500/10 border-emerald-500/20',
  steady: 'bg-amber-500/10 border-amber-500/20',
  declining: 'bg-rose-500/10 border-rose-500/20',
  recovery: 'bg-blue-500/10 border-blue-500/20',
};

interface Props {
  bundle: DestinyKlineBundle;
}

export function LongCycleReport({ bundle }: Props) {
  const { t } = useTranslation();

  const overallPoints = useMemo(() => {
    return bundle.aspects.overall.points
      .filter((p) => typeof p.age === 'number')
      .map((p) => ({ age: p.age, score: p.score }));
  }, [bundle.aspects.overall.points]);

  const phases = useMemo(() => {
    const raw = derivePhases(overallPoints);
    return raw.map((phase) => {
      const trendKey = phase.trend === 'rising' ? 'phaseRising'
        : phase.trend === 'steady' ? 'phaseSteady'
        : phase.trend === 'declining' ? 'phaseDeclining'
        : 'phaseRecovery';

      const label = t(`resultPage.destinyKline.annual.longCycle.${trendKey}`);
      const adviceMap: Record<string, string> = {
        rising: t('resultPage.destinyKline.annual.longCycle.adviceRising'),
        steady: t('resultPage.destinyKline.annual.longCycle.adviceSteady'),
        declining: t('resultPage.destinyKline.annual.longCycle.adviceDeclining'),
        recovery: t('resultPage.destinyKline.annual.longCycle.adviceRecovery'),
      };

      return {
        ...phase,
        label,
        advice: adviceMap[phase.trend] || '',
      };
    });
  }, [overallPoints, t]);

  const transitions = useMemo(() => {
    const raw = findTransitions(phases);
    return raw.map((tr) => ({
      ...tr,
      description: t('resultPage.destinyKline.annual.longCycle.transitionDesc', {
        from: tr.from,
        to: tr.to,
      }),
    }));
  }, [phases, t]);

  const trajectorySummary = useMemo(() => {
    if (phases.length === 0) return '';
    const risingCount = phases.filter((p) => p.trend === 'rising').length;
    const decliningCount = phases.filter((p) => p.trend === 'declining').length;
    if (risingCount > decliningCount + 1) {
      return t('resultPage.destinyKline.annual.longCycle.trajectoryRising');
    }
    if (decliningCount > risingCount + 1) {
      return t('resultPage.destinyKline.annual.longCycle.trajectoryDeclining');
    }
    return t('resultPage.destinyKline.annual.longCycle.trajectoryBalanced');
  }, [phases, t]);

  const miniChartData = useMemo(() => {
    const step = Math.max(1, Math.floor(overallPoints.length / 60));
    return overallPoints.filter((_, i) => i % step === 0);
  }, [overallPoints]);

  const chartMin = useMemo(() => Math.min(...miniChartData.map((d) => d.score)), [miniChartData]);
  const chartMax = useMemo(() => Math.max(...miniChartData.map((d) => d.score)), [miniChartData]);
  const chartRange = chartMax - chartMin || 1;

  return (
    <div className="space-y-4">
      <div className="bg-on-surface/[0.04] rounded-xl p-4">
        <h5 className="text-primary font-medium mb-2 flex items-center gap-2">
          <Icon name="timeline" size={16} />
          {t('resultPage.destinyKline.annual.longCycle.lifeTrajectory')}
        </h5>
        <svg viewBox="0 0 300 60" className="w-full h-16" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="rgba(245,158,11,0.6)"
            strokeWidth="2"
            points={miniChartData
              .map((d, i) => {
                const x = (i / (miniChartData.length - 1 || 1)) * 300;
                const y = 55 - ((d.score - chartMin) / chartRange) * 45;
                return `${x},${y}`;
              })
              .join(' ')}
          />
          {bundle.currentAge && (() => {
            const idx = miniChartData.findIndex((d) => d.age >= bundle.currentAge);
            if (idx < 0) return null;
            const x = (idx / (miniChartData.length - 1 || 1)) * 300;
            const y = 55 - ((miniChartData[idx].score - chartMin) / chartRange) * 45;
            return <circle cx={x} cy={y} r="3" fill="#f59e0b" />;
          })()}
        </svg>
        {trajectorySummary && (
          <p className="text-on-surface/60 text-xs mt-2">{trajectorySummary}</p>
        )}
      </div>

      <div className="space-y-2">
        {phases.map((phase, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-3 ${TREND_BG[phase.trend]}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`font-medium text-sm ${TREND_COLORS[phase.trend]}`}>
                {phase.label}
              </span>
              <span className="text-on-surface/50 text-xs">
                {phase.startAge}-{phase.endAge}{t('resultPage.destinyKline.annual.longCycle.ageUnit')}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-on-surface/40 text-xs">{t('resultPage.destinyKline.annual.longCycle.avgScore')}</span>
              <span className="text-on-surface font-bold text-sm">{phase.avgScore}</span>
            </div>
            {phase.advice && (
              <p className="text-on-surface/50 text-xs leading-relaxed">
                {t('resultPage.destinyKline.annual.longCycle.strategicAdvice')}：{phase.advice}
              </p>
            )}
          </div>
        ))}
      </div>

      {transitions.length > 0 && (
        <div className="bg-on-surface/[0.04] rounded-xl p-4">
          <h5 className="text-primary font-medium mb-2 flex items-center gap-2">
            <Icon name="swap_vert" size={16} />
            {t('resultPage.destinyKline.annual.longCycle.transitionYear')}
          </h5>
          <div className="space-y-2">
            {transitions.map((tr, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-primary font-bold">{tr.age}{t('resultPage.destinyKline.annual.longCycle.ageUnit')}</span>
                <span className="text-on-surface/40">→</span>
                <span className="text-on-surface/60">{tr.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
