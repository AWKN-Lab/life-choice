import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

const queueLogger = new Logger('QueueModule');

@Module({})
export class QueueModule {
  static register() {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (!redisEnabled) {
      queueLogger.warn('REDIS_ENABLED=false, BullMQ queue registration skipped');
      return { module: QueueModule, providers: [], exports: [] };
    }

    return {
      module: QueueModule,
      imports: [
        BullModule.forRootAsync({
          useFactory: (config: ConfigService) => ({
            connection: {
              host: config.get('REDIS_HOST', '127.0.0.1'),
              port: Number(config.get('REDIS_PORT', '6379')),
              password: config.get('REDIS_PASSWORD') || undefined,
            },
          }),
          inject: [ConfigService],
        }),
        BullModule.registerQueue({ name: 'generation-queue' }),
      ],
      exports: [BullModule],
    };
  }
}