// ============================================================
// 人生K线 + 潮汐图 — NestJS 模块定义
// 阶段一（2026-06-09）：SQLite 持久化 + 内存 fallback 生成
// P1（2026-07-12）：V2 链路 — KlineCalculationEngine + SnapshotService + V2Controller
// ============================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembershipModule } from '../membership/membership.module';
import { KlineTideController } from './kline-tide.controller';
import { KlineV2Controller } from './kline-v2.controller';
import { KlineTideService } from './kline-tide.service';
import { KlineScoringService } from './kline-scoring.service';
import { KlineCalculationEngine } from './kline-calculation.engine';
import { KlineDecisionService } from './kline-decision.service';
import { KlineSnapshotService } from './kline-snapshot.service';

@Module({
  imports: [PrismaModule, MembershipModule],
  controllers: [KlineTideController, KlineV2Controller],
  providers: [
    KlineTideService,
    KlineScoringService,
    KlineCalculationEngine,
    KlineDecisionService,
    KlineSnapshotService,
  ],
  exports: [
    KlineTideService,
    KlineScoringService,
    KlineCalculationEngine,
    KlineDecisionService,
    KlineSnapshotService,
  ],
})
export class KlineTideModule {}
