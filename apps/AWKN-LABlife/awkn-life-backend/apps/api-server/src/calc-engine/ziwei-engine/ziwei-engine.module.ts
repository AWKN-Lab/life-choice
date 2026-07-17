import { Module } from '@nestjs/common';
import { ZiweiBridgeService } from './ziwei-bridge.service';

@Module({
  providers: [ZiweiBridgeService],
  exports: [ZiweiBridgeService],
})
export class ZiweiEngineModule {}