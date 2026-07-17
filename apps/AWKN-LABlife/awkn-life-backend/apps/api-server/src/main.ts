// dotenv 必须在所有 import 之前加载，否则 AuthModule 等模块
// 在 module evaluation 阶段就会读取 process.env 导致 undefined
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });
// 同时尝试当前目录（兼容不同构建输出）
dotenv.config({ path: path.resolve(__dirname, '.env') });

import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { logger } from './logger';

async function bootstrap() {
  // Sentry 初始化（条件加载：SENTRY_DSN 为空时不初始化）
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }

  const app = await NestFactory.create(AppModule);

  // Sentry 全局异常捕获：上报未捕获异常与未处理 Promise 拒绝
  if (process.env.SENTRY_DSN) {
    process.on('uncaughtException', (err) => {
      Sentry.captureException(err);
      logger.error('uncaughtException: ' + (err?.stack || err));
    });
    process.on('unhandledRejection', (reason) => {
      Sentry.captureException(reason);
      logger.error('unhandledRejection: ' + (reason instanceof Error ? reason.stack : String(reason)));
    });
  }

  // CORS 配置：从环境变量读取，支持多个前端 origin
  const localDevPorts = [5173, 5174, 5175, 5176, 5177, 5180, 8080, 8081, 8085, 8086, 8087, 8088];
  const defaultOrigins = [
    ...localDevPorts.flatMap((port) => [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ]),
    'https://awkn.cn',
    'https://www.awkn.cn',
  ];
  const envOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean) || [];
  const corsOrigins = [...new Set([...envOrigins, ...defaultOrigins])].filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  // 启用全局输入校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  // 全局异常过滤器：区分业务异常和程序 bug
  app.useGlobalFilters(new AllExceptionsFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // P0-4: 管理员保底检查
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    if (adminCount === 0) {
      logger.warn('⚠️ 警告：数据库中无管理员账号！请运行: ADMIN_PASSWORD=xxx node scripts/ensure-admin.js');
    } else {
      logger.info(`✅ 管理员保底检查通过（${adminCount} 个管理员）`);
    }
    await prisma.$disconnect();
  } catch (err) {
    logger.warn('⚠️ 管理员保底检查失败（非致命）: ' + (err?.message || err));
  }

  // P0-6: 必需环境变量校验
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    logger.error(`❌ 缺少必需环境变量: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  await app.listen(port);
  logger.info(`🚀 API Server running on http://localhost:${port}`);

  // 启动对话超时清理定时任务（每 5 分钟扫描卡在 GENERATING 超过 3 分钟的对话）
  try {
    const { DialogueTimeoutService } = await import('./consult/dialogue/dialogue-timeout.service');
    const dialogueTimeout = app.get(DialogueTimeoutService);
    dialogueTimeout.start();
  } catch (err) {
    logger.warn('⚠️ 对话超时清理服务启动失败（非致命）: ' + (err?.message || err));
  }
}

bootstrap();
