import { Module } from '@nestjs/common';
import { CompletenessAssessorService } from './completeness-assessor.service';
import { ClarificationService } from './clarification.service';

/**
 * T2.3: 追问模块
 *
 * 注意：LlmProvidersModule 是全局模块（@Global），无需在此导入。
 * CompletenessAssessorService 和 ClarificationService 都通过 @Optional() 注入 LlmProvidersService，
 * 在测试环境或无 LLM 场景下可降级为规则匹配。
 */
@Module({
  providers: [CompletenessAssessorService, ClarificationService],
  exports: [CompletenessAssessorService, ClarificationService],
})
export class ClarificationModule {}
