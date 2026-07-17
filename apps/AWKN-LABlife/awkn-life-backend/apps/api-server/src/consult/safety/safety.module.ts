import { Module } from '@nestjs/common';
import { HighRiskDetectorService } from './high-risk-detector.service';

@Module({
  providers: [HighRiskDetectorService],
  exports: [HighRiskDetectorService],
})
export class SafetyModule {}
