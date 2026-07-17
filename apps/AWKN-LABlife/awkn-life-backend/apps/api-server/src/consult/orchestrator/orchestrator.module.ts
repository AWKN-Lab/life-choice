import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { LlmProvidersModule } from '../../llm-providers/llm-providers.module';
import { LlmGatewayModule } from '../../llm-gateway/llm-gateway.module';
import { WebsocketModule } from '../../websocket/websocket.module';
import { KnowledgeBaseModule } from '../../knowledge-base-data/knowledge-base.module';
// 任务 2.3: 导入 K线/潮汐模块（让 orchestrator 注入 lifeStage）
import { KlineTideModule } from '../../kline-tide/kline-tide.module';
import { TideInferenceModule } from '../../tide-inference/tide-inference.module';
import { IntentRouterService } from './intent-router.service';
import { ZhangbanshanSchedulerService } from './zhangbanshan-scheduler.service';
import { EvidencePacketBuilderService } from './evidence-packet-builder.service';
import { KnowledgeRetrieverService } from './knowledge-retriever.service';
// P0-Fix: P1-B 装甲链路服务注册（用 import alias 解决与旧版 KnowledgeRetrieverService 同名冲突）
// - 旧版（./knowledge-retriever.service）：基于 Prisma + HTTP:8701，被 orchestrator.service.ts 使用
// - 新版（./evidence-composer/knowledge-retriever/）：基于静态 JSON，被 evidence-composer.service.ts 使用
import { RuleMatcherService } from './rule-matcher/rule-matcher.service';
import { EvidenceComposerService } from './evidence-composer/evidence-composer.service';
import {
  KnowledgeRetrieverService as RuleKnowledgeRetrieverService,
} from './evidence-composer/knowledge-retriever/knowledge-retriever.service';
import { AgentRunLogger } from './agent-run/agent-run-logger';
import { GenerationComposerService } from './generation-composer.service';
import { QualityGateService } from './quality-gate.service';
// P0-4 Step 5: 5 层输出定向修复器
import { LayerRepairService } from './layer-repair.service';
import { ToolSynthesizerService } from './tool-synthesizer.service';
import { XuanxueOrchestratorService } from './orchestrator.service';
import { UserMemoryService } from '../memory/user-memory.service';
import { MemoryExtractorService } from '../memory/memory-extractor.service';
import { MemoryForgetService } from '../memory/memory-forget.service'; // Phase 4 T4.4: 记忆遗忘定时任务
import { MemoryEmbeddingService } from '../memory/memory-embedding.service'; // Phase 4 T4.2: 记忆 embedding
import { ReactEngineService } from './react-engine.service';
import { UserStateClassifierService } from '../classifier/user-state-classifier.service';
import { HighRiskDetectorService } from '../safety/high-risk-detector.service';
import { SafetyModule } from '../safety/safety.module';
import { NodeStateMachineService } from './node-state-machine.service';
import { UnifiedStateMachineService } from './unified-state-machine.service';
import { ClarificationService } from './clarification.service';
import { ContextWindowService } from './context-window.service';

@Module({
  imports: [
    PrismaModule,
    LlmProvidersModule,
    LlmGatewayModule,
    WebsocketModule,
    KnowledgeBaseModule,
    SafetyModule,
    // 任务 2.3: K线/潮汐模块（让 orchestrator 注入 lifeStage）
    KlineTideModule,
    TideInferenceModule,
    // BullMQ 队列仅在 REDIS_ENABLED !== 'false' 时注册，避免无 root connection 时崩溃
    ...(process.env.REDIS_ENABLED !== 'false'
      ? [BullModule.registerQueue({ name: 'generation-queue' })]
      : []),
  ],
  providers: [
    IntentRouterService,
    ZhangbanshanSchedulerService,
    EvidencePacketBuilderService,
    KnowledgeRetrieverService,
    // P0-Fix: P1-B 装甲链路服务（解决同名冲突后注册新版）
    RuleMatcherService,
    EvidenceComposerService,
    RuleKnowledgeRetrieverService,
    AgentRunLogger,
    QualityGateService,
    GenerationComposerService,
    LayerRepairService, // P0-4 Step 5
    ToolSynthesizerService,
    XuanxueOrchestratorService,
    UserMemoryService,
    MemoryExtractorService,
    MemoryForgetService,
    MemoryEmbeddingService,
    ReactEngineService,
    UserStateClassifierService,
    HighRiskDetectorService,
    NodeStateMachineService,
    UnifiedStateMachineService,
    ClarificationService,
    ContextWindowService,
  ],
  exports: [
    IntentRouterService,
    ZhangbanshanSchedulerService,
    EvidencePacketBuilderService,
    KnowledgeRetrieverService,
    GenerationComposerService,
    ToolSynthesizerService,
    XuanxueOrchestratorService,
    UserMemoryService,
    MemoryExtractorService,
    ReactEngineService,
    UnifiedStateMachineService,
    ClarificationService,
    ContextWindowService,
  ],
})
export class OrchestratorModule {}
