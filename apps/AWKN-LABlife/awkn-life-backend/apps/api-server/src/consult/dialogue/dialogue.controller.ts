import { Controller, Post, Get, Body, Param, Req, Inject, UseGuards, ForbiddenException } from '@nestjs/common';
import { DialogueService } from './dialogue.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('consult/dialogue')
@UseGuards(JwtAuthGuard)
export class DialogueController {
  constructor(
    @Inject(DialogueService)
    private readonly dialogueService: DialogueService,
  ) {}

  @Post('start')
  async startDialogue(@Body() dto: { question: string }, @Req() req: any) {
    const userId = req.user?.id;
    // Phase 3 T3.4: 灰度检查 — 不在灰度范围内的用户拒绝启动多轮对话
    if (!this.dialogueService.isGraylisted(userId)) {
      throw new ForbiddenException('多轮对话功能正在灰度开放中，请稍后再试');
    }
    return this.dialogueService.startDialogue(userId, dto.question);
  }

  @Post(':dialogueId/reply')
  async replyDialogue(
    @Param('dialogueId') dialogueId: string,
    @Body() dto: { reply: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.dialogueService.advanceDialogue(dialogueId, dto.reply, userId);
  }

  @Get(':dialogueId/result')
  async getDialogueResult(
    @Param('dialogueId') dialogueId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.dialogueService.getDialogueResult(dialogueId, userId);
  }
}
