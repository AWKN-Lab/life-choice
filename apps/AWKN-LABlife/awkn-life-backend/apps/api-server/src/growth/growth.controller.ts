import {
  Controller, Get, Post, Body, Query, UseGuards, Req, HttpCode
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GrowthService } from './growth.service';

class RecordReferralDto {
  inviteCode: string;
  source?: string;
  medium?: string;
  campaign?: string;
}

class RecordPosterShareDto {
  inviteCode: string;
  source: string;
  medium?: string;
  campaign?: string;
  parentReferralId?: string;
}

class ActivateReferralDto {
  referralId: string;
}

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  /**
   * 获取当前用户的邀请码
   */
  @UseGuards(JwtAuthGuard)
  @Get('invite-code')
  async getInviteCode(@Req() req: any) {
    const userId = req.user.id;
    const code = await this.growthService.getOrCreateInviteCode(userId);
    return { code };
  }

  /**
   * 获取用户的邀请统计
   */
  @UseGuards(JwtAuthGuard)
  @Get('invite-stats')
  async getInviteStats(@Req() req: any) {
    const stats = await this.growthService.getInviteStats(req.user.id);
    return stats || { code: null, usedCount: 0, referrals: 0 };
  }

  /**
   * 记录一次回流访问（无需登录）
   * 前端从 URL 的 UTM 参数提取后调用
   */
  @Post('referral/record')
  @HttpCode(200)
  async recordReferral(@Body() dto: RecordReferralDto) {
    try {
      const result = await this.growthService.recordReferral({
        inviteCode: dto.inviteCode,
        source: dto.source,
        medium: dto.medium,
        campaign: dto.campaign,
      });
      return { success: true, referralId: result.referralId };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * 用户注册后激活邀请关系（注册时调用）
   */
  @UseGuards(JwtAuthGuard)
  @Post('referral/activate')
  async activateReferral(@Body() dto: ActivateReferralDto, @Req() req: any) {
    await this.growthService.activateReferral(dto.referralId, req.user.id);
    return { success: true };
  }

  /**
   * 获取当前有效的优惠活动
   */
  @Get('offers')
  async getActiveOffers() {
    const offers = await this.growthService.getActiveOffers();
    return { offers };
  }

  // ---- P2-3: 海报裂变 ----

  /**
   * 记录海报分享（含3级链路）
   */
  @Post('poster-share')
  @HttpCode(200)
  async recordPosterShare(@Body() dto: RecordPosterShareDto) {
    try {
      const result = await this.growthService.recordPosterShare({
        inviteCode: dto.inviteCode,
        source: dto.source,
        medium: dto.medium,
        campaign: dto.campaign,
        parentReferralId: dto.parentReferralId,
      });
      return { success: true, referralId: result.referralId };
    } catch (error) {
      return { success: false, message: (error as Error).message };
    }
  }

  /**
   * 获取3级返利统计
   */
  @UseGuards(JwtAuthGuard)
  @Get('referral-rewards')
  async getReferralRewards(@Req() req: any) {
    const rewards = await this.growthService.calculateReferralRewards(req.user.id);
    return rewards;
  }
}
