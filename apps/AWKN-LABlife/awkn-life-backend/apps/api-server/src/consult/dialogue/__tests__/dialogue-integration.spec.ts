/**
 * 集成测试 — Dialogue + Orchestrator 多轮对话协作验证
 *
 * 验证：DialogueService 与 ZhangbanshanSchedulerService 协作的完整链路
 * - 多轮对话状态机：IDLE → SCHEDULING → CLARIFYING → GENERATING → RESPONDING → COMPLETED
 * - WebSocket 推送：clarifying_question / dialogue_llm_token / state_change / dialogue_result
 * - Scheduler 协作：synthesizeByNode (Node 0 开场白 → Node 1 追问 → Node 2+ 后续追问)
 * - 异常处理：对话不存在 / 状态非法 / 功能未启用
 * - 降级策略：scheduler 不可用时回退到 shouldClarify + buildClarifyingQuestion
 *
 * 不调真实 LLM/数据库，全部 mock
 */

import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DialogueService } from "../dialogue.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { WebsocketGateway } from "../../../websocket/websocket.gateway";
import { LlmProvidersService } from "../../../llm-providers/llm-providers.service";
import { ZhangbanshanSchedulerService } from "../../orchestrator/zhangbanshan-scheduler.service";
import { ContextBuilderService, SummaryCompressorService } from "../../context";
import { ClarificationService } from "../../clarification/clarification.service";
import { PromptInjectionGuardService } from "../../../guardrails/prompt-injection-guard.service";

// ─── 状态化 Mock 工厂 ───

/**
 * 创建状态化 PrismaService mock
 * 内部用 Map 跟踪对话状态，支持多次 findUnique/update 链式调用
 * 模拟真实数据库行为：create 创建记录，findUnique 返回最新状态，update 更新状态
 */
