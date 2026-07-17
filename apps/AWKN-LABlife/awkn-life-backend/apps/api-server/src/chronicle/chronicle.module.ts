import { Module } from '@nestjs/common';
import { ChronicleController } from './chronicle.controller';
import { ChronicleService } from './chronicle.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [PrismaModule, LlmProvidersModule],
  controllers: [ChronicleController],
  providers: [ChronicleService],
  exports: [ChronicleService],
})
export class ChronicleModule {}
