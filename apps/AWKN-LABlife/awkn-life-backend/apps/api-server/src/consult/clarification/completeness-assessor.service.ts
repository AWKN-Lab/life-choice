import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { LlmProvidersService } from '../../llm-providers/llm-providers.service';
import {
  SLOT_SCHEMAS,
  CONSULT_TYPE_KEYWORDS,
  ConsultType,
  SlotDefinition,
  getRequiredSlots,
} from './slot-schema';

/**
 * 信息完整性评估结果
 */
export interface CompletenessAssessment {
  consultType: ConsultType;
  filledSlots: string[];
  missingSlots: string[];
  clarityScore: number; // 0-1
  needsClarification: boolean;
  clarifyingTarget: string; // 追问目标槽位名（无追问时为空字符串）
}

/**
 * 评估器入参
 */
export interface AssessorOptions {
  question: string;
  dialogueHistory?: Array<{ role: string; content: string }>;
}

/**
 * T2.2: 信息完整性评估服务
 *
 * 替代 DialogueService 中基于字符长度的 shouldClarify 逻辑。
 *
 * 工作流程：
 * 1. 规则识别咨询类型（关键词匹配）
 * 2. 调用 LLM 经济模型提取已填充的槽位（≤200 token 输出 JSON）
 * 3. LLM 失败时降级为规则匹配（关键词存在性检查）
 * 4. 计算 clarityScore = 已填充必填槽位数 / 总必填槽数
 * 5. needsClarification = 缺失必填槽位 或 clarityScore < 0.6
 * 6. clarifyingTarget = 第一个缺失的必填槽位
 */
@Injectable()
export class CompletenessAssessorService {
  private readonly logger = new Logger(CompletenessAssessorService.name);

  constructor(
    @Optional() @Inject(LlmProvidersService)
    private readonly llmProviders?: LlmProvidersService,
  ) {}

  /**
   * 评估信息完整性
   */
  async assessCompleteness(options: AssessorOptions): Promise<CompletenessAssessment> {
    const { question, dialogueHistory = [] } = options;

    // 1. 规则识别咨询类型
    const consultType = this.detectConsultType(question, dialogueHistory);
    const requiredSlots = getRequiredSlots(consultType);

    // 2. 尝试用 LLM 提取已填充槽位
    let filledSlots: string[] = [];
    let usedFallback = false;

    if (this.llmProviders) {
      try {
        filledSlots = await this.extractFilledSlotsByLlm(question, dialogueHistory, consultType);
      } catch (err) {
        this.logger.warn(
          `[assessCompleteness] LLM 提取槽位失败，降级为规则匹配: ${(err as Error).message}`,
        );
        filledSlots = this.extractFilledSlotsByRule(question, dialogueHistory, consultType);
        usedFallback = true;
      }
    } else {
      // 无 LLM 可用，直接走规则
      filledSlots = this.extractFilledSlotsByRule(question, dialogueHistory, consultType);
      usedFallback = true;
    }

    // 去重
    filledSlots = Array.from(new Set(filledSlots));

    // 3. 计算缺失槽位
    const allSlots = SLOT_SCHEMAS[consultType];
    const missingSlots = allSlots
      .filter(slot => !filledSlots.includes(slot.name))
      .map(slot => slot.name);

    // 4. 计算 clarityScore
    const filledRequiredCount = requiredSlots.filter(slot =>
      filledSlots.includes(slot.name),
    ).length;
    const clarityScore =
      requiredSlots.length > 0 ? filledRequiredCount / requiredSlots.length : 1;

    // 5. 判断是否需要追问
    const missingRequired = requiredSlots.filter(
      slot => !filledSlots.includes(slot.name),
    );
    const needsClarification =
      missingRequired.length > 0 || clarityScore < 0.6;

    // 6. 确定追问目标（第一个缺失的必填槽位）
    const clarifyingTarget = missingRequired.length > 0 ? missingRequired[0].name : '';

    this.logger.log(
      `[assessCompleteness] type=${consultType}, filled=${filledSlots.length}/${allSlots.length}, ` +
        `missing=${missingSlots.length}, clarity=${clarityScore.toFixed(2)}, ` +
        `needsClarification=${needsClarification}, target=${clarifyingTarget}, fallback=${usedFallback}`,
    );

    return {
      consultType,
      filledSlots,
      missingSlots,
      clarityScore,
      needsClarification,
      clarifyingTarget,
    };
  }

