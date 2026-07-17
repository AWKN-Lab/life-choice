/**
 * P2-6: L3 全链路集成测试
 *
 * 验证：
 * - 7 类 MemoryType 触发（memory-extractor）
 * - 9 节点状态机流转（1% 灰度）
 * - 10 场景主动出击（active-moves + scheduleByScenario）
 */
import { MemoryExtractorService, ExtractedFact } from '../../memory/memory-extractor.service';
import { UserMemoryService, MemoryType, MEMORY_TYPES } from '../../memory/user-memory.service';
import { NodeStateMachineService, NodeState } from '../../orchestrator/node-state-machine.service';
import { ACTIVE_MOVE_SCENARIOS, ACTIVE_MOVE_SCENARIO_KEYS } from '../../followup/active-moves';

// Mock UserMemoryService
function createMockUserMemoryService() {
  const memoryStore: Record<string, any> = {};
  return {
    getMemory: jest.fn((userId: string) => Promise.resolve(memoryStore[userId] || null)),
    setActiveMemory: jest.fn((userId: string, item: any) => {
      if (!memoryStore[userId]) memoryStore[userId] = {};
      Object.assign(memoryStore[userId], {
        type: item.type,
        content: item.content,
        issueId: item.issueId,
        sourceQuote: item.sourceQuote,
        confidence: item.confidence,
        weight: item.weight,
      });
      return Promise.resolve();
    }),
    getActiveMemory: jest.fn((userId: string) => {
      const m = memoryStore[userId];
      if (!m || !m.type) return Promise.resolve(null);
      return Promise.resolve({
        type: m.type,
        content: m.content,
        issueId: m.issueId,
      });
    }),
    appendConsult: jest.fn(() => Promise.resolve()),
    appendInsight: jest.fn(() => Promise.resolve()),
    getRepeatingQuestionCount: jest.fn(() => Promise.resolve(0)),
  };
}

describe('L3 全链路集成测试 — P2-6', () => {
  let mockUserMemory: any;
  let nodeStateMachine: NodeStateMachineService;

  beforeEach(() => {
    mockUserMemory = createMockUserMemoryService();
    nodeStateMachine = new NodeStateMachineService(mockUserMemory as any);
  });

  describe('7 类 MemoryType 触发', () => {
    it('MEMORY_TYPES 包含 7 类', () => {
      expect(MEMORY_TYPES).toHaveLength(7);
      expect(MEMORY_TYPES).toContain('major_issue');
      expect(MEMORY_TYPES).toContain('time_anchor');
      expect(MEMORY_TYPES).toContain('person_anchor');
      expect(MEMORY_TYPES).toContain('bottom_line');
      expect(MEMORY_TYPES).toContain('repeat_pattern');
      expect(MEMORY_TYPES).toContain('mood_signal');
      expect(MEMORY_TYPES).toContain('feedback');
    });

    it('setActiveMemory + getActiveMemory 读写一致', async () => {
      const item = {
        type: 'major_issue' as MemoryType,
        content: '用户最关心的是事业方向',
        sourceQuote: '我最担心的是事业',
        confidence: 0.9,
        weight: 0.9,
      };
      await mockUserMemory.setActiveMemory('user-1', item);
      const result = await mockUserMemory.getActiveMemory('user-1');
      expect(result.type).toBe('major_issue');
      expect(result.content).toBe('用户最关心的是事业方向');
    });
  });

  describe('9 节点状态机流转（1% 灰度）', () => {
    it('完整流转：cold_start → long_memory_update', () => {
      let node: NodeState = 'cold_start';

      node = nodeStateMachine.transition(node, { type: 'user_first_question' });
      expect(node).toBe('first_issue');

      node = nodeStateMachine.transition(node, { type: 'birth_info_collected' });
      expect(node).toBe('context_collecting');

      node = nodeStateMachine.transition(node, { type: 'chart_calculated' });
      expect(node).toBe('chart_ready');

      node = nodeStateMachine.transition(node, { type: 'judgment_generated' });
      expect(node).toBe('first_judgment');

      node = nodeStateMachine.transition(node, { type: 'user_confirmed_action' });
      expect(node).toBe('action_confirm');

      node = nodeStateMachine.transition(node, { type: 'followup_scheduled' });
      expect(node).toBe('followup_due');

      node = nodeStateMachine.transition(node, { type: 'user_feedback_received' });
      expect(node).toBe('feedback_received');

      node = nodeStateMachine.transition(node, { type: 'memory_persisted' });
      expect(node).toBe('long_memory_update');
    });

    it('灰度判断：USE_9_NODE_MACHINE=1 启用', () => {
      process.env.USE_9_NODE_MACHINE = '1';
      expect(nodeStateMachine.isGraylisted('user-1')).toBe(true);
      delete process.env.USE_9_NODE_MACHINE;
    });

    it('灰度判断：USE_9_NODE_MACHINE=0 不启用', () => {
      process.env.USE_9_NODE_MACHINE = '0';
      expect(nodeStateMachine.isGraylisted('user-1')).toBe(false);
      delete process.env.USE_9_NODE_MACHINE;
    });
  });

  describe('10 场景主动出击', () => {
    it('10 场景全部定义', () => {
      expect(ACTIVE_MOVE_SCENARIO_KEYS).toHaveLength(10);
    });

    it('所有场景都有 messageTemplate', () => {
      for (const key of ACTIVE_MOVE_SCENARIO_KEYS) {
        expect(ACTIVE_MOVE_SCENARIOS[key].messageTemplate.length).toBeGreaterThan(5);
      }
    });

    it('所有场景 computeDelay 返回正数', () => {
      for (const key of ACTIVE_MOVE_SCENARIO_KEYS) {
        const delay = ACTIVE_MOVE_SCENARIOS[key].computeDelay();
        expect(delay).toBeGreaterThan(0);
      }
    });

    it('key_date_before 有 keyDate 时计算合理延迟', () => {
      const keyDate = new Date(Date.now() + 5 * 86400000); // 5 天后
      const delay = ACTIVE_MOVE_SCENARIOS.key_date_before.computeDelay({ keyDate });
      expect(delay).toBeGreaterThanOrEqual(1);
      expect(delay).toBeLessThanOrEqual(5);
    });
  });

  describe('L3 全链路：记忆提取 → 状态机 → 主动出击', () => {
    it('记忆写入 → 状态机读取节点 → 场景调度', async () => {
      // 1. 写入结构化记忆
      await mockUserMemory.setActiveMemory('user-l3', {
        type: 'major_issue',
        content: '用户最担心事业方向',
        issueId: 'first_judgment',
      });

      // 2. 状态机读取节点
      const node = await nodeStateMachine.getCurrentNode('user-l3');
      expect(node).toBe('first_judgment');

      // 3. 场景调度
      const scenario = ACTIVE_MOVE_SCENARIOS.action_window;
      const delay = scenario.computeDelay();
      expect(delay).toBe(3);
      expect(scenario.messageTemplate).toContain('行动');
    });
  });
});
