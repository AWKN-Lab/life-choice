import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { consultApi } from '@/api/consult';
import { Icon } from '@/components/result/Icon';

interface KlineRecordSummary {
  recordId: string;
  createdAt: string;
  question: string;
  klineData?: {
    points: { age: number; score: number }[];
  };
}

interface ComparisonRow {
  age: number;
  scores: (number | null)[];
  delta: number | null;
  isDiverge: boolean;
}

interface Props {
  recordId: string;
}

export function RecordComparison({ recordId }: Props) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<KlineRecordSummary[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const result = await consultApi.getRecords(20, 0) as any;
        const items: KlineRecordSummary[] = (result.records || result || [])
          .filter((r: any) => r.type === 'ziping' || r.route_type === 'ziping')
          .map((r: any) => ({
            recordId: r.id || r.record_id,
            createdAt: r.created_at || r.createdAt || '',
            question: r.question || '',
            klineData: r.module_content?.kline
              ? {
                  points: (r.module_content.kline.yearData || r.module_content.kline.chartData || [])
                    .filter((p: any) => typeof p.age === 'number')
                    .map((p: any) => ({ age: p.age, score: p.score })),
                }
              : undefined,
          }))
          .filter((r: KlineRecordSummary) => r.recordId !== recordId);

        setRecords(items);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [recordId]);

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= 2) return [prev[1], idx];
      return [...prev, idx];
    });
  };

  const comparisonRows = useMemo((): ComparisonRow[] => {
    if (selected.length < 2) return [];
    const dataA = records[selected[0]]?.klineData?.points || [];
    const dataB = records[selected[1]]?.klineData?.points || [];
    if (dataA.length === 0 || dataB.length === 0) return [];

    const mapA = new Map(dataA.map((p) => [p.age, p.score]));
    const mapB = new Map(dataB.map((p) => [p.age, p.score]));
    const allAges = new Set([...mapA.keys(), ...mapB.keys()]);

    return Array.from(allAges)
      .sort((a, b) => a - b)
      .map((age) => {
        const scoreA = mapA.get(age) ?? null;
        const scoreB = mapB.get(age) ?? null;
        const delta = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;
        return {
          age,
          scores: [scoreA, scoreB],
          delta,
          isDiverge: delta !== null && Math.abs(delta) >= 15,
        };
      });
  }, [selected, records]);

  const miniChartData = useMemo(() => {
    if (selected.length < 2) return { a: [], b: [] };
    return {
      a: records[selected[0]]?.klineData?.points || [],
      b: records[selected[1]]?.klineData?.points || [],
    };
  }, [selected, records]);

  const chartBounds = useMemo(() => {
    const all = [...miniChartData.a, ...miniChartData.b].map((p) => p.score);
    if (all.length === 0) return { min: 0, max: 100, range: 100 };
    const min = Math.min(...all);
    const max = Math.max(...all);
    return { min, max, range: max - min || 1 };
  }, [miniChartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-6">
        <Icon name="folder_off" size={24} className="text-on-surface/30 mx-auto mb-2" />
        <p className="text-on-surface/40 text-sm">{t('resultPage.destinyKline.annual.recordComparison.noRecords')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-on-surface/60 text-xs font-medium mb-2">
          {t('resultPage.destinyKline.annual.recordComparison.selectRecords')}
        </h5>
        <div className="space-y-2">
          {records.map((rec, idx) => (
            <button
              key={rec.recordId}
              onClick={() => toggleSelect(idx)}
              className={`w-full text-left rounded-xl border p-3 transition-all ${
                selected.includes(idx)
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-outline/[0.08] bg-on-surface/[0.02] hover:bg-on-surface/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  selected.includes(idx) ? 'border-primary bg-primary/20' : 'border-outline/20'
                }`}>
                  {selected.includes(idx) && <Icon name="check" size={12} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface/70 text-sm truncate">{rec.question || rec.recordId}</p>
                  <p className="text-on-surface/30 text-xs">{rec.createdAt}</p>
                </div>
                {!rec.klineData && (
                  <span className="text-on-surface/20 text-xs">{t('resultPage.destinyKline.annual.recordComparison.noKlineData')}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected.length === 2 && (
        <button
          onClick={() => setShowComparison(true)}
          className="w-full py-2.5 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors flex items-center justify-center gap-2"
        >
          <Icon name="compare" size={16} />
          {t('resultPage.destinyKline.annual.recordComparison.compare')}
        </button>
      )}

      {showComparison && comparisonRows.length > 0 && (
        <div className="space-y-4">
          <div className="bg-on-surface/[0.04] rounded-xl p-4">
            <svg viewBox="0 0 300 80" className="w-full h-20" preserveAspectRatio="none">
              {miniChartData.a.length > 1 && (
                <polyline
                  fill="none"
                  stroke="rgba(245,158,11,0.8)"
                  strokeWidth="2"
                  points={miniChartData.a
                    .map((d, i) => {
                      const x = (i / (miniChartData.a.length - 1)) * 300;
                      const y = 70 - ((d.score - chartBounds.min) / chartBounds.range) * 60;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
              {miniChartData.b.length > 1 && (
                <polyline
                  fill="none"
                  stroke="rgba(99,102,241,0.8)"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                  points={miniChartData.b
                    .map((d, i) => {
                      const x = (i / (miniChartData.b.length - 1)) * 300;
                      const y = 70 - ((d.score - chartBounds.min) / chartBounds.range) * 60;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              )}
            </svg>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-amber-400" />
                <span className="text-on-surface/40 text-xs">{records[selected[0]]?.question?.slice(0, 10) || 'A'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-indigo-400" style={{ borderTop: '2px dashed rgba(99,102,241,0.8)' }} />
                <span className="text-on-surface/40 text-xs">{records[selected[1]]?.question?.slice(0, 10) || 'B'}</span>
              </div>
            </div>
          </div>

          <div className="bg-on-surface/[0.04] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10">
                  <th className="text-left text-on-surface/40 text-xs font-medium px-3 py-2">{t('resultPage.destinyKline.annual.recordComparison.ageCol')}</th>
                  <th className="text-center text-amber-400/70 text-xs font-medium px-3 py-2">A</th>
                  <th className="text-center text-indigo-400/70 text-xs font-medium px-3 py-2">B</th>
                  <th className="text-center text-on-surface/40 text-xs font-medium px-3 py-2">{t('resultPage.destinyKline.annual.recordComparison.delta')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows
                  .filter((row) => row.scores[0] !== null || row.scores[1] !== null)
                  .map((row) => (
                    <tr
                      key={row.age}
                      className={`border-b border-outline/[0.04] ${
                        row.isDiverge ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 text-on-surface/60 text-xs">
                        {row.age}{t('resultPage.destinyKline.annual.recordComparison.ageSuffix')}
                        {row.isDiverge && (
                          <span className="ml-1 text-rose-400 text-[10px]">
                            {t('resultPage.destinyKline.annual.recordComparison.divergeYear')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center text-amber-300/70 text-xs">
                        {row.scores[0] ?? '-'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-indigo-300/70 text-xs">
                        {row.scores[1] ?? '-'}
                      </td>
                      <td className={`px-3 py-1.5 text-center text-xs ${
                        row.delta === null ? 'text-on-surface/20' :
                        row.delta > 0 ? 'text-emerald-400' :
                        row.delta < 0 ? 'text-rose-400' :
                        'text-on-surface/40'
                      }`}>
                        {row.delta !== null ? (row.delta > 0 ? '+' : '') + row.delta : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
