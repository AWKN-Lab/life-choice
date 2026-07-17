import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConsultResponse,
  ConsultType,
  DivinationInfo,
  DestinyInfo,
  ConsultRecord,
} from '@/types';
import type {
  RouteResponse,
  ResultResponse,
  InfoSubmit,
  ClarifyAnswerRequest,
} from '@/types/api';
import { consultApi } from '@/api/consult';
import { getUserId } from '@/api/client';
import { ApiError } from '@/api/client';
import { trackEvent } from '@/lib/analytics';
import { saveConsultData } from '@/lib/consultDataMigration';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/** 生成安全 UUID */
function generateRecordId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface ConsultState {

  currentQuestion: string;
  routeResponse: RouteResponse | null;
  consultType: ConsultType | null;
  divinationInfo: DivinationInfo | null;
  destinyInfo: DestinyInfo | null;
  response: ConsultResponse | null;
  isAnalyzing: boolean;
  error: string | null;
  lastRecordId: string | null; // 新增：存储最新的 recordId
  saveError: string | null;

  clarifyQuestion: string | null;
  isClarifying: boolean;

  records: ConsultRecord[];

  setQuestion: (question: string) => void;
  setConsultType: (type: ConsultType) => void;
  analyzeQuestion: (question: string) => Promise<RouteResponse>;
  submitClarifyAnswer: (answer: string) => Promise<RouteResponse>;
  setDivinationInfo: (info: DivinationInfo) => void;
  setDestinyInfo: (info: DestinyInfo) => void;
  submitInfo: () => Promise<void>;
  generateResponse: () => Promise<ConsultResponse>;
  saveRecord: (customResponse?: ConsultResponse) => void;
  updateRecordModuleContent: (recordId: string, moduleId: string, moduleContent: any) => void;
  clearCurrent: () => void;
  clearError: () => void;
}

const analyzeConsultTypeLocal = (question: string): ConsultType => {
  const divinationKeywords = [
    '要不要', '能不能', '适合', '签约', '见面', '谈判', '合作',
    '换工作', '离职', '投资', '买房', '结婚', '搬家', '出行',
    'should', 'can i', 'suitable', 'sign', 'meet', 'negotiate', 'cooperate',
    'job', 'quit', 'invest', 'buy', 'marry', 'move', 'travel'
  ];

  const destinyKeywords = [
    '运势', '今年', '本周', '最近', '整体', '趋势', '运程', '命理',
    '事业运', '财运', '财富', '事业', '工作', '未来', '流年', '大运',
    'fortune', 'this year', 'this week', 'recently', 'overall', 'trend', 'destiny',
    'career luck', 'wealth luck', 'career', 'wealth'
  ];

  const lowerQuestion = question.toLowerCase();

  const hasDivination = divinationKeywords.some(kw =>
    lowerQuestion.includes(kw.toLowerCase())
  );
  const hasDestiny = destinyKeywords.some(kw =>
    lowerQuestion.includes(kw.toLowerCase())
  );

  // 映射到正确的 ConsultType
  if (hasDivination && !hasDestiny) return 'liuren';
  if (hasDestiny && !hasDivination) return 'ziping';
  if (hasDivination && hasDestiny) return 'ziping';

  return 'clarify';
};

const generateMockRouteResponse = (
  question: string
): RouteResponse => {
  const type = analyzeConsultTypeLocal(question);

  if (type === 'clarify') {
    return {
      route_type: 'clarify',
      need_clarify: true,
      required_fields: [],
      next_step: 'clarify',
      clarify_question:
        '您的问题比较宽泛，能否具体说明是想了解某件事的走向，还是想看整体运势？',
    };
  }

  if (type === 'liuren') {
    return {
      route_type: 'liuren',
      need_clarify: false,
      required_fields: ['ask_time', 'ask_location'],
      next_step: 'info',
    };
  }

  return {
    route_type: 'ziping',
    need_clarify: false,
    required_fields: [
      'birth_date',
      'birth_time',
      'birth_location',
    ],
    next_step: 'info',
  };
};

