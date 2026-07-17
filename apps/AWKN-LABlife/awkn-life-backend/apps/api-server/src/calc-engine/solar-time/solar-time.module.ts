import { Module } from '@nestjs/common';
import { SolarTimeService } from './solar-time.service';

@Module({
  providers: [SolarTimeService],
  exports: [SolarTimeService],
})
export class SolarTimeModule {}