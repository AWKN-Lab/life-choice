import { Injectable, Logger } from '@nestjs/common';

/**
 * 统一状态机 — 合并6态DialogueState和9节点NodeState
 *
 * 统一状态流转：
 * idle → collecting → analyzing → generating → responding → completed
 *
 * 每个状态对应明确的阶段和动作
 */
export type UnifiedState =
  | 'idle' // 初始/空闲
  | 'collecting' // 收集用户信息（出生时间、地点等）
  | 'clarifying' // 追问补充信息
  | 'analyzing' // 排盘/计算
  | 'generating' // LLM生成
  | 'responding' // 流式输出
  | 'confirming' // 确认行动方向
  | 'followup' // 回访/追问
  | 'completed'; // 完成

export const UNIFIED_STATES: UnifiedState[] = [
  'idle',
  'collecting',
  'clarifying',
  'analyzing',
  'generating',
  'responding',
  'confirming',
  'followup',
  'completed',
];

export type UnifiedEvent =
  | { type: 'user_message' }
  | { type: 'birth_info_collected' }
  | { type: 'clarification_needed' }
  | { type: 'clarification_done' }
  | { type: 'chart_calculated' }
  | { type: 'generation_started' }
  | { type: 'generation_completed' }
  | { type: 'response_sent' }
  | { type: 'action_confirmed' }
  | { type: 'followup_scheduled' }
  | { type: 'user_feedback' }
  | { type: 'session_reset' }
  | { type: 'timeout' };

const TRANSITION_TABLE: Record<
  UnifiedState,
  Partial<Record<UnifiedEvent['type'], UnifiedState>>
> = {
  idle: {
    user_message: 'collecting',
    session_reset: 'idle',
  },
  collecting: {
    birth_info_collected: 'analyzing',
    clarification_needed: 'clarifying',
    user_message: 'collecting',
  },
  clarifying: {
    clarification_done: 'analyzing',
    user_message: 'clarifying',
    timeout: 'analyzing', // 超时直接进入分析
  },
  analyzing: {
    chart_calculated: 'generating',
    timeout: 'generating', // 超时直接进入生成
  },
  generating: {
    generation_started: 'responding',
    generation_completed: 'responding',
    timeout: 'responding',
  },
  responding: {
    response_sent: 'confirming',
    action_confirmed: 'followup',
    user_message: 'collecting', // 用户追问
  },
  confirming: {
    action_confirmed: 'followup',
    user_message: 'collecting',
    followup_scheduled: 'followup',
  },
  followup: {
    user_feedback: 'completed',
    user_message: 'collecting',
    followup_scheduled: 'followup',
  },
  completed: {
    user_message: 'collecting', // 新一轮
    session_reset: 'idle',
  },
};

// 状态对应的 prompt 指令
const STATE_PROMPT_INSTRUCTIONS: Record<UnifiedState, string> = {
  idle: '等待用户发起对话',
  collecting: '收集用户出生信息和问题背景',
  clarifying: '追问补充关键信息（时间、地点、具体处境）',
  analyzing: '排盘计算中，准备生成分析',
  generating: '正在生成命理分析',
  responding: '向用户输出分析结果',
  confirming: '引导用户确认行动方向',
  followup: '安排回访或追问',
  completed: '本轮咨询完成，准备下一轮',
};

@Injectable()
export class UnifiedStateMachineService {
  private readonly logger = new Logger(UnifiedStateMachineService.name);

  /**
   * 状态转换
   */
  transition(current: UnifiedState, event: UnifiedEvent): UnifiedState {
    const transitions = TRANSITION_TABLE[current];
    const next = transitions?.[event.type];
    if (!next) {
      this.logger.debug(
        `[UnifiedSM] no transition from ${current} on ${event.type}, stay`,
      );
      return current;
    }
    this.logger.log(`[UnifiedSM] ${current} --${event.type}--> ${next}`);
    return next;
  }

  /**
   * 获取状态对应的 prompt 指令
   */
  toPromptInstruction(state: UnifiedState): string {
    return STATE_PROMPT_INSTRUCTIONS[state];
  }

  /**
   * 从旧的 DialogueState 映射到 UnifiedState
   */
  fromDialogueState(state: string): UnifiedState {
    const mapping: Record<string, UnifiedState> = {
      IDLE: 'idle',
      SCHEDULING: 'analyzing',
      CLARIFYING: 'clarifying',
      GENERATING: 'generating',
      RESPONDING: 'responding',
      COMPLETED: 'completed',
    };
    return mapping[state] || 'idle';
  }

  /**
   * 从旧的 NodeState 映射到 UnifiedState
   */
  fromNodeState(state: string): UnifiedState {
    const mapping: Record<string, UnifiedState> = {
      cold_start: 'idle',
      first_issue: 'collecting',
      context_collecting: 'collecting',
      chart_ready: 'analyzing',
      first_judgment: 'responding',
      action_confirm: 'confirming',
      followup_due: 'followup',
      feedback_received: 'completed',
      long_memory_update: 'completed',
    };
    return mapping[state] || 'idle';
  }

  /**
   * 判断是否可以接受用户输入
   */
  canAcceptUserInput(state: UnifiedState): boolean {
    return [
      'idle',
      'collecting',
      'clarifying',
      'responding',
      'confirming',
      'followup',
      'completed',
    ].includes(state);
  }

  /**
   * 判断是否需要出生信息
   */
  needsBirthInfo(state: UnifiedState): boolean {
    return ['collecting', 'clarifying'].includes(state);
  }

  /**
   * 判断是否处于 LLM 处理中
   */
  isProcessing(state: UnifiedState): boolean {
    return ['analyzing', 'generating', 'responding'].includes(state);
  }
}
