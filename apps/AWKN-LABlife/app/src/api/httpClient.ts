/**
 * HTTP 客户端统一封装
 * 所有 API 调用统一走此层，避免不同文件手写 fetch 路径
 *
 * 设计要点（防 ERR_INSUFFICIENT_RESOURCES / 重复请求堆积）：
 * - 单例去重：同 path+query 正在请求时直接复用 Promise
 * - 30s 超时：AbortController 兜底，避免浏览器连接耗尽
 * - 显式 AbortError：与 HTTP 错误、网络错误区分
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/life/api/v1' : 'http://localhost:30001/api/v1');

/** 默认超时 30s，避免长任务占满浏览器同 host 连接池 */
const DEFAULT_TIMEOUT_MS = 30_000;

/** 正在飞行的请求单例表 */
const inflight = new Map<string, Promise<unknown>>();

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function cacheKey(path: string, query: Record<string, unknown> | undefined, body: unknown): string {
  return body === undefined ? `${path}|${JSON.stringify(query ?? {})}` : `${path}|${JSON.stringify(body)}`;
}

/** 自定义错误类型，供 UI 区分展示 */
export class HttpAbortError extends Error {
  constructor(public readonly path: string, public readonly timeoutMs: number) {
    super(`Request to ${path} timed out after ${timeoutMs}ms`);
    this.name = 'HttpAbortError';
  }
}

export class HttpError extends Error {
  constructor(public readonly path: string, public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface ApiOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * 统一 GET 请求
 * @param path  API 路径（如 /kline-tide/package）
 * @param query 查询参数对象，undefined/null/空字符串会被过滤
 * @param opts  可选：超时（默认 30s）、外部 AbortSignal
 */
export async function apiGet<T>(
  path: string,
  query?: Record<string, unknown>,
  opts: ApiOptions = {},
): Promise<T> {
  const key = cacheKey(path, query, undefined);
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;

  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // 合并外部 signal
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  const p = (async () => {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new HttpError(path, response.status, `GET ${path} failed: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new HttpAbortError(path, timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(tid);
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/**
 * 统一 POST 请求
 * @param path API 路径
 * @param body 请求体对象
 * @param opts 可选：超时（默认 30s）、外部 AbortSignal
 */
export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  opts: ApiOptions = {},
): Promise<T> {
  const key = cacheKey(path, undefined, body);
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;

  const url = buildUrl(path);
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  const p = (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new HttpError(path, response.status, `POST ${path} failed: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new HttpAbortError(path, timeoutMs);
      }
      throw err;
    } finally {
      clearTimeout(tid);
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
