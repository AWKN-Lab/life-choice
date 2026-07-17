/**
 * 多结局引擎类型定义
 * 基于时空剧场四维数值系统迁移
 * 来源：时空剧场/game/engine.js - 四维数值系统 + checkEnding()
 */

import { z } from 'zod';

/**
 * 四维数值系统
 * 来源：时空剧场 gameValues = { freedom: 50, equality: 50, rule: 50, justice: 50 }
 */
export interface FourDimensionalValues {
  /** 自由度 - 开放性、创新性、自主决策 */
  freedom: number;
  /** 平等性 - 公平分配、去中心化、机会均等 */
  equality: number;
  /** 规则性 - 秩序维护、流程遵循、标准执行 */
  rule: number;
  /** 正义性 - 道德判断、权益保护、社会责任 */
  justice: number;
}

/**
 * 默认四维数值（中立状态）
 */
export const DEFAULT_VALUES: FourDimensionalValues = {
  freedom: 50,
  equality: 50,
  rule: 50,
  justice: 50
};

/**
 * 数值变化配置
 * 用于定义每次操作对数值的影响
 */
export interface ValueChangeConfig {
  /** 数值维度 */
  dimension: keyof FourDimensionalValues;
  /** 变化量（正数增加，负数减少） */
  delta: number;
  /** 变化原因描述 */
  reason: string;
}

/**
 * 结局类型
 * 来源：时空剧场 endingConditions
 */
export enum EndingType {
  /** 历史线结局 - 偏向规则与秩序 */
  HISTORICAL = 'historical',
  /** 戏剧线结局 - 偏向自由与正义 */
  DRAMATIC = 'dramatic',
  /** 轮回线结局 - 偏向平等与平衡 */
  AFTERLIFE = 'afterlife',
  /** 普通结局 - 未达到特殊结局条件 */
  NORMAL = 'normal'
}

/**
 * 结局定义
 */
export interface Ending {
  /** 结局ID */
  id: string;
  /** 结局名称 */
  name: string;
  /** 结局描述 */
  description: string;
  /** 结局类型 */
  type: EndingType;
  /** 结局图标 */
  icon: string;
  /** 触发条件 */
  conditions: EndingCondition[];
  /** 解锁所需最低卡牌数（用于轮回线） */
  minItems?: number;
}

/**
 * 结局触发条件
 */
export interface EndingCondition {
  /** 条件类型 */
  type: 'value_greater' | 'value_less' | 'value_between' | 'custom';
  /** 数值维度 */
  dimension?: keyof FourDimensionalValues;
  /** 阈值 */
  threshold?: number;
  /** 范围上下限 */
  range?: [number, number];
  /** 自定义条件函数（JSON化） */
  customExpr?: string;
}

/**
 * 决策选项
 */
export interface DecisionOption {
  /** 选项ID */
  id: string;
  /** 选项标题 */
  title: string;
  /** 选项描述 */
  description?: string;
  /** 触发的数值变化 */
  valueChanges: ValueChangeConfig[];
  /** 可能触发的卡牌ID */
  rewardCards?: string[];
  /** 是否为关键决策（影响结局） */
  isCritical?: boolean;
  /** 决策结果反馈 */
  feedback?: {
    positive?: string;
    negative?: string;
    neutral?: string;
  };
}

/**
 * 决策场景
 */
export interface DecisionScene {
  /** 场景ID */
  id: string;
  /** 场景标题 */
  title: string;
  /** 场景描述 */
  description: string;
  /** 可选决策 */
  options: DecisionOption[];
  /** 当前数值状态提示 */
  valueHint?: {
    dimension: keyof FourDimensionalValues;
    direction: 'increase' | 'decrease';
    message: string;
  };
}

/**
 * 结局记录
 */
export interface EndingRecord {
  /** 结局ID */
  endingId: string;
  /** 达成时间 */
  achievedAt: number;
  /** 最终数值状态 */
  finalValues: FourDimensionalValues;
  /** 关键决策记录 */
  keyDecisions: string[];
}

/**
 * 多结局引擎配置
 */
export interface MultiEndingConfig {
  /** 是否启用多结局系统 */
  enabled: boolean;
  /** 自动保存关键决策 */
  autoSaveDecisions: boolean;
  /** 显示数值变化提示 */
  showValueHint: boolean;
  /** 结局预览模式（到达触发条件前是否显示结局） */
  endingPreview: boolean;
}

/**
 * 预设结局定义
 * 来源：时空剧场 endingConditions
 */
export const PRESET_ENDINGS: Record<EndingType, Ending> = {
  [EndingType.HISTORICAL]: {
    id: 'historical',
    name: '历史线结局',
    description: '你选择了秩序与规则的道路，在历史的洪流中留下了浓墨重彩的一笔。',
    type: EndingType.HISTORICAL,
    icon: '📜',
    conditions: [
      { type: 'value_greater', dimension: 'rule', threshold: 80 },
      { type: 'value_less', dimension: 'freedom', threshold: 30 }
    ]
  },
  
  [EndingType.DRAMATIC]: {
    id: 'dramatic',
    name: '戏剧线结局',
    description: '你选择了自由与正义的道路，在命运的舞台上书写了属于自己的传奇。',
    type: EndingType.DRAMATIC,
    icon: '🎭',
    conditions: [
      { type: 'value_greater', dimension: 'freedom', threshold: 80 },
      { type: 'value_greater', dimension: 'justice', threshold: 70 }
    ]
  },
  
  [EndingType.AFTERLIFE]: {
    id: 'afterlife',
    name: '轮回线结局',
    description: '你选择了平等与平衡的道路，超越了一切的界限，进入了永恒的轮回。',
    type: EndingType.AFTERLIFE,
    icon: '🔄',
    conditions: [
      { type: 'value_between', dimension: 'equality', range: [60, 100] }
    ],
    minItems: 5  // 需要收集至少5张卡牌
  },
  
  [EndingType.NORMAL]: {
    id: 'normal',
    name: '普通结局',
    description: '你的选择留下了独特的印记，无论好坏，都是属于你自己的故事。',
    type: EndingType.NORMAL,
    icon: '📖',
    conditions: [
      { type: 'custom', customExpr: 'true' }  // 默认结局
    ]
  }
};

/**
 * Zod Schema 用于数据验证
 */
export const FourDimensionalValuesSchema = z.object({
  freedom: z.number().min(0).max(100),
  equality: z.number().min(0).max(100),
  rule: z.number().min(0).max(100),
  justice: z.number().min(0).max(100)
});

export const EndingRecordSchema = z.object({
  endingId: z.string(),
  achievedAt: z.number(),
  finalValues: FourDimensionalValuesSchema,
  keyDecisions: z.array(z.string())
});

export const MultiEndingConfigSchema = z.object({
  enabled: z.boolean(),
  autoSaveDecisions: z.boolean(),
  showValueHint: z.boolean(),
  endingPreview: z.boolean()
});

/**
 * 类型导出
 */
export type ValueDimension = keyof FourDimensionalValues;
export type EndingTypeString = keyof typeof EndingType;