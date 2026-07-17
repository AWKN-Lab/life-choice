/**
 * API 客户端 - 支持 PATCH 方法 + 401 自动刷新
 */
import { getAuthToken, setAuthToken, removeAuthToken } from '@/lib/tokenStorage';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/life/api/v1' : 'http://localhost:30001/api/v1');
const REQUEST_TIMEOUT = 240000;
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ID_KEY = 'auth_user_id';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function extractUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch {
    return null;
  }
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY) || extractUserIdFromToken(getAuthToken());
}

export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      const userId = getUserId();
      if (!userId) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.accessToken) {
        setAuthToken(data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export class ApiError extends Error {
  statusCode: number;
  errorCode: string;
  details?: ApiErrorDetail[];

  constructor(statusCode: number, errorCode: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  skipAuth?: boolean;
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, skipAuth = false, ...init } = config;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 && !skipAuth) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          const newToken = getAuthToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
          }
          const retryResponse = await fetch(url, {
            ...init,
            headers,
            signal: controller.signal,
          });
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
        removeAuthToken();
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        useAuthStore.setState({ user: null, isAuthenticated: false });
      }
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        response.status,
        errorData?.code || 'UNKNOWN_ERROR',
        errorData?.message || `请求失败 (${response.status})`,
        errorData?.details
      );
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', '请求超时，请稍后重试');
    }

    throw new ApiError(500, 'NETWORK_ERROR', '网络连接失败，请检查网络');
  }
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string>, skipAuth = false) =>
    request<T>(endpoint, { method: 'GET', params, skipAuth }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export default apiClient;
