/**
 * 配置驱动状态机 Store
 * 运行时状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  StateMachineConfig, 
  StateMachineContext, 
  TransitionResult 
} from '../types/stateMachine';

interface StateMachineStore {
  // 上下文
  context: StateMachineContext;
  
  // 发送事件
  send: (eventId: string, payload?: Record<string, any>) => TransitionResult;
  
  // 重置状态机
  reset: () => void;
  
  // 获取上下文
  getContext: () => StateMachineContext;
}

// 默认初始上下文
const createInitialContext = (initialState: string): StateMachineContext => ({
  currentState: initialState,
  previousState: null,
  history: [initialState],
  contextData: {},
  metadata: {},
});

export function useStateMachine(config: StateMachineConfig) {
  return create<StateMachineStore>()(
    persist(
      (set, get) => ({
        context: createInitialContext(config.initialState),

        send: (eventId: string, payload?: Record<string, any>) => {
          const { context } = get();
          
          // 查找匹配的转换
          const transition = config.transitions.find(
            t => t.from === context.currentState && t.event === eventId
          );

          if (!transition) {
            const errorResult: TransitionResult = {
              success: false,
              from: context.currentState,
              to: null,
              event: eventId,
              actions: [],
              error: `No transition for event '${eventId}' from state '${context.currentState}'`,
              guardsEvaluated: [],
              guardsPassed: [],
            };
            return errorResult;
          }

          // 更新上下文
          const newContext: StateMachineContext = {
            currentState: transition.to,
            previousState: context.currentState,
            history: [...context.history, transition.to],
            contextData: payload ? { ...context.contextData, ...payload } : context.contextData,
            metadata: context.metadata,
          };

          set({ context: newContext });

          return {
            success: true,
            from: context.currentState,
            to: transition.to,
            event: eventId,
            actions: transition.actions?.map(a => a.handler) || [],
            guardsEvaluated: transition.guards?.map(g => g.condition) || [],
            guardsPassed: transition.guards?.map(g => g.condition) || [],
          };
        },

        reset: () => {
          set({ context: createInitialContext(config.initialState) });
        },

        getContext: () => get().context,
      }),
      {
        name: `state_machine_${config.id}`,
        // 自定义合并策略
        merge: (persistedState: any, currentState) => {
          if (!persistedState) return currentState;
          return {
            ...currentState,
            ...persistedState,
            context: {
              ...currentState.context,
              ...(persistedState.context || {}),
            },
          };
        },
      }
    )
  );
}

// 多个状态机实例管理
interface MultiStateMachineStore {
  machines: Record<string, StateMachineContext>;
  initMachine: (machineId: string, config: StateMachineConfig) => void;
  sendTo: (machineId: string, eventId: string, config: StateMachineConfig, payload?: Record<string, any>) => TransitionResult;
  resetMachine: (machineId: string, config: StateMachineConfig) => void;
  removeMachine: (machineId: string) => void;
}

export const useMultiStateMachineStore = create<MultiStateMachineStore>()(
  persist(
    (set, get) => ({
      machines: {},

      initMachine: (machineId: string, config: StateMachineConfig) => {
        set(state => ({
          machines: {
            ...state.machines,
            [machineId]: createInitialContext(config.initialState),
          },
        }));
      },

      sendTo: (machineId: string, eventId: string, config: StateMachineConfig, payload?: Record<string, any>) => {
        const { machines } = get();
        const context = machines[machineId] || createInitialContext(config.initialState);

        const transition = config.transitions.find(
          t => t.from === context.currentState && t.event === eventId
        );

        if (!transition) {
          return {
            success: false,
            from: context.currentState,
            to: null,
            event: eventId,
            actions: [],
            error: `No transition for event '${eventId}' from state '${context.currentState}'`,
            guardsEvaluated: [],
            guardsPassed: [],
          };
        }

        const newContext: StateMachineContext = {
          currentState: transition.to,
          previousState: context.currentState,
          history: [...context.history, transition.to],
          contextData: payload ? { ...context.contextData, ...payload } : context.contextData,
          metadata: context.metadata,
        };

        set(state => ({
          machines: {
            ...state.machines,
            [machineId]: newContext,
          },
        }));

        return {
          success: true,
          from: context.currentState,
          to: transition.to,
          event: eventId,
          actions: transition.actions?.map(a => a.handler) || [],
          guardsEvaluated: transition.guards?.map(g => g.condition) || [],
          guardsPassed: transition.guards?.map(g => g.condition) || [],
        };
      },

      resetMachine: (machineId: string, config: StateMachineConfig) => {
        set(state => ({
          machines: {
            ...state.machines,
            [machineId]: createInitialContext(config.initialState),
          },
        }));
      },

      removeMachine: (machineId: string) => {
        set(state => {
          const { [machineId]: _, ...rest } = state.machines;
          return { machines: rest };
        });
      },
    }),
    {
      name: 'multi_state_machine_store',
    }
  )
);