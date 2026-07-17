import { Module } from '@nestjs/common';
import { GuardrailService } from './guardrail.service';
import { ClassicValidatorService } from './classic-validator.service';

@Module({
  providers: [GuardrailService, ClassicValidatorService],
  exports: [GuardrailService, ClassicValidatorService],
})
export class GuardrailsModule {}
