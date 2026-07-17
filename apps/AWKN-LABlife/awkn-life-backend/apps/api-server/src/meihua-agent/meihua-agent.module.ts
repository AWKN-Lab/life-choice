import { Module } from '@nestjs/common';
import { MeihuaAgentService } from './meihua-agent.service';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule],
  providers: [MeihuaAgentService],
  exports: [MeihuaAgentService],
})
export class MeihuaAgentModule {}
