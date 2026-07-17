/**
 * P0-4 LayerRepairService 单元测试（E28 零测试门禁补救）
 *
 * 验证：
 * 1. repairMissingLayers 正常路径：补全缺失层
 * 2. 边界：缺失 0 层 → 返回 existingLayers
 * 3. 边界：缺失 >2 层 → 不修复，返回 existingLayers
 * 4. 异常路径：LLM 调用失败 → 返回 existingLayers（不抛错）
 * 5. 单层补全：temperature=0.3、maxTokens=800
 */

import { jest } from '@jest/globals';
import { LayerRepairService } from '../../orchestrator/layer-repair.service';

// 完整 5 层 fixture（用于 5 → 3 层补全测试）
const fullLayers = {
  clause: '我看日主甲木生于寅月，得令而旺，印星有力。',
  halfMountain: '命局正印秉令，学业根基扎实，性格温和仁厚。',
  detail: '事业上宜从事文教、文化类工作，可在 9-10 月有贵人相助。',
  cost: '需要注意的是，过分依赖他人意见可能错失良机。',
  nextAction: '建议近期以稳为主，主动寻求资深人士指点。',
};

describe('LayerRepairService — P0-4 5 层定向修复器', () => {
  let service: LayerRepairService;
  let mockChatWithFallback: any;

  beforeEach(() => {
    mockChatWithFallback = jest.fn<any>().mockResolvedValue({
      content: '【数术断句】这是一段补全内容，用于修复缺失层。',
      provider: 'minimax',
      model: 'minimax-text-01',
      durationMs: 1500,
      finishReason: 'stop',
    });
    // 用最小 mock 注入 llmProviders
    service = new LayerRepairService({
      chatWithFallback: mockChatWithFallback,
    } as any);
  });

  describe('正常路径', () => {
    it('补全 1 层缺失（clause）→ LLM 调用 1 次，返回补全结果', async () => {
      const existing = {
        halfMountain: fullLayers.halfMountain,
        detail: fullLayers.detail,
        cost: fullLayers.cost,
        nextAction: fullLayers.nextAction,
      };

      const result = await service.repairMissingLayers(
        ['clause'],
        existing,
        '日主身弱如何取用神',
      );

      expect(mockChatWithFallback).toHaveBeenCalledTimes(1);
      // 验证 LLM 调用参数：maxTokens=800, temperature=0.3
      const callArgs = mockChatWithFallback.mock.calls[0][1];
      expect(callArgs.maxTokens).toBe(800);
      expect(callArgs.temperature).toBe(0.3);
      // 验证补全后 5 层齐全
      expect(result.clause).toBeDefined();
      expect(result.clause.length).toBeGreaterThan(5);
      expect(result.halfMountain).toBe(fullLayers.halfMountain);
    });

    it('补全 2 层缺失（clause + nextAction）→ LLM 调用 2 次', async () => {
      const existing = {
        halfMountain: fullLayers.halfMountain,
        detail: fullLayers.detail,
        cost: fullLayers.cost,
      };

      const result = await service.repairMissingLayers(
        ['clause', 'nextAction'],
        existing,
        '财运如何',
      );

      expect(mockChatWithFallback).toHaveBeenCalledTimes(2);
      expect(result.clause).toBeDefined();
      expect(result.nextAction).toBeDefined();
      // 已有层保留
      expect(result.halfMountain).toBe(fullLayers.halfMountain);
      expect(result.detail).toBe(fullLayers.detail);
    });
  });

  describe('边界情况', () => {
    it('缺失 0 层 → 不调用 LLM，直接返回 existingLayers', async () => {
      const result = await service.repairMissingLayers(
        [],
        fullLayers,
        'test',
      );

      expect(mockChatWithFallback).not.toHaveBeenCalled();
      expect(result).toEqual(fullLayers);
    });

    it('缺失 3 层 → 不修复（>2 层限制），返回 existingLayers', async () => {
      const existing = {
        halfMountain: fullLayers.halfMountain,
        detail: fullLayers.detail,
      };

      const result = await service.repairMissingLayers(
        ['clause', 'cost', 'nextAction'],
        existing,
        'test',
      );

      expect(mockChatWithFallback).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('LLM 返回空内容 → 保留原 existingLayers（fallback）', async () => {
      mockChatWithFallback.mockResolvedValue({
        content: '',
        provider: 'minimax',
        model: 'minimax-text-01',
        durationMs: 100,
        finishReason: 'stop',
      });

      const result = await service.repairMissingLayers(
        ['clause'],
        fullLayers,
        'test',
      );

      // 空内容不覆盖原值，但 existingLayers 完整传回
      expect(result.halfMountain).toBe(fullLayers.halfMountain);
    });
  });

  describe('异常兜底', () => {
    it('LLM 调用抛错 → 返回 existingLayers，不阻断', async () => {
      mockChatWithFallback.mockRejectedValue(new Error('LLM API timeout'));

      const result = await service.repairMissingLayers(
        ['clause'],
        fullLayers,
        'test',
      );

      // 即使 LLM 失败，仍返回 existingLayers（关键兜底）
      expect(result.halfMountain).toBe(fullLayers.halfMountain);
      expect(result.detail).toBe(fullLayers.detail);
      expect(result.cost).toBe(fullLayers.cost);
      expect(result.nextAction).toBe(fullLayers.nextAction);
    });

    it('LLM 返回非法内容 → 不抛错，返回 existingLayers', async () => {
      mockChatWithFallback.mockResolvedValue({
        content: '...',  // 长度 < 5 的非法内容
        provider: 'minimax',
        model: 'minimax-text-01',
        durationMs: 100,
        finishReason: 'stop',
      });

      const result = await service.repairMissingLayers(
        ['clause'],
        fullLayers,
        'test',
      );

      expect(result.halfMountain).toBe(fullLayers.halfMountain);
    });
  });
});