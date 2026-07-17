import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import type { UnifiedResult } from './resultTypes';
import { ENGINE_NAMES } from '@/lib/intentRouter';

export function InitialLiurenAlgorithmPanel({ result, question, askTime, city }: { result: UnifiedResult; question?: string; askTime?: string; city?: string }) {
  const { t } = useTranslation();
  if (result.route_type !== 'liuren') return null;

  const data: any = result.engine_data || {};
  const sizhu = data.sizhu || {};
  const fourPillars = [
    [t('resultPage.bazi.year'), sizhu.year?.full],
    [t('resultPage.bazi.month'), sizhu.month?.full],
    [t('resultPage.bazi.day'), sizhu.day?.full],
    [t('resultPage.bazi.hour'), sizhu.time?.full],
  ];
  const coreCards = [
    { label: t('resultPage.liuren.monthGeneral'), value: data.yueJiang?.full || '-' },
    { label: t('resultPage.liuren.nobleSpirit'), value: data.guiShen?.name || '-' },
    { label: t('resultPage.liuren.humanOrigin'), value: data.renYuan?.full || '-' },
    { label: t('resultPage.liuren.earthDivision'), value: data.difenName || '-' },
  ];
  const lessons = [
    data.siKe?.firstKe,
    data.siKe?.secondKe,
    data.siKe?.thirdKe,
    data.siKe?.fourthKe,
  ].filter(Boolean);
  const transmissions = [
    data.sanChuan?.shang,
    data.sanChuan?.zhong,
    data.sanChuan?.xia,
  ].filter(Boolean);
  const hasPlate = fourPillars.some(([, value]) => value) || coreCards.some((item) => item.value !== '-') || lessons.length > 0 || transmissions.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="card p-5 md:p-6 mb-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-primary text-lg md:text-xl font-semibold flex items-center gap-2">
          <Icon name="explore" size={20} />
          {t('resultPage.liuren.title')}
        </h2>
      </div>

      {question && (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-primary">
            <Icon name="help" size={16} />
            {t('resultPage.liuren.userQuestion')}
          </div>
          <p className="text-base leading-relaxed text-on-surface/85">{question}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4 md:col-span-2">
          <div className="mb-2 text-sm text-on-surface/50">{t('resultPage.currentJudgment')}</div>
          <p className="text-xl font-semibold leading-snug text-on-surface">{result.summary_line}</p>
        </div>
        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
          <div className="mb-2 text-sm text-on-surface/50">{t('resultPage.liuren.askMoment')}</div>
          <p className="text-sm leading-relaxed text-on-surface/70">
            {askTime ? askTime.replace('T', ' ').slice(0, 19) : '-'}
            {city ? <span className="block text-on-surface/40">{city}</span> : null}
          </p>
        </div>
      </div>

      {hasPlate && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {coreCards.map((item) => (
              <div key={item.label} className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4 text-center">
                <div className="text-sm text-on-surface/50 mb-2">{item.label}</div>
                <div className="text-2xl font-serif-sc font-semibold text-primary leading-tight">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
              <div className="mb-3 text-sm text-primary">{t('resultPage.bazi.fourPillars')}</div>
              <div className="grid grid-cols-2 gap-2">
                {fourPillars.map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-black/20 p-3">
                    <div className="text-xs text-on-surface/40">{label}</div>
                    <div className="mt-1 text-lg font-semibold text-on-surface">{value || '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-4">
              <div className="mb-3 text-sm text-primary">{t('resultPage.liuren.threeTransmissions')}</div>
              {transmissions.length > 0 ? (
                <div className="flex items-center gap-2">
                  {transmissions.map((item, idx) => (
                    <div key={`${item}-${idx}`} className="flex flex-1 items-center gap-2">
                      <div className="flex-1 rounded-lg bg-primary/10 p-3 text-center text-lg font-semibold text-primary">{item}</div>
                      {idx < transmissions.length - 1 && <Icon name="arrow_forward" size={16} className="text-on-surface/30" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface/45">-</p>
              )}
              {lessons.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs text-on-surface/40">{t('resultPage.liuren.fourLessons')}</div>
                  <div className="flex flex-wrap gap-2">
                    {lessons.map((item, idx) => (
                      <span key={`${item}-${idx}`} className="rounded-full bg-on-surface/5 px-3 py-1 text-sm text-on-surface/70">{item}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
