import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Icon } from '../result/Icon';
import type { UnifiedResult } from '../result/resultTypes';

interface MajorDecisionAnalysisProps {
  result: UnifiedResult;
}

export function MajorDecisionAnalysis({ result }: MajorDecisionAnalysisProps) {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>('prosCons');

  const sections = [
    {
      id: 'prosCons',
      icon: 'compare_arrows',
      title: t('resultPage.questionAnnual.majorDecision.prosCons'),
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <h5 className="text-emerald-400 text-xs font-medium mb-2">{t('resultPage.questionAnnual.majorDecision.pros')}</h5>
            <ul className="space-y-1">
              {(result.actions || []).slice(0, 3).map((action, i) => (
                <li key={i} className="text-on-surface/60 text-xs flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">+</span>{action}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <h5 className="text-red-400 text-xs font-medium mb-2">{t('resultPage.questionAnnual.majorDecision.cons')}</h5>
            <ul className="space-y-1">
              {(result.risks || []).slice(0, 3).map((risk, i) => (
                <li key={i} className="text-on-surface/60 text-xs flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5">-</span>{risk}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'timing',
      icon: 'schedule',
      title: t('resultPage.questionAnnual.majorDecision.timing'),
      content: (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-on-surface/70 text-sm leading-relaxed">{result.time_window || t('resultPage.questionAnnual.majorDecision.noTimingData')}</p>
        </div>
      ),
    },
    {
      id: 'keyVariables',
      icon: 'tune',
      title: t('resultPage.questionAnnual.majorDecision.keyVariables'),
      content: (
        <div className="space-y-2">
          {(result.keySignals || [t('resultPage.questionAnnual.majorDecision.noVariableData')]).map((signal, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-on-surface/[0.03] p-2.5">
              <span className="text-primary text-xs mt-0.5 font-mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-on-surface/60 text-xs leading-relaxed">{signal}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'worstCase',
      icon: 'shield',
      title: t('resultPage.questionAnnual.majorDecision.worstCase'),
      content: (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-on-surface/70 text-sm leading-relaxed">
            {result.decisionAudit?.safetyMargin || t('resultPage.questionAnnual.majorDecision.noWorstCaseData')}
          </p>
        </div>
      ),
    },
    {
      id: 'recommendation',
      icon: 'psychology', // 概念图标（非张半山），与同文件其他 4 个 section 的 compare_arrows/schedule/tune/shield 保持统一。P1-1 cleanup intentionally retained.
      title: t('resultPage.questionAnnual.majorDecision.recommendation'),
      content: (
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary text-xs font-medium">{t('resultPage.questionAnnual.majorDecision.confidence')}</span>
            <div className="flex-1 h-1.5 bg-on-surface/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '72%' }} />
            </div>
            <span className="text-primary text-xs font-medium">72%</span>
          </div>
          <p className="text-on-surface/80 text-sm leading-relaxed">
            {result.action_strategy || result.one_line_conclusion || result.summary_line}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.id} className="rounded-lg border border-outline/[0.06] bg-on-surface/[0.02] overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-on-surface/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Icon name={section.icon} size={16} className="text-primary" />
              <span className="text-on-surface/80 text-sm font-medium">{section.title}</span>
            </div>
            <Icon
              name={expandedSection === section.id ? 'expand_less' : 'expand_more'}
              size={18}
              className="text-on-surface/40"
            />
          </button>
          {expandedSection === section.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="px-3 pb-3"
            >
              {section.content}
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}
