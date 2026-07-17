import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';
import { GatewayOutput } from '../../llm-gateway/llm-gateway.service';
import { ToolCombo, ToolExecutionResult, globalRegistry } from '../../lib/atom-tools';
import { UserMemoryService } from '../memory/user-memory.service';
import { UserStateClassifierService } from '../classifier/user-state-classifier.service';
import { buildSystemPromptFromLayers, NodeContext, LifeStageContext } from './prompt-layers';
import { EmotionState, inferEmotionFromInput } from './emotion-state';
import { loadScenarioRules, YamlScenario } from './scenario-rules-loader';
// P1-B: 主链路全场景接入 evidencePackage
import { RuleMatcherService } from './rule-matcher/rule-matcher.service';
import { RuleMatcherInput } from './rule-matcher/rule-matcher.types';
import { EvidenceComposerService } from './evidence-composer/evidence-composer.service';
import { KnowledgeRetrieverService } from './evidence-composer/knowledge-retriever/knowledge-retriever.service';
import { EvidencePackage } from './evidence-composer/evidence-composer.types';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';
// P2-B: AgentRun 调用点埋点
import { AgentRunLogger } from './agent-run/agent-run-logger';

export type AgentType = 'liuren' | 'qimen' | 'ziping' | 'ziwei' | 'liuyao' | 'quming' | 'meihua';

export type QuestionCategory = '事业' | '婚姻' | '财运' | '健康' | '时机' | '综合';

export interface SchedulingInput {
  question: string;
  hasBirthInfo: boolean;
  hasAskTime: boolean;
  sessionHistory?: Array<{ role: string; content: string }>;
  /** P0-2 修复: 用户显式路由选择，优先级最高 */
  explicitRouteType?: AgentType;
}

export type SchedulingMode = 'quick_read' | 'deep_consult';

export interface SchedulingDecision {
  primaryAgent: AgentType;
  secondaryAgent?: AgentType;
  needClarify: boolean;
  clarifyingQuestion?: string;
  scheduleReason: string;
  toolCombo: string;
  toolNames: string[];
  /**
   * P1-3: 两段式漏斗模式
   * - quick_read: 只跑主调 + 单一关键工具，1-2 秒出初步结论
   * - deep_consult: 跑主+佐调 + 完整工具链 + 仲裁
   */
  mode: SchedulingMode;
  /** 0-1；>0.8 时直接 quick_read 走完，否则自动升级 deep_consult */
  confidence: number;
}

export interface ZhangbanshanOutput {
  judgment: string;
  premise: string;
  cost: string;
  reasoning_trace: string;
  primary_agent: string;
  secondary_agent?: string;
  schedule_reason: string;
  agent_consistency?: 'consistent' | 'undetermined' | 'conflicting';
  arbitration_note?: string;
  toolResults?: ToolExecutionResult[];
  emotion_snapshot?: string; // 3维命理情绪快照 JSON
  /** P1-3: 两段式漏斗模式 */
  mode?: SchedulingMode;
  /** P1-3: 调度置信度 0-1 */
  confidence?: number;
  /** P2-2: 蛐蛐代价提醒 */
  costWarnings?: Array<{ type: string; text: string }>;
  /** P2-3: 是否需要代价确认环 */
  costConfirmationRequired?: boolean;
  /** P3-2: 记忆锚定文案 */
  memoryAnchor?: string;
  /** P0-3 修复: 标记是否为兜底结果（非 LLM 真实输出） */
  llm_fallback?: boolean;
}

export interface ArbitrationResult {
  consistency: 'consistent' | 'undetermined' | 'conflicting';
  trustedAgent: AgentType;
  trustedReason: string;
  arbitrationText: string;
  hasConflict: boolean;
  agentConfidences: Array<{ agent: AgentType; confidence: string }>;
}

interface SceneMatch {
  scenario: YamlScenario;
  score: number;
}

@Injectable()
export class ZhangbanshanSchedulerService {
  private readonly logger = new Logger(ZhangbanshanSchedulerService.name);

  constructor(
    private readonly llmProviders: LlmProvidersService,
    private readonly userMemoryService: UserMemoryService,
    @Optional() private readonly classifierService?: UserStateClassifierService,
    // P1-B: 主链路 evidencePackage 注入所需的 3 个服务（@Optional 避免破坏现有测试）
    @Optional() private readonly ruleMatcherService?: RuleMatcherService,
    @Optional() private readonly evidenceComposerService?: EvidenceComposerService,
    @Optional() private readonly knowledgeRetrieverService?: KnowledgeRetrieverService,
    // P2-B: AgentRun 调用点埋点（@Optional，失败不阻断主链路）
    @Optional() private readonly agentRunLogger?: AgentRunLogger,
  ) {
    this.registerCombos();
  }

  private registerCombos(): void {
    const rules = loadScenarioRules();
    for (const combo of rules.tool_combos) {
      try {
        globalRegistry.registerCombo({
          name: combo.name,
          description: combo.description,
          category: combo.category,
          toolNames: combo.tool_names,
        });
        this.logger.log(`[ZhangbanshanScheduler] registered combo: ${combo.name}`);
      } catch (err) {
        this.logger.warn(`[ZhangbanshanScheduler] combo "${combo.name}" registration deferred: ${(err as Error).message}`);
      }
    }
  }

