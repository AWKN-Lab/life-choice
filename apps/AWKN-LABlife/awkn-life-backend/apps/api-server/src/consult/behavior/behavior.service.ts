/**
 * 行为事件服务
 * 接 PR-13 行为白名单守卫 + E47 双维度限流（per-user per-min + per-record per-sec）
 */

import { Injectable, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { isAllowedBehaviorEvent } from './behavior-event.types';

@Injectable()
export class BehaviorService {
  private readonly logger = new Logger(BehaviorService.name);

  /** per-user per-minute 限流计数（内存版，生产建议接 Redis） */
  private userMinuteBuckets = new Map<string, number[]>();
  /** per-record per-second 限流计数 */
  private recordSecondBuckets = new Map<string, number[]>();

  /**
   * 校验行为事件合法性 + 限流
   * @param userId   用户 ID
   * @param recordId 咨询记录 ID
   * @param eventType 事件类型
   */
  async track(userId: string, recordId: string, eventType: string) {
    if (!isAllowedBehaviorEvent(eventType)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_BEHAVIOR_EVENT',
        message: `Unsupported behavior event: ${eventType}`,
      });
    }

    if (!this.checkUserRate(userId, 100)) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'per-user rate limit exceeded' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.checkRecordRate(recordId, 5)) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'per-record rate limit exceeded' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`[behavior] user=${userId} record=${recordId} event=${eventType}`);
    return { ok: true, eventType, userId, recordId };
  }

  private checkUserRate(userId: string, maxPerMin: number): boolean {
    const now = Date.now();
    const list = (this.userMinuteBuckets.get(userId) ?? []).filter((t) => now - t < 60_000);
    if (list.length >= maxPerMin) return false;
    list.push(now);
    this.userMinuteBuckets.set(userId, list);
    return true;
  }

  private checkRecordRate(recordId: string, maxPerSec: number): boolean {
    const now = Date.now();
    const list = (this.recordSecondBuckets.get(recordId) ?? []).filter((t) => now - t < 1_000);
    if (list.length >= maxPerSec) return false;
    list.push(now);
    this.recordSecondBuckets.set(recordId, list);
    return true;
  }
}
