import { Module } from '@nestjs/common';
import { MiaosuanController } from './miaosuan.controller';
import { MiaosuanService } from './miaosuan.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmProvidersModule } from '../llm-providers/llm-providers.module';

@Module({
  imports: [PrismaModule, LlmProvidersModule],
  controllers: [MiaosuanController],
  providers: [MiaosuanService],
  exports: [MiaosuanService],
})
export class MiaosuanModule {}
