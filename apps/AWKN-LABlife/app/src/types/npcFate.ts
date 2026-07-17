/**
 * NPC命运追踪系统类型定义
 * 基于时空剧场NPC_FATE_CONFIG状态机迁移
 * 来源：时空剧场/game/engine.js - NPC_FATE_CONFIG, npcFate
 */

import { z } from 'zod';

/**
 * NPC命运状态
 * 来源：时空剧场 NPC_FATE_CONFIG stateLabels
 */
export enum NPCFateState {
  /** 初始状态 - 命运未知 */
  INITIAL = 'initial',
  /** 历史线 - 命运导向历史结局 */
  HISTORICAL = 'historical',
  /** 戏剧线 - 命运导向戏剧结局 */
  DRAMATIC = 'dramatic',
  /** 轮回线 - 命运导向轮回结局 */
  AFTERLIFE = 'afterlife',
  /** 消亡 - NPC消亡/失败 */
  DEATH = 'death',
  /** 隐没 - NPC被遗忘/隐藏 */
  SHADOW = 'shadow'
}

/**
 * NPC命运状态标签（中文显示）
 */
export const NPC_FATE_STATE_LABELS: Record<NPCFateState, string> = {
  [NPCFateState.INITIAL]: '命运未知',
  [NPCFateState.HISTORICAL]: '历史线',
  [NPCFateState.DRAMATIC]: '戏剧线',
  [NPCFateState.AFTERLIFE]: '轮回线',
  [NPCFateState.DEATH]: '消亡',
  [NPCFateState.SHADOW]: '隐没'
};

/**
 * NPC交互记录
 */
export interface NPCInteraction {
  /** 交互ID */
  id: string;
  /** 交互时间 */
  timestamp: number;
  /** 交互类型 */
  type: 'dialog' | 'choice' | 'event' | 'reward';
  /** 交互描述 */
  description: string;
  /** 触发的状态变化 */
  stateChanges?: {
    from: NPCFateState;
    to: NPCFateState;
  };
  /** 好感度变化 */
  affectionDelta?: number;
}

/**
 * NPC基础信息
 */
export interface NPCBase {
  /** NPC ID */
  id: string;
  /** NPC名称 */
  name: string;
  /** NPC图标/头像 */
  icon: string;
  /** NPC描述 */
  description: string;
  /** 初始状态 */
  initialState: NPCFateState;
  /** 关系值（-100 到 100） */
  relationship: number;
  /** 解锁条件 */
  unlockCondition?: {
    type: 'value_threshold' | 'task_complete' | 'card_collected';
    requirement: Record<string, number | string>;
  };
}

/**
 * NPC命运追踪状态
 */
export interface NPCFateStatus {
  /** NPC ID */
  npcId: string;
  /** 当前状态 */
  currentState: NPCFateState;
  /** 状态历史 */
  stateHistory: {
    state: NPCFateState;
    timestamp: number;
    reason?: string;
  }[];
  /** 交互次数 */
  interactionCount: number;
  /** 最后交互时间 */
  lastInteractionAt?: number;
  /** 结局贡献度（0-100） */
  endingContribution: number;
}

/**
 * NPC命运系统配置
 */
export interface NPCFateConfig {
  /** 是否启用NPC命运追踪 */
  enabled: boolean;
  /** 显示NPC状态变化通知 */
  showNotifications: boolean;
  /** 自动追踪所有交互 */
  autoTrackInteractions: boolean;
  /** 结局判定时考虑NPC命运 */
  considerInEnding: boolean;
}

/**
 * 预设NPC定义
 * 来源：时空剧场 NPC_FATE_CONFIG.charConfig
 */
