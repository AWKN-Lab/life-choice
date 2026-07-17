import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../result/Icon';
import { consultApi, type ConsultRecordItem } from '@/api/consult';

type ReviewStatus = 'pending' | 'verified' | 'expired';

interface HistoryReviewProps {
  currentRecordId?: string;
}

interface HistoryItem {
  id: string;
  question: string;
  date: string;
  status: ReviewStatus;
  prediction?: string | null;
  actualOutcome?: string;
}

const REVIEWABLE_ROUTE_TYPES = new Set(['liuren', 'liuyao', 'qimen', 'ziping']);

export function HistoryReview({ currentRecordId }: HistoryReviewProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<ConsultRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingOutcome, setEditingOutcome] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await consultApi.getRecords(20, 0);
      setRecords((res.records || []).filter((record) => REVIEWABLE_ROUTE_TYPES.has(record.route_type)));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const historyItems: HistoryItem[] = useMemo(() => {
    return records
      .filter((record) => record.id !== currentRecordId)
      .slice(0, 10)
      .map((record) => ({
        id: record.id,
        question: record.question || t('resultPage.questionAnnual.historyReview.noQuestion'),
        date: new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        status: (record.reviewStatus || 'pending') as ReviewStatus,
        prediction: record.summary_line,
        actualOutcome: record.closed_loop_result?.actualOutcome || '',
      }));
  }, [records, currentRecordId, t]);

  const statusConfig: Record<ReviewStatus, { label: string; color: string; bgColor: string }> = {
    pending: {
      label: t('resultPage.questionAnnual.historyReview.statusPending'),
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    verified: {
      label: t('resultPage.questionAnnual.historyReview.statusVerified'),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    expired: {
      label: t('resultPage.questionAnnual.historyReview.statusExpired'),
      color: 'text-on-surface/40',
      bgColor: 'bg-on-surface/5 border-outline/10',
    },
  };

  const handleAddOutcome = async (id: string) => {
    if (!outcomeText.trim()) return;
    setSavingId(id);
    try {
      const response = await consultApi.saveClosedLoopResult(id, {
        actualOutcome: outcomeText.trim(),
      });
      setRecords((prev) =>
        prev.map((record) =>
          record.id === id
            ? {
                ...record,
                reviewStatus: response.reviewStatus,
                closed_loop_result: response.closed_loop_result,
              }
            : record
        )
      );
      setEditingOutcome(null);
      setOutcomeText('');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <Icon name="history" size={28} className="text-on-surface/20 mx-auto mb-2" />
        <p className="text-on-surface/40 text-sm">{t('common.loading', { defaultValue: '加载中...' })}</p>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="text-center py-6">
        <Icon name="history" size={28} className="text-on-surface/20 mx-auto mb-2" />
        <p className="text-on-surface/40 text-sm">{t('resultPage.questionAnnual.historyReview.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {historyItems.map((item) => {
        const config = statusConfig[item.status];
        return (
          <div key={item.id} className="rounded-lg border border-outline/[0.06] bg-on-surface/[0.02] overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-on-surface/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${config.bgColor} ${config.color} shrink-0`}>
                  {config.label}
                </span>
                <span className="text-on-surface/70 text-sm truncate">{item.question}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-on-surface/30 text-xs">{item.date}</span>
                <Icon
                  name={expandedId === item.id ? 'expand_less' : 'expand_more'}
                  size={16}
                  className="text-on-surface/30"
                />
              </div>
            </button>

            <AnimatePresence>
              {expandedId === item.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 pb-3 space-y-2"
                >
                  {item.prediction && (
                    <div className="rounded-lg bg-on-surface/[0.03] p-2.5">
                      <span className="text-on-surface/40 text-xs">{t('resultPage.questionAnnual.historyReview.prediction')}</span>
                      <p className="text-on-surface/60 text-sm mt-1">{item.prediction}</p>
                    </div>
                  )}
                  {item.actualOutcome ? (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2.5">
                      <span className="text-emerald-400/60 text-xs">{t('resultPage.questionAnnual.historyReview.actualOutcome')}</span>
                      <p className="text-on-surface/60 text-sm mt-1">{item.actualOutcome}</p>
                    </div>
                  ) : (
                    <div>
                      {editingOutcome === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={outcomeText}
                            onChange={(e) => setOutcomeText(e.target.value)}
                            placeholder={t('resultPage.questionAnnual.historyReview.outcomePlaceholder')}
                            className="w-full rounded-lg border border-outline/10 bg-on-surface/[0.04] px-3 py-2 text-sm text-on-surface/80 placeholder:text-on-surface/30 focus:outline-none focus:border-primary/40 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => void handleAddOutcome(item.id)}
                              disabled={savingId === item.id}
                              className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
                            >
                              {savingId === item.id
                                ? t('common.loading', { defaultValue: '加载中...' })
                                : t('resultPage.questionAnnual.historyReview.saveOutcome')}
                            </button>
                            <button
                              onClick={() => { setEditingOutcome(null); setOutcomeText(''); }}
                              className="px-3 py-1.5 rounded-lg bg-on-surface/5 text-on-surface/50 text-xs hover:bg-on-surface/10 transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingOutcome(item.id)}
                          className="flex items-center gap-1.5 text-primary/70 text-xs hover:text-primary transition-colors"
                        >
                          <Icon name="add_circle_outline" size={14} />
                          {t('resultPage.questionAnnual.historyReview.addOutcome')}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
