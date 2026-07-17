import { Module } from '@nestjs/common';
import { LiurenAgentService } from './liuren-agent.service';
import { LiurenCalculator } from '../knowledge-base/liuren-calculator';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [LlmProvidersModule, PrismaModule],
  providers: [LiurenAgentService, LiurenCalculator],
  exports: [LiurenAgentService],
})
export class LiurenAgentModule {}
