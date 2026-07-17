import type { ConsultDraft } from '@/store/consultDraftStore';
import type { RoutingResult, UserIntentType } from '@/lib/intentRouter';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;
type NamingType = 'baby' | 'adult' | 'brand';

export interface KlineQuestionContext {
  contextSource: 'kline_node';
  targetDate: string;
  questionType: 'kline_node';
  signalLabel?: string;
  compositeScore?: number;
  opportunityScore?: number;
  riskScore?: number;
  eventSummary?: string;
  /** P2-05 (2026-07-12): V2 snapshotId 用于后端回查节点 */
  snapshotId?: string;
  /** P2-05 (2026-07-12): V2 nodeId 精确定位节点 */
  nodeId?: string;
  /** P2-05 (2026-07-12): V2 nodeType 区分机会/风险/转折 */
  nodeType?: 'opportunity' | 'risk' | 'turn';
  /** P2-05 (2026-07-12): V2 score 用于后端上下文 */
  score?: number;
  /** P2-05 (2026-07-12): V2 summary 用于 LLM 上下文 */
  summary?: string;
}

export function buildKlineNodeQuestionPrompt(context: KlineQuestionContext, t: TranslateFn) {
  const signalPart = context.signalLabel
    ? t('question.frontdesk.klineNodeSignal', { signal: context.signalLabel })
    : '';
  return t('question.frontdesk.klineNodePrompt', { targetDate: context.targetDate, signalPart });
}

interface NamingQuestionTextParams {
  t: TranslateFn;
  namingType: NamingType;
  surname: string;
  style: string[];
  improveFocus: string;
  industry: string;
  targetAudience: string;
  originalName: string;
  birthDate: string;
  birthHour: number;
  birthMinute: number;
  gender: 'male' | 'female' | null;
  customDescription: string;
}

interface NamingConsultPayloadParams extends NamingQuestionTextParams {}

interface QuestionDraftParams {
  routingResult: RoutingResult;
  detectedUserIntent: UserIntentType | null;
  question: string;
  intentCategory: string;
  askTime?: string;
  askLocation?: string;
  sessionId?: string;
  recordId?: string;
  profile?: {
    birthDate?: string;
    birthHour?: number;
    birthMinute?: number;
    gender?: string;
    city?: string;
  };
  t: TranslateFn;
}

export function createTempRecordId(prefix: 'Q' | 'QUMING' | 'HOME' = 'Q') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildNamingQuestionText({
  t,
  namingType,
  surname,
  style,
  improveFocus,
  industry,
  targetAudience,
  birthDate,
  birthHour,
  birthMinute,
  gender,
  customDescription,
}: NamingQuestionTextParams) {
  const genderLabel = gender === 'male' ? t('form.male') : gender === 'female' ? t('form.female') : '';
  const styleLabel = style.length > 0
    ? style.map((value) => t(`naming.styles.${value}`)).join(t('common.listSeparator'))
    : t('naming.frontdesk.noPreference');
  const customPart = customDescription ? `，${t('naming.frontdesk.supplementary')}：${customDescription}` : '';
  const birthTimePart = birthDate
    ? `，${t('naming.frontdesk.birthDateLabel')}：${birthDate} ${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`
    : '';
  const genderPart = genderLabel ? `，${t('naming.frontdesk.genderLabel')}：${genderLabel}` : '';

  if (namingType === 'baby') {
    return t('naming.frontdesk.questionBaby', {
      surname: surname || t('naming.frontdesk.babyDefault'),
      styleLabel,
      birthTimePart,
      birthDatePart: '',
      genderPart,
      customPart,
    });
  }

  if (namingType === 'adult') {
    return t('naming.frontdesk.questionAdult', {
      improveDirectionLabel: t('naming.frontdesk.improveDirectionLabel'),
      improveFocus: improveFocus || t('naming.frontdesk.overallFortune'),
      birthDatePart: birthTimePart,
      genderPart,
      customPart,
    });
  }

  const targetAudiencePart = targetAudience ? `，${t('naming.frontdesk.targetAudienceLabel')}${targetAudience}` : '';
  return t('naming.frontdesk.questionBrand', {
    industry: industry || t('naming.frontdesk.brandDefault'),
    targetAudiencePart,
    styleLabel,
    customPart,
  });
}

export function buildNamingConsultPayload(params: NamingConsultPayloadParams) {
  const question = buildNamingQuestionText(params);
  return {
    routeType: 'quming',
    question,
    sourceEntry: 'naming',
    namingType: params.namingType,
    namingPreferences: params.style.length > 0 ? JSON.stringify(params.style) : undefined,
    unlockStatus: 'preview',
    surname: params.surname || undefined,
    stylePreference: params.style.length > 0 ? params.style : undefined,
    improveFocus: params.improveFocus || undefined,
    industry: params.industry || undefined,
    targetAudience: params.targetAudience || undefined,
    originalName: params.originalName || undefined,
    customDescription: params.customDescription || undefined,
    birthDate: params.birthDate || undefined,
    birthTime: params.birthDate ? `${params.birthHour}:${params.birthMinute || 0}` : undefined,
    gender: params.gender || undefined,
  };
}

export function buildQuestionDraft({
  routingResult,
  detectedUserIntent,
  question,
  intentCategory,
  askTime,
  askLocation,
  sessionId,
  recordId,
  profile,
  t,
}: QuestionDraftParams): Partial<ConsultDraft> {
  const base: Partial<ConsultDraft> = {
    route_type: routingResult.route_type,
    user_intent: detectedUserIntent || undefined,
    question: question.trim(),
    from_home: true,
    intent_category: intentCategory || undefined,
    source_entry: 'question',
  };

  if (askTime) {
    base.ask_time = askTime;
    base.session_id = sessionId;
    base.record_id = recordId;
    base.question_intent = detectedUserIntent || undefined;
    base.unlock_status = 'preview';
  }

  if (askLocation) {
    base.ask_location = askLocation;
  }

  if (profile?.birthDate && profile?.gender) {
    base.birth_date = profile.birthDate;
    base.birth_hour = profile.birthHour ?? 12;
    base.birth_minute = profile.birthMinute ?? 0;
    base.gender = profile.gender;
    base.city = profile.city || t('form.defaultCity');
  }

  return base;
}

export function buildQuestionResultUrl(
  recordId: string,
  routingResult: RoutingResult,
  detectedUserIntent: UserIntentType | null,
  intentCategory: string,
) {
  return `/result/${recordId}?mode=home&intent=${detectedUserIntent || 'other'}${intentCategory ? `&intentCategory=${intentCategory}` : ''}`;
}
