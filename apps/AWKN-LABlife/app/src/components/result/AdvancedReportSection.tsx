import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import type { UnifiedResult } from './resultTypes';

export function AdvancedReportSection({ result }: { result: UnifiedResult }) {
  const { t } = useTranslation();
  const hasZipingReport = result.route_type === 'ziping' && (
    result.mingjuGuJia || result.daYunTheme || result.keyYearPhenomenon || result.classicAnalysis || result.decisionAudit
  );
  const hasLiurenReport = result.route_type === 'liuren' && (
    result.coreReasoning || result.keySignals?.length || result.timeWindows?.length || result.action_strategy
  );

  if (!hasZipingReport && !hasLiurenReport) return null;

  const scoreItems = result.modulesRating ? [
    [t('resultPage.divination.aspects.career'), result.modulesRating.career, result.modules?.career],
    [t('resultPage.divination.aspects.wealth'), result.modulesRating.wealth, result.modules?.wealth],
    [t('resultPage.divination.aspects.relationship'), result.modulesRating.relationship, result.modules?.relationship],
    [t('resultPage.divination.aspects.health'), result.modulesRating.health, result.modules?.health],
  ] : [];

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-primary font-semibold flex items-center gap-2">
          <Icon name="auto_stories" size={18} />
          {t('resultPage.caseReport')}
        </h2>
        {(result.qualityScore || result.schemaValid !== undefined) && (
          <span className="text-[11px] text-on-surface/40">
            {t('resultPage.quality')} {result.qualityScore ?? '-'} · {result.schemaValid ? t('resultPage.schemaComplete') : t('resultPage.degraded')}
          </span>
        )}
      </div>

      {result.one_line_conclusion && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
          <p className="text-on-surface/80 text-sm leading-relaxed">{result.one_line_conclusion}</p>
        </div>
      )}

      {hasZipingReport && (
        <div className="space-y-4">
          {[
            [t('resultPage.reportSections.chartVerification'), result.paiPanVerification],
            [t('resultPage.reportSections.destinyStructure'), result.mingjuGuJia],
            [t('resultPage.reportSections.characterPortrait'), result.character_portrait],
            [t('resultPage.reportSections.currentDaYun'), result.daYunTheme],
            [t('resultPage.reportSections.yearKeyImage'), result.keyYearPhenomenon],
            [t('resultPage.reportSections.classicBasis'), result.classicAnalysis],
          ].filter(([, value]) => value).map(([title, value]) => (
            <section key={title} className="border-t border-outline/5 pt-3 first:border-t-0 first:pt-0">
              <h3 className="text-primary/90 text-sm font-medium mb-1">{title}</h3>
              <p className="text-on-surface/60 text-sm leading-relaxed whitespace-pre-line">{value as string}</p>
            </section>
          ))}

          {scoreItems.length > 0 && (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-2">{t('resultPage.moduleScores')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {scoreItems.map(([title, score, text]) => (
                  <div key={title as string} className="rounded-lg bg-on-surface/[0.04] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-on-surface/75 text-sm">{title as string}</span>
                      <span className="text-primary text-sm font-semibold">{score || '-'}/10</span>
                    </div>
                    {text && <p className="text-on-surface/45 text-xs leading-relaxed">{text as string}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {result.decisionAudit && (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-2">{t('resultPage.decisionAudit.title')}</h3>
              <div className="space-y-2 text-sm text-on-surface/60">
                {result.decisionAudit.rightOrWrong && <p><span className="text-on-surface/80">{t('resultPage.decisionAudit.rightOrWrong')}{t('common.colon')}</span>{result.decisionAudit.rightOrWrong}</p>}
                {result.decisionAudit.safetyMargin && <p><span className="text-on-surface/80">{t('resultPage.decisionAudit.safetyMargin')}{t('common.colon')}</span>{result.decisionAudit.safetyMargin}</p>}
                {result.decisionAudit.mvpPlan && <p><span className="text-on-surface/80">MVP：</span>{result.decisionAudit.mvpPlan}</p>}
              </div>
            </section>
          )}

          {result.futureYearsRhythm?.length ? (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-2">{t('resultPage.futureRhythm')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.futureYearsRhythm.map((item) => (
                  <div key={item.year} className="rounded-lg bg-on-surface/[0.04] p-3">
                    <div className="text-on-surface/80 text-sm font-medium">{item.year} · {item.theme}</div>
                    <p className="text-on-surface/45 text-xs mt-1">{item.advice}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {hasLiurenReport && (
        <div className="space-y-4">
          {result.coreReasoning && (
            <section>
              <h3 className="text-primary/90 text-sm font-medium mb-1">{t('resultPage.reportSections.coreReasoning')}</h3>
              <p className="text-on-surface/60 text-sm leading-relaxed">{result.coreReasoning}</p>
            </section>
          )}
          {result.action_strategy && (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-1">{t('resultPage.reportSections.actionStrategy')}</h3>
              <p className="text-on-surface/60 text-sm leading-relaxed">{result.action_strategy}</p>
            </section>
          )}
          {result.keySignals?.length ? (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-2">{t('resultPage.reportSections.keySignals')}</h3>
              <ul className="space-y-1">
                {result.keySignals.map((signal, idx) => <li key={idx} className="text-on-surface/55 text-sm">· {signal}</li>)}
              </ul>
            </section>
          ) : null}
          {result.timeWindows?.length ? (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-2">{t('resultPage.reportSections.timeWindows')}</h3>
              <div className="space-y-2">
                {result.timeWindows.map((window, idx) => (
                  <div key={idx} className="rounded-lg bg-on-surface/[0.04] p-3 text-sm">
                    <div className="text-on-surface/80">{window.period} {window.ganzhiDays ? `· ${window.ganzhiDays}` : ''}</div>
                    <p className="text-on-surface/45 text-xs mt-1">{t('resultPage.suitable')}{t('common.colon')}{window.suitable || '-'}; {t('resultPage.unsuitable')}{t('common.colon')}{window.unsuitable || '-'}</p>
                    {window.fallback && <p className="text-on-surface/35 text-xs mt-1">{t('resultPage.fallback')}{t('common.colon')}{window.fallback}</p>}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {result.counterpart_portrait && (
            <section className="border-t border-outline/5 pt-3">
              <h3 className="text-primary/90 text-sm font-medium mb-1">{t('resultPage.reportSections.counterpartPortrait')}</h3>
              <p className="text-on-surface/60 text-sm">{result.counterpart_portrait.willingness}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {result.counterpart_portrait.realConcerns?.map((item, idx) => <span key={idx} className="text-xs px-2 py-1 rounded bg-on-surface/5 text-on-surface/45">{item}</span>)}
              </div>
            </section>
          )}
        </div>
      )}
    </motion.div>
  );
}
