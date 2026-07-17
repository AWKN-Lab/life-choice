/**
 * 多结局引擎Store
 * 基于时空剧场四维数值系统 + checkEnding()
 * 来源：时空剧场/game/engine.js - gameValues, checkEnding()
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FourDimensionalValues,
  EndingRecord,
  DecisionOption,
  MultiEndingConfig,
  ValueChangeConfig
} from '../types/multiEnding';
import { PRESET_ENDINGS, DEFAULT_VALUES, EndingType } from '../types/multiEnding';

/**
 * 多结局引擎状态接口
 */
interface MultiEndingState {
  // === 状态 ===
  
  /** 当前四维数值 */
  values: FourDimensionalValues;
  
  /** 已解锁的结局 */
  unlockedEndings: EndingType[];
  
  /** 达成过的结局记录 */
  endingHistory: EndingRecord[];
  
  /** 关键决策记录 */
  decisionHistory: string[];
  
  /** 配置 */
  config: MultiEndingConfig;
  
  // === Actions ===
  
  /** 应用数值变化 */
  applyValueChange: (change: ValueChangeConfig) => void;
  
  /** 应用多个数值变化（批量） */
  applyValueChanges: (changes: ValueChangeConfig[]) => void;
  
  /** 执行决策 */
  makeDecision: (decisionId: string, option: DecisionOption) => EndingType | null;
  
  /** 检查并触发结局判定 */
  checkEnding: () => EndingType | null;
  
  /** 解锁结局 */
  unlockEnding: (endingType: EndingType) => void;
  
  /** 获取当前数值状态 */
  getCurrentValues: () => FourDimensionalValues;
  
  /** 获取数值变化方向提示 */
  getValueHint: (dimension: keyof FourDimensionalValues) => string;
  
  /** 重置数值 */
  resetValues: () => void;
  
  /** 更新配置 */
  updateConfig: (config: Partial<MultiEndingConfig>) => void;
  
  /** 清空历史 */
  clearHistory: () => void;
  
  /** 获取数值分布摘要 */
  getValuesSummary: () => string;
  
  /** 获取结局预览（哪些结局可能达成） */
  getEndingPreview: () => {
    type: EndingType;
    progress: number;  // 0-100
    missing: string[];
  }[];
}

/** 默认配置 */
const defaultConfig: MultiEndingConfig = {
  enabled: true,
  autoSaveDecisions: true,
  showValueHint: true,
  endingPreview: false
};

/** 初始状态 */
const initialValues: FourDimensionalValues = { ...DEFAULT_VALUES };

/**
 * 检查是否满足结局条件
 * 来源：时空剧场 engine.js checkEnding() 函数
 */
function evaluateEndingConditions(
  ending: typeof PRESET_ENDINGS[EndingType],
  values: FourDimensionalValues,
  totalCollected: number = 0
): boolean {
  for (const condition of ending.conditions) {
    switch (condition.type) {
      case 'value_greater':
        if (values[condition.dimension!] <= condition.threshold!) {
          return false;
        }
        break;
      
      case 'value_less':
        if (values[condition.dimension!] >= condition.threshold!) {
          return false;
        }
        break;
      
      case 'value_between': {
        const [min, max] = condition.range!;
        if (values[condition.dimension!] < min || values[condition.dimension!] > max) {
          return false;
        }
        break;
      }
      
      case 'custom':
        // 自定义条件需要额外处理，这里简单处理为true
        break;
    }
    
    // 检查最小收集物品数
    if (ending.minItems && totalCollected < ending.minItems) {
      return false;
    }
  }
  
  return true;
}

/**
 * 计算结局达成进度
 */
