import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Phase 4 T4.2: 记忆 Embedding 服务
 *
 * 实现策略（参考 Python TfidfCharBigramEmbedder，Node.js 简化版）：
 * - char-bigram 提取（中文按字符对，英文按单词）
 * - md5 hash 映射到 256 维槽位
 * - TF 加权（词频）
 * - L2 归一化
 *
 * 存储到 MemoryEmbedding 表（embedding 字段为 JSON number[]）
 * 支持 T4.3 向量+关键词混合检索
 */
@Injectable()
export class MemoryEmbeddingService {
  private readonly logger = new Logger(MemoryEmbeddingService.name);
  private static readonly DIM = parseInt(process.env.EMBEDDING_DIM || '256', 10);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /**
   * 生成文本的 embedding 向量（256 维，L2 归一化）
   * 算法：char-bigram + hash 投影 + TF 加权 + 归一化
   */
  generateEmbedding(text: string): number[] {
    const dim = MemoryEmbeddingService.DIM;
    const vector = new Array(dim).fill(0);

    // 1. 提取 char-bigram（中文）+ word token（英文）
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return vector;

    // 2. hash 投影到 dim 维，TF 加权
    for (const token of tokens) {
      const hash = this.hash(token);
      const idx = hash % dim;
      // 符号 hash：奇数为正，偶数为负（减少冲突）
      const sign = (Math.floor(hash / dim) % 2 === 0) ? 1 : -1;
      vector[idx] += sign;
    }

    // 3. L2 归一化
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  /**
   * 分词：char-bigram（中文）+ word token（英文/数字）
   */
  private tokenize(text: string): string[] {
    const tokens: string[] = [];
    // 清理标点
    const cleanText = text.replace(/[，。！？、；：""''（）【】《》\s\n\r\t]/g, '');

    // 中文 char-bigram
    const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g) || [];
    for (let i = 0; i < chineseChars.length - 1; i++) {
      tokens.push(chineseChars[i] + chineseChars[i + 1]);
    }
    // 单字也作为 token
    for (const ch of chineseChars) {
      tokens.push(ch);
    }

    // 英文/数字 word token
    const words = cleanText.match(/[a-zA-Z0-9]+/g) || [];
    for (const word of words) {
      tokens.push(word.toLowerCase());
    }

    return tokens;
  }

  /**
   * 稳定 hash（md5 取前 8 字节）
   */
  private hash(text: string): number {
    const md5 = crypto.createHash('md5').update(text, 'utf8').digest();
    // 取前 4 字节作为 uint32
    return md5.readUInt32BE(0);
  }

  /**
   * 存储记忆的 embedding
   * 如果已存在同 memoryId 的 embedding，则更新
   */
  async storeEmbedding(memoryId: string, userId: string, content: string): Promise<void> {
    try {
      const embedding = this.generateEmbedding(content);
      const embeddingJson = JSON.stringify(embedding);

      // upsert：已存在则更新，不存在则创建
      const existing = await this.prisma.memoryEmbedding.findFirst({
        where: { memoryId },
        select: { id: true },
      });

      if (existing) {
        await this.prisma.memoryEmbedding.update({
          where: { id: existing.id },
          data: {
            content,
            embedding: embeddingJson,
            dim: MemoryEmbeddingService.DIM,
          },
        });
      } else {
        await this.prisma.memoryEmbedding.create({
          data: {
            memoryId,
            userId,
            content,
            embedding: embeddingJson,
            dim: MemoryEmbeddingService.DIM,
          },
        });
      }
    } catch (err) {
      this.logger.warn(
        `[MemoryEmbedding] storeEmbedding failed for memoryId=${memoryId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 删除记忆的 embedding（记忆被清理时调用）
   */
  async deleteEmbedding(memoryId: string): Promise<void> {
    try {
      // P0-8 删除审计：先记录，再删除
      const count = await this.prisma.memoryEmbedding.count({ where: { memoryId } });
      this.logger.log(`[P0-8-AUDIT] deleteEmbedding pending: memoryId=${memoryId} count=${count}`);
      await this.prisma.memoryEmbedding.deleteMany({
        where: { memoryId },
      });
      this.logger.log(`[P0-8-AUDIT] deleteEmbedding executed: memoryId=${memoryId}`);
    } catch (err) {
      this.logger.warn(
        `[MemoryEmbedding] deleteEmbedding failed for memoryId=${memoryId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * 向量检索：返回 topK 最相似的记忆
   * 使用 cosine similarity（向量已归一化，等价于点积）
   */
  async searchByVector(
    userId: string,
    queryEmbedding: number[],
    topK: number = 5,
  ): Promise<Array<{ memoryId: string; content: string; score: number }>> {
    try {
      // 加载用户所有 embedding（SQLite 无向量索引，全量加载后内存计算）
      const embeddings = await this.prisma.memoryEmbedding.findMany({
        where: { userId },
        select: { memoryId: true, content: true, embedding: true },
      });

      if (embeddings.length === 0) return [];

      // 计算 cosine similarity
      const scored = embeddings.map(item => {
        const itemEmbedding = JSON.parse(item.embedding) as number[];
        const score = this.cosineSimilarity(queryEmbedding, itemEmbedding);
        return {
          memoryId: item.memoryId,
          content: item.content,
          score,
        };
      });

      // 降序排序，取 topK
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, topK);
    } catch (err) {
      this.logger.warn(
        `[MemoryEmbedding] searchByVector failed for userId=${userId}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * 文本检索：文本 → 向量 → 检索
   */
  async searchByText(
    userId: string,
    queryText: string,
    topK: number = 5,
  ): Promise<Array<{ memoryId: string; content: string; score: number }>> {
    const queryEmbedding = this.generateEmbedding(queryText);
    return this.searchByVector(userId, queryEmbedding, topK);
  }

  /**
   * 计算两个向量的 cosine similarity
   * 向量已归一化时等价于点积，但这里做防御性归一化
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }
}
