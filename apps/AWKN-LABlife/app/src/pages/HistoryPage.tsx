import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { consultApi } from '@/api/consult';
import type { ConsultRecordItem as ConsultRecordItemType, RecordsResponse } from '@/api/consult';
import { useAuthStore } from '@/store/authStore';
import { BottomNav } from '@/components/BottomNav';
import { RecordComparison } from '@/components/kline/RecordComparison';
import { trackEvent } from '@/lib/analytics';
import '@/lib/i18n';
import type { PersonProfile, PersonProfilesResponse } from '@/types/api';
import { Icon } from '@/components/ui/Icon';
import { ROUTE_TYPE_LABELS } from '@/constants/routeTypes';
import { useMembershipTier, type MembershipViewTier } from '@/hooks/useMembershipTier';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoginRequired } from '@/components/feedback/LoginRequired';
import { PageHeader } from '@/components/layout/PageHeader';

/** 后端 getRecords 返回的通用咨询记录（含 profileId） */
interface ConsultRecordItem {
  id: string;
  question: string;
  route_type: string;
  summary_line: string | null;
  createdAt: string;
  profileId: string | null;
}

/** 筛选 Tab 选项 */
const FILTER_TABS = [
  { key: 'all', zh: '全部', en: 'All' },
  { key: 'liuren', zh: '问事', en: 'Divination' },
  { key: 'quming', zh: '取名', en: 'Naming' },
  { key: 'kline', zh: 'K线', en: 'K-Line' },
] as const;

const ZODIAC_NAMES: Record<string, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
  '辰': '龙', '巳': '蛇', '午': '马', '未': '羊',
  '申': '猴', '酉': '鸡', '戌': '狗', '亥': '猪',
};

function getZodiac(zhi: string): string {
  return ZODIAC_NAMES[zhi] || '';
}

function formatBirthDate(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return `${match[1]}年${match[2]}月${match[3]}日`;
  }
  return dateStr;
}

function getDisplayName(profile: PersonProfile, isEnglish: boolean): string {
  if (profile.name) return profile.name;
  const yearMatch = profile.birthDate.match(/\d{4}/);
  if (yearMatch) {
    return isEnglish ? `${yearMatch[0]} Born` : `${yearMatch[0]}年 生`;
  }
  return isEnglish ? 'Unknown' : '未知';
}

function getGenderLabel(gender: string | undefined, isEnglish: boolean): string {
  if (!gender) return '';
  if (isEnglish) {
    return gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : '';
  }
  return gender === 'male' ? '男' : gender === 'female' ? '女' : '';
}

function getHistoryFollowUpPrompt(routeType: string, isEnglish: boolean): string {
  if (routeType === 'quming') {
    return isEnglish ? 'Please continue analyzing this naming direction.' : '请继续分析这个取名方向。';
  }
  if (routeType === 'ziping') {
    return isEnglish ? 'Please continue analyzing this matter based on the current destiny chart.' : '请基于当前命盘继续分析这件事。';
  }
  return isEnglish ? 'Please continue analyzing this matter.' : '请继续分析这件事。';
}

export interface ProfileRecordItem {
  id: string;
  recordId: string;
  consultationId?: string;
  question: string;
  routeType: string;
  sourceEntry?: string;
  status?: string;
  summaryLine?: string;
  createdAt: string;
  followUpCount?: number;
  shareCount?: number;
  retryCount?: number;
}

interface PersonCardProps {
  profile: PersonProfile;
  records: ProfileRecordItem[];
  isSelected: boolean;
  isExpanded: boolean;
  tier: MembershipViewTier;
  previousRecordTime?: string;
  onSelect: () => void;
  onExpand: () => void;
  onViewResult: () => void;
  selectedRecordIds: Set<string>;
  onToggleRecordSelect: (recordId: string) => void;
  onViewProfileRecord: (recordId: string) => void;
  onContinueProfileRecord: (record: ProfileRecordItem) => void;
}

