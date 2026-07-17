/**
 * P1-1: 输出格式 zod schema 定义
 *
 * 计划版 5 层输出（与 prompt-layers.ts 计划版 5 层标记对齐）：
 * - clause: 数术断句（用术数语言陈述排盘结果）
 * - halfMountain: 半山落句（用张半山金句风格给出核心判断）
 * - detail: 具体落点（落到具体的人/事/时/数字）
 * - cost: 代价提醒（说清放弃什么、面对什么）
 * - nextAction: 下一步动作（给出可执行的下一步）
 *
 * 三段式 ZhangbanshanOutput（主路径）：
 * - judgment: 核心结论
 * - premise: 前提条件
 * - cost: 代价
 */
import { z } from 'zod';

// ─── 计划版 5 层输出 schema ───

export const FiveLayerOutputSchema = z.object({
  clause: z.string().min(5, '数术断句不能为空或少于 5 字'),
  halfMountain: z.string().min(5, '半山落句不能为空或少于 5 字'),
  detail: z.string().min(5, '具体落点不能为空或少于 5 字'),
  cost: z.string().min(5, '代价提醒不能为空或少于 5 字'),
  nextAction: z.string().min(5, '下一步动作不能为空或少于 5 字'),
});

export type FiveLayerOutput = z.infer<typeof FiveLayerOutputSchema>;

// P2-2 修复: 用 as const 收窄为字面量元组类型，避免 keyof FiveLayerOutput 含 symbol 导致 quality-gate.service.ts L114 layerStatus[key] 报 "Type 'symbol' cannot be used as an index type"
export const FIVE_LAYER_KEYS = [
  'clause',
  'halfMountain',
  'detail',
  'cost',
  'nextAction',
] as const;

export const FIVE_LAYER_LABELS: Record<keyof FiveLayerOutput, string> = {
  clause: '数术断句',
  halfMountain: '半山落句',
  detail: '具体落点',
  cost: '代价提醒',
  nextAction: '下一步动作',
};

export const FIVE_LAYER_MARKERS: Record<keyof FiveLayerOutput, RegExp> = {
  clause: /【数术断句】|【L1】|【排盘】|【断句】|数术断句[：:]|一、数术/,
  halfMountain: /【半山落句】|【L2】|【核心判断】|【落句】|半山落句[：:]|二、半山/,
  detail: /【具体落点】|【L3】|【落点】|【细节】|具体落点[：:]|三、落点/,
  cost: /【代价提醒】|【L4】|【代价】|代价提醒[：:]|四、代价/,
  nextAction: /【下一步动作】|【L5】|【动作】|【下一步】|下一步动作[：:]|五、动作/,
};

export const FIVE_LAYER_FALLBACK_MARKERS: Record<keyof FiveLayerOutput, RegExp> = {
  clause: /数术|排盘|断句|四柱|大运/i,
  halfMountain: /半山|落句|核心|判断/i,
  detail: /落点|具体|细节|人|事|时/i,
  cost: /代价|放弃|面对/i,
  nextAction: /下一步|动作|建议|执行/i,
};

// ─── 三段式 ZhangbanshanOutput schema（主路径） ───

export const ZhangbanshanOutputSchema = z.object({
  judgment: z.string().min(5, '判断不能为空或少于 5 字'),
  premise: z.string().min(5, '前提不能为空或少于 5 字'),
  cost: z.string().min(5, '代价不能为空或少于 5 字'),
});

export type ZhangbanshanOutput = z.infer<typeof ZhangbanshanOutputSchema>;

// ─── 解析工具函数 ───

export function parseFiveLayersFromText(text: string): {
  layers: Partial<FiveLayerOutput>;
  missingLayers: (keyof FiveLayerOutput)[];
  isComplete: boolean;
} {
  const layers: Partial<FiveLayerOutput> = {};
  const missingLayers: (keyof FiveLayerOutput)[] = [];

  // P1-1 fix: 去掉 fallback 逻辑 — fallback 跨层匹配会导致缺层测试失败
  // P1-3 设计意图是强制 5 层结构，只用 strict marker 匹配
  for (const key of FIVE_LAYER_KEYS) {
    const marker = FIVE_LAYER_MARKERS[key];

    // P1-1 fix: marker.source 可能含 |，需用非捕获组 (?:...) 包裹，否则 | 会拆分正则
    const strictMatch = text.match(new RegExp(`(?:${marker.source})\\s*([\\s\\S]*?)(?=【|$)`));
    if (strictMatch && strictMatch[1] && strictMatch[1].trim().length >= 5) {
      layers[key] = strictMatch[1].trim();
      continue;
    }

    missingLayers.push(key);
  }

  return {
    layers,
    missingLayers,
    isComplete: missingLayers.length === 0,
  };
}

export function validateFiveLayers(layers: Partial<FiveLayerOutput>): {
  success: boolean;
  data?: FiveLayerOutput;
  error?: z.ZodError;
} {
  return FiveLayerOutputSchema.safeParse(layers);
}