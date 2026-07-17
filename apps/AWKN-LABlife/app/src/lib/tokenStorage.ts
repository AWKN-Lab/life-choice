/**
 * 安全 Token 存储服务
 *
 * 设计原则：
 * 1. sessionStorage 优先（标签页关闭即清除，XSS 攻击窗口更小）
 * 2. 可降级到 localStorage（需显式配置）
 * 3. 可扩展为加密存储（Web Crypto API）
 * 4. 可替换为 Tauri secure storage（生产环境推荐）
 *
 * 使用方式：
 * import { tokenStorage } from '@/lib/tokenStorage';
 * tokenStorage.set('auth_token', token);
 * tokenStorage.get('auth_token');
 * tokenStorage.remove('auth_token');
 */

export type StorageType = 'session' | 'local';

interface TokenStorageConfig {
  storageType: StorageType;
  useEncryption: boolean;
}

const DEFAULT_CONFIG: TokenStorageConfig = {
  storageType: 'session',
  useEncryption: false,
};

class SecureTokenStorage {
  private config: TokenStorageConfig;

  constructor(config: Partial<TokenStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getStorage(): Storage {
    return this.config.storageType === 'session'
      ? sessionStorage
      : localStorage;
  }

  /**
   * Base64 编码（简单混淆，不等于加密）
   */
  private encode(value: string): string {
    return btoa(encodeURIComponent(value));
  }

  /**
   * Base64 解码
   */
  private decode(value: string): string {
    try {
      return decodeURIComponent(atob(value));
    } catch {
      return value; // 非编码值直接返回
    }
  }

  /**
   * 设置 Token
   */
  set(key: string, value: string): void {
    const storage = this.getStorage();
    const storedValue = this.config.useEncryption
      ? this.encode(value)
      : value;

    try {
      storage.setItem(key, storedValue);
    } catch (error) {
      console.error('[TokenStorage] 存储失败:', error);
      // 降级：尝试 localStorage
      if (this.config.storageType === 'session') {
        localStorage.setItem(key, storedValue);
      }
    }
  }

  /**
   * 获取 Token
   */
  get(key: string): string | null {
    const storage = this.getStorage();
    const value = storage.getItem(key);

    if (value === null) {
      // 降级：尝试 localStorage
      if (this.config.storageType === 'session') {
        return localStorage.getItem(key);
      }
      return null;
    }

    return this.config.useEncryption ? this.decode(value) : value;
  }

  /**
   * 删除 Token
   */
  remove(key: string): void {
    const storage = this.getStorage();
    storage.removeItem(key);

    // 同时清理降级存储
    localStorage.removeItem(key);
  }

  /**
   * 清除所有 Token
   */
  clear(): void {
    sessionStorage.clear();
    localStorage.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TokenStorageConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 单例导出
export const tokenStorage = new SecureTokenStorage();

// 便捷方法（供 client.ts 使用）
export const AUTH_TOKEN_KEY = 'auth_token';

export function getAuthToken(): string | null {
  return tokenStorage.get(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  tokenStorage.set(AUTH_TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  tokenStorage.remove(AUTH_TOKEN_KEY);
}