function TrendIndicator({ current, previous }: { current?: string; previous?: string }) {
  const { t } = useTranslation();
  if (!current || !previous) return null;
  const cur = new Date(current).getTime();
  const prev = new Date(previous).getTime();
  if (isNaN(cur) || isNaN(prev)) return null;
  if (cur > prev) {
    return (
      <span className="flex items-center gap-0.5 text-green-400 text-xs">
        <Icon name="trending_up" size={14} />
        {t('historyPage.trendUp')}
      </span>
    );
  }
  if (cur < prev) {
    return (
      <span className="flex items-center gap-0.5 text-red-400 text-xs">
        <Icon name="trending_down" size={14} />
        {t('historyPage.trendDown')}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-on-surface/40 text-xs">
      <Icon name="trending_flat" size={14} />
      {t('historyPage.trendSteady')}
    </span>
  );
}

function PersonCard({
  profile,
  records,
  isSelected,
  isExpanded,
  tier,
  previousRecordTime,
  onSelect,
  onExpand,
  onViewResult,
  selectedRecordIds,
  onToggleRecordSelect,
  onViewProfileRecord,
  onContinueProfileRecord,
}: PersonCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEnglish = i18n.language.startsWith('en');

  const yearZhi = profile.dayPillar?.slice(1) || '';
  const zodiac = getZodiac(yearZhi);
  const displayName = getDisplayName(profile, isEnglish);
  const genderLabel = getGenderLabel(profile.gender, isEnglish);
  const birthDateDisplay = formatBirthDate(profile.birthDate);

  const pillar4 = `${profile.yearPillar || '-'}/${profile.monthPillar || '-'}/${profile.dayPillar || '-'}/${profile.hourPillar || '-'}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`card overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors"
            style={{
              borderColor: isSelected ? '#8b6914' : 'rgba(255,255,255,0.3)',
              backgroundColor: isSelected ? '#8b6914' : 'transparent',
            }}
            onClick={onSelect}
          >
            {isSelected && <Icon name="check" size={14} className="text-on-surface" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-on-surface font-medium truncate">{displayName}</span>
              {genderLabel && (
                <span className="text-on-surface/50 text-sm">{genderLabel}</span>
              )}
            </div>
            <div className="text-on-surface/40 text-xs">{birthDateDisplay}</div>
          </div>

          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-[#2a2520] to-[#1c1a18] border border-[#dacf98]/30 flex flex-col items-center justify-center">
            <span className="text-[#dacf98] text-xs font-serif-sc">四柱</span>
            <div className="text-[10px] text-on-surface/60 leading-tight mt-0.5">
              {profile.yearPillar?.slice(0, 2) || '--'}<br/>
              {profile.monthPillar?.slice(0, 2) || '--'}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-[#8b7355]/20 to-[#5c4a28]/20 border border-[#dacf98]/30 flex items-center justify-center`}>
              <span className="text-[#dacf98] text-lg">{zodiac}</span>
            </div>
            {isEnglish ? (
              <span className="text-[8px] text-on-surface/40 uppercase">Zodiac</span>
            ) : (
              <span className="text-[8px] text-on-surface/40">生肖</span>
            )}
          </div>

          <button
            onClick={onExpand}
            className="p-2 rounded-full hover:bg-on-surface/5 transition-colors"
          >
            <Icon 
              name={isExpanded ? 'expand_less' : 'expand_more'} 
              size={20} 
              className="text-on-surface/50" 
            />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-on-surface/40">
          <span className="flex items-center gap-1">
            <Icon name="schedule" size={12} />
            {profile.latestRecordTime 
              ? new Date(profile.latestRecordTime).toLocaleDateString()
              : '-'}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="library_books" size={12} />
            {profile.recordsCount} {isEnglish ? 'records' : '条记录'}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-outline/10"
          >
            {tier === 'free' && (
              <div className="p-4 bg-on-surface/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-on-surface/60 text-xs">
                    {t('historyPage.freeSummary')}
                  </span>
                </div>
                <div className="relative">
                  <div className="blur-sm pointer-events-none select-none">
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      <div className="text-center p-2 bg-on-surface/5 rounded">
                        <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Year' : '年'}</div>
                        <div className="text-sm font-serif-sc text-[#dacf98]">{profile.yearPillar || '-'}</div>
                      </div>
                      <div className="text-center p-2 bg-on-surface/5 rounded">
                        <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Month' : '月'}</div>
                        <div className="text-sm font-serif-sc text-[#dacf98]">{profile.monthPillar || '-'}</div>
                      </div>
                      <div className="text-center p-2 bg-on-surface/5 rounded">
                        <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Day' : '日'}</div>
                        <div className="text-sm font-serif-sc text-[#dacf98]">{profile.dayPillar || '-'}</div>
                      </div>
                      <div className="text-center p-2 bg-on-surface/5 rounded">
                        <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Hour' : '时'}</div>
                        <div className="text-sm font-serif-sc text-[#dacf98]">{profile.hourPillar || '-'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface/40">{isEnglish ? 'Na Yin:' : '纳音：'}</span>
                        <span className="text-on-surface/60">{profile.naYin?.day || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface/40">{isEnglish ? 'Void:' : '空亡：'}</span>
                        <span className="text-on-surface/60">{profile.kongWang?.join('、') || '-'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-on-surface/20 rounded-lg">
                    <Icon name="lock" size={24} className="text-[#dacf98]/60 mb-2" />
                    <button
                      onClick={() => navigate('/membership')}
                      className="gold-shimmer px-5 py-2 rounded-lg text-sm font-medium"
                    >
                      {t('historyPage.upgradeToView')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tier === 'monthly' && (
              <div className="p-4 bg-on-surface/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-on-surface/60 text-xs">
                    {t('historyPage.monthlyDetail')}
                  </span>
                  <button
                    onClick={onViewResult}
                    className="px-3 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-xs text-primary flex items-center gap-1 transition-colors"
                  >
                    <Icon name="visibility" size={12} />
                    {isEnglish ? 'View Latest' : '查看结果'}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Year' : '年'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.yearPillar || '-'}</div>
                  </div>
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Month' : '月'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.monthPillar || '-'}</div>
                  </div>
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Day' : '日'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.dayPillar || '-'}</div>
                  </div>
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Hour' : '时'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.hourPillar || '-'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Na Yin:' : '纳音：'}</span>
                    <span className="text-on-surface/60">{profile.naYin?.day || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Void:' : '空亡：'}</span>
                    <span className="text-on-surface/60">{profile.kongWang?.join('、') || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Longevity:' : '长生：'}</span>
                    <span className="text-on-surface/60">{profile.changSheng?.day || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Self Seat:' : '自坐：'}</span>
                    <span className="text-on-surface/60">{profile.selfSeat?.day || '-'}</span>
                  </div>
                </div>
                {profile.shenSha?.day && profile.shenSha.day.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-outline/10">
                    <span className="text-on-surface/40 text-xs">{isEnglish ? 'Spirit Stars:' : '主要神煞：'}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.shenSha.day.slice(0, 4).map((sha, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#00a07d]/10 text-[#00a07d] rounded text-xs">
                          {sha}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tier === 'yearly' && (
              <div className="p-4 bg-on-surface/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-on-surface/60 text-xs">
                      {t('historyPage.yearlyTrend')}
                    </span>
                    <TrendIndicator current={profile.latestRecordTime} previous={previousRecordTime} />
                  </div>
                  <button
                    onClick={onViewResult}
                    className="px-3 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-xs text-primary flex items-center gap-1 transition-colors"
                  >
                    <Icon name="visibility" size={12} />
                    {isEnglish ? 'View Latest' : '查看结果'}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Year' : '年'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.yearPillar || '-'}</div>
                  </div>
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Month' : '月'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.monthPillar || '-'}</div>
                  </div>
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Day' : '日'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.dayPillar || '-'}</div>
                  </div>
                  <div className="text-center p-2 bg-on-surface/5 rounded">
                    <div className="text-[10px] text-on-surface/40 mb-1">{isEnglish ? 'Hour' : '时'}</div>
                    <div className="text-sm font-serif-sc text-[#dacf98]">{profile.hourPillar || '-'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Na Yin:' : '纳音：'}</span>
                    <span className="text-on-surface/60">{profile.naYin?.day || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Void:' : '空亡：'}</span>
                    <span className="text-on-surface/60">{profile.kongWang?.join('、') || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Longevity:' : '长生：'}</span>
                    <span className="text-on-surface/60">{profile.changSheng?.day || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface/40">{isEnglish ? 'Self Seat:' : '自坐：'}</span>
                    <span className="text-on-surface/60">{profile.selfSeat?.day || '-'}</span>
                  </div>
                </div>
                {profile.shenSha?.day && profile.shenSha.day.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-outline/10">
                    <span className="text-on-surface/40 text-xs">{isEnglish ? 'Spirit Stars:' : '主要神煞：'}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {profile.shenSha.day.slice(0, 4).map((sha, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#00a07d]/10 text-[#00a07d] rounded text-xs">
                          {sha}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-outline/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface/40 text-xs">
                        {isEnglish ? 'Related records' : '关联记录'}
                      </span>
                      <span className="text-on-surface/30 text-[11px]">
                        {records.length} {isEnglish ? 'items' : '条'}
                      </span>
                    </div>
                    {records.slice(0, 6).map((record) => {
                      const routeLabel = ROUTE_TYPE_LABELS[record.routeType]?.[isEnglish ? 'en' : 'zh'] || record.routeType;
                      const selected = selectedRecordIds.has(record.id);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 rounded-lg border border-outline/10 bg-on-surface/[0.02] px-3 py-2"
                        >
                          <button
                            onClick={() => onToggleRecordSelect(record.id)}
                            className="w-4 h-4 rounded border border-outline/30 flex items-center justify-center flex-shrink-0"
                          >
                            {selected && <Icon name="check" size={12} className="text-primary" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-on-surface truncate">
                              {record.question || record.summaryLine || (isEnglish ? 'Consultation record' : '咨询记录')}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-on-surface/40 mt-1">
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {routeLabel}
                              </span>
                              <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => onViewProfileRecord(record.id)}
                            className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary text-xs hover:bg-primary/25 transition-colors"
                          >
                            {isEnglish ? 'View' : '查看'}
                          </button>
                          <button
                            onClick={() => onContinueProfileRecord(record)}
                            className="px-2.5 py-1 rounded-lg bg-[#00a07d]/15 text-[#00a07d] text-xs hover:bg-[#00a07d]/25 transition-colors"
                          >
                            {isEnglish ? 'Follow up' : '继续追问'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const isEnglish = i18n.language.startsWith('en');

  const tier = useMembershipTier();

  const [records, setRecords] = useState<ConsultRecordItem[]>([]);
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [profileRecordsMap, setProfileRecordsMap] = useState<Record<string, ProfileRecordItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTrendComparison, setShowTrendComparison] = useState(false);
  const [comparisonRecordId, setComparisonRecordId] = useState<string | null>(null);

  const normalizeRouteForFilter = (routeType?: string) => {
    if (routeType === 'ziping') return 'kline';
    return routeType || 'all';
  };

  const matchesFilter = (routeType?: string) => (
    filterType === 'all' || normalizeRouteForFilter(routeType) === filterType
  );

  const filteredRecords = records.filter((record) => matchesFilter(record.route_type));
  const profileRecordIds = new Set(Object.values(profileRecordsMap).flat().map((record) => record.id));
  const ungroupedRecords = filteredRecords.filter((record) => !profileRecordIds.has(record.id));
  const filteredProfiles = profiles.filter((profile) => {
    const profileRecords = profileRecordsMap[profile.id] || [];
    if (filterType === 'all') return profileRecords.length > 0;
    return profileRecords.some((record) => matchesFilter(record.routeType));
  });

  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [recordsData, profilesData] = await Promise.all([
        consultApi.getRecords(50, 0),
        consultApi.getPersonProfiles().catch(() => ({ profiles: [], total: 0 } as PersonProfilesResponse)),
      ]);
      // 兼容 { records: [...] } 和直接数组
      const list: ConsultRecordItem[] = (recordsData as any)?.records ?? (Array.isArray(recordsData) ? recordsData : []);
      const profileList: PersonProfile[] = Array.isArray(profilesData as any)
        ? (profilesData as any)
        : ((profilesData as any)?.profiles ?? []);

      const profileRecordsEntries = await Promise.all(
        profileList.map(async (profile) => {
          const items = await consultApi.getProfileRecords(profile.id).catch(() => []);
          return [profile.id, items] as const;
        }),
      );

      setRecords(list);
      setProfiles(profileList);
      setProfileRecordsMap(Object.fromEntries(profileRecordsEntries) as Record<string, ProfileRecordItem[]>);
    } catch (err) {
      console.error('加载咨询记录失败:', err);
      setError(isEnglish ? 'Failed to load records' : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [isEnglish, isAuthenticated]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const selectableIds = new Set([
      ...filteredRecords.map((r) => r.id),
      ...filteredProfiles.flatMap((profile) => (profileRecordsMap[profile.id] || []).map((record) => record.id)),
    ]);
    if (selectedIds.size === selectableIds.size && selectableIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setDeleting(true);
    try {
      await consultApi.deleteRecords(Array.from(selectedIds));
      trackEvent('history_batch_delete', { count: selectedIds.size });
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      await loadRecords();
    } catch (err) {
      console.error('删除失败:', err);
      toast.error(isEnglish ? 'Delete failed' : '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const viewResult = (record: ConsultRecordItem) => {
    trackEvent('history_view_result', { record_id: record.id });
    navigate(`/result/${record.id}`);
  };

  const viewResultById = (recordId: string) => {
    trackEvent('history_view_result', { record_id: recordId });
    navigate(`/result/${recordId}`);
  };

  const continueFollowUp = (recordId: string, routeType: string) => {
    const pendingFollowUpQuestion = getHistoryFollowUpPrompt(routeType, isEnglish);
    trackEvent('history_continue_followup', { record_id: recordId, route_type: routeType });
    navigate(`/result/${recordId}`, {
      state: {
        openChat: true,
        pendingFollowUpQuestion,
      },
    });
  };

  const hasSelection = selectedIds.size > 0;

  if (!hasHydrated) {
    return (
      <LoadingState fullScreen />
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginRequired
        icon="history"
        title={isEnglish ? 'Login required' : '请先登录'}
        description={isEnglish ? 'Login to view your consultation records' : '登录后查看您的咨询记录'}
      />
    );
  }

  return (
    <div className="page-container relative">
      <div className="relative z-10 px-4 sm:px-5 pt-6 pb-32 mobile-safe-top">

        <PageHeader
          title={t('history.title')}
          onBack={() => navigate(-1)}
          className="px-0 pt-0 pb-0 mb-8"
        />

        {loading && (
          <LoadingState className="py-16" />
        )}

        {error && <ErrorState message={error} onRetry={loadRecords} />}

        {!loading && !error && records.length === 0 && profiles.length === 0 && (
          <EmptyState
            icon="history"
            title={isEnglish ? 'No records yet' : '暂无咨询记录'}
            description={isEnglish ? 'Start a consultation to view your records' : '开始咨询来查看您的记录'}
            actionText={isEnglish ? 'Start Consultation' : '开始咨询'}
            onAction={() => navigate('/consult')}
          />
        )}

        {!loading && !error && (records.length > 0 || profiles.length > 0) && (
          <>
            {/* 筛选 Tab 栏 */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    filterType === tab.key
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-on-surface/5 text-on-surface/50 hover:bg-on-surface/10'
                  }`}
                >
                  {isEnglish ? tab.en : tab.zh}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-on-surface/50 text-sm">
                {filteredProfiles.length} {isEnglish ? 'profiles' : '份人物档案'} / {filteredRecords.length} {isEnglish ? 'records' : '条记录'}
              </span>
              <div className="flex items-center gap-3">
                {tier === 'yearly' && (
                  <button
                    onClick={() => {
                      const firstRecord = filteredRecords[0];
                      if (firstRecord) {
                        setComparisonRecordId(firstRecord.id);
                        setShowTrendComparison(true);
                      }
                    }}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-xs text-primary flex items-center gap-1 transition-colors"
                  >
                    <Icon name="trending_up" size={14} />
                    {t('historyPage.trendComparison')}
                  </button>
                )}
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 bg-on-surface/5 hover:bg-on-surface/10 rounded-lg text-xs text-on-surface/70 transition-colors"
                >
                  {selectedIds.size > 0 && selectedIds.size === new Set([
                    ...filteredRecords.map((r) => r.id),
                    ...filteredProfiles.flatMap((profile) => (profileRecordsMap[profile.id] || []).map((record) => record.id)),
                  ]).size
                    ? (isEnglish ? 'Deselect All' : '取消全选')
                    : (isEnglish ? 'Select All' : '全选')}
                </button>
                {hasSelection && (
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Icon name="delete" size={14} />
                    {isEnglish ? `Delete (${selectedIds.size})` : `删除 (${selectedIds.size})`}
                  </button>
                )}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <AnimatePresence>
                {filteredProfiles.map((profile, index) => {
                  const profileRecords = (profileRecordsMap[profile.id] || []).filter((record) => matchesFilter(record.routeType));
                  const selectedCount = profileRecords.filter((record) => selectedIds.has(record.id)).length;
                  const isSelected = profileRecords.length > 0 && selectedCount === profileRecords.length;
                  const isExpanded = expandedIds.has(profile.id);
                  const previousRecordTime = filteredProfiles[index + 1]?.latestRecordTime;

                  return (
                    <PersonCard
                      key={profile.id}
                      profile={profile}
                      records={profileRecords}
                      isSelected={isSelected}
                      isExpanded={isExpanded}
                      tier={tier}
                      previousRecordTime={previousRecordTime}
                      onSelect={() => {
                        const next = new Set(selectedIds);
                        const shouldSelect = !(profileRecords.length > 0 && selectedCount === profileRecords.length);
                        profileRecords.forEach((record) => {
                          if (shouldSelect) next.add(record.id);
                          else next.delete(record.id);
                        });
                        setSelectedIds(next);
                      }}
                      onExpand={() => toggleExpand(profile.id)}
                      onViewResult={() => profile.latestRecordId && viewResultById(profile.latestRecordId)}
                      selectedRecordIds={selectedIds}
                      onToggleRecordSelect={toggleSelect}
                      onViewProfileRecord={viewResultById}
                      onContinueProfileRecord={(record) => continueFollowUp(record.id, record.routeType)}
                    />
                  );
                })}

                {ungroupedRecords.map((record) => {
                  const typeInfo = ROUTE_TYPE_LABELS[record.route_type] || { zh: record.route_type, en: record.route_type, icon: 'help' };
                  const isSelected = selectedIds.has(record.id);
                  return (
                    <motion.div
                      key={record.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`card overflow-hidden transition-all duration-200 ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                            style={{
                              borderColor: isSelected ? '#8b6914' : 'rgba(255,255,255,0.3)',
                              backgroundColor: isSelected ? '#8b6914' : 'transparent',
                            }}
                            onClick={() => toggleSelect(record.id)}
                          >
                            {isSelected && <Icon name="check" size={14} className="text-on-surface" />}
                          </div>

                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-on-surface/5 flex items-center justify-center">
                            <Icon name={typeInfo.icon} size={20} className="text-on-surface/40" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-on-surface font-medium truncate">
                                {record.question || record.summary_line || (isEnglish ? 'Consultation' : '咨询记录')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-on-surface/40 text-xs">
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">
                                {isEnglish ? typeInfo.en : typeInfo.zh}
                              </span>
                              <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => viewResult(record)}
                              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-xs text-primary flex items-center gap-1 transition-colors"
                            >
                              <Icon name="visibility" size={12} />
                              {isEnglish ? 'View' : '查看'}
                            </button>
                            <button
                              onClick={() => continueFollowUp(record.id, record.route_type)}
                              className="px-3 py-1.5 bg-[#00a07d]/15 hover:bg-[#00a07d]/25 border border-[#00a07d]/30 rounded-lg text-xs text-[#00a07d] flex items-center gap-1 transition-colors"
                            >
                              <Icon name="chat" size={12} />
                              {isEnglish ? 'Follow up' : '继续追问'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {filteredRecords.length === 0 && records.length > 0 && (
              <EmptyState
                icon="filter_list_off"
                title={isEnglish ? 'No profiles or records match this filter' : '该筛选条件下无人物或记录'}
                className="py-12"
              />
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {deleteConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-on-surface/60 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-container-high rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Icon name="warning" size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-on-surface font-medium">
                    {isEnglish ? 'Confirm Delete' : '确认删除'}
                  </h3>
                  <p className="text-on-surface/50 text-sm">
                    {isEnglish 
                      ? `Delete ${selectedIds.size} record(s)? This cannot be undone.`
                      : `确定删除 ${selectedIds.size} 条记录？此操作不可撤销。`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 py-2.5 bg-on-surface/10 hover:bg-on-surface/20 rounded-lg text-on-surface/70 text-sm transition-colors"
                  disabled={deleting}
                >
                  {isEnglish ? 'Cancel' : '取消'}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-on-surface text-sm transition-colors"
                  disabled={deleting}
                >
                  {deleting 
                    ? (isEnglish ? 'Deleting...' : '删除中...')
                    : (isEnglish ? 'Delete' : '删除')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTrendComparison && comparisonRecordId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-on-surface/80 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowTrendComparison(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-[#1c2026] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#1c2026] z-10 flex items-center justify-between p-4 border-b border-outline/20">
                <h3 className="text-on-surface font-medium">{t('historyPage.trendComparison')}</h3>
                <button
                  onClick={() => setShowTrendComparison(false)}
                  className="p-1 rounded-full hover:bg-on-surface/10 transition-colors"
                >
                  <Icon name="close" size={20} className="text-on-surface/60" />
                </button>
              </div>
              <div className="p-4">
                <RecordComparison recordId={comparisonRecordId} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
