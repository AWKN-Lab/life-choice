import { Module } from '@nestjs/common';
import { StarChartController } from './star-chart.controller';
import { PersonService } from './person.service';
import { EightDimensionsService } from './eight-dimensions.service';
import { NetworkService } from './network.service';
import { RelatedCaseService } from './related-case.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StarChartController],
  providers: [PersonService, EightDimensionsService, NetworkService, RelatedCaseService],
  exports: [PersonService, EightDimensionsService, NetworkService, RelatedCaseService],
})
export class StarChartModule {}
