import { Module } from '@nestjs/common';
import { StyleTemplateService } from './style-template.service';
import { AgentRelayService } from './agent-relay.service';
import { QualityEvaluatorService } from './quality-evaluator.service';
import { StyleCapabilityMatrixService } from './style-capability-matrix.service';
import { WritingPipelineController } from './writing-pipeline.controller';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule],
  controllers: [WritingPipelineController],
  providers: [StyleTemplateService, AgentRelayService, QualityEvaluatorService, StyleCapabilityMatrixService],
  exports: [StyleTemplateService, AgentRelayService, QualityEvaluatorService, StyleCapabilityMatrixService],
})
export class WritingPipelineModule {}
