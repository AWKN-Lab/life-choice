import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AgentRunLog } from './agent-run.types';

@Injectable()
export class AgentRunLogger {
  private readonly logDir: string;

  constructor() {
    // 日志目录：项目根目录下的 logs/agent-runs/
    this.logDir = path.join(process.cwd(), 'logs', 'agent-runs');
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(entry: AgentRunLog): void {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filePath = path.join(this.logDir, `${date}.jsonl`);
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(filePath, line, 'utf-8');
  }

  async logAsync(entry: AgentRunLog): Promise<void> {
    return new Promise((resolve, reject) => {
      const date = new Date().toISOString().slice(0, 10);
      const filePath = path.join(this.logDir, `${date}.jsonl`);
      const line = JSON.stringify(entry) + '\n';
      fs.appendFile(filePath, line, 'utf-8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** 读取指定日期的日志 */
  readByDate(date: string): AgentRunLog[] {
    const filePath = path.join(this.logDir, `${date}.jsonl`);
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line) as AgentRunLog);
  }
}
