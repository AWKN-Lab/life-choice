import { Module, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FollowupController } from './followup.controller';
import { FollowupService } from './followup.service';
import { FollowupProcessor } from './followup.processor';
import { WebsocketModule } from '../../websocket/websocket.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserMemoryService } from '../memory/user-memory.service';
import { ContextModule } from '../context';

@Module({})
export class FollowupModule {
  private static readonly logger = new Logger(FollowupModule.name);

  /**
   * 动态注册：REDIS_ENABLED（默认 true）控制 BullMQ 队列与 Processor 是否加载。
   * Redis 不可用时设 REDIS_ENABLED=false，模块正常启动但跳过队列注册，
   * FollowupService 的 @Optional() @InjectQueue 会注入 null，回访调度降级为仅写 DB。
   */
  static register() {
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    const imports: any[] = [WebsocketModule, PrismaModule, ContextModule];
    const providers: any[] = [FollowupService, UserMemoryService];

    if (redisEnabled) {
      imports.push(BullModule.registerQueue({ name: 'followup-queue' }));
      providers.push(FollowupProcessor);
    } else {
      this.logger.warn('REDIS_ENABLED=false, BullMQ queue and FollowupProcessor skipped');
    }

    return {
      module: FollowupModule,
      imports,
      controllers: [FollowupController],
      providers,
      exports: [FollowupService],
    };
  }
}
