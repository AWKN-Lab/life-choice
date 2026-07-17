import { Module } from '@nestjs/common';
import { KlineGenerator } from './kline.generator';
import { MonthlyGenerator } from './monthly.generator';
import { WuxingGenerator } from './wuxing.generator';
import { FortuneService } from './fortune.service';
import { CelebrityService } from './celebrity.service';
import { MovingAverageService } from './moving-average.service';
import { ShortCycleGenerator } from './short-cycle.generator';

@Module({
  providers: [KlineGenerator, MonthlyGenerator, WuxingGenerator, FortuneService, CelebrityService, MovingAverageService, ShortCycleGenerator],
  exports: [KlineGenerator, MonthlyGenerator, WuxingGenerator, FortuneService, CelebrityService, MovingAverageService, ShortCycleGenerator],
})
export class GeneratorsModule {}
