import { Module } from '@nestjs/common';
import { SavedCaseController } from './saved-case.controller';
import { SavedCaseService } from './saved-case.service';

@Module({
  controllers: [SavedCaseController],
  providers: [SavedCaseService],
  exports: [SavedCaseService],
})
export class SavedCaseModule {}
