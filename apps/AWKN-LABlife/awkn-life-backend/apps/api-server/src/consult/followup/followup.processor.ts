import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

interface FollowUpJobData {
  followUpId: string;
  recordId: string;
  userId: string;
}

@Processor('followup-queue')
export class FollowupProcessor extends WorkerHost {
  private readonly logger = new Logger(FollowupProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
  ) {
    super();
  }

  async process(job: Job<FollowUpJobData>): Promise<void> {
    const { followUpId, recordId, userId } = job.data;

    this.logger.log(`[process] followUpId=${followUpId} recordId=${recordId} userId=${userId}`);

    // 1. 更新 ConsultFollowUp 状态为 sent
    await this.prisma.consultFollowUp.update({
      where: { id: followUpId },
      data: { status: 'sent' },
    });

    // 2. 查询关联的 ConsultRecord 用于构建推送内容
    const record = await this.prisma.consultRecord.findUnique({
      where: { id: recordId },
      select: { question: true, summaryLine: true },
    });

    const question = record?.summaryLine || record?.question || '您之前的咨询有了新进展，来看看吧';

    // 3. 通过 WebSocket 推送回访提醒
    this.websocketGateway.sendFollowUpReminder(userId, {
      recordId,
      question,
      scheduledAt: new Date(),
      followUpId,
    });

    this.logger.log(`[process] sent follow-up reminder followUpId=${followUpId} userId=${userId}`);
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
