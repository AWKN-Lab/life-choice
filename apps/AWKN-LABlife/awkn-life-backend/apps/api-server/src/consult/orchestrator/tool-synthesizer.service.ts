import { Injectable, Logger } from '@nestjs/common';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';
import { ToolExecutionResult } from '../../lib/atom-tools/types';
import { globalRegistry } from '../../lib/atom-tools';
import { SchedulingDecision } from './zhangbanshan-scheduler.service';
import { buildIdentityLayer } from './prompt-layers';

export interface SynthesizedOutput {
  judgment: string;
  cost: string;
  reasoningTrace: string;
  costReminder: string;
  toolReferences: Array<{ toolName: string; fact: string; usedIn: string }>;
  rawLlmOutput: string;
}

const TOOL_SYNTHESIZER_INSTRUCTION = `你收到的不是用户的原始问题，而是经过确定性计算工具分析后的结果。你的职责是基于这些计算结果，给出判断。

核心原则：决策的代价不在算的那一刻，在执行的那一刻。不说代价的预测，都是在骗人。

【判断输出三要素】（必须同时包含）
【判断】一句话说清楚我的判断是什么
【前提】这个判断成立的前提是什么
【代价】用不确定句式描述选择意味着什么

⚠️ 代价提醒：具体的、可操作的代价描述

输出校验三问（输出前必须通过）：
1. 代价是否具体（说清楚放弃什么、面对什么）？还是空洞的「代价很大」？
2. 是否说明了判断的前提条件？是否标明了不适用的情况？
3. 最后一句是否将选择权交还用户？`;

@Injectable()
export class ToolSynthesizerService {
  private readonly logger = new Logger(ToolSynthesizerService.name);

  constructor(private readonly llmProviders: LlmProvidersService) {}

  async synthesize(params: {
    question: string;
    toolResults: ToolExecutionResult[];
    schedulingDecision: SchedulingDecision;
    birthInfo?: any;
  }): Promise<SynthesizedOutput> {
    const { question, toolResults, schedulingDecision } = params;

    const factsText = this.serializeToolResults(toolResults);

    if (!factsText.trim()) {
      this.logger.warn('[ToolSynthesizer] no valid tool results to synthesize');
      return this.buildFallbackOutput(question, schedulingDecision, toolResults);
    }

    const messages = this.buildSynthesizePrompt(question, factsText, schedulingDecision);

    try {
      const result = await this.llmProviders.chatWithFallback(messages, {
        maxTokens: 800,
        temperature: 0.7,
      });

      return this.parseOutput(result.content, toolResults);
    } catch (error) {
      this.logger.error(`[ToolSynthesizer] LLM call failed: ${error.message}`);
      return this.buildFallbackOutput(question, schedulingDecision, toolResults);
    }
  }

  private serializeToolResults(toolResults: ToolExecutionResult[]): string {
    const successfulResults = toolResults.filter(r => r.success && r.output !== undefined);

    if (successfulResults.length === 0) {
      const failedInfo = toolResults
        .filter(r => !r.success)
        .map(r => `${r.toolName}: ${r.error || 'unknown error'}`)
        .join('; ');
      if (failedInfo) {
        this.logger.warn(`[ToolSynthesizer] all tools failed: ${failedInfo}`);
      }
      return '';
    }

    return successfulResults
      .map(r => {
        const tool = globalRegistry.get(r.toolName);
        const factText = tool
          ? tool.toPromptOutput(r.output)
          : JSON.stringify(r.output, null, 2);
        return `【${r.toolName}】\n${factText}`;
      })
      .join('\n\n');
  }

  private buildSynthesizePrompt(
    question: string,
    factsText: string,
    schedulingDecision: SchedulingDecision,
  ): LlmMessage[] {
    const scheduleInfo = `主调：${schedulingDecision.primaryAgent}` +
      (schedulingDecision.secondaryAgent ? `，佐调：${schedulingDecision.secondaryAgent}` : '') +
      `\n调度理由：${schedulingDecision.scheduleReason}`;

    const userPrompt = `【工具分析结果】
${factsText}

【用户问题】
${question}

【调度策略】
${scheduleInfo}

请基于以上工具分析结果，给出你的判断。每条判断必须引用至少一个工具的具体输出。

严格按以下格式输出，不要输出其他内容：

【判断】≤40字核心结论
【前提】这个判断成立的前提条件
【代价】以「这意味着——」开头，≤100字说清楚具体代价
⚠️ 代价提醒：具体的、可操作的代价描述
【推理溯源】≤150字，说清楚基于哪些工具的哪些输出得出判断`;

    return [
      { role: 'system', content: buildIdentityLayer() + '\n\n' + TOOL_SYNTHESIZER_INSTRUCTION },
      { role: 'user', content: userPrompt },
    ];
  }

