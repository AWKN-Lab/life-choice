/**
 * 管理员配置集中管理
 * 所有管理员相关硬编码统一收口到此文件
 */

export const ADMIN_CONFIG = {
  /** 保底管理员邮箱（可通过 ADMIN_EMAIL 环境变量覆盖） */
  primaryEmail: (process.env.ADMIN_EMAIL || '10919669@qq.com').trim().toLowerCase(),

  /** 登录别名映射（支持短 ID 登录） */
  loginAliases: new Map<string, string>([
    ['10919669', '10919669@qq.com'],
  ]),

  /** 管理员账号集合（用于权限判断） */
  adminIdentifiers: new Set(['10919669', '10919669@qq.com']),

  /** 管理员默认积分 */
  defaultCreditBalance: 999,

  /** 管理员默认会员等级 */
  defaultMembership: 'yearly' as const,
};
