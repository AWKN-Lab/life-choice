import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';
import { QualityGateService } from './quality-gate.service';
import { buildIdentityLayer, PrecedentUnit } from './prompt-layers';
// P1-4: 5 层输出定义统一从 output-schema.ts 导入（zod schema 强制版）
import {
  FiveLayerOutput,
  FIVE_LAYER_KEYS,
  FIVE_LAYER_LABELS,
  parseFiveLayersFromText,
} from '../schemas/output-schema';

// ─── P1-5: LLM 输出质量基线定义 ───

export interface QualityBaselineScore {
  /** 完整性：5层是否齐全（0-100） */
  completeness: number;
  /** 准确性：是否有具体判断而非空话（0-100） */
  accuracy: number;
  /** 一致性：前后文是否矛盾（0-100） */
  consistency: number;
  /** 身份感：是否像张半山说话（0-100） */
  identity: number;
  /** 综合分 */
  overall: number;
}

const QUALITY_BASELINE = {
  /** 完整性基线：5层齐全才算通过 */
  completeness: 90,
  /** 身份感基线：必须像张半山说话 */
  identity: 80,
} as const;

/** P1-5: LLM 自评 prompt 后缀 */
const SELF_EVAL_PROMPT_SUFFIX = `

【输出自评】
在你完成以上输出后，请在最后用以下格式对自己打分（严格遵循）：
[SELF_EVAL]
completeness: <0-100，5层是否齐全，缺1层扣20>
accuracy: <0-100，是否有具体判断而非空话套话>
consistency: <0-100，前后文是否矛盾>
identity: <0-100，是否像张半山的说话风格，而非AI助手>
[/SELF_EVAL]`;

/** P1-5: 解析 LLM 自评分数 */
function parseSelfEval(output: string): { scores: QualityBaselineScore; cleanedOutput: string } {
  const startMarker = '[SELF_EVAL]';
  const endMarker = '[SELF_EVAL]';
  const startIdx = output.lastIndexOf(startMarker);
  const endIdx = output.lastIndexOf(endMarker);

  const defaultScores: QualityBaselineScore = {
    completeness: 100,
    accuracy: 100,
    consistency: 100,
    identity: 100,
    overall: 100,
  };

  if (startIdx === -1 || endIdx === -1 || startIdx === endIdx) {
    return { scores: defaultScores, cleanedOutput: output };
  }

  const evalBlock = output.substring(startIdx + startMarker.length, endIdx).trim();
  const cleanedOutput = (output.substring(0, startIdx) + output.substring(endIdx + endMarker.length)).trim();

  const parseField = (name: string): number => {
    const match = evalBlock.match(new RegExp(`${name}\\s*:\\s*(\\d+)`));
    return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 100;
  };

  const completeness = parseField('completeness');
  const accuracy = parseField('accuracy');
  const consistency = parseField('consistency');
  const identity = parseField('identity');
  const overall = Math.round((completeness + accuracy + consistency + identity) / 4);

  return {
    scores: { completeness, accuracy, consistency, identity, overall },
    cleanedOutput,
  };
};

export interface GenerationInput {
  recordId: string;
  moduleId: string;
  routeType: string;
  question: string;
  evidencePacket: Record<string, unknown>;
  knowledgeItems?: Array<{ sourceId: string; title: string; text: string }>;
  promptVersion?: string;
  generateFollowUp?: boolean;
  /** P3-1: 用户记忆摘要，注入 Context Layer */
  memorySummary?: string;
  /** 判例单元（从 bazi-classics.json 检索后注入，古文→拟真人专业内容转换模板） */
  precedentUnit?: PrecedentUnit;
}

const BANNED_PHRASES = [
  '顺势而为', '保持努力', '未来可期', '注意沟通',
  '建议您', '请注意', '的建议是', '建议您可以',
];

@Injectable()
export class GenerationComposerService {
  private readonly logger = new Logger(GenerationComposerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviders: LlmProvidersService,
    private readonly qualityGate: QualityGateService,
  ) {}

