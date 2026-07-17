import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DailyFortune from '@/components/fortune/DailyFortune';
import MonthlyFortune from '@/components/fortune/MonthlyFortune';
import YearlyFortune from '@/components/fortune/YearlyFortune';
import { consultApi } from '@/api/consult';
import { useLanguageStore } from '@/store/languageStore';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorBanner } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';

type FortuneTab = 'daily' | 'monthly' | 'yearly';

const FortunePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<FortuneTab>('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dailyData, setDailyData] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const birthDate = searchParams.get('birthDate') || '';
  const birthTime = searchParams.get('birthTime') || '';
  const gender = (searchParams.get('gender') as 'male' | 'female') || undefined;
  const birthPlace = searchParams.get('birthPlace') || '';

  const fetchDailyFortune = useCallback(async () => {
    if (!birthDate) {
      setError(t('fortune.errors.birthDateRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await consultApi.getDailyFortune({ birthDate, birthTime, gender, birthPlace, lang: currentLanguage });
      setDailyData(data);
    } catch (e: any) {
      setError(e.message || t('fortune.errors.dailyFailed'));
    } finally {
      setLoading(false);
    }
  }, [birthDate, birthTime, gender, birthPlace, currentLanguage, t]);

  const fetchMonthlyFortune = useCallback(async () => {
    if (!birthDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await consultApi.getMonthlyFortune(selectedYear, selectedMonth, { birthDate, birthTime, gender, birthPlace, lang: currentLanguage });
      setMonthlyData(data);
    } catch (e: any) {
      setError(e.message || t('fortune.errors.monthlyFailed'));
    } finally {
      setLoading(false);
    }
  }, [birthDate, birthTime, gender, birthPlace, selectedYear, selectedMonth, currentLanguage, t]);

  const fetchYearlyFortune = useCallback(async () => {
    if (!birthDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await consultApi.getYearlyFortune(selectedYear, { birthDate, birthTime, gender, birthPlace, lang: currentLanguage });
      setYearlyData(data);
    } catch (e: any) {
      setError(e.message || t('fortune.errors.yearlyFailed'));
    } finally {
      setLoading(false);
    }
  }, [birthDate, birthTime, gender, birthPlace, selectedYear, currentLanguage, t]);

  useEffect(() => {
    if (activeTab === 'daily') fetchDailyFortune();
    else if (activeTab === 'monthly') fetchMonthlyFortune();
    else if (activeTab === 'yearly') fetchYearlyFortune();
  }, [activeTab, fetchDailyFortune, fetchMonthlyFortune, fetchYearlyFortune]);

  const tabs: { key: FortuneTab; label: string; icon: string }[] = [
    { key: 'daily', label: t('fortune.tabs.daily'), icon: 'wb_sunny' },
    { key: 'monthly', label: t('fortune.tabs.monthly'), icon: 'calendar_month' },
    { key: 'yearly', label: t('fortune.tabs.yearly'), icon: 'event' },
  ];

  if (!birthDate) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
        <div className="bg-surface-container-low/50 backdrop-blur rounded-2xl p-8 max-w-md w-full text-center border border-outline/20">
          <Icon name="person_search" size={48} className="text-on-surface/40 mb-4" />
          <h2 className="text-on-surface text-lg font-bold mb-2">{t('fortune.missingBirth.title')}</h2>
          <p className="text-on-surface/50 text-sm mb-4">
            {t('fortune.missingBirth.desc')}
          </p>
          <a
            href={`${import.meta.env.BASE_URL}consult`}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dim transition-colors"
          >
            <Icon name="edit" size={16} />
            {t('fortune.missingBirth.cta')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-lg mx-auto px-4 py-6">
        <PageHeader
          title={t('fortune.title')}
          onBack={() => navigate('/life')}
        />

        <div className="flex gap-2 mb-6">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                  : 'bg-surface-container-low/50 text-on-surface-variant/60 hover:bg-surface-container-low'
              }`}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>

        {(activeTab === 'monthly' || activeTab === 'yearly') && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="bg-surface-container-low/50 text-on-surface-variant/60 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="text-on-surface font-bold text-lg flex-1 text-center">{t('fortune.yearLabel', { year: selectedYear })}</span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="bg-surface-container-low/50 text-on-surface-variant/60 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  selectedMonth === m
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low/50 text-on-surface-variant/60 hover:bg-surface-container-low'
                }`}
              >
                {t('fortune.monthLabel', { month: m })}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <LoadingState className="py-20" />
        )}

        {error && <ErrorBanner message={error} />}

        {!loading && !error && (
          <div className="space-y-4">
            {activeTab === 'daily' && dailyData && <DailyFortune fortune={dailyData} />}
            {activeTab === 'monthly' && monthlyData && <MonthlyFortune fortune={monthlyData} />}
            {activeTab === 'yearly' && yearlyData && <YearlyFortune fortune={yearlyData} />}

            {activeTab === 'daily' && !dailyData && (
              <EmptyState
                icon="wb_sunny"
                title={t('fortune.empty.daily')}
                className="bg-surface-container-low/50 rounded-xl p-8"
              />
            )}
            {activeTab === 'monthly' && !monthlyData && (
              <EmptyState
                icon="calendar_month"
                title={t('fortune.empty.monthly')}
                className="bg-surface-container-low/50 rounded-xl p-8"
              />
            )}
            {activeTab === 'yearly' && !yearlyData && (
              <EmptyState
                icon="event_note"
                title={t('fortune.empty.yearly')}
                className="bg-surface-container-low/50 rounded-xl p-8"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FortunePage;
