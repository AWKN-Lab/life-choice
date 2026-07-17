/**
 * L2.2 工程测试用例 T3 — 投资拦截
 *
 * 对应 line-02-pipeline.md 第 147 行：
 *   T3: 用户问投资"稳赚" → 先拦稳赚
 *
 * 验证点：
 * - "稳赚不赔" 命中 financial_inquiry 场景
 * - 拦截响应包含"稳赚不赔"是骗局的警告
 * - "这次投资" 命中 liuren 关键词 → mixed 路由
 * - 高风险检测优先于正常路由
 */

import { IntentRouterService } from '../orchestrator/intent-router.service';
import { HighRiskDetectorService } from '../safety/high-risk-detector.service';

describe('T3 — 投资拦截：用户问投资"稳赚"', () => {
  let router: IntentRouterService;
  let detector: HighRiskDetectorService;

  beforeEach(() => {
    router = new IntentRouterService();
    detector = new HighRiskDetectorService();
  });

  describe('Given 用户问"这个稳赚不赔的投资能不能做"', () => {
    const question = '这个稳赚不赔的投资能不能做';

    it('When 高风险检测 → Then 命中 financial_inquiry 场景', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('financial_inquiry');
      expect(risk!.isCrisis).toBe(false);
    });

    it('When 拦截响应 → Then 包含"稳赚不赔"是骗局的警告', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('稳赚不赔');
      expect(risk!.response).toContain('骗局');
    });

    it('When 拦截响应 → Then 提醒咨询持牌理财顾问', () => {
      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.response).toContain('理财顾问');
    });

    it('When 路由检测 → Then "投资"命中 liurenPatterns（但高风险优先拦截）', () => {
      // 即使路由会走 mixed，高风险检测应优先拦截
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('mixed');

      const risk = detector.detect(question);
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('financial_inquiry');
    });
  });

  describe('Given 其他金融投资关键词', () => {
    it('When "保本理财" → Then 命中 financial_inquiry', () => {
      const risk = detector.detect('保本理财');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('financial_inquiry');
    });

    it('When "翻倍收益" → Then 命中 financial_inquiry', () => {
      const risk = detector.detect('翻倍收益');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('financial_inquiry');
    });

    it('When "内幕消息" → Then 命中 financial_inquiry', () => {
      const risk = detector.detect('内幕消息');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('financial_inquiry');
    });

    it('When "全仓买入" → Then 命中 financial_inquiry', () => {
      const risk = detector.detect('全仓买入');
      expect(risk).not.toBeNull();
      expect(risk!.scenarioId).toBe('financial_inquiry');
    });
  });

  describe('Given 普通投资问题（不含稳赚关键词）', () => {
    it('When "这次投资能不能成" → Then 无高风险拦截', () => {
      const risk = detector.detect('这次投资能不能成');
      expect(risk).toBeNull();
    });

    it('When "今年投资运势" → Then 无高风险拦截', () => {
      const risk = detector.detect('今年投资运势');
      expect(risk).toBeNull();
    });
  });
});
