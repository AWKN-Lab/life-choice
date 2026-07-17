import { Module } from '@nestjs/common';
import { ZiweiAgentService } from './ziwei-agent.service';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule],
  providers: [ZiweiAgentService],
  exports: [ZiweiAgentService],
})
export class ZiweiAgentModule {}
