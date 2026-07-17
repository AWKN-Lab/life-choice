import { Injectable, Logger, Inject, NotFoundException, Optional, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmProvidersService } from '../../llm-providers/llm-providers.service';
import { ContextBuilderService } from '../context';
import { UserMemoryService } from '../memory/user-memory.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  buildIdentityLayer,
  buildCapabilityLayer,
  buildContextLayer,
  buildDynamicLayer,
} from '../orchestrator/prompt-layers';
import { ACTIVE_MOVE_SCENARIOS } from './active-moves';

const MAX_FOLLOWUP_ROUNDS = 3;

@Injectable()
export class FollowupService {
  private readonly logger = new Logger(FollowupService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(LlmProvidersService)
    private readonly llmProviders: LlmProvidersService,
    @Inject(UserMemoryService)
    private readonly userMemoryService: UserMemoryService,
    @Inject(WebsocketGateway)
    private readonly websocketGateway: WebsocketGateway,
    @Optional() @InjectQueue('followup-queue') private readonly followupQueue: Queue | null,
    @Inject(ContextBuilderService)
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  async handleFollowup(
    recordId: string,
    question: string,
    context: Array<{ role: string; content: string }> | undefined,
    userId: string,  // P0-2 新增：所有权校验
  ) {
    // 1. 查询原始咨询记录
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`咨询记录 ${recordId} 不存在`);
    }

    // P0-2 所有权校验：咨询记录必须属于当前用户
    if (record.userId !== userId) {
      this.logger.warn(`[P0-2-AUDIT] handleFollowup forbidden: recordId=${recordId} caller=${userId} owner=${record.userId}`);
      throw new ForbiddenException('无权访问该咨询记录');
    }

    // 2. 检查追问轮次
    const analysisData = record.analysisData
      ? this.safeParseJson(record.analysisData as string)
      : {};
    const followupCount: number = analysisData.followupCount || 0;
    // 任务 3.4: ¥1 深推追加 3 次追问额度（deepDiveBonus 由 webhook 支付成功后写入）
    const deepDiveBonus: number = analysisData.deepDiveBonus || 0;
    const effectiveMaxRounds = MAX_FOLLOWUP_ROUNDS + deepDiveBonus;

    if (followupCount >= effectiveMaxRounds) {
      return {
        recordId,
        question,
        content: '本次咨询追问次数已用完。如需继续深入，建议开启新的咨询。',
        done: true,
        followupCount,
        maxRounds: effectiveMaxRounds,
        baseRounds: MAX_FOLLOWUP_ROUNDS,
        deepDiveBonus,
        paywallTriggered: true,
      };
    }

    // 3. 构建上下文 — 提取前文推演结果
    const routeType = record.routeType || 'ziping';
    const summaryLine = record.summaryLine || analysisData.summary_line || '';
    const summaryBody = analysisData.summary_body || '';

    // P1-4: 从 llmResult 提取完整推演结果，确保追问不断链
    let deductionContext = '';
    try {
      const llmResult = record.llmResult ? this.safeParseJson(record.llmResult as string) : null;
      if (llmResult) {
        const parts: string[] = [];
        // 提取三段式判断
        if (llmResult.zhangbanshan_output) {
          const zbo = llmResult.zhangbanshan_output;
          if (zbo.judgment) parts.push(`【判断】${zbo.judgment}`);
          if (zbo.premise) parts.push(`【前提】${zbo.premise}`);
          if (zbo.cost) parts.push(`【代价】${zbo.cost}`);
          if (zbo.reasoning_trace) parts.push(`【推理轨迹】${zbo.reasoning_trace}`);
          if (zbo.emotion_snapshot) parts.push(`【情绪状态】${zbo.emotion_snapshot}`);
        }
        // 提取渲染输出（完整文本）
        if (llmResult.rendered_output) {
          parts.push(`【完整推演文本】\n${(llmResult.rendered_output as string).slice(0, 1500)}`);
        }
        if (parts.length > 0) {
          deductionContext = parts.join('\n');
        }
      }
    } catch {
      this.logger.warn(`[handleFollowup] llmResult parse failed for ${recordId}`);
    }

    // 4. 用 prompt-layers 构建 system prompt
    const routeLabel = this.getRouteLabel(routeType);

    const systemPrompt = this.buildFollowupSystemPrompt(
      routeType,
      routeLabel,
      summaryLine,
      summaryBody,
      question,
      deductionContext,
    );

    // 5. 构建上下文 — 使用 ContextBuilder 统一策略（Token-aware 滑动窗口，替换原 slice(-6) 硬编码）
    const dialogueTurns = (context || []).map(msg => ({
      role: (msg.role === 'user' ? 'user' : 'zhangbanshan') as 'user' | 'zhangbanshan',
      content: msg.content,
      timestamp: 0,
    }));

