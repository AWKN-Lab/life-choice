import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpeakService } from './speak.service';
import { SpreadService } from './spread.service';
import { BottomService } from './bottom.service';
import { FlowStateService } from './flow-state.service';
import {
  SpeakInputDto,
  SpreadConfirmDto,
  DispatchActionDto,
} from './dto';

@Controller('shumiyuan')
@UseGuards(JwtAuthGuard)
export class ShumiyuanController {
  constructor(
    private readonly speakService: SpeakService,
    private readonly spreadService: SpreadService,
    private readonly bottomService: BottomService,
    private readonly flowStateService: FlowStateService,
  ) {}

  /** 第一步：说出来 */
  @Post('speak')
  async speak(@Body() dto: SpeakInputDto) {
    const result = await this.speakService.process(dto);
    this.flowStateService.create(result.recordId);
    return result;
  }

  /** 第二步：摆开 — 生成卡片 */
  @Get('spread/:id')
  async spread(@Param('id') recordId: string) {
    return this.spreadService.generateSpread(recordId);
  }

  /** 第二步：摆开 — 确认卡片 */
  @Post('spread/:id')
  async confirmSpread(
    @Param('id') recordId: string,
    @Body() dto: SpreadConfirmDto,
  ) {
    if (dto.confirmed) {
      this.flowStateService.transition(recordId, 'bottomed');
    }
    return this.spreadService.confirmSpread(recordId, dto);
  }

  /** 第三步：这事底 */
  @Get('bottom/:id')
  async bottom(@Param('id') recordId: string) {
    return this.bottomService.generateBottom(recordId);
  }

  /** 分流操作 */
  @Post('bottom/:id/dispatch')
  async dispatch(
    @Param('id') recordId: string,
    @Body() dto: DispatchActionDto,
  ) {
    const state = this.flowStateService.get(recordId);
    if (!state) throw new NotFoundException('Flow state not found');

    switch (dto.action) {
      case 'chronicle':
        this.flowStateService.transition(recordId, 'chronicled');
        return { action: 'chronicle', redirectTo: '/tongjian' };
      case 'respread':
        this.flowStateService.transition(recordId, 'speaking');
        return { action: 'respread', redirectTo: `/shumiyuan/spread/${recordId}` };
      case 'miaosuan':
        return { action: 'miaosuan', redirectTo: '/miaosuan' };
      case 'xingtu':
        return { action: 'xingtu', redirectTo: '/xingtu' };
      default:
        throw new NotFoundException('Unknown dispatch action');
    }
  }
}
