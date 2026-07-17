import { Injectable, BadRequestException, NotFoundException, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RouterService } from './router.service';
import { CalcEngineService } from '../calc-engine/calc-engine.service';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { BaziCalculatorWrapper, BaziFullResult } from '../calc-engine/bazi-calculator-wrapper';
import { GAN, ZHI, WUXING_TIANGAN, WUXING_DIZHI } from '../calc-engine/bazi-engine/core/bazi-data.service';
import { QumingAgentService, QumingInput } from '../quming-agent/quming-agent.service';
import { PersonProfileService } from './person-profile.service';
import { RouteDto, SubmitInfoDto, ConsultAnalyzeDto, FortuneQueryDto, CelebritySimilarityDto } from './dto';
import { KlineGenerator, FortuneService, CelebrityService, MovingAverageService, ShortCycleGenerator } from './generators';
import type { CalcResult, LlmResult, SessionContext, BaziCalcData, DaYunItem, ConsultResponse } from './types';
import { TranslationService } from '../calc-engine/translation.service';
import { MembershipService } from '../membership/membership.service';
import { XuanxueOrchestratorService } from './orchestrator/orchestrator.service';
import { checkLlmQuality, MODULE_CONFIGS } from './llm-quality-guard';
import { HighRiskDetectorService } from './safety/high-risk-detector.service';
import { FollowupService } from './followup/followup.service';
import { TideInferenceService } from '../tide-inference/tide-inference.service';
import { buildIdentityLayer } from './orchestrator/prompt-layers';
import { consultationService } from '../common/consultation.service';

@Injectable()
export class ConsultService {
  private readonly logger = new Logger(ConsultService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(RouterService)
    private readonly routerService: RouterService,
    @Inject(CalcEngineService)
    private readonly calcEngine: CalcEngineService,
    @Inject(LlmGatewayService)
    private readonly llmGateway: LlmGatewayService,
    @Inject(LlmProvidersService)
    private readonly llmProviders: LlmProvidersService,
    @Inject(WebsocketGateway)
    private readonly websocketGateway: WebsocketGateway,
    @Inject(BaziCalculatorWrapper)
    private readonly baziCalculator: BaziCalculatorWrapper,
    @Inject(QumingAgentService)
    private readonly qumingAgent: QumingAgentService,
    @Inject(KlineGenerator)
    private readonly klineGenerator: KlineGenerator,
    @Inject(FortuneService)
    private readonly fortuneService: FortuneService,
    @Inject(CelebrityService)
    private readonly celebrityService: CelebrityService,
    @Inject(MovingAverageService)
    private readonly movingAverageService: MovingAverageService,
    @Inject(ShortCycleGenerator)
    private readonly shortCycleGenerator: ShortCycleGenerator,
    @Inject(TranslationService)
    private readonly translationService: TranslationService,
    @Inject(PersonProfileService)
    private readonly personProfileService: PersonProfileService,
    @Inject(MembershipService)
    private readonly membershipService: MembershipService,
    @Inject(XuanxueOrchestratorService)
    private readonly orchestrator: XuanxueOrchestratorService,
    @Inject(HighRiskDetectorService)
    private readonly highRiskDetector: HighRiskDetectorService,
    @Inject(FollowupService)
    private readonly followupService: FollowupService,
    @Optional() private readonly tideInferenceService?: TideInferenceService,
  ) {}

  /**
   * 路由接口 - POST /api/v1/consult/route
   */
  async route(dto: RouteDto) {
    if (!dto.question || dto.question.trim().length < 2) {
      throw new BadRequestException('问题内容不能少于2个字符');
    }

    const question = dto.question.trim();
    const decision = await this.routerService.route(question);

    const record = await this.prisma.consultRecord.create({
      data: {
        consultationId: consultationService.generateConsultationId(),
        question,
        routeType: decision.routeType,
        status: 'processing',
        inputData: JSON.stringify({
          source: dto.source,
          timezone: dto.timezone,
          device: dto.device,
          ...decision,
        }),
      },
    });

    // 返回 snake_case 匹配前端 RouteResponse
    return {
      record_id: record.id,
      sessionId: record.id,
      route_type: decision.routeType,
      need_clarify: decision.needClarify || false,
      required_fields: decision.requiredFields || [],
      next_step: decision.nextStep || 'info',
      clarify_question: decision.clarifyingQuestion || null,
    };
  }

