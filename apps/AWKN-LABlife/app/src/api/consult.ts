/**
 * 咨询 API 客户端 - 对接真实后端
 */
import apiClient from './client';
import { ApiError } from './client';
import type {
  RouteRequest,
  RouteResponse,
  InfoSubmit,
  ResultResponse,
  ClarifyAnswerRequest,
  PersonProfile,
  PersonProfilesResponse,
} from '@/types/api';
import type {
  DailyFortune,
  MonthlyFortune,
  YearlyFortune,
  CelebrityCase,
  BaziSimilarity,
} from '@/types/lifekline';

const CONSULT_BASE = '/consult';

/** 取名历史记录条目 */
export interface NamingHistoryItem {
  id: string;
  userId: string;
  consultRecordId: string;
  names: string; // JSON: [{name, score, analysis}]
  wuge: string | null; // JSON: 五行分析
  sancai: string | null; // JSON: 三才分析
  createdAt: string;
}

/** 后端 getRecords 返回的通用咨询记录条目 */
export interface ConsultRecordItem {
  id: string;
  question: string;
  route_type: string;
  summary_line: string | null;
  createdAt: string;
  profileId: string | null;
  reviewStatus?: 'pending' | 'verified' | 'expired';
  closed_loop_result?: {
    userReflection?: string;
    actualOutcome?: string;
    accuracyCheck?: string;
  } | null;
}

/** 后端 getRecords 返回的分页响应 */
export interface RecordsResponse {
  records: ConsultRecordItem[];
  total: number;
  hasMore: boolean;
}

/** 后端 getProfileRecords 返回的记录条目 */
export interface ProfileRecordItem {
  id: string;
  question: string;
  routeType: string;
  summaryLine: string | null;
  createdAt: string;
  profileId: string;
}

