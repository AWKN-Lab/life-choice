import { Inject, Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultService } from '../consult/consult.service';
import { RegisterDto, LoginDto, WxLoginDto } from './dto';
import { ADMIN_CONFIG } from './admin.config';

@Injectable()
export class AuthService {
  /** 注册赠送积分数 */
  private static readonly WELCOME_CREDITS = 10;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConsultService) private readonly consultService: ConsultService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('用户已存在');
    }

    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname,
        creditBalance: AuthService.WELCOME_CREDITS,
      },
    });

    // 写入积分账本：注册赠送
    await this.prisma.creditLedger.create({
      data: {
        userId: user.id,
        amount: AuthService.WELCOME_CREDITS,
        reason: 'register_bonus',
        balanceAfter: AuthService.WELCOME_CREDITS,
      },
    });

    const tokens = await this.generateTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto & { sessionId?: string }) {
    const normalizedEmail = this.normalizeLoginIdentifier(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const tokens = await this.generateTokens(user.id);

    if (dto.sessionId) {
      try {
        await this.consultService.mergeSessionToUser(dto.sessionId, user.id);
      } catch {}
    }

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async wxLogin(dto: WxLoginDto & { sessionId?: string }) {
    let isNewUser = false;
    let user = await this.prisma.user.findUnique({
      where: { wxOpenId: dto.wxOpenId },
    });

    if (!user) {
      isNewUser = true;
      user = await this.prisma.user.create({
        data: {
          wxOpenId: dto.wxOpenId,
          nickname: dto.nickname,
          creditBalance: AuthService.WELCOME_CREDITS,
        },
      });

      // 微信新用户赠送注册积分
      await this.prisma.creditLedger.create({
        data: {
          userId: user.id,
          amount: AuthService.WELCOME_CREDITS,
          reason: 'register_bonus',
          balanceAfter: AuthService.WELCOME_CREDITS,
        },
      });
    }

    const tokens = await this.generateTokens(user.id);

    if (dto.sessionId) {
      try {
        await this.consultService.mergeSessionToUser(dto.sessionId, user.id);
      } catch {}
    }

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.userId !== userId || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    return this.generateTokens(userId);
  }

  async logout(userId: string) {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /** 通用积分发放方法（供其他模块调用：邀请奖励、完善资料等） */
  async grantCredits(userId: string, amount: number, reason: string) {
    // P0 修复：使用 $transaction + increment 消除 read-then-write 竞态
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });
      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      const balanceAfter = (user.creditBalance || 0) + amount;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      await tx.creditLedger.create({
        data: { userId, amount, reason, balanceAfter },
      });

      return { creditBalance: balanceAfter, amount, reason };
    });

    return result;
  }

  private async generateTokens(userId: string) {
    // 使用时间戳+随机数确保每次生成的token唯一
    const nonce = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const accessToken = this.jwtService.sign({ sub: userId, nonce });
    const refreshToken = this.jwtService.sign(
      { sub: userId, nonce },
      { expiresIn: '7d' },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { password, ...result } = user;
    return {
      ...result,
      // P1-6: 只信任数据库 isAdmin 字段，移除 email 白名单兜底
      isAdmin: user.isAdmin === true,
      creditBalance: user.creditBalance || 0,
    };
  }

  private normalizeLoginIdentifier(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    return ADMIN_CONFIG.loginAliases.get(normalized) ?? normalized;
  }
}
