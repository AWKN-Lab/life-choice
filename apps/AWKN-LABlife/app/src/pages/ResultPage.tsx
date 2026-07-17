import React from 'react';
import { Suspense, lazy, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ReasoningPanel from '@/components/ReasoningPanel';
import { useConsultStore } from '@/store/consultStore';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { BottomNav } from '@/components/BottomNav';
import { BaziSidePanel } from '@/components/result/BaziSidePanel';
import { AuthModal } from '@/components/AuthModal';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PageHeader } from '@/components/layout/PageHeader';
import { trackEvent } from '@/lib/analytics';
import { getSessionId } from '@/lib/analytics';
import LiuRenEngine from '@/lib/liuren-engine';
import { ENGINE_NAMES, routeIntent, routeIntentWithFallback, type RoutingResult } from '@/lib/intentRouter';
import type { RouteType } from '@/types/api';
import type { ConsultType, ConsultResponse } from '@/types';
import type { CelebrityCase } from '@/types/lifekline';
import { consultApi } from '@/api/consult';
import { ApiError } from '@/api/client';
import { getSocket, type ProgressPayload, type ResultPayload } from '@/lib/websocket';
import { useLLMStream } from '@/hooks/useLLMStream';
import { useRitualProgress } from '@/hooks/useRitualProgress';
import { isEnabled } from '@/lib/feature-flag';
import DivinationRitualLoader from '@/components/DivinationRitualLoader';
import DailyFortune from '@/components/fortune/DailyFortune';
import BaziComparisonPanel from '@/components/celebrity/BaziComparisonPanel';
import { KLineImageGenerator } from '@/components/KLineImageGenerator';
import { LongCycleReport } from '@/components/kline/LongCycleReport';
import { AnnualReview } from '@/components/kline/AnnualReview';
import { RecordComparison } from '@/components/kline/RecordComparison';
import { KlineSkeleton } from '@/components/kline/KlineSkeleton';
import { membershipApi } from '@/api/membership';
import { CountdownTimer } from '@/components/CountdownTimer';
import '@/lib/i18n';
import { safetyCopyFilter } from '@/utils/safetyCopyCheck';

import { USE_MOCK, deterministicInt, generateLocalBreakthroughModuleContent, generateLocalMorningModuleContent, generateUnifiedResult, WUXING_LABELS, WUXING_COLORS, getWuxingCounts, getCurrentDaYun, normalizeCalcResult, cleanDisplayText, cleanDisplayList, normalizeModuleContentForDisplay, estimateClientBaziProfile } from "@/components/result/resultUtils";
import type { KlineAspect } from '@/lib/destinyKline/types';
import { type UnifiedResult } from "@/components/result/resultTypes";
import { Icon } from "@/components/result/Icon";
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InitialZipingAlgorithmPanel } from "@/components/result/InitialZipingAlgorithmPanel";
import { InitialLiurenAlgorithmPanel } from "@/components/result/InitialLiurenAlgorithmPanel";
import { InitialQumingAlgorithmPanel } from "@/components/result/InitialQumingAlgorithmPanel";
import { ZhangbanshanOutput } from "@/components/result/ZhangbanshanOutput";
import { ReasoningSteps } from "@/components/result/ReasoningSteps";
import { Timeline } from "@/components/result/Timeline";
import { AdvancedReportSection } from "@/components/result/AdvancedReportSection";
import { StructuredReport } from "@/components/result/StructuredReport";
import { CitationsCard } from "@/components/result/CitationsCard";
import { MultiRoundFilter } from "@/components/naming/MultiRoundFilter";
import { RenameComparison } from "@/components/naming/RenameComparison";
import { BrandStrategy } from "@/components/naming/BrandStrategy";
import { NamingPDFExport } from "@/components/naming/NamingPDFExport";
import { FeedbackWidget } from "@/components/result/FeedbackWidget";
import BaZiDetail from '@/components/BaZiDetail';
import { PosterGenerator } from '@/components/PosterGenerator';
import AnalysisResult from '@/components/AnalysisResult';
import { KLineShareCard } from '@/components/KLineShareCard';
import { useMembershipTier } from '@/hooks/useMembershipTier';
import { callRealEngine } from '@/lib/localEngine';
import { useKlinePolling } from '@/hooks/useKlinePolling';
import { loadConsultData, saveConsultData } from '@/lib/consultDataMigration';

/** 时辰转换（24小时制转十二时辰） */
const HOUR_TO_ZHISHI: Record<number, string> = {
  0: '子时', 1: '丑时', 2: '丑时', 3: '寅时',
  4: '寅时', 5: '卯时', 6: '卯时', 7: '辰时',
  8: '辰时', 9: '巳时', 10: '巳时', 11: '午时',
  12: '午时', 13: '未时', 14: '未时', 15: '申时',
  16: '申时', 17: '酉时', 18: '酉时', 19: '戌时',
  20: '戌时', 21: '亥时', 22: '亥时', 23: '子时',
};

// 引擎图标映射 (Material Symbols 名称)
const ENGINE_ICON_NAMES: Record<string, string> = {
  liuren: 'explore',
  ziping: 'visibility',
  zhangsheng: 'trending_up',
  quming: 'group',
  liuyao: 'auto_awesome',
  qimen: 'explore',
};

const TEMP_RECORD_ID_RE = /^(NAME|Q|KLINE|HOME|LIUREN|ZIPING|QUMING|LOCAL)_/;

// VIP服务配置
const VIP_SERVICES = [
  { id: 'breakthrough', iconName: 'cruelty_free' },
  { id: 'morning', iconName: 'calendar_month' },
  { id: 'kline', iconName: 'show_chart' },
];

const LazyResultChat = lazy(() => import('@/components/result/ResultChat').then((module) => ({ default: module.ResultChat })));
const LazyReportDashboard = lazy(() => import('@/components/result/ReportDashboard').then((module) => ({ default: module.ReportDashboard })));
const LazyDialogueChat = lazy(() => import('@/components/dialogue/DialogueChat').then((module) => ({ default: module.DialogueChat })));
const LazyPosterModal = lazy(() => import('@/components/result/PosterModal').then((module) => ({ default: module.PosterModal })));
const LazyPaywallModal = lazy(() => import('@/components/result/PaywallModal').then((module) => ({ default: module.PaywallModal })));
const LazyResultAdvancedTools = lazy(() => import('@/components/result/ResultAdvancedTools').then((module) => ({ default: module.ResultAdvancedTools })));
const LazyConclusionPreview = lazy(() => import('@/components/conclusion/ConclusionPreview'));
const LazyValuesDashboard = lazy(() => import('@/components/MultiEnding/MultiEndingDisplay').then((module) => ({ default: module.ValuesDashboard })));

