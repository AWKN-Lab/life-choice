import { Module } from '@nestjs/common';
import { NamingController } from './naming.controller';
import { NamingService } from './naming.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NamingController],
  providers: [NamingService],
  exports: [NamingService],
})
export class NamingModule {}
