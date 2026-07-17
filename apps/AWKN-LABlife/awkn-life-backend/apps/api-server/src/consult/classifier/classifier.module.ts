import { Module, forwardRef } from '@nestjs/common';
import { UserStateClassifierService } from './user-state-classifier.service';
import { UserMemoryService } from '../memory/user-memory.service';

@Module({
  imports: [],
  providers: [UserStateClassifierService, UserMemoryService],
  exports: [UserStateClassifierService],
})
export class ClassifierModule {}
