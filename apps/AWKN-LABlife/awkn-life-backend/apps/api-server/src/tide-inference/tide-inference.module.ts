import { Module } from '@nestjs/common';
import { TideInferenceService } from './tide-inference.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [PrismaModule, LlmProvidersModule],
  providers: [TideInferenceService],
  exports: [TideInferenceService],
})
export class TideInferenceModule {}
