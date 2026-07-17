import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Inject } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { ActivateMembershipDto, UnlockModuleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('membership')
export class MembershipController {
  constructor(@Inject(MembershipService) private readonly membershipService: MembershipService) {}

  @Get('plans')
  async getPlans() {
    return this.membershipService.getPlans();
  }

  @Get('plans/:planId')
  async getPlan(@Param('planId') planId: string) {
    return this.membershipService.getPlan(planId);
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentMembership(@Request() req: any) {
    return this.membershipService.getUserMembership(req.user.id);
  }

  @Post('activate')
  @UseGuards(JwtAuthGuard)
  async activateMembership(
    @Request() req: any,
    @Body() dto: ActivateMembershipDto,
  ) {
    return this.membershipService.activateMembership(
      req.user.id,
      dto.planId,
      dto.orderId,
    );
  }

  @Post('unlock')
  @UseGuards(JwtAuthGuard)
  async unlockModule(@Request() req: any, @Body() dto: UnlockModuleDto) {
    return this.membershipService.unlockModule(req.user.id, dto.moduleId, dto.recordId, dto.orderId);
  }

  @Get('check/:moduleId')
  @UseGuards(JwtAuthGuard)
  async checkAccess(@Request() req: any, @Param('moduleId') moduleId: string) {
    return this.membershipService.getAccessDetail(req.user.id, moduleId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getMembershipHistory(@Request() req: any) {
    return this.membershipService.getMembershipHistory(req.user.id);
  }

  @Post('cancel/:membershipId')
  @UseGuards(JwtAuthGuard)
  async cancelMembership(
    @Request() req: any,
    @Param('membershipId') membershipId: string,
  ) {
    return this.membershipService.cancelMembership(req.user.id, membershipId);
  }

  // ── 积分相关端点 ──

  @Get('credit/balance')
  @UseGuards(JwtAuthGuard)
  async getCreditBalance(@Request() req: any) {
    return this.membershipService.getCreditBalance(req.user.id);
  }

  @Get('credit/history')
  @UseGuards(JwtAuthGuard)
  async getCreditHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.membershipService.getCreditHistory(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('credit/costs')
  async getCreditCosts() {
    return this.membershipService.getModuleCreditCosts();
  }

  // ── P2-1: 限免相关端点 ──

  @Get('free-trial/status')
  @UseGuards(JwtAuthGuard)
  async getFreeTrialStatus(@Request() req: any) {
    return this.membershipService.hasFreeTrial(req.user.id);
  }

  @Post('free-trial/use')
  @UseGuards(JwtAuthGuard)
  async useFreeTrial(@Request() req: any) {
    const result = await this.membershipService.recordFreeTrialUsed(req.user.id);
    if (!result.success) {
      return { success: false, message: '限免次数已用完' };
    }
    return { success: true, message: '限免已激活' };
  }
}
