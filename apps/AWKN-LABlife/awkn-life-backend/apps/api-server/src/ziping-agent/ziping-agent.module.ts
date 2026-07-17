import { Module } from '@nestjs/common';
import { ZipingAgentService } from './ziping-agent.service';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule],
  providers: [ZipingAgentService],
  exports: [ZipingAgentService],
})
export class ZipingAgentModule {}
