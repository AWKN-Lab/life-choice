/**
 * V1DeprecationInterceptor — 给旧 kline-tide V1 端点添加 X-Deprecation header
 *
 * 来源：TECHNICAL-REFERENCE-P01 §3.4 "旧 API 兼容"
 *
 * 策略：所有 /api/v1/kline-tide/* 响应附带
 *   X-Deprecation: kline-v1-deprecated
 *   X-Deprecation-Date: 2026-07-12
 *   X-Deprecation-Sunset: 2026-07-26 (14 天后下线)
 *   X-Upgrade-To: /api/v1/kline-v2
 *
 * 新客户端应直接调用 /api/v1/kline-v2/* 端点
 */

import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const DEPRECATION_SUNSET_DATE = '2026-07-26';

@Injectable()
export class V1DeprecationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    if (response?.setHeader) {
      response.setHeader('X-Deprecation', 'kline-v1-deprecated');
      response.setHeader('X-Deprecation-Date', '2026-07-12');
      response.setHeader('X-Deprecation-Sunset', DEPRECATION_SUNSET_DATE);
      response.setHeader('X-Upgrade-To', '/api/v1/kline-v2');
    }

    return next.handle();
  }
}
