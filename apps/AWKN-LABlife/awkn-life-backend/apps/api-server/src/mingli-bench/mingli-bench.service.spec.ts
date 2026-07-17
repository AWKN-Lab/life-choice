/**
 * MingliBenchService 单元测试
 *
 * 覆盖：
 * - parseAnswer() 四级优先级解析
 * - runBenchmark() 基本流程（含数据加载间接测试）
 * - shuffleOptions() 选项洗牌
 * - selectQuestions() 题目筛选
 * - getCategories() 分类列表
 * - buildPrompt() 提示词构建
 * - runComparisonTest() 对比测试
 *
 * 注意：直接 new MingliBenchService() 而非通过 NestJS TestingModule，
 * 避免 NestJS 代理拦截私有方法调用和属性设置。
 * loadDataset/loadFortuneData 是私有 async 方法，通过 runBenchmark 间接测试。
 */
import { ConfigService } from '@nestjs/config';
import { MingliBenchService, BenchmarkQuestion } from './mingli-bench.service';

// ─── 测试用题目 fixture ───

const makeQuestion = (overrides: Partial<BenchmarkQuestion> = {}): BenchmarkQuestion => ({
  id: 'q-test-001',
  question_number: 1,
  original_number: 1,
  case_id: 'case-001',
  birth_info: {
    raw: '男命，1990年1月15日12时0分，北京',
    gender: '男',
    year: 1990,
    month: 1,
    day: 15,
    hour: 12,
    minute: 0,
    country: '中国',
    location: '北京',
    calendar_type: 'solar',
  },
  question: '此命主最可能发生何事？',
  options: [
    { letter: 'A', text: '事业升职' },
    { letter: 'B', text: '婚姻变故' },
    { letter: 'C', text: '意外灾祸' },
    { letter: 'D', text: '得财发财' },
  ],
  answer: 'C',
  category: '意外',
  has_answer: true,
  ...overrides,
});

// ─── Mock 工厂 ───

function createMockConfigService() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'MINGLI_BENCH_DATA_PATH') return undefined;
      if (key === 'MINGLI_BENCH_FORTUNE_PATH') return undefined;
      return null;
    }),
  } as unknown as ConfigService;
}

function createMockLlmProviders() {
  return {
    chat: jest.fn().mockResolvedValue({
      content: '根据分析，答案是 [ANSWER]C',
      durationMs: 500,
      promptTokens: 100,
      completionTokens: 50,
    }),
  };
}

// ─── 测试主体 ───

