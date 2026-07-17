/**
 * L2.2 工程测试用例 T1 — 大词追问
 *
 * 对应 line-02-pipeline.md 第 145 行：
 *   T1: 用户只问大词"我想看事业" → 先追问事业落点
 *
 * 验证点：
 * - "我想看事业" 命中 ziping 关键词"事业"
 * - 有出生信息 → 路由到 ziping
 * - 无出生信息 → 路由到 clarify（先补全信息）
 * - 大词问题分类为 casual（问题模糊、无背景）
 * - "先追问事业落点"的具体追问逻辑尚未实现为独立服务，标记 skip
 */

import { IntentRouterService } from '../orchestrator/intent-router.service';
import { HighRiskDetectorService } from '../safety/high-risk-detector.service';
import { UserStateClassifierService } from '../classifier/user-state-classifier.service';
import { createMockUserMemoryService } from './test-helpers';

describe('T1 — 大词追问：用户只问"我想看事业"', () => {
  let router: IntentRouterService;
  let detector: HighRiskDetectorService;
  let classifier: UserStateClassifierService;
  let mockMemory: ReturnType<typeof createMockUserMemoryService>;

  beforeEach(() => {
    router = new IntentRouterService();
    detector = new HighRiskDetectorService();
    mockMemory = createMockUserMemoryService();
    mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
    classifier = new UserStateClassifierService(mockMemory as any);
  });

  describe('Given 用户只问大词"我想看事业"', () => {
    const question = '我想看事业';

    it('When 有出生信息 → Then 路由到 ziping（"事业"命中 zipingPatterns）', () => {
      const route = router.route({ question, hasBirthInfo: true });
      expect(route).toBe('ziping');
    });

    it('When 无出生信息 → Then 路由到 clarify（先补全出生信息）', () => {
      const route = router.route({ question, hasBirthInfo: false });
      expect(route).toBe('clarify');
    });

    it('When 高风险检测 → Then 无高风险（大词不是高风险场景）', () => {
      const risk = detector.detect(question);
      expect(risk).toBeNull();
    });

    it('When 用户分类 → Then casual（问题模糊、无背景、无情绪词）', async () => {
      const result = await classifier.classify('user1', question);
      expect(result.state).toBe('casual');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('Given 大词追问应触发"先追问事业落点"', () => {
    // 当前 IntentRouterService 只做路由，不做追问生成
    // "先追问事业落点"需要 orchestrator/followup 层根据 casual 状态生成追问
    // 该逻辑尚未实现为独立可测服务，标记 skip

    /**
     * SKIP 原因：当前 IntentRouterService 只做路由，"大词追问生成"逻辑
     *           （检测大词无落点 → 生成追问）尚未实现为独立可测服务。
     * 保留策略：保留 skip。本用例对应 line-02-pipeline.md T1 设计用例的"最后一公里"，
     *           底层路由/分类能力已由上方 4 个 it 覆盖并通过，删除会丢失设计意图文档化。
     * 解除条件：orchestrator/followup 层实现"大词检测 + casual 状态追问生成"独立服务。
     * TODO: 待 orchestrator 实现大词检测 + 追问生成后补全断言
     * 负责人: L2-pipeline 维护者（待认领）
     * 关联文档: docs/03开发过程稿/已完成执行计划/line-02-pipeline.md T1
     *
     * 预期行为：检测到"事业"是大词（无落点），生成追问如
     *   "事业范围很广——你关心的是升职、跳槽、还是创业？"
     */
    it.skip('When casual 状态 + 大词"事业" → Then 生成追问"事业具体指哪方面"', () => {
      // 占位：待追问生成服务实现后补全断言
    });
  });
});
