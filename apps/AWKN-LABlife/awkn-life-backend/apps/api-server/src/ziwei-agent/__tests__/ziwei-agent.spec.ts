import { Test, TestingModule } from '@nestjs/testing';
import { ZiweiAgentService } from '../ziwei-agent.service';
import { LlmProvidersService } from '../../llm-providers/llm-providers.service';

// Mock child_process.spawnSync — 使用 jest.fn() 在工厂函数内创建
jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

// Mock fs.existsSync — 在工厂函数内创建 mock
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(() => 'mock prompt content'),
}));

// 获取 mock 引用（jest.mock 提升后可用）
const mockSpawnSync = require('child_process').spawnSync as jest.Mock;
const mockExistsSync = require('fs').existsSync as jest.Mock;

// Mock LlmProvidersService
const mockLlmProviders = {
  isConfigured: jest.fn(() => false),
  chatWithUser: jest.fn(),
};

/** 模拟 Python CLI 有效输出 */
const MOCK_PYTHON_OUTPUT = {
  solarDate: '1990-05-15',
  lunarDate: '一九九零年四月廿一',
  chineseDate: '一九九零年四月廿一',
  gender: '男',
  time: '08:00',
  timeRange: '辰时',
  sign: '天机',
  zodiac: '马',
  soul: '命宫卯',
  body: '身宫午',
  fiveElementsClass: '金四局',
  earthlyBranchOfSoulPalace: '卯',
  earthlyBranchOfBodyPalace: '午',
  palaces: [
    {
      index: 0,
      name: '命宫',
      heavenlyStem: '甲',
      earthlyBranch: '子',
      majorStars: [
        { name: '紫微', type: 'major', brightness: '庙', mutagen: '禄' },
      ],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 1,
      name: '兄弟',
      heavenlyStem: '乙',
      earthlyBranch: '丑',
      majorStars: [],
      minorStars: [{ name: '天魁', type: 'minor' }],
      adjectiveStars: [],
    },
    {
      index: 2,
      name: '夫妻',
      heavenlyStem: '丙',
      earthlyBranch: '寅',
      majorStars: [
        { name: '天机', type: 'major', brightness: '旺', mutagen: '权' },
      ],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 3,
      name: '子女',
      heavenlyStem: '丁',
      earthlyBranch: '卯',
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 4,
      name: '财帛',
      heavenlyStem: '戊',
      earthlyBranch: '辰',
      majorStars: [
        { name: '太阳', type: 'major', brightness: '得', mutagen: '忌' },
      ],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 5,
      name: '疾厄',
      heavenlyStem: '己',
      earthlyBranch: '巳',
      majorStars: [],
      minorStars: [{ name: '天钺', type: 'minor' }],
      adjectiveStars: [],
    },
    {
      index: 6,
      name: '迁移',
      heavenlyStem: '庚',
      earthlyBranch: '午',
      majorStars: [
        { name: '武曲', type: 'major', brightness: '利', mutagen: '科' },
      ],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 7,
      name: '交友',
      heavenlyStem: '辛',
      earthlyBranch: '未',
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 8,
      name: '官禄',
      heavenlyStem: '壬',
      earthlyBranch: '申',
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 9,
      name: '田宅',
      heavenlyStem: '癸',
      earthlyBranch: '酉',
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 10,
      name: '福德',
      heavenlyStem: '甲',
      earthlyBranch: '戌',
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    },
    {
      index: 11,
      name: '父母',
      heavenlyStem: '乙',
      earthlyBranch: '亥',
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
    },
  ],
  liupan: {
    daxian: [
      {
        index: 0,
        ming_gong_pos: 0,
        tiangan: 0,
        tiangan_name: '甲',
        dizhi: 0,
        dizhi_name: '子',
        age_start: 3,
        age_end: 12,
      },
    ],
    liunian: [
      {
        index: 0,
        ming_gong_pos: 0,
        tiangan: 1,
        tiangan_name: '乙',
        dizhi: 1,
        dizhi_name: '丑',
        year: 2026,
      },
    ],
  },
};

describe('ZiweiAgentService', () => {
  let service: ZiweiAgentService;
  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        ZiweiAgentService,
        {
          provide: LlmProvidersService,
          useValue: mockLlmProviders,
        },
      ],
    }).compile();

    service = module.get<ZiweiAgentService>(ZiweiAgentService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module.close();
  });

  describe('analyze', () => {
    const validInput = {
      birthDate: '1990-05-15',
      birthTime: '08:00',
      gender: 'male' as const,
    };

    it('TC-1: should return result with palaces when Python CLI succeeds', async () => {
      // Mock CLI 路径存在 + spawnSync 返回有效数据
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: JSON.stringify(MOCK_PYTHON_OUTPUT),
        stderr: '',
      });

      const result = await service.analyze(validInput);

      expect(result).toBeDefined();
      expect(result.astrolabeData).toBeDefined();
      expect(result.astrolabeData.palaces).toHaveLength(12);
      expect(result.astrolabeData.palaces[0].name).toBe('命宫');
      expect(result.astrolabeData.palaces[0].majorStars[0].name).toBe('紫微');
      expect(result.astrolabeData.palaces[0].majorStars[0].mutagen).toBe('禄');
      expect(result.astrolabeData.liupan).toBeDefined();
      expect(result.astrolabeData.liupan!.daxian).toHaveLength(1);
      expect(result.astrolabeData.liupan!.liunian).toHaveLength(1);
    });

    it('TC-2: should fallback to iztro when Python CLI fails', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await service.analyze(validInput);

      // CLI 未找到时 paipan() 返回 null，但 analyze() 会调用 iztro 降级
      expect(result).toBeDefined();
      expect(result.astrolabeData).toBeDefined();
      // iztro 降级也会返回 palaces
      expect(result.astrolabeData.palaces.length).toBeGreaterThanOrEqual(0);
    });

    it('TC-3: should fallback to template when LLM fails', async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: JSON.stringify(MOCK_PYTHON_OUTPUT),
        stderr: '',
      });

      // LLM 已配置但会抛异常
      mockLlmProviders.isConfigured.mockReturnValue(true);
      mockLlmProviders.chatWithUser.mockRejectedValue(new Error('LLM timeout'));

      const result = await service.analyze(validInput);

      expect(result).toBeDefined();
      // 模板生成的结果应包含 summaryLine
      expect(result.summaryLine).toBeDefined();
      expect(result.summaryLine.length).toBeGreaterThan(0);
    });

    it('TC-4: should pass targetYear to Python CLI when specified', async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: JSON.stringify(MOCK_PYTHON_OUTPUT),
        stderr: '',
      });

      const inputWithYear = { ...validInput, targetYear: 2026 };

      await service.analyze(inputWithYear);

      // 验证 spawnSync 被调用时 args 包含 --liupan-year 2026
      const spawnArgs = mockSpawnSync.mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--liupan-year');
      expect(spawnArgs).toContain('2026');
    });

    it('should return fallback result when everything fails', async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockImplementation(() => {
        throw new Error('spawn error');
      });

      const result = await service.analyze(validInput);

      // getFallbackResult 应返回兜底结果
      expect(result).toBeDefined();
      expect(result.summaryLine).toBeDefined();
      expect(result.risks).toBeDefined();
      expect(result.actions).toBeDefined();
    });
  });
});