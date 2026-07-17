import { Module } from '@nestjs/common';
import { PromptInjectionGuardService } from './prompt-injection-guard.service';

@Module({
  providers: [PromptInjectionGuardService],
  exports: [PromptInjectionGuardService],
})
export class PromptInjectionGuardModule {}
