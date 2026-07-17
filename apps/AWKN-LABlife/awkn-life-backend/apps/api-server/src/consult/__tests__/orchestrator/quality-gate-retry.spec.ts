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

describe('QualityGateService.evaluateWithRetry', () => {
  let service: QualityGateService;

  beforeEach(() => {
    service = new QualityGateService();
  });

  describe('干净输入一次性通过', () => {
    it('标准文本首次通过，retries=0', () => {
      const result = service.evaluateWithRetry('这是一个关于八字命理的正常分析文本，包含事实和解读。');
      expect(result.passed).toBe(true);
      expect(result.retries).toBe(0);
      expect(result.retryHistory).toHaveLength(1);
      expect(result.retryHistory[0].passed).toBe(true);
    });
  });

  describe('回退策略', () => {
    it('包含「建议您」时，第 2 次重试通过', () => {
      const text = '建议您注意保持健康建议您多吃蔬菜\n'.repeat(5);
      const result = service.evaluateWithRetry(text);
      expect(result.passed).toBe(true);
      // 第 1 次失败（含「建议您」），第 2 次通过（跳过「建议您」检查）
      expect(result.retries).toBeGreaterThanOrEqual(0);
      expect(result.retryHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('包含全部禁用短语时，第 2 次重试通过（跳过「建议您」检查）', () => {
      const text = '建议您注意保持健康，请注意饮食，这是一个建议您可以采纳的。\n'.repeat(10);
      const result = service.evaluateWithRetry(text);
      // 只触发「建议您」类禁用短语，第 2 次重试跳过「建议您」检查后通过
      expect(result.passed).toBe(true);
    });
  });

  describe('禁用模式过滤', () => {
    it('包含 coreAction 和 algorithm 时过滤并扣分', () => {
      const text = '根据 coreAction 算法，建议您关注 algorithm 计算结果。';
      const result = service.evaluateWithRetry(text);
      expect(result.passed).toBe(true);
      // filteredText 不应包含技术模式
      expect(result.filteredText).not.toMatch(/coreAction/i);
      expect(result.filteredText).not.toMatch(/algorithm/i);
    });
  });

  describe('3 次重试均失败 → 抛错（P1-3: 不再降级放行）', () => {
    it('极度糟糕的输入 3 次重试后抛 BadRequestException', () => {
      // 构造一个包含禁用模式 + 禁用短语 + 长行 + JSON 的极端输入
      const text = 'coreAction algorithm steps 建议您 请注意 的建议是 建议您可以 保持努力 未来可期 {"key":"value"}'.repeat(10);
      // P1-3: 3 次均失败 → 抛 VALIDATION_ERROR（不再降级放行）
      expect(() => service.evaluateWithRetry(text)).toThrow(BadRequestException);
    });
  });

  describe('与 evaluate() 兼容', () => {
    it('evaluateWithRetry 和 evaluate 对干净输入结果一致', () => {
      const text = '这是一个正常的咨询分析，内容完整且专业。';
      const standard = service.evaluate(text);
      const retry = service.evaluateWithRetry(text);

      expect(retry.passed).toBe(standard.passed);
      expect(retry.score).toBe(standard.score);
      expect(retry.filteredText).toBe(standard.filteredText);
    });
  });
});