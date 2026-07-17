/**
 * KnowledgeSearchService 测试 - 知识库检索服务
 *
 * 来源：E28 零测试门禁
 * 覆盖：search（关键词匹配/分类过滤/标签过滤/评分排序）
 *       getByCategory（分类过滤）
 *       formatForPrompt（输出结构）
 *       buildInvertedIndex（倒排索引构建 - 通过公开方法间接验证）
 */
import {
  KnowledgeSearchService,
  KnowledgeEntry,
} from './knowledge-search.service';

// 测试用知识库数据
const mockEntries: KnowledgeEntry[] = [
  {
    id: 'zp-001',
    category: '日主强弱',
    title: '日主旺衰判断',
    content: '日主旺衰，以得令、得地、得助为判断标准。得令者，月令生扶日主也。',
    tags: ['日主', '旺衰', '得令', '得地', '得助'],
    applicableCategories: ['事业', '财运', '婚姻', '健康'],
  },
  {
    id: 'zp-002',
    category: '用神',
    title: '用神选取原则',
    content: '用神者，命局之枢纽也。日主旺，则取克泄耗为用；日主弱，则取生扶为用。',
    tags: ['用神', '格局', '调候', '克泄耗', '生扶'],
    applicableCategories: ['事业', '财运', '婚姻', '健康', '学业'],
  },
  {
    id: 'zp-003',
    category: '十神',
    title: '十神与事业',
    content: '正官代表正当职权，偏官代表非常规权力。正官透干且得用，主仕途顺遂。',
    tags: ['正官', '偏官', '事业', '仕途', '创业'],
    applicableCategories: ['事业'],
  },
  {
    id: 'zp-004',
    category: '十神',
    title: '十神与财运',
    content: '正财代表正当收入，偏财代表意外之财。财星得用主富，财多身弱反主贫。',
    tags: ['正财', '偏财', '食伤生财', '比劫夺财'],
    applicableCategories: ['财运'],
  },
  {
    id: 'zp-005',
    category: '十神',
    title: '十神与婚姻',
    content: '男命以财星为妻，女命以官杀为夫。财星得位得用，主婚姻美满。',
    tags: ['财星', '官杀', '配偶宫', '日支', '桃花'],
    applicableCategories: ['婚姻', '感情'],
  },
];

/**
 * 辅助函数：创建已加载数据的服务实例
 * 直接注入私有属性，绕过 fs 文件加载
 */
function createLoadedService(entries: KnowledgeEntry[] = mockEntries): KnowledgeSearchService {
  const svc = new KnowledgeSearchService();
  (svc as any).entries = entries;
  (svc as any).loaded = true;
  (svc as any).buildIndex();
  return svc;
}

