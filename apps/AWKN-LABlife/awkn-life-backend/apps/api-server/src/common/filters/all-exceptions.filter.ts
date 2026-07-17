import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 全局异常过滤器
 * - HttpException：按原始状态码和消息返回（业务异常）
 * - 其他异常：记录完整 stack，返回 500 通用错误（不泄露内部细节）
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      // 业务异常：保留原始状态码和消息
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, any>;
        message = r.message || r.error || exception.message;
        // 如果 message 是数组（ValidationPipe），取第一条
        if (Array.isArray(message)) {
          message = message.join('; ');
        }
      } else {
        message = exception.message;
      }
      error = exception.name;
    } else {
      // 程序 bug（TypeError 等）：记录完整 stack，返回通用错误
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '服务暂时不可用，请稍后重试';
      error = 'InternalServerError';
      this.logger.error(
        `Unhandled exception: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // 业务异常也记录 warn 级别（便于排查）
    if (status >= 400 && status < 500 && !(exception instanceof HttpException)) {
      this.logger.warn(`Client error: ${request.method} ${request.url} ${status} - ${message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
