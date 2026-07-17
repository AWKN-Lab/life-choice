/**
 * Pipeline 端到端测试 — 完整链路验证（P1-5: 计划版 5 层）
 *
 * 验证完整 pipeline：用户输入 → 路由 → 高风险检测 → 分类 → 质量校验 → 5层解析
 * 使用 mock LLM 返回，验证最终输出符合计划版 5 层结构
 *
 * 与 pipeline-integration.spec.ts 的区别：
 * - integration 侧重模块间协作的回归保护
 * - e2e 侧重 happy path 的完整阶段断言
 */

import { BadRequestException } from '@nestjs/common';
import { IntentRouterService } from '../orchestrator/intent-router.service';
import { HighRiskDetectorService } from '../safety/high-risk-detector.service';
import { QualityGateService } from '../orchestrator/quality-gate.service';
import { UserStateClassifierService } from '../classifier/user-state-classifier.service';
import {
  createMockLlmGateway,
  createMockUserMemoryService,
  createMockQualityGate,
  createMockMemoryExtractor,
} from './test-helpers';

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

// P1-5: 模拟 LLM 返回的计划版 5 层结构文本
const MOCK_LLM_FIVE_LAYER_OUTPUT = `【数术断句】
甲木日主，生于寅月，木旺身强。当前大运辛亥，流年丙午。

【半山落句】
建禄格，用神金水，忌火土。事业宫位稳定，财星受制。

【具体落点】
事业推演有三条路径：
1. 维持现状（概率 55%）：稳中有进，秋季较旺
2. 内部调岗（概率 30%）：有贵人提携，但需忍耐
3. 跳槽换行（概率 15%）：风险较大，不建议今年行动

【代价提醒】
我看你的格局，先稳住当前工作，秋季再考虑调整。注意维护与上级的关系。

【下一步动作】
木旺之人最忌急躁，沉住气，秋天自有收获。`;

