/**
 * Generation Composer 测试 — 5 层输出可靠性（P1-5: 计划版 5 层）
 *
 * 验证：
 * - 计划版 5 层标记（数术断句/半山落句/具体落点/代价提醒/下一步动作）
 * - parseFiveLayersFromText 解析逻辑（严格匹配 + 宽松兜底）
 * - 缺层检测（missingLayers + isComplete）
 */

import { GenerationComposerService } from '../../orchestrator/generation-composer.service';
import { createMockLlmGateway, createMockQualityGate, createMockMemoryExtractor } from '../test-helpers';

describe('GenerationComposer — 5 层输出可靠性（P1-5 计划版）', () => {
  let composer: GenerationComposerService;

  beforeEach(() => {
    const mockLlm = createMockLlmGateway();
    const mockQualityGate = createMockQualityGate();
    const mockMemoryExtractor = createMockMemoryExtractor();
    composer = new GenerationComposerService(mockLlm as any, mockQualityGate as any, mockMemoryExtractor as any);
  });

  describe('parseFiveLayers — 标准格式', () => {
    // 通过私有方法测试需要用 any 绕过
    // P1-4: parseFiveLayers 现在返回 { layers, missingLayers, isComplete }
    const invoke = (c: any, text: string) => c.parseFiveLayers(text);

    it('标准【】标记 → 全部提取', () => {
      const text = `【数术断句】
甲木日主，生于寅月

【半山落句】
建禄格，用神金水

【具体落点】
事业宜西北

【代价提醒】
先稳住再行动

【下一步动作】
沉住气等秋天`;

      const result = invoke(composer, text);
      expect(result.layers.clause).toContain('甲木');
      expect(result.layers.halfMountain).toContain('建禄格');
      expect(result.layers.detail).toContain('西北');
      expect(result.layers.cost).toContain('稳');
      expect(result.layers.nextAction).toContain('沉住气');
      expect(result.isComplete).toBe(true);
      expect(result.missingLayers).toHaveLength(0);
    });

    it('L1-L5 编号格式 → 全部提取', () => {
      const text = `【L1】
甲木日主身强

【L2】
建禄格用金水

【L3】
事业宜西北

【L4】
先稳住再行动

【L5】
沉住气等秋天`;

      const result = invoke(composer, text);
      expect(result.layers.clause).toContain('甲木');
      expect(result.layers.halfMountain).toContain('建禄格');
      expect(result.layers.detail).toContain('西北');
      expect(result.layers.cost).toContain('稳');
      expect(result.layers.nextAction).toContain('沉住气');
      expect(result.isComplete).toBe(true);
    });

    it('无括号格式 "数术断句：" → 全部提取', () => {
      const text = `数术断句：
甲木日主，生于寅月

半山落句：
建禄格，用神金水

具体落点：
事业宜西北方向

代价提醒：
先稳住当前工作

下一步动作：
沉住气，秋天自有收获`;

      const result = invoke(composer, text);
      expect(result.layers.clause).toContain('甲木');
      expect(result.layers.halfMountain).toContain('建禄格');
      expect(result.layers.detail).toContain('西北');
      expect(result.layers.cost).toContain('稳');
      expect(result.layers.nextAction).toContain('沉住气');
      expect(result.isComplete).toBe(true);
    });

    it('中文数字编号 "一、数术" → 全部提取', () => {
      const text = `一、数术
甲木日主，生于寅月

二、半山
建禄格，用神金水

三、落点
事业宜西北方向

四、代价
先稳住当前工作

五、动作
沉住气，秋天自有收获`;

      const result = invoke(composer, text);
      expect(result.layers.clause).toContain('甲木');
      expect(result.layers.halfMountain).toContain('建禄格');
      expect(result.layers.detail).toContain('西北');
      expect(result.layers.cost).toContain('稳');
      expect(result.layers.nextAction).toContain('沉住气');
      expect(result.isComplete).toBe(true);
    });
  });

  describe('parseFiveLayers — 缺层检测', () => {
    const invoke = (c: any, text: string) => c.parseFiveLayers(text);

    it('部分标记缺失 → missingLayers 非空', () => {
      // 只有3个标记，缺具体落点和代价提醒
      const text = `【数术断句】
甲木日主，生于寅月

【半山落句】
建禄格，用神金水

【下一步动作】
沉住气等秋天`;

      const result = invoke(composer, text);
      expect(result.layers.clause).toContain('甲木');
      expect(result.layers.halfMountain).toContain('建禄格');
      expect(result.layers.nextAction).toContain('沉住气');
      expect(result.isComplete).toBe(false);
      expect(result.missingLayers.length).toBeGreaterThan(0);
    });

    it('完全无结构文本 → 全部缺失', () => {
      const text = '你好，这是一段没有结构的文本。';
      const result = invoke(composer, text);
      expect(result.isComplete).toBe(false);
      expect(result.missingLayers).toHaveLength(5);
    });
  });

  describe('validateAndFillFiveLayers — 缺层不再补占位', () => {
    it('完整 5 层 → isComplete=true', () => {
      const text = `【数术断句】
甲木日主身强

【半山落句】
建禄格用金水

【具体落点】
事业往西北发展

【代价提醒】
先稳住当前工作

【下一步动作】
沉住气等秋天`;

      const result = composer.validateAndFillFiveLayers(text);
      expect(result.isComplete).toBe(true);
      expect(result.missingLayers).toHaveLength(0);
    });

    it('缺层 → isComplete=false, missingLayers 非空（不再补占位文本）', () => {
      const text = `【数术断句】
甲木日主身强

【半山落句】
建禄格用金水`;

      const result = composer.validateAndFillFiveLayers(text);
      expect(result.isComplete).toBe(false);
      expect(result.missingLayers.length).toBeGreaterThan(0);
      // P1-4: 缺层不再补 MISSING_LAYER_PLACEHOLDER，layers 为 Partial
      expect(result.layers.clause).toBeTruthy();
      expect(result.layers.halfMountain).toBeTruthy();
      // 缺失层为 undefined
      expect(result.layers.detail).toBeUndefined();
    });
  });
});
