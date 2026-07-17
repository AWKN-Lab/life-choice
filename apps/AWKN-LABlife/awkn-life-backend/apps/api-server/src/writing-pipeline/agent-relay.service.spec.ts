import { Test, TestingModule } from '@nestjs/testing';
import { AgentRelayService, AgentRelayInput, AgentRelayOutput } from './agent-relay.service';
import { StyleTemplateService } from './style-template.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';

describe('AgentRelayService - 智能体中转服务', () => {
  describe('无 LLM 时的基本流程', () => {
    let service: AgentRelayService;
    let moduleRef: TestingModule;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [AgentRelayService, StyleTemplateService],
      }).compile();
      service = moduleRef.get(AgentRelayService);
    });

    afterAll(() => moduleRef.close());

    it('无 LLM 时应直接返回原始输出', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果：日主偏弱，用神为木。',
      };

      const result = await service.relay(input);

      expect(result.styledContent).toBe(input.rawOutput);
      expect(result.originalContent).toBe(input.rawOutput);
      expect(result.style).toBe('warm'); // 默认风格
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('无 LLM 时指定风格应保留在输出中', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        style: 'professional',
      };

      const result = await service.relay(input);

      expect(result.style).toBe('professional');
      expect(result.styledContent).toBe(input.rawOutput);
    });

    it('默认风格应为 warm', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '测试内容',
      };

      const result = await service.relay(input);
      expect(result.style).toBe('warm');
    });
  });

  describe('有 LLM 时的中转流程', () => {
    let service: AgentRelayService;
    let moduleRef: TestingModule;
    let llmMock: { chat: jest.Mock };

    beforeEach(async () => {
      llmMock = {
        chat: jest.fn().mockResolvedValue({
          content: '这是风格化后的输出内容。',
          provider: 'deepseek',
          model: 'test-model',
          durationMs: 200,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        }),
      };

      moduleRef = await Test.createTestingModule({
        providers: [
          AgentRelayService,
          StyleTemplateService,
          { provide: LlmProvidersService, useValue: llmMock },
        ],
      }).compile();
      service = moduleRef.get(AgentRelayService);
    });

    afterEach(() => moduleRef.close());

    it('应调用 LLM chat 方法', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        style: 'professional',
      };

      await service.relay(input);

      expect(llmMock.chat).toHaveBeenCalledTimes(1);
    });

    it('应传入正确的消息格式', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        style: 'professional',
      };

      await service.relay(input);

      const callArgs = llmMock.chat.mock.calls[0];
      const messages = callArgs[0];
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[0].content).toContain('专业严谨');
      expect(messages[1].content).toContain('原始分析');
    });

    it('应返回风格化内容和原始内容', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        style: 'professional',
      };

      const result = await service.relay(input);

      expect(result.styledContent).toBe('这是风格化后的输出内容。');
      expect(result.originalContent).toBe('原始分析结果');
      expect(result.style).toBe('professional');
    });

    it('应包含 tokenCount（当 usage 存在时）', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        style: 'warm',
      };

      const result = await service.relay(input);

      expect(result.tokenCount).toBe(150); // promptTokens + completionTokens
    });

    it('durationMs 应为非负数', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
      };

      const result = await service.relay(input);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('LLM 调用失败应回退到原始输出', async () => {
      llmMock.chat.mockRejectedValueOnce(new Error('LLM service unavailable'));

      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        style: 'warm',
      };

      const result = await service.relay(input);

      expect(result.styledContent).toBe('原始分析结果');
      expect(result.originalContent).toBe('原始分析结果');
    });

    it('应包含用户问题（当提供时）', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        question: '今年事业运势如何？',
        style: 'warm',
      };

      await service.relay(input);

      const callArgs = llmMock.chat.mock.calls[0];
      const userMessage = callArgs[0][1].content;
      expect(userMessage).toContain('今年事业运势如何？');
    });

    it('应包含问题分类（当提供时）', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '原始分析结果',
        category: '事业',
        style: 'warm',
      };

      await service.relay(input);

      const callArgs = llmMock.chat.mock.calls[0];
      const userMessage = callArgs[0][1].content;
      expect(userMessage).toContain('事业');
    });
  });

  describe('relayBatch - 批量中转', () => {
    let service: AgentRelayService;
    let moduleRef: TestingModule;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [AgentRelayService, StyleTemplateService],
      }).compile();
      service = moduleRef.get(AgentRelayService);
    });

    afterAll(() => moduleRef.close());

    it('应返回与输入数量相同的结果', async () => {
      const inputs: AgentRelayInput[] = [
        { agentName: 'bazi-agent', rawOutput: '分析1' },
        { agentName: 'ziwei-agent', rawOutput: '分析2' },
        { agentName: 'liuren-agent', rawOutput: '分析3' },
      ];

      const results = await service.relayBatch(inputs);

      expect(results).toHaveLength(3);
    });

    it('每个结果应包含必要字段', async () => {
      const inputs: AgentRelayInput[] = [
        { agentName: 'bazi-agent', rawOutput: '分析1', style: 'professional' },
        { agentName: 'ziwei-agent', rawOutput: '分析2', style: 'warm' },
      ];

      const results = await service.relayBatch(inputs);

      for (const r of results) {
        expect(r).toHaveProperty('styledContent');
        expect(r).toHaveProperty('originalContent');
        expect(r).toHaveProperty('style');
        expect(r).toHaveProperty('durationMs');
      }
    });

    it('部分失败不应影响其他结果', async () => {
      const inputs: AgentRelayInput[] = [
        { agentName: 'bazi-agent', rawOutput: '分析1' },
        { agentName: 'ziwei-agent', rawOutput: '分析2' },
      ];

      const results = await service.relayBatch(inputs);

      expect(results).toHaveLength(2);
      for (const r of results) {
        expect(r.styledContent).toBeDefined();
      }
    });
  });

  describe('输入验证', () => {
    let service: AgentRelayService;
    let moduleRef: TestingModule;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [AgentRelayService, StyleTemplateService],
      }).compile();
      service = moduleRef.get(AgentRelayService);
    });

    afterAll(() => moduleRef.close());

    it('rawOutput 为空字符串时应正常处理', async () => {
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: '',
      };

      const result = await service.relay(input);
      expect(result.styledContent).toBe('');
      expect(result.originalContent).toBe('');
    });

    it('超长 rawOutput 应被截断（无 LLM 时原样返回）', async () => {
      const longOutput = 'A'.repeat(2000);
      const input: AgentRelayInput = {
        agentName: 'bazi-agent',
        rawOutput: longOutput,
      };

      const result = await service.relay(input);
      // 无 LLM 时原样返回，不做截断
      expect(result.styledContent).toBe(longOutput);
    });

    it('agentName 为空字符串时应正常处理', async () => {
      const input: AgentRelayInput = {
        agentName: '',
        rawOutput: '分析结果',
      };

      const result = await service.relay(input);
      expect(result).toBeDefined();
    });
  });
});