export const consultApi = {
  /**
   * 单次咨询分析接口
   * POST /api/v1/consult/analyze
   * 一次调用完成：算法计算 + 知识库检索 + LLM渲染
   */
  analyze: async (data: {
    routeType?: 'ziping' | 'liuren' | 'ziwei' | 'quming' | 'qimen' | 'liuyao' | 'meihua' | 'zhangsheng';
    route_type?: 'ziping' | 'liuren' | 'ziwei' | 'quming' | 'qimen' | 'liuyao' | 'meihua' | 'zhangsheng';
    question: string;
    birthDate?: string;
    birth_date?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: 'male' | 'female';
    askTime?: string;
    askLocation?: string;
    sessionId?: string;
    lang?: string;
    sourceEntry?: string;
    source_entry?: string;
    namingType?: string;
    namingPreferences?: string;
    unlockStatus?: string;
    questionIntent?: string;
    question_intent?: string;
    surname?: string;
    stylePreference?: string[];
    improveFocus?: string;
    industry?: string;
    targetAudience?: string;
    originalName?: string;
    customDescription?: string;
    contextSource?: 'kline_node';
    targetDate?: string;
    questionType?: 'kline_node';
    signalLabel?: string;
    compositeScore?: number;
    opportunityScore?: number;
    riskScore?: number;
    eventSummary?: string;
    /** P0-5: 知识库 ID（预留，后端 RAG 就绪后启用） */
    knowledge_base_id?: string;
    /** P0-5: 是否启用知识库检索增强（预留，后端 RAG 就绪后启用） */
    retrieval_context?: boolean;
  }): Promise<ResultResponse> => {
    const { lang = 'zh-CN', ...body } = data;
    const response = await apiClient.post<any>(`${CONSULT_BASE}/analyze?lang=${lang}`, body);
    if (response?.error) {
      throw new ApiError(
        response.status || 500,
        response.code || 'CONSULT_ANALYZE_FAILED',
        response.message || '分析服务暂时不可用，请稍后重试',
        response.details,
      );
    }
    if (!response?.record_id && response?.route_type !== 'clarify') {
      throw new ApiError(
        502,
        'CONSULT_RECORD_ID_MISSING',
        '分析结果未生成正式记录，请重试',
        response,
      );
    }
    return response as ResultResponse;
  },

  route: async (data: RouteRequest): Promise<RouteResponse> => {
    return apiClient.post<RouteResponse>(`${CONSULT_BASE}/route`, {
      question: data.question_text,
    });
  },

  clarify: async (question: string): Promise<{ clarifyingQuestion: string }> => {
    return apiClient.post(`${CONSULT_BASE}/clarify`, { question });
  },

  submitInfo: async (data: InfoSubmit & { sessionId: string }): Promise<ResultResponse> => {
    return apiClient.post<ResultResponse>(`${CONSULT_BASE}/info`, data);
  },

  getResult: async (recordId: string, lang?: string): Promise<ResultResponse> => {
    const query = lang && lang !== 'zh-CN' ? `?lang=${lang}` : '';
    return apiClient.get<ResultResponse>(`${CONSULT_BASE}/result/${recordId}${query}`);
  },

  saveRecord: async (recordId: string): Promise<{ success: boolean }> => {
    return apiClient.post(`${CONSULT_BASE}/save`, { recordId });
  },

  saveConsultation: async (data: {
    question: string;
    birthDate?: string;
    birthTime?: string;
    gender?: string;
    routeType?: string;
    userIntent?: string;
    sessionId?: string;
  }): Promise<{ recordId: string }> => {
    // 后端实际端点：POST /consult/save（需JWT，body: { recordId }）
    // 此接口不需要 recordId 入参——它在 analyze 阶段已生成 recordId
    return apiClient.post<{ recordId: string }>(`${CONSULT_BASE}/save`, data);
  },

  getRecords: async (limit = 20, offset = 0): Promise<RecordsResponse> => {
    return apiClient.get<RecordsResponse>(`${CONSULT_BASE}/records`, {
      limit: String(limit),
      offset: String(offset),
    });
  },

  deleteRecord: async (recordId: string) => {
    // 后端端点：POST /consult/records/delete（接 { recordIds: [...] }，JWT）
    return apiClient.post(`${CONSULT_BASE}/records/delete`, { recordIds: [recordId] });
  },

  // 获取单条咨询记录详情(包含VIP模块数据)
  getRecord: async (recordId: string, moduleId?: string, lang?: string): Promise<ResultResponse> => {
    const params: string[] = [];
    if (moduleId) params.push(`module=${moduleId}`);
    if (lang && lang !== 'zh-CN') params.push(`lang=${lang}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return apiClient.get<ResultResponse>(`${CONSULT_BASE}/result/${recordId}${query}`);
  },

  getRecordAdmin: async (recordId: string, moduleId?: string, lang?: string): Promise<ResultResponse> => {
    const params: string[] = [];
    if (moduleId) params.push(`module=${moduleId}`);
    if (lang && lang !== 'zh-CN') params.push(`lang=${lang}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return apiClient.get<ResultResponse>(`${CONSULT_BASE}/result/${recordId}${query}`, undefined, true);
  },

  submitClarifyAnswer: async (data: ClarifyAnswerRequest): Promise<RouteResponse> => {
    return apiClient.post<RouteResponse>(`${CONSULT_BASE}/clarify`, {
      question: data.question_text,
      answer: data.answer,
    });
  },

  getDailyFortune: async (params: {
    birthDate: string;
    birthTime?: string;
    gender?: 'male' | 'female';
    birthPlace?: string;
    lang?: string;
  }): Promise<DailyFortune> => {
    const query: Record<string, string> = { birthDate: params.birthDate };
    if (params.birthTime) query.birthTime = params.birthTime;
    if (params.gender) query.gender = params.gender;
    if (params.birthPlace) query.birthPlace = params.birthPlace;
    if (params.lang && params.lang !== 'zh-CN') query.lang = params.lang;
    return apiClient.get<DailyFortune>(`${CONSULT_BASE}/fortune/daily`, query);
  },

  getMonthlyFortune: async (year: number, month: number, params: {
    birthDate: string;
    birthTime?: string;
    gender?: 'male' | 'female';
    birthPlace?: string;
    lang?: string;
  }): Promise<MonthlyFortune> => {
    const query: Record<string, string> = { birthDate: params.birthDate };
    if (params.birthTime) query.birthTime = params.birthTime;
    if (params.gender) query.gender = params.gender;
    if (params.birthPlace) query.birthPlace = params.birthPlace;
    if (params.lang && params.lang !== 'zh-CN') query.lang = params.lang;
    return apiClient.get<MonthlyFortune>(`${CONSULT_BASE}/fortune/monthly/${year}/${month}`, query);
  },

  getYearlyFortune: async (year: number, params: {
    birthDate: string;
    birthTime?: string;
    gender?: 'male' | 'female';
    birthPlace?: string;
    lang?: string;
  }): Promise<YearlyFortune> => {
    const query: Record<string, string> = { birthDate: params.birthDate };
    if (params.birthTime) query.birthTime = params.birthTime;
    if (params.gender) query.gender = params.gender;
    if (params.birthPlace) query.birthPlace = params.birthPlace;
    if (params.lang && params.lang !== 'zh-CN') query.lang = params.lang;
    return apiClient.get<YearlyFortune>(`${CONSULT_BASE}/fortune/yearly/${year}`, query);
  },

  getCelebrityCases: async (category?: string): Promise<CelebrityCase[]> => {
    const query = category ? { category } : undefined;
    return apiClient.get<CelebrityCase[]>(`${CONSULT_BASE}/celebrity-cases`, query);
  },

  getCelebrityCaseById: async (id: string): Promise<CelebrityCase> => {
    return apiClient.get<CelebrityCase>(`${CONSULT_BASE}/celebrity-cases/${id}`);
  },

  calculateCelebritySimilarity: async (id: string, data: {
    birthDate: string;
    birthTime?: string;
    gender?: 'male' | 'female';
    birthPlace?: string;
  }): Promise<BaziSimilarity> => {
    return apiClient.post<BaziSimilarity>(`${CONSULT_BASE}/celebrity-cases/${id}/similarity`, data);
  },

  getPersonProfiles: async (): Promise<PersonProfilesResponse> => {
    return apiClient.get<PersonProfilesResponse>(`${CONSULT_BASE}/person-profiles`);
  },

  getProfileRecords: async (profileId: string): Promise<ProfileRecordItem[]> => {
    return apiClient.get<ProfileRecordItem[]>(`${CONSULT_BASE}/person-profiles/${profileId}/records`);
  },

  deleteRecords: async (recordIds: string[]): Promise<{ deletedCount: number }> => {
    return apiClient.post<{ deletedCount: number }>(`${CONSULT_BASE}/records/delete`, { recordIds });
  },

  getFollowUpContext: async (followUpId: string): Promise<{
    followUpId: string;
    recordId: string;
    question: string;
    routeType: string | null;
    summaryLine: string | null;
    recordCreatedAt: string | null;
    scheduledAt: string;
    completedAt: string | null;
    status: string;
  }> => {
    return apiClient.get(`${CONSULT_BASE}/followup/${followUpId}`);
  },

  saveClosedLoopResult: async (
    recordId: string,
    data: {
      userReflection?: string;
      actualOutcome: string;
      accuracyCheck?: string;
    }
  ): Promise<{
    success: boolean;
    recordId: string;
    reviewStatus: 'verified';
    closed_loop_result: {
      userReflection?: string;
      actualOutcome?: string;
      accuracyCheck?: string;
    };
  }> => {
    return apiClient.post(`${CONSULT_BASE}/records/${recordId}/closed-loop`, data);
  },

  getModuleStatus: async (recordId: string, moduleId: string): Promise<{
    recordId: string;
    moduleId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found';
    content: Record<string, unknown> | null;
    followUpQuestions: string[];
    errorCode: 'timeout' | 'validation_failed' | 'provider_failed' | 'not_found' | null;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }> => {
    const raw = await apiClient.get(`/consult/records/${recordId}/modules/${moduleId}`);
    // normalize: 兼容旧版 data.data 嵌套和新版一层结构
    const d = (raw as any)?.data ?? raw;
    const rawStatus = d.status ?? d.data?.status ?? 'pending';
    // 映射后端状态到前端统一枚举
    let status: 'pending' | 'running' | 'completed' | 'failed' | 'not_found';
    if (rawStatus === 'completed') status = 'completed';
    else if (rawStatus === 'running' || rawStatus === 'processing') status = 'running';
    else if (rawStatus === 'failed' || rawStatus === 'failed_retryable' || rawStatus === 'timeout') status = 'failed';
    else if (rawStatus === 'not_found') status = 'not_found';
    else status = 'pending';

    return {
      recordId: d.recordId ?? recordId,
      moduleId: d.moduleId ?? moduleId,
      status,
      content: d.content ?? d.moduleContent ?? d.data?.content ?? null,
      followUpQuestions: d.followUpQuestions ?? d.data?.followUpQuestions ?? [],
      errorCode: d.errorCode ?? d.data?.errorCode ?? null,
      errorMessage: d.errorMessage ?? d.data?.errorMessage ?? null,
      startedAt: d.startedAt ?? d.data?.createdAt ?? null,
      finishedAt: d.finishedAt ?? d.data?.completedAt ?? null,
    };
  },

  retryModule: async (recordId: string, moduleId: string): Promise<{
    data: { recordId: string; moduleId: string; status: string; message: string };
    error: string | null;
  }> => {
    const res = await apiClient.post(`/consult/records/${recordId}/modules/${moduleId}/retry`);
    return res as any;
  },

  saveDestinySnapshot: async (recordId: string, moduleId: string, destinyKline: any): Promise<{ saved: boolean }> => {
    return apiClient.post<{ saved: boolean }>(`${CONSULT_BASE}/records/${recordId}/modules/${moduleId}/destiny-snapshot`, { destinyKline });
  },

  /**
   * 实验接口 - 主流程不使用
   * 当前免费预览由 /consult/analyze 返回的算法结果生成
   * 此接口返回固定样例内容，仅用于开发调试
   */
  createPreview: async (params: {
    module: 'kline' | 'naming' | 'question';
    birthDate?: string;
    birthTime?: string;
    gender?: string;
    questionType?: string;
  }): Promise<{
    previewId: string;
    module: string;
    freeContent: Record<string, unknown>;
    lockedContent: { description: string; features: string[] };
    expiresAt: string;
  }> => {
    return apiClient.post(`${CONSULT_BASE}/preview`, params);
  },

  adminGetUsers: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/users${query}`);
  },

  adminGetPersonProfiles: async (params?: { userId?: string; page?: number; limit?: number }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.userId) queryParts.push(`userId=${params.userId}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/person-profiles${query}`);
  },

  adminGetConsultRecord: async (id: string): Promise<any> => {
    return apiClient.get(`/admin/consult-records/${id}`);
  },

  adminGetConsultRecords: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    sessionId?: string;
    routeType?: string;
    withoutProfile?: boolean;
    reviewStatus?: 'pending' | 'verified' | 'expired' | 'all';
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.userId) queryParts.push(`userId=${params.userId}`);
    if (params?.sessionId) queryParts.push(`sessionId=${params.sessionId}`);
    if (params?.routeType) queryParts.push(`routeType=${params.routeType}`);
    if (params?.withoutProfile) queryParts.push('withoutProfile=true');
    if (params?.reviewStatus && params.reviewStatus !== 'all') queryParts.push(`reviewStatus=${params.reviewStatus}`);
    if (params?.startDate) queryParts.push(`startDate=${params.startDate}`);
    if (params?.endDate) queryParts.push(`endDate=${params.endDate}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/consult-records${query}`);
  },

  adminGetInteractionEvents: async (params?: { recordId?: string; limit?: number }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.recordId) queryParts.push(`recordId=${params.recordId}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/interaction-events${query}`);
  },

  adminGetPersonProfileRecords: async (profileId: string): Promise<any> => {
    return apiClient.get(`/admin/person-profiles/${profileId}/records`);
  },

  adminUnlinkPersonProfileRecord: async (profileId: string, recordId: string): Promise<any> => {
    return apiClient.delete(`/admin/person-profiles/${profileId}/records/${recordId}`);
  },

  adminMergePersonProfile: async (profileId: string, targetProfileId: string): Promise<any> => {
    return apiClient.post(`/admin/person-profiles/${profileId}/merge`, { targetProfileId });
  },

  adminRebindPersonProfileRecord: async (recordId: string, targetProfileId: string): Promise<any> => {
    return apiClient.post(`/admin/person-profiles/records/${recordId}/rebind`, { targetProfileId });
  },

  adminCreatePersonProfileFromRecord: async (
    recordId: string,
    data?: {
      name?: string;
      birthDate?: string;
      birthTime?: string;
      gender?: string;
      birthPlace?: string;
    },
  ): Promise<any> => {
    return apiClient.post(`/admin/person-profiles/from-records/${recordId}`, data || {});
  },

  adminGetStats: async (): Promise<any> => {
    return apiClient.get('/admin/stats');
  },

  adminGetNamingRecords: async (params?: { page?: number; limit?: number }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/naming-records${query}`);
  },

  adminGetQuestionRecords: async (params?: { page?: number; limit?: number; reviewStatus?: 'pending' | 'verified' | 'expired' | 'all' }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.reviewStatus && params.reviewStatus !== 'all') queryParts.push(`reviewStatus=${params.reviewStatus}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/question-records${query}`);
  },

  adminGetAssetOverview: async (params?: {
    userId?: string;
    moduleType?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.userId) queryParts.push(`userId=${params.userId}`);
    if (params?.moduleType) queryParts.push(`moduleType=${params.moduleType}`);
    if (params?.startDate) queryParts.push(`startDate=${params.startDate}`);
    if (params?.endDate) queryParts.push(`endDate=${params.endDate}`);
    if (params?.status) queryParts.push(`status=${params.status}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`${CONSULT_BASE}/admin/asset-overview${query}`);
  },

  adminGetKlineRecords: async (params?: { page?: number; limit?: number; reviewStatus?: 'pending' | 'verified' | 'expired' | 'all' }): Promise<any> => {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.reviewStatus && params.reviewStatus !== 'all') queryParts.push(`reviewStatus=${params.reviewStatus}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiClient.get(`/admin/kline-records${query}`);
  },

  saveNamingBehavior: async (recordId: string, action: 'favorite' | 'remove', name: string): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`${CONSULT_BASE}/records/${recordId}/behavior`, {
      action,
      name,
    });
  },

  saveBehaviorEvent: async (
    recordId: string,
    eventType: string,
    payload?: Record<string, unknown>,
  ): Promise<{ success: boolean; recordId: string; eventType: string }> => {
    return apiClient.post<{ success: boolean; recordId: string; eventType: string }>(
      `${CONSULT_BASE}/records/${recordId}/behavior`,
      {
        eventType,
        payload: payload || {},
      },
    );
  },

  /** 追问接口 - POST /api/v1/consult/followup */
  followup: async (data: {
    recordId: string;
    question: string;
    context?: Array<{ role: string; content: string }>;
  }): Promise<{
    recordId: string;
    question: string;
    content: string;
    done: boolean;
    followupCount: number;
    maxRounds: number;
    paywallTriggered?: boolean;
    provider?: string;
    model?: string;
    error?: string;
  }> => {
    return apiClient.post(`${CONSULT_BASE}/followup`, data);
  },

  getUserInsights: async (): Promise<{
    topEntry: string | null;
    preferredRouteType: string | null;
    unlockedModules: string[];
    recentTopics: string[];
    totalConsults: number;
    namingPreferences?: { type?: string; style?: string };
    questionIntents?: string[];
  }> => {
    return apiClient.get('/user/profile/insights');
  },

  /**
   * 查询取名历史
   */
  getNamingHistory: (params: {
    page?: number;
    pageSize?: number;
  }): Promise<{
    records: NamingHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
  }> => {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams.page = String(params.page);
    if (params.pageSize !== undefined) queryParams.pageSize = String(params.pageSize);
    return apiClient.get<any>(`${CONSULT_BASE}/naming/history`, queryParams);
  },
};
