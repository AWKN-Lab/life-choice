import { Module, forwardRef } from '@nestjs/common';
import { DialogueController } from './dialogue.controller';
import { DialogueService } from './dialogue.service';
import { DialogueTimeoutService } from './dialogue-timeout.service';
import { WebsocketModule } from '../../websocket/websocket.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LlmProvidersModule } from '../../llm-providers/llm-providers.module';
import { ContextModule } from '../context';
import { ClarificationModule } from '../clarification/clarification.module';
import { PromptInjectionGuardModule } from '../../guardrails/prompt-injection-guard.module';
// Phase 3 T3.2: 直接注册 UnifiedStateMachineService（无外部依赖的纯逻辑服务）
import { UnifiedStateMachineService } from '../orchestrator/unified-state-machine.service';

@Module({
  imports: [
    forwardRef(() => WebsocketModule),
    PrismaModule,
    LlmProvidersModule,
    ContextModule,
    ClarificationModule,
    PromptInjectionGuardModule,
  ],
  controllers: [DialogueController],
  providers: [DialogueService, DialogueTimeoutService, UnifiedStateMachineService],
  exports: [DialogueService, DialogueTimeoutService],
})
export class DialogueModule {}
