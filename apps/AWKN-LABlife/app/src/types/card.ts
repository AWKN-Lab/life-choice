/**
 * 经验卡牌系统类型定义
 * 基于时空剧场卡牌系统迁移
 * 来源：时空剧场/game/engine.js - CARDS配置
 */

import { z } from 'zod';

/**
 * 卡牌稀有度等级
 */
export enum CardRarity {
  COMMON = 'common',     // 普通
  RARE = 'rare',         // 稀有
  EPIC = 'epic',         // 史诗
  LEGENDARY = 'legendary' // 传说
}

/**
 * 卡牌效果类型
 */
export enum CardEffectType {
  VALUE_ADD = 'value_add',           // 数值增加
  VALUE_SUB = 'value_sub',           // 数值减少
  UNLOCK_ABILITY = 'unlock_ability', // 解锁能力
  BUFF = 'buff',                     // 临时增益
  DEBUFF = 'debuff'                  // 临时减益
}

/**
 * 卡牌效果定义
 * 格式：{ effectKey: effectValue }
 * 例如：{ justice: 20 } 表示正义值+20
 */
export interface CardEffect {
  /** 效果类型 */
  type: CardEffectType;
  /** 效果键值对，如 { freedom: 10, equality: -5 } 或 { ability: 'code_review_boost' } */
  effect: Record<string, number | string>;
  /** 效果描述，用于显示 */
  description: string;
}

/**
 * 卡牌基础信息
 */
export interface CardBase {
  /** 卡牌唯一标识 */
  id: string;
  /** 卡牌名称 */
  name: string;
  /** 卡牌图标URL或emoji */
  icon: string;
  /** 卡牌稀有度 */
  rarity: CardRarity;
  /** 卡牌效果 */
  effect: CardEffect;
  /** 获取途径描述 */
  source: string;
}

/**
 * 用户已收集的卡牌实例
 */
export interface CollectedCard {
  /** 卡牌基础ID */
  cardId: string;
  /** 收集时间（Unix时间戳） */
  collectedAt: number;
  /** 是否已激活使用 */
  isActivated: boolean;
  /** 激活时间 */
  activatedAt?: number;
}

/**
 * 卡牌收集状态
 */
export interface CardCollectionState {
  /** 已收集的卡牌列表 */
  cards: CollectedCard[];
  /** 已解锁的卡牌ID集合 */
  unlockedCardIds: string[];
  /** 卡牌总收集数 */
  totalCollected: number;
  /** 稀有卡牌数量 */
  rareCount: number;
}

/**
 * 卡牌系统配置
 */
export interface CardSystemConfig {
  /** 是否启用卡牌系统 */
  enabled: boolean;
  /** 自动收集完成任务获得的卡牌 */
  autoCollect: boolean;
  /** 显示卡牌通知 */
  showNotification: boolean;
  /** 最大收集数量（0表示无限制） */
  maxCollection: number;
}

/**
 * 任务完成卡牌奖励配置
 */
export interface TaskCardReward {
  /** 任务类型标识 */
  taskType: string;
  /** 奖励卡牌ID */
  cardId: string;
  /** 触发条件（可选） */
  condition?: {
    /** 最小任务价值评分 */
    minValueScore?: number;
    /** 最小执行时长（分钟） */
    minDuration?: number;
  };
}

/**
 * 预设卡牌库（可扩展）
 * 来源：时空剧场 CARDS 配置模式
 */
