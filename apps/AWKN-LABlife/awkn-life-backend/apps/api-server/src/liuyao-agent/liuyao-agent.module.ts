import { Module } from '@nestjs/common';
import { LiuyaoAgentService } from './liuyao-agent.service';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule],
  providers: [LiuyaoAgentService],
  exports: [LiuyaoAgentService],
})
export class LiuyaoAgentModule {}
