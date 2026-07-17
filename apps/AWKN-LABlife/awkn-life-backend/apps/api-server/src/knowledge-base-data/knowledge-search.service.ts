import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  applicableCategories: string[];
}

export interface SearchResult {
  entries: KnowledgeEntry[];
  totalFound: number;
  query: string;
  searchTimeMs: number;
}

@Injectable()
export class KnowledgeSearchService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeSearchService.name);
  private entries: KnowledgeEntry[] = [];
  private tagIndex: Map<string, Set<number>> = new Map();
  private categoryIndex: Map<string, Set<number>> = new Map();
  private loaded = false;

  async onModuleInit(): Promise<void> {
    await this.ensureLoaded();
  }

  /**
   * 加载知识库数据
   *
   * P0-3 Step7 (2026-06-26): 用 __dirname 相对路径替代 process.cwd() 相对路径
   * 修复问题：process.cwd() 在不同启动方式下指向不同位置
   *   - nest start → cwd = api-server/
   *   - node dist/main.js → cwd = 项目根
   *   - PM2 启动 → 取决于 ecosystem.config.js 的 cwd 配置
   * 现在用 __dirname 相对路径，src 和 dist 模式下都能正确解析到 api-server/data/knowledge-base/
   *
   * 路径推导：
   *   __dirname = api-server/{src,dist}/knowledge-base-data/
   *   目标      = api-server/data/knowledge-base/bazi-classics.json
   *   相对      = __dirname/../../data/knowledge-base/bazi-classics.json
   *
   * 兜底：保留 cwd 相对路径作为最后 fallback，向后兼容
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const candidates = [
      // 主路径：__dirname 相对路径（src 和 dist 模式下都正确）
      path.resolve(__dirname, '..', '..', 'data', 'knowledge-base', 'bazi-classics.json'),
      // 兜底1：dist 嵌套场景（dist/knowledge-base-data/ → 上3级到 api-server/）
      path.resolve(__dirname, '..', '..', '..', 'data', 'knowledge-base', 'bazi-classics.json'),
      // 兜底2：原 cwd 相对路径（向后兼容 PM2 配置中已硬编码 cwd 的场景）
      path.resolve(process.cwd(), 'data', 'knowledge-base', 'bazi-classics.json'),
    ];

    let dataPath: string | null = null;
    for (const candidate of candidates) {
      try {
        await fs.promises.access(candidate);
        dataPath = candidate;
        break;
      } catch {
        // continue to next candidate
      }
    }

    if (!dataPath) {
      this.logger.warn(`Knowledge base file not found in any candidate path: ${candidates.join('; ')}`);
      this.entries = [];
      this.loaded = true;
      return;
    }

    try {
      const raw = await fs.promises.readFile(dataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      this.entries = parsed.entries || [];
      this.buildIndex();
      this.logger.log(`Loaded ${this.entries.length} knowledge entries from ${dataPath}`);
    } catch (error) {
      this.logger.error(`Failed to load knowledge base from ${dataPath}: ${(error as Error).message}`);
      this.entries = [];
    }
    this.loaded = true;
  }

  /**
   * 构建倒排索引
   */
  private buildIndex(): void {
    this.tagIndex.clear();
    this.categoryIndex.clear();

    this.entries.forEach((entry, idx) => {
      // 标签索引
      for (const tag of entry.tags) {
        const normalized = tag.toLowerCase();
        if (!this.tagIndex.has(normalized)) this.tagIndex.set(normalized, new Set());
        this.tagIndex.get(normalized)!.add(idx);
      }

      // 分类索引
      for (const cat of entry.applicableCategories) {
        const normalized = cat.toLowerCase();
        if (!this.categoryIndex.has(normalized)) this.categoryIndex.set(normalized, new Set());
        this.categoryIndex.get(normalized)!.add(idx);
      }
    });
  }

  /**
   * 关键词检索
   */
  async search(params: {
    query: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<SearchResult> {
    const startTime = Date.now();
    await this.ensureLoaded();

    const { query, category, tags, limit = 10 } = params;
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(Boolean);

    // 计算每个条目的相关度分数
    const scores = new Map<number, number>();

    this.entries.forEach((entry, idx) => {
      let score = 0;

      // 标题匹配（权重最高）
      if (entry.title.toLowerCase().includes(queryLower)) score += 10;
      for (const term of queryTerms) {
        if (entry.title.toLowerCase().includes(term)) score += 5;
      }

      // 内容匹配
      const contentLower = entry.content.toLowerCase();
      for (const term of queryTerms) {
        if (contentLower.includes(term)) score += 3;
      }

      // 标签匹配
      for (const tag of entry.tags) {
        if (queryLower.includes(tag.toLowerCase())) score += 4;
        for (const term of queryTerms) {
          if (tag.toLowerCase().includes(term)) score += 2;
        }
      }

      // 指定标签过滤
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(t =>
          entry.tags.some(et => et.toLowerCase().includes(t.toLowerCase()))
        );
        if (hasMatchingTag) score += 6;
      }

      // 分类过滤
      if (category) {
        if (entry.applicableCategories.some(c => c.includes(category))) {
          score += 5;
        } else if (entry.category.toLowerCase().includes(category.toLowerCase())) {
          score += 3;
        }
      }

      if (score > 0) scores.set(idx, score);
    });

    // 按分数排序
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([idx]) => this.entries[idx]);

    return {
      entries: sorted,
      totalFound: scores.size,
      query,
      searchTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 根据分类获取条目
   */
  async getByCategory(category: string, limit: number = 10): Promise<KnowledgeEntry[]> {
    await this.ensureLoaded();
    return this.entries
      .filter(e => e.applicableCategories.includes(category) || e.category === category)
      .slice(0, limit);
  }

  /**
   * 获取所有分类
   */
  async getCategories(): Promise<string[]> {
    await this.ensureLoaded();
    const cats = new Set<string>();
    this.entries.forEach(e => {
      cats.add(e.category);
      e.applicableCategories.forEach(c => cats.add(c));
    });
    return Array.from(cats);
  }

  /**
   * 格式化为 Prompt 上下文
   */
  formatForPrompt(entries: KnowledgeEntry[]): string {
    if (entries.length === 0) return '';
    return entries.map(e => `【${e.title}】${e.content}`).join('\n\n');
  }
}
