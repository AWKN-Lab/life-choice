/**
 * P1-2: 记忆提取器（学自 awkn-agent memory_extractor.py）
 * P2-2: 重构为 7 类 MemoryType 触发
 *
 * - 从咨询结果中提取 7 类结构化记忆（major_issue/time_anchor/person_anchor/bottom_line/repeat_pattern/mood_signal/feedback）
 * - 优先走规则匹配（关键词）；规则无命中再调 LLM
 * - 与现有 facts 做 SimHash 简化版比对，相似度 > 0.8 视为重复
 * - 提取后写入 setActiveMemory（P2-1）+ appendConsult（历史）
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';
import { UserMemoryService, MemoryType } from './user-memory.service';
import { buildIdentityLayer } from '../orchestrator/prompt-layers';

export interface ExtractedFact {
  type: MemoryType;
  content: string;
  sourceQuote?: string;
  confidence: number;
  weight?: number;
  expiresAt?: Date;
  sourceRecordId: string;
  extractedAt: string;
}

// P2-2: 7 类 MemoryType 触发规则
const RULE_PATTERNS: Array<{ type: MemoryType; keywords: RegExp; weight: number }> = [
  // major_issue：用户最关心的大事
  { type: 'major_issue', keywords: /(最担心|最纠结|一直在想|最近在愁|心里放不下|最大的事)/, weight: 0.9 },
  // time_anchor：时间锚点
  { type: 'time_anchor', keywords: /(几号|下周|下个月|年底|合同到期|到期|截止|之前|之后)/, weight: 0.7 },
  // person_anchor：人物锚点
  { type: 'person_anchor', keywords: /(我老婆|我老公|我对象|我老板|合伙人|我妈|我爸|我儿子|我女儿|我朋友)/, weight: 0.8 },
  // bottom_line：底线
  { type: 'bottom_line', keywords: /(绝对不|底线|最多能接受|最少要|不能接受|绝不|一定)/, weight: 0.85 },
  // mood_signal：情绪信号（复用 emotion-state）
  { type: 'mood_signal', keywords: /(焦虑|害怕|纠结|担心|紧张|压力大|崩溃|迷茫|烦躁|不安)/, weight: 0.7 },
  // feedback：用户反馈
  { type: 'feedback', keywords: /(上次说的|不准|应验了|你说对了|上次预测|之前咨询)/, weight: 0.8 },
  // repeat_pattern：重复模式（30 天内同类 >= 3 次，由 detectRepeatPattern 单独处理）
  // 这里不设关键词，由 detectRepeatPattern 方法判断
];

@Injectable()
export class MemoryExtractorService {
  private readonly logger = new Logger(MemoryExtractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmProviders: LlmProvidersService,
    private readonly userMemoryService: UserMemoryService,
  ) {}

  /**
   * 从一次咨询结果中提取 7 类记忆并写入 UserMemory
   * - 入参: recordId
   * - 规则: 走 RULE_PATTERNS 命中；命中为空再调 LLM
   * - 去重: 简化 SimHash 字符级 n-gram
   * - 写入: setActiveMemory（最新一条）+ appendConsult（历史）
   */
  async extractAndPersist(recordId: string, userId?: string | null): Promise<ExtractedFact[]> {
    if (!userId) return [];
    const record = await this.prisma.consultRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      this.logger.warn(`[MemoryExtractor] record ${recordId} not found`);
      return [];
    }

    const sourceText = this.composeSourceText(record);
    if (!sourceText.trim()) return [];

    let facts = this.ruleExtract(sourceText, recordId);

    // P2-2: repeat_pattern 单独检测（30 天内同类 >= 3 次）
    const repeatFact = await this.detectRepeatPattern(userId, record.question, recordId);
    if (repeatFact) facts.push(repeatFact);

    if (facts.length === 0) {
      facts = await this.llmExtract(sourceText, recordId);
    }

    if (facts.length === 0) return [];

    // 去重：与已有 insights/consultHistory 比对
    const deduped = await this.dedupe(facts, userId);
    if (deduped.length === 0) {
      this.logger.log(`[MemoryExtractor] record ${recordId}: ${facts.length} facts, all deduped`);
      return [];
    }

    // 写入 consultHistory（确保 searchRelevantMemory 能检索到）
    await this.userMemoryService.appendConsult(userId, {
      date: new Date().toISOString(),
      question: record.question,
      judgment: deduped.map(f => f.content).slice(0, 3).join('；'),
      cost: '',
      toolsUsed: [],
    });

    // P2-2: 写入 setActiveMemory（最新一条，按 weight 排序）
    const topFact = deduped.sort((a, b) => (b.weight ?? 1.0) - (a.weight ?? 1.0))[0];
    await this.userMemoryService.setActiveMemory(userId, {
      type: topFact.type,
      content: topFact.content,
      sourceQuote: topFact.sourceQuote,
      confidence: topFact.confidence,
      weight: topFact.weight ?? 1.0,
      expiresAt: topFact.expiresAt,
    });

    // 写入 insights（高置信度事实）
    for (const f of deduped.filter(x => x.confidence >= 0.7)) {
      await this.userMemoryService.appendInsight(userId, {
        date: new Date().toISOString().slice(0, 10),
        insight: `[${f.type}] ${f.content}`,
        relatedEvents: [f.type],
        confidence: f.confidence,
      });
    }

    this.logger.log(`[MemoryExtractor] record ${recordId}: extracted ${facts.length} facts, ${deduped.length} new after dedupe`);
    return deduped;
  }

  private composeSourceText(record: any): string {
    const parts: string[] = [];
    if (record.question) parts.push(record.question);
    if (record.summaryLine) parts.push(record.summaryLine);
    if (record.llmResult) {
      try {
        const llm = JSON.parse(record.llmResult);
        if (llm.zhangbanshan_output?.judgment) parts.push(llm.zhangbanshan_output.judgment);
        if (llm.zhangbanshan_output?.cost) parts.push(llm.zhangbanshan_output.cost);
        if (llm.zhangbanshan_output?.premise) parts.push(llm.zhangbanshan_output.premise);
      } catch {
        // ignore parse error
      }
    }
    return parts.join(' ');
  }

  private ruleExtract(text: string, recordId: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];
    for (const pattern of RULE_PATTERNS) {
      const match = text.match(pattern.keywords);
      if (match) {
        // 抽取匹配子句作为事实文本（前后 20 字）
        const m = text.match(new RegExp(`[^。！？\\n]{0,20}${pattern.keywords.source}[^。！？\\n]{0,20}`));
        const content = m ? m[0].trim() : text.slice(0, 40);
        facts.push({
          type: pattern.type,
          content,
          sourceQuote: match[0],
          confidence: pattern.weight,
          weight: pattern.weight,
          sourceRecordId: recordId,
          extractedAt: new Date().toISOString(),
        });
      }
    }
    return facts;
  }

  // P2-2: repeat_pattern 检测 — 30 天内同类问题 >= 3 次
  private async detectRepeatPattern(userId: string, currentQuestion: string, recordId: string): Promise<ExtractedFact | null> {
    const repeatCount = await this.userMemoryService.getRepeatingQuestionCount(userId, currentQuestion, 30);
    if (repeatCount < 3) return null;
    return {
      type: 'repeat_pattern',
      content: `30 天内同类问题已问 ${repeatCount} 次`,
      sourceQuote: currentQuestion.slice(0, 40),
      confidence: 0.85,
      weight: 0.9,
      sourceRecordId: recordId,
      extractedAt: new Date().toISOString(),
    };
  }

  private async llmExtract(text: string, recordId: string): Promise<ExtractedFact[]> {
    const systemPrompt = buildIdentityLayer() + `\n\n你是一个事实提取助手。从用户咨询的原始文本中提取 1-3 条关键记忆。

7 类 MemoryType：
- major_issue：用户最关心的大事（最担心/最纠结/一直在想）
- time_anchor：时间锚点（几号/下周/合同到期）
- person_anchor：人物锚点（我老婆/我老板/合伙人）
- bottom_line：底线（绝对不/底线/最多能接受）
- repeat_pattern：重复模式（同类问题多次出现）
- mood_signal：情绪信号（焦虑/害怕/纠结）
- feedback：用户反馈（上次说的/不准/应验了）

要求：
- 每条记忆用一句话概括
- 标注 type（上述 7 类之一）
- 评估 confidence（0-1）
- 严格输出 JSON 数组：[{"type": "major_issue", "content": "...", "confidence": 0.7, "sourceQuote": "用户原话"}]

如果文本中没有可提取的记忆，输出空数组 []。`;

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text.slice(0, 1500) },
    ];

    try {
      const resp = await this.llmProviders.chatCheap(messages, {
        maxTokens: 300,
        temperature: 0.2,
        jsonMode: true,
      });
      const parsed = JSON.parse(resp.content);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x: any) => x && typeof x.content === 'string')
        .map((x: any) => ({
          type: (x.type || 'major_issue') as MemoryType,
          content: x.content,
          sourceQuote: x.sourceQuote,
          confidence: typeof x.confidence === 'number' ? x.confidence : 0.5,
          weight: typeof x.confidence === 'number' ? x.confidence : 0.5,
          sourceRecordId: recordId,
          extractedAt: new Date().toISOString(),
        }));
    } catch (err) {
      this.logger.warn(`[MemoryExtractor] LLM extract failed: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * 简化版 SimHash：字符级 bigram 集合的 Jaccard 相似度
   * 相似度 >= 0.8 视为重复
   */
  private async dedupe(facts: ExtractedFact[], userId: string): Promise<ExtractedFact[]> {
    const memory = await this.userMemoryService.getMemory(userId);
    if (!memory) return facts;

    const existing: string[] = [];
    try { if (memory.consultHistory) existing.push(...(JSON.parse(memory.consultHistory).map((c: any) => c.question + ' ' + (c.judgment || '')))); } catch {}
    try { if (memory.insights) existing.push(...(JSON.parse(memory.insights).map((i: any) => i.insight))); } catch {}
    if (existing.length === 0) return facts;

    const existingNgrams = existing.map(t => new Set(this.ngrams(t, 2)));
    return facts.filter(f => {
      const fNgrams = new Set(this.ngrams(f.content, 2));
      for (const eNgrams of existingNgrams) {
        if (this.jaccard(fNgrams, eNgrams) >= 0.8) return false;
      }
      return true;
    });
  }

  private ngrams(text: string, n: number): string[] {
    const s = text.replace(/\s+/g, '');
    if (s.length < n) return [s];
    const out: string[] = [];
    for (let i = 0; i <= s.length - n; i++) out.push(s.slice(i, i + n));
    return out;
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const uni = a.size + b.size - inter;
    return uni === 0 ? 0 : inter / uni;
  }
}
