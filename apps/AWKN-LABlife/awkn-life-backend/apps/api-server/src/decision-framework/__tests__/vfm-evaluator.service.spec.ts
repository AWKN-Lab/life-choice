/**
 * VfmEvaluatorService 测试 - VFM 加权评估模型
 *
 * 来源：天火吸收计划 E28 零测试门禁
 * 公式：V*0.3 + F*0.3 + M*0.4
 * 覆盖：evaluate（正常/边界/异常）+ rank（正常）
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  VfmEvaluatorService,
  VFMScore,
  VFM_WEIGHTS,
} from '../vfm-evaluator.service';

describe('VfmEvaluatorService - VFM 加权评估模型', () => {
  let service: VfmEvaluatorService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [VfmEvaluatorService],
    }).compile();
    service = moduleRef.get(VfmEvaluatorService);
  });

  afterAll(() => moduleRef.close());

  // ============ evaluate - 正常输入 ============

  describe('evaluate - 正常输入', () => {
    it('V/F/M 各项在 0-10 范围内应返回正确加权得分', () => {
      // 正常：标准输入应正确计算
      const score: VFMScore = { value: 8, feasibility: 6, match: 10 };
      const r = service.evaluate(score);

      // 加权得分 = 8*0.3 + 6*0.3 + 10*0.4 = 2.4 + 1.8 + 4 = 8.2
      const expected =
        8 * VFM_WEIGHTS.value +
        6 * VFM_WEIGHTS.feasibility +
        10 * VFM_WEIGHTS.match;
      expect(r.weightedScore).toBe(Number(expected.toFixed(2)));
      expect(r.weightedScore).toBe(8.2);
    });

    it('应回填原三项分数到返回对象', () => {
      const score: VFMScore = { value: 7, feasibility: 6, match: 8 };
      const r = service.evaluate(score);
      expect(r.value).toBe(7);
      expect(r.feasibility).toBe(6);
      expect(r.match).toBe(8);
    });

    it('M 权重(0.4)高于 V/F(0.3)，权重常量符合设计', () => {
      // 正常：验证权重设计意图
      // 注意：M 权重高不代表 M 满分时总分更高
      // （例如 V=10,F=10,M=0 得分 6；V=0,F=0,M=10 得分 4）
      // 这里只验证权重常量本身的比例关系
      expect(VFM_WEIGHTS.match).toBeGreaterThan(VFM_WEIGHTS.value);
      expect(VFM_WEIGHTS.match).toBeGreaterThan(VFM_WEIGHTS.feasibility);
      expect(VFM_WEIGHTS.value).toBe(VFM_WEIGHTS.feasibility);
    });
  });

  // ============ evaluate - 边界值 ============

  describe('evaluate - 边界值', () => {
    it('全 0 时加权得分为 0', () => {
      // 边界：下界
      const r = service.evaluate({ value: 0, feasibility: 0, match: 0 });
      expect(r.weightedScore).toBe(0);
    });

    it('全 10 时加权得分为 10', () => {
      // 边界：上界
      const r = service.evaluate({ value: 10, feasibility: 10, match: 10 });
      expect(r.weightedScore).toBe(10);
    });

    it('加权得分应四舍五入到 2 位小数', () => {
      // 边界：浮点精度处理
      // 7*0.3 + 7*0.3 + 7*0.4 = 2.1 + 2.1 + 2.8 = 7.0
      const r = service.evaluate({ value: 7, feasibility: 7, match: 7 });
      expect(r.weightedScore).toBe(7);
      // 验证 toFixed(2) 行为：小数位数不超过 2
      const decimalPart = (r.weightedScore.toString().split('.')[1] || '').length;
      expect(decimalPart).toBeLessThanOrEqual(2);
    });
  });

  // ============ evaluate - 异常输入 ============

  describe('evaluate - 异常输入', () => {
    it('value 超出 10 应抛错', () => {
      // 异常：上界越界
      expect(() =>
        service.evaluate({ value: 11, feasibility: 5, match: 5 }),
      ).toThrow(/VFM value 必须在 0-10/);
    });

    it('feasibility 为负数应抛错', () => {
      // 异常：下界越界
      expect(() =>
        service.evaluate({ value: 5, feasibility: -1, match: 5 }),
      ).toThrow(/VFM feasibility 必须在 0-10/);
    });

    it('match 为非数字应抛错', () => {
      // 异常：类型错误
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.evaluate({ value: 5, feasibility: 5, match: 'x' as any }),
      ).toThrow(/VFM match 必须在 0-10/);
    });

    it('value 超出 10 时错误信息应包含当前值', () => {
      // 异常：错误信息可读性
      try {
        service.evaluate({ value: 99, feasibility: 5, match: 5 });
        fail('应抛错但未抛');
      } catch (err: any) {
        expect(err.message).toContain('99');
      }
    });
  });

  // ============ rank - 多选项排序 ============

  describe('rank - 多选项排序', () => {
    it('应按加权得分降序排列', () => {
      // 正常：rank 排序
      const scores = [
        { id: 'A', score: { value: 3, feasibility: 3, match: 3 } },
        { id: 'B', score: { value: 10, feasibility: 10, match: 10 } },
        { id: 'C', score: { value: 6, feasibility: 6, match: 6 } },
      ];
      const ranked = service.rank(scores);
      expect(ranked.map((r) => r.id)).toEqual(['B', 'C', 'A']);
    });

    it('空数组输入应返回空数组', () => {
      // 边界：空数组
      const ranked = service.rank([]);
      expect(ranked).toEqual([]);
    });

    it('rank 结果应包含 evaluation 对象', () => {
      // 正常：返回结构完整性
      const ranked = service.rank([
        { id: 'X', score: { value: 5, feasibility: 5, match: 5 } },
      ]);
      expect(ranked[0].id).toBe('X');
      expect(ranked[0].evaluation).toBeDefined();
      expect(ranked[0].evaluation.weightedScore).toBeDefined();
    });
  });
});