  /**
   * 单次咨询分析接口 - POST /api/v1/consult/analyze
   * 一次调用完成：算法计算 + 纯算法初步结论
   * 对齐前端 ResultPage 期望的数据结构
   */
  async analyze(dto: ConsultAnalyzeDto, lang: string = 'zh-CN') {
    this.logger.log('[ConsultService] analyze 接收到的 DTO: ' + JSON.stringify(dto));

    const question = dto.question?.trim();
    if (!question || question.length < 2) {
      throw new BadRequestException('问题内容不能少于2个字符');
    }

    // P1.5-1: 高风险场景检测（在路由之前，命中时直接返回脚本化回复，不走 LLM）
    const highRiskResult = this.highRiskDetector.detect(question);
    if (highRiskResult) {
      this.logger.warn(`[ConsultService] 命中高风险场景: ${highRiskResult.scenarioId}, isCrisis: ${highRiskResult.isCrisis}`);

      // 创建高风险记录
      const highRiskRecord = await this.prisma.consultRecord.create({
        data: {
          consultationId: consultationService.generateConsultationId(),
          question,
          routeType: 'safety',
          status: 'completed',
          isHighRisk: true,
          summaryLine: highRiskResult.response,
          userId: dto.userId || null,
          anonymousId: !dto.userId ? (dto.sessionId || dto.source || null) : null,
          inputData: JSON.stringify({
            source: dto.source,
            highRiskScenario: highRiskResult.scenarioId,
            isCrisis: highRiskResult.isCrisis,
          }),
        },
      });

      return {
        route_type: 'safety',
        sourceType: 'scripted',
        provider: 'safety',
        model: 'high-risk-detector',
        schemaValid: true,
        summary_line: highRiskResult.response,
        summary_body: highRiskResult.response,
        risks: [],
        actions: [],
        time_window: '',
        evidence_fold: '',
        paywall_modules: [],
        record_id: highRiskRecord.id,
        isHighRisk: true,
        isCrisis: highRiskResult.isCrisis,
        highRiskScenario: highRiskResult.scenarioId,
      };
    }

    // Step 1: 确定路由类型
    const sourceEntry = dto.sourceEntry || dto.source_entry;
    const hasBirthInfo = !!(dto.birthDate || dto.birth_date);
    let routeType: 'liuren' | 'ziping' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'meihua' | 'zhangsheng' | 'clarify' | undefined =
      (dto.routeType || dto.route_type) as any;
    // question 前台默认偏向问事，但如果已经带了生辰资料，就允许自然进入命盘类路由
    if (sourceEntry === 'question' && !routeType && !hasBirthInfo) {
      routeType = 'liuren';
    } else if (sourceEntry === 'question' && routeType === 'ziping' && !hasBirthInfo) {
      routeType = 'liuren';
    }
    if (!routeType) {
      // 通过路由服务判断
      const decision = await this.routerService.route(question);
      routeType = decision.routeType;
    }

    // 如果是 clarify 类型，返回澄清问题
    if (routeType === 'clarify') {
      const clarifyingQuestion = await this.routerService.generateClarifyQuestion(question);
      return {
        route_type: 'clarify',
        clarifyingQuestion,
        record_id: '',
      };
    }

    // Step 1.5: 查询用户历史咨询数量（P1-3 期望管理用）
    const userIdentifier = dto.userId || dto.sessionId || dto.source || null;
    let isFirstConsultation = false;
    if (userIdentifier) {
      const historyCount = await this.prisma.consultRecord.count({
        where: dto.userId
          ? { userId: dto.userId }
          : { anonymousId: userIdentifier },
      });
      isFirstConsultation = historyCount === 0;
    }

    // Step 2: 创建咨询记录（立即绑定归属）
    const record = await this.prisma.consultRecord.create({
      data: {
        consultationId: consultationService.generateConsultationId(),
        question,
        routeType,
        status: 'processing',
        sourceEntry: sourceEntry || this.inferSourceEntry(routeType, question),
        namingType: dto.namingType || dto.naming_type || undefined,
        namingPreferences: dto.namingPreferences || dto.naming_preferences || undefined,
        questionIntent: dto.questionIntent || dto.question_intent || undefined,
        unlockStatus: dto.unlockStatus || dto.unlock_status || 'preview',
        // v1.5: 立即绑定归属
        userId: dto.userId || null,
        anonymousId: !dto.userId ? (dto.sessionId || dto.source || null) : null,
        structuredInput: JSON.stringify({
          birthDate: dto.birthDate,
          birthTime: dto.birthTime,
          birthPlace: dto.birthPlace,
          gender: dto.gender,
          askTime: dto.askTime,
          askLocation: dto.askLocation,
        }),
        inputData: JSON.stringify({
          source: dto.source,
          birthDate: dto.birthDate,
          birthTime: dto.birthTime,
          birthPlace: dto.birthPlace,
          gender: dto.gender,
          askTime: dto.askTime,
          askLocation: dto.askLocation,
        }),
      },
    });

    try {
      // Step 2.5: 校验必要参数
      if (['ziping', 'ziwei', 'zhangsheng'].includes(routeType as string) && !dto.birthDate && !dto.birth_date) {
        throw new BadRequestException(`${routeType} 路由需要出生日期，请补充出生日期后重试`);
      }

      // Step 3: 执行算法计算（纯算法，不调 LLM）
      const calcStartTime = Date.now();
      this.logger.log(`[ConsultService]开始算法计算，routeType: ${routeType}`);

      const calcResult = await this.calcEngine.calculate({
        routeType: routeType as any,
        question: question,
        askTime: dto.askTime,
        askLocation: dto.askLocation,
        birthDate: dto.birthDate,
        birthTime: dto.birthTime,
        birthPlace: dto.birthPlace,
        gender: dto.gender,
        // 取名专用参数
      });
      (calcResult as any).inputData = {
        birthDate: dto.birthDate,
        birthTime: dto.birthTime,
        birthPlace: dto.birthPlace,
        gender: dto.gender,
      };

      const calcDuration = Date.now() - calcStartTime;
      this.logger.log(`[ConsultService]算法计算完成，耗时: ${calcDuration}ms`);

      // Step 4: quming 路由由 QumingAgent 直接接管，返回完整结果
      let llmResult: LlmResult;
      if (routeType === 'quming') {
        try {
          let surname = dto.surname || undefined;
          if (surname && surname.length > 2) {
            surname = surname.charAt(0);
          }
          const qr = await this.qumingAgent.analyze({
            birthDate: dto.birthDate,
            birthTime: dto.birthTime,
            gender: dto.gender as 'male' | 'female' | undefined,
            parentWishWords: undefined,
            avoidChars: undefined,
            surname,
            // P1-11: 多轮对话参数透传
            namingType: (dto.namingType || dto.naming_type) as 'baby' | 'adult' | 'brand' | undefined,
            // P0-2: stylePreference 已由 DTO @Transform 归一化为 string[]
            stylePreference: dto.stylePreference,
            improveFocus: dto.improve_focus || dto.improveFocus || undefined,
            industry: dto.industry || undefined,
            targetAudience: dto.target_audience || dto.targetAudience || undefined,
            originalName: dto.original_name || dto.originalName || undefined,
            customDescription: dto.custom_description || dto.customDescription || undefined,
          });
          llmResult = {
            route_type: 'quming',
            sourceType: qr.llmFallback ? 'algorithm-llm-fallback' : 'llm',
            provider: qr.llmFallback ? 'algorithm' : 'quming-agent',
            model: 'quming-agent',
            schemaValid: true,
            summary_line: qr.summaryLine || '',
            summary_body: qr.summaryBody || '',
            risks: qr.risks || [],
            actions: qr.actions || [],
            time_window: '取名建议在出生后30天内完成登记',
            evidence_fold: `四柱：${qr.bazi.yearPillar}/${qr.bazi.monthPillar}/${qr.bazi.dayPillar}/${qr.bazi.hourPillar}`,
            evidence_tags: [
              `${qr.bazi.dayGan}日主`,
              qr.bazi.naYin,
              ...(qr.wuxingAnalysis?.missing?.length > 0 ? [`缺${qr.wuxingAnalysis.missing.join('、')}`] : []),
            ].filter(Boolean),
            bazi: qr.bazi,
            wuxing_analysis: qr.wuxingAnalysis,
            xi_yong_shen: qr.xiYongShen,
            name_suggestions: (qr.nameSuggestions || []).map((item, index) => ({
              ...item,
              candidateId: (item as any).candidateId || this.createNamingCandidateId(item.names?.[0] || '', index),
            })),
            wuge: null,
            paywall_modules: ['morning', 'breakthrough', 'kline'],
          };
          this.logger.warn('[ConsultService] 取名 Agent 完成，候选数=' + (qr.nameSuggestions?.length || 0));
        } catch (err) {
          this.logger.warn('[ConsultService] QumingAgent 调用失败: ' + (err as Error).message);
          llmResult = await this.buildAlgorithmInitialResult(routeType, calcResult as any, question, {
            birthDate: dto.birthDate,
            birthTime: dto.birthTime,
            gender: dto.gender,
          });
        }
      } else {
        llmResult = await this.buildAlgorithmInitialResult(routeType, calcResult as any, question, {
          birthDate: dto.birthDate,
          birthTime: dto.birthTime,
          gender: dto.gender,
        });
      }

      // Step 5: 更新数据库记录
      await this.prisma.consultRecord.update({
        where: { id: record.id },
        data: {
          status: 'completed',
          calcResult: JSON.stringify(calcResult),
          llmResult: JSON.stringify(llmResult),
          summaryLine: llmResult.summary_line,
          calcDuration,
          llmDuration: 0,
        },
      });

      // Step 5.0: 取名结果落库（NamingResult 独立存储，便于历史查询）
      if (routeType === 'quming' && dto.userId && (llmResult.name_suggestions as any[])?.length > 0) {
        try {
          await this.prisma.namingResult.create({
            data: {
              userId: dto.userId,
              consultRecordId: record.id,
              names: JSON.stringify(llmResult.name_suggestions),
              wuge: llmResult.wuge ? JSON.stringify(llmResult.wuge) : null,
              sancai: llmResult.wuxing_analysis ? JSON.stringify(llmResult.wuxing_analysis) : null,
            },
          });
          this.logger.log(`[ConsultService] NamingResult saved for record ${record.id}`);
        } catch (err) {
          this.logger.warn(`[ConsultService] NamingResult save failed: ${(err as Error).message}`);
        }
      }

      // Step 5.1: 将咨询推入中台异步队列（LLM深度生成）
      let enqueueResult: { recordId: string; generationStatus: string } | null = null;
      try {
        const birthInfo = dto.birthDate ? {
          year: new Date(dto.birthDate).getFullYear(),
          month: new Date(dto.birthDate).getMonth() + 1,
          day: new Date(dto.birthDate).getDate(),
          hour: dto.birthTime ? parseInt(dto.birthTime.split(':')[0], 10) : 12,
          gender: dto.gender || 'male',
        } : undefined;

        enqueueResult = await this.orchestrator.enqueue({
          recordId: record.id,
          question,
          birthInfo,
          askTime: dto.askTime,
          userId: dto.userId,
          sessionId: dto.sessionId,
          explicitRouteType: (dto.routeType || dto.route_type) as 'liuren' | 'qimen' | 'ziping' | 'ziwei' | 'liuyao' | 'quming' | 'meihua' | undefined,
        });
        this.logger.log(`[ConsultService] 已推入中台队列: ${record.id}, status=${enqueueResult.generationStatus}`);
      } catch (err) {
        this.logger.warn('[ConsultService] 中台入队失败（不影响同步结果）: ' + (err as Error).message);
      }

      // Step 5.5: 关联 PersonProfile
      try {
        const cd: any = calcResult?.calcData || calcResult;
        const profileId = await this.personProfileService.getOrCreateProfile({
          userId: dto.userId || undefined,
          sessionId: dto.sessionId || undefined,
          birthDate: dto.birthDate,
          birthTime: dto.birthTime,
          gender: dto.gender,
          birthPlace: dto.birthPlace,
          name: dto.surname || undefined,
          yearPillar: cd?.yearPillar,
          monthPillar: cd?.monthPillar,
          dayPillar: cd?.dayPillar,
          hourPillar: cd?.hourPillar,
          naYin: cd?.naYin?.day,
          kongWang: Array.isArray(cd?.kongWang) ? cd.kongWang.join(',') : undefined,
        });
        await this.personProfileService.linkRecordToProfile(profileId, record.id);
      } catch (err) {
        this.logger.warn('[ConsultService] PersonProfile 关联失败: ' + (err as Error).message);
      }

      // Step 6: 构建对齐前端 ResultPage 的返回结构
      const paywallModules = llmResult.paywall_modules || ['morning', 'breakthrough', 'kline'];
      const response: LlmResult = {
        route_type: routeType,
        summary_line: llmResult.summary_line || this.buildDefaultSummaryLine(calcResult as any, routeType),
        summary_body: llmResult.summary_body || '',
        risks: this.normalizeRisks(llmResult.risks),
        actions: this.normalizeActions(llmResult.actions),
        time_window: llmResult.time_window || '',
        evidence_fold: llmResult.evidence_fold || '',
        paywall_modules: paywallModules,
        record_id: record.id,
        calc_result: this.buildCalcResultForFrontend(calcResult as any, routeType),
        sourceType: 'algorithm',
      };

      // P1-6: 付费升级感 — 免费结果明确提示可解锁更深入分析
      if (paywallModules.length > 0) {
        (response as any).upgradeHint = {
          available: true,
          modules: paywallModules,
          message: '以上为初步判断，更深入的推演和行动建议可解锁查看',
        };
      }

      Object.assign(response, this.mergeOptionalFields(llmResult));

      // P0-6 + U-P0-1 修复: 张半山同步化 — 只展示真实 judgment，移除模板话术
      // 原问题：ZhangbanshanOutput 三段式（核心卖点）被埋在异步队列，前端首屏看不到
      // P0-6 修复：用 llmResult 的 summary_line 构造 quick_read 版
      // U-P0-1 修复：移除 premise/cost 固定模板（用户感知"造假"），只展示真实 judgment
      //              premise/cost 留空，前端展示"深度推演进行中"提示
      //              异步队列完成后，WebSocket 推送真实 deep_consult 版覆盖
      if (!(response as any).zhangbanshan_output) {
        const summaryLine = response.summary_line || '';

        // U-P0-1: 只在有真实 summary_line 时构造 quick_read，避免模板话术
        if (summaryLine) {
          const agentNameMap: Record<string, string> = {
            liuren: '六壬', qimen: '奇门', ziping: '八字/子平',
            ziwei: '紫微', liuyao: '六爻', quming: '取名', zhangsheng: '张生',
          };
          const agentName = agentNameMap[routeType as string] || routeType as string;
          const judgment = summaryLine.length > 80 ? summaryLine.slice(0, 80) : summaryLine;
          (response as any).zhangbanshan_output = {
            judgment,
            premise: '',  // U-P0-1: 留空，前端展示"深度推演进行中"提示
            cost: '',     // U-P0-1: 留空，前端展示"深度推演进行中"提示
            reasoning_trace: `由${agentName}分析得出。深度推演进行中，完整三段式稍后呈现。`,
            primary_agent: routeType,
            schedule_reason: '同步 quick_read 模式，异步队列正在生成深度推演',
            llm_fallback: true,
            mode: 'quick_read',
          };
        }
        // summary_line 为空时不构造 zhangbanshan_output，等异步队列覆盖
      }

      // P1-3: 首次咨询标记
      if (isFirstConsultation) {
        (response as any).isFirstConsultation = true;
      }

      // 2026-06-17: 告知前端后台 LLM 处理状态，配合 WebSocket result 事件刷新
      if (enqueueResult?.generationStatus) {
        (response as any).generationStatus = enqueueResult.generationStatus;
      }

      // P3-1 回访系统：分析完成后调度回访（Feature Flag 控制，失败不影响主流程）
      if (dto.userId && process.env.CALLBACK_ENABLED === 'true') {
        try {
          const followUpResult = await this.followupService.scheduleFollowUp(record.id, dto.userId);
          this.logger.log(`[ConsultService] 回访调度完成: recordId=${record.id}, followUpId=${followUpResult?.id ?? 'skipped'}`);
        } catch (err) {
          this.logger.warn(`[ConsultService] 回访调度失败（不影响主流程）: ${(err as Error).message}`);
        }
      }

      // Step 7: 如果 lang=en，翻译算法术语字段
      if (lang && lang !== 'zh-CN' && lang !== 'zh') {
        const translatedResponse = this.translationService.translateCalcResult(response, lang);
        this.logger.log('[ConsultService] 响应已翻译为: ' + lang);
        return translatedResponse;
      }

      this.logger.log('[ConsultService] analyze 完成，返回结果');
      return response;

    } catch (error) {
      this.logger.error('[ConsultService]analyze 失败:', error);
      // 更新记录状态
      await this.prisma.consultRecord.update({
        where: { id: record.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  private async buildAlgorithmInitialResult(routeType: string, calcResult: CalcResult, question?: string, context?: SessionContext): Promise<LlmResult> {
    if (routeType === 'ziping' && calcResult?.calcData?.yearPillar) {
      const bazi = calcResult.calcData;
      const wuxing = bazi.wuxing || {};
      const currentAge = this.resolveCurrentAge(context?.birthDate);
      const currentDaYun = this.findCurrentOrNextDaYun(bazi.daYun || [], currentAge);
      const dayGan = bazi.dayPillar?.[0] || '';
      const strength = this.estimateBaziStrength(bazi);
      const yongJi = this.estimateYongJi(dayGan, strength.isStrong);
      const wuxingText = this.formatWuxingCounts(wuxing);
      const daYunList = Array.isArray(bazi.daYun) ? bazi.daYun : [];
      const currentDaYunIndex = currentDaYun ? daYunList.findIndex((d: DaYunItem) => d === currentDaYun || d.full === currentDaYun.full) : -1;
      const displayDaYunList = currentDaYunIndex >= 0 ? daYunList.slice(currentDaYunIndex, currentDaYunIndex + 4) : daYunList.slice(0, 4);
      const daYunText = displayDaYunList.map((d: DaYunItem) => `${d.full}(${d.startAge}-${d.endAge}岁)`).join('，') || '';
      const verdict = this.buildBaziVerdict(dayGan, strength.label, yongJi, currentDaYun);
      const ziwei = bazi.ziweiSummary;
      const ziweiEvidence = ziwei ? this.formatZiweiEvidence(ziwei) : [];
      const evidenceTags = [
        `${bazi.monthPillar || ''}月令`,
        `${dayGan || ''}日主`,
        currentDaYun?.full ? `大运${currentDaYun.full}` : '',
        ...(ziweiEvidence.slice(0, 2)),
      ].filter(Boolean);

      return {
        route_type: routeType,
        sourceType: 'algorithm',
        provider: 'algorithm',
        model: 'calc-engine',
        schemaValid: true,
        summary_line: `四柱${bazi.yearPillar}/${bazi.monthPillar}/${bazi.dayPillar}/${bazi.hourPillar}，日主${dayGan || '-'}${strength.label}，用神参考${yongJi.yong.join('、')}。`,
        summary_body: [
          '这是纯算法初判，未调用 LLM。',
          `四柱：${bazi.yearPillar}年、${bazi.monthPillar}月、${bazi.dayPillar}日、${bazi.hourPillar}时。`,
          `五行分布：${wuxingText}。`,
          `命理总评：日主${dayGan || '-'}，${strength.reason}。`,
          `喜忌用神：用神参考${yongJi.yong.join('、')}；忌神参考${yongJi.ji.join('、')}。`,
          currentDaYun ? `${typeof currentAge === 'number' ? `当前年龄${currentAge}岁，` : ''}当前参考大运：${currentDaYun.full}（${currentDaYun.startAge}-${currentDaYun.endAge}岁）。` : '',
          ...(ziwei ? [
            `紫微：命宫${ziwei.mingGong?.ganZhi || ''}，主星${ziwei.mingGong?.majorStars?.join('、') || '无主星'}，${ziwei.fiveElementsClass || ''}局。`,
            ziwei.sihua ? `四化：禄在${ziwei.sihua.lu?.map((s: {star: string}) => s.star).join('、') || '无'}，权在${ziwei.sihua.quan?.map((s: {star: string}) => s.star).join('、') || '无'}，科在${ziwei.sihua.ke?.map((s: {star: string}) => s.star).join('、') || '无'}，忌在${ziwei.sihua.ji?.map((s: {star: string}) => s.star).join('、') || '无'}。` : '',
          ] : []),
          `命理判词：${verdict}`,
          daYunText ? `大运序列：${daYunText}。` : '',
          '如需案例级推演，可展开深入推演、人生K线、醒神早贴或破局锦囊。',
        ].filter(Boolean).join('\n'),
        risks: [
          '初步结论只基于排盘结构与五行计数，不替代深入推演。',
          '出生时间不确定、节气交界或问题信息不足时，参考强度会下降。',
        ],
        actions: [
          `命理判词：${verdict}`,
          question ? `围绕「${question}」先确认决策目标、时间窗口和不可承受风险。` : '先确认决策目标、时间窗口和不可承受风险。',
          '需要行动方案时展开深入推演，由 LLM 基于算法证据包生成。',
        ],
        time_window: currentDaYun ? `${currentDaYun.startAge}-${currentDaYun.endAge}岁大运区间` : '需结合大运与流年继续展开',
        evidence_fold: [
          `四柱：${bazi.yearPillar}/${bazi.monthPillar}/${bazi.dayPillar}/${bazi.hourPillar}`,
          `十神：年${bazi.yearShishen || '-'}、月${bazi.monthShishen || '-'}、日${bazi.dayShishen || '-'}、时${bazi.hourShishen || '-'}`,
          `五行：${wuxingText}`,
          `身强弱：${strength.label}`,
          `喜忌：用${yongJi.yong.join('、')}；忌${yongJi.ji.join('、')}`,
          daYunText ? `大运：${daYunText}` : '',
          ...(ziwei ? [
            `紫微命宫：${ziwei.mingGong?.ganZhi || ''}（${ziwei.mingGong?.majorStars?.join('、') || '无主星'}）`,
            `紫微五行局：${ziwei.fiveElementsClass || ''}${ziwei.shenGongName ? `，身宫${ziwei.shenGongName}` : ''}`,
          ] : []),
        ].filter(Boolean).join('\n'),
        evidence_tags: evidenceTags,
        algorithm_profile: {
          bodyStrength: strength.label,
          bodyStrengthScore: strength.score,
          yongShen: yongJi.yong,
          jiShen: yongJi.ji,
          wuxingText,
          currentAge,
          daYunText,
          verdict,
          ...(ziwei ? {
            ziweiMingGong: ziwei.mingGong?.ganZhi || '',
            ziweiMingStars: ziwei.mingGong?.majorStars || [],
            ziweiFiveElements: ziwei.fiveElementsClass || '',
            ziweiShenGong: ziwei.shenGongName || '',
          } : {}),
        },
        paywall_modules: ['morning', 'breakthrough', 'kline'],
      };
    }

    if (routeType === 'liuren') {
      const data = (calcResult?.calcData || calcResult || {}) as any;
      const siKeText = this.formatLiurenSiKe(data.siKe);
      const sanChuanText = this.formatLiurenSanChuan(data.sanChuan);
      const yueJiang = data.tianDiPan?.yueJiang || data.yueJiang || '未知';
      const riGan = data.tianDiPan?.riGan || '未知';
      const keTi = data.keTi || '未定课体';
      const shenshaText = data.shensha ? Object.entries(data.shensha).map(([k, v]) => `${k}:${v}`).join('；') : '';
      const evidenceTags = [
        `课体${keTi}`,
        siKeText ? '四课成列' : '',
        sanChuanText ? `三传${sanChuanText}` : '',
        yueJiang !== '未知' ? `月将${yueJiang}` : '',
      ].filter(Boolean);
      const firstChuan = Array.isArray(data.sanChuan) ? data.sanChuan[0] : null;
      const middleChuan = Array.isArray(data.sanChuan) ? data.sanChuan[1] : null;

      return {
        route_type: routeType,
        sourceType: 'algorithm',
        provider: 'algorithm',
        model: 'calc-engine',
        schemaValid: true,
        summary_line: `六壬排盘：${keTi}，月将${yueJiang}，三传${sanChuanText || '待定'}。`,
        summary_body: [
          '这是纯算法初判，未调用 LLM。',
          `日干：${riGan}；月将：${yueJiang}；课体：${keTi}。`,
          siKeText ? `四课：${siKeText}。` : '',
          sanChuanText ? `三传：${sanChuanText}。` : '',
          shenshaText ? `神煞：${shenshaText}。` : '',
        ].filter(Boolean).join('\n'),
        risks: [
          firstChuan ? `初传${firstChuan.gan || ''}${firstChuan.zhi || ''}为发端，若现实条件不应，先防开局受阻。` : '初传未明，先防开局信息不足。',
          middleChuan ? `中传${middleChuan.gan || ''}${middleChuan.zhi || ''}为转折点，过程变量需要持续核验。` : '中传未明，过程变量需要持续核验。',
        ],
        actions: [
          siKeText ? `先按四课「${siKeText}」核对人、事、环境三类事实。` : '先补齐问事背景、人事关系和当前约束。',
          sanChuanText ? `再按三传「${sanChuanText}」拆成发端、转折、收束三步行动。` : '再展开深入推演，生成行动路径。',
        ],
        time_window: data.timeWindow || (sanChuanText ? `以三传${sanChuanText}看7-14天气机转换` : '需结合三传与用神继续展开'),
        evidence_fold: [
          `月将：${yueJiang}`,
          `课体：${keTi}`,
          siKeText ? `四课：${siKeText}` : '',
          sanChuanText ? `三传：${sanChuanText}` : '',
        ].filter(Boolean).join('\n'),
        evidence_tags: evidenceTags,
        paywall_modules: ['morning', 'breakthrough', 'kline'],
      };
    }

    if (routeType === 'qimen') {
      const data = (calcResult?.calcData || calcResult || {}) as any;
      const geJu = data.geJu || '未知局';
      const yinyang = data.yinyang || '';
      const xunHead = data.xunHead || '';
      const palaces = Array.isArray(data.palaces) ? data.palaces : [];

      const kaiMenPalace = palaces.find((p: any) => p.door?.name === '开门');
      const shengMenPalace = palaces.find((p: any) => p.door?.name === '生门');
      const siMenPalace = palaces.find((p: any) => p.door?.name === '死门');

      const auspiciousDoors = palaces
        .filter((p: any) => p.door && ['开门', '休门', '生门'].includes(p.door.name))
        .map((p: any) => `${p.door.name}临${p.name}宫`);
      const inauspiciousDoors = palaces
        .filter((p: any) => p.door && ['死门', '惊门', '伤门'].includes(p.door.name))
        .map((p: any) => `${p.door.name}临${p.name}宫`);

      const qimenEvidenceTags = [
        geJu,
        xunHead ? `旬首${xunHead}` : '',
        kaiMenPalace ? `开门${kaiMenPalace.name}宫` : '',
        shengMenPalace ? `生门${shengMenPalace.name}宫` : '',
      ].filter(Boolean);

      return {
        route_type: routeType,
        sourceType: 'algorithm',
        provider: 'algorithm',
        model: 'calc-engine',
        schemaValid: true,
        summary_line: `奇门遁甲${geJu}，${auspiciousDoors.length > 0 ? auspiciousDoors.join('、') + '得位' : '吉门隐匿'}，${inauspiciousDoors.length > 0 ? inauspiciousDoors.join('、') + '临宫' : '凶门不显'}。`,
        summary_body: [
          '这是纯算法初判，未调用 LLM。',
          `局数：${geJu}。`,
          `旬首：${xunHead || '未知'}。`,
          auspiciousDoors.length > 0 ? `吉门：${auspiciousDoors.join('、')}。` : '',
          inauspiciousDoors.length > 0 ? `凶门：${inauspiciousDoors.join('、')}。` : '',
          kaiMenPalace ? `开门临${kaiMenPalace.name}宫，主事业公开、贵人相助。` : '',
          shengMenPalace ? `生门临${shengMenPalace.name}宫，主财源、生机。` : '',
          siMenPalace ? `死门临${siMenPalace.name}宫，需避此方。` : '',
        ].filter(Boolean).join('\n'),
        risks: inauspiciousDoors.length > 0
          ? inauspiciousDoors.map((d: string) => `${d}，需避此方行事`)
          : ['需结合具体情境分析'],
        actions: auspiciousDoors.length > 0
          ? auspiciousDoors.map((d: string) => `${d}，宜向此方行事`)
          : ['建议进一步咨询'],
        time_window: '本时辰内有效，过时需重新起局',
        evidence_fold: [
          `局数：${geJu}`,
          xunHead ? `旬首：${xunHead}` : '',
          auspiciousDoors.length > 0 ? `吉门：${auspiciousDoors.join('、')}` : '',
          inauspiciousDoors.length > 0 ? `凶门：${inauspiciousDoors.join('、')}` : '',
        ].filter(Boolean).join('\n'),
        evidence_tags: qimenEvidenceTags,
        paywall_modules: ['morning', 'breakthrough', 'kline'],
      };
    }

    if (routeType === 'liuyao') {
      const data = (calcResult?.calcData || calcResult || {}) as any;
      const benGua = data.benGua || {};
      const zhiGua = data.zhiGua || {};
      const dongYaoCount = data.dongYaoCount || 0;
      const movingYaoPositions = data.movingYaoPositions || [];
      const dayKong = data.dayKong || '';
      const ganZhiDay = data.ganZhiDay?.gz || '';

      const yaoList = Array.isArray(benGua.yaoList) ? benGua.yaoList : [];
      const shiYao = yaoList.find((y: any) => y.shiYing === '世');
      const yingYao = yaoList.find((y: any) => y.shiYing === '應');

      const yongShen = this.extractLiuyaoYongShen(question || '', yaoList);
      const yongShenYao = yaoList.find((y: any) => y.liuQin === yongShen);

      const dongYaoText = movingYaoPositions.length > 0
        ? `动爻在第${movingYaoPositions.join('、')}爻`
        : '无动爻';

      const isAuspicious = yongShenYao && !yongShenYao.isMoving;

      const liuyaoEvidenceTags = [
        benGua.guaName ? `本卦${benGua.guaName}` : '',
        zhiGua.guaName ? `变卦${zhiGua.guaName}` : '',
        `用神${yongShen}`,
        dongYaoText,
        dayKong ? `旬空${dayKong}` : '',
      ].filter(Boolean);

      const risks: string[] = [];
      if (dayKong) risks.push(`旬空${dayKong}，空亡之爻力量减半`);
      if (yongShenYao?.isMoving) risks.push('用神动而变，事有反复');
      const jiShen = this.findLiuyaoJiShen(yongShen);
      const jiShenYao = yaoList.find((y: any) => y.liuQin === jiShen);
      if (jiShenYao) risks.push(`忌神${jiShen}临${jiShenYao.position}爻，有阻碍之象`);
      if (risks.length === 0) risks.push('需结合具体情境分析');

      const actions: string[] = [];
      if (isAuspicious) {
        actions.push('用神得力，可主动推进');
        actions.push('把握当前时机，不宜拖延');
      } else {
        actions.push('用神不力，宜缓不宜急');
        actions.push('待用神旺相之时再行推进');
      }
      if (dayKong) actions.push('出空之日为行动窗口');

      return {
        route_type: routeType,
        sourceType: 'algorithm',
        provider: 'algorithm',
        model: 'calc-engine',
        schemaValid: true,
        summary_line: isAuspicious
          ? `${benGua.guaName || '未知'}之${zhiGua.guaName || '未知'}，用神${yongShen}得位，事可成。`
          : `${benGua.guaName || '未知'}之${zhiGua.guaName || '未知'}，用神${yongShen}${yongShenYao?.isMoving ? '动而失势' : '不得位'}，需审慎。`,
        summary_body: [
          '这是纯算法初判，未调用 LLM。',
          `本卦${benGua.guaName || '未知'}（${benGua.palace || '未知'}宫${benGua.palaceLevel || ''}），变卦${zhiGua.guaName || '未知'}。`,
          `用神取${yongShen}，${yongShenYao ? `${yongShenYao.naJia}临${yongShenYao.position}爻` : '未明'}。`,
          shiYao ? `世爻${shiYao.naJia}（${shiYao.liuQin}），` : '',
          yingYao ? `应爻${yingYao.naJia}（${yingYao.liuQin}）。` : '',
          `${dongYaoText}，旬空${dayKong || '无'}。`,
          ganZhiDay ? `日辰${ganZhiDay}。` : '',
        ].filter(Boolean).join('\n'),
        risks,
        actions,
        time_window: dongYaoCount > 0 ? '动爻变后7-14天内应期' : '静卦以月令旺衰判断应期',
        evidence_fold: [
          `本卦：${benGua.guaName || '未知'}`,
          `变卦：${zhiGua.guaName || '未知'}`,
          `用神：${yongShen}`,
          dongYaoText,
          dayKong ? `旬空：${dayKong}` : '',
        ].filter(Boolean).join('\n'),
        evidence_tags: liuyaoEvidenceTags,
        paywall_modules: ['morning', 'breakthrough', 'kline'],
      };
    }

    if (routeType === 'ziwei') {
      const data = (calcResult?.calcData || calcResult || {}) as any;
      const fiveElementsClass = data.fiveElementsClass || '';
      const soul = data.soul || '';
      const body = data.body || '';
      const zodiac = data.zodiac || '';
      const sign = data.sign || '';
      const palaces = Array.isArray(data.palaces) ? data.palaces : [];

      const mingGong = palaces.find((p: any) => p.name === '命宫');
      const caiBoGong = palaces.find((p: any) => p.name === '财帛宫');
      const guanLuGong = palaces.find((p: any) => p.name === '官禄宫');

      const mingGongStars = mingGong?.majorStars?.map((s: any) => s.name).join('、') || '空宫';
      const caiBoStars = caiBoGong?.majorStars?.map((s: any) => s.name).join('、') || '空宫';
      const guanLuStars = guanLuGong?.majorStars?.map((s: any) => s.name).join('、') || '空宫';

      const huaJiStars = palaces
        .flatMap((p: any) => (p.majorStars || []).filter((s: any) => s.mutagen === '忌').map((s: any) => ({ name: s.name, palace: p.name })));
      const huaLuStars = palaces
        .flatMap((p: any) => (p.majorStars || []).filter((s: any) => s.mutagen === '禄').map((s: any) => ({ name: s.name, palace: p.name })));

      const ziweiEvidenceTags = [
        fiveElementsClass,
        `命宫${mingGongStars}`,
        soul ? `命主${soul}` : '',
        zodiac ? `生肖${zodiac}` : '',
        huaJiStars.length > 0 ? `${huaJiStars[0].name}化忌临${huaJiStars[0].palace}` : '',
      ].filter(Boolean);

      const risks: string[] = [];
      for (const hj of huaJiStars) {
        risks.push(`${hj.name}化忌临${hj.palace}，需防此领域受阻`);
      }
      if (risks.length === 0) risks.push('命盘无明显化忌，但仍需结合大限流年判断');

      const actions: string[] = [];
      for (const hl of huaLuStars.slice(0, 2)) {
        actions.push(`${hl.name}化禄临${hl.palace}，可借力此领域`);
      }
      if (actions.length === 0) actions.push('建议结合大限流年寻找行动窗口');

      return {
        route_type: routeType,
        sourceType: 'algorithm',
        provider: 'algorithm',
        model: 'calc-engine',
        schemaValid: true,
        summary_line: `${fiveElementsClass}，命宫${mingGongStars}，${huaJiStars.length > 0 ? `${huaJiStars[0].name}化忌临${huaJiStars[0].palace}` : '无明显化忌'}。`,
        summary_body: [
          '这是纯算法初判，未调用 LLM。',
          `五行局${fiveElementsClass}，命主${soul}，身主${body}，生肖${zodiac}，星座${sign}。`,
          `命宫：${mingGongStars}（${mingGong?.heavenlyStem || ''}${mingGong?.earthlyBranch || ''}）。`,
          `财帛宫：${caiBoStars}。`,
          `官禄宫：${guanLuStars}。`,
          huaLuStars.length > 0 ? `化禄：${huaLuStars.map((s: any) => `${s.name}临${s.palace}`).join('、')}。` : '',
          huaJiStars.length > 0 ? `化忌：${huaJiStars.map((s: any) => `${s.name}临${s.palace}`).join('、')}。` : '',
        ].filter(Boolean).join('\n'),
        risks,
        actions,
        time_window: '需结合大限流年判断具体时间窗口',
        evidence_fold: [
          `五行局：${fiveElementsClass}`,
          `命宫：${mingGongStars}`,
          soul ? `命主：${soul}` : '',
          huaLuStars.length > 0 ? `化禄：${huaLuStars.map((s: any) => s.name).join('、')}` : '',
          huaJiStars.length > 0 ? `化忌：${huaJiStars.map((s: any) => s.name).join('、')}` : '',
        ].filter(Boolean).join('\n'),
        evidence_tags: ziweiEvidenceTags,
        paywall_modules: ['morning', 'breakthrough', 'kline'],
      };
    }

    // 八字取名 - 直接由 analyze() 方法中的 Step 4 处理，此处只返回占位符
    if (routeType === 'quming') {
      return {
        route_type: 'quming',
        sourceType: 'algorithm',
        provider: 'algorithm',
        model: 'calc-engine',
        schemaValid: true,
        summary_line: '取名分析已完成，请查看下方结果',
        summary_body: '八字取名分析已通过专业 Agent 完成。',
        risks: [],
        actions: [],
        time_window: '',
        evidence_fold: '',
        evidence_tags: [],
        bazi: null,
        wuge: null,
        wuxing_analysis: null,
        xi_yong_shen: null,
        name_suggestions: [],
        paywall_modules: ['morning', 'breakthrough', 'kline'],
      };
    }

    return {
      route_type: routeType,
      sourceType: 'algorithm',
      provider: 'algorithm',
      model: 'calc-engine',
      schemaValid: true,
      summary_line: this.buildDefaultSummaryLine(calcResult, routeType),
      summary_body: '这是纯算法初判，未调用 LLM。需要案例级文字和行动方案时，请展开后续模块。',
      risks: ['信息不足时，初判只作参考。'],
      actions: ['补齐关键信息后继续推演。'],
      time_window: '',
      evidence_fold: '',
      paywall_modules: ['morning', 'breakthrough', 'kline'],
    };
  }

  private formatLiurenSiKe(siKe: any): string {
    if (!Array.isArray(siKe) || siKe.length === 0) {
      return '';
    }

    const defaultNames = ['一课', '二课', '三课', '四课'];
    return siKe
      .map((item: any, index: number) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        const name = item.name || item.ke || defaultNames[index] || `${index + 1}课`;
        const gan = item.gan || item.tianGan || item.upper || '';
        const zhi = item.zhi || item.diZhi || item.lower || '';
        const tianJiang = item.tianjiang || item.tianJiang || item.jiang || '';
        const body = `${gan}${zhi}${tianJiang ? `(${tianJiang})` : ''}`;
        return body ? `${name}:${body}` : name;
      })
      .filter(Boolean)
      .join('｜');
  }

  private formatLiurenSanChuan(sanChuan: any): string {
    if (!Array.isArray(sanChuan) || sanChuan.length === 0) {
      return '';
    }

    const defaultNames = ['初', '中', '末'];
    return sanChuan
      .map((item: any, index: number) => {
        if (!item) return '';
        if (typeof item === 'string') return `${defaultNames[index] || ''}${item}`;
        const label = item.chuan || item.name || defaultNames[index] || '';
        const gan = item.gan || item.tianGan || '';
        const zhi = item.zhi || item.diZhi || item.value || '';
        const tianJiang = item.tianjiang || item.tianJiang || item.jiang || '';
        const body = `${gan}${zhi}${tianJiang ? `(${tianJiang})` : ''}`;
        return `${label}${body}`;
      })
      .filter(Boolean)
      .join(' → ');
  }

  private formatWuxingCounts(wuxing: Record<string, number>): string {
    return `木${wuxing?.wood || 0}、火${wuxing?.fire || 0}、土${wuxing?.earth || 0}、金${wuxing?.metal || 0}、水${wuxing?.water || 0}`;
  }

  private formatZiweiEvidence(zw: any): string[] {
    const tags: string[] = [];
    const mingStars = zw?.mingGong?.majorStars || [];
    if (mingStars.length > 0) {
      tags.push(`命宫${mingStars.join('')}`);
    }
    if (zw?.fiveElementsClass) {
      tags.push(`${zw.fiveElementsClass}局`);
    }
    if (zw?.shenGongName) {
      tags.push(`身宫${zw.shenGongName}`);
    }
    const sihua = zw?.sihua;
    if (sihua?.ji?.length > 0) {
      tags.push(`忌在${sihua.ji.map((s: {star: string; palace?: string}) => s.palace || '').filter(Boolean).join('')}`);
    }
    return tags;
  }

  private estimateBaziStrength(bazi: BaziCalcData): { label: string; score: number; isStrong: boolean; reason: string } {
    const wuxing = bazi?.wuxing || {};
    const dayGan = bazi?.dayPillar?.[0] || '';
    const dayElement = this.getGanElement(dayGan);
    const supportMap: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
    const drainMap: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    const controlMap: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };
    const counts: Record<string, number> = {
      木: wuxing.wood || 0,
      火: wuxing.fire || 0,
      土: wuxing.earth || 0,
      金: wuxing.metal || 0,
      水: wuxing.water || 0,
    };
    const self = counts[dayElement] || 0;
    const support = counts[supportMap[dayElement]] || 0;
    const drain = counts[drainMap[dayElement]] || 0;
    const control = counts[controlMap[dayElement]] || 0;
    const score = Math.round(50 + self * 9 + support * 6 - drain * 4 - control * 5);
    const label = score >= 68 ? '偏旺' : score <= 42 ? '偏弱' : '中和';
    const reason = `${dayElement || '日主五行'}本气${self}，生扶${support}，泄耗${drain}，克制${control}，算法判断为${label}`;
    return { label, score, isStrong: score >= 58, reason };
  }

  private estimateYongJi(dayGan: string, isStrong: boolean): { yong: string[]; ji: string[] } {
    const dayElement = this.getGanElement(dayGan);
    const supportMap: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
    const drainMap: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
    const controlMap: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };
    const wealthMap: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
    if (!dayElement) return { yong: ['中和'], ji: ['偏枯'] };
    if (isStrong) {
      return { yong: [drainMap[dayElement], controlMap[dayElement], wealthMap[dayElement]], ji: [dayElement, supportMap[dayElement]] };
    }
    return { yong: [supportMap[dayElement], dayElement], ji: [controlMap[dayElement], drainMap[dayElement], wealthMap[dayElement]] };
  }

  private getGanElement(gan: string): string {
    // P1-5 修复: 引用统一源 WUXING_TIANGAN（原本地 map 重复定义）
    return WUXING_TIANGAN[gan] || '';
  }

  private resolveCurrentAge(birthDate?: string): number | undefined {
    const birthYear = Number(String(birthDate || '').slice(0, 4));
    if (!birthYear || Number.isNaN(birthYear)) return undefined;
    return Math.max(0, new Date().getFullYear() - birthYear);
  }

  private findCurrentOrNextDaYun(daYun: DaYunItem[], currentAge: unknown): DaYunItem | null {
    if (!Array.isArray(daYun) || daYun.length === 0) return null;
    if (typeof currentAge !== 'number') return daYun[0];
    return (
      daYun.find((d) => currentAge >= Number(d.startAge ?? d.age ?? 0) && currentAge <= Number(d.endAge ?? d.year ?? 0)) ||
      daYun.find((d) => Number(d.startAge ?? d.age ?? 0) > currentAge) ||
      daYun[daYun.length - 1]
    );
  }

  private buildBaziVerdict(dayGan: string, bodyStrength: string, yongJi: { yong: string[]; ji: string[] }, currentDaYun: any): string {
    const daYunText = currentDaYun?.full ? `当前行${currentDaYun.full}运` : '当前大运未明';
    const yongText = yongJi.yong.join('、') || '中和';
    const jiText = yongJi.ji.join('、') || '偏枯';
    return `日主${dayGan || '-'}${bodyStrength}，宜借${yongText}之气疏通局面，少陷${jiText}过重之处；${daYunText}，先稳住基本盘，再择窗口推进关键事。`;
  }

  /**
   * 为前端构建 calc_result 结构
   */
  private buildCalcResultForFrontend(calcResult: CalcResult, routeType: string) {
    // ziping 类型：calcData 本身就是八字数据，直接使用
    if (routeType === 'ziping' && calcResult?.calcData?.yearPillar) {
      const bazi = calcResult.calcData;
      const strength = this.estimateBaziStrength(bazi);
      const yongJi = this.estimateYongJi(bazi.dayPillar?.[0] || '', strength.isStrong);
      return {
        yearPillar: bazi.yearPillar || '',
        monthPillar: bazi.monthPillar || '',
        dayPillar: bazi.dayPillar || '',
        hourPillar: bazi.hourPillar || '',
        yearShishen: bazi.yearShishen || '-',
        monthShishen: bazi.monthShishen || '-',
        dayShishen: bazi.dayShishen || '-',
        hourShishen: bazi.hourShishen || '-',
        wuxing: bazi.wuxing || { year: '-', month: '-', day: '-', hour: '-' },
        naYin: bazi.naYin || { year: '-', month: '-', day: '-', hour: '-' },
        mingGong: bazi.mingGong || '-',
        shenGong: bazi.shenGong || '-',
        shenSha: bazi.shenSha || {},
        kongWang: bazi.kongWang || [],
        taiYuan: bazi.taiYuan || '-',
        bodyStrength: strength.label,
        bodyStrengthScore: strength.score,
        bodyStrengthReason: strength.reason,
        yongShen: yongJi.yong,
        jiShen: yongJi.ji,
        birthDate: calcResult.inputData?.birthDate || calcResult.inputData?.birth_date || '',
        birthTime: calcResult.inputData?.birthTime || calcResult.inputData?.birth_time || '',
        zangganShishen: bazi.zangganShishen || null,
        changsheng: bazi.changsheng || null,
        xingChongHeHai: bazi.xingChongHeHai || { he: [], chong: [], hai: [], xing: [] },
        liuNian: bazi.liuNian || [],
        qiYunAge: bazi.qiYunAge || null,
        liuNianDetail: bazi.liuNianDetail || [],
        liuYue: bazi.liuYue || [],
        selfSeat: bazi.selfSeat || null,
        shenShaByPillar: bazi.shenShaByPillar || null,
        ziweiSummary: bazi.ziweiSummary || null,
        // 补充 daYun 字段
        daYun: bazi.daYun?.map((d: DaYunItem) => ({
          age: String(d.age || d.startAge || 0),
          year: String(d.endAge || d.age + 10 || 10),
          gan: d.gan || '',
          zhi: d.zhi || '',
          full: d.full || `${d.gan || ''}${d.zhi || ''}`,
          startAge: Number(d.startAge || d.age || 0),
          endAge: Number(d.endAge || d.year || (d.age ? d.age + 9 : 0)),
        })) || [],
      };
    }
    // 对于断事推演或其他类型，直接返回 calcResult
    if (routeType === 'qimen' && calcResult?.calcData?.palaces) {
      const qimenData = calcResult.calcData;
      return {
        geJu: qimenData.geJu || '',
        yinyang: qimenData.yinyang || '',
        juNumber: qimenData.juNumber || 0,
        xunHead: qimenData.xunHead || '',
        ganZhi: qimenData.ganZhi || '',
        solarTerm: qimenData.solarTerm || '',
        palaces: qimenData.palaces || [],
      };
    }
    if (routeType === 'liuyao' && calcResult?.calcData?.benGua) {
      const liuyaoData = calcResult.calcData;
      return {
        benGua: liuyaoData.benGua,
        zhiGua: liuyaoData.zhiGua,
        huGua: liuyaoData.huGua,
        dongYaoCount: liuyaoData.dongYaoCount,
        movingYaoPositions: liuyaoData.movingYaoPositions,
        ganZhiDay: liuyaoData.ganZhiDay,
        dayKong: liuyaoData.dayKong,
        hourKong: liuyaoData.hourKong,
        monthJian: liuyaoData.monthJian,
        solarTerm: liuyaoData.solarTerm,
        yaoString: liuyaoData.yaoString,
      };
    }
    if (routeType === 'ziwei' && calcResult?.calcData?.palaces) {
      const ziweiData = calcResult.calcData;
      return {
        solarDate: ziweiData.solarDate,
        lunarDate: ziweiData.lunarDate,
        chineseDate: ziweiData.chineseDate,
        gender: ziweiData.gender,
        time: ziweiData.time,
        timeRange: ziweiData.timeRange,
        sign: ziweiData.sign,
        zodiac: ziweiData.zodiac,
        soul: ziweiData.soul,
        body: ziweiData.body,
        fiveElementsClass: ziweiData.fiveElementsClass,
        earthlyBranchOfSoulPalace: ziweiData.earthlyBranchOfSoulPalace,
        earthlyBranchOfBodyPalace: ziweiData.earthlyBranchOfBodyPalace,
        palaces: ziweiData.palaces,
      };
    }
    return calcResult?.calcData || calcResult || {};
  }

  /**
   * 构建默认的 summary_line（当 LLM 失败时使用）
   */
  private inferSourceEntry(routeType: string, question?: string): string | undefined {
    if (routeType === 'quming') return 'naming';
    if (routeType === 'zhangsheng') return 'kline';
    if (question && /命运K线|kline/i.test(question)) return 'kline';
    if (['liuren', 'qimen', 'liuyao'].includes(routeType)) return 'question';
    return undefined;
  }

  private createNamingCandidateId(name: string, index: number): string {
    let hash = 2166136261;
    for (const char of `${name}:${index}`) {
      hash ^= char.codePointAt(0) || 0;
      hash = Math.imul(hash, 16777619);
    }
    return `cand_${(hash >>> 0).toString(36)}_${index + 1}`;
  }

  private buildDefaultSummaryLine(calcResult: CalcResult, routeType: string): string {
    if (routeType === 'ziping' && calcResult?.calcData?.yearPillar) {
      const bazi = calcResult.calcData;
      return `四柱：${bazi.yearPillar}/${bazi.monthPillar}/${bazi.dayPillar}/${bazi.hourPillar}`;
    }
    if (routeType === 'liuyao' && calcResult?.calcData?.benGua) {
      const data = calcResult.calcData as any;
      return `${data.benGua.guaName || '未知'}之${data.zhiGua?.guaName || '未知'}`;
    }
    return '分析完成，请查看详细结果';
  }

  private extractLiuyaoYongShen(question: string, yaoList: any[]): string {
    if (/财|钱|投资|收益|工资|薪|利润/.test(question)) return '妻财';
    if (/官|职|升|考|试|事业|工作|面试/.test(question)) return '官鬼';
    if (/病|医|身体|健康|疾/.test(question)) return '官鬼';
    if (/婚|恋|感情|对象|桃花|老公|老婆|男友|女友/.test(question)) return '妻财';
    if (/子|孩|学|考试|升学/.test(question)) return '子孙';
    if (/房|车|父|母|长辈|文书|合同/.test(question)) return '父母';
    const shiYao = yaoList.find((y: any) => y.shiYing === '世');
    return shiYao?.liuQin || '兄弟';
  }

  private findLiuyaoJiShen(yongShen: string): string {
    const map: Record<string, string> = {
      '父母': '子孙',
      '兄弟': '官鬼',
      '官鬼': '子孙',
      '妻财': '兄弟',
      '子孙': '父母',
    };
    return map[yongShen] || '兄弟';
  }

  /**
   * 提交信息接口 - POST /api/v1/consult/info
   */
  async submitInfo(dto: SubmitInfoDto): Promise<any> {
    this.logger.log('[ConsultService] submitInfo 接收到的 DTO: ' + JSON.stringify(dto));

    const record = await this.prisma.consultRecord.findUnique({
      where: { id: dto.sessionId },
    });

    if (!record) {
      throw new BadRequestException('咨询会话不存在');
    }

    // 推送进度
    this.websocketGateway.sendProgressUpdate(dto.sessionId, 10, '开始处理您的请求...');

    // Step 1: 执行算法计算
    const routeType = (dto.routeType || dto.route_type) as 'liuren' | 'ziping' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'meihua' | 'clarify';
    this.logger.log('[ConsultService] routeType: ' + routeType);

    // 如果是 clarify 类型，需要生成澄清问题
    if (routeType === 'clarify') {
      const clarifyingQuestion = await this.routerService.generateClarifyQuestion(dto.question);
      return {
        route_type: 'clarify',
        clarifyingQuestion,
        record_id: record.id,
      };
    }

    const calcStartTime = Date.now();
    const calcResult = await this.calcEngine.calculate({
      routeType: routeType as any,
      question: dto.question,
      askTime: dto.ask_time || dto.askTime,
      askLocation: dto.ask_location || dto.askLocation,
      birthDate: dto.birth_date || dto.birthDate,
      birthTime: dto.birth_time || dto.birthTime,
      birthPlace: dto.birth_place || dto.birthPlace,
      gender: dto.gender,
      timeUnknown: dto.time_unknown || dto.timeUnknown,
    });
    (calcResult as any).inputData = {
      birthDate: dto.birth_date || dto.birthDate,
      birthTime: dto.birth_time || dto.birthTime,
      birthPlace: dto.birth_place || dto.birthPlace,
      gender: dto.gender,
    };
    const calcDuration = Date.now() - calcStartTime;

    this.websocketGateway.sendProgressUpdate(dto.sessionId, 50, '计算完成，正在整理初步结论...');

    // Step 2: 构建用户问题上下文
    const questionContext = this.buildQuestionContext(dto);

    // Step 3: 初步结论保持纯算法，不调用 LLM。quming 路由由 QumingAgent 接管。
    const llmResult = await this.buildAlgorithmInitialResult(routeType, calcResult as any, questionContext, {
      birthDate: dto.birth_date || dto.birthDate,
      birthTime: dto.birth_time || dto.birthTime,
      gender: dto.gender,
    });
    const llmDuration = 0;

    this.websocketGateway.sendProgressUpdate(dto.sessionId, 80, '分析完成，正在整理结果...');

    // 更新数据库记录 - 保存完整数据
    await this.prisma.consultRecord.update({
      where: { id: record.id },
      data: {
        status: 'completed',
        calcResult: JSON.stringify(calcResult),
        llmResult: JSON.stringify(llmResult),
        summaryLine: llmResult.summary_line,
        analysisData: JSON.stringify({
          // 原始数据
          inputData: dto,
          // 计算结果
          calcResult,
          // 初步算法结果。LLM 只在付费/展开模块中调用。
          llmResult,
          // 性能数据
          calcDuration,
          llmDuration,
          totalDuration: calcDuration + llmDuration,
          // 时间戳
          timestamp: new Date().toISOString(),
        }),
        calcDuration,
        llmDuration,
        modelUsed: 'calc-engine',
      },
    });

    this.websocketGateway.sendProgressUpdate(dto.sessionId, 100, '处理完成！');

    // 构建统一返回格式（snake_case）
    const response = this.buildResponse(llmResult, calcResult as any, record.id, routeType);

    this.websocketGateway.sendResultUpdate(dto.sessionId, response);

    return response;
  }

  /**
   * 构建用户问题上下文
   */
  private buildQuestionContext(dto: any): string {
    const parts: string[] = [];

    if (dto.question) {
      parts.push(`📡 用户问题：${dto.question}`);
    }
    if (dto.birth_date || dto.birthDate) {
      parts.push(`🏮 出生日期：${dto.birth_date || dto.birthDate}`);
    }
    if (dto.birth_time || dto.birthTime) {
      parts.push(`⏰ 出生时间：${dto.birth_time || dto.birthTime}`);
    }
    if (dto.gender) {
      parts.push(`👤 性别：${dto.gender === 'male' ? '男' : '女'}`);
    }
    if (dto.birth_place || dto.birthPlace) {
      parts.push(`📍 出生地：${dto.birth_place || dto.birthPlace}`);
    }
    if (dto.ask_time || dto.askTime) {
      parts.push(`🕐 问事时间：${dto.ask_time || dto.askTime}`);
    }
    if (dto.ask_location || dto.askLocation) {
      parts.push(`📍 问事地点：${dto.ask_location || dto.askLocation}`);
    }

    return parts.join('\n');
  }

  /**
   * 构建统一返回格式 - snake_case 匹配前端 ResultResponse
   */
  private buildResponse(llmResult: LlmResult, calcResult: CalcResult, recordId: string, routeType: string): ConsultResponse {
    const response: any = {
      record_id: recordId,
      route_type: routeType,
      summary_line: llmResult.summary_line || '',
      summary_body: llmResult.overview || llmResult.summary_body || '',
      risk_block: this.normalizeRisks(llmResult.risks),
      action_block: this.normalizeActions(llmResult.actions),
      window_block: this.extractTimeWindowString(llmResult.time_windows),
      evidence_fold: llmResult.evidence_summary || llmResult.evidence_fold || '',
      paywall_modules: llmResult.paywall_modules || [],
      llm_fallback: llmResult.llm_fallback || false,
      calc_result: this.buildCalcResultForFrontend(calcResult, routeType),
      sourceType: llmResult.sourceType || (llmResult.provider === 'algorithm' ? 'algorithm' : 'llm'),
      provider: llmResult.provider,
      model: llmResult.model,
      schemaValid: llmResult.schemaValid,
    };

    Object.assign(response, this.mergeOptionalFields(llmResult));

    return response;
  }

  private static readonly OPTIONAL_LLM_FIELDS = [
    'monthlyFortune', 'bestMonths', 'worstMonths', 'modules', 'modulesRating',
    'timeRhythm', 'stopDoingList', 'paiPanVerification', 'mingjuGuJia',
    'classicAnalysis', 'daYunTheme', 'keyYearPhenomenon', 'futureYearsRhythm',
    'decisionAudit', 'partnerPortrait', 'mvpPlan', 'guardianGuidance',
    'supplementaryNotes', 'coreReasoning', 'keySignals', 'timeWindows',
    'label', 'ranking', 'testScenarios', 'one_line_conclusion',
    'character_portrait', 'counterpart_portrait', 'repositioning_strategy',
    'three_layer_advice', 'phased_calendar', 'scripts', 'success_signals',
    'failure_signals', 'proposal_versions', 'action_strategy', 'evidence_tags',
    'provider', 'model', 'fallbackReason',
    'bazi', 'wuxing_analysis', 'xi_yong_shen', 'name_suggestions', 'wuge',
    'zhangbanshan_output',
    // 2026-06-15 P0 修复：把 5 层输出提到顶层，前端 result.fiveLayers 直接读取
    'fiveLayers',
    'gated_layers', 'validation', 'arbitration',
  ] as const;

  private static readonly TYPE_CHECK_FIELDS: Record<string, 'boolean' | 'number'> = {
    schemaValid: 'boolean',
    qualityScore: 'number',
    retryCount: 'number',
  };

  private mergeOptionalFields(llmResult: any): Record<string, any> {
    if (!llmResult || typeof llmResult !== 'object') return {};
    const picked: Record<string, any> = {};
    for (const key of ConsultService.OPTIONAL_LLM_FIELDS) {
      if (llmResult[key] !== undefined) {
        picked[key] = llmResult[key];
      }
    }
    for (const [key, expectedType] of Object.entries(ConsultService.TYPE_CHECK_FIELDS)) {
      if (expectedType === 'boolean' && typeof llmResult[key] === 'boolean') {
        picked[key] = llmResult[key];
      } else if (expectedType === 'number' && typeof llmResult[key] === 'number') {
        picked[key] = llmResult[key];
      }
    }
    return picked;
  }

  private static readonly WUXING_LUCKY_MAP: Record<string, { direction: string; color: string }> = {
    '木': { direction: '东方', color: '青绿色' },
    '火': { direction: '南方', color: '红紫色' },
    '土': { direction: '中央或本地', color: '黄棕色' },
    '金': { direction: '西方', color: '白金色' },
    '水': { direction: '北方', color: '黑蓝色' },
  };

  private deriveLuckyFromWuxing(bazi: BaziCalcData): { direction: string; color: string } {
    const dayGan = bazi?.dayPillar?.[0] || '';
    const yongWuxing = this.estimateYongJi(dayGan, this.estimateBaziStrength(bazi).isStrong).yong[0] || '';
    const wuxingChar = this.getGanWuxing(dayGan);
    const key = yongWuxing || wuxingChar || '土';
    return ConsultService.WUXING_LUCKY_MAP[key] || ConsultService.WUXING_LUCKY_MAP['土'];
  }

  private normalizeRisks(risks: any): string[] {
    if (!risks) return [];
    if (Array.isArray(risks)) {
      return risks.map((r: any) => this.cleanLlmDisplayText(typeof r === 'string' ? r : (r.risk || r.action || r.description || r.fallback))).filter(Boolean);
    }
    return [];
  }

  private normalizeActions(actions: any): string[] {
    if (!actions) return [];
    if (Array.isArray(actions)) {
      return actions.map((a: any) => this.cleanLlmDisplayText(typeof a === 'string' ? a : (a.action || a.detail || a.description || a.title))).filter(Boolean);
    }
    return [];
  }

  private cleanLlmDisplayText(value: any): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value.map(item => this.cleanLlmDisplayText(item)).filter(Boolean).join('；');
    }
    if (typeof value === 'object') {
      return [
        value.title,
        value.description,
        value.coreAction,
        ...(Array.isArray(value.steps) ? value.steps : []),
        value.timeline,
      ].map(item => this.cleanLlmDisplayText(item)).filter(Boolean).join('；');
    }

    let text = String(value).trim();
    if (!text) return '';
    if (/^\s*[{[]/.test(text)) {
      try {
        return this.cleanLlmDisplayText(JSON.parse(text));
      } catch {
        return '';
      }
    }
    text = text.replace(/\\n/g, ' ').replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim();
    if (!text || /"coreAction"|"steps"|^\s*coreAction\s*:|^\s*steps\s*:/.test(text)) return '';
    return text;
  }

  private extractTimeWindowString(timeWindows: any): string {
    if (!timeWindows) return '';
    if (typeof timeWindows === 'string') return timeWindows;
    if (Array.isArray(timeWindows)) {
      return timeWindows.map((tw: any) => {
        if (typeof tw === 'string') return tw;
        return `${tw.period || ''}：${tw.description || ''}`;
      }).join('；');
    }
    return '';
  }

  /**
   * 获取结果 - GET /api/v1/consult/result/:recordId
   * @param moduleId 可选模块ID (breakthrough/morning/kline)
   */
  async getResult(recordId: string, userId?: string, moduleId?: string, lang: string = 'zh-CN') {
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new BadRequestException('咨询记录不存在');
    }

    if (record.userId && record.userId !== userId) {
      throw new BadRequestException('无权查看此记录');
    }

    const hasRenderableResult = !!(record.calcResult || record.llmResult || record.summaryLine);

    if (record.status !== 'completed' && !hasRenderableResult) {
      return {
        record_id: record.id,
        status: record.status,
        message: '咨询正在处理中',
      };
    }

    const llmResult = record.llmResult ? JSON.parse(record.llmResult) : {};
    const calcResult = record.calcResult ? JSON.parse(record.calcResult) : {};

    // 2026-06-17 P0 修复：L2 管线存入的是嵌套结构 (primary_output.summary_line)，
    // getResult() 期望扁平结构 (llmResult.summary_line)。此处桥接两种格式。
    const l2Primary = llmResult.primary_output;
    const l2Zhangbanshan = llmResult.zhangbanshan_output;
    const isL2Format = !!l2Primary;
    const isL1Fallback = llmResult.is_l1_fallback === true ||
      (l2Zhangbanshan && l2Zhangbanshan.is_l1_fallback === true);

    // 构建 sourceType：L2 完成 → 'llm'，L1 降级 → 'algorithm'
    let resolvedSourceType = llmResult.sourceType;
    if (!resolvedSourceType) {
      if (llmResult.provider === 'algorithm') resolvedSourceType = 'algorithm';
      else if (isL2Format && !isL1Fallback) resolvedSourceType = 'llm';
      else resolvedSourceType = 'algorithm';
    }

    const baseResult: any = {
      record_id: record.id,
      route_type: record.routeType,
      question: record.question,
      summary_line: record.summaryLine
        || llmResult.summary_line
        || (l2Primary?.summary_line)
        || '',
      summary_body: llmResult.overview
        || llmResult.summary_body
        || (l2Primary?.summary_body)
        || '',
      risk_block: this.normalizeRisks(llmResult.risks || l2Primary?.risks),
      action_block: this.normalizeActions(llmResult.actions || l2Primary?.actions),
      window_block: this.extractTimeWindowString(llmResult.time_windows || l2Primary?.time_window),
      evidence_fold: llmResult.evidence_summary
        || llmResult.evidence_fold
        || (l2Primary?.evidence_fold)
        || '',
      paywall_modules: llmResult.paywall_modules || l2Primary?.paywall_modules || [],
      llm_fallback: llmResult.llm_fallback || isL1Fallback || false,
      calc_result: this.buildCalcResultForFrontend(calcResult as CalcResult, record.routeType),
      sourceType: resolvedSourceType,
      provider: llmResult.provider,
      model: llmResult.model,
      createdAt: record.createdAt,
      status: record.status,
      is_processing: record.status !== 'completed',
    };

    // L2 格式附加：fiveLayers + zhangbanshan_output + validation + reasoning_trace
    if (isL2Format) {
      if (llmResult.fiveLayers) baseResult.fiveLayers = llmResult.fiveLayers;
      if (l2Zhangbanshan) baseResult.zhangbanshan_output = l2Zhangbanshan;
      if (llmResult.validation) baseResult.validation = llmResult.validation;
      if (llmResult.arbitration) baseResult.arbitration = llmResult.arbitration;
      if (llmResult.rendered_output) baseResult.rendered_output = llmResult.rendered_output;
    }

    Object.assign(baseResult, this.mergeOptionalFields(llmResult));

    const latestRun = await this.prisma.generationRun.findFirst({
      where: { recordId: record.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latestRun?.reasoningContent) {
      baseResult.reasoningContent = latestRun.reasoningContent;
    }

    // 如果请求了特定模块，优先读取已生成缓存，避免用户每次点击都重新生成
    if (moduleId && ['breakthrough', 'morning', 'kline'].includes(moduleId)) {
      const cachedModuleContent = this.getCachedModuleContent(record, moduleId);
      if (cachedModuleContent) {
        return {
          ...baseResult,
          module_id: moduleId,
          module_content: cachedModuleContent,
          module_cached: true,
        };
      }

      const moduleContent = await this.generateModuleContent(record, llmResult, calcResult, moduleId);
      await this.saveModuleContent(record, moduleId, moduleContent);
      return {
        ...baseResult,
        module_id: moduleId,
        module_content: moduleContent,
        module_cached: false,
      };
    }

    return lang !== 'zh-CN' && lang !== 'zh' ? this.translationService.translateCalcResult(baseResult, lang) : baseResult;
  }

  /**
   * 生成模块内容
   */
  private isLlmTimeout(error: any): boolean {
    const message = `${error?.message || ''} ${error?.code || ''} ${error?.name || ''}`.toLowerCase();
    return message.includes('timeout') || message.includes('timed out') || message.includes('超时') || message.includes('abort');
  }

  private timeoutModuleContent(moduleId: string): any {
    const titleMap: Record<string, string> = {
      breakthrough: '深入推演超时',
      morning: '醒神早贴超时',
      kline: '人生K线图推演超时',
    };

    return {
      title: titleMap[moduleId] || '推演超时',
      timeout: true,
      retryable: true,
      noCharge: true,
      message: 'LLM 推演超时，请稍后重试。本次不输出兜底模板，也不会扣除积分。',
    };
  }

  private withLlmModuleTimeout<T>(promise: Promise<T>, timeoutMs = 75000): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`LLM module timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    // Task 13.1: Promise.race 完成后必须清理 setTimeout，避免 handle 残留导致测试 --forceExit
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId!));
  }

  private parseRecordInput(record: any): any {
    try {
      return record?.inputData ? JSON.parse(record.inputData) : {};
    } catch {
      return {};
    }
  }

  private parseAnalysisData(record: any): any {
    try {
      return record?.analysisData ? JSON.parse(record.analysisData) : {};
    } catch {
      return {};
    }
  }

  private getCachedModuleContent(record: any, moduleId: string): any | null {
    const analysisData = this.parseAnalysisData(record);
    const cached = analysisData?.moduleContent?.[moduleId];
    if (!cached || typeof cached !== 'object') return null;
    return cached;
  }

  private async saveModuleContent(record: any, moduleId: string, moduleContent: any): Promise<void> {
    if (!moduleContent || typeof moduleContent !== 'object') return;
    // 超时模块不缓存，避免用户重试时一直看到旧超时；K线算法图内容可缓存。
    if (moduleContent.timeout && moduleId !== 'kline') return;

    const analysisData = this.parseAnalysisData(record);
    const nextAnalysisData = {
      ...analysisData,
      moduleContent: {
        ...(analysisData.moduleContent || {}),
        [moduleId]: moduleContent,
      },
      moduleGeneratedAt: {
        ...(analysisData.moduleGeneratedAt || {}),
        [moduleId]: new Date().toISOString(),
      },
    };

    await this.prisma.consultRecord.update({
      where: { id: record.id },
      data: {
        analysisData: JSON.stringify(nextAnalysisData),
        isSaved: true,
      },
    });
  }

  async saveDestinySnapshot(recordId: string, moduleId: string, destinyKline: any) {
    const record = await this.prisma.consultRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Record not found');

    const analysisData = this.parseAnalysisData(record);
    if (!analysisData.moduleContent) analysisData.moduleContent = {};
    if (!analysisData.moduleContent[moduleId]) analysisData.moduleContent[moduleId] = {};

    analysisData.moduleContent[moduleId].destinyKline = destinyKline;

    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: { analysisData: JSON.stringify(analysisData) },
    });

    return { saved: true };
  }

  private async ensureCaseLevelLlm(record: any, llmResult: LlmResult, calcResult: CalcResult, lang: string = 'zh-CN'): Promise<any> {
    if (llmResult?.provider && llmResult.provider !== 'algorithm' && llmResult?.schemaValid === true) {
      return llmResult;
    }

    const inputData = this.parseRecordInput(record);
    const routeType = (record.routeType || llmResult?.route_type || 'ziping') as 'ziping' | 'liuren' | 'clarify';
    const startedAt = Date.now();
    const caseResult = await this.withLlmModuleTimeout(
      this.llmGateway.generate({
        routeType,
        calcResult,
        inputData: {
          ...inputData,
          question: record.question,
        },
        lang,
      }),
    );

    await this.prisma.consultRecord.update({
      where: { id: record.id },
      data: {
        llmResult: JSON.stringify(caseResult),
        summaryLine: caseResult.summary_line || record.summaryLine,
        llmDuration: Date.now() - startedAt,
      },
    });

    return caseResult;
  }

  private async generateModuleContent(
    record: any,
    llmResult: LlmResult,
    calcResult: CalcResult,
    moduleId: string,
  ): Promise<any> {
    // 生成突破分析内容
    if (moduleId === 'breakthrough') {
      return await this.generateBreakthroughContent(record, llmResult, calcResult);
    }

    // 早知道模块
    if (moduleId === 'morning') {
      return await this.generateMorningContent(record, llmResult, calcResult);
    }

    // 趋势模块
    if (moduleId === 'kline') {
      return await this.generateKlineContent(record, llmResult, calcResult);
    }

    return {};
  }

  private parseLlmJson(content: string): any {
    const raw = String(content || '').trim();
    if (!raw) throw new Error('LLM 返回空内容');
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const text = fenced ? fenced[1].trim() : raw;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('LLM 返回不是 JSON 对象');
    return JSON.parse(text.slice(start, end + 1));
  }

  private static readonly MODULE_REQUIRED_FIELDS: Record<string, string[]> = {
    breakthrough: ['overview', 'career_fortune', 'wealth_fortune', 'stop_doing_list'],
    morning: ['overview', 'daily_tips', 'warnings'],
    kline: ['overview', 'trendSummary', 'keyDrivers', 'bestWindows', 'riskWindows', 'actionAdvice'],
  };

  // v1.5: 保留用于向后兼容，新逻辑使用 checkLlmQuality
  private validateModuleSchema(parsed: any, moduleId: string): boolean {
    if (!parsed || typeof parsed !== 'object') return false;
    const required = ConsultService.MODULE_REQUIRED_FIELDS[moduleId] || [];
    return required.every(field => parsed[field] !== undefined && parsed[field] !== null);
  }

  private static readonly VAGUE_PHRASES = [
    '保持积极心态', '顺其自然', '注意休息', '保持努力', '未来可期',
    '注意沟通', '保持乐观', '适当调整', '注意身体', '把握机会',
    '谨慎行事', '稳中求进', '循序渐进', '因人而异', '具体情况具体分析',
    '保持平衡', '注意调节', '保持专注', '适度放松', '注意观察',
  ];

  private computeQualityScore(parsed: any, schemaValid: boolean): number {
    if (!parsed || typeof parsed !== 'object') return 0;
    let score = schemaValid ? 60 : 30;

    const text = JSON.stringify(parsed);
    const hasVague = ConsultService.VAGUE_PHRASES.some(p => text.includes(p));
    if (hasVague) score -= 15;

    if (parsed.overview && parsed.overview.length >= 15) score += 8;
    if (parsed.overview && parsed.overview.length >= 40) score += 5;
    if (parsed.recommendations && Array.isArray(parsed.recommendations) && parsed.recommendations.length >= 2) score += 7;
    if (parsed.stopDoingList && Array.isArray(parsed.stopDoingList) && parsed.stopDoingList.length >= 2) score += 7;
    if (parsed.evidence_tags && Array.isArray(parsed.evidence_tags) && parsed.evidence_tags.length >= 1) score += 5;
    if (parsed.risk_alerts && Array.isArray(parsed.risk_alerts) && parsed.risk_alerts.length >= 2) score += 5;
    if (parsed.decisionAudit && parsed.decisionAudit.riskLevel) score += 3;

    return Math.max(0, Math.min(100, score));
  }

  private buildCompactEvidence(record: any, calcResult: CalcResult): string {
    const bazi = (calcResult?.calcData || calcResult || {}) as any;
    const inputData = this.parseRecordInput(record);
    if (record.routeType === 'liuren') {
      const data = (calcResult?.calcData || calcResult || {}) as any;
      return [
        `问题：${record.question || inputData.question || ''}`,
        `课体：${data.keTi || data.lesson?.keTi || '未定'}`,
        `四课：${this.formatLiurenSiKe(data.siKe) || '-'}`,
        `三传：${this.formatLiurenSanChuan(data.sanChuan) || '-'}`,
        `月将：${data.tianDiPan?.yueJiang || data.yueJiang || '-'}`,
      ].join('\n');
    }

    const daYun = Array.isArray(bazi.daYun) ? bazi.daYun.slice(0, 6).map((d: DaYunItem) => `${d.full || `${d.gan || ''}${d.zhi || ''}`}(${d.startAge ?? d.age}-${d.endAge ?? d.year}岁)`).join('，') : '-';
    const wuxing = bazi.wuxing || {};
    const strength = this.estimateBaziStrength(bazi);
    const yongJi = this.estimateYongJi(bazi.dayPillar?.[0] || '', strength.isStrong);
    return [
      `问题：${record.question || inputData.question || ''}`,
      `四柱：${bazi.yearPillar || '-'}/${bazi.monthPillar || '-'}/${bazi.dayPillar || '-'}/${bazi.hourPillar || '-'}`,
      `十神：年${bazi.yearShishen || '-'}、月${bazi.monthShishen || '-'}、日${bazi.dayShishen || '-'}、时${bazi.hourShishen || '-'}`,
      `五行：木${wuxing.wood || 0}、火${wuxing.fire || 0}、土${wuxing.earth || 0}、金${wuxing.metal || 0}、水${wuxing.water || 0}`,
      `身强弱：${strength.label}`,
      `喜忌：用${yongJi.yong.join('、')}；忌${yongJi.ji.join('、')}`,
      `大运：${daYun}`,
    ].join('\n');
  }

  private async generateFastModuleJson(moduleId: 'breakthrough' | 'morning', record: any, calcResult: CalcResult): Promise<any> {
    const providerInfo = this.llmProviders.getDefaultProviderInfo();
    if (!providerInfo.configured) {
      throw new Error(`${providerInfo.provider} API key not configured`);
    }

    const evidence = this.buildCompactEvidence(record, calcResult);
    const systemPrompt = [
      buildIdentityLayer(),
      '你是"人生决策宗师"的模块报告生成器。',
      '只允许依据用户给出的算法证据包解释，不得重算命盘，不得编造节气、经典原文或出处。',
      '输出必须是合法 JSON 对象，不要 Markdown，不要解释 JSON 以外的内容。',
      '文风要具体、有行动边界，禁止“保持努力、未来可期、注意沟通”这类空泛句单独作为核心结论。',
      `所有时间建议必须面向当前日期之后（当前日期：${new Date().toISOString().slice(0, 10)}），不得输出已经过去的年份或季度。`,
      '不要把 JSON 字符串塞进任何字段；列表项必须是自然语言短句。',
      '',
      '【输出风格铁律】',
      '1. overview 必须有记忆点，用排比或对仗句式，15-50字，有行动指向。例：“事业可冲，投资要收。职位可争，钱要守。”',
      '2. 术语必须紧跟白话翻译，格式：“XX，也就是……”。一段内不超过3个术语。',
      '3. stopDoingList 每条必须具体，用“不要……”句式，禁止“注意风险”这类空泛表述。',
      '4. recommendations 每条必须有具体动作，禁止“保持努力”这类口号。',
      '5. decisionAudit 必须包含风险等级（低/中/中高/高）和最坏情况描述。',
      '6. mvpPlan 必须有具体时间节点和可执行步骤，禁止“持续优化”类模糊表述。',
      '7. riskWindows 每条必须有具体时间窗口和退路方案。',
      '8. closing_line 必须有：落一句最实在的话，30字以内，像朋友直接跟你说。例："守正财不逐偏财，做熟人熟事不碰陌生大局。"',
      '',
      '【巴纳姆效应禁止清单——以下表述绝对不能出现】',
      '- "有时候果断，有时候犹豫"',
      '- "事业有起有落"',
      '- "注意身体健康"（没有信息量）',
      '- "适合多种行业"（没有价值）',
      '- "可能会遇到贵人"（过于模糊）',
      '- "性格复杂多变"（没有具体内容）',
    ].join('\n');

    const schema = moduleId === 'breakthrough'
      ? `{
  "overview": "150-250字总断，必须包含：1)日主强弱与格局定性 2)当前大运核心主题 3)流年关键象义 4)一句话行动方向",
  "pattern_name": "格局名称（如：正印格带财、食神生财、官星制刃等）",
  "pattern_reasoning": "格局定名依据（30-60字，引用月令与透干逻辑）",
  "classic_quote": "引用《子平真诠》或《渊海子平》的一句相关原文（20字内）",
  "classic_application": "该原文对当前命局的具体解读（40-60字）",
  "career_fortune": "事业断事（60-100字，含十神依据+具体场景+宜忌）",
  "wealth_fortune": "财运断事（60-100字，含正偏财分析+具体建议+禁忌）",
  "relationship_fortune": "人际与合作断事（40-80字，含日支/夫妻宫/合作宫分析）",
  "health_fortune": "健康断事（30-60字，含五行偏旺对应的身体部位）",
  "best_periods": [{"period":"时间段","theme":"主题","advice":"具体行动（20字内）"}],
  "worst_periods": [{"period":"时间段","risk":"风险","fallback":"应对（20字内）"}],
  "rhythm_advice": "按时间节奏的行动建议（80-120字，分2-3个阶段，每个阶段含具体动作）",
  "stop_doing_list": ["禁止事项1（含命理依据）","禁止事项2（含命理依据）","禁止事项3（含命理依据）"],
  "correct_strategy": "正确打法（60-100字，含3-6个月具体方案）",
  "closing_line": "落一句最实在的话（30字以内，像朋友直接跟你说，有记忆点）",
  "derivation_steps": [{"step":"步骤1名称","reasoning":"推导逻辑（30字内）"},{"step":"步骤2名称","reasoning":"推导逻辑（30字内）"}],
  "evidenceTags": ["证据标签1","证据标签2","证据标签3"]
}`
      : `{
  "overview": "80-150字今日总提醒，必须包含：1)日主与今日天干的关系及影响 2)当前大运的核心主题 3)今日行动方向",
  "today_verdict": "今日一句话定性（15-30字，有记忆点，如'今日适合守财不动，不适合冲动决策'）",
  "ganzhi_analysis": "今日干支与日主关系详解（40-60字，含十神解读+五行冲合+具体影响）",
  "shi_shen_today": "今日天干与日主的十神关系及具体影响（30-50字）",
  "dayun_focus": "当前大运阶段的核心主题与注意事项（30-50字）",
  "wuxing_tuning": "基于五行喜忌的今日调候建议，包含颜色、方位、饮食（30-50字）",
  "focus_area": {"area":"今日最值得聚焦的领域","reason":"原因（20字内）"},
  "daily_tips": [
    {"date":"今日","tip":"具体行动提醒（含十神或大运依据）","lucky_direction":"行动方位或场景","lucky_color":"颜色"},
    {"date":"明日","tip":"具体行动提醒","lucky_direction":"行动方位或场景","lucky_color":"颜色"},
    {"date":"后日","tip":"具体行动提醒","lucky_direction":"行动方位或场景","lucky_color":"颜色"}
  ],
  "stop_doing": ["今日不要做的事1","今日不要做的事2"],
  "warnings": ["风险提醒1（含具体场景）","风险提醒2（含具体场景）"],
  "closing_line": "落一句最实在的话（30字以内，今日行动口诀）",
  "evidenceTags": ["证据标签1","证据标签2","证据标签3"]
}`;

    const userPrompt = [
      `模块：${moduleId === 'breakthrough' ? '深入推演' : '醒神早贴'}`,
      '算法证据包：',
      evidence,
      '请按下面 schema 输出 JSON：',
      schema,
    ].join('\n\n');

    const response = await this.llmProviders.chatWithUser(
      userPrompt,
      systemPrompt,
      providerInfo.provider,
      {
        temperature: 0.25,
        maxTokens: moduleId === 'breakthrough' ? 1800 : 900,
        timeout: moduleId === 'breakthrough' ? 55000 : 30000,
        jsonMode: true,
      },
    );

    const parsed = this.parseLlmJson(response.content);
    const schemaValid = this.validateModuleSchema(parsed, moduleId);
    const qualityScore = this.computeQualityScore(parsed, schemaValid);

    // v1.5: 统一质量治理
    const qualityResult = checkLlmQuality(parsed, moduleId);
    if (!qualityResult.passed) {
      this.logger.warn(`[QualityGuard] ${moduleId} 质量不达标: score=${qualityResult.qualityScore}, flags=${qualityResult.validationFlags.join(',')}`);
    }
    // 使用新的质量分（如果比旧的高则用新的，否则保留旧的兜底）
    const finalQualityScore = Math.max(qualityScore, qualityResult.qualityScore);

    return {
      ...parsed,
      qualityScore: finalQualityScore,
      schemaValid,
      provider: response.provider,
      model: response.model,
    };
  }

  /**
   * 生成深入推演(breakthrough)内容 - 基于正确的八字数据
   */
  private async generateBreakthroughContent(record: any, llmResult: LlmResult, calcResult: CalcResult): Promise<any> {
    try {
      if (record.routeType === 'liuren') {
        return this.buildLiurenBreakthroughFallback(record, calcResult, llmResult);
      }

      const caseResult = llmResult?.provider && llmResult.provider !== 'algorithm' && llmResult?.schemaValid === true
        ? llmResult
        : await this.generateFastModuleJson('breakthrough', record, calcResult);
      const evidenceTags = caseResult.evidence_tags || caseResult.evidenceTags || [];
      const bazi = calcResult?.calcData || {};
      const currentDaYun = bazi.daYun?.[0];

      const algorithmicFallback = this.buildAlgorithmicBreakthroughFallback(bazi, currentDaYun);

      const overview = this.cleanLlmDisplayText(caseResult.overview || caseResult.summary_body || caseResult.one_line_conclusion) || algorithmicFallback.overview;
      const patternName = caseResult.pattern_name || algorithmicFallback.pattern_name;
      const patternReasoning = caseResult.pattern_reasoning || algorithmicFallback.pattern_reasoning;
      const classicQuote = caseResult.classic_quote || algorithmicFallback.classic_quote;
      const classicApplication = caseResult.classic_application || algorithmicFallback.classic_application;
      const careerFortune = this.cleanLlmDisplayText(caseResult.career_fortune) || algorithmicFallback.career_fortune;
      const wealthFortune = this.cleanLlmDisplayText(caseResult.wealth_fortune) || algorithmicFallback.wealth_fortune;
      const relationshipFortune = this.cleanLlmDisplayText(caseResult.relationship_fortune) || algorithmicFallback.relationship_fortune;
      const healthFortune = this.cleanLlmDisplayText(caseResult.health_fortune) || algorithmicFallback.health_fortune;
      const bestPeriods = Array.isArray(caseResult.best_periods) && caseResult.best_periods.length > 0
        ? caseResult.best_periods : algorithmicFallback.best_periods;
      const worstPeriods = Array.isArray(caseResult.worst_periods) && caseResult.worst_periods.length > 0
        ? caseResult.worst_periods : algorithmicFallback.worst_periods;
      const rhythmAdvice = this.cleanLlmDisplayText(caseResult.rhythm_advice) || algorithmicFallback.rhythm_advice;
      const stopDoingList = Array.isArray(caseResult.stop_doing_list) && caseResult.stop_doing_list.length > 0
        ? caseResult.stop_doing_list : algorithmicFallback.stop_doing_list;
      const correctStrategy = this.cleanLlmDisplayText(caseResult.correct_strategy) || algorithmicFallback.correct_strategy;

      return {
        title: '深入推演分析',
        subtitle: patternName,
        overview,
        pattern_name: patternName,
        pattern_reasoning: patternReasoning,
        classic_quote: classicQuote,
        classic_application: classicApplication,
        career_fortune: careerFortune,
        wealth_fortune: wealthFortune,
        relationship_fortune: relationshipFortune,
        health_fortune: healthFortune,
        best_periods: bestPeriods,
        worst_periods: worstPeriods,
        rhythm_advice: rhythmAdvice,
        stop_doing_list: stopDoingList,
        correct_strategy: correctStrategy,
        evidenceTags,
        qualityScore: caseResult.qualityScore,
        schemaValid: caseResult.schemaValid,
        provider: caseResult.provider,
        model: caseResult.model,
      };
    } catch (error) {
      if (this.isLlmTimeout(error)) {
        if (record.userId) {
          this.membershipService.refundCredit(record.userId, 'breakthrough', record.id).catch(e =>
            this.logger.error('[ConsultService]退还积分失败:', e),
          );
        }
        return this.timeoutModuleContent('breakthrough');
      }
      this.logger.error('[ConsultService]深入推演 LLM 生成失败:', error);
      if (record.userId) {
        this.membershipService.refundCredit(record.userId, 'breakthrough', record.id).catch(e =>
          this.logger.error('[ConsultService]退还积分失败:', e),
        );
      }
      return {
        ...this.timeoutModuleContent('breakthrough'),
        title: '深入推演生成失败',
        message: '深入推演暂时生成失败，请稍后重试。本次不输出模板兜底，也不会扣除积分。',
      };
    }
  }

  private buildLiurenBreakthroughFallback(record: any, calcResult: CalcResult, llmResult: any): any {
    const data = (calcResult?.calcData || calcResult || {}) as any;
    const question = record.question || '当前问题';
    const keTi = data.keTi || '未定课体';
    const yueJiang = data.tianDiPan?.yueJiang || data.yueJiang || '-';
    const siKe = this.formatLiurenSiKe(data.siKe) || '-';
    const sanChuan = this.formatLiurenSanChuan(data.sanChuan) || '-';
    const first = data.sanChuan?.[0];
    const middle = data.sanChuan?.[1];
    const last = data.sanChuan?.[2];
    const rendered = typeof llmResult?.rendered_output === 'string' ? llmResult.rendered_output : '';
    const zhangbanshan = llmResult?.zhangbanshan_output || {};
    const evidenceTags = [
      keTi !== '未定课体' ? `课体:${keTi}` : '',
      yueJiang !== '-' ? `月将:${yueJiang}` : '',
      first?.gan && first?.zhi ? `初传:${first.gan}${first.zhi}` : '',
      middle?.gan && middle?.zhi ? `中传:${middle.gan}${middle.zhi}` : '',
      last?.gan && last?.zhi ? `末传:${last.gan}${last.zhi}` : '',
    ].filter(Boolean);

    return {
      title: '深入推演分析',
      subtitle: `${keTi} · 问事推演`,
      overview: `${question}这件事，先看发端，再看转折，最后看收束。当前课体为${keTi}，月将${yueJiang}，三传${sanChuan}，判断重点不在“你命里如何”，而在“这件事接下来怎么走、哪里会卡、该先动哪一步”。`,
      pattern_name: `${keTi}问事局`,
      pattern_reasoning: `以课体${keTi}定主调，以三传“${sanChuan}”看事情从起因、转折到结果的推进节律。`,
      classic_quote: '三传主事之来去',
      classic_application: `这件事以三传为主线：初传看眼前局， 中传看卡点，末传看落点；月将${yueJiang}补充当下环境气机。`,
      career_fortune: first?.gan && first?.zhi
        ? `眼前最要紧的是先处理“${first.gan}${first.zhi}”对应的发端问题。先把现实条件、关键人态度、资源是否到位核清，再决定进退，不适合一上来就下重手。`
        : `先核对事情发端：谁在推动，谁在拖延，资源卡在哪里。没有把起点看清，后面每一步都会变形。`,
      wealth_fortune: middle?.gan && middle?.zhi
        ? `真正的变量在中传“${middle.gan}${middle.zhi}”。如果这里对应的是资金、合同、时间窗，就先做风险收口和条件交换；别把希望压在一次性翻盘。`
        : `中段最怕条件反复。钱、合同、时间窗三件事要分别锁死，避免边做边改导致损耗。`,
      relationship_fortune: last?.gan && last?.zhi
        ? `结果落点看末传“${last.gan}${last.zhi}”。这通常对应最后拍板的人、最终执行面，或事情真正会落到的场景。不要只盯过程，要提前布局最终落点。`
        : `这件事最后成不成，取决于最终执行面，而不是当下说得好不好听。`,
      health_fortune: `这类问事局更大的风险不是“命理健康”，而是决策节奏失控：着急定、反复改、被他人牵着走。要防冲动、防误判、防信息残缺。`,
      best_periods: [
        {
          period: '未来3天',
          theme: '核实发端',
          advice: first?.gan && first?.zhi ? `围绕${first.gan}${first.zhi}对应问题补齐事实` : '先补事实，不先做判断',
        },
        {
          period: '未来7-14天',
          theme: '观察转折',
          advice: middle?.gan && middle?.zhi ? `盯住${middle.gan}${middle.zhi}对应的变量` : '看变量，不赌结果',
        },
      ],
      worst_periods: [
        {
          period: '条件未核清之前',
          risk: '误判局势、提前下注',
          fallback: '先收集证据，再决定要不要推进',
        },
        {
          period: '出现反复改口或临时变卦时',
          risk: '节奏被对方带走',
          fallback: '改成小步试探，不做重承诺',
        },
      ],
      rhythm_advice: `第一步先把四课“${siKe}”对应的人、事、条件摆清。第二步顺着三传“${sanChuan}”拆成发端、转折、收束三段，每段只解决一个关键变量。第三步在结果落点明确前，所有承诺都留退路。`,
      stop_doing_list: [
        '不要把问事局误读成命盘定终身，重点是这件事的时局变化。',
        '不要在条件没核实前追加投入、承诺或摊牌。',
        '不要只听口头反馈，关键节点必须看实际动作和书面结果。',
      ],
      correct_strategy: `这件事的正确打法，是先校验现实证据，再卡转折点出手。你现在最该做的不是继续猜，而是把关键人、关键条件、关键时间窗逐项锁定，然后用一次小动作测试局势。`,
      closing_line: '先看局，再出手；先试探，再压注。',
      evidenceTags,
      rendered_output: rendered || undefined,
      reasoning_trace: zhangbanshan.reasoning_trace || undefined,
      qualityScore: 82,
      schemaValid: true,
      provider: llmResult?.provider || 'algorithm',
      model: llmResult?.model || 'calc-engine',
    };
  }

  private buildAlgorithmicBreakthroughFallback(bazi: BaziCalcData, currentDaYun: any): any {
    const dayGan = bazi.dayPillar?.[0] || '甲';
    const dayWuxing = WUXING_TIANGAN[dayGan] || '木';
    const strength = this.estimateBaziStrength(bazi);
    const yongJi = this.estimateYongJi(dayGan, strength.isStrong);

    const monthGan = bazi.monthPillar?.[0] || '甲';
    const monthWuxing = WUXING_TIANGAN[monthGan] || '木';
    const SHISHEN_MAP: Record<string, Record<string, string>> = {
      '木': { '木': '比肩', '火': '食神', '土': '偏财', '金': '七杀', '水': '偏印' },
      '火': { '火': '比肩', '土': '食神', '金': '偏财', '水': '七杀', '木': '偏印' },
      '土': { '土': '比肩', '金': '食神', '水': '偏财', '木': '七杀', '火': '偏印' },
      '金': { '金': '比肩', '土': '偏印', '水': '食神', '木': '偏财', '火': '七杀' },
      '水': { '水': '比肩', '金': '偏印', '木': '食神', '火': '偏财', '土': '七杀' },
    };
    const monthShiShen = SHISHEN_MAP[dayWuxing]?.[monthWuxing] || '比肩';

    const patternMap: Record<string, string> = {
      '正财': '正财格', '偏财': '偏财格', '正官': '正官格', '七杀': '七杀格',
      '正印': '正印格', '偏印': '偏印格', '食神': '食神格', '伤官': '伤官格',
    };
    const patternName = patternMap[monthShiShen]
      ? `${patternMap[monthShiShen]}${strength.isStrong ? '，身旺担财' : '，身弱需印'}`
      : `${dayWuxing}日主${strength.isStrong ? '身旺' : '身弱'}格`;

    const dayunDesc = currentDaYun
      ? `当前${currentDaYun.full}大运，${SHISHEN_MAP[dayWuxing]?.[WUXING_TIANGAN[currentDaYun.gan || currentDaYun.full?.[0]] || dayWuxing] || '比肩'}当值，`
      : '';

    const careerMap: Record<string, string> = {
      '正财': '适合稳定收入型工作，利回款、催账、老客户维护。不宜重仓投资或冒险扩张。',
      '偏财': '有意外收入机会，但不宜贪快。适合轻资产合作、短期项目，忌高杠杆。',
      '正官': '利升职、拿资质、走正规路线。适合管理岗、制度内发展，忌与上级硬碰。',
      '七杀': '压力大但有突破机会。适合技术攻坚、竞争上岗，忌冲动决策和顶撞权威。',
      '正印': '利学习、考证、贵人提携。适合培训、顾问、资质型业务，忌贪财坏印。',
      '偏印': '利深度思考、技术研究。适合独立工作、创新领域，忌多疑犹豫和过度内耗。',
      '食神': '利表达、创作、专业输出。适合教学、方案输出、产品化，忌懒散和过度享乐。',
      '伤官': '利创新突破、技术变革。适合创业、改革、技术突破，忌顶撞上级和签长期合同。',
    };

    const healthMap: Record<string, string> = {
      '木': '注意肝胆、筋骨、眼睛、情绪波动。忌熬夜和过度饮酒。',
      '火': '注意心火、血压、睡眠、口腔、眼睛。忌暴怒和连续应酬。',
      '土': '注意脾胃、消化、肌肉、口腔。忌暴饮暴食和过度思虑。',
      '金': '注意呼吸系统、皮肤、大肠。忌干燥环境和过度劳累。',
      '水': '注意腰肾、泌尿、生殖、骨骼。忌寒凉和过度疲劳。',
    };

    return {
      overview: `${dayGan}${dayWuxing}日主，${strength.isStrong ? '身旺' : '身弱'}，${patternName}。${dayunDesc}流年火旺${strength.isStrong ? '泄秀生财' : '印旺生身'}，行动方向：${strength.isStrong ? '守正财、不逐偏财' : '借贵人、稳中求进'}。`,
      pattern_name: patternName,
      pattern_reasoning: `月令${monthGan}${monthWuxing}为${monthShiShen}，${monthShiShen}透月干立格。日主${dayGan}${strength.isStrong ? '得令得地，身旺可担财官' : '失令或失地，需印比扶身'}。`,
      classic_quote: '八字用神，专求月令',
      classic_application: `月令${monthGan}为${monthShiShen}，格局以${monthShiShen}为纲。${strength.isStrong ? '身旺宜泄宜克，食伤生财为顺' : '身弱宜生宜扶，印比帮身为吉'}。`,
      career_fortune: careerMap[monthShiShen] || `事业以${monthShiShen}为主线，${strength.isStrong ? '宜主动出击、争取项目主导权' : '宜借平台和贵人、稳中求进'}。`,
      wealth_fortune: `${strength.isStrong ? '身旺能担财，有赚钱机会但留财难' : '身弱财多反为患，不宜贪大求快'}。${dayunDesc}今年重点是${strength.isStrong ? '收款、控成本、控杠杆' : '借平台、借资质、借贵人变现'}。禁忌：${strength.isStrong ? '不替人担保、不做高杠杆投资' : '不裸辞、不重仓、不合伙赌项目'}。`,
      relationship_fortune: `日支${bazi.dayPillar?.[1] || '子'}为${strength.isStrong ? '财星坐日支，伴侣有助力但易因财务意见不合' : '印星坐日支，伴侣偏照顾型但易因沟通不足生闷气'}。合作必须合同化，亲友钱财分清。`,
      health_fortune: healthMap[dayWuxing] || '注意劳逸结合，避免过度疲劳。',
      best_periods: [
        { period: '当前-3个月后', theme: `${monthShiShen}发力期`, advice: strength.isStrong ? '收旧账、催回款、清库存' : '考证、学技能、找贵人' },
        { period: '3-6个月后', theme: '财星动', advice: '谈合作、报价、客户变现' },
      ],
      worst_periods: [
        { period: '火土最旺月', risk: '冲动决策、健康透支', fallback: '收缩战线、少做决定' },
        { period: '财星被冲月', risk: '破财、合同纠纷', fallback: '不签大合同、不借钱' },
      ],
      rhythm_advice: `第一阶段（当前-3个月）：${strength.isStrong ? '先收款、清账、控风险' : '先学习、拿资质、建人脉'}。第二阶段（3-6个月）：${strength.isStrong ? '把能赚钱的老资源重新包装推出' : '把学到的能力变成可收费的服务'}。第三阶段（6个月后）：复盘调整，${strength.isStrong ? '钱落袋为安' : '逐步扩大收入来源'}。`,
      stop_doing_list: [
        `不替人担保（${dayGan}${dayWuxing}日主${strength.isStrong ? '财旺易散' : '身弱难承'}）`,
        `不做高杠杆投资（${monthShiShen}格忌贪偏财）`,
        `不和规则、领导硬碰（流年印旺，宜借制度上位）`,
      ],
      correct_strategy: `从现在起3-6个月：${strength.isStrong ? '把过去分散的资源重新整理成稳定现金流，先收款后交付，先合同后投入' : '先补能力补资质，借平台和贵人上位，把经验产品化后再谈变现'}。不是缺机会，而是要把机会关进制度里。`,
    };
  }

  private generateBreakthroughKeyPoints(calcResult: CalcResult): string[] {
    if (!calcResult?.calcData) {
      return ['局势分析中...', '时机把握中...', '趋势推演中...', '策略制定中...', '路径规划中...'];
    }
    const dayPillar = calcResult.calcData.dayPillar || '甲';
    const dayGan = dayPillar[0];
    const wuxing = calcResult.calcData.wuxing || {};

    // 根据日干生成个性化要点
    const points = [
      `日主${dayGan}，需根据五行配置调整策略`,
      `五行分布：木${wuxing.wood || 0}、火${wuxing.fire || 0}、土${wuxing.earth || 0}、金${wuxing.metal || 0}、水${wuxing.water || 0}`,
      '大运流转中，把握关键节点尤为重要',
      '顺势而为，因势利导',
      '突破困境需要内外兼修',
    ];
    return points;
  }

  private generateBreakthroughPath(calcResult: CalcResult): any[] {
    return [
      {
        phase: '第一阶段（1-30天）',
        title: '奠基期',
        description: '夯实基础，整合资源',
        actions: ['梳理核心优势', '评估外部环境', '制定初步计划'],
      },
      {
        phase: '第二阶段（31-90天）',
        title: '突破期',
        description: '集中力量，寻求突破',
        actions: ['抓住关键机遇', '优化资源配置', '动态调整策略'],
      },
      {
        phase: '第三阶段（91-180天）',
        title: '稳定期',
        description: '巩固成果，扩大战果',
        actions: ['建立稳定模式', '扩展影响力', '形成良性循环'],
      },
    ];
  }

  private generateBreakthroughRisks(calcResult: CalcResult): string[] {
    if (!calcResult?.calcData) {
      return ['注意农历月份的冲煞影响', '合作对象需要仔细甄别'];
    }
    const daYun = calcResult.calcData.daYun || [];
    const currentYun = daYun[0];

    const risks = ['注意农历月份的冲煞影响', '合作对象需要仔细甄别'];

    if (currentYun) {
      // 根据大运天干提醒
      const ganRisks: Record<string, string> = {
        '丁': '注意心血管健康，避免过度劳累',
        '丙': '注意情绪管理，避免冲动决策',
        '辛': '注意肺部呼吸，避免金属伤害',
        '壬': '注意肾脏泌尿，避免水厄',
      };
      const risk = ganRisks[currentYun.gan];
      if (risk) risks.push(risk);
    }

    return risks;
  }

  private generateBreakthroughRecommendations(calcResult: CalcResult): string[] {
    if (!calcResult?.calcData) {
      return ['建议在农历三月采取行动', '东南方向有利于项目推进'];
    }
    const wuxing = calcResult.calcData.wuxing || {};
    const recommendations: string[] = [];

    // 根据五行强弱给出建议
    if ((wuxing.wood || 0) < 2) {
      recommendations.push('木弱之人宜多接触绿色植物，利东方发展');
    }
    if ((wuxing.fire || 0) < 2) {
      recommendations.push('火弱之人宜多晒太阳，利南方活动');
    }
    if ((wuxing.earth || 0) < 2) {
      recommendations.push('土弱之人宜多户外活动，利中原地区');
    }
    if ((wuxing.metal || 0) < 2) {
      recommendations.push('金弱之人宜多接触金属，利西方发展');
    }
    if ((wuxing.water || 0) < 2) {
      recommendations.push('水弱之人宜多近水活动，利北方发展');
    }

    if (recommendations.length === 0) {
      recommendations.push('五行较为平衡，保持现有状态即可');
      recommendations.push('顺势而为，把握大运转换期的机遇');
    }

    return recommendations.slice(0, 3);
  }

  /**
   * 生成早知道(morning)内容
   */
  private async generateMorningContent(record: any, llmResult: LlmResult, calcResult: CalcResult): Promise<any> {
    try {
      const caseResult = llmResult?.provider && llmResult.provider !== 'algorithm' && llmResult?.schemaValid === true
        ? llmResult
        : await this.generateFastModuleJson('morning', record, calcResult);
      const bazi = calcResult?.calcData || {};
      const currentDaYun = bazi.daYun?.[0];
      const actions = this.normalizeActions(caseResult.actions || caseResult.recommendations);
      const risks = this.normalizeRisks(caseResult.warnings || caseResult.risks);
      const dailyTips = Array.isArray(caseResult.daily_tips) ? caseResult.daily_tips : [];

      const wuxingDerived = this.deriveLuckyFromWuxing(bazi);
      const algorithmicFallback = this.buildAlgorithmicMorningFallback(bazi, currentDaYun, wuxingDerived);

      const overview = caseResult.one_line_conclusion || caseResult.summary_line || caseResult.overview || algorithmicFallback.overview;
      const shiShenToday = caseResult.shi_shen_today || algorithmicFallback.shi_shen_today;
      const dayunFocus = caseResult.dayun_focus || algorithmicFallback.dayun_focus;
      const wuxingTuning = caseResult.wuxing_tuning || algorithmicFallback.wuxing_tuning;
      const focusArea = caseResult.focus_area || algorithmicFallback.focus_area;
      const stopDoing = Array.isArray(caseResult.stop_doing) && caseResult.stop_doing.length > 0
        ? caseResult.stop_doing : algorithmicFallback.stop_doing;

      return {
        title: '醒神早贴',
        subtitle: '基于日柱、大运与当前问题的今日提醒',
        overview,
        shi_shen_today: shiShenToday,
        dayun_focus: dayunFocus,
        wuxing_tuning: wuxingTuning,
        focus_area: focusArea,
        daily_tips: dailyTips.length > 0 ? dailyTips.map((tip: any) => ({
          ...tip,
          lucky_direction: tip.lucky_direction || wuxingDerived.direction,
          lucky_color: tip.lucky_color || wuxingDerived.color,
        })) : algorithmicFallback.daily_tips,
        stop_doing: stopDoing,
        warnings: risks.length > 0 ? risks.slice(0, 3) : algorithmicFallback.warnings,
        evidenceTags: caseResult.evidence_tags || caseResult.evidenceTags || [],
        qualityScore: caseResult.qualityScore,
        schemaValid: caseResult.schemaValid,
        provider: caseResult.provider,
        model: caseResult.model,
      };
    } catch (error) {
      if (this.isLlmTimeout(error)) {
        return this.timeoutModuleContent('morning');
      }
      this.logger.error('[ConsultService]醒神早贴 LLM 生成失败:', error);
      return {
        ...this.timeoutModuleContent('morning'),
        title: '醒神早贴生成失败',
        message: '醒神早贴暂时生成失败，请稍后重试。本次不输出模板兜底，也不会扣除积分。',
      };
    }
  }

  private buildAlgorithmicMorningFallback(bazi: BaziCalcData, currentDaYun: any, wuxingDerived: any): any {
    // GAN, ZHI, WUXING_TIANGAN — 已从 bazi-data.service.ts 统一导入
    const SHISHEN_MAP: Record<string, Record<string, string>> = {
      '木': { '木': '比肩/劫财', '火': '食神/伤官', '土': '偏财/正财', '金': '七杀/正官', '水': '偏印/正印' },
      '火': { '火': '比肩/劫财', '土': '食神/伤官', '金': '偏财/正财', '水': '七杀/正官', '木': '偏印/正印' },
      '土': { '土': '比肩/劫财', '金': '食神/伤官', '水': '偏财/正财', '木': '七杀/正官', '火': '偏印/正印' },
      '金': { '金': '比肩/劫财', '土': '偏印/正印', '水': '食神/伤官', '木': '偏财/正财', '火': '七杀/正官' },
      '水': { '水': '比肩/劫财', '金': '偏印/正印', '木': '食神/伤官', '火': '偏财/正财', '土': '七杀/正官' },
    };

    const dayGan = bazi.dayPillar?.[0] || '甲';
    const dayWuxing = WUXING_TIANGAN[dayGan] || '木';
    const today = new Date();
    const jdn = Math.floor(today.getTime() / 86400000) + 2440588;
    const todayGanIndex = (jdn + 9) % 10;
    const todayZhiIndex = (jdn + 1) % 12;
    const todayGan = GAN[todayGanIndex];
    const todayZhi = ZHI[todayZhiIndex];
    const todayGanZhi = `${todayGan}${todayZhi}`;
    const todayWuxing = WUXING_TIANGAN[todayGan] || '木';

    const shiShenRelation = SHISHEN_MAP[dayWuxing]?.[todayWuxing] || '比肩/劫财';
    const isYangDay = GAN.indexOf(dayGan) % 2 === 0;
    const isYangToday = todayGanIndex % 2 === 0;
    const shiShenType = isYangDay === isYangToday ? shiShenRelation.split('/')[0] : shiShenRelation.split('/')[1];

    const strength = this.estimateBaziStrength(bazi);
    const yongJi = this.estimateYongJi(dayGan, strength.isStrong);

    const shiShenEffects: Record<string, { focus: string; tip: string; avoid: string }> = {
      '比肩': { focus: '竞争与合作', tip: '比肩当值，身边人的步伐与你相近，与其争高下不如各取所长——今天适合把精力放在你自己最擅长的那件事上', avoid: '不要与人争利，合伙决策容易各执一词，今天先各自做好自己的部分' },
      '劫财': { focus: '资源与防守', tip: '劫财临日，钱和精力都容易在不知不觉中散掉——今天的主旋律是守，而不是冲', avoid: '不要借贷、投资，也别做大额消费，今天守住就是赚到' },
      '食神': { focus: '创意与表达', tip: '食神当值，思路比平时活络得多——脑子里冒出来的点子值得记下来，今天表达和创作都比平时顺畅', avoid: '不要压抑你的表达欲，也别因为想太多而错过开口的机会' },
      '伤官': { focus: '突破与变革', tip: '伤官临日，脑子里那根弦有点松，胆子却比平时大——适合做技术上的新尝试，但情绪容易上头', avoid: '不要顶撞上级或拍桌子做决定，也别签那些一签就是几年的合同' },
      '偏财': { focus: '机遇与收放', tip: '偏财当值，可能会有计划之外的收入或机会找上门——来得快去得也快，关键是你能不能接住、又能不能及时收手', avoid: '不要贪心追涨，任何让你"再不进场就晚了"的感觉，今天都先冷静一下' },
      '正财': { focus: '稳定与积累', tip: '正财临日，适合做那些"不急但重要"的事——稳健的理财动作、固定的收入来源，今天都值得你多花点时间', avoid: '不要冒险投机，高风险操作今天容易踩坑，稳扎稳打才是正解' },
      '七杀': { focus: '压力与破局', tip: '七杀当值，今天的压力是真的，不是错觉——但压力往往也逼出你最硬的那一面，扛过去就是一次升级', avoid: '不要跟人硬碰硬，冲动之下做的决定，十有八九要后悔' },
      '正官': { focus: '规则与晋升', tip: '正官临日，秩序感和责任感都在线——适合汇报、面试、走正式流程，今天按规矩办事反而最省力', avoid: '不要违反规则，也别临时变卦——今天的"规矩"是你的保护伞，不是束缚' },
      '偏印': { focus: '学习与内省', tip: '偏印当值，大脑适合吸收新东西——今天学到的知识、琢磨明白的道理，比平时记得更牢', avoid: '不要做大决定，也别轻信别人画的大饼，今天适合思考而非拍板' },
      '正印': { focus: '贵人与借力', tip: '正印临日，身边愿意帮你的人比你以为的多——今天开口求助不是示弱，是聪明', avoid: '不要一个人扛所有事，也别忽视别人递过来的善意——接受帮助也是一种能力' },
    };

    const effect = shiShenEffects[shiShenType] || shiShenEffects['比肩'];

    const dayunDesc = currentDaYun
      ? `你现在正处于${currentDaYun.full}大运（${currentDaYun.startAge}-${currentDaYun.endAge}岁），这十年的大运天干${currentDaYun.gan || currentDaYun.full?.[0]}与你的日主${dayGan}构成${SHISHEN_MAP[dayWuxing]?.[WUXING_TIANGAN[currentDaYun.gan || currentDaYun.full?.[0]] || dayWuxing]?.split('/')[0] || '比肩'}关系，所以这段时间你的注意力天然会落在${effect.focus}这个方向上`
      : '大运信息暂缺，以下提醒以今日流日十神为主，仍值得认真对待。';

    const yongElement = yongJi.yong[0] || '木';
    const luckyColors: Record<string, string[]> = {
      '木': ['青色', '绿色'], '火': ['红色', '紫色'], '土': ['黄色', '棕色'],
      '金': ['白色', '金色'], '水': ['蓝色', '黑色'],
    };
    const luckyDirs: Record<string, string> = {
      '木': '东方', '火': '南方', '土': '中央', '金': '西方', '水': '北方',
    };

    const dayunContext = currentDaYun ? `，配合你当前${currentDaYun.full}大运的步调` : '';

    return {
      overview: `${shiShenType}当值，${effect.tip}${dayunContext}——今天记得把注意力放在${effect.focus}上`,
      shi_shen_today: `今日${todayGanZhi}，${todayGan}（${todayWuxing}）与你日主${dayGan}（${dayWuxing}）构成${shiShenType}关系。${effect.tip}`,
      dayun_focus: dayunDesc,
      wuxing_tuning: `你的命局喜${yongElement}，今天可以从这些小细节入手：穿${luckyColors[yongElement]?.[0] || '白色'}或${luckyColors[yongElement]?.[1] || '金色'}的衣服，多面向${luckyDirs[yongElement] || '南方'}活动，饮食上多吃${yongElement === '木' ? '绿色蔬菜' : yongElement === '火' ? '红色食物' : yongElement === '土' ? '黄色谷物' : yongElement === '金' ? '白色食材' : '黑色食材'}——不用刻意，顺手就行`,
      focus_area: { area: effect.focus, reason: `今日${shiShenType}当值，${effect.focus}是你今天最值得花精力的地方` },
      daily_tips: [
        { date: '今日', tip: effect.tip, lucky_direction: luckyDirs[yongElement] || '南方', lucky_color: luckyColors[yongElement]?.[0] || '白色' },
        { date: '明日', tip: `${shiShenType}的影响还在延续，${effect.focus}上的事今天没做完的，明天接着推进会更顺`, lucky_direction: luckyDirs[yongElement] || '南方', lucky_color: luckyColors[yongElement]?.[1] || '金色' },
        { date: '后日', tip: `进入十神转换期，适合停下来回顾一下这两天在${effect.focus}上做得怎么样，调整比赶路更重要`, lucky_direction: luckyDirs[yongElement] || '南方', lucky_color: luckyColors[yongElement]?.[0] || '白色' },
      ],
      stop_doing: [
        effect.avoid,
        `忌${yongJi.ji[0] || '水'}相关行为（${yongJi.ji[0] === '木' ? '过度扩张反而失控' : yongJi.ji[0] === '火' ? '冲动行事伤己伤人' : yongJi.ji[0] === '土' ? '贪多求全反而一事无成' : yongJi.ji[0] === '金' ? '刚愎自用错失良机' : '犹豫不决错过窗口'}）`,
      ],
      warnings: [
        `今日${todayGanZhi}与日主${dayGan}为${shiShenType}关系，${shiShenType === '七杀' ? '压力大到想掀桌也正常，但先深呼吸——今天的坎，过去了就是你的底气' : shiShenType === '伤官' ? '今天脑子里想说的东西不少，但说之前多想三秒——你不想因为一句话得罪一个不该得罪的人' : shiShenType === '劫财' ? '花钱的念头今天特别活跃，但花之前先想想是不是真的需要——今天被掏空的不是钱包，是安全感' : shiShenType === '偏财' ? '有意外机会别急着扑上去，先看三分钟再决定——今天"错过"往往比"踩错"划算' : '整体平稳，但平稳的时候反而容易松懈——今天把该做的事做好，就是最好的应对'}`,
      ],
    };
  }

  /**
   * 生成趋势(kline)内容 - 基于真实八字计算
   */
  private async generateKlineContent(record: any, llmResult: LlmResult, calcResult: CalcResult): Promise<any> {
    // 从 calcResult.inputData 或 record.inputData 提取出生信息
    let birthDate = '';
    let birthTime = '';
    let gender: 'male' | 'female' = 'male';

    if (calcResult?.inputData) {
      birthDate = calcResult.inputData.birthDate || calcResult.inputData.birth_date || '';
      birthTime = calcResult.inputData.birthTime || calcResult.inputData.birth_time || '';
      gender = calcResult.inputData.gender === 'female' ? 'female' : 'male';
    } else if (record.inputData) {
      const inputData = JSON.parse(record.inputData);
      birthDate = inputData.birthDate || inputData.birth_date || '';
      birthTime = inputData.birthTime || inputData.birth_time || '';
      gender = inputData.gender === 'female' ? 'female' : 'male';
    }

    // 解析出生日期
    const birthDateParts = birthDate.split(/[-T]/);
    const year = parseInt(birthDateParts[0]) || 1990;
    const month = parseInt(birthDateParts[1]) || 1;
    const day = parseInt(birthDateParts[2]) || 1;

    // 解析出生时间
    const timeParts = birthTime.split(/[:\s]/);
    const parsedHour = parseInt(timeParts[0], 10);
    const parsedMinute = parseInt(timeParts[1], 10);
    const hour = Number.isFinite(parsedHour) ? parsedHour : 12;
    const minute = Number.isFinite(parsedMinute) ? parsedMinute : 0;

    // 调用八字计算引擎
    let baziResult: BaziFullResult;
    try {
      baziResult = await this.baziCalculator.calculate({
        year,
        month: month - 1, // JS month is 0-11
        day,
        hour,
        minute,
        gender,
      });
    } catch (error) {
      this.logger.error('[ConsultService]Bazi calculation failed:', error);
      // 降级：返回空数据
      return this.getEmptyKlineContent();
    }

    // 生成 K 线数据：年度 0-100 岁 + 年月细线，统一走确定性 KlineGenerator，避免刷新抖动
    const yearData = this.klineGenerator.generateKLineData(baziResult, year, {
      birthTime,
      viewMode: 'life',
      rangeYears: 100,
    });
    const yearMonthData = this.klineGenerator.generateKLineData(baziResult, year, {
      birthTime,
      viewMode: 'yearMonth',
      rangeYears: 100,
    });

    const monthlyData = this.klineGenerator.generateMonthlyData(baziResult, year, birthTime);

    const trends = this.klineGenerator.generateTrends(baziResult, year);

    const keyNodes = this.klineGenerator.generateKeyNodes(baziResult, year);
    const klineMeta = this.klineGenerator.generateMeta(baziResult, year, yearData, birthTime);

    const wuxingAnalysis = this.generateWuxingAnalysis(baziResult);

    const dayunAnalysis = this.generateDayunAnalysis(baziResult);

    const maData = this.movingAverageService.calculateFullMA(yearData);

    const dailyFortune = this.fortuneService.calculateDaily(baziResult, new Date());

    const shortCycles = {
      day3: this.shortCycleGenerator.generateShortCycleData(baziResult, year, 'day3'),
      xun: this.shortCycleGenerator.generateShortCycleData(baziResult, year, 'xun'),
      month: this.shortCycleGenerator.generateShortCycleData(baziResult, year, 'month'),
      quarter: this.shortCycleGenerator.generateShortCycleData(baziResult, year, 'quarter'),
    };

    const celebrityCases = this.celebrityService.getCelebrityCases();
    const celebrityComparisons = celebrityCases
      .slice(0, 3)
      .map(celeb => ({
        celebrity: celeb,
        similarity: this.celebrityService.calculateSimilarity(baziResult, celeb),
      }))
      .sort((a, b) => b.similarity.overall_score - a.similarity.overall_score);

    let overview = '';
    let llmTimeout = false;
    try {
      overview = await this.generateLlmInterpretation(baziResult, llmResult);
    } catch (error) {
      if (this.isLlmTimeout(error)) {
        llmTimeout = true;
        overview = 'LLM 趋势总纲推演超时，请稍后重试。本次不输出 LLM 解读，也不会扣除积分；下方 K 线图仍为后台算法确定性生成。';
      } else {
        throw error;
      }
    }

    // v1.5: 从算法数据提取结构化字段，供前端直接消费
    const trendSummary = trends && trends.length > 0
      ? trends.map((t: any) => `${t.period || ''}: ${t.reason || ''}`).join('；')
      : '';
    const keyDrivers = keyNodes && keyNodes.length > 0
      ? keyNodes.slice(0, 5).map((n: any) => n.description || `${n.year || ''} ${n.type || ''}`)
      : [];
    const bestWindows = klineMeta?.bestWindow ? [klineMeta.bestWindow] : [];
    const riskWindows = klineMeta?.riskWindow ? [klineMeta.riskWindow] : [];
    const actionAdvice = dayunAnalysis && dayunAnalysis.length > 0
      ? dayunAnalysis.slice(0, 3).map((d: any) => d.summary || '').filter(Boolean).join('；')
      : '';

    // P0-8 修复: klineResult 接入主流程 — 原为 null 占位，前端虽不用但字段不应为 null
    // 填充实际 K 线数据，保持语义完整
    const klineResult: Record<string, unknown> = {
      yearData,
      yearMonthData,
      monthlyData,
      rangeYears: 100,
      currentAge: klineMeta.currentAge,
      confidence: klineMeta.confidence,
    };

    return {
      title: '趋势推演·K线图',
      subtitle: '用命理视角解读人生发展趋势',
      overview,
      trendSummary,
      keyDrivers,
      bestWindows,
      riskWindows,
      actionAdvice,
      llmTimeout,
      retryable: llmTimeout,
      noCharge: llmTimeout,
      klineResult,
      chartData: yearData,
      yearData,
      yearMonthData,
      rangeYears: 100,
      monthlyData,
      viewMode: 'life',
      currentAge: klineMeta.currentAge,
      currentDaYun: klineMeta.currentDaYun,
      confidence: klineMeta.confidence,
      bestWindow: klineMeta.bestWindow,
      riskWindow: klineMeta.riskWindow,
      trends,
      key_nodes: keyNodes,
      wuxing_analysis: wuxingAnalysis,
      dayun_analysis: dayunAnalysis,
      ma_data: maData,
      daily_fortune: dailyFortune,
      short_cycles: shortCycles,
      celebrity_comparisons: celebrityComparisons,
      meta: {
        birthDate,
        birthTime,
        gender,
        yearPillar: baziResult.yearPillar,
        monthPillar: baziResult.monthPillar,
        dayPillar: baziResult.dayPillar,
        hourPillar: baziResult.hourPillar,
        wuxing: baziResult.wuxing,
        naYin: baziResult.naYin,
        kline: klineMeta,
      },
    };
  }

  /**
   * 生成五行分析
   */
  private generateWuxingAnalysis(baziResult: BaziFullResult): any {
    const wuxing = baziResult.wuxing;
    const dayGan = baziResult.dayPillar[0];
    const dayWuxing = this.getGanWuxing(dayGan);

    // 计算五行强弱
    const total = (wuxing.wood || 0) + (wuxing.fire || 0) + (wuxing.earth || 0) + (wuxing.metal || 0) + (wuxing.water || 0);
    const wuxingRatio = {
      wood: Math.round((wuxing.wood / total) * 100) || 0,
      fire: Math.round((wuxing.fire / total) * 100) || 0,
      earth: Math.round((wuxing.earth / total) * 100) || 0,
      metal: Math.round((wuxing.metal / total) * 100) || 0,
      water: Math.round((wuxing.water / total) * 100) || 0,
    };

    // 找最强和最弱的五行
    const wuxingScores = [
      { name: '木', name_en: 'Wood', score: wuxing.wood || 0, ratio: wuxingRatio.wood },
      { name: '火', name_en: 'Fire', score: wuxing.fire || 0, ratio: wuxingRatio.fire },
      { name: '土', name_en: 'Earth', score: wuxing.earth || 0, ratio: wuxingRatio.earth },
      { name: '金', name_en: 'Metal', score: wuxing.metal || 0, ratio: wuxingRatio.metal },
      { name: '水', name_en: 'Water', score: wuxing.water || 0, ratio: wuxingRatio.water },
    ];

    wuxingScores.sort((a, b) => b.score - a.score);
    const strongest = wuxingScores[0];
    const weakest = wuxingScores[4];

    // 找出缺的五行（低于20%）
    const lacking = wuxingScores.filter(w => w.ratio < 20).map(w => w.name);

    return {
      dayElement: dayWuxing,
      dayElementCn: this.getElementChineseName(dayWuxing),
      ratios: wuxingRatio,
      strongest: { name: strongest.name, name_en: strongest.name_en, ratio: strongest.ratio },
      weakest: { name: weakest.name, name_en: weakest.name_en, ratio: weakest.ratio },
      lacking,
      balance: this.getBalanceLevel(wuxingRatio),
      suggestions: this.getWuxingSuggestions(wuxingScores, dayWuxing),
    };
  }

  /**
   * 获取五行中文名
   */
  private getElementChineseName(element: string): string {
    const names: Record<string, string> = {
      '木': '木', '火': '火', '土': '土', '金': '金', '水': '水',
    };
    return names[element] || element;
  }

  /**
   * 获取五行平衡度
   */
  private getBalanceLevel(ratios: any): string {
    const values = Object.values(ratios) as number[];
    const max = Math.max(...values);
    const min = Math.min(...values);
    const diff = max - min;

    if (diff <= 15) return '平衡';
    if (diff <= 25) return '较平衡';
    if (diff <= 35) return '偏弱';
    return '偏强';
  }

  /**
   * 获取五行调理建议
   */
  private getWuxingSuggestions(wuxingScores: any[], dayElement: string): string[] {
    const suggestions: string[] = [];
    const weakest = wuxingScores[4];
    const strongest = wuxingScores[0];

    // 补弱势五行
    const supplementMap: Record<string, { colors: string; directions: string; foods: string; items: string }> = {
      '木': { colors: '青、绿色', directions: '东方、东南方', foods: '蔬菜、水果、绿茶', items: '木制家具、书籍、绿植' },
      '火': { colors: '红、紫色', directions: '南方', foods: '辣椒、红肉、羊肉', items: '电器、红色饰品、蜡烛' },
      '土': { colors: '黄、棕色', directions: '东北方、西南方', foods: '山药、红薯、牛肉', items: '陶瓷、紫水晶、石头摆件' },
      '金': { colors: '白、金色', directions: '西方、西北方', foods: '鸡鸭肉、白萝卜', items: '金属制品、白玉、硬币' },
      '水': { colors: '黑、蓝色', directions: '北方', foods: '鱼虾、海鲜、黑豆', items: '水景、鱼缸、黑色配饰' },
    };

    const supp = supplementMap[weakest.name];
    if (supp) {
      suggestions.push(`补充${weakest.name}气：穿着${supp.colors}，朝${supp.directions}方向活动`);
      suggestions.push(`${weakest.name}属性食物：${supp.foods}`);
      suggestions.push(`${weakest.name}属性物品：${supp.items}`);
    }

    return suggestions;
  }

  /**
   * 生成大运解读
   */
  private generateDayunAnalysis(baziResult: BaziFullResult): any {
    const dayGan = baziResult.dayPillar[0];
    const currentYear = new Date().getFullYear();
    const dayunAnalysis: any[] = [];

    for (const yun of baziResult.daYun.slice(0, 5)) {
      const startYear = new Date().getFullYear() - (yun.endAge - yun.startAge);
      const isCurrent = currentYear >= startYear && currentYear <= startYear + 10;
      const isPast = currentYear > startYear + 10;
      const isFuture = currentYear < startYear;

      const ganWuxing = this.getGanWuxing(yun.gan);
      const isShengen = this.isShengen(dayGan, yun.gan);
      const isXiaoRen = this.isXiaoRen(dayGan, yun.gan);

      let luckType = '平常';
      let luckScore = 60;
      if (isShengen) {
        luckType = '吉利';
        luckScore = 75 + Math.abs(this.deterministicOffset(`${yun.full}-good`)) % 15;
      } else if (isXiaoRen) {
        luckType = '欠佳';
        luckScore = 40 + Math.abs(this.deterministicOffset(`${yun.full}-risk`)) % 15;
      }

      dayunAnalysis.push({
        ageRange: `${yun.startAge}-${yun.endAge}岁`,
        ganZhi: yun.full,
        gan: yun.gan,
        zhi: yun.zhi,
        element: ganWuxing,
        luckType,
        luckScore,
        isCurrent,
        isPast,
        isFuture,
        description: this.getDaYunDescription(yun.gan, yun.zhi),
        highlights: this.getDaYunHighlights(yun.gan, yun.zhi, isShengen, isXiaoRen),
      });
    }

    return dayunAnalysis;
  }

  /**
   * 获取大运亮点
   */
  private getDaYunHighlights(gan: string, zhi: string, isShengen: boolean, isXiaoRen: boolean): string[] {
    const highlights: string[] = [];

    if (isShengen) {
      highlights.push('喜神到位，运势亨通');
    }
    if (isXiaoRen) {
      highlights.push('注意调整，谨慎行事');
    }

    // 根据天干特性
    const ganTraits: Record<string, string> = {
      '甲': '有领导力，利于事业拓展',
      '乙': '柔和变通，利于人际关系',
      '丙': '热情活力，利于表达展示',
      '丁': '细腻洞察，利于思考研究',
      '戊': '稳重厚实，利于积累沉淀',
      '己': '包容灵活，利于协调统筹',
      '庚': '刚健决断，利于改革突破',
      '辛': '精致锐利，利于精雕细琢',
      '壬': '流动智慧，利于学习传播',
      '癸': '内敛深沉，利于策划思考',
    };

    if (ganTraits[gan]) {
      highlights.push(ganTraits[gan]);
    }

    return highlights;
  }

  /**
   * 生成趋势分析
   */
  private generateTrends(baziResult: BaziFullResult): any[] {
    const trends: any[] = [];
    const currentYear = new Date().getFullYear();

    // 最近流年趋势
    for (let i = 0; i < 3; i++) {
      const liuNian = baziResult.liuNian[i];
      if (!liuNian) continue;

      const gan = liuNian.ganZhi[0];
      const zhi = liuNian.ganZhi[1];
      const ganWuxing = this.getGanWuxing(gan);

      // 判断趋势方向
      let direction = '震荡';
      let probability = 60;

      // 阳干且为日主所喜
      const dayGan = baziResult.dayPillar[0];
      if (this.isShengen(dayGan, gan)) {
        direction = '上升';
        probability = 75;
      } else if (this.isXiaoRen(dayGan, gan)) {
        direction = '调整';
        probability = 55;
      }

      // 综合判断
      const score = this.calculateTrendScore(gan, zhi, baziResult.wuxing);

      trends.push({
        period: `${liuNian.year}年`,
        direction: score > 70 ? '上升' : score < 50 ? '调整' : '震荡',
        probability: probability + Math.abs(this.deterministicOffset(`${liuNian.ganZhi}-${liuNian.year}-probability`)) % 15,
        note: this.getTrendNote(ganWuxing),
      });
    }

    return trends;
  }

  /**
   * 生成关键节点
   */
  private generateKeyNodes(baziResult: BaziFullResult, birthYear: number): any[] {
    const nodes: any[] = [];
    const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const currentYear = new Date().getFullYear();

    // 大运转换点
    for (const yun of baziResult.daYun.slice(0, 3)) {
      const year = birthYear + yun.startAge;
      if (year > currentYear - 5) {
        nodes.push({
          time: `${yun.startAge}-${yun.endAge}岁`,
          year: year,
          event: `${yun.full}大运`,
          impact: this.isGoodDaYun(yun.gan, baziResult.dayPillar[0]) ? 'positive' : 'neutral',
          description: this.getDaYunDescription(yun.gan, yun.zhi),
        });
      }
    }

    // 流年关键年
    for (const liuNian of baziResult.liuNian.slice(0, 5)) {
      const year = liuNian.year;
      if (year >= currentYear - 2) {
        const gan = liuNian.ganZhi[0];
        const zhi = liuNian.ganZhi[1];
        const dayGan = baziResult.dayPillar[0];

        let impact = 'neutral';
        let description = '';

        // 判断吉凶
        if (this.isShengen(dayGan, gan)) {
          impact = 'positive';
          description = '喜神到位，运势上佳';
        } else if (this.isXiaoRen(dayGan, gan)) {
          impact = 'negative';
          description = '小人当道，需谨慎行事';
        } else if (this.checkTaiJi(liuNian.ganZhi, baziResult.shenSha)) {
          impact = 'positive';
          description = '太极贵人相助';
        } else if (this.checkTaoHua(liuNian.ganZhi, baziResult.shenSha)) {
          impact = 'positive';
          description = '桃花星动，姻缘/人际运势';
        }

        if (description) {
          nodes.push({
            time: `${year}年`,
            year,
            event: `${liuNian.ganZhi}年`,
            impact,
            description,
          });
        }
      }
    }

    // 按年份排序
    nodes.sort((a, b) => a.year - b.year);

    return nodes;
  }

  /**
   * 生成运势解读概述
   */
  private generateOverview(baziResult: BaziFullResult): string {
    const dayGan = baziResult.dayPillar[0];
    const dayZhi = baziResult.dayPillar[1];
    const dayWuxing = this.getGanWuxing(dayGan);
    const naYin = baziResult.naYin.day;

    // 找到用神
    const yongShen = this.findYongShen(baziResult.wuxing, dayGan);

    // 大运概况
    const currentDaYun = baziResult.daYun[0];
    const nextDaYun = baziResult.daYun[1];

    return `您的日主为${dayGan}（${dayWuxing}），生于${naYin}之年。

命局五行：木${baziResult.wuxing.wood}、火${baziResult.wuxing.fire}、土${baziResult.wuxing.earth}、金${baziResult.wuxing.metal}、水${baziResult.wuxing.water}。

用神为${yongShen}，当前大运${currentDaYun?.full || '未知'}（${currentDaYun?.startAge || 0}-${currentDaYun?.endAge || 9}岁），下一大运${nextDaYun?.full || '未知'}。

整体运势呈现周期波动特征，建议把握大运转换期的关键年份，顺势而为。`;
  }

  /**
   * 调用LLM生成运势解读
   */
  private async generateLlmInterpretation(baziResult: BaziFullResult, llmResult: any): Promise<string> {
    try {
      const dayGan = baziResult.dayPillar[0];
      const dayWuxing = this.getGanWuxing(dayGan);
      const currentDaYun = baziResult.daYun[0];
      const naYin = baziResult.naYin.day || '未知';
      const prompt = this.buildKlinePrompt(baziResult, dayGan, dayWuxing, currentDaYun, naYin);
      const providerInfo = this.llmProviders.getDefaultProviderInfo();
      if (!providerInfo.configured) return this.generateOverview(baziResult);

      const response = await this.llmProviders.chatWithUser(
        prompt,
        [
          buildIdentityLayer(),
          '你是人生K线图趋势总纲生成器。只依据给定命盘摘要和K线数据，不重算命盘，不编造经典原文或出处。',
          '输出200-300字中文纯文本，分三段：整体运势概述、当前大运特点、关键建议。',
          '',
          '【输出风格铁律】',
          '1. 总纲必须有记忆点，用排比或对仗句式，有行动指向。例："事业可冲，投资要收。职位可争，钱要守。"',
          '2. 术语必须紧跟白话翻译，格式："XX，也就是……"。一段内不超过3个术语。',
          '3. 关键建议必须具体，禁止"保持努力、未来可期、注意沟通"这类空泛表述。',
          '4. 所有时间建议必须面向当前日期之后，不得输出已经过去的年份。',
        ].join('\n'),
        providerInfo.provider,
        { temperature: 0.25, maxTokens: 800, timeout: 30000 },
      );
      return response.content?.trim() || this.generateOverview(baziResult);

    } catch (error) {
      if (this.isLlmTimeout(error)) {
        throw error;
      }
      this.logger.error('[ConsultService]生成运势解读失败:', error);
      return this.generateOverview(baziResult);
    }
  }

  /**
   * 构建K线图运势解读提示词
   */
  private buildKlinePrompt(baziResult: BaziFullResult, dayGan: string, dayWuxing: string, currentDaYun: any, naYin: string): string {
    const wuxingStr = `木${baziResult.wuxing.wood}、火${baziResult.wuxing.fire}、土${baziResult.wuxing.earth}、金${baziResult.wuxing.metal}、水${baziResult.wuxing.water}`;
    const daYunStr = currentDaYun ? `${currentDaYun.full}（${currentDaYun.startAge}-${currentDaYun.endAge}岁）` : '未知';
    const recentLiuNian = baziResult.liuNian.slice(0, 3).map(ln => ln.ganZhi).join('、');

    const klineMeta: any = undefined;
    const metaSection = klineMeta
      ? [
          '',
          '【K线数据锚点】',
          `综合评分：${klineMeta.overallScore ?? '未知'}`,
          `最佳窗口：${klineMeta.bestWindow ?? '未知'}`,
          `风险窗口：${klineMeta.riskWindow ?? '未知'}`,
          `置信度：${klineMeta.confidence ?? '未知'}`,
        ].join('\n')
      : '';

    return `请为以下八字命盘生成一段人生K线图的运势总纲解读：

【命盘信息】
日主：${dayGan}（${dayWuxing}性）
纳音：${naYin}
五行分布：${wuxingStr}
当前大运：${daYunStr}
最近流年：${recentLiuNian}${metaSection}

【解读要求】
1. 整体运势概述（80字左右，必须引用K线评分和最佳/风险窗口）
2. 当前大运特点分析（结合五行生克）
3. 关键建议（2-3条，必须具体可执行）

请用简洁专业的命理语言撰写，术语后跟白话翻译。`;
  }

  /**
   * 从LLM结果构建运势解读
   */
  private buildInterpretationFromLLM(llmResult: any, baziResult: BaziFullResult, currentDaYun: any): string {
    const dayGan = baziResult.dayPillar[0];
    const dayWuxing = this.getGanWuxing(dayGan);

    // 基础信息
    let interpretation = `【${dayGan}日主 · ${dayWuxing}性人生】\n\n`;

    // 添加LLM生成的summary_body
    if (llmResult.summary_body) {
      interpretation += llmResult.summary_body + '\n\n';
    }

    // 添加大运信息
    if (currentDaYun) {
      interpretation += `当前大运「${currentDaYun.full}」（${currentDaYun.startAge}-${currentDaYun.endAge}岁）：\n`;
      interpretation += this.getDaYunInterpretation(currentDaYun.gan, baziResult.dayPillar[0]) + '\n\n';
    }

    // 添加风险提示
    if (llmResult.risks && llmResult.risks.length > 0) {
      interpretation += `【注意事项】\n`;
      llmResult.risks.slice(0, 2).forEach((risk: string) => {
        interpretation += `· ${risk}\n`;
      });
      interpretation += '\n';
    }

    // 添加行动建议
    if (llmResult.actions && llmResult.actions.length > 0) {
      interpretation += `【行动建议】\n`;
      llmResult.actions.slice(0, 2).forEach((action: string) => {
        interpretation += `· ${action}\n`;
      });
    }

    return interpretation.trim();
  }

  /**
   * 获取大运解读
   */
  private getDaYunInterpretation(gan: string, dayGan: string): string {
    const isShengen = this.isShengen(dayGan, gan);
    const isXiaoRen = this.isXiaoRen(dayGan, gan);

    if (isShengen) {
      return `喜神「${gan}」到位，大运吉利，有助于事业发展和财运提升。`;
    } else if (isXiaoRen) {
      return `忌神「${gan}」当令，需谨慎行事，注意健康管理。`;
    } else {
      return `大运平和，稳中求进，宜静不宜动。`;
    }
  }

  // ==================== 辅助方法 ====================

  private getEmptyKlineContent(): any {
    return {
      title: '趋势推演·K线图',
      subtitle: '数据不足，无法生成趋势分析',
      overview: '请提供完整的出生日期和时间信息以生成命理趋势分析。',
      chartData: [],
      monthlyData: [],
      trends: [],
      key_nodes: [],
      wuxing_analysis: null,
      dayun_analysis: [],
    };
  }

  private getGanWuxing(gan: string): string {
    // P1-5 修复: 引用统一源 WUXING_TIANGAN（原本地 map 重复定义）
    return WUXING_TIANGAN[gan] || '土';
  }

  private getZhiWuxing(zhi: string): string {
    // P1-5 修复: 引用统一源 WUXING_DIZHI（原本地 map 重复定义）
    return WUXING_DIZHI[zhi] || '土';
  }

  private randomOffset(): number {
    return 0;
  }

  private deterministicOffset(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 21) - 10;
  }

  private generateReason(gan: string, zhi: string, age: number): string {
    const reasons = [
      `${gan}气旺盛，主${this.getGanCharacteristic(gan)}`,
      `${zhi}临${this.getZhiCharacteristic(zhi)}，机遇与挑战并存`,
      `岁运${this.getAgePhase(age)}，宜静不宜动`,
      `五行流转，${this.getCurrentElement(gan)}为主导`,
    ];
    return reasons[age % reasons.length];
  }

  private getGanCharacteristic(gan: string): string {
    const map: Record<string, string> = {
      '甲': '进取', '乙': '柔韧', '丙': '光明', '丁': '温煦', '戊': '厚重',
      '己': '包容', '庚': '刚健', '辛': '锐利', '壬': '流通', '癸': '智慧',
    };
    return map[gan] || '平和';
  }

  private getZhiCharacteristic(zhi: string): string {
    const map: Record<string, string> = {
      '子': '智慧之宫', '丑': '金库之地', '寅': '木之根本', '卯': '桃花之地',
      '辰': '水库之库', '巳': '文昌之位', '午': '火之盛地', '未': '木库之墓',
      '申': '金之生地', '酉': '金之帝旺', '戌': '火库之地', '亥': '水之胎地',
    };
    return map[zhi] || '平和之地';
  }

  private getAgePhase(age: number): string {
    if (age < 18) return '少年时期';
    if (age < 35) return '青壮年时期';
    if (age < 55) return '中年时期';
    return '晚年时期';
  }

  private getCurrentElement(gan: string): string {
    return this.getGanWuxing(gan);
  }

  private checkTianGanRelation(gan1: string, gan2: string): boolean {
    // 天干相合：甲己、乙庚、丙辛、丁壬、戊癸
    const relations = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
    const combo1 = gan1 + gan2;
    const combo2 = gan2 + gan1;
    return relations.includes(combo1) || relations.includes(combo2);
  }

  private checkDiZhiRelation(zhi1: string, zhi2: string): boolean {
    // 地支相合：子丑、寅亥、卯戌、辰酉、巳申、午未
    const relations = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
    const combo1 = zhi1 + zhi2;
    const combo2 = zhi2 + zhi1;
    return relations.includes(combo1) || relations.includes(combo2);
  }

  private calculateTrendScore(gan: string, zhi: string, wuxing: any): number {
    const ganScore = this.getGanScore(gan);
    const zhiScore = this.getZhiScore(zhi);
    return Math.round((ganScore + zhiScore) / 2);
  }

  private getGanScore(gan: string): number {
    // 简化评分
    const scores: Record<string, number> = {
      '甲': 80, '乙': 75, '丙': 85, '丁': 78, '戊': 72,
      '己': 70, '庚': 68, '辛': 65, '壬': 82, '癸': 77,
    };
    return scores[gan] || 70;
  }

  private getZhiScore(zhi: string): number {
    const scores: Record<string, number> = {
      '子': 85, '丑': 65, '寅': 80, '卯': 75, '辰': 70,
      '巳': 78, '午': 82, '未': 68, '申': 72, '酉': 70,
      '戌': 65, '亥': 80,
    };
    return scores[zhi] || 70;
  }

  private getTrendNote(wuxing: string): string {
    const notes: Record<string, string> = {
      '木': '生机勃发，适合新计划',
      '火': '热情高涨，注意人际',
      '土': '稳步发展，稳中求进',
      '金': '收获季节，注重总结',
      '水': '智慧流通，利于思考',
    };
    return notes[wuxing] || '平稳发展';
  }

  private isShengen(dayGan: string, otherGan: string): boolean {
    // 喜神判断（简化版）
    const xiShen: Record<string, string[]> = {
      '甲': ['丙', '丁', '戊', '己'], '乙': ['丙', '丁', '戊', '己'],
      '丙': ['戊', '己', '庚', '辛'], '丁': ['戊', '己', '庚', '辛'],
      '戊': ['庚', '辛', '壬', '癸'], '己': ['庚', '辛', '壬', '癸'],
      '庚': ['壬', '癸', '甲', '乙'], '辛': ['壬', '癸', '甲', '乙'],
      '壬': ['甲', '乙', '丙', '丁'], '癸': ['甲', '乙', '丙', '丁'],
    };
    return (xiShen[dayGan] || []).includes(otherGan);
  }

  private isXiaoRen(dayGan: string, otherGan: string): boolean {
    // 忌神判断（简化版）
    const jiShen: Record<string, string[]> = {
      '甲': ['庚', '辛', '壬', '癸'], '乙': ['庚', '辛', '壬', '癸'],
      '丙': ['壬', '癸', '甲', '乙'], '丁': ['壬', '癸', '甲', '乙'],
      '戊': ['甲', '乙', '丙', '丁'], '己': ['甲', '乙', '丙', '丁'],
      '庚': ['丙', '丁', '戊', '己'], '辛': ['丙', '丁', '戊', '己'],
      '壬': ['戊', '己', '庚', '辛'], '癸': ['戊', '己', '庚', '辛'],
    };
    return (jiShen[dayGan] || []).includes(otherGan);
  }

  private isGoodDaYun(gan: string, dayGan: string): boolean {
    return this.isShengen(dayGan, gan);
  }

  private getDaYunDescription(gan: string, zhi: string): string {
    const ganDesc = this.getGanCharacteristic(gan);
    const zhiDesc = this.getZhiCharacteristic(zhi);
    return `${gan}气主${ganDesc}，${zhiDesc}`;
  }

  private checkTaiJi(ganZhi: string, shenSha: any): boolean {
    if (!shenSha?.taiJi) return false;
    const zhi = ganZhi[1];
    return shenSha.taiJi.includes(zhi);
  }

  private checkTaoHua(ganZhi: string, shenSha: any): boolean {
    if (!shenSha?.taoHua) return false;
    const zhi = ganZhi[1];
    return shenSha.taoHua.includes(zhi);
  }

  private findYongShen(wuxing: any, dayGan: string): string {
    // 找用神（简化版：根据日主五行和八字五行盛衰判断）
    const dayWuxing = this.getGanWuxing(dayGan);
    const wuxingOrder = ['木', '火', '土', '金', '水'];
    const dayIdx = wuxingOrder.indexOf(dayWuxing);

    // 找到最弱的五行
    const wuxingScores = [
      { name: '木', score: wuxing.wood },
      { name: '火', score: wuxing.fire },
      { name: '土', score: wuxing.earth },
      { name: '金', score: wuxing.metal },
      { name: '水', score: wuxing.water },
    ];

    wuxingScores.sort((a, b) => a.score - b.score);
    return wuxingScores[0].name;
  }

  async saveRecord(recordId: string, userId: string) {
    const record = await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: {
        isSaved: true,
        userId,
      },
    });

    await this.ensurePersonProfileForSavedRecord(record, userId);

    // 异步触发 LLM 状态推导 + K线推导（不阻塞保存返回）
    if (this.tideInferenceService) {
      this.tideInferenceService.inferAndPersist(userId).catch((err) => {
        this.logger.warn(`[saveRecord] LLM state inference failed for ${userId}: ${(err as Error).message}`);
      });
      this.tideInferenceService.inferKline(userId).catch((err) => {
        this.logger.warn(`[saveRecord] LLM K-line inference failed for ${userId}: ${(err as Error).message}`);
      });
    }

    return { success: true, record_id: recordId };
  }

  /**
   * 保存记录（支持未登录用户用 sessionId 建档）
   */
  async saveRecordWithSession(recordId: string, userId: string, sessionId?: string) {
    const updateData: any = {
      isSaved: true,
      userId,
    };

    await this.prisma.consultRecord.update({
      where: { id: recordId },
      data: updateData,
    });

    return { success: true, record_id: recordId };
  }

  private async ensurePersonProfileForSavedRecord(record: any, userId: string): Promise<void> {
    if (!record || record.routeType !== 'ziping') return;

    try {
      const inputData = record.inputData ? JSON.parse(record.inputData) : {};
      const calcResult = record.calcResult ? JSON.parse(record.calcResult) : {};
      const cd = calcResult?.calcData || calcResult || {};

      if (!inputData.birthDate || !inputData.birthTime || !inputData.gender) {
        return;
      }

      const profileId = await this.personProfileService.getOrCreateProfile({
        userId,
        sessionId: record.sessionId || undefined,
        birthDate: inputData.birthDate,
        birthTime: inputData.birthTime,
        gender: inputData.gender,
        birthPlace: inputData.birthPlace,
        name: inputData.surname,
        yearPillar: cd.yearPillar,
        monthPillar: cd.monthPillar,
        dayPillar: cd.dayPillar,
        hourPillar: cd.hourPillar,
        naYin: cd.naYin ? JSON.stringify(cd.naYin) : undefined,
        kongWang: cd.kongWang ? JSON.stringify(cd.kongWang) : undefined,
      });
      await this.personProfileService.linkRecordToProfile(profileId, record.id);
    } catch (err) {
      this.logger.warn('[ConsultService] 保存记录关联 PersonProfile 失败: ' + (err as Error).message);
    }
  }

  /**
   * 合并 sessionId 到 userId（登录时调用）
   * 将所有同 sessionId 的记录合并到 userId
   */
  async mergeSessionToUser(sessionId: string, userId: string) {
    const result = await this.prisma.consultRecord.updateMany({
      where: {
        sessionId,
        OR: [
          { userId: null },
          { userId: { equals: sessionId } },
        ],
      },
      data: {
        userId,
      },
    });

    return {
      success: true,
      mergedCount: result.count,
    };
  }

  async getRecords(userId: string, limit = 20, offset = 0) {
    const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 20;
    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
    const where = { userId, deletedAt: null };
    const [records, total] = await Promise.all([
      this.prisma.consultRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
      }),
      this.prisma.consultRecord.count({ where }),
    ]);

    // 批量查询关联的 PersonProfileRecord，获取 profileId 映射
    const recordIds = records.map((r) => r.id);
    const profileLinks = recordIds.length > 0
      ? await this.prisma.personProfileRecord.findMany({
          where: { consultRecordId: { in: recordIds } },
          select: { consultRecordId: true, personProfileId: true },
        })
      : [];
    const profileMap = new Map<string, string>();
    for (const link of profileLinks) {
      profileMap.set(link.consultRecordId, link.personProfileId);
    }

    return {
      records: records.map((record) => {
        let closedLoopResult: { userReflection?: string; actualOutcome?: string; accuracyCheck?: string } | null = null;
        if (record.closedLoopResult) {
          try {
            closedLoopResult = JSON.parse(record.closedLoopResult);
          } catch {
            closedLoopResult = null;
          }
        }

        return {
          id: record.id,
          question: record.question,
          route_type: record.routeType,
          summary_line: record.summaryLine,
          createdAt: record.createdAt,
          profileId: profileMap.get(record.id) || null,
          reviewStatus: closedLoopResult
            ? 'verified'
            : (Date.now() - new Date(record.createdAt).getTime() > 90 * 24 * 60 * 60 * 1000 ? 'expired' : 'pending'),
          closed_loop_result: closedLoopResult,
        };
      }),
      total,
      hasMore: safeOffset + records.length < total,
    };
  }

  async saveClosedLoopResult(
    recordId: string,
    userId: string,
    result: { userReflection: string; actualOutcome: string; accuracyCheck: string },
  ) {
    const record = await this.prisma.consultRecord.findFirst({
      where: {
        id: recordId,
        userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException('咨询记录不存在');
    }

    await this.followupService.completeFollowUp(recordId, result);

    return {
      success: true,
      recordId,
      closed_loop_result: result,
      reviewStatus: 'verified',
    };
  }

  async deleteRecord(recordId: string, userId: string) {
    // P0-8 删除审计：先查询，审计 + 影响预览，再删除
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId, userId },
      select: { id: true, userId: true, question: true, summaryLine: true, createdAt: true },
    });
    if (!record) {
      this.logger.warn(`[P0-8-AUDIT] deleteRecord not-found: recordId=${recordId} userId=${userId}`);
      return { success: false, error: 'not_found' };
    }
    this.logger.log(
      `[P0-8-AUDIT] deleteRecord confirmed: recordId=${record.id} userId=${record.userId} ` +
      `summaryLine="${record.summaryLine?.slice(0, 50)}" createdAt=${record.createdAt.toISOString()}`,
    );

    await this.prisma.consultRecord.delete({
      where: { id: recordId, userId },
    });
    this.logger.log(`[P0-8-AUDIT] deleteRecord executed: recordId=${recordId} userId=${userId}`);

    return { success: true };
  }

  async getFortune(type: 'daily' | 'monthly' | 'yearly', dto: FortuneQueryDto, year?: number, month?: number, lang: string = 'zh-CN') {
    const { year: bYear, month: bMonth, day: bDay } = this.parseBirthDate(dto.birthDate);
    const { hour, minute } = this.parseBirthTime(dto.birthTime || '12:00');

    const baziResult = await this.baziCalculator.calculate({
      year: bYear,
      month: bMonth - 1,
      day: bDay,
      hour,
      minute,
      gender: dto.gender || 'male',
    });

    if (type === 'daily') {
      const result = this.fortuneService.calculateDaily(baziResult, new Date());
      return lang !== 'zh-CN' && lang !== 'zh' ? this.translationService.translateCalcResult(result, lang) : result;
    }

    if (type === 'monthly' && year && month) {
      const result = this.fortuneService.calculateMonthly(baziResult, year, month);
      return lang !== 'zh-CN' && lang !== 'zh' ? this.translationService.translateCalcResult(result, lang) : result;
    }

    if (type === 'yearly' && year) {
      const result = this.fortuneService.calculateYearly(baziResult, year);
      return lang !== 'zh-CN' && lang !== 'zh' ? this.translationService.translateCalcResult(result, lang) : result;
    }

    throw new BadRequestException('Invalid fortune query parameters');
  }

  getCelebrityCases(category?: string) {
    return this.celebrityService.getCelebrityCases(category);
  }

  getCelebrityCaseById(id: string) {
    const caseData = this.celebrityService.getCelebrityCaseById(id);
    if (!caseData) {
      throw new BadRequestException(`Celebrity case not found: ${id}`);
    }
    return caseData;
  }

  async calculateCelebritySimilarity(celebrityId: string, dto: CelebritySimilarityDto) {
    const celebrity = this.celebrityService.getCelebrityCaseById(celebrityId);
    if (!celebrity) {
      throw new BadRequestException(`Celebrity case not found: ${celebrityId}`);
    }

    const { year: bYear, month: bMonth, day: bDay } = this.parseBirthDate(dto.birthDate);
    const { hour, minute } = this.parseBirthTime(dto.birthTime || '12:00');

    const baziResult = await this.baziCalculator.calculate({
      year: bYear,
      month: bMonth - 1,
      day: bDay,
      hour,
      minute,
      gender: dto.gender || 'male',
    });

    return this.celebrityService.calculateSimilarity(baziResult, celebrity);
  }

  private parseBirthDate(dateStr: string): { year: number; month: number; day: number } {
    const parts = dateStr.split(/[-/]/);
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      day: parseInt(parts[2], 10),
    };
  }

  private parseBirthTime(timeStr: string): { hour: number; minute: number } {
    const parts = timeStr.split(':');
    return {
      hour: parseInt(parts[0], 10) || 12,
      minute: parseInt(parts[1], 10) || 0,
    };
  }

  async createPreview(body: { module: string; birthDate?: string; birthTime?: string; gender?: string; questionType?: string }) {
    const previewId = `preview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    switch (body.module) {
      case 'kline':
        return {
          previewId,
          module: 'kline',
          freeContent: {
            aspect: 'overall',
            years: 5,
            summary: '你的人生正处于上升期，未来3年有重要转折...',
            currentPhase: '蓄势期',
            score: 72,
          },
          lockedContent: {
            description: '完整四线解读、关键年份分析、AI解盘师',
            features: ['事业K线', '财运K线', '情感K线', '关键年份', 'AI解盘师'],
          },
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      case 'naming':
        return {
          previewId,
          module: 'naming',
          freeContent: {
            candidateCount: 3,
            names: [
              { name: '示例名一', score: 85, briefReason: '五行平衡，音韵和谐' },
              { name: '示例名二', score: 82, briefReason: '三才配置吉，寓意深远' },
              { name: '示例名三', score: 78, briefReason: '笔画吉数，朗朗上口' },
            ],
          },
          lockedContent: {
            description: '10-20个候选名、八字五行匹配、评分详情',
            features: ['完整候选名', '八字五行匹配', '音形义分析', '避坑说明'],
          },
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      case 'question':
        return {
          previewId,
          module: 'question',
          freeContent: {
            conclusion: '当前局势对你有利，但需注意时机把握',
            risks: ['时机未到，不宜冒进'],
            actions: ['先做充分准备，等待最佳时机'],
          },
          lockedContent: {
            description: '深度推演、证据链、多路径判断',
            features: ['深度推演', '证据链分析', '多路径判断', '复盘提醒'],
          },
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      default:
        throw new BadRequestException(`不支持的模块类型: ${body.module}`);
    }
  }
}
