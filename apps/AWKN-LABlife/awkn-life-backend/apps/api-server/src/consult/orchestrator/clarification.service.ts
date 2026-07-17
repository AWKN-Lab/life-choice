import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProvidersService, LlmProviderType } from '../../llm-providers/llm-providers.service';
import { buildIdentityLayer } from './prompt-layers';

/**
 * 追问槽位定义
 */
export interface ClarificationSlot {
  name: string;
  label: string;
  required: boolean;
  filled: boolean;
  value?: string;
  promptQuestion: string;
}

/**
 * 追问结果
 */
export interface ClarificationResult {
  needsMoreInfo: boolean;
  missingSlots: ClarificationSlot[];
  clarificationQuestion: string;
  confidence: number;
}

@Injectable()
export class ClarificationService {
  private readonly logger = new Logger(ClarificationService.name);

  constructor(
    @Optional() private readonly llmProviders?: LlmProvidersService,
  ) {}

  /**
   * 定义命理咨询的必填槽位
   */
  getSlotsForCategory(category: string): ClarificationSlot[] {
    const baseSlots: ClarificationSlot[] = [
      {
        name: 'birth_datetime',
        label: '出生时间',
        required: true,
        filled: false,
        promptQuestion: '请问您的出生年月日和具体时间是什么？（如：1990年6月15日 下午3点）',
      },
      {
        name: 'birth_location',
        label: '出生地点',
        required: true,
        filled: false,
        promptQuestion: '请问您的出生地点是哪里？（如：北京）',
      },
      {
        name: 'gender',
        label: '性别',
        required: true,
        filled: false,
        promptQuestion: '请问您的性别是？',
      },
    ];

    const categorySlots: Record<string, ClarificationSlot[]> = {
      '事业': [
        {
          name: 'career_context',
          label: '事业背景',
          required: false,
          filled: false,
          promptQuestion: '请问您目前从事什么行业？想了解事业哪方面的运势？',
        },
      ],
      '婚姻': [
        {
          name: 'relationship_status',
          label: '感情状态',
          required: false,
          filled: false,
          promptQuestion: '请问您目前的感情状态是？（单身/恋爱中/已婚）',
        },
      ],
      '财运': [
        {
          name: 'finance_type',
          label: '财运类型',
          required: false,
          filled: false,
          promptQuestion: '请问您想了解哪方面的财运？（正财/偏财/投资）',
        },
      ],
      '健康': [
        {
          name: 'health_concern',
          label: '健康关注',
          required: false,
          filled: false,
          promptQuestion: '请问您主要关注哪方面的健康问题？',
        },
      ],
    };

    return [...baseSlots, ...(categorySlots[category] || [])];
  }

  /**
   * 评估信息完整性并生成追问
   */
  async assessAndClarify(params: {
    userMessage: string;
    category?: string;
    existingSlots?: Partial<Record<string, string>>;
    provider?: LlmProviderType;
  }): Promise<ClarificationResult> {
    const { userMessage, category, existingSlots = {}, provider = 'deepseek' } = params;

    // 获取该分类的槽位定义
    const slots = this.getSlotsForCategory(category || '');

    // 标记已填充的槽位
    for (const slot of slots) {
      if (existingSlots[slot.name]) {
        slot.filled = true;
        slot.value = existingSlots[slot.name];
      }
    }

    // 使用LLM评估用户消息中包含的信息
    const missingSlots = slots.filter(s => s.required && !s.filled);

    if (missingSlots.length === 0) {
      return {
        needsMoreInfo: false,
        missingSlots: [],
        clarificationQuestion: '',
        confidence: 0.9,
      };
    }

    // 生成追问问题
    let clarificationQuestion: string;
    if (missingSlots.length === 1) {
      clarificationQuestion = missingSlots[0].promptQuestion;
    } else {
      // 多个缺失信息，合并追问
      clarificationQuestion = `为了给您更准确的分析，还需要了解以下信息：\n${
        missingSlots.map((s, i) => `${i + 1}. ${s.promptQuestion}`).join('\n')
      }`;
    }

    // 如果有LLM，使用LLM优化追问语气
    if (this.llmProviders) {
      try {
        const prompt = [
          buildIdentityLayer(),
          '',
          '用户说：' + userMessage,
          '',
          `已收集信息：${JSON.stringify(existingSlots)}`,
          `缺失信息：${missingSlots.map(s => s.label).join('、')}`,
          '',
          '请用张半山的温暖语气，自然地追问缺失信息。不要像填表一样，要像聊天一样。',
        ].join('\n');

        const response = await this.llmProviders.chat(
          [
            { role: 'system', content: prompt },
            { role: 'user', content: '请生成追问' },
          ],
          provider,
          { temperature: 0.7, maxTokens: 200 },
        );
        if (response.content && response.content.length > 10) {
          clarificationQuestion = response.content;
        }
      } catch (err) {
        this.logger.debug(`LLM clarification failed: ${(err as Error).message}`);
      }
    }

    return {
      needsMoreInfo: true,
      missingSlots,
      clarificationQuestion,
      confidence: 0.7,
    };
  }
}
