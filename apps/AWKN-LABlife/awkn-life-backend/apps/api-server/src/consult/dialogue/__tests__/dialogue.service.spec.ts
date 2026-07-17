/**
 * DialogueService 单元测试
 *
 * 覆盖多轮对话核心服务，包括：
 * - startDialogue：启动对话（含 scheduler / 无 scheduler 两条路径）
 * - advanceDialogue：推进对话（任务描述中的 continueDialogue）
 * - generateAnswer：生成最终答案（私有方法，直接调用测试）
 * - shouldClarify / shouldContinueClarifying / buildClarifyingQuestion：澄清判定逻辑
 * - transitionState：状态转换（私有方法）
 * - getDialogueResult：获取对话详情（任务描述中的 getDialogue）
 *
 * Mock 策略参考 test-helpers.ts，所有外部依赖均被 mock，不依赖真实数据库/LLM。
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DialogueService } from '../dialogue.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { LlmProvidersService } from '../../../llm-providers/llm-providers.service';
import { ZhangbanshanSchedulerService } from '../../orchestrator/zhangbanshan-scheduler.service';
import { UserStateClassifierService } from '../../classifier/user-state-classifier.service';
import { ContextBuilderService, SummaryCompressorService } from '../../context';
import { ClarificationService } from '../../clarification/clarification.service';
import { PromptInjectionGuardService } from '../../../guardrails/prompt-injection-guard.service';

// 辅助函数：刷新微任务队列（用于测试 fire-and-forget 场景）
const flushPromises = () => new Promise<void>(resolve => setImmediate(resolve));

// 默认对话记录 fixture
const mockDialogue = {
  id: 'dialogue-1',
  userId: 'user-1',
  state: 'IDLE',
  turns: JSON.stringify([]),
  currentNode: 0,
  collectedBackground: null,
};

describe('DialogueService', () => {
  let service: DialogueService;
  let prisma: any;
  let websocketGateway: any;
  let llmProviders: any;
  let schedulerService: any;
  let classifierService: any;
  let mockClarificationService: any;
  let mockInjectionGuard: any;
  let emitMock: jest.Mock;

  beforeEach(async () => {
    // 启用多轮对话功能
    process.env.MULTI_TURN_ENABLED = 'true';

    // 构造 mock 依赖
    emitMock = jest.fn();
    prisma = {
      consultDialogue: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      // Phase 5 T5.4: membership mock — 默认 member 等级（2 轮追问），保持原 MAX_CLARIFICATION_ROUNDS=2 测试语义
      membership: {
        findFirst: jest.fn().mockResolvedValue({ type: 'member', status: 'active' }),
      },
    };

    websocketGateway = {
      server: {
        to: jest.fn().mockReturnValue({ emit: emitMock }),
      },
      sendDialogueResult: jest.fn(),
    };

    llmProviders = {
      chatStream: jest.fn(),
      chatWithFallback: jest.fn(),
      chatCheap: jest.fn(),
    };

    schedulerService = {
      synthesizeByNode: jest.fn(),
    };

    classifierService = {
      classify: jest.fn(),
    };

    mockClarificationService = {
      assessAndClarify: jest.fn().mockResolvedValue({
        assessment: { needsClarification: false, clarityScore: 0.8, filledSlots: [], missingSlots: [], consultType: 'general', clarifyingTarget: '' },
        clarifyingQuestion: null,
      }),
      generateClarifyingQuestion: jest.fn().mockResolvedValue('你能具体说说吗？'),
      shouldContinueClarifying: jest.fn().mockResolvedValue(false),
    };

    mockInjectionGuard = {
      checkInput: jest.fn().mockImplementation((input: string) => ({
        isSafe: true,
        detectedPatterns: [],
        sanitizedInput: input,
        riskLevel: 'low',
      })),
      sanitizeInput: jest.fn().mockImplementation((input: string) => input),
      checkMultiTurnAccumulation: jest.fn().mockReturnValue({ isSafe: true, detectedPatterns: [], sanitizedInput: '', riskLevel: 'low' }),
    };

    const mockContextBuilder = {
      buildContext: jest.fn().mockImplementation(({ systemPrompt, dialogueTurns, currentUserInput }: any) => {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...dialogueTurns.map((t: any) => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.content })),
          { role: 'user', content: currentUserInput },
        ];
        return { messages, tokenCount: 100, truncatedTurns: 0 };
      }),
    };

    const mockSummaryCompressor = {
      compressTurns: jest.fn().mockResolvedValue({ summary: '', compressedTurnCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DialogueService,
        { provide: PrismaService, useValue: prisma },
        { provide: WebsocketGateway, useValue: websocketGateway },
        { provide: LlmProvidersService, useValue: llmProviders },
        { provide: ZhangbanshanSchedulerService, useValue: schedulerService },
        { provide: UserStateClassifierService, useValue: classifierService },
        { provide: ContextBuilderService, useValue: mockContextBuilder },
        { provide: SummaryCompressorService, useValue: mockSummaryCompressor },
        { provide: ClarificationService, useValue: mockClarificationService },
        { provide: PromptInjectionGuardService, useValue: mockInjectionGuard },
      ],
    }).compile();

    service = module.get<DialogueService>(DialogueService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.MULTI_TURN_ENABLED;
  });

  // ─── startDialogue ───

  describe('startDialogue', () => {
    it('MULTI_TURN_ENABLED !== "true" 时抛 BadRequestException', async () => {
      process.env.MULTI_TURN_ENABLED = 'false';
      await expect(service.startDialogue('user-1', '测试问题')).rejects.toThrow(BadRequestException);
      expect(prisma.consultDialogue.create).not.toHaveBeenCalled();
    });

    it('MULTI_TURN_ENABLED === "true" 时正常创建对话', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue, state: 'CLARIFYING' });

      // scheduler: Node 0 返回开场白，Node 1 返回反问
      schedulerService.synthesizeByNode
        .mockResolvedValueOnce({ output: '开场白', nextNode: 1 })
        .mockResolvedValueOnce({ output: '反问', clarifyingQuestion: '你想问哪方面？' });

      const result = await service.startDialogue('user-1', '我想问问事业');

      expect(result).toBeDefined();
      expect(result.id).toBe('dialogue-1');
    });

    it('创建 ConsultDialogue 记录（state=IDLE）', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue });

      schedulerService.synthesizeByNode
        .mockResolvedValueOnce({ output: '开场白', nextNode: 1 })
        .mockResolvedValueOnce({ output: '反问', clarifyingQuestion: '你想问哪方面？' });

      await service.startDialogue('user-1', '我想问问事业');

      // 验证创建记录时 state=IDLE
      expect(prisma.consultDialogue.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          state: 'IDLE',
          turns: JSON.stringify([]),
        },
      });
    });

    it('添加用户问题为第一轮', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue });

      schedulerService.synthesizeByNode
        .mockResolvedValueOnce({ output: '开场白', nextNode: 1 })
        .mockResolvedValueOnce({ output: '反问', clarifyingQuestion: '你想问哪方面？' });

      await service.startDialogue('user-1', '我想问问事业');

      // 第一次 update 应包含用户问题作为第一轮
      const firstUpdateCall = prisma.consultDialogue.update.mock.calls[0][0];
      const turns = JSON.parse(firstUpdateCall.data.turns);
      expect(turns).toHaveLength(1);
      expect(turns[0].role).toBe('user');
      expect(turns[0].content).toBe('我想问问事业');
      expect(turns[0].node).toBe(0);
    });

    it('状态转为 SCHEDULING', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue });

      schedulerService.synthesizeByNode
        .mockResolvedValueOnce({ output: '开场白', nextNode: 1 })
        .mockResolvedValueOnce({ output: '反问', clarifyingQuestion: '你想问哪方面？' });

      await service.startDialogue('user-1', '我想问问事业');

      // 验证存在 state=SCHEDULING 的 updateMany 调用（乐观锁改用 updateMany）
      const schedulingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'SCHEDULING',
      );
      expect(schedulingUpdate).toBeDefined();
    });

    it('有 scheduler 时使用 synthesizeByNode(0) + synthesizeByNode(1)', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue });

      schedulerService.synthesizeByNode
        .mockResolvedValueOnce({ output: '开场白', nextNode: 1 })
        .mockResolvedValueOnce({ output: '反问', clarifyingQuestion: '你想问哪方面？' });

      await service.startDialogue('user-1', '我想问问事业');

      // 验证 Node 0 和 Node 1 都被调用
      expect(schedulerService.synthesizeByNode).toHaveBeenCalledTimes(2);
      expect(schedulerService.synthesizeByNode).toHaveBeenNthCalledWith(
        1,
        0,
        '我想问问事业',
        'user-1',
        { currentNode: 0 },
      );
      expect(schedulerService.synthesizeByNode).toHaveBeenNthCalledWith(
        2,
        1,
        '我想问问事业',
        'user-1',
        { currentNode: 1 },
      );
    });

    it('无 scheduler 时使用 shouldClarify + buildClarifyingQuestion', async () => {
      // 重新构造一个无 scheduler 的服务实例
      const moduleWithoutScheduler: TestingModule = await Test.createTestingModule({
        providers: [
          DialogueService,
          { provide: PrismaService, useValue: prisma },
          { provide: WebsocketGateway, useValue: websocketGateway },
          { provide: LlmProvidersService, useValue: llmProviders },
          { provide: UserStateClassifierService, useValue: classifierService },
          { provide: ContextBuilderService, useValue: {
              buildContext: jest.fn().mockImplementation(({ systemPrompt, dialogueTurns, currentUserInput }: any) => {
                const messages = [
                  { role: 'system', content: systemPrompt },
                  ...dialogueTurns.map((t: any) => ({ role: t.role === 'user' ? 'user' : 'assistant', content: t.content })),
                  { role: 'user', content: currentUserInput },
                ];
                return { messages, tokenCount: 100, truncatedTurns: 0 };
              }),
            } },
          { provide: SummaryCompressorService, useValue: {
              compressTurns: jest.fn().mockResolvedValue({ summary: '', compressedTurnCount: 0 }),
            } },
          { provide: ClarificationService, useValue: mockClarificationService },
          { provide: PromptInjectionGuardService, useValue: mockInjectionGuard },
        ],
      }).compile();
      const serviceNoScheduler = moduleWithoutScheduler.get<DialogueService>(DialogueService);

      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue });

      // 让 mockClarificationService 返回 needsClarification=true，触发追问路径
      mockClarificationService.assessAndClarify.mockResolvedValueOnce({
        assessment: { needsClarification: true, clarityScore: 0.3, filledSlots: [], missingSlots: ['core_question'], consultType: 'general', clarifyingTarget: 'core_question' },
        clarifyingQuestion: '你具体想问的是哪方面？',
      });

      // 短问题触发 shouldClarify=true
      await serviceNoScheduler.startDialogue('user-1', '看看');

      // 无 scheduler 时不调用 synthesizeByNode
      expect(schedulerService.synthesizeByNode).not.toHaveBeenCalled();
      // 应进入 CLARIFYING 状态（短问题 needsClarification=true）
      const clarifyingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'CLARIFYING',
      );
      expect(clarifyingUpdate).toBeDefined();
    });

    it('needsClarification=true 时状态转为 CLARIFYING', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue, state: 'CLARIFYING' });

      // Node 1 返回带 clarifyingQuestion 的结果
      schedulerService.synthesizeByNode
        .mockResolvedValueOnce({ output: '开场白', nextNode: 1 })
        .mockResolvedValueOnce({ output: '反问', clarifyingQuestion: '你想问哪方面？' });

      await service.startDialogue('user-1', '我想问问事业');

      // 验证存在 state=CLARIFYING 的 update 调用
      const clarifyingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'CLARIFYING',
      );
      expect(clarifyingUpdate).toBeDefined();

      // 验证推送了 clarifying_question WS 事件
      expect(websocketGateway.server.to).toHaveBeenCalledWith('dialogue:dialogue-1');
      expect(emitMock).toHaveBeenCalledWith(
        'clarifying_question',
        expect.objectContaining({
          dialogueId: 'dialogue-1',
          question: '你想问哪方面？',
        }),
      );
    });

    it('needsClarification=false 时直接生成答案', async () => {
      prisma.consultDialogue.create.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });
      prisma.consultDialogue.findUnique.mockResolvedValue({ ...mockDialogue });

      // Node 0 返回 nextNode=undefined → needsClarification=false
      schedulerService.synthesizeByNode.mockResolvedValueOnce({
        output: '开场白',
        // nextNode 不提供
      });

      // spy generateAnswer 防止 fire-and-forget 真实执行
      const generateAnswerSpy = jest
        .spyOn(service as any, 'generateAnswer')
        .mockResolvedValue(undefined);

      await service.startDialogue('user-1', '我想问问事业');
      await flushPromises();

      // 验证进入 GENERATING 状态
      const generatingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'GENERATING',
      );
      expect(generatingUpdate).toBeDefined();

      // 验证触发了 generateAnswer（fire-and-forget）
      expect(generateAnswerSpy).toHaveBeenCalledWith('dialogue-1');
    });
  });

  // ─── advanceDialogue（任务描述中的 continueDialogue） ───

  describe('advanceDialogue', () => {
    it('对话不存在时抛 NotFoundException', async () => {
      prisma.consultDialogue.findUnique.mockResolvedValue(null);

      await expect(service.advanceDialogue('not-exist', '回复', 'test-user')).rejects.toThrow(NotFoundException);
    });

    it('对话状态非 CLARIFYING 时抛 BadRequestException', async () => {
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        state: 'SCHEDULING',
      });

      await expect(service.advanceDialogue('dialogue-1', '回复', 'test-user')).rejects.toThrow(BadRequestException);
    });

    it('添加用户回复为新一轮', async () => {
      // 构造一个 CLARIFYING 状态、已有 1 轮反问的对话
      const existingTurns = [
        { role: 'user', content: '问题', timestamp: 1, node: 0 },
        { role: 'zhangbanshan', content: '反问1', timestamp: 2, node: 1 },
      ];
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        state: 'CLARIFYING',
        turns: JSON.stringify(existingTurns),
        currentNode: 1,
      });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });

      // shouldContinueClarifying=false（回复长度 >= 5）→ 进入生成路径
      // spy generateAnswer 防止 fire-and-forget 执行
      jest.spyOn(service as any, 'generateAnswer').mockResolvedValue(undefined);

      await service.advanceDialogue('dialogue-1', '这是一条足够长的回复', 'test-user');
      await flushPromises();

      // 验证第一次 update 包含用户回复
      const firstUpdateCall = prisma.consultDialogue.update.mock.calls[0][0];
      const turns = JSON.parse(firstUpdateCall.data.turns);
      const userReplyTurn = turns.find((t: any) => t.role === 'user' && t.node === 2);
      expect(userReplyTurn).toBeDefined();
      expect(userReplyTurn.content).toBe('这是一条足够长的回复');
    });

    it('shouldContinueClarifying=true 时继续追问', async () => {
      // 构造一个 CLARIFYING 状态、已有 1 轮反问的对话
      const existingTurns = [
        { role: 'user', content: '问题', timestamp: 1, node: 0 },
        { role: 'zhangbanshan', content: '反问1', timestamp: 2, node: 1 },
      ];
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        state: 'CLARIFYING',
        turns: JSON.stringify(existingTurns),
        currentNode: 1,
      });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });

      // 让 mockClarificationService 返回 needsClarification=true，触发继续追问
      mockClarificationService.assessAndClarify.mockResolvedValueOnce({
        assessment: { needsClarification: true, clarityScore: 0.3, filledSlots: [], missingSlots: ['core_question'], consultType: 'general', clarifyingTarget: 'core_question' },
        clarifyingQuestion: '追问2',
      });

      // 用户回复很短（< 5 字符）→ shouldContinueClarifying=true
      schedulerService.synthesizeByNode.mockResolvedValue({
        output: '追问2',
        clarifyingQuestion: '追问2',
      });

      const result = await service.advanceDialogue('dialogue-1', '嗯', 'test-user');

      // 验证调用了 synthesizeByNode 生成下一个反问
      expect(schedulerService.synthesizeByNode).toHaveBeenCalled();

      // 验证推送了新的 clarifying_question WS 事件
      expect(emitMock).toHaveBeenCalledWith(
        'clarifying_question',
        expect.objectContaining({
          dialogueId: 'dialogue-1',
          question: '追问2',
        }),
      );

      // 验证返回了对话记录
      expect(result).toBeDefined();
    });

    it('shouldContinueClarifying=false 时生成答案', async () => {
      const existingTurns = [
        { role: 'user', content: '问题', timestamp: 1, node: 0 },
        { role: 'zhangbanshan', content: '反问1', timestamp: 2, node: 1 },
      ];
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        state: 'CLARIFYING',
        turns: JSON.stringify(existingTurns),
        currentNode: 1,
      });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });

      // 用户回复足够长 → shouldContinueClarifying=false
      const generateAnswerSpy = jest
        .spyOn(service as any, 'generateAnswer')
        .mockResolvedValue(undefined);

      await service.advanceDialogue('dialogue-1', '这是一条足够长的回复', 'test-user');
      await flushPromises();

      // 验证状态先转 SCHEDULING 再转 GENERATING
      const schedulingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'SCHEDULING',
      );
      const generatingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'GENERATING',
      );
      expect(schedulingUpdate).toBeDefined();
      expect(generatingUpdate).toBeDefined();

      // 验证触发了 generateAnswer
      expect(generateAnswerSpy).toHaveBeenCalledWith('dialogue-1');
    });

    it('超过 MAX_CLARIFICATION_ROUNDS 时停止追问', async () => {
      // 构造一个已有 2 轮反问的对话（达到 MAX_CLARIFICATION_ROUNDS=2）
      const existingTurns = [
        { role: 'user', content: '问题', timestamp: 1, node: 0 },
        { role: 'zhangbanshan', content: '反问1', timestamp: 2, node: 1 },
        { role: 'user', content: '回复1', timestamp: 3, node: 2 },
        { role: 'zhangbanshan', content: '反问2', timestamp: 4, node: 3 },
      ];
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        state: 'CLARIFYING',
        turns: JSON.stringify(existingTurns),
        currentNode: 3,
      });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });

      const generateAnswerSpy = jest
        .spyOn(service as any, 'generateAnswer')
        .mockResolvedValue(undefined);

      // 即使用户回复很短，也应停止追问
      await service.advanceDialogue('dialogue-1', '嗯', 'test-user');
      await flushPromises();

      // 验证没有调用 synthesizeByNode（不再追问）
      expect(schedulerService.synthesizeByNode).not.toHaveBeenCalled();

      // 验证进入 GENERATING 状态
      const generatingUpdate = prisma.consultDialogue.updateMany.mock.calls.find(
        (call: any[]) => call[0].data.state === 'GENERATING',
      );
      expect(generatingUpdate).toBeDefined();

      // 验证触发了 generateAnswer
      expect(generateAnswerSpy).toHaveBeenCalledWith('dialogue-1');
    });
  });

  // ─── generateAnswer（私有方法，直接调用测试） ───

  describe('generateAnswer', () => {
    it('调用 LLM 生成答案', async () => {
      const existingTurns = [
        { role: 'user', content: '问题', timestamp: 1, node: 0 },
        { role: 'zhangbanshan', content: '反问', timestamp: 2, node: 1 },
        { role: 'user', content: '回复', timestamp: 3, node: 2 },
      ];
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        turns: JSON.stringify(existingTurns),
      });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });

      // mock chatStream，模拟流式输出
      llmProviders.chatStream.mockImplementation(
        async (_messages: any, _provider: any, options: any) => {
          if (options.onToken) {
            options.onToken('测试');
            options.onToken('答案');
          }
          return { content: '测试答案' };
        },
      );

      await (service as any).generateAnswer('dialogue-1');

      // 验证调用了 chatStream
      expect(llmProviders.chatStream).toHaveBeenCalledTimes(1);
      const callArgs = llmProviders.chatStream.mock.calls[0];
      expect(callArgs[0]).toBeInstanceOf(Array);
      // 验证 messages 包含 system prompt
      expect(callArgs[0][0].role).toBe('system');
    });

    it('添加张半山回复为新一轮', async () => {
      const existingTurns = [
        { role: 'user', content: '问题', timestamp: 1, node: 0 },
      ];
      prisma.consultDialogue.findUnique.mockResolvedValue({
        ...mockDialogue,
        turns: JSON.stringify(existingTurns),
      });
      prisma.consultDialogue.update.mockResolvedValue({ ...mockDialogue });

      llmProviders.chatStream.mockImplementation(
        async (_messages: any, _provider: any, options: any) => {
          if (options.onToken) {
            options.onToken('这是');
            options.onToken('最终');
            options.onToken('的');
            options.onToken('完整');
            options.onToken('答案');
            options.onToken('内容');
          }
          return { content: '这是最终的完整答案内容' };
        },
      );

      await (service as any).generateAnswer('dialogue-1');

      // 验证最后一次包含 turns 的 update 调用包含张半山回复
      const turnsUpdateCalls = prisma.consultDialogue.update.mock.calls.filter(
        (call: any[]) => call[0].data.turns !== undefined,
      );
      const lastTurnsUpdateCall = turnsUpdateCalls[turnsUpdateCalls.length - 1][0];
      const turns = JSON.parse(lastTurnsUpdateCall.data.turns);
      const zhangbanshanTurn = turns.find((t: any) => t.role === 'zhangbanshan' && t.node === 99);
      expect(zhangbanshanTurn).toBeDefined();
      expect(zhangbanshanTurn.content).toBe('这是最终的完整答案内容');
    });
  });
});
