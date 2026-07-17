/**
 * NPC命运追踪Store
 * 基于时空剧场NPC状态机 + 命运追踪机制
 * 来源：时空剧场/game/engine.js - NPC_FATE_CONFIG, npcFate, updateNPCFate()
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  NPCFateStatus,
  NPCInteraction,
  NPCFateConfig,
  NPCId
} from '../types/npcFate';
import { PRESET_NPCS, NPC_STATE_TRANSITIONS, NPCFateState } from '../types/npcFate';

/**
 * NPC命运追踪状态接口
 */
interface NPCFateStoreState {
  // === 状态 ===
  
  /** NPC命运状态映射 */
  npcFates: Record<NPCId, NPCFateStatus>;
  
  /** NPC交互历史 */
  interactions: NPCInteraction[];
  
  /** 系统配置 */
  config: NPCFateConfig;
  
  // === Actions ===
  
  /** 初始化NPC命运状态 */
  initNPCFate: (npcId: NPCId) => void;
  
  /** 记录NPC交互 */
  recordInteraction: (
    npcId: NPCId, 
    type: NPCInteraction['type'], 
    description: string,
    affectionDelta?: number
  ) => void;
  
  /** 更新NPC命运状态 */
  updateNPCFate: (npcId: NPCId, newState: NPCFateState, reason?: string) => void;
  
  /** 检查状态转换条件 */
  checkStateTransitions: (npcId: NPCId, context: {
    relationship?: number;
    interactionCount?: number;
    values?: Record<string, number>;
    lastChoice?: string;
  }) => NPCFateState | null;
  
  /** 获取NPC当前状态 */
  getNPCStatus: (npcId: NPCId) => NPCFateStatus | undefined;
  
  /** 获取NPC列表 */
  getNPCList: () => NPCFateStatus[];
  
  /** 获取NPC关系值 */
  getNPCRelationship: (npcId: NPCId) => number;
  
  /** 修改NPC关系值 */
  modifyRelationship: (npcId: NPCId, delta: number) => void;
  
  /** 获取NPC交互历史 */
  getNPCInteractions: (npcId: NPCId) => NPCInteraction[];
  
  /** 检查NPC是否解锁 */
  isNPCUnlocked: (npcId: NPCId) => boolean;
  
  /** 重置NPC状态 */
  resetNPC: (npcId: NPCId) => void;
  
  /** 重置所有NPC */
  resetAllNPCs: () => void;
  
  /** 更新配置 */
  updateConfig: (config: Partial<NPCFateConfig>) => void;
  
  /** 获取命运摘要 */
  getFateSummary: () => {
    totalNPCs: number;
    byState: Record<NPCFateState, number>;
    totalInteractions: number;
  };
}

/** 默认配置 */
const defaultConfig: NPCFateConfig = {
  enabled: true,
  showNotifications: true,
  autoTrackInteractions: true,
  considerInEnding: true
};

/**
 * NPC命运追踪Store
 */