  private classifyQuestion(question: string): QuestionCategory {
    const rules = loadScenarioRules();
    let bestCategory: QuestionCategory = '综合';
    let bestScore = 0;

    for (const cls of rules.classifications) {
      let score = 0;
      for (const kw of cls.keywords) {
        if (question.includes(kw)) {
          score += kw.length >= 3 ? 3 : 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cls.type as QuestionCategory;
      }
    }

    return bestCategory;
  }

  private resolveToolNames(comboName: string): string[] {
    const rules = loadScenarioRules();
    const combo = rules.tool_combos.find(c => c.name === comboName);
    return combo ? combo.tool_names : [];
  }

  schedule(input: SchedulingInput): SchedulingDecision {
    const { question, hasBirthInfo, hasAskTime } = input;
    const rules = loadScenarioRules();

    const category = this.classifyQuestion(question);
    const toolCombo = rules.combo_map[category] || 'comprehensive';
    const toolNames = this.resolveToolNames(toolCombo);

    // P0-2 修复: 显式路由优先级最高，覆盖关键词匹配
    // 用户明确选择 routeType 时，直接使用，不被调度器覆盖
    if (input.explicitRouteType) {
      const explicitAgent = input.explicitRouteType;
      this.logger.log(
        `[ZhangbanshanScheduler] 显式路由优先: explicitRouteType=${explicitAgent}，跳过关键词匹配`,
      );
      // 仍按分类确定 secondaryAgent 和 toolCombo
      let secondaryAgent: AgentType | undefined;
      if (explicitAgent === 'ziping') secondaryAgent = undefined;
      else if (explicitAgent === 'liuren') secondaryAgent = 'qimen';
      else if (explicitAgent === 'liuyao') secondaryAgent = 'qimen';
      else if (explicitAgent === 'ziwei') secondaryAgent = 'ziping';
      else if (explicitAgent === 'qimen') secondaryAgent = 'liuyao';
      else if (explicitAgent === 'meihua') secondaryAgent = undefined;
      else if (explicitAgent === 'quming') secondaryAgent = undefined;

      return {
        primaryAgent: explicitAgent,
        secondaryAgent,
        needClarify: !hasBirthInfo && !hasAskTime && explicitAgent !== 'liuyao' && explicitAgent !== 'qimen' && explicitAgent !== 'meihua',
        clarifyingQuestion: !hasBirthInfo && !hasAskTime ? '请提供出生信息或问事时间，以便精准推算。' : undefined,
        scheduleReason: `用户显式选择 ${explicitAgent}，跳过关键词匹配`,
        toolCombo,
        toolNames,
        mode: 'deep_consult',
        confidence: 1.0,
      };
    }

    // 问事链路已有起课时间时，可以直接走六壬/六爻/奇门等时占体系，
    // 不应被统一打回“必须补出生信息”。
    if (!hasBirthInfo && !hasAskTime) {
      return {
        primaryAgent: 'ziping',
        needClarify: true,
        clarifyingQuestion: '在开始之前，我需要你的出生信息。没有出生年月日时，我看到的只是冰山一角——我最多能给你一个大方向的判断，但具体到你个人的选择，不够用。你能告诉我吗？',
        scheduleReason: '缺少出生信息，需要先收集信息才能准确判断。',
        toolCombo,
        toolNames,
        // 缺少出生信息时直接走 deep_consult（因为有信息要补全）
        mode: 'deep_consult',
        confidence: 0.6,
      };
    }

    const matches: SceneMatch[] = [];
    const q = question;

    for (const scenario of rules.scenarios) {
      let score = 0;
      for (const kw of scenario.keywords) {
        if (q.includes(kw)) {
          score += kw.length >= 3 ? 3 : 1;
        }
      }
      if (score > 0) {
        matches.push({ scenario, score });
      }
    }

    matches.sort((a, b) => {
      if (b.scenario.priority !== a.scenario.priority) {
        return a.scenario.priority - b.scenario.priority;
      }
      return b.score - a.score;
    });

    if (matches.length === 0) {
      this.logger.log(`[ZhangbanshanScheduler] no keyword match for: "${q.slice(0, 50)}", defaulting to liuyao`);
      return {
        primaryAgent: 'liuyao',
        secondaryAgent: 'qimen',
        needClarify: false,
        scheduleReason: '无法从关键词确定问题类型，默认六爻一事一判 + 奇门佐调。',
        toolCombo,
        toolNames,
        // 无关键词命中 → 置信度低，走 deep_consult
        mode: 'deep_consult',
        confidence: 0.5,
      };
    }

    const best = matches[0];
    const scenario = best.scenario;

    const isMultiDimension =
      matches.length >= 2 &&
      matches.slice(0, 2).reduce((sum, m) => sum + m.score, 0) >= 6;

    if (isMultiDimension && scenario.id !== 8) {
      const zonghe = rules.scenarios.find(s => s.id === 8)!;
      this.logger.log(`[ZhangbanshanScheduler] multi-dimension detected → 重大决策降级为2 Agent`);
      return {
        primaryAgent: zonghe.primary_agent as AgentType,
        secondaryAgent: (zonghe.secondary_agent || undefined) as AgentType | undefined,
        needClarify: false,
        clarifyingQuestion: zonghe.clarifying_question,
        scheduleReason: zonghe.schedule_reason,
        toolCombo,
        toolNames,
        // 多维度 → 必定走 deep_consult
        mode: 'deep_consult',
        confidence: 0.9,
      };
    }

    this.logger.log(`[ZhangbanshanScheduler] matched scenario ${scenario.id} (${scenario.name}), score=${best.score}, category=${category}, combo=${toolCombo}`);

    let secondaryAgent = (scenario.secondary_agent || undefined) as AgentType | undefined;
    if (category === '时机' && secondaryAgent !== 'qimen') {
      secondaryAgent = 'qimen';
      this.logger.log(`[ZhangbanshanScheduler] 时机类问题，奇门作为佐调加入调度`);
    }

    // P1-3: 两段式漏斗
    // - 高置信度（score >= 6 且场景 ID <= 6 → 简单问题）→ quick_read
    // - 低置信度（score < 6 或场景 ID 7/8 → 时机/重大决策）→ deep_consult
    const isSimpleScenario = scenario.id <= 6 && best.score >= 6;
    const mode: SchedulingMode = isSimpleScenario ? 'quick_read' : 'deep_consult';
    // 置信度归一化：score 6 → 0.8，每多 1 分加 0.05，上限 0.95
    const confidence = Math.min(0.95, 0.5 + best.score * 0.05);

    return {
      primaryAgent: scenario.primary_agent as AgentType,
      secondaryAgent,
      needClarify: !hasBirthInfo && rules.birth_dependent_agents.includes(scenario.primary_agent),
      clarifyingQuestion: scenario.clarifying_question,
      scheduleReason: scenario.schedule_reason,
      toolCombo,
      toolNames,
      mode,
      confidence,
    };
  }

  async dispatch(toolNames: string[], inputs: Record<string, any>): Promise<ToolExecutionResult[]> {
    const settled = await Promise.allSettled(
      toolNames.map(async (toolName) => {
        const tool = globalRegistry.get(toolName);
        if (!tool) {
          this.logger.warn(`[ZhangbanshanScheduler] tool not found, skipping: ${toolName}`);
          return {
            toolName,
            success: false,
            error: `tool not found: ${toolName}`,
            durationMs: 0,
          } as ToolExecutionResult;
        }

        const start = Date.now();
        const { promise: timeoutPromise, cleanup } = this.createTimeout(30000, toolName);
        try {
          const output = await Promise.race([
            tool.execute(inputs[toolName] ?? inputs),
            timeoutPromise,
          ]);
          return {
            toolName,
            success: true,
            output,
            durationMs: Date.now() - start,
          } as ToolExecutionResult;
        } catch (err) {
          this.logger.warn(`[ZhangbanshanScheduler] tool "${toolName}" failed: ${(err as Error).message}`);
          return {
            toolName,
            success: false,
            error: (err as Error).message,
            durationMs: Date.now() - start,
          } as ToolExecutionResult;
        } finally {
          // Task 13.1: 清理 setTimeout handle，避免测试 --forceExit
          cleanup();
        }
      }),
    );

    const results: ToolExecutionResult[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        this.logger.error(`[ZhangbanshanScheduler] unexpected rejection: ${result.reason}`);
      }
    }

    const succeeded = results.filter(r => r.success).length;
    this.logger.log(`[ZhangbanshanScheduler] dispatch complete: ${succeeded}/${toolNames.length} tools succeeded`);

    return results;
  }

