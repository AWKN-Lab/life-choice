import { Test, TestingModule } from '@nestjs/testing';
import { StyleCapabilityMatrixService, StyleCapability } from './style-capability-matrix.service';
import { WritingStyle } from './style-template.service';

describe('StyleCapabilityMatrixService - 风格能力矩阵', () => {
  let service: StyleCapabilityMatrixService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [StyleCapabilityMatrixService],
    }).compile();
    service = moduleRef.get(StyleCapabilityMatrixService);
  });

  afterAll(() => moduleRef.close());

  describe('getCapability - 获取风格能力', () => {
    it('professional 应返回正确的能力映射', () => {
      const cap = service.getCapability('professional');
      expect(cap).toBeDefined();
      expect(cap!.style).toBe('professional');
      expect(cap!.supportedAgents).toContain('bazi-agent');
      expect(cap!.supportedCategories).toContain('事业');
    });

    it('warm 应返回正确的能力映射', () => {
      const cap = service.getCapability('warm');
      expect(cap).toBeDefined();
      expect(cap!.style).toBe('warm');
      expect(cap!.qualityScore).toBe(0.9);
    });

    it('concise 应返回正确的能力映射', () => {
      const cap = service.getCapability('concise');
      expect(cap).toBeDefined();
      expect(cap!.avgLatencyMs).toBe(1200);
    });

    it('detailed 应返回正确的能力映射', () => {
      const cap = service.getCapability('detailed');
      expect(cap).toBeDefined();
      expect(cap!.supportedCategories.length).toBeGreaterThanOrEqual(5);
    });

    it('literary 应返回正确的能力映射', () => {
      const cap = service.getCapability('literary');
      expect(cap).toBeDefined();
      expect(cap!.supportedAgents).toContain('bazi-agent');
    });

    it('不存在的风格应返回 undefined', () => {
      const cap = service.getCapability('nonexistent' as WritingStyle);
      expect(cap).toBeUndefined();
    });
  });

  describe('isAgentStyleSupported - 检查 Agent 是否支持指定风格', () => {
    it('bazi-agent 支持 professional 风格', () => {
      expect(service.isAgentStyleSupported('bazi-agent', 'professional')).toBe(true);
    });

    it('bazi-agent 支持 warm 风格', () => {
      expect(service.isAgentStyleSupported('bazi-agent', 'warm')).toBe(true);
    });

    it('bazi-agent 支持 concise 风格', () => {
      expect(service.isAgentStyleSupported('bazi-agent', 'concise')).toBe(true);
    });

    it('qiming-agent 不支持 concise 风格', () => {
      expect(service.isAgentStyleSupported('qiming-agent', 'concise')).toBe(false);
    });

    it('不存在的 Agent 应返回 false', () => {
      expect(service.isAgentStyleSupported('unknown-agent', 'warm')).toBe(false);
    });

    it('不存在的风格应返回 false', () => {
      expect(service.isAgentStyleSupported('bazi-agent', 'nonexistent' as WritingStyle)).toBe(false);
    });
  });

  describe('getAgentStyles - 获取 Agent 支持的所有风格', () => {
    it('bazi-agent 应支持所有5种风格', () => {
      const styles = service.getAgentStyles('bazi-agent');
      expect(styles).toContain('professional');
      expect(styles).toContain('warm');
      expect(styles).toContain('concise');
      expect(styles).toContain('detailed');
      expect(styles).toContain('literary');
      expect(styles).toHaveLength(5);
    });

    it('ziwei-agent 应支持4种风格', () => {
      const styles = service.getAgentStyles('ziwei-agent');
      expect(styles).toContain('professional');
      expect(styles).toContain('warm');
      expect(styles).toContain('detailed');
      expect(styles).toContain('literary');
      expect(styles).not.toContain('concise');
    });

    it('liuren-agent 应支持3种风格', () => {
      const styles = service.getAgentStyles('liuren-agent');
      expect(styles).toContain('professional');
      expect(styles).toContain('concise');
      expect(styles).toContain('detailed');
      expect(styles).toHaveLength(3);
    });

    it('qiming-agent 应只支持 warm 风格', () => {
      const styles = service.getAgentStyles('qiming-agent');
      expect(styles).toEqual(['warm']);
    });

    it('不存在的 Agent 应返回空数组', () => {
      const styles = service.getAgentStyles('unknown-agent');
      expect(styles).toEqual([]);
    });
  });

  describe('getRecommendedStyle - 获取推荐风格', () => {
    it('bazi-agent + 事业 应推荐 detailed（qualityScore=0.88 > professional 0.85）', () => {
      const style = service.getRecommendedStyle('事业', 'bazi-agent');
      expect(style).toBe('detailed');
    });

    it('bazi-agent + 婚姻 应推荐 warm（qualityScore=0.9）', () => {
      const style = service.getRecommendedStyle('婚姻', 'bazi-agent');
      expect(style).toBe('warm');
    });

    it('bazi-agent + 财运 应推荐 detailed（qualityScore=0.88 > professional 0.85）', () => {
      const style = service.getRecommendedStyle('财运', 'bazi-agent');
      expect(style).toBe('detailed');
    });

    it('bazi-agent + 健康 应推荐 warm（qualityScore=0.9 > detailed 0.88）', () => {
      const style = service.getRecommendedStyle('健康', 'bazi-agent');
      expect(style).toBe('warm');
    });

    it('bazi-agent + 运势 应推荐 warm（qualityScore=0.9）', () => {
      const style = service.getRecommendedStyle('运势', 'bazi-agent');
      expect(style).toBe('warm');
    });

    it('不匹配的分类应返回默认 warm', () => {
      const style = service.getRecommendedStyle('不存在的分类', 'bazi-agent');
      expect(style).toBe('warm');
    });

    it('不匹配的 Agent 应返回默认 warm', () => {
      const style = service.getRecommendedStyle('事业', 'unknown-agent');
      expect(style).toBe('warm');
    });
  });

  describe('getFullMatrix - 获取完整矩阵', () => {
    it('应返回5条能力记录', () => {
      const matrix = service.getFullMatrix();
      expect(matrix).toHaveLength(5);
    });

    it('每条记录应包含所有必填字段', () => {
      const matrix = service.getFullMatrix();
      for (const cap of matrix) {
        expect(cap).toHaveProperty('style');
        expect(cap).toHaveProperty('supportedAgents');
        expect(cap).toHaveProperty('supportedCategories');
        expect(cap).toHaveProperty('qualityScore');
        expect(cap).toHaveProperty('avgLatencyMs');
        expect(Array.isArray(cap.supportedAgents)).toBe(true);
        expect(Array.isArray(cap.supportedCategories)).toBe(true);
        expect(cap.qualityScore).toBeGreaterThanOrEqual(0);
        expect(cap.qualityScore).toBeLessThanOrEqual(1);
        expect(cap.avgLatencyMs).toBeGreaterThan(0);
      }
    });
  });
});
