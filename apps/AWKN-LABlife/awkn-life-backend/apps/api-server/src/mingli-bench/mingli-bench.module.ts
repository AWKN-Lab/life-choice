import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MingliBenchController } from './mingli-bench.controller';
import { MingliBenchService } from './mingli-bench.service';
import { SubAgentService } from './sub-agent.service';
import { CalcEngineModule } from '../calc-engine/calc-engine.module';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [ConfigModule, CalcEngineModule, LlmProvidersModule],
  controllers: [MingliBenchController],
  providers: [MingliBenchService, SubAgentService],
  exports: [MingliBenchService, SubAgentService],
})
export class MingliBenchModule {}