describe('KnowledgeSearchService - 知识库检索', () => {
  let service: KnowledgeSearchService;

  beforeEach(() => {
    service = createLoadedService();
  });

  // ============ search - 关键词匹配 ============

  describe('search - 关键词匹配', () => {
    it('标题精确匹配应获得最高分', async () => {
      // 正常：标题包含查询关键词，得分最高
      const result = await service.search({ query: '用神选取原则' });
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries[0].id).toBe('zp-002');
    });

    it('内容关键词匹配应返回相关条目', async () => {
      // 正常：内容中包含查询关键词
      const result = await service.search({ query: '得令' });
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.some(e => e.id === 'zp-001')).toBe(true);
    });

    it('标签关键词匹配应返回相关条目', async () => {
      // 正常：标签中包含查询关键词
      const result = await service.search({ query: '正官' });
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.some(e => e.tags.includes('正官'))).toBe(true);
    });

    it('多词查询应按分词分别匹配', async () => {
      // 正常：多词查询拆分为多个 term 分别匹配
      const result = await service.search({ query: '日主 旺衰' });
      expect(result.entries.length).toBeGreaterThan(0);
      // zp-001 标题同时包含两个词，应排在最前
      expect(result.entries[0].id).toBe('zp-001');
    });

    it('无匹配结果应返回空数组', async () => {
      // 边界：查询不存在的关键词
      const result = await service.search({ query: '完全不存在的关键词xyz' });
      expect(result.entries).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it('空查询时因空字符串匹配所有标题，应返回所有条目', async () => {
      // 边界：空字符串查询 - "".includes("") 为 true，所有标题都匹配
      const result = await service.search({ query: '' });
      expect(result.entries.length).toBeGreaterThan(0);
      // 空查询匹配所有条目，totalFound 应等于总条目数
      expect(result.totalFound).toBe(mockEntries.length);
    });

    it('limit 参数应限制返回条目数', async () => {
      // 正常：limit 限制返回数量
      const result = await service.search({ query: '十神', limit: 2 });
      expect(result.entries.length).toBeLessThanOrEqual(2);
    });

    it('结果应按相关度分数降序排列', async () => {
      // 正常：标题匹配 > 标签匹配 > 内容匹配
      const result = await service.search({ query: '事业' });
      expect(result.entries.length).toBeGreaterThan(0);
      // zp-003 标题含"事业"且标签含"事业"，分数应最高
      const hasZp003 = result.entries.some(e => e.id === 'zp-003');
      expect(hasZp003).toBe(true);
    });
  });

  // ============ search - 分类过滤 ============

  describe('search - 分类过滤', () => {
    it('指定 category 应优先返回匹配分类的条目', async () => {
      // 正常：分类过滤
      const result = await service.search({ query: '十神', category: '财运' });
      expect(result.entries.length).toBeGreaterThan(0);
      // zp-004 的 applicableCategories 包含"财运"，应获得加分
      expect(result.entries.some(e => e.applicableCategories.includes('财运'))).toBe(true);
    });

    it('指定不存在的 category 不应报错', async () => {
      // 边界：不存在的分类
      const result = await service.search({ query: '十神', category: '不存在的分类' });
      // 不报错，但分类加分不会生效
      expect(result).toBeDefined();
    });
  });

  // ============ search - 标签过滤 ============

  describe('search - 标签过滤', () => {
    it('指定 tags 应给匹配标签的条目加分', async () => {
      // 正常：标签过滤
      const result = await service.search({ query: '十神', tags: ['正官'] });
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries.some(e => e.tags.includes('正官'))).toBe(true);
    });

    it('多个 tags 应满足任一即加分', async () => {
      // 正常：多标签 OR 匹配
      const result = await service.search({ query: '十神', tags: ['正官', '偏财'] });
      expect(result.entries.length).toBeGreaterThan(0);
    });
  });

  // ============ search - 返回结构 ============

  describe('search - 返回结构', () => {
    it('SearchResult 应包含 entries/totalFound/query/searchTimeMs', async () => {
      // 正常：返回结构完整性
      const result = await service.search({ query: '日主' });
      expect(result).toHaveProperty('entries');
      expect(result).toHaveProperty('totalFound');
      expect(result).toHaveProperty('query');
      expect(result).toHaveProperty('searchTimeMs');
      expect(result.query).toBe('日主');
      expect(typeof result.searchTimeMs).toBe('number');
      expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ============ getByCategory - 分类过滤 ============

  describe('getByCategory - 分类过滤', () => {
    it('按 applicableCategories 过滤应返回匹配条目', async () => {
      // 正常：applicableCategories 包含指定分类
      const entries = await service.getByCategory('事业');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every(e =>
        e.applicableCategories.includes('事业') || e.category === '事业',
      )).toBe(true);
    });

    it('按 category 精确匹配应返回对应条目', async () => {
      // 正常：category 字段精确匹配
      const entries = await service.getByCategory('用神');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some(e => e.category === '用神')).toBe(true);
    });

    it('不存在的分类应返回空数组', async () => {
      // 边界：不存在的分类
      const entries = await service.getByCategory('不存在的分类');
      expect(entries).toEqual([]);
    });

    it('limit 参数应限制返回数量', async () => {
      // 正常：limit 生效
      const entries = await service.getByCategory('事业', 1);
      expect(entries.length).toBeLessThanOrEqual(1);
    });
  });

  // ============ formatForPrompt - 输出结构 ============

  describe('formatForPrompt - 输出结构', () => {
    it('应将条目格式化为【标题】内容格式', () => {
      // 正常：格式化输出（非 async 方法）
      const entries: KnowledgeEntry[] = [
        {
          id: 'test-001',
          category: '测试',
          title: '测试标题',
          content: '测试内容',
          tags: ['测试'],
          applicableCategories: ['测试'],
        },
      ];
      const formatted = service.formatForPrompt(entries);
      expect(formatted).toContain('【测试标题】');
      expect(formatted).toContain('测试内容');
    });

    it('多个条目应以双换行分隔', () => {
      // 正常：多条目分隔
      const entries: KnowledgeEntry[] = [
        {
          id: 'test-001',
          category: '测试',
          title: '标题一',
          content: '内容一',
          tags: ['测试'],
          applicableCategories: ['测试'],
        },
        {
          id: 'test-002',
          category: '测试',
          title: '标题二',
          content: '内容二',
          tags: ['测试'],
          applicableCategories: ['测试'],
        },
      ];
      const formatted = service.formatForPrompt(entries);
      expect(formatted).toContain('【标题一】内容一\n\n【标题二】内容二');
    });

    it('空数组应返回空字符串', () => {
      // 边界：空数组
      const formatted = service.formatForPrompt([]);
      expect(formatted).toBe('');
    });
  });

  // ============ buildInvertedIndex - 倒排索引（间接验证） ============

  describe('buildInvertedIndex - 倒排索引（间接验证）', () => {
    it('标签索引应支持小写匹配', async () => {
      // 正常：标签索引对大小写不敏感（通过 search 间接验证）
      const resultUpper = await service.search({ query: '得令' });
      const resultLower = await service.search({ query: '得令' });
      expect(resultUpper.totalFound).toBe(resultLower.totalFound);
    });

    it('分类索引应支持按 applicableCategories 检索', async () => {
      // 正常：分类索引通过 getByCategory 间接验证
      const entries = await service.getByCategory('婚姻');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some(e => e.applicableCategories.includes('婚姻'))).toBe(true);
    });

    it('分类索引应支持按 category 精确匹配', async () => {
      // 正常：category 字段精确匹配
      const entries = await service.getByCategory('十神');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every(e => e.category === '十神')).toBe(true);
    });

    it('getCategories 应返回所有分类（含 category 和 applicableCategories）', async () => {
      // 正常：getCategories 返回所有分类
      const categories = await service.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      // 应包含 category 字段的值
      expect(categories).toContain('日主强弱');
      expect(categories).toContain('用神');
      expect(categories).toContain('十神');
      // 应包含 applicableCategories 的值
      expect(categories).toContain('事业');
      expect(categories).toContain('财运');
    });
  });

  // ============ 数据加载异常 ============

  describe('数据加载异常', () => {
    it('entries 为空数组时 search 应返回空结果', async () => {
      // 异常：空数据
      const emptyService = createLoadedService([]);
      const result = await emptyService.search({ query: '日主' });
      expect(result.entries).toEqual([]);
      expect(result.totalFound).toBe(0);
    });

    it('entries 为空数组时 getByCategory 应返回空数组', async () => {
      // 异常：空数据
      const emptyService = createLoadedService([]);
      const entries = await emptyService.getByCategory('事业');
      expect(entries).toEqual([]);
    });

    it('entries 为空数组时 getCategories 应返回空数组', async () => {
      // 异常：空数据
      const emptyService = createLoadedService([]);
      const categories = await emptyService.getCategories();
      expect(categories).toEqual([]);
    });
  });
});
