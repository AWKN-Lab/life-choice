import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ConsultModule } from '../consult/consult.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [ConsultModule, AnalyticsModule],
  controllers: [AdminController],
})
export class AdminModule {}