  /**
   * 规则识别咨询类型（关键词匹配）
   *
   * 优先级：career / relationship / wealth / health → 默认 general
   * 多个类型命中时，取关键词命中数最多的
   */
  detectConsultType(
    question: string,
    dialogueHistory: Array<{ role: string; content: string }> = [],
  ): ConsultType {
    const fullText = [question, ...dialogueHistory.map(t => t.content)].join(' ');

    const types: ConsultType[] = ['career', 'relationship', 'wealth', 'health'];
    let bestType: ConsultType = 'general';
    let bestScore = 0;

    for (const t of types) {
      const keywords = CONSULT_TYPE_KEYWORDS[t];
      const hits = keywords.filter(kw => fullText.includes(kw)).length;
      if (hits > bestScore) {
        bestScore = hits;
        bestType = t;
      }
    }

    return bestType;
  }

  /**
   * LLM 提取已填充槽位
   *
   * 输出 JSON：{ "filledSlots": ["slot_name1", "slot_name2"] }
   * 限制 ≤200 token
   */
  private async extractFilledSlotsByLlm(
    question: string,
    dialogueHistory: Array<{ role: string; content: string }>,
    consultType: ConsultType,
  ): Promise<string[]> {
    const slots = SLOT_SCHEMAS[consultType];
    const slotDesc = slots
      .map(s => `- ${s.name}（${s.label}）：${s.description}`)
      .join('\n');

    const historyText = dialogueHistory.length > 0
      ? dialogueHistory.map(t => `${t.role}: ${t.content}`).join('\n')
      : '（无历史对话）';

    const systemPrompt = [
      '你是槽位提取器。根据用户问题和对话历史，判断哪些槽位已被填充。',
      '只输出 JSON，格式为 {"filledSlots": ["slot_name1", ...]}',
      '槽位只能从以下列表中选择，且必须是已被用户明确提供信息的槽位：',
      slotDesc,
      '不要输出任何解释、markdown 或额外文字。',
    ].join('\n');

    const userPrompt = `【用户问题】\n${question}\n\n【对话历史】\n${historyText}`;

    const response = await this.llmProviders!.chatCheap(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0,
        maxTokens: 200,
        jsonMode: true,
      },
      'clarification-slot-extract',
    );

    return this.parseLlmSlotResponse(response.content, slots);
  }

  /**
   * 解析 LLM 返回的槽位 JSON
   *
   * 解析失败时抛错，由上层 assessCompleteness 的 try-catch 捕获后降级为规则匹配。
   * 这确保任何 LLM 输出异常（非 JSON、字段缺失、空内容）都会触发降级，
   * 而不是返回空数组被误认为"用户什么都没填"。
   */
  private parseLlmSlotResponse(
    content: string,
    slots: SlotDefinition[],
  ): string[] {
    if (!content || typeof content !== 'string') {
      throw new Error('LLM 返回内容为空');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // 尝试从文本中提取 JSON（LLM 可能在 JSON 前后加了说明文字）
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          throw new Error(`JSON 解析失败: ${content.slice(0, 100)}`);
        }
      } else {
        throw new Error(`无 JSON 内容: ${content.slice(0, 100)}`);
      }
    }

    if (!parsed || !Array.isArray(parsed.filledSlots)) {
      throw new Error(`filledSlots 字段缺失或非数组: ${content.slice(0, 100)}`);
    }

    // 过滤出合法的槽位名
    const validNames = new Set(slots.map(s => s.name));
    return parsed.filledSlots.filter((name: unknown) =>
      typeof name === 'string' && validNames.has(name),
    );
  }

  /**
   * 规则匹配兜底：基于关键词存在性检查
   *
   * 简化策略：根据用户输入长度判断信息完整度
   * - 长输入（≥20字符）：认为必填槽位大部分已填（向后兼容现有行为）
   * - 短输入（<20字符）：仅填充第一个必填槽位，触发追问
   */
  private extractFilledSlotsByRule(
    question: string,
    dialogueHistory: Array<{ role: string; content: string }>,
    consultType: ConsultType,
  ): string[] {
    const slots = SLOT_SCHEMAS[consultType];
    const fullText = [question, ...dialogueHistory.map(t => t.content)].join(' ');

    const filled: string[] = [];

    if (fullText.length >= 20) {
      // 长输入：填充所有必填槽位
      for (const slot of slots) {
        if (slot.required) {
          filled.push(slot.name);
        }
      }
    } else {
      // 短输入：仅填充第一个必填槽位（如果有的话）
      if (slots.length > 0 && slots[0].required) {
        filled.push(slots[0].name);
      }
    }

    return filled;
  }
}
