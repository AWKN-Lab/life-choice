/**
 * P2-2: 反馈 API
 * - POST /api/v1/feedback  提交反馈（需登录）
 * - GET  /api/v1/feedback/record/:recordId  列出某条记录的所有反馈
 * - POST /api/v1/feedback/:id/calibrate  专家校准（admin）
 * - GET  /api/v1/feedback/unapplied  未采纳反馈（admin）
 * - POST /api/v1/feedback/calibrate/run  手动触发复盘（admin）
 */
import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async submit(@Body() body: any, @Request() req: any) {
    const userId = req.user?.id;
    return this.feedbackService.submitFeedback({
      recordId: body.recordId,
      userId,
      rating: Number(body.rating),
      accuracy: body.accuracy ? Number(body.accuracy) : undefined,
      helpfulness: body.helpfulness ? Number(body.helpfulness) : undefined,
      tone: body.tone ? Number(body.tone) : undefined,
      comment: body.comment,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('record/:recordId')
  async list(@Param('recordId') recordId: string) {
    return this.feedbackService.listFeedbacks(recordId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/list')
  async adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('rating') rating?: string,
    @Query('routeType') routeType?: string,
    @Query('hasComment') hasComment?: string,
  ) {
    return this.feedbackService.listAdminFeedbacks({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status && status !== 'all' ? (status as 'pending' | 'reviewed' | 'applied') : undefined,
      rating: rating && rating !== 'all' ? Number(rating) : undefined,
      routeType: routeType && routeType !== 'all' ? routeType : undefined,
      hasComment: hasComment === 'true' ? true : hasComment === 'false' ? false : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/calibrate')
  async calibrate(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.feedbackService.applyCalibration({
      feedbackId: id,
      reviewerId: req.user?.id,
      isJudgmentCorrect: body.isJudgmentCorrect === true,
      calibrationTag: body.calibrationTag,
      calibrationNote: body.calibrationNote,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/apply')
  async apply(@Param('id') id: string, @Body() body: any) {
    const cronId = body?.cronId || `manual-single-${Date.now()}`;
    return this.feedbackService.markSingleApplied(id, cronId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('unapplied')
  async unapplied() {
    return this.feedbackService.collectUnappliedFeedbacks();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('calibrate/suggestions')
  async suggestions() {
    return this.feedbackService.generateCalibrationSuggestions();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('calibrate/run')
  async runCalibration(@Body() body: any) {
    const cronId = body.cronId || `manual-${Date.now()}`;
    const stats = await this.feedbackService.collectUnappliedFeedbacks();
    const ids = stats.items.map(i => i.id);
    const result = await this.feedbackService.markApplied(ids, cronId);
    return { ...stats, applied: result, suggestions: await this.feedbackService.generateCalibrationSuggestions() };
  }
}
