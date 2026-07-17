/**
 * Winston 日志聚合模块
 *
 * 特性：
 * - 每日轮转，保留 30 天
 * - combined 日志：logs/backend-YYYY-MM-DD.log（所有级别）
 * - error 日志：logs/backend-error-YYYY-MM-DD.log（仅 error）
 * - 开发环境额外输出到 console
 * - 格式：timestamp [level] [context] message
 *
 * 用法：
 *   - 直接使用导出的 logger 实例：import { logger } from './logger'; logger.info('msg');
 *   - NestJS 注入：app.useLogger(new WinstonLoggerService())
 */

import * as path from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerService as NestLoggerService } from '@nestjs/common';

// 日志目录：相对于后端根目录（process.cwd()）
const LOG_DIR = path.resolve(process.cwd(), 'logs');

// 日志格式：timestamp [level] [context] message
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const ts = info.timestamp;
    const level = (info.level || 'info').toUpperCase();
    const context = info.context ? `[${info.context}]` : '';
    const message = info.message;
    const stack = info.stack ? `\n${info.stack}` : '';
    return `${ts} [${level}] ${context} ${message}${stack}`;
  }),
);

// console 格式（带颜色）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const ts = info.timestamp;
    const level = info.level;
    const context = info.context ? `[${info.context}]` : '';
    const message = info.message;
    const stack = info.stack ? `\n${info.stack}` : '';
    return `${ts} ${level} ${context} ${message}${stack}`;
  }),
);

// combined 轮转 transport（所有级别）
const combinedTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'backend-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'info',
  maxFiles: '30d',
  maxSize: '50m',
  zippedArchive: false,
});

// error 轮转 transport（仅 error）
const errorTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: 'backend-error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  maxSize: '50m',
  zippedArchive: false,
});

// 根据环境决定是否启用 console transport
const isDev = process.env.NODE_ENV !== 'production';
const transports: winston.transport[] = [combinedTransport, errorTransport];
if (isDev) {
  transports.push(new winston.transports.Console({ format: consoleFormat }));
}

// 创建 winston logger 实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

/**
 * NestJS 兼容的 LoggerService 实现
 *
 * 用法（main.ts）：
 *   app.useLogger(new WinstonLoggerService())
 *
 * 或在 AppModule 中注册为 provider：
 *   { provide: 'LoggerService', useClass: WinstonLoggerService }
 */
export class WinstonLoggerService implements NestLoggerService {
  private defaultContext?: string;

  constructor(defaultContext?: string) {
    this.defaultContext = defaultContext;
  }

  log(message: any, context?: string): void {
    this.write('info', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: any, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    this.write('verbose', message, context);
  }

  fatal(message: any, context?: string): void {
    this.write('error', message, context);
  }

  private write(level: string, message: any, context?: string, trace?: string): void {
    const ctx = context || this.defaultContext;
    const meta: any = {};
    if (ctx) meta.context = ctx;

    // 处理 Error 对象
    if (message instanceof Error) {
      meta.stack = message.stack;
      message = message.message;
    }

    // NestJS error 的 trace 参数
    if (trace && typeof trace === 'string') {
      meta.stack = meta.stack ? `${meta.stack}\n${trace}` : trace;
    }

    logger.log(level, String(message), meta);
  }
}

export default logger;