/**
 * L2.2 工程测试用例 T7 — 记忆触发
 *
 * 对应 line-02-pipeline.md 第 151 行：
 *   T7: 记忆触发（现金流 3 个月 → 创业时主动提醒）
 *
 * 验证点：
 * - UserMemoryService.searchRelevantMemory 能检索到历史现金流记录
 * - 当用户问创业相关问题时，创业时间线事件被命中
 * - 记忆摘要包含现金流相关信息
 *
 * 说明：
 * - 使用真实 UserMemoryService 实例 + mock PrismaService（模拟数据库返回）
 * - 当前 searchRelevantMemory 基于关键词匹配，无法语义关联"创业"与"现金流"
 * - "主动提醒"的触发逻辑（在创业咨询时自动注入提醒）尚未实现为独立服务
 */

import { UserMemoryService } from '../memory/user-memory.service';
import { createMockPrismaService } from './test-helpers';

describe('T7 — 记忆触发：现金流 3 个月 → 创业时主动提醒', () => {
  let memoryService: UserMemoryService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    memoryService = new UserMemoryService(mockPrisma as any);
  });

  describe('Given 用户 3 个月前咨询过现金流问题', () => {
    beforeEach(() => {
      // 模拟数据库中已有现金流咨询记录
      mockPrisma.userMemory.findUnique.mockResolvedValue({
        id: 'memory-1',
        userId: 'test-user',
        chartHistory: '{}',
        consultHistory: JSON.stringify([
          {
            date: '2026-03-15T10:00:00.000Z',
            question: '我最近现金流紧张，公司账上只能撑3个月，怎么办',
            judgment: '偏财运势偏弱，建议控制开支',
            cost: '现金流断裂风险',
            toolsUsed: ['bazi'],
          },
        ]),
        timelineEvents: JSON.stringify([
          {
            date: '2026-03',
            event: '创业',
            source: 'user_stated',
          },
        ]),
        insights: JSON.stringify([
          {
            date: '2026-03-15',
            insight: '用户现金流紧张，公司账上只能撑3个月',
            relatedEvents: ['finance'],
            confidence: 0.9,
          },
        ]),
      });
    });

    it('When 用户问"现金流紧张" → Then 检索到现金流咨询记录', async () => {
      const result = await memoryService.searchRelevantMemory(
        'test-user',
        '现金流紧张怎么办',
        { topK: 3 },
      );

      expect(result.hits.length).toBeGreaterThan(0);
      // 应命中包含"现金流"的记录
      const cashFlowHit = result.hits.find(h =>
        h.text.includes('现金流') || h.text.includes('撑3个月')
      );
      expect(cashFlowHit).toBeDefined();
    });

    it('When 用户问"创业" → Then 检索到创业时间线事件', async () => {
      const result = await memoryService.searchRelevantMemory(
        'test-user',
        '创业',
        { topK: 3, maxSummaryLength: 200 },
      );

      // "创业"命中时间线事件
      const timelineHit = result.hits.find(h => h.source === 'timeline');
      expect(timelineHit).toBeDefined();
      expect(timelineHit!.text).toContain('创业');
    });

    it('When 用户问"公司账上" → Then 检索到含"公司"的咨询记录', async () => {
      const result = await memoryService.searchRelevantMemory(
        'test-user',
        '公司账上',
        { topK: 3 },
      );

      // "公司"命中咨询记录（包含"公司账上"）
      const consultHit = result.hits.find(h => h.source === 'consult');
      expect(consultHit).toBeDefined();
      expect(consultHit!.text).toContain('公司');
    });
  });

  describe('Given 用户无历史记忆', () => {
    beforeEach(() => {
      mockPrisma.userMemory.findUnique.mockResolvedValue(null);
    });

    it('When 检索记忆 → Then 返回空结果', async () => {
      const result = await memoryService.searchRelevantMemory(
        'test-user',
        '创业',
        { topK: 3 },
      );

      expect(result.hits).toEqual([]);
      expect(result.summary).toBe('');
    });
  });

  describe('Given 记忆摘要生成', () => {
    beforeEach(() => {
      mockPrisma.userMemory.findUnique.mockResolvedValue({
        id: 'memory-1',
        userId: 'test-user',
        chartHistory: '{}',
        consultHistory: JSON.stringify([
          {
            date: '2026-03-15T10:00:00.000Z',
            question: '现金流紧张只能撑3个月',
            judgment: '建议控制开支',
            cost: '',
            toolsUsed: [],
          },
        ]),
        timelineEvents: '[]',
        insights: JSON.stringify([
          {
            date: '2026-03-15',
            insight: '现金流紧张',
            relatedEvents: ['finance'],
            confidence: 0.9,
          },
        ]),
      });
    });

    it('When 获取记忆摘要 → Then 包含上次咨询和认知洞察', async () => {
      const summary = await memoryService.getMemorySummary('test-user');
      expect(summary).toContain('上次咨询');
      expect(summary).toContain('现金流');
    });

    it('When 搜索"现金流" → Then 摘要包含现金流信息', async () => {
      const result = await memoryService.searchRelevantMemory(
        'test-user',
        '现金流',
        { topK: 3, maxSummaryLength: 200 },
      );
      expect(result.summary).toContain('现金流');
    });
  });

  describe('Given "主动提醒"触发逻辑', () => {
    // "创业时主动提醒现金流"需要 orchestrator 在生成回复时
    // 检索记忆并注入提醒文案，该逻辑尚未实现为独立可测服务
    // 当前 searchRelevantMemory 只提供检索能力，不主动触发提醒
    // 且当前基于关键词匹配，无法语义关联"创业"与"现金流"

    /**
     * SKIP 原因：orchestrator 的"记忆注入 + 主动提醒"逻辑尚未实现为独立可测服务；
     *           且当前 searchRelevantMemory 基于关键词匹配，无法语义关联"创业"与"现金流"。
     * 保留策略：保留 skip。本用例对应 line-02-pipeline.md T7 设计用例的"最后一公里"，
     *           底层记忆检索能力已由上方 it 覆盖并通过，删除会丢失设计意图文档化。
     * 解除条件：orchestrator 实现记忆注入逻辑 + 检索支持语义关联（embedding 或规则扩展）。
     * TODO: 待 orchestrator 实现记忆注入逻辑后补全断言
     * 负责人: L2-pipeline 维护者（待认领）
     * 关联文档: docs/03开发过程稿/已完成执行计划/line-02-pipeline.md T7
     *
     * 预期行为：
     *   1. orchestrator 调用 searchRelevantMemory(userId, "创业")
     *   2. 语义关联命中现金流记忆（需 embedding 或规则扩展）
     *   3. 在回复中注入提醒："3个月前你提到现金流只能撑3个月，现在情况如何？"
     */
    it.skip('When 用户问创业 + 有现金流记忆 → Then 主动生成提醒"3个月前你说现金流紧张"', async () => {
      // 占位：待记忆注入服务实现后补全断言
    });
  });
});