describe('MingliBenchService', () => {
  let service: MingliBenchService;

  beforeEach(() => {
    service = new MingliBenchService(createMockConfigService(), null, null, null);
  });

  // ============ getCategories ============

  describe('getCategories', () => {
    it('应返回12个分类', () => {
      const categories = service.getCategories();
      expect(categories.length).toBe(12);
      expect(categories).toContain('意外');
      expect(categories).toContain('事业');
      expect(categories).toContain('婚姻');
      expect(categories).toContain('健康');
    });
  });

  // ============ parseAnswer ============

  describe('parseAnswer - 四级优先级解析', () => {
    const parseAnswer = (content: string) => (service as any).parseAnswer(content);

    describe('优先级1：[ANSWER]X 格式', () => {
      it('应匹配 [ANSWER]C', () => {
        expect(parseAnswer('经过分析 [ANSWER]C')).toBe('C');
      });

      it('应匹配 [ANSWER] A（带空格）', () => {
        expect(parseAnswer('结论是 [ANSWER] A')).toBe('A');
      });

      it('应匹配行尾 [ANSWER]D', () => {
        expect(parseAnswer('一些分析\n[ANSWER]D')).toBe('D');
      });

      it('应忽略大小写', () => {
        expect(parseAnswer('[answer]b')).toBe('B');
      });

      it('不应匹配 [ANSWER]X 后还有内容的情况', () => {
        const result = parseAnswer('[ANSWER]C 其他内容');
        expect(result).toBeTruthy(); // fallback 到其他优先级匹配到 C
      });
    });

    describe('优先级2：明确中文答案表述', () => {
      it('应匹配 "答案是C"', () => {
        expect(parseAnswer('经过分析，答案是C')).toBe('C');
      });

      it('应匹配 "正确答案：B"', () => {
        expect(parseAnswer('正确答案：B')).toBe('B');
      });

      it('应匹配 "我选择A"', () => {
        expect(parseAnswer('综合考虑，我选择A')).toBe('A');
      });

      it('应匹配 "最终答案D"', () => {
        expect(parseAnswer('最终答案D')).toBe('D');
      });

      it('应匹配 "选择是：C"', () => {
        expect(parseAnswer('选择是：C')).toBe('C');
      });
    });

    describe('优先级3：位置性模式', () => {
      it('应匹配句首 "A. xxx"', () => {
        expect(parseAnswer('A. 这是正确选项')).toBe('A');
      });

      it('应匹配 "选项B"', () => {
        expect(parseAnswer('选项B')).toBe('B');
      });

      it('应匹配 "选C"', () => {
        expect(parseAnswer('选C')).toBe('C');
      });
    });

    describe('优先级4：最后一个选项字母 fallback', () => {
      it('应返回最后一个出现的 A-D 字母', () => {
        expect(parseAnswer('分析 A 和 B 之后选 D')).toBe('D');
      });

      it('只有一个字母时返回该字母', () => {
        expect(parseAnswer('C')).toBe('C');
      });
    });

    describe('边界情况', () => {
      it('空字符串应返回 null', () => {
        expect(parseAnswer('')).toBeNull();
      });

      it('无任何 A-D 字母应返回 null', () => {
        expect(parseAnswer('没有选项字母的内容')).toBeNull();
      });

      it('应去除 markdown 格式标记', () => {
        expect(parseAnswer('**[ANSWER]A**')).toBe('A');
      });

      it('优先级1应优先于优先级2', () => {
        expect(parseAnswer('答案是A，但更确定 [ANSWER]B')).toBe('B');
      });
    });
  });

  // ============ selectQuestions ============

  describe('selectQuestions - 题目筛选', () => {
    const questions = [
      makeQuestion({ id: 'q1', birth_info: { ...makeQuestion().birth_info, year: 1990 }, category: '意外' }),
      makeQuestion({ id: 'q2', birth_info: { ...makeQuestion().birth_info, year: 1985 }, category: '事业' }),
      makeQuestion({ id: 'q3', birth_info: { ...makeQuestion().birth_info, year: 1990 }, category: '事业' }),
      makeQuestion({ id: 'q4', birth_info: { ...makeQuestion().birth_info, year: 1990 }, category: '婚姻' }),
    ];

    it('无筛选条件时返回全部', () => {
      const result = (service as any).selectQuestions(questions);
      expect(result).toHaveLength(4);
    });

    it('按年份筛选', () => {
      const result = (service as any).selectQuestions(questions, 1990);
      expect(result).toHaveLength(3);
      expect(result.every((q: BenchmarkQuestion) => q.birth_info.year === 1990)).toBe(true);
    });

    it('按分类筛选', () => {
      const result = (service as any).selectQuestions(questions, undefined, undefined, ['事业']);
      expect(result).toHaveLength(2);
    });

    it('按 sampleSize 截取', () => {
      const result = (service as any).selectQuestions(questions, undefined, 2);
      expect(result).toHaveLength(2);
    });

    it('组合筛选：年份 + 分类', () => {
      const result = (service as any).selectQuestions(questions, 1990, undefined, ['事业']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q3');
    });
  });

  // ============ shuffleOptions ============

  describe('shuffleOptions - 选项洗牌', () => {
    it('单选项应原样返回', () => {
      const q = makeQuestion({ options: [{ letter: 'A', text: '唯一选项' }] });
      const { shuffled, optionMap } = (service as any).shuffleOptions(q);
      expect(shuffled.options).toHaveLength(1);
      expect(optionMap['A']).toBe('A');
    });

    it('洗牌后选项数量不变', () => {
      const q = makeQuestion();
      const { shuffled } = (service as any).shuffleOptions(q);
      expect(shuffled.options).toHaveLength(4);
    });

    it('洗牌后选项文本完整保留', () => {
      const q = makeQuestion();
      const { shuffled } = (service as any).shuffleOptions(q);
      const texts = shuffled.options.map((o: any) => o.text).sort();
      const originalTexts = q.options.map((o: any) => o.text).sort();
      expect(texts).toEqual(originalTexts);
    });

    it('optionMap 应正确映射新字母到原字母', () => {
      const q = makeQuestion();
      const { optionMap } = (service as any).shuffleOptions(q);
      const newLetters = Object.keys(optionMap);
      const originalLetters = Object.values(optionMap);
      expect(newLetters.sort()).toEqual(['A', 'B', 'C', 'D']);
      expect(originalLetters.sort()).toEqual(['A', 'B', 'C', 'D']);
    });

    it('洗牌不应修改原题目', () => {
      const q = makeQuestion();
      const originalLetters = q.options.map((o: any) => o.letter);
      (service as any).shuffleOptions(q);
      expect(q.options.map((o: any) => o.letter)).toEqual(originalLetters);
    });
  });

  // ============ buildPrompt ============

  describe('buildPrompt - 提示词构建', () => {
    it('无CoT时应包含直接回答指令', () => {
      const q = makeQuestion();
      const prompt = (service as any).buildPrompt(q, false, false);
      expect(prompt).toContain('请直接回答选项字母');
      expect(prompt).toContain(q.question);
      expect(prompt).toContain('A. 事业升职');
    });

    it('有CoT时应包含多阶段分析', () => {
      const q = makeQuestion();
      const prompt = (service as any).buildPrompt(q, true, false);
      expect(prompt).toContain('八字分析子代理');
      expect(prompt).toContain('[ANSWER]X');
    });

    it('有紫微时应包含紫微分析阶段', () => {
      const q = makeQuestion();
      const prompt = (service as any).buildPrompt(q, true, true, '八字排盘数据', '紫微排盘数据');
      expect(prompt).toContain('紫微斗数分析子代理');
      expect(prompt).toContain('紫微排盘数据');
    });

    it('应包含命主信息', () => {
      const q = makeQuestion();
      const prompt = (service as any).buildPrompt(q, false, false);
      expect(prompt).toContain('命主信息');
      expect(prompt).toContain('男命');
    });
  });

  // ============ runBenchmark ============

  describe('runBenchmark - 基准测试流程', () => {
    let mockLlmProviders: ReturnType<typeof createMockLlmProviders>;

    beforeEach(() => {
      mockLlmProviders = createMockLlmProviders();
      (service as any)._llmProviders = mockLlmProviders;
      (service as any).questions = [
        makeQuestion({ id: 'q1', answer: 'C', category: '意外' }),
        makeQuestion({ id: 'q2', answer: 'A', category: '事业' }),
      ];
      (service as any).fortuneData = {};
    });

    it('应返回完整的 BenchmarkRunResult 结构', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '[ANSWER]C',
        durationMs: 100,
        promptTokens: 50,
        completionTokens: 20,
      }).mockResolvedValueOnce({
        content: '[ANSWER]A',
        durationMs: 100,
        promptTokens: 50,
        completionTokens: 20,
      });

      const result = await service.runBenchmark({ sampleSize: 2, provider: 'deepseek' });

      expect(result).toHaveProperty('runId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('categoryBreakdown');
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(2);
    });

    it('应正确统计正确率', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '[ANSWER]C',
        durationMs: 100,
      }).mockResolvedValueOnce({
        content: '[ANSWER]B',
        durationMs: 100,
      });

      const result = await service.runBenchmark({ sampleSize: 2, provider: 'deepseek' });
      expect(result.summary.correct).toBe(1);
      expect(result.summary.total).toBe(2);
      expect(result.summary.accuracy).toBe(0.5);
    });

    it('无符合条件的题目应抛出错误', async () => {
      (service as any).questions = [];
      await expect(service.runBenchmark({ sampleSize: 10 })).rejects.toThrow('没有符合条件的题目');
    });

    it('应支持分类维度统计', async () => {
      mockLlmProviders.chat.mockResolvedValue({
        content: '[ANSWER]C',
        durationMs: 100,
      });

      const result = await service.runBenchmark({ sampleSize: 2, provider: 'deepseek' });
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.categoryBreakdown['意外']).toBeDefined();
    });

    it('LLM 返回 [ANSWER] 格式时应正确解析', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '经过详细分析，答案是 [ANSWER]C',
        durationMs: 100,
      });

      const result = await service.runBenchmark({ sampleSize: 1, provider: 'deepseek' });
      expect(result.results[0].predictedAnswer).toBe('C');
      expect(result.results[0].isCorrect).toBe(true);
    });

    it('LLM 返回中文答案格式时应正确解析', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '经过详细分析，答案是A',
        durationMs: 100,
      });

      const result = await service.runBenchmark({ sampleSize: 1, provider: 'deepseek' });
      expect(result.results[0].predictedAnswer).toBe('A');
    });

    it('LLM 返回无法解析内容时 predictedAnswer 应为 null', async () => {
      mockLlmProviders.chat.mockResolvedValueOnce({
        content: '无法确定答案',
        durationMs: 100,
      });

      const result = await service.runBenchmark({ sampleSize: 1, provider: 'deepseek' });
      expect(result.results[0].predictedAnswer).toBeNull();
      expect(result.results[0].isCorrect).toBe(false);
    });
  });

  // ============ getHistory ============

  describe('getHistory - 历史记录', () => {
    it('无 prisma 时应返回内存中的历史', async () => {
      const history = await service.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  // ============ runComparisonTest ============

  describe('runComparisonTest - 对比测试', () => {
    beforeEach(() => {
      const mockLlmProviders = createMockLlmProviders();
      (service as any)._llmProviders = mockLlmProviders;
      (service as any).questions = [makeQuestion({ id: 'q1', answer: 'C', category: '意外' })];
      (service as any).fortuneData = {};
    });

    it('应返回 baseline 和 enhanced 两次运行结果', async () => {
      const result = await service.runComparisonTest({ sampleSize: 1, provider: 'deepseek' });
      expect(result).toHaveProperty('baseline');
      expect(result).toHaveProperty('enhanced');
      expect(result).toHaveProperty('comparison');
      expect(result.comparison).toHaveProperty('accuracyDelta');
      expect(result.comparison).toHaveProperty('categoryDeltas');
    });
  });
});
