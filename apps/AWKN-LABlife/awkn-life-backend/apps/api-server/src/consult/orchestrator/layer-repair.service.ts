import { Injectable, Logger } from '@nestjs/common';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';
import {
  FiveLayerOutput,
  FIVE_LAYER_KEYS,
  FIVE_LAYER_LABELS,
  FIVE_LAYER_MARKERS,
} from '../schemas/output-schema';

/**
 * P0-4 Step 5: 5 层输出定向修复器
 *
 * 适用场景：
 * - 质量门 evaluateFiveLayers 返回 missingLayers（如 [clause, nextAction]）
 * - 已有 4 层内容，仅 1-2 层缺失（避免大量重生成浪费 token）
 *
 * 工作机制：
 * - 对每个缺失层，构造针对性 prompt：「请根据以下已有 4 层内容，补全【数术断句】」
 * - 用较低的 temperature (0.3) 保证补全风格的稳定性
 * - 失败时返回 existingLayers（让 orchestrator 兜底填充 L620-L628）
 *
 * 失败兜底（关键）：
 * - LLM 调用失败 → 返回 existingLayers（不抛错，让 orchestrator 兜底）
 * - 解析失败 → 返回 existingLayers
 * - 此服务只补 1-2 层，不重生成整个 5 层（节省 token + 时间）
 */
@Injectable()
export class LayerRepairService {
  private readonly logger = new Logger(LayerRepairService.name);

  constructor(private readonly llmProviders: LlmProvidersService) {}

  /**
   * 补全缺失的 5 层字段
   * @param missingLayers 缺失的层 key（如 ['clause', 'nextAction']）
   * @param existingLayers 已有的 4 层内容
   * @param question 用户问题（用于构造针对性 prompt）
   * @returns 完整 5 层对象（成功）或 existingLayers（失败兜底）
   */
  async repairMissingLayers(
    missingLayers: (keyof FiveLayerOutput)[],
    existingLayers: Partial<FiveLayerOutput>,
    question: string,
  ): Promise<Partial<FiveLayerOutput>> {
    // 边界：没有缺失或缺失太多（>2 层）→ 不修复，避免浪费
    if (missingLayers.length === 0) {
      return existingLayers;
    }
    if (missingLayers.length > 2) {
      this.logger.warn(
        `[LayerRepair] 缺失${missingLayers.length}层，超过2层不修复，返回 existingLayers 走兜底`,
      );
      return existingLayers;
    }

    // 边界：缺失 2 层且不是相邻层（兜底场景太偏）→ 不修复
    const keyPositions = FIVE_LAYER_KEYS.map((k, i) => ({ k, i }));
    const missingPositions = missingLayers
      .map((l) => keyPositions.find((p) => p.k === l)?.i)
      .filter((i): i is number => i !== undefined);

    this.logger.log(
      `[LayerRepair] 开始修复缺失层: missing=[${missingLayers.map((l) => FIVE_LAYER_LABELS[l]).join('、')}], 已有=${Object.keys(existingLayers).filter((k) => existingLayers[k as keyof FiveLayerOutput]?.trim()).length}层`,
    );

    try {
      // 构造已有层摘要，给 LLM 做上下文
      const existingSummary = FIVE_LAYER_KEYS
        .filter((k) => !missingLayers.includes(k) && existingLayers[k]?.trim())
        .map((k) => `【${FIVE_LAYER_LABELS[k]}】${existingLayers[k]}`)
        .join('\n\n');

      // 对每个缺失层分别构造 prompt（每次只补 1 层更稳定）
      const repaired: Partial<FiveLayerOutput> = { ...existingLayers };

      for (const layerKey of missingLayers) {
        const repairedContent = await this.repairOneLayer(
          layerKey,
          existingSummary,
          question,
        );
        if (repairedContent && repairedContent.length >= 5) {
          repaired[layerKey] = repairedContent;
          this.logger.log(
            `[LayerRepair] ${FIVE_LAYER_LABELS[layerKey]} 修复成功，长度=${repairedContent.length}`,
          );
        } else {
          this.logger.warn(
            `[LayerRepair] ${FIVE_LAYER_LABELS[layerKey]} 修复结果无效，保留原值`,
          );
        }
      }

      return repaired;
    } catch (err) {
      // P0-4 计划要求：修复器失败时不抛错，降级到现有 existingLayers
      this.logger.warn(
        `[LayerRepair] 修复过程异常: ${(err as Error).message}，返回 existingLayers`,
      );
      return existingLayers;
    }
  }

  /**
   * 修复单层内容
   */
  private async repairOneLayer(
    layerKey: keyof FiveLayerOutput,
    existingSummary: string,
    question: string,
  ): Promise<string | null> {
    const marker = FIVE_LAYER_MARKERS[layerKey];
    const label = FIVE_LAYER_LABELS[layerKey];

    // 收集 layerKey 的 marker 字面量，提示 LLM 用对应标记
    const markerHint = marker.source.split('|')[0].replace(/[【】\\[\\]\\\\]/g, '').trim();

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content:
          '你是命理分析师助手。根据已有内容，针对性补全缺失的那一层。输出只用【xxx】标记包裹内容，不要添加其他层级。',
      },
      {
        role: 'user',
        content: `用户问题：${question}

已有内容（${existingSummary ? '参考上下文' : '无'}）：
${existingSummary || '（前次生成内容较短，仅提供用户问题作为依据）'}

请补全【${label}】这一层。要求：
1. 用【${markerHint || label}】或类似标记开头
2. 长度 30-150 字，与已有层风格一致
3. 直接输出补全内容，不要额外解释`,
      },
    ];

    try {
      const result = await this.llmProviders.chatWithFallback(messages, {
        maxTokens: 800, // 单层补全不需要太多 token
        temperature: 0.3,
        jsonMode: false,
      });

      return this.extractLayerContent(result.content, label, markerHint);
    } catch (err) {
      this.logger.warn(`[LayerRepair] ${label} LLM 调用失败: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * 从 LLM 输出中提取目标层的内容
   */
  private extractLayerContent(text: string, label: string, markerHint: string): string | null {
    if (!text || text.trim().length < 5) {
      return null;
    }

    // 尝试匹配【xxx】格式
    const bracketMatch = text.match(/【([^】]+)】\s*([\s\S]{5,300}?)(?=【|$)/);
    if (bracketMatch && bracketMatch[2]) {
      return bracketMatch[2].trim();
    }

    // 退化：返回全文（去除 self-eval 等）
    let cleaned = text.replace(/\[\/?SELF_EVAL\]/g, '').trim();
    // 取第一段（避免把后续层的内容也带上）
    const firstPara = cleaned.split(/\n\n+/)[0];
    return firstPara && firstPara.length >= 5 ? firstPara.trim() : null;
  }
}