  async generate(input: GenerationInput): Promise<{ content: string; followUpQuestions: string[]; qualityScore: number; retryable: boolean; baselineScore?: QualityBaselineScore }> {
    const { recordId, moduleId, routeType, question, evidencePacket, knowledgeItems = [], promptVersion = 'v1', generateFollowUp = false } = input;

    const run = await this.prisma.generationRun.create({
      data: {
        recordId,
        moduleId,
        status: 'processing',
        promptVersion,
        evidenceId: (evidencePacket as any).id,
      },
    });

    try {
      const { messages, retryMessages } = this.buildPrompt(routeType, question, evidencePacket, knowledgeItems, generateFollowUp, input.memorySummary, input.precedentUnit);

      const result = await this.llmProviders.chatWithFallback(messages, {
        maxTokens: 3000,
        temperature: 0.7,
      });

      // P0-4 Step 4: 截断检测 + 一次自动重试
      // 如果 LLM 因为 max_tokens 达到上限被截断（finish_reason=length），
      // 用更大的 4000 token 空间重试一次，避免 5 层输出被切断
      let rawOutput = result.content;
      if (result.finishReason === 'length') {
        this.logger.warn(
          `[GenerationComposer] P0-4 检测到截断 finish_reason=length，用 maxTokens=4000 重试一次`,
        );
        try {
          const truncationRetry = await this.llmProviders.chatWithFallback(messages, {
            maxTokens: 4000,
            temperature: 0.7,
          });
          if (truncationRetry.finishReason !== 'length') {
            rawOutput = truncationRetry.content;
            this.logger.log(
              `[GenerationComposer] P0-4 截断重试成功，新长度=${rawOutput.length}`,
            );
          } else {
            this.logger.warn(
              `[GenerationComposer] P0-4 截断重试仍被截断，使用原始输出（长度=${rawOutput.length}），继续走质量门`,
            );
          }
        } catch (retryErr) {
          this.logger.warn(`[GenerationComposer] P0-4 截断重试异常: ${retryErr.message}，使用原始输出`);
        }
      }

      // P1-5: 解析 LLM 自评分数
      const { scores: baselineScore, cleanedOutput: outputAfterSelfEval } = parseSelfEval(rawOutput);
      this.logger.log(
        `[GenerationComposer] P1-5 质量基线: completeness=${baselineScore.completeness} accuracy=${baselineScore.accuracy} consistency=${baselineScore.consistency} identity=${baselineScore.identity} overall=${baselineScore.overall}`,
      );

      const { cleanedOutput: contentAfterParse, followUpQuestions } = this.extractFollowUpQuestions(outputAfterSelfEval, generateFollowUp);

      // P1-2: 5 层完整性校验 + 自动补全
      const { layers: fiveLayers, missingLayers, isComplete } = this.validateAndFillFiveLayers(contentAfterParse);
      const contentAfterLayerValidation = isComplete ? contentAfterParse : this.composeFiveLayerText(fiveLayers);

      const qualityResult = this.qualityGate.evaluate(contentAfterLayerValidation);

      let finalContent = qualityResult.filteredText;
      let retryable = !qualityResult.passed;

      // P1-5: 基线检查 — 完整性 < 90% 或身份感 < 80% 时自动重试一次
      const baselineFailed = baselineScore.completeness < QUALITY_BASELINE.completeness || baselineScore.identity < QUALITY_BASELINE.identity;

      if (baselineFailed && !retryable) {
        this.logger.warn(
          `[GenerationComposer] P1-5 基线未达标: completeness=${baselineScore.completeness}(基线${QUALITY_BASELINE.completeness}) identity=${baselineScore.identity}(基线${QUALITY_BASELINE.identity})，自动重试`,
        );
        retryable = true;
      }

      if (!qualityResult.passed || baselineFailed) {
        try {
          const retryResult = await this.llmProviders.chatWithFallback(retryMessages, {
            maxTokens: 3000,
            temperature: 0.6,
          });

          const retryRaw = retryResult.content;
          const { scores: retryBaseline, cleanedOutput: retryAfterSelfEval } = parseSelfEval(retryRaw);
          this.logger.log(
            `[GenerationComposer] P1-5 重试质量基线: completeness=${retryBaseline.completeness} accuracy=${retryBaseline.accuracy} consistency=${retryBaseline.consistency} identity=${retryBaseline.identity} overall=${retryBaseline.overall}`,
          );

          const retryQuality = this.qualityGate.evaluate(retryAfterSelfEval);
          finalContent = retryQuality.filteredText;
          retryable = !retryQuality.passed;

          await this.prisma.generationRun.update({
            where: { id: run.id },
            data: {
              status: retryable ? 'failed_retryable' : 'completed',
              rawOutput,
              finalJson: finalContent,
              qualityScore: retryQuality.score,
              provider: result.provider,
              model: result.model,
              durationMs: result.durationMs,
              reasoningContent: result.reasoningContent,
            },
          });
        } catch {
          retryable = true;
        }
      } else {
        await this.prisma.generationRun.update({
          where: { id: run.id },
          data: {
            status: 'completed',
            rawOutput,
            finalJson: finalContent,
            qualityScore: qualityResult.score,
            provider: result.provider,
            model: result.model,
            durationMs: result.durationMs,
            reasoningContent: result.reasoningContent,
          },
        });
      }

      // P1-5: 质量日志
      this.logger.log(
        `[GenerationComposer] P1-5 质量日志: recordId=${recordId} baseline={completeness:${baselineScore.completeness},accuracy:${baselineScore.accuracy},consistency:${baselineScore.consistency},identity:${baselineScore.identity},overall:${baselineScore.overall}} qualityScore=${qualityResult.score} retryable=${retryable}`,
      );

      return { content: finalContent, followUpQuestions, qualityScore: qualityResult.score, retryable, baselineScore };
    } catch (error) {
      this.logger.error(`[GenerationComposer] failed: ${error.message}`);

      await this.prisma.generationRun.update({
        where: { id: run.id },
        data: {
          status: 'failed_retryable',
          errorCode: 'LLM_ERROR',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  private buildPrompt(
    routeType: string,
    question: string,
    evidencePacket: Record<string, unknown>,
    knowledgeItems: Array<{ sourceId: string; title: string; text: string }>,
    generateFollowUp = false,
    memorySummary?: string,
    precedentUnit?: PrecedentUnit,
  ): { messages: LlmMessage[]; retryMessages: LlmMessage[] } {
    const evidenceText = JSON.stringify(evidencePacket, null, 2);
    const knowledgeText = knowledgeItems.length > 0
      ? knowledgeItems.map(k => `[${k.title}]\n${k.text}`).join('\n\n')
      : '';

    // 判例注入段：把古文判例转换为拟真人专业内容引导
    let precedentSection = '';
    if (precedentUnit) {
      const pu = precedentUnit;
      const manifestationsStr = pu.manifestations.map((m, i) => `${i + 1}. ${m}`).join('\n');
      const redLineStr = pu.redLine.map((r, i) => `${i + 1}. ${r}`).join('\n');
      precedentSection = `

【古文判例→现代转换】
古文判例：${pu.originalText}
出处：${pu.source}
现代核心结论：${pu.core}
现代场景表现：
${manifestationsStr}
决策建议：${pu.decisionHint}
红线禁令：
${redLineStr}

【判例应用要求】
1. 你的判断必须基于判例的"现代核心结论"和"现代场景表现"，不能直接引用古文
2. 输出语言必须用拟真人专业口吻，不能照搬古文原文
3. 红线禁令必须在判断中以"这意味着——"的方式转译给用户
4. 如果判例与算法分析结果冲突，以判例的"现代核心结论"为准`;
    }

    const userPrompt = `你是一位专业命理分析师，针对用户的问题给出决策报告。

【输出规范】必须遵循以下6段结构，每段以标题开头：
一句话定性：简洁有力的结论
判断依据：结合命理的判断依据，落到具体现实场景
当前风险：当前阶段最需要关注的风险点
建议动作：1-2个具体可执行的动作
时间窗口：关键时机的时间范围
落一句最实在的话：最核心的一句话总结

【禁止出现】以下内容绝对不能出现在输出中：
- "顺势而为"、"保持努力"、"未来可期"、"注意沟通"、"建议您"、"请注意"
- 技术词汇如"算法"、"证据包"、"计算"、"步骤"
- JSON 字符串或代码块

【用户问题】
${question}

【命理证据】
${evidenceText}

${knowledgeText ? `【参考知识】\n${knowledgeText}\n` : ''}${precedentSection}

${generateFollowUp ? `【推荐追问】
在报告末尾，用分隔符 [FOLLOWUP_START] 和 [FOLLOWUP_END] 包裹生成 3 个与用户问题密切相关的追问问题。每个问题一行，不要编号。
这些追问应引导用户深入思考，而非简单的是非题。
格式示例：
[FOLLOWUP_START]
这个问题对你未来三个月的财运有什么影响？
如果换个角度思考，你会怎么做？
什么信号出现时应该重新评估这个决定？
[FOLLOWUP_END]
` : ''}

请严格按照6段结构输出，不要输出多余解释。${SELF_EVAL_PROMPT_SUFFIX}`;

    const retryPrompt = `请用更自然、口语化的风格重新生成，避免以下内容：${BANNED_PHRASES.join('、')}。输出格式必须清晰分段。

${userPrompt}`;

    // P3-1: 记忆回流 — 将用户记忆摘要注入 Context Layer
    const memorySection = memorySummary
      ? `\n\n【用户记忆】\n${memorySummary}\n如果用户之前问过类似问题，你必须主动提出来，让用户知道你记得。`
      : '';

    return {
      messages: [
        {
          role: 'system',
          content: buildIdentityLayer() + memorySection + '\n\n你是一位专业的命理分析师，用自然、人性化的语言给出决策建议，避免空话和模板句。',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      retryMessages: [
        {
          role: 'system',
          content: '你是一位专业命理分析师。注意：禁止出现"顺势而为"、"保持努力"、"未来可期"、"注意沟通"、"建议您"等空话。',
        },
        {
          role: 'user',
          content: retryPrompt,
        },
      ],
    };
  }

  /**
   * P1-4: 从 LLM 原始输出中解析 5 层结构
   * 改用 output-schema.ts 中的 parseFiveLayersFromText（zod schema 强制版）
   * 返回 Partial<FiveLayerOutput>，缺层由调用方处理
   */
  private parseFiveLayers(rawOutput: string): { layers: Partial<FiveLayerOutput>; missingLayers: (keyof FiveLayerOutput)[]; isComplete: boolean } {
    return parseFiveLayersFromText(rawOutput);
  }

  /**
   * P1-4: 5 层完整性校验（缺层不再补占位文本，由 quality-gate 抛错）
   * 返回 layers（Partial）、missingLayers、isComplete
   * 缺层时由 quality-gate.service.ts 的 evaluateFiveLayers 抛 BadRequestException
   */
  validateAndFillFiveLayers(rawOutput: string): { layers: Partial<FiveLayerOutput>; missingLayers: string[]; isComplete: boolean } {
    const { layers, missingLayers: missingKeys, isComplete } = this.parseFiveLayers(rawOutput);
    const missingLayers = missingKeys.map(k => FIVE_LAYER_LABELS[k]);

    if (!isComplete) {
      this.logger.warn(
        `[GenerationComposer] P1-4: 5层校验 — 缺少 ${missingLayers.length} 层: ${missingLayers.join(', ')}（将由 quality-gate 抛错）`,
      );
    }

    return { layers, missingLayers, isComplete };
  }

  /**
   * P1-4: 将 5 层结构重新组装为带标记的文本（计划版 5 层标记）
   */
  private composeFiveLayerText(layers: Partial<FiveLayerOutput>): string {
    return [
      `【数术断句】\n${layers.clause ?? ''}`,
      `【半山落句】\n${layers.halfMountain ?? ''}`,
      `【具体落点】\n${layers.detail ?? ''}`,
      `【代价提醒】\n${layers.cost ?? ''}`,
      `【下一步动作】\n${layers.nextAction ?? ''}`,
    ].join('\n\n');
  }

  private extractFollowUpQuestions(
    rawOutput: string,
    generateFollowUp: boolean,
  ): { cleanedOutput: string; followUpQuestions: string[] } {
    if (!generateFollowUp) {
      return { cleanedOutput: rawOutput, followUpQuestions: [] };
    }

    const startMarker = '[FOLLOWUP_START]';
    const endMarker = '[FOLLOWUP_END]';
    const startIdx = rawOutput.indexOf(startMarker);
    const endIdx = rawOutput.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      this.logger.warn('[GenerationComposer] followUpQuestions markers not found in output');
      return { cleanedOutput: rawOutput, followUpQuestions: [] };
    }

    const before = rawOutput.substring(0, startIdx);
    const after = rawOutput.substring(endIdx + endMarker.length);
    const followUpBlock = rawOutput.substring(startIdx + startMarker.length, endIdx);

    const questions = followUpBlock
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 3 && !line.startsWith('[') && !line.startsWith('#'));

    const cleanedOutput = (before + after).trim();

    this.logger.log(`[GenerationComposer] extracted ${questions.length} followUpQuestions`);
    return { cleanedOutput, followUpQuestions: questions.slice(0, 3) };
  }
}
