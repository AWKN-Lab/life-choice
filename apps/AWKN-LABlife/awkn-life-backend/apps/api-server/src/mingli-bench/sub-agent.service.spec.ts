/**
 * SubAgentService 单元测试
 *
 * 覆盖：
 * - extractAnswer() 答案提取
 * - baziAnalysis() 八字分析子代理
 * - ziweiAnalysis() 紫微斗数分析子代理
 * - synthesizeAnalysis() 综合推理子代理
 * - runSubAgentPipeline() 完整管线
 * - callLlm() LLM 调用 fallback
 *
 * 注意：直接 new SubAgentService() 而非通过 NestJS TestingModule，
 * 避免 NestJS 代理拦截私有方法调用和属性设置。
 */
import { SubAgentService, SubAgentResult } from './sub-agent.service';
import { BenchmarkQuestion } from './mingli-bench.service';

// ─── 测试用题目 fixture ───

const makeQuestion = (overrides: Partial<BenchmarkQuestion> = {}): BenchmarkQuestion => ({
  id: 'q-test-001',
  question_number: 1,
  original_number: 1,
  case_id: 'case-001',
  birth_info: {
    raw: '女命，1985年6月20日8时0分，上海',
    gender: '女',
    year: 1985,
    month: 6,
    day: 20,
    hour: 8,
    minute: 0,
    country: '中国',
    location: '上海',
    calendar_type: 'solar',
  },
  question: '此命主事业运势如何？',
  options: [
    { letter: 'A', text: '事业有成' },
    { letter: 'B', text: '事业平平' },
    { letter: 'C', text: '事业坎坷' },
    { letter: 'D', text: '事业辉煌' },
  ],
  answer: 'A',
  category: '事业',
  has_answer: true,
  ...overrides,
});

// ─── Mock 工厂 ───

function createMockLlmProviders() {
  return {
    chat: jest.fn().mockResolvedValue({
      content: '根据八字分析，命主事业运势较好，[ANSWER]A',
      durationMs: 300,
      promptTokens: 100,
      completionTokens: 50,
    }),
  };
}

// ─── 测试主体 ───

