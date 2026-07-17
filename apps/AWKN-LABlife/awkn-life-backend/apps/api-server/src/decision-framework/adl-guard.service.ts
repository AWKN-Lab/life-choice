/**
 * ADL 防退化机制 (Anti-Dependency Loss)
 *
 * 来源：天火智能体技能迁移报告 §1.1
 * 防止用户对智能体产生过度依赖
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export interface ADLConfig {
  maxConsecutiveQueries: number;
  cooldownMinutes: number;
  selfReflectionPrompt: string;
  escalationThreshold: number;
}

export interface ADLState {
  userId: string;
  consecutiveQueries: number;
  firstQueryAt: number;
  lastQueryAt: number;
}

export interface ADLDecision {
  allow: boolean;
  appendReflection: boolean;
  escalate: boolean;
  reflectionPrompt?: string;
  cooldownRemainingMs?: number;
}

const DEFAULT_CONFIG: ADLConfig = {
  maxConsecutiveQueries: 5,
  cooldownMinutes: 30,
  selfReflectionPrompt:
    '已为你做了几次咨询。建议先暂停一下，写下你自己的真实判断和情绪，再决定是否继续提问。命理是参考，不是决定。',
  escalationThreshold: 10,
};

// TTL 清理间隔（10 分钟）
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
// 状态最大保留时长（超过 cooldown 的 2 倍后清理）
const STATE_MAX_AGE_MS = DEFAULT_CONFIG.cooldownMinutes * 2 * 60 * 1000;

@Injectable()
export class AdlGuardService implements OnModuleDestroy {
  private readonly logger = new Logger(AdlGuardService.name);
  private readonly states = new Map<string, ADLState>();
  private readonly config: ADLConfig = DEFAULT_CONFIG;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    // 定期清理过期状态，防止内存泄漏
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), CLEANUP_INTERVAL_MS);
    // 不阻止进程退出
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  /**
   * 清理过期状态（超过 STATE_MAX_AGE_MS 未访问的）
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [userId, state] of this.states) {
      if (now - state.lastQueryAt > STATE_MAX_AGE_MS) {
        this.states.delete(userId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`[ADL] 清理 ${cleaned} 个过期状态`);
    }
  }

  check(userId: string): ADLDecision {
    const now = Date.now();
    const state = this.states.get(userId);

    if (!state) {
      this.states.set(userId, {
        userId,
        consecutiveQueries: 1,
        firstQueryAt: now,
        lastQueryAt: now,
      });
      return { allow: true, appendReflection: false, escalate: false };
    }

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    if (now - state.lastQueryAt > cooldownMs) {
      state.consecutiveQueries = 1;
      state.firstQueryAt = now;
      state.lastQueryAt = now;
      return { allow: true, appendReflection: false, escalate: false };
    }

    state.consecutiveQueries += 1;
    state.lastQueryAt = now;

    if (state.consecutiveQueries >= this.config.escalationThreshold) {
      this.logger.warn(`[ADL] user ${userId} 连续查询 ${state.consecutiveQueries} 次，触发升级`);
      return {
        allow: true,
        appendReflection: true,
        escalate: true,
        reflectionPrompt:
          '你已连续咨询多次。强烈建议联系专业心理咨询或亲友倾诉，命理仅是辅助参考。',
      };
    }

    if (state.consecutiveQueries >= this.config.maxConsecutiveQueries) {
      return {
        allow: true,
        appendReflection: true,
        escalate: false,
        reflectionPrompt: this.config.selfReflectionPrompt,
      };
    }

    return { allow: true, appendReflection: false, escalate: false };
  }

  reset(userId: string): void {
    this.states.delete(userId);
  }
}
