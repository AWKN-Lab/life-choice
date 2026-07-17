import { Module } from '@nestjs/common';
import { ShumiyuanController } from './shumiyuan.controller';
import { SpeakService } from './speak.service';
import { SpreadService } from './spread.service';
import { BottomService } from './bottom.service';
import { FlowStateService } from './flow-state.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';
import { LlmGatewayModule } from '../llm-gateway/llm-gateway.module';

@Module({
  imports: [PrismaModule, LlmProvidersModule, LlmGatewayModule],
  controllers: [ShumiyuanController],
  providers: [SpeakService, SpreadService, BottomService, FlowStateService],
  exports: [SpeakService, SpreadService, BottomService, FlowStateService],
})
export class ShumiyuanModule {}
