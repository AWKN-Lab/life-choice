import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeSearchService } from './knowledge-search.service';

export interface TriMethodFusionInput {
  question: string;
  category: string;
  baziAnalysis?: string;
  ziweiAnalysis?: string;
  liurenAnalysis?: string;
}

export interface TriMethodFusionOutput {
  fusionPrompt: string;
  usedEntries: string[];
  consistencyCheck: {
    baziAndZiweiAgree: boolean | null;
    dominantMethod: 'bazi' | 'ziwei' | 'liuren' | 'balanced';
  };
}

@Injectable()
export class TriMethodFusionService {
  private readonly logger = new Logger(TriMethodFusionService.name);

  constructor(
    private readonly knowledgeSearch: KnowledgeSearchService,
  ) {}

  /**
   * 生成三法融合推理Prompt
   */
  async buildFusionPrompt(input: TriMethodFusionInput): Promise<TriMethodFusionOutput> {
    const { question, category, baziAnalysis, ziweiAnalysis, liurenAnalysis } = input;

    // 从知识库检索相关条目
    const searchResult = await this.knowledgeSearch.search({
      query: question,
      category,
      limit: 5,
    });

    const usedEntries = searchResult.entries.map(e => e.id);
    const knowledgeContext = this.knowledgeSearch.formatForPrompt(searchResult.entries);

    // 一致性检查
    let baziAndZiweiAgree: boolean | null = null;
    if (baziAnalysis && ziweiAnalysis) {
      // 简单的关键词一致性检查
      const positiveWords = ['吉', '顺', '旺', '好', '利', '成'];
      const negativeWords = ['凶', '逆', '衰', '差', '忌', '败'];

      const baziPositive = positiveWords.some(w => baziAnalysis.includes(w));
      const baziNegative = negativeWords.some(w => baziAnalysis.includes(w));
      const ziweiPositive = positiveWords.some(w => ziweiAnalysis.includes(w));
      const ziweiNegative = negativeWords.some(w => ziweiAnalysis.includes(w));

      if ((baziPositive && ziweiPositive) || (baziNegative && ziweiNegative)) {
        baziAndZiweiAgree = true;
      } else if ((baziPositive && ziweiNegative) || (baziNegative && ziweiPositive)) {
        baziAndZiweiAgree = false;
      }
    }

    // 确定主导方法
    let dominantMethod: 'bazi' | 'ziwei' | 'liuren' | 'balanced' = 'balanced';
    const methodCount = [baziAnalysis, ziweiAnalysis, liurenAnalysis].filter(Boolean).length;
    if (methodCount === 1) {
      if (baziAnalysis) dominantMethod = 'bazi';
      else if (ziweiAnalysis) dominantMethod = 'ziwei';
      else dominantMethod = 'liuren';
    }

    // 构建融合Prompt
    const promptParts: string[] = [
      '## 三法融合推理',
      '',
      `问题：${question}`,
      `分类：${category}`,
      '',
    ];

    if (knowledgeContext) {
      promptParts.push('### 典籍参考');
      promptParts.push(knowledgeContext);
      promptParts.push('');
    }

    if (baziAnalysis) {
      promptParts.push('### 八字分析结论');
      promptParts.push(baziAnalysis.slice(-500));
      promptParts.push('');
    }

    if (ziweiAnalysis) {
      promptParts.push('### 紫微斗数分析结论');
      promptParts.push(ziweiAnalysis.slice(-500));
      promptParts.push('');
    }

    if (liurenAnalysis) {
      promptParts.push('### 六壬分析结论');
      promptParts.push(liurenAnalysis.slice(-500));
      promptParts.push('');
    }

    promptParts.push('### 融合推理要求');
    promptParts.push('1. 一致性判断：三法给出的吉凶指向是否一致');
    promptParts.push('2. 权重分配：不一致时，八字权重40%，紫微权重35%，六壬权重25%');
    promptParts.push('3. 综合判断：给出最终判断和核心依据');
    promptParts.push('4. 不确定性标注：对判断中不确定的部分明确标注');

    return {
      fusionPrompt: promptParts.join('\n'),
      usedEntries,
      consistencyCheck: {
        baziAndZiweiAgree,
        dominantMethod,
      },
    };
  }
}
