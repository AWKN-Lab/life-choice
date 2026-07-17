import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MagneticButton } from '@/components/MagneticButton';
import { BirthDateTimePicker } from '@/components/form/BirthDateTimePicker';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BottomNav } from '@/components/BottomNav';
import { trackEvent } from '@/lib/analytics';
import { useUserProfileStore } from '@/store/userProfileStore';
import '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/feedback/LoadingState';
import { GenderSelector } from '@/components/form/GenderSelector';
import { loadConsultData, saveConsultData } from '@/lib/consultDataMigration';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

export function KlineIntroPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, saveProfile } = useUserProfileStore();

  const d = new Date(); d.setFullYear(d.getFullYear() - 25);
  const [birthDate, setBirthDate] = useState(profile.birthDate || d.toISOString().slice(0, 10));
  const [birthHour, setBirthHour] = useState(profile.birthHour ?? 12);
  const [birthMinute, setBirthMinute] = useState(profile.birthMinute ?? 0);
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender ?? 'male');
  const [city, setCity] = useState(profile.city || '北京');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { trackEvent('kline_intro_view'); }, []);

  const formStartedRef = useRef(false);

  const handleSubmit = async () => {
    trackEvent('kline_intro_submit', { gender });
    trackEvent('kline_form_complete', { gender, birthDate, city });
    setIsSubmitting(true);
    saveProfile({ birthDate, birthHour, birthMinute, gender, city });

    const askTime = new Date().toISOString();
    const tempRecordId = `KLINE_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const existing: any = loadConsultData() || {};
    const preservedQuestion = existing.question || '我想生成命运K线';
    const preservedUserIntent = existing.user_intent;
    const preservedIntentCategory = existing.intent_category;

    saveConsultData({
      ...existing,
      route_type: 'zhangsheng',
      question: preservedQuestion,
      birth_date: birthDate,
      birth_hour: birthHour,
      birth_minute: birthMinute,
      gender,
      city: city || '北京',
      ask_time: askTime,
      from_home: true,
      record_id: tempRecordId,
      user_intent: preservedUserIntent,
      intent_category: preservedIntentCategory,
      source_entry: 'kline',
      unlock_status: 'preview',
    });

    await new Promise((r) => setTimeout(r, 600));
    // 战略：K线是核心差异化 → 填完八字后直接进入 K线独立页
    navigate('/kline');
  };

  const handleBack = () => { trackEvent('kline_intro_back'); navigate('/'); };

  return (
    <ErrorBoundary>
      <div className="page-container relative min-h-screen flex flex-col">
        <div className="absolute inset-0 bg-surface" />
        <div className="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-4 sm:px-6">
          <PageHeader
            onBack={handleBack}
            right={<span className="text-sm text-on-surface-variant">{t('klineIntro.step', { step: 1, total: 1 })}</span>}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="flex-1 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <Icon name="show_chart" size={20} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-on-surface">{t('klineIntro.title')}</h1>
                <p className="text-sm text-on-surface/50">{t('klineIntro.subtitle')}</p>
              </div>
            </div>

            <div className="flex-1 space-y-3.5" onFocus={() => { if (!formStartedRef.current) { formStartedRef.current = true; trackEvent('kline_form_start'); } }}>
              <div>
                <BirthDateTimePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  hour={birthHour}
                  minute={birthMinute}
                  onHourChange={setBirthHour}
                  onMinuteChange={setBirthMinute}
                  label={t('form.birthDate')}
                  timeLabel={t('form.birthTime')}
                  inlineTimeWheel
                  modalWheel={false}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-2.5">
                  <Icon name="person" size={16} className="text-amber-400" />
                  {t('form.gender')}
                </label>
                <GenderSelector value={gender} onChange={setGender} variant="amber" />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-on-surface-variant mb-2.5">
                  <Icon name="location_on" size={16} className="text-amber-400" />
                  {t('form.city')}
                </label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder={t('form.cityPlaceholder')} className="input-mystic w-full" />
              </div>

              <div className="bg-amber-400/5 border border-amber-400/10 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Icon name="info" size={18} className="text-amber-400/70 mt-0.5" />
                  <p className="text-sm text-on-surface/60 leading-relaxed">{t('klineIntro.info')}</p>
                </div>
              </div>
            </div>

            <div className="py-5 bg-surface">
              <MagneticButton onClick={handleSubmit} disabled={isSubmitting} className="w-full gold-shimmer text-on-surface font-bold py-4 rounded-xl transition-all shadow-lg">
                {isSubmitting ? (
                  <LoadingState label={t('common.loading')} />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="show_chart" size={18} filled />
                    {t('klineIntro.cta')}
                  </span>
                )}
              </MagneticButton>
            </div>
          </motion.div>
        </div>
        <BottomNav />
      </div>
    </ErrorBoundary>
  );
}