function calculateEndingProgress(
  ending: typeof PRESET_ENDINGS[EndingType],
  values: FourDimensionalValues
): { progress: number; missing: string[] } {
  let satisfied = 0;
  const total = ending.conditions.length;
  const missing: string[] = [];
  
  for (const condition of ending.conditions) {
    let isSatisfied = false;
    
    switch (condition.type) {
      case 'value_greater':
        isSatisfied = values[condition.dimension!] > condition.threshold!;
        if (!isSatisfied) {
          missing.push(`${condition.dimension} > ${condition.threshold} (当前: ${values[condition.dimension!]})`);
        }
        break;
      
      case 'value_less':
        isSatisfied = values[condition.dimension!] < condition.threshold!;
        if (!isSatisfied) {
          missing.push(`${condition.dimension} < ${condition.threshold} (当前: ${values[condition.dimension!]})`);
        }
        break;
      
      case 'value_between': {
        const [min, max] = condition.range!;
        isSatisfied = values[condition.dimension!] >= min && values[condition.dimension!] <= max;
        if (!isSatisfied) {
          missing.push(`${condition.dimension} 在 ${min}-${max} 之间 (当前: ${values[condition.dimension!]})`);
        }
        break;
      }
      
      case 'custom':
        isSatisfied = true;
        break;
    }
    
    if (isSatisfied) satisfied++;
  }
  
  return {
    progress: Math.round((satisfied / total) * 100),
    missing
  };
}

/**
 * 多结局引擎Store
 */
export const useMultiEndingStore = create<MultiEndingState>()(
  persist(
    (set, get) => ({
      // === 初始状态 ===
      values: { ...initialValues },
      unlockedEndings: [],
      endingHistory: [],
      decisionHistory: [],
      config: { ...defaultConfig },
      
      // === Actions ===
      
      /**
       * 应用单个数值变化
       * 来源：时空剧场 engine.js 数值更新逻辑
       */
      applyValueChange: (change: ValueChangeConfig) => {
        set(state => ({
          values: {
            ...state.values,
            [change.dimension]: Math.max(0, Math.min(100, 
              state.values[change.dimension] + change.delta
            ))
          }
        }));
        
      },
      
      /**
       * 批量应用数值变化
       */
      applyValueChanges: (changes: ValueChangeConfig[]) => {
        changes.forEach(change => get().applyValueChange(change));
      },
      
      /**
       * 执行决策
       * 来源：时空剧场 makeChoice() 函数
       */
      makeDecision: (decisionId: string, option: DecisionOption) => {
        const state = get();
        
        // 记录决策历史
        if (state.config.autoSaveDecisions) {
          set(s => ({
            decisionHistory: [...s.decisionHistory, decisionId]
          }));
        }
        
        // 应用数值变化
        if (option.valueChanges.length > 0) {
          get().applyValueChanges(option.valueChanges);
        }
        
        // 检查结局
        const ending = get().checkEnding();
        
        return ending;
      },
      
      /**
       * 检查并触发结局判定
       * 来源：时空剧场 engine.js checkEnding() 函数
       */
      checkEnding: () => {
        const { values, unlockedEndings } = get();
        
        // 按优先级检查结局
        const endingPriority: EndingType[] = [
          EndingType.HISTORICAL,
          EndingType.DRAMATIC,
          EndingType.AFTERLIFE,
          EndingType.NORMAL  // 普通结局兜底
        ];
        
        for (const endingType of endingPriority) {
          const ending = PRESET_ENDINGS[endingType];
          
          if (evaluateEndingConditions(ending, values)) {
            // 如果已解锁，直接返回
            if (!unlockedEndings.includes(endingType)) {
              // 解锁新结局
              set(state => ({
                unlockedEndings: [...state.unlockedEndings, endingType],
                endingHistory: [...state.endingHistory, {
                  endingId: endingType,
                  achievedAt: Date.now(),
                  finalValues: { ...values },
                  keyDecisions: state.decisionHistory.slice(-5)  // 最近5个决策
                }]
              }));
              
            }
            
            return endingType;
          }
        }
        
        return null;
      },
      
      /**
       * 解锁结局（手动）
       */
      unlockEnding: (endingType: EndingType) => {
        const { unlockedEndings } = get();
        
        if (!unlockedEndings.includes(endingType)) {
          set(state => ({
            unlockedEndings: [...state.unlockedEndings, endingType]
          }));
        }
      },
      
      /**
       * 获取当前数值
       */
      getCurrentValues: () => {
        return { ...get().values };
      },
      
      /**
       * 获取数值变化方向提示
       */
      getValueHint: (dimension: keyof FourDimensionalValues) => {
        const value = get().values[dimension];
        
        if (value >= 80) return '极高';
        if (value >= 60) return '偏高';
        if (value >= 40) return '中等';
        if (value >= 20) return '偏低';
        return '极低';
      },
      
      /**
       * 重置数值
       */
      resetValues: () => {
        set({ values: { ...initialValues } });
      },
      
      /**
       * 更新配置
       */
      updateConfig: (newConfig: Partial<MultiEndingConfig>) => {
        set(state => ({
          config: { ...state.config, ...newConfig }
        }));
      },
      
      /**
       * 清空历史
       */
      clearHistory: () => {
        set({
          endingHistory: [],
          decisionHistory: [],
          unlockedEndings: []
        });
      },
      
      /**
       * 获取数值分布摘要
       */
      getValuesSummary: () => {
        const { values } = get();
        
        const parts = Object.entries(values).map(([key, value]) => {
          const hint = get().getValueHint(key as keyof FourDimensionalValues);
          return `${key}:${value}(${hint})`;
        });
        
        return parts.join(' | ');
      },
      
      /**
       * 获取结局预览
       */
      getEndingPreview: () => {
        const { values } = get();
        
        return Object.values(EndingType).map(type => {
          const ending = PRESET_ENDINGS[type];
          const { progress, missing } = calculateEndingProgress(ending, values);
          
          return {
            type,
            progress,
            missing
          };
        });
      }
    }),
    {
      name: 'st_multi_ending_store',
      partialize: (state) => ({
        values: state.values,
        unlockedEndings: state.unlockedEndings,
        endingHistory: state.endingHistory,
        decisionHistory: state.decisionHistory,
        config: state.config
      })
    }
  )
);

