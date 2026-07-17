import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UserService {
  /** 完善八字档案奖励积分 */
  private static readonly PROFILE_COMPLETION_CREDITS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.formatUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // 获取更新前的用户数据，用于判断是否首次完善
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { birthDate: true, birthTime: true, birthPlace: true, creditBalance: true },
    });

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    // 检查是否首次完善八字档案（三个字段从缺失到齐全）
    if (before && dto.birthDate && dto.birthTime && dto.birthPlace) {
      const wasIncomplete = !before.birthDate || !before.birthTime || !before.birthPlace;
      if (wasIncomplete) {
        await this._rewardProfileCompletion(userId, user.creditBalance || 0);
      }
    }

    return this.formatUser(user);
  }

  /** 首次完善八字档案奖励 5 积分 */
  private async _rewardProfileCompletion(userId: string, currentBalance: number) {
    // 幂等检查：只奖一次
    const existing = await this.prisma.creditLedger.findFirst({
      where: { userId, reason: 'profile_completion' },
    });
    if (existing) return;

    const reward = UserService.PROFILE_COMPLETION_CREDITS;
    const balanceAfter = currentBalance + reward;

    await this.prisma.user.update({
      where: { id: userId },
      data: { creditBalance: balanceAfter },
    });

    await this.prisma.creditLedger.create({
      data: {
        userId,
        amount: reward,
        reason: 'profile_completion',
        balanceAfter,
      },
    });
  }

  async getMembership(userId: string) {
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

    return membership;
  }

  private formatUser(user: any) {
    const { password, ...result } = user;
    return result;
  }
}