    const { messages, tokenCount, truncatedTurns } = this.contextBuilder.buildContext({
      systemPrompt,
      dialogueTurns,
      currentUserInput: question,
    });

    this.logger.log(
      `[handleFollowup] recordId=${recordId} contextTurns=${dialogueTurns.length} tokens=${tokenCount} truncated=${truncatedTurns}`,
    );

    // 6. 流式调用 LLM，通过 WebSocket 推送 token
    const sessionId = record.sessionId || null;
    let fullContent = '';

    try {
      const response = await this.llmProviders.chatStream(
        messages,
        undefined, // 使用默认 provider
        {
          temperature: 0.7,
          maxTokens: 1024,
          timeout: 30000,
          stream: true,
          onToken: (token: string) => {
            fullContent += token;
            this.websocketGateway.sendLLMToken(sessionId, {
              recordId,
              stage: 'reasoning',
              token,
            });
          },
        },
      );

      // 发送 done 信号
      this.websocketGateway.sendLLMToken(sessionId, {
        recordId,
        stage: 'meta',
        token: '',
        done: true,
        provider: response.provider,
      });

      // 7. 更新追问计数
      const newCount = followupCount + 1;
      const updatedAnalysis = { ...analysisData, followupCount: newCount };
      await this.prisma.consultRecord.update({
        where: { id: recordId },
        data: { analysisData: JSON.stringify(updatedAnalysis) },
      });

      // P1-4: 第 3 次追问触发付费提示
      const paywallTriggered = newCount >= MAX_FOLLOWUP_ROUNDS;

      this.logger.log(`[handleFollowup] recordId=${recordId} round=${newCount} chars=${fullContent.length} paywall=${paywallTriggered}`);

      return {
        recordId,
        question,
        content: response.content,
        done: true,
        followupCount: newCount,
        maxRounds: MAX_FOLLOWUP_ROUNDS,
        paywallTriggered,
        provider: response.provider,
        model: response.model,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[handleFollowup] LLM failed: ${err.message}`);

      // 发送错误信号
      this.websocketGateway.sendLLMToken(sessionId, {
        recordId,
        stage: 'meta',
        token: '',
        done: true,
        error: err.message,
      });

      return {
        recordId,
        question,
        content: '追问服务暂时不可用，请稍后重试。',
        done: true,
        followupCount,
        maxRounds: MAX_FOLLOWUP_ROUNDS,
        paywallTriggered: false,
        error: err.message,
      };
    }
  }

  private buildFollowupSystemPrompt(
    routeType: string,
    routeLabel: string,
    summaryLine: string,
    summaryBody: string,
    currentQuestion: string,
    deductionContext: string,
  ): string {
    const layer1 = buildIdentityLayer();
    const layer2 = buildCapabilityLayer({
      scenarioName: '追问深入',
      primaryAgent: routeLabel,
      primaryAgentName: routeType, // P2-1: 传入算法名称用于引子话术
      secondaryAgent: null,
      availableTools: ['追问分析'],
      costWarningEnabled: process.env.COST_WARNING_ENABLED === 'true', // P2-2: 追问场景也注入蛐蛐指令
      costWarningType: 'cost' as const, // 追问场景固定用 cost 类型
    });
    const layer3 = buildContextLayer({
      memorySummary: '',
      emotionInstruction: '用户正在追问，保持沉稳，基于已有分析深入解读',
    });

    // P1-4: 将前文推演结果注入 Dynamic 层，确保追问不断链
    const deductionSection = deductionContext
      ? `\n【前文推演结果（必须基于此上下文回答追问，不可遗漏）】\n${deductionContext}\n`
      : '';

    const layer4 = buildDynamicLayer({
      question: currentQuestion,
      agentName: routeLabel,
      agentSummary: summaryLine,
      secondarySection: `原始分析详情：${summaryBody.slice(0, 500)}${deductionSection}`,
    });

    return `${layer1}\n${layer2}\n${layer3}\n${layer4}`;
  }

  private getRouteLabel(routeType: string): string {
    const labels: Record<string, string> = {
      ziping: '八字命盘',
      liuren: '六壬课盘',
      quming: '取名分析',
      qimen: '奇门遁甲',
      liuyao: '六爻卦象',
      ziwei: '紫微斗数',
    };
    return labels[routeType] || '命理分析';
  }

  // ─── P3-1 回访系统：调度 / 查询 / 完成 ───

  /**
   * D2: 调度回访 — 创建 ConsultFollowUp 记录 + 入队 BullMQ
   * Feature Flag: CALLBACK_ENABLED=true 时才执行
   * P2-5: 新增 triggerType + messageTemplate 参数（10 场景主动出击）
   */
  async scheduleFollowUp(
    recordId: string,
    userId: string,
    delayDays = 7,
    options?: { triggerType?: string; messageTemplate?: string; issueId?: string },
  ) {
    if (process.env.CALLBACK_ENABLED !== 'true') {
      this.logger.log(`[scheduleFollowUp] CALLBACK_ENABLED not set, skip recordId=${recordId}`);
      return null;
    }

    const scheduledAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

    const followUp = await this.prisma.consultFollowUp.create({
      data: {
        recordId,
        userId,
        scheduledAt,
        status: 'pending',
        triggerType: options?.triggerType ?? null,
        messageTemplate: options?.messageTemplate ?? null,
        issueId: options?.issueId ?? null,
      },
    });

    this.logger.log(`[scheduleFollowUp] created followUp=${followUp.id} recordId=${recordId} triggerType=${options?.triggerType || 'default'} scheduledAt=${scheduledAt.toISOString()}`);

    // 尝试入队 BullMQ；Redis 不可用时仅写 DB
    if (this.followupQueue) {
      try {
        await this.followupQueue.add(
          'send-followup-reminder',
          { followUpId: followUp.id, recordId, userId },
          { delay: delayDays * 24 * 60 * 60 * 1000 },
        );
        this.logger.log(`[scheduleFollowUp] enqueued to BullMQ followUpId=${followUp.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`[scheduleFollowUp] BullMQ enqueue failed (${msg}), DB record only`);
      }
    } else {
      this.logger.warn(`[scheduleFollowUp] BullMQ queue not available, DB record only followUpId=${followUp.id}`);
    }

