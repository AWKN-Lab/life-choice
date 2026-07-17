/**
 * L2 Pipeline 测试基础设施 — mock 工厂 + 通用 fixture
 *
 * 适配项目 Jest + ts-jest 测试框架
 * 所有 mock 基于实际代码接口，确保类型安全
 */

import { jest } from '@jest/globals';

// 用 jest.fn<any>() 绕过 TypeScript 严格泛型推断导致的 'never' 类型错误
const fn = () => jest.fn<any>();

// ─── Mock PrismaService ───

export function createMockPrismaService() {
  return {
    consultRecord: {
      create: fn().mockResolvedValue({ id: 'test-record-id' }),
      findUnique: fn().mockResolvedValue({
        id: 'test-record-id',
        calcResult: null,
        sessionId: 'test-session-id',
        status: 'pending',
      }),
      update: fn().mockResolvedValue({ id: 'test-record-id', status: 'completed' }),
      findMany: fn().mockResolvedValue([]),
    },
    interactionEvent: {
      create: fn().mockResolvedValue({}),
    },
    userMemory: {
      findUnique: fn().mockResolvedValue(null),
      upsert: fn().mockResolvedValue({}),
    },
    consultFollowUp: {
      create: fn().mockResolvedValue({}),
      findMany: fn().mockResolvedValue([]),
    },
  };
}

// ─── Mock LlmGatewayService ───

export function createMockLlmGateway() {
  return {
    generateParallel: fn().mockResolvedValue({
      primary: {
        summary_line: '测试判断：事业运势稳中有进',
        summary_body: '基于八字命盘分析，当前大运有利于事业发展',
        evidence_fold: '日主丙火得令，印星生扶有力',
        actions: ['建议把握当前机遇', '注意人际关系维护'],
      },
      secondary: null,
      consistency: 'consistent' as const,
    }),
    chatWithFallback: fn().mockResolvedValue('测试 LLM 输出'),
    chatCheap: fn().mockResolvedValue('测试经济模型输出'),
  };
}

// ─── Mock BullMQ Queue ───

export function createMockQueue() {
  return {
    add: fn().mockResolvedValue({ id: 'job-1' }),
    close: fn().mockResolvedValue(undefined),
  };
}

// ─── Mock WebsocketGateway ───

export function createMockWebsocketGateway() {
  return {
    sendLLMToken: fn(),
    sendProgressUpdate: fn(),
    sendResultUpdate: fn(),
  };
}

// ─── Mock IntentRouterService ───

export function createMockIntentRouter(routeType: 'ziping' | 'liuren' | 'mixed' | 'clarify' = 'ziping') {
  return {
    route: fn().mockReturnValue(routeType),
  };
}

// ─── Mock HighRiskDetectorService ───

export function createMockHighRiskDetector() {
  return {
    detect: fn().mockReturnValue(null), // 默认无高风险
  };
}

// ─── Mock UserMemoryService ───

export function createMockUserMemoryService() {
  return {
    getMemorySummary: fn().mockResolvedValue(''),
    appendConsultHistory: fn().mockResolvedValue(undefined),
    appendTimelineEvent: fn().mockResolvedValue(undefined),
    appendInsight: fn().mockResolvedValue(undefined),
    searchMemories: fn().mockResolvedValue([]),
    getRepeatingQuestionCount: fn().mockResolvedValue(0),
  };
}

// ─── Mock UserStateClassifierService ───

export function createMockClassifierService() {
  return {
    classify: fn().mockResolvedValue({
      state: 'genuine',
      confidence: 0.8,
    }),
  };
}

// ─── Mock ZhangbanshanSchedulerService ───

