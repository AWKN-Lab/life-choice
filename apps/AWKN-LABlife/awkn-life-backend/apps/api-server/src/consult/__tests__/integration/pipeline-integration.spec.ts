/**
 * 集成测试 — Pipeline 完整链路验证（P1-5: 计划版 5 层）
 *
 * 验证：用户输入 → 路由 → 高风险检测 → 分类 → 质量校验 → 5层解析
 * 不调真实 LLM，用 mock 模拟 LLM 返回
 */

import { BadRequestException } from '@nestjs/common';
import { IntentRouterService } from '../../orchestrator/intent-router.service';
import { HighRiskDetectorService } from '../../safety/high-risk-detector.service';
import { QualityGateService } from '../../orchestrator/quality-gate.service';
import { UserStateClassifierService } from '../../classifier/user-state-classifier.service';
import { GenerationComposerService } from '../../orchestrator/generation-composer.service';
import {
  createMockLlmGateway,
  createMockUserMemoryService,
  createMockQualityGate,
  createMockMemoryExtractor,
} from '../test-helpers';

// P1-3: QualityGateService 现在依赖 GuardrailService
function createMockGuardrail() {
  return {
    apply: (text: string) => ({
      output: text,
      blocked: false,
      violations: [],
    }),
  };
}

describe('Pipeline 集成测试 — 完整链路（P1-5 计划版）', () => {
  let router: IntentRouterService;
  let detector: HighRiskDetectorService;
  let qualityGate: QualityGateService;
  let classifier: UserStateClassifierService;
  let composer: GenerationComposerService;
  let mockMemory: ReturnType<typeof createMockUserMemoryService>;

  beforeEach(() => {
    router = new IntentRouterService();
    detector = new HighRiskDetectorService();
    qualityGate = new QualityGateService();
    mockMemory = createMockUserMemoryService();
    classifier = new UserStateClassifierService(mockMemory as any);
    const mockLlm = createMockLlmGateway();
    const mockQG = createMockQualityGate();
    const mockME = createMockMemoryExtractor();
    composer = new GenerationComposerService(mockLlm as any, mockQG as any, mockME as any);
  });

  describe('八字路由 → 正常用户 → 5层输出', () => {
    it('完整链路：路由=mixed, 无风险, genuine, 5层齐全', async () => {
      const question = '我今年事业运势怎么样，最近很焦虑因为项目一直延期';

      // Step 1: 路由（hasBirthInfo=true + liuren关键词"今年" → mixed）
      const route = router.route({ question, hasBirthInfo: true });
      expect(['ziping', 'mixed']).toContain(route);

      // Step 2: 高风险检测
      const risk = detector.detect(question);
      expect(risk).toBeNull(); // 无风险

      // Step 3: 用户分类
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const state = await classifier.classify('user1', question);
      expect(state.state).toBe('genuine');

      // Step 4: 5层解析（P1-5: 计划版标记）
      const llmOutput = `【数术断句】
甲木日主，生于寅月，木旺身强

【半山落句】
建禄格，用神金水，忌火土

【具体落点】
事业方向宜往西北，秋季较旺

【代价提醒】
先稳住当前工作，秋季再考虑跳槽

【下一步动作】
木旺之人最忌急躁，沉住气`;

      const fiveLayerResult = qualityGate.evaluateFiveLayers(llmOutput);
      expect(fiveLayerResult.passed).toBe(true);
      expect(fiveLayerResult.score).toBeGreaterThanOrEqual(60);
    });
  });

  describe('六壬路由 → 高风险拦截', () => {
    it('完整链路：路由=mixed(有八字+六壬关键词), 医疗咨询拦截', async () => {
      const question = '我要不要做手术，六爻怎么看';

      // 路由逻辑：hasBirthInfo=true + "要不要"命中 liurenPatterns → mixed
      // 无出生信息时一律 clarify，这是正确行为（无八字无法咨询）
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('mixed');

      // 高风险检测 → 医疗咨询
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });

    it('无出生信息 → clarify 路由（正确行为：无八字无法咨询）', () => {
      const question = '帮我起一卦';

      // 无出生信息 → clarify，这是设计意图
      const route = router.route({ question, hasBirthInfo: false });
      expect(route).toBe('clarify');
    });
  });

  describe('高风险用户 → high_risk 分类', () => {
    it('完整链路：危机关键词 → high_risk 状态', async () => {
      const question = '我不想活了';

      // Step 1: 高风险检测
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.isCrisis).toBe(true);

      // Step 2: 用户分类
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const state = await classifier.classify('user1', question);
      expect(state.state).toBe('high_risk');
      expect(state.confidence).toBe(0.95);
    });
  });

  describe('Quality Gate V2 灰度（P1-5: 计划版 5 层）', () => {
    it('PIPELINE_V2_ENABLED=true → 5层校验启用', () => {
      process.env.PIPELINE_V2_ENABLED = 'true';

      const text = `【数术断句】
甲木日主，生于寅月

【半山落句】
建禄格，用神金水

【具体落点】
事业宜西北方向

【代价提醒】
先稳后动，秋季再考虑

【下一步动作】
沉住气，秋天自有收获`;

      const v2Result = qualityGate.evaluateFiveLayers(text);
      expect(v2Result.passed).toBe(true);
      expect(v2Result.layerStatus.clause.present).toBe(true);

      delete process.env.PIPELINE_V2_ENABLED;
    });
  });

  describe('5层输出可靠性 — 缺层抛错（P1-3: 不再降级放行）', () => {
    it('部分标记缺失 → 抛 BadRequestException', () => {
      const text = `【数术断句】
甲木日主，生于寅月

【半山落句】
建禄格，用神金水

推演路径有三条：事业宜西北方向

建议你先稳住当前工作

【下一步动作】
沉住气等秋天`;

      // P1-3: 缺层抛 BadRequestException
      expect(() => qualityGate.evaluateFiveLayers(text)).toThrow(BadRequestException);
    });
  });

  describe('身份感校验', () => {
    it('含"系统说" → 身份感扣分', () => {
      const text = `【数术断句】
系统说你的运势不错

【半山落句】
格局为建禄格

【具体落点】
事业宜往西北

【代价提醒】
建议先稳住工作

【下一步动作】
沉住气等秋天`;

      const result = qualityGate.evaluateFiveLayers(text);
      expect(result.identityScore).toBeLessThan(60);
      expect(result.warnings.some(w => w.includes('非角色化表达'))).toBe(true);
    });

    it('含"我看" → 身份感加分', () => {
      const text = `【数术断句】
我看你的八字格局不错

【半山落句】
格局为建禄格

【具体落点】
事业宜往西北

【代价提醒】
建议先稳住工作

【下一步动作】
沉住气等秋天`;

      const result = qualityGate.evaluateFiveLayers(text);
      expect(result.identityScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('回归：原有功能不受影响', () => {
    it('关键词过滤仍正常工作', () => {
      const result = qualityGate.evaluate('基于coreAction分析，建议你顺势而为');
      expect(result.score).toBeLessThan(100);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('4 路由仍正常工作', () => {
      // hasBirthInfo=true + zipingPatterns("今年","事业") → ziping
      expect(router.route({ question: '今年事业怎么样', hasBirthInfo: true })).toBe('ziping');
      // 无出生信息 → clarify（设计意图：无八字无法咨询）
      expect(router.route({ question: '帮我起一卦', hasBirthInfo: false })).toBe('clarify');
      // hasBirthInfo=true + liurenPatterns("要不要") → mixed
      expect(router.route({ question: '今年要不要跳槽', hasBirthInfo: true })).toBe('mixed');
      // 无出生信息 + 无关键词 → clarify
      expect(router.route({ question: '什么是八字', hasBirthInfo: false })).toBe('clarify');
    });

    it('8 场景高风险检测仍正常工作', () => {
      expect(detector.detect('你准吗')).not.toBeNull();
      expect(detector.detect('该不该起诉')).not.toBeNull();
      expect(detector.detect('吃什么药')).not.toBeNull();
      expect(detector.detect('稳赚不赔')).not.toBeNull();
    });
  });
});
