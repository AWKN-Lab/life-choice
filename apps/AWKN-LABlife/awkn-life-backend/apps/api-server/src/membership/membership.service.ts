import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_CONFIG } from '../auth/admin.config';

export interface MembershipPlan {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  duration: number;
  price: number;
  currency: string;
  features: string[];
  highlight?: string;
}

export const MEMBERSHIP_PLANS: Record<string, MembershipPlan> = {
  month: {
    id: 'month',
    name: '轻陪伴会员',
    nameEn: 'Monthly Companion',
    description: '适合想先体验完整服务的用户',
    duration: 30,
    price: 99,
    currency: 'cny',
    features: [
      '完整结果页查看',
      '多轮追问权限',
      '醒神早帖提醒',
      '本周运势查看',
      '历史记录保存',
    ],
  },
  year: {
    id: 'year',
    name: '长期陪伴会员',
    nameEn: 'Yearly Companion',
    description: '适合把系统当长期决策参谋的用户',
    duration: 365,
    price: 699,
    currency: 'cny',
    features: [
      '月卡全部权益',
      '宗师深推权限',
      '长期节律分析',
      '关键节点提醒',
      '阶段性复盘报告',
    ],
    highlight: '限时优惠',
  },
  single: {
    id: 'single',
    name: '单次宗师推演',
    nameEn: 'Single Reading',
    description: '针对重大事项的深度分析',
    duration: 7,
    price: 199,
    currency: 'cny',
    features: [
      '当前问题深度推演',
      '详细分析报告',
      '7天内有效',
    ],
  },
  peruse: {
    id: 'peruse',
    name: '次卡体验',
    nameEn: 'Per-Use Card',
    description: '0.9元体验单次咨询',
    duration: 1,
    price: 0.9,
    currency: 'cny',
    features: [
      '单次咨询权限',
      '基础结果查看',
      '24小时内有效',
    ],
    highlight: '限时特惠',
  },
};

@Injectable()
export class MembershipService {
  private readonly moduleCreditCost: Record<string, number> = {
    breakthrough: 2,
    morning: 1,
    kline: 3,
    tide_radar: 3,
    tide_phase: 0,
    naming: 1,
    question: 1,
  };

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPlans() {
    return Object.values(MEMBERSHIP_PLANS);
  }

  async getPlan(planId: string) {
    const plan = MEMBERSHIP_PLANS[planId as keyof typeof MEMBERSHIP_PLANS];
    if (!plan) {
      throw new BadRequestException('不存在的套餐');
    }
    return plan;
  }

