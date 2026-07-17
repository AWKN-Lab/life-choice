import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import { getSessionId } from '@/lib/analytics';
import { trackFunnel } from '@/utils/analytics';
import { routeIntent, routeIntentWithFallback, detectUserIntent, ENGINE_NAMES, USER_INTENT_ICONS, type RoutingResult, type UserIntentType } from '@/lib/intentRouter';
import { isEnabled } from '@/lib/feature-flag';
import { saveConsultData } from '@/lib/consultDataMigration';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { EASE_OUT_EXPO, msgVariants } from '@/lib/motion-variants';
import { apiClient } from '@/api/client';
import { consultApi } from '@/api/consult';
import { FrontdeskChatProps } from './types';
import type { FrontdeskQuestionPhase } from './types';
import { frontdeskConfigs } from './frontdeskConfigs';
import {
  buildNamingConsultPayload,
  buildKlineNodeQuestionPrompt,
  buildQuestionDraft,
  buildQuestionResultUrl,
  createTempRecordId,
  type KlineQuestionContext,
} from './frontdeskAdapters';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';
import { NamingPDFExport } from '@/components/naming/NamingPDFExport';
import { Icon } from '@/components/ui/Icon';
import { CityQuickInput } from '@/components/form/CityQuickInput';
import { FrontdeskShell } from './FrontdeskShell';

type NamingType = 'baby' | 'adult' | 'brand';

/** 取名多轮对话阶段：类型→详情→性别→方向→风格→提交中→预览 */
type NamingPhase = 'type' | 'details' | 'gender' | 'direction' | 'style' | 'submitting' | 'preview';

interface ChatMessage {
  id: string;
  role: 'system' | 'user';
  content: string;
  /** 取名结果数据（仅 result 阶段的 system 消息使用） */
  namingResult?: NamingResultData;
}

interface NamingResultData {
  recordId?: string;
  summaryLine: string;
  summaryBody: string;
  nameSuggestions: {
    candidateId?: string;
    characters: string[];
    names: string[];
    reason: string;
    wuge?: {
      tiange: { num: number; wuxing: string; ji: boolean };
      renge: { num: number; wuxing: string; ji: boolean };
      dige: { num: number; wuxing: string; ji: boolean };
      waige: { num: number; wuxing: string; ji: boolean };
      zongge: { num: number; wuxing: string; ji: boolean };
      score: number;
    };
  }[];
  wuxingAnalysis: {
    current: Record<string, number>;
    missing: string[];
    excessive: string[];
    recommendation: string;
  };
  xiYongShen: {
    xi: string[];
    yong: string[];
    ji: string[];
  };
  bazi: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    dayGan: string;
    naYin: string;
  };
}

const TYPE_OPTIONS: { key: NamingType; emoji: string; labelKey: string }[] = [
  { key: 'baby', emoji: '🍼', labelKey: 'naming.frontdesk.typeBaby' },
  { key: 'adult', emoji: '👤', labelKey: 'naming.frontdesk.typeAdult' },
  { key: 'brand', emoji: '🏢', labelKey: 'naming.frontdesk.typeBrand' },
];

const CHAT_PREFERENCES: Record<NamingType, { labelKey: string; value: string }[]> = {
  baby: [
    { labelKey: 'naming.followUp.style.steady', value: 'steady' },
    { labelKey: 'naming.followUp.style.dynamic', value: 'lively' },
    { labelKey: 'naming.followUp.style.scholarly', value: 'scholarly' },
    { labelKey: 'naming.followUp.style.modern', value: 'modern' },
  ],
  adult: [
    { labelKey: 'naming.followUp.goal.temperament', value: 'temperament' },
    { labelKey: 'naming.followUp.goal.social', value: 'interpersonal' },
    { labelKey: 'naming.followUp.goal.career', value: 'career' },
    { labelKey: 'naming.followUp.goal.energy', value: 'overall' },
  ],
  brand: [
    { labelKey: 'naming.followUp.style.premium', value: 'premium' },
    { labelKey: 'naming.followUp.style.friendly', value: 'friendly' },
    { labelKey: 'naming.followUp.style.oriental', value: 'oriental' },
    { labelKey: 'naming.followUp.style.commercial', value: 'commercial' },
  ],
};

const QUICK_SUGGESTION_KEYS = [
  'question.frontdesk.quickCareer',
  'question.frontdesk.quickLove',
  'question.frontdesk.quickCooperation',
  'question.frontdesk.quickTurningPoint',
];

const EXPECTATION_MANAGEMENT_TEXT = '我先说清楚一件事——我不是给你答案的人，我是帮你看清楚的人。你这次得到的不是「该选哪个」，而是「选了这个，最坏的情况是什么，你能撑多久」。你想要这个，还是想要一个标准答案？\n\n⚠️ 命理仅供参考，不构成任何决策建议。';

const INTENT_CATEGORIES: { key: UserIntentType; defaultQuestionKey: string }[] = [
  { key: 'career', defaultQuestionKey: 'question.suggestions.career' },
  { key: 'finance', defaultQuestionKey: 'question.suggestions.finance' },
  { key: 'love', defaultQuestionKey: 'question.suggestions.love' },
  { key: 'cooperation', defaultQuestionKey: 'question.suggestions.cooperation' },
  { key: 'travel', defaultQuestionKey: 'question.suggestions.travel' },
  { key: 'decision', defaultQuestionKey: 'question.suggestions.decision' },
  { key: 'other', defaultQuestionKey: 'question.suggestions.other' },
];


