/**
 * 配置驱动状态机类型定义
 * 用于awkn-programmer - 通过配置而非硬编码来定义状态机
 */

import { z } from 'zod';

// ============ 基础枚举 ============

export enum StateType {
  INITIAL = 'initial',      // 初始状态
  NORMAL = 'normal',         // 普通状态
  FINAL = 'final',           // 终态
  CHOICE = 'choice',         // 决策节点
  PARALLEL = 'parallel',     // 并行分支
  JOIN = 'join',             // 合并节点
}

// ============ Zod Schema ============

// 守卫条件
export const GuardSchema = z.object({
  condition: z.string(),     // 条件表达式
  description: z.string().optional(),
});

// 执行动作
export const ActionSchema = z.object({
  type: z.enum(['enter', 'exit', 'transition', 'always']),
  handler: z.string(),       // 处理函数名
  params: z.record(z.string(), z.any()).optional(),
  description: z.string().optional(),
});

// 状态定义
export const StateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.nativeEnum(StateType),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  entryActions: z.array(ActionSchema).optional(),
  exitActions: z.array(ActionSchema).optional(),
  alwaysActions: z.array(ActionSchema).optional(),
});

// 事件定义
export const EventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

// 转换规则
export const TransitionSchema = z.object({
  id: z.string().min(1),
  from: z.string(),
  event: z.string(),
  to: z.string(),
  guards: z.array(GuardSchema).optional(),
  actions: z.array(ActionSchema).optional(),
  description: z.string().optional(),
  priority: z.number().optional(),
});

// 状态机配置
export const StateMachineConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional().default('1.0.0'),
  description: z.string().optional(),
  initialState: z.string(),
  states: z.array(StateSchema).min(1),
  events: z.array(EventSchema).optional().default([]),
  transitions: z.array(TransitionSchema).min(1),
  finalStates: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============ TypeScript类型 ============

export type Guard = z.infer<typeof GuardSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type State = z.infer<typeof StateSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type StateMachineConfig = z.infer<typeof StateMachineConfigSchema>;

// ============ 运行时状态 ============

export interface StateMachineContext {
  currentState: string;
  previousState: string | null;
  history: string[];
  contextData: Record<string, any>;
  metadata: Record<string, any>;
}

export interface TransitionResult {
  success: boolean;
  from: string;
  to: string | null;
  event: string;
  actions: string[];
  error?: string;
  guardsEvaluated: string[];
  guardsPassed: string[];
}

// ============ 预设模板 ============

