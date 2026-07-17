import { toast } from 'sonner';
import { Fragment, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { consultApi } from '@/api/consult';
import { feedbackApi, type AdminFeedbackRecord } from '@/api/feedback';
import { KlineV2AdminSection } from '@/components/admin/KlineV2AdminSection';
import { useAuthStore } from '@/store/authStore';
import { LoginRequired } from '@/components/feedback/LoginRequired';
import {
  getBenchmarkHistory,
  getBenchmarkRunById,
  getBenchmarkCategories,
  runBenchmark,
  type BenchmarkRunResult,
  type BenchmarkResultItem,
} from '@/api/benchmark';
import { BenchmarkRadarChart } from '@/components/benchmark/RadarChart';
// S3/S5 (2026-07-06): recharts 用于趋势折线图
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface OverviewStats {
  totalUsers: number;
  totalPageVisits: number;
  totalActivities: number;
  totalConsultRecords: number;
  todayPageVisits: number;
  todayActivities: number;
  todayConsultRecords: number;
  // S1 (2026-07-06): UV 字段
  totalUV?: number;
  todayUV?: number;
}

// S2 (2026-07-06): 漏斗数据
interface FunnelStep {
  activityType: string;
  pv: number;
  uv: number;
  conversionRate: number;
  stepIndex: number;
}
interface FunnelData {
  totalEvents: number;
  steps: FunnelStep[];
}

// S4 (2026-07-06): 趋势 & 复玩
interface TrendPoint {
  date: string;
  pv: number;
  uv: number;
}
interface TrendData {
  days: number;
  data: TrendPoint[];
}
interface RetentionData {
  totalUsers: number;
  returningUsers: number;
  newUsers: number;
  retentionRate: number;
}

interface OperatingMetric {
  key: string;
  label: string;
  value: number | null;
  unit: 'count' | 'percent';
  numerator: number | null;
  denominator: number | null;
  definition: string;
  target: number | null;
  availability: 'measured' | 'unavailable';
}

interface OperatingDashboardData {
  window: { days: number; startAt: string; endAt: string; timezone: string };
  metrics: OperatingMetric[];
}

interface PageVisit {
  id: string;
  pageName: string;
  pageUrl: string;
  referrer: string;
  deviceInfo: string;
  screenSize: string;
  createdAt: string;
}

interface Activity {
  id: string;
  activityType: string;
  activityData: string;
  createdAt: string;
}

interface ConsultRecord {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userNickname: string | null;
  question: string;
  routeType: string;
  status: string;
  createdAt: string;
  reviewStatus?: 'pending' | 'verified' | 'expired';
  closedLoopResult?: { actualOutcome?: string } | null;
}

interface InteractionEventRecord {
  id: string;
  userId: string | null;
  sessionId: string | null;
  recordId: string | null;
  eventType: string;
  eventData?: Record<string, unknown>;
  createdAt: string;
}

interface AssetLooseRecord {
  id: string;
  userId: string | null;
  sessionId: string | null;
  question: string;
  routeType: string;
  status: string;
  summaryLine?: string | null;
  createdAt: string;
  profilesCount: number;
  reasonLabel?: string;
  reasonHint?: string;
  actionHint?: string;
}

interface AssetCreateDraft {
  name: string;
  birthDate: string;
  birthTime: string;
  gender: string;
  birthPlace: string;
}

function deriveLooseRecordMeta(detail: any): {
  reasonLabel: string;
  reasonHint: string;
  actionHint: string;
} {
  const inputData = detail?.inputData || {};
  const routeType = detail?.routeType || '';
  const sourceEntry = detail?.sourceEntry || '';
  const questionIntent = detail?.questionIntent || '';

  const birthDate = inputData.birthDate || inputData.birth_date;
  const birthTime = inputData.birthTime || inputData.birth_time;
  const gender = inputData.gender;
  const name = inputData.name || inputData.userName || inputData.subjectName;

  if (!birthDate && !birthTime && !gender && !name) {
    return {
      reasonLabel: '纯问事记录',
      reasonHint: `该记录以 ${routeType || sourceEntry || '咨询'} 为主，没有形成可归档的人物基础信息。`,
      actionHint: '如需沉淀人物资产，后续追问时补充姓名、生日、时辰或关系身份。',
    };
  }

  if (!birthDate || !gender) {
    return {
      reasonLabel: '身份信息不完整',
      reasonHint: '记录中已有部分人物信息，但缺少生日或性别，暂时无法稳定归档。',
      actionHint: '补齐生日和性别后，再进行重绑或合并档案。',
    };
  }

  if (!birthTime) {
    return {
      reasonLabel: '缺少出生时辰',
      reasonHint: '已具备生日与性别，但缺少出生时辰，档案可信度不足，因此没有自动沉淀。',
      actionHint: '建议回访补充时辰，补齐后再归档到人物画像。',
    };
  }

  if (questionIntent || sourceEntry === 'question' || ['liuren', 'qimen', 'liuyao', 'meihua'].includes(routeType)) {
    return {
      reasonLabel: '以事项为核心',
      reasonHint: '这条咨询更像“事”的记录，而不是“人”的命盘记录，所以没有自动挂到人物档案。',
      actionHint: '如果这件事长期围绕同一人物，可手动重绑到目标档案。',
    };
  }

  return {
    reasonLabel: '待人工归档',
    reasonHint: '记录具备部分建档要素，但当前规则没有自动挂档。',
    actionHint: '管理员可直接查看详情后手动重绑，或后续补充资料再归档。',
  };
}

function renderReviewBadge(status?: 'pending' | 'verified' | 'expired') {
  const normalized = status || 'pending';
  const map = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    verified: 'bg-green-500/10 text-green-400',
    expired: 'bg-gray-500/10 text-on-surface-variant/60',
  } as const;
  const labelMap = {
    pending: '待回看',
    verified: '已回看',
    expired: '已过期',
  } as const;
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${map[normalized]}`}>
      {labelMap[normalized]}
    </span>
  );
}

const FEEDBACK_TAG_OPTIONS = [
  { value: 'scenario_misclass', label: '场景判断有误' },
  { value: 'agent_unfit', label: '专家不匹配' },
  { value: 'tone_off', label: '语气不当' },
  { value: 'evidence_insufficient', label: '证据不足' },
  { value: 'cost_missing', label: '缺少代价提醒' },
  { value: 'other', label: '其他' },
] as const;

export default function AdminPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  // S2/S4 (2026-07-06): 漏斗/趋势/复玩 state
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [trendDays, setTrendDays] = useState(7);
  const [retention, setRetention] = useState<RetentionData | null>(null);
  const [operatingDashboard, setOperatingDashboard] = useState<OperatingDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [recentVisits, setRecentVisits] = useState<PageVisit[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [recentConsults, setRecentConsults] = useState<ConsultRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'activities' | 'consults' | 'assets' | 'naming' | 'question' | 'kline' | 'feedback' | 'unlock-records' | 'credit-usage' | 'llm-failures' | 'benchmark'>('overview');

  const [assetUsers, setAssetUsers] = useState<any[]>([]);
  const [assetUsersPage, setAssetUsersPage] = useState(1);
  const [assetUsersTotal, setAssetUsersTotal] = useState(0);
  const [assetProfiles, setAssetProfiles] = useState<any[]>([]);
  const [assetProfilesPage, setAssetProfilesPage] = useState(1);
  const [assetProfilesTotal, setAssetProfilesTotal] = useState(0);
  const [assetLooseRecords, setAssetLooseRecords] = useState<AssetLooseRecord[]>([]);
  const [assetLooseRecordsPage, setAssetLooseRecordsPage] = useState(1);
  const [assetLooseRecordsTotal, setAssetLooseRecordsTotal] = useState(0);
  const [assetFilterUserId, setAssetFilterUserId] = useState<string | null>(null);
  const [assetExpandedProfileId, setAssetExpandedProfileId] = useState<string | null>(null);
  const [assetProfileRecords, setAssetProfileRecords] = useState<Record<string, any[]>>({});
  const [assetRecordDetail, setAssetRecordDetail] = useState<any | null>(null);
  const [assetInteractionEvents, setAssetInteractionEvents] = useState<InteractionEventRecord[]>([]);
  const [assetRecordId, setAssetRecordId] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetUnlinkingRecordIds, setAssetUnlinkingRecordIds] = useState<string[]>([]);
  const [assetMergingProfileIds, setAssetMergingProfileIds] = useState<string[]>([]);
  const [assetRebindingRecordIds, setAssetRebindingRecordIds] = useState<string[]>([]);
  const [assetCreatingRecordIds, setAssetCreatingRecordIds] = useState<string[]>([]);
  const [assetTargetPicker, setAssetTargetPicker] = useState<null | {
    mode: 'merge' | 'rebind';
    sourceProfileId?: string;
    recordId?: string;
    sourceRecord?: {
      id: string;
      userId?: string | null;
      sessionId?: string | null;
      question?: string;
    };
  }>(null);
  const [assetCreateDraft, setAssetCreateDraft] = useState<AssetCreateDraft>({
    name: '',
    birthDate: '',
    birthTime: '',
    gender: '',
    birthPlace: '',
  });
  const [assetTargetSearch, setAssetTargetSearch] = useState('');
  const [expandedJsonFields, setExpandedJsonFields] = useState<Set<string>>(new Set());

  const [namingRecords, setNamingRecords] = useState<any[]>([]);
  const [namingPage, setNamingPage] = useState(1);
  const [namingTotal, setNamingTotal] = useState(0);
  const [namingLoading, setNamingLoading] = useState(false);

  const [questionRecords, setQuestionRecords] = useState<any[]>([]);
  const [questionPage, setQuestionPage] = useState(1);
  const [questionTotal, setQuestionTotal] = useState(0);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionReviewFilter, setQuestionReviewFilter] = useState<'all' | 'pending' | 'verified' | 'expired'>('all');

  const [klineRecords, setKlineRecords] = useState<any[]>([]);
  const [klinePage, setKlinePage] = useState(1);
  const [klineTotal, setKlineTotal] = useState(0);
  const [klineLoading, setKlineLoading] = useState(false);
  const [klineReviewFilter, setKlineReviewFilter] = useState<'all' | 'pending' | 'verified' | 'expired'>('all');

  const [unlockRecords, setUnlockRecords] = useState<any[]>([]);
  const [unlockPage, setUnlockPage] = useState(1);
  const [unlockTotal, setUnlockTotal] = useState(0);
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [creditUsageRecords, setCreditUsageRecords] = useState<any[]>([]);
  const [creditUsagePage, setCreditUsagePage] = useState(1);
  const [creditUsageTotal, setCreditUsageTotal] = useState(0);
  const [creditUsageLoading, setCreditUsageLoading] = useState(false);

  const [llmFailureRecords, setLlmFailureRecords] = useState<any[]>([]);
  const [llmFailurePage, setLlmFailurePage] = useState(1);
  const [llmFailureTotal, setLlmFailureTotal] = useState(0);
  const [llmFailureLoading, setLlmFailureLoading] = useState(false);

  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkRunResult[]>([]);
  const [benchmarkHistoryLoading, setBenchmarkHistoryLoading] = useState(false);
  const [benchmarkDetail, setBenchmarkDetail] = useState<BenchmarkRunResult | null>(null);
  const [benchmarkDetailLoading, setBenchmarkDetailLoading] = useState(false);
  const [benchmarkCategories, setBenchmarkCategories] = useState<string[]>([]);

  const [feedbackRecords, setFeedbackRecords] = useState<AdminFeedbackRecord[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'applied'>('all');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, {
    isJudgmentCorrect: boolean;
    calibrationTag: string;
    calibrationNote: string;
  }>>({});

  const [runForm, setRunForm] = useState({
    sampleSize: 10,
    useCot: false,
    useAstro: false,
    shuffleOptions: false,
    provider: 'sensenova' as string,
    maxWorkers: 1,
    year: '',
  });
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<BenchmarkRunResult | null>(null);

  useEffect(() => {
    fetchStats();
    fetchFunnel();
    fetchTrend(7);
    fetchRetention();
    fetchOperatingDashboard();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const data = await apiClient.get<{
        overview: OverviewStats;
        recentPageVisits: PageVisit[];
        recentActivities: Activity[];
        recentConsultRecords: ConsultRecord[];
      }>('/analytics/admin/stats');
      setOverview(data.overview);
      setRecentVisits(data.recentPageVisits);
      setRecentActivities(data.recentActivities);
      setRecentConsults(data.recentConsultRecords);
      setError(null);
    } catch (err: any) {
      if (err.statusCode === 403) {
        setError('需要管理员权限才能访问');
      } else {
        setError(err.message || '获取数据失败');
      }
    } finally {
      setLoading(false);
    }
  }

  // S2 (2026-07-06): 漏斗数据
  async function fetchFunnel() {
    try {
      const data = await apiClient.get<FunnelData>('/analytics/admin/funnel');
      setFunnel(data);
    } catch {
      setFunnel(null);
    }
  }

  // S4 (2026-07-06): 趋势数据
  async function fetchTrend(days: number) {
    try {
      const data = await apiClient.get<TrendData>(`/analytics/admin/trend?days=${days}`);
      setTrend(data);
      setTrendDays(days);
    } catch {
      setTrend(null);
    }
  }

  // S4 (2026-07-06): 复玩数据
  async function fetchRetention() {
    try {
      const data = await apiClient.get<RetentionData>('/analytics/admin/retention');
      setRetention(data);
    } catch {
      setRetention(null);
    }
  }

  async function fetchOperatingDashboard() {
    try {
      const data = await apiClient.get<OperatingDashboardData>('/admin/metrics?days=7');
      setOperatingDashboard(data);
    } catch {
      setOperatingDashboard(null);
    }
  }

  const fetchAssetUsers = useCallback(async (page: number) => {
    try {
      setAssetLoading(true);
      const res = await consultApi.adminGetUsers({ page, limit: 20 });
      setAssetUsers(res.users || res.data || []);
      setAssetUsersTotal(res.total || 0);
    } catch {
      setAssetUsers([]);
    } finally {
      setAssetLoading(false);
    }
  }, []);

  const fetchAssetProfiles = useCallback(async (page: number, userId?: string | null) => {
    try {
      setAssetLoading(true);
      const params: { page: number; limit: number; userId?: string } = { page, limit: 20 };
      if (userId) params.userId = userId;
      const res = await consultApi.adminGetPersonProfiles(params);
      setAssetProfiles(res.profiles || res.data || []);
      setAssetProfilesTotal(res.total || 0);
    } catch {
      setAssetProfiles([]);
    } finally {
      setAssetLoading(false);
    }
  }, []);

  const fetchAssetRecordDetail = useCallback(async (id: string) => {
    try {
      setAssetLoading(true);
      const [recordRes, eventsRes] = await Promise.all([
        consultApi.adminGetConsultRecord(id),
        consultApi.adminGetInteractionEvents({ recordId: id, limit: 100 }).catch(() => ({ events: [] })),
      ]);
      setAssetRecordDetail(recordRes.record || recordRes.data || recordRes);
      setAssetInteractionEvents(eventsRes.events || []);
    } catch {
      setAssetRecordDetail(null);
      setAssetInteractionEvents([]);
    } finally {
      setAssetLoading(false);
    }
  }, []);

  const fetchAssetLooseRecords = useCallback(async (page: number, userId?: string | null) => {
    try {
      setAssetLoading(true);
      const res = await consultApi.adminGetConsultRecords({
        page: 1,
        limit: 100,
        userId: userId || undefined,
      });
      const baseRecords = res.records || [];
      const detailResults = await Promise.all(
        baseRecords.map(async (record: AssetLooseRecord) => {
          try {
            const detailRes = await consultApi.adminGetConsultRecord(record.id);
            const detail = detailRes.record || detailRes.data || detailRes;
            const looseMeta = deriveLooseRecordMeta(detail);
            return {
              ...record,
              profilesCount: Array.isArray(detail?.profiles) ? detail.profiles.length : 0,
              ...looseMeta,
            };
          } catch {
            return {
              ...record,
              profilesCount: -1,
              reasonLabel: '详情加载失败',
              reasonHint: '当前无法判断未建档原因。',
              actionHint: '可稍后重试或直接进入记录详情查看。',
            };
          }
        }),
      );
      const looseRecords = detailResults.filter((record) => record.profilesCount === 0);
      const start = (page - 1) * 20;
      setAssetLooseRecords(looseRecords.slice(start, start + 20));
      setAssetLooseRecordsTotal(looseRecords.length);
    } catch {
      setAssetLooseRecords([]);
      setAssetLooseRecordsTotal(0);
    } finally {
      setAssetLoading(false);
    }
  }, []);

  const fetchAssetProfileRecords = useCallback(async (profileId: string) => {
    try {
      setAssetLoading(true);
      const res = await consultApi.adminGetPersonProfileRecords(profileId);
      setAssetProfileRecords((prev) => ({
        ...prev,
        [profileId]: res.records || [],
      }));
    } catch {
      setAssetProfileRecords((prev) => ({
        ...prev,
        [profileId]: [],
      }));
    } finally {
      setAssetLoading(false);
    }
  }, []);

  const handleAssetUnlinkRecord = useCallback(async (profileId: string, recordId: string) => {
    const confirmed = window.confirm('确认解除这条记录与当前人物档案的关联？记录本身不会删除。');
    if (!confirmed) {
      return;
    }

    try {
      setAssetUnlinkingRecordIds((prev) => [...prev, recordId]);
      await consultApi.adminUnlinkPersonProfileRecord(profileId, recordId);
      setAssetProfileRecords((prev) => ({
        ...prev,
        [profileId]: (prev[profileId] || []).filter((record) => record.id !== recordId),
      }));
      await fetchAssetProfiles(assetProfilesPage, assetFilterUserId);
      if (assetRecordId === recordId) {
        await fetchAssetRecordDetail(recordId);
      }
      toast.success('已解除关联');
    } catch (error: any) {
      toast.error(error?.message || '解除关联失败');
    } finally {
      setAssetUnlinkingRecordIds((prev) => prev.filter((id) => id !== recordId));
    }
  }, [assetFilterUserId, assetProfilesPage, assetRecordId, fetchAssetProfiles, fetchAssetRecordDetail]);

  const handleAssetMergeProfile = useCallback(async (sourceProfileId: string) => {
    setAssetTargetSearch('');
    setAssetTargetPicker({
      mode: 'merge',
      sourceProfileId,
    });
  }, []);

  const handleAssetRebindRecord = useCallback(async (fromProfileId: string, recordId: string) => {
    setAssetTargetSearch('');
    setAssetTargetPicker({
      mode: 'rebind',
      sourceProfileId: fromProfileId,
      recordId,
    });
  }, []);

  const handleAssetAssignRecord = useCallback((record: AssetLooseRecord) => {
    setAssetTargetSearch('');
    setAssetCreateDraft({
      name: '',
      birthDate: '',
      birthTime: '',
      gender: '',
      birthPlace: '',
    });
    setAssetTargetPicker({
      mode: 'rebind',
      recordId: record.id,
      sourceRecord: {
        id: record.id,
        userId: record.userId,
        sessionId: record.sessionId,
        question: record.question,
      },
    });
  }, []);

  useEffect(() => {
    if (!assetTargetPicker?.sourceRecord?.id) return;
    const sourceRecordId = assetTargetPicker.sourceRecord.id;
    let cancelled = false;

    consultApi.adminGetConsultRecord(sourceRecordId)
      .then((detailRes) => {
        if (cancelled) return;
        const detail = detailRes.record || detailRes.data || detailRes;
        const inputData = detail?.inputData || {};
        setAssetCreateDraft({
          name: inputData.name || inputData.userName || inputData.subjectName || inputData.surname || '',
          birthDate: inputData.birthDate || inputData.birth_date || '',
          birthTime: inputData.birthTime || inputData.birth_time || '',
          gender: inputData.gender || '',
          birthPlace: inputData.birthPlace || inputData.birth_place || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAssetCreateDraft({
          name: '',
          birthDate: '',
          birthTime: '',
          gender: '',
          birthPlace: '',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [assetTargetPicker]);

  const submitAssetTargetPicker = useCallback(async (targetProfileId: string) => {
    if (!assetTargetPicker) return;

    if (assetTargetPicker.mode === 'merge') {
      const sourceProfileId = assetTargetPicker.sourceProfileId;
      if (!sourceProfileId) {
        toast.error('源档案ID缺失');
        return;
      }
      if (targetProfileId === sourceProfileId) {
        toast.error('不能合并到同一个档案');
        return;
      }
      try {
        setAssetMergingProfileIds((prev) => [...prev, sourceProfileId]);
        await consultApi.adminMergePersonProfile(sourceProfileId, targetProfileId);
        setAssetExpandedProfileId((prev) => (prev === sourceProfileId ? null : prev));
        setAssetProfileRecords((prev) => {
          const next = { ...prev };
          delete next[sourceProfileId];
          return next;
        });
        await fetchAssetProfiles(assetProfilesPage, assetFilterUserId);
        setAssetTargetPicker(null);
        setAssetTargetSearch('');
        toast.success('档案已合并');
      } catch (error: any) {
        toast.error(error?.message || '档案合并失败');
      } finally {
        setAssetMergingProfileIds((prev) => prev.filter((id) => id !== sourceProfileId));
      }
      return;
    }

    const recordId = assetTargetPicker.recordId;
    const fromProfileId = assetTargetPicker.sourceProfileId;
    if (!recordId) return;

    try {
      setAssetRebindingRecordIds((prev) => [...prev, recordId]);
      await consultApi.adminRebindPersonProfileRecord(recordId, targetProfileId);
      if (fromProfileId) {
        setAssetProfileRecords((prev) => ({
          ...prev,
          [fromProfileId]: (prev[fromProfileId] || []).filter((record) => record.id !== recordId),
        }));
      }
      await fetchAssetProfiles(assetProfilesPage, assetFilterUserId);
      await fetchAssetLooseRecords(assetLooseRecordsPage, assetFilterUserId);
      if (assetExpandedProfileId === targetProfileId) {
        await fetchAssetProfileRecords(targetProfileId);
      }
      if (assetRecordId === recordId) {
        await fetchAssetRecordDetail(recordId);
      }
      setAssetTargetPicker(null);
      setAssetTargetSearch('');
      toast.success('记录已重绑');
    } catch (error: any) {
      toast.error(error?.message || '记录重绑失败');
    } finally {
      setAssetRebindingRecordIds((prev) => prev.filter((id) => id !== recordId));
    }
  }, [
    assetExpandedProfileId,
    assetFilterUserId,
    assetLooseRecordsPage,
    assetProfilesPage,
    assetRecordId,
    assetTargetPicker,
    fetchAssetProfileRecords,
    fetchAssetProfiles,
    fetchAssetRecordDetail,
    fetchAssetLooseRecords,
  ]);

  const submitAssetCreateProfile = useCallback(async () => {
    const recordId = assetTargetPicker?.recordId;
    if (!recordId) return;

    try {
      setAssetCreatingRecordIds((prev) => [...prev, recordId]);
      const payload = {
        name: assetCreateDraft.name.trim() || undefined,
        birthDate: assetCreateDraft.birthDate || undefined,
        birthTime: assetCreateDraft.birthTime || undefined,
        gender: assetCreateDraft.gender || undefined,
        birthPlace: assetCreateDraft.birthPlace.trim() || undefined,
      };
      await consultApi.adminCreatePersonProfileFromRecord(recordId, payload);
      await fetchAssetProfiles(assetProfilesPage, assetFilterUserId);
      await fetchAssetLooseRecords(assetLooseRecordsPage, assetFilterUserId);
      if (assetRecordId === recordId) {
        await fetchAssetRecordDetail(recordId);
      }
      setAssetTargetPicker(null);
      setAssetTargetSearch('');
      toast.success('已新建档案并完成绑定');
    } catch (error: any) {
      toast.error(error?.message || '新建档案失败');
    } finally {
      setAssetCreatingRecordIds((prev) => prev.filter((id) => id !== recordId));
    }
  }, [
    assetCreateDraft,
    assetFilterUserId,
    assetLooseRecordsPage,
    assetProfilesPage,
    assetRecordId,
    assetTargetPicker,
    fetchAssetProfiles,
    fetchAssetRecordDetail,
    fetchAssetLooseRecords,
  ]);

  useEffect(() => {
    if (activeTab === 'assets') {
      fetchAssetUsers(assetUsersPage);
      fetchAssetProfiles(assetProfilesPage, assetFilterUserId);
      fetchAssetLooseRecords(assetLooseRecordsPage, assetFilterUserId);
    }
  }, [
    activeTab,
    assetUsersPage,
    assetProfilesPage,
    assetLooseRecordsPage,
    assetFilterUserId,
    fetchAssetUsers,
    fetchAssetProfiles,
    fetchAssetLooseRecords,
  ]);

  useEffect(() => {
    if (assetRecordId) {
      fetchAssetRecordDetail(assetRecordId);
    }
  }, [assetRecordId, fetchAssetRecordDetail]);

  const fetchNamingRecords = useCallback(async (page: number) => {
    try {
      setNamingLoading(true);
      const res = await consultApi.adminGetNamingRecords({ page, limit: 20 });
      setNamingRecords(res.records || []);
      setNamingTotal(res.pagination?.total || 0);
    } catch {
      setNamingRecords([]);
    } finally {
      setNamingLoading(false);
    }
  }, []);

  const fetchQuestionRecords = useCallback(async (page: number) => {
    try {
      setQuestionLoading(true);
      const res = await consultApi.adminGetQuestionRecords({ page, limit: 20, reviewStatus: questionReviewFilter });
      setQuestionRecords(res.records || []);
      setQuestionTotal(res.pagination?.total || 0);
    } catch {
      setQuestionRecords([]);
    } finally {
      setQuestionLoading(false);
    }
  }, [questionReviewFilter]);

  const fetchKlineRecords = useCallback(async (page: number) => {
    try {
      setKlineLoading(true);
      const res = await consultApi.adminGetKlineRecords({ page, limit: 20, reviewStatus: klineReviewFilter });
      setKlineRecords(res.records || []);
      setKlineTotal(res.pagination?.total || 0);
    } catch {
      setKlineRecords([]);
    } finally {
      setKlineLoading(false);
    }
  }, [klineReviewFilter]);

  useEffect(() => {
    if (activeTab === 'naming') fetchNamingRecords(namingPage);
  }, [activeTab, namingPage, fetchNamingRecords]);

  useEffect(() => {
    if (activeTab === 'question') fetchQuestionRecords(questionPage);
  }, [activeTab, questionPage, fetchQuestionRecords]);

  useEffect(() => {
    if (activeTab === 'kline') fetchKlineRecords(klinePage);
  }, [activeTab, klinePage, fetchKlineRecords]);

  const fetchFeedbackRecords = useCallback(async (page: number) => {
    try {
      setFeedbackLoading(true);
      const res = await feedbackApi.adminList({
        page,
        limit: 20,
        status: feedbackStatusFilter,
        rating: feedbackRatingFilter,
        hasComment: true,
      });
      setFeedbackRecords(res.records || []);
      setFeedbackTotal(res.pagination?.total || 0);
    } catch {
      setFeedbackRecords([]);
      setFeedbackTotal(0);
    } finally {
      setFeedbackLoading(false);
    }
  }, [feedbackRatingFilter, feedbackStatusFilter]);

  useEffect(() => {
    if (activeTab === 'feedback') fetchFeedbackRecords(feedbackPage);
  }, [activeTab, feedbackPage, fetchFeedbackRecords]);

  const fetchUnlockRecords = useCallback(async (page: number) => {
    try {
      setUnlockLoading(true);
      const res = await apiClient.get<any>(`/admin/unlock-records?page=${page}&limit=20`);
      setUnlockRecords(res.records || res.data || []);
      setUnlockTotal(res.pagination?.total || res.total || 0);
    } catch {
      setUnlockRecords([]);
    } finally {
      setUnlockLoading(false);
    }
  }, []);

  const fetchCreditUsageRecords = useCallback(async (page: number) => {
    try {
      setCreditUsageLoading(true);
      const res = await apiClient.get<any>(`/admin/credit-usage?page=${page}&limit=20`);
      setCreditUsageRecords(res.records || res.data || []);
      setCreditUsageTotal(res.pagination?.total || res.total || 0);
    } catch {
      setCreditUsageRecords([]);
    } finally {
      setCreditUsageLoading(false);
    }
  }, []);

  const fetchLlmFailureRecords = useCallback(async (page: number) => {
    try {
      setLlmFailureLoading(true);
      const res = await apiClient.get<any>(`/admin/llm-failures?page=${page}&limit=20`);
      setLlmFailureRecords(res.records || res.data || []);
      setLlmFailureTotal(res.pagination?.total || res.total || 0);
    } catch {
      setLlmFailureRecords([]);
    } finally {
      setLlmFailureLoading(false);
    }
  }, []);

  const assetTargetPickerSourceProfile = assetTargetPicker
    ? assetProfiles.find((profile) => profile.id === assetTargetPicker.sourceProfileId) || null
    : null;

  const assetTargetCandidates = assetTargetPicker
    ? assetProfiles.filter((profile) => {
        if (assetTargetPicker.sourceProfileId && profile.id === assetTargetPicker.sourceProfileId) return false;
        const relatedUserId = assetTargetPickerSourceProfile?.userId || assetTargetPicker.sourceRecord?.userId;
        const relatedSessionId = assetTargetPickerSourceProfile?.sessionId || assetTargetPicker.sourceRecord?.sessionId;
        if (relatedUserId && profile.userId !== relatedUserId) return false;
        if (!relatedUserId && relatedSessionId && profile.sessionId !== relatedSessionId) return false;
        const keyword = assetTargetSearch.trim().toLowerCase();
        if (!keyword) return true;
        const haystack = [
          profile.name,
          profile.birthDate,
          profile.birthTime,
          profile.id,
          profile.yearPillar,
          profile.monthPillar,
          profile.dayPillar,
          profile.hourPillar,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(keyword);
      })
      : [];

  const assetInteractionEventStats = assetInteractionEvents.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {});

  const updateFeedbackDraft = (id: string, patch: Partial<{
    isJudgmentCorrect: boolean;
    calibrationTag: string;
    calibrationNote: string;
  }>) => {
    setFeedbackDrafts((prev) => ({
      ...prev,
      [id]: {
        isJudgmentCorrect: prev[id]?.isJudgmentCorrect ?? false,
        calibrationTag: prev[id]?.calibrationTag ?? 'other',
        calibrationNote: prev[id]?.calibrationNote ?? '',
        ...patch,
      },
    }));
  };

  const getFeedbackDraft = (record: AdminFeedbackRecord) => ({
    isJudgmentCorrect: feedbackDrafts[record.id]?.isJudgmentCorrect ?? (record.isJudgmentCorrect ?? false),
    calibrationTag: feedbackDrafts[record.id]?.calibrationTag ?? (record.calibrationTag || 'other'),
    calibrationNote: feedbackDrafts[record.id]?.calibrationNote ?? (record.calibrationNote || ''),
  });

  const submitFeedbackReview = async (record: AdminFeedbackRecord) => {
    const draft = getFeedbackDraft(record);
    await feedbackApi.adminReview(record.id, draft);
    await fetchFeedbackRecords(feedbackPage);
  };

  const applyFeedback = async (record: AdminFeedbackRecord) => {
    await feedbackApi.adminApply(record.id);
    await fetchFeedbackRecords(feedbackPage);
  };

  const fetchBenchmarkHistory = useCallback(async () => {
    try {
      setBenchmarkHistoryLoading(true);
      const data = await getBenchmarkHistory();
      setBenchmarkHistory(data);
    } catch {
      setBenchmarkHistory([]);
    } finally {
      setBenchmarkHistoryLoading(false);
    }
  }, []);

  const fetchBenchmarkDetail = useCallback(async (runId: string) => {
    try {
      setBenchmarkDetailLoading(true);
      const data = await getBenchmarkRunById(runId);
      setBenchmarkDetail(data);
    } catch {
      setBenchmarkDetail(null);
    } finally {
      setBenchmarkDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'benchmark') {
      fetchBenchmarkHistory();
      getBenchmarkCategories().then(setBenchmarkCategories).catch(() => {});
    }
  }, [activeTab, fetchBenchmarkHistory]);

  async function handleRunBenchmark() {
    try {
      setRunLoading(true);
      setRunResult(null);
      const result = await runBenchmark({
        sampleSize: runForm.sampleSize,
        useCot: runForm.useCot,
        useAstro: runForm.useAstro,
        shuffleOptions: runForm.shuffleOptions,
        provider: runForm.provider,
        maxWorkers: runForm.maxWorkers,
        year: runForm.year ? Number(runForm.year) : undefined,
      });
      setRunResult(result);
      fetchBenchmarkHistory();
    } catch (err: any) {
      toast.error(err.message || '运行失败');
    } finally {
      setRunLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'unlock-records') fetchUnlockRecords(unlockPage);
  }, [activeTab, unlockPage, fetchUnlockRecords]);

  useEffect(() => {
    if (activeTab === 'credit-usage') fetchCreditUsageRecords(creditUsagePage);
  }, [activeTab, creditUsagePage, fetchCreditUsageRecords]);

  useEffect(() => {
    if (activeTab === 'llm-failures') fetchLlmFailureRecords(llmFailurePage);
  }, [activeTab, llmFailurePage, fetchLlmFailureRecords]);

  if (!isAuthenticated) {
    return <LoginRequired icon="admin_panel_settings" title="管理后台" description="请先登录后再访问管理后台" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-base p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">访问被拒绝</h2>
            <p className="text-text-secondary">{error}</p>
            <p className="text-sm text-text-secondary mt-4">
              当前用户: {user?.email || '未登录'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">管理后台</h1>
          <p className="text-text-secondary">
            欢迎回来，{user?.nickname || user?.email}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border flex-wrap">
          {(['overview', 'visits', 'activities', 'consults', 'assets', 'naming', 'question', 'kline', 'feedback', 'unlock-records', 'credit-usage', 'llm-failures', 'benchmark'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'overview' ? '总览' :
               tab === 'visits' ? '页面访问' :
               tab === 'activities' ? '用户活动' :
               tab === 'consults' ? '咨询记录' :
               tab === 'assets' ? '资产视图' :
               tab === 'naming' ? '取名记录' :
               tab === 'question' ? '问事记录' :
               tab === 'kline' ? 'K线记录' :
               tab === 'feedback' ? '反馈工单' :
               tab === 'unlock-records' ? '会员解锁' :
               tab === 'credit-usage' ? '积分消耗' :
               tab === 'llm-failures' ? 'LLM失败' : 'Benchmark'}
            </button>
          ))}
        </div>

        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            {/* Run Panel */}
            <div className="bg-surface-elevated rounded-2xl p-6">
              <h3 className="font-medium text-text-primary mb-4">运行 Benchmark</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text-secondary">题目数量</span>
                  <input
                    type="number"
                    value={runForm.sampleSize}
                    min={1}
                    max={500}
                    onChange={(e) => setRunForm({ ...runForm, sampleSize: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text-secondary">年份筛选</span>
                  <input
                    type="number"
                    value={runForm.year}
                    placeholder="不限"
                    min={2020}
                    max={2030}
                    onChange={(e) => setRunForm({ ...runForm, year: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text-secondary">Provider</span>
                  <select
                    value={runForm.provider}
                    onChange={(e) => setRunForm({ ...runForm, provider: e.target.value })}
                    className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="sensenova">SenseNova</option>
                    <option value="minimax">MiniMax</option>
                    <option value="doubao">Doubao</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="deepseek-direct">DeepSeek Direct</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text-secondary">并发数</span>
                  <input
                    type="number"
                    value={runForm.maxWorkers}
                    min={1}
                    max={10}
                    onChange={(e) => setRunForm({ ...runForm, maxWorkers: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runForm.useCot}
                    onChange={(e) => setRunForm({ ...runForm, useCot: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-text-secondary">CoT 推理</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runForm.useAstro}
                    onChange={(e) => setRunForm({ ...runForm, useAstro: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-text-secondary">八字排盘</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={runForm.shuffleOptions}
                    onChange={(e) => setRunForm({ ...runForm, shuffleOptions: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-text-secondary">选项打乱</span>
                </label>
              </div>
              <button
                onClick={handleRunBenchmark}
                disabled={runLoading}
                className="px-6 py-2 text-sm rounded-lg bg-primary text-on-surface hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {runLoading ? '运行中...' : '开始 Benchmark'}
              </button>

              {runResult && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-surface-base rounded-xl p-4">
                    <p className="text-2xl font-bold text-text-primary">{runResult.summary.total}</p>
                    <p className="text-sm text-text-secondary">总题数</p>
                  </div>
                  <div className="bg-surface-base rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-400">{runResult.summary.correct}</p>
                    <p className="text-sm text-text-secondary">正确</p>
                  </div>
                  <div className="bg-surface-base rounded-xl p-4">
                    <p className="text-2xl font-bold text-primary">{(runResult.summary.accuracy * 100).toFixed(1)}%</p>
                    <p className="text-sm text-text-secondary">准确率</p>
                  </div>
                  <div className="bg-surface-base rounded-xl p-4">
                    <p className="text-2xl font-bold text-text-primary">{runResult.summary.avgDurationMs}ms</p>
                    <p className="text-sm text-text-secondary">平均耗时</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category Radar */}
            {runResult && Object.keys(runResult.categoryBreakdown).length > 0 && (
              <div className="bg-surface-elevated rounded-2xl p-6">
                <h3 className="font-medium text-text-primary mb-4">分类准确率</h3>
                <BenchmarkRadarChart data={runResult.categoryBreakdown} />
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {Object.entries(runResult.categoryBreakdown).map(([cat, stats]) => (
                    <div key={cat} className="bg-surface-base rounded-lg p-3 text-center">
                      <p className="text-sm font-medium text-text-primary">{cat}</p>
                      <p className={`text-lg font-bold ${stats.total > 0 && stats.accuracy >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.total > 0 ? `${(stats.accuracy * 100).toFixed(0)}%` : '-'}
                      </p>
                      <p className="text-xs text-text-secondary">{stats.correct}/{stats.total}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="bg-surface-elevated rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-surface-base border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-text-primary">运行历史</h3>
                <button
                  onClick={fetchBenchmarkHistory}
                  className="text-sm text-primary hover:underline"
                >
                  刷新
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-base">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Run ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Provider</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">配置</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">题目数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">正确率</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">平均耗时</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {benchmarkHistoryLoading && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          </div>
                        </td>
                      </tr>
                    )}
                    {!benchmarkHistoryLoading && benchmarkHistory.map((run) => (
                      <tr key={run.runId} className="hover:bg-surface-base/50">
                        <td className="px-4 py-3 text-sm text-text-secondary font-mono">{run.runId.slice(-12)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {new Date(run.timestamp).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                            {run.config.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {run.config.useCot && (
                              <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">CoT</span>
                            )}
                            {run.config.useAstro && (
                              <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">八字</span>
                            )}
                            {run.config.shuffleOptions && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs">打乱</span>
                            )}
                            <span className="px-1.5 py-0.5 bg-gray-500/10 text-on-surface-variant/60 rounded text-xs">
                              W{run.config.maxWorkers}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">{run.summary.total}</td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm font-medium ${
                            run.summary.accuracy >= 0.7 ? 'text-green-400' :
                            run.summary.accuracy >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {(run.summary.accuracy * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{run.summary.avgDurationMs}ms</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setBenchmarkDetail(null)}
                            className="text-sm text-primary hover:underline"
                          >
                            {benchmarkDetail?.runId === run.runId ? '收起' : '详情'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!benchmarkHistoryLoading && benchmarkHistory.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                          暂无记录，请先运行一次 Benchmark
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail Modal inline */}
            {benchmarkDetail && (
              <div className="bg-surface-elevated rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-text-primary">
                    详情 — {benchmarkDetail.runId.slice(-12)}
                  </h3>
                  <button
                    onClick={() => setBenchmarkDetail(null)}
                    className="text-sm text-text-secondary hover:text-text-primary"
                  >
                    关闭
                  </button>
                </div>

                <BenchmarkRadarChart data={benchmarkDetail.categoryBreakdown} />

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-base">
                      <tr>
                        <th className="px-3 py-2 text-left text-text-secondary">#</th>
                        <th className="px-3 py-2 text-left text-text-secondary">题目</th>
                        <th className="px-3 py-2 text-left text-text-secondary">类别</th>
                        <th className="px-3 py-2 text-left text-text-secondary">答案</th>
                        <th className="px-3 py-2 text-left text-text-secondary">预测</th>
                        <th className="px-3 py-2 text-left text-text-secondary">判定</th>
                        <th className="px-3 py-2 text-left text-text-secondary">耗时</th>
                        <th className="px-3 py-2 text-left text-text-secondary">打乱</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {benchmarkDetail.results.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-surface-base/50">
                          <td className="px-3 py-2 text-text-secondary">{idx + 1}</td>
                          <td className="px-3 py-2 text-text-primary max-w-xs truncate">{item.question}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">{item.category}</span>
                          </td>
                          <td className="px-3 py-2 font-mono text-text-primary">{item.correctAnswer}</td>
                          <td className="px-3 py-2 font-mono text-text-secondary">{item.predictedAnswer || '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              item.isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {item.isCorrect ? '✓' : '✗'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-text-secondary">{item.durationMs}ms</td>
                          <td className="px-3 py-2 text-text-secondary">
                            {item.optionMap ? '是' : '否'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* 顶部统计卡片 — 含 UV/PV 对比 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="总用户数" value={overview.totalUsers} icon="👥" />
              <StatCard title="总访客数 (UV)" value={overview.totalUV ?? 0} icon="🌐" />
              <StatCard title="总访问量 (PV)" value={overview.totalPageVisits} icon="📊" />
              <StatCard title="总活动数" value={overview.totalActivities} icon="🎯" />
              <StatCard title="总咨询数" value={overview.totalConsultRecords} icon="💬" />
              <StatCard title="今日 UV" value={overview.todayUV ?? 0} icon="🔍" highlight />
              <StatCard title="今日访问" value={overview.todayPageVisits} icon="📈" highlight />
              <StatCard title="今日咨询" value={overview.todayConsultRecords} icon="💭" highlight />
            </div>

            <section className="bg-surface-elevated p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">CEO 周经营看板</h3>
                  <p className="text-sm text-text-secondary">统一 7 天口径；“未接入”不按 0 计算</p>
                </div>
                <button
                  type="button"
                  onClick={fetchOperatingDashboard}
                  className="px-3 py-2 text-sm border border-border text-text-primary hover:bg-surface-base"
                >
                  刷新
                </button>
              </div>
              {operatingDashboard ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-base">
                      <tr>
                        <th className="px-3 py-2 text-left text-text-secondary">指标</th>
                        <th className="px-3 py-2 text-right text-text-secondary">本周</th>
                        <th className="px-3 py-2 text-right text-text-secondary">目标</th>
                        <th className="px-3 py-2 text-left text-text-secondary">口径</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {operatingDashboard.metrics.map((item) => {
                        const displayValue = item.availability === 'unavailable' || item.value === null
                          ? '未接入'
                          : `${item.value}${item.unit === 'percent' ? '%' : ''}`;
                        const meetsTarget = item.target !== null && item.value !== null && item.value >= item.target;
                        return (
                          <tr key={item.key}>
                            <td className="px-3 py-3 font-medium text-text-primary">{item.label}</td>
                            <td className={`px-3 py-3 text-right font-semibold ${
                              item.availability === 'unavailable'
                                ? 'text-amber-400'
                                : meetsTarget
                                  ? 'text-green-400'
                                  : 'text-text-primary'
                            }`}>
                              {displayValue}
                            </td>
                            <td className="px-3 py-3 text-right text-text-secondary">
                              {item.target === null ? '-' : `${item.target}${item.unit === 'percent' ? '%' : ''}`}
                            </td>
                            <td className="px-3 py-3 text-text-secondary min-w-72">{item.definition}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-text-secondary">经营指标暂不可用</p>
              )}
            </section>

            {/* S5: 7天趋势图 */}
            <div className="bg-surface-elevated rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">访问趋势 (PV / UV)</h3>
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => fetchTrend(d)}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        trendDays === d
                          ? 'bg-primary text-white'
                          : 'bg-surface-base text-text-secondary hover:bg-surface-base/70'
                      }`}
                    >
                      {d} 天
                    </button>
                  ))}
                </div>
              </div>
              {trend && trend.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trend.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="pv" name="PV" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="uv" name="UV" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-text-secondary py-8">暂无趋势数据</p>
              )}
            </div>

            {/* S3: 漏斗表 + S5: 复玩卡片 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 漏斗表 */}
              <div className="lg:col-span-2 bg-surface-elevated rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  事件漏斗 {funnel && funnel.totalEvents > 0 && `(共 ${funnel.totalEvents} 次)`}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-base">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">#</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">事件类型</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">PV</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">UV</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">转化率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {funnel && funnel.steps.length > 0 ? (
                        funnel.steps.map((s) => (
                          <tr key={s.activityType} className="hover:bg-surface-base/50">
                            <td className="px-4 py-2 text-sm text-text-secondary">{s.stepIndex}</td>
                            <td className="px-4 py-2 text-sm font-medium text-text-primary">{s.activityType}</td>
                            <td className="px-4 py-2 text-sm text-right text-text-primary">{s.pv}</td>
                            <td className="px-4 py-2 text-sm text-right text-text-primary">{s.uv}</td>
                            <td className="px-4 py-2 text-sm text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  s.conversionRate >= 50
                                    ? 'bg-green-100 text-green-700'
                                    : s.conversionRate >= 20
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {s.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                            暂无漏斗数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 复玩卡片 */}
              <div className="bg-surface-elevated rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">用户复玩</h3>
                {retention ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold text-primary">{retention.retentionRate}%</p>
                      <p className="text-sm text-text-secondary">复玩率</p>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">总用户</span>
                        <span className="font-medium text-text-primary">{retention.totalUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">复玩用户</span>
                        <span className="font-medium text-green-600">{retention.returningUsers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">新用户</span>
                        <span className="font-medium text-blue-600">{retention.newUsers}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-text-secondary py-8">暂无数据</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">页面</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">来源</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">设备</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary">{visit.pageName}</span>
                        <p className="text-xs text-text-secondary">{visit.pageUrl}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {visit.referrer || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {visit.screenSize || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(visit.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {recentVisits.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">活动类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">活动数据</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                          {activity.activityType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {activity.activityData || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(activity.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {recentActivities.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-text-secondary">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'consults' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">问题</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentConsults.map((consult) => (
                    <tr key={consult.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-primary">
                          {consult.userNickname || consult.userEmail || '游客'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {consult.question}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-secondary/10 text-secondary rounded text-xs font-medium">
                          {consult.routeType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          consult.status === 'completed'
                            ? 'bg-green-500/10 text-green-400'
                            : consult.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-on-surface-variant/60'
                        }`}>
                          {consult.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(consult.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {recentConsults.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="bg-surface-elevated rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-surface-base border-b border-border">
                <h3 className="font-medium text-text-primary">用户列表</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-base">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">昵称</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">注册时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assetUsers.map((u) => (
                      <tr
                        key={u.id}
                        className={`hover:bg-surface-base/50 cursor-pointer ${
                          assetFilterUserId === u.id ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => {
                          setAssetFilterUserId(assetFilterUserId === u.id ? null : u.id);
                          setAssetProfilesPage(1);
                          setAssetLooseRecordsPage(1);
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-text-secondary font-mono">{u.id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{u.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{u.nickname || '-'}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {u.createdAt ? new Date(u.createdAt).toLocaleString('zh-CN') : '-'}
                        </td>
                      </tr>
                    ))}
                    {assetUsers.length === 0 && !assetLoading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {assetUsersTotal > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-sm text-text-secondary">
                    共 {assetUsersTotal} 条，第 {assetUsersPage} 页
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssetUsersPage((p) => Math.max(1, p - 1))}
                      disabled={assetUsersPage <= 1}
                      className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setAssetUsersPage((p) => p + 1)}
                      disabled={assetUsersPage * 20 >= assetUsersTotal}
                      className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-elevated rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-surface-base border-b border-border flex items-center justify-between">
                <h3 className="font-medium text-text-primary">人物档案</h3>
                {assetFilterUserId && (
                  <button
                    onClick={() => {
                      setAssetFilterUserId(null);
                      setAssetProfilesPage(1);
                      setAssetLooseRecordsPage(1);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    清除筛选
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-base">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">姓名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">出生日期</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">四柱</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">记录数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">最近记录</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assetProfiles.map((p) => {
                      const isExpanded = assetExpandedProfileId === p.id;
                      const records = assetProfileRecords[p.id] || [];
                      return (
                        <Fragment key={p.id}>
                          <tr className="hover:bg-surface-base/50">
                            <td className="px-4 py-3 text-sm text-text-primary">
                              <div className="space-y-1">
                                <div>{p.name || '-'}</div>
                                {p.duplicateCount > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-400">
                                      疑似重复 {p.duplicateCount}
                                    </span>
                                    <span className="text-text-secondary">
                                      {Array.isArray(p.duplicateProfiles)
                                        ? p.duplicateProfiles.map((item: any) => item.name || item.id).join(' / ')
                                        : ''}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">{p.birthDate || '-'}</td>
                            <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                              {p.sizhu || p.bazi || (p.yearGanZhi && `${p.yearGanZhi} ${p.monthGanZhi} ${p.dayGanZhi} ${p.hourGanZhi}`) || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">{p.recordsCount ?? p.consultCount ?? '-'}</td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              {p.latestRecord?.createdAt || p.latestRecordTime || p.lastConsultAt
                                ? new Date(p.latestRecord?.createdAt || p.latestRecordTime || p.lastConsultAt).toLocaleString('zh-CN')
                                : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    if (isExpanded) {
                                      setAssetExpandedProfileId(null);
                                      return;
                                    }
                                    setAssetExpandedProfileId(p.id);
                                    if (!assetProfileRecords[p.id]) {
                                      fetchAssetProfileRecords(p.id);
                                    }
                                  }}
                                  className="px-3 py-1 rounded bg-surface-base text-text-primary hover:bg-surface-base/80 transition-colors"
                                >
                                  {isExpanded ? '收起记录' : '查看记录'}
                                </button>
                                {p.latestRecord?.id ? (
                                  <button
                                    onClick={() => {
                                      setAssetRecordId(p.latestRecord.id);
                                      fetchAssetRecordDetail(p.latestRecord.id);
                                    }}
                                    className="px-3 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                                  >
                                    查看最近记录
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => handleAssetMergeProfile(p.id)}
                                  disabled={assetMergingProfileIds.includes(p.id)}
                                  className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                >
                                  {assetMergingProfileIds.includes(p.id) ? '合并中...' : '合并档案'}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-base/20">
                              <td colSpan={6} className="px-4 py-4">
                                <div className="space-y-2">
                                  {records.length === 0 ? (
                                    <div className="text-sm text-text-secondary">暂无关联记录</div>
                                  ) : (
                                    records.map((record) => (
                                      <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-base/40 px-3 py-2">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm text-text-primary truncate">
                                            {record.question || record.summaryLine || record.id}
                                          </div>
                                          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{record.routeType}</span>
                                            <span>{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                                            <span>{record.status || '-'}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => {
                                              setAssetRecordId(record.id);
                                              fetchAssetRecordDetail(record.id);
                                            }}
                                            className="px-3 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-sm"
                                          >
                                            查看详情
                                          </button>
                                          <button
                                            onClick={() => handleAssetUnlinkRecord(p.id, record.id)}
                                            disabled={assetUnlinkingRecordIds.includes(record.id)}
                                            className="px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50"
                                          >
                                            {assetUnlinkingRecordIds.includes(record.id) ? '解绑中...' : '解除关联'}
                                          </button>
                                          <button
                                            onClick={() => handleAssetRebindRecord(p.id, record.id)}
                                            disabled={assetRebindingRecordIds.includes(record.id)}
                                            className="px-3 py-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm disabled:opacity-50"
                                          >
                                            {assetRebindingRecordIds.includes(record.id) ? '重绑中...' : '重绑档案'}
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {assetProfiles.length === 0 && !assetLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">暂无数据</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {assetProfilesTotal > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-sm text-text-secondary">
                    共 {assetProfilesTotal} 条，第 {assetProfilesPage} 页
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssetProfilesPage((p) => Math.max(1, p - 1))}
                      disabled={assetProfilesPage <= 1}
                      className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setAssetProfilesPage((p) => p + 1)}
                      disabled={assetProfilesPage * 20 >= assetProfilesTotal}
                      className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-elevated rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-surface-base border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">未建档记录</h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    已留存咨询，但暂未沉淀为人物档案的记录。
                  </p>
                </div>
                <div className="text-xs text-text-secondary">
                  {assetLooseRecordsTotal} 条
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-base">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">问题</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">未建档原因</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">类型</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {assetLooseRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-surface-base/50">
                        <td className="px-4 py-3 text-sm text-text-primary">
                          <div className="space-y-1">
                            <div className="truncate">{record.question || record.summaryLine || record.id}</div>
                            <div className="text-xs text-text-secondary font-mono">{record.id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          <div className="space-y-1">
                            <div className="font-medium text-text-primary">{record.reasonLabel || '-'}</div>
                            {record.reasonHint ? (
                              <div className="max-w-sm text-xs leading-5 text-text-secondary">{record.reasonHint}</div>
                            ) : null}
                            {record.actionHint ? (
                              <div className="max-w-sm text-xs leading-5 text-primary/80">{record.actionHint}</div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{record.routeType || '-'}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{record.status || '-'}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {record.createdAt ? new Date(record.createdAt).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setAssetRecordId(record.id);
                                fetchAssetRecordDetail(record.id);
                              }}
                              className="px-3 py-1 rounded bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                            >
                              查看详情
                            </button>
                            <button
                              onClick={() => handleAssetAssignRecord(record)}
                              className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              手动归档
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {assetLooseRecords.length === 0 && !assetLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                          当前筛选下没有未建档记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {assetLooseRecordsTotal > 20 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-sm text-text-secondary">
                    共 {assetLooseRecordsTotal} 条，第 {assetLooseRecordsPage} 页
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAssetLooseRecordsPage((p) => Math.max(1, p - 1))}
                      disabled={assetLooseRecordsPage <= 1}
                      className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setAssetLooseRecordsPage((p) => p + 1)}
                      disabled={assetLooseRecordsPage * 20 >= assetLooseRecordsTotal}
                      className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-surface-elevated rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-surface-base border-b border-border">
                <h3 className="font-medium text-text-primary">咨询记录详情</h3>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="输入记录 ID 查看详情"
                    value={assetRecordId || ''}
                    onChange={(e) => setAssetRecordId(e.target.value || null)}
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      if (assetRecordId) fetchAssetRecordDetail(assetRecordId);
                    }}
                    disabled={!assetRecordId}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-on-surface disabled:opacity-40"
                  >
                    查询
                  </button>
                </div>

                {assetLoading && (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                )}

                {assetRecordDetail && !assetLoading && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border bg-surface-base/40 p-3">
                        <div className="text-xs text-text-secondary mb-1">记录信息</div>
                        <div className="text-sm text-text-primary space-y-1">
                          <div>{assetRecordDetail.routeType || '-'}</div>
                          <div className="text-text-secondary">{assetRecordDetail.question || assetRecordDetail.summaryLine || '-'}</div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-base/40 p-3">
                        <div className="text-xs text-text-secondary mb-1">复盘状态</div>
                        <div>{renderReviewBadge(assetRecordDetail.reviewStatus)}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-base/40 p-3">
                        <div className="text-xs text-text-secondary mb-1">关联档案</div>
                        <div className="text-sm text-text-primary">
                          {assetRecordDetail.profiles?.length
                            ? assetRecordDetail.profiles.map((profile: any) => profile.name || profile.id).join(' / ')
                            : '-'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-base/40 p-3 md:col-span-3">
                        <div className="text-xs text-text-secondary mb-1">实际结果</div>
                        <div className="text-sm text-text-primary">
                          {assetRecordDetail.closedLoopResult?.actualOutcome || '-'}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-base/40 p-3 md:col-span-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs text-text-secondary">回访 / 追问链</div>
                          <div className="text-xs text-text-secondary">
                            {(assetRecordDetail.followUps || []).length} 条
                          </div>
                        </div>
                        {assetRecordDetail.followUps?.length ? (
                          <div className="space-y-2">
                            {assetRecordDetail.followUps.map((followUp: any) => (
                              <div
                                key={followUp.id}
                                className="rounded-lg border border-border bg-surface-base/30 px-3 py-2"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                                  <span className={`px-2 py-0.5 rounded ${
                                    followUp.status === 'completed'
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : followUp.status === 'sent'
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {followUp.status || 'pending'}
                                  </span>
                                  <span className="text-text-secondary">
                                    计划：{followUp.scheduledAt ? new Date(followUp.scheduledAt).toLocaleString('zh-CN') : '-'}
                                  </span>
                                  <span className="text-text-secondary">
                                    完成：{followUp.completedAt ? new Date(followUp.completedAt).toLocaleString('zh-CN') : '-'}
                                  </span>
                                </div>
                                <div className="text-sm text-text-primary">
                                  {followUp.result?.actualOutcome
                                    || followUp.result?.userReflection
                                    || followUp.result?.accuracyCheck
                                    || '暂无回访结果'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-text-secondary">暂无回访或追问链记录</div>
                        )}
                      </div>
                      <div className="rounded-lg border border-border bg-surface-base/40 p-3 md:col-span-3">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-xs text-text-secondary">行为事件</div>
                          <div className="text-xs text-text-secondary">
                            {assetInteractionEvents.length} 条
                          </div>
                        </div>

                        {assetInteractionEvents.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(assetInteractionEventStats).map(([eventType, count]) => (
                                <span
                                  key={eventType}
                                  className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                                >
                                  {eventType} x {count}
                                </span>
                              ))}
                            </div>

                            <div className="space-y-2">
                              {assetInteractionEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded-lg border border-border bg-surface-base/30 px-3 py-2"
                                >
                                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-cyan-400">
                                      {event.eventType}
                                    </span>
                                    <span className="text-text-secondary">
                                      {event.createdAt ? new Date(event.createdAt).toLocaleString('zh-CN') : '-'}
                                    </span>
                                    {event.userId ? (
                                      <span className="text-text-secondary">user: {event.userId}</span>
                                    ) : null}
                                    {event.sessionId ? (
                                      <span className="text-text-secondary">session: {event.sessionId}</span>
                                    ) : null}
                                  </div>
                                  <pre className="overflow-x-auto text-xs text-text-secondary whitespace-pre-wrap break-all">
                                    {JSON.stringify(event.eventData || {}, null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-text-secondary">暂无行为事件</div>
                        )}
                      </div>
                    </div>
                    {(['inputData', 'calcResult', 'llmResult', 'analysisData'] as const).map((field) => {
                      const value = assetRecordDetail[field];
                      if (value === undefined || value === null) return null;
                      const isExpanded = expandedJsonFields.has(field);
                      const jsonString = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                      return (
                        <div key={field} className="border border-border rounded-lg overflow-hidden">
                          <button
                            onClick={() => {
                              setExpandedJsonFields((prev) => {
                                const next = new Set(prev);
                                if (next.has(field)) next.delete(field);
                                else next.add(field);
                                return next;
                              });
                            }}
                            className="w-full flex items-center justify-between px-4 py-2 bg-surface-base hover:bg-surface-base/80 text-sm font-medium text-text-primary"
                          >
                            <span>{field}</span>
                            <span className="text-text-secondary text-xs">{isExpanded ? '收起' : '展开'}</span>
                          </button>
                          {isExpanded && (
                            <pre className="p-4 text-xs text-text-secondary overflow-x-auto max-h-96 overflow-y-auto bg-surface-base/30">
                              {jsonString}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!assetRecordDetail && !assetLoading && (
                  <p className="text-center text-text-secondary py-8 text-sm">输入记录 ID 查看详情</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'naming' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">问题</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">取名类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {namingLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!namingLoading && namingRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">{r.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.user?.nickname || r.user?.email || '游客'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {r.question || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
                          {r.namingType || 'quming'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.status === 'completed'
                            ? 'bg-green-500/10 text-green-400'
                            : r.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-on-surface-variant/60'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(r.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {!namingLoading && namingRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">暂无数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {namingTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-secondary">
                  共 {namingTotal} 条，第 {namingPage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNamingPage((p) => Math.max(1, p - 1))}
                    disabled={namingPage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setNamingPage((p) => p + 1)}
                    disabled={namingPage * 20 >= namingTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'question' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-surface-base border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-text-primary">问事记录</h3>
              <select
                value={questionReviewFilter}
                onChange={(e) => {
                  setQuestionReviewFilter(e.target.value as 'all' | 'pending' | 'verified' | 'expired');
                  setQuestionPage(1);
                }}
                className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">全部复盘状态</option>
                <option value="pending">待回看</option>
                <option value="verified">已回看</option>
                <option value="expired">已过期</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">问题</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">分流类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">意图</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">复盘</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">实际结果</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {questionLoading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!questionLoading && questionRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">{r.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.user?.nickname || r.user?.email || '游客'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {r.question || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium">
                          {r.routeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {r.questionIntent || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {renderReviewBadge(r.reviewStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {r.closedLoopResult?.actualOutcome || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.status === 'completed'
                            ? 'bg-green-500/10 text-green-400'
                            : r.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-on-surface-variant/60'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(r.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {!questionLoading && questionRecords.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">暂无数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {questionTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-secondary">
                  共 {questionTotal} 条，第 {questionPage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuestionPage((p) => Math.max(1, p - 1))}
                    disabled={questionPage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setQuestionPage((p) => p + 1)}
                    disabled={questionPage * 20 >= questionTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'kline' && (
          <>
          <KlineV2AdminSection />
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-surface-base border-b border-border flex items-center justify-between">
              <h3 className="font-medium text-text-primary">K线记录</h3>
              <select
                value={klineReviewFilter}
                onChange={(e) => {
                  setKlineReviewFilter(e.target.value as 'all' | 'pending' | 'verified' | 'expired');
                  setKlinePage(1);
                }}
                className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">全部复盘状态</option>
                <option value="pending">待回看</option>
                <option value="verified">已回看</option>
                <option value="expired">已过期</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">问题</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">解锁状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">复盘</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">实际结果</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {klineLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!klineLoading && klineRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">{r.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.user?.nickname || r.user?.email || '游客'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {r.question || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.unlockStatus === 'unlocked_full'
                            ? 'bg-green-500/10 text-green-400'
                            : r.unlockStatus === 'unlocked_partial'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-on-surface-variant/60'
                        }`}>
                          {r.unlockStatus || 'preview'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {renderReviewBadge(r.reviewStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate">
                        {r.closedLoopResult?.actualOutcome || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.status === 'completed'
                            ? 'bg-green-500/10 text-green-400'
                            : r.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-on-surface-variant/60'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {new Date(r.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  {!klineLoading && klineRecords.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">暂无数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {klineTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-secondary">
                  共 {klineTotal} 条，第 {klinePage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setKlinePage((p) => Math.max(1, p - 1))}
                    disabled={klinePage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setKlinePage((p) => p + 1)}
                    disabled={klinePage * 20 >= klineTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {activeTab === 'unlock-records' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">解锁类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {unlockLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!unlockLoading && unlockRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">{r.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.user?.nickname || r.user?.email || r.userId?.slice(0, 8) || '游客'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
                          {r.unlockType || r.type || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.status === 'completed' || r.status === 'success'
                            ? 'bg-green-500/10 text-green-400'
                            : r.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-gray-500/10 text-on-surface-variant/60'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                  {!unlockLoading && unlockRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">暂无记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {unlockTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-secondary">
                  共 {unlockTotal} 条，第 {unlockPage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUnlockPage((p) => Math.max(1, p - 1))}
                    disabled={unlockPage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setUnlockPage((p) => p + 1)}
                    disabled={unlockPage * 20 >= unlockTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'credit-usage' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">消耗积分</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用途</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {creditUsageLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!creditUsageLoading && creditUsageRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">{r.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.user?.nickname || r.user?.email || r.userId?.slice(0, 8) || '游客'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.credits || r.amount || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs font-medium">
                          {r.usageType || r.purpose || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                  {!creditUsageLoading && creditUsageRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">暂无记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {creditUsageTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-secondary">
                  共 {creditUsageTotal} 条，第 {creditUsagePage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreditUsagePage((p) => Math.max(1, p - 1))}
                    disabled={creditUsagePage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setCreditUsagePage((p) => p + 1)}
                    disabled={creditUsagePage * 20 >= creditUsageTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'llm-failures' && (
          <div className="bg-surface-elevated rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-base">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">失败原因</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">模型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {llmFailureLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {!llmFailureLoading && llmFailureRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-base/50">
                      <td className="px-4 py-3 text-sm text-text-secondary font-mono">{r.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {r.user?.nickname || r.user?.email || r.userId?.slice(0, 8) || '游客'}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-400 max-w-xs truncate">
                        {r.error || r.reason || r.errorMessage || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-medium">
                          {r.model || r.llmModel || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                  {!llmFailureLoading && llmFailureRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">暂无记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {llmFailureTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-secondary">
                  共 {llmFailureTotal} 条，第 {llmFailurePage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLlmFailurePage((p) => Math.max(1, p - 1))}
                    disabled={llmFailurePage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setLlmFailurePage((p) => p + 1)}
                    disabled={llmFailurePage * 20 >= llmFailureTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-base text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="bg-surface-elevated rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <span>状态</span>
                  <select
                    value={feedbackStatusFilter}
                    onChange={(e) => {
                      setFeedbackStatusFilter(e.target.value as 'all' | 'pending' | 'reviewed' | 'applied');
                      setFeedbackPage(1);
                    }}
                    className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary"
                  >
                    <option value="all">全部</option>
                    <option value="pending">待处理</option>
                    <option value="reviewed">已标注</option>
                    <option value="applied">已归档</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <span>评分</span>
                  <select
                    value={feedbackRatingFilter}
                    onChange={(e) => {
                      setFeedbackRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as 1 | 2 | 3 | 4 | 5);
                      setFeedbackPage(1);
                    }}
                    className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary"
                  >
                    <option value="all">全部</option>
                    <option value="1">1 星</option>
                    <option value="2">2 星</option>
                    <option value="3">3 星</option>
                    <option value="4">4 星</option>
                    <option value="5">5 星</option>
                  </select>
                </label>
              </div>
              <button
                onClick={() => fetchFeedbackRecords(feedbackPage)}
                className="px-4 py-2 rounded-lg bg-surface-base text-text-primary border border-border"
              >
                刷新
              </button>
            </div>

            <div className="space-y-4">
              {feedbackLoading && (
                <div className="bg-surface-elevated rounded-2xl p-8 flex justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}

              {!feedbackLoading && feedbackRecords.map((record) => {
                const draft = getFeedbackDraft(record);
                return (
                  <div key={record.id} className="bg-surface-elevated rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="px-2 py-1 rounded bg-surface-base text-xs text-text-secondary">{record.record.routeType}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            record.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400'
                              : record.status === 'reviewed'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {record.status === 'pending' ? '待处理' : record.status === 'reviewed' ? '已标注' : '已归档'}
                          </span>
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs">{record.rating} 星</span>
                        </div>
                        <div className="text-sm text-text-primary font-medium">{record.record.question || '无问题描述'}</div>
                        <div className="text-xs text-text-secondary">
                          用户：{record.user?.nickname || record.user?.email || '游客'} · 反馈时间：{new Date(record.createdAt).toLocaleString('zh-CN')}
                        </div>
                        <div className="text-sm text-text-secondary whitespace-pre-wrap">
                          {record.comment || '用户未填写文字反馈'}
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary space-y-1 md:text-right">
                        <div>记录ID：{record.recordId.slice(0, 8)}...</div>
                        <div>来源：{record.record.sourceEntry || 'direct'}</div>
                        <div>评分维度：准确 {record.accuracy ?? '-'} / 有用 {record.helpfulness ?? '-'} / 语气 {record.tone ?? '-'}</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <label className="flex flex-col gap-2 text-sm text-text-secondary">
                        <span>结论是否正确</span>
                        <select
                          value={draft.isJudgmentCorrect ? 'true' : 'false'}
                          onChange={(e) => updateFeedbackDraft(record.id, { isJudgmentCorrect: e.target.value === 'true' })}
                          className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary"
                        >
                          <option value="false">需要修正</option>
                          <option value="true">基本正确</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm text-text-secondary">
                        <span>问题分类</span>
                        <select
                          value={draft.calibrationTag}
                          onChange={(e) => updateFeedbackDraft(record.id, { calibrationTag: e.target.value })}
                          className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary"
                        >
                          {FEEDBACK_TAG_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => submitFeedbackReview(record)}
                          className="px-4 py-2 rounded-lg bg-primary text-on-surface"
                        >
                          保存标注
                        </button>
                        <button
                          onClick={() => applyFeedback(record)}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-on-surface"
                        >
                          标记已处理
                        </button>
                      </div>
                    </div>

                    <label className="flex flex-col gap-2 text-sm text-text-secondary">
                      <span>管理员备注</span>
                      <textarea
                        rows={3}
                        value={draft.calibrationNote}
                        onChange={(e) => updateFeedbackDraft(record.id, { calibrationNote: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-surface-base border border-border text-text-primary resize-y"
                        placeholder="记录测试问题、复现路径、处理结论"
                      />
                    </label>

                    {(record.reviewer || record.appliedAt) && (
                      <div className="text-xs text-text-secondary border-t border-border pt-3">
                        标注人：{record.reviewer?.nickname || record.reviewer?.email || '-'}
                        {record.appliedAt ? ` · 已处理时间：${new Date(record.appliedAt).toLocaleString('zh-CN')}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}

              {!feedbackLoading && feedbackRecords.length === 0 && (
                <div className="bg-surface-elevated rounded-2xl p-8 text-center text-text-secondary">
                  暂无反馈记录
                </div>
              )}
            </div>

            {feedbackTotal > 20 && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-text-secondary">
                  共 {feedbackTotal} 条，第 {feedbackPage} 页
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                    disabled={feedbackPage <= 1}
                    className="px-3 py-1 text-sm rounded bg-surface-elevated text-text-secondary disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setFeedbackPage((p) => p + 1)}
                    disabled={feedbackPage * 20 >= feedbackTotal}
                    className="px-3 py-1 text-sm rounded bg-surface-elevated text-text-secondary disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {assetTargetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface-elevated shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="text-base font-semibold text-text-primary">
                  {assetTargetPicker.mode === 'merge' ? '选择合并目标档案' : '选择重绑目标档案'}
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  {assetTargetPickerSourceProfile
                    ? `当前源档案：${assetTargetPickerSourceProfile.name || assetTargetPickerSourceProfile.id}`
                    : assetTargetPicker.sourceRecord
                      ? `待归档记录：${assetTargetPicker.sourceRecord.question || assetTargetPicker.sourceRecord.id}`
                    : '请选择一个目标档案'}
                </div>
              </div>
              <button
                onClick={() => {
                  setAssetTargetPicker(null);
                  setAssetTargetSearch('');
                  setAssetCreateDraft({
                    name: '',
                    birthDate: '',
                    birthTime: '',
                    gender: '',
                    birthPlace: '',
                  });
                }}
                className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-base"
              >
                关闭
              </button>
            </div>

            <div className="px-5 py-4">
              <input
                type="text"
                placeholder="按姓名、生日、档案ID、四柱搜索"
                value={assetTargetSearch}
                onChange={(e) => setAssetTargetSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {assetTargetPicker.sourceRecord && (
              <div className="border-t border-border px-5 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">没有合适档案时，直接新建并绑定</div>
                    <div className="mt-1 text-xs text-text-secondary">
                      这条记录会新建独立人物档案，再自动绑定到该档案。
                    </div>
                  </div>
                  <button
                    onClick={() => submitAssetCreateProfile()}
                    disabled={assetCreatingRecordIds.includes(assetTargetPicker.recordId || '')}
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-on-surface disabled:opacity-40"
                  >
                    {assetCreatingRecordIds.includes(assetTargetPicker.recordId || '') ? '创建中...' : '新建档案并绑定'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="姓名 / 标识"
                    value={assetCreateDraft.name}
                    onChange={(e) => setAssetCreateDraft((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="date"
                    value={assetCreateDraft.birthDate}
                    onChange={(e) => setAssetCreateDraft((prev) => ({ ...prev, birthDate: e.target.value }))}
                    className="rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="出生时辰，如 03:00 / 丑时"
                    value={assetCreateDraft.birthTime}
                    onChange={(e) => setAssetCreateDraft((prev) => ({ ...prev, birthTime: e.target.value }))}
                    className="rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <select
                    value={assetCreateDraft.gender}
                    onChange={(e) => setAssetCreateDraft((prev) => ({ ...prev, gender: e.target.value }))}
                    className="rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">未填写性别</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                  <input
                    type="text"
                    placeholder="出生地 / 常住地"
                    value={assetCreateDraft.birthPlace}
                    onChange={(e) => setAssetCreateDraft((prev) => ({ ...prev, birthPlace: e.target.value }))}
                    className="rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-primary md:col-span-2"
                  />
                </div>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto px-5 pb-5">
              <div className="space-y-2">
                {assetTargetCandidates.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => submitAssetTargetPicker(profile.id)}
                    className="w-full rounded-xl border border-border bg-surface-base/50 px-4 py-3 text-left hover:border-primary/40 hover:bg-surface-base"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-text-primary">
                          {profile.name || '未命名档案'}
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">
                          {profile.birthDate || '-'} {profile.birthTime || ''} · {profile.gender || '-'} · {profile.id}
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">
                          {profile.yearPillar || '-'} / {profile.monthPillar || '-'} / {profile.dayPillar || '-'} / {profile.hourPillar || '-'}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-text-secondary">
                        {profile.recordsCount ?? 0} 条记录
                      </div>
                    </div>
                  </button>
                ))}

                {assetTargetCandidates.length === 0 && (
                  <div className="rounded-xl border border-border bg-surface-base/30 px-4 py-8 text-center text-sm text-text-secondary">
                    当前筛选范围内没有可选目标档案，请先创建或补齐人物档案。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, highlight }: { title: string; value: number; icon: string; highlight?: boolean }) {
  return (
    <div className={`bg-surface-elevated rounded-xl p-4 ${highlight ? 'ring-1 ring-primary/30' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
          <p className="text-sm text-text-secondary">{title}</p>
        </div>
      </div>
    </div>
  );
}
