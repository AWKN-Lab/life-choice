/**
 * L2.2 工程测试用例 T4 — 准确性质疑
 *
 * 对应 line-02-pipeline.md 第 148 行：
 *   T4: 用户问"你准不准" → 不争准，拉回具体事
 *
 * 验证点：
 * - "你准不准" 命中 credibility_challenge 场景
 * - 拦截响应不争论准确性，而是拉回具体问题
 * - 响应包含"问得越具体"或"先试一次"等引导语
 */

import { IntentRouterService } from '../orchestrator/intent-router.service';
import { HighRiskDetectorService } from '../safety/high-risk-detector.service';

describe('T4 — 准确性质疑：用户问"你准不准"', () => {
  let router: IntentRouterService;
  let detector: HighRiskDetectorService;

  beforeEach(() => {
    router = new IntentRouterService();
    detector = new HighRiskDetectorService();
  });

  describe('Given 用户问"你准不准"', () => {
    const question = '你准不准';

    it('When 高风险检测 → Then 命中 credibility_challenge 场景', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('credibility_challenge');
      expect(risk!.isCrisis).toBe(false);
    });

    it('When 拦截响应 → Then 不争论准确性（不含"我很准"等自夸）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      // 响应不应包含自夸语句
      expect(risk!.response).not.toMatch(/我很准|准确率\d+%/);
    });

    it('When 拦截响应 → Then 拉回具体事（包含"问得越具体"或"先试一次"）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      // 响应应引导用户问具体问题
      expect(
        risk!.response.includes('问得越具体') ||
        risk!.response.includes('先试一次')
      ).toBe(true);
    });

    it('When 拦截响应 → Then 说明命理是推演不是预言', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('推演');
    });
  });

  describe('Given 其他准确性质疑关键词', () => {
    it('When "你准吗" → Then 命中 credibility_challenge', () => {
      const risk = detector.detect('你准吗');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('credibility_challenge');
    });

    it('When "你算的准吗" → Then 命中 credibility_challenge', () => {
      const risk = detector.detect('你算的准吗');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('credibility_challenge');
    });

    it('When "可信吗" → Then 命中 credibility_challenge', () => {
      const risk = detector.detect('可信吗');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('credibility_challenge');
    });

    it('When "真的假的" → Then 命中 credibility_challenge', () => {
      const risk = detector.detect('真的假的');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('credibility_challenge');
    });

    it('When "骗人的吧" → Then 命中 credibility_challenge', () => {
      const risk = detector.detect('骗人的吧');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('credibility_challenge');
    });
  });

  describe('Given 路由行为', () => {
    it('When "你准不准" + 无出生信息 → Then 路由到 clarify', () => {
      const route = router.route({ question: '你准不准', hasBirthInfo: false });
      expect(route).toBe('clarify');
    });

    it('When "你准不准" + 有出生信息 → Then 路由到 ziping（无关键词命中，默认）', () => {
      const route = router.route({ question: '你准不准', hasBirthInfo: true });
      // "你准不准"不命中任何 ziping/liuren 关键词，hasBirthInfo=true → 默认 ziping
      // 但实际流程中高风险检测会优先拦截
      expect(route).toBe('ziping');
    });
  });
});
