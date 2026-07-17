// ============================================================
// Factor Registry v1 — P1-09 (2026-07-12)
//
// 目标：为 V2 链路提供稳定的因子身份（evidenceRefs），让每条 KlineNode
// 都可追溯到具体规则与输入。KlineNode.evidenceRefs 必须非空数组（§3.2 契约）。
//
// 设计：
//   - 15 因子（与 KlineCalculationEngine.weightedScore 一一对应）
//   - 每个因子有稳定 ID（"rule:da-yun" 等），不随版本变更
//   - 注册表版本化，支持 P4 算法校准时升版
//   - 提供 buildEvidenceRefs() 给 KlineDecisionService 生成节点证据
//
// 不可破坏的约束：
//   1. ID 一旦发布不再变更（向后兼容）
//   2. 新增因子必须升版本号
//   3. 删除因子只能标记 deprecated，不能物理删除
// ============================================================

import { BaziFullResult } from '../calc-engine/bazi-calculator-wrapper';

/** 注册表版本号 — 升版需同步 KlineCalculationEngine.ENGINE_VERSION */
export const FACTOR_REGISTRY_VERSION = 'v1';

/** 因子类别 */
export type FactorCategory =
  | 'time' // 时间维度：大运/流年
  | 'chart' // 命盘结构：用神/神煞/五行
  | 'relation' // 关系：刑冲合害/大运流年关系
  | 'ten-gods' // 十神
  | 'risk' // 风险惩罚
  | 'input'; // 用户输入

/** 因子定义（不可变） */
export interface FactorDefinition {
  /** 稳定唯一 ID，格式 "rule:xxx" 或 "input:xxx" */
  id: string;
  /** 中文名称 */
  name: string;
  /** 类别 */
  category: FactorCategory;
  /** 权重（与 KlineCalculationEngine.weightedScore 一致；负数表示扣减） */
  weight: number;
  /** 计算逻辑简述 */
  description: string;
  /** 引入版本 */
  sinceVersion: string;
  /** 是否已废弃（仅记录，不参与计算） */
  deprecated?: boolean;
}

// ============================================================
// 15 因子注册表（与 KlineCalculationEngine 逐行对应）
// ============================================================