  async activateMembership(userId: string, planId: string, orderId?: string) {
    const plan = MEMBERSHIP_PLANS[planId as keyof typeof MEMBERSHIP_PLANS];

    if (!plan) {
      throw new BadRequestException('不存在的套餐');
    }

    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        type: planId,
        status: 'active',
      },
    });

    let membership;
    const now = new Date();

    if (existingMembership) {
      const currentExpireDate = existingMembership.expireDate || now;
      const newExpireDate = new Date(currentExpireDate);
      newExpireDate.setDate(newExpireDate.getDate() + plan.duration);

      membership = await this.prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          expireDate: newExpireDate,
          status: 'active',
        },
      });
    } else {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + plan.duration);

      membership = await this.prisma.membership.create({
        data: {
          userId,
          type: planId,
          status: 'active',
          startDate: now,
          expireDate,
        },
      });
    }

    if (orderId) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });
    }

    return {
      membershipId: membership.id,
      planId,
      planName: plan.name,
      status: 'active',
      startDate: membership.startDate,
      expireDate: membership.expireDate,
    };
  }

  async getUserMembership(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: 'active',
        OR: [
          { expireDate: null },
          { expireDate: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!membership) {
      return null;
    }

    const plan = MEMBERSHIP_PLANS[membership.type as keyof typeof MEMBERSHIP_PLANS];

    return {
      membershipId: membership.id,
      planId: membership.type,
      planName: plan?.name || membership.type,
      status: membership.status,
      startDate: membership.startDate,
      expireDate: membership.expireDate,
      features: plan?.features || [],
    };
  }

  async unlockModule(userId: string, moduleId: string, recordId?: string, orderId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isAdmin: true, creditBalance: true },
    });

    // 1. 管理员走积分路径（不变）
    if (this.isAdminUser(user)) {
      return this.consumeAdminCredit(userId, moduleId, recordId, user.creditBalance);
    }

    // 2. 免费模块（cost=0）直接放行
    const cost = this.moduleCreditCost[moduleId] ?? 1;
    if (cost === 0) {
      return { success: true, moduleId, recordId, creditsUsed: 0, source: 'free' as const, message: '免费模块已解锁' };
    }

    // 3. 会员层级检查 — 有足够等级的会员直接放行
    const hasAccess = await this.checkAccess(userId, moduleId);
    if (hasAccess) {
      if (recordId) {
        const unlockStatus = ['breakthrough', 'kline', 'naming'].includes(moduleId) ? 'unlocked_full' : 'unlocked_partial';
        await this.prisma.consultRecord.update({
          where: { id: recordId },
          data: { unlockStatus },
        });
      }
      return { success: true, moduleId, recordId, source: 'membership' as const, message: '模块已解锁' };
    }

    // 任务 3.2: 5. ¥1 深推已支付订单校验（第5条分支，优先于积分通道）
    // 识别条件：传入 orderId + Order.status='paid' + metadata.deepDive='true' + productId=recordId
    if (orderId && recordId) {
      const paidOrder = await this.prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
          productId: recordId,
          productType: 'single',
          status: 'paid',
          metadata: { contains: '"deepDive":"true"' },
        },
        select: { id: true, amount: true },
      });
      if (paidOrder) {
        // 已支付深推订单 → 直接解锁 fullResult
        await this.prisma.consultRecord.update({
          where: { id: recordId },
          data: { unlockStatus: 'unlocked_full' },
        });
        return {
          success: true,
          moduleId,
          recordId,
          orderId: paidOrder.id,
          creditsUsed: 0,
          source: 'deep_dive' as const,
          message: '¥1 深推已支付，完整结果已解锁',
        };
      }
      // 订单未找到或不匹配 → 继续走积分通道（不阻断）
    }

    // 4. 积分通道 — 非会员或会员等级不足时，用积分解锁
    const balance = user?.creditBalance || 0;
    if (balance < cost) {
      return {
        success: false,
        reason: '积分不足',
        requiredPlan: this.getModuleRequiredPlan(moduleId),
        creditsNeeded: cost,
        creditBalance: balance,
        message: `需要 ${cost} 积分，当前余额 ${balance}`,
      };
    }

    // 扣减积分
    const balanceAfter = balance - cost;
    await this.prisma.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });
    await this.prisma.creditLedger.create({
      data: {
        userId,
        amount: -cost,
        reason: 'module_unlock',
        moduleId,
        recordId,
        balanceAfter,
      },
    });

    if (recordId) {
      const unlockStatus = ['breakthrough', 'kline', 'naming'].includes(moduleId) ? 'unlocked_full' : 'unlocked_partial';
      await this.prisma.consultRecord.update({
        where: { id: recordId },
        data: { unlockStatus },
      });
    }

    return {
      success: true,
      moduleId,
      recordId,
      creditsUsed: cost,
      creditBalance: balanceAfter,
      source: 'credit' as const,
      message: '积分解锁成功',
    };
  }

  async checkAccess(userId: string, moduleId: string): Promise<boolean> {
    // 管理员检查权限时直接放行，真实扣积分只发生在 unlockModule 中。
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isAdmin: true, creditBalance: true },
    });
    if (this.isAdminUser(user)) {
      return true;
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: 'active',
        OR: [
          { expireDate: null },
          { expireDate: { gt: new Date() } },
        ],
      },
    });

    if (!membership) {
      return moduleId === 'basic';
    }

    const basicModules = ['basic', 'free', 'tide_phase'];
    const monthModules = [...basicModules, 'full', 'query', 'reminder', 'history', 'kline', 'tide_radar', 'naming', 'question', 'morning'];
    const yearModules = [...monthModules, 'deep', 'longterm', 'breakthrough'];

    switch (membership.type) {
      case 'month':
        return monthModules.includes(moduleId);
      case 'year':
        return yearModules.includes(moduleId);
      case 'single':
      case 'peruse':
        return basicModules.includes(moduleId);
      default:
        return moduleId === 'basic';
    }
  }

  async getAccessDetail(userId: string, moduleId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, isAdmin: true, creditBalance: true },
    });

    if (this.isAdminUser(user)) {
      return { hasAccess: true, plan: 'admin', requiredPlan: null, lockedFeatures: [] as string[] };
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        status: 'active',
        OR: [{ expireDate: null }, { expireDate: { gt: new Date() } }],
      },
    });

    const currentPlan = membership?.type ?? 'free';
    const requiredPlan = this.getModuleRequiredPlan(moduleId);
    const hasAccess = await this.checkAccess(userId, moduleId);

    const monthModules = ['full', 'query', 'reminder', 'history', 'kline', 'tide_radar', 'naming', 'question', 'morning'];
    const yearModules = ['deep', 'longterm', 'breakthrough'];
    const lockedFeatures: string[] = [];

    if (!hasAccess) {
      if (currentPlan === 'free' || currentPlan === 'single' || currentPlan === 'peruse') {
        lockedFeatures.push(...monthModules, ...yearModules);
      } else if (currentPlan === 'month') {
        lockedFeatures.push(...yearModules);
      }
    }

    return {
      hasAccess,
      plan: currentPlan,
      requiredPlan: hasAccess ? null : requiredPlan,
      lockedFeatures,
    };
  }

  private getModuleRequiredPlan(moduleId: string): string {
    const basicModules = ['basic', 'free', 'tide_phase'];
    const monthModules = ['full', 'query', 'reminder', 'history', 'kline', 'tide_radar', 'naming', 'question', 'morning'];
    const yearModules = ['deep', 'longterm', 'breakthrough'];

    if (basicModules.includes(moduleId)) {
      return 'free';
    }
    if (monthModules.includes(moduleId)) {
      return 'month';
    }
    if (yearModules.includes(moduleId)) {
      return 'year';
    }
    return 'single';
  }

  private isAdminUser(user: { email?: string | null; isAdmin?: boolean } | null): boolean {
    if (!user) return false;
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    return user.isAdmin === true || ADMIN_CONFIG.adminIdentifiers.has(normalizedEmail);
  }

  private async consumeAdminCredit(userId: string, moduleId: string, recordId: string | undefined, currentBalance: number) {
    const cost = this.moduleCreditCost[moduleId] ?? 1;
    let balance = currentBalance || 0;

    if (balance < cost) {
      const topUpAmount = 50;
      balance += topUpAmount;
      await this.prisma.user.update({
        where: { id: userId },
        data: { creditBalance: balance },
      });
      await this.prisma.creditLedger.create({
        data: {
          userId,
          amount: topUpAmount,
          reason: 'admin_auto_topup',
          moduleId,
          recordId,
          balanceAfter: balance,
        },
      });
    }

    const balanceAfter = balance - cost;
    await this.prisma.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });
    await this.prisma.creditLedger.create({
      data: {
        userId,
        amount: -cost,
        reason: 'module_unlock',
        moduleId,
        recordId,
        balanceAfter,
      },
    });

    if (recordId) {
      const unlockStatus = ['breakthrough', 'kline', 'naming'].includes(moduleId) ? 'unlocked_full' : 'unlocked_partial';
      await this.prisma.consultRecord.update({
        where: { id: recordId },
        data: { unlockStatus },
      });
    }

    return {
      success: true,
      moduleId,
      recordId,
      creditsUsed: cost,
      creditBalance: balanceAfter,
      message: '模块已解锁',
    };
  }

  async refundCredit(userId: string, moduleId: string, recordId?: string): Promise<boolean> {
    const cost = this.moduleCreditCost[moduleId] ?? 1;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      return false;
    }

    const balanceAfter = (user.creditBalance || 0) + cost;

    await this.prisma.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });

    await this.prisma.creditLedger.create({
      data: {
        userId,
        amount: cost,
        reason: 'refund_breakthrough_timeout',
        moduleId,
        recordId,
        balanceAfter,
      },
    });

    return true;
  }

  /** 获取用户积分余额 + 最近流水 */
  async getCreditBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    const recentTransactions = await this.prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      balance: user?.creditBalance || 0,
      recentTransactions,
    };
  }

  /** 获取积分流水（分页） */
  async getCreditHistory(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.creditLedger.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** P2-1: 查询用户是否还有限免次数 */
  async hasFreeTrial(userId: string): Promise<{ available: boolean; used: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { freeTrialUsed: true },
    });
    if (!user) {
      return { available: false, used: false };
    }
    return { available: !user.freeTrialUsed, used: user.freeTrialUsed };
  }

  /** P2-1: 记录限免已使用（乐观锁防竞态） */
  async recordFreeTrialUsed(userId: string): Promise<{ success: boolean }> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, freeTrialUsed: false },
      data: { freeTrialUsed: true },
    });
    return { success: result.count > 0 };
  }

  /** 获取模块的积分成本（给前端展示用） */
  getModuleCreditCosts() {
    return { ...this.moduleCreditCost };
  }

  async cancelMembership(userId: string, membershipId: string) {
    await this.prisma.membership.update({
      where: { id: membershipId, userId },
      data: { status: 'cancelled' },
    });

    return { success: true };
  }

  async getMembershipHistory(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
