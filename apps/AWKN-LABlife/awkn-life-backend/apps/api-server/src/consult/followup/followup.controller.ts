import { Controller, Post, Body, Inject, BadRequestException, Get, Param, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { FollowupService } from './followup.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

class FollowupDto {
  @IsString()
  @IsNotEmpty()
  recordId: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsOptional()
  @IsArray()
  context?: Array<{ role: string; content: string }>;
}

@Controller('consult/followup')
@UseGuards(JwtAuthGuard)
export class FollowupController {
  constructor(
    @Inject(FollowupService)
    private readonly followupService: FollowupService,
  ) {}

  @Post()
  async handleFollowup(@Body() dto: FollowupDto, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('用户身份缺失');

    const result = await this.followupService.handleFollowup(
      dto.recordId,
      dto.question.trim(),
      dto.context,
      userId,
    );

    return result;
  }

  @Get(':followUpId')
  async getFollowUpContext(@Param('followUpId') followUpId: string, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('用户身份缺失');

    return this.followupService.getFollowUpContext(followUpId, userId);
  }
}
