import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage, getAuthToken, setAuthToken, removeAuthToken } from '../tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('tokenStorage.set/get/remove', () => {
    it('应该正确存储和获取 token', () => {
      tokenStorage.set('test_token', 'abc123');
      expect(tokenStorage.get('test_token')).toBe('abc123');
    });

    it('应该返回 null 对于不存在的 token', () => {
      expect(tokenStorage.get('nonexistent')).toBeNull();
    });

    it('应该正确删除 token', () => {
      tokenStorage.set('test_token', 'abc123');
      tokenStorage.remove('test_token');
      expect(tokenStorage.get('test_token')).toBeNull();
    });

    it('应该同时清理 session 和 local 降级存储', () => {
      tokenStorage.set('test_token', 'abc123');
      tokenStorage.remove('test_token');
      expect(localStorage.getItem('test_token')).toBeNull();
    });
  });

  describe('tokenStorage.clear', () => {
    it('应该清除所有存储', () => {
      tokenStorage.set('token1', 'value1');
      tokenStorage.set('token2', 'value2');
      localStorage.setItem('token3', 'value3');

      tokenStorage.clear();

      expect(tokenStorage.get('token1')).toBeNull();
      expect(tokenStorage.get('token2')).toBeNull();
      expect(localStorage.getItem('token3')).toBeNull();
    });
  });

  describe('便捷方法', () => {
    it('getAuthToken 应该正确获取 token', () => {
      setAuthToken('my-secret-token');
      expect(getAuthToken()).toBe('my-secret-token');
    });

    it('setAuthToken 应该正确设置 token', () => {
      setAuthToken('new-token');
      expect(getAuthToken()).toBe('new-token');
    });

    it('removeAuthToken 应该正确删除 token', () => {
      setAuthToken('token-to-remove');
      removeAuthToken();
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('加密模式', () => {
    it('应该正确编码和解码 token', () => {
      const encryptedStorage = tokenStorage;
      encryptedStorage.updateConfig({ useEncryption: true });

      encryptedStorage.set('encrypted_token', 'secret-value');
      expect(encryptedStorage.get('encrypted_token')).toBe('secret-value');

      // 验证存储的是编码后的值
      const rawStored = sessionStorage.getItem('encrypted_token');
      expect(rawStored).not.toBe('secret-value');
      expect(rawStored).toBeTruthy();
    });
  });
});
