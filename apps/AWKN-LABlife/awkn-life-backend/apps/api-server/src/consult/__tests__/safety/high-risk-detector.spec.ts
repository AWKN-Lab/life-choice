/**
 * 高风险检测 + 4 段拦截测试
 *
 * 验证 HighRiskDetectorService 的拦截逻辑：
 * - 5 个现有场景（credibility_challenge/error_correction/major_decision/repeated_question/emotional_distress）
 * - 危机干预（crisis-keywords.ts）
 * - 3 个新增场景（medical_inquiry/legal_inquiry/financial_inquiry）— 待实现
 */

import { HighRiskDetectorService } from '../../safety/high-risk-detector.service';

describe('HighRiskDetectorService — 高风险检测', () => {
  let detector: HighRiskDetectorService;

  beforeEach(() => {
    detector = new HighRiskDetectorService();
  });

  describe('5 个现有场景', () => {
    it('credibility_challenge: "你准吗" → 可信度质疑', () => {
      const result = detector.detect('你准吗');
      expect(result).not.toBeNull();
      expect(result!.scenarioId).toBe('credibility_challenge');
    });

    it('error_correction: "你上次说错了" → 纠错反馈', () => {
      const result = detector.detect('你上次说错了');
      expect(result).not.toBeNull();
      expect(result!.scenarioId).toBe('error_correction');
    });

    it('major_decision: "我该不该离婚" → 重大决策请求', () => {
      const result = detector.detect('我该不该离婚');
      expect(result).not.toBeNull();
      expect(result!.scenarioId).toBe('major_decision');
    });

    it('repeated_question: "还是想问" → 重复追问', () => {
      const result = detector.detect('还是想问这件事');
      expect(result).not.toBeNull();
      expect(result!.scenarioId).toBe('repeated_question');
    });

    it('emotional_distress: "我好痛苦" → 情绪激动', () => {
      const result = detector.detect('我好痛苦');
      expect(result).not.toBeNull();
      expect(result!.scenarioId).toBe('emotional_distress');
    });
  });

  describe('危机干预', () => {
    it('自杀相关 → crisis（优先于场景规则）', () => {
      const result = detector.detect('我不想活了');
      expect(result).not.toBeNull();
      expect(result!.isCrisis).toBe(true);
    });

    it('自残相关 → crisis', () => {
      const result = detector.detect('我想伤害自己');
      expect(result).not.toBeNull();
      expect(result!.isCrisis).toBe(true);
    });
  });

  describe('安全输入（不应拦截）', () => {
    it('普通事业问题 → null', () => {
      const result = detector.detect('明年事业运势怎么样');
      expect(result).toBeNull();
    });

    it('普通感情问题 → null', () => {
      const result = detector.detect('我的感情运势如何');
      expect(result).toBeNull();
    });

    it('普通财运问题 → null', () => {
      const result = detector.detect('今年财运好不好');
      expect(result).toBeNull();
    });
  });

  describe('3 段新增场景', () => {
    describe('medical_inquiry — 医疗咨询', () => {
      it('"我要不要做手术" → 医疗咨询', () => {
        const result = detector.detect('我要不要做手术');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('medical_inquiry');
        expect(result!.isCrisis).toBe(false);
      });

      it('"这个病怎么治" → 医疗咨询', () => {
        const result = detector.detect('这个病怎么治');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('medical_inquiry');
      });

      it('"吃什么药" → 医疗咨询', () => {
        const result = detector.detect('吃什么药');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('medical_inquiry');
      });

      it('"化疗效果怎么样" → 医疗咨询', () => {
        const result = detector.detect('化疗效果怎么样');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('medical_inquiry');
      });

      it('"检查结果怎么看" → 医疗咨询', () => {
        const result = detector.detect('检查结果怎么看');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('medical_inquiry');
      });
    });

    describe('legal_inquiry — 法律咨询', () => {
      it('"我该不该起诉" → 法律咨询', () => {
        const result = detector.detect('我该不该起诉');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('legal_inquiry');
        expect(result!.isCrisis).toBe(false);
      });

      it('"合同纠纷怎么办" → 法律咨询', () => {
        const result = detector.detect('合同纠纷怎么办');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('legal_inquiry');
      });

      it('"离婚协议怎么签" → 法律咨询', () => {
        const result = detector.detect('离婚协议怎么签');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('legal_inquiry');
      });

      it('"官司能赢吗" → 法律咨询', () => {
        const result = detector.detect('官司能赢吗');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('legal_inquiry');
      });

      it('"律师费多少" → 法律咨询', () => {
        const result = detector.detect('律师费多少');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('legal_inquiry');
      });
    });

    describe('financial_inquiry — 金融投资咨询', () => {
      it('"稳赚不赔的投资" → 金融投资咨询', () => {
        const result = detector.detect('稳赚不赔的投资');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('financial_inquiry');
        expect(result!.isCrisis).toBe(false);
      });

      it('"保本理财" → 金融投资咨询', () => {
        const result = detector.detect('保本理财');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('financial_inquiry');
      });

      it('"翻倍收益" → 金融投资咨询', () => {
        const result = detector.detect('翻倍收益');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('financial_inquiry');
      });

      it('"内幕消息" → 金融投资咨询', () => {
        const result = detector.detect('内幕消息');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('financial_inquiry');
      });

      it('"全仓买入" → 金融投资咨询', () => {
        const result = detector.detect('全仓买入');
        expect(result).not.toBeNull();
        expect(result!.scenarioId).toBe('financial_inquiry');
      });
    });
  });
});