export const useNPCFateStore = create<NPCFateStoreState>()(
  persist(
    (set, get) => ({
      // === 初始状态 ===
      npcFates: {},
      interactions: [],
      config: { ...defaultConfig },
      
      // === Actions ===
      
      /**
       * 初始化NPC命运状态
       */
      initNPCFate: (npcId: NPCId) => {
        const npcInfo = PRESET_NPCS[npcId];
        if (!npcInfo) {
          console.warn(`[NPCFate] NPC ${npcId} 不存在`);
          return;
        }
        
        set(state => ({
          npcFates: {
            ...state.npcFates,
            [npcId]: {
              npcId,
              currentState: npcInfo.initialState,
              stateHistory: [{
                state: npcInfo.initialState,
                timestamp: Date.now(),
                reason: '初始化'
              }],
              interactionCount: 0,
              endingContribution: 0
            }
          }
        }));
        
      },
      
      /**
       * 记录NPC交互
       * 来源：时空剧场 engine.js 交互记录逻辑
       */
      recordInteraction: (
        npcId: NPCId,
        type: NPCInteraction['type'],
        description: string,
        affectionDelta?: number
      ) => {
        const state = get();
        
        // 确保NPC状态存在
        if (!state.npcFates[npcId]) {
          get().initNPCFate(npcId);
        }
        
        const interaction: NPCInteraction = {
          id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          type,
          description
        };
        
        // 更新交互历史
        set(s => ({
          interactions: [...s.interactions, interaction],
          npcFates: {
            ...s.npcFates,
            [npcId]: {
              ...s.npcFates[npcId],
              interactionCount: s.npcFates[npcId].interactionCount + 1,
              lastInteractionAt: Date.now()
            }
          }
        }));
        
        // 更新关系值
        if (affectionDelta !== undefined) {
          get().modifyRelationship(npcId, affectionDelta);
        }
        
      },
      
      /**
       * 更新NPC命运状态
       * 来源：时空剧场 engine.js updateNPCFate() 函数
       */
      updateNPCFate: (npcId: NPCId, newState: NPCFateState, reason?: string) => {
        const state = get();
        
        if (!state.npcFates[npcId]) {
          get().initNPCFate(npcId);
        }
        
        const currentFate = state.npcFates[npcId];
        
        // 如果状态相同，不更新
        if (currentFate.currentState === newState) {
          return;
        }
        
        set(s => ({
          npcFates: {
            ...s.npcFates,
            [npcId]: {
              ...s.npcFates[npcId],
              currentState: newState,
              stateHistory: [
                ...s.npcFates[npcId].stateHistory,
                {
                  state: newState,
                  timestamp: Date.now(),
                  reason
                }
              ]
            }
          }
        }));
        
        const npcInfo = PRESET_NPCS[npcId];
        
        // 通知
        if (state.config.showNotifications) {
        }
      },
      
      /**
       * 检查状态转换条件
       * 来源：时空剧场 engine.js 状态机逻辑
       */
      checkStateTransitions: (
        npcId: NPCId,
        context: {
          relationship?: number;
          interactionCount?: number;
          values?: Record<string, number>;
          lastChoice?: string;
        }
      ) => {
        const state = get();
        const currentFate = state.npcFates[npcId];
        
        if (!currentFate) return null;
        
        const currentState = currentFate.currentState;
        
        // 遍历所有转换规则
        for (const transition of NPC_STATE_TRANSITIONS) {
          // 只处理从当前状态出发的转换
          if (transition.from !== currentState) continue;
          
          let isMatch = false;
          
          switch (transition.condition.type) {
            case 'relationship_threshold':
              isMatch = context.relationship !== undefined && 
                (transition.condition.threshold! > 0 
                  ? context.relationship >= transition.condition.threshold!
                  : context.relationship <= transition.condition.threshold!);
              break;
            
            case 'interaction_count':
              isMatch = context.interactionCount !== undefined &&
                context.interactionCount >= (transition.condition.threshold || 5);
              break;
            
            case 'value_threshold':
              if (context.values && transition.condition.dimension) {
                const value = context.values[transition.condition.dimension];
                isMatch = value >= (transition.condition.threshold || 70);
              }
              break;
            
            case 'choice_made':
              isMatch = context.lastChoice === transition.condition.interactionType;
              break;
          }
          
          if (isMatch) {
            get().updateNPCFate(npcId, transition.to, transition.description);
            return transition.to;
          }
        }
        
        return null;
      },
      
      /**
       * 获取NPC当前状态
       */
      getNPCStatus: (npcId: NPCId) => {
        return get().npcFates[npcId];
      },
      
      /**
       * 获取NPC列表
       */
      getNPCList: () => {
        const { npcFates } = get();
        return Object.values(npcFates);
      },
      
      /**
       * 获取NPC关系值
       * 关系值存储在 NPCBase 中，这里返回预设值 + 偏移
       */
      getNPCRelationship: (npcId: NPCId) => {
        const npcInfo = PRESET_NPCS[npcId];
        const fateStatus = get().npcFates[npcId];
        
        // 基础关系值
        const baseRelationship = npcInfo?.relationship || 0;
        
        // 根据状态调整
        let stateModifier = 0;
        if (fateStatus) {
          switch (fateStatus.currentState) {
            case NPCFateState.HISTORICAL:
              stateModifier = 10;
              break;
            case NPCFateState.DRAMATIC:
              stateModifier = 15;
              break;
            case NPCFateState.AFTERLIFE:
              stateModifier = 20;
              break;
            case NPCFateState.DEATH:
              stateModifier = -100;
              break;
            case NPCFateState.SHADOW:
              stateModifier = 0;
              break;
          }
        }
        
        return baseRelationship + stateModifier;
      },
      
      /**
       * 修改NPC关系值
       */
      modifyRelationship: (npcId: NPCId, delta: number) => {
        const npcInfo = PRESET_NPCS[npcId];
        if (!npcInfo) return;
        
        const currentRelationship = npcInfo.relationship;
        const newRelationship = Math.max(-100, Math.min(100, currentRelationship + delta));
        
      },
      
      /**
       * 获取NPC交互历史
       */
      getNPCInteractions: (npcId: NPCId) => {
        return get().interactions.filter(i => i.id.includes(npcId));
      },
      
      /**
       * 检查NPC是否解锁
       */
      isNPCUnlocked: (npcId: NPCId) => {
        const state = get();
        const npcInfo = PRESET_NPCS[npcId];
        
        if (!npcInfo) return false;
        
        // 检查解锁条件
        if (!npcInfo.unlockCondition) return true;
        
        // 已在追踪列表中视为已解锁
        if (state.npcFates[npcId]) return true;
        
        // 后续可扩展条件检查逻辑
        return false;
      },
      
      /**
       * 重置NPC状态
       */
      resetNPC: (npcId: NPCId) => {
        const npcInfo = PRESET_NPCS[npcId];
        if (!npcInfo) return;
        
        set(state => {
          const newNpcFates = { ...state.npcFates };
          delete newNpcFates[npcId];
          
          return {
            npcFates: newNpcFates,
            interactions: state.interactions.filter(
              i => !i.id.includes(npcId)
            )
          };
        });
        
      },
      
      /**
       * 重置所有NPC
       */
      resetAllNPCs: () => {
        set({
          npcFates: {},
          interactions: []
        });
      },
      
      /**
       * 更新配置
       */
      updateConfig: (newConfig: Partial<NPCFateConfig>) => {
        set(state => ({
          config: { ...state.config, ...newConfig }
        }));
      },
      
      /**
       * 获取命运摘要
       */
      getFateSummary: () => {
        const { npcFates, interactions } = get();
        
        const byState: Record<NPCFateState, number> = {
          [NPCFateState.INITIAL]: 0,
          [NPCFateState.HISTORICAL]: 0,
          [NPCFateState.DRAMATIC]: 0,
          [NPCFateState.AFTERLIFE]: 0,
          [NPCFateState.DEATH]: 0,
          [NPCFateState.SHADOW]: 0
        };
        
        Object.values(npcFates).forEach(fate => {
          byState[fate.currentState]++;
        });
        
        return {
          totalNPCs: Object.keys(npcFates).length,
          byState,
          totalInteractions: interactions.length
        };
      }
    }),
    {
      name: 'st_npc_fate_store',
      partialize: (state) => ({
        npcFates: state.npcFates,
        interactions: state.interactions,
        config: state.config
      })
    }
  )
);

