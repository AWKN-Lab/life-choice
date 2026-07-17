import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { XuanxueOrchestratorService } from './orchestrator.service';

@Processor('generation-queue')
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(private readonly orchestrator: XuanxueOrchestratorService) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    await this.orchestrator.processJob(job.data as any);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`[Worker] Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`[Worker] Job ${job.id} failed: ${error.message}`);
  }
}
