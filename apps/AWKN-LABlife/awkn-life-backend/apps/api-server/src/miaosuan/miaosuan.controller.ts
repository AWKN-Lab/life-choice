import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MiaosuanService } from './miaosuan.service';
import { MiaosuanInputDto } from './dto';

@Controller('miaosuan')
@UseGuards(JwtAuthGuard)
export class MiaosuanController {
  constructor(private readonly miaosuanService: MiaosuanService) {}

  @Post()
  async create(@Body() dto: MiaosuanInputDto, @Request() req: any) {
    return this.miaosuanService.create({ ...dto, userId: req.user?.id });
  }

  @Get()
  async list(@Request() req: any) {
    return this.miaosuanService.findByUser(req.user?.id);
  }
}
