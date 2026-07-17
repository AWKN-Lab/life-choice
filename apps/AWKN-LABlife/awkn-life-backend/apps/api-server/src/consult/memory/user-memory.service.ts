import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryEmbeddingService } from './memory-embedding.service';

interface ConsultEntry {
  date: string;
  question: string;
  judgment: string;
  cost: string;
  toolsUsed: string[];
}

interface TimelineEvent {
  date: string;
  event: string;
  dayunRange?: string;
  liunianGanZhi?: string;
  source: 'user_stated' | 'system_inferred';
}

interface InsightEntry {
  date: string;
  insight: string;
  relatedEvents: string[];
  confidence: number;
}

// P2-1: 7 类 MemoryType
export type MemoryType =
  | 'major_issue'
  | 'time_anchor'
  | 'person_anchor'
  | 'bottom_line'
  | 'repeat_pattern'
  | 'mood_signal'
  | 'feedback';

export const MEMORY_TYPES: MemoryType[] = [
  'major_issue',
  'time_anchor',
  'person_anchor',
  'bottom_line',
  'repeat_pattern',
  'mood_signal',
  'feedback',
];

// P2-1: 结构化记忆条目（对应 UserMemory 表新字段）
export interface MemoryItem {
  memoryId?: string;
  issueId?: string;
  type: MemoryType;
  content: string;
  sourceQuote?: string;
  confidence?: number;
  weight?: number;
  expiresAt?: Date;
}

const MAX_CONSULT_HISTORY = 50;
const MAX_TIMELINE_EVENTS = 100;
const MAX_INSIGHTS = 30;
const MEMORY_SUMMARY_MAX_LENGTH = 500;

const YEAR_PATTERN = /(\d{4})年?/;
const ACTION_KEYWORDS = [
  '结婚', '离婚', '跳槽', '辞职', '创业', '买房', '卖房',
  '搬家', '升职', '降职', '入学', '毕业', '转行', '出国',
  '回国', '投资', '破产', '生病', '手术', '去世', '出生',
];

@Injectable()
export class UserMemoryService {
  private readonly logger = new Logger(UserMemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    // Phase 4 T4.2: 可选注入 embedding 服务（避免测试时的依赖问题）
    @Optional() private readonly embeddingService?: MemoryEmbeddingService,
  ) {}

  async getMemory(userId: string) {
    return this.prisma.userMemory.findUnique({ where: { userId } });
  }

  // P2-1: 设置结构化记忆条目（覆盖写入，一个用户一条激活记忆）
  async setActiveMemory(userId: string, item: MemoryItem): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    await this.prisma.userMemory.update({
      where: { id: memory.id },
      data: {
        type: item.type,
        content: item.content,
        sourceQuote: item.sourceQuote ?? null,
        issueId: item.issueId ?? null,
        confidence: item.confidence ?? 0.5,
        weight: item.weight ?? 1.0,
        expiresAt: item.expiresAt ?? null,
      },
    });
    this.logger.log(`[setActiveMemory] userId=${userId} type=${item.type} content=${item.content.slice(0, 40)}`);