export default function FrontdeskChat({ mode, onClose, renderAs = 'page' }: FrontdeskChatProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { getProfile, saveProfile } = useUserProfileStore();
  const { isAuthenticated } = useAuthStore();
  const { currentLanguage } = useLanguageStore();
  const currentSessionId = getSessionId();
  const config = frontdeskConfigs[mode];

  const [showExpectationManagement, setShowExpectationManagement] = useState(false);

  // 取名对话状态
  const [namingType, setNamingType] = useState<NamingType | null>(null);
  const [surname, setSurname] = useState('');
  const [style, setStyle] = useState<string[]>([]);
  const [improveFocus, setImproveFocus] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthHour, setBirthHour] = useState(12);
  const [birthMinute, setBirthMinute] = useState(0);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [namingPhase, setNamingPhase] = useState<NamingPhase>('type');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 语音录音
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const incomingKlineContext = mode === 'question'
    ? (location.state as { klineQuestionContext?: KlineQuestionContext } | null)?.klineQuestionContext || null
    : null;
  const [klineQuestionContext] = useState<KlineQuestionContext | null>(incomingKlineContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [favoriteCandidateIds, setFavoriteCandidateIds] = useState<Set<string>>(new Set());
  const [removedCandidateIds, setRemovedCandidateIds] = useState<Set<string>>(new Set());
  const [compareCandidateIds, setCompareCandidateIds] = useState<Set<string>>(new Set());
  const [finalCandidateId, setFinalCandidateId] = useState<string | null>(null);  const [question, setQuestion] = useState(() =>
    incomingKlineContext ? buildKlineNodeQuestionPrompt(incomingKlineContext, t) : '',
  );
  const [intent, setIntent] = useState<RoutingResult | null>(null);
  const [userIntent, setUserIntent] = useState<UserIntentType | null>(null);
  const [intentCategory, setIntentCategory] = useState('');
  const [phase, setPhase] = useState<FrontdeskQuestionPhase>('input');
  const [error, setError] = useState('');

  // P2-T3.2: liuren 起卦时间/地点采集
  const [liurenAskTime, setLiurenAskTime] = useState<string>('');
  const [liurenAskLocation, setLiurenAskLocation] = useState<string>('');

  // P2-T3.3: ziping 档案引导
  const [zipingBirthDate, setZipingBirthDate] = useState<string>('');
  const [zipingBirthHour, setZipingBirthHour] = useState<number>(-1);
  const [zipingGender, setZipingGender] = useState<string>('');

  // P2-T3.4: clarify 对话气泡化
  const [clarifyQuestion, setClarifyQuestion] = useState<string>('');
  const [clarifyAnswer, setClarifyAnswer] = useState<string>('');

  useEffect(() => {
    if (mode === 'naming') {
      trackEvent('naming_chat_start');
      setMessages([{
        id: 'greeting',
        role: 'system',
        content: t('naming.frontdesk.greeting'),
      }]);
    } else {
      trackEvent('question_start');
      // P1-3: 期望管理开场白检查
      const profile = getProfile();
      const featureEnabled = isEnabled('expectation_management_enabled', { userId: profile.userId || 'anonymous' });
      const hasSeen = profile.hasSeenExpectationManagement === true;
      if (featureEnabled && !hasSeen) {
        setShowExpectationManagement(true);
      }
      const timer = setTimeout(() => {
        setMessages([
          {
            id: 'greeting',
            role: 'system',
            content: t('question.frontdesk.greeting'),
          },
          ...(klineQuestionContext ? [{
            id: 'kline-context',
            role: 'system' as const,
            content: t('question.frontdesk.klineNodeContext', { targetDate: klineQuestionContext.targetDate }),
          }] : []),
        ]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mode, klineQuestionContext]);

  useEffect(() => {
    if (!klineQuestionContext) return;
    trackEvent('kline_to_question', {
      targetDate: klineQuestionContext.targetDate,
      signalLabel: klineQuestionContext.signalLabel,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [klineQuestionContext, location.pathname, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, intent, namingPhase]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      trackEvent('naming_voice_start');
    } catch (err) {
      console.error('[FrontdeskChat] startRecording failed:', { namingType, mode, error: err });
      trackEvent('naming_voice_error', { error: String(err), namingType, mode });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      trackEvent('naming_voice_stop');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('语音识别失败');
      const data = await response.json();
      if (data.text) {
        setCustomDescription(prev => prev ? prev + ' ' + data.text : data.text);
        trackEvent('naming_voice_transcribed', { textLength: data.text.length });
      }
    } catch (err) {
      console.error('[FrontdeskChat] transcribeAudio failed:', { audioSize: audioBlob.size, audioType: audioBlob.type, error: err });
      trackEvent('naming_voice_transcribe_error', { error: String(err), audioSize: audioBlob.size });
    }
  };

  const addMessage = (role: 'system' | 'user', content: string, namingResult?: NamingResultData) => {
    setMessages(prev => [...prev, { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, role, content, namingResult }]);
  };

  const toggleStyle = (value: string) => {
    setStyle(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  };

  /** P1-11: 取名类型选择 → 进入详情阶段 */
  const handleTypeSelect = (type: NamingType) => {
    trackEvent('naming_type_select', { type });
    setNamingType(type);
    const selected = TYPE_OPTIONS.find(o => o.key === type)!;
    addMessage('user', `${selected.emoji} ${t(selected.labelKey)}`);
    setTimeout(() => {
      if (type === 'baby') {
        addMessage('system', t('naming.frontdesk.askSurname'));
      } else if (type === 'adult') {
        addMessage('system', t('naming.frontdesk.askOriginalName'));
      } else {
        addMessage('system', t('naming.frontdesk.askIndustry'));
      }
      setNamingPhase('details');
    }, 500);
  };

  /** 姓氏/原名/行业提交 → 进入性别/方向阶段 */
  const handleSurnameSubmit = () => {
    if (!chatInput.trim() || !namingType) return;
    const input = chatInput.trim();
    setChatInput('');

    if (namingType === 'baby') {
      setSurname(input);
      addMessage('user', t('naming.frontdesk.surnamePrefix', { value: input }));
    } else if (namingType === 'adult') {
      setOriginalName(input);
      setSurname(input.charAt(0));
      addMessage('user', t('naming.frontdesk.originalNameFormat', { name: input, surname: input.charAt(0) }));
    } else {
      setIndustry(input);
      addMessage('user', t('naming.frontdesk.industryFormat', { value: input }));
    }

    setTimeout(() => {
      if (namingType === 'brand') {
        // 品牌取名不需要性别，跳到期望阶段
        addMessage('system', t('naming.frontdesk.askTargetAudience'));
        setNamingPhase('direction');
      } else {
        addMessage('system', t('naming.frontdesk.askGender'));
        setNamingPhase('gender');
      }
    }, 500);
  };

  /** 性别选择 → 进入方向阶段 */
  const handleGenderSelect = (g: 'male' | 'female') => {
    setGender(g);
    const genderLabel = g === 'male' ? t('form.male') : t('form.female');
    addMessage('user', genderLabel);

    setTimeout(() => {
      if (namingType === 'adult') {
        addMessage('system', t('naming.frontdesk.askImproveFocus'));
      } else {
        addMessage('system', t('naming.frontdesk.askExpectation'));
      }
      setNamingPhase('direction');
    }, 500);
  };

  /** 方向提交 → 进入风格阶段 */
  const handleExpectationSubmit = () => {
    if (!namingType) return;

    if (namingType === 'adult') {
      if (!chatInput.trim() && style.length === 0) return;
      const focusText = chatInput.trim() || style.map(s => t(`naming.styles.${s}`)).join('、');
      setImproveFocus(focusText);
      addMessage('user', t('naming.frontdesk.improvePrefix', { value: focusText }));
    } else if (namingType === 'brand') {
      if (chatInput.trim()) {
        setTargetAudience(chatInput.trim());
        addMessage('user', `${t('naming.frontdesk.targetAudienceLabel')}${chatInput.trim()}`);
      } else {
        addMessage('user', t('naming.frontdesk.noPreference'));
      }
    } else {
      // baby: 期望可以自由输入
      if (chatInput.trim()) {
        setCustomDescription(chatInput.trim());
        addMessage('user', chatInput.trim());
      } else {
        addMessage('user', t('naming.frontdesk.noPreference'));
      }
    }

    setChatInput('');

    setTimeout(() => {
      addMessage('system', t('naming.frontdesk.askStyle'));
      setNamingPhase('style');
    }, 500);
  };

  /** 风格选择提交 → 开始分析 */
  const handleStyleSubmit = () => {
    if (!namingType) return;

    const styleLabels = style.length > 0
      ? style.map(s => t(`naming.styles.${s}`)).join('、')
      : t('naming.frontdesk.noPreference');
    addMessage('user', `${t('naming.frontdesk.preferencePrefix', { value: styleLabels })}`);

    // 补充说明（可选）
    if (customDescription) {
      addMessage('user', `${t('naming.frontdesk.supplementary')}：${customDescription}`);
    }

    setTimeout(() => {
      addMessage('system', t('naming.frontdesk.startAnalyzing'));
      setNamingPhase('submitting');
    }, 500);

    // 发起后端请求
    setTimeout(() => {
      handleNamingApiCall();
    }, 800);
  };

  /** 调用后端取名 API，结果在对话中展示 */
  const handleNamingApiCall = async () => {
    setIsSubmitting(true);
    trackEvent('naming_submit', { namingType, style, improveFocus });

    const consultData = buildNamingConsultPayload({
      t,
      namingType: namingType as 'baby' | 'adult' | 'brand',
      surname,
      style,
      improveFocus,
      industry,
      targetAudience,
      originalName,
      birthDate,
      birthHour,
      birthMinute,
      gender,
      customDescription,
    });

    try {
      setFavoriteCandidateIds(new Set());
      setRemovedCandidateIds(new Set());
      setCompareCandidateIds(new Set());
      setFinalCandidateId(null);
      const result = await consultApi.analyze({
        ...consultData,
        lang: currentLanguage,
        sessionId: currentSessionId,
      } as any);
      const resolvedRecordId = result.record_id || result.recordId || '';

      // 构建结果消息
      const resultData: NamingResultData = {
        recordId: resolvedRecordId || undefined,
        summaryLine: result.summary_line || result.summaryLine || '',
        summaryBody: result.summary_body || result.summaryBody || '',
        nameSuggestions: result.name_suggestions || result.nameSuggestions || [],
        wuxingAnalysis: result.wuxing_analysis || result.wuxingAnalysis || { current: {}, missing: [], excessive: [], recommendation: '' },
        xiYongShen: result.xi_yong_shen || result.xiYongShen || { xi: [], yong: [], ji: [] },
        bazi: result.bazi || { yearPillar: '', monthPillar: '', dayPillar: '', hourPillar: '', dayGan: '', naYin: '' },
      };

      saveConsultData({
        route_type: 'quming',
        record_id: resolvedRecordId || undefined,
        session_id: currentSessionId,
        surname: surname || undefined,
        namingType: namingType || undefined,
        originalName: originalName || undefined,
        question: consultData.question,
        birth_date: birthDate || undefined,
        birth_hour: birthDate ? birthHour : undefined,
        birth_minute: birthDate ? birthMinute : undefined,
        gender: gender || undefined,
        source_entry: 'naming',
        unlock_status: 'preview',
      });

      // 取 top3 候选名
      const top3 = resultData.nameSuggestions.slice(0, 3);
      const namesText = top3.length > 0
        ? top3.map((s, i) => `${i + 1}. ${s.names[0]} —— ${s.reason}`).join('\n')
        : t('naming.frontdesk.noResult');

      addMessage('system', t('naming.frontdesk.resultIntro'));

      setTimeout(() => {
        addMessage('system', namesText, resultData);
        setNamingPhase('preview');
        setIsSubmitting(false);
      }, 600);

      trackEvent('naming_result_shown', { namingType, nameCount: top3.length });
      trackFunnel('funnel_ask_to_complete', { namingType, nameCount: top3.length });
    } catch (err) {
      console.error('[FrontdeskChat] handleNamingApiCall failed:', {
        namingType,
        namingPhase,
        styleCount: style.length,
        hasCustomDescription: !!customDescription,
        questionTextLength: consultData.question.length,
        error: err,
      });
      addMessage('system', t('naming.frontdesk.analysisError'));
      setNamingPhase('style'); // 回退到风格阶段，允许重试
      setIsSubmitting(false);
      trackEvent('naming_api_error', {
        error: String(err),
        namingType,
        namingPhase,
        styleCount: style.length,
      });
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim()) { setError(t('question.emptyError')); return; }
    setError('');

    addMessage('user', question.trim());
    setPhase('submitting');

    trackEvent('question_submit', { question: question.trim(), intentCategory });
    try {
      const detectedIntent = detectUserIntent(question.trim());
      setUserIntent(detectedIntent);
      const routed = await routeIntentWithFallback(question.trim(), { hasBirthInfo: !!(getProfile().birthDate), hasAskTime: true, hasGender: !!(getProfile().gender), hasCity: false });
      const result: RoutingResult = routed;
      setIntent(result);

      trackEvent('question_intent_select', { route_type: result.route_type, user_intent: detectedIntent, confidence: result.confidence, intentCategory });

      await new Promise(r => setTimeout(r, 600));

      const engineName = ENGINE_NAMES[result.route_type] || t('engines.consult');
      addMessage('system', t('question.frontdesk.engineSelected', { engine: engineName }));

      // P2-T3.4: clarify 对话气泡化
      // LLM 认为问题需要澄清时，进入 clarify phase，以对话气泡展示澄清问题
      if (result.need_clarify && result.next_step === 'clarify') {
        setClarifyQuestion(result.clarify_question || '');
        setPhase('clarify');
        return; // 等待用户在 clarify phase 回答后重新提交
      }

      // P2-T3.2: liuren 起卦时间迁入对话流
      // 路由到六壬时，进入对话流采集起卦时间（默认当前时间，用户可修改）
      // 起卦时间不属于 UserProfile，每次起卦都需要确认
      if (result.route_type === 'liuren') {
        setPhase('liuren_ask_time');
        addMessage('system', '六壬起卦需要采集起卦时间，请确认当前时间或输入具体时间：');
        return; // 等待用户在 liuren_ask_time phase 提交后继续
      }

      // P2-T3.3: ziping 档案引导迁入对话流
      // 当路由到子平且用户未登录/无档案时，先引导档案检查
      if (result.route_type === 'ziping') {
        const profile = getProfile();
        if (!profile.birthDate) {
          setPhase('ziping_profile_check');
          addMessage('system', '子平八字需要出生信息，检测到您尚未填写档案，是否现在填写？');
          return; // 等待用户在 ziping_profile_check phase 选择后继续
        }
      }

      setPhase('preview');
      await new Promise(r => setTimeout(r, 1200));
      await handleConfirmWithIntent(result, detectedIntent);
    } catch (err) {
      console.error('[FrontdeskChat] handleQuestionSubmit failed:', {
        question,
        intentCategory,
        error: err,
      });
      setError(t('form.error.failed'));
      setPhase('error_retry');
      trackEvent('question_submit_error', {
        error: String(err),
        intentCategory,
      });
    }
  };

  const handleConfirmWithIntent = async (routingResult: RoutingResult, detectedUserIntent: UserIntentType | null) => {
    setIsSubmitting(true);
    setPhase('deepening');

    if (routingResult.route_type === 'ziping' || routingResult.route_type === 'zhangsheng') {
      const profile = getProfile();
      if (profile.birthDate && profile.gender) {
        const askTime = new Date().toISOString();
        const normalizedRouteType = routingResult.route_type === 'zhangsheng' ? 'ziping' : routingResult.route_type;

        if (isAuthenticated) {
          try {
          const apiResult = await consultApi.analyze({
              routeType: normalizedRouteType,
              question: question.trim(),
              birthDate: profile.birthDate,
              birthTime: `${String(profile.birthHour ?? 12).padStart(2, '0')}:${String(profile.birthMinute ?? 0).padStart(2, '0')}`,
              birthPlace: profile.city || t('form.defaultCity'),
              gender: profile.gender,
              askTime,
              sessionId: currentSessionId,
              sourceEntry: 'question',
              questionIntent: detectedUserIntent || undefined,
              unlockStatus: 'preview',
              lang: currentLanguage,
              ...(klineQuestionContext || {}),
            });
            const resolvedRecordId = apiResult?.record_id || apiResult?.recordId;
            if (resolvedRecordId) {
              saveConsultData(buildQuestionDraft({
                routingResult: { ...routingResult, route_type: normalizedRouteType as typeof routingResult.route_type },
                detectedUserIntent,
                question,
                intentCategory,
                askTime,
                sessionId: currentSessionId,
                recordId: resolvedRecordId,
                profile,
                t,
              }));
              navigate(`/result/${resolvedRecordId}`);
              trackFunnel('funnel_ask_to_complete', { routeType: normalizedRouteType, source: 'question_birthinfo_authenticated' });
              return;
            }
          } catch (error) {
            console.warn('[FrontdeskChat] authenticated question->ziping analyze fallback to draft flow:', {
              routeType: normalizedRouteType,
              error,
            });
            setError(t('question.frontdesk.analysisError'));
            setPhase('error_retry');
            setIsSubmitting(false);
            return;
          }
        }

        const tempRecordId = createTempRecordId('Q');
        saveConsultData(buildQuestionDraft({
          routingResult: { ...routingResult, route_type: normalizedRouteType as typeof routingResult.route_type },
          detectedUserIntent,
          question,
          intentCategory,
          askTime,
          sessionId: currentSessionId,
          recordId: tempRecordId,
          profile,
          t,
        }));
        navigate(buildQuestionResultUrl(tempRecordId, routingResult, detectedUserIntent, intentCategory));
        trackFunnel('funnel_ask_to_complete', { routeType: routingResult.route_type, source: 'question_birthinfo' });
        return;
      }
      saveConsultData(buildQuestionDraft({
        routingResult,
        detectedUserIntent,
        question,
        intentCategory,
        t,
      }));
      // P2 遗留断点1修复: 无档案时不跳转，回到对话内提示用户填写
      setError(t('question.frontdesk.birthInfoRequired', { defaultValue: '子平八字需要出生信息才能分析，请填写档案' }));
      setPhase('ziping_profile_check');
      setIsSubmitting(false);
      return;
    }

    // P2-T3.2: liuren 起卦时间/地点优先使用对话内采集的值
    const askTime = liurenAskTime ? new Date(liurenAskTime).toISOString() : new Date().toISOString();
    const askLocation = liurenAskLocation || t('form.defaultCity');

    if (isAuthenticated) {
      try {
        const apiResult = await consultApi.analyze({
          routeType: routingResult.route_type as 'ziping' | 'liuren' | 'ziwei' | 'quming' | 'qimen' | 'liuyao' | 'meihua' | 'zhangsheng',
          question: question.trim(),
          askTime,
          askLocation,
          sessionId: currentSessionId,
          sourceEntry: 'question',
          questionIntent: detectedUserIntent || undefined,
          unlockStatus: 'preview',
          lang: currentLanguage,
          ...(klineQuestionContext || {}),
        });
        const resolvedRecordId = apiResult?.record_id || apiResult?.recordId;
        if (resolvedRecordId) {
          saveConsultData(buildQuestionDraft({
            routingResult,
            detectedUserIntent,
            question,
            intentCategory,
            askTime,
            askLocation,
            sessionId: currentSessionId,
            recordId: resolvedRecordId,
            t,
          }));
          navigate(`/result/${resolvedRecordId}`);
          trackFunnel('funnel_ask_to_complete', { routeType: routingResult.route_type, source: 'question_authenticated' });
          return;
        }
      } catch (error) {
        console.warn('[FrontdeskChat] authenticated question analyze fallback to draft flow:', {
          routeType: routingResult.route_type,
          error,
        });
        setError(t('question.frontdesk.analysisError'));
        setPhase('error_retry');
        setIsSubmitting(false);
        return;
      }
    }

    const tempRecordId = createTempRecordId('Q');

    saveConsultData(buildQuestionDraft({
      routingResult,
      detectedUserIntent,
      question,
      intentCategory,
      askTime,
      askLocation,
      sessionId: currentSessionId,
      recordId: tempRecordId,
      t,
    }));

    navigate(buildQuestionResultUrl(tempRecordId, routingResult, detectedUserIntent, intentCategory));
    trackFunnel('funnel_ask_to_complete', { routeType: routingResult.route_type, source: 'question' });
  };

  const handleSuggestion = (text: string) => {
    setQuestion(text);
    setError('');
    setPhase('input');
    trackEvent('question_suggestion_click', { text });
  };

  const handleIntentCategory = (key: string, defaultQuestionKey: string) => {
    setIntentCategory(key);
    setQuestion(t(defaultQuestionKey));
    setError('');
    setPhase('input');
    trackEvent('question_intent_category_click', { category: key });
  };

  const handleBack = () => {
    if (mode === 'naming' && namingPhase !== 'type') {
      // 在对话中返回上一阶段
      if (namingPhase === 'preview' || namingPhase === 'submitting') {
        setNamingPhase('style');
      } else if (namingPhase === 'style') {
        setNamingPhase('direction');
      } else if (namingPhase === 'direction') {
        if (namingType === 'brand') {
          setNamingPhase('details');
        } else {
          setNamingPhase('gender');
        }
      } else if (namingPhase === 'gender') {
        setNamingPhase('details');
      } else if (namingPhase === 'details') {
        setNamingPhase('type');
      }
      return;
    }
    if (onClose) { onClose(); return; }
    navigate('/');
  };

  const accentTagActive = mode === 'naming'
    ? 'text-primary border border-[hsl(var(--primary)/0.4)] shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
    : 'text-secondary border border-[hsl(var(--secondary)/0.4)] shadow-[0_0_12px_hsl(var(--secondary)/0.15)]';
  const accentTagInactive = 'text-on-surface/55 border border-outline/20 bg-[hsl(var(--surface-container-low)/0.5)] hover:text-on-surface/80';
  const accentBtnBg = mode === 'naming'
    ? 'text-primary border border-[hsl(var(--primary)/0.4)]'
    : 'text-secondary border border-[hsl(var(--secondary)/0.4)]';
  const accentLabelColor = 'text-primary/60';
  const accentGenderActive = mode === 'naming'
    ? 'text-primary border border-[hsl(var(--primary)/0.4)] shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
    : 'text-secondary border border-[hsl(var(--secondary)/0.4)] shadow-[0_0_12px_hsl(var(--secondary)/0.15)]';
  const accentSubmitBg = 'gold-shimmer';
  const accentFocusBorder = mode === 'naming' ? 'focus:border-[hsl(var(--primary)/0.4)]' : 'focus:border-[hsl(var(--secondary)/0.4)]';
  const isQuestionEditingPhase = phase === 'input' || phase === 'error_retry';

  const handleRetryQuestionSubmit = async () => {
    if (!question.trim()) {
      setError(t('question.emptyError'));
      setPhase('error_retry');
      return;
    }
    await handleQuestionSubmit();
  };

  const getCandidateId = (candidate: NamingResultData['nameSuggestions'][number], index: number) =>
    candidate.candidateId || 'legacy_' + encodeURIComponent(candidate.names[0] || 'candidate') + '_' + (index + 1);

  const persistNamingCandidateAction = async (
    result: NamingResultData,
    candidate: NamingResultData['nameSuggestions'][number],
    index: number,
    action: 'favorite' | 'remove' | 'compare' | 'final',
  ) => {
    if (!result.recordId) {
      setError(t('naming.frontdesk.actionNeedsRecord'));
      return;
    }
    const candidateId = getCandidateId(candidate, index);
    const name = candidate.names[0] || '';
    let eventType = '';
    let payload: Record<string, unknown> = { candidateId, name };

    if (action === 'favorite') eventType = favoriteCandidateIds.has(candidateId) ? 'naming_unfavorite' : 'naming_favorite';
    if (action === 'remove') eventType = removedCandidateIds.has(candidateId) ? 'naming_restore' : 'naming_remove';
    if (action === 'compare') {
      eventType = 'naming_compare';
      payload = { ...payload, selected: !compareCandidateIds.has(candidateId) };
    }
    if (action === 'final') eventType = 'naming_final_select';

    try {
      await consultApi.saveBehaviorEvent(result.recordId, eventType, payload);
      if (action === 'favorite') {
        setFavoriteCandidateIds((current) => {
          const next = new Set(current);
          next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId);
          return next;
        });
      }
      if (action === 'remove') {
        setRemovedCandidateIds((current) => {
          const next = new Set(current);
          next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId);
          return next;
        });
      }
      if (action === 'compare') {
        setCompareCandidateIds((current) => {
          const next = new Set(current);
          next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId);
          return next;
        });
      }
      if (action === 'final') setFinalCandidateId(candidateId);
      trackEvent(eventType, { recordId: result.recordId, candidateId, name });
    } catch {
      setError(t('naming.frontdesk.actionSaveFailed'));
    }
  };

  const renderMessages = () => (
    <AnimatePresence mode="popLayout">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={msgVariants[msg.role].initial}
          animate={msgVariants[msg.role].animate}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'system' && (
            <ZhangbanshanAvatar size="sm" className="mr-2 mt-0.5" />
          )}
          <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl"
            style={{
              background: msg.role === 'user'
                ? (mode === 'naming'
                    ? 'linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.1) 100%)'
                    : 'linear-gradient(135deg, hsl(var(--secondary) / 0.18) 0%, hsl(var(--secondary) / 0.1) 100%)')
                : 'linear-gradient(135deg, hsl(var(--surface-container-low) / 0.7) 0%, hsl(var(--surface-container) / 0.5) 100%)',
              border: msg.role === 'user'
                ? (mode === 'naming' ? '1px solid hsl(var(--primary) / 0.3)' : '1px solid hsl(var(--secondary) / 0.3)')
                : '1px solid hsl(var(--outline) / 0.2)',
              backdropFilter: msg.role !== 'user' ? 'blur(8px)' : undefined,
              borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 0.25rem 1rem 1rem',
            }}>
            {msg.role === 'system' && (
              <span className={`inline-flex items-center gap-1.5 mb-1.5 text-xs ${accentLabelColor}`}>
                <ZhangbanshanAvatar size="sm" />
                {t('naming.frontdesk.master')}
              </span>
            )}
            <p>{msg.content}</p>
            {/* 取名结果卡片 */}
            {msg.namingResult && msg.namingResult.nameSuggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                {msg.namingResult.nameSuggestions.slice(0, 3).map((s, i) => {
                  const candidateId = getCandidateId(s, i);
                  const isFavorite = favoriteCandidateIds.has(candidateId);
                  const isRemoved = removedCandidateIds.has(candidateId);
                  const isCompared = compareCandidateIds.has(candidateId);
                  const isFinal = finalCandidateId === candidateId;
                  return (
                    <div key={candidateId} className={'px-3 py-2 rounded-lg bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.15)] ' + (isRemoved ? 'opacity-50' : '')}>
                      <p className="font-semibold text-base text-primary">{s.names[0]}</p>
                      <p className="text-xs text-on-surface/70 mt-0.5">{s.reason}</p>
                      {s.wuge && (
                        <p className="text-xs text-on-surface/40 mt-0.5">
                          五格：天{s.wuge.tiange.num} 人{s.wuge.renge.num} 地{s.wuge.dige.num} 外{s.wuge.waige.num} 总{s.wuge.zongge.num}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => void persistNamingCandidateAction(msg.namingResult!, s, i, 'favorite')} className={'inline-flex items-center gap-1 px-2 py-1 text-xs border ' + (isFavorite ? 'border-primary text-primary' : 'border-outline/20 text-on-surface/60')}>
                          <Icon name={isFavorite ? 'star' : 'star_outline'} size={14} />
                          {t(isFavorite ? 'naming.frontdesk.unfavorite' : 'naming.frontdesk.favorite')}
                        </button>
                        <button type="button" onClick={() => void persistNamingCandidateAction(msg.namingResult!, s, i, 'compare')} className={'inline-flex items-center gap-1 px-2 py-1 text-xs border ' + (isCompared ? 'border-secondary text-secondary' : 'border-outline/20 text-on-surface/60')}>
                          <Icon name="compare_arrows" size={14} />
                          {t('naming.frontdesk.compare')}
                        </button>
                        <button type="button" onClick={() => void persistNamingCandidateAction(msg.namingResult!, s, i, 'remove')} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-outline/20 text-on-surface/60">
                          <Icon name={isRemoved ? 'restore' : 'close'} size={14} />
                          {t(isRemoved ? 'naming.frontdesk.restore' : 'naming.frontdesk.remove')}
                        </button>
                        <button type="button" onClick={() => void persistNamingCandidateAction(msg.namingResult!, s, i, 'final')} className={'inline-flex items-center gap-1 px-2 py-1 text-xs border ' + (isFinal ? 'border-green-500 text-green-400' : 'border-outline/20 text-on-surface/60')}>
                          <Icon name={isFinal ? 'check_circle' : 'radio_button_unchecked'} size={14} />
                          {t(isFinal ? 'naming.frontdesk.finalSelected' : 'naming.frontdesk.selectFinal')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );

  /** P1-11: 取名全程对话化 — 不跳页，结果在对话中展示 */
  const renderNamingChat = () => (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl ${config.accentBg} flex items-center justify-center`}>
          <Icon name="draw" size={20} className={config.accentColor} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-on-surface">{t(config.titleKey)}</h1>
          <p className="text-sm text-on-surface/50">{t(config.subtitleKey)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4" ref={scrollRef}>
        {renderMessages()}

        {/* 阶段1: 类型选择 */}
        {namingPhase === 'type' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex flex-wrap gap-2 justify-end pt-1"
          >
            {TYPE_OPTIONS.map(({ key, emoji, labelKey }) => (
              <button
                key={key}
                onClick={() => handleTypeSelect(key)}
                className={`px-4 py-2.5 rounded-full text-sm ${accentTagInactive} transition-all active:scale-95`}
              >
                {emoji} {t(labelKey)}
              </button>
            ))}
          </motion.div>
        )}

        {/* 阶段2: 姓氏/原名/行业输入 */}
        {namingPhase === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 pt-1"
          >
            <div className="flex justify-end">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSurnameSubmit(); }}
                placeholder={namingType === 'baby' ? t('naming.frontdesk.inputPlaceholderBaby') : namingType === 'adult' ? t('naming.frontdesk.inputPlaceholderAdult') : t('naming.frontdesk.inputPlaceholderBrand')}
                className={`input-mystic max-w-[80%] text-sm ${accentFocusBorder}`}
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSurnameSubmit}
                disabled={!chatInput.trim()}
                className={`px-6 py-2.5 rounded-full text-sm font-medium ${accentBtnBg} transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {t('naming.frontdesk.confirmButton')}
              </button>
            </div>
          </motion.div>
        )}

        {/* 阶段3: 性别选择（仅 baby/adult） */}
        {namingPhase === 'gender' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-2 justify-end pt-1"
          >
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                onClick={() => handleGenderSelect(g)}
                className={`px-5 py-2.5 rounded-full text-sm transition-all active:scale-95 ${
                  gender === g ? accentGenderActive : accentTagInactive
                }`}
              >
                {g === 'male' ? '👦' : '👧'} {t(`form.${g}`)}
              </button>
            ))}
          </motion.div>
        )}

        {/* 阶段4: 期望/改善方向/目标人群 */}
        {namingPhase === 'direction' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 pt-1"
          >
            <div className="flex justify-end">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleExpectationSubmit(); }}
                placeholder={
                  namingType === 'adult'
                    ? t('naming.improveDirectionPlaceholder')
                    : namingType === 'brand'
                      ? t('naming.frontdesk.targetAudiencePlaceholder')
                      : t('naming.frontdesk.customDescriptionPlaceholder')
                }
                className={`input-mystic max-w-[80%] text-sm ${accentFocusBorder}`}
                autoFocus
              />
            </div>
            {namingType === 'adult' && (
              <div className="flex flex-wrap gap-2 justify-end">
                {CHAT_PREFERENCES.adult.map(({ labelKey, value }) => (
                  <button
                    key={value}
                    onClick={() => { setImproveFocus(t(labelKey)); addMessage('user', t('naming.frontdesk.improvePrefix', { value: t(labelKey) })); setChatInput(''); setTimeout(() => { addMessage('system', t('naming.frontdesk.askStyle')); setNamingPhase('style'); }, 500); }}
                    className={`px-3 py-2 rounded-full text-xs transition-all active:scale-95 ${accentTagInactive}`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleExpectationSubmit}
                disabled={!chatInput.trim() && namingType !== 'adult'}
                className={`px-6 py-2.5 rounded-full text-sm font-medium ${accentBtnBg} transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {t('naming.frontdesk.confirmButton')}
              </button>
            </div>
          </motion.div>
        )}

        {/* 阶段5: 风格选择 */}
        {namingPhase === 'style' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 pt-1"
          >
            <div className="flex flex-wrap gap-2 justify-end">
              {(namingType === 'brand'
                ? CHAT_PREFERENCES.brand
                : namingType === 'adult'
                  ? CHAT_PREFERENCES.brand  // adult 用通用风格
                  : CHAT_PREFERENCES.baby
              ).map(({ labelKey, value }) => (
                <button
                  key={value}
                  onClick={() => toggleStyle(value)}
                  className={`px-3 py-2 rounded-full text-xs transition-all active:scale-95 ${
                    style.includes(value) ? accentTagActive : accentTagInactive
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleStyleSubmit}
                className={`px-6 py-2.5 rounded-full text-sm font-medium ${accentSubmitBg} text-on-surface transition-all active:scale-95`}
              >
                {t('naming.frontdesk.submitCta')}
              </button>
            </div>
          </motion.div>
        )}

        {/* 阶段6: 分析中 */}
        {namingPhase === 'submitting' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex justify-start pt-1"
          >
            <div className="flex items-center gap-2 text-on-surface/50 text-sm">
              <Icon name="progress_activity" size={16} className="animate-spin" />
              {t('naming.frontdesk.analyzing')}
            </div>
          </motion.div>
        )}

        {/* 阶段7: 结果展示 — 已在消息中渲染，这里放操作按钮 */}
        {namingPhase === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="space-y-2 pt-1"
          >
            {(() => {
              const result = [...messages].reverse().find((message) => message.namingResult)?.namingResult;
              if (!result || compareCandidateIds.size < 2) return null;
              const selected = result.nameSuggestions
                .map((candidate, index) => ({ candidate, candidateId: getCandidateId(candidate, index) }))
                .filter(({ candidateId }) => compareCandidateIds.has(candidateId));
              if (selected.length < 2) return null;
              return (
                <section className="border border-outline/20 bg-surface-container-low/50 p-3">
                  <h3 className="mb-2 text-sm font-medium text-on-surface">
                    {t('naming.frontdesk.comparisonTitle')}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.map(({ candidate, candidateId }) => (
                      <div key={candidateId} className="border border-outline/15 p-2">
                        <p className="font-semibold text-primary">{candidate.names[0]}</p>
                        <p className="mt-1 text-xs leading-5 text-on-surface/65">{candidate.reason}</p>
                        {candidate.wuge && (
                          <p className="mt-1 text-xs text-on-surface/45">
                            {t('naming.frontdesk.wugeScore', { score: candidate.wuge.score })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}
            {/* P1-12: PDF 导出按钮 */}
            {(() => {
              const lastResultMsg = [...messages].reverse().find(m => m.namingResult);
              if (lastResultMsg?.namingResult) {
                const nr = lastResultMsg.namingResult;
                const unifiedResult = {
                  name_suggestions: nr.nameSuggestions,
                  bazi: nr.bazi,
                  wuxing_analysis: nr.wuxingAnalysis,
                  xi_yong_shen: nr.xiYongShen,
                } as any;
                return (
                  <div className="max-w-[80%] ml-auto">
                    <NamingPDFExport result={unifiedResult} recordId={nr.recordId} />
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex flex-wrap gap-2 justify-end">
              {/* P1-2: 查看完整分析报告跳转 */}
              {(() => {
                const lastResultMsg = [...messages].reverse().find(m => m.namingResult);
                if (lastResultMsg?.namingResult) {
                  const nr = lastResultMsg.namingResult;
                  return (
                    <button
                      onClick={() => {
                        if (!nr.recordId) {
                          return;
                        }
                        const reportRecordId = nr.recordId;
                        saveConsultData({
                          route_type: 'quming',
                          record_id: reportRecordId,
                          session_id: currentSessionId,
                          surname,
                          namingType: namingType || undefined,
                          originalName: originalName || undefined,
                          question: nr.summaryLine || chatInput || '取名咨询',
                          birth_date: birthDate || undefined,
                          birth_hour: birthDate ? birthHour : undefined,
                          birth_minute: birthDate ? birthMinute : undefined,
                          gender: gender || undefined,
                          source_entry: 'naming',
                          unlock_status: 'preview',
                        });
                        trackEvent('naming_view_full_report', { record_id: reportRecordId, has_real_record: true });
                        onClose?.();
                        navigate(`/result/${reportRecordId}`);
                      }}
                      disabled={!nr.recordId}
                      className="px-4 py-2 rounded-full text-sm bg-primary text-on-primary transition-all active:scale-95 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t('naming.frontdesk.viewFullReport', { defaultValue: '查看完整分析报告' })}
                    </button>
                  );
                }
                return null;
              })()}
              <button
                onClick={() => {
                  setNamingPhase('type');
                  setNamingType(null);
                  setSurname('');
                  setStyle([]);
                  setImproveFocus('');
                  setIndustry('');
                  setTargetAudience('');
                  setOriginalName('');
                  setGender(null);
                  setCustomDescription('');
                  setChatInput('');
                  setMessages([{
                    id: `greeting_${Date.now()}`,
                    role: 'system',
                    content: t('naming.frontdesk.greeting'),
                  }]);
                  trackEvent('naming_restart');
                }}
                className={`px-4 py-2 rounded-full text-sm ${accentTagInactive} transition-all active:scale-95`}
              >
                {t('naming.frontdesk.restart')}
              </button>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );

  const handleDismissExpectation = () => {
    saveProfile({ hasSeenExpectationManagement: true });
    setShowExpectationManagement(false);
    trackEvent('expectation_management_dismissed');
  };

  const renderQuestionChat = () => (
    <>
      <div className="flex-1 overflow-y-auto space-y-3 pb-4" ref={scrollRef}>
        {showExpectationManagement && (
          <motion.div
            initial={{ opacity: 0, x: -16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className="flex justify-start"
          >
            <ZhangbanshanAvatar size="sm" className="mr-2 mt-0.5" />
            <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--surface-container-low) / 0.7) 0%, hsl(var(--surface-container) / 0.5) 100%)',
                border: '1px solid hsl(var(--outline) / 0.2)',
                backdropFilter: 'blur(8px)',
                borderRadius: '1rem 0.25rem 1rem 1rem',
              }}>
              <span className="inline-flex items-center gap-1.5 mb-1.5 text-xs text-primary/60">
                <ZhangbanshanAvatar size="sm" />
                {t('question.frontdesk.master')}
              </span>
              <p>{EXPECTATION_MANAGEMENT_TEXT}</p>
              <button
                onClick={handleDismissExpectation}
                className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium text-primary border border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.1)] transition-all active:scale-95"
              >
                我知道了
              </button>
            </div>
          </motion.div>
        )}
        {renderMessages()}

        {isQuestionEditingPhase && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT_EXPO }}
            className="flex flex-wrap gap-2"
          >
            {QUICK_SUGGESTION_KEYS.map((key) => (
              <button key={key} onClick={() => handleSuggestion(t(key))}
                className="px-3 py-1.5 rounded-full text-xs bg-on-surface/5 text-on-surface/50 hover:bg-on-surface/10 hover:text-on-surface/80 transition-all border border-outline/5">
                {t(key)}
              </button>
            ))}
          </motion.div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm flex items-center gap-2"
          >
            <Icon name="error" size={16} />{error}
          </motion.p>
        )}

        {phase === 'error_retry' && question.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2"
          >
            <button
              onClick={() => void handleRetryQuestionSubmit()}
              className="px-4 py-2 rounded-full text-sm font-medium bg-[hsl(var(--secondary)/0.16)] text-secondary border border-[hsl(var(--secondary)/0.3)] transition-all active:scale-95"
            >
              {t('common.retry', { defaultValue: '重试' })}
            </button>
            <button
              onClick={() => {
                setError('');
                setPhase('input');
              }}
              className="px-4 py-2 rounded-full text-sm text-on-surface/60 border border-outline/10 transition-all active:scale-95"
            >
              {t('common.edit', { defaultValue: '继续修改' })}
            </button>
          </motion.div>
        )}
      </div>

      <div className="shrink-0 space-y-3">
        {isQuestionEditingPhase && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="space-y-3"
          >
            <p className="text-xs text-on-surface/30 text-center">{t('question.intents.selectHint')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {INTENT_CATEGORIES.map(({ key, defaultQuestionKey }) => (
                <button
                  key={key}
                  onClick={() => handleIntentCategory(key, defaultQuestionKey)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-all border ${
                    intentCategory === key
                      ? accentTagActive
                      : 'bg-on-surface/5 border-outline/5 text-on-surface/50 hover:bg-on-surface/10 hover:text-on-surface/80'
                  }`}
                >
                  <Icon name={USER_INTENT_ICONS[key]} size={14} />
                  {t(`question.intents.${key}`)}
                </button>
              ))}
            </div>
            <textarea
              value={question}
              onChange={(e) => { setQuestion(e.target.value); setError(''); setPhase('input'); }}
              placeholder={t('question.placeholder')}
              rows={3}
              className={`input-mystic w-full resize-none text-base ${accentFocusBorder}`}
            />
            <button onClick={handleQuestionSubmit}
              className={`w-full ${accentSubmitBg} text-on-surface font-medium py-3 rounded-xl transition-all`}>
              <span className="flex items-center justify-center gap-2">
                <Icon name="send" size={18} />
                {t('question.frontdesk.submit')}
              </span>
            </button>
          </motion.div>
        )}

        {(phase === 'submitting' || phase === 'preview' || phase === 'deepening') && intent && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            className="space-y-2"
          >
            {intent.reasoning && (
              <p className="text-xs text-on-surface/30 text-center">{intent.reasoning}</p>
            )}
            <div className="w-full py-4 rounded-xl text-center">
              <span className="flex items-center justify-center gap-2 text-on-surface/60 text-sm">
                <Icon name="progress_activity" size={18} className="animate-spin" />
                {t('common.loading')}
              </span>
            </div>
          </motion.div>
        )}

        {/* P2-T3.4: clarify 对话气泡化
            LLM 认为问题需要澄清时，以对话气泡形式展示澄清问题
            用户回答后，将澄清答案合并到原问题重新提交 */}
        {phase === 'clarify' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex justify-start">
              <ZhangbanshanAvatar size="sm" className="mr-2 mt-0.5" />
              <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed rounded-2xl bg-surface-container-low/70">
                {clarifyQuestion || '为了更准确地回答您的问题，请补充以下信息：'}
              </div>
            </div>
            <textarea
              value={clarifyAnswer}
              onChange={(e) => setClarifyAnswer(e.target.value)}
              placeholder="请输入您的补充说明…"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-surface-base border border-outline/30 text-sm text-on-surface resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // 合并澄清答案到原问题，重新提交
                  const merged = `${question}\n（补充：${clarifyAnswer}）`;
                  setQuestion(merged);
                  setClarifyAnswer('');
                  setPhase('input');
                  // 重新触发提交
                  setTimeout(() => handleQuestionSubmit(), 100);
                }}
                disabled={!clarifyAnswer.trim()}
                className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium disabled:opacity-40"
              >
                提交补充
              </button>
              <button
                onClick={() => {
                  setClarifyAnswer('');
                  setPhase('preview');
                  if (intent) handleConfirmWithIntent(intent, userIntent);
                }}
                className="px-4 py-2 rounded-lg border border-outline/30 text-sm text-on-surface/60"
              >
                跳过
              </button>
            </div>
          </motion.div>
        )}

        {/* P2-T3.2: liuren 起卦时间采集 */}
        {phase === 'liuren_ask_time' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 rounded-xl bg-surface-container-low/50"
          >
            <p className="text-sm text-on-surface/70">起卦时间（默认当前时间）</p>
            <input
              type="datetime-local"
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 rounded-lg bg-surface-base border border-outline/30 text-sm text-on-surface"
              onChange={(e) => {
                setLiurenAskTime(e.target.value);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhase('liuren_ask_location');
                }}
                className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
              >
                下一步
              </button>
              <button
                onClick={() => {
                  setPhase('preview');
                  if (intent) handleConfirmWithIntent(intent, userIntent);
                }}
                className="px-4 py-2 rounded-lg border border-outline/30 text-sm text-on-surface/60"
              >
                跳过
              </button>
            </div>
          </motion.div>
        )}

        {/* P2-T3.2: liuren 起卦地点采集 */}
        {phase === 'liuren_ask_location' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 rounded-xl bg-surface-container-low/50"
          >
            <p className="text-sm text-on-surface/70">起卦地点（用于真太阳时校正，可选）</p>
            <CityQuickInput
              value={liurenAskLocation}
              onChange={(c) => setLiurenAskLocation(c)}
              maxQuickButtons={8}
              placeholder="如：北京"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhase('preview');
                  if (intent) handleConfirmWithIntent(intent, userIntent);
                }}
                className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
              >
                确认起卦
              </button>
            </div>
          </motion.div>
        )}

        {/* P2-T3.3: ziping 档案检查 */}
        {phase === 'ziping_profile_check' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 rounded-xl bg-surface-container-low/50"
          >
            <p className="text-sm text-on-surface/70">子平八字需要出生信息</p>
            <p className="text-xs text-on-surface/40">检测到您尚未填写八字档案，请选择：</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setPhase('ziping_profile_choice')}
                className="w-full py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
              >
                填写档案
              </button>
              <button
                onClick={() => {
                  setPhase('preview');
                  if (intent) handleConfirmWithIntent(intent, userIntent);
                }}
                className="w-full py-2 rounded-lg border border-outline/30 text-sm text-on-surface/60"
              >
                跳过（使用默认档案）
              </button>
            </div>
          </motion.div>
        )}

        {/* P2-T3.3: ziping 档案选择 */}
        {phase === 'ziping_profile_choice' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 rounded-xl bg-surface-container-low/50"
          >
            <p className="text-sm text-on-surface/70">请填写出生信息</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                placeholder="出生日期"
                className="col-span-2 px-3 py-2 rounded-lg bg-surface-base border border-outline/30 text-sm text-on-surface"
                onChange={(e) => setZipingBirthDate(e.target.value)}
              />
              <select
                className="px-3 py-2 rounded-lg bg-surface-base border border-outline/30 text-sm text-on-surface"
                onChange={(e) => setZipingBirthHour(Number(e.target.value))}
                defaultValue=""
              >
                <option value="" disabled>出生时辰</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i * 2}>{['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][i]}时</option>
                ))}
              </select>
              <select
                className="px-3 py-2 rounded-lg bg-surface-base border border-outline/30 text-sm text-on-surface"
                onChange={(e) => setZipingGender(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>性别</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <button
              onClick={() => {
                // P2-T3.3: 保存出生信息到 profile store 后继续
                if (zipingBirthDate && zipingGender) {
                  saveProfile({
                    birthDate: zipingBirthDate,
                    birthHour: zipingBirthHour >= 0 ? zipingBirthHour : undefined,
                    gender: zipingGender as 'male' | 'female',
                  });
                }
                setPhase('preview');
                if (intent) handleConfirmWithIntent(intent, userIntent);
              }}
              className="w-full py-2 rounded-lg bg-primary text-on-primary text-sm font-medium"
            >
              确认并继续
            </button>
          </motion.div>
        )}
      </div>
    </>
  );

  return (
    <FrontdeskShell
      renderAs={renderAs}
      title={mode === 'naming' ? t('naming.frontdesk.chatting') : t('question.header')}
      onBack={handleBack}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="flex-1 min-h-0 flex flex-col"
      >
        {mode === 'naming' ? renderNamingChat() : renderQuestionChat()}
      </motion.div>
    </FrontdeskShell>
  );
}
