import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { LlmCallRecord } from '../shared/logger/llm-call-logger';

/**
 * Phase 5 T5.2: LLM 成本看板
 * - 聚合 logs/llm-calls-*.log，按 provider / routeType / 日期维度统计
 * - 单轮 vs 多轮成本对比
 * - 单测覆盖：LlmCostDashboardService.spec.ts
 */
export interface CostRates {
  /** 每 1M token 价格（CNY） */
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface CostSummary {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  /** 估算总成本（CNY） */
  estimatedCostCNY: number;
  /** 平均单次调用耗时（ms） */
  avgDurationMs: number;
  /** 平均重试次数 */
  avgRetryCount: number;
}

export interface GroupedCostSummary extends CostSummary {
  key: string;
}

export interface CostDashboard {
  generatedAt: string;
  range: { startDate: string; endDate: string };
  overall: CostSummary;
  byProvider: GroupedCostSummary[];
  byRouteType: GroupedCostSummary[];
  byDate: GroupedCostSummary[];
  /** 单轮 vs 多轮对比 */
  multiVsSingleTurn: {
    singleTurn: CostSummary;
    multiTurn: CostSummary;
    /** 多轮相比单轮的平均单次成本放大倍数 */
    costMultiplier: number;
  };
}

/**
 * 各 provider 单价（CNY / 1M tokens）
 * 来源：参考各厂商公开定价（2026 Q2）
 * 实际计费应以供应商账单为准，此处仅作成本看板估算
 */
const PROVIDER_RATES: Record<string, CostRates> = {
  minimax: { inputPerMillion: 10, outputPerMillion: 30 },
  doubao: { inputPerMillion: 4, outputPerMillion: 12 },
  deepseek: { inputPerMillion: 1, outputPerMillion: 2 },
  sensenova: { inputPerMillion: 0.8, outputPerMillion: 2 },
  'deepseek-direct': { inputPerMillion: 1, outputPerMillion: 2 },
  spark: { inputPerMillion: 4, outputPerMillion: 12 },
};

const DEFAULT_RATE: CostRates = { inputPerMillion: 2, outputPerMillion: 6 };

@Injectable()
export class LlmCostDashboardService {
  private readonly logger = new Logger(LlmCostDashboardService.name);

  /**
   * 读取指定日期范围内的 LLM 调用日志
   * @param days 最近 N 天（默认 7）
   */
  async loadRecords(days = 7): Promise<LlmCallRecord[]> {
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) return [];

    const files = fs.readdirSync(logDir).filter(f => f.startsWith('llm-calls-') && f.endsWith('.log'));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const records: LlmCallRecord[] = [];

    for (const file of files) {
      // llm-calls-YYYY-MM-DD.log
      const dateStr = file.replace('llm-calls-', '').replace('.log', '');
      const fileDate = new Date(dateStr);
      if (isNaN(fileDate.getTime())) continue;
      if (fileDate < cutoff) continue;

      const filePath = path.join(logDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          records.push(JSON.parse(trimmed) as LlmCallRecord);
        } catch {
          // 跳过格式异常行
        }
      }
    }
    return records;
  }

  /**
   * 估算单条记录的成本（CNY）
   */
  estimateCost(record: LlmCallRecord): number {
    const rate = PROVIDER_RATES[record.provider] || DEFAULT_RATE;
    const inputTokens = record.promptTokens || 0;
    const outputTokens = record.completionTokens || 0;
    return (inputTokens / 1_000_000) * rate.inputPerMillion
      + (outputTokens / 1_000_000) * rate.outputPerMillion;
  }

  /**
   * 聚合一组记录为 CostSummary
   */
  private summarize(records: LlmCallRecord[]): CostSummary {
    if (records.length === 0) {
      return {
        totalCalls: 0,
        successCalls: 0,
        failedCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        estimatedCostCNY: 0,
        avgDurationMs: 0,
        avgRetryCount: 0,
      };
    }
    let success = 0;
    let failed = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let cost = 0;
    let durationSum = 0;
    let retrySum = 0;
    for (const r of records) {
      if (r.status === 'success') success++; else failed++;
      inputTokens += r.promptTokens || 0;
      outputTokens += r.completionTokens || 0;
      totalTokens += r.totalTokens || 0;
      cost += this.estimateCost(r);
      durationSum += r.durationMs || 0;
      retrySum += r.retryCount || 0;
    }
    return {
      totalCalls: records.length,
      successCalls: success,
      failedCalls: failed,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalTokens,
      estimatedCostCNY: Math.round(cost * 10000) / 10000,
      avgDurationMs: Math.round(durationSum / records.length),
      avgRetryCount: Math.round((retrySum / records.length) * 100) / 100,
    };
  }

  /**
   * 按字段分组聚合
   */
  private groupBy(
    records: LlmCallRecord[],
    keyFn: (r: LlmCallRecord) => string,
  ): GroupedCostSummary[] {
    const groups = new Map<string, LlmCallRecord[]>();
    for (const r of records) {
      const key = keyFn(r);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const result: GroupedCostSummary[] = [];
    for (const [key, groupRecords] of groups.entries()) {
      result.push({ key, ...this.summarize(groupRecords) });
    }
    result.sort((a, b) => b.estimatedCostCNY - a.estimatedCostCNY);
    return result;
  }

  /**
   * 判断记录是否属于多轮对话（routeType=clarify 视为多轮追问）
   * 注：现有日志未单独记录 dialogueId，使用 routeType 近似判断
   */
  private isMultiTurn(record: LlmCallRecord): boolean {
    return record.routeType === 'clarify' || record.routeType === 'zhangsheng';
  }

  /**
   * 生成完整成本看板
   */
  async getDashboard(days = 7): Promise<CostDashboard> {
    const records = await this.loadRecords(days);
    const overall = this.summarize(records);

    const byProvider = this.groupBy(records, r => r.provider);
    const byRouteType = this.groupBy(records, r => r.routeType);
    const byDate = this.groupBy(records, r => (r.timestamp || '').slice(0, 10));

    const singleTurnRecords = records.filter(r => !this.isMultiTurn(r));
    const multiTurnRecords = records.filter(r => this.isMultiTurn(r));
    const singleTurn = this.summarize(singleTurnRecords);
    const multiTurn = this.summarize(multiTurnRecords);

    // 成本放大倍数 = 多轮平均单次成本 / 单轮平均单次成本
    const singlePerCall = singleTurn.totalCalls > 0
      ? singleTurn.estimatedCostCNY / singleTurn.totalCalls : 0;
    const multiPerCall = multiTurn.totalCalls > 0
      ? multiTurn.estimatedCostCNY / multiTurn.totalCalls : 0;
    const costMultiplier = singlePerCall > 0
      ? Math.round((multiPerCall / singlePerCall) * 100) / 100 : 0;

    const dates = records.map(r => r.timestamp).filter(Boolean).sort();
    return {
      generatedAt: new Date().toISOString(),
      range: {
        startDate: dates[0] || '',
        endDate: dates[dates.length - 1] || '',
      },
      overall,
      byProvider,
      byRouteType,
      byDate,
      multiVsSingleTurn: {
        singleTurn,
        multiTurn,
        costMultiplier,
      },
    };
  }
}