export const PRESET_NPCS: Record<string, NPCBase> = {
  // ===== 基础NPC =====
  advisor: {
    id: 'advisor',
    name: '顾问',
    icon: '🧙',
    description: '智慧的指引者，能够提供关键信息和建议',
    initialState: NPCFateState.INITIAL,
    relationship: 0,
    unlockCondition: {
      type: 'value_threshold',
      requirement: { justice: 30 }
    }
  },
  
  // ===== 关键NPC =====
  mentor: {
    id: 'mentor',
    name: '导师',
    icon: '📚',
    description: '技术上的引路人，帮助提升能力',
    initialState: NPCFateState.INITIAL,
    relationship: 0,
    unlockCondition: {
      type: 'task_complete',
      requirement: { tutorial: 1 }
    }
  },
  
  rival: {
    id: 'rival',
    name: '竞争者',
    icon: '⚔️',
    description: '既是对手也是动力来源',
    initialState: NPCFateState.INITIAL,
    relationship: -20,
    unlockCondition: {
      type: 'value_threshold',
      requirement: { freedom: 40 }
    }
  },
  
  ally: {
    id: 'ally',
    name: '盟友',
    icon: '🤝',
    description: '坚定的支持者，共同面对挑战',
    initialState: NPCFateState.INITIAL,
    relationship: 20,
    unlockCondition: {
      type: 'value_threshold',
      requirement: { equality: 40 }
    }
  },
  
  // ===== 特殊NPC =====
  guardian: {
    id: 'guardian',
    name: '守护者',
    icon: '🛡️',
    description: '规则与秩序的维护者',
    initialState: NPCFateState.INITIAL,
    relationship: 0,
    unlockCondition: {
      type: 'value_threshold',
      requirement: { rule: 50 }
    }
  },
  
  rebel: {
    id: 'rebel',
    name: '变革者',
    icon: '🔥',
    description: '自由与创新的倡导者',
    initialState: NPCFateState.INITIAL,
    relationship: 0,
    unlockCondition: {
      type: 'value_threshold',
      requirement: { freedom: 50 }
    }
  },
  
  // ===== 隐藏NPC =====
  shadow: {
    id: 'shadow',
    name: '暗影',
    icon: '🌑',
    description: '神秘的存在，只在特定条件下出现',
    initialState: NPCFateState.SHADOW,
    relationship: 0,
    unlockCondition: {
      type: 'card_collected',
      requirement: { rare_cards: 5 }
    }
  }
};

/**
 * NPC状态转换规则
 */
export interface NPCStateTransition {
  /** 源状态 */
  from: NPCFateState;
  /** 目标状态 */
  to: NPCFateState;
  /** 触发条件 */
  condition: {
    /** 条件类型 */
    type: 'relationship_threshold' | 'interaction_count' | 'value_threshold' | 'choice_made';
    /** 阈值 */
    threshold?: number;
    /** 关联维度 */
    dimension?: 'freedom' | 'equality' | 'rule' | 'justice';
    /** 交互类型 */
    interactionType?: string;
  };
  /** 转换描述 */
  description: string;
}

/**
 * 预设状态转换规则
 */
export const NPC_STATE_TRANSITIONS: NPCStateTransition[] = [
  // 历史线转换
  {
    from: NPCFateState.INITIAL,
    to: NPCFateState.HISTORICAL,
    condition: {
      type: 'value_threshold',
      threshold: 70,
      dimension: 'rule'
    },
    description: '遵守规则，获得历史线的认可'
  },
  
  // 戏剧线转换
  {
    from: NPCFateState.INITIAL,
    to: NPCFateState.DRAMATIC,
    condition: {
      type: 'value_threshold',
      threshold: 70,
      dimension: 'freedom'
    },
    description: '追求自由，进入戏剧线的舞台'
  },
  
  // 轮回线转换
  {
    from: NPCFateState.INITIAL,
    to: NPCFateState.AFTERLIFE,
    condition: {
      type: 'value_threshold',
      threshold: 70,
      dimension: 'equality'
    },
    description: '维护平衡，踏入轮回的漩涡'
  },
  
  // 消亡转换
  {
    from: NPCFateState.INITIAL,
    to: NPCFateState.DEATH,
    condition: {
      type: 'relationship_threshold',
      threshold: -50
    },
    description: '关系破裂，NPC从故事中消亡'
  }
];

/**
 * Zod Schema 用于数据验证
 */
export const NPCFateStatusSchema = z.object({
  npcId: z.string(),
  currentState: z.nativeEnum(NPCFateState),
  stateHistory: z.array(z.object({
    state: z.nativeEnum(NPCFateState),
    timestamp: z.number(),
    reason: z.string().optional()
  })),
  interactionCount: z.number(),
  lastInteractionAt: z.number().optional(),
  endingContribution: z.number()
});

export const NPCInteractionSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: z.enum(['dialog', 'choice', 'event', 'reward']),
  description: z.string(),
  stateChanges: z.object({
    from: z.nativeEnum(NPCFateState),
    to: z.nativeEnum(NPCFateState)
  }).optional(),
  affectionDelta: z.number().optional()
});

/**
 * 类型导出
 */
export type NPCId = string;
export type NPCMap = Record<NPCId, NPCBase>;