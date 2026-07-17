import { Injectable, Logger } from '@nestjs/common';
import { LlmCallLogger } from '../shared/logger/llm-call-logger';
import { LlmHealthService } from '../shared/monitor/llm-health.service';
import { PromptRegistryService } from '../shared/prompt-registry/prompt-registry.service';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * P0-T1.1: 结构化 LLM 错误类型
 * 替代原 catch 块把 403/429/5xx 全塞进 err.message 字符串的旧实现
 * 支持按 HTTP 状态码分流策略：
 *  - 403 → 立即切备用 + 标记 provider 冷却 10min
 *  - 429 → 读 Retry-After，无则指数退避重试同 provider 3 次
 *  - 5xx/网络 → 重试同 provider 2 次
 *  - 超时 → 重试同 provider 1 次后切
 */
export class LlmError extends Error {
  readonly provider: LlmProviderType;
  readonly httpStatus?: number;
  readonly errorCode?: string;
  readonly retryAfterMs?: number;
  readonly isRetryable: boolean;
  readonly isTimeout: boolean;
  readonly isAuthError: boolean;
  readonly isRateLimit: boolean;
  readonly raw: Error;

  constructor(
    provider: LlmProviderType,
    message: string,
    opts: {
      httpStatus?: number;
      errorCode?: string;
      retryAfterMs?: number;
      isTimeout?: boolean;
      raw?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'LlmError';
    this.provider = provider;
    this.httpStatus = opts.httpStatus;
    this.errorCode = opts.errorCode;
    this.retryAfterMs = opts.retryAfterMs;
    this.isTimeout = opts.isTimeout === true;
    this.raw = opts.raw || new Error(message);

    // P0-T1.1: 按状态码分类可重试性
    // 403/401 → 鉴权/配额问题，重试同 provider 无意义，立即切
    // 429 → 限流，等一会儿重试同 provider 可能有效
    // 5xx → 服务端临时问题，重试同 provider 可能有效
    // 超时 → 网络抖动，重试同 provider 可能有效
    // 其他 → 默认不重试
    this.isAuthError = opts.httpStatus === 403 || opts.httpStatus === 401;
    this.isRateLimit = opts.httpStatus === 429;
    this.isRetryable = this.isRateLimit
      || (opts.httpStatus !== undefined && opts.httpStatus >= 500)
      || this.isTimeout;
  }
}

/**
 * P0-T1.4: 令牌桶限流
 * 按 provider RPM（每分钟请求数）配置，调用前 acquireToken
 * 无 token 时返回 false，调用方抛 LlmError(isRateLimit) 触发退避重试
 * 令牌按时间线性补充：tokens += elapsedMs * (rpm / 60000)
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  /** 上次 acquire 失败后，下次最早可重试的时间戳（用于计算 retryAfterMs） */
  private nextAvailableAt = 0;

  constructor(
    private readonly capacity: number,
    private readonly rpm: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * 尝试获取 1 个 token
   * @returns true=成功，false=限流（无 token）
   */
  acquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    // 计算 token 恢复需要的时间
    const msPerToken = 60000 / this.rpm;
    this.nextAvailableAt = Date.now() + Math.ceil(msPerToken);
    return false;
  }

  /** 获取限流时建议的 retryAfterMs（供 LlmError 使用） */
  getRetryAfterMs(): number {
    const remain = this.nextAvailableAt - Date.now();
    return remain > 0 ? remain : 1000;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const refilled = elapsed * (this.rpm / 60000);
    this.tokens = Math.min(this.capacity, this.tokens + refilled);
    this.lastRefill = now;
  }

  getStats() {
    this.refill();
    return { tokens: Math.floor(this.tokens), capacity: this.capacity, rpm: this.rpm };
  }
}

export interface LlmResponse {
  content: string;
  provider: string;
  model: string;
  durationMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  reasoningContent?: string;
  // P0-4: 截断检测信号（向后兼容，缺省 undefined 表示未截断或流式无信号）
  // 取值: 'stop'(正常结束) | 'length'(达到max_tokens被截断) | 'content_filter'(被内容过滤) | 'tool_calls' | null
  finishReason?: string | null;
}

export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  jsonMode?: boolean;
  thinking?: boolean;
  promptVersion?: string;
  stream?: boolean;
  onToken?: (token: string) => void;
}

