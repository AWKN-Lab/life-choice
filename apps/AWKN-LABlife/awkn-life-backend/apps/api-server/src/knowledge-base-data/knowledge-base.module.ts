import { Module } from '@nestjs/common';
import { KnowledgeSearchService } from './knowledge-search.service';
import { TriMethodFusionService } from './tri-method-fusion.service';

@Module({
  providers: [KnowledgeSearchService, TriMethodFusionService],
  exports: [KnowledgeSearchService, TriMethodFusionService],
})
export class KnowledgeBaseModule {}
