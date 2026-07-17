import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Phase 4 T4.4: 记忆遗忘定时任务
 *
 * 衰减策略（PRD 4.5.3）：
 * - 清理：expiresAt < now() 的记忆直接删除
 * - 衰减：lastAccessedAt > 30天 未命中的记忆 weight *= 0.8
 * - 归档：lastAccessedAt > 90天 未命中的记忆 weight = 0.1（保留但不优先检索）
 *
 * 触发方式：setInterval 每日执行（参考 DialogueTimeoutService 模式）
 * 可通过 MEMORY_FORGET_ENABLED=false 禁用
 */
@Injectable()
export class MemoryForgetService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryForgetService.name);
  private intervalId: NodeJS.Timeout | null = null;

  // 衰减策略阈值
  private static readonly DECAY_THRESHOLD_DAYS = 30;
  private static readonly ARCHIVE_THRESHOLD_DAYS = 90;
  private static readonly DECAY_FACTOR = 0.8;
  private static readonly ARCHIVE_WEIGHT = 0.1;
  private static readonly MIN_WEIGHT_TO_DECAY = 0.2; // 低于此值不再衰减
  // 扫描间隔：默认 24 小时，测试环境可用 MEMORY_FORGET_INTERVAL_MS 覆盖
  private static readonly SCAN_INTERVAL_MS = parseInt(
    process.env.MEMORY_FORGET_INTERVAL_MS || `${24 * 60 * 60 * 1000}`,
    10,
  );

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * 模块初始化时自动启动定时扫描
   */
  onModuleInit() {
    this.start();
  }

  /**
   * 模块销毁时清理定时器
   */
  onModuleDestroy() {
    this.stop();
  }

  /**
   * 启动定时扫描
   */
  start() {
    if (process.env.MEMORY_FORGET_ENABLED === 'false') {
      this.logger.log('[MemoryForget] 已禁用（MEMORY_FORGET_ENABLED=false）');
      return;
    }
    if (this.intervalId) return;
    this.logger.log(
      `[MemoryForget] 启动定时扫描（每 ${MemoryForgetService.SCAN_INTERVAL_MS / 1000 / 60} 分钟）`,
    );
    this.intervalId = setInterval(() => {
      this.scan().catch(err => {
        this.logger.error(`[MemoryForget] 扫描失败: ${err.message}`);
      });
    }, MemoryForgetService.SCAN_INTERVAL_MS);
  }

  /**
   * 停止定时扫描
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('[MemoryForget] 已停止定时扫描');
    }
  }

  /**
   * 执行一次扫描：清理 → 衰减 → 归档
   * 返回各阶段影响的记录数
   */
  async scan(): Promise<{ expired: number; decayed: number; archived: number }> {
    this.logger.log('[MemoryForget] 开始扫描记忆...');
    const expired = await this.cleanExpired();
    const decayed = await this.applyDecay();
    const archived = await this.archiveStale();
    this.logger.log(
      `[MemoryForget] 扫描完成: 过期清理=${expired}, 衰减降权=${decayed}, 归档=${archived}`,
    );
    return { expired, decayed, archived };
  }

  /**
   * 清理已过期的记忆（expiresAt < now()）
   */
  private async cleanExpired(): Promise<number> {
    // P0-1 安全止损：暂停清理，避免 deleteMany 删除整行 UserMemory
    // 原 deleteMany 会丢失用户所有历史档案（chartHistory/consultHistory/timelineEvents/insights）
    // 后续 P1 改为只清空 P2-1 扩展字段（type/content/sourceQuote/issueId/confidence/weight/expiresAt）
    this.logger.log('[P0-1-AUDIT] cleanExpired 已暂停（P0-1 安全止损，避免删除整行 UserMemory）');
    return 0;
  }

  /**
   * 衰减：lastAccessedAt > 30天 的记忆 weight *= 0.8
   *
   * P1 恢复 (2026-07-12): lastAccessedAt 字段已同步到 schema.prisma + 生产 DB
   * - schema.prisma UserMemory model 已添加 lastAccessedAt DateTime? 字段
   * - 生产 DB 已 ALTER TABLE 添加该字段 + 索引
   * - prisma generate 已同步类型
   *
   * 逻辑：
   * - 查找 lastAccessedAt 早于阈值 + weight 高于最小值的记忆
   * - 逐条 update weight *= 0.8（不低于 MIN_WEIGHT_TO_DECAY）
   * - 使用 findMany + 循环 update 而非 updateMany，因为需要读取当前 weight 做乘法
   */
  private async applyDecay(): Promise<number> {
    const threshold = new Date(
      Date.now() - MemoryForgetService.DECAY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
    );

    const staleMemories = await this.prisma.userMemory.findMany({
      where: {
        lastAccessedAt: { lt: threshold },
        weight: { gt: MemoryForgetService.MIN_WEIGHT_TO_DECAY },
      },
      select: { userId: true, weight: true },
    });

    let decayed = 0;
    for (const memory of staleMemories) {
      const currentWeight = memory.weight ?? 1.0;
      const newWeight = Math.max(
        currentWeight * MemoryForgetService.DECAY_FACTOR,
        MemoryForgetService.MIN_WEIGHT_TO_DECAY,
      );
      await this.prisma.userMemory.update({
        where: { userId: memory.userId },
        data: { weight: newWeight },
      });
      decayed++;
    }

    this.logger.log(
      `[MemoryForget] 衰减降权 ${decayed} 条记忆（阈值 ${MemoryForgetService.DECAY_THRESHOLD_DAYS} 天）`,
    );
    return decayed;
  }

  /**
   * 归档：lastAccessedAt > 90天 的记忆 weight = 0.1
   *
   * P1 恢复 (2026-07-12): lastAccessedAt 字段已同步到 schema.prisma + 生产 DB
   *
   * 逻辑：
   * - updateMany 将 lastAccessedAt 早于阈值的记忆 weight 设为 ARCHIVE_WEIGHT (0.1)
   * - 使用 updateMany 批量更新，无需读取当前 weight
   */
  private async archiveStale(): Promise<number> {
    const threshold = new Date(
      Date.now() - MemoryForgetService.ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.userMemory.updateMany({
      where: { lastAccessedAt: { lt: threshold } },
      data: { weight: MemoryForgetService.ARCHIVE_WEIGHT },
    });

    this.logger.log(
      `[MemoryForget] 归档 ${result.count} 条记忆（阈值 ${MemoryForgetService.ARCHIVE_THRESHOLD_DAYS} 天）`,
    );
    return result.count;
  }

  /**
   * 标记记忆被访问（检索命中时调用）
   *
   * P1 恢复 (2026-07-12): lastAccessedAt 字段已同步到 schema.prisma + 生产 DB
   *
   * 逻辑：
   * - memoryIds 是 UserMemory.id 列表（primary key, cuid）
   * - updateMany 将这些记录的 lastAccessedAt 设为当前时间
   * - 空数组直接返回，避免无意义查询
   */
  async markAccessed(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    const result = await this.prisma.userMemory.updateMany({
      where: { id: { in: memoryIds } },
      data: { lastAccessedAt: new Date() },
    });

    this.logger.log(
      `[MemoryForget] 标记访问 ${result.count}/${memoryIds.length} 条记忆`,
    );
  }
}