export type LlmProviderType = 'minimax' | 'doubao' | 'deepseek' | 'sensenova' | 'deepseek-direct' | 'spark';

@Injectable()
export class LlmProvidersService {
  private readonly logger = new Logger(LlmProvidersService.name);
  private readonly callLogger = new LlmCallLogger();
  private readonly healthService = new LlmHealthService();
  private readonly promptRegistry = new PromptRegistryService();
  /**
   * P0-T1.1: provider 冷却表
   * key=provider名, value=冷却到期时间戳(ms)
   * 403/401 触发冷却 10 分钟，冷却期内 provider 不参与 fallback 链
   */
  private readonly providerCooldownUntil: Map<LlmProviderType, number> = new Map();
  private static readonly AUTH_ERROR_COOLDOWN_MS = 10 * 60 * 1000; // 10 分钟
  /**
   * P0-T1.4: provider 令牌桶限流表
   * 按 RPM 限流，避免触发供应商 429
   * 阈值从 env LLM_RPM_${PROVIDER} 读取，默认 60 RPM
   */
  private readonly tokenBuckets: Map<LlmProviderType, TokenBucket> = new Map();
  private static readonly DEFAULT_RPM = 60;

  private readonly providers = {
    minimax: {
      apiKey: '',
      baseUrl: 'https://api.minimaxi.com/v1',
      model: 'MiniMax-M2.7',
      endpoint: '/chat/completions',
    },
    doubao: {
      apiKey: '',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      model: 'Doubao-Seed-2.0-pro',
      endpoint: '/chat/completions',
    },
    deepseek: {
      apiKey: '',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      model: 'deepseek-chat',
      endpoint: '/chat/completions',
    },
    sensenova: {
      apiKey: '',
      baseUrl: 'https://token.sensenova.cn/v1',
      model: 'deepseek-v4-flash',
      endpoint: '/chat/completions',
    },
    'deepseek-direct': {
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-pro',
      endpoint: '/chat/completions',
    },
    spark: {
      apiKey: '',
      baseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v2',
      model: 'xopqwen36v35b',
      endpoint: '/chat/completions',
      resourceId: '0',
    },
  };

  private defaultProvider: LlmProviderType = 'sensenova';
  private cheapProvider: LlmProviderType = 'sensenova';

