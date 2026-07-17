/**
 * L2.2 工程测试用例 T6 — 医疗边界
 *
 * 对应 line-02-pipeline.md 第 150 行：
 *   T6: 高风险医疗"我要不要手术" → 先边界，提醒找医生
 *
 * 验证点：
 * - "我要不要做手术" 命中 medical_inquiry 场景
 * - 拦截响应设定边界（命理不能替代医学诊断）
 * - 响应提醒用户找专业医生
 */

import { HighRiskDetectorService } from '../safety/high-risk-detector.service';
import { IntentRouterService } from '../orchestrator/intent-router.service';

describe('T6 — 医疗边界：高风险医疗"我要不要手术"', () => {
  let detector: HighRiskDetectorService;
  let router: IntentRouterService;

  beforeEach(() => {
    detector = new HighRiskDetectorService();
    router = new IntentRouterService();
  });

  describe('Given 用户问"我要不要做手术"', () => {
    const question = '我要不要做手术';

    it('When 高风险检测 → Then 命中 medical_inquiry 场景', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
      expect(risk!.isCrisis).toBe(false);
    });

    it('When 拦截响应 → Then 设定边界（命理不能替代医学诊断）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('命理');
      expect(
        risk!.response.includes('不能替代') ||
        risk!.response.includes('不能替你')
      ).toBe(true);
    });

    it('When 拦截响应 → Then 提醒找专业医生', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('医生');
    });

    it('When 拦截响应 → Then 建议去正规医院', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('医院');
    });

    it('When 拦截响应 → Then 重大治疗建议多看几位专家', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('专家');
    });
  });

  describe('Given 其他医疗咨询关键词', () => {
    it('When "这个病怎么治" → Then 命中 medical_inquiry', () => {
      const risk = detector.detect('这个病怎么治');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });

    it('When "吃什么药" → Then 命中 medical_inquiry', () => {
      const risk = detector.detect('吃什么药');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });

    it('When "化疗效果怎么样" → Then 命中 medical_inquiry', () => {
      const risk = detector.detect('化疗效果怎么样');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });

    it('When "检查结果怎么看" → Then 命中 medical_inquiry', () => {
      const risk = detector.detect('检查结果怎么看');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });

    it('When "能不能治好" → Then 命中 medical_inquiry', () => {
      const risk = detector.detect('能不能治好');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });
  });

  describe('Given 路由行为（医疗问题仍会被路由，但高风险优先拦截）', () => {
    it('When "我要不要做手术" + 有出生信息 → Then 路由到 mixed（"要不要"命中 liuren）', () => {
      const route = router.route({ question: '我要不要做手术', hasBirthInfo: true });
      expect(route).toBe('mixed');
      // 但实际流程中 high-risk 检测会优先拦截
      const risk = detector.detect('我要不要做手术');
      expect(risk!.scenarioId).toBe('medical_inquiry');
    });

    it('When "我要不要做手术" + 无出生信息 → Then 路由到 clarify', () => {
      const route = router.route({ question: '我要不要做手术', hasBirthInfo: false });
      expect(route).toBe('clarify');
    });
  });
});