  private createTimeout(ms: number, toolName: string): { promise: Promise<never>; cleanup: () => void } {
    let timeoutId: NodeJS.Timeout;
    const promise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`tool "${toolName}" timed out after ${ms}ms`)), ms);
    });
    // Task 13.1: 返回 cleanup 函数，调用方在 Promise.race 后必须调用以清理 handle
    return { promise, cleanup: () => clearTimeout(timeoutId!) };
  }

  getRouteType(decision: SchedulingDecision): string {
    if (decision.needClarify) return 'clarify';
    return decision.primaryAgent;
  }

  agentTypeToRouteType(agent: AgentType): string {
    return agent;
  }

  /**
   * P1-B: 把主链路 QuestionCategory 映射到 RuleMatcherInput.questionType
   * RuleMatcher 当前规则集偏婚姻场景（R001/R002/R003/R012 等均针对夫妻宫/合婚），
   * 非婚姻场景默认走 marriage_decision 以复用现有规则，后续可按场景扩展规则集。
   */
  private mapQuestionCategoryToType(
    decision: SchedulingDecision,
  ): 'marriage_decision' | 'career_decision' | 'wealth_decision' | 'health_decision' {
    // 从 scheduleReason 反推场景类型（scheduleReason 通常含场景关键词）
    const reason = decision.scheduleReason || '';
    if (reason.includes('婚') || reason.includes('姻') || reason.includes('感情')) {
      return 'marriage_decision';
    }
    if (reason.includes('事业') || reason.includes('工作') || reason.includes('职业')) {
      return 'career_decision';
    }
    if (reason.includes('财') || reason.includes('钱') || reason.includes('投资')) {
      return 'wealth_decision';
    }
    if (reason.includes('健康') || reason.includes('病') || reason.includes('身体')) {
      return 'health_decision';
    }
    // 默认走婚姻场景（RuleMatcher 规则集当前覆盖最全）
    return 'marriage_decision';
  }

  /**
   * P2-B: 安全埋点 —— AgentRunLogger 未注入或日志写入失败时，只 warn 不抛出
   * 保证埋点逻辑绝不阻断主链路
   */
  private safeLogAgentRun(entry: {
    recordId: string;
    agentName: string;
    inputJson: unknown;
    matchedRules?: unknown[];
    outputJson: unknown;
    status: 'success' | 'failed' | 'skipped';
    errorMessage?: string;
    latencyMs: number;
    modelName?: string;
    promptVersion?: string;
    ruleVersion?: string;
    knowledgeVersion?: string;
  }): void {
    if (!this.agentRunLogger) return;
    try {
      this.agentRunLogger.log({
        ...entry,
        createdAt: new Date().toISOString(),
      } as any);
    } catch (err) {
      this.logger.warn(`[P2-B] AgentRun log 失败（非阻断）: ${(err as Error).message}`);
    }
  }

  async synthesizeThreeStage(
    question: string,
    decision: SchedulingDecision,
    primaryOutput: GatewayOutput,
    secondaryOutput?: GatewayOutput,
    userId?: string,
    onToken?: (token: string) => void,
    costWarningEnabled?: boolean,
    // P1-B: 主链路全场景接入 evidencePackage（由 orchestrator 从 calcResult.calcData 构造传入）
    chartSnapshot?: { male: BaziFullResult; female?: BaziFullResult },
    // 任务 2.3: 人生状态窗口（来自 K线/潮汐图，问此事时注入）
    lifeStage?: LifeStageContext,
  ): Promise<ZhangbanshanOutput> {
    const agentName = this.friendlyAgentName(decision.primaryAgent);
    const agentSummary = primaryOutput.summary_body || primaryOutput.summary_line || '';

    let secondarySection = '';
    if (secondaryOutput) {
      const secondaryName = this.friendlyAgentName(decision.secondaryAgent!);
      const secondarySummary = secondaryOutput.summary_body || secondaryOutput.summary_line || '';
      secondarySection = `${secondaryName}的补充分析：${secondarySummary}`;
    }

    let memorySummary = '';
    let memoryAnchor: string | undefined;
    if (userId) {
      try {
        // P1-2: 用问题相关度检索（而非最近摘要），让 prompt 注入更精准
        const search = await this.userMemoryService.searchRelevantMemory(userId, question, { topK: 3, maxSummaryLength: 200 });
        memorySummary = search.summary;
        if (search.hits.length > 0) {
          this.logger.log(`[ZhangbanshanScheduler] memory hits: ${search.hits.length}, summary=${search.summary.length} chars`);
        }

        // P3-2: 记忆锚定（重复提问检测）
        const anchor = await this.userMemoryService.buildMemoryAnchor(userId, question);
        if (anchor) {
          memoryAnchor = anchor;
          this.logger.log(`[ZhangbanshanScheduler] memory anchor triggered for user ${userId}`);
        }
      } catch (err) {
        this.logger.warn(`[ZhangbanshanScheduler] failed to get memory summary for user ${userId}: ${(err as Error).message}`);
      }
    }

    // 4 层 Prompt 架构（学自 awkn-agent）
    // 情绪推断（学自 awkn-agent 情绪系统）
    const emotion = new EmotionState();
    const emotionEvents = inferEmotionFromInput(question);
    for (const evt of emotionEvents) {
      emotion.applyEvent(evt);
    }
    const emotionInstruction = emotion.toPromptInstruction();

    // P2-2: 蛐蛐代价提醒类型轮换
    let costWarningType: 'cost' | 'boundary' | 'memory_anchor' | 'framework_correction' | undefined;
    if (costWarningEnabled) {
      const types: Array<'cost' | 'boundary' | 'memory_anchor' | 'framework_correction'> = ['cost', 'boundary', 'memory_anchor', 'framework_correction'];
      // 基于用户 ID 哈希选择类型，确保同一用户不同咨询使用不同类型
      const hash = (userId || question).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      costWarningType = types[hash % types.length];
    }

    // P2-3: 代价确认环（重大决策/高风险场景时触发）
    const costConfirmationRequired = decision.mode === 'deep_consult' && decision.confidence >= 0.8;

    // P3-3: 用户状态分类
    let userState: string | undefined;
    if (this.classifierService && process.env.USER_CLASSIFIER_ENABLED === 'true' && userId) {
      try {
        const classification = await this.classifierService.classify(userId, question);
        userState = classification.state;
        this.logger.log(`[P3-3] User classified as ${userState} (confidence: ${classification.confidence})`);
      } catch (e) {
        this.logger.warn(`[P3-3] Classification failed, skipping: ${(e as Error).message}`);
      }
    }

    // P1-B: 主链路全场景接入 evidencePackage（受 EVIDENCE_PACKAGE_ENABLED 灰度控制）
    // 触发条件：环境变量开启 + chartSnapshot 可用 + 3 个服务已注入
    // 失败降级：任一异常时 evidencePackage = undefined，走旧路径
    let evidencePackage: EvidencePackage | undefined;
    if (
      process.env.EVIDENCE_PACKAGE_ENABLED === 'true' &&
      chartSnapshot &&
      this.ruleMatcherService &&
      this.evidenceComposerService
    ) {
      try {
        const matchInput: RuleMatcherInput = {
          chartSnapshot,
          questionType: this.mapQuestionCategoryToType(decision),
          userContext: {
            background: question.substring(0, 80),
            concerns: [],
          },
          currentYear: new Date().getFullYear(),
          birthInfo: {
            maleBirthYear: chartSnapshot.male.daYun?.[0]
              ? new Date().getFullYear() - (chartSnapshot.male.daYun[0].endAge - chartSnapshot.male.daYun[0].startAge + 1)
              : undefined,
          },
        };
        const matchResult = this.ruleMatcherService.match(matchInput);
        // P2-B: RuleMatcher 调用点埋点
        this.safeLogAgentRun({
          recordId: userId || 'unknown',
          agentName: 'RuleMatcher',
          inputJson: { questionType: matchInput.questionType, currentYear: matchInput.currentYear },
          matchedRules: matchResult.matchedRules,
          outputJson: { matchedCount: matchResult.matchedRules.length, summary: matchResult.summary },
          status: 'success',
          latencyMs: 0,
          ruleVersion: 'v1.0',
        });

        evidencePackage = this.evidenceComposerService.compose({
          chartSnapshot: matchInput.chartSnapshot,
          matchedRules: matchResult.matchedRules,
          userContext: matchInput.userContext,
        });
        // P2-B: EvidenceComposer 调用点埋点
        this.safeLogAgentRun({
          recordId: userId || 'unknown',
          agentName: 'EvidenceComposer',
          inputJson: { matchedRulesCount: matchResult.matchedRules.length },
          outputJson: {
            evidenceCompleteness: evidencePackage.ruleBasedScore.evidenceCompleteness,
            riskLevel: evidencePackage.ruleBasedScore.riskLevel,
            decisionBias: evidencePackage.ruleBasedScore.decisionBias,
          },
          status: 'success',
          latencyMs: 0,
          promptVersion: evidencePackage.meta.versions.prompt,
          ruleVersion: evidencePackage.meta.versions.rules,
          knowledgeVersion: evidencePackage.meta.versions.knowledge,
        });
        this.logger.log(
          `[P1-B] evidencePackage 注入成功：命中 ${matchResult.matchedRules.length} 条规则，` +
            `证据完整度=${evidencePackage.ruleBasedScore.evidenceCompleteness}`,
        );
      } catch (err) {
        this.logger.warn(
          `[P1-B] evidencePackage 构造失败，降级到旧路径: ${(err as Error).message}`,
        );
        evidencePackage = undefined;
      }
    }

    const systemPrompt = buildSystemPromptFromLayers({
      scenarioName: decision.scheduleReason || '综合分析',
      primaryAgent: decision.primaryAgent,
      primaryAgentName: decision.primaryAgent, // P2-1: 传入算法名称用于引子话术
      secondaryAgent: decision.secondaryAgent,
      availableTools: decision.toolNames || [],
      memorySummary,
      emotionInstruction,
      question,
      agentName,
      agentSummary,
      secondarySection: secondarySection || '',
      costWarningEnabled,
      costWarningType,
      costConfirmationRequired,
      userState,
      memoryAnchor, // P3-2: 记忆锚定传入 prompt builder
      evidencePackage, // P1-B: 主链路证据包注入
      lifeStage, // 任务 2.3: K线/潮汐状态窗口注入
    });

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: '请基于以上信息，按格式输出你的判断。',
      },
    ];

    try {
      const llmStart = Date.now();
      const result = onToken
        ? await this.llmProviders.chatStream(messages, undefined, {
            maxTokens: 500,
            temperature: 0.7,
            onToken,
          })
        : await this.llmProviders.chatCheap(messages, {
            maxTokens: 500,
            temperature: 0.7,
          });
      const llmLatencyMs = Date.now() - llmStart;

      // P2-B: LLM 调用点埋点
      this.safeLogAgentRun({
        recordId: userId || 'unknown',
        agentName: decision.primaryAgent,
        inputJson: {
          question: question.substring(0, 100),
          promptLength: systemPrompt.length,
          evidenceInjected: !!evidencePackage,
        },
        outputJson: {
          contentLength: result.content?.length || 0,
          mode: decision.mode,
        },
        status: 'success',
        latencyMs: llmLatencyMs,
        modelName: (result as any)?.model,
        promptVersion: evidencePackage?.meta.versions.prompt,
      });

      return {
        ...this.parseThreeStageOutput(result.content, decision, costWarningType),
        emotion_snapshot: JSON.stringify(emotion.toJSON()),
        mode: decision.mode,
        confidence: decision.confidence,
        costConfirmationRequired, // P2-3: 代价确认环标记
        memoryAnchor, // P3-2: 记忆锚定透传前端
      };
    } catch (error) {
      this.logger.error(`[ZhangbanshanScheduler] three-stage synthesis failed: ${error.message}`);
      // P2-B: LLM 失败也埋点
      this.safeLogAgentRun({
        recordId: userId || 'unknown',
        agentName: decision.primaryAgent,
        inputJson: { question: question.substring(0, 100) },
        outputJson: null,
        status: 'failed',
        errorMessage: error.message,
        latencyMs: 0,
      });
      return {
        ...this.buildFallbackThreeStage(decision, primaryOutput),
        emotion_snapshot: JSON.stringify(emotion.toJSON()),
        mode: decision.mode,
        confidence: decision.confidence,
      };
    }
  }

  private parseThreeStageOutput(raw: string, decision: SchedulingDecision, costWarningType?: string): ZhangbanshanOutput {
    const judgmentMatch = raw.match(/【我的判断】\s*([\s\S]*?)(?=【前提】|【代价】|$)/);
    const premiseMatch = raw.match(/【前提】\s*([\s\S]*?)(?=【代价】|【推理轨迹】|$)/);
    const costMatch = raw.match(/【代价】\s*([\s\S]*?)(?=【推理轨迹】|⚠️|$)/);
    const reasoningMatch = raw.match(/【推理轨迹】\s*([\s\S]*?)(?=⚠️|$)/);

    // P2-2: 解析 ⚠️ 代价提醒
    const costWarningMatch = raw.match(/⚠️\s*代价提醒[：:]\s*(.+)/);

    let judgment = (judgmentMatch?.[1] || '').trim();
    let premise = (premiseMatch?.[1] || '').trim();
    let cost = (costMatch?.[1] || '').trim();
    let reasoning_trace = (reasoningMatch?.[1] || '').trim();

    if (judgment.length > 80) {
      judgment = judgment.slice(0, 80);
      this.logger.warn(`[ZhangbanshanScheduler] judgment truncated to 80 chars`);
    }

    if (cost.length > 100) {
      cost = cost.slice(0, 100);
      this.logger.warn(`[ZhangbanshanScheduler] cost truncated to 100 chars`);
    }

    if (cost && !cost.startsWith('这意味着')) {
      cost = '这意味着——' + cost;
    }

    if (reasoning_trace.length > 120) {
      reasoning_trace = reasoning_trace.slice(0, 120);
      this.logger.warn(`[ZhangbanshanScheduler] reasoning_trace truncated to 120 chars`);
    }

    const output: ZhangbanshanOutput = {
      judgment,
      premise: premise || '判断基于当前已知信息，前提条件可能随情况变化而调整。',
      cost: cost || `这意味着——你需要自己权衡这个决定的后果。`,
      reasoning_trace: reasoning_trace || `由${this.friendlyAgentName(decision.primaryAgent)}分析得出。`,
      primary_agent: decision.primaryAgent,
      secondary_agent: decision.secondaryAgent,
      schedule_reason: decision.scheduleReason,
      agent_consistency: decision.secondaryAgent ? 'consistent' : undefined,
    };

    // P2-2: 附加蛐蛐代价提醒
    if (costWarningMatch) {
      output.costWarnings = [{
        type: costWarningType || 'cost',
        text: costWarningMatch[1].trim(),
      }];
    }

    return output;
  }

  private buildFallbackThreeStage(
    decision: SchedulingDecision,
    primaryOutput: GatewayOutput,
  ): ZhangbanshanOutput {
    const agentName = this.friendlyAgentName(decision.primaryAgent);
    const summaryLine = primaryOutput.summary_line || '判断结果见下方详细分析';
    const costEstimate = primaryOutput.risks?.length
      ? `这意味着——你需要注意：${primaryOutput.risks.slice(0, 2).join('；')}。`
      : '这意味着——你需要自己权衡这个决定的后果。';

    return {
      judgment: summaryLine.length > 80 ? summaryLine.slice(0, 80) : summaryLine,
      premise: '判断基于当前已知信息，前提条件可能随情况变化而调整。',
      cost: costEstimate.length > 100 ? costEstimate.slice(0, 100) : costEstimate,
      reasoning_trace: `由${agentName}分析得出。${decision.scheduleReason}`,
      primary_agent: decision.primaryAgent,
      secondary_agent: decision.secondaryAgent,
      schedule_reason: decision.scheduleReason,
      llm_fallback: true, // P0-3 修复: 标记为兜底结果
    };
  }

  private friendlyAgentName(agent: AgentType): string {
    const names: Record<AgentType, string> = {
      liuren: '六壬',
      qimen: '奇门',
      ziping: '八字/子平',
      ziwei: '紫微',
      liuyao: '六爻',
      quming: '取名',
      meihua: '梅花',  // U-P2-1: 梅花易数 Agent
    };
    return names[agent] || agent;
  }

  arbitrate(
    decision: SchedulingDecision,
    primaryOutput: GatewayOutput,
    secondaryOutput: GatewayOutput,
    consistency: 'consistent' | 'undetermined' | 'conflicting',
  ): ArbitrationResult {
    const pConf = this.normalizeConfidence(primaryOutput.agent_confidence);
    const sConf = this.normalizeConfidence(secondaryOutput.agent_confidence);

    const confidences = [
      { agent: decision.primaryAgent, confidence: pConf },
      { agent: decision.secondaryAgent!, confidence: sConf },
    ];

    if (consistency === 'consistent') {
      return {
        consistency: 'consistent',
        trustedAgent: decision.primaryAgent,
        trustedReason: '两个系统的核心结论一致，无需仲裁。',
        arbitrationText: '',
        hasConflict: false,
        agentConfidences: confidences,
      };
    }

    if (consistency === 'undetermined') {
      const higherAgent = this.higherConfidenceAgent(
        decision.primaryAgent, pConf,
        decision.secondaryAgent!, sConf,
      );

      return {
        consistency: 'undetermined',
        trustedAgent: higherAgent,
        trustedReason: `${this.friendlyAgentName(higherAgent)}的信噪比更高，优先采信。`,
        arbitrationText: this.generateUndeterminedText(
          decision, higherAgent,
          decision.primaryAgent === higherAgent ? decision.secondaryAgent! : decision.primaryAgent,
        ),
        hasConflict: false,
        agentConfidences: confidences,
      };
    }

    const trustedAgent = this.resolveConflict(
      decision,
      { agent: decision.primaryAgent, confidence: pConf },
      { agent: decision.secondaryAgent!, confidence: sConf },
    );

    const untrustedAgent = trustedAgent === decision.primaryAgent
      ? decision.secondaryAgent!
      : decision.primaryAgent;

    const trustedReason = trustedAgent === decision.primaryAgent
      ? `「${this.friendlyAgentName(trustedAgent)}」更适合这个问题类型——${decision.scheduleReason}`
      : `「${this.friendlyAgentName(trustedAgent)}」的置信度更高，且提供了更具体的判断依据。`;

    return {
      consistency: 'conflicting',
      trustedAgent,
      trustedReason,
      arbitrationText: this.generateConflictText(
        decision,
        trustedAgent,
        untrustedAgent,
        primaryOutput,
        secondaryOutput,
      ),
      hasConflict: true,
      agentConfidences: confidences,
    };
  }

  private resolveConflict(
    decision: SchedulingDecision,
    primary: { agent: AgentType; confidence: string },
    secondary: { agent: AgentType; confidence: string },
  ): AgentType {
    if (primary.confidence === '高' && secondary.confidence !== '高') {
      return primary.agent;
    }
    if (secondary.confidence === '高' && primary.confidence !== '高') {
      return secondary.agent;
    }

    return decision.primaryAgent;
  }

  private higherConfidenceAgent(
    a1: AgentType, c1: string,
    a2: AgentType, c2: string,
  ): AgentType {
    const rank = { '高': 3, '中': 2, '低': 1, 'unknown': 0 };
    const r1 = rank[c1] ?? 0;
    const r2 = rank[c2] ?? 0;
    return r1 >= r2 ? a1 : a2;
  }

  private normalizeConfidence(raw: string | undefined): string {
    if (!raw) return 'unknown';
    const normalized = raw.trim();
    if (['高', 'high'].some(s => normalized.includes(s))) return '高';
    if (['中', 'medium', '中等'].some(s => normalized.includes(s))) return '中';
    if (['低', 'low'].some(s => normalized.includes(s))) return '低';
    return 'unknown';
  }

  private generateConflictText(
    decision: SchedulingDecision,
    trusted: AgentType,
    untrusted: AgentType,
    primaryOutput: GatewayOutput,
    secondaryOutput: GatewayOutput,
  ): string {
    const trustedName = this.friendlyAgentName(trusted);
    const untrustedName = this.friendlyAgentName(untrusted);
    const untrustedOutput = untrusted === decision.primaryAgent ? primaryOutput : secondaryOutput;
    const untrustedSummary = untrustedOutput.summary_line || '提供了不同的判断';

    return `我这个判断，采信了${trustedName}的分析，因为${decision.scheduleReason}。` +
      `不过，${untrustedName}说的「${untrustedSummary}」也不是完全没有道理——` +
      `关键差异在于：${trustedName}的权重在这个问题上更高。` +
      `如果你觉得${untrustedName}说的更符合实际情况，可以告诉我——我再重新看看。`;
  }

  private generateUndeterminedText(
    decision: SchedulingDecision,
    trusted: AgentType,
    untrusted: AgentType,
  ): string {
    const trustedName = this.friendlyAgentName(trusted);
    const untrustedName = this.friendlyAgentName(untrusted);

    return `${untrustedName}给的信号不太清晰。这个判断，目前主要基于${trustedName}的分析。` +
      `影响判断准确度的关键信息可能需要你补充更多背景——如果你觉得有些情况我没考虑到，可以告诉我。`;
  }

  // ─── P4-3: 对话节点合成 ───

  /**
   * 按对话节点编号生成输出
   * - Node 0/4: 脚本化，不调 LLM
   * - Node 1/2: 调 LLM，输出问句格式
   * - Node 3: 复用现有三段式逻辑
   * - Node 5: 复用追问逻辑
   * - Node 6: 简短总结 + 免责声明
   */
  async synthesizeByNode(
    node: number,
    question: string,
    userId: string,
    nodeContext: NodeContext,
    onLLMToken?: (token: string) => void,
  ): Promise<{ output: string; nextNode?: number; clarifyingQuestion?: string }> {
    this.logger.log(`[P4-3] synthesizeByNode: node=${node}, question="${question.substring(0, 30)}..."`);

    // Node 0: 开场白（脚本化）
    if (node === 0) {
      const output = `你问的是「${question}」，让我看看。`;
      return { output, nextNode: 1 };
    }

    // Node 4: 代价确认（脚本化）
    if (node === 4) {
      const output = `你确认要继续吗？这个判断的代价我已经说清楚了。`;
      return { output, nextNode: 5 };
    }

    // Node 1/2: 反问收集背景（调 LLM，输出问句格式）
    if (node === 1 || node === 2) {
      const roundLabel = node === 1 ? '第一次' : '第二次';
      const systemPrompt = buildSystemPromptFromLayers({
        scenarioName: '追问深入',
        primaryAgent: 'zhangbanshan',
        secondaryAgent: null,
        availableTools: ['追问分析'],
        memorySummary: '',
        emotionInstruction: '保持沉稳，像一个有经验的长者在提问',
        question,
        agentName: '张半山',
        agentSummary: `这是${roundLabel}反问，目的是收集更多背景信息`,
        secondarySection: '',
        nodeContext,
      });

      const userPrompt = node === 1
        ? `用户问的是「${question}」。你需要问一个简短的反问来收集背景信息。只输出一个问题，不超过30字。不要输出判断。`
        : `用户问的是「${question}」。你需要再追问一个更具体的问题。只输出一个问题，不超过30字。不要输出判断。`;

      try {
        const messages: LlmMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        const result = await this.llmProviders.chatCheap(messages, {
          stream: !!onLLMToken,
          onToken: onLLMToken || undefined,
        });

        const clarifyingQuestion = (result.content || '你能再说具体一点吗？').trim();
        const nextNode = node === 1 ? 2 : 3; // 第一次反问后可能还有第二次，第二次后直接判断

        return { output: clarifyingQuestion, nextNode, clarifyingQuestion };
      } catch (e) {
        this.logger.warn(`[P4-3] Node ${node} LLM failed: ${(e as Error).message}`);
        const fallback = node === 1
          ? '你能说得更具体一点吗？你最担心的是什么？'
          : '还有别的你想补充的吗？';
        return { output: fallback, nextNode: 3, clarifyingQuestion: fallback };
      }
    }

    // Node 3: 正式判断（复用三段式逻辑，但这里简化为直接调 LLM）
    if (node === 3) {
      const systemPrompt = buildSystemPromptFromLayers({
        scenarioName: '正式判断',
        primaryAgent: 'zhangbanshan',
        primaryAgentName: 'liuren',
        secondaryAgent: null,
        availableTools: ['六壬排盘', '判断分析'],
        memorySummary: '',
        emotionInstruction: '保持沉稳，给出明确判断',
        question,
        agentName: '张半山',
        agentSummary: '基于用户问题和收集到的背景信息进行判断',
        secondarySection: '',
        costWarningEnabled: process.env.COST_WARNING_ENABLED === 'true',
        nodeContext,
      });

      const backgroundInfo = nodeContext.collectedBackground?.length
        ? `\n\n用户补充的背景信息：${nodeContext.collectedBackground.join('；')}`
        : '';

      try {
        const messages: LlmMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户的问题是：「${question}」${backgroundInfo}\n\n请按三段式格式输出你的判断。` },
        ];

        const result = await this.llmProviders.chat(messages, undefined, {
          stream: !!onLLMToken,
          onToken: onLLMToken || undefined,
        });

        const output = result.content || '我暂时无法给出判断。';
        return { output, nextNode: 6 };
      } catch (e) {
        this.logger.warn(`[P4-3] Node 3 LLM failed: ${(e as Error).message}`);
        return { output: '我暂时无法给出判断，请稍后再试。', nextNode: 6 };
      }
    }

    // Node 5: 追问深入（复用追问逻辑）
    if (node === 5) {
      const systemPrompt = buildSystemPromptFromLayers({
        scenarioName: '追问深入',
        primaryAgent: 'zhangbanshan',
        secondaryAgent: null,
        availableTools: ['追问分析'],
        memorySummary: '',
        emotionInstruction: '保持沉稳，深入分析',
        question,
        agentName: '张半山',
        agentSummary: '用户追问，需要更深入的分析',
        secondarySection: '',
        nodeContext,
      });

      try {
        const messages: LlmMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户追问：「${question}」。请给出更深入的分析。` },
        ];

        const result = await this.llmProviders.chat(messages, undefined, {
          stream: !!onLLMToken,
          onToken: onLLMToken || undefined,
        });

        const output = result.content || '我暂时无法进一步分析。';
        return { output, nextNode: 6 };
      } catch (e) {
        this.logger.warn(`[P4-3] Node 5 LLM failed: ${(e as Error).message}`);
        return { output: '我暂时无法进一步分析，请稍后再试。', nextNode: 6 };
      }
    }

    // Node 6: 收尾总结
    if (node === 6) {
      const output = `以上就是我的判断。记住，决策的代价不在算的那一刻，在执行的那一刻。\n\n命理分析仅供参考，不构成专业决策建议。重大决策请咨询专业人士。`;
      return { output };
    }

    // 未知节点
    this.logger.warn(`[P4-3] Unknown node: ${node}`);
    return { output: '我暂时无法处理这个请求。' };
  }
}
