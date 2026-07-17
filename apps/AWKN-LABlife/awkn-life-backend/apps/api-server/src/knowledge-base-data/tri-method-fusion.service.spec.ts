/**
 * TriMethodFusionService 测试 - 三法融合推理服务
 *
 * 来源：E28 零测试门禁
 * 覆盖：buildFusionPrompt（输出结构/一致性检查/主导方法/权重分配）
 *       一致性检查逻辑（正面/负面关键词匹配）
 *       主导方法判定（单法/双法/三法/balanced）
 *       权重分配（八字40%/紫微35%/六壬25%）
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  TriMethodFusionService,
  TriMethodFusionInput,
  TriMethodFusionOutput,
} from './tri-method-fusion.service';
import {
  KnowledgeSearchService,
  KnowledgeEntry,
  SearchResult,
} from './knowledge-search.service';

// Mock 知识库检索服务
const mockSearchResult: SearchResult = {
  entries: [
    {
      id: 'zp-001',
      category: '日主强弱',
      title: '日主旺衰判断',
      content: '日主旺衰，以得令、得地、得助为判断标准。',
      tags: ['日主', '旺衰'],
      applicableCategories: ['事业', '财运'],
    },
    {
      id: 'zp-002',
      category: '用神',
      title: '用神选取原则',
      content: '用神者，命局之枢纽也。',
      tags: ['用神', '格局'],
      applicableCategories: ['事业', '财运'],
    },
  ],
  totalFound: 2,
  query: '事业',
  searchTimeMs: 5,
};

describe('TriMethodFusionService - 三法融合推理', () => {
  let service: TriMethodFusionService;
  let knowledgeSearch: KnowledgeSearchService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        TriMethodFusionService,
        {
          provide: KnowledgeSearchService,
          useValue: {
            search: jest.fn().mockResolvedValue(mockSearchResult),
            formatForPrompt: jest.fn().mockReturnValue('【日主旺衰判断】日主旺衰，以得令、得地、得助为判断标准。\n\n【用神选取原则】用神者，命局之枢纽也。'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(TriMethodFusionService);
    knowledgeSearch = moduleRef.get(KnowledgeSearchService);
  });

  afterAll(() => moduleRef.close());

  // ============ buildFusionPrompt - 输出结构 ============

  describe('buildFusionPrompt - 输出结构', () => {
    const fullInput: TriMethodFusionInput = {
      question: '今年事业运势如何',
      category: '事业',
      baziAnalysis: '八字分析：今年事业运势吉利，有贵人相助。',
      ziweiAnalysis: '紫微分析：事业宫吉星高照，顺遂发展。',
      liurenAnalysis: '六壬分析：大吉之象，事业可成。',
    };

    it('应返回包含 fusionPrompt/usedEntries/consistencyCheck 的结构', async () => {
      // 正常：输出结构完整性
      const result = await service.buildFusionPrompt(fullInput);
      expect(result).toHaveProperty('fusionPrompt');
      expect(result).toHaveProperty('usedEntries');
      expect(result).toHaveProperty('consistencyCheck');
    });

    it('fusionPrompt 应包含三法融合推理标题', async () => {
      // 正常：prompt 包含融合推理标题
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('三法融合推理');
    });

    it('fusionPrompt 应包含用户问题', async () => {
      // 正常：prompt 包含问题
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('今年事业运势如何');
    });

    it('fusionPrompt 应包含分类', async () => {
      // 正常：prompt 包含分类
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('事业');
    });

    it('fusionPrompt 应包含典籍参考（知识库检索结果）', async () => {
      // 正常：prompt 包含知识库上下文
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('典籍参考');
    });

    it('fusionPrompt 应包含八字分析结论', async () => {
      // 正常：prompt 包含八字分析
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('八字分析结论');
    });

    it('fusionPrompt 应包含紫微分析结论', async () => {
      // 正常：prompt 包含紫微分析
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('紫微斗数分析结论');
    });

    it('fusionPrompt 应包含六壬分析结论', async () => {
      // 正常：prompt 包含六壬分析
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('六壬分析结论');
    });

    it('fusionPrompt 应包含融合推理要求', async () => {
      // 正常：prompt 包含融合推理要求
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.fusionPrompt).toContain('融合推理要求');
    });

    it('usedEntries 应包含检索到的知识库条目 ID', async () => {
      // 正常：usedEntries 包含知识库条目 ID
      const result = await service.buildFusionPrompt(fullInput);
      expect(result.usedEntries).toContain('zp-001');
      expect(result.usedEntries).toContain('zp-002');
    });

    it('应调用 knowledgeSearch.search 进行知识库检索', async () => {
      // 正常：调用知识库检索
      jest.spyOn(knowledgeSearch, 'search');
      await service.buildFusionPrompt(fullInput);
      expect(knowledgeSearch.search).toHaveBeenCalledWith({
        query: '今年事业运势如何',
        category: '事业',
        limit: 5,
      });
    });
  });

  // ============ buildFusionPrompt - 缺少部分分析 ============

  describe('buildFusionPrompt - 缺少部分分析', () => {
    it('仅提供 baziAnalysis 时不应包含紫微和六壬', async () => {
      // 边界：仅一种分析方法
      const input: TriMethodFusionInput = {
        question: '今年事业运势如何',
        category: '事业',
        baziAnalysis: '八字分析：今年事业运势吉利。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.fusionPrompt).toContain('八字分析结论');
      expect(result.fusionPrompt).not.toContain('紫微斗数分析结论');
      expect(result.fusionPrompt).not.toContain('六壬分析结论');
    });

    it('不提供任何分析时 prompt 应仅包含框架和知识库', async () => {
      // 边界：无分析方法
      const input: TriMethodFusionInput = {
        question: '今年事业运势如何',
        category: '事业',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.fusionPrompt).toContain('三法融合推理');
      expect(result.fusionPrompt).toContain('融合推理要求');
      expect(result.fusionPrompt).not.toContain('八字分析结论');
      expect(result.fusionPrompt).not.toContain('紫微斗数分析结论');
      expect(result.fusionPrompt).not.toContain('六壬分析结论');
    });
  });

  // ============ 一致性检查逻辑 ============

  describe('一致性检查逻辑', () => {
    it('八字和紫微均为正面关键词时 baziAndZiweiAgree 应为 true', async () => {
      // 正常：正面一致
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '今年事业运势吉利，有贵人相助。',
        ziweiAnalysis: '紫微分析：事业宫吉星高照，顺遂发展。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBe(true);
    });

    it('八字和紫微均为负面关键词时 baziAndZiweiAgree 应为 true', async () => {
      // 正常：负面一致
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '今年事业运势凶险，忌轻举妄动。',
        ziweiAnalysis: '紫微分析：事业宫凶星入命，逆势而行。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBe(true);
    });

    it('八字正面紫微负面时 baziAndZiweiAgree 应为 false', async () => {
      // 正常：正负面不一致
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '今年事业运势吉利，有贵人相助。',
        ziweiAnalysis: '紫微分析：事业宫凶星入命，逆势而行。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBe(false);
    });

    it('八字负面紫微正面时 baziAndZiweiAgree 应为 false', async () => {
      // 正常：负正面不一致
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '今年事业运势凶险，忌轻举妄动。',
        ziweiAnalysis: '紫微分析：事业宫吉星高照，顺遂发展。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBe(false);
    });

    it('仅提供八字分析时 baziAndZiweiAgree 应为 null', async () => {
      // 边界：缺少紫微分析
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '今年事业运势吉利。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBeNull();
    });

    it('仅提供紫微分析时 baziAndZiweiAgree 应为 null', async () => {
      // 边界：缺少八字分析
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        ziweiAnalysis: '紫微分析：事业宫吉星高照。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBeNull();
    });

    it('都不提供时 baziAndZiweiAgree 应为 null', async () => {
      // 边界：两者都缺失
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBeNull();
    });

    it('八字和紫微均无正负面关键词时 baziAndZiweiAgree 应为 null', async () => {
      // 边界：两者都有内容但无正负面关键词
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果：五行平衡。',
        ziweiAnalysis: '紫微分析结果：星曜分布均匀。',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.baziAndZiweiAgree).toBeNull();
    });
  });

  // ============ 主导方法判定 ============

  describe('主导方法判定', () => {
    it('仅提供八字分析时 dominantMethod 应为 bazi', async () => {
      // 正常：单法 - 八字
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.dominantMethod).toBe('bazi');
    });

    it('仅提供紫微分析时 dominantMethod 应为 ziwei', async () => {
      // 正常：单法 - 紫微
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        ziweiAnalysis: '紫微分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.dominantMethod).toBe('ziwei');
    });

    it('仅提供六壬分析时 dominantMethod 应为 liuren', async () => {
      // 正常：单法 - 六壬
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        liurenAnalysis: '六壬分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.dominantMethod).toBe('liuren');
    });

    it('提供两种分析时 dominantMethod 应为 balanced', async () => {
      // 正常：双法 - balanced
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
        ziweiAnalysis: '紫微分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.dominantMethod).toBe('balanced');
    });

    it('提供三种分析时 dominantMethod 应为 balanced', async () => {
      // 正常：三法 - balanced
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
        ziweiAnalysis: '紫微分析结果',
        liurenAnalysis: '六壬分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.dominantMethod).toBe('balanced');
    });

    it('不提供任何分析时 dominantMethod 应为 balanced', async () => {
      // 边界：无分析方法
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.consistencyCheck.dominantMethod).toBe('balanced');
    });
  });

  // ============ 权重分配 ============

  describe('权重分配', () => {
    it('fusionPrompt 应包含八字权重40%的说明', async () => {
      // 正常：八字权重 40%
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
        ziweiAnalysis: '紫微分析结果',
        liurenAnalysis: '六壬分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.fusionPrompt).toContain('八字权重40%');
    });

    it('fusionPrompt 应包含紫微权重35%的说明', async () => {
      // 正常：紫微权重 35%
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
        ziweiAnalysis: '紫微分析结果',
        liurenAnalysis: '六壬分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.fusionPrompt).toContain('紫微权重35%');
    });

    it('fusionPrompt 应包含六壬权重25%的说明', async () => {
      // 正常：六壬权重 25%
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
        ziweiAnalysis: '紫微分析结果',
        liurenAnalysis: '六壬分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.fusionPrompt).toContain('六壬权重25%');
    });

    it('权重说明应出现在融合推理要求中', async () => {
      // 正常：权重说明位于融合推理要求部分
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析结果',
        ziweiAnalysis: '紫微分析结果',
        liurenAnalysis: '六壬分析结果',
      };
      const result = await service.buildFusionPrompt(input);
      // 权重说明应包含"权重分配"关键词
      expect(result.fusionPrompt).toContain('权重分配');
      // 三者权重之和应为 100%
      expect(result.fusionPrompt).toContain('40%');
      expect(result.fusionPrompt).toContain('35%');
      expect(result.fusionPrompt).toContain('25%');
    });
  });

  // ============ 分析内容截断 ============

  describe('分析内容截断', () => {
    it('分析内容超过500字符时应截取最后500字符', async () => {
      // 正常：长文本截断
      const prefix = 'HEADER_CONTENT_';
      const longAnalysis = prefix + 'B'.repeat(600);
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: longAnalysis,
      };
      const result = await service.buildFusionPrompt(input);
      // 截取后应包含最后500个字符
      expect(result.fusionPrompt).toContain(longAnalysis.slice(-500));
      // 不应包含前缀部分（前缀在截取范围之外）
      expect(result.fusionPrompt).not.toContain(prefix);
    });
  });

  // ============ 融合推理要求完整性 ============

  describe('融合推理要求完整性', () => {
    it('应包含一致性判断要求', async () => {
      // 正常：一致性判断
      const input: TriMethodFusionInput = {
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析',
        ziweiAnalysis: '紫微分析',
        liurenAnalysis: '六壬分析',
      };
      const result = await service.buildFusionPrompt(input);
      expect(result.fusionPrompt).toContain('一致性判断');
    });

    it('应包含综合判断要求', async () => {
      // 正常：综合判断
      const result = await service.buildFusionPrompt({
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析',
        ziweiAnalysis: '紫微分析',
        liurenAnalysis: '六壬分析',
      });
      expect(result.fusionPrompt).toContain('综合判断');
    });

    it('应包含不确定性标注要求', async () => {
      // 正常：不确定性标注
      const result = await service.buildFusionPrompt({
        question: '事业运势',
        category: '事业',
        baziAnalysis: '八字分析',
        ziweiAnalysis: '紫微分析',
        liurenAnalysis: '六壬分析',
      });
      expect(result.fusionPrompt).toContain('不确定性标注');
    });
  });
});