  constructor() {
    const volcengineKey =
      process.env.VOLCENGINE_API_KEY ||
      process.env.ARK_API_KEY ||
      '';

    this.providers.doubao.apiKey =
      process.env.DOUBAO_API_KEY ||
      volcengineKey;
    this.providers.doubao.baseUrl =
      process.env.DOUBAO_BASE_URL ||
      'https://ark.cn-beijing.volces.com/api/v3';
    this.providers.doubao.model =
      process.env.DOUBAO_MODEL ||
      'ep-20260426223838-l8sv4';

    this.providers.minimax.apiKey =
      process.env.MINIMAX_API_KEY ||
      '';
    this.providers.minimax.baseUrl =
      process.env.MINIMAX_BASE_URL ||
      'https://api.minimaxi.com/v1';
    this.providers.minimax.model =
      process.env.MINIMAX_MODEL ||
      'MiniMax-M2.7';

    this.providers.deepseek.apiKey =
      process.env.DEEPSEEK_API_KEY ||
      volcengineKey;
    this.providers.deepseek.baseUrl =
      process.env.DEEPSEEK_BASE_URL ||
      'https://ark.cn-beijing.volces.com/api/v3';
    this.providers.deepseek.model =
      process.env.DEEPSEEK_MODEL ||
      'deepseek-chat';

    this.providers.sensenova.apiKey =
      process.env.SENSENOVA_API_KEY ||
      '';
    this.providers.sensenova.baseUrl =
      process.env.SENSENOVA_BASE_URL ||
      'https://token.sensenova.cn/v1';
    this.providers.sensenova.model =
      process.env.SENSENOVA_MODEL ||
      'deepseek-v4-flash';

    this.providers['deepseek-direct'].apiKey =
      process.env.DEEPSEEK_DIRECT_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      '';
    this.providers['deepseek-direct'].baseUrl =
      process.env.DEEPSEEK_DIRECT_BASE_URL ||
      'https://api.deepseek.com/v1';
    this.providers['deepseek-direct'].model =
      process.env.DEEPSEEK_DIRECT_MODEL ||
      'deepseek-v4-pro';

    // 讯飞星火 HTTP 推理服务（OpenAI 兼容协议）
    this.providers.spark.apiKey =
      process.env.SPARK_API_KEY ||
      process.env.XFYUN_API_KEY ||
      '';
    this.providers.spark.baseUrl =
      process.env.SPARK_BASE_URL ||
      'https://maas-api.cn-huabei-1.xf-yun.com/v2';
    this.providers.spark.model =
      process.env.SPARK_MODEL ||
      'xopqwen36v35b';
    (this.providers.spark as any).resourceId =
      process.env.SPARK_RESOURCE_ID ||
      '0';

    const envProvider = process.env.DEFAULT_LLM_PROVIDER;
    this.defaultProvider = (envProvider === 'minimax' || envProvider === 'doubao' || envProvider === 'deepseek' || envProvider === 'sensenova' || envProvider === 'deepseek-direct' || envProvider === 'spark')
      ? envProvider as LlmProviderType
      : 'sensenova';

    const cheapEnv = process.env.CHEAP_LLM_PROVIDER;
    this.cheapProvider = (cheapEnv === 'minimax' || cheapEnv === 'doubao' || cheapEnv === 'deepseek' || cheapEnv === 'sensenova' || cheapEnv === 'deepseek-direct' || cheapEnv === 'spark')
      ? cheapEnv as LlmProviderType
      : 'sensenova';

    this.logger.log(
      `LLM Providers initialized | default: ${this.defaultProvider} (${this.providers[this.defaultProvider].model}) | cheap: ${this.cheapProvider} (${this.providers[this.cheapProvider].model}) | deepseek-direct: ${!!this.providers['deepseek-direct'].apiKey} | sensenova: ${!!this.providers.sensenova.apiKey} | doubao: ${!!this.providers.doubao.apiKey} | minimax: ${!!this.providers.minimax.apiKey} | deepseek: ${!!this.providers.deepseek.apiKey} | spark: ${!!this.providers.spark.apiKey}`,
    );

    // P0-T1.4: 初始化令牌桶（按 provider RPM 配置）
    const providerNames: LlmProviderType[] = ['minimax', 'doubao', 'deepseek', 'sensenova', 'deepseek-direct', 'spark'];
    for (const p of providerNames) {
      const envKey = `LLM_RPM_${p.toUpperCase().replace('-', '_')}`;
      const rpm = parseInt(process.env[envKey] || String(LlmProvidersService.DEFAULT_RPM), 10);
      const validRpm = rpm > 0 ? rpm : LlmProvidersService.DEFAULT_RPM;
      // 容量 = RPM（允许短时突发一分钟的配额），补充速率 = rpm/60000 per ms
      this.tokenBuckets.set(p, new TokenBucket(validRpm, validRpm));
    }
    this.logger.log(
      `[P0-T1.4] 令牌桶限流已初始化 | ` +
      providerNames.map(p => `${p}=${this.tokenBuckets.get(p)!.getStats().rpm}rpm`).join(' | '),
    );
  }

  /**
   * P0-T1.4: 获取 provider 令牌桶
   */
  private getTokenBucket(provider: LlmProviderType): TokenBucket {
    let bucket = this.tokenBuckets.get(provider);
    if (!bucket) {
      bucket = new TokenBucket(LlmProvidersService.DEFAULT_RPM, LlmProvidersService.DEFAULT_RPM);
      this.tokenBuckets.set(provider, bucket);
    }
    return bucket;
  }