export const PRESET_STATE_MACHINES: Record<string, StateMachineConfig> = {
  // NPC命运追踪模板
  npcFate: {
    id: 'npc_fate_sm',
    name: 'NPC命运追踪状态机',
    version: '1.0.0',
    description: '用于追踪NPC命运变化的通用模板',
    initialState: 'unknown',
    states: [
      { id: 'unknown', name: '未知', type: StateType.INITIAL, description: '初始未知状态' },
      { id: 'stranger', name: '陌生人', type: StateType.NORMAL, description: '刚相遇' },
      { id: 'acquaintance', name: '熟人', type: StateType.NORMAL, description: '已有互动' },
      { id: 'friend', name: '朋友', type: StateType.NORMAL, description: '关系良好' },
      { id: 'ally', name: '盟友', type: StateType.NORMAL, description: '可信任的伙伴' },
      { id: 'betrayed', name: '被背叛', type: StateType.NORMAL, description: '产生裂痕' },
      { id: 'enemy', name: '敌人', type: StateType.FINAL, description: '对立关系' },
      { id: 'dead', name: '死亡', type: StateType.FINAL, description: 'NPC死亡' },
      { id: 'gone', name: '离去', type: StateType.FINAL, description: 'NPC离开' },
    ],
    events: [
      { id: 'meet', name: '相遇', description: '首次相遇' },
      { id: 'help', name: '帮助', description: '提供帮助' },
      { id: 'betray', name: '背叛', description: '背叛行为' },
      { id: 'trust', name: '信任', description: '建立信任' },
      { id: 'fight', name: '战斗', description: '发生冲突' },
      { id: 'die', name: '死亡', description: 'NPC死亡' },
      { id: 'leave', name: '离开', description: 'NPC离开' },
    ],
    transitions: [
      // 相遇 → 陌生人
      { id: 't1', from: 'unknown', event: 'meet', to: 'stranger', description: '首次相遇成为陌生人' },
      // 陌生人 → 熟人（多次互动后）
      { id: 't2', from: 'stranger', event: 'help', to: 'acquaintance', description: '帮助后成为熟人' },
      { id: 't3', from: 'stranger', event: 'trust', to: 'acquaintance', description: '建立信任成为熟人' },
      // 熟人 → 朋友
      { id: 't4', from: 'acquaintance', event: 'help', to: 'friend', description: '继续帮助成为朋友' },
      { id: 't5', from: 'acquaintance', event: 'trust', to: 'friend', description: '加深信任成为朋友' },
      // 朋友 → 盟友
      { id: 't6', from: 'friend', event: 'help', to: 'ally', description: '关键时刻帮助成为盟友' },
      // 朋友 → 被背叛
      { id: 't7', from: 'friend', event: 'betray', to: 'betrayed', description: '被朋友背叛' },
      // 熟人 → 被背叛
      { id: 't8', from: 'acquaintance', event: 'betray', to: 'betrayed', description: '被熟人背叛' },
      // 被背叛 → 敌人
      { id: 't9', from: 'betrayed', event: 'fight', to: 'enemy', description: '背叛后冲突成为敌人' },
      { id: 't10', from: 'betrayed', event: 'betray', to: 'enemy', description: '再次背叛成为敌人' },
      // 陌生人 → 敌人
      { id: 't11', from: 'stranger', event: 'fight', to: 'enemy', description: '冲突成为敌人' },
      // 任何状态 → 死亡
      { id: 't12', from: 'stranger', event: 'die', to: 'dead', description: 'NPC死亡' },
      { id: 't13', from: 'acquaintance', event: 'die', to: 'dead', description: 'NPC死亡' },
      { id: 't14', from: 'friend', event: 'die', to: 'dead', description: 'NPC死亡' },
      { id: 't15', from: 'ally', event: 'die', to: 'dead', description: 'NPC死亡' },
      // 任何状态 → 离去
      { id: 't16', from: 'stranger', event: 'leave', to: 'gone', description: 'NPC离开' },
      { id: 't17', from: 'acquaintance', event: 'leave', to: 'gone', description: 'NPC离开' },
      { id: 't18', from: 'friend', event: 'leave', to: 'gone', description: 'NPC离开' },
      { id: 't19', from: 'ally', event: 'leave', to: 'gone', description: 'NPC离开' },
    ],
    finalStates: ['enemy', 'dead', 'gone'],
  },

  // 工作流审批模板
  approval: {
    id: 'approval_sm',
    name: '工作流审批状态机',
    version: '1.0.0',
    description: '通用工作流审批流程模板',
    initialState: 'draft',
    states: [
      { id: 'draft', name: '草稿', type: StateType.INITIAL, description: '文档起草状态' },
      { id: 'submitted', name: '已提交', type: StateType.NORMAL, description: '等待审批' },
      { id: 'reviewing', name: '审核中', type: StateType.NORMAL, description: '正在审核' },
      { id: 'approved', name: '已通过', type: StateType.FINAL, description: '审批通过' },
      { id: 'rejected', name: '已拒绝', type: StateType.FINAL, description: '审批拒绝' },
      { id: 'revised', name: '已修改', type: StateType.NORMAL, description: '需要修改' },
    ],
    events: [
      { id: 'submit', name: '提交', description: '提交审批' },
      { id: 'startReview', name: '开始审核', description: '开始审核流程' },
      { id: 'approve', name: '通过', description: '审核通过' },
      { id: 'reject', name: '拒绝', description: '审核拒绝' },
      { id: 'revise', name: '修改', description: '需要修改' },
      { id: 'resubmit', name: '重新提交', description: '修改后重新提交' },
    ],
    transitions: [
      { id: 't1', from: 'draft', event: 'submit', to: 'submitted', description: '提交审批' },
      { id: 't2', from: 'submitted', event: 'startReview', to: 'reviewing', description: '开始审核' },
      { id: 't3', from: 'reviewing', event: 'approve', to: 'approved', description: '审核通过' },
      { id: 't4', from: 'reviewing', event: 'reject', to: 'rejected', description: '审核拒绝' },
      { id: 't5', from: 'reviewing', event: 'revise', to: 'revised', description: '需要修改' },
      { id: 't6', from: 'revised', event: 'resubmit', to: 'submitted', description: '重新提交' },
    ],
    finalStates: ['approved', 'rejected'],
  },

  // 对话状态模板
  conversation: {
    id: 'conversation_sm',
    name: '对话状态机',
    version: '1.0.0',
    description: '用于对话系统/聊天机器人的状态管理',
    initialState: 'idle',
    states: [
      { id: 'idle', name: '空闲', type: StateType.INITIAL, description: '等待用户输入' },
      { id: 'listening', name: '倾听中', type: StateType.NORMAL, description: '正在接收输入' },
      { id: 'processing', name: '处理中', type: StateType.NORMAL, description: '正在处理请求' },
      { id: 'responding', name: '响应中', type: StateType.NORMAL, description: '正在生成回复' },
      { id: 'waiting', name: '等待确认', type: StateType.NORMAL, description: '等待用户确认' },
      { id: 'completed', name: '完成', type: StateType.FINAL, description: '对话完成' },
      { id: 'error', name: '错误', type: StateType.FINAL, description: '发生错误' },
    ],
    events: [
      { id: 'userInput', name: '用户输入', description: '收到用户输入' },
      { id: 'processComplete', name: '处理完成', description: '处理完成' },
      { id: 'responseComplete', name: '响应完成', description: '回复生成完成' },
      { id: 'confirm', name: '确认', description: '用户确认' },
      { id: 'cancel', name: '取消', description: '用户取消' },
      { id: 'error', name: '错误发生', description: '发生错误' },
    ],
    transitions: [
      { id: 't1', from: 'idle', event: 'userInput', to: 'processing', description: '收到输入开始处理' },
      { id: 't2', from: 'processing', event: 'processComplete', to: 'responding', description: '处理完成开始响应' },
      { id: 't3', from: 'responding', event: 'responseComplete', to: 'waiting', description: '响应完成等待确认' },
      { id: 't4', from: 'waiting', event: 'confirm', to: 'completed', description: '用户确认完成' },
      { id: 't5', from: 'waiting', event: 'cancel', to: 'idle', description: '用户取消返回空闲' },
      { id: 't6', from: 'idle', event: 'error', to: 'error', description: '发生错误' },
      { id: 't7', from: 'processing', event: 'error', to: 'error', description: '发生错误' },
    ],
    finalStates: ['completed', 'error'],
  },
};

