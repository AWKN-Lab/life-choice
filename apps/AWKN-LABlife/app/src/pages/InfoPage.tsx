import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useConsultStore } from '@/store/consultStore';
import { MagneticButton } from '@/components/MagneticButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { BottomNav } from '@/components/BottomNav';
import '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/feedback/LoadingState';
import { saveConsultData } from '@/lib/consultDataMigration';
import { ErrorBanner } from '@/components/feedback/ErrorState';
import { getDefaultAskTime } from '@/lib/datetime';
import { PageHeader } from '@/components/layout/PageHeader';
import { GenderSelector } from '@/components/form/GenderSelector';

const YEARS = Array.from({ length: 70 }, (_, i) => 1955 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
/** 根据年份和月份获取当月天数 */
const getDaysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function InfoContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    routeResponse,
    consultType,
    divinationInfo,
    destinyInfo,
    isAnalyzing,
    error,
    setDivinationInfo,
    setDestinyInfo,
    submitInfo,
    clearError,
  } = useConsultStore();

  const [step, setStep] = useState(1);

  const [birthForm, setBirthForm] = useState({
    year: 1995,
    month: 6,
    day: 15,
    hour: 12,
    isLunar: false,
    gender: 'male' as 'male' | 'female',
  });

  /** 断事表单数据 */
  interface DivinationForm {
    ask_time: string;
    ask_location: string;
  }

  // 断事推演默认使用当前时间

  // 页面加载时自动填入当前时间
  const [divinationForm, setDivinationForm] = useState<DivinationForm>({
    ask_time: getDefaultAskTime(),
    ask_location: '',
  });

  const requiredFields = routeResponse?.required_fields || [];
  const routeType = routeResponse?.route_type;

  if (!routeResponse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <p className="text-on-surface-variant/60 mb-4">{t('infoPage.missingRoute')}</p>
        <MagneticButton
          onClick={() => navigate('/consult')}
          className="px-5 py-2 gold-shimmer rounded-lg text-sm font-semibold"
        >
          {t('infoPage.backToAsk')}
        </MagneticButton>
      </div>
    );
  }

  const handleSubmitStep1 = () => {
    setStep(2);
  };

  const handleBackToEdit = () => {
    setStep(1);
  };

  const handleSubmitFinal = async () => {
    if (routeType === 'liuren') {
      setDivinationInfo({
        ask_time: divinationForm.ask_time || `${new Date().toISOString().slice(0, 16)}`,
        ask_location: divinationForm.ask_location || '',
      });
    } else if (routeType === 'ziping') {
      setDestinyInfo({
        birth_date: `${birthForm.year}-${String(birthForm.month).padStart(2, '0')}-${String(birthForm.day).padStart(2, '0')}`,
        birth_time: `${String(birthForm.hour).padStart(2, '0')}:00`,
        birth_location: '',
      });
    }

    try {
      await submitInfo();

      // 补充信息后同步写入 Zustand + sessionStorage，供 ResultPage 使用
      saveConsultData(
        routeType === 'liuren' ? {
          ask_time: divinationForm.ask_time || `${new Date().toISOString().slice(0, 16)}`,
          ask_location: divinationForm.ask_location || '',
        } : {
          birth_date: `${birthForm.year}-${String(birthForm.month).padStart(2, '0')}-${String(birthForm.day).padStart(2, '0')}`,
          birth_time: `${String(birthForm.hour).padStart(2, '0')}:00`,
          birth_location: '',
        }
      );

      navigate('/result');
    } catch (e) {
      console.error('Submit info failed:', e);
      const msg = e instanceof Error ? e.message : t('form.error.failed');
      toast.error(msg);
    }
  };

  const pageTitle =
    routeType === 'liuren'
      ? t('infoPage.pageTitles.liuren')
      : routeType === 'ziping'
        ? t('infoPage.pageTitles.ziping')
        : t('infoPage.pageTitles.default');

  const pageSubtitle =
    routeType === 'liuren'
      ? t('infoPage.pageSubtitles.liuren')
      : routeType === 'ziping'
        ? t('infoPage.pageSubtitles.ziping')
        : t('infoPage.pageSubtitles.default');

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto px-4 pt-8 pb-28">
        {/* Header */}
        <PageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          onBack={() => navigate(-1)}
        />

        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-primary' : 'bg-on-surface/10'}`} />
          <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-primary' : 'bg-on-surface/10'}`} />
        </div>

        {error && <ErrorBanner message={error} onClose={clearError} className="mb-4" />}

        {/* Step 1: Input */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            {routeType === 'ziping' && (
              <>
                {/* 日历类型 */}
                <div>
                  <label className="block text-sm text-on-surface-variant/70 mb-2.5">{t('infoPage.calendarType')}</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setBirthForm((p) => ({ ...p, isLunar: false }))}
                      className={`flex-1 py-3.5 px-5 rounded-xl border transition-all ${
                        !birthForm.isLunar
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline/30 text-on-surface-variant/60 hover:border-outline/50'
                      }`}
                    >
                      <Icon name="calendar_month" size={20} className="mx-auto mb-1" />
                      <span className="text-xs font-medium">{t('infoPage.solar')}</span>
                    </button>
                    <button
                      onClick={() => setBirthForm((p) => ({ ...p, isLunar: true }))}
                      className={`flex-1 py-3.5 px-5 rounded-xl border transition-all ${
                        birthForm.isLunar
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-outline/30 text-on-surface-variant/60 hover:border-outline/50'
                      }`}
                    >
                      <Icon name="calendar_month" size={20} className="mx-auto mb-1" />
                      <span className="text-xs font-medium">{t('infoPage.lunar')}</span>
                    </button>
                  </div>
                </div>

                {/* 出生日期 */}
                <div>
                  <label className="block text-sm text-on-surface-variant/70 mb-2.5">{t('infoPage.birthDate')}</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <select
                      value={birthForm.year}
                      onChange={(e) => setBirthForm((p) => ({ ...p, year: parseInt(e.target.value) }))}
                      className="select-mystic"
                    >
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{t('infoPage.dateParts.year', { value: y })}</option>
                      ))}
                    </select>
                    <select
                      value={birthForm.month}
                      onChange={(e) => setBirthForm((p) => ({ ...p, month: parseInt(e.target.value) }))}
                      className="select-mystic"
                    >
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{t('infoPage.dateParts.month', { value: m })}</option>
                      ))}
                    </select>
                    <select
                      value={birthForm.day}
                      onChange={(e) => setBirthForm((p) => ({ ...p, day: parseInt(e.target.value) }))}
                      className="select-mystic"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{t('infoPage.dateParts.day', { value: d })}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 出生时间 */}
                <div>
                  <label className="block text-sm text-on-surface-variant/70 mb-2.5">{t('infoPage.birthTime')}</label>
                  <select
                    value={birthForm.hour}
                    onChange={(e) => setBirthForm((p) => ({ ...p, hour: parseInt(e.target.value) }))}
                    className="select-mystic w-full"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>

                {/* 性别 */}
                <div>
                  <label className="block text-sm text-on-surface-variant/70 mb-2.5">{t('infoPage.gender')}</label>
                  <GenderSelector
                    value={birthForm.gender}
                    onChange={(g) => setBirthForm((p) => ({ ...p, gender: g }))}
                    variant="primary"
                  />
                </div>
              </>
            )}

            {routeType === 'liuren' && (
              <>
                {/* 问事时间 - 断事推演可手动修改，默认使用当前时间 */}
                <div>
                  <label className="block text-sm text-on-surface-variant/70 mb-2.5">
                    {t('infoPage.askTime')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={divinationForm.ask_time}
                      onChange={(e) => setDivinationForm((p) => ({ ...p, ask_time: e.target.value }))}
                      className="input-mystic flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setDivinationForm((p) => ({ ...p, ask_time: getDefaultAskTime() }))}
                      className="px-3 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all text-sm shrink-0"
                      title={t('infoPage.useCurrentTime')}
                    >
                      <Icon name="schedule" size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-on-surface-variant/40 mt-1.5">
                    {t('infoPage.askTimeHint')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-on-surface-variant/70 mb-2.5">{t('infoPage.askLocation')}</label>
                  <input
                    type="text"
                    value={divinationForm.ask_location}
                    onChange={(e) => setDivinationForm((p) => ({ ...p, ask_location: e.target.value }))}
                    placeholder={t('infoPage.askLocationPlaceholder')}
                    className="input-mystic w-full"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleSubmitStep1}
              className="gold-shimmer w-full mt-4 py-4 rounded-xl font-semibold"
            >
              {t('infoPage.nextStep')}
            </button>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-surface-container-low/50 rounded-xl p-5 border border-outline/20 space-y-3">
              <h4 className="text-on-surface font-semibold text-base mb-3">{t('infoPage.confirmTitle')}</h4>

              {routeType === 'ziping' ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-on-surface-variant/60">{t('infoPage.confirmLabels.calendarType')}</span>
                    <span className="text-on-surface ml-1">{birthForm.isLunar ? t('infoPage.lunar') : t('infoPage.solar')}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">{t('infoPage.confirmLabels.gender')}</span>
                    <span className="text-on-surface ml-1">{birthForm.gender === 'male' ? t('infoPage.male') : t('infoPage.female')}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">{t('infoPage.confirmLabels.birthDate')}</span>
                    <span className="text-on-surface ml-1">{t('infoPage.dateParts.full', {
                      year: birthForm.year,
                      month: birthForm.month,
                      day: birthForm.day,
                    })}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">{t('infoPage.confirmLabels.birthTime')}</span>
                    <span className="text-on-surface ml-1">{String(birthForm.hour).padStart(2, '0')}:00</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-on-surface-variant/60">{t('infoPage.confirmLabels.askTime')}</span>
                    <span className="text-primary ml-1">
                      {divinationForm.ask_time
                        ? divinationForm.ask_time.replace('T', ' ')
                        : t('infoPage.confirmLabels.currentTime')}
                    </span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant/60">{t('infoPage.confirmLabels.askLocation')}</span>
                    <span className="text-on-surface ml-1">{divinationForm.ask_location || t('infoPage.confirmLabels.notFilled')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 text-sm text-on-surface-variant/60 p-4 bg-surface-container-low/30 rounded-xl border border-outline/10">
              <Icon name="auto_awesome" size={16} className="text-primary shrink-0 mt-0.5" />
              <p>
                {t('infoPage.privacyNote')}
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBackToEdit}
                className="flex-1 py-4 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all font-semibold"
                disabled={isAnalyzing}
              >
                {t('infoPage.backToEdit')}
              </button>
              <button
                onClick={handleSubmitFinal}
                className="gold-shimmer flex-1 py-4 rounded-xl font-semibold"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <LoadingState label={t('infoPage.analyzing')} />
                ) : (
                  t('infoPage.startAnalyze')
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function InfoPage() {
  return (
    <ErrorBoundary>
      <InfoContent />
      <BottomNav />
    </ErrorBoundary>
  );
}
