/**
 * 付费分层与权益服务 - Q3 P3-3
 * 定义 K 线/潮汐 的免费/付费能力边界
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TierConfig {
  tier: 'free' | 'basic' | 'pro' | 'master';
  displayName: string;
  pricePerMonth: number;
  currency: 'CNY' | 'USD';
  features: {
    kline: string[];
    tide: string[];
    consult: string[];
  };
  dailyLimits: {
    klineCalls: number;
    tideCalls: number;
    consultCalls: number;
  };
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  free: {
    tier: 'free',
    displayName: '免费版',
    pricePerMonth: 0,
    currency: 'CNY',
    features: {
      kline: ['查看当前趋势', '查看当前窗口', '查看支撑位/压力位'],
      tide: ['查看当前状态', '查看时位心三组得分'],
      consult: ['每月 1 次免费问事'],
    },
    dailyLimits: {
      klineCalls: 3,
      tideCalls: 3,
      consultCalls: 1,
    },
  },
  basic: {
    tier: 'basic',
    displayName: '基础版',
    pricePerMonth: 29,
    currency: 'CNY',
    features: {
      kline: ['查看 7 条人生线', '查看最近 12 个月数据', '查看最佳/风险窗口'],
      tide: ['查看 12 维状态', '查看短指令', '查看历史 6 个月对比'],
      consult: ['每月 10 次问事', '基础 K 线 + 潮汐'],
    },
    dailyLimits: {
      klineCalls: 20,
      tideCalls: 20,
      consultCalls: 10,
    },
  },
  pro: {
    tier: 'pro',
    displayName: '专业版',
    pricePerMonth: 99,
    currency: 'CNY',
    features: {
      kline: ['查看关键年份', '查看深层解释', '查看历史对比', '高清分享资产', '多维线叠加'],
      tide: ['查看完整 12 维向量', '查看行动建议', '查看窗口提示'],
      consult: ['无限问事', '完整 K 线 + 潮汐 + 通鉴'],
    },
    dailyLimits: {
      klineCalls: 100,
      tideCalls: 100,
      consultCalls: 999,
    },
  },
  master: {
    tier: 'master',
    displayName: '宗师版',
    pricePerMonth: 299,
    currency: 'CNY',
    features: {
      kline: ['全部功能', '专家 1v1 解读 1 次/月', '个性化定制'],
      tide: ['全部功能', '趋势预警', '私人顾问'],
      consult: ['全部功能', '优先响应', '私享功能'],
    },
    dailyLimits: {
      klineCalls: 9999,
      tideCalls: 9999,
      consultCalls: 9999,
    },
  },
};

export class TierService {
  /**
   * 获取用户当前层级
   */
  static async getUserTier(userId: string): Promise<TierConfig> {
    const membership = await prisma.membership.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      return TIER_CONFIGS.free;
    }

    // membership.type 可能是 'basic' | 'pro' | 'master'
    return TIER_CONFIGS[membership.type] || TIER_CONFIGS.free;
  }

  /**
   * 检查用户是否可访问某功能
   */
  static async canAccess(userId: string, feature: 'kline' | 'tide' | 'consult', featureKey: string): Promise<boolean> {
    const tier = await this.getUserTier(userId);
    return tier.features[feature].some((f) => f.includes(featureKey) || featureKey.includes(f));
  }

  /**
   * 记录功能使用
   */
  static async recordUsage(userId: string, feature: 'kline' | 'tide' | 'consult') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.userActivity.create({
      data: {
        userId,
        activityType: `${feature}_view`,
        activityData: JSON.stringify({ feature, date: today.toISOString() }),
      },
    });
  }

  /**
   * 升级提示
   */
  static getUpgradeHint(currentTier: string, targetFeature: 'kline' | 'tide' | 'consult'): {
    requiredTier: string;
    price: number;
    benefits: string[];
  } {
    if (currentTier === 'free') {
      const target = TIER_CONFIGS.basic;
      return {
        requiredTier: target.displayName,
        price: target.pricePerMonth,
        benefits: target.features[targetFeature],
      };
    }
    if (currentTier === 'basic') {
      const target = TIER_CONFIGS.pro;
      return {
        requiredTier: target.displayName,
        price: target.pricePerMonth,
        benefits: target.features[targetFeature],
      };
    }
    return { requiredTier: '已是最高', price: 0, benefits: [] };
  }
}

export default TierService;
