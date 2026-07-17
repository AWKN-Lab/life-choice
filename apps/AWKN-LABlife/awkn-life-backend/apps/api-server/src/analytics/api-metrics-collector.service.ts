import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiMetricsCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApiMetricsCollectorService.name);
  private total = 0;
  private clientErrors = 0;
  private serverErrors = 0;
  private windowStart = new Date();
  private timer?: NodeJS.Timeout;
  private flushing = false;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), 30_000);
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  record(statusCode: number) {
    this.total += 1;
    if (statusCode >= 400 && statusCode < 500) this.clientErrors += 1;
    if (statusCode >= 500) this.serverErrors += 1;
  }

  async flush() {
    if (this.flushing || this.total === 0) return;
    this.flushing = true;
    const snapshot = {
      total: this.total,
      clientErrors: this.clientErrors,
      serverErrors: this.serverErrors,
      windowStart: this.windowStart.toISOString(),
      windowEnd: new Date().toISOString(),
    };
    this.total = 0;
    this.clientErrors = 0;
    this.serverErrors = 0;
    this.windowStart = new Date();

    try {
      await this.prisma.userActivity.create({
        data: {
          activityType: 'api_request_metrics',
          activityData: JSON.stringify(snapshot),
        },
      });
    } catch (error) {
      // 恢复计数，下一轮继续尝试，避免短暂数据库故障造成指标缺口。
      this.total += snapshot.total;
      this.clientErrors += snapshot.clientErrors;
      this.serverErrors += snapshot.serverErrors;
      this.logger.warn(`[flush] API metrics write failed: ${(error as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }
}