const generateMockResult = (
  type: ConsultType
): Omit<ConsultResponse, 'record_id'> => {
  const divinationResponses: Omit<
    ConsultResponse,
    'record_id' | 'type'
  >[] = [
    {
      summary_line: '这件事有机会，但先别急着深绑。',
      summary_body:
        '当前局势显示有转机，但需谨慎评估对方的真实意图。建议先观察一段时间，不要急于做决定。',
      risks: [
        '对方可能有隐藏动机',
        '时机尚未成熟',
        '过度投入可能带来损失',
      ],
      actions: [
        '先保持现状观察',
        '收集更多信息',
        '与信任的人商量',
      ],
      time_window: '未来 3-10 天：适合试探与验证',
      evidence_fold:
        '推演依据：能量场显示"可推进但需保留余地"，因此建议先完成信息收集与风险对冲。',
      paywall_modules: ['breakthrough', 'morning'],
    },
    {
      summary_line: '现在行动正当其时，但要速战速决。',
      summary_body:
        '能量场显示当前是行动的窗口期，但机会稍纵即逝。需要果断决策，快速执行。',
      risks: [
        '拖延会错失良机',
        '竞争对手也在行动',
        '犹豫会导致被动',
      ],
      actions: [
        '立即制定行动计划',
        '争取本周内落实',
        '保持灵活应变',
      ],
      time_window: '本周内：适合关键节点落地',
      evidence_fold:
        '推演依据：当前趋势更偏"进攻窗口"，但要确保节奏与决策链路足够短。',
      paywall_modules: ['breakthrough', 'morning'],
    },
    {
      summary_line: '建议暂缓，等待更好的时机。',
      summary_body:
        '目前的能量场显示阻力较大，强行推进可能事倍功半。建议先巩固基础，等待时机成熟。',
      risks: [
        '强行推进会遇阻',
        '资源消耗过大',
        '可能影响其他布局',
      ],
      actions: [
        '先处理其他优先事项',
        '为后续行动做准备',
        '关注时机变化',
      ],
      time_window: '未来 2-4 周：先做准备再出手更稳',
      evidence_fold:
        '推演依据：阻力增加意味着"推进成本上升"，应先完成内外部条件匹配。',
      paywall_modules: ['morning'],
    },
  ];

  const destinyResponses: Omit<
    ConsultResponse,
    'record_id' | 'type'
  >[] = [
    {
      summary_line: '你这段时间整体偏整理，不宜太急着扩张。',
      summary_body:
        '当前处于能量整合期，适合回顾总结、调整方向，而不是盲目扩张。',
      risks: [
        '过度扩张会分散精力',
        '基础不牢影响长远发展',
        '容易忽视细节问题',
      ],
      actions: [
        '梳理现有资源',
        '优化内部流程',
        '为下一阶段做准备',
      ],
      time_window: '近期：适合复盘与校准，不建议硬扩张',
      evidence_fold:
        '推演依据：当前更像"稳态期"，此时扩张容易消耗注意力与资源。',
      paywall_modules: ['morning', 'breakthrough'],
    },
    {
      summary_line: '近期有贵人运，多出门走动会有收获。',
      summary_body:
        '人际能量场活跃，适合拓展人脉、寻求合作。外出交流会带来意外机遇。',
      risks: [
        '宅在家里错失机会',
        '过于保守影响发展',
        '单打独斗效率低',
      ],
      actions: [
        '多参加社交活动',
        '主动联系老朋友',
        '保持开放心态',
      ],
      time_window: '未来 7-14 天：多见面、多验证更容易遇到机会',
      evidence_fold:
        '推演依据：交流能量增强意味着"机会来自连接"，因此应主动建立与验证联系。',
      paywall_modules: ['morning'],
    },
    {
      summary_line: '这段时间适合深耕，专注做好一件事。',
      summary_body:
        '能量场显示专注力强，适合深入钻研某个领域，会有不错的收获。',
      risks: [
        '分心会影响效果',
        '浅尝辄止难有大成',
        '频繁切换消耗精力',
      ],
      actions: [
        '选定一个方向深耕',
        '制定学习计划',
        '保持持续投入',
      ],
      time_window: '本月：适合持续投入与阶段性成果落地',
      evidence_fold:
        '推演依据：当前"专注度优势"更突出，单点深耕更容易形成正反馈。',
      paywall_modules: ['breakthrough'],
    },
  ];

  const responses =
    type === 'liuren' ? divinationResponses : destinyResponses;
  const randomResponse =
    responses[Math.floor(Math.random() * responses.length)];

  return {
    type,
    ...randomResponse,
  };
};

function mapRouteToConsultType(routeType: string): ConsultType {
  switch (routeType) {
    case 'liuren':
      return 'liuren';
    case 'ziping':
      return 'ziping';
    case 'liuyao':
      return 'liuyao';
    case 'qimen':
      return 'qimen';
    case 'quming':
      return 'quming';
    case 'zhangsheng':
      return 'zhangsheng';
    case 'ziwei':
      return 'ziwei';
    case 'clarify':
      return 'clarify';
    default:
      return 'liuren';
  }
}

