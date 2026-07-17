import { Test, TestingModule } from '@nestjs/testing';
import { QualityEvaluatorService, QualityScore } from './quality-evaluator.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';

describe('QualityEvaluatorService - 质量评估服务', () => {
  let service: QualityEvaluatorService;
  let moduleRef: TestingModule;

  describe('纯规则评估（无 LLM）', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('evaluate() 应返回5维评分', async () => {
      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。建议注意休息，可以适当运动，避免过度劳累。',
        style: 'warm',
      });

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('dimensions');
      expect(result.dimensions).toHaveProperty('coherence');
      expect(result.dimensions).toHaveProperty('accuracy');
      expect(result.dimensions).toHaveProperty('style');
      expect(result.dimensions).toHaveProperty('empathy');
      expect(result.dimensions).toHaveProperty('actionability');
    });

    it('各维度分数应在 0-1 范围内', async () => {
      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。建议注意休息，可以适当运动。',
        style: 'professional',
      });

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
      for (const dim of Object.values(result.dimensions)) {
        expect(dim).toBeGreaterThanOrEqual(0);
        expect(dim).toBeLessThanOrEqual(1);
      }
    });

    it('overall 应为5维平均', async () => {
      const result = await service.evaluate({
        content: '五行日主用神，建议注意休息，可以适当运动，避免过度劳累。理解您的担忧。',
        style: 'warm',
      });

      const dims = result.dimensions;
      const expectedOverall = (dims.coherence + dims.accuracy + dims.style + dims.empathy + dims.actionability) / 5;
      expect(result.overall).toBe(parseFloat(expectedOverall.toFixed(2)));
    });
  });

  describe('规则评估 - 连贯性 (coherence)', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('内容过短（<50字）应降低连贯性分数', async () => {
      const result = await service.evaluate({
        content: '短内容',
        style: 'professional',
      });
      expect(result.dimensions.coherence).toBeLessThanOrEqual(0.4);
      expect(result.issues).toContain('内容过短');
    });

    it('缺少标点应降低连贯性分数', async () => {
      const result = await service.evaluate({
        content: '这是一段没有标点的长内容但是它确实超过了五十个字所以连贯性应该受到影响',
        style: 'professional',
      });
      expect(result.dimensions.coherence).toBeLessThanOrEqual(0.5);
      expect(result.issues).toContain('缺少标点，可能不连贯');
    });

    it('正常内容连贯性应较高', async () => {
      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。综合分析，今年事业运势向上，建议把握机会，积极进取，注意休息，保持良好的心态，迎接新的挑战。',
        style: 'professional',
      });
      expect(result.dimensions.coherence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('规则评估 - 命理准确性 (accuracy)', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('包含命理关键词应提高准确性分数', async () => {
      const result = await service.evaluate({
        content: '五行日主用神十神大运流年命宫四化格局，综合分析。',
        style: 'professional',
      });
      expect(result.dimensions.accuracy).toBeGreaterThanOrEqual(0.8);
    });

    it('无命理关键词准确性应较低', async () => {
      const result = await service.evaluate({
        content: '今天天气不错，适合出门走走，看看风景，放松心情。',
        style: 'warm',
      });
      expect(result.dimensions.accuracy).toBeLessThanOrEqual(0.5);
    });
  });

  describe('规则评估 - 风格一致性 (style)', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('concise 风格内容过长应降低风格分数', async () => {
      // 需要内容长度 > 400 字符
      const longContent = '从五行来看，日主偏弱，用神为木。综合分析，今年事业运势向上，建议把握机会。' +
        '另外从大运来看，未来三年运势持续走高，可以适当投资。从流年来看，今年财运亨通，但需注意健康问题。' +
        '从十神来看，正官星透出，事业有望升迁。综合来看，今年是事业发展的好时机，建议积极进取。' +
        '此外还需注意人际关系的维护，避免口舌之争。从命宫来看，近期有贵人相助，可以适当拓展人脉。' +
        '从四化来看，化禄入命，财运亨通，但需注意破财风险。从格局来看，正官格配合食神生财，整体运势不错。' +
        '从日主强弱来看，身弱喜印比，建议多学习提升自己。从大运流年配合来看，今年是转折之年，需谨慎行事。' +
        '从财星来看，正财透出，收入稳定，但偏财需谨慎。从官杀来看，七杀有制，事业有突破的可能。' +
        '从食伤来看，食神生财，创意和表达能力不错，适合从事相关行业。从印星来看，正印护身，学业和考试运势良好。' +
        '从比劫来看，比肩帮身，朋友缘不错，但需注意竞争。综合所有因素，今年整体运势稳中有升，建议稳扎稳打。';
      const result = await service.evaluate({
        content: longContent,
        style: 'concise',
      });
      expect(result.dimensions.style).toBeLessThanOrEqual(0.5);
      expect(result.issues).toContain('简洁风格但内容过长');
    });

    it('detailed 风格内容过短应降低风格分数', async () => {
      const result = await service.evaluate({
        content: '简短内容。',
        style: 'detailed',
      });
      expect(result.dimensions.style).toBeLessThanOrEqual(0.5);
      expect(result.issues).toContain('详细风格但内容过短');
    });

    it('warm 风格不含"您"应降低风格分数', async () => {
      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。综合分析，今年事业运势向上，建议把握机会。',
        style: 'warm',
      });
      expect(result.dimensions.style).toBeLessThanOrEqual(0.6);
    });
  });

  describe('规则评估 - 共情度 (empathy)', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('包含共情词应提高共情度分数', async () => {
      const result = await service.evaluate({
        content: '我理解您的担心，放心，注意照顾好自己，希望一切顺利。建议多休息。',
        style: 'warm',
      });
      expect(result.dimensions.empathy).toBeGreaterThanOrEqual(0.7);
    });

    it('无共情词共情度应较低', async () => {
      const result = await service.evaluate({
        content: '五行属木，日主偏弱，格局为正官格，用神为水。',
        style: 'professional',
      });
      expect(result.dimensions.empathy).toBeLessThanOrEqual(0.5);
    });
  });

  describe('规则评估 - 可操作性 (actionability)', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('包含行动词应提高可操作性分数', async () => {
      const result = await service.evaluate({
        content: '建议注意休息，可以适当运动，避免过度劳累，适合调整作息，不宜熬夜。',
        style: 'warm',
      });
      expect(result.dimensions.actionability).toBeGreaterThanOrEqual(0.7);
    });

    it('无行动词可操作性应较低', async () => {
      const result = await service.evaluate({
        content: '五行属木，日主偏弱，格局为正官格。',
        style: 'professional',
      });
      expect(result.dimensions.actionability).toBeLessThanOrEqual(0.5);
    });
  });

  describe('LLM 融合评估（60% 规则 + 40% LLM）', () => {
    let llmMock: { chat: jest.Mock };

    beforeAll(async () => {
      llmMock = {
        chat: jest.fn().mockResolvedValue({
          content: '{"coherence":0.9,"accuracy":0.8,"style":0.85,"empathy":0.7,"actionability":0.75,"issues":[],"suggestions":[]}',
          provider: 'deepseek',
          model: 'test',
          durationMs: 100,
        }),
      };

      moduleRef = await Test.createTestingModule({
        providers: [
          QualityEvaluatorService,
          { provide: LlmProvidersService, useValue: llmMock },
        ],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('有 LLM 时应调用 chat 方法', async () => {
      await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。建议注意休息，可以适当运动。',
        style: 'warm',
      });
      expect(llmMock.chat).toHaveBeenCalled();
    });

    it('融合后分数应在规则和 LLM 分数之间', async () => {
      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。综合分析，今年事业运势向上，建议把握机会，积极进取，注意休息，保持良好的心态，迎接新的挑战。',
        style: 'warm',
      });

      // 规则评估 coherence 约 0.8（有标点且>50字），LLM 给 0.9
      // 融合 = 0.8*0.6 + 0.9*0.4 = 0.84
      expect(result.dimensions.coherence).toBeGreaterThanOrEqual(0.7);
      expect(result.dimensions.coherence).toBeLessThanOrEqual(1.0);
    });

    it('LLM 调用失败时应回退到纯规则评估', async () => {
      llmMock.chat.mockRejectedValueOnce(new Error('LLM unavailable'));

      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。建议注意休息。',
        style: 'professional',
      });

      // 应仍然返回有效结果（纯规则）
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.dimensions.coherence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('issues 和 suggestions', () => {
    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        providers: [QualityEvaluatorService],
      }).compile();
      service = moduleRef.get(QualityEvaluatorService);
    });

    afterAll(() => moduleRef.close());

    it('内容过短应包含 issues 和 suggestions', async () => {
      const result = await service.evaluate({
        content: '短',
        style: 'professional',
      });
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('正常内容 issues 可能为空', async () => {
      const result = await service.evaluate({
        content: '从五行来看，日主偏弱，用神为木。综合分析，今年事业运势向上，建议把握机会，注意休息。',
        style: 'professional',
      });
      // 正常内容可能没有 issues，也可能有（取决于规则匹配）
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });
});
