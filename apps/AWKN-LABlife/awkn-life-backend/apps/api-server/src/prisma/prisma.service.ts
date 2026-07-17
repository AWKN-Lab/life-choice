import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();

    // P0-1: SQLite 生产环境启用 WAL 模式
    // WAL 允许并发读写（读不阻塞写，写不阻塞读），避免 SQLite 锁等待
    // 仅对 SQLite 生效，PostgreSQL 会忽略此命令
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('file:')) {
      try {
        // PRAGMA journal_mode=WAL 返回结果集，必须用 $queryRaw 而非 $executeRawUnsafe
        await this.$queryRaw`PRAGMA journal_mode=WAL`;
        this.logger.log('[P0-1] SQLite WAL mode enabled');
      } catch (err) {
        this.logger.warn(`[P0-1] Failed to enable WAL mode: ${(err as Error).message}`);
      }

      // SQLite 性能优化 PRAGMA
      // 统一用 $queryRaw：better-sqlite3 对 PRAGMA 返回行为不一致，
      // $executeRawUnsafe 严格禁止返回结果会报错，$queryRaw 允许返回结果更稳妥
      try {
        await this.$queryRaw`PRAGMA synchronous=NORMAL`;
        await this.$queryRaw`PRAGMA temp_store=MEMORY`;
        await this.$queryRaw`PRAGMA mmap_size=268435456`; // 256MB
        this.logger.log('[P0-1] SQLite performance PRAGMA applied');
      } catch (err) {
        this.logger.warn(`[P0-1] SQLite PRAGMA failed: ${(err as Error).message}`);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
