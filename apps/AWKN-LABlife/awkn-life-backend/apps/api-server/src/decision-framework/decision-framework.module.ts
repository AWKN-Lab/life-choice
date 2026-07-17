import { Module } from '@nestjs/common';
import { FourStepDecisionService } from './four-step.service';
import { VfmEvaluatorService } from './vfm-evaluator.service';
import { TaskClassifierService } from './task-classifier.service';
import { AdlGuardService } from './adl-guard.service';

@Module({
  providers: [
    FourStepDecisionService,
    VfmEvaluatorService,
    TaskClassifierService,
    AdlGuardService,
  ],
  exports: [
    FourStepDecisionService,
    VfmEvaluatorService,
    TaskClassifierService,
    AdlGuardService,
  ],
})
export class DecisionFrameworkModule {}
