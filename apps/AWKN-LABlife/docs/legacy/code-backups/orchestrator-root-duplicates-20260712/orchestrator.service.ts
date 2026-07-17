import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { IntentRouterService, RouteType } from './intent-router.service';
import { ZhangbanshanSchedulerService } from './zhangbanshan-scheduler.service';
import { LlmGatewayService, ParallelGatewayInput } from '../../llm-gateway/llm-gateway.service';
import { EvidencePacketBuilderService } from './evidence-packet-builder.service';
import { KnowledgeRetrieverService } from './knowledge-retriever.service';
import { GenerationComposerService } from './generation-composer.service';
import { QualityGateService } from './quality-gate.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { MemoryExtractorService } from '../memory/memory-extractor.service';
import { ReactEngineService } from './react-engine.service';
import { HighRiskDetectorService } from '../safety/high-risk-detector.service';
import { UserMemoryService } from '../memory/user-memory.service';
import { UserStateClassifierService } from '../classifier/user-state-classifier.service';
import { TriMethodFusionService } from '../../knowledge-base-data/tri-method-fusion.service';
import { KnowledgeSearchService } from '../../knowledge-base-data/knowledge-search.service';
import { buildIdentityLayer, LifeStageContext } from './prompt-layers';
// 任务 2.3: 注入 K线/潮汐服务
import { KlineTideService } from '../../kline-tide/kline-tide.service';
import { TideInferenceService } from '../../tide-inference/tide-inference.service';

/** L2 超时阈值（ms）— 超时后返回 L1 结果 + 后台继续推演 */
// 2026-06-16: 60s → 150s，完整管线（并行生成 ~54s + ReAct ~35s + 校验/合成 ~8s）需 ~97s
const L2_TIMEOUT_MS = 150_000;

/**
 * 流量切分：基于 sessionId 哈希，决定是否进入 L2 Pipeline
 *
 * 灰度策略：
 *   - PIPELINE_V2_RATIO=0.10 → 10% 流量走 L2（冷启动）
 *   - PIPELINE_V2_RATIO=0.50 → 50% 流量走 L2（扩量）
 *   - PIPELINE_V2_RATIO=1.00 → 100% 流量走 L2（全量）
 *   - 默认：1.00（全量）
 *
 * 哈希算法：FNV-1a 32-bit，取 sessionId 或 userId 的 hash，除以 2^32 归一化到 [0, 1)
 */
export function trafficSplit(sessionId?: string, userId?: string, ratio?: number): boolean {
  const effectiveRatio = ratio ?? parseFloat(process.env.PIPELINE_V2_RATIO || '1.00');
  if (effectiveRatio >= 1.0) return true;
  if (effectiveRatio <= 0) return false;

  const seed = sessionId || userId || 'default';
  // FNV-1a 32-bit hash
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // 归一化到 [0, 1)
  const normalized = ((hash >>> 0) / 0xFFFFFFFF);
  return normalized < effectiveRatio;
}

export interface OrchestratorInput {
  recordId: string;
  question: string;
  birthInfo?: { year: number; month: number; day: number; hour: number; gender: string };
  askTime?: string;
  userId?: string;
  sessionId?: string;
  /** P1-6: 用户会员等级，用于付费分层 */
  membership?: 'free' | 'basic' | 'premium';
  /** P0-2 修复: 用户显式路由选择，传递给 scheduler */
  explicitRouteType?: 'liuren' | 'qimen' | 'ziping' | 'ziwei' | 'liuyao' | 'quming' | 'meihua';
}

@Injectable()
export class XuanxueOrchestratorService {
  private readonly logger = new Logger(XuanxueOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intentRouter: IntentRouterService,
    private readonly zhangbanshanScheduler: ZhangbanshanSchedulerService,
    private readonly llmGateway: LlmGatewayService,
    private readonly evidenceBuilder: EvidencePacketBuilderService,
    private readonly knowledgeRetriever: KnowledgeRetrieverService,
    private readonly generationComposer: GenerationComposerService,
    private readonly qualityGate: QualityGateService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly memoryExtractor: MemoryExtractorService,
    private readonly reactEngine: ReactEngineService,
    private readonly highRiskDetector: HighRiskDetectorService,
    private readonly userMemoryService: UserMemoryService,
    @Optional() @InjectQueue('generation-queue') private readonly generationQueue: Queue | null,
    @Optional() private readonly classifierService?: UserStateClassifierService,
    @Optional() private readonly triMethodFusion?: TriMethodFusionService,
    @Optional() private readonly knowledgeSearch?: KnowledgeSearchService,
    // 任务 2.3: 注入 K线/潮汐服务（@Optional 避免循环依赖问题）
    @Optional() private readonly klineTideService?: KlineTideService,
    @Optional() private readonly tideInferenceService?: TideInferenceService,
  ) {}

