/**
 * Structured Logger for AWKN-Lab
 *
 * Inspired by Alice Engineering Methodology Chapter 13 (Observability):
 * - Call source classification is the key to cost attribution
 * - Every LLM call records: source, model, tokens, duration, session
 * - Without source field: "you spent X tokens" → useless
 * - With source field: "main dialogue 60%, compression 30%, memory 10%" → actionable
 */

import { Logger } from '@nestjs/common';

export enum CallSource {
  MAIN_DIALOGUE = 'main_dialogue',
  MEMORY_EXTRACTION = 'memory_extraction',
  COMPRESSION = 'compression',
  CLASSIFIER = 'classifier',
  SUB_AGENT = 'sub_agent',
  HEALTH_CHECK = 'health_check',
  ADMIN = 'admin',
  AUTH = 'auth',
  CONSULT = 'consult',
}

export interface LLMCallLog {
  source: CallSource;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs: number;
  sessionId?: string;
  userId?: string;
  success: boolean;
  error?: string;
}

export interface StructuredLogMeta {
  source: CallSource;
  operation: string;
  durationMs?: number;
  sessionId?: string;
  userId?: string;
  [key: string]: unknown;
}

type LogMethod = (message: string, context?: string) => void;

export class StructuredLogger extends Logger {
  private static formatMeta(meta: StructuredLogMeta): string {
    const parts: string[] = [];
    if (meta.source) parts.push(`source=${meta.source}`);
    if (meta.operation) parts.push(`op=${meta.operation}`);
    if (meta.durationMs !== undefined) parts.push(`duration=${meta.durationMs}ms`);
    if (meta.sessionId) parts.push(`session=${meta.sessionId}`);
    if (meta.userId) parts.push(`user=${meta.userId}`);
    return parts.join(' ');
  }

  private static formatLLMCall(call: LLMCallLog): string {
    const status = call.success ? 'OK' : 'FAIL';
    const tokens = call.inputTokens && call.outputTokens
      ? `tokens=${call.inputTokens + call.outputTokens}(in=${call.inputTokens},out=${call.outputTokens})`
      : 'tokens=unknown';
    return `[LLM][${status}][${call.source}] model=${call.model} ${tokens} duration=${call.durationMs}ms${call.error ? ` error=${call.error}` : ''}`;
  }

  infoOp(meta: StructuredLogMeta, message: string): void {
    this.log(`[${StructuredLogger.formatMeta(meta)}] ${message}`);
  }

  warnOp(meta: StructuredLogMeta, message: string): void {
    this.warn(`[${StructuredLogger.formatMeta(meta)}] ${message}`);
  }

  errorOp(meta: StructuredLogMeta, message: string, trace?: string): void {
    this.error(`[${StructuredLogger.formatMeta(meta)}] ${message}`, trace);
  }

  /**
   * Log an LLM API call with full observability data.
   * This is the single most important logging function for cost attribution.
   */
  logLLMCall(call: LLMCallLog): void {
    const formatted = StructuredLogger.formatLLMCall(call);
    if (call.success) {
      this.log(formatted);
    } else {
      this.error(formatted);
    }
  }

  /**
   * Create a timer for duration tracking.
   * Usage: const done = logger.startTimer(); await doWork(); done({source: ..., op: ...});
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Wrap a function with automatic LLM call logging.
   * Usage: await logger.withLLMLog(CallSource.CONSULT, 'gpt-4o', sessionId, async () => { ... });
   */
  async withLLMLog<T>(
    source: CallSource,
    model: string,
    sessionId: string | undefined,
    fn: () => Promise<{ result: T; inputTokens?: number; outputTokens?: number }>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const { result, inputTokens, outputTokens } = await fn();
      this.logLLMCall({
        source,
        model,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - start,
        sessionId,
        success: true,
      });
      return result;
    } catch (err) {
      this.logLLMCall({
        source,
        model,
        durationMs: Date.now() - start,
        sessionId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}