describe('Pipeline E2E — 完整链路端到端验证（P1-5 计划版）', () => {
  let router: IntentRouterService;
  let detector: HighRiskDetectorService;
  let qualityGate: QualityGateService;
  let classifier: UserStateClassifierService;
  let mockMemory: ReturnType<typeof createMockUserMemoryService>;
  let mockLlm: ReturnType<typeof createMockLlmGateway>;
  let mockQG: ReturnType<typeof createMockQualityGate>;
  let mockME: ReturnType<typeof createMockMemoryExtractor>;

  beforeEach(() => {
    router = new IntentRouterService();
    detector = new HighRiskDetectorService();
    qualityGate = new QualityGateService();
    mockMemory = createMockUserMemoryService();
    mockLlm = createMockLlmGateway();
    mockQG = createMockQualityGate();
    mockME = createMockMemoryExtractor();
    classifier = new UserStateClassifierService(mockMemory as any);
  });

  describe('完整 happy path：事业咨询 → 5层输出', () => {
    const question = '今年事业运势怎么样，最近很焦虑因为工作一直延期';

    it('Step 1: 路由 → ziping（有出生信息 + "今年""事业"命中）', () => {
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('ziping');
    });

    it('Step 2: 高风险检测 → null（无高风险场景）', () => {
      const risk = detector.detect(question);
      expect(risk).toBeNull();
    });

    it('Step 3: 用户分类 → genuine（有情绪词"焦虑" + 背景描述）', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const state = await classifier.classify('user1', question);
      expect(state.state).toBe('genuine');
      expect(state.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('Step 4: LLM 生成 → 返回 5 层结构文本', async () => {
      // 模拟 LLM 返回 5 层结构
      const llmResult = await mockLlm.generateParallel();
      expect(llmResult.primary).toBeDefined();
      expect(llmResult.consistency).toBe('consistent');
    });

    it('Step 5: 质量门禁 → 5 层校验通过', () => {
      const result = qualityGate.evaluateFiveLayers(MOCK_LLM_FIVE_LAYER_OUTPUT);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
    });

    it('Step 5b: 5 层结构完整性 → 全部 present + hasContent', () => {
      const result = qualityGate.evaluateFiveLayers(MOCK_LLM_FIVE_LAYER_OUTPUT);
      expect(result.layerStatus.clause.present).toBe(true);
      expect(result.layerStatus.clause.hasContent).toBe(true);
      expect(result.layerStatus.halfMountain.present).toBe(true);
      expect(result.layerStatus.halfMountain.hasContent).toBe(true);
      expect(result.layerStatus.detail.present).toBe(true);
      expect(result.layerStatus.detail.hasContent).toBe(true);
      expect(result.layerStatus.cost.present).toBe(true);
      expect(result.layerStatus.cost.hasContent).toBe(true);
      expect(result.layerStatus.nextAction.present).toBe(true);
      expect(result.layerStatus.nextAction.hasContent).toBe(true);
    });

    it('Step 5c: 身份感校验 → 含"我看"加分（identityScore >= 80）', () => {
      const result = qualityGate.evaluateFiveLayers(MOCK_LLM_FIVE_LAYER_OUTPUT);
      expect(result.identityScore).toBeGreaterThanOrEqual(80);
    });

    it('完整链路串联：路由 → 检测 → 分类 → 质量校验 全部通过', async () => {
      // Step 1: 路由
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('ziping');

      // Step 2: 高风险检测
      const risk = detector.detect(question);
      expect(risk).toBeNull();

      // Step 3: 用户分类
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const state = await classifier.classify('user1', question);
      expect(state.state).toBe('genuine');

      // Step 4: LLM 生成（mock）
      const llmResult = await mockLlm.generateParallel();
      expect(llmResult.consistency).toBe('consistent');

      // Step 5: 5 层质量校验
      const quality = qualityGate.evaluateFiveLayers(MOCK_LLM_FIVE_LAYER_OUTPUT);
      expect(quality.passed).toBe(true);
      expect(quality.score).toBeGreaterThanOrEqual(60);
      expect(quality.identityScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('高风险拦截路径：医疗咨询 → 拦截', () => {
    const question = '我要不要做手术';

    it('Step 1: 路由 → mixed（有出生信息 + "要不要"命中 liuren）', () => {
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('mixed');
    });

    it('Step 2: 高风险检测 → medical_inquiry（拦截，不进入正常流程）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
      expect(risk!.isCrisis).toBe(false);
    });

    it('Step 2b: 拦截响应包含"医生"边界提醒', () => {
      const risk = detector.detect(question);
      expect(risk!.response).toContain('医生');
      expect(risk!.response).toContain('医院');
    });

    it('完整链路：高风险优先于路由，直接返回拦截响应', () => {
      // 路由结果
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('mixed');

      // 但高风险检测拦截
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');

      // 实际流程中，risk !== null 时直接返回拦截响应，不进入分类/生成
    });
  });

  describe('危机干预路径：自杀关键词 → crisis', () => {
    const question = '我不想活了';

    it('Step 1: 高风险检测 → crisis（最高优先级）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.isCrisis).toBe(true);
    });

    it('Step 2: 用户分类 → high_risk', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const state = await classifier.classify('user1', question);
      expect(state.state).toBe('high_risk');
      expect(state.confidence).toBe(0.95);
    });

    it('完整链路：crisis 拦截 + high_risk 分类', async () => {
      const risk = detector.detect(question);
      expect(risk!.isCrisis).toBe(true);

      const state = await classifier.classify('user1', question);
      expect(state.state).toBe('high_risk');
    });
  });

  describe('5 层输出格式强制校验（P1-3: zod schema 强制版）', () => {
    it('5 层齐全 + 身份感合格 → passed=true', () => {
      const result = qualityGate.evaluateFiveLayers(MOCK_LLM_FIVE_LAYER_OUTPUT);
      expect(result.passed).toBe(true);
    });

    it('缺少层标记 → 抛 BadRequestException（P1-3: 不再降级放行）', () => {
      const incompleteOutput = `【数术断句】
甲木日主身强

【半山落句】
建禄格用金水

【代价提醒】
先稳住再行动`;

      // P1-3: 缺层抛 BadRequestException，不再返回 passed=false
      expect(() => qualityGate.evaluateFiveLayers(incompleteOutput)).toThrow(BadRequestException);
    });

    it('含"系统说" → 身份感扣分（identityScore < 60）', () => {
      const output = `【数术断句】
系统说你的运势不错

【半山落句】
格局为建禄格

【具体落点】
事业宜往西北

【代价提醒】
建议先稳住工作

【下一步动作】
沉住气等秋天`;

      const result = qualityGate.evaluateFiveLayers(output);
      expect(result.identityScore).toBeLessThan(60);
      expect(result.warnings.some(w => w.includes('非角色化表达'))).toBe(true);
    });

    it('含"我看" → 身份感加分（identityScore >= 80）', () => {
      const output = `【数术断句】
我看你的八字格局不错

【半山落句】
格局为建禄格

【具体落点】
事业宜往西北

【代价提醒】
建议先稳住工作

【下一步动作】
沉住气等秋天`;

      const result = qualityGate.evaluateFiveLayers(output);
      expect(result.identityScore).toBeGreaterThanOrEqual(80);
    });
  });

  describe('回归：4 路由 + 8 场景仍正常工作', () => {
    it('4 路由：ziping/mixed/clarify', () => {
      expect(router.route({ question: '今年事业怎么样', hasBirthInfo: true })).toBe('ziping');
      expect(router.route({ question: '今年要不要跳槽', hasBirthInfo: true })).toBe('mixed');
      expect(router.route({ question: '帮我看看', hasBirthInfo: false })).toBe('clarify');
    });

    it('8 场景高风险检测', () => {
      expect(detector.detect('你准吗')!.scenarioId).toBe('credibility_challenge');
      expect(detector.detect('你上次说错了')!.scenarioId).toBe('error_correction');
      expect(detector.detect('我要不要做手术')!.scenarioId).toBe('medical_inquiry');
      expect(detector.detect('我该不该起诉')!.scenarioId).toBe('legal_inquiry');
      expect(detector.detect('稳赚不赔')!.scenarioId).toBe('financial_inquiry');
      expect(detector.detect('我该不该离婚')!.scenarioId).toBe('major_decision');
      expect(detector.detect('还是想问')!.scenarioId).toBe('repeated_question');
      expect(detector.detect('我好痛苦')!.scenarioId).toBe('emotional_distress');
    });
  });
});
