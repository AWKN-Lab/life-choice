/**
 * 用户状态分类器测试 — 6 类分类
 *
 * 验证：
 * - 4 类原有：casual / genuine / repeating / validating
 * - 2 类新增：emotional_pressure / high_risk
 */

import { UserStateClassifierService, UserState } from '../../classifier/user-state-classifier.service';
import { createMockUserMemoryService } from '../test-helpers';

describe('UserStateClassifierService — 6 类分类', () => {
  let classifier: UserStateClassifierService;
  let mockMemory: ReturnType<typeof createMockUserMemoryService>;

  beforeEach(() => {
    mockMemory = createMockUserMemoryService();
    classifier = new UserStateClassifierService(mockMemory as any);
  });

  describe('原有 4 类', () => {
    it('模糊短问题 → casual', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '运势怎么样');
      expect(result.state).toBe('casual');
      expect(result.confidence).toBe(0.5);
    });

    it('具体问题+情绪词 → genuine', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我最近工作很焦虑，因为项目一直延期，该怎么办');
      expect(result.state).toBe('genuine');
      expect(result.evidence).toContain('包含情绪词');
    });

    it('重复问题 → repeating', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(2);
      const result = await classifier.classify('user1', '今年事业怎么样');
      expect(result.state).toBe('repeating');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('验证型问题 → validating', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '之前有人说我会离婚，是真的吗');
      expect(result.state).toBe('validating');
    });
  });

  describe('新增 2 类', () => {
    it('危机关键词"不想活" → high_risk', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我真的不想活了，太痛苦了');
      expect(result.state).toBe('high_risk');
      expect(result.confidence).toBe(0.95);
      expect(result.evidence).toContain('检测到危机关键词');
    });

    it('危机关键词"自杀" → high_risk', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我想自杀');
      expect(result.state).toBe('high_risk');
    });

    it('危机关键词"自残" → high_risk', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我想自残');
      expect(result.state).toBe('high_risk');
    });

    it('多个高压情绪词 → emotional_pressure', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我崩溃了，绝望又痛苦，不知道怎么办');
      expect(result.state).toBe('emotional_pressure');
      expect(result.confidence).toBe(0.8);
    });

    it('焦虑+恐惧叠加 → emotional_pressure', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我很焦虑也很恐惧，工作压力太大');
      expect(result.state).toBe('emotional_pressure');
    });

    it('单个情绪词 → genuine（非 emotional_pressure）', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我最近很焦虑，因为工作的事');
      expect(result.state).toBe('genuine');
    });

    it('high_risk 优先于 emotional_pressure', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const result = await classifier.classify('user1', '我想自杀，太崩溃太绝望了');
      expect(result.state).toBe('high_risk');
    });
  });

  describe('缓存', () => {
    it('相同输入命中缓存', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      const r1 = await classifier.classify('user1', '运势怎么样');
      const r2 = await classifier.classify('user1', '运势怎么样');
      expect(r1).toBe(r2); // 同一引用
      expect(mockMemory.getRepeatingQuestionCount).toHaveBeenCalledTimes(1);
    });

    it('clearCache 清除指定用户', async () => {
      mockMemory.getRepeatingQuestionCount.mockResolvedValue(0);
      await classifier.classify('user1', '运势怎么样');
      classifier.clearCache('user1');
      await classifier.classify('user1', '运势怎么样');
      expect(mockMemory.getRepeatingQuestionCount).toHaveBeenCalledTimes(2);
    });
  });
});
