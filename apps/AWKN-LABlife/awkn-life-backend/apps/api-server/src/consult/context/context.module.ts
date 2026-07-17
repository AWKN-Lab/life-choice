import { Module } from '@nestjs/common';
import { TokenCounterService } from './token-counter.service';
import { ContextBuilderService } from './context-builder.service';
import { SummaryCompressorService } from './summary-compressor.service';

/**
 * 上下文工程模块
 * 提供多轮对话的 Token 计数、滑动窗口构建、对话摘要压缩能力
 * LlmProvidersService 由全局模块 LlmProvidersModule 提供，无需在此导入
 */
@Module({
  providers: [TokenCounterService, ContextBuilderService, SummaryCompressorService],
  exports: [TokenCounterService, ContextBuilderService, SummaryCompressorService],
})
export class ContextModule {}