    // Phase 4 T4.2: 异步生成 embedding（不阻塞主流程，失败不影响记忆写入）
    if (this.embeddingService && item.content) {
      this.embeddingService.storeEmbedding(memory.id, userId, item.content).catch(err => {
        this.logger.warn(`[setActiveMemory] embedding 生成失败: ${err.message}`);
      });
    }
  }

  // P2-1: 读取激活的结构化记忆
  async getActiveMemory(userId: string): Promise<MemoryItem | null> {
    const memory = await this.getMemory(userId);
    if (!memory || !memory.type || !memory.content) return null;
    return {
      memoryId: memory.memoryId ?? undefined,
      type: memory.type as MemoryType,
      content: memory.content,
      sourceQuote: memory.sourceQuote ?? undefined,
      issueId: memory.issueId ?? undefined,
      confidence: memory.confidence ?? 0.5,
      weight: memory.weight ?? 1.0,
      expiresAt: memory.expiresAt ?? undefined,
    };
  }

  // P2-1: 清除激活的结构化记忆（保留旧 4 JSON 字段）
  async clearActiveMemory(userId: string): Promise<void> {
    const memory = await this.getMemory(userId);
    if (!memory) return;
    await this.prisma.userMemory.update({
      where: { id: memory.id },
      data: {
        type: null,
        content: null,
        sourceQuote: null,
        issueId: null,
        confidence: null,
        weight: null,
        expiresAt: null,
      },
    });
  }

  async appendConsult(userId: string, entry: ConsultEntry): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    const history: ConsultEntry[] = this.safeParseJson(memory.consultHistory);
    history.push({ ...entry, date: entry.date || new Date().toISOString() });
    const trimmed = history.slice(-MAX_CONSULT_HISTORY);

    await this.prisma.userMemory.update({
      where: { id: memory.id },
      data: { consultHistory: JSON.stringify(trimmed) },
    });
  }

  async appendTimelineEvent(userId: string, event: TimelineEvent): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    const events: TimelineEvent[] = this.safeParseJson(memory.timelineEvents);
    events.push({ ...event, date: event.date || new Date().toISOString().slice(0, 10) });
    const trimmed = events.slice(-MAX_TIMELINE_EVENTS);

    await this.prisma.userMemory.update({
      where: { id: memory.id },
      data: { timelineEvents: JSON.stringify(trimmed) },
    });
  }

  async appendInsight(userId: string, insight: InsightEntry): Promise<void> {
    const memory = await this.getOrCreateMemory(userId);
    const insights: InsightEntry[] = this.safeParseJson(memory.insights);
    insights.push({ ...insight, date: new Date().toISOString().slice(0, 10) });
    const trimmed = insights.slice(-MAX_INSIGHTS);

    await this.prisma.userMemory.update({
      where: { id: memory.id },
      data: { insights: JSON.stringify(trimmed) },
    });
  }

  extractTimelineEvents(
    text: string,
    dayunRange?: string,
    liunianGanZhi?: string,
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const yearMatch = text.match(YEAR_PATTERN);
    if (!yearMatch) return events;

    const year = yearMatch[1];
    const matchedActions = ACTION_KEYWORDS.filter(kw => text.includes(kw));
    if (matchedActions.length === 0) return events;

    for (const action of matchedActions) {
      events.push({
        date: year,
        event: action,
        dayunRange,
        liunianGanZhi,
        source: 'system_inferred',
      });
    }

    return events;
  }

  async getMemorySummary(userId: string): Promise<string> {
    const memory = await this.getMemory(userId);
    if (!memory) return '';

    const consultHistory: ConsultEntry[] = this.safeParseJson(memory.consultHistory);
    const timelineEvents: TimelineEvent[] = this.safeParseJson(memory.timelineEvents);
    const insights: InsightEntry[] = this.safeParseJson(memory.insights);

    const parts: string[] = ['【用户历史】'];

    if (consultHistory.length > 0) {
      const last = consultHistory[consultHistory.length - 1];
      parts.push(`- 上次咨询：${last.date?.slice(0, 10) || '未知'}，问的是${last.question}，判断是${last.judgment}`);
    }

    if (timelineEvents.length > 0) {
      const recent = timelineEvents.slice(-5);
      const eventStr = recent.map(e => `${e.event}(${e.date})`).join(', ');
      parts.push(`- 时间线事件：${eventStr}`);
    }

    if (insights.length > 0) {
      const recentInsights = insights.slice(-3);
      const insightStr = recentInsights.map(i => i.insight).join(', ');
      parts.push(`- 认知洞察：${insightStr}`);
    }

    if (parts.length <= 1) return '';

    const summary = parts.join('\n');
    if (summary.length > MEMORY_SUMMARY_MAX_LENGTH) {
      return summary.slice(0, MEMORY_SUMMARY_MAX_LENGTH);
    }

    return summary;
  }

  private async getOrCreateMemory(userId: string) {
    let memory = await this.prisma.userMemory.findUnique({ where: { userId } });
    if (!memory) {
      memory = await this.prisma.userMemory.create({
        data: {
          userId,
          chartHistory: '{}',
          consultHistory: '{}',
          timelineEvents: '{}',
          insights: '{}',
        },
      });
    }
    return memory;
  }

  private safeParseJson(value: string | null | undefined): any[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * P1-2: 跨会话记忆检索
   * - 用关键词命中分数排序，从 consultHistory + timelineEvents + insights 中找出与当前问题最相关的 N 条
   * - 返回结构化数组 + 拼好的 200 字以内中文摘要
   * - 不做 embedding（保留 MVP 阶段关键词匹配）
   */
  async searchRelevantMemory(
    userId: string,
    query: string,
    options: { topK?: number; maxSummaryLength?: number } = {},
  ): Promise<{ hits: Array<{ source: 'consult' | 'timeline' | 'insight' | 'embedding'; date: string; text: string; score: number }>; summary: string }> {
    const { topK = 3, maxSummaryLength = 200 } = options;
    const memory = await this.getMemory(userId);
    if (!memory) return { hits: [], summary: '' };

    const consultHistory: ConsultEntry[] = this.safeParseJson(memory.consultHistory);
    const timelineEvents: TimelineEvent[] = this.safeParseJson(memory.timelineEvents);
    const insights: InsightEntry[] = this.safeParseJson(memory.insights);

    const candidates: Array<{ source: 'consult' | 'timeline' | 'insight'; date: string; text: string; tokens: string[] }> = [];
    for (const c of consultHistory) {
      const text = `${c.question || ''} ${c.judgment || ''} ${c.cost || ''}`;
      candidates.push({ source: 'consult', date: c.date || '', text, tokens: this.tokenize(text) });
    }
    for (const e of timelineEvents) {
      candidates.push({ source: 'timeline', date: e.date || '', text: `${e.event}(${e.dayunRange || ''}${e.liunianGanZhi || ''})`, tokens: this.tokenize(e.event) });
    }
    for (const i of insights) {
      candidates.push({ source: 'insight', date: i.date || '', text: i.insight, tokens: this.tokenize(i.insight) });
    }

    const queryTokens = this.tokenize(query);

    // Phase 4 T4.3: 向量+关键词混合检索
    // - 向量检索（权重 0.7）：通过 MemoryEmbeddingService.searchByText
    // - 关键词检索（权重 0.3）：现有关键词匹配逻辑
    // - 合并后去重（按 text 相似度）+ 重排
    let vectorHits: Array<{ source: 'embedding'; date: string; text: string; score: number }> = [];
    if (this.embeddingService && query.trim().length > 0) {
      try {
        const vectorResults = await this.embeddingService.searchByText(userId, query, topK * 2);
        // 归一化向量分数到 0-1，乘以 0.7 权重
        const maxScore = vectorResults.length > 0 ? Math.max(...vectorResults.map(r => r.score)) : 1;
        vectorHits = vectorResults.map(r => ({
          source: 'embedding' as const,
          date: '',
          text: r.content,
          score: (r.score / (maxScore || 1)) * 0.7,
        }));
      } catch (err) {
        this.logger.warn(`[searchRelevantMemory] 向量检索失败，降级为纯关键词: ${(err as Error).message}`);
      }
    }

    // 关键词检索（权重 0.3）
    let keywordHits: Array<{ source: 'consult' | 'timeline' | 'insight'; date: string; text: string; score: number }> = [];
    if (queryTokens.length === 0) {
      // 无关键词时返回最近的几条
      keywordHits = candidates.slice(-topK).map(c => ({ source: c.source, date: c.date, text: c.text, score: 0 }));
    } else {
      const scored = candidates.map(c => {
        let score = 0;
        for (const qt of queryTokens) {
          if (c.tokens.includes(qt)) score += qt.length >= 3 ? 3 : 1;
          if (c.text.includes(qt)) score += 1;
        }
        return { source: c.source, date: c.date, text: c.text, score };
      });
      scored.sort((a, b) => b.score - a.score);
      // 归一化关键词分数到 0-1，乘以 0.3 权重
      const maxKwScore = scored.length > 0 && scored[0].score > 0 ? scored[0].score : 1;
      keywordHits = scored
        .filter(s => s.score > 0)
        .slice(0, topK)
        .map(s => ({ ...s, score: (s.score / maxKwScore) * 0.3 }));
      // 命中为空时退回到最近
      if (keywordHits.length === 0) {
        keywordHits = scored.slice(-topK).map(s => ({ ...s, score: 0 }));
      }
    }

    // 合并 + 去重（按 text 前缀相似度）+ 排序
    const merged = [...vectorHits, ...keywordHits];
    // 简单去重：如果两条记录的 text 前 40 字符相同，保留 score 更高的
    const seen = new Map<string, typeof merged[0]>();
    for (const hit of merged) {
      const key = hit.text.slice(0, 40);
      const existing = seen.get(key);
      if (!existing || hit.score > existing.score) {
        seen.set(key, hit);
      }
    }
    const final = Array.from(seen.values()).sort((a, b) => b.score - a.score).slice(0, topK);

    return { hits: final, summary: this.formatSummary(final, maxSummaryLength) };
  }

  private tokenize(text: string): string[] {
    if (!text) return [];
    // 原有标点分词
    const words = text
      .replace(/[，。！？、；：""''《》【】()（）\s,.!?;:'"()\[\]{}]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length >= 1);

    // P3-2: 新增 2-gram（提升中文匹配精度）
    const bigrams: string[] = [];
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    for (let i = 0; i < cleanText.length - 1; i++) {
      bigrams.push(cleanText.slice(i, i + 2));
    }

    return [...words, ...bigrams];
  }

  /**
   * P3-2: 记忆锚定 — 检测重复提问并生成锚点文案
   * @returns 锚点文案（如"你上次也问了类似的问题：XX。这次是因为情况有什么变化吗？"），无重复时返回 null
   */
  async buildMemoryAnchor(userId: string, currentQuestion: string): Promise<string | null> {
    const repeatCount = await this.getRepeatingQuestionCount(userId, currentQuestion, 30);
    if (repeatCount === 0) return null;

    const search = await this.searchRelevantMemory(userId, currentQuestion, { topK: 1 });
    if (search.hits.length === 0) return null;

    const lastQuestion = search.hits[0].text;
    const truncated = lastQuestion.length > 30 ? lastQuestion.slice(0, 30) + '…' : lastQuestion;
    return `你上次也问了类似的问题：「${truncated}」。这次是因为情况有什么变化吗？`;
  }

  /**
   * P3-2: 统计最近 timeWindowDays 天内与当前问题关键词重叠的记录数
   */
  async getRepeatingQuestionCount(userId: string, question: string, timeWindowDays: number): Promise<number> {
    const memory = await this.getMemory(userId);
    if (!memory) return 0;

    const consultHistory: ConsultEntry[] = this.safeParseJson(memory.consultHistory);
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowDays * 86400000);

    const queryTokens = this.tokenize(question);
    if (queryTokens.length === 0) return 0;

    let count = 0;
    for (const entry of consultHistory) {
      const entryDate = new Date(entry.date);
      if (entryDate < windowStart) continue;

      const entryTokens = this.tokenize(entry.question || '');
      const overlap = queryTokens.filter(qt => entryTokens.includes(qt)).length;
      // 至少 3 个 token 重叠才算重复
      if (overlap >= 3) count++;
    }

    return count;
  }

  private formatSummary(
    hits: Array<{ source: string; date: string; text: string; score: number }>,
    maxLen: number,
  ): string {
    if (hits.length === 0) return '';
    const lines = hits.slice(0, 3).map(h => {
      const date = h.date ? h.date.slice(0, 10) : '未知';
      const text = h.text.length > 60 ? h.text.slice(0, 60) + '…' : h.text;
      return `- [${date}] ${text}`;
    });
    let summary = lines.join('\n');
    if (summary.length > maxLen) summary = summary.slice(0, maxLen);
    return summary;
  }
}
