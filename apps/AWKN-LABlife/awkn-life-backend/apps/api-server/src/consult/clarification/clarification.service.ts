import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { LlmProvidersService } from '../../llm-providers/llm-providers.service';
import {
  CompletenessAssessorService,
  CompletenessAssessment,
} from './completeness-assessor.service';
import {
  SLOT_SCHEMAS,
  ConsultType,
  findSlot,
} from './slot-schema';

/**
 * T2.3: 统一追问服务
 *
 * 替代 DialogueService 中的 buildClarifyingQuestion / shouldContinueClarifying。
 *
 * 工作流程：
 * 1. assessAndClarify：评估信息完整性，必要时生成追问话术
 * 2. generateClarifyingQuestion：根据缺失槽位生成追问（≤30字）
 * 3. shouldContinueClarifying：基于槽位完整性判断是否继续追问
 */

/**
 * 最大追问轮次（与 DialogueService.MAX_CLARIFICATION_ROUNDS 对齐）
 */
const MAX_CLARIFICATION_ROUNDS = 2;

/**
 * 追问话术固定模板（LLM 失败时降级使用）
 *
 * key = `${consultType}:${slotName}`
 */
const FALLBACK_CLARIFYING_TEMPLATES: Record<string, string> = {
  // career
  'career:issue_domain': '你具体想问事业的哪个方向？比如升职、跳槽还是创业？',
  'career:current_situation': '说说你目前的工作状态？做什么岗位、多久了？',
  'career:core_conflict': '你现在最纠结的是什么？是选 A 还是选 B？',
  'career:time_urgency': '这件事有时间压力吗？多久内需要做决定？',
  // relationship
  'relationship:relationship_status': '你目前的关系状态是？单身、恋爱中还是已婚？',
  'relationship:core_conflict': '你们之间最核心的矛盾是什么？',
  'relationship:partner_attitude': '对方对此是什么态度？',
  'relationship:user_expectation': '你希望最终达到什么结果？',
  // wealth
  'wealth:decision_type': '这是投资、消费、储蓄还是借贷的决策？',
  'wealth:amount_range': '涉及的金额大概在什么量级？',
  'wealth:risk_preference': '你偏好保守、平衡还是激进？',
  'wealth:core_conflict': '你最纠结的点是什么？',
  // health
  'health:symptom': '具体是哪里不舒服？身体还是情绪？',
  'health:duration': '这个症状持续多久了？',
  'health:action_taken': '之前采取过什么措施？就医或自我处理？',
  'health:core_concern': '你最担心的是什么？',
  // general
  'general:core_question': '你最想问的具体问题是什么？',
  'general:background': '能补充一些相关背景吗？',
};

/**
 * 默认追问话术（无匹配模板时）
 */
const DEFAULT_CLARIFYING_QUESTION = '能再多说一些细节吗？这样我才能给你更准的判断。';

/**
 * assessAndClarify 返回结构
 */
export interface AssessAndClarifyResult {
  assessment: CompletenessAssessment;
  clarifyingQuestion: string | null;
}

@Injectable()
export class ClarificationService {
  private readonly logger = new Logger(ClarificationService.name);

  constructor(
    @Inject(CompletenessAssessorService)
    private readonly assessor: CompletenessAssessorService,
    @Optional() @Inject(LlmProvidersService)
    private readonly llmProviders?: LlmProvidersService,
  ) {}

  /**
   * 评估并生成追问
   *
   * - 调用 CompletenessAssessorService 评估信息完整性
   * - 如需追问，调用 generateClarifyingQuestion 生成话术
   * - 如不需追问，返回 clarifyingQuestion=null
   */
  async assessAndClarify(
    question: string,
    dialogueHistory: Array<{ role: string; content: string }> = [],
  ): Promise<AssessAndClarifyResult> {
    const assessment = await this.assessor.assessCompleteness({
      question,
      dialogueHistory,
    });

    if (!assessment.needsClarification) {
      return { assessment, clarifyingQuestion: null };
    }

    // 需要追问
    const target = assessment.clarifyingTarget;
    if (!target) {
      // 理论上 needsClarification=true 时一定有 target，防御性处理
      this.logger.warn(
        `[assessAndClarify] needsClarification=true 但 clarifyingTarget 为空，跳过追问`,
      );
      return { assessment, clarifyingQuestion: null };
    }

    const context = this.buildContextString(question, dialogueHistory);
    const clarifyingQuestion = await this.generateClarifyingQuestion(
      target,
      assessment.consultType,
      context,
    );

    return { assessment, clarifyingQuestion };
  }