    return followUp;
  }

  // P2-5: 10 场景主动出击 — 根据场景类型调度
  async scheduleByScenario(
    scenario: string,
    recordId: string,
    userId: string,
    context?: { issueId?: string; keyDate?: Date; contractDate?: Date; lastActiveAt?: Date },
  ) {
    const scenarioConfig = ACTIVE_MOVE_SCENARIOS[scenario];
    if (!scenarioConfig) {
      this.logger.warn(`[scheduleByScenario] unknown scenario: ${scenario}`);
      return null;
    }

    const delayDays = scenarioConfig.computeDelay(context);
    return this.scheduleFollowUp(recordId, userId, delayDays, {
      triggerType: scenario,
      messageTemplate: scenarioConfig.messageTemplate,
      issueId: context?.issueId,
    });
  }

  /**
   * D2: 查询待完成的回访 — status='sent' 且 completedAt 为空
   */
  async getPendingFollowUps(userId: string) {
    return this.prisma.consultFollowUp.findMany({
      where: {
        userId,
        status: 'sent',
        completedAt: null,
      },
      include: {
        record: {
          select: {
            id: true,
            question: true,
            routeType: true,
            summaryLine: true,
            createdAt: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getFollowUpContext(followUpId: string, userId: string) {  // P0-2 新增 userId
    const followUp = await this.prisma.consultFollowUp.findUnique({
      where: { id: followUpId },
      include: {
        record: {
          select: {
            id: true,
            question: true,
            routeType: true,
            summaryLine: true,
            createdAt: true,
          },
        },
      },
    });

    if (!followUp) {
      throw new NotFoundException(`回访记录 ${followUpId} 不存在`);
    }

    // P0-2 所有权校验
    if (followUp.userId !== userId) {
      this.logger.warn(`[P0-2-AUDIT] getFollowUpContext forbidden: followUpId=${followUpId} caller=${userId} owner=${followUp.userId}`);
      throw new ForbiddenException('无权访问该回访记录');
    }

    return {
      followUpId: followUp.id,
      recordId: followUp.recordId,
      question: followUp.record?.question || '',
      routeType: followUp.record?.routeType || null,
      summaryLine: followUp.record?.summaryLine || null,
      recordCreatedAt: followUp.record?.createdAt || null,
      scheduledAt: followUp.scheduledAt,
      completedAt: followUp.completedAt,
      status: followUp.status,
    };
  }

  /**
   * D2: 完成回访 — 更新 ConsultFollowUp + ConsultRecord.closedLoopResult
   */
  async completeFollowUp(
    recordId: string,
    result: { userReflection: string; actualOutcome: string; accuracyCheck: string },
  ) {
    const resultJson = JSON.stringify(result);

    // 更新 ConsultFollowUp
    const followUp = await this.prisma.consultFollowUp.updateMany({
      where: { recordId, status: 'sent' },
      data: {
        status: 'completed',
        completedAt: new Date(),
        result: resultJson,
      },
    });

    // 更新 ConsultRecord.closedLoopResult
    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: { closedLoopResult: resultJson },
    });

    this.logger.log(`[completeFollowUp] recordId=${recordId} updated=${followUp.count} followUps`);

    return { recordId, updated: followUp.count };
  }

  private safeParseJson(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}
