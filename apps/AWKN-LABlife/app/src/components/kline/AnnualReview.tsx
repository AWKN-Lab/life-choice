import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DestinyKlineBundle, KlineSignal } from '@/lib/destinyKline/types';
import { Icon } from '@/components/result/Icon';

interface YearCard {
  year: number;
  age: number;
  score: number;
  type: 'past' | 'current' | 'future';
  keyword: string;
  signal?: KlineSignal;
}

function deriveKeyword(score: number, signal?: KlineSignal): string {
  if (signal) {
    const labelMap: Record<string, string> = {
      rise_cross: 'rise_cross',
      noble_volume: 'noble_volume',
      wealth_breakout: 'wealth_breakout',
      relationship_shift: 'relationship_shift',
      void_pullback: 'void_pullback',
      conflict_breakdown: 'conflict_breakdown',
      useful_god_return: 'useful_god_return',
    };
    return labelMap[signal.id] || '';
  }
  if (score >= 75) return 'rise_cross';
  if (score >= 60) return 'useful_god_return';
  if (score >= 45) return 'noble_volume';
  return 'void_pullback';
}

interface Props {
  bundle: DestinyKlineBundle;
  currentYear: number;
}

export function AnnualReview({ bundle, currentYear }: Props) {
  const { t } = useTranslation();

  const yearCards = useMemo(() => {
    const points = bundle.aspects.overall.points;
    if (!points || points.length === 0) return [];

    const birthYear = currentYear - bundle.currentAge;

    return points
      .filter((p) => typeof p.age === 'number')
      .map((p) => {
        const year = birthYear + p.age;
        let type: YearCard['type'];
        if (year < currentYear) type = 'past';
        else if (year === currentYear) type = 'current';
        else type = 'future';

        const signal = p.signals?.[0];
        const keyword = deriveKeyword(p.score, signal);

        return {
          year,
          age: p.age,
          score: p.score,
          type,
          keyword,
          signal,
        } as YearCard;
      })
      .filter((c) => c.year >= currentYear - 3 && c.year <= currentYear + 3);
  }, [bundle.aspects.overall.points, bundle.currentAge, currentYear]);

  const currentCard = yearCards.find((c) => c.type === 'current');
  const pastCards = yearCards.filter((c) => c.type === 'past').reverse();
  const futureCards = yearCards.filter((c) => c.type === 'future');

  const renderKeyword = (keyword: string) => {
    if (!keyword) return '';
    return t(`resultPage.destinyKline.signalLabel.${keyword}`, { defaultValue: keyword });
  };

  const renderCard = (card: YearCard, label: string, labelColor: string) => (
    <div
      key={`${card.year}-${card.age}`}
      className={`rounded-xl border p-3 ${
        card.type === 'current'
          ? 'bg-primary/10 border-primary/30'
          : 'bg-on-surface/[0.03] border-outline/[0.08]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${labelColor}`}>
          {label}
        </span>
        <span className="text-on-surface/40 text-xs">{card.year}</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-on-surface font-bold text-lg">{card.score}</span>
        <span className="text-on-surface/40 text-xs">{t('resultPage.destinyKline.annual.annualReview.scoreLabel')}</span>
        <div className="flex-1 h-1.5 bg-on-surface/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              card.score >= 70 ? 'bg-emerald-400' :
              card.score >= 50 ? 'bg-amber-400' :
              'bg-rose-400'
            }`}
            style={{ width: `${card.score}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-on-surface/40 text-xs">{t('resultPage.destinyKline.annual.annualReview.yearKeyword')}</span>
        <span className="text-primary text-xs font-medium">{renderKeyword(card.keyword)}</span>
      </div>
      {card.signal && (
        <p className="text-on-surface/50 text-xs mt-1 leading-relaxed">{card.signal.description}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {pastCards.length > 0 && (
        <div>
          <h5 className="text-on-surface/40 text-xs font-medium mb-2 flex items-center gap-1">
            <Icon name="history" size={14} />
            {t('resultPage.destinyKline.annual.annualReview.pastYear')}
          </h5>
          <div className="space-y-2">
            {pastCards.map((card) =>
              renderCard(card, t('resultPage.destinyKline.annual.annualReview.pastYear'), 'bg-on-surface/10 text-on-surface/50')
            )}
          </div>
        </div>
      )}

      {currentCard && (
        <div>
          <h5 className="text-primary text-xs font-medium mb-2 flex items-center gap-1">
            <Icon name="today" size={14} />
            {t('resultPage.destinyKline.annual.annualReview.currentYear')}
          </h5>
          {renderCard(currentCard, t('resultPage.destinyKline.annual.annualReview.currentYear'), 'bg-primary/20 text-primary')}
        </div>
      )}

      {futureCards.length > 0 && (
        <div>
          <h5 className="text-on-surface/40 text-xs font-medium mb-2 flex items-center gap-1">
            <Icon name="schedule" size={14} />
            {t('resultPage.destinyKline.annual.annualReview.nextYear')}
          </h5>
          <div className="space-y-2">
            {futureCards.map((card) =>
              renderCard(card, t('resultPage.destinyKline.annual.annualReview.nextYear'), 'bg-on-surface/10 text-on-surface/50')
            )}
          </div>
        </div>
      )}

      {yearCards.length === 0 && (
        <div className="text-center py-6">
          <Icon name="info" size={24} className="text-on-surface/30 mx-auto mb-2" />
          <p className="text-on-surface/40 text-sm">{t('resultPage.destinyKline.annual.annualReview.noData')}</p>
        </div>
      )}
    </div>
  );
}
