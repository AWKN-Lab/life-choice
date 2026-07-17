/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Vite 环境变量类型扩展
 *
 * 新增变量时务必同时更新：
 *   1. .env / .env.development / .env.production / .env.example
 *   2. 本接口 ImportMetaEnv
 */

interface ImportMetaEnv {
  /** 后端 API 地址（含 /api/v1） */
  readonly VITE_API_BASE_URL: string;
  /** 是否使用 Mock 数据（开发后端未就绪时设为 true） */
  readonly VITE_USE_MOCK: string;
  /** 邀请分享域名（不带尾斜杠），如 https://awkn.cn */
  readonly VITE_INVITE_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
