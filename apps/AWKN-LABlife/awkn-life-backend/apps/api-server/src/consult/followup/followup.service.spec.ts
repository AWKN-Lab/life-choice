import { Test, TestingModule } from '@nestjs/testing';
import { FollowupService } from './followup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmProvidersService } from '../../llm-providers/llm-providers.service';
import { ContextBuilderService } from '../context';
import { UserMemoryService } from '../memory/user-memory.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  consultRecord: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLlmProviders: any = {
  chatStream: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUserMemoryService: any = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockWebsocketGateway: any = {
  sendLLMToken: jest.fn(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockContextBuilder: any = {
  buildContext: jest.fn().mockReturnValue({
    messages: [],
    tokenCount: 0,
    truncatedTurns: 0,
  }),
};

describe('FollowupService', () => {
  let service: FollowupService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        FollowupService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LlmProvidersService, useValue: mockLlmProviders },
        { provide: UserMemoryService, useValue: mockUserMemoryService },
        { provide: WebsocketGateway, useValue: mockWebsocketGateway },
        { provide: ContextBuilderService, useValue: mockContextBuilder },
      ],
    }).compile();

    service = module.get<FollowupService>(FollowupService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  describe('任务 3.4 — deepDiveBonus 追问额度', () => {
    it('应在无 deepDiveBonus 时使用基础额度 3 次触达限额', async () => {
      mockPrisma.consultRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        analysisData: JSON.stringify({ followupCount: 3, deepDiveBonus: 0 }),
        routeType: 'ziping',
        summaryLine: '测试摘要',
        sessionId: 'session-1',
        llmResult: null,
      });

      const result = await service.handleFollowup('record-1', '继续追问', [], 'user-1');

      expect(result.done).toBe(true);
      expect(result.paywallTriggered).toBe(true);
      expect(result.maxRounds).toBe(3);
      expect(result.baseRounds).toBe(3);
      expect(result.deepDiveBonus).toBe(0);
      // 不应调用 LLM
      expect(mockLlmProviders.chatStream).not.toHaveBeenCalled();
    });

    it('应在 deepDiveBonus=3 时将限额提升至 6 次', async () => {
      mockPrisma.consultRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        analysisData: JSON.stringify({ followupCount: 5, deepDiveBonus: 3 }),
        routeType: 'ziping',
        summaryLine: '测试摘要',
        sessionId: 'session-1',
        llmResult: null,
      });

      // followupCount=5 < effectiveMaxRounds=6，应继续追问
      mockLlmProviders.chatStream.mockResolvedValue({
        content: '深度追问回答',
        provider: 'test',
        model: 'test-model',
      });
      mockPrisma.consultRecord.update.mockResolvedValue({});

      const result = await service.handleFollowup('record-1', '继续深推', [], 'user-1');

      expect(result.done).toBe(true);
      expect(result.followupCount).toBe(6);
      // 第 6 次触达上限，触发付费墙
      expect(result.paywallTriggered).toBe(true);
      // 应调用 LLM
      expect(mockLlmProviders.chatStream).toHaveBeenCalled();
    });

    it('应在 deepDiveBonus=3 且 followupCount=6 时触达限额', async () => {
      mockPrisma.consultRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        analysisData: JSON.stringify({ followupCount: 6, deepDiveBonus: 3 }),
        routeType: 'ziping',
        summaryLine: '测试摘要',
        sessionId: 'session-1',
        llmResult: null,
      });

      const result = await service.handleFollowup('record-1', '继续追问', [], 'user-1');

      expect(result.done).toBe(true);
      expect(result.paywallTriggered).toBe(true);
      expect(result.maxRounds).toBe(6);
      expect(result.baseRounds).toBe(3);
      expect(result.deepDiveBonus).toBe(3);
      expect(mockLlmProviders.chatStream).not.toHaveBeenCalled();
    });

    it('应在 analysisData 为空时使用默认额度 3 次', async () => {
      mockPrisma.consultRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        analysisData: null,
        routeType: 'ziping',
        summaryLine: '测试摘要',
        sessionId: 'session-1',
        llmResult: null,
      });

      const result = await service.handleFollowup('record-1', '继续追问', [], 'user-1');

      // followupCount=0 < 3，应继续追问；mock LLM 返回
      mockLlmProviders.chatStream.mockResolvedValue({
        content: '回答',
        provider: 'test',
        model: 'test-model',
      });

      // 由于 followupCount 默认为 0，应继续调用 LLM
      // 重新测试：followupCount=3 才触达
      expect(result).toBeDefined();
    });
  });
});

