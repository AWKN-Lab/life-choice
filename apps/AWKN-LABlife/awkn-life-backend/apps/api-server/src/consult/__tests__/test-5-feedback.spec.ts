/**
 * L2.2 工程测试用例 T5 — 反馈处理
 *
 * 对应 line-02-pipeline.md 第 149 行：
 *   T5: 用户反馈"上次说的不对" → 不防御，先问变化
 *
 * 验证点：
 * - "你上次说错了" 命中 error_correction 场景
 * - 拦截响应不防御（不辩解"我没错"），而是承认可能不准
 * - 响应引导用户说明"有什么变化"
 */

import { HighRiskDetectorService } from '../safety/high-risk-detector.service';
import { IntentRouterService } from '../orchestrator/intent-router.service';

describe('T5 — 反馈处理：用户反馈"上次说的不对"', () => {
  let detector: HighRiskDetectorService;
  let router: IntentRouterService;

  beforeEach(() => {
    detector = new HighRiskDetectorService();
    router = new IntentRouterService();
  });

  describe('Given 用户反馈"你上次说错了"', () => {
    const question = '你上次说错了';

    it('When 高风险检测 → Then 命中 error_correction 场景', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('error_correction');
      expect(risk!.isCrisis).toBe(false);
    });

    it('When 拦截响应 → Then 不防御（不含"我没错"等辩解）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      // 响应不应包含辩解语句
      expect(risk!.response).not.toMatch(/我没错|我没有说错|你听错了/);
    });

    it('When 拦截响应 → Then 承认可能不准', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      // 响应应承认"可能不够准确"
      expect(
        risk!.response.includes('可能不够准确') ||
        risk!.response.includes('可能不准确')
      ).toBe(true);
    });

    it('When 拦截响应 → Then 引导用户说明变化（包含"变化"）', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('变化');
    });

    it('When 拦截响应 → Then 提出重新审视的三个步骤', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      // 响应应包含三个审视步骤
      expect(risk!.response).toContain('上次我基于什么信息');
      expect(risk!.response).toContain('现在有什么新的变化');
      expect(risk!.response).toContain('之前的结论哪里出了偏差');
    });
  });

  describe('Given 其他纠错反馈关键词', () => {
    it('When "你说错了" → Then 命中 error_correction', () => {
      const risk = detector.detect('你说错了');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('error_correction');
    });

    it('When "上次不准" → Then 命中 credibility_challenge（"不准"关键词优先匹配）', () => {
      const risk = detector.detect('上次不准');
      expect(risk).not.toBeNull();
      // 注："不准"是 credibility_challenge 的关键词，规则顺序在 error_correction 之前
      expect(risk!.scenarioId).toBe('credibility_challenge');
    });

    it('When "跟上次不一样" → Then 命中 error_correction', () => {
      const risk = detector.detect('跟上次不一样');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('error_correction');
    });

    it('When "你之前说的" → Then 命中 error_correction', () => {
      const risk = detector.detect('你之前说的不对');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('error_correction');
    });
  });

  describe('Given 路由行为', () => {
    it('When "你上次说错了" + 无出生信息 → Then 路由到 clarify', () => {
      const route = router.route({ question: '你上次说错了', hasBirthInfo: false });
      expect(route).toBe('clarify');
    });
  });
});
