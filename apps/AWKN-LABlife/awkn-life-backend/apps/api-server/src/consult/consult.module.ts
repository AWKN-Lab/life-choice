import { Module } from '@nestjs/common';
import { ConsultController } from './consult.controller';
import { ConsultService } from './consult.service';
import { PersonProfileService } from './person-profile.service';
import { RouterService } from './router.service';
import { CalcEngineModule } from '../calc-engine/calc-engine.module';
import { LlmGatewayModule } from '../llm-gateway/llm-gateway.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { GeneratorsModule } from './generators/generators.module';
import { QumingAgentModule } from '../quming-agent/quming-agent.module';
import { MembershipModule } from '../membership/membership.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { FollowupModule } from './followup/followup.module';
import { SafetyModule } from './safety/safety.module';
import { ClassifierModule } from './classifier/classifier.module';
import { DialogueModule } from './dialogue/dialogue.module';
import { TideInferenceModule } from '../tide-inference/tide-inference.module';
import { OrchestratorProcessorModule } from './orchestrator/orchestrator.processor.module';
import { BehaviorService } from './behavior/behavior.service';
import { KlineV2BridgeService } from './kline-v2-bridge.service';
import { KlineTideModule } from '../kline-tide/kline-tide.module';

const redisEnabled = process.env.REDIS_ENABLED !== 'false';

@Module({
  imports: [
    CalcEngineModule,
    LlmGatewayModule,
    WebsocketModule,
    GeneratorsModule,
    QumingAgentModule,
    MembershipModule,
    OrchestratorModule,
    FollowupModule.register(),
    SafetyModule,
    ClassifierModule,
    DialogueModule,
    TideInferenceModule,
    KlineTideModule, // P1-07: 注入 KlineTideModule 以提供 KlineSnapshotService
    ...(redisEnabled ? [OrchestratorProcessorModule] : []),
  ],
  controllers: [ConsultController],
  providers: [ConsultService, PersonProfileService, RouterService, BehaviorService, KlineV2BridgeService],
  exports: [ConsultService, PersonProfileService, KlineV2BridgeService],
})
export class ConsultModule {}
