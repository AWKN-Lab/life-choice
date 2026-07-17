import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// 每个测试后清理
afterEach(() => {
  cleanup();
  // 清理 localStorage/sessionStorage
  localStorage.clear();
  sessionStorage.clear();
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'),
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256) as unknown as Uint8Array[number];
      }
      return arr;
    }),
  },
});

// Mock import.meta.env — vi.stubEnv 是 vitest 官方推荐方式
// Object.defineProperty 在 vitest 中可能不生效（import.meta 属性不可配置）
vi.stubEnv('VITE_USE_MOCK', 'true');
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:30001/api/v1');
