import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface KnowledgeItem {
  sourceId: string;
  title: string;
  text: string;
  score: number;
}

export interface RetrieveInput {
  routeType: string;
  question: string;
  evidenceTags: string[];
  limit?: number;
}

@Injectable()
export class KnowledgeRetrieverService {
  private readonly logger = new Logger(KnowledgeRetrieverService.name);
  private readonly baseUrl = 'http://127.0.0.1:8701';
  private readonly timeout = 3000;

  constructor(private readonly prisma: PrismaService) {}

  async retrieve(runId: string, input: RetrieveInput): Promise<KnowledgeItem[]> {
    // v2 升级（2026-06-18）：默认走 /hybrid_search（向量+关键词混合），失败回退 /retrieve
    const useHybrid = process.env.USE_HYBRID_SEARCH !== 'false'; // 默认 true
    const items = useHybrid
      ? await this._callHybridSearch(input).catch(() => this._callRetrieve(input))
      : await this._callRetrieve(input);

    // 写入 KnowledgeHit 表（保留原有可观测性）
    for (const item of items) {
      try {
        await this.prisma.knowledgeHit.create({
          data: {
            runId,
            sourceId: item.sourceId,
            sourceType: input.routeType,
            title: item.title,
            snippet: item.text.substring(0, 500),
            score: Math.round(item.score * 100),
          },
        });
      } catch (e) {
        // 单条写入失败不阻塞主流程
      }
    }
    return items;
  }

  /**
   * v2: 调用 /hybrid_search（向量+关键词混合检索）
   * 失败时由调用方回退到 _callRetrieve
   */
  private async _callHybridSearch(input: RetrieveInput): Promise<KnowledgeItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`${this.baseUrl}/hybrid_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeType: input.routeType,
          question: input.question,
          evidenceTags: input.evidenceTags,
          limit: input.limit || 6,
          vectorWeight: 0.7,
          keywordWeight: 0.3,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { items: KnowledgeItem[] };
      return data.items || [];
    } catch (error) {
      clearTimeout(timer);
      this.logger.warn(`[KnowledgeRetriever v2] hybrid_search failed: ${error.message}, falling back to /retrieve`);
      throw error; // 让外层 catch 触发回退
    }
  }

  /**
   * v1 兼容：调用 /retrieve（关键词检索）
   */
  private async _callRetrieve(input: RetrieveInput): Promise<KnowledgeItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(`${this.baseUrl}/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeType: input.routeType,
          question: input.question,
          evidenceTags: input.evidenceTags,
          limit: input.limit || 6,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { items: KnowledgeItem[] };
      return data.items || [];
    } catch (error) {
      clearTimeout(timer);
      this.logger.warn(`[KnowledgeRetriever v1] /retrieve failed: ${error.message}, returning empty`);
      return [];
    }
  }

  async getSimilarCases(runId: string, evidenceTags: string[], limit = 5): Promise<KnowledgeItem[]> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/similar-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceTags, limit }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { items: KnowledgeItem[] };
      return data.items || [];
    } catch (error) {
      this.logger.warn(`[KnowledgeRetriever] similar-cases failed: ${error.message}`);
      return [];
    }
  }
}
