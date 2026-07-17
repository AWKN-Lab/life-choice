import { Injectable, BadRequestException } from '@nestjs/common';
import {
  FiveLayerOutputSchema,
  FiveLayerOutput,
  FIVE_LAYER_KEYS,
  FIVE_LAYER_LABELS,
  FIVE_LAYER_MARKERS,
  parseFiveLayersFromText,
} from '../schemas/output-schema';
// P0-5 修复: 统一 Barnum 短语库源（原内联 5 条身份感巴纳姆）
import { BARNUM_IDENTITY_PHRASES } from '../../shared/constants/barnum-phrases';

export interface QualityResult {
  passed: boolean;
  score: number;
  warnings: string[];
  filteredText: string;
}

export interface QualityGateRetryResult extends QualityResult {
  retries: number;
  retryHistory: Array<{ attempt: number; score: number; passed: boolean }>;
}

export interface FiveLayerQualityResult {
  passed: boolean;
  score: number;
  warnings: string[];
  layerStatus: Record<string, { present: boolean; hasContent: boolean }>;
  identityScore: number;
  // P0-4 Step 6: 显式返回缺失字段列表供修复器使用
  // 修复器调用前提：仅当 isComplete=false 时此字段有值
  missingLayers?: (keyof import('../schemas/output-schema').FiveLayerOutput)[];
  /** 原始解析出的 layers（用于修复器补全） */
  parsedLayers?: Partial<import('../schemas/output-schema').FiveLayerOutput>;
  /** 兼容老调用方（isComplete=false 时为 false） */
  repairable?: boolean;
}

// 身份感正则
const IDENTITY_POSITIVE = /我[看观察觉得认为说听]/;
const IDENTITY_NEGATIVE = /系统[说认为提示]|AI[说认为提示]|作为AI|命中注定|上天注定/;
// P0-5 修复: 改为引用统一源 BARNUM_IDENTITY_PHRASES（原内联 5 条）

const BANNED_PATTERNS = [
  { pattern: /coreAction/gi, replacement: '' },
  { pattern: /algorithm/gi, replacement: '' },
  { pattern: /calc-engine/gi, replacement: '' },
  { pattern: /基于算法证据包/gi, replacement: '' },
  { pattern: /steps/gi, replacement: '' },
];

const BANNED_PHRASES = [
  '顺势而为', '保持努力', '未来可期', '注意沟通',
  '建议您', '请注意', '的建议是', '建议您可以',
];

const RAW_JSON_PATTERN = /\{[\s\S]*?\}/;

@Injectable()
export class QualityGateService {
  evaluate(text: string): QualityResult {
    let filteredText = text;
    const warnings: string[] = [];
    let score = 100;

    for (const { pattern, replacement } of BANNED_PATTERNS) {
      const before = filteredText.length;
      filteredText = filteredText.replace(pattern, replacement);
      if (filteredText.length !== before) {
        warnings.push(`filtered banned pattern: ${pattern.source}`);
        score -= 5;
      }
    }

    for (const phrase of BANNED_PHRASES) {
      if (filteredText.includes(phrase)) {
        const count = (filteredText.match(new RegExp(phrase, 'g')) || []).length;
        warnings.push(`found banned phrase: ${phrase} (x${count})`);
        score -= 10;
      }
    }

    if (RAW_JSON_PATTERN.test(filteredText)) {
      warnings.push('found raw JSON pattern, may need re-generation');
      score -= 15;
    }

    const lines = filteredText.split('\n');
    const longLines = lines.filter(l => l.length > 200);
    if (longLines.length > 0) {
      warnings.push(`found ${longLines.length} lines over 200 chars`);
      score -= longLines.length * 2;
    }

    return {
      passed: score >= 60 && warnings.length < 3,
      score: Math.max(0, Math.min(100, score)),
      warnings,
      filteredText: filteredText.trim(),
    };
  }

