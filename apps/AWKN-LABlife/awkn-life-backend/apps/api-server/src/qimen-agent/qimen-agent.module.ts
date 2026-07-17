import { Module } from '@nestjs/common';
import { QimenAgentService } from './qimen-agent.service';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule],
  providers: [QimenAgentService],
  exports: [QimenAgentService],
})
export class QimenAgentModule {}
