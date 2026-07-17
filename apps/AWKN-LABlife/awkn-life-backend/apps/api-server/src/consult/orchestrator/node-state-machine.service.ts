/**
 * P2-4: 9 节点状态机（1% 灰度）
 *
 * @deprecated Phase 3: 已由 UnifiedStateMachineService 替代。
 *   - 新代码应使用 UnifiedStateMachineService（unified-state-machine.service.ts）
 *   - 本服务保持向后兼容，但将在 v0.3 移除
 *   - 详见 PRD 4.1 节"统一对话状态机"
 *
 * 9 节点流转：
 * cold_start → first_issue → context_collecting → chart_ready → first_judgment
 *           → action_confirm → followup_due → feedback_received → long_memory_update
 *
 * 灰度策略：
 * - USE_9_NODE_MACHINE=1 时启用（1% 灰度）
 * - 否则用 emotion-state.ts 的 mini 3 态兜底
 */
import { Injectable, Logger } from '@nestjs/common';
import { UserMemoryService } from '../memory/user-memory.service';

// 9 节点枚举
export type NodeState =
  | 'cold_start'
  | 'first_issue'
  | 'context_collecting'
  | 'chart_ready'
  | 'first_judgment'
  | 'action_confirm'
  | 'followup_due'
  | 'feedback_received'
  | 'long_memory_update';

export const NODE_STATES: NodeState[] = [
  'cold_start',
  'first_issue',
  'context_collecting',
  'chart_ready',
  'first_judgment',
  'action_confirm',
  'followup_due',
  'feedback_received',
  'long_memory_update',
];

// 状态机事件
export type NodeEvent =
  | { type: 'user_first_question' }
  | { type: 'birth_info_collected' }
  | { type: 'chart_calculated' }
  | { type: 'judgment_generated' }
  | { type: 'user_confirmed_action' }
  | { type: 'followup_scheduled' }
  | { type: 'user_feedback_received' }
  | { type: 'memory_persisted' }
  | { type: 'session_reset' };

// 节点转换表
const TRANSITION_TABLE: Record<NodeState, Partial<Record<NodeEvent['type'], NodeState>>> = {
  cold_start: {
    user_first_question: 'first_issue',
  },
  first_issue: {
    birth_info_collected: 'context_collecting',
    chart_calculated: 'chart_ready',
  },
  context_collecting: {
    chart_calculated: 'chart_ready',
  },
  chart_ready: {
    judgment_generated: 'first_judgment',
  },
  first_judgment: {
    user_confirmed_action: 'action_confirm',
    followup_scheduled: 'followup_due',
  },
  action_confirm: {
    followup_scheduled: 'followup_due',
  },
  followup_due: {
    user_feedback_received: 'feedback_received',
  },
  feedback_received: {
    memory_persisted: 'long_memory_update',
  },
  long_memory_update: {
    user_first_question: 'first_issue',
    session_reset: 'cold_start',
  },
};

// 节点对应的 prompt 指令
const NODE_PROMPT_INSTRUCTIONS: Record<NodeState, string> = {
  cold_start: '用户首次进入，主动询问出生信息与关注领域',
  first_issue: '用户已提出首个问题，收集出生信息以排盘',
  context_collecting: '正在收集上下文（出生地/时区/具体处境），引导用户补充',
  chart_ready: '排盘已完成，准备生成首次判断',
  first_judgment: '已生成首次判断，引导用户确认行动方向',
  action_confirm: '用户已确认行动，安排回访节点',
  followup_due: '回访到期，主动询问实际结果与判断准确性',
  feedback_received: '已收到用户反馈，更新长期记忆',
  long_memory_update: '长期记忆已更新，准备进入下一轮咨询',
};

@Injectable()
export class NodeStateMachineService {
  private readonly logger = new Logger(NodeStateMachineService.name);

  constructor(private readonly userMemoryService: UserMemoryService) {}

  /**
   * 状态转换：根据当前节点和事件，返回下一节点
   * 无合法转换时返回当前节点（保持不变）
   */
  transition(currentNode: NodeState, event: NodeEvent): NodeState {
    const transitions = TRANSITION_TABLE[currentNode];
    const nextNode = transitions?.[event.type];
    if (!nextNode) {
      this.logger.debug(`[transition] no transition from ${currentNode} on ${event.type}, stay`);
      return currentNode;
    }
    this.logger.log(`[transition] ${currentNode} --${event.type}--> ${nextNode}`);
    return nextNode;
  }

  /**
   * 获取用户当前节点（从 UserMemory 读取，默认 cold_start）
   * P2-4: 节点状态暂存于 UserMemory.issueId 字段（复用现有字段，避免新增表）
   */
  async getCurrentNode(userId: string): Promise<NodeState> {
    const memory = await this.userMemoryService.getMemory(userId);
    if (!memory || !memory.issueId) return 'cold_start';
    const node = memory.issueId as NodeState;
    if (!NODE_STATES.includes(node)) return 'cold_start';
    return node;
  }

  /**
   * 保存用户当前节点到 UserMemory.issueId
   */
  async setCurrentNode(userId: string, node: NodeState): Promise<void> {
    const memory = await this.userMemoryService.getMemory(userId);
    if (!memory) {
      // getOrCreateMemory 会在 setActiveMemory 等方法中触发，这里直接 upsert
      await this.userMemoryService.setActiveMemory(userId, {
        type: 'major_issue',
        content: `节点状态: ${node}`,
      });
    }
    // 通过 prisma 直接更新 issueId 字段（复用字段）
    // 注意：这里用 setActiveMemory 会覆盖其他字段，所以用底层 prisma 更新
    // 但 userMemoryService 没暴露 prisma，这里通过 setActiveMemory 的 issueId 参数
    await this.userMemoryService.setActiveMemory(userId, {
      type: 'major_issue',
      content: `节点状态: ${node}`,
      issueId: node,
    });
  }

  /**
   * 节点转 prompt 指令
   */
  toPromptInstruction(node: NodeState): string {
    return NODE_PROMPT_INSTRUCTIONS[node];
  }

  /**
   * 1% 灰度判断
   * USE_9_NODE_MACHINE=1 时启用
   * 或 userId 哈希 % 100 < 1 时启用（1% 灰度）
   */
  isGraylisted(userId: string): boolean {
    if (process.env.USE_9_NODE_MACHINE === '1') return true;
    if (process.env.USE_9_NODE_MACHINE === '0') return false;
    // 默认 1% 灰度：userId 哈希 % 100 < 1
    const hash = this.hashUserId(userId);
    return hash % 100 < 1;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // 转 32 位整数
    }
    return Math.abs(hash);
  }
}
