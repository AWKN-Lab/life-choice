import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GrowthService {
  private readonly logger = new Logger(GrowthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---- 邀请码 ----

  /**
   * 获取或创建用户的邀请码
   */
  async getOrCreateInviteCode(userId: string): Promise<string> {
    const existing = await this.prisma.invite.findFirst({
      where: { userId },
    });

    if (existing) return existing.code;

    // 生成6位邀请码
    const code = this.generateInviteCode();
    const invite = await this.prisma.invite.create({
      data: { code, userId },
    });
    this.logger.log(`创建邀请码: ${code} for user ${userId}`);
    return invite.code;
  }

  /**
   * 查询邀请码是否存在
   */
  async getInviteByCode(code: string) {
    return this.prisma.invite.findUnique({ where: { code } });
  }

  // ---- 邀请回流记录 ----

  /**
   * 记录一次访问（来自邀请链接）
   */
  async recordReferral(params: {
    inviteCode: string;
    source?: string;
    medium?: string;
    campaign?: string;
  }): Promise<{ referralId: string }> {
    const invite = await this.prisma.invite.findUnique({
      where: { code: params.inviteCode },
    });

    if (!invite) {
      throw new Error('邀请码不存在');
    }

    const referral = await this.prisma.referral.create({
      data: {
        inviteId: invite.id,
        inviteCode: params.inviteCode,
        source: params.source,
        medium: params.medium,
        campaign: params.campaign,
        status: 'pending',
      },
    });

    this.logger.log(`记录回流: ${params.inviteCode} → referral ${referral.id}`);
    return { referralId: referral.id };
  }

  /**
   * 用户注册后激活邀请关系
   */
  async activateReferral(referralId: string, userId: string): Promise<void> {
    const referral = await this.prisma.referral.update({
      where: { id: referralId },
      data: { referredUserId: userId, status: 'activated' },
    });

    // 增加邀请码使用次数
    await this.prisma.invite.update({
      where: { id: referral.inviteId },
      data: { usedCount: { increment: 1 } },
    });

    // 检查是否达到奖励档位阈值，升级
    const invite = await this.prisma.invite.findUnique({
      where: { id: referral.inviteId },
    });
    if (invite) {
      const nextTier = this.getNextRewardTier(invite.usedCount + 1);
      if (nextTier !== invite.rewardTier) {
        await this.prisma.invite.update({
          where: { id: invite.id },
          data: { rewardTier: nextTier },
        });
      }
    }

    this.logger.log(`激活回流关系: referral ${referralId} → user ${userId}`);
  }

  // ---- 奖励档位 ----

  /**
   * 查询用户的邀请统计
   */
  async getInviteStats(userId: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { userId },
      include: { referrals: true },
    });

    if (!invite) return null;

    const tiers = [
      { invites: 1, reward: '免费咨询 ×1', tier: 'newbie' },
      { invites: 3, reward: '7天会员体验', tier: 'trial' },
      { invites: 5, reward: '月卡会员×1', tier: 'monthly' },
      { invites: 10, reward: '季卡+专属顾问', tier: 'quarterly' },
    ];

    const nextTier = tiers.find(t => t.invites > invite.usedCount);

    // P2-3: 3级邀请链统计（批量查询，避免 N+1）
    const activatedReferrals = invite.referrals.filter(r => r.status === 'activated');
    const level1Count = activatedReferrals.length;

    const l1Ids = activatedReferrals.map(r => r.id);
    const l2Referrals = l1Ids.length > 0
      ? await this.prisma.referral.findMany({
          where: { parentReferralId: { in: l1Ids }, status: 'activated' },
        })
      : [];
    const level2Count = l2Referrals.length;

    const l2Ids = l2Referrals.map(r => r.id);
    const level3Count = l2Ids.length > 0
      ? await this.prisma.referral.count({
          where: { parentReferralId: { in: l2Ids }, status: 'activated' },
        })
      : 0;

    return {
      code: invite.code,
      usedCount: invite.usedCount,
      currentTier: invite.rewardTier,
      nextTier: nextTier?.tier || null,
      nextReward: nextTier?.reward || null,
      nextThreshold: nextTier?.invites || null,
      referrals: level1Count,
      // P2-3: 3级裂变统计
      level1Count,
      level2Count,
      level3Count,
      totalChainCount: level1Count + level2Count + level3Count,
    };
  }

  // ---- P2-3: 海报分享记录 ----

  /**
   * 记录海报分享（含3级链路追踪）
   */
  async recordPosterShare(params: {
    inviteCode: string;
    source: string;
    medium?: string;
    campaign?: string;
    parentReferralId?: string;
  }): Promise<{ referralId: string }> {
    const invite = await this.prisma.invite.findUnique({
      where: { code: params.inviteCode },
    });

    if (!invite) {
      throw new Error('邀请码不存在');
    }

    const referral = await this.prisma.referral.create({
      data: {
        inviteId: invite.id,
        inviteCode: params.inviteCode,
        parentReferralId: params.parentReferralId || null,
        source: params.source,
        medium: params.medium,
        campaign: params.campaign,
        status: 'pending',
      },
    });

    this.logger.log(`海报分享记录: ${params.inviteCode} → referral ${referral.id}, parent=${params.parentReferralId || 'none'}`);
    return { referralId: referral.id };
  }

  /**
   * P2-3: 计算3级返利
   * L1: 直接邀请 → 5积分
   * L2: 间接邀请 → 2积分
   * L3: 再间接 → 1积分
   */
  async calculateReferralRewards(userId: string): Promise<{
    l1Reward: number;
    l2Reward: number;
    l3Reward: number;
    totalReward: number;
  }> {
    const invite = await this.prisma.invite.findFirst({
      where: { userId },
      include: { referrals: true },
    });

    if (!invite) return { l1Reward: 0, l2Reward: 0, l3Reward: 0, totalReward: 0 };

    const activatedReferrals = invite.referrals.filter(r => r.status === 'activated');
    const l1Count = activatedReferrals.length;

    const l1Ids = activatedReferrals.map(r => r.id);
    const l2Referrals = l1Ids.length > 0
      ? await this.prisma.referral.findMany({
          where: { parentReferralId: { in: l1Ids }, status: 'activated' },
        })
      : [];
    const l2Count = l2Referrals.length;

    const l2Ids = l2Referrals.map(r => r.id);
    const l3Count = l2Ids.length > 0
      ? await this.prisma.referral.count({
          where: { parentReferralId: { in: l2Ids }, status: 'activated' },
        })
      : 0;

    const l1Reward = l1Count * 5;
    const l2Reward = l2Count * 2;
    const l3Reward = l3Count * 1;

    return {
      l1Reward,
      l2Reward,
      l3Reward,
      totalReward: l1Reward + l2Reward + l3Reward,
    };
  }

  // ---- 限时优惠 ----

  /**
   * 获取当前有效的优惠活动
   */
  async getActiveOffers() {
    const now = new Date();
    const offers = await this.prisma.growthOffer.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        expireAt: { gte: now },
      },
      orderBy: { expireAt: 'asc' },
    });

    if (offers.length === 0) {
      // 返回默认内置优惠
      return [
        {
          id: 'default_newbie',
          offerType: 'newbie',
          title: '新人首单',
          subtitle: '首次咨询免费',
          description: '新用户注册即享1次免费咨询',
          badge: '限时',
          badgeColor: 'red',
          ctaText: '立即领取',
          action: '/consult',
          discount: '免费×1',
          expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }

    return offers.map(o => ({
      id: o.id,
      offerType: o.offerType,
      title: o.title,
      subtitle: o.subtitle,
      description: o.description,
      badge: o.badge,
      badgeColor: o.badgeColor,
      ctaText: o.ctaText,
      action: o.action,
      discount: o.discount,
      expireAt: o.expireAt.toISOString(),
    }));
  }

  // ---- 工具 ----

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private getNextRewardTier(count: number): string {
    if (count >= 10) return 'quarterly';
    if (count >= 5) return 'monthly';
    if (count >= 3) return 'trial';
    return 'newbie';
  }
}
