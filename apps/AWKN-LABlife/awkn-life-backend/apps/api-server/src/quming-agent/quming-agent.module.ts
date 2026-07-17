import { Module } from '@nestjs/common';
import { QumingAgentService } from './quming-agent.service';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';
import { CalcEngineModule } from '../calc-engine/calc-engine.module';

@Module({
  imports: [LlmProvidersModule, CalcEngineModule],
  providers: [QumingAgentService],
  exports: [QumingAgentService],
})
export class QumingAgentModule {}