  /**
   * 生成追问话术
   *
   * - 根据 slot schema 的 label 和 description 构建 prompt
   * - 调用 LLM 经济模型生成问句（≤30字）
   * - LLM 失败时降级为固定话术模板
   */
  async generateClarifyingQuestion(
    missingSlot: string,
    consultType: ConsultType,
    context: string,
  ): Promise<string> {
    const slot = findSlot(consultType, missingSlot);
    if (!slot) {
      this.logger.warn(
        `[generateClarifyingQuestion] 未找到槽位 ${consultType}.${missingSlot}，使用默认话术`,
      );
      return DEFAULT_CLARIFYING_QUESTION;
    }

    // 先尝试 LLM 生成
    if (this.llmProviders) {
      try {
        const question = await this.generateByLlm(slot, consultType, context);
        if (question) {
          return question;
        }
      } catch (err) {
        this.logger.warn(
          `[generateClarifyingQuestion] LLM 生成失败，降级为模板: ${(err as Error).message}`,
        );
      }
    }

    // 降级：固定话术模板
    return this.getFallbackTemplate(consultType, missingSlot);
  }

  /**
   * 判断是否继续追问
   *
   * - 重新评估信息完整性（将 userReply 加入 dialogueHistory）
   * - 如仍有 required 槽位缺失且未达到最大追问轮次，返回 true
   *
   * @param userReply 用户最新回复
   * @param assessment 上一次的评估结果
   * @param dialogueHistory 当前对话历史（不含 userReply）
   * @param currentRound 当前追问轮次（从 1 开始）
   */
  async shouldContinueClarifying(
    userReply: string,
    assessment: CompletenessAssessment,
    dialogueHistory: Array<{ role: string; content: string }> = [],
    currentRound: number = 1,
  ): Promise<boolean> {
    // 已达最大追问轮次，停止
    if (currentRound >= MAX_CLARIFICATION_ROUNDS) {
      this.logger.log(
        `[shouldContinueClarifying] 达到最大追问轮次 ${MAX_CLARIFICATION_ROUNDS}，停止追问`,
      );
      return false;
    }

    // 将用户回复加入历史，重新评估
    const updatedHistory = [
      ...dialogueHistory,
      { role: 'user', content: userReply },
    ];

    const newAssessment = await this.assessor.assessCompleteness({
      question: userReply,
      dialogueHistory: updatedHistory,
    });

    const shouldContinue =
      newAssessment.needsClarification && newAssessment.clarifyingTarget !== '';

    this.logger.log(
      `[shouldContinueClarifying] round=${currentRound}/${MAX_CLARIFICATION_ROUNDS}, ` +
        `newClarity=${newAssessment.clarityScore.toFixed(2)}, continue=${shouldContinue}`,
    );

    return shouldContinue;
  }

  /**
   * 使用 LLM 生成追问话术
   */
  private async generateByLlm(
    slot: { name: string; label: string; description: string },
    consultType: ConsultType,
    context: string,
  ): Promise<string | null> {
    const systemPrompt = [
      '你是张半山，一位融汇古今的命理咨询师。',
      '现在需要你针对用户缺失的信息，提一个简短的追问。',
      '要求：',
      '1. 问句不超过 30 字',
      '2. 语气自然、有温度，像长辈在询问',
      '3. 只输出问句本身，不要加引号、不要加解释',
      '4. 围绕以下槽位提问：',
      `   - 槽位名：${slot.name}`,
      `   - 槽位含义：${slot.label}（${slot.description}）`,
    ].join('\n');

    const userPrompt = `【咨询类型】${consultType}\n【对话上下文】\n${context || '（暂无上下文）'}\n\n请生成追问：`;

    const response = await this.llmProviders!.chatCheap(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 60,
      },
      'clarification-question-gen',
    );

    const question = (response.content || '').trim();
    if (!question) {
      return null;
    }

    // 截断到 30 字（防止 LLM 不遵守约束）
    const truncated = question.slice(0, 30);
    return truncated;
  }

  /**
   * 获取降级模板话术
   */
  private getFallbackTemplate(consultType: ConsultType, slotName: string): string {
    const key = `${consultType}:${slotName}`;
    return FALLBACK_CLARIFYING_TEMPLATES[key] || DEFAULT_CLARIFYING_QUESTION;
  }

  /**
   * 构建上下文字符串
   */
  private buildContextString(
    question: string,
    dialogueHistory: Array<{ role: string; content: string }>,
  ): string {
    const parts: string[] = [];
    if (dialogueHistory.length > 0) {
      parts.push(...dialogueHistory.map(t => `${t.role}: ${t.content}`));
    }
    parts.push(`user: ${question}`);
    return parts.join('\n');
  }
}

/**
 * 导出最大追问轮次常量（供外部对齐使用）
 */
export { MAX_CLARIFICATION_ROUNDS };
