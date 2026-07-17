import { Module } from '@nestjs/common';
import { CalcEngineService } from './calc-engine.service';
import { BaziCalculatorWrapper } from './bazi-calculator-wrapper';
import { NamingCalculator } from './naming-engine/naming-calculator';
import { TranslationService } from './translation.service';
import { PythonBridgeService } from './python-bridge.service';
import { QimenAgentModule } from '../qimen-agent/qimen-agent.module';
import { LiuyaoAgentModule } from '../liuyao-agent/liuyao-agent.module';
import { ZiweiAgentModule } from '../ziwei-agent/ziwei-agent.module';
import { MeihuaAgentModule } from '../meihua-agent/meihua-agent.module';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [LlmProvidersModule, QimenAgentModule, LiuyaoAgentModule, ZiweiAgentModule, MeihuaAgentModule],
  providers: [CalcEngineService, BaziCalculatorWrapper, NamingCalculator, TranslationService, PythonBridgeService],
  exports: [CalcEngineService, BaziCalculatorWrapper, NamingCalculator, TranslationService, PythonBridgeService],
})
export class CalcEngineModule {}
