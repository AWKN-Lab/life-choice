import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrchestratorModule } from './orchestrator.module';
import { GenerationProcessor } from './generation.processor';

const redisEnabled = process.env.REDIS_ENABLED !== 'false';

@Module({
  imports: [
    OrchestratorModule,
    ...(redisEnabled
      ? [BullModule.registerQueue({ name: 'generation-queue' })]
      : []),
  ],
  providers: redisEnabled ? [GenerationProcessor] : [],
})
export class OrchestratorProcessorModule {}
