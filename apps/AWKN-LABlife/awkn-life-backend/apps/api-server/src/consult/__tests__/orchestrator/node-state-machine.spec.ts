/**
 * P2-4: 9 节点状态机测试
 *
 * 验证：
 * - 9 节点枚举完整
 * - transition 转换正确
 * - toPromptInstruction 注入正确
 * - isGraylisted 灰度判断
 */
import { NodeStateMachineService, NodeState, NodeEvent } from '../../orchestrator/node-state-machine.service';
import { UserMemoryService } from '../../memory/user-memory.service';

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
      });
      return Promise.resolve();
    }),
  };
}

describe('NodeStateMachineService — 9 节点状态机（P2-4）', () => {
  let service: NodeStateMachineService;
  let mockUserMemory: any;

  beforeEach(() => {
    mockUserMemory = createMockUserMemoryService();
    service = new NodeStateMachineService(mockUserMemory as any);
  });

  describe('transition — 节点转换', () => {
    it('cold_start + user_first_question → first_issue', () => {
      const next = service.transition('cold_start', { type: 'user_first_question' });
      expect(next).toBe('first_issue');
    });

    it('first_issue + birth_info_collected → context_collecting', () => {
      const next = service.transition('first_issue', { type: 'birth_info_collected' });
      expect(next).toBe('context_collecting');
    });

    it('context_collecting + chart_calculated → chart_ready', () => {
      const next = service.transition('context_collecting', { type: 'chart_calculated' });
      expect(next).toBe('chart_ready');
    });

    it('chart_ready + judgment_generated → first_judgment', () => {
      const next = service.transition('chart_ready', { type: 'judgment_generated' });
      expect(next).toBe('first_judgment');
    });

    it('first_judgment + user_confirmed_action → action_confirm', () => {
      const next = service.transition('first_judgment', { type: 'user_confirmed_action' });
      expect(next).toBe('action_confirm');
    });

    it('action_confirm + followup_scheduled → followup_due', () => {
      const next = service.transition('action_confirm', { type: 'followup_scheduled' });
      expect(next).toBe('followup_due');
    });

    it('followup_due + user_feedback_received → feedback_received', () => {
      const next = service.transition('followup_due', { type: 'user_feedback_received' });
      expect(next).toBe('feedback_received');
    });

    it('feedback_received + memory_persisted → long_memory_update', () => {
      const next = service.transition('feedback_received', { type: 'memory_persisted' });
      expect(next).toBe('long_memory_update');
    });

    it('long_memory_update + session_reset → cold_start', () => {
      const next = service.transition('long_memory_update', { type: 'session_reset' });
      expect(next).toBe('cold_start');
    });

    it('无合法转换时保持当前节点', () => {
      const next = service.transition('cold_start', { type: 'judgment_generated' });
      expect(next).toBe('cold_start');
    });
  });

  describe('toPromptInstruction — 节点指令', () => {
    it('cold_start → 包含"首次进入"', () => {
      const instruction = service.toPromptInstruction('cold_start');
      expect(instruction).toContain('首次进入');
    });

    it('first_judgment → 包含"首次判断"', () => {
      const instruction = service.toPromptInstruction('first_judgment');
      expect(instruction).toContain('首次判断');
    });

    it('followup_due → 包含"回访到期"', () => {
      const instruction = service.toPromptInstruction('followup_due');
      expect(instruction).toContain('回访到期');
    });

    it('所有 9 节点都有指令', () => {
      const states: NodeState[] = [
        'cold_start', 'first_issue', 'context_collecting', 'chart_ready',
        'first_judgment', 'action_confirm', 'followup_due', 'feedback_received',
        'long_memory_update',
      ];
      for (const state of states) {
        const instruction = service.toPromptInstruction(state);
        expect(instruction.length).toBeGreaterThan(5);
      }
    });
  });

  describe('getCurrentNode — 读取用户当前节点', () => {
    it('无记忆 → cold_start', async () => {
      const node = await service.getCurrentNode('user-1');
      expect(node).toBe('cold_start');
    });

    it('issueId 为合法节点 → 返回该节点', async () => {
      mockUserMemory.getMemory.mockResolvedValueOnce({ issueId: 'first_judgment' });
      const node = await service.getCurrentNode('user-2');
      expect(node).toBe('first_judgment');
    });

    it('issueId 为非法值 → cold_start', async () => {
      mockUserMemory.getMemory.mockResolvedValueOnce({ issueId: 'invalid_node' });
      const node = await service.getCurrentNode('user-3');
      expect(node).toBe('cold_start');
    });
  });

  describe('isGraylisted — 1% 灰度判断', () => {
    afterEach(() => {
      delete process.env.USE_9_NODE_MACHINE;
    });

    it('USE_9_NODE_MACHINE=1 → 启用', () => {
      process.env.USE_9_NODE_MACHINE = '1';
      expect(service.isGraylisted('any-user')).toBe(true);
    });

    it('USE_9_NODE_MACHINE=0 → 不启用', () => {
      process.env.USE_9_NODE_MACHINE = '0';
      expect(service.isGraylisted('any-user')).toBe(false);
    });

    it('未设置环境变量 → 1% 灰度（哈希判断）', () => {
      delete process.env.USE_9_NODE_MACHINE;
      // 同一 userId 多次调用结果一致
      const result1 = service.isGraylisted('user-abc');
      const result2 = service.isGraylisted('user-abc');
      expect(result1).toBe(result2);
    });
  });
});
