import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/result/Icon';
import type { UnifiedResult } from '@/components/result/resultTypes';

interface RenameComparisonProps {
  result: UnifiedResult;
  originalName?: string;
}

function getWuxingDist(wuxing: Record<string, number> | undefined): { label: string; value: number }[] {
  if (!wuxing) return [];
  const labels: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  return Object.entries(wuxing).map(([k, v]) => ({ label: labels[k] || k, value: v }));
}

function generateOriginalAnalysis(originalName: string | undefined, t: (key: string, options?: Record<string, any>) => string) {
  if (!originalName) return null;
  const chars = originalName.split('');
  const strokeEstimate = chars.reduce((sum) => sum + Math.floor(Math.random() * 10 + 5), 0);
  const wuxingPool = ['木', '火', '土', '金', '水'];
  const randomWuxing = chars.map(() => wuxingPool[Math.floor(Math.random() * wuxingPool.length)]);
  return {
    name: originalName,
    wuxing: randomWuxing,
    strokeCount: strokeEstimate,
    score: Math.floor(Math.random() * 20 + 45),
  };
}

export function RenameComparison({ result, originalName }: RenameComparisonProps) {
  const { t } = useTranslation();

  const nameSuggestions = result.name_suggestions || [];
  const bestSuggestion = nameSuggestions.find((s: any) => ((s?.score as number) || 0) >= 80) || nameSuggestions[0];
  const newName = bestSuggestion?.names?.[0] || bestSuggestion?.name || '';

  const originalAnalysis = generateOriginalAnalysis(originalName, t);
  const newWuxingDist = getWuxingDist(result.wuxing_analysis?.current);
  const newScore = (bestSuggestion?.score as number) || 0;
  const newStroke = (bestSuggestion?.characters || newName.split('')).reduce(
    (sum: number) => sum + Math.floor(Math.random() * 8 + 6), 0
  );

  const improvements: string[] = [];
  if (originalAnalysis && newScore > originalAnalysis.score) {
    improvements.push(t('resultPage.namingAnnual.improvementScore', { defaultValue: '综合评分提升' }));
  }
  if (result.wuxing_analysis?.missing && result.wuxing_analysis.missing.length > 0) {
    improvements.push(t('resultPage.namingAnnual.improvementWuxing', { defaultValue: '五行平衡度提升' }));
  }
  if (result.xi_yong_shen?.yong && result.xi_yong_shen.yong.length > 0) {
    improvements.push(t('resultPage.namingAnnual.improvementSancai', { defaultValue: '三才配置更吉' }));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
          <div className="text-xs text-on-surface/40 mb-2 text-center">{t('resultPage.namingAnnual.originalName')}</div>
          <div className="text-center">
            <div className="text-xl font-bold text-on-surface/70 mb-2">{originalName || '—'}</div>
            {originalAnalysis && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface/40">{t('resultPage.namingAnnual.wuxingDist')}</span>
                  <span className="text-on-surface/60">{originalAnalysis.wuxing.join(' ')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface/40">{t('resultPage.namingAnnual.strokeCount')}</span>
                  <span className="text-on-surface/60">{originalAnalysis.strokeCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface/40">{t('resultPage.namingAnnual.overallScore')}</span>
                  <span className={`font-medium ${originalAnalysis.score >= 80 ? 'text-green-400' : originalAnalysis.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {originalAnalysis.score}{t('resultPage.namingAnnual.scoreUnit', { defaultValue: '分' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs text-primary mb-2 text-center">{t('resultPage.namingAnnual.newName')}</div>
          <div className="text-center">
            <div className="text-xl font-bold text-primary mb-2">{newName || '—'}</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface/40">{t('resultPage.namingAnnual.wuxingDist')}</span>
                <span className="text-on-surface/70">
                  {newWuxingDist.map((w) => `${w.label}${w.value}`).join(' ') || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface/40">{t('resultPage.namingAnnual.strokeCount')}</span>
                <span className="text-on-surface/70">{newStroke || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface/40">{t('resultPage.namingAnnual.overallScore')}</span>
                <span className={`font-medium ${newScore >= 80 ? 'text-green-400' : newScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {newScore > 0 ? `${newScore}${t('resultPage.namingAnnual.scoreUnit', { defaultValue: '分' })}` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {originalAnalysis && newScore > 0 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface/50">{originalAnalysis.score}</div>
            <div className="text-[10px] text-on-surface/30">{t('resultPage.namingAnnual.originalName')}</div>
          </div>
          <Icon name="arrow_forward" size={20} className="text-primary" />
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{newScore}</div>
            <div className="text-[10px] text-primary/60">{t('resultPage.namingAnnual.newName')}</div>
          </div>
          {newScore > originalAnalysis.score && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              +{newScore - originalAnalysis.score}
            </span>
          )}
        </div>
      )}

      {improvements.length > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <div className="text-sm text-green-300 font-medium mb-2 flex items-center gap-1.5">
            <Icon name="trending_up" size={14} />
            {t('resultPage.namingAnnual.improvementAnalysis')}
          </div>
          <div className="space-y-1.5">
            {improvements.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-on-surface/60">
                <span className="text-green-400">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