function mapResultToConsultResponse(
  result: ResultResponse
): ConsultResponse {
  return {
    type: mapRouteToConsultType(result.route_type),
    summary_line: result.summary_line,
    summary_body: result.summary_body,
    risks: result.risk_block,
    actions: result.action_block,
    time_window: result.window_block,
    evidence_fold: result.evidence_fold,
    paywall_modules: result.paywall_modules,
    record_id: result.record_id,
    calc_result: result.calc_result,
    module_content: (result as any).module_content,
    zhangbanshan_output: result.zhangbanshan_output,
  };
}

export const useConsultStore = create<ConsultState>()(
  persist(
    (set, get) => ({
      currentQuestion: '',
      routeResponse: null,
      consultType: null,
      divinationInfo: null,
      destinyInfo: null,
      response: null,
      isAnalyzing: false,
      error: null,
      clarifyQuestion: null,
      isClarifying: false,
      records: [],
      lastRecordId: null,
      saveError: null,

      setQuestion: (question) => {
        set({ currentQuestion: question });
      },

      setConsultType: (type) => {
        set({ consultType: type });
      },

      analyzeQuestion: async (question) => {
        set({ isAnalyzing: true, error: null, currentQuestion: question });

        try {
          let routeRes: RouteResponse;

          if (USE_MOCK) {
            await new Promise((r) => setTimeout(r, 1500));
            routeRes = generateMockRouteResponse(question);
          } else {
            routeRes = await consultApi.route({
              question_text: question,
            });
          }

          const consultType = mapRouteToConsultType(routeRes.route_type);

          trackEvent('question_submit_auto_routing', {
            question_text: question,
            route_type: routeRes.route_type,
            need_clarify: routeRes.need_clarify,
            required_fields: routeRes.required_fields,
            next_step: routeRes.next_step,
          });

          set({
            routeResponse: routeRes,
            consultType,
            isAnalyzing: false,
            clarifyQuestion: routeRes.clarify_question || null,
          });

          return routeRes;
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.message
              : '分析失败，请重试';

          trackEvent('question_submit_error', {
            error_message: message,
          });

          set({ error: message, isAnalyzing: false });
          throw err;
        }
      },

      submitClarifyAnswer: async (answer) => {
        set({ isClarifying: true, error: null });

        try {
          let routeRes: RouteResponse;

          if (USE_MOCK) {
            await new Promise((r) => setTimeout(r, 1000));
            routeRes = generateMockRouteResponse(
              `${get().currentQuestion} - ${answer}`
            );
          } else {
            routeRes = await consultApi.submitClarifyAnswer({
              question_text: get().currentQuestion,
              answer,
            });
          }

          const consultType = mapRouteToConsultType(routeRes.route_type);

          trackEvent('clarify_answer_submit', {
            answer,
            new_route_type: routeRes.route_type,
          });

          set({
            routeResponse: routeRes,
            consultType,
            isClarifying: false,
            clarifyQuestion: null,
          });

          return routeRes;
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : '提交失败，请重试';
          set({ error: message, isClarifying: false });
          throw err;
        }
      },

      setDivinationInfo: (info) => {
        set({ divinationInfo: info });
      },

      setDestinyInfo: (info) => {
        set({ destinyInfo: info });
      },

      submitInfo: async () => {
        set({ isAnalyzing: true, error: null });

        try {
          const { routeResponse, divinationInfo, destinyInfo } = get();

          if (!routeResponse) {
            throw new Error('缺少路由信息');
          }

          // 从 routeResponse 获取 sessionId（即 recordId）
          const sessionId = (routeResponse as any).recordId || (routeResponse as any).sessionId || '';

          const infoData: InfoSubmit = {
            sessionId,
            question: get().currentQuestion,
            routeType: routeResponse.route_type as 'liuren' | 'ziping' | 'ziwei',
            ...(routeResponse.route_type === 'liuren'
              ? {
                  askTime: divinationInfo?.ask_time || '',
                  askLocation: divinationInfo?.ask_location || '',
                }
              : {
                  birthDate: destinyInfo?.birth_date || '',
                  birthTime: destinyInfo?.birth_time || '',
                  birthPlace: destinyInfo?.birth_location || '',
                }),
          };

          let resultRecordId = '';

          if (!USE_MOCK) {
            const result = await consultApi.submitInfo(infoData);
            resultRecordId = result.record_id || sessionId;
          } else {
            await new Promise((r) => setTimeout(r, 800));
            resultRecordId = sessionId || generateRecordId();
          }

          // 存储到 Zustand + sessionStorage（双轨持久化）供 ResultPage 使用
          saveConsultData({ record_id: resultRecordId });

          // 存储 recordId 供 generateResponse 使用
          set({ isAnalyzing: false, lastRecordId: resultRecordId });

          trackEvent('info_submit_complete', {
            route_type: routeResponse.route_type,
            record_id: resultRecordId,
          });
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : '提交失败，请重试';
          set({ error: message, isAnalyzing: false });
          throw err;
        }
      },

      generateResponse: async () => {
        set({ isAnalyzing: true, error: null });

        try {
          const { lastRecordId, consultType } = get();
          let result: ResultResponse;

          if (USE_MOCK) {
            await new Promise((r) => setTimeout(r, 2000));
            const type = consultType || 'ziping';
            const mockRaw = generateMockResult(type);
            result = {
              record_id: lastRecordId || generateRecordId(),
              route_type:
                type === 'liuren' ? 'liuren' : 'ziping',
              summary_line: mockRaw.summary_line,
              summary_body: mockRaw.summary_body,
              risk_block: mockRaw.risks,
              action_block: mockRaw.actions,
              window_block: mockRaw.time_window,
              evidence_fold: mockRaw.evidence_fold,
              paywall_modules: mockRaw.paywall_modules,
            };
          } else {
            if (!lastRecordId) {
              throw new Error('缺少记录ID，请重新开始咨询');
            }
            result = await consultApi.getResult(lastRecordId);
          }

          const response = mapResultToConsultResponse(result);

          trackEvent('preliminary_result_exposed', {
            record_id: result.record_id,
            route_type: result.route_type,
            llm_fallback: (result as any).llm_fallback || (result as any).llmFallback || false,
          });

          set({ response, isAnalyzing: false });
          return response;
        } catch (err) {
          const message =
            err instanceof ApiError
              ? err.message
              : '生成结果失败，请重试';

          trackEvent('result_generation_error', {
            error_message: message,
          });

          set({ error: message, isAnalyzing: false });
          throw err;
        }
      },

      saveRecord: (customResponse?: ConsultResponse) => {
        const { currentQuestion, consultType, response } = get();
        const responseToSave = customResponse || response;
        if (responseToSave && consultType) {
          const recordId = responseToSave.record_id;
          const record: ConsultRecord = {
            id: recordId,
            userId: getUserId() || responseToSave?.userId || '',
            question: currentQuestion,
            type: consultType,
            response: responseToSave,
            createdAt: new Date(),
            saved: true,
          };

          set((state) => ({
            records: [record, ...state.records],
          }));

          trackEvent('result_save_click', {
            record_id: recordId,
          });

          if (recordId && !/^(NAME|Q|KLINE|HOME|LIUREN|ZIPING|QUMING|LOCAL)_/.test(recordId)) {
            consultApi.saveRecord(recordId).then(() => {
              // 后端持久化成功，无需额外操作
            }).catch((err) => {
              // 401 = token 过期且刷新失败，用户会被自动登出，静默处理
              if (err instanceof ApiError && err.statusCode === 401) return;
              console.error('[consultStore] 后端持久化失败:', err);
              set({ saveError: '记录保存失败，请稍后重试' });
            });
          }
        }
      },

      updateRecordModuleContent: (recordId: string, moduleId: string, moduleContent: any) => {
        if (!recordId || !moduleId || !moduleContent) return;
        set((state) => ({
          records: state.records.map((record) => {
            if (record.id !== recordId) return record;
            return {
              ...record,
              response: {
                ...record.response,
                module_content: {
                  ...(record.response.module_content || {}),
                  [moduleId]: moduleContent,
                },
              },
            };
          }),
        }));
      },

      clearCurrent: () => {
        set({
          currentQuestion: '',
          routeResponse: null,
          consultType: null,
          divinationInfo: null,
          destinyInfo: null,
          response: null,
          error: null,
          clarifyQuestion: null,
          isClarifying: false,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'consult-storage',
      partialize: (state) => ({
        // 不再持久化 records，完全从后端获取
        lastRecordId: state.lastRecordId,
      }),
    }
  )
);
