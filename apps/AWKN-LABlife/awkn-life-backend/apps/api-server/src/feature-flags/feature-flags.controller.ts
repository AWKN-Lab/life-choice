import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('feature-flags')
// P0-7 统一授权守卫：feature-flags 返回内部开关状态，必须登录
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  @Get()
  getFlags() {
    return {
      cost_warning_enabled: process.env.COST_WARNING_ENABLED === 'true',
      cost_confirmation_enabled: process.env.COST_CONFIRMATION_ENABLED === 'true',
      callback_enabled: process.env.CALLBACK_ENABLED === 'true',
      memory_anchor_enabled: process.env.MEMORY_ANCHOR_ENABLED === 'true',
      user_classifier_enabled: process.env.USER_CLASSIFIER_ENABLED === 'true',
      multi_turn_enabled: process.env.MULTI_TURN_ENABLED === 'true',
      pipeline_v2_enabled: process.env.PIPELINE_V2_ENABLED !== 'false',
      // P0-09 (2026-07-12): K线V2 功能开关 — 默认全部关闭，按需开启
      kline_v2_enabled: process.env.KLINE_V2_ENABLED === 'true',
      kline_v2_public_preview_enabled: process.env.KLINE_V2_PUBLIC_PREVIEW_ENABLED === 'true',
      kline_v2_node_ask_enabled: process.env.KLINE_V2_NODE_ASK_ENABLED === 'true',
      kline_v2_outcome_enabled: process.env.KLINE_V2_OUTCOME_ENABLED === 'true',
      // 模拟数据：生产环境必须 false，开发环境可设为 true 配合 ALLOW_SEED_WRITE
      kline_simulated_data_allowed: process.env.KLINE_SIMULATED_DATA_ALLOWED === 'true',
    };
  }
}
