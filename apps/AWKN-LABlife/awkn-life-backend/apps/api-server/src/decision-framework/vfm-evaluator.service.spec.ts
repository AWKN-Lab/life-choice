import { Test, TestingModule } from '@nestjs/testing';
import {
  VfmEvaluatorService,
  VFMScore,
  VFM_WEIGHTS,
} from './vfm-evaluator.service';

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

  describe('evaluate - 正常输入', () => {
    it('V/F/M 各项在 0-10 范围内应正常返回评估结果', () => {
      const score: VFMScore = { value: 7, feasibility: 6, match: 8 };
      const r = service.evaluate(score);
      expect(r.value).toBe(7);
      expect(r.feasibility).toBe(6);
      expect(r.match).toBe(8);
      expect(r.weightedScore).toBeGreaterThanOrEqual(0);
      expect(r.weightedScore).toBeLessThanOrEqual(10);
    });

    it('应回填原三项分数', () => {
      const r = service.evaluate({ value: 5, feasibility: 5, match: 5 });
      expect(r).toMatchObject({ value: 5, feasibility: 5, match: 5 });
    });
  });

  describe('evaluate - 加权计算正确性', () => {
    it('加权得分 = V*0.3 + F*0.3 + M*0.4', () => {
      const score: VFMScore = { value: 8, feasibility: 6, match: 10 };
      const expected =
        8 * VFM_WEIGHTS.value +
        6 * VFM_WEIGHTS.feasibility +
        10 * VFM_WEIGHTS.match;
      const r = service.evaluate(score);
      expect(r.weightedScore).toBe(Number(expected.toFixed(2)));
    });

    it('权重常量符合 V0.3/F0.3/M0.4', () => {
      expect(VFM_WEIGHTS.value).toBe(0.3);
      expect(VFM_WEIGHTS.feasibility).toBe(0.3);
      expect(VFM_WEIGHTS.match).toBe(0.4);
    });

    it('M 权重(0.4)高于 V/F(0.3)，权重常量符合设计', () => {
      // 注意：M 权重高不代表 M 满分时总分更高
      // （例如 V=10,F=10,M=0 得分 6；V=0,F=0,M=10 得分 4）
      // 这里验证权重常量本身的比例关系
      expect(VFM_WEIGHTS.match).toBeGreaterThan(VFM_WEIGHTS.value);
      expect(VFM_WEIGHTS.match).toBeGreaterThan(VFM_WEIGHTS.feasibility);
      expect(VFM_WEIGHTS.value).toBe(VFM_WEIGHTS.feasibility);
    });
  });

  describe('evaluate - 边界值', () => {
    it('全 0 时加权得分为 0', () => {
      const r = service.evaluate({ value: 0, feasibility: 0, match: 0 });
      expect(r.weightedScore).toBe(0);
    });

    it('全 10 时加权得分为 10', () => {
      const r = service.evaluate({ value: 10, feasibility: 10, match: 10 });
      expect(r.weightedScore).toBe(10);
    });
  });

  describe('evaluate - 异常输入', () => {
    it('value 超出 10 应抛错', () => {
      expect(() =>
        service.evaluate({ value: 11, feasibility: 5, match: 5 }),
      ).toThrow(/VFM value 必须在 0-10/);
    });

    it('feasibility 为负数应抛错', () => {
      expect(() =>
        service.evaluate({ value: 5, feasibility: -1, match: 5 }),
      ).toThrow(/VFM feasibility 必须在 0-10/);
    });

    it('match 为非数字应抛错', () => {
      expect(() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.evaluate({ value: 5, feasibility: 5, match: 'x' as any }),
      ).toThrow(/VFM match 必须在 0-10/);
    });
  });

  describe('rank - 多选项排序', () => {
    it('按加权得分降序排列', () => {
      const scores = [
        { id: 'A', score: { value: 3, feasibility: 3, match: 3 } },
        { id: 'B', score: { value: 10, feasibility: 10, match: 10 } },
        { id: 'C', score: { value: 6, feasibility: 6, match: 6 } },
      ];
      const ranked = service.rank(scores);
      expect(ranked.map((r) => r.id)).toEqual(['B', 'C', 'A']);
    });
  });
});
