/**
 * FourStepDecisionService 测试 - 四步决策模型
 *
 * 来源：天火吸收计划 E28 零测试门禁
 * 覆盖：buildPrompt（正常/边界/安全）+ validateResult（正常/异常）
 *
 * 注：当前源码 buildPrompt 使用 `用户问题：${input.userQuery}` 格式，
 * 未使用 <user_query>/<user_content> XML 标签，也未实现输入截断。
 * 测试用例根据实际源码行为编写。
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  FourStepDecisionService,
  FourStepInput,
  FourStepResult,
} from '../four-step.service';

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

  // ============ buildPrompt ============

  describe('buildPrompt - 正常输入', () => {
    it('应包含四步框架说明与用户问题', () => {
      // 正常：buildPrompt 应包含四步框架 + 用户问题
      const input: FourStepInput = { userQuery: '我该不该接受这份 offer？' };
      const prompt = service.buildPrompt(input);

      // 四步框架关键词
      expect(prompt).toContain('现状澄清');
      expect(prompt).toContain('选项生成');
      expect(prompt).toContain('优劣推演');
      expect(prompt).toContain('决策建议');

      // 用户问题
      expect(prompt).toContain('用户问题');
      expect(prompt).toContain('我该不该接受这份 offer？');
    });

    it('携带 context 与 mingliData 时一并写入 prompt', () => {
      // 正常：context 和 mingliData 应出现在 prompt 中
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
  });

  describe('buildPrompt - 边界输入', () => {
    it('空字符串 userQuery 应正常处理不抛错', () => {
      // 边界：空字符串
      const prompt = service.buildPrompt({ userQuery: '' });
      expect(prompt).toContain('<user_query>');
      // 空字符串应被原样保留
      expect(prompt).toContain('<user_query></user_query>');
    });

    it('未提供 context/mingliData 时不输出对应行', () => {
      // 边界：可选字段缺失
      const prompt = service.buildPrompt({ userQuery: '测试' });
      expect(prompt).not.toContain('<context>');
      expect(prompt).not.toContain('<mingli_data>');
    });

    it('超长输入应被截断（MAX_QUERY_LENGTH=2000）', () => {
      // 边界：超长输入 - 源码已实现 MAX_QUERY_LENGTH 截断
      const longQuery = 'A'.repeat(3000);
      const prompt = service.buildPrompt({ userQuery: longQuery });
      // 3000 字符应被截断为 2000 字符
      expect(prompt).toContain('A'.repeat(2000));
      expect(prompt).not.toContain(longQuery);
    });
  });

  describe('buildPrompt - 安全文案', () => {
    it('应包含边界声明文案', () => {
      // 安全：buildPrompt 应包含边界声明提示
      const input: FourStepInput = { userQuery: '测试查询' };
      const prompt = service.buildPrompt(input);

      // 源码在四步框架说明中包含边界声明要求
      expect(prompt).toContain('决策参考，请结合自身实际情况判断');
    });

    it('应要求 JSON 输出 FourStepResult 结构', () => {
      // 安全：输出格式约束
      const prompt = service.buildPrompt({ userQuery: 'x' });
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('FourStepResult');
    });
  });

  // ============ validateResult ============

  describe('validateResult - 正常结果', () => {
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

    it('合法结果应通过校验', () => {
      // 正常：validateResult 合法结果应通过
      const r = service.validateResult(validResult);
      expect(r.ok).toBe(true);
      expect(r.errors).toHaveLength(0);
    });
  });

  describe('validateResult - 异常结果', () => {
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

    it('缺少 step1.realIssue 应失败', () => {
      // 异常：validateResult 缺少 step1.realIssue 应失败
      const broken: FourStepResult = {
        ...validResult,
        step1Clarification: { realIssue: '', coreConflict: '', constraints: [] },
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('step1.realIssue'))).toBe(true);
    });

    it('step2 选项数 < 2 应失败', () => {
      // 异常：validateResult step2 选项数 < 2 应失败
      const broken: FourStepResult = {
        ...validResult,
        step2Options: [validResult.step2Options[0]],
        step3Analyses: [validResult.step3Analyses[0]],
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('step2 选项数'))).toBe(true);
    });

    it('step3 数量与 step2 不匹配应失败', () => {
      // 异常：validateResult step3 数量不匹配应失败
      const broken: FourStepResult = {
        ...validResult,
        step3Analyses: [validResult.step3Analyses[0]],
      };
      const r = service.validateResult(broken);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('step3 分析数量'))).toBe(true);
    });

    it('缺少 boundaryDisclaimer 应失败', () => {
      // 异常：validateResult 缺少 boundaryDisclaimer 应失败
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
});