  private parseOutput(rawLlmOutput: string, toolResults: ToolExecutionResult[]): SynthesizedOutput {
    const judgmentMatch = rawLlmOutput.match(/【判断】\s*([\s\S]*?)(?=【前提】|$)/);
    const costMatch = rawLlmOutput.match(/【代价】\s*([\s\S]*?)(?=⚠️|【推理溯源】|$)/);
    const costReminderMatch = rawLlmOutput.match(/⚠️\s*代价提醒[：:]\s*([\s\S]*?)(?=【推理溯源】|$)/);
    const reasoningMatch = rawLlmOutput.match(/【推理溯源】\s*([\s\S]*?)$/);

    let judgment = (judgmentMatch?.[1] || '').trim();
    let cost = (costMatch?.[1] || '').trim();
    let reasoningTrace = (reasoningMatch?.[1] || '').trim();
    let costReminder = (costReminderMatch?.[1] || '').trim();

    if (judgment.length > 40) {
      judgment = judgment.slice(0, 40);
      this.logger.warn('[ToolSynthesizer] judgment truncated to 40 chars');
    }

    if (cost.length > 100) {
      cost = cost.slice(0, 100);
      this.logger.warn('[ToolSynthesizer] cost truncated to 100 chars');
    }

    if (cost && !cost.startsWith('这意味着')) {
      cost = '这意味着——' + cost;
    }

    if (reasoningTrace.length > 150) {
      reasoningTrace = reasoningTrace.slice(0, 150);
      this.logger.warn('[ToolSynthesizer] reasoningTrace truncated to 150 chars');
    }

    const toolReferences = this.extractToolReferences(rawLlmOutput, toolResults);

    return {
      judgment: judgment || '基于工具分析，当前信号不够明确，无法给出确定判断。',
      cost: cost || '这意味着——你需要自己权衡这个决定的后果。',
      reasoningTrace: reasoningTrace || '基于多工具交叉分析得出。',
      costReminder: costReminder || '执行前请确认你是否能承受最坏的情况。',
      toolReferences,
      rawLlmOutput,
    };
  }

  private extractToolReferences(
    rawLlmOutput: string,
    toolResults: ToolExecutionResult[],
  ): Array<{ toolName: string; fact: string; usedIn: string }> {
    const references: Array<{ toolName: string; fact: string; usedIn: string }> = [];

    for (const result of toolResults) {
      if (!result.success || result.output === undefined) continue;

      const toolNamePattern = result.toolName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (new RegExp(toolNamePattern, 'i').test(rawLlmOutput)) {
        const tool = globalRegistry.get(result.toolName);
        const factText = tool
          ? tool.toPromptOutput(result.output)
          : String(result.output);

        references.push({
          toolName: result.toolName,
          fact: factText.slice(0, 200),
          usedIn: '判断推理',
        });
      }
    }

    return references;
  }

  private buildFallbackOutput(
    question: string,
    schedulingDecision: SchedulingDecision,
    toolResults: ToolExecutionResult[],
  ): SynthesizedOutput {
    const failedTools = toolResults.filter(r => !r.success);
    const partialFacts = toolResults
      .filter(r => r.success && r.output !== undefined)
      .map(r => {
        const tool = globalRegistry.get(r.toolName);
        return tool ? tool.toPromptOutput(r.output) : String(r.output);
      })
      .join('；');

    const fallbackJudgment = partialFacts
      ? '工具部分完成，信号不足以给出确定判断。'
      : '工具分析未完成，当前无法给出判断。';

    const fallbackCost = failedTools.length > 0
      ? `这意味着——有${failedTools.length}个分析工具未能完成，判断的覆盖面可能不足。`
      : '这意味着——你需要自己权衡这个决定的后果。';

    const fallbackReasoning = `调度策略：${schedulingDecision.scheduleReason}` +
      (partialFacts ? `。已完成工具输出：${partialFacts.slice(0, 80)}` : '');

    return {
      judgment: fallbackJudgment,
      cost: fallbackCost,
      reasoningTrace: fallbackReasoning.slice(0, 150),
      costReminder: '当前分析不完整，执行任何决定前请补充更多信息。',
      toolReferences: [],
      rawLlmOutput: '',
    };
  }
}
