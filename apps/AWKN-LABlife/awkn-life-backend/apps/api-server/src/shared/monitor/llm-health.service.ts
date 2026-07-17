import { Injectable, Logger } from '@nestjs/common';

interface CallRecord {
  timestamp: string;
  provider: string;
  status: 'success' | 'failed';
}

/**
 * P0-T1.3: 熔断器状态机
 * 状态流转：Closed → Open（连续失败≥5）→ HalfOpen（冷却60s后）→ Closed（探测成功）/ Open（探测失败）
 * - Closed: 正常放行，记录连续失败数
 * - Open: 摘流，不参与 fallback 链
 * - HalfOpen: 放 1 个探测请求，成功→Closed，失败→Open
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0; // 进入 Open 状态的时间戳
  private static readonly FAILURE_THRESHOLD = 5;
  private static readonly COOLDOWN_MS = 60 * 1000; // 60 秒冷却

  getState(): CircuitState {
    // 如果在 Open 状态且冷却已过，自动迁移到 HalfOpen
    if (this.state === 'open' && Date.now() - this.openedAt >= CircuitBreaker.COOLDOWN_MS) {
      this.state = 'half-open';
    }
    return this.state;
  }

  /** 调用前检查是否放行（Open 状态摘流） */
  canCall(): boolean {
    const state = this.getState();
    return state === 'closed' || state === 'half-open';
  }

  recordSuccess(): void {
    // HalfOpen 探测成功 → Closed
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
    this.consecutiveFailures = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    if (this.state === 'half-open') {
      // HalfOpen 探测失败 → 重新 Open
      this.trip();
      return;
    }
    if (this.consecutiveFailures >= CircuitBreaker.FAILURE_THRESHOLD) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'open';
    this.openedAt = Date.now();
  }

  getStats(): {
    state: CircuitState;
    consecutiveFailures: number;
    openedAt: string | null;
    cooldownRemainSec: number;
  } {
    const state = this.getState();
    return {
      state,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt > 0 ? new Date(this.openedAt).toISOString() : null,
      cooldownRemainSec: state === 'open'
        ? Math.max(0, Math.ceil((CircuitBreaker.COOLDOWN_MS - (Date.now() - this.openedAt)) / 1000))
        : 0,
    };
  }
}

@Injectable()
export class LlmHealthService {
  private readonly logger = new Logger(LlmHealthService.name);
  private readonly windowSize = 100;
  private readonly callHistory: CallRecord[] = [];
  private readonly providerFailStreak: Map<string, number> = new Map();
  private readonly alertThreshold = 0.8;
  /**
   * P0-T1.3: 每 provider 一个熔断器
   */
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private getCircuitBreaker(provider: string): CircuitBreaker {
    let cb = this.circuitBreakers.get(provider);
    if (!cb) {
      cb = new CircuitBreaker();
      this.circuitBreakers.set(provider, cb);
    }
    return cb;
  }

  /**
   * P0-T1.3: 查询 provider 熔断器是否摘流（Open 状态）
   * 供 chatWithFallback 调用前检查
   */
  isCircuitOpen(provider: string): boolean {
    return !this.getCircuitBreaker(provider).canCall();
  }

  /**
   * P0-T1.3: 获取 provider 熔断器状态详情
   */
  getCircuitState(provider: string): CircuitState {
    return this.getCircuitBreaker(provider).getState();
  }

  recordCall(provider: string, status: 'success' | 'failed') {
    this.callHistory.push({
      timestamp: new Date().toISOString(),
      provider,
      status,
    });

    if (this.callHistory.length > this.windowSize) {
      this.callHistory.splice(0, this.callHistory.length - this.windowSize);
    }

    // P0-T1.3: 同步更新熔断器
    const cb = this.getCircuitBreaker(provider);
    if (status === 'failed') {
      cb.recordFailure();
      const streak = (this.providerFailStreak.get(provider) || 0) + 1;
      this.providerFailStreak.set(provider, streak);
      if (streak >= 3) {
        this.logger.error(
          `[LLM-ALERT] provider=${provider} consecutive failures=${streak}`,
        );
      }
    } else {
      cb.recordSuccess();
      this.providerFailStreak.set(provider, 0);
    }

    this.checkOverallHealth();
  }

  private checkOverallHealth() {
    if (this.callHistory.length < 10) return;
    const recent = this.callHistory.slice(-this.windowSize);
    const successCount = recent.filter((r) => r.status === 'success').length;
    const rate = successCount / recent.length;
    if (rate < this.alertThreshold) {
      this.logger.error(
        `[LLM-ALERT] overall success rate=${(rate * 100).toFixed(1)}% total=${recent.length} threshold=${(this.alertThreshold * 100).toFixed(0)}%`,
      );
    }
  }

  getHealth() {
    const total = this.callHistory.length;
    if (total === 0) {
      return {
        successRate: 1,
        totalCalls: 0,
        byProvider: {},
        recentWindow: this.windowSize,
        circuits: {},
      };
    }

    const recent = this.callHistory.slice(-this.windowSize);
    const successCount = recent.filter((r) => r.status === 'success').length;

    const byProvider: Record<string, { success: number; failed: number; rate: number }> = {};
    for (const r of recent) {
      if (!byProvider[r.provider]) {
        byProvider[r.provider] = { success: 0, failed: 0, rate: 0 };
      }
      if (r.status === 'success') {
        byProvider[r.provider].success++;
      } else {
        byProvider[r.provider].failed++;
      }
    }
    for (const key of Object.keys(byProvider)) {
      const provTotal = byProvider[key].success + byProvider[key].failed;
      byProvider[key].rate = provTotal > 0 ? byProvider[key].success / provTotal : 0;
    }

    // P0-T1.3: 暴露各 provider 熔断状态
    const circuits: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    for (const [provider, cb] of this.circuitBreakers.entries()) {
      circuits[provider] = cb.getStats();
    }

    return {
      successRate: successCount / recent.length,
      totalCalls: total,
      recentCalls: recent.length,
      byProvider,
      recentWindow: this.windowSize,
      circuits,
    };
  }
}