describe('SubAgentService', () => {
  let service: SubAgentService;

  beforeEach(() => {
    // 直接 new，避免 NestJS 代理问题
    service = new SubAgentService(null);
  });

  // ============ extractAnswer ============

  describe('extractAnswer - 答案提取', () => {
    const extractAnswer = (content: string) => (service as any).extractAnswer(content);

    it('应匹配 [ANSWER]X 格式', () => {
      expect(extractAnswer('分析结果 [ANSWER]A')).toBe('A');
    });

    it('应匹配 [ANSWER]X 带空格', () => {
      expect(extractAnswer('[ANSWER] B')).toBe('B');
    });

    it('应忽略大小写', () => {
      expect(extractAnswer('[answer]c')).toBe('C');
    });

    it('应匹配 "答案是X" 格式', () => {
      expect(extractAnswer('经过分析，答案是A')).toBe('A');
    });

    it('应匹配 "最终答案：X" 格式', () => {
      expect(extractAnswer('最终答案：B')).toBe('B');
    });

    it('无 [ANSWER] 和明确表述时，应 fallback 到最后一个 A-D 字母', () => {
      expect(extractAnswer('分析 A 和 B，最终选 C')).toBe('C');
    });

    it('空字符串应返回 null', () => {
      expect(extractAnswer('')).toBeNull();
    });

    it('无 A-D 字母应返回 null', () => {
      expect(extractAnswer('没有任何选项字母')).toBeNull();
    });

    it('应去除 markdown 格式标记', () => {
      expect(extractAnswer('**[ANSWER]D**')).toBe('D');
    });

    it('[ANSWER] 格式应优先于 "答案是" 格式', () => {
      expect(extractAnswer('答案是A，但更确定 [ANSWER]B')).toBe('B');
    });
  });

  // ============ baziAnalysis ============

  describe('baziAnalysis - 八字分析子代理', () => {
    let mockLlmProviders: ReturnType<typeof createMockLlmProviders>;

    beforeEach(() => {
      mockLlmProviders = createMockLlmProviders();
      (service as any).llmProviders = mockLlmProviders;
    });

    it('应返回 SubAgentResult 结构', async () => {
      const question = makeQuestion();
      const result = await service.baziAnalysis(question, '年柱: 甲子\n月柱: 乙丑', 'deepseek');

      expect(result).toHaveProperty('agentName', 'bazi-analyst');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('predictedAnswer');
      expect(result).toHaveProperty('durationMs');
      expect(typeof result.durationMs).toBe('number');
    });

    it('LLM 返回有效答案时 predictedAnswer 应非 null', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '八字分析结果 [ANSWER]A',
        durationMs: 200,
      });

      const question = makeQuestion();
      const result = await service.baziAnalysis(question, '八字排盘数据', 'deepseek');
      expect(result.predictedAnswer).toBe('A');
      expect(result.confidence).toBe(0.7);
    });

    it('LLM 返回无法解析的内容时 predictedAnswer 应为 null', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '无法确定答案',
        durationMs: 200,
      });

      const question = makeQuestion();
      const result = await service.baziAnalysis(question, '八字排盘数据', 'deepseek');
      expect(result.predictedAnswer).toBeNull();
      expect(result.confidence).toBe(0.3);
    });

    it('prompt 应包含八字排盘数据', async () => {
      const question = makeQuestion();
      await service.baziAnalysis(question, '年柱: 甲子\n月柱: 乙丑', 'deepseek');

      const callArgs = mockLlmProviders.chat.mock.calls[0];
      const messages = callArgs[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('年柱: 甲子');
      expect(userMessage.content).toContain('八字排盘');
    });
  });

  // ============ ziweiAnalysis ============

  describe('ziweiAnalysis - 紫微斗数分析子代理', () => {
    let mockLlmProviders: ReturnType<typeof createMockLlmProviders>;

    beforeEach(() => {
      mockLlmProviders = createMockLlmProviders();
      (service as any).llmProviders = mockLlmProviders;
    });

    it('应返回 ziwei-analyst 标识', async () => {
      const question = makeQuestion();
      const result = await service.ziweiAnalysis(question, '命宫主星: 紫微', 'deepseek');
      expect(result.agentName).toBe('ziwei-analyst');
    });

    it('LLM 返回有效答案时 predictedAnswer 应非 null', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '紫微分析结果 [ANSWER]B',
        durationMs: 200,
      });

      const question = makeQuestion();
      const result = await service.ziweiAnalysis(question, '紫微排盘数据', 'deepseek');
      expect(result.predictedAnswer).toBe('B');
      expect(result.confidence).toBe(0.7);
    });

    it('prompt 应包含紫微排盘数据', async () => {
      const question = makeQuestion();
      await service.ziweiAnalysis(question, '命宫主星: 紫微', 'deepseek');

      const callArgs = mockLlmProviders.chat.mock.calls[0];
      const messages = callArgs[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('命宫主星: 紫微');
      expect(userMessage.content).toContain('紫微斗数排盘');
    });
  });

  // ============ synthesizeAnalysis ============

  describe('synthesizeAnalysis - 综合推理子代理', () => {
    let mockLlmProviders: ReturnType<typeof createMockLlmProviders>;

    beforeEach(() => {
      mockLlmProviders = createMockLlmProviders();
      (service as any).llmProviders = mockLlmProviders;
    });

    const makeSubAgentResult = (overrides: Partial<SubAgentResult> = {}): SubAgentResult => ({
      agentName: 'test-agent',
      analysis: '测试分析内容',
      confidence: 0.7,
      predictedAnswer: 'A',
      durationMs: 100,
      ...overrides,
    });

    it('应返回 synthesis-agent 标识', async () => {
      const question = makeQuestion();
      const baziResult = makeSubAgentResult({ agentName: 'bazi-analyst' });
      const ziweiResult = makeSubAgentResult({ agentName: 'ziwei-analyst' });

      const result = await service.synthesizeAnalysis(question, baziResult, ziweiResult, 'deepseek');
      expect(result.agentName).toBe('synthesis-agent');
    });

    it('八字和紫微答案一致时置信度应为 0.9', async () => {
      const question = makeQuestion();
      const baziResult = makeSubAgentResult({ predictedAnswer: 'A' });
      const ziweiResult = makeSubAgentResult({ predictedAnswer: 'A' });

      const result = await service.synthesizeAnalysis(question, baziResult, ziweiResult, 'deepseek');
      expect(result.confidence).toBe(0.9);
    });

    it('八字和紫微答案不一致时置信度应为 0.5', async () => {
      const question = makeQuestion();
      const baziResult = makeSubAgentResult({ predictedAnswer: 'A' });
      const ziweiResult = makeSubAgentResult({ predictedAnswer: 'B' });

      const result = await service.synthesizeAnalysis(question, baziResult, ziweiResult, 'deepseek');
      expect(result.confidence).toBe(0.5);
    });

    it('一个子代理答案为 null 时置信度应为 0.6', async () => {
      const question = makeQuestion();
      const baziResult = makeSubAgentResult({ predictedAnswer: 'A' });
      const ziweiResult = makeSubAgentResult({ predictedAnswer: null });

      const result = await service.synthesizeAnalysis(question, baziResult, ziweiResult, 'deepseek');
      expect(result.confidence).toBe(0.6);
    });

    it('prompt 应包含八字和紫微的分析结论', async () => {
      const question = makeQuestion();
      const baziResult = makeSubAgentResult({ analysis: '八字分析：日主偏旺', predictedAnswer: 'A' });
      const ziweiResult = makeSubAgentResult({ analysis: '紫微分析：命宫紫微', predictedAnswer: 'A' });

      await service.synthesizeAnalysis(question, baziResult, ziweiResult, 'deepseek');

      const callArgs = mockLlmProviders.chat.mock.calls[0];
      const messages = callArgs[0];
      const userMessage = messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('八字分析结论');
      expect(userMessage.content).toContain('紫微斗数分析结论');
      expect(userMessage.content).toContain('八字分析师推荐：A');
      expect(userMessage.content).toContain('紫微分析师推荐：A');
    });
  });

  // ============ runSubAgentPipeline ============

  describe('runSubAgentPipeline - 完整管线', () => {
    let mockLlmProviders: ReturnType<typeof createMockLlmProviders>;

    beforeEach(() => {
      mockLlmProviders = createMockLlmProviders();
      (service as any).llmProviders = mockLlmProviders;
    });

    it('有紫微数据时应执行三步管线', async () => {
      mockLlmProviders.chat
        .mockResolvedValueOnce({ content: '八字分析 [ANSWER]A', durationMs: 200 })
        .mockResolvedValueOnce({ content: '紫微分析 [ANSWER]A', durationMs: 200 })
        .mockResolvedValueOnce({ content: '综合分析 [ANSWER]A', durationMs: 300 });

      const question = makeQuestion();
      const result = await service.runSubAgentPipeline(question, '八字排盘', '紫微排盘', 'deepseek');

      expect(result.baziResult).toBeDefined();
      expect(result.baziResult.agentName).toBe('bazi-analyst');
      expect(result.ziweiResult).toBeDefined();
      expect(result.ziweiResult!.agentName).toBe('ziwei-analyst');
      expect(result.synthesisResult).toBeDefined();
      expect(result.synthesisResult.agentName).toBe('synthesis-agent');
      expect(result.finalAnswer).toBe('A');
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(mockLlmProviders.chat).toHaveBeenCalledTimes(3);
    });

    it('无紫微数据时应只执行八字分析', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '八字分析 [ANSWER]B',
        durationMs: 200,
      });

      const question = makeQuestion();
      const result = await service.runSubAgentPipeline(question, '八字排盘', undefined, 'deepseek');

      expect(result.baziResult).toBeDefined();
      expect(result.ziweiResult).toBeNull();
      expect(result.synthesisResult).toBe(result.baziResult); // 无紫微时综合结果就是八字结果
      expect(result.finalAnswer).toBe('B');
      expect(mockLlmProviders.chat).toHaveBeenCalledTimes(1);
    });

    it('应正确传递最终答案', async () => {
      mockLlmProviders.chat
        .mockResolvedValueOnce({ content: '八字分析 [ANSWER]C', durationMs: 200 })
        .mockResolvedValueOnce({ content: '紫微分析 [ANSWER]C', durationMs: 200 })
        .mockResolvedValueOnce({ content: '综合分析 [ANSWER]C', durationMs: 300 });

      const question = makeQuestion();
      const result = await service.runSubAgentPipeline(question, '八字排盘', '紫微排盘', 'deepseek');
      expect(result.finalAnswer).toBe('C');
    });

    it('LLM 返回无法解析内容时 finalAnswer 应为 null', async () => {
      mockLlmProviders.chat
        .mockResolvedValueOnce({ content: '八字分析，无法确定', durationMs: 200 })
        .mockResolvedValueOnce({ content: '紫微分析，无法确定', durationMs: 200 })
        .mockResolvedValueOnce({ content: '综合分析，无法确定', durationMs: 300 });

      const question = makeQuestion();
      const result = await service.runSubAgentPipeline(question, '八字排盘', '紫微排盘', 'deepseek');
      expect(result.finalAnswer).toBeNull();
    });
  });

  // ============ callLlm fallback ============

  describe('callLlm - LLM 调用', () => {
    it('llmProviders 不可用且无 API key 时应抛出错误', async () => {
      (service as any).llmProviders = null;
      const origKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;

      await expect((service as any).callLlm('test prompt', 'deepseek')).rejects.toThrow('No LLM API key');

      if (origKey) process.env.DEEPSEEK_API_KEY = origKey;
    });
  });
});