function ResultSectionFallback({ label = '加载中...' }: { label?: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center px-6 py-8">
      <LoadingState label={label} />
    </div>
  );
}


export function ResultPage() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguageStore();
  const { recordId: routeRecordId } = useParams<{ recordId?: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resolvedUrlRecordId = routeRecordId || searchParams.get('id');

  // P1-1: 流式 LLM 文本（仅在 recordId 来自 URL 时启用）
  const llmStream = useLLMStream(resolvedUrlRecordId);
  const zhiShiLabel = (hour: number) => {
    const normalizedHour = ((Math.floor(Number(hour) || 0) % 24) + 24) % 24;
    const label = HOUR_TO_ZHISHI[normalizedHour] || '午时';
    return t(`resultPage.hourBranches.${label.replace('时', '')}`, { defaultValue: label });
  };
  const navigate = useNavigate();
  const { saveRecord, consultType, setConsultType, updateRecordModuleContent } = useConsultStore();
  const { isAuthenticated, user, hasHydrated, updateUser } = useAuthStore();

  const savedRef = useRef(false);
  const exposedRef = useRef(false);
  const authCheckedRef = useRef(false);

  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // VIP模块内容
  const [moduleContent, setModuleContent] = useState<any>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleRetryKey, setModuleRetryKey] = useState(0);
  const [vipUnlockError, setVipUnlockError] = useState<string | null>(null);

  // 视图模式：chat=聊天模式，report=报告模式
  const [viewMode, setViewMode] = useState<'chat' | 'report' | 'dialogue'>('chat');

  // 反馈组件延迟显示：5层漏斗全部展示完毕后才出现
  const [showFeedback, setShowFeedback] = useState(false);

  // P0-2: K线后端单一真源 — 不再本地重算，后端数据缺失时返回降级标记
  const enrichKlineAspects = useCallback((content: any, calcResult: any, celebrityData?: CelebrityCase[]): any => {
    if (!content || !calcResult) return content;
    const hasAspects = content.aspects?.career?.points?.length > 0
      || content.aspects?.wealth?.points?.length > 0
      || content.aspects?.relationship?.points?.length > 0;
    if (hasAspects) return content;
    // 后端 aspects 为空 = 数据缺失，标记降级状态供渲染层显示降级 UI
    return { ...content, _klineDegraded: true };
  }, []);

  // K线图视图模式
  const [klineViewMode, setKlineViewMode] = useState<'year' | 'month' | 'wuxing' | 'fortune' | 'celebrity'>('year');
  const [klineYearMode, setKlineYearMode] = useState<'year' | 'yearMonth'>('year');
  const [klineRangeYears, setKlineRangeYears] = useState<80 | 100>(100);
  const [mobileKlineExpanded, setMobileKlineExpanded] = useState(false);
  const [activeAspect, setActiveAspect] = useState<KlineAspect>('overall');
  const [activeShortCycle, setActiveShortCycle] = useState<string | null>(null);

  const [celebrityCases, setCelebrityCases] = useState<CelebrityCase[]>([]);

  // K线轮询状态通过 useKlinePolling hook 管理（见 moduleId 声明后）

  // 实时生成进度（WebSocket 推送）
  const [liveProgress, setLiveProgress] = useState<{ progress: number; message: string } | null>(null);
  const wsUnsubRef = useRef<(() => void) | null>(null);

  // P1-2: routeType 在 isLoading 阶段也需要访问，提升到组件级 state
  const [currentRouteType, setCurrentRouteType] = useState<string>('general');

  // P1-2: 仪式进度 hook
  const { ritualType } = useRitualProgress({
    routeType: currentRouteType,
    liveProgress: liveProgress || undefined,
    isLLMStreaming: llmStream.streaming,
  });

  const [aiFollowUp, setAiFollowUp] = useState('');
  const [aiQaHistory, setAiQaHistory] = useState<{ q: string; a: string }[]>([]);
  const [shareQuality, setShareQuality] = useState<'basic' | 'hd' | 'report'>('basic');
  const [showPoster, setShowPoster] = useState(false);
  // P2-1: 付费墙倒计时 + 限免
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallExpireTime, setPaywallExpireTime] = useState<Date | null>(null);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [analysisContent, setAnalysisContent] = useState<string>('');
  const [pendingFollowUpQuestion, setPendingFollowUpQuestion] = useState<string | null>(null);

  // 预览设备模式
  // P2-5: 管理员判断统一为常量，消除内联函数（仅管理员语义，非会员等级）
  const isAdmin = user?.isAdmin === true;

  const canAccessFullKline = () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return false;
    const level = currentUser.membership || currentUser.plan || 'free';
    return level === 'monthly' || level === 'yearly' || currentUser.isAdmin;
  };

  const membershipTier = useMembershipTier();

  const isYearlyMember = () => {
    return membershipTier === 'yearly';
  };

  // 存储 sessionStorage 中的咨询数据用于显示
  const [consultData, setConsultData] = useState<{
    question?: string;
    birthDate?: string;
    birthHour?: number;
    city?: string;
    gender?: string;
    askTime?: string;
    namingType?: string;
    originalName?: string;
    sourceEntry?: string;
  }>({});

  const persistResolvedRecordId = useCallback((recordId?: string, extra?: Partial<Parameters<typeof saveConsultData>[0]>) => {
    if (!recordId || TEMP_RECORD_ID_RE.test(recordId)) return;
    saveConsultData({
      record_id: recordId,
      ...extra,
    });
  }, []);

  const loadResult = useCallback(async () => {
    try {
      // 优先从 URL 参数获取 record_id（用于从历史记录或深入推演进入）
      const urlRecordId = resolvedUrlRecordId;
      const urlModuleId = searchParams.get('module');

      if (urlRecordId && !TEMP_RECORD_ID_RE.test(urlRecordId)) {
        // 从 URL 进入 - 调用 API 获取记录
        setIsLoading(true);
        try {
          const moduleParam = urlModuleId || undefined;
          const recordData = await consultApi.getRecord(urlRecordId, moduleParam, currentLanguage) as any;

          // 检查是否返回了有效数据（completed 的记录会直接返回数据，没有 status 字段）
          // 如果有 status 字段且为 processing，说明还在处理中
          if (recordData.route_type && recordData.summary_line) {
            const unifiedResult: UnifiedResult = {
              ...(recordData as any),
              route_type: recordData.route_type as RouteType,
              record_id: recordData.record_id,
              currentQuestion: recordData.question || recordData.currentQuestion,
              summary_line: recordData.summary_line || '',
              summary_body: recordData.summary_body || recordData.overview || '',
              risks: recordData.risk_block || [],
              actions: recordData.action_block || [],
              time_window: recordData.window_block || recordData.time_window || '',
              evidence_fold: recordData.evidence_fold || '',
              paywall_modules: recordData.paywall_modules || [],
              calc_result: recordData.calc_result,
            };

            setResult(unifiedResult);
            persistResolvedRecordId(recordData.record_id, {
              route_type: recordData.route_type,
              question: recordData.question || recordData.currentQuestion,
            });
            // P1-2: 将 routeType 提升到组件级 state
            setCurrentRouteType(recordData.route_type as string);
            // 修复 RouteType 不能赋值给 ConsultType 的问题
            const validRouteTypes: RouteType[] = ['liuren', 'ziping', 'zhangsheng', 'quming', 'liuyao', 'qimen'];
            if (validRouteTypes.includes(recordData.route_type as RouteType)) {
              setConsultType(recordData.route_type as ConsultType);
            }

            // 如果有模块内容（从 URL 带 module 参数）
            if (recordData.module_content) {
              const enriched = urlModuleId === 'kline'
                ? enrichKlineAspects(recordData.module_content, recordData.calc_result, celebrityCases)
                : recordData.module_content;
              setModuleContent(enriched);
            }

            trackEvent('result_page_load', {
              route_type: recordData.route_type,
              from_url: true,
              has_module: !!urlModuleId,
            });

            setIsLoading(false);
            return;
          } else if (recordData.status === 'processing') {
            // 记录还在处理中
            setError(t('resultPage.errors.processing'));
            setIsLoading(false);
            return;
          } else {
            // 数据无效
            setError(t('resultPage.errors.cannotLoad'));
            setIsLoading(false);
            return;
          }
        } catch (apiError) {
          console.error('从URL加载记录失败:', apiError);
          
          // API 失败时，如果是管理员，尝试从 consultStore 获取记录
          if (isAdmin) {
            const consultStore = useConsultStore.getState();
            const record = consultStore.records.find(r => r.id === urlRecordId);
            
            if (record) {
              const unifiedResult: UnifiedResult = {
                route_type: record.type as RouteType,
                record_id: record.id,
                currentQuestion: record.question,
                summary_line: record.response.summary_line || '',
                summary_body: record.response.summary_body || '',
                risks: record.response.risks || [],
                actions: record.response.actions || [],
                time_window: record.response.time_window || '',
              evidence_fold: record.response.evidence_fold || '',
              paywall_modules: record.response.paywall_modules || [],
              calc_result: record.response.calc_result,
              module_content: record.response.module_content,
            };
              setResult(unifiedResult);
              setConsultType(record.type);
              setIsLoading(false);
              return;
            }
          }
          
          // 继续尝试从 sessionStorage 加载
        }
      }

      // 从 Zustand + sessionStorage 获取咨询数据（双轨持久化）
      const draft = loadConsultData();
      if (!draft) {
        // 如果是管理员且没有数据，生成演示数据
        if (isAdmin) {
          saveConsultData({
            route_type: 'ziping',
            question: '演示咨询',
            birth_date: '2001-04-18',
            birth_hour: 12,
            birth_minute: 0,
            gender: 'male',
            city: '北京',
            from_home: true,
          });
          // 递归调用重新加载
          loadResult();
          return;
        }
        setError(t('resultPage.loadFailed'));
        setErrorDetail('没有咨询数据，请从首页开始咨询');
        setIsLoading(false);
        return;
      }

      const data = draft;
      let routeType = (data.route_type || 'liuren') as RouteType;
      if (routeType === 'zhangsheng') {
        routeType = 'ziping';
        data.route_type = 'ziping';
        saveConsultData({ route_type: 'ziping' });
      }
      if (data.question) {
        const rerouted = await routeIntentWithFallback(data.question, {
          hasBirthInfo: !!data.birth_date,
          hasAskTime: !!data.ask_time,
          hasGender: !!data.gender,
          hasCity: !!data.city,
        });
        if (routeType === 'liuren' && rerouted.route_type === 'ziping') {
          routeType = 'ziping';
          data.route_type = 'ziping';
          saveConsultData({ route_type: 'ziping' });
        }
      }

      // P1-2: 将 routeType 提升到组件级 state，供 isLoading 阶段使用
      setCurrentRouteType(routeType);

      // 保存用于 UI 显示
      if (routeType === 'ziping') {
        setConsultData({
          question: data.question,
          birthDate: data.birth_date,
          birthHour: data.birth_hour,
          city: data.city,
          gender: data.gender,
          sourceEntry: data.source_entry,
        });
      } else if (routeType === 'liuren') {
        setConsultData({
          question: data.question,
          askTime: data.ask_time,
          city: data.city,
        });
      } else if (routeType === 'quming') {
        setConsultData({
          question: data.question,
          birthDate: data.birth_date,
          birthHour: data.birth_hour,
          gender: data.gender,
          namingType: data.namingType,
          originalName: data.surname || data.originalName,
        });
      }

      trackEvent('result_page_load', {
        route_type: routeType,
        from_home: data.from_home,
      });

      // 东方命理命理页需要检测登录状态
      const sourceEntry = data.source_entry;
      const isKlineEntry = sourceEntry === 'kline';

      if (routeType === 'ziping' && !isAuthenticated && !isKlineEntry && !authCheckedRef.current) {
        authCheckedRef.current = true;
        setShowAuthModal(true);
        setIsLoading(false);
        return;
      }

      // 调用引擎或API生成结果
      let unifiedResult: UnifiedResult;

      if (USE_MOCK) {
        // Mock 模式：本地计算八字，但八字排盘需要登录
        if (routeType === 'ziping' && !isAuthenticated && !isKlineEntry) {
          setShowAuthModal(true);
          setIsLoading(false);
          return;
        }
        unifiedResult = await callRealEngine(routeType, data as unknown as Record<string, unknown>, t, currentLanguage);
      } else {
        // 非 Mock 模式：初步结论只调用后端算法，LLM 留到模块展开时再使用。
        // 先尝试调用 analyze API
        try {
          const analyzeData: any = {
            routeType: routeType,
            question: data.question,
            sessionId: data.session_id || getSessionId(),
          };

          if (routeType === 'liuren') {
            analyzeData.askTime = data.ask_time;
            analyzeData.askLocation = data.city;
          } else if (routeType === 'ziping' || routeType === 'quming') {
            if (!data.birth_date) {
              if (routeType === 'ziping') {
                throw new Error('MISSING_BIRTH_DATE');
              }
            } else {
              analyzeData.birthDate = data.birth_date;
            }
            if (data.birth_hour !== undefined) {
              analyzeData.birthTime = `${String(data.birth_hour).padStart(2, '0')}:${String(data.birth_minute || 0).padStart(2, '0')}`;
            }
            if (data.city) analyzeData.birthPlace = data.city;
            if (data.gender) analyzeData.gender = data.gender;
            if (routeType === 'quming') {
              analyzeData.surname = data.surname;
              analyzeData.parentWish = data.parentWish;
              analyzeData.avoidChars = data.avoidChars;
            }
          }

          analyzeData.lang = currentLanguage;

          const apiResult = await consultApi.analyze(analyzeData) as any;
          unifiedResult = {
            ...(apiResult as any),
            route_type: apiResult.route_type as RouteType,
            record_id: apiResult.record_id,
            currentQuestion: data.question || apiResult.currentQuestion || apiResult.question,
            summary_line: apiResult.summary_line || '',
            summary_body: apiResult.summary_body || '',
            risks: apiResult.risk_block || apiResult.risks || [],
            actions: apiResult.action_block || apiResult.actions || [],
            time_window: apiResult.window_block || apiResult.time_window || '',
            evidence_fold: apiResult.evidence_fold || '',
            paywall_modules: apiResult.paywall_modules || [],
            // 提取 calc_result 八字数据
            calc_result: apiResult.calc_result,
            zhangbanshan_output: apiResult.zhangbanshan_output,
            toolResults: apiResult.toolResults || apiResult.tool_results,
            timelineEvents: apiResult.timelineEvents || apiResult.timeline_events,
          };
        } catch (apiError) {
          console.error('API 调用失败，fallback 到本地模式:', apiError);
          if (isAuthenticated && !isAdmin) {
            throw apiError;
          }
          // API 失败时 fallback 到本地模式
          unifiedResult = await callRealEngine(routeType, data as unknown as Record<string, unknown>, t, currentLanguage);
        }
      }

      setResult(unifiedResult);
      persistResolvedRecordId(unifiedResult.record_id, {
        route_type: routeType,
        question: data.question,
        source_entry: data.source_entry,
        session_id: data.session_id || getSessionId(),
      });

      const needsCanonicalResultUrl = (
        !resolvedUrlRecordId || TEMP_RECORD_ID_RE.test(resolvedUrlRecordId)
      ) && unifiedResult.record_id && !TEMP_RECORD_ID_RE.test(unifiedResult.record_id);
      if (needsCanonicalResultUrl) {
        const moduleParam = searchParams.get('module');
        navigate(
          moduleParam
            ? `/result/${unifiedResult.record_id}?module=${moduleParam}`
            : `/result/${unifiedResult.record_id}`,
          { replace: true },
        );
      }

      // 确保 consultType 已设置（saveRecord 需要）
      // 使用 getState() 直接读取，避免 consultType 出现在 useCallback deps 中
      // 否则 setConsultType → consultType 变化 → useCallback 重建 → useEffect 重复调用
      if (!useConsultStore.getState().consultType) {
        const validTypes: ConsultType[] = ['liuren', 'ziping', 'liuyao', 'qimen', 'quming', 'zhangsheng'];
        if (validTypes.includes(routeType as unknown as ConsultType)) {
          setConsultType(routeType as unknown as ConsultType);
        }
      }

      // 保存记录（传入自定义 response）
      if (!savedRef.current) {
        savedRef.current = true;
        const customResponse: ConsultResponse = {
          type: routeType as unknown as ConsultType,
          record_id: unifiedResult.record_id,
          summary_line: unifiedResult.summary_line,
          summary_body: unifiedResult.summary_body,
          risks: unifiedResult.risks,
          actions: unifiedResult.actions,
          time_window: unifiedResult.time_window,
          evidence_fold: unifiedResult.evidence_fold,
          paywall_modules: unifiedResult.paywall_modules,
          calc_result: unifiedResult.calc_result,
          module_content: unifiedResult.module_content,
        };
        saveRecord(customResponse);
      }

      trackEvent('result_exposed', {
        route_type: routeType,
        record_id: unifiedResult.record_id,
      });
    } catch (e) {
      console.error('Failed to load result:', e);

      // API 失败时，如果是管理员，尝试本地生成结果
      if (isAdmin) {
        try {
          // 从 Zustand + sessionStorage 获取原始数据
          const draft = loadConsultData();
          if (draft) {
            const data = draft;
            const routeType = (data.route_type || 'liuren') as RouteType;

            // 调用本地引擎生成结果
            const localResult = await callRealEngine(routeType, data as unknown as Record<string, unknown>, t, currentLanguage);
            if (localResult) {
              setResult(localResult);
              if (routeType === 'ziping') {
                setConsultData({
                  question: data.question,
                  birthDate: data.birth_date,
                  birthHour: data.birth_hour,
                  city: data.city,
                  gender: data.gender,
                  sourceEntry: data.source_entry,
                });
              } else if (routeType === 'liuren') {
                setConsultData({
                  question: data.question,
                  askTime: data.ask_time,
                  city: data.city,
                });
              }
              setConsultType(routeType as unknown as ConsultType);

              // 保存到 store
              const customResponse: ConsultResponse = {
                type: routeType as unknown as ConsultType,
                record_id: localResult.record_id,
                summary_line: localResult.summary_line,
                summary_body: localResult.summary_body,
                risks: localResult.risks,
                actions: localResult.actions,
                time_window: localResult.time_window,
                evidence_fold: localResult.evidence_fold,
                paywall_modules: localResult.paywall_modules,
                calc_result: localResult.calc_result,
                module_content: localResult.module_content,
              };
              saveRecord(customResponse);

              trackEvent('result_admin_local', {
                route_type: routeType,
                record_id: localResult.record_id,
              });
              setIsLoading(false);
              return;
            }
          }
        } catch (localError) {
          console.error('本地生成结果失败:', localError);
        }
      }

      setError(t('resultPage.errors.loadFailed'));
      setErrorDetail(e instanceof Error ? e.message : '网络或服务器错误');
    } finally {
      setIsLoading(false);
    }
  }, [saveRecord, isAuthenticated, currentLanguage, persistResolvedRecordId, resolvedUrlRecordId, searchParams]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  // 检测是否有 module 参数（VIP模块内容）
  const moduleId = searchParams.get('module');

  // K线轮询（抽取到 useKlinePolling hook）
  const klineHasContent = (!!result?.module_content?.kline || !!moduleContent) && !moduleContent?._klineDegraded;
  const klineOnContentUpdate = useCallback((content: Record<string, unknown>) => {
    setModuleContent(content);
    if (result?.record_id) {
      updateRecordModuleContent(result.record_id, 'kline', content);
    }
    setResult((prev) => {
      if (!prev || prev.module_content?.kline === content) return prev;
      return { ...prev, module_content: { ...(prev.module_content || {}), kline: content } };
    });
  }, [result?.record_id, updateRecordModuleContent]);
  const { klineGenStatus, progress: klineProgress, stage: klineStage, retry: retryKline } = useKlinePolling({
    recordId: result?.record_id,
    moduleId: moduleId || '',
    hasContent: klineHasContent,
    moduleContent,
    onContentUpdate: klineOnContentUpdate,
    isDegraded: !!moduleContent?._klineDegraded,
  });

  // 切换模块时重置K线视图模式
  useEffect(() => {
    setKlineViewMode('year');
    setKlineYearMode('year');
    setKlineRangeYears(100);
    setModuleRetryKey(0);
  }, [moduleId]);

  useEffect(() => {
    if (result?.calc_result && result.route_type === 'ziping') {
      consultApi.getCelebrityCases().then(setCelebrityCases).catch(() => {});
    }
  }, [result?.record_id]);

  // 加载模块内容（当有 module 参数时）
  useEffect(() => {
    if (moduleId && result?.record_id) {
      const loadModuleContent = async () => {
        setModuleLoading(true);
        setModuleContent(null);
        const isLocalTempRecord = TEMP_RECORD_ID_RE.test(result.record_id);
        const cachedContent = result.module_content?.[moduleId];

        const persistModuleContent = (content: any) => {
          if (!content) return;
          let safeContent = normalizeModuleContentForDisplay(content, moduleId);
          if (moduleId === 'kline') {
            safeContent = enrichKlineAspects(safeContent, result.calc_result, celebrityCases);
          }
          setModuleContent(safeContent);
          updateRecordModuleContent(result.record_id, moduleId, safeContent);
          setResult((prev) => {
            if (!prev || prev.module_content?.[moduleId] === safeContent) return prev;
            return {
              ...prev,
              module_content: {
                ...(prev.module_content || {}),
                [moduleId]: safeContent,
              },
            };
          });
        };

        if (cachedContent && moduleRetryKey === 0) {
          let safeCached = normalizeModuleContentForDisplay(cachedContent, moduleId);
          if (moduleId === 'kline') {
            safeCached = enrichKlineAspects(safeCached, result.calc_result, celebrityCases);
          }
          setModuleContent(safeCached);
          setModuleLoading(false);
          return;
        }

        if (isLocalTempRecord) {
          let localContent: any = null;
          if (moduleId === 'kline') {
            // K 线以后端为唯一真源，本地临时记录不再本地重算，直接标记降级
            localContent = { _klineDegraded: true };
          } else if (moduleId === 'breakthrough') {
            localContent = generateLocalBreakthroughModuleContent(result, t);
          } else if (moduleId === 'morning') {
            localContent = generateLocalMorningModuleContent(result, t);
          }
          persistModuleContent(localContent);
          setModuleLoading(false);
          return;
        }
        
        try {
          const moduleData = await consultApi.getRecord(result.record_id, moduleId, currentLanguage) as any;
          
          if (moduleData.module_content) {
            persistModuleContent(moduleData.module_content);
            return;
          }
        } catch (e) {
          console.warn('API 加载模块内容失败:', e);
        } finally {
          setModuleLoading(false);
        }

      };
      loadModuleContent();
    }
  }, [moduleId, result?.record_id, result?.calc_result, result?.module_content, updateRecordModuleContent, currentLanguage, moduleRetryKey, consultData.birthDate, consultData.birthHour]);

  // K线轮询逻辑已抽取到 useKlinePolling hook（见上方 state 声明区）
  // retryKline 可在 UI 中调用以重试失败的 K线生成

  // 监听登录状态变化，登录成功后重新加载结果
  useEffect(() => {
    if (loginSuccess && showAuthModal === false) {
      setLoginSuccess(false);
      authCheckedRef.current = false;
      setIsLoading(true);
      loadResult();
    }
  }, [loginSuccess, showAuthModal, loadResult]);

  // 曝光埋点
  useEffect(() => {
    if (!result || exposedRef.current) return;
    exposedRef.current = true;
    trackEvent('result_initial_exposure', {
      route_type: result.route_type,
      record_id: result.record_id,
    });
    if (result.route_type === 'ziping') {
      trackEvent('kline_preview_view', { record_id: result.record_id, is_free: true });
    } else if (result.route_type === 'quming') {
      trackEvent('naming_result_preview', { record_id: result.record_id, is_free: true });
    } else {
      trackEvent('question_preview_view', { record_id: result.record_id, is_free: true });
    }
  }, [result]);

  // WebSocket 实时进度订阅：后端按 sessionId 推 'progress' / 'result' 事件
  // sessionId 在 consultStore 中通过 askSessionId 记录（向后兼容 recordId 兜底）
  useEffect(() => {
    const recordId = result?.record_id;
    if (!recordId) return;
    // 临时 recordId（本地生成）不订阅
    if (TEMP_RECORD_ID_RE.test(recordId)) return;

    // 优先用 consultStore 中保存的 sessionId，否则用 recordId 兜底
    const consultState = useConsultStore.getState();
    const sessionId = (consultState as any).askSessionId || recordId;

    const socket = getSocket();

    const onProgress = (payload: ProgressPayload) => {
      if (!payload) return;
      if (payload.sessionId && payload.sessionId !== sessionId) return;
      setLiveProgress({ progress: payload.progress, message: payload.message });
    };

    const onResult = (payload: ResultPayload) => {
      if (!payload) return;
      if (payload.sessionId && payload.sessionId !== sessionId) return;
      // 推送完成：重新拉取权威结果
      setLiveProgress({ progress: 100, message: '已完成' });
      loadResult();
    };

    socket.on('progress', onProgress);
    socket.on('result', onResult);

    wsUnsubRef.current = () => {
      socket.off('progress', onProgress);
      socket.off('result', onResult);
    };

    return () => {
      wsUnsubRef.current?.();
      wsUnsubRef.current = null;
      setLiveProgress(null);
    };
  }, [result?.record_id, loadResult]);

  const handleFollowUpClick = useCallback((question: string) => {
    setViewMode('chat');
    setPendingFollowUpQuestion(question);
  }, []);

  useEffect(() => {
    const navState = location.state as { pendingFollowUpQuestion?: string; openChat?: boolean } | null;
    const nextQuestion = navState?.pendingFollowUpQuestion?.trim();
    if (!nextQuestion) return;

    if (navState?.openChat) {
      setViewMode('chat');
    }
    setPendingFollowUpQuestion(nextQuestion);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const recordId = result?.record_id;
    if (!recordId || TEMP_RECORD_ID_RE.test(recordId)) return;

    consultApi.getModuleStatus(recordId, 'analysis').then((data: any) => {
      if (data.followUpQuestions && data.followUpQuestions.length > 0) {
        setFollowUpQuestions(data.followUpQuestions);
      }
      if (data.content && typeof data.content === 'string' && data.content.trim()) {
        setAnalysisContent(data.content);
      }
    }).catch(() => {
      // optional
    });
  }, [result?.record_id]);

  const getKlineYearChartData = () => {
    if (!moduleContent) return [];
    // 后端数据缺失时返回空数组，渲染层显示降级 UI
    if (moduleContent._klineDegraded) return [];
    if (activeAspect !== 'overall' && moduleContent.aspects?.[activeAspect]?.points) {
      const aspectPoints = moduleContent.aspects[activeAspect].points;
      if (!Array.isArray(aspectPoints)) return [];
      if (klineYearMode === 'yearMonth') {
        const currentAge = Number(moduleContent.currentAge ?? aspectPoints.find((point: any) => point?.isCurrentYear)?.age ?? 0);
        const endAge = Math.min(klineRangeYears, currentAge + 10);
        return aspectPoints.filter((point: any) => typeof point?.age === 'number' && point.age >= currentAge && point.age <= endAge);
      }
      return aspectPoints.filter((point: any) => typeof point?.age === 'number' && point.age <= klineRangeYears);
    }
    const source = klineYearMode === 'yearMonth'
      ? (moduleContent.yearMonthData || [])
      : (moduleContent.yearData || moduleContent.chartData || []);
    if (!Array.isArray(source)) return [];
    if (klineYearMode === 'yearMonth') {
      const currentAge = Number(moduleContent.currentAge ?? source.find((point: any) => point?.isCurrentYear)?.age ?? 0);
      const endAge = Math.min(klineRangeYears, currentAge + 10);
      return source.filter((point: any) => typeof point?.age === 'number' && point.age >= currentAge && point.age <= endAge);
    }
    return source.filter((point: any) => typeof point?.age === 'number' && point.age <= klineRangeYears);
  };

  const getKlinePosterMeta = () => {
    const calc = normalizeCalcResult(result?.calc_result);
    const meta = moduleContent?.meta || {};
    const calcWuxing = calc?.wuxing?.scores || calc?.wuxing;
    return {
      ...meta,
      yearPillar: calc?.yearPillar || meta.yearPillar || '',
      monthPillar: calc?.monthPillar || meta.monthPillar || '',
      dayPillar: calc?.dayPillar || meta.dayPillar || '',
      hourPillar: calc?.hourPillar || meta.hourPillar || '',
      wuxing: meta.wuxing || calcWuxing || {},
    };
  };

  // 登录检测状态
  if (showAuthModal) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <Icon name="error" size={32} className="text-primary mx-auto mb-4" />
          <p className="text-on-surface/60 mb-4">{t('resultPage.loginRequired')}</p>
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            {t('resultPage.returnHome')}
          </button>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            // 只负责关闭 Modal，不检查登录状态
            // 登录成功时由 onLoginSuccess 处理
            setShowAuthModal(false);
          }}
          defaultTab="login"
          onLoginSuccess={() => {
            // 登录成功回调：关闭Modal并设置登录成功
            setShowAuthModal(false);
            setLoginSuccess(true);
          }}
        />
        <BottomNav />
      </div>
    );
  }

  if (isLoading) {
    // P1-2: Feature Flag 控制仪式动画 vs 简单 spinner
    const ritualEnabled = isEnabled('divination_ritual_enabled', { userId: user?.id || 'anonymous' });

    if (ritualEnabled) {
      return (
        <div className="page-container flex items-center justify-center">
          <DivinationRitualLoader
            isLoading={true}
            type={ritualType as 'liuren' | 'qimen' | 'ziwei' | 'bazi' | 'general' | undefined}
            birthDate={consultData.birthDate}
            onComplete={() => {}}
          />
          {/* U-P0-2: LLM 流式输出居中突出（z-20 在仪式动画 z-10 上方） */}
          {llmStream.content && (
            <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none">
              <div className="max-w-lg w-full text-left bg-surface-container-low/80 backdrop-blur-sm rounded-xl p-5 max-h-[60vh] overflow-y-auto shadow-2xl">
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                  {safetyCopyFilter(llmStream.content)}
                  {llmStream.streaming && <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse align-middle" />}
                </p>
              </div>
            </div>
          )}
          <BottomNav />
        </div>
      );
    }

    // 未启用仪式动画：保持原有 spinner 逻辑
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center max-w-sm px-6 w-full">
          <LoadingState size="lg" label={t('resultPage.aiAnalyzing')} className="mb-4" />
          {liveProgress && (
            <div className="mt-3">
              <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, liveProgress.progress))}%` }}
                />
              </div>
              <p className="text-xs text-on-surface-variant/60 mt-1.5">{liveProgress.message}</p>
            </div>
          )}
          {/* P1-1: 流式 LLM 输出（打字机效果） */}
          {llmStream.content && (
            <div className="mt-4 mx-auto max-w-md text-left bg-surface-container-low/50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-on-surface-variant/70 leading-relaxed whitespace-pre-wrap">
                {safetyCopyFilter(llmStream.content)}
                {llmStream.streaming && <span className="inline-block w-1.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />}
              </p>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !result) {
    return (
      <ErrorState
        message={error || t('resultPage.loadFailed')}
        onRetry={() => {
          setError(null);
          setErrorDetail(null);
          setIsLoading(true);
          loadResult();
        }}
        onHome={() => navigate('/')}
      />
    );
  }

  const engineIconName = ENGINE_ICON_NAMES[result.route_type] || 'explore';
  const engineName = ENGINE_NAMES[result.route_type] || t('engines.consult');
  const displayedQuestion = result.currentQuestion || consultData.question;

  const isMember = user?.membership && user.membership !== 'free';
  const isQuestionGated = result.route_type === 'liuren' && !isMember;
  const isKlineGated = !canAccessFullKline();

  const availableVipServices = VIP_SERVICES.filter((s) => result.paywall_modules.includes(s.id));

  // 八字排盘计算结果（用于高级分析工具区）
  const calcResult = normalizeCalcResult(result?.calc_result);

  const retryModuleContent = async () => {
    trackEvent('module_retry_click', { module_id: moduleId, record_id: result.record_id });
    if (!moduleId) return;
    try {
      await consultApi.retryModule(result.record_id, moduleId);
    } catch (e) {
      console.error('retryModule failed:', e);
    }
    setModuleRetryKey((value) => value + 1);
  };

  const handleVipClick = async (moduleId: string, skipClickTrack?: boolean) => {
    trackEvent('click_member_service', { module_id: moduleId, record_id: result.record_id });
    setVipUnlockError(null);

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const unlockPrefix = result.route_type === 'ziping' ? 'kline' : result.route_type === 'quming' ? 'naming' : 'question';
    if (!skipClickTrack) {
      trackEvent(`${unlockPrefix}_unlock_click` as any, { module_id: moduleId, record_id: result.record_id });
    }

    const isLocalTempRecord = TEMP_RECORD_ID_RE.test(result.record_id);

    if (isLocalTempRecord) {
      trackEvent(`${unlockPrefix}_unlock_success` as any, { module_id: moduleId, record_id: result.record_id });
      navigate(`/result/${result.record_id}?mode=home&module=${moduleId}`);
      return;
    }

    try {
      const unlock = await membershipApi.unlockModule(moduleId, result.record_id);
      if (!unlock.success) {
        if (isAdmin) {
          setVipUnlockError(t('resultPage.adminUnlockFailed'));
          return;
        }
        // P2-1: 弹出付费墙弹窗（含倒计时 + 限免检查），而非直接跳转
        trackEvent('paywall_view', { module_id: moduleId, record_id: result.record_id });
        try {
          const trialStatus = await membershipApi.checkFreeTrial();
          setFreeTrialAvailable(trialStatus.available);
        } catch {
          setFreeTrialAvailable(false);
        }
        setPaywallExpireTime(new Date(Date.now() + 5 * 60 * 1000)); // 5分钟倒计时
        setShowPaywall(true);
        return;
      }
      trackEvent(`${unlockPrefix}_unlock_success` as any, { module_id: moduleId, record_id: result.record_id, membership_level: user?.membership });
      if (typeof unlock.creditBalance === 'number') {
        updateUser({ creditBalance: unlock.creditBalance });
      }
    } catch (e) {
      console.warn('VIP unlock API 调用失败:', e);
      if (isAdmin) {
        setVipUnlockError(t('resultPage.adminUnlockRetry'));
        return;
      }
      // P2-1: API 失败也弹付费墙
      setFreeTrialAvailable(false);
      setPaywallExpireTime(new Date(Date.now() + 5 * 60 * 1000));
      setShowPaywall(true);
      return;
    }

    navigate(`/result/${result.record_id}?module=${moduleId}`);
  };

  const SHORT_CYCLE_GATING: Record<string, 'free' | 'monthly' | 'yearly'> = {
    day3: 'free',
    xun: 'monthly',
    month: 'monthly',
    quarter: 'yearly',
  };

  const handleShortCycleChange = (period: string | null) => {
    if (period === null) {
      setActiveShortCycle(null);
      return;
    }
    const requiredTier = SHORT_CYCLE_GATING[period];
    const tier = membershipTier;
    if (requiredTier === 'free' || (requiredTier === 'monthly' && (tier === 'monthly' || tier === 'yearly')) || (requiredTier === 'yearly' && tier === 'yearly')) {
      setActiveShortCycle(period);
    } else {
      trackEvent('kline_short_cycle_locked', { cycle: period, tier, record_id: result.record_id });
      handleVipClick('kline', true);
    }
  };

  const getVipServiceTitle = (id: string) => t(`resultPage.vipServices.${id}.title`);
  const getVipServiceSubtitle = (id: string) => t(`resultPage.vipServices.${id}.subtitle`);
  const getVipServiceDesc = (id: string) => t(`resultPage.vipServices.${id}.desc`);

  return (
    <ErrorBoundary>
    <div className="fixed inset-0 flex flex-col bg-surface-base text-on-surface">
      {/* 固定头部 */}
      <PageHeader
        onBack={() => navigate('/')}
        right={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon name={engineIconName} size={20} className="text-primary" filled />
              <span className="text-on-surface/80 text-sm font-medium">{engineName}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border/30 bg-surface-container-high/70 p-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'chat'
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface-variant/70 hover:text-on-surface'
                }`}
              >
                聊天
              </button>
              <button
                onClick={() => setViewMode('report')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  viewMode === 'report'
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface-variant/70 hover:text-on-surface'
                }`}
              >
                报告
              </button>
              {isEnabled('multi_turn_enabled', { userId: user?.id || 'anonymous' }) && (
                <button
                  onClick={() => setViewMode('dialogue')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    viewMode === 'dialogue'
                      ? 'bg-primary/20 text-primary'
                      : 'text-on-surface-variant/70 hover:text-on-surface'
                  }`}
                >
                  对话
                </button>
              )}
            </div>
            <LanguageSwitcher />
          </div>
        }
        className="gap-4 border-b border-border/40 bg-surface-container/95 pt-6 backdrop-blur-sm mobile-safe-top sm:px-5"
      />

      {/* 内容区域 - 三栏布局（移动单栏 / 桌面双栏：主内容 + 右侧吸顶八字） */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-surface-base">
        {/* 中间主内容（聊天 / 报告） */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {viewMode === 'dialogue' ? (
            <Suspense fallback={<ResultSectionFallback label="加载对话面板..." />}>
              <LazyDialogueChat onClose={() => setViewMode('chat')} />
            </Suspense>
          ) : viewMode === 'chat' ? (
            <Suspense fallback={<ResultSectionFallback label="加载结果对话..." />}>
              <LazyResultChat
                result={result}
                consultData={consultData}
                isQuestionGated={isQuestionGated}
                isKlineGated={isKlineGated}
                availableVipServices={availableVipServices}
                onVipClick={handleVipClick}
                onFollowUpClick={handleFollowUpClick}
                pendingFollowUpQuestion={pendingFollowUpQuestion}
                onPendingFollowUpHandled={() => setPendingFollowUpQuestion(null)}
                onChatReady={() => setShowFeedback(true)}
              />
            </Suspense>
          ) : (
            <>
              {/* P1-3: K线加载骨架屏（pending/processing 时展示） U-P1-1: 传入 progress/stage */}
              {moduleId === 'kline' && (klineGenStatus === 'pending' || klineGenStatus === 'processing') && !klineHasContent && (
                <KlineSkeleton progress={klineProgress} stage={klineStage} />
              )}
              {moduleId === 'kline' && (klineGenStatus === 'timeout' || klineGenStatus === 'failed') && !klineHasContent && (
                <KlineSkeleton showError onRetry={retryKline} />
              )}
              <Suspense fallback={<ResultSectionFallback label="加载报告面板..." />}>
                <LazyReportDashboard
                  result={result}
                  consultData={consultData}
                  onVipClick={handleVipClick}
                  onFollowUpClick={handleFollowUpClick}
                />
              </Suspense>
            </>
          )}
        </main>

        {/* 右侧吸顶八字排盘（仅 lg+ 可见，移动端隐藏避免挤压） */}
        <BaziSidePanel
          calcResult={result?.calc_result}
          birthDate={consultData?.birthDate}
        />
      </div>

      {/* P1-4: K线/取名海报 CTA — 生成专属海报分享 */}
      {(result.route_type === 'ziping' || result.route_type === 'quming') && !isKlineGated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-2"
        >
          <button
            onClick={() => {
              trackEvent('poster_cta_click', { route_type: result.route_type });
              setShowPoster(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/30 to-primary/20 border border-primary/30 text-primary text-sm font-medium hover:from-primary/40 hover:to-primary/30 active:from-primary/50 transition-colors"
          >
            <Icon name="share" size={16} className="text-primary/70" filled />
            生成专属海报
          </button>
        </motion.div>
      )}

      {/* P1-3: 两段式漏斗 — quick_read 结果后显示"深度分析"CTA */}
      {result?.zhangbanshan_output?.mode === 'quick_read' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-2"
        >
          <button
            onClick={() => handleFollowUpClick('deep_consult')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 active:bg-primary/30 transition-colors"
          >
            <Icon name="sparkle" size={16} className="text-primary" filled />
            看更深度的分析（含完整工具链）
          </button>
        </motion.div>
      )}

      {/* P2-2: 专家标注闭环 — 5层漏斗全部展示完毕后才浮出反馈组件 */}
      {showFeedback && result?.record_id && !TEMP_RECORD_ID_RE.test(result.record_id) && (
        <FeedbackWidget recordId={result.record_id} delayMs={500} />
      )}

      {/* P1-4: 海报 Modal */}
      {showPoster && (
        <Suspense fallback={<ResultSectionFallback label="加载海报生成器..." />}>
          <LazyPosterModal
            response={result}
            onClose={() => setShowPoster(false)}
            navigate={navigate}
            t={t}
          />
        </Suspense>
      )}

      {/* P2-1: 付费墙弹窗（抽取到 PaywallModal 组件） */}
      <Suspense fallback={null}>
        <LazyPaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          expireTime={paywallExpireTime}
          freeTrialAvailable={freeTrialAvailable}
          onFreeTrialClick={async () => {
            const trialResult = await membershipApi.useFreeTrial();
            if (trialResult.success) {
              setShowPaywall(false);
              navigate(`/result/${result.record_id}?module=kline`);
            }
          }}
          onUpgradeClick={() => {
            setShowPaywall(false);
            navigate('/membership');
          }}
          recordId={result.record_id}
        />
      </Suspense>

      {/* 高级分析工具区（P0-1续：抽取到 ResultAdvancedTools 组件） */}
      {result && (
        <Suspense fallback={<ResultSectionFallback label="加载高级分析工具..." />}>
          <LazyResultAdvancedTools
            result={result}
            calcResult={calcResult}
            user={user}
          />
        </Suspense>
      )}

      {/* 结论风格切换 */}
      {result && (
        <div className="px-4 pb-4">
          <Suspense fallback={<ResultSectionFallback label="加载结论视图..." />}>
            <LazyConclusionPreview />
          </Suspense>
        </div>
      )}

      {/* A-2: 决策价值观参考（四维数值仪表盘） */}
      {result && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-outline/5 bg-on-surface/[0.02] p-4">
            <h3 className="text-sm font-medium text-on-surface-variant mb-3">决策价值观参考</h3>
            <Suspense fallback={<ResultSectionFallback label="加载价值观面板..." />}>
              <LazyValuesDashboard compact />
            </Suspense>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary:', error, info); }
  render() { if (this.state.hasError) return null; return this.props.children; }
}