/**
 * 辅助函数：执行带反馈的决策
 */
export function makeDecisionWithFeedback(
  decisionId: string,
  option: DecisionOption
): { ending: EndingType | null; feedback: string } {
  const store = useMultiEndingStore.getState();
  
  // 计算决策后的数值变化
  const currentValues = store.getCurrentValues();
  const changes = option.valueChanges;
  
  // 应用变化
  store.applyValueChanges(changes);
  
  // 记录决策
  if (store.config.autoSaveDecisions) {
    store.makeDecision(decisionId, option);
  }
  
  // 获取反馈
  const newValues = store.getCurrentValues();
  const netChange = changes.reduce((sum, c) => sum + c.delta, 0);
  
  let feedback: string;
  if (option.feedback) {
    if (netChange > 0 && option.feedback.positive) {
      feedback = option.feedback.positive;
    } else if (netChange < 0 && option.feedback.negative) {
      feedback = option.feedback.negative;
    } else if (option.feedback.neutral) {
      feedback = option.feedback.neutral;
    } else {
      feedback = `决策已生效，数值变化: ${netChange > 0 ? '+' : ''}${netChange}`;
    }
  } else {
    feedback = `决策已生效，数值变化: ${netChange > 0 ? '+' : ''}${netChange}`;
  }
  
  const ending = store.checkEnding();
  
  return { ending, feedback };
}

/**
 * 辅助函数：获取当前结局状态
 */
export function getEndingStatus(): {
  currentValues: FourDimensionalValues;
  unlockedEndings: EndingType[];
  preview: ReturnType<MultiEndingState['getEndingPreview']>;
  summary: string;
} {
  const store = useMultiEndingStore.getState();
  
  return {
    currentValues: store.getCurrentValues(),
    unlockedEndings: store.unlockedEndings,
    preview: store.getEndingPreview(),
    summary: store.getValuesSummary()
  };
}