export const FACTOR_DEFINITIONS: Readonly<Record<string, FactorDefinition>> = Object.freeze({
  // --- 时间维度 ---
  'rule:da-yun': {
    id: 'rule:da-yun',
    name: '大运影响',
    category: 'time',
    weight: 0.2,
    description: '当前大运对命局的总体影响评分（scoreDaYun）',
    sinceVersion: 'v1',
  },
  'rule:liu-nian': {
    id: 'rule:liu-nian',
    name: '流年影响',
    category: 'time',
    weight: 0.18,
    description: '当前流年干支对日主的作用（scoreGanZhi + scoreElement）',
    sinceVersion: 'v1',
  },
  'rule:yong-shen': {
    id: 'rule:yong-shen',
    name: '用神判断',
    category: 'chart',
    weight: 0.1,
    description: '流年干支是否生扶用神（scoreYongShen）',
    sinceVersion: 'v1',
  },
  'rule:da-yun-liu-nian-relation': {
    id: 'rule:da-yun-liu-nian-relation',
    name: '大运流年关系',
    category: 'relation',
    weight: 0.05,
    description: '大运与流年之间的合/冲/刑/害关系（scoreRelations）',
    sinceVersion: 'v1',
  },
  'rule:shen-sha': {
    id: 'rule:shen-sha',
    name: '神煞影响',
    category: 'chart',
    weight: 0.08,
    description: '流年地支触发的神煞（天乙/文昌/桃花/驿马等）（scoreShenSha）',
    sinceVersion: 'v1',
  },
  'rule:base-chart-wuxing': {
    id: 'rule:base-chart-wuxing',
    name: '五行基础盘',
    category: 'chart',
    weight: 0.12,
    description: '原局五行平衡度（computeBaseChart — 100 减方差×8）',
    sinceVersion: 'v1',
  },

  // --- 十神（8 个） ---
  'rule:shi-shen:bi-jian': {
    id: 'rule:shi-shen:bi-jian',
    name: '比肩',
    category: 'ten-gods',
    weight: 0.02,
    description: '比肩数量影响（computeShiShenFactors.biJian）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:jie-cai': {
    id: 'rule:shi-shen:jie-cai',
    name: '劫财',
    category: 'ten-gods',
    weight: 0.02,
    description: '劫财数量影响（computeShiShenFactors.jieCai）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:shi-shen': {
    id: 'rule:shi-shen:shi-shen',
    name: '食神',
    category: 'ten-gods',
    weight: 0.02,
    description: '食神数量影响（computeShiShenFactors.shiShen）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:shang-guan': {
    id: 'rule:shi-shen:shang-guan',
    name: '伤官',
    category: 'ten-gods',
    weight: 0.02,
    description: '伤官数量影响（computeShiShenFactors.shangGuan）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:pian-cai': {
    id: 'rule:shi-shen:pian-cai',
    name: '偏财',
    category: 'ten-gods',
    weight: 0.02,
    description: '偏财数量影响（computeShiShenFactors.pianCai）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:zheng-cai': {
    id: 'rule:shi-shen:zheng-cai',
    name: '正财',
    category: 'ten-gods',
    weight: 0.02,
    description: '正财数量影响（computeShiShenFactors.zhengCai）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:qi-sha': {
    id: 'rule:shi-shen:qi-sha',
    name: '七杀',
    category: 'ten-gods',
    weight: 0.02,
    description: '七杀数量影响（computeShiShenFactors.qiSha）',
    sinceVersion: 'v1',
  },
  'rule:shi-shen:zheng-guan': {
    id: 'rule:shi-shen:zheng-guan',
    name: '正官',
    category: 'ten-gods',
    weight: 0.02,
    description: '正官数量影响（computeShiShenFactors.zhengGuan）',
    sinceVersion: 'v1',
  },

  // --- 关系/风险 ---
  'rule:xing-chong-he-hai': {
    id: 'rule:xing-chong-he-hai',
    name: '刑冲合害',
    category: 'relation',
    weight: 0.05,
    description: '原局与流年的刑冲合害关系数（computeXingChongHeHai）',
    sinceVersion: 'v1',
  },
  'rule:risk-penalty': {
    id: 'rule:risk-penalty',
    name: '风险惩罚',
    category: 'risk',
    weight: -1, // 扣减项，不参与加权
    description: '特定组合触发的风险扣分（computeRiskPenalty — 子午卯酉全/寅申巳亥全等）',
    sinceVersion: 'v1',
  },
});

/** 所有 15 因子的稳定 ID 列表（含 1 个风险扣减，共 16 项定义） */
export const ALL_FACTOR_IDS: Readonly<string[]> = Object.freeze(Object.keys(FACTOR_DEFINITIONS));

// ============================================================
// 输入证据（Input Evidence Refs）
// ============================================================

export type InputEvidenceKind =
  | 'birth-date'
  | 'birth-time'
  | 'birth-year'
  | 'gender'
  | 'da-yun-start-age'
  | 'da-yun-current'
  | 'liu-nian-current'
  | 'view-mode'
  | 'range-years';

/** 构造输入证据引用 */
export function inputEvidence(kind: InputEvidenceKind, value: string | number | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  return `input:${kind}=${value}`;
}

// ============================================================
// EvidenceRefs 构造器 — 给 KlineDecisionService 用
// ============================================================

export interface EvidenceContext {
  baziResult: BaziFullResult;
  year: number;
  month?: number;
  age?: number;
  daYun?: string;
  liuNian?: string;
  viewMode?: string;
  birthTime?: string;
}

/**
 * 构造一条 bar 的 evidenceRefs。
 *
 * 默认包含：
 *   - 输入证据（birth-date/birth-year/gender/da-yun-current/liu-nian-current）
 *   - 主要规则证据（da-yun/liu-nian/yong-shen/shen-sha/base-chart/xing-chong-he-hai）
 *   - 不含十神细分（避免 evidenceRefs 过长；十神细节通过 factorsHash 追溯）
 *
 * @returns 非空数组（保证 KlineNode 契约：evidenceRefs 必须非空）
 */
export function buildEvidenceRefs(ctx: EvidenceContext | undefined | null): string[] {
  const refs: string[] = [];

  // 防御空 ctx（契约要求返回非空数组）
  const safeCtx: Partial<EvidenceContext> = ctx || {};
  const bazi = safeCtx.baziResult;

  // --- 输入证据 ---
  if (bazi?.liuNian?.[0]?.year !== undefined) {
    refs.push(`input:birth-year=${bazi.liuNian[0].year}`);
  }
  if (safeCtx.year !== undefined) {
    refs.push(`input:liu-nian-current=${safeCtx.year}`);
  }
  if (safeCtx.age !== undefined) {
    refs.push(`input:age=${safeCtx.age}`);
  }
  if (safeCtx.month !== undefined) {
    refs.push(`input:month=${safeCtx.month}`);
  }
  if (safeCtx.daYun) {
    refs.push(`input:da-yun-current=${safeCtx.daYun}`);
  }
  if (safeCtx.liuNian) {
    refs.push(`input:liu-nian-gan-zhi=${safeCtx.liuNian}`);
  }
  if (safeCtx.birthTime) {
    refs.push(`input:birth-time=${safeCtx.birthTime}`);
  }
  if (safeCtx.viewMode) {
    refs.push(`input:view-mode=${safeCtx.viewMode}`);
  }

  // --- 规则证据（核心因子） ---
  refs.push('rule:da-yun');
  refs.push('rule:liu-nian');
  refs.push('rule:yong-shen');
  refs.push('rule:da-yun-liu-nian-relation');
  refs.push('rule:shen-sha');
  refs.push('rule:base-chart-wuxing');
  refs.push('rule:xing-chong-he-hai');
  refs.push('rule:risk-penalty');

  // 去重并保证非空（契约要求）
  const unique = Array.from(new Set(refs));
  if (unique.length === 0) {
    // 极端兜底：永远返回至少 1 条
    return ['rule:base-chart-wuxing'];
  }
  return unique;
}

// ============================================================
// 查询 API
// ============================================================

/** 获取因子定义（不存在返回 undefined） */
export function getFactorDefinition(id: string): FactorDefinition | undefined {
  return FACTOR_DEFINITIONS[id];
}

/** 列出指定类别的所有因子 */
export function listFactorsByCategory(category: FactorCategory): FactorDefinition[] {
  return Object.values(FACTOR_DEFINITIONS).filter(f => f.category === category && !f.deprecated);
}

/** 验证 evidenceRefs 数组是否合法（非空 + 至少含 1 条规则证据） */
export function validateEvidenceRefs(refs: string[] | undefined | null): { valid: boolean; reason?: string } {
  if (!refs || !Array.isArray(refs)) {
    return { valid: false, reason: 'evidenceRefs 不是数组' };
  }
  if (refs.length === 0) {
    return { valid: false, reason: 'evidenceRefs 不能为空数组（契约 §3.2）' };
  }
  const hasRule = refs.some(r => r.startsWith('rule:'));
  if (!hasRule) {
    return { valid: false, reason: 'evidenceRefs 至少含 1 条 rule: 前缀的规则证据' };
  }
  const unknown = refs.filter(r => r.startsWith('rule:') && !FACTOR_DEFINITIONS[r]);
  if (unknown.length > 0) {
    return { valid: false, reason: `未知规则 ID: ${unknown.join(', ')}` };
  }
  return { valid: true };
}

/** 计算所有因子的权重总和（不含风险扣减） */
export function sumFactorWeights(): number {
  return Object.values(FACTOR_DEFINITIONS)
    .filter(f => !f.deprecated && f.weight > 0)
    .reduce((sum, f) => sum + f.weight, 0);
}