export const PRESET_CARDS: Record<string, CardBase> = {
  // ===== 基础经验卡 =====
  first_success: {
    id: 'first_success',
    name: '初次成功',
    icon: '🌟',
    rarity: CardRarity.COMMON,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { experience: 10 },
      description: '首次完成任务，获得10点经验'
    },
    source: '完成首个任务'
  },
  
  // ===== 任务类型卡 =====
  code_review: {
    id: 'code_review',
    name: '代码审查官',
    icon: '🔍',
    rarity: CardRarity.RARE,
    effect: {
      type: CardEffectType.UNLOCK_ABILITY,
      effect: { ability: 'code_review_boost' },
      description: '代码审查效率+20%'
    },
    source: '完成代码审查任务'
  },
  
  bug_fix: {
    id: 'bug_fix',
    name: 'Bug终结者',
    icon: '🦟',
    rarity: CardRarity.RARE,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { stability: 15 },
      description: '系统稳定性+15'
    },
    source: '修复关键Bug'
  },
  
  document_write: {
    id: 'document_write',
    name: '文档大师',
    icon: '📝',
    rarity: CardRarity.COMMON,
    effect: {
      type: CardEffectType.UNLOCK_ABILITY,
      effect: { ability: 'doc_generation_boost' },
      description: '文档生成速度+30%'
    },
    source: '完成文档编写任务'
  },
  
  // ===== 稀有卡牌 =====
  speed_demon: {
    id: 'speed_demon',
    name: '极速先锋',
    icon: '⚡',
    rarity: CardRarity.EPIC,
    effect: {
      type: CardEffectType.BUFF,
      effect: { speed: 50 },
      description: '执行速度+50%，持续1小时'
    },
    source: '在压力下快速完成任务'
  },
  
  quality_guardian: {
    id: 'quality_guardian',
    name: '质量守护者',
    icon: '🛡️',
    rarity: CardRarity.EPIC,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { quality: 30 },
      description: '输出质量+30'
    },
    source: '交付高质量产出'
  },
  
  // ===== 传说卡牌 =====
  perfect_score: {
    id: 'perfect_score',
    name: '完美主义',
    icon: '💎',
    rarity: CardRarity.LEGENDARY,
    effect: {
      type: CardEffectType.UNLOCK_ABILITY,
      effect: { ability: 'perfect_mode' },
      description: '解锁完美模式：所有指标+50%'
    },
    source: '连续5个任务获得满分评价'
  },
  
  legend_of_speed: {
    id: 'legend_of_speed',
    name: '速度传说',
    icon: '🚀',
    rarity: CardRarity.LEGENDARY,
    effect: {
      type: CardEffectType.BUFF,
      effect: { speed: 100, stamina: 50 },
      description: '传说级速度：速度+100%，体力+50'
    },
    source: '在极短时间内完成高难度任务'
  },
  
  // ===== 数值类卡牌（对应时空剧场四维系统） =====
  freedom_champion: {
    id: 'freedom_champion',
    name: '自由倡导者',
    icon: '🦅',
    rarity: CardRarity.RARE,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { freedom: 20 },
      description: '自由值+20'
    },
    source: '做出开放性决策'
  },
  
  equality_guardian: {
    id: 'equality_guardian',
    name: '平等守护者',
    icon: '⚖️',
    rarity: CardRarity.RARE,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { equality: 20 },
      description: '平等值+20'
    },
    source: '维护公平原则'
  },
  
  rule_keeper: {
    id: 'rule_keeper',
    name: '规则守护者',
    icon: '📜',
    rarity: CardRarity.RARE,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { rule: 20 },
      description: '规则值+20'
    },
    source: '遵守规范流程'
  },
  
  justice_champion: {
    id: 'justice_champion',
    name: '正义使者',
    icon: '⚔️',
    rarity: CardRarity.RARE,
    effect: {
      type: CardEffectType.VALUE_ADD,
      effect: { justice: 20 },
      description: '正义值+20'
    },
    source: '做出公正判断'
  }
};

/**
 * Zod schema 用于数据验证
 */
export const CollectedCardSchema = z.object({
  cardId: z.string(),
  collectedAt: z.number(),
  isActivated: z.boolean(),
  activatedAt: z.number().optional()
});

export const CardCollectionStateSchema = z.object({
  cards: z.array(CollectedCardSchema),
  unlockedCardIds: z.array(z.string()),
  totalCollected: z.number(),
  rareCount: z.number()
});

export const CardSystemConfigSchema = z.object({
  enabled: z.boolean(),
  autoCollect: z.boolean(),
  showNotification: z.boolean(),
  maxCollection: z.number()
});

/**
 * 类型导出
 */
export type CardId = string;
export type CardMap = Record<CardId, CardBase>;