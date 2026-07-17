import { Controller, Post, Get, Body, Query, UseGuards, Request, Headers, Inject } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  /**
   * 获取管理后台统计数据 - GET /api/v1/analytics/admin/stats
   * 需要管理员权限
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getAdminStats() {
    return this.analyticsService.getAdminStats();
  }

  /**
   * S2 (2026-07-06): 漏斗统计 - GET /api/v1/analytics/admin/funnel
   * 按 activityType 分组返回 PV/UV/转化率
   */
  @Get('admin/funnel')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getFunnelStats() {
    return this.analyticsService.getFunnelStats();
  }

  /**
   * S4 (2026-07-06): 趋势统计 - GET /api/v1/analytics/admin/trend?days=7
   * 按天返回 PV/UV，支持 1-30 天
   */
  @Get('admin/trend')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getTrendStats(@Query('days') days?: string) {
    const d = Number(days) || 7;
    const safeDays = Math.max(1, Math.min(30, d));
    return this.analyticsService.getTrendStats(safeDays);
  }

  /**
   * S4 (2026-07-06): 复玩统计 - GET /api/v1/analytics/admin/retention
   * 返回复玩用户数、新用户数、复玩率
   */
  @Get('admin/retention')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRetentionStats() {
    return this.analyticsService.getRetentionStats();
  }

  /**
   * 记录页面访问 - POST /api/v1/analytics/page-visit
   * 不需要登录，记录所有用户访问
   */
  @Post('page-visit')
  async trackPageVisit(
    @Body() body: {
      pageName: string;
      pageUrl?: string;
      referrer?: string;
      screenSize?: string;
      duration?: number;
    },
    @Headers('user-agent') userAgent: string,
    @Request() req: any,
  ) {
    return this.analyticsService.trackPageVisit({
      ...body,
      userId: req.user?.id,
      sessionId: req.user?.sessionId,
      userAgent,
      ipAddress: req.ip,
    });
  }

  /**
   * 记录用户活动 - POST /api/v1/analytics/activity
   */
  @Post('activity')
  async trackActivity(
    @Body() body: {
      activityType: string;
      activityData?: Record<string, any>;
      duration?: number;
    },
    @Request() req: any,
  ) {
    return this.analyticsService.trackActivity({
      ...body,
      userId: req.user?.id,
      sessionId: req.user?.sessionId,
    });
  }

  /**
   * 记录漏斗事件 - POST /api/v1/analytics/event
   * 不需要登录，用于转化漏斗埋点
   */
  @Post('event')
  async trackEvent(
    @Body() body: {
      event: string;
      data?: Record<string, any>;
      timestamp?: number;
    },
    @Request() req: any,
  ) {
    return this.analyticsService.trackActivity({
      activityType: `funnel_${body.event}`,
      activityData: body.data || {},
      userId: req.user?.id,
      sessionId: undefined,
    });
  }

  /**
   * 保存八字档案 - POST /api/v1/analytics/bazi-profile
   */
  @Post('bazi-profile')
  @UseGuards(JwtAuthGuard)
  async saveBaZiProfile(
    @Body() body: {
      birthYear: number;
      birthMonth: number;
      birthDay: number;
      birthHour: number;
      birthMinute?: number;
      gender: string;
      baZiData: Record<string, any>;
      wuXingDist?: Record<string, number>;
      shenWang?: string;
      shenWangScore?: number;
      xiYongShen?: Record<string, string[]>;
      shiShen?: Record<string, string>;
      shenSha?: Record<string, string[]>;
      qiYunAge?: { years: number; months: number; days: number };
      isShunYun?: boolean;
      taiYuan?: string;
      mingGong?: string;
      naYin?: Record<string, string>;
      city?: string;
      correctedHour?: number;
    },
    @Request() req: any,
  ) {
    return this.analyticsService.saveBaZiProfile(req.user.id, body);
  }

  /**
   * 获取用户八字档案 - GET /api/v1/analytics/bazi-profile
   */
  @Get('bazi-profile')
  @UseGuards(JwtAuthGuard)
  async getBaZiProfile(@Request() req: any) {
    return this.analyticsService.getBaZiProfile(req.user.id);
  }

  /**
   * 获取用户分析统计 - GET /api/v1/analytics/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any) {
    return this.analyticsService.getUserStats(req.user.id);
  }

  /**
   * 批量保存分析结果 - POST /api/v1/analytics/consult-result
   */
  @Post('consult-result')
  @UseGuards(JwtAuthGuard)
  async saveConsultResult(
    @Body() body: {
      recordId: string;
      analysisData: Record<string, any>;
    },
    @Request() req: any,
  ) {
    return this.analyticsService.updateConsultAnalysisData(req.user.id, body.recordId, body.analysisData);
  }
}
