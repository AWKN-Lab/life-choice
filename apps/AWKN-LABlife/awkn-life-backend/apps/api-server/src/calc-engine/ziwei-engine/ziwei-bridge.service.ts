/**
 * Ziwei Bridge Service - 紫微斗数 Python 验证器桥接
 *
 * 来源：天火吸收计划 Phase 3.3.5
 * 通过 child_process 调用 ziwei-reverse/python-validator/paipan_cli.py
 *
 * 保留 Python 不重写为 TS 的理由：
 * - R1-R9 已收口，重写风险高
 * - sxtwl 在 Node 侧无成熟替代
 * - 通过 CLI 桥接成本低
 */

import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// CLI 执行参数（提取为常量，便于维护）
const CLI_TIMEOUT_MS = 30000;
const CLI_MAX_BUFFER = 1024 * 1024 * 10;

// 天干地支正则（2 字符：1 天干 + 1 地支）
const GANZHI_PATTERN = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;

export interface ZiweiPaipanInput {
  year: number;
  month: number;
  day: number;
  hour: number;          // 0-23
  gender: 'male' | 'female';
  isLeapMonth?: boolean;
}

export interface ZiweiResult {
  raw: string;           // CLI JSON 输出
  parsed?: any;          // 解析后的命盘对象
}

export interface ZiweiBzfcInput {
  yearGanZhi?: string;
  monthGanZhi?: string;
  dayGanZhi?: string;
  hourGanZhi?: string;
}

export interface ZiweiZizhanInput {
  mode: 'now' | 'random' | 'number';
  number?: number;
}

@Injectable()
export class ZiweiBridgeService {
  private readonly logger = new Logger(ZiweiBridgeService.name);

  /**
   * Python 验证器目录路径
   * 优先级：环境变量 ZIWEI_VALIDATOR_DIR > 合并后路径 > 回退路径
   */
  private getValidatorDir(): string {
    // 优先使用环境变量（部署时配置）
    const envDir = process.env.ZIWEI_VALIDATOR_DIR;
    if (envDir && existsSync(envDir)) return envDir;

    // 合并后位于 calc-engine/ziwei-engine/python-validator/
    const localPath = join(__dirname, 'python-validator');
    if (existsSync(localPath)) return localPath;

    // 回退到原 projects/ziwei-reverse/python-validator/
    const fallbackPath = join(process.cwd(), '..', '..', '..', '..', '..', '..', 'projects', 'ziwei-reverse', 'python-validator');
    return fallbackPath;
  }

  /**
   * 校验天干地支格式（防命令注入）
   */
  private validateGanZhi(value: string, field: string): void {
    if (!GANZHI_PATTERN.test(value)) {
      throw new Error(`参数 ${field} 格式非法，应为天干+地支 2 字符`);
    }
  }

  /**
   * 排盘
   */
  async paipan(input: ZiweiPaipanInput): Promise<ZiweiResult> {
    // 参数校验
    if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
      throw new Error('year 参数非法（应为 1900-2100 整数）');
    }
    if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
      throw new Error('month 参数非法（应为 1-12 整数）');
    }
    if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) {
      throw new Error('day 参数非法（应为 1-31 整数）');
    }
    if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
      throw new Error('hour 参数非法（应为 0-23 整数）');
    }

    const args = [
      '-y', String(input.year),
      '-m', String(input.month),
      '-d', String(input.day),
      '-h', String(input.hour),
      '-g', input.gender === 'male' ? '1' : '0',
      '--json',
    ];
    if (input.isLeapMonth) args.push('--leap');

    const stdout = await this.runCli(args);
    return { raw: stdout, parsed: this.safeParse(stdout) };
  }

  /**
   * 四柱反查
   */
  async bzfc(input: ZiweiBzfcInput): Promise<ZiweiResult> {
    // 参数校验（防命令注入）
    if (input.yearGanZhi) this.validateGanZhi(input.yearGanZhi, 'yearGanZhi');
    if (input.monthGanZhi) this.validateGanZhi(input.monthGanZhi, 'monthGanZhi');
    if (input.dayGanZhi) this.validateGanZhi(input.dayGanZhi, 'dayGanZhi');
    if (input.hourGanZhi) this.validateGanZhi(input.hourGanZhi, 'hourGanZhi');

    const args = ['--bzfc', '--json'];
    if (input.yearGanZhi) args.push('--ygz', input.yearGanZhi);
    if (input.monthGanZhi) args.push('--mgz', input.monthGanZhi);
    if (input.dayGanZhi) args.push('--dgz', input.dayGanZhi);
    if (input.hourGanZhi) args.push('--hgz', input.hourGanZhi);

    const stdout = await this.runCli(args);
    return { raw: stdout, parsed: this.safeParse(stdout) };
  }

  /**
   * 紫占排盘
   */
  async zizhan(input: ZiweiZizhanInput): Promise<ZiweiResult> {
    // 参数校验
    if (!['now', 'random', 'number'].includes(input.mode)) {
      throw new Error('mode 参数非法（应为 now/random/number）');
    }

    const args = ['--zizhan', input.mode, '--json'];
    if (input.mode === 'number' && input.number !== undefined) {
      if (!Number.isInteger(input.number) || input.number < 1 || input.number > 9999) {
        throw new Error('number 参数非法（应为 1-9999 整数）');
      }
      args.push('--num', String(input.number));
    }

    const stdout = await this.runCli(args);
    return { raw: stdout, parsed: this.safeParse(stdout) };
  }

  private async runCli(args: string[]): Promise<string> {
    const dir = this.getValidatorDir();
    const python = process.env.PYTHON || 'python';
    const script = join(dir, 'paipan_cli.py');

    try {
      this.logger.debug(`[ZiweiBridge] exec: ${python} ${script} ${args.join(' ')}`);
      const { stdout, stderr } = await execFileAsync(python, [script, ...args], {
        cwd: dir,
        timeout: CLI_TIMEOUT_MS,
        maxBuffer: CLI_MAX_BUFFER,
        encoding: 'utf-8',
      });
      if (stderr) {
        this.logger.warn(`[ZiweiBridge] stderr: ${stderr.substring(0, 200)}`);
      }
      return stdout;
    } catch (err: any) {
      // 错误信息脱敏：内部路径仅记日志，对外抛业务错误
      this.logger.error(`[ZiweiBridge] CLI 执行失败: ${err.message}`);
      throw new Error('紫微排盘 CLI 执行失败，请检查 Python 环境与参数');
    }
  }

  private safeParse(text: string): any | undefined {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
}