  async chat(
    messages: LlmMessage[],
    provider?: LlmProviderType,
    options?: LlmOptions,
  ): Promise<LlmResponse> {
    const targetProvider = provider || this.defaultProvider;
    const config = this.providers[targetProvider];
    const startedAt = Date.now();

    if (!config.apiKey) {
      throw new Error(
        `${targetProvider} API key not configured. Set ${targetProvider.toUpperCase()}_API_KEY in .env`,
      );
    }

    // P0-T1.4: 限流前置检查 — 无 token 时抛 LlmError(isRateLimit) 触发退避重试
    const bucket = this.getTokenBucket(targetProvider);
    if (!bucket.acquire()) {
      const retryAfterMs = bucket.getRetryAfterMs();
      this.logger.warn(
        `[P0-T1.4] Provider ${targetProvider} 限流（无 token），retryAfterMs=${retryAfterMs}`,
      );
      throw new LlmError(
        targetProvider,
        `${targetProvider} 本地限流（RPM 已达上限），请等待 ${Math.ceil(retryAfterMs / 1000)}s 后重试`,
        { httpStatus: 429, retryAfterMs, errorCode: 'LOCAL_RATE_LIMIT' },
      );
    }

      const endpoint = `${config.baseUrl}${config.endpoint}`;
      const timeout = options?.timeout || (targetProvider === 'minimax' ? 180000 : 60000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const body: Record<string, unknown> = {
        model: config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      };
      if (options?.jsonMode) {
        body.response_format = { type: 'json_object' };
      }
      if (targetProvider === 'minimax') {
        body.reasoning_split = true;
      }
      if (targetProvider === 'deepseek-direct' && options?.thinking) {
        body.thinking = { type: 'enabled' };
      }
      // 讯飞星火：JSON Mode 建议关闭搜索
      if (targetProvider === 'spark' && options?.jsonMode) {
        body.search_disable = true;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      };
      // 讯飞星火：lora_id 走 extra_headers（对应 resourceId）
      if (targetProvider === 'spark') {
        const resourceId = (config as any).resourceId || '0';
        headers['lora_id'] = resourceId;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // P0-T1.1: 解析 Retry-After 头（429 限流用，单位秒）
        const retryAfterHeader = response.headers.get('retry-after');
        let retryAfterMs: number | undefined;
        if (retryAfterHeader) {
          const seconds = parseFloat(retryAfterHeader);
          if (!isNaN(seconds) && seconds >= 0) {
            retryAfterMs = Math.min(seconds * 1000, 60000); // 上限 60s
          }
        }
        // P0-T1.1: 尝试从 errorText 提取 errorCode（OpenAI 兼容格式）
        let errorCode: string | undefined;
        try {
          const errJson = JSON.parse(errorText);
          errorCode = errJson?.error?.code || errJson?.error?.type || errJson?.code;
        } catch {
          // 非 JSON 响应，errorCode 留空
        }
        throw new LlmError(
          targetProvider,
          `${targetProvider} API error ${response.status}: ${errorText}`,
          {
            httpStatus: response.status,
            errorCode,
            retryAfterMs,
          },
        );
      }

      const json = await response.json();

      let content: string;
      let reasoningContent: string | undefined;
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
      let finishReason: string | null = null;

      const openaiResp = json as {
        choices?: Array<{
          message?: { content?: string; reasoning_content?: string };
          finish_reason?: string | null;
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      content = this.cleanAssistantContent(openaiResp.choices?.[0]?.message?.content || '');
      reasoningContent = openaiResp.choices?.[0]?.message?.reasoning_content || undefined;
      // P0-4: 读取 finish_reason 供截断检测使用
      // 注意：fillish_reason 可能为 null（流式但未结束）或 undefined（旧 provider）
      finishReason = openaiResp.choices?.[0]?.finish_reason ?? null;
      usage = openaiResp.usage
        ? {
            promptTokens: openaiResp.usage.prompt_tokens || 0,
            completionTokens: openaiResp.usage.completion_tokens || 0,
            totalTokens: openaiResp.usage.total_tokens || 0,
          }
        : undefined;

      return {
        content,
        provider: targetProvider,
        model: config.model,
        durationMs: Date.now() - startedAt,
        usage,
        reasoningContent,
        finishReason,
      };
    } catch (error: unknown) {
      const err = error as Error;
      // P0-T1.1: 已是 LlmError 直接抛（保留结构化字段）
      if (err instanceof LlmError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        // P0-T1.1: 超时包装为 LlmError，标记 isTimeout=true 供重试层识别
        throw new LlmError(
          targetProvider,
          `${targetProvider} request timeout after ${timeout}ms`,
          { isTimeout: true, raw: err },
        );
      }
      // P0-T1.1: 其他网络/未知错误包装为 LlmError（无 httpStatus，isRetryable=false）
      this.logger.error(`${targetProvider} chat failed: ${err.message}`);
      throw new LlmError(targetProvider, err.message, { raw: err });
    }
  }

  private cleanAssistantContent(content: string): string {
    return content
      .replace(/<think[\s\S]*?<\/think>/gi, '')
      .trim();
  }

  /**
   * 流式 chat：逐 token 回调 onToken；内部走 chat() 的请求结构 + SSE 解析。
   * 失败时不 fallback 串行（避免多个流同时推送），由调用方决定是否重试。
   */
  async chatStream(
    messages: LlmMessage[],
    provider: LlmProviderType | undefined,
    options: LlmOptions,
  ): Promise<LlmResponse> {
    const targetProvider = provider || this.defaultProvider;
    const config = this.providers[targetProvider];
    const startedAt = Date.now();

    if (!config.apiKey) {
      throw new Error(
        `${targetProvider} API key not configured. Set ${targetProvider.toUpperCase()}_API_KEY in .env`,
      );
    }

    const endpoint = `${config.baseUrl}${config.endpoint}`;
    const timeout = options.timeout || 60000;
    const onToken = options.onToken;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const body: Record<string, unknown> = {
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    };
    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    if (targetProvider === 'minimax') {
      body.reasoning_split = true;
    }
    if (targetProvider === 'deepseek-direct' && options.thinking) {
      body.thinking = { type: 'enabled' };
    }
    if (targetProvider === 'spark' && options.jsonMode) {
      body.search_disable = true;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };
    if (targetProvider === 'spark') {
      const resourceId = (config as any).resourceId || '0';
      headers['lora_id'] = resourceId;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => '');
        // P0-T1.1: 流式调用同样解析 Retry-After 和 errorCode
        const retryAfterHeader = response.headers.get('retry-after');
        let retryAfterMs: number | undefined;
        if (retryAfterHeader) {
          const seconds = parseFloat(retryAfterHeader);
          if (!isNaN(seconds) && seconds >= 0) {
            retryAfterMs = Math.min(seconds * 1000, 60000);
          }
        }
        let errorCode: string | undefined;
        try {
          const errJson = JSON.parse(errorText);
          errorCode = errJson?.error?.code || errJson?.error?.type || errJson?.code;
        } catch {
          // 非 JSON
        }
        throw new LlmError(
          targetProvider,
          `${targetProvider} stream API error ${response.status}: ${errorText}`,
          {
            httpStatus: response.status,
            errorCode,
            retryAfterMs,
          },
        );
      }

      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullContent = '';
      let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
      let finishReason: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 帧以 \n\n 分隔；每帧可能含多行（event: / data: / 空行）
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const dataLines: string[] = [];
          for (const line of frame.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('data:')) {
              dataLines.push(trimmed.slice(5).trim());
            }
          }
          if (dataLines.length === 0) continue;
          const payload = dataLines.join('\n');
          if (payload === '[DONE]') continue;

          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
              usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
            };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              if (onToken) {
                try {
                  onToken(delta);
                } catch (cbErr) {
                  this.logger.warn(`[chatStream] onToken callback threw: ${(cbErr as Error).message}`);
                }
              }
            }
            if (json.choices?.[0]?.finish_reason) {
              finishReason = json.choices[0].finish_reason;
            }
            if (json.usage) {
              usage = {
                promptTokens: json.usage.prompt_tokens || 0,
                completionTokens: json.usage.completion_tokens || 0,
                totalTokens: json.usage.total_tokens || 0,
              };
            }
          } catch (parseErr) {
            this.logger.warn(`[chatStream] SSE payload parse error: ${(parseErr as Error).message}, payload=${payload.slice(0, 80)}`);
          }
        }
      }

      const cleaned = this.cleanAssistantContent(fullContent);
      this.logger.log(`[chatStream] ${targetProvider} streamed ${cleaned.length} chars, finish=${finishReason}`);

      return {
        content: cleaned,
        provider: targetProvider,
        model: config.model,
        durationMs: Date.now() - startedAt,
        usage,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const err = error as Error;
      // P0-T1.1: 已是 LlmError 直接抛
      if (err instanceof LlmError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new LlmError(
          targetProvider,
          `${targetProvider} stream timeout after ${timeout}ms`,
          { isTimeout: true, raw: err },
        );
      }
      this.logger.error(`[chatStream] ${targetProvider} failed: ${err.message}`);
      throw new LlmError(targetProvider, err.message, { raw: err });
    }
  }

  async chatWithUser(
    userMessage: string,
    systemPrompt: string,
    provider?: LlmProviderType,
    options?: LlmOptions,
    routeType?: string,
    retryCount?: number,
  ): Promise<LlmResponse> {
    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    if (provider) {
      try {
        const resp = await this.chat(messages, provider, options);
        this.callLogger.logCall({
          timestamp: new Date().toISOString(),
          provider: resp.provider,
          model: resp.model,
          routeType: routeType || 'unknown',
          durationMs: resp.durationMs,
          status: 'success',
          promptTokens: resp.usage?.promptTokens,
          completionTokens: resp.usage?.completionTokens,
          totalTokens: resp.usage?.totalTokens,
          retryCount: retryCount || 0,
          promptVersion: options?.promptVersion,
        });
        this.healthService.recordCall(resp.provider, 'success');
        return resp;
      } catch (error) {
        const err = error as Error;
        this.logger.warn(`指定提供商 ${provider} 失败: ${err.message}，尝试fallback`);
        this.healthService.recordCall(provider, 'failed');
        // 继续走fallback链
      }
    }

    return this.chatWithFallback(messages, options, routeType);
  }

  async chatWithFallback(
    messages: LlmMessage[],
    options?: LlmOptions,
    routeType?: string,
  ): Promise<LlmResponse> {
    // P0-T1.1: 过滤冷却中的 provider（403/401 触发 10 分钟冷却）
    // P0-T1.3: 同时过滤熔断器 Open 状态的 provider（连续失败≥5 触发 60s 摘流）
    const now = Date.now();
    const allProviders = Array.from(new Set<LlmProviderType>([
      this.defaultProvider,
      'deepseek',
      'sensenova',
      'doubao',
      'minimax',
      'deepseek-direct',
      'spark',
    ])).filter((provider) => !!this.providers[provider].apiKey);

    const providers = allProviders.filter((provider) => {
      // P0-T1.1: 冷却检查
      const cooldownUntil = this.providerCooldownUntil.get(provider);
      if (cooldownUntil && cooldownUntil > now) {
        const remainSec = Math.ceil((cooldownUntil - now) / 1000);
        this.logger.warn(`Provider ${provider} 冷却中（剩余 ${remainSec}s），跳过`);
        return false;
      }
      if (cooldownUntil) {
        this.providerCooldownUntil.delete(provider);
      }
      // P0-T1.3: 熔断器检查
      if (this.healthService.isCircuitOpen(provider)) {
        const stats = this.healthService.getCircuitState(provider);
        this.logger.warn(`Provider ${provider} 熔断中（state=${stats}），跳过`);
        return false;
      }
      return true;
    });

    if (providers.length === 0) {
      // P0-T1.1/T1.3: 所有 provider 都在冷却或熔断，尝试强制使用冷却最短的一个兜底
      const fallbackProvider = allProviders.reduce((best, p) => {
        const cd = this.providerCooldownUntil.get(p) || 0;
        const bestCd = this.providerCooldownUntil.get(best) || 0;
        return cd < bestCd ? p : best;
      }, allProviders[0]);
      this.logger.warn(`所有 provider 冷却/熔断中，强制使用 ${fallbackProvider} 兜底（HalfOpen 探测）`);
      providers.push(fallbackProvider);
    }

    if (providers.length === 0) {
      throw new Error('无可用 LLM 提供商');
    }

    const errors: string[] = [];
    const logSuccess = (resp: any, retryCount: number) => {
      this.callLogger.logCall({
        timestamp: new Date().toISOString(),
        provider: resp.provider,
        model: resp.model,
        routeType: routeType || 'unknown',
        durationMs: resp.durationMs,
        status: 'success',
        promptTokens: resp.usage?.promptTokens,
        completionTokens: resp.usage?.completionTokens,
        totalTokens: resp.usage?.totalTokens,
        retryCount,
        promptVersion: options?.promptVersion,
      });
      this.healthService.recordCall(resp.provider, 'success');
    };
    const logFailure = (provider: LlmProviderType, err: Error, retryCount: number, startedAt: number) => {
      // P0-T1.1: 从 LlmError 提取结构化字段
      const llmErr = err instanceof LlmError ? err : null;
      const httpStatus = llmErr?.httpStatus;
      const errorCode = llmErr?.errorCode;
      const isAuth = llmErr?.isAuthError === true;
      const isRateLimit = llmErr?.isRateLimit === true;
      const isTimeout = llmErr?.isTimeout === true;

      errors.push(`${provider}[${httpStatus ?? 'NO_HTTP'}]: ${err.message}`);
      this.logger.warn(
        `Provider ${provider} 失败 | httpStatus=${httpStatus ?? 'N/A'} ` +
        `code=${errorCode ?? 'N/A'} isAuth=${isAuth} isRateLimit=${isRateLimit} ` +
        `isTimeout=${isTimeout} | 错误: ${err.message}`,
      );
      // P0-T1.5: durationMs 改为真实耗时（非0），新增结构化字段
      this.callLogger.logCall({
        timestamp: new Date().toISOString(),
        provider,
        model: this.providers[provider].model,
        routeType: routeType || 'unknown',
        durationMs: Date.now() - startedAt,
        status: 'failed',
        errorReason: err.message,
        retryCount,
        promptVersion: options?.promptVersion,
        // P0-T1.1: 结构化错误字段（callLogger 支持任意附加字段）
        httpStatus,
        errorCode,
        isAuthError: isAuth,
        isRateLimit,
        isTimeout,
      } as any);
      this.healthService.recordCall(provider, 'failed');

      // P0-T1.1: 403/401 鉴权错误 → 立即标记 provider 冷却 10 分钟
      if (isAuth) {
        const cooldownUntil = now + LlmProvidersService.AUTH_ERROR_COOLDOWN_MS;
        this.providerCooldownUntil.set(provider, cooldownUntil);
        this.logger.error(
          `[P0-T1.1] Provider ${provider} 鉴权失败(403/401)，标记冷却 10 分钟，到期: ${new Date(cooldownUntil).toISOString()}`,
        );
      }
    };

    // P0-1 修复: 串行尝试 provider，避免并行竞速导致 token 双重消耗
    // P0-T1.1: 在串行基础上，按 LlmError 类型记录结构化字段并触发冷却
    // P0-T1.2: 每个 provider 内部先做指数退避重试，耗尽才切下一个 provider
    let retryCount = 0;
    for (const provider of providers) {
      const callStartedAt = Date.now();
      try {
        this.logger.log(`尝试使用 ${provider} 提供商...`);
        const resp = await this.retryWithBackoff(
          provider,
          () => this.chat(messages, provider, options),
          { maxRetries: 3, baseMs: 500, routeType },
        );
        logSuccess(resp, retryCount);
        return resp;
      } catch (error) {
        logFailure(provider, error as Error, retryCount, callStartedAt);
        retryCount++;
        // P0-T1.1: 403/401 已触发冷却，继续尝试下一个 provider
        // P0-T1.2: 429/5xx/超时已在 retryWithBackoff 内重试耗尽，这里继续切下一个 provider
      }
    }

    throw new Error(`所有 LLM 提供商均失败: ${errors.join(' | ')}`);
  }

  /**
   * P0-T1.2: 同 provider 指数退避重试
   * 仅对 isRetryable=true 的 LlmError 重试（429/5xx/超时）
   * 退避公式：base * 2^n + jitter（base=500ms，n=已重试次数）
   * 429 优先使用 Retry-After 头指定的等待时间
   * 重试上限默认 3 次，耗尽后抛出最后的错误让外层切备用 provider
   */
  private async retryWithBackoff<T>(
    provider: LlmProviderType,
    fn: () => Promise<T>,
    opts: { maxRetries?: number; baseMs?: number; routeType?: string } = {},
  ): Promise<T> {
    const maxRetries = opts.maxRetries ?? 3;
    const baseMs = opts.baseMs ?? 500;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        // 非法错误（非 LlmError）或不可重试，立即抛出让外层切 provider
        if (!(error instanceof LlmError) || !error.isRetryable) {
          throw error;
        }
        // 已是最后一次尝试，抛出让外层切 provider
        if (attempt === maxRetries) {
          throw error;
        }
        // 计算退避时间：429 优先用 Retry-After，否则指数退避 + jitter
        let backoffMs: number;
        if (error.isRateLimit && error.retryAfterMs) {
          backoffMs = error.retryAfterMs;
        } else {
          const jitter = Math.random() * (baseMs / 2);
          backoffMs = baseMs * Math.pow(2, attempt) + jitter;
        }
        // 退避上限 30s，避免单次等待过长拖垮响应
        backoffMs = Math.min(backoffMs, 30000);
        const errType = error.isRateLimit ? 'rateLimit' : error.isTimeout ? 'timeout' : '5xx';
        this.logger.warn(
          `[P0-T1.2] Provider ${provider} 第${attempt + 1}/${maxRetries}次重试 ` +
          `等待 ${(backoffMs / 1000).toFixed(2)}s | httpStatus=${error.httpStatus ?? 'N/A'} type=${errType}`,
        );
        await this.sleep(backoffMs);
      }
    }
    // 理论上不会执行到这里，TS 需要返回语句
    throw lastError || new Error(`retryWithBackoff ${provider} 未知错误`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 经济模型调用 — 辅助任务专用（记忆提取、主动问候、编年史、潮汐推断等）
   * 走 CHEAP_LLM_PROVIDER（如 sensenova/V4-Flash），成本约为 default 的 1/12
   */
  async chatCheap(
    messages: LlmMessage[],
    options?: LlmOptions,
    routeType?: string,
  ): Promise<LlmResponse> {
    try {
      const resp = await this.chat(messages, this.cheapProvider, options);
      this.callLogger.logCall({
        timestamp: new Date().toISOString(),
        provider: resp.provider,
        model: resp.model,
        routeType: routeType || 'cheap',
        durationMs: resp.durationMs,
        status: 'success',
        promptTokens: resp.usage?.promptTokens,
        completionTokens: resp.usage?.completionTokens,
        totalTokens: resp.usage?.totalTokens,
        retryCount: 0,
        promptVersion: options?.promptVersion,
      });
      this.healthService.recordCall(resp.provider, 'success');
      return resp;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`[chatCheap] ${this.cheapProvider} 失败: ${err.message}，回退到默认 provider`);
      this.healthService.recordCall(this.cheapProvider, 'failed');
      // 便宜 provider 挂了 → 回退到默认（贵但可靠）
      return this.chatWithFallback(messages, options, routeType || 'cheap-fallback');
    }
  }

  isConfigured(): boolean {
    return !!(
      this.providers['deepseek-direct'].apiKey ||
      this.providers.sensenova.apiKey ||
      this.providers.doubao.apiKey ||
      this.providers.minimax.apiKey ||
      this.providers.deepseek.apiKey ||
      this.providers.spark.apiKey
    );
  }

  getStatus(): {
    'deepseek-direct': boolean;
    sensenova: boolean;
    doubao: boolean;
    minimax: boolean;
    deepseek: boolean;
    spark: boolean;
    default: string;
  } {
    return {
      'deepseek-direct': !!this.providers['deepseek-direct'].apiKey,
      sensenova: !!this.providers.sensenova.apiKey,
      doubao: !!this.providers.doubao.apiKey,
      minimax: !!this.providers.minimax.apiKey,
      deepseek: !!this.providers.deepseek.apiKey,
      spark: !!this.providers.spark.apiKey,
      default: this.defaultProvider,
    };
  }

  getDefaultProviderInfo(): { provider: LlmProviderType; model: string; configured: boolean } {
    const provider = this.defaultProvider;
    return {
      provider,
      model: this.providers[provider].model,
      configured: !!this.providers[provider].apiKey,
    };
  }

  getCheapProviderInfo(): { provider: LlmProviderType; model: string; configured: boolean } {
    const provider = this.cheapProvider;
    return {
      provider,
      model: this.providers[provider].model,
      configured: !!this.providers[provider].apiKey,
    };
  }

  getLlmHealth() {
    // P0-T1.1: 健康状态附加 provider 冷却信息
    const base = this.healthService.getHealth();
    const now = Date.now();
    const cooldowns: Record<string, { cooldownUntil: string; remainSec: number }> = {};
    for (const [provider, until] of this.providerCooldownUntil.entries()) {
      if (until > now) {
        cooldowns[provider] = {
          cooldownUntil: new Date(until).toISOString(),
          remainSec: Math.ceil((until - now) / 1000),
        };
      }
    }
    // P0-T1.4: 附加令牌桶状态
    const rateLimits: Record<string, { tokens: number; capacity: number; rpm: number }> = {};
    for (const [provider, bucket] of this.tokenBuckets.entries()) {
      rateLimits[provider] = bucket.getStats();
    }
    return { ...base, cooldowns, rateLimits };
  }

  /**
   * P0-T1.1: 查询指定 provider 是否在冷却中
   * 供 T1.3 熔断器 / health 端点使用
   */
  isProviderInCooldown(provider: LlmProviderType): boolean {
    const until = this.providerCooldownUntil.get(provider);
    return !!until && until > Date.now();
  }

  getPromptRegistry() {
    return {
      defaultVersion: this.promptRegistry.getDefaultVersion(),
      availableVersions: this.promptRegistry.getAvailableVersions(),
    };
  }
}
