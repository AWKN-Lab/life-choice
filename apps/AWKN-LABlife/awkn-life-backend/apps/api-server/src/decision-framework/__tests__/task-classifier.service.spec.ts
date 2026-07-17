/**
 * TaskClassifierService 测试 - L1-L4 任务分类
 *
 * 来源：天火吸收计划 E28 零测试门禁
 * L1 简单查询 / L2 常规咨询 / L3 复杂决策 / L4 人生重大决策
 * 覆盖：正常（各档位）+ 边界（空字符串/空白）+ 异常（优先级冲突）
 */
import { Test, TestingModule } from '@nestjs/testing';
import { TaskClassifierService, TaskLevel } from '../task-classifier.service';

describe('TaskClassifierService - L1-L4 任务分类', () => {
  let service: TaskClassifierService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [TaskClassifierService],
    }).compile();
    service = moduleRef.get(TaskClassifierService);
  });

  afterAll(() => moduleRef.close());

  // ============ 正常：各档位分类 ============

  describe('classify - 正常输入（各档位）', () => {
    const cases: Array<{ query: string; expected: TaskLevel; label: string }> = [
      { query: '今天穿什么颜色好', expected: 'L1', label: 'L1 简单查询' },
      { query: '今年事业运势怎么样', expected: 'L2', label: 'L2 常规咨询' },
      { query: '两个 offer 我该怎么选', expected: 'L3', label: 'L3 复杂决策' },
      { query: '我该不该辞职去创业', expected: 'L4', label: 'L4 人生重大决策' },
    ];

    for (const c of cases) {
      it(`${c.label}：「${c.query}」 → ${c.expected}`, () => {
        // 正常：各档位关键词命中
        const r = service.classify(c.query);
        expect(r.level).toBe(c.expected);
        expect(r.reason).toBeTruthy();
        expect(r.responseStrategy).toBeTruthy();
      });
    }

    it('返回的 reason 与 responseStrategy 应为非空字符串', () => {
      // 正常：返回结构完整性
      const r = service.classify('今年财运');
      expect(typeof r.reason).toBe('string');
      expect(typeof r.responseStrategy).toBe('string');
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.responseStrategy.length).toBeGreaterThan(0);
    });
  });

  // ============ 边界：空字符串/空白/未匹配 ============

  describe('classify - 边界输入', () => {
    it('空字符串应走 fallback → L2', () => {
      // 边界：空字符串
      const r = service.classify('');
      expect(r.level).toBe('L2');
      expect(r.reason).toContain('默认');
    });

    it('纯空白字符应被 trim 后走 fallback → L2', () => {
      // 边界：纯空白
      const r = service.classify('   \t\n  ');
      expect(r.level).toBe('L2');
    });

    it('未匹配任何关键词时应默认 L2', () => {
      // 边界：未匹配关键词
      const r = service.classify('随便聊聊天气');
      expect(r.level).toBe('L2');
      expect(r.reason).toContain('默认');
    });

    it('前后空白应被 trim 后再匹配关键词', () => {
      // 边界：trim 行为
      const r = service.classify('   今天适合搬家吗   ');
      expect(r.level).toBe('L1');
    });
  });

  // ============ 异常：优先级冲突 ============

  describe('classify - 优先级冲突（异常场景）', () => {
    it('L4 优先级应高于 L3/L2/L1（同时命中多档关键词）', () => {
      // 异常：多档关键词同时命中，应按 L4 > L3 > L2 > L1 优先级
      // 「辞职」(L4) + 「今年」(L2) → 应判 L4
      expect(service.classify('今年想辞职').level).toBe('L4');
    });

    it('L3 优先级应高于 L2/L1（同时命中多档关键词）', () => {
      // 异常：L3 > L2/L1
      // 「选择」(L3) + 「今天」(L1) → 应判 L3
      expect(service.classify('今天面对两个选择').level).toBe('L3');
    });

    it('L2 优先级应高于 L1（同时命中多档关键词）', () => {
      // 异常：L2 > L1
      // 「今年」(L2) + 「今天」(L1) → 应判 L2
      expect(service.classify('今天今年都适合吗').level).toBe('L2');
    });
  });

  // ============ 关键词命中验证 ============

  describe('classify - 关键词命中验证', () => {
    it('L1 关键词「今天」命中 → L1', () => {
      expect(service.classify('今天适合出门吗').level).toBe('L1');
    });

    it('L2 关键词「财运」命中 → L2', () => {
      expect(service.classify('我今年的财运如何').level).toBe('L2');
    });

    it('L3 关键词「该不该」命中 → L3', () => {
      expect(service.classify('我该不该接受这个 offer').level).toBe('L3');
    });

    it('L4 关键词「辞职」命中 → L4', () => {
      expect(service.classify('想辞职很久了').level).toBe('L4');
    });
  });
});