// ============ 代码生成模板 ============

export interface GeneratedCode {
  filename: string;
  content: string;
  language: 'typescript' | 'javascript';
}

export function generateStateMachineCode(config: StateMachineConfig): GeneratedCode[] {
  const codes: GeneratedCode[] = [];

  // 1. 类型定义文件
  const typesContent = `/**
 * ${config.name} - 类型定义
 * 自动生成，请勿手动修改
 * 版本: ${config.version}
 */

export type ${pascalCase(config.id)}State = 
${config.states.map(s => `  | '${s.id}'`).join('\n')};

export type ${pascalCase(config.id)}Event = 
${config.events.map(e => `  | '${e.id}'`).join('\n')};

// 状态标签
export const ${pascalCase(config.id)}StateLabels: Record<${pascalCase(config.id)}State, string> = {
${config.states.map(s => `  '${s.id}': '${s.name}'`).join(',\n')}
};

// 事件标签  
export const ${pascalCase(config.id)}EventLabels: Record<${pascalCase(config.id)}Event, string> = {
${config.events.map(e => `  '${e.id}': '${e.name}'`).join(',\n')}
};
`;

  codes.push({
    filename: `${config.id}.types.ts`,
    content: typesContent,
    language: 'typescript',
  });

  // 2. 状态机实现文件
  const implementationContent = `/**
 * ${config.name} - 状态机实现
 * 自动生成，请勿手动修改
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ${pascalCase(config.id)}State, 
  ${pascalCase(config.id)}Event,
  StateMachineContext,
  TransitionResult 
} from './${config.id}.types';

// 转换表
const transitions: Record<string, { to: ${pascalCase(config.id)}State; guards?: string[] }> = {
${config.transitions.map(t => `  '${t.from}_${t.event}': { to: '${t.to}'${t.guards?.length ? `, guards: [${t.guards.map(g => `'${g.condition}'`).join(', ')}]` : ''} }`).join(',\n')}
};

// 状态机 Store
interface ${pascalCase(config.id)}Store {
  context: StateMachineContext;
  send: (event: ${pascalCase(config.id)}Event, payload?: Record<string, any>) => TransitionResult;
  reset: () => void;
  getContext: () => StateMachineContext;
}

const initialContext: StateMachineContext = {
  currentState: '${config.initialState}',
  previousState: null,
  history: ['${config.initialState}'],
  contextData: {},
  metadata: {},
};

export const use${pascalCase(config.id)}Store = create<${pascalCase(config.id)}Store>()(
  persist(
    (set, get) => ({
      context: { ...initialContext },

      send: (event, payload) => {
        const { context } = get();
        const key = \`\${context.currentState}_\${event}\`;
        const transition = transitions[key];

        if (!transition) {
          return {
            success: false,
            from: context.currentState,
            to: null,
            event,
            actions: [],
            error: \`No transition for event '\${event}' from state '\${context.currentState}'\`,
            guardsEvaluated: [],
            guardsPassed: [],
          };
        }

        const result: TransitionResult = {
          success: true,
          from: context.currentState,
          to: transition.to,
          event,
          actions: [],
          guardsEvaluated: transition.guards || [],
          guardsPassed: transition.guards || [],
        };

        set({
          context: {
            ...context,
            previousState: context.currentState,
            currentState: transition.to,
            history: [...context.history, transition.to],
            contextData: payload ? { ...context.contextData, ...payload } : context.contextData,
          },
        });

        return result;
      },

      reset: () => {
        set({ context: { ...initialContext } });
      },

      getContext: () => get().context,
    }),
    {
      name: '${config.id}_store',
    }
  )
);
`;

  codes.push({
    filename: `${config.id}.store.ts`,
    content: implementationContent,
    language: 'typescript',
  });

  return codes;
}

// 工具函数
function pascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// ============ 配置验证 ============

export function validateStateMachineConfig(config: unknown): { valid: boolean; errors?: string[] } {
  const result = StateMachineConfigSchema.safeParse(config);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
    };
  }
  return { valid: true };
}