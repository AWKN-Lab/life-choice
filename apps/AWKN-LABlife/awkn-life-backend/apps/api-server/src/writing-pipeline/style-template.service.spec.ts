import { Test, TestingModule } from '@nestjs/testing';
import { StyleTemplateService, WritingStyle, StyleTemplate } from './style-template.service';

describe('StyleTemplateService - 风格模板服务', () => {
  let service: StyleTemplateService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [StyleTemplateService],
    }).compile();
    service = moduleRef.get(StyleTemplateService);
  });

  afterAll(() => moduleRef.close());

  describe('getAllStyles - 返回所有风格', () => {
    it('应返回5种风格', () => {
      const styles = service.getAllStyles();
      expect(styles).toHaveLength(5);
    });

    it('应包含所有5种风格key', () => {
      const styles = service.getAllStyles();
      const keys = styles.map(s => s.key);
      expect(keys).toContain('professional');
      expect(keys).toContain('warm');
      expect(keys).toContain('concise');
      expect(keys).toContain('detailed');
      expect(keys).toContain('literary');
    });

    it('每项应包含 key 和 name 字段', () => {
      const styles = service.getAllStyles();
      for (const s of styles) {
        expect(s).toHaveProperty('key');
        expect(s).toHaveProperty('name');
        expect(typeof s.key).toBe('string');
        expect(typeof s.name).toBe('string');
      }
    });
  });

  describe('getTemplate - 获取单个模板', () => {
    it('professional 风格应返回对应模板', () => {
      const template = service.getTemplate('professional');
      expect(template).toBeDefined();
      expect(template!.key).toBe('professional');
      expect(template!.name).toBe('专业严谨');
    });

    it('warm 风格应返回对应模板', () => {
      const template = service.getTemplate('warm');
      expect(template).toBeDefined();
      expect(template!.key).toBe('warm');
    });

    it('不存在的风格应返回 undefined', () => {
      const template = service.getTemplate('nonexistent' as WritingStyle);
      expect(template).toBeUndefined();
    });
  });

  describe('每个风格模板应包含必填字段', () => {
    const allStyles: WritingStyle[] = ['professional', 'warm', 'concise', 'detailed', 'literary'];
    const requiredFields: (keyof StyleTemplate)[] = [
      'name', 'key', 'systemPrompt', 'toneWords', 'avoidWords', 'maxLength', 'formatHints',
    ];

    for (const style of allStyles) {
      it(`${style} 模板应包含所有必填字段`, () => {
        const template = service.getTemplate(style);
        expect(template).toBeDefined();
        for (const field of requiredFields) {
          expect(template!).toHaveProperty(field);
        }
      });

      it(`${style} 模板的 toneWords 和 avoidWords 应为非空数组`, () => {
        const template = service.getTemplate(style);
        expect(Array.isArray(template!.toneWords)).toBe(true);
        expect(template!.toneWords.length).toBeGreaterThan(0);
        expect(Array.isArray(template!.avoidWords)).toBe(true);
        expect(template!.avoidWords.length).toBeGreaterThan(0);
      });

      it(`${style} 模板的 maxLength 应为正整数`, () => {
        const template = service.getTemplate(style);
        expect(template!.maxLength).toBeGreaterThan(0);
        expect(Number.isInteger(template!.maxLength)).toBe(true);
      });

      it(`${style} 模板的 formatHints 应为非空数组`, () => {
        const template = service.getTemplate(style);
        expect(Array.isArray(template!.formatHints)).toBe(true);
        expect(template!.formatHints.length).toBeGreaterThan(0);
      });
    }
  });

  describe('buildStyledSystemPrompt - 构建带风格的系统提示词', () => {
    const basePrompt = '你是张半山，命理宗师。';

    it('应将风格信息注入到系统提示词中', () => {
      const result = service.buildStyledSystemPrompt('professional', basePrompt);
      expect(result).toContain(basePrompt);
      expect(result).toContain('专业严谨');
      expect(result).toContain('写作风格要求');
    });

    it('应包含风格模板的 systemPrompt', () => {
      const result = service.buildStyledSystemPrompt('warm', basePrompt);
      const warmTemplate = service.getTemplate('warm');
      expect(result).toContain(warmTemplate!.systemPrompt);
    });

    it('应包含字数上限信息', () => {
      const result = service.buildStyledSystemPrompt('concise', basePrompt);
      expect(result).toContain('字数上限');
    });

    it('应包含格式提示信息', () => {
      const result = service.buildStyledSystemPrompt('detailed', basePrompt);
      expect(result).toContain('格式提示');
    });

    it('应包含语气词和避免词', () => {
      const result = service.buildStyledSystemPrompt('literary', basePrompt);
      expect(result).toContain('语气词');
      expect(result).toContain('避免词');
    });

    it('不存在的风格应返回原始 basePrompt', () => {
      const result = service.buildStyledSystemPrompt('nonexistent' as WritingStyle, basePrompt);
      expect(result).toBe(basePrompt);
    });

    it('不同风格应产生不同的提示词', () => {
      const professional = service.buildStyledSystemPrompt('professional', basePrompt);
      const warm = service.buildStyledSystemPrompt('warm', basePrompt);
      const concise = service.buildStyledSystemPrompt('concise', basePrompt);
      expect(professional).not.toBe(warm);
      expect(warm).not.toBe(concise);
    });
  });
});
