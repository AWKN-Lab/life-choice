import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AgentRelayService } from './agent-relay.service';
import { StyleTemplateService, WritingStyle } from './style-template.service';
import { AgentRelayDto } from './dto/agent-relay.dto';

@Controller('writing-pipeline')
@UseGuards(JwtAuthGuard, AdminGuard)
export class WritingPipelineController {
  constructor(
    private readonly agentRelayService: AgentRelayService,
    private readonly styleTemplateService: StyleTemplateService,
  ) {}

  @Post('relay')
  async relay(@Body() dto: AgentRelayDto) {
    return this.agentRelayService.relay({
      agentName: dto.agentName,
      rawOutput: dto.rawOutput,
      style: dto.style as WritingStyle | undefined,
      question: dto.question,
      category: dto.category,
    });
  }

  @Post('styles')
  getStyles() {
    return this.styleTemplateService.getAllStyles();
  }
}
