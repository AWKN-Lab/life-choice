import { Injectable, Logger, Inject, Optional, BadRequestException, NotFoundException, ForbiddenException, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { LlmProvidersService } from '../../llm-providers/llm-providers.service';
import { ZhangbanshanSchedulerService, SchedulingInput } from '../orchestrator/zhangbanshan-scheduler.service';
import { UserStateClassifierService } from '../classifier/user-state-classifier.service';
import { NodeContext } from '../orchestrator/prompt-layers';
import { ContextBuilderService, SummaryCompressorService } from '../context';
import { ClarificationService } from '../clarification/clarification.service';
import { PromptInjectionGuardService } from '../../guardrails/prompt-injection-guard.service';
import { UnifiedStateMachineService, UnifiedState } from '../orchestrator/unified-state-machine.service';

// Phase 3 T3.2: 开关式迁移到 UnifiedStateMachineService
// - USE_UNIFIED_STATE_MACHINE=1 时，启用统一状态机（灰度）
// - 默认关闭，保持 DialogueState 向后兼容
// - 迁移完成后删除本 type 定义，统一使用 UnifiedState
// - 详见 PRD 4.1 节"统一对话状态机"
type DialogueState = 'IDLE' | 'SCHEDULING' | 'CLARIFYING' | 'GENERATING' | 'RESPONDING' | 'COMPLETED';

// Phase 3 T3.2: DialogueState ↔ UnifiedState 映射表
const DIALOGUE_TO_UNIFIED: Record<DialogueState, UnifiedState> = {
  IDLE: 'idle',
  SCHEDULING: 'analyzing',
  CLARIFYING: 'clarifying',
  GENERATING: 'generating',
  RESPONDING: 'responding',
  COMPLETED: 'completed',
};

interface DialogueTurn {
  role: 'user' | 'zhangbanshan';
  content: string;
  timestamp: number;
  node?: number;
}

const MAX_CLARIFICATION_ROUNDS = 2; // 默认值，Phase 5 T5.4 改为按会员等级动态

// Phase 5 T5.4: 追问次数弹性机制 — 按会员等级差异化
const CLARIFICATION_ROUNDS_BY_TIER: Record<string, number> = {
  free: 1,      // 免费用户：1 轮追问
  member: 2,    // 会员：2 轮追问
  vip: 3,       // VIP：3 轮追问
};

@Injectable()
export class DialogueService {
  private readonly logger = new Logger(DialogueService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
    @Inject(LlmProvidersService)
    private readonly llmProviders: LlmProvidersService,
    @Inject(ContextBuilderService)
    private readonly contextBuilder: ContextBuilderService,
    @Inject(SummaryCompressorService)
    private readonly summaryCompressor: SummaryCompressorService,
    @Optional() @Inject(ZhangbanshanSchedulerService)
    private readonly schedulerService?: ZhangbanshanSchedulerService,
    @Optional() @Inject(UserStateClassifierService)
    private readonly classifierService?: UserStateClassifierService,
    @Optional() @Inject(ClarificationService)
    private readonly clarificationService?: ClarificationService,
    @Optional() @Inject(PromptInjectionGuardService)
    private readonly injectionGuard?: PromptInjectionGuardService,
    // Phase 3 T3.2: 注入统一状态机（可选，灰度启用）
    @Optional() @Inject(UnifiedStateMachineService)
    private readonly unifiedStateMachine?: UnifiedStateMachineService,
  ) {}

  /**
   * Phase 3 T3.2: 统一状态机开关
   * USE_UNIFIED_STATE_MACHINE=1 时启用
   */
  private get useUnifiedStateMachine(): boolean {
    return process.env.USE_UNIFIED_STATE_MACHINE === '1' && !!this.unifiedStateMachine;
  }

  /**
   * Phase 3 T3.2: 将 DialogueState 映射为 UnifiedState 并记录日志
   * 灰度模式下，数据库仍存 DialogueState，但日志/监控使用 UnifiedState
   */
  private toUnifiedState(state: DialogueState): UnifiedState {
    return DIALOGUE_TO_UNIFIED[state] || 'idle';
  }

  /**
   * Phase 3 T3.4: 多轮对话灰度判断
   * - MULTI_TURN_ENABLED=true 是总开关
   * - MULTI_TURN_GRAY_PERCENT 控制灰度百分比（0-100，默认 100=全量启用）
   * - userId 哈希 % 100 < grayPercent 时启用
   * - 向后兼容：未设置灰度百分比时默认全量启用
   */
  isGraylisted(userId: string): boolean {
    if (process.env.MULTI_TURN_ENABLED !== 'true') return false;
    const grayPercent = parseInt(process.env.MULTI_TURN_GRAY_PERCENT || '100', 10);
    if (grayPercent >= 100) return true;
    if (grayPercent <= 0) return false;
    // userId 哈希 % 100 < grayPercent
    const hash = this.hashUserId(userId);
    return (hash % 100) < grayPercent;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Phase 5 T5.4: 获取用户会员等级对应的追问轮次上限
   * - 查询 Membership 表判断等级
   * - 降级：查询失败或无会员记录时返回 free（1 轮）
   */
  private async getMaxClarificationRounds(userId: string): Promise<number> {
    try {
      const membership = await this.prisma.membership.findFirst({
        where: { userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
      if (!membership) return CLARIFICATION_ROUNDS_BY_TIER.free;
      const tier = membership.type.toLowerCase().includes('vip') ? 'vip' : 'member';
      return CLARIFICATION_ROUNDS_BY_TIER[tier] || MAX_CLARIFICATION_ROUNDS;
    } catch (err) {
      this.logger.warn(`[DialogueService] getMaxClarificationRounds failed: ${(err as Error).message}, fallback to free`);
      return CLARIFICATION_ROUNDS_BY_TIER.free;
    }
  }

  async startDialogue(userId: string, question: string) {
    if (process.env.MULTI_TURN_ENABLED !== 'true') {
      throw new BadRequestException('多轮对话功能未启用');
    }

    // Prompt 注入防护
    if (this.injectionGuard) {
      const check = this.injectionGuard.checkInput(question);
      if (!check.isSafe) {
        throw new BadRequestException('检测到潜在 Prompt 注入，请重新描述你的问题');
      }
      question = check.sanitizedInput;
    }

    // Create ConsultDialogue record with state=IDLE
    const dialogue = await this.prisma.consultDialogue.create({
      data: {
        userId,
        state: 'IDLE',
        turns: JSON.stringify([]),
      },
    });

    // Add user question as first turn
    const turns: DialogueTurn[] = [
      { role: 'user', content: question, timestamp: Date.now(), node: 0 },
    ];

    await this.prisma.consultDialogue.update({
      where: { id: dialogue.id },
      data: { turns: JSON.stringify(turns) },
    });

    // Transition to SCHEDULING
    await this.transitionState(dialogue.id, 'SCHEDULING');

    // Determine if clarifying questions are needed
    // P4-3: Use synthesizeByNode when scheduler is available
    let needsClarification: boolean;
    let clarifyingQuestion: string;
    let openingOutput: string | undefined;

    if (this.schedulerService) {
      // Use Node 0 (opening) via synthesizeByNode
      const nodeContext: NodeContext = { currentNode: 0 };
      const node0Result = await this.schedulerService.synthesizeByNode(0, question, userId, nodeContext);
      openingOutput = node0Result.output;

      // Node 1: first clarifying question
      if (node0Result.nextNode !== undefined) {
        const node1Context: NodeContext = { currentNode: 1 };
        const node1Result = await this.schedulerService.synthesizeByNode(1, question, userId, node1Context);
        needsClarification = !!node1Result.clarifyingQuestion;
        clarifyingQuestion = node1Result.clarifyingQuestion || node1Result.output;
      } else {
        needsClarification = false;
        clarifyingQuestion = '';
      }
    } else {
      // Fallback: simplified logic when scheduler is not available
      needsClarification = await this.shouldClarify(question);
      clarifyingQuestion = await this.buildClarifyingQuestion(question);
    }

    if (needsClarification) {
      // Transition to CLARIFYING and push clarifying question
      // Add opening output if available (Node 0)
      const updatedTurns = openingOutput
        ? [...turns, { role: 'zhangbanshan' as const, content: openingOutput, timestamp: Date.now(), node: 0 }]
        : [...turns];

      updatedTurns.push({
        role: 'zhangbanshan' as const,
        content: clarifyingQuestion,
        timestamp: Date.now(),
        node: 1,
      });

      await this.prisma.consultDialogue.update({
        where: { id: dialogue.id },
        data: {
          turns: JSON.stringify(updatedTurns),
          currentNode: 1,
        },
      });

      await this.transitionState(dialogue.id, 'CLARIFYING', {
        dialogueId: dialogue.id,
        question: clarifyingQuestion,
        node: 1,
        timestamp: Date.now(),
      });

      // Push clarifying_question WS event
      this.websocketGateway.server.to(`dialogue:${dialogue.id}`).emit('clarifying_question', {
        dialogueId: dialogue.id,
        question: clarifyingQuestion,
        node: 1,
        timestamp: Date.now(),
      });
    } else {
      // Direct generation path
      await this.transitionState(dialogue.id, 'GENERATING');
      // 2026-06-17 P0 修复：触发 LLM 生成（fire-and-forget，不阻塞 REST 响应）
      this.generateAnswer(dialogue.id).catch(err => {
        this.logger.error(`[DialogueService] generateAnswer failed for ${dialogue.id}: ${err.message}`);
      });
    }

    // Return the dialogue record
    return this.prisma.consultDialogue.findUnique({
      where: { id: dialogue.id },
    });
  }

  async advanceDialogue(dialogueId: string, userReply: string, userId: string) {  // P0-3 新增 userId
    const dialogue = await this.prisma.consultDialogue.findUnique({
      where: { id: dialogueId },
    });

    if (!dialogue) {
      throw new NotFoundException(`对话 ${dialogueId} 不存在`);
    }

    // P0-3 所有权校验
    if (dialogue.userId !== userId) {
      this.logger.warn(`[P0-3-AUDIT] advanceDialogue forbidden: dialogueId=${dialogueId} caller=${userId} owner=${dialogue.userId}`);
      throw new ForbiddenException('无权访问该对话');
    }

    if (dialogue.state !== 'CLARIFYING') {
      throw new BadRequestException(`当前状态为 ${dialogue.state}，无法继续追问，仅 CLARIFYING 状态可推进`);
    }

    // Prompt 注入防护
    if (this.injectionGuard) {
      const check = this.injectionGuard.checkInput(userReply);
      if (!check.isSafe) {
        throw new BadRequestException('检测到潜在 Prompt 注入，请重新描述你的问题');
      }
      userReply = check.sanitizedInput;
    }

    // Parse existing turns
    const turns: DialogueTurn[] = this.safeParseTurns(dialogue.turns as string);

    // Add user reply
    const currentNode = dialogue.currentNode + 1;
    turns.push({
      role: 'user',
      content: userReply,
      timestamp: Date.now(),
      node: currentNode,
    });

    // Count clarification rounds (zhangbanshan turns with node >= 1)
    const clarificationRounds = turns.filter(
      t => t.role === 'zhangbanshan' && t.node !== undefined && t.node >= 1,
    ).length;

    // Phase 5 T5.4: 追问次数按会员等级动态调整（free:1/member:2/vip:3）
    const maxRounds = await this.getMaxClarificationRounds(dialogue.userId);

    if (clarificationRounds < maxRounds && await this.shouldContinueClarifying(userReply)) {
      // More clarification needed — stay in CLARIFYING
      let nextQuestion: string;
      const nextNode = currentNode + 1;

      // P4-3: Use synthesizeByNode for Node 2 if scheduler available
      if (this.schedulerService) {
        const collectedBg = turns
          .filter(t => t.role === 'user' && t.node !== undefined && t.node > 0)
          .map(t => t.content);
        const nodeContext: NodeContext = {
          currentNode: nextNode as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          collectedBackground: collectedBg,
        };
        const nodeResult = await this.schedulerService.synthesizeByNode(nextNode, userReply, '', nodeContext);
        nextQuestion = nodeResult.clarifyingQuestion || nodeResult.output;
      } else {
        nextQuestion = await this.buildClarifyingQuestion(userReply);
      }

      turns.push({
        role: 'zhangbanshan',
        content: nextQuestion,
        timestamp: Date.now(),
        node: nextNode,
      });

      await this.prisma.consultDialogue.update({
        where: { id: dialogueId },
        data: {
          turns: JSON.stringify(turns),
          currentNode: nextNode,
        },
      });

      // Push new clarifying_question WS event
      this.websocketGateway.server.to(`dialogue:${dialogueId}`).emit('clarifying_question', {
        dialogueId,
        question: nextQuestion,
        node: nextNode,
        timestamp: Date.now(),
      });
    } else {
      // Ready to generate — transition SCHEDULING → GENERATING
      await this.prisma.consultDialogue.update({
        where: { id: dialogueId },
        data: {
          turns: JSON.stringify(turns),
          currentNode,
        },
      });

      await this.transitionState(dialogueId, 'SCHEDULING');
      await this.transitionState(dialogueId, 'GENERATING');
      // 2026-06-17 P0 修复：触发 LLM 生成（fire-and-forget，不阻塞 REST 响应）
      this.generateAnswer(dialogueId).catch(err => {
        this.logger.error(`[DialogueService] generateAnswer failed for ${dialogueId}: ${err.message}`);
      });
    }

    return this.prisma.consultDialogue.findUnique({
      where: { id: dialogueId },
    });
  }

  async getDialogueResult(dialogueId: string, userId: string) {  // P0-3 新增 userId
    const dialogue = await this.prisma.consultDialogue.findUnique({
      where: { id: dialogueId },
    });

    if (!dialogue) {
      throw new NotFoundException(`对话 ${dialogueId} 不存在`);
    }

    // P0-3 所有权校验
    if (dialogue.userId !== userId) {
      this.logger.warn(`[P0-3-AUDIT] getDialogueResult forbidden: dialogueId=${dialogueId} caller=${userId} owner=${dialogue.userId}`);
      throw new ForbiddenException('无权访问该对话');
    }

    return dialogue;
  }

  async cancelDialogue(dialogueId: string): Promise<void> {
    const dialogue = await this.prisma.consultDialogue.findUnique({
      where: { id: dialogueId },
    });

    if (!dialogue) {
      throw new NotFoundException(`对话 ${dialogueId} 不存在`);
    }

    if (dialogue.state === 'COMPLETED') {
      throw new BadRequestException('已完成的对话无法取消');
    }

    await this.transitionState(dialogueId, 'IDLE');
  }

  /**
   * 2026-06-17 P0 修复：GENERATING → RESPONDING → COMPLETED 状态推进
   * 此前状态机在 GENERATING 死锁，没有任何代码调用 LLM 或推进状态。
   * 现在实现完整的 LLM 生成流程：构建 prompt → 流式调用 → WS 推送 → 保存结果。
   */
  private async generateAnswer(dialogueId: string): Promise<void> {
    const startTime = Date.now(); // Phase 5 T5.1: 指标埋点用
    const dialogue = await this.prisma.consultDialogue.findUnique({
      where: { id: dialogueId },
    });
    if (!dialogue) {
      this.logger.warn(`[DialogueService] generateAnswer: dialogue ${dialogueId} not found`);
      return;
    }

    const turns: DialogueTurn[] = this.safeParseTurns(dialogue.turns as string);

    // 构建消息列表
    const systemPrompt = [
      '你是张半山，一位融汇古今的命理咨询师。你说话有分寸、有温度，像一个见过世面但不居高临下的长辈。',
      '你的回答要有"活人感"：不说套话，不回避矛盾，敢于给出判断但同时指出不确定性。',
      '根据用户的对话背景，给出有针对性的分析和建议。',
      dialogue.collectedBackground ? `\n【用户背景】\n${dialogue.collectedBackground}` : '',
    ].filter(Boolean).join('\n\n');

    // 多轮对话上下文工程：Token-aware 滑动窗口 + 摘要压缩
    const currentUserInput = '请基于以上对话，给出你的完整分析和建议。';

    // 如果对话轮次超过 3 轮（6 条消息），先压缩早期轮次为摘要
    let summary: string | undefined;
    if (turns.length > 6) {
      try {
        const compressResult = await this.summaryCompressor.compressTurns({ turns });
        summary = compressResult.summary || undefined;
        this.logger.log(
          `[DialogueService] generateAnswer: 压缩 ${compressResult.compressedTurnCount} 条轮次为摘要`,
        );
      } catch (err) {
        this.logger.warn(
          `[DialogueService] generateAnswer: 摘要压缩失败，降级为无摘要: ${(err as Error).message}`,
        );
      }
    }

    // 使用 ContextBuilder 构建上下文（滑动窗口 + Token 预算控制）
    const { messages, tokenCount, truncatedTurns } = this.contextBuilder.buildContext({
      systemPrompt,
      dialogueTurns: turns,
      summary,
      currentUserInput,
    });

    this.logger.log(
      `[DialogueService] generateAnswer: dialogue=${dialogueId}, turns=${turns.length}, tokens=${tokenCount}, truncated=${truncatedTurns}`,
    );

    // 流式调用 LLM + WebSocket 推送
    await this.transitionState(dialogueId, 'RESPONDING');

    let fullContent = '';
    let isFallback = false; // P0-3 修复: 标记 LLM 兜底
    try {
      await this.llmProviders.chatStream(
        messages,
        undefined,
        {
          temperature: 0.7,
          maxTokens: 1500,
          onToken: (token: string) => {
            fullContent += token;
            this.websocketGateway.server.to(`dialogue:${dialogueId}`).emit('dialogue_llm_token', {
              dialogueId,
              token,
              content: token,
            });
          },
        },
      );
    } catch (err) {
      this.logger.error(`[DialogueService] LLM call failed for ${dialogueId}: ${(err as Error).message}`);
      isFallback = true; // P0-3 修复: 标记为兜底
      fullContent = '抱歉，生成分析时遇到了一些问题。请稍后重试，或者换个角度再问我一次。';
    }

    // 质量校验：检查输出不为空且包含有效内容
    if (!fullContent || fullContent.length < 10) {
      isFallback = true; // P0-3 修复: 标记为兜底
      fullContent = '抱歉，生成分析时遇到了一些问题。请稍后重试，或者换个角度再问我一次。';
    }

    // 保存结果 + 完成状态转换
    const finalTurns: DialogueTurn[] = [
      ...turns,
      { role: 'zhangbanshan', content: fullContent, timestamp: Date.now(), node: 99, isFallback } as DialogueTurn & { isFallback: boolean }, // P0-3 修复
    ];

    await this.prisma.consultDialogue.update({
      where: { id: dialogueId },
      data: {
        turns: JSON.stringify(finalTurns),
      },
    });

    await this.transitionState(dialogueId, 'COMPLETED');

    // 推送完成事件
    this.websocketGateway.sendDialogueResult(dialogueId, {
      dialogueId,
      result: fullContent,
      timestamp: Date.now(),
    });

    this.logger.log(`[DialogueService] generateAnswer completed: dialogue=${dialogueId}, length=${fullContent.length}`);

    // Phase 5 T5.1: 多轮对话指标埋点
    this.logger.log(
      `[DialogueService][METRIC] dialogue=${dialogueId} turns=${turns.length} tokens=${tokenCount} ` +
      `duration_ms=${Date.now() - startTime} fallback=${isFallback} ` +
      `content_len=${fullContent.length} truncated=${truncatedTurns}`,
    );
  }

  private async transitionState(dialogueId: string, newState: DialogueState, wsPayload?: any) {
    // P0 修复：乐观锁 — 先读取当前状态，再用 WHERE 条件更新，防止 REST+WS 双通道竞态
    const dialogue = await this.prisma.consultDialogue.findUnique({
      where: { id: dialogueId },
    });

    if (!dialogue) {
      throw new NotFoundException(`对话 ${dialogueId} 不存在`);
    }

    const previousState = dialogue.state as DialogueState || 'IDLE';

    // 条件更新：只有当前状态匹配时才更新（乐观锁）
    const result = await this.prisma.consultDialogue.updateMany({
      where: { id: dialogueId, state: previousState },
      data: { state: newState },
    });

    // 如果没有更新任何行，说明状态已被其他请求修改（竞态发生）
    if (result.count === 0) {
      this.logger.warn(`[DialogueService] state transition CONFLICT: ${dialogueId} expected ${previousState} but was already changed — skipping`);
      throw new BadRequestException(`对话状态已变更（${previousState} → 已被其他请求修改），请刷新后重试`);
    }

    // Push state_change WS event
    this.websocketGateway.server.to(`dialogue:${dialogueId}`).emit('state_change', {
      dialogueId,
      previousState,
      newState,
      timestamp: Date.now(),
      ...(wsPayload || {}),
    });

    this.logger.log(`[DialogueService] state transition: ${dialogueId} ${previousState} → ${newState}`);

    // Phase 3 T3.2: 灰度模式下，记录 UnifiedState 日志（不改变数据库存储）
    if (this.useUnifiedStateMachine) {
      const prevUnified = this.toUnifiedState(previousState);
      const newUnified = this.toUnifiedState(newState);
      this.logger.log(`[DialogueService][UnifiedSM] ${dialogueId} ${prevUnified} → ${newUnified}`);
    }
  }

  /**
   * 评估是否需要追问
   * - 有 ClarificationService 时，调用 assessAndClarify 获取评估结果
   * - 无 ClarificationService 时，降级为字符长度 + 模糊词匹配
   */
  private async shouldClarify(question: string): Promise<boolean> {
    if (!this.clarificationService) {
      // 兜底：无 clarificationService 时保留旧逻辑
      if (question.length < 10) return true;
      const vaguePatterns = ['怎么样', '好不好', '行不行', '能行吗', '可以吗', '看看', '算算', '说说', '帮我看看', '帮我算算'];
      if (vaguePatterns.some(p => question.includes(p)) && question.length < 20) return true;
      return false;
    }
    const { assessment } = await this.clarificationService.assessAndClarify(question);
    return assessment.needsClarification;
  }

  /**
   * 构建追问话术
   * - 有 ClarificationService 时，调用 assessAndClarify 获取追问
   * - 无 ClarificationService 时，降级为固定话术模板
   */
  private async buildClarifyingQuestion(question: string): Promise<string> {
    if (!this.clarificationService) {
      // 兜底：无 clarificationService 时保留旧逻辑
      if (question.length < 10) {
        return '你的问题比较简短，我需要多了解一些——你具体想问的是哪方面？比如事业、感情、财运，还是其他？';
      }
      return '你说的这个方向我大概明白了，但还需要再确认一下：你希望我重点看哪个时间段的走势？是最近，还是更长远的？';
    }
    const { clarifyingQuestion } = await this.clarificationService.assessAndClarify(question);
    return clarifyingQuestion || '能再多说一些细节吗？';
  }

  /**
   * 判断是否继续追问
   * - 有 ClarificationService 时，调用 assessAndClarify 评估回复是否提供了足够信息
   * - 无 ClarificationService 时，降级为字符长度判断
   */
  private async shouldContinueClarifying(userReply: string): Promise<boolean> {
    if (!this.clarificationService) {
      // 兜底：无 clarificationService 时保留旧逻辑
      if (userReply.length < 5) return true;
      return false;
    }
    // 使用 ClarificationService 评估回复是否提供了足够信息
    const { assessment } = await this.clarificationService.assessAndClarify(userReply);
    return assessment.needsClarification;
  }

  private safeParseTurns(value: string): DialogueTurn[] {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
}
