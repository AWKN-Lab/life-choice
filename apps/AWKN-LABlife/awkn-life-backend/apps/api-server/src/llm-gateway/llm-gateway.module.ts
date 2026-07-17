import { Module, Global } from '@nestjs/common';
import { LlmGatewayService } from './llm-gateway.service';
import { LlmCostDashboardService } from './llm-cost-dashboard.service';
import { LlmRouterService } from './llm-router.service';
import { ZipingAgentModule } from '../ziping-agent/ziping-agent.module';
import { LiurenAgentModule } from '../liuren-agent/liuren-agent.module';
import { QumingAgentModule } from '../quming-agent/quming-agent.module';
import { QimenAgentModule } from '../qimen-agent/qimen-agent.module';
import { LiuyaoAgentModule } from '../liuyao-agent/liuyao-agent.module';
import { ZiweiAgentModule } from '../ziwei-agent/ziwei-agent.module';

@Global()
@Module({
  imports: [ZipingAgentModule, LiurenAgentModule, QumingAgentModule, QimenAgentModule, LiuyaoAgentModule, ZiweiAgentModule],
  providers: [LlmGatewayService, LlmCostDashboardService, LlmRouterService],
  exports: [LlmGatewayService, LlmCostDashboardService, LlmRouterService],
})
export class LlmGatewayModule {}