function createMockPrismaService() {
  const dialogues = new Map<string, any>();
  let idCounter = 0;

  return {
    consultDialogue: {
      create: jest.fn(({ data }: { data: any }) => {
        const id = `dialogue-test-${++idCounter}`;
        const dialogue = {
          id,
          userId: data.userId,
          state: data.state || "IDLE",
          turns: data.turns || JSON.stringify([]),
          currentNode: 0,
          collectedBackground: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dialogues.set(id, dialogue);
        return Promise.resolve({ ...dialogue });
      }),
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        const dialogue = dialogues.get(where.id);
        return Promise.resolve(dialogue ? { ...dialogue } : null);
      }),
      update: jest.fn(({ where, data }: { where: { id: string }; data: any }) => {
        const dialogue = dialogues.get(where.id);
        if (!dialogue) return Promise.resolve(null);
        Object.assign(dialogue, data);
        return Promise.resolve({ ...dialogue });
      }),
      updateMany: jest.fn(({ where, data }: { where: { id: string; state?: string }; data: any }) => {
        const dialogue = dialogues.get(where.id);
        if (!dialogue) return Promise.resolve({ count: 0 });
        // 乐观锁：如果 state 条件不匹配，返回 count=0
        if (where.state && dialogue.state !== where.state) return Promise.resolve({ count: 0 });
        Object.assign(dialogue, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    // Phase 5 T5.4: membership mock — 默认 member 等级（2 轮追问），保持原 MAX_CLARIFICATION_ROUNDS=2 测试语义
    membership: {
      findFirst: jest.fn().mockResolvedValue({ type: 'member', status: 'active' }),
    },
    // 暴露内部存储用于测试断言
    _store: dialogues,
    _reset: () => dialogues.clear(),
  };
}

/**
 * 创建 WebsocketGateway mock
 * 支持 server.to(room).emit(event, data) 链式调用
 * 记录所有 emit 调用用于断言
 */
function createMockWebsocketGateway() {
  const emitMock = jest.fn();
  return {
    server: {
      to: jest.fn().mockReturnValue({ emit: emitMock }),
    },
    sendDialogueResult: jest.fn(),
    _emitMock: emitMock,
  };
}

/**
 * 创建 LlmProvidersService mock
 * chatStream 支持 onToken 回调，模拟流式输出
 * 默认输出 5 个 token 组成的回答（>= 10 字符，通过质量校验）
 */
function createMockLlmProviders(tokens: string[] = ["这是", "一段", "测试", "回答", "内容"]) {
  return {
    chatStream: jest.fn(async (messages: any, provider: any, options: any) => {
      if (options?.onToken) {
        for (const token of tokens) {
          options.onToken(token);
        }
      }
      return { content: tokens.join(""), finishReason: "stop" };
    }),
  };
}

/**
 * 创建 ZhangbanshanSchedulerService mock
 * synthesizeByNode 按节点返回不同结果：
 * - Node 0: 开场白 + nextNode=1（当 needsClarification=true）或 nextNode=undefined（当 false）
 * - Node 1: 第一次追问（当 needsClarification=true）或直接回答（当 false）
 * - Node 2+: 后续追问
 */
function createMockScheduler(options: { needsClarification?: boolean; clarifyingQuestion?: string } = {}) {
  const { needsClarification = true, clarifyingQuestion = "你具体想问哪方面？" } = options;
  return {
    synthesizeByNode: jest.fn(async (node: number, question: string, _userId: string, _nodeContext: any) => {
      if (node === 0) {
        return {
          output: `你问的是「${question}」，让我看看。`,
          nextNode: needsClarification ? 1 : undefined,
        };
      }
      if (node === 1) {
        if (needsClarification) {
          return { output: clarifyingQuestion, clarifyingQuestion };
        }
        return { output: "我直接给你分析一下。" };
      }
      // Node 2+：后续追问
      return {
        output: "你希望重点看哪个时间段？",
        clarifyingQuestion: "你希望重点看哪个时间段？",
      };
    }),
  };
}

/**
 * 创建 ClarificationService mock
 * assessAndClarify 默认返回 needsClarification=false
 * 测试用例可通过 mockResolvedValueOnce 覆盖返回值
 */
function createMockClarificationService() {
  return {
    assessAndClarify: jest.fn().mockResolvedValue({
      assessment: { needsClarification: false, clarityScore: 0.8, filledSlots: [], missingSlots: [], consultType: "general", clarifyingTarget: "" },
      clarifyingQuestion: null,
    }),
    generateClarifyingQuestion: jest.fn().mockResolvedValue("你能具体说说吗？"),
    shouldContinueClarifying: jest.fn().mockResolvedValue(false),
  };
}

/**
 * 创建 PromptInjectionGuardService mock
 * checkInput 默认返回 isSafe=true，sanitizedInput 保留原输入
 */
function createMockInjectionGuard() {
  return {
    checkInput: jest.fn().mockImplementation((input: string) => ({
      isSafe: true,
      detectedPatterns: [],
      sanitizedInput: input,
      riskLevel: "low",
    })),
    sanitizeInput: jest.fn().mockImplementation((input: string) => input),
    checkMultiTurnAccumulation: jest.fn().mockReturnValue({ isSafe: true, detectedPatterns: [], sanitizedInput: "", riskLevel: "low" }),
  };
}

/**
 * 创建测试模块的辅助函数
 * 根据参数决定是否注入 scheduler，以及 scheduler 的追问行为
 */
async function createTestModule(options: {
  withScheduler?: boolean;
  schedulerNeedsClarification?: boolean;
  schedulerClarifyingQuestion?: string;
  llmTokens?: string[];
} = {}) {
  const {
    withScheduler = true,
    schedulerNeedsClarification = true,
    schedulerClarifyingQuestion,
    llmTokens,
  } = options;

  const mockPrisma = createMockPrismaService();
  const mockWebsocket = createMockWebsocketGateway();
  const mockLlm = createMockLlmProviders(llmTokens);
  const mockScheduler = createMockScheduler({
    needsClarification: schedulerNeedsClarification,
    clarifyingQuestion: schedulerClarifyingQuestion,
  });
  const mockClarificationService = createMockClarificationService();
  const mockInjectionGuard = createMockInjectionGuard();

  const mockContextBuilder = {
    buildContext: jest.fn(({ systemPrompt, dialogueTurns, currentUserInput }: any) => {
      const messages = [
        { role: "system", content: systemPrompt },
        ...dialogueTurns.map((t: any) => ({
          role: t.role === "user" ? "user" : "assistant",
          content: t.content,
        })),
        { role: "user", content: currentUserInput },
      ];
      return { messages, tokenCount: 100, truncatedTurns: 0 };
    }),
  };

  const mockSummaryCompressor = {
    compressTurns: jest.fn().mockResolvedValue({ summary: "", compressedTurnCount: 0 }),
  };

  const providers: any[] = [
    DialogueService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: WebsocketGateway, useValue: mockWebsocket },
    { provide: LlmProvidersService, useValue: mockLlm },
    { provide: ContextBuilderService, useValue: mockContextBuilder },
    { provide: SummaryCompressorService, useValue: mockSummaryCompressor },
    { provide: ClarificationService, useValue: mockClarificationService },
    { provide: PromptInjectionGuardService, useValue: mockInjectionGuard },
  ];

  if (withScheduler) {
    providers.push({ provide: ZhangbanshanSchedulerService, useValue: mockScheduler });
  }

  const module = await Test.createTestingModule({ providers }).compile();
  const service = module.get(DialogueService);

  return { module, service, mockPrisma, mockWebsocket, mockLlm, mockScheduler, mockClarificationService, mockInjectionGuard };
}

/**
 * 等待 fire-and-forget 的 generateAnswer 异步完成
 * generateAnswer 内部有多次 await（transitionState、chatStream、update），
 * 需要足够的延迟确保状态推进到 COMPLETED
 */
const waitForGenerateAnswer = () => new Promise(resolve => setTimeout(resolve, 100));

/**
 * 解析 turns JSON 字符串
 */
const parseTurns = (turns: string | null | undefined): any[] => {
  if (!turns) return [];
  try {
    return JSON.parse(turns);
  } catch {
    return [];
  }
};

describe("Dialogue + Orchestrator 集成测试 — 多轮对话协作", () => {
  // ─── 场景 1: 完整多轮对话流程 ───
  describe("场景1: 完整多轮对话流程 (IDLE → SCHEDULING → CLARIFYING → GENERATING → COMPLETED)", () => {
    let service: DialogueService;
    let module: TestingModule;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockWebsocket: ReturnType<typeof createMockWebsocketGateway>;
    let mockLlm: ReturnType<typeof createMockLlmProviders>;
    let mockScheduler: ReturnType<typeof createMockScheduler>;

    beforeEach(async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      ({
        module,
        service,
        mockPrisma,
        mockWebsocket,
        mockLlm,
        mockScheduler,
      } = await createTestModule({ withScheduler: true, schedulerNeedsClarification: true }));
    });

    afterEach(async () => {
      delete process.env.MULTI_TURN_ENABLED;
      await module.close();
    });

    it("1.1 startDialogue 短问题触发追问，状态进入 CLARIFYING", async () => {
      const dialogue = await service.startDialogue("user-1", "怎么样");

      expect(dialogue).toBeDefined();
      expect(dialogue).not.toBeNull();
      expect(dialogue!.state).toBe("CLARIFYING");
      expect(dialogue!.currentNode).toBe(1);

      // 验证 scheduler 被调用：Node 0（开场白）和 Node 1（追问）
      expect(mockScheduler.synthesizeByNode).toHaveBeenCalledTimes(2);
      expect(mockScheduler.synthesizeByNode).toHaveBeenNthCalledWith(
        1, 0, "怎么样", "user-1",
        expect.objectContaining({ currentNode: 0 }),
      );
      expect(mockScheduler.synthesizeByNode).toHaveBeenNthCalledWith(
        2, 1, "怎么样", "user-1",
        expect.objectContaining({ currentNode: 1 }),
      );

      // 验证 turns 包含：user → zhangbanshan(开场白) → zhangbanshan(追问)
      const turns = parseTurns(dialogue!.turns as string);
      expect(turns.length).toBe(3);
      expect(turns[0].role).toBe("user");
      expect(turns[0].node).toBe(0);
      expect(turns[1].role).toBe("zhangbanshan");
      expect(turns[1].node).toBe(0);
      expect(turns[2].role).toBe("zhangbanshan");
      expect(turns[2].node).toBe(1);
    });

    it("1.2 advanceDialogue 长回复停止追问，进入生成并完成", async () => {
      const dialogue = await service.startDialogue("user-1", "怎么样");
      const dialogueId = dialogue!.id;

      // 用户补充足够长的回复（>= 5 字符），shouldContinueClarifying 返回 false
      const advanced = await service.advanceDialogue(dialogueId, "我想问事业方面的运势", 'test-user');

      // advanceDialogue 返回时状态应为 GENERATING（generateAnswer 是 fire-and-forget）
      expect(advanced).toBeDefined();
      expect(advanced!.state).toBe("GENERATING");

      // 等待 generateAnswer 异步完成
      await waitForGenerateAnswer();

      // 验证最终状态为 COMPLETED
      const final = await mockPrisma.consultDialogue.findUnique({ where: { id: dialogueId } });
      expect(final).not.toBeNull();
      expect(final!.state).toBe("COMPLETED");

      // 验证 LLM 被调用
      expect(mockLlm.chatStream).toHaveBeenCalledTimes(1);
    });

    it("1.3 验证完整 turns 数组（user → zhangbanshan → user → zhangbanshan）", async () => {
      const dialogue = await service.startDialogue("user-1", "怎么样");
      const dialogueId = dialogue!.id;

      await service.advanceDialogue(dialogueId, "我想问事业方面的运势", 'test-user');
      await waitForGenerateAnswer();

      const final = await mockPrisma.consultDialogue.findUnique({ where: { id: dialogueId } });
      const turns = parseTurns(final!.turns as string);

      // 完整 turns：user(0) → zhangbanshan(0,开场) → zhangbanshan(1,追问) → user(2,回复) → zhangbanshan(99,答案)
      expect(turns.length).toBe(5);
      expect(turns[0].role).toBe("user");
      expect(turns[1].role).toBe("zhangbanshan");
      expect(turns[2].role).toBe("zhangbanshan");
      expect(turns[3].role).toBe("user");
      expect(turns[4].role).toBe("zhangbanshan");
      expect(turns[0].node).toBe(0);
      expect(turns[1].node).toBe(0);
      expect(turns[2].node).toBe(1);
      expect(turns[3].node).toBe(2);
      expect(turns[4].node).toBe(99);
      expect(turns[4].content).toContain("测试");
    });
  });

  // ─── 场景 2: 无需追问的直接回答 ───
  describe("场景2: 无需追问的直接回答", () => {
    let service: DialogueService;
    let module: TestingModule;
    let mockLlm: ReturnType<typeof createMockLlmProviders>;
    let mockScheduler: ReturnType<typeof createMockScheduler>;

    beforeEach(async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      ({
        module,
        service,
        mockLlm,
        mockScheduler,
      } = await createTestModule({
        withScheduler: true,
        // scheduler 配置为不需要追问：Node 0 不返回 nextNode
        schedulerNeedsClarification: false,
      }));
    });

    afterEach(async () => {
      delete process.env.MULTI_TURN_ENABLED;
      await module.close();
    });

    it("2.1 问题明确时直接进入 GENERATING，不进入 CLARIFYING", async () => {
      const dialogue = await service.startDialogue("user-2", "我今年事业运势怎么样");

      expect(dialogue).toBeDefined();
      // scheduler 配置为不需要追问，直接进入 GENERATING
      expect(dialogue!.state).toBe("GENERATING");

      // 验证只调用了 Node 0（开场白），没有调用 Node 1（追问）
      expect(mockScheduler.synthesizeByNode).toHaveBeenCalledTimes(1);
      expect(mockScheduler.synthesizeByNode).toHaveBeenCalledWith(
        0, "我今年事业运势怎么样", "user-2",
        expect.objectContaining({ currentNode: 0 }),
      );

      // 等待 generateAnswer 完成
      await waitForGenerateAnswer();

      // 验证最终状态为 COMPLETED
      const final = await module.get(PrismaService).consultDialogue.findUnique({
        where: { id: dialogue!.id },
      });
      expect(final!.state).toBe("COMPLETED");
    });

    it("2.2 直接回答路径触发 LLM 生成", async () => {
      const dialogue = await service.startDialogue("user-2", "我今年事业运势怎么样");

      // 等待 generateAnswer 完成
      await waitForGenerateAnswer();

      // 验证 LLM chatStream 被调用
      expect(mockLlm.chatStream).toHaveBeenCalledTimes(1);

      // 验证 chatStream 接收的 messages 包含 system prompt
      const callArgs = mockLlm.chatStream.mock.calls[0];
      const messages = callArgs[0];
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toContain("张半山");
    });
  });

  // ─── 场景 3: 多轮追问后达到上限 ───
  describe("场景3: 多轮追问后达到 MAX_CLARIFICATION_ROUNDS 上限", () => {
    let service: DialogueService;
    let module: TestingModule;
    let mockPrisma: ReturnType<typeof createMockPrismaService>;
    let mockScheduler: ReturnType<typeof createMockScheduler>;
    let mockClarificationService: ReturnType<typeof createMockClarificationService>;

    beforeEach(async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      ({
        module, service, mockPrisma, mockScheduler, mockClarificationService,
      } = await createTestModule({ withScheduler: true, schedulerNeedsClarification: true }));
    });

    afterEach(async () => {
      delete process.env.MULTI_TURN_ENABLED;
      await module.close();
    });

    it("3.1 连续 2 次短回复后达到上限，系统停止追问并生成答案", async () => {
      // 发起对话（触发第一次追问）
      const dialogue = await service.startDialogue("user-3", "怎么样");
      const dialogueId = dialogue!.id;
      expect(dialogue!.state).toBe("CLARIFYING");

      // 第一次短回复（< 5 字符）→ shouldContinueClarifying=true，继续追问
      // 此时 clarificationRounds=1 < MAX(2)，继续追问
      // 让 mockClarificationService 返回 needsClarification=true，触发继续追问
      mockClarificationService.assessAndClarify.mockResolvedValueOnce({
        assessment: { needsClarification: true, clarityScore: 0.3, filledSlots: [], missingSlots: ["core_question"], consultType: "general", clarifyingTarget: "core_question" },
        clarifyingQuestion: "你希望重点看哪个时间段？",
      });

      const first = await service.advanceDialogue(dialogueId, "嗯", 'test-user');
      expect(first!.state).toBe("CLARIFYING");

      // 验证 scheduler 被调用了 3 次：Node 0, Node 1, Node 3（第二次追问）
      expect(mockScheduler.synthesizeByNode).toHaveBeenCalledTimes(3);

      // 第二次短回复（< 5 字符）→ clarificationRounds=2，不满足 < 2，停止追问
      // 此时进入 GENERATING
      const second = await service.advanceDialogue(dialogueId, "啊", 'test-user');
      expect(second!.state).toBe("GENERATING");

      // 等待 generateAnswer 完成
      await waitForGenerateAnswer();

      // 验证最终状态为 COMPLETED
      const final = await mockPrisma.consultDialogue.findUnique({ where: { id: dialogueId } });
      expect(final!.state).toBe("COMPLETED");

      // 验证 turns 包含 2 次追问（zhangbanshan with node >= 1 且 node !== 99）
      const turns = parseTurns(final!.turns as string);
      const clarificationTurns = turns.filter(
        (t: any) => t.role === "zhangbanshan" && t.node !== undefined && t.node >= 1 && t.node !== 99,
      );
      expect(clarificationTurns.length).toBe(2);
    });

    it("3.2 达到上限后不再调用 scheduler 进行追问", async () => {
      const dialogue = await service.startDialogue("user-3", "怎么样");
      const dialogueId = dialogue!.id;

      // 第一次短回复需要 shouldContinueClarifying=true
      mockClarificationService.assessAndClarify.mockResolvedValueOnce({
        assessment: { needsClarification: true, clarityScore: 0.3, filledSlots: [], missingSlots: ["core_question"], consultType: "general", clarifyingTarget: "core_question" },
        clarifyingQuestion: "你希望重点看哪个时间段？",
      });

      // 两次短回复达到上限
      await service.advanceDialogue(dialogueId, "嗯", 'test-user');
      await service.advanceDialogue(dialogueId, "啊", 'test-user');

      // 等待 generateAnswer 完成
      await waitForGenerateAnswer();

      // scheduler 调用次数：Node 0 + Node 1（startDialogue）+ Node 3（第一次追问）= 3 次
      // 第二次 advanceDialogue 不再调用 scheduler（直接进入生成）
      expect(mockScheduler.synthesizeByNode).toHaveBeenCalledTimes(3);
    });
  });

  // ─── 场景 4: 对话状态异常处理 ───
  describe("场景4: 对话状态异常处理", () => {
    let service: DialogueService;
    let module: TestingModule;

    beforeEach(async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      ({ module, service } = await createTestModule({ withScheduler: true }));
    });

    afterEach(async () => {
      delete process.env.MULTI_TURN_ENABLED;
      await module.close();
    });

    it("4.1 对话不存在时 advanceDialogue 抛 NotFoundException", async () => {
      await expect(service.advanceDialogue("nonexistent-id", "回复内容", 'test-user')).rejects.toThrow(NotFoundException);
    });

    it("4.2 对话状态非 CLARIFYING 时 advanceDialogue 抛 BadRequestException", async () => {
      // 先创建一个对话（会进入 CLARIFYING 或 GENERATING）
      const dialogue = await service.startDialogue("user-4", "怎么样");

      // 如果状态是 CLARIFYING，需要先推进到非 CLARIFYING 状态
      // 这里用一个长回复推进到 GENERATING
      if (dialogue!.state === "CLARIFYING") {
        await service.advanceDialogue(dialogue!.id, "我想问事业方面的运势", 'test-user');
      }

      // 现在状态应该是 GENERATING 或 COMPLETED，再次 advanceDialogue 应抛 BadRequestException
      await expect(service.advanceDialogue(dialogue!.id, "再次回复", 'test-user')).rejects.toThrow(BadRequestException);
    });

    it("4.3 多轮功能未启用时 startDialogue 抛 BadRequestException", async () => {
      // 关闭多轮功能
      delete process.env.MULTI_TURN_ENABLED;

      await expect(service.startDialogue("user-4", "怎么样")).rejects.toThrow(BadRequestException);
    });
  });

  // ─── 场景 5: WebSocket 推送验证 ───
  describe("场景5: WebSocket 推送验证", () => {
    let service: DialogueService;
    let module: TestingModule;
    let mockWebsocket: ReturnType<typeof createMockWebsocketGateway>;
    let mockLlm: ReturnType<typeof createMockLlmProviders>;

    beforeEach(async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      ({
        module, service, mockWebsocket, mockLlm,
      } = await createTestModule({
        withScheduler: true,
        schedulerNeedsClarification: true,
        llmTokens: ["流", "式", "token"],
      }));
    });

    afterEach(async () => {
      delete process.env.MULTI_TURN_ENABLED;
      await module.close();
    });

    it("5.1 追问时通过 WebSocket 推送 clarifying_question 事件", async () => {
      const dialogue = await service.startDialogue("user-5", "怎么样");

      // 验证 server.to().emit() 被调用
      expect(mockWebsocket.server.to).toHaveBeenCalledWith(`dialogue:${dialogue!.id}`);

      // 验证推送了 clarifying_question 事件
      const emitCalls = mockWebsocket._emitMock.mock.calls;
      const clarifyingCall = emitCalls.find((call: any[]) => call[0] === "clarifying_question");
      expect(clarifyingCall).toBeDefined();
      expect(clarifyingCall![1]).toEqual(
        expect.objectContaining({
          dialogueId: dialogue!.id,
          question: expect.any(String),
          node: 1,
        }),
      );
    });

    it("5.2 生成答案时通过 WebSocket 推送流式 token", async () => {
      const dialogue = await service.startDialogue("user-5", "怎么样");

      // 触发生成
      await service.advanceDialogue(dialogue!.id, "我想问事业方面的运势", 'test-user');

      // 等待 generateAnswer 完成
      await waitForGenerateAnswer();

      // 验证推送了 dialogue_llm_token 事件（每个 token 一次）
      const emitCalls = mockWebsocket._emitMock.mock.calls;
      const tokenCalls = emitCalls.filter((call: any[]) => call[0] === "dialogue_llm_token");
      expect(tokenCalls.length).toBe(3); // ["流", "式", "token"]

      // 验证 token 内容
      expect(tokenCalls[0][1]).toEqual(
        expect.objectContaining({
          dialogueId: dialogue!.id,
          token: "流",
        }),
      );
    });

    it("5.3 状态转换时推送 state_change 事件", async () => {
      const dialogue = await service.startDialogue("user-5", "怎么样");

      // 验证推送了 state_change 事件
      const emitCalls = mockWebsocket._emitMock.mock.calls;
      const stateChangeCalls = emitCalls.filter((call: any[]) => call[0] === "state_change");

      // startDialogue 至少推送：IDLE→SCHEDULING, SCHEDULING→CLARIFYING
      expect(stateChangeCalls.length).toBeGreaterThanOrEqual(2);

      // 验证第一个状态转换包含 previousState 和 newState
      expect(stateChangeCalls[0][1]).toEqual(
        expect.objectContaining({
          dialogueId: dialogue!.id,
          previousState: expect.any(String),
          newState: expect.any(String),
        }),
      );
    });

    it("5.4 完成时调用 sendDialogueResult 推送最终结果", async () => {
      const dialogue = await service.startDialogue("user-5", "怎么样");
      await service.advanceDialogue(dialogue!.id, "我想问事业方面的运势", 'test-user');

      // 等待 generateAnswer 完成
      await waitForGenerateAnswer();

      // 验证 sendDialogueResult 被调用
      expect(mockWebsocket.sendDialogueResult).toHaveBeenCalledTimes(1);
      expect(mockWebsocket.sendDialogueResult).toHaveBeenCalledWith(
        dialogue!.id,
        expect.objectContaining({
          dialogueId: dialogue!.id,
          result: expect.any(String),
        }),
      );
    });
  });

  // ─── 场景 6: 与 Scheduler 协作 ───
  describe("场景6: 与 ZhangbanshanScheduler 协作", () => {
    it("6.1 scheduler 可用时使用 synthesizeByNode 进行开场白和追问", async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      const { module, service, mockScheduler } = await createTestModule({
        withScheduler: true,
        schedulerNeedsClarification: true,
      });

      try {
        await service.startDialogue("user-6", "怎么样");

        // 验证调用了 Node 0（开场白）
        expect(mockScheduler.synthesizeByNode).toHaveBeenCalledWith(
          0, "怎么样", "user-6",
          expect.objectContaining({ currentNode: 0 }),
        );

        // 验证调用了 Node 1（追问）
        expect(mockScheduler.synthesizeByNode).toHaveBeenCalledWith(
          1, "怎么样", "user-6",
          expect.objectContaining({ currentNode: 1 }),
        );

        // 验证调用顺序：先 Node 0，后 Node 1
        expect(mockScheduler.synthesizeByNode.mock.invocationCallOrder[0])
          .toBeLessThan(mockScheduler.synthesizeByNode.mock.invocationCallOrder[1]);
      } finally {
        delete process.env.MULTI_TURN_ENABLED;
        await module.close();
      }
    });

    it("6.2 scheduler 不可用时降级到 shouldClarify + buildClarifyingQuestion", async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      // 不注入 scheduler
      const { module, service, mockScheduler, mockClarificationService } = await createTestModule({
        withScheduler: false,
      });

      try {
        // 让 mockClarificationService 返回 needsClarification=true，触发追问路径
        // 使用 mockResolvedValue（影响所有调用）而非 mockResolvedValueOnce，
        // 因为 startDialogue 无 scheduler 时会调用 assessAndClarify 两次：
        // 1. shouldClarify 调用 → 返回 needsClarification=true
        // 2. buildClarifyingQuestion 调用 → 返回 clarifyingQuestion
        mockClarificationService.assessAndClarify.mockResolvedValue({
          assessment: { needsClarification: true, clarityScore: 0.3, filledSlots: [], missingSlots: ["core_question"], consultType: "general", clarifyingTarget: "core_question" },
          clarifyingQuestion: "你具体想问的是哪方面？",
        });

        // 短问题（< 10 字符）→ shouldClarify 返回 true
        const dialogue = await service.startDialogue("user-6", "怎么样");

        // 验证进入了 CLARIFYING（降级逻辑判断需要追问）
        expect(dialogue!.state).toBe("CLARIFYING");

        // 验证 scheduler 未被调用（因为未注入）
        expect(mockScheduler.synthesizeByNode).not.toHaveBeenCalled();

        // 验证 turns 包含追问（来自 buildClarifyingQuestion）
        const turns = parseTurns(dialogue!.turns as string);
        expect(turns.length).toBe(2); // user + zhangbanshan(追问)
        expect(turns[1].role).toBe("zhangbanshan");
        expect(turns[1].content).toContain("具体"); // buildClarifyingQuestion 的输出包含"具体"

        // 验证降级路径没有开场白（openingOutput 为 undefined）
        // 降级时只有 user + zhangbanshan(追问)，没有 zhangbanshan(开场白)
        const openingTurns = turns.filter((t: any) => t.node === 0 && t.role === "zhangbanshan");
        expect(openingTurns.length).toBe(0);
      } finally {
        delete process.env.MULTI_TURN_ENABLED;
        await module.close();
      }
    });

    it("6.3 验证 Node 0 和 Node 1 的调用顺序与参数", async () => {
      process.env.MULTI_TURN_ENABLED = "true";
      const { module, service, mockScheduler } = await createTestModule({
        withScheduler: true,
        schedulerNeedsClarification: true,
      });

      try {
        const question = "我今年运势怎么样";
        await service.startDialogue("user-6", question);

        // 验证调用顺序：第一次是 Node 0，第二次是 Node 1
        const calls = mockScheduler.synthesizeByNode.mock.calls;
        expect(calls.length).toBe(2);

        // 第一次调用：Node 0（开场白）
        expect(calls[0][0]).toBe(0); // node 参数
        expect(calls[0][1]).toBe(question); // question 参数
        expect(calls[0][2]).toBe("user-6"); // userId 参数
        expect(calls[0][3]).toEqual(expect.objectContaining({ currentNode: 0 }));

        // 第二次调用：Node 1（追问）
        expect(calls[1][0]).toBe(1); // node 参数
        expect(calls[1][1]).toBe(question); // question 参数
        expect(calls[1][2]).toBe("user-6"); // userId 参数
        expect(calls[1][3]).toEqual(expect.objectContaining({ currentNode: 1 }));
      } finally {
        delete process.env.MULTI_TURN_ENABLED;
        await module.close();
      }
    });
  });
});