  /**
   * P1-3: 5 层结构校验 + 身份感校验（zod schema 强制版）
   * 检查 FiveLayerOutput 的结构完整性和角色一致性
   * 缺层时抛 VALIDATION_ERROR，不降级放行
   *
   * P0-4 兼容性说明：本方法保留 P1-3 的 throw 行为，5 个老测试不动。
   * 新增 evaluateFiveLayersSafe() 方法供 orchestrator 调用（不抛错，返回 missingLayers）。
   */
  evaluateFiveLayers(text: string): FiveLayerQualityResult {
    const warnings: string[] = [];
    let score = 100;
    const layerStatus: Record<string, { present: boolean; hasContent: boolean }> = {};

    // 1. 用 zod schema 解析 5 层内容
    const { layers, missingLayers, isComplete } = parseFiveLayersFromText(text);

    // 2. 检查每层状态
    for (const key of FIVE_LAYER_KEYS) {
      const present = !missingLayers.includes(key);
      const hasContent = present && !!layers[key] && layers[key]!.length >= 5;
      layerStatus[key] = { present, hasContent };

      if (!present) {
        warnings.push(`5层校验: 缺少${FIVE_LAYER_LABELS[key]}标记`);
        score -= 12;
      } else if (!hasContent) {
        warnings.push(`5层校验: ${FIVE_LAYER_LABELS[key]}内容为空或过短`);
        score -= 8;
      }
    }

    // 3. 用 zod schema 严格校验（缺层时不再降级放行，直接抛错）
    if (!isComplete) {
      const validationResult = FiveLayerOutputSchema.safeParse(layers);
      if (!validationResult.success) {
        // P1-3: 缺层抛 VALIDATION_ERROR，不返回前端
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `5层输出校验失败：缺少 ${missingLayers.map(k => FIVE_LAYER_LABELS[k]).join('、')}`,
          missingLayers: missingLayers.map(k => FIVE_LAYER_LABELS[k]),
          warnings,
        });
      }
    }

    // 4. 身份感校验
    let identityScore = 50; // 基线

    if (IDENTITY_POSITIVE.test(text)) {
      identityScore += 30;
    }

    if (IDENTITY_NEGATIVE.test(text)) {
      identityScore -= 30;
      warnings.push('身份感校验: 发现非角色化表达（系统/AI/命中注定）');
    }

    // 巴纳姆语句检测
    const barnumCount = BARNUM_IDENTITY_PHRASES.filter(phrase => text.includes(phrase)).length;
    if (barnumCount > 0) {
      identityScore -= barnumCount * 10;
      warnings.push(`身份感校验: 发现${barnumCount}处巴纳姆语句`);
    }

    identityScore = Math.max(0, Math.min(100, identityScore));

    if (identityScore < 60) {
      score -= 15;
      warnings.push(`身份感校验: 身份感分数过低(${identityScore})`);
    }

    // 5. 全部为空检测
    const allEmpty = Object.values(layerStatus).every(s => !s.hasContent);
    if (allEmpty) {
      score = 0;
      warnings.push('5层校验: 所有层内容均为空');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      passed: score >= 60 && !allEmpty,
      score,
      warnings,
      layerStatus,
      identityScore,
    };
  }

  /**
   * P0-4 Step 6: 5 层安全校验（不抛错版本）
   *
   * 与 evaluateFiveLayers 区别：
   * - evaluateFiveLayers: 缺层时 throw BadRequestException（P1-3 行为，老测试依赖）
   * - evaluateFiveLayersSafe: 缺层时返回 missingLayers + parsedLayers + repairable=true（不抛错）
   *
   * 调用方（orchestrator）走修复器逻辑时应使用 Safe 版本。
   * 评分/身份感等逻辑与 evaluateFiveLayers 完全一致。
   */
  evaluateFiveLayersSafe(text: string): FiveLayerQualityResult & {
    missingLayers?: (keyof import('../schemas/output-schema').FiveLayerOutput)[];
    parsedLayers?: Partial<import('../schemas/output-schema').FiveLayerOutput>;
    repairable?: boolean;
  } {
    const warnings: string[] = [];
    let score = 100;
    const layerStatus: Record<string, { present: boolean; hasContent: boolean }> = {};

    const { layers, missingLayers, isComplete } = parseFiveLayersFromText(text);

    for (const key of FIVE_LAYER_KEYS) {
      const present = !missingLayers.includes(key);
      const hasContent = present && !!layers[key] && layers[key]!.length >= 5;
      layerStatus[key] = { present, hasContent };

      if (!present) {
        warnings.push(`5层校验: 缺少${FIVE_LAYER_LABELS[key]}标记`);
        score -= 12;
      } else if (!hasContent) {
        warnings.push(`5层校验: ${FIVE_LAYER_LABELS[key]}内容为空或过短`);
        score -= 8;
      }
    }

    // 身份感校验（与 evaluateFiveLayers 逻辑一致）
    let identityScore = 50;
    if (IDENTITY_POSITIVE.test(text)) {
      identityScore += 30;
    }
    if (IDENTITY_NEGATIVE.test(text)) {
      identityScore -= 30;
      warnings.push('身份感校验: 发现非角色化表达（系统/AI/命中注定）');
    }
    const barnumCount = BARNUM_IDENTITY_PHRASES.filter(phrase => text.includes(phrase)).length;
    if (barnumCount > 0) {
      identityScore -= barnumCount * 10;
      warnings.push(`身份感校验: 发现${barnumCount}处巴纳姆语句`);
    }
    identityScore = Math.max(0, Math.min(100, identityScore));
    if (identityScore < 60) {
      score -= 15;
      warnings.push(`身份感校验: 身份感分数过低(${identityScore})`);
    }

    const allEmpty = Object.values(layerStatus).every(s => !s.hasContent);
    if (allEmpty) {
      score = 0;
      warnings.push('5层校验: 所有层内容均为空');
    }
    score = Math.max(0, Math.min(100, score));

    return {
      passed: score >= 60 && !allEmpty && isComplete,
      score,
      warnings,
      layerStatus,
      identityScore,
      // P0-4 新增：供 orchestrator 调用修复器
      missingLayers: missingLayers.length > 0 ? missingLayers : undefined,
      parsedLayers: layers,
      repairable: missingLayers.length > 0 && missingLayers.length <= 2,
    };
  }

  /**
   * 带重试的评估：evaluate() 失败时重试最多 3 次，逐步放宽阈值
   *
   * 重试策略：
   *   - 第 1 次（attempt 1）：标准评估
   *   - 第 2 次（attempt 2）：放宽 BANNED_PHRASES（跳过「建议您」「请注意」）
   *   - 第 3 次（attempt 3）：跳过全部 BANNED_PHRASES，仅保留技术模式过滤
   *   - 3 次均失败 → 抛 VALIDATION_ERROR（P1-3: 不再降级放行）
   */
  evaluateWithRetry(text: string, maxRetries = 3): QualityGateRetryResult {
    const retryHistory: Array<{ attempt: number; score: number; passed: boolean }> = [];

    // 分层放宽策略
    const retryStrategies: Array<{ skipPhrases: string[] }> = [
      { skipPhrases: [] },                              // attempt 1: 全量
      { skipPhrases: ['建议您', '请注意'] },              // attempt 2: 跳过温和建议
      { skipPhrases: [...BANNED_PHRASES] },              // attempt 3: 跳过全部短语
    ];

    for (let attempt = 0; attempt < Math.min(maxRetries, retryStrategies.length); attempt++) {
      const { skipPhrases } = retryStrategies[attempt];
      const result = this.evaluateWithSkips(text, skipPhrases);
      retryHistory.push({ attempt: attempt + 1, score: result.score, passed: result.passed });

      if (result.passed) {
        // 重试成功后返回标注结果
        return {
          ...result,
          retries: attempt,
          retryHistory,
        };
      }
    }

    // P1-3: 3 次均失败 → 抛 VALIDATION_ERROR（不再降级放行）
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `质量门禁: ${maxRetries} 次重试均未通过`,
      retryHistory: retryHistory.map(h => `attempt ${h.attempt}: score=${h.score} passed=${h.passed}`),
    });
  }

  private evaluateWithSkips(text: string, skipPhrases: string[]): QualityResult {
    let filteredText = text;
    const warnings: string[] = [];
    let score = 100;

    for (const { pattern, replacement } of BANNED_PATTERNS) {
      const before = filteredText.length;
      filteredText = filteredText.replace(pattern, replacement);
      if (filteredText.length !== before) {
        warnings.push(`filtered banned pattern: ${pattern.source}`);
        score -= 5;
      }
    }

    for (const phrase of BANNED_PHRASES) {
      if (skipPhrases.includes(phrase)) continue;
      if (filteredText.includes(phrase)) {
        const count = (filteredText.match(new RegExp(phrase, 'g')) || []).length;
        warnings.push(`found banned phrase: ${phrase} (x${count})`);
        score -= 10;
      }
    }

    if (RAW_JSON_PATTERN.test(filteredText)) {
      warnings.push('found raw JSON pattern, may need re-generation');
      score -= 15;
    }

    const lines = filteredText.split('\n');
    const longLines = lines.filter(l => l.length > 200);
    if (longLines.length > 0) {
      warnings.push(`found ${longLines.length} lines over 200 chars`);
      score -= longLines.length * 2;
    }

    return {
      passed: score >= 60 && warnings.length < 3,
      score: Math.max(0, Math.min(100, score)),
      warnings,
      filteredText: filteredText.trim(),
    };
  }
}
