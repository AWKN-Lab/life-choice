import { Module, Global } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';

@Global()
@Module({
  providers: [LlmProvidersService],
  exports: [LlmProvidersService],
})
export class LlmProvidersModule {}