/**
 * 辅助函数：初始化所有预设NPC
 */
export function initializeAllNPCs(): void {
  const store = useNPCFateStore.getState();
  
  Object.keys(PRESET_NPCS).forEach(npcId => {
    if (!store.npcFates[npcId]) {
      store.initNPCFate(npcId);
    }
  });
}

/**
 * 辅助函数：触发NPC事件
 */
export function triggerNPCEvent(
  npcId: string,
  eventType: NPCInteraction['type'],
  description: string,
  options?: {
    affectRelationship?: number;
    triggerStateCheck?: boolean;
    values?: Record<string, number>;
  }
): void {
  const store = useNPCFateStore.getState();
  
  // 记录交互
  store.recordInteraction(npcId, eventType, description, options?.affectRelationship);
  
  // 检查状态转换
  if (options?.triggerStateCheck) {
    store.checkStateTransitions(npcId, {
      values: options.values,
      interactionCount: store.npcFates[npcId]?.interactionCount
    });
  }
}

/**
 * 辅助函数：获取NPC可视化数据
 */
export function getNPCVisualizationData(): {
  npcs: { id: string; name: string; icon: string; state: NPCFateState }[];
  connections: { from: string; to: string; label: string }[];
} {
  const store = useNPCFateStore.getState();
  
  const npcs = Object.keys(PRESET_NPCS).map(id => ({
    id,
    name: PRESET_NPCS[id].name,
    icon: PRESET_NPCS[id].icon,
    state: store.npcFates[id]?.currentState || PRESET_NPCS[id].initialState
  }));
  
  // 简单连接关系（基于状态）
  const connections: { from: string; to: string; label: string }[] = [];
  
  return { npcs, connections };
}