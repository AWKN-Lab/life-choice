import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChronicleService } from './chronicle.service';
import { CreateEntryDto, ReviewEntryDto } from './dto';

@Controller('chronicle')
@UseGuards(JwtAuthGuard)
export class ChronicleController {
  constructor(private readonly chronicleService: ChronicleService) {}

  @Post('entries')
  async createEntry(@Body() dto: CreateEntryDto, @Request() req: any) {
    return this.chronicleService.createEntry({ ...dto, userId: req.user?.id });
  }

  @Get('entries')
  async listEntries(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    const userId = req.user?.id;
    if (type) {
      return this.chronicleService.findByType(userId, type);
    }
    return this.chronicleService.findByUser(userId);
  }

  @Get('reviews/pending')
  async getPendingReviews(@Request() req: any) {
    return this.chronicleService.getPendingReviews(req.user?.id);
  }

  @Post('entries/:id/review')
  async addReview(
    @Param('id') entryId: string,
    @Body() dto: ReviewEntryDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('用户身份缺失');
    return this.chronicleService.addReview(entryId, dto, userId);
  }

  @Get('insights')
  async getInsights(@Request() req: any) {
    return this.chronicleService.getInsightProfile(req.user?.id);
  }

  @Post('insights/generate')
  async generateInsights(@Request() req: any) {
    return this.chronicleService.generateInsightProfile(req.user?.id);
  }
}
