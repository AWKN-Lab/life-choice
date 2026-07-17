import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisLogger = new Logger('RedisModule');

const redisFactory = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService) => {
    const redisEnabled = config.get('REDIS_ENABLED', 'true') !== 'false';

    if (!redisEnabled) {
      redisLogger.warn('REDIS_ENABLED=false, Redis client initialization skipped');
      return null;
    }

    const host = config.get('REDIS_HOST', '127.0.0.1');
    const port = config.get('REDIS_PORT', 6379);
    const password = config.get('REDIS_PASSWORD', '');
    const client = new Redis({
      host,
      port: Number(port),
      password: password || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    client.on('ready', () => {
      redisLogger.log(`[Redis] connected to ${host}:${port}`);
    });

    client.on('error', (error) => {
      redisLogger.warn(`[Redis] ${error.message}`);
    });

    client.connect().catch((error) => {
      redisLogger.warn(`[Redis] initial connect failed: ${error.message}`);
    });

    return client;
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [redisFactory],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