export function createMockScheduler() {
  return {
    schedule: fn().mockReturnValue({
      primaryAgent: 'ziping',
      secondaryAgent: null,
      mode: 'quick_read',
      confidence: 0.7,
      toolNames: ['bazi'],
    }),
    getRouteType: fn().mockReturnValue('ziping'),
    synthesizeThreeStage: fn().mockResolvedValue({
      judgment: '测试判断',
      premise: '测试前提',
      cost: '这意味着——你需要结合自身实际情况',
      reasoning_trace: '基于八字排盘综合分析',
      emotion_snapshot: 'neutral',
      five_layers: {
        clause: '八字排盘：甲子年 乙丑月 丙寅日 丁卯时',
        halfMountain: '格局：正印格，用神为木',
        detail: '推演路径：1. 事业上升期(60%) 2. 稳定期(25%) 3. 调整期(15%)',
        cost: '建议：把握当前机遇，注意人际关系',
        nextAction: '金句：稳中求进，不急不躁',
      },
    }),
    arbitrate: fn().mockReturnValue({
      consistency: 'consistent',
      trustedAgent: 'ziping',
      trustedReason: '主调置信度更高',
      hasConflict: false,
      agentConfidences: { ziping: 0.8, liuren: 0.6 },
      arbitrationText: '',
    }),
  };
}

// ─── Mock EvidencePacketBuilderService ───

export function createMockEvidenceBuilder() {
  return {
    build: fn().mockResolvedValue('evidence-packet-id'),
  };
}

// ─── Mock KnowledgeRetrieverService ───

export function createMockKnowledgeRetriever() {
  return {
    retrieve: fn().mockResolvedValue([]),
  };
}

// ─── Mock GenerationComposerService ───

export function createMockGenerationComposer() {
  return {
    generate: fn().mockResolvedValue({
      content: '测试输出内容',
      qualityScore: 85,
      retryable: false,
      followUpQuestions: [],
    }),
  };
}

// ─── Mock QualityGateService ───

export function createMockQualityGate() {
  return {
    evaluate: fn().mockReturnValue({
      passed: true,
      score: 90,
      warnings: [],
      filteredText: '测试过滤后内容',
    }),
  };
}

// ─── Mock MemoryExtractorService ───

export function createMockMemoryExtractor() {
  return {
    extractAndPersist: fn().mockResolvedValue(undefined),
  };
}

// ─── Mock ReactEngineService ───

export function createMockReactEngine() {
  return {
    run: fn().mockResolvedValue({
      done: true,
      totalIters: 1,
      reason: 'sufficient_evidence',
      finalAnswer: '测试 ReAct 结论',
      steps: [],
    }),
  };
}

// ─── 通用 fixture ───

export const FIXTURES = {
  /** 标准用户输入（ziping 路由） */
  zipingInput: {
    recordId: 'test-record-id',
    question: '明年事业运势怎么样',
    birthInfo: { year: 1990, month: 1, day: 15, hour: 12, gender: 'male' },
    userId: 'test-user-id',
    sessionId: 'test-session-id',
  },

  /** 标准用户输入（liuren 路由） */
  liurenInput: {
    recordId: 'test-record-id',
    question: '这次投资能不能成',
    askTime: '2026-06-15T10:00:00+08:00',
    userId: 'test-user-id',
    sessionId: 'test-session-id',
  },

  /** 标准用户输入（mixed 路由） */
  mixedInput: {
    recordId: 'test-record-id',
    question: '现在要不要合作',
    birthInfo: { year: 1985, month: 6, day: 20, hour: 8, gender: 'female' },
    askTime: '2026-06-15T14:00:00+08:00',
    userId: 'test-user-id',
    sessionId: 'test-session-id',
  },

  /** 标准用户输入（clarify 路由） */
  clarifyInput: {
    recordId: 'test-record-id',
    question: '帮我看看',
    userId: 'test-user-id',
    sessionId: 'test-session-id',
  },

  /** 高风险测试输入 */
  highRiskInputs: {
    medical: '我要不要做手术',
    legal: '我该不该起诉他',
    financial: '这个稳赚的投资能不能做',
    crisis: '我不想活了',
  },
};
