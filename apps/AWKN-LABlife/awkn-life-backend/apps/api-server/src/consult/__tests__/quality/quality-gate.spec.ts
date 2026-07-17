/**
 * Quality Gate 测试 — 关键词过滤 + 5 层结构校验 + 身份感校验（P1-5: 计划版 5 层）
 *
 * 验证 QualityGateService：
 * - 现有功能：禁用模式过滤 + 禁用短语 + JSON 检测 + 长行检测
 * - P1-3 新增：FiveLayerOutput 5 层结构校验（zod schema 强制版）+ 身份感校验
 * - P1-3 新增：缺层抛 BadRequestException（不再降级放行）
 */

import { BadRequestException } from '@nestjs/common';
import { QualityGateService } from '../../orchestrator/quality-gate.service';

// P1-3: QualityGateService 现在依赖 GuardrailService
function createMockGuardrail() {
  return {
    apply: (text: string) => ({
      output: text,
      blocked: false,
      violations: [],
    }),
  };
}

describe('QualityGateService — 质量校验（P1-5 计划版）', () => {
  let gate: QualityGateService;

  beforeEach(() => {
    gate = new QualityGateService();
  });

  describe('现有功能：关键词过滤', () => {
    it('正常文本 → passed', () => {
      const result = gate.evaluate('你的事业运势稳中有进，注意把握机遇。');
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
    });

    it('包含 "coreAction" → 过滤 + 扣分', () => {
      const result = gate.evaluate('基于coreAction分析');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
    });

    it('包含 "algorithm" → 过滤 + 扣分', () => {
      const result = gate.evaluate('根据algorithm计算');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('包含禁用短语 "顺势而为" → 扣分', () => {
      const result = gate.evaluate('建议你顺势而为');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
    });

    it('包含禁用短语 "未来可期" → 扣分', () => {
      const result = gate.evaluate('你的未来可期');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('包含原始 JSON → 扣 15 分', () => {
      const result = gate.evaluate('输出结果：{"key": "value"}');
      expect(result.warnings.some(w => w.includes('raw JSON'))).toBe(true);
      expect(result.score).toBeLessThanOrEqual(85);
    });

    it('超长行（>200 字符）→ 扣分', () => {
      const longLine = '这是一段' + '非常'.repeat(100) + '长的文本';
      const result = gate.evaluate(longLine);
      expect(result.warnings.some(w => w.includes('lines over 200'))).toBe(true);
    });

    it('多个问题叠加 → 严重扣分', () => {
      const result = gate.evaluate('基于coreAction分析，建议你顺势而为，未来可期。{"result": true}');
      expect(result.score).toBeLessThanOrEqual(60);
      expect(result.warnings.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('5 层结构校验（P1-3: zod schema 强制版）', () => {
    // P1-5: 计划版 5 层标记
    const completeFiveLayerText = `【数术断句】
你的八字为甲木日主，生于寅月，木旺身强。

【半山落句】
格局为建禄格，用神取金水，忌火土。

【具体落点】
三条推演路径：一是事业方向宜往西北，二是感情需防冲动，三是财运秋季较旺。

【代价提醒】
建议先稳住当前工作，秋季再考虑跳槽；感情上多听对方想法。

【下一步动作】
木旺之人最忌急躁，沉住气，秋天自有收获。`;

    it('5 层齐全 → passed', () => {
      const result = gate.evaluateFiveLayers(completeFiveLayerText);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.layerStatus.clause.present).toBe(true);
      expect(result.layerStatus.clause.hasContent).toBe(true);
      expect(result.layerStatus.nextAction.present).toBe(true);
      expect(result.layerStatus.nextAction.hasContent).toBe(true);
    });

    it('缺数术断句层 → 抛 BadRequestException（P1-3: 不再降级放行）', () => {
      const text = completeFiveLayerText.replace('【数术断句】', '【其他】');
      expect(() => gate.evaluateFiveLayers(text)).toThrow(BadRequestException);
    });

    it('缺半山落句层 → 抛 BadRequestException', () => {
      const text = completeFiveLayerText.replace('【半山落句】', '【其他】');
      expect(() => gate.evaluateFiveLayers(text)).toThrow(BadRequestException);
    });

    it('缺具体落点层 → 抛 BadRequestException', () => {
      const text = completeFiveLayerText.replace('【具体落点】', '【其他】');
      expect(() => gate.evaluateFiveLayers(text)).toThrow(BadRequestException);
    });

    it('缺代价提醒层 → 抛 BadRequestException', () => {
      const text = completeFiveLayerText.replace('【代价提醒】', '【其他】');
      expect(() => gate.evaluateFiveLayers(text)).toThrow(BadRequestException);
    });

    it('缺下一步动作层 → 抛 BadRequestException', () => {
      const text = completeFiveLayerText.replace('【下一步动作】', '【其他】');
      expect(() => gate.evaluateFiveLayers(text)).toThrow(BadRequestException);
    });

    it('5 层齐全但含巴纳姆语句 → 扣分但可能通过', () => {
      const text = completeFiveLayerText + '\n你是一个很有潜力的人，你往往能抓住机会。';
      const result = gate.evaluateFiveLayers(text);
      expect(result.warnings.some(w => w.includes('巴纳姆'))).toBe(true);
      // 巴纳姆扣分但 5 层齐全，可能仍通过
      expect(result.identityScore).toBeLessThan(80);
    });
  });

  describe('身份感校验', () => {
    const baseText = `【数术断句】
我看你的八字格局不错，甲木日主身强。

【半山落句】
格局为建禄格，用神取金水。

【具体落点】
事业宜往西北方向发展。

【代价提醒】
建议先稳住当前工作再考虑。

【下一步动作】
沉住气，秋天自有收获。`;

    it('含"我看"主语 → 身份感加分', () => {
      const result = gate.evaluateFiveLayers(baseText);
      expect(result.identityScore).toBeGreaterThanOrEqual(80);
    });

    it('含"系统说" → 身份感扣分', () => {
      const text = baseText.replace('我看你的八字格局不错，甲木日主身强。', '系统说你的运势不错，甲木日主身强。');
      const result = gate.evaluateFiveLayers(text);
      expect(result.identityScore).toBeLessThan(60);
      expect(result.warnings.some(w => w.includes('非角色化表达'))).toBe(true);
    });

    it('含禁区表达"命中注定" → 身份感扣分', () => {
      const text = baseText.replace('我看你的八字格局不错，甲木日主身强。', '这是命中注定的，甲木日主身强。');
      const result = gate.evaluateFiveLayers(text);
      expect(result.identityScore).toBeLessThan(60);
      expect(result.warnings.some(w => w.includes('命中注定') || w.includes('非角色化表达'))).toBe(true);
    });
  });

  describe('evaluateWithRetry — P1-3: 3 次失败抛错（不再降级放行）', () => {
    it('3 次均失败 → 抛 BadRequestException（不再降级放行）', () => {
      // 包含大量禁用短语 + JSON + 长行，确保 3 次都失败
      const badText = '基于coreAction分析，建议你顺势而为，未来可期。{"result": true} ' + '非常'.repeat(100);
      expect(() => gate.evaluateWithRetry(badText, 3)).toThrow(BadRequestException);
    });

    it('第 1 次通过 → 直接返回', () => {
      const goodText = '你的事业运势稳中有进，注意把握机遇。';
      const result = gate.evaluateWithRetry(goodText, 3);
      expect(result.passed).toBe(true);
      expect(result.retries).toBe(0);
    });
  });

  // P0-4: evaluateFiveLayersSafe 新增测试（不抛错版本）
  describe('evaluateFiveLayersSafe — P0-4: 不抛错版本', () => {
    const completeFiveLayerText = `【数术断句】
我看日主甲木生于寅月，得令而旺，印星有力。

【半山落句】
命局正印秉令，学业根基扎实，性格温和仁厚。

【具体落点】
事业上宜从事文教、文化类工作，可在 9-10 月有贵人相助。

【代价提醒】
需要注意的是，过分依赖他人意见可能错失良机。

【下一步动作】
建议近期以稳为主，主动寻求资深人士指点。`;

    it('5 层齐全 → passed=true, repairable=false', () => {
      const result = gate.evaluateFiveLayersSafe(completeFiveLayerText);
      expect(result.passed).toBe(true);
      // 5 层齐全时 repairable=false（不需修复）
      expect((result as any).repairable).toBe(false);
      expect((result as any).missingLayers).toBeUndefined();
    });

    it('缺 1 层（clause） → 不抛错，返回 missingLayers + repairable=true', () => {
      const text = completeFiveLayerText.replace('【数术断句】', '【其他】');
      const result = gate.evaluateFiveLayersSafe(text);
      // 关键：不抛错
      expect(() => result).not.toThrow();
      // missingLayers 含 clause
      expect((result as any).missingLayers).toContain('clause');
      // repairable=true（仅缺 1 层）
      expect((result as any).repairable).toBe(true);
      // parsedLayers 含已有 4 层
      expect((result as any).parsedLayers.halfMountain).toBeDefined();
    });

    it('缺 2 层（clause + nextAction） → repairable=true', () => {
      const text = completeFiveLayerText
        .replace('【数术断句】', '【其他】')
        .replace('【下一步动作】', '【其他2】');
      const result = gate.evaluateFiveLayersSafe(text);
      expect((result as any).missingLayers).toEqual(expect.arrayContaining(['clause', 'nextAction']));
      expect((result as any).repairable).toBe(true);
    });

    it('缺 3 层（>2 层） → repairable=false', () => {
      const text = completeFiveLayerText
        .replace('【数术断句】', '【其他】')
        .replace('【半山落句】', '【其他】')
        .replace('【具体落点】', '【其他】');
      const result = gate.evaluateFiveLayersSafe(text);
      // >2 层不修复（避免浪费）
      expect((result as any).missingLayers?.length).toBe(3);
      expect((result as any).repairable).toBe(false);
    });

    it('5 层齐全 + 巴纳姆语句 → 扣分但不抛错', () => {
      const text = completeFiveLayerText + '\n你是一个很有潜力的人，你往往能抓住机会。';
      const result = gate.evaluateFiveLayersSafe(text);
      expect(result.warnings.some(w => w.includes('巴纳姆'))).toBe(true);
      expect(result.identityScore).toBeLessThan(80);
    });

    it('身份感校验：含"我看"主语 → identityScore ≥ 80', () => {
      const result = gate.evaluateFiveLayersSafe(completeFiveLayerText);
      expect(result.identityScore).toBeGreaterThanOrEqual(80);
    });

    it('身份感校验：含"系统说" → identityScore < 60', () => {
      const text = completeFiveLayerText.replace('我看日主甲木生于寅月', '系统说日主甲木生于寅月');
      const result = gate.evaluateFiveLayersSafe(text);
      expect(result.identityScore).toBeLessThan(60);
    });
  });
});