  async enqueue(input: OrchestratorInput): Promise<{ recordId: string; generationStatus: string }> {
    await this.prisma.consultRecord.update({
      where: { id: input.recordId },
      data: { status: 'analyzing' },
    });

    await this.prisma.interactionEvent.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        recordId: input.recordId,
        eventType: 'consult_started',
        eventJson: JSON.stringify({ question: input.question }),
      },
    });

    if (!this.generationQueue) {
      this.logger.warn('[Orchestrator] generationQueue unavailable (Redis disabled), falling back to direct processing');
      // 无队列时直接同步处理（降级模式）
      this.processJob(input).catch((err) => {
        this.logger.error(`[Orchestrator] direct processJob failed: ${err.message}`);
      });
      return { recordId: input.recordId, generationStatus: 'processing_sync' };
    }

    await this.generationQueue.add('process-generation', {
      recordId: input.recordId,
      question: input.question,
      birthInfo: input.birthInfo,
      askTime: input.askTime,
      userId: input.userId,
      sessionId: input.sessionId,
    });

    return { recordId: input.recordId, generationStatus: 'processing' };
  }

  async processJob(data: OrchestratorInput): Promise<void> {
    this.logger.log(`[Orchestrator] processing record ${data.recordId}`);
    const startTime = Date.now();

    try {
      // ── Step 1: Intent Router — 意图识别 ──
      const intentRoute = this.intentRouter.route({
        question: data.question,
        hasBirthInfo: !!data.birthInfo,
      });
      this.logger.log(`[Orchestrator] intent route: ${intentRoute}`);

      // ── Step 2: High-Risk Detector — 风险检测 ──
      const highRiskResult = this.highRiskDetector.detect(data.question);
      if (highRiskResult) {
        this.logger.warn(`[Orchestrator] high-risk detected: ${highRiskResult.scenarioName}, isCrisis=${highRiskResult.isCrisis}`);
        await this.prisma.consultRecord.update({
          where: { id: data.recordId },
          data: {
            status: 'completed',
            llmResult: JSON.stringify({
              high_risk: true,
              scenario_id: highRiskResult.scenarioId,
              scenario_name: highRiskResult.scenarioName,
              is_crisis: highRiskResult.isCrisis,
              response: highRiskResult.response,
            }),
          },
        });
        return;
      }

      // ── Step 3: User Memory — 记忆加载 ──
      let memorySummary = '';
      if (data.userId) {
        try {
          memorySummary = await this.userMemoryService.getMemorySummary(data.userId);
        } catch (err) {
          this.logger.warn(`[Orchestrator] memory load failed: ${(err as Error).message}`);
        }
      }

      // ── Step 4: Classifier — 问题归类 ──
      let userState: string | undefined;
      if (this.classifierService && data.userId) {
        try {
          const classification = await this.classifierService.classify(data.userId, data.question);
          userState = classification.state;
          this.logger.log(`[Orchestrator] user classified as ${userState} (confidence: ${classification.confidence})`);
        } catch (err) {
          this.logger.warn(`[Orchestrator] classification failed: ${(err as Error).message}`);
        }
      }

      // ── Step 5: Zhangbanshan Scheduler — 角色调度 ──
      const schedulingDecision = this.zhangbanshanScheduler.schedule({
        question: data.question,
        hasBirthInfo: !!data.birthInfo,
        hasAskTime: !!data.askTime,
        sessionHistory: memorySummary ? [{ role: 'system', content: memorySummary }] : undefined,
        explicitRouteType: data.explicitRouteType,
      });

      const routeType = this.zhangbanshanScheduler.getRouteType(schedulingDecision) as RouteType;

      const record = await this.prisma.consultRecord.findUnique({
        where: { id: data.recordId },
      });

      let calcResult: Record<string, unknown> | null = null;
      if (record?.calcResult) {
        try {
          calcResult = JSON.parse(record.calcResult as string);
        } catch {
          this.logger.warn(`[Orchestrator] calcResult parse failed for ${data.recordId}`);
        }
      }

      const packetData: Record<string, unknown> = {
        routeType,
        question: data.question,
        birthInfo: data.birthInfo,
        askTime: data.askTime,
        createdAt: new Date().toISOString(),
      };

      if (calcResult) {
        packetData.calcResult = calcResult;
        const cd = (calcResult as any).calcData;
        if (cd) {
          if (cd.yearPillar) packetData.evidence_bazi = {
            yearPillar: cd.yearPillar,
            monthPillar: cd.monthPillar,
            dayPillar: cd.dayPillar,
            hourPillar: cd.hourPillar,
            dayGan: cd.dayPillar?.[0],
            wuxing: cd.wuxing,
            daYun: cd.daYun,
            shenSha: cd.shenSha,
            naYin: cd.naYin,
            kongWang: cd.kongWang,
            ziweiSummary: cd.ziweiSummary,
          };
          if (cd.tianDiPan) packetData.evidence_liuren = {
            tianDiPan: cd.tianDiPan,
            siKe: cd.siKe,
            sanChuan: cd.sanChuan,
            keTi: cd.keTi,
            shensha: cd.shensha,
          };
        }
        if ((calcResult as any).evidence_tags) {
          packetData.evidence_tags = (calcResult as any).evidence_tags;
        }
        if ((calcResult as any).risk_tags) {
          packetData.risk_tags = (calcResult as any).risk_tags;
        }
        if ((calcResult as any).action_tags) {
          packetData.action_tags = (calcResult as any).action_tags;
        }
      }

      const evidencePacketId = await this.evidenceBuilder.build({
        recordId: data.recordId,
        routeType,
        version: '2026-05-v1',
        packetData,
        warnings: routeType === 'clarify' ? ['需要更多出生信息'] : [],
      });

      let knowledgeItems: Array<{ sourceId: string; title: string; text: string }> = [];
      if (routeType !== 'clarify') {
        const evidenceTags = [`routeType:${routeType}`];
        if (calcResult) {
          const cd = (calcResult as any).calcData;
          if (cd?.dayPillar?.[0]) evidenceTags.push(`dayMaster:${cd.dayPillar[0]}`);
          if (cd?.keTi) evidenceTags.push(`keTi:${cd.keTi}`);
        }
        knowledgeItems = await this.knowledgeRetriever.retrieve(data.recordId, {
          routeType,
          question: data.question,
          evidenceTags,
          limit: 6,
        });
      }

      // Step 4: 三法融合接入主链（八字+紫微+六壬一致性检查）
      if (routeType !== 'clarify' && this.triMethodFusion && calcResult) {
        try {
          const cd = (calcResult as any).calcData;
          const baziAnalysis = cd?.evidence_bazi ? JSON.stringify(cd.evidence_bazi) : undefined;
          const ziweiAnalysis = cd?.ziweiSummary;
          const liurenAnalysis = cd?.evidence_liuren ? JSON.stringify(cd.evidence_liuren) : undefined;
          const fusionResult = await this.triMethodFusion.buildFusionPrompt({
            question: data.question,
            category: routeType,
            baziAnalysis,
            ziweiAnalysis,
            liurenAnalysis,
          });
          packetData.triMethodFusion = {
            usedEntries: fusionResult.usedEntries,
            consistencyCheck: fusionResult.consistencyCheck,
            fusionPrompt: fusionResult.fusionPrompt.slice(0, 2000),
          };
          this.logger.log(
            `[Orchestrator] 三法融合完成：主导方法=${fusionResult.consistencyCheck.dominantMethod}，八字紫微一致=${fusionResult.consistencyCheck.baziAndZiweiAgree}，引用典籍=${fusionResult.usedEntries.length}条`,
          );
        } catch (fusionError) {
          this.logger.warn(
            `[Orchestrator] 三法融合失败（非阻断）：${fusionError.message}`,
          );
          packetData.triMethodFusion = { error: fusionError.message };
        }
      }

      if (routeType === 'clarify') {
        await this.prisma.consultRecord.update({
          where: { id: data.recordId },
          data: { status: 'clarify' },
        });
        return;
      }

      // ── Step 6-9: L2 Pipeline with timeout ──
      // 用 Promise.race 实现 L2 超时降级：超时返回 L1 结果 + 后台继续推演
      const l2Promise = this.executeL2Pipeline(data, schedulingDecision, routeType, calcResult, evidencePacketId, knowledgeItems, memorySummary, userState);
      // Task 13.1: 保存 timeoutId，Promise.race 后清理，避免 handle 残留
      let l2TimeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<'TIMEOUT'>(resolve => {
        l2TimeoutId = setTimeout(() => resolve('TIMEOUT'), L2_TIMEOUT_MS);
      });

      const raceResult = await Promise.race([l2Promise, timeoutPromise]).finally(() => clearTimeout(l2TimeoutId!));

      if (raceResult === 'TIMEOUT') {
        // L2 超时：返回 L1 快速结果，后台继续推演
        this.logger.warn(`[Orchestrator] L2 timeout after ${L2_TIMEOUT_MS}ms for record ${data.recordId}, returning L1 fallback`);
        await this.returnL1Fallback(data, schedulingDecision, calcResult, memorySummary, userState);

        // 后台继续推演 L2（不阻塞）
        l2Promise.then(() => {
          this.logger.log(`[Orchestrator] L2 background completion for record ${data.recordId}`);
          // 2026-06-16: 后台 L2 完成后通知前端重新拉取结果
          try {
            const wsSessionId = data.sessionId || data.recordId;
            this.websocketGateway.sendResultUpdate(wsSessionId, {
              recordId: data.recordId,
              status: 'completed',
              sourceType: 'llm',
            });
          } catch (wsErr) {
            this.logger.warn(`[Orchestrator] WebSocket result notification failed: ${wsErr.message}`);
          }
        }).catch((err) => {
          this.logger.error(`[Orchestrator] L2 background failed for ${data.recordId}: ${err.message}`);
        });
      }

    } catch (error) {
      this.logger.error(`[Orchestrator] failed record ${data.recordId}: ${error.message}`);
      await this.prisma.consultRecord.update({
        where: { id: data.recordId },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * L2 完整管线：prompt-layers → generation → validator → render
   */
  private async executeL2Pipeline(
    data: OrchestratorInput,
    schedulingDecision: import('./zhangbanshan-scheduler.service').SchedulingDecision,
    routeType: string,
    calcResult: Record<string, unknown> | null,
    evidencePacketId: string,
    knowledgeItems: Array<{ sourceId: string; title: string; text: string }>,
    memorySummary: string,
    userState?: string,
  ): Promise<void> {
    // P1-3: quick_read 分支 — 只跑主调（不调佐调），1-2 秒出初步结论
    if (schedulingDecision.mode === 'quick_read' || (schedulingDecision.secondaryAgent && schedulingDecision.mode === 'deep_consult')) {
      // P1-3: 只有 deep_consult 模式才并行跑主+佐调；quick_read 只跑主调
      const parallelInput: ParallelGatewayInput = {
        primaryRouteType: schedulingDecision.primaryAgent as ParallelGatewayInput['primaryRouteType'],
        // quick_read 不传 secondaryRouteType
        secondaryRouteType: schedulingDecision.mode === 'deep_consult'
          ? (schedulingDecision.secondaryAgent as ParallelGatewayInput['secondaryRouteType'])
          : undefined,
        calcResult,
        inputData: {
          birthDate: data.birthInfo ? `${data.birthInfo.year}-${String(data.birthInfo.month).padStart(2, '0')}-${String(data.birthInfo.day).padStart(2, '0')}` : undefined,
          birthTime: data.birthInfo ? `${String(data.birthInfo.hour).padStart(2, '0')}:00` : undefined,
          gender: (data.birthInfo?.gender as 'male' | 'female') || 'male',
          askTime: data.askTime,
          question: data.question,
        },
        lang: 'zh',
      };

      this.logger.log(`[Orchestrator] mode=${schedulingDecision.mode} confidence=${schedulingDecision.confidence.toFixed(2)} primary=${schedulingDecision.primaryAgent}${parallelInput.secondaryRouteType ? ` secondary=${parallelInput.secondaryRouteType}` : ''}`);

      this.logger.log(`[Orchestrator] parallel generation: ${schedulingDecision.primaryAgent} + ${schedulingDecision.secondaryAgent}`);

      const parallelResult = await this.llmGateway.generateParallel(parallelInput);

      let arbitrationResult: Awaited<ReturnType<typeof this.zhangbanshanScheduler.arbitrate>> | null = null;
      if (parallelResult.secondary && parallelResult.consistency !== 'consistent') {
        arbitrationResult = this.zhangbanshanScheduler.arbitrate(
          schedulingDecision,
          parallelResult.primary,
          parallelResult.secondary,
          parallelResult.consistency,
        );
        this.logger.log(
          `[Orchestrator] arbitration: consistency=${arbitrationResult.consistency}` +
          ` trusted=${arbitrationResult.trustedAgent} reason=${arbitrationResult.trustedReason}`,
        );
      }

      // P1-1: 流式 LLM 推送（按 token 通过 WebSocket 推送到前端）
      const recordForSession = await this.prisma.consultRecord.findUnique({
        where: { id: data.recordId },
        select: { sessionId: true },
      });
      const streamSessionId = recordForSession?.sessionId || null;
      const onLLMToken = (token: string) => {
        this.websocketGateway.sendLLMToken(streamSessionId, {
          recordId: data.recordId,
          stage: 'reasoning',
          token,
          content: token,
        });
      };
      this.websocketGateway.sendLLMToken(streamSessionId, {
        recordId: data.recordId,
        stage: 'meta',
        token: '',
        done: false,
      });

      // P2-1: deep_consult 模式下，ReAct 推理循环校验 / 补充 evidence
      let reactResult: Awaited<ReturnType<typeof this.reactEngine.run>> | null = null;
      if (schedulingDecision.mode === 'deep_consult') {
        this.logger.log(`[Orchestrator] starting ReAct loop for record ${data.recordId}`);
        reactResult = await this.reactEngine.run({
          question: data.question,
          systemContext: buildIdentityLayer() + (memorySummary ? `\n\n【用户记忆】\n${memorySummary}\n如果用户之前问过类似问题，你必须主动提出来，让用户知道你记得。` : '') + '\n\n你正在补强一次命理咨询的证据链。当前已收集八字/起卦结果，请评估是否足够回答用户问题。',
          availableTools: schedulingDecision.toolNames,
          availableAgents: schedulingDecision.secondaryAgent ? [schedulingDecision.primaryAgent, schedulingDecision.secondaryAgent] : [schedulingDecision.primaryAgent],
          contextFacts: {
            parallel_primary: parallelResult.primary ? (parallelResult.primary.summary_line + ' ' + parallelResult.primary.summary_body).slice(0, 500) : '',
            parallel_secondary: parallelResult.secondary ? (parallelResult.secondary.summary_line + ' ' + parallelResult.secondary.summary_body).slice(0, 500) : '',
            calc_result: calcResult,
          },
        });
        this.logger.log(`[Orchestrator] ReAct done=${reactResult.done} iters=${reactResult.totalIters} reason=${reactResult.reason}`);
      }

      // P2-2: 检查蛐蛐代价提醒 Feature Flag
      const costWarningEnabled = process.env.COST_WARNING_ENABLED === 'true';

      // P1-B: 从 calcResult.calcData 构造 chartSnapshot（仅当 calcData 含 yearPillar 时）
      // 结构兼容 BaziFullResult（calc-engine.service.ts L424-459 已展开全部字段）
      let chartSnapshot: { male: any; female?: any } | undefined;
      if (calcResult) {
        const cd = (calcResult as any).calcData;
        if (cd && cd.yearPillar && cd.xingChongHeHai) {
          chartSnapshot = { male: cd as any };
          // 合婚场景：若 record 含女方八字，可在此扩展（P1-B 暂只支持单命主链路接入）
        }
      }

      // ── 任务 2.3: 获取 K线/潮汐状态窗口（问此事时注入，非阻断） ──
      let lifeStage: LifeStageContext | undefined;
      if (this.klineTideService && data.userId) {
        try {
          const [klineStageResult, tideStatusResult] = await Promise.all([
            this.klineTideService.getCurrentStage({
              userId: data.userId,
              questionType: data.question,
              recordId: data.recordId,
            }),
            this.tideInferenceService?.get12DimStatus({
              userId: data.userId,
              questionType: data.question,
              recordId: data.recordId,
            }),
          ]);

          if (klineStageResult || tideStatusResult) {
            lifeStage = {};
            if (klineStageResult) {
              lifeStage.klineStage = {
                stage: klineStageResult.stage,
                stageLabel: klineStageResult.stageLabel,
                reason: klineStageResult.reason,
                actionAdvice: klineStageResult.actionAdvice,
                windowTip: klineStageResult.windowTip,
                signalLabel: klineStageResult.signalLabel,
                tideScore: klineStageResult.tideScore,
                targetDate: klineStageResult.targetDate,
              };
            }
            // 只注入 LLM 推导的潮汐状态（fallback 不进 prompt）
            if (tideStatusResult && tideStatusResult.source === 'llm') {
              lifeStage.tideStatus = {
                phaseJudgment: tideStatusResult.phaseJudgment,
                shortDirective: tideStatusResult.shortDirective,
                windowTip: tideStatusResult.windowTip,
                actionAdvice: tideStatusResult.actionAdvice,
                timeStatus: tideStatusResult.timeStatus,
                positionStatus: tideStatusResult.positionStatus,
                mindStatus: tideStatusResult.mindStatus,
                quadrant: tideStatusResult.quadrant,
                targetDate: tideStatusResult.targetDate,
              };
            }
            this.logger.log(
              `[Orchestrator] lifeStage 注入：klineStage=${klineStageResult?.stage} ` +
              `tidePhase=${tideStatusResult?.phaseJudgment} tideSource=${tideStatusResult?.source}`,
            );
          }
        } catch (err) {
          this.logger.warn(`[Orchestrator] lifeStage 获取失败（非阻断，继续走原流程）: ${(err as Error).message}`);
        }
      }

      // ── Step 6: Prompt Layers — 提示词分层（在 synthesizeThreeStage 内部调用） ──
      const zhangbanshanOutput = await this.zhangbanshanScheduler.synthesizeThreeStage(
        data.question,
        schedulingDecision,
        parallelResult.primary,
        parallelResult.secondary,
        data.userId,
        onLLMToken,
        costWarningEnabled,
        chartSnapshot, // P1-B: 主链路全场景接入 evidencePackage
        lifeStage, // 任务 2.3: K线/潮汐状态窗口注入
      );

      // 任务 2.3: 把 lifeStage 附加到 zhangbanshan_output 持久化（供前端展示）
      if (lifeStage) {
        (zhangbanshanOutput as any).life_stage = lifeStage;
      }

      // P2-1: 把 ReAct 步迹附加到 zhangbanshan_output 持久化
      if (reactResult) {
        (zhangbanshanOutput as any).react_trace = {
          totalIters: reactResult.totalIters,
          done: reactResult.done,
          reason: reactResult.reason,
          finalAnswer: reactResult.finalAnswer,
          steps: reactResult.steps.map(s => ({ iter: s.iter, phase: s.phase, content: s.content.slice(0, 200), done: s.done })),
        };
      }

      this.websocketGateway.sendLLMToken(streamSessionId, {
        recordId: data.recordId,
        stage: 'meta',
        token: '',
        done: true,
      });

      zhangbanshanOutput.agent_consistency = parallelResult.consistency;
      if (arbitrationResult) {
        zhangbanshanOutput.arbitration_note = arbitrationResult.arbitrationText;
      }

      // ── Step 7: Generation Composer — 输出渲染 ──
      const renderedOutput = this.renderOutput(zhangbanshanOutput, schedulingDecision);

      // ── Step 8: Validator — 质量验证 ──
      const pipelineV2Enabled = process.env.PIPELINE_V2_ENABLED === 'true'
        && trafficSplit(data.sessionId, data.userId);
      let fiveLayerValidation: import('./quality-gate.service').FiveLayerQualityResult | null = null;

      if (pipelineV2Enabled) {
        // Pipeline V2: 5 层结构校验 + 身份感校验
        fiveLayerValidation = this.qualityGate.evaluateFiveLayers(renderedOutput);
        this.logger.log(`[Orchestrator] V2 validation: passed=${fiveLayerValidation.passed} score=${fiveLayerValidation.score} identity=${fiveLayerValidation.identityScore}`);
      }

      const validationResult = this.qualityGate.evaluateWithRetry(renderedOutput);
      this.logger.log(`[Orchestrator] validation: passed=${validationResult.passed} score=${validationResult.score} retries=${validationResult.retries}`);

      const finalContent = validationResult.filteredText;

      // 2026-06-15: P0 修复 — ReAct max_iters 兜底
      // 当 judgment 或 5 层输出为空时，从已有 LLM 输出（primary/secondary）构造
      // 避免前端因 judgment/fiveLayers 为空而判定为降级、跳过评价组件
      const fiveLayersFromLLM = (zhangbanshanOutput as any).five_layers;
      const fiveLayersEmpty = !fiveLayersFromLLM ||
        !fiveLayersFromLLM.clause?.trim() ||
        !fiveLayersFromLLM.halfMountain?.trim() ||
        !fiveLayersFromLLM.detail?.trim() ||
        !fiveLayersFromLLM.cost?.trim() ||
        !fiveLayersFromLLM.nextAction?.trim();

      if (!zhangbanshanOutput.judgment || !zhangbanshanOutput.judgment.trim() || fiveLayersEmpty) {
        const primary = parallelResult.primary;
        const secondary = parallelResult.secondary;
        const primaryText = primary ? (primary.summary_line + ' | ' + (primary.summary_body || '').slice(0, 200)) : '';
        const secondaryText = secondary ? (secondary.summary_line + ' | ' + (secondary.summary_body || '').slice(0, 200)) : '';
        const combinedText = (primaryText + ' / ' + secondaryText).slice(0, 800);

        if (!zhangbanshanOutput.judgment || !zhangbanshanOutput.judgment.trim()) {
          zhangbanshanOutput.judgment = primary?.summary_line || '基于多维命理信号的初步判断已生成。';
        }
        if (!zhangbanshanOutput.premise || !zhangbanshanOutput.premise.trim()) {
          zhangbanshanOutput.premise = primary?.evidence_fold?.slice(0, 300) || '综合八字与卦象信号的整合判断。';
        }
        if (!zhangbanshanOutput.cost || !zhangbanshanOutput.cost.trim()) {
          zhangbanshanOutput.cost = '这意味着——你需要结合自身实际情况，权衡这个判断中的建议与风险。';
        }
        zhangbanshanOutput.reasoning_trace = (zhangbanshanOutput.reasoning_trace || '') +
          `\n[兜底] 由${schedulingDecision.primaryAgent}${secondary ? '+' + schedulingDecision.secondaryAgent : ''}综合分析得出。${combinedText ? '关键信号：' + combinedText : ''}`;
        zhangbanshanOutput.llm_fallback = true; // P0-3 修复: 标记为兜底结果

        // P1-4: 构造/补全 5 层输出（计划版字段名：clause/halfMountain/detail/cost/nextAction）
        const existing = (zhangbanshanOutput as any).five_layers || {};
        (zhangbanshanOutput as any).five_layers = {
          clause: existing.clause?.trim() || primary?.summary_body?.slice(0, 500) || secondary?.summary_body?.slice(0, 500) || '基于命理信号的数术断句。',
          halfMountain: existing.halfMountain?.trim() || primary?.evidence_fold?.slice(0, 500) || '综合八字与卦象的半山落句。',
          detail: existing.detail?.trim() || primary?.summary_line || '具体落点：参考多维信号综合判断。',
          cost: existing.cost?.trim() || (primary?.actions || []).join('；') || secondary?.actions?.join('；') || '代价提醒：结合实际谨慎权衡。',
          nextAction: existing.nextAction?.trim() || primary?.summary_line || secondary?.summary_line || '下一步动作：稳中求进。',
        };

        this.logger.log(`[Orchestrator] ReAct fallback: filled ${!zhangbanshanOutput.judgment?.trim() ? 'judgment' : ''}${fiveLayersEmpty ? ' five_layers' : ''} for record ${data.recordId}`);
      }

      await this.prisma.consultRecord.update({
        where: { id: data.recordId },
        data: {
          status: validationResult.passed ? 'completed' : 'degraded', // P1-1 修复: 原为 'completed' : 'completed'（恒 completed）
          llmResult: JSON.stringify({
            primary_output: parallelResult.primary,
            secondary_output: parallelResult.secondary || null,
            zhangbanshan_output: zhangbanshanOutput,
            rendered_output: finalContent,
            // 2026-06-15 P0 修复：top-level 5 层输出（前端 result.fiveLayers 直接读取）
            fiveLayers: (zhangbanshanOutput as any).five_layers || null,
            validation: { passed: validationResult.passed, score: validationResult.score, warnings: validationResult.warnings },
            // Pipeline V2: 5 层校验结果
            five_layer_validation: fiveLayerValidation ? {
              passed: fiveLayerValidation.passed,
              score: fiveLayerValidation.score,
              identityScore: fiveLayerValidation.identityScore,
              layerStatus: fiveLayerValidation.layerStatus,
              warnings: fiveLayerValidation.warnings,
            } : null,
            arbitration: arbitrationResult ? {
              consistency: arbitrationResult.consistency,
              trusted_agent: arbitrationResult.trustedAgent,
              trusted_reason: arbitrationResult.trustedReason,
              has_conflict: arbitrationResult.hasConflict,
              agent_confidences: arbitrationResult.agentConfidences,
            } : null,
            // P1-6: 付费分层标记 — 免费用户后3层 gated
            gated_layers: this.buildGatedLayers(data.membership),
          }),
          emotionSnapshot: zhangbanshanOutput.emotion_snapshot || null,
        },
      });

      await this.prisma.consultRecord.update({
        where: { id: data.recordId },
        data: {
          analysisData: JSON.stringify({
            zhangbanshan_output: zhangbanshanOutput,
          }),
        },
      });

      this.logger.log(`[Orchestrator] parallel completed record ${data.recordId}, consistency: ${parallelResult.consistency}`);

      // P1-2: 咨询完成后，提取事实并写入用户记忆（不阻塞主流程）
      if (data.userId) {
        this.memoryExtractor.extractAndPersist(data.recordId, data.userId).catch((err) => {
          this.logger.warn(`[Orchestrator] memory extract failed for ${data.recordId}: ${err.message}`);
        });
      }
      return;
    }

    // ── Fallback: Generation Composer 分支（无 parallel gateway 的简单路由） ──
    // Step 4: 从 KnowledgeSearchService 检索判例，构建 PrecedentUnit 注入 generationComposer
    let precedentUnit: import('./prompt-layers').PrecedentUnit | undefined;
    if (this.knowledgeSearch && routeType !== 'clarify') {
      try {
        const searchResult = await this.knowledgeSearch.search({
          query: data.question,
          category: routeType,
          limit: 1,
        });
        if (searchResult.entries.length > 0) {
          const entry = searchResult.entries[0] as any;
          const tt = entry.translationTemplate;
          if (tt && tt.core && tt.manifestations && tt.decisionHint && tt.redLine) {
            precedentUnit = {
              originalText: entry.content || '',
              core: tt.core,
              manifestations: tt.manifestations,
              decisionHint: tt.decisionHint,
              redLine: tt.redLine,
              source: entry.title || '典籍',
            };
          }
        }
      } catch (searchError) {
        this.logger.warn(`[Orchestrator] 判例检索失败（非阻断）：${searchError.message}`);
      }
    }

    const result = await this.generationComposer.generate({
      recordId: data.recordId,
      moduleId: 'analysis',
      routeType,
      question: data.question,
      evidencePacket: { id: evidencePacketId },
      knowledgeItems,
      generateFollowUp: true,
      // P3-1: 记忆回流到 Prompt
      memorySummary,
      // Step 4: 判例单元注入
      precedentUnit,
    });

    // ── Step 8: Validator ──
    const validationResult = this.qualityGate.evaluate(result.content);
    const finalContent = validationResult.filteredText;

    // C-L2-4: Fallback 分支也输出 zhangbanshan_output 结构，统一前端消费格式
    const fallbackZhangbanshanOutput = {
      judgment: finalContent.split('\n')[0]?.replace(/^[【\[][^】\]]*[】\]]\s*/, '').slice(0, 80) || '基于命理信号的初步判断已生成。',
      premise: '判断基于当前已知信息，前提条件可能随情况变化而调整。',
      cost: '这意味着——你需要自己权衡这个决定的后果。',
      reasoning_trace: `由${routeType}路由分析得出（Fallback 分支）。`,
      primary_agent: routeType,
      schedule_reason: schedulingDecision.scheduleReason,
      mode: schedulingDecision.mode,
      confidence: schedulingDecision.confidence,
      is_fallback_composer: true,
    };

    // C-L2-4: 从 GenerationComposer 的 5 层校验结果中提取 five_layers（P1-4: 计划版字段名 + 标记）
    const fallbackFiveLayers = result.baselineScore ? {
      clause: finalContent.match(/【数术断句】|【L1】|【排盘】|【断句】/)?.input || '',
      halfMountain: finalContent.match(/【半山落句】|【L2】|【核心判断】|【落句】/)?.input || '',
      detail: finalContent.match(/【具体落点】|【L3】|【落点】|【细节】/)?.input || '',
      cost: finalContent.match(/【代价提醒】|【L4】|【代价】/)?.input || '',
      nextAction: finalContent.match(/【下一步动作】|【L5】|【动作】|【下一步】/)?.input || '',
    } : null;

    await this.prisma.consultRecord.update({
      where: { id: data.recordId },
      data: {
        status: result.retryable ? 'failed' : 'completed',
        llmResult: JSON.stringify({
          zhangbanshan_output: fallbackZhangbanshanOutput,
          rendered_output: finalContent,
          fiveLayers: fallbackFiveLayers,
          content: finalContent,
          validation: { passed: validationResult.passed, score: validationResult.score, warnings: validationResult.warnings },
          // P1-6: 付费分层标记
          gated_layers: this.buildGatedLayers(data.membership),
        }),
      },
    });

    if (result.followUpQuestions.length > 0) {
      let existingAnalysis: Record<string, unknown> = {};
      try {
        const recordAfter = await this.prisma.consultRecord.findUnique({
          where: { id: data.recordId },
          select: { analysisData: true },
        });
        if (recordAfter?.analysisData) {
          existingAnalysis = JSON.parse(recordAfter.analysisData);
        }
      } catch {
        // ignore parse errors
      }

      await this.prisma.consultRecord.update({
        where: { id: data.recordId },
        data: {
          analysisData: JSON.stringify({
            ...existingAnalysis,
            followUpQuestions: result.followUpQuestions,
          }),
        },
      });
    }

    this.logger.log(`[Orchestrator] completed record ${data.recordId}, quality: ${result.qualityScore}, validation: ${validationResult.passed}`);
  }

  /**
   * L1 快速降级结果：基于 calcResult + 调度信息生成简单结论
   * 超时后立即返回，不调 LLM
   */
  private async returnL1Fallback(
    data: OrchestratorInput,
    schedulingDecision: import('./zhangbanshan-scheduler.service').SchedulingDecision,
    calcResult: Record<string, unknown> | null,
    memorySummary: string,
    userState?: string,
  ): Promise<void> {
    const agentName = '张半山';

    let l1Judgment = '初步判断：基于已有信息，这个问题需要更深入的分析。';
    let l1Premise = '判断基于当前已知信息，更详细的结论正在后台推演中。';
    let l1Cost = '这意味着——你需要等待更完整的分析结果再做决定。';

    if (calcResult) {
      const cd = (calcResult as any).calcData;
      if (cd?.dayPillar) {
        l1Judgment = `初步判断：你的日主为${cd.dayPillar[0]}，当前格局需要更细致的分析。`;
      }
      if (cd?.wuxing) {
        l1Premise = `五行分布：${JSON.stringify(cd.wuxing).slice(0, 60)}。更详细的结论正在后台推演中。`;
      }
    }

    const l1Output = {
      judgment: l1Judgment,
      premise: l1Premise,
      cost: l1Cost,
      reasoning_trace: `L1 快速降级：L2 推演超时，返回初步结论。完整分析将在后台继续。`,
      primary_agent: schedulingDecision.primaryAgent,
      secondary_agent: schedulingDecision.secondaryAgent,
      schedule_reason: schedulingDecision.scheduleReason,
      mode: schedulingDecision.mode,
      confidence: schedulingDecision.confidence,
      is_l1_fallback: true,
      l2_status: 'processing_background',
    };

    await this.prisma.consultRecord.update({
      where: { id: data.recordId },
      data: {
        status: 'completed',
        llmResult: JSON.stringify({
          zhangbanshan_output: l1Output,
          rendered_output: `【我的判断】${l1Judgment}\n【前提】${l1Premise}\n【代价】${l1Cost}\n\n⚠️ 完整分析正在后台推演中，稍后可刷新查看更详细的结论。`,
          is_l1_fallback: true,
        }),
      },
    });

    this.logger.log(`[Orchestrator] L1 fallback saved for record ${data.recordId}`);
  }

  /**
   * Step 9: Render — 将 ZhangbanshanOutput 渲染为最终用户可见文本
   */
  private renderOutput(
    output: import('./zhangbanshan-scheduler.service').ZhangbanshanOutput,
    decision: import('./zhangbanshan-scheduler.service').SchedulingDecision,
  ): string {
    const parts: string[] = [];

    // C-L2-4: 5 层输出渲染（如果存在）— P1-4: 计划版字段名 + 标签
    const fiveLayers = (output as any).five_layers;
    if (fiveLayers) {
      const layerLabels: Record<string, string> = {
        clause: '数术断句',
        halfMountain: '半山落句',
        detail: '具体落点',
        cost: '代价提醒',
        nextAction: '下一步动作',
      };
      for (const [key, label] of Object.entries(layerLabels)) {
        const content = (fiveLayers as any)[key];
        if (content && content.trim() && content.trim() !== '此层推演暂缺，请追问获取更深入分析') {
          parts.push(`【${label}】${content.trim()}`);
        }
      }
      parts.push(''); // 分隔
    }

    if (output.judgment) {
      parts.push(`【我的判断】${output.judgment}`);
    }
    if (output.premise) {
      parts.push(`【前提】${output.premise}`);
    }
    if (output.cost) {
      parts.push(`【代价】${output.cost}`);
    }
    if (output.reasoning_trace) {
      parts.push(`【推理轨迹】${output.reasoning_trace}`);
    }

    // P2-2: 代价提醒
    if (output.costWarnings && output.costWarnings.length > 0) {
      for (const w of output.costWarnings) {
        parts.push(`⚠️ 代价提醒：${w.text}`);
      }
    }

    // P2-3: 代价确认提示
    if (output.costConfirmationRequired) {
      parts.push('\n我说清楚了吗？你用自己的话说一下，你这次选择真正要承担的是什么？');
    }

    // P3-2: 记忆锚点
    if (output.memoryAnchor) {
      parts.push(`\n📌 ${output.memoryAnchor}`);
    }

    // 免责声明
    parts.push('\n命理分析仅供参考，不构成专业决策建议。重大决策请咨询专业人士。');

    return parts.join('\n');
  }

  /**
   * P1-6: 构建付费分层标记 — P1-4: 计划版字段名
   * 免费用户：L1 完整 + L2 前2层（数术断句+半山落句），后3层标记为 gated
   * 付费用户：完整5层，无 gated
   */
  private buildGatedLayers(membership?: string): string[] {
    if (membership && membership !== 'free') {
      return [];
    }
    // 免费用户：具体落点、代价提醒、下一步动作 gated
    return ['detail', 'cost', 'nextAction'];
  }
}
