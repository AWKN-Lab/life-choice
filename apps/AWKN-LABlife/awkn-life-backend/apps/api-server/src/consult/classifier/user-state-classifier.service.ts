import { Injectable, Logger } from '@nestjs/common';
import { UserMemoryService } from '../memory/user-memory.service';

export type UserState = 'casual' | 'genuine' | 'repeating' | 'validating' | 'emotional_pressure' | 'high_risk';

export interface ClassificationResult {
  state: UserState;
  confidence: number;
  evidence: string[];
}

/**
 * P3-3: 用户状态分类器
 * 纯规则分类（不调 LLM），根据用户行为特征分类，影响张半山回复策略
 *
 * 分类规则：
 * - repeating: 30天内问过类似问题（复用 P3-2 的 getRepeatingQuestionCount）
 * - validating: 问题包含验证型关键词
 * - genuine: 问题具体、有情绪词、有背景描述
 * - casual: 问题模糊、无背景、无情绪词
 */
@Injectable()
export class UserStateClassifierService {
  private readonly logger = new Logger(UserStateClassifierService.name);
  // Phase 4 T4.5: cache 加 TTL，避免内存泄漏（默认 30 分钟过期）
  private static readonly CACHE_TTL_MS = parseInt(
    process.env.CLASSIFIER_CACHE_TTL_MS || `${30 * 60 * 1000}`,
    10,
  );
  private cache: Map<string, { result: ClassificationResult; expiresAt: number }> = new Map();

  constructor(private readonly userMemoryService: UserMemoryService) {}

  /**
   * Phase 4 T4.5: 从 cache 读取（带 TTL 检查）
   * 过期则删除并返回 undefined
   */
  private getCached(key: string): ClassificationResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.result;
  }

  /**
   * Phase 4 T4.5: 写入 cache（带 TTL）
   */
  private setCached(key: string, result: ClassificationResult): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + UserStateClassifierService.CACHE_TTL_MS,
    });
  }

  /**
   * Phase 4 T4.5: 清理所有过期项（惰性清理 + 主动清理）
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  async classify(
    userId: string,
    question: string,
    sessionHistory?: Array<{ role: string; content: string }>,
  ): Promise<ClassificationResult> {
    const cacheKey = `${userId}:${question}`;
    // Phase 4 T4.5: 使用带 TTL 的 getCached
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const evidence: string[] = [];

    // 1. 检查 repeating：30天内问过类似问题
    const repeatCount = await this.userMemoryService.getRepeatingQuestionCount(
      userId,
      question,
      30,
    );
    if (repeatCount > 0) {
      evidence.push(`30天内问过类似问题 ${repeatCount} 次`);
      const result: ClassificationResult = {
        state: 'repeating',
        confidence: Math.min(0.6 + repeatCount * 0.15, 0.95),
        evidence,
      };
      this.setCached(cacheKey, result);
      return result;
    }

    // 1.5. 检查 high_risk：危机关键词（自杀/自残/伤害）
    const crisisKeywords = ['自杀', '自残', '不想活', '活不下去', '想死', '伤害自己', '结束生命'];
    const hasCrisis = crisisKeywords.some(kw => question.includes(kw));
    if (hasCrisis) {
      evidence.push('检测到危机关键词');
      const result: ClassificationResult = {
        state: 'high_risk',
        confidence: 0.95,
        evidence,
      };
      this.setCached(cacheKey, result);
      return result;
    }

    // 1.6. 检查 emotional_pressure：多个情绪词叠加
    const pressureEmotions = [
      '崩溃', '绝望', '痛苦', '受不了', '撑不住', '窒息',
      '焦虑', '害怕', '恐惧', '抑郁', '崩溃了',
    ];
    const pressureCount = pressureEmotions.filter(w => question.includes(w)).length;
    if (pressureCount >= 2) {
      evidence.push(`检测到 ${pressureCount} 个高压情绪词`);
      const result: ClassificationResult = {
        state: 'emotional_pressure',
        confidence: 0.8,
        evidence,
      };
      this.setCached(cacheKey, result);
      return result;
    }

    // 2. 检查 validating：问题包含验证型关键词
    const validatingKeywords = [
      '之前有人说', '算命说', '另一个先生说', '别人说我',
      '之前算过', '别的师傅说', '有人说', '之前看过的',
    ];
    const isRevalidating = validatingKeywords.some(kw => question.includes(kw));
    if (isRevalidating) {
      evidence.push(`问题包含验证型关键词`);
      const result: ClassificationResult = {
        state: 'validating',
        confidence: 0.75,
        evidence,
      };
      this.setCached(cacheKey, result);
      return result;
    }

    // 3. 检查 genuine：问题具体、有情绪词、有背景描述
    const emotionWords = [
      '焦虑', '害怕', '担心', '纠结', '迷茫', '痛苦',
      '难受', '崩溃', '犹豫', '不安', '纠结', '压力',
    ];
    const backgroundIndicators = [
      '因为', '所以', '但是', '可是', '最近', '一直',
      '已经', '之前', '现在', '目前', '情况', '问题',
    ];
    const hasEmotion = emotionWords.some(w => question.includes(w));
    const hasBackground = backgroundIndicators.some(w => question.includes(w));
    const isSpecific = question.length > 15; // 具体问题通常较长

    if ((hasEmotion && hasBackground) || (hasEmotion && isSpecific) || (hasBackground && isSpecific)) {
      if (hasEmotion) evidence.push('包含情绪词');
      if (hasBackground) evidence.push('包含背景描述');
      if (isSpecific) evidence.push('问题较具体');
      const result: ClassificationResult = {
        state: 'genuine',
        confidence: 0.7,
        evidence,
      };
      this.setCached(cacheKey, result);
      return result;
    }

    // 4. 默认 casual
    evidence.push('问题模糊，无情绪词，无背景描述');
    const result: ClassificationResult = {
      state: 'casual',
      confidence: 0.5,
      evidence,
    };
    this.setCached(cacheKey, result);
    return result;
  }

  /** 清除缓存（session 结束时调用） */
  clearCache(userId?: string): void {
    // Phase 4 T4.5: 顺便清理所有过期项
    this.cleanExpiredCache();
    if (userId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
