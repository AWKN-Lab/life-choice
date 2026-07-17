import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LlmCallRecord {
  timestamp: string;
  provider: string;
  model: string;
  routeType: string;
  durationMs: number;
  status: 'success' | 'failed';
  errorReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  retryCount: number;
  promptVersion?: string;
}

@Injectable()
export class LlmCallLogger {
  private readonly logger = new Logger(LlmCallLogger.name);
  private readonly logDir: string;
  private currentLogFile: string;

  constructor() {
    this.logDir = path.resolve(process.cwd(), 'logs');
    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().slice(0, 10);
    return path.join(this.logDir, `llm-calls-${date}.log`);
  }

  private rotateLogIfNeeded() {
    const expected = this.getLogFilePath();
    if (expected !== this.currentLogFile) {
      this.currentLogFile = expected;
    }
  }

  logCall(record: LlmCallRecord) {
    this.rotateLogIfNeeded();
    const line = JSON.stringify(record) + '\n';
    try {
      fs.appendFileSync(this.currentLogFile, line, 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to write LLM call log: ${(err as Error).message}`);
    }
  }
}