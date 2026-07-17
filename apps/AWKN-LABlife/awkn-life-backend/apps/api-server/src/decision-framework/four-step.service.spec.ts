import { Test, TestingModule } from '@nestjs/testing';
import {
  FourStepDecisionService,
  FourStepInput,
  FourStepResult,
} from './four-step.service';

describe('FourStepDecisionService - 四步决策模型', () => {
  let service: FourStepDecisionService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [FourStepDecisionService],
    }).compile();
    service = moduleRef.get(FourStepDecisionService);
  });

  afterAll(() => moduleRef.close());

  describe('buildPrompt', () => {
    it('输出包含用户查询', () => {
      const input: FourStepInput = { userQuery: '我该不该接受这份 offer？' };
      const prompt = service.buildPrompt(input);
      expect(prompt).toContain('我该不该接受这份 offer？');
      expect(prompt).toContain('用户问题');
    });

    it('携带 context 与 mingliData 时一并写入 prompt', () => {
      const input: FourStepInput = {
        userQuery: '今年适合创业吗',
        context: { budget: 50 },
        mingliData: { dayMaster: '甲木' },
      };
      const prompt = service.buildPrompt(input);
      expect(prompt).toContain('<context>');
      expect(prompt).toContain('"budget":50');
      expect(prompt).toContain('<mingli_data>');
      expect(prompt).toContain('"dayMaster":"甲木"');
    });

    it('未提供 context/mingliData 时不输出对应行', () => {
      const prompt = service.buildPrompt({ userQuery: '测试' });
      expect(prompt).not.toContain('<context>');
      expect(prompt).not.toContain('<mingli_data>');
    });
  });

  describe('validateResult', () => {
    const validResult: FourStepResult = {
      step1Clarification: {
        realIssue: '真实矛盾',
        coreConflict: '核心冲突',
        constraints: ['约束1'],
      },
      step2Options: [
        { id: 'A', title: '选项A', description: 'desc A' },
        { id: 'B', title: '选项B', description: 'desc B' },
      ],
      step3Analyses: [
        {
          optionId: 'A',
          pros: ['p1'],
          cons: ['c1'],
          timeHorizon: '短期',
          resourceCost: '低',
          riskLevel: 'low',
        },
        {
          optionId: 'B',
          pros: ['p2'],
          cons: ['c2'],
          timeHorizon: '长期',
          resourceCost: '高',
          riskLevel: 'high',
        },
      ],
      step4Recommendation: {
        preferredOptionId: 'A',
        rationale: '理由',
        boundaryDisclaimer: '决策参考，请结合自身实际情况判断',
      },
    };

    it('完整 4 步结果应通过校验', () => {
      const r = service.validateResult(validResult);
      expect(r.ok).toBe(true);
      expect(r.errors).toHaveLength(0);
    });

    it('缺失 step1.realIssue 时返回 false 并报错', () => {
      const broken: FourStepResult = {
        ...validResult,
        step1Clarification: { realIssue: '', coreConflict: '', constraints: [] },
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('step1.realIssue'))).toBe(true);
    });

    it('step2 选项数 < 2 时返回 false', () => {
      const broken: FourStepResult = {
        ...validResult,
        step2Options: [validResult.step2Options[0]],
        step3Analyses: [validResult.step3Analyses[0]],
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('step2 选项数'))).toBe(true);
    });

    it('step3 分析数量与 step2 不匹配时返回 false', () => {
      const broken: FourStepResult = {
        ...validResult,
        step3Analyses: [validResult.step3Analyses[0]],
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('step3 分析数量'))).toBe(true);
    });

    it('step4 缺少边界声明时返回 false', () => {
      const broken: FourStepResult = {
        ...validResult,
        step4Recommendation: {
          preferredOptionId: 'A',
          rationale: '理由',
          boundaryDisclaimer: '',
        },
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('边界声明'))).toBe(true);
    });
  });

  describe('四步流程端到端（buildPrompt → 模拟 LLM 输出 → validateResult）', () => {
    it('buildPrompt 产出的 prompt 经模拟 4 步结果后通过校验', () => {
      const input: FourStepInput = {
        userQuery: '我该不该辞职去创业',
        context: { age: 30 },
      };
      const prompt = service.buildPrompt(input);
      expect(prompt).toContain('辞职去创业');

      const simulated: FourStepResult = {
        step1Clarification: {
          realIssue: '稳定收入 vs 自我实现',
          coreConflict: '风险承受力不足',
          constraints: ['房贷'],
        },
        step2Options: [
          { id: 'A', title: '保留主业副业试水', description: '低风险' },
          { id: 'B', title: '全职创业', description: '高风险高回报' },
        ],
        step3Analyses: [
          {
            optionId: 'A',
            pros: ['收入稳定'],
            cons: ['推进慢'],
            timeHorizon: '1-2 年',
            resourceCost: '低',
            riskLevel: 'low',
          },
          {
            optionId: 'B',
            pros: ['全力投入'],
            cons: ['收入断档'],
            timeHorizon: '6-12 月',
            resourceCost: '高',
            riskLevel: 'high',
          },
        ],
        step4Recommendation: {
          preferredOptionId: 'A',
          rationale: '先副业验证',
          boundaryDisclaimer: '决策参考，请结合自身实际情况判断',
        },
      };
      const r = service.validateResult(simulated);
      expect(r.ok).toBe(true);
    });
  });